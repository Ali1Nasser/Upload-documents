"""P4 semantic graph: `dc graph build|embed|candidates|apply|q|export` (docs/plan/02 section 8.1, 03 P4, 05 section 5).

build       concepts (graph_concepts) -> corpus/graph/concepts.jsonl + definition batches; assembles nodes/edges from what exists
embed       bge-m3 dense vectors (queued) for sentences, NotebookLM scenes, visual assets, concepts -> data/derived/vectors/g_<kind>.npy
candidates  S4 -> top-5 S1 and top-3 other-S4 sentences; 200-pair stratified label sample; all borderline S4-S1 pairs for adjudication
apply       label outputs -> threshold sweep + F1; adjudications -> merge edges; union-find -> IdeaUnits; nodes/edges rewritten
q           coverage | redundancy | novelty | order | contradictions | visual-candidates <iu> | continuity <chapter>
export      Mermaid overview + counts -> reports/graph/overview.md

Rules: two claims that differ in numbers are never merged (edge relation `contradicts` candidate or kept apart); every merge keeps its
evidence (cos, label/adjudication, batch file) on the edge, so it is reversible. P00b is an alternate take of P00 (`alternate_take`).
"""
import collections
import glob
import json
import os
import random
import re
import sys
import time

from . import common as C

GDIR = C.p("data", "derived", "graph")
VDIR = C.p("data", "derived", "vectors")
CORP = C.p("corpus", "graph")
REP = C.p("reports", "graph")
KINDS = ("sent", "scene", "asset", "concept", "fact")
ALT_TAKES = {"a:S4:P00b": "a:S4:P00"}       # alternate take of part 0: same brief and voice, different script (word overlap 2.5 %)
LABEL_SIZE, ADJ_SIZE, DEF_SIZE = 50, 60, 90
ADJ_LO, ADJ_HI = 0.72, 0.86
PAIR_FORMAT = {"pairs": [{"a": "<id a>", "b": "<id b>", "same": "true|false",
                          "relation": "same|subsumes|subsumed|related|different", "why": "<= 12 words"}]}
DEF_FORMAT = {"concepts": [{"id": "c:<slug>", "def_en": "...", "def_ar_eg": "...", "requires": ["c:<id>", "..."],
                            "failure": "one common failure, <= 15 words"}]}
RELATIONS = {"same", "subsumes", "subsumed", "related", "different"}


def _sid_audio(sid):
    p = sid.split(":")
    return f"a:{p[1]}:{p[2]}"


def _part(sid):
    return sid.split(":")[2]


def sentences():
    out = []
    for f in sorted(glob.glob(C.p("corpus", "sentences", "a_S1_*.jsonl"))) + sorted(glob.glob(C.p("corpus", "sentences", "a_S4_*.jsonl"))):
        out += C.read_jsonl(f)
    return out


NUM_RX = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


def _nnorm(x):
    """'10,000' -> '10000', '99%' -> '99', '€95' -> '95', '3948.50' -> '3948.5', '18,50' -> '18.5'; ISO dates kept."""
    x = str(x).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", x):
        return x
    m = NUM_RX.search(x)
    if not m:
        return x
    t = m.group(0)
    if re.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?", t):
        t = t.replace(",", "")
    elif "," in t:
        t = t.replace(",", ".")
    try:
        f = float(t)
    except ValueError:
        return t
    return str(int(f)) if f.is_integer() and abs(f) < 1e15 else str(round(f, 6))


def _nums(s):
    return sorted({_nnorm(x) for x in (s.get("numbers") or [])})


def _num_rel(na, nb):
    """None when the two number sets agree or one side states none; 'disjoint' | 'partial' otherwise."""
    if not na or not nb or set(na) == set(nb):
        return None
    return "disjoint" if not set(na) & set(nb) else "partial"


# ------------------------------------------------------------------ build (concepts + definition batches)
def cmd_build(args):
    from . import graph_concepts as GC
    os.makedirs(GDIR, exist_ok=True)
    os.makedirs(CORP, exist_ok=True)
    recs = GC.concept_records()
    defs = _load_defs()
    concepts = []
    for r in recs:
        d = defs.get(r["id"]) or {}
        rec = {k: v for k, v in r.items() if not k.startswith("_")}
        if d:
            rec["def_en"], rec["def_ar"] = d.get("def_en"), d.get("def_ar_eg")
            rec["requires"] = [x for x in d.get("requires") or [] if x != r["id"]]
            rec["failure"] = d.get("failure")
        concepts.append(rec)
    ids = {c["id"] for c in concepts}
    for c in concepts:
        c["requires"] = [x for x in c["requires"] if x in ids]
    C.write_jsonl(os.path.join(CORP, "concepts.jsonl"), concepts)
    C.write_json(os.path.join(GDIR, "concept_mentions.json"), {r["id"]: r["_mention_ids"] for r in recs}, indent=None)
    print(f"graph build: {len(concepts)} concepts ({sum(1 for c in concepts if c['def_en'])} with definitions) -> corpus/graph/concepts.jsonl")
    if not args.no_batches:
        paths = write_def_batches(recs, ids)
        print(f"graph build: {len(paths)} definition batches (<= {DEF_SIZE} concepts each) -> {C.rel(GDIR)}/def_batch_NN.json")
    assemble()
    return 0


def _pick_examples(r, sent_by_id, n=3):
    """2-3 glosses: an S1 one first when it exists, then S4 from different parts, skipping very short ones."""
    seen_parts, out = set(), []
    strong = set(r.get("_strong_ids") or [])
    ids = sorted(r["_mention_ids"], key=lambda s: (s not in strong, not s.startswith("s:S1"),
                                                   len((sent_by_id.get(s) or {}).get("gloss_en") or "") < 40, s))
    for sid in ids:
        s = sent_by_id.get(sid)
        if not s or not s.get("gloss_en") or len(s["gloss_en"]) < 25:
            continue
        part = _part(sid)
        if part in seen_parts and len(ids) > n:
            continue
        seen_parts.add(part)
        out.append({"sent_id": sid, "gloss_en": s["gloss_en"]})
        if len(out) >= n:
            break
    return out


def write_def_batches(recs, ids):
    sent_by_id = {s["sent_id"]: s for s in sentences()}
    for f in glob.glob(os.path.join(GDIR, "def_batch_*.json")):
        if not f.endswith(".out.json"):
            os.remove(f)
    # group related concepts in a batch (sort by first chapter, then score) so 'requires' is judged with neighbours in view
    order = sorted(recs, key=lambda r: ((r["chapters"] or ["CH-99"])[0], -r["score"]))
    all_ids = sorted(ids)
    paths = []
    nb = (len(order) + DEF_SIZE - 1) // DEF_SIZE
    size = (len(order) + nb - 1) // nb
    scenes = {sc["scene_id"]: sc for sc in C.read_jsonl(C.p("corpus", "canon", "nblm_scenes.jsonl"))}
    for b in range(nb):
        chunk = order[b * size:(b + 1) * size]
        name = f"def_batch_{b + 1:02d}"
        out = os.path.join(GDIR, name + ".out.json")
        items = []
        for r in chunk:
            ex = _pick_examples(r, sent_by_id)
            if len(ex) < 2:   # fall back to NotebookLM scene text (title + narration head) that carries the term
                for ref in r["sources"]:
                    sc = scenes.get(ref)
                    if sc and len(ex) < 3:
                        ex.append({"scene_id": ref, "text_ar": (sc.get("title") or "") + " — " + (sc.get("narration") or sc.get("on_screen") or "")[:220]})
            items.append({"id": r["id"], "label_en": r["label_en"], "label_ar": r["label_ar"], "aliases": r["aliases"][:8],
                          "hint_gloss_ar": r["gloss_ar"], "hint_meaning_ar": r["meaning_ar"], "chapters": r["chapters"][:6],
                          "examples": ex})
        C.write_json(os.path.join(GDIR, name + ".json"), {
            "v": 1, "batch_id": name, "task": "concept definitions (graph-engineer P4.1)", "n": len(items),
            "output_path": C.rel(out),
            "instructions": ("For every concept write: def_en (1-2 plain sentences, the meaning used in this data-analytics course, "
                             "<= 35 words); def_ar_eg (Egyptian Arabic, same meaning, keep technical terms in English as the course does, "
                             "e.g. 'الـpartition'); requires = prerequisite concept ids a learner must know first, chosen ONLY from "
                             "all_concept_ids (0-4, direct prerequisites only, never the concept itself, no cycles); failure = one common "
                             "failure or misconception, <= 15 words. Use the examples as evidence of how the narration uses the term. "
                             "Do not invent numbers. Return exactly one object per concept id, as JSON, to output_path."),
            "output_format": DEF_FORMAT, "concepts": items, "all_concept_ids": all_ids}, indent=1)
        paths.append(os.path.join(GDIR, name + ".json"))
    return paths


def _load_defs():
    out = {}
    for f in sorted(glob.glob(os.path.join(GDIR, "def_batch_*.out.json"))):
        for c in (C.read_json(f) or {}).get("concepts", []):
            if c.get("id"):
                out[c["id"]] = c
    return out


# ------------------------------------------------------------------ embed
def _items(kind):
    if kind == "sent":
        ss = sentences()
        return [s["sent_id"] for s in ss], [(s["text"] + " || " + (s.get("gloss_en") or "")).strip() for s in ss], 128
    if kind == "scene":
        sc = C.read_jsonl(C.p("corpus", "canon", "nblm_scenes.jsonl"))
        return [s["scene_id"] for s in sc], [f"{s.get('title') or ''}\n{(s.get('narration') or '')[:600]}\n{(s.get('on_screen') or '')[:300]}"
                                              for s in sc], 256
    if kind == "asset":
        aa = C.read_jsonl(C.p("corpus", "visual", "assets.jsonl"))
        return [a["asset_id"] for a in aa], [f"{a.get('caption_en') or ''} {(a.get('text_seen') or '')[:300]}".strip() for a in aa], 192
    if kind == "concept":
        cc = C.read_jsonl(os.path.join(CORP, "concepts.jsonl"))
        return [c["id"] for c in cc], [f"{c['label_en']} / {c['label_ar']}; " + ", ".join(c["aliases"][:6]) +
                                        (f". {c['def_en']}" if c.get("def_en") else "") for c in cc], 96
    if kind == "fact":
        ff = (C.read_json(C.p("corpus", "canon", "data_contract.json")) or {}).get("facts", [])
        return [f["id"] for f in ff], [f"{f.get('value') or ''}: {(f.get('context') or '')[:400]}" for f in ff], 128
    raise SystemExit(f"unknown kind {kind}")


def _shards(kind, n):
    ids, texts, ml = _items(kind)
    order = sorted(range(len(ids)), key=lambda i: len(texts[i]))
    return ids, texts, ml, [order[k::n] for k in range(n)]


def cmd_embed(args):
    if args.worker:
        return _embed_worker(args.worker)
    os.makedirs(VDIR, exist_ok=True)
    kinds = args.kinds.split(",") if args.kinds else list(KINDS)
    plan = []
    for kind in kinds:
        ids, texts, ml = _items(kind)
        meta = C.read_json(os.path.join(VDIR, f"g_{kind}.json"))
        sig = C.sha256_bytes("\n".join(i + "\t" + t for i, t in zip(ids, texts)).encode()) if hasattr(C, "sha256_bytes") else None
        if sig is None:
            import hashlib
            sig = hashlib.sha256("\n".join(i + "\t" + t for i, t in zip(ids, texts)).encode()).hexdigest()
        if meta and meta.get("sig") == sig and os.path.exists(os.path.join(VDIR, f"g_{kind}.npy")) and not args.force:
            print(f"graph embed: {kind} up to date ({len(ids)})")
            continue
        n = 2 if kind == "sent" else 1
        for k in range(n):
            plan.append((kind, k, n, sig))
    if not plan:
        return 0
    from . import queue as Q
    jobs = []
    for kind, k, n, sig in plan:
        py = C.p(".venv", "bin", "python") if os.path.exists(C.p(".venv", "bin", "python")) else sys.executable   # torch lives in the venv
        cmd = [py, "-I", C.p("tools", "dc.py"), "graph", "embed", "--worker", f"{kind}:{k}/{n}:{sig}"]
        if args.inline:
            _embed_worker(f"{kind}:{k}/{n}:{sig}")
            continue
        job = Q.submit(f"g-embed-{kind}-{k}", cmd, mem_gb=3.0, expected_gb=0.05)
        jobs.append(job["tsp_id"])
    print(f"graph embed: queued jobs {jobs}; wait with `dc q wait <id>`, then re-run `dc graph embed` to merge shards")
    return 0


def _embed_worker(spec):
    import numpy as np
    from . import dense as D
    kind, kn, sig = spec.split(":", 2)
    k, n = [int(x) for x in kn.split("/")]
    ids, texts, ml, shards = _shards(kind, n)
    idx = shards[k]
    t0 = time.time()
    D.load_model(threads=int(os.environ.get("DC_DENSE_THREADS", "1")))
    vec = D.encode([texts[i] for i in idx], bs=16, max_len=ml).astype(np.float16)
    np.save(os.path.join(VDIR, f"g_{kind}.{k}of{n}.npy"), vec)
    C.write_json(os.path.join(VDIR, f"g_{kind}.{k}of{n}.json"), {"ids": [ids[i] for i in idx], "sig": sig}, indent=None)
    print(f"embed {kind} shard {k}/{n}: {len(idx)} in {time.time() - t0:.0f}s", flush=True)
    _merge(kind, n, sig, ids)
    return 0


def _merge(kind, n, sig, ids):
    import numpy as np
    parts = [os.path.join(VDIR, f"g_{kind}.{k}of{n}") for k in range(n)]
    if not all(os.path.exists(p + ".npy") and os.path.exists(p + ".json") for p in parts):
        return False
    pos = {i: j for j, i in enumerate(ids)}
    full = np.zeros((len(ids), 1024), dtype=np.float16)
    for p in parts:
        m = C.read_json(p + ".json")
        if m["sig"] != sig:
            return False
        v = np.load(p + ".npy")
        for r, i in enumerate(m["ids"]):
            full[pos[i]] = v[r]
    np.save(os.path.join(VDIR, f"g_{kind}.npy"), full)
    C.write_json(os.path.join(VDIR, f"g_{kind}.json"), {"ids": ids, "sig": sig, "model": "bge-m3 dense CLS, L2", "dim": 1024,
                                                        "created": C.now_iso()}, indent=None)
    for p in parts:
        os.remove(p + ".npy")
        os.remove(p + ".json")
    _faiss(kind, full)
    return True


def _faiss(kind, full):
    try:
        import faiss  # noqa: F401
    except Exception:  # noqa: BLE001
        return
    import numpy as np
    ix = faiss.IndexFlatIP(full.shape[1])
    ix.add(full.astype(np.float32))
    faiss.write_index(ix, os.path.join(VDIR, f"g_{kind}.faiss"))


def load_vecs(kind):
    import numpy as np
    m = C.read_json(os.path.join(VDIR, f"g_{kind}.json"))
    if not m:
        raise SystemExit(f"no vectors for {kind}: run `dc graph embed` first")
    return m["ids"], np.load(os.path.join(VDIR, f"g_{kind}.npy")).astype(np.float32)


# ------------------------------------------------------------------ candidates
def _pair_rec(a, b, cos, S, extra=None):
    sa, sb = S[a], S[b]
    r = {"a": a, "b": b, "cos": round(float(cos), 4),
         "a_text": sa["text"], "a_gloss": sa.get("gloss_en"), "a_numbers": _nums(sa),
         "b_text": sb["text"], "b_gloss": sb.get("gloss_en"), "b_numbers": _nums(sb)}
    if extra:
        r.update(extra)
    return r


def cmd_candidates(args):
    import numpy as np
    os.makedirs(GDIR, exist_ok=True)
    ids, V = load_vecs("sent")
    S = {s["sent_id"]: s for s in sentences()}
    ids = [i for i in ids if i in S]
    pos = {i: j for j, i in enumerate(load_vecs("sent")[0])}
    X = V[[pos[i] for i in ids]]
    is1 = np.array([i.startswith("s:S1:") for i in ids])
    aud = np.array([_sid_audio(i) for i in ids])
    i4 = np.where(~is1)[0]
    i1 = np.where(is1)[0]
    sim = X[i4] @ X.T
    cands, alt = [], []
    best_s1 = {}
    for r, gi in enumerate(i4):
        a = ids[gi]
        row = sim[r]
        # S1
        s1 = i1[np.argsort(-row[i1])[:args.k1]]
        for rank, j in enumerate(s1):
            cands.append({"a": a, "b": ids[j], "cos": round(float(row[j]), 4), "kind": "S4-S1", "rank": rank + 1})
        best_s1[a] = (ids[s1[0]], float(row[s1[0]]))
        # other S4 parts (excluding the same audio, and the alternate take pair P00 <-> P00b)
        my = aud[gi]
        alt_of = ALT_TAKES.get(my) or next((k for k, v in ALT_TAKES.items() if v == my), None)
        mask = (~is1) & (aud != my) & (aud != (alt_of or ""))
        cand = np.where(mask)[0]
        top = cand[np.argsort(-row[cand])[:args.k4]]
        for rank, j in enumerate(top):
            cands.append({"a": a, "b": ids[j], "cos": round(float(row[j]), 4), "kind": "S4-S4", "rank": rank + 1})
        if alt_of:
            ca = np.where(aud == alt_of)[0]
            j = ca[int(np.argmax(row[ca]))]
            alt.append({"a": a, "b": ids[j], "cos": round(float(row[j]), 4), "kind": "alternate_take"})
    # dedupe symmetric S4-S4 pairs (keep max cos)
    seen = {}
    for c in cands:
        key = (c["kind"],) + tuple(sorted((c["a"], c["b"])))
        if key not in seen or c["cos"] > seen[key]["cos"]:
            seen[key] = c
    cands = list(seen.values())
    C.write_jsonl(os.path.join(GDIR, "candidates.jsonl"), cands + alt)
    hist = collections.Counter((c["kind"], min(int(c["cos"] * 20) / 20, 0.95)) for c in cands)

    # ---- label sample: 200 pairs stratified over 0.60-0.95 (7 bins of 0.05), S4-S1 and S4-S4 mixed by availability
    rnd = random.Random(args.seed)
    bins = [round(0.60 + 0.05 * k, 2) for k in range(7)]
    pool = collections.defaultdict(list)
    for c in cands:
        if 0.60 <= c["cos"] < 0.95:
            pool[bins[min(int((c["cos"] - 0.60) / 0.05), 6)]].append(c)
    per = [args.n_label // 7 + (1 if k < args.n_label % 7 else 0) for k in range(7)]
    sample = []
    for b, n in zip(bins, per):
        p = pool[b]
        s1 = [c for c in p if c["kind"] == "S4-S1"]
        s4 = [c for c in p if c["kind"] == "S4-S4"]
        rnd.shuffle(s1)
        rnd.shuffle(s4)
        n1 = min(len(s1), (n * 3 + 2) // 5)          # ~60 % S4-S1 (the merge that decides novelty), ~40 % S4-S4
        pick = s1[:n1] + s4[:n - n1]
        if len(pick) < n:
            pick += [c for c in s1[n1:] + s4[n - n1:]][:n - len(pick)]
        sample += pick
    if len(sample) < args.n_label:      # thin top bin: top up from the next-highest bins (keeps the high-cos region dense)
        have = {(c["a"], c["b"]) for c in sample}
        for b in reversed(bins):
            rest = [c for c in pool[b] if (c["a"], c["b"]) not in have]
            rnd.shuffle(rest)
            take = rest[:args.n_label - len(sample)]
            sample += take
            have |= {(c["a"], c["b"]) for c in take}
            if len(sample) >= args.n_label:
                break
    rnd.shuffle(sample)
    lab_paths = _write_pair_batches("label", sample, LABEL_SIZE, S, (
        "Label each pair as an Educator would: same=true only if both sentences make the SAME claim at the SAME level of detail "
        "(a viewer who heard one learns nothing new from the other). Different numbers, scope, or a missing qualifier => same=false "
        "(relation subsumes/subsumed/related/different). relation: same | subsumes (a says everything b says and more) | subsumed "
        "(b says more) | related (same topic, different claim) | different. Judge from the Arabic text; gloss_en is a helper. "
        "why <= 12 words. Return one object per pair (a, b exactly as given) as JSON to output_path."))

    # ---- adjudication: every S4 sentence whose best S1 match is in [ADJ_LO, ADJ_HI]
    adj = []
    for a, (b, cs) in best_s1.items():
        if ADJ_LO <= cs <= ADJ_HI:
            adj.append({"a": a, "b": b, "cos": round(cs, 4), "kind": "S4-S1", "rank": 1})
    # alternate take P00 <-> P00b: a second NotebookLM script from the same brief (not a re-render), so its borderline pairs are
    # adjudicated too; decides which take's sentences restate the other
    adj += [dict(c, rank=1) for c in alt if ADJ_LO <= c["cos"] <= ADJ_HI and c["a"].startswith("s:S4:P00b:")]
    adj.sort(key=lambda c: (c["kind"] != "S4-S1", c["a"]))
    adj_paths = _write_pair_batches("adj", adj, ADJ_SIZE, S, (
        "LLM adjudication of borderline S4 (NotebookLM part) vs S1 (trunk) pairs. Question: do a and b state the same claim at the "
        "same level of detail? same=true only then. Never merge claims that differ in numbers or scope: set same=false and relation "
        "subsumes/subsumed/related/different. relation: same | subsumes (a contains b and adds detail) | subsumed (b contains a) | "
        "related | different. Judge from the Arabic text; gloss_en is a helper. why <= 12 words. Return one object per pair "
        "(a, b exactly as given) as JSON to output_path."))
    st = {"v": 1, "created": C.now_iso(), "s4_sentences": int(len(i4)), "s1_sentences": int(len(i1)), "k1": args.k1, "k4": args.k4,
          "pairs": {k: sum(1 for c in cands if c["kind"] == k) for k in ("S4-S1", "S4-S4")}, "alternate_take_pairs": len(alt),
          "alternate_take_cos_median": _median([c["cos"] for c in alt]),
          "best_s1_cos_quantiles": _quant([v for _, v in best_s1.values()]),
          "label_sample": len(sample), "label_kinds": dict(collections.Counter(c["kind"] for c in sample)),
          "label_bins": {str(b): sum(1 for c in sample if bins[min(int((c["cos"] - 0.60) / 0.05), 6)] == b) for b in bins},
          "adjudication_pairs": len(adj), "label_adj_overlap": len({(c["a"], c["b"]) for c in sample} & {(c["a"], c["b"]) for c in adj}),
          "histogram": {f"{k}@{b:.2f}": n for (k, b), n in sorted(hist.items())},
          "label_batches": [C.rel(p) for p in lab_paths], "adj_batches": [C.rel(p) for p in adj_paths]}
    C.write_json(os.path.join(GDIR, "candidates_stats.json"), st)
    print(json.dumps({k: st[k] for k in ("pairs", "alternate_take_pairs", "alternate_take_cos_median", "best_s1_cos_quantiles",
                                         "label_sample", "label_kinds", "label_bins", "adjudication_pairs", "label_adj_overlap")}))
    print(f"label batches: {len(lab_paths)}  adjudication batches: {len(adj_paths)}")
    return 0


def _median(xs):
    xs = sorted(xs)
    return round(xs[len(xs) // 2], 4) if xs else None


def _quant(xs):
    xs = sorted(xs)
    return {f"p{q}": round(xs[min(len(xs) - 1, int(len(xs) * q / 100))], 4) for q in (10, 25, 50, 75, 90)} if xs else {}


def _write_pair_batches(prefix, pairs, size, S, instructions):
    for f in glob.glob(os.path.join(GDIR, f"{prefix}_batch_*.json")):
        if not f.endswith(".out.json"):
            os.remove(f)
    paths = []
    nb = (len(pairs) + size - 1) // size
    per = (len(pairs) + nb - 1) // nb if nb else 0          # balanced batches, each <= size
    for b in range(nb):
        chunk = pairs[b * per:(b + 1) * per]
        name = f"{prefix}_batch_{b + 1:02d}"
        out = os.path.join(GDIR, name + ".out.json")
        recs = [_pair_rec(c["a"], c["b"], c["cos"], S, {"kind": c["kind"]}) for c in chunk]
        C.write_json(os.path.join(GDIR, name + ".json"), {
            "v": 1, "batch_id": name, "task": "pair labelling (threshold tuning, 200-pair sample)" if prefix == "label"
            else "pair adjudication (borderline S4-S1)", "n": len(recs), "output_path": C.rel(out),
            "instructions": instructions, "output_format": PAIR_FORMAT, "pairs": recs}, indent=1)
        paths.append(os.path.join(GDIR, name + ".json"))
    return paths


# ------------------------------------------------------------------ apply (threshold, merges, idea units)
def _truthy(x):
    """batch outputs carry same as a JSON bool or as the string 'true'/'false' (bool('false') would be True)."""
    return x is True or str(x).strip().lower() == "true"


def _load_outs(prefix):
    out = {}
    for f in sorted(glob.glob(os.path.join(GDIR, f"{prefix}_batch_*.out.json"))):
        for p in (C.read_json(f) or {}).get("pairs", []):
            rel = p.get("relation") if p.get("relation") in RELATIONS else ("same" if p.get("same") else "different")
            same = _truthy(p.get("same")) and rel == "same"
            out[(p["a"], p["b"])] = {"same": same, "relation": rel, "why": p.get("why", ""), "file": os.path.basename(f)}
    return out


class UF:
    def __init__(self):
        self.p = {}

    def f(self, x):
        self.p.setdefault(x, x)
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def u(self, a, b):
        ra, rb = self.f(a), self.f(b)
        if ra != rb:
            self.p[max(ra, rb)] = min(ra, rb)


def cmd_apply(args):
    from . import graph_p4
    return graph_p4.cmd_apply(args)


def assemble():
    from . import graph_p4
    return graph_p4.assemble()


def cmd_report(args):
    from . import graph_p4
    return graph_p4.cmd_report(args)


def cmd_export(args):
    from . import graph_p4
    return graph_p4.export()


# ------------------------------------------------------------------ queries
def q_visual(iu_id, k=8):
    import numpy as np
    ius = C.read_jsonl(os.path.join(GDIR, "idea_units.jsonl"))
    iu = next(i for i in ius if i["id"] == iu_id)
    sid, sv = load_vecs("sent")
    aid, av = load_vecs("asset")
    pos = {i: j for j, i in enumerate(sid)}
    q = sv[[pos[m] for m in iu["members"]]].mean(0)
    q /= np.linalg.norm(q) + 1e-9
    sc = av @ q
    top = np.argsort(-sc)[:k]
    return [{"asset": aid[j], "score": round(float(sc[j]), 4)} for j in top]


def cmd_q(args):
    from . import graph_p4 as P
    name = args.name
    if name == "novelty":
        r = P.novelty()
        res = {"totals": r["totals"], "per_part": [{k: v for k, v in p.items() if k != "runs"} for p in r["per_part"]]}
    elif name == "coverage":
        r = P.coverage()
        res = {"totals": r["totals"], "domains": r["domains"]}
    elif name == "redundancy":
        ius = C.read_jsonl(os.path.join(GDIR, "idea_units.jsonl"))
        multi = [i for i in ius if len({a for a in i["sources"] if a not in ALT_TAKES}) > 1]
        res = {"idea_units": len(ius), "multi_source": len(multi),
               "top": [{"id": i["id"], "sources": i["sources"], "gloss_en": i["gloss_en"]} for i in sorted(multi, key=lambda i: -len(i["sources"]))[:20]]}
    elif name == "contradictions":
        r = P.contradictions()
        res = {"sentence_pairs": len(r["sentence_pairs"]), "fact_mismatch": len(r["fact_mismatch"]), "canon": len(r["canon"]),
               "pairs": r["sentence_pairs"][:20]}
    elif name == "order":
        r = P.order()
        res = {"violations": len(r["violations"]), "cross_chapter": r["cross_chapter_violations"], "cycles": r["cycles"][:10],
               "top": r["violations"][:20]}
    elif name == "visual-candidates":
        res = q_visual(args.arg)
    elif name == "continuity":
        res = {"note": "needs the EDL and shot specs (P5/P8); not available in P4"}
    else:
        raise SystemExit(f"unknown query {name}")
    if args.write:
        os.makedirs(REP, exist_ok=True)
        C.write_json(os.path.join(REP, f"q_{name}.json"), {"v": 1, "created": C.now_iso(), "result": res})
    print(json.dumps(res, ensure_ascii=False, indent=1)[:args.max_chars])
    return 0


# ------------------------------------------------------------------ CLI
def register(sub):
    import argparse
    g = sub.add_parser("graph", help="P4 semantic graph").add_subparsers(dest="graph_cmd", required=True)
    s = g.add_parser("build", help="concepts + definition batches; assemble nodes/edges")
    s.add_argument("--no-batches", action="store_true")
    s.set_defaults(fn="graph.cmd_build")
    s = g.add_parser("embed", help="bge-m3 vectors for sent,scene,asset,concept (queued)")
    s.add_argument("--kinds", default="")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.add_argument("--worker", help=argparse.SUPPRESS)
    s.set_defaults(fn="graph.cmd_embed")
    s = g.add_parser("candidates", help="candidate pairs + label/adjudication batches")
    s.add_argument("--k1", type=int, default=5)
    s.add_argument("--k4", type=int, default=3)
    s.add_argument("--n-label", type=int, default=200)
    s.add_argument("--seed", type=int, default=4)
    s.set_defaults(fn="graph.cmd_candidates")
    s = g.add_parser("apply", help="labels/adjudications -> threshold, merges, idea units, nodes/edges")
    s.add_argument("--threshold", type=float, default=None)
    s.set_defaults(fn="graph.cmd_apply")
    s = g.add_parser("q", help="coverage|redundancy|novelty|order|contradictions|visual-candidates <iu>|continuity <ch>")
    s.add_argument("name")
    s.add_argument("arg", nargs="?")
    s.add_argument("--write", action="store_true", help="also write reports/graph/<name>.json")
    s.add_argument("--max-chars", type=int, default=6000)
    s.set_defaults(fn="graph.cmd_q")
    s = g.add_parser("report", help="novelty/coverage/contradictions/order/overview reports -> reports/graph/")
    s.set_defaults(fn="graph.cmd_report")
    s = g.add_parser("export", help="Mermaid overview + counts -> reports/graph/overview.md")
    s.set_defaults(fn="graph.cmd_export")
