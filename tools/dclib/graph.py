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
KINDS = ("sent", "scene", "asset", "concept")
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


def _nums(s):
    return sorted(set(s.get("numbers") or []))


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
        cmd = [sys.executable, "-I", C.p("tools", "dc.py"), "graph", "embed", "--worker", f"{kind}:{k}/{n}:{sig}"]
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
def _load_outs(prefix):
    out = {}
    for f in sorted(glob.glob(os.path.join(GDIR, f"{prefix}_batch_*.out.json"))):
        for p in (C.read_json(f) or {}).get("pairs", []):
            rel = p.get("relation") if p.get("relation") in RELATIONS else ("same" if p.get("same") else "different")
            same = bool(p.get("same")) and rel == "same"
            out[(p["a"], p["b"])] = {"same": same, "relation": rel, "why": p.get("why", ""), "file": os.path.basename(f)}
    return out


def _sweep(labelled, cos):
    best = None
    rows = []
    for t100 in range(60, 96):
        t = t100 / 100
        tp = sum(1 for k, v in labelled.items() if v["same"] and cos[k] >= t)
        fp = sum(1 for k, v in labelled.items() if not v["same"] and cos[k] >= t)
        fn = sum(1 for k, v in labelled.items() if v["same"] and cos[k] < t)
        p = tp / (tp + fp) if tp + fp else 1.0
        r = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * p * r / (p + r) if p + r else 0.0
        rows.append({"t": t, "tp": tp, "fp": fp, "fn": fn, "precision": round(p, 3), "recall": round(r, 3), "f1": round(f1, 3)})
        if best is None or f1 > best["f1"] + 1e-9:
            best = rows[-1]
    return best, rows


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
    S = {s["sent_id"]: s for s in sentences()}
    cands = C.read_jsonl(os.path.join(GDIR, "candidates.jsonl"))
    cos = {(c["a"], c["b"]): c["cos"] for c in cands}
    labels = _load_outs("label")
    adjs = _load_outs("adj")
    lab = {k: v for k, v in labels.items() if k in cos}
    rep = {"v": 1, "created": C.now_iso(), "labelled": len(lab), "adjudicated": len(adjs)}
    if len(lab) >= 50:
        best, rows = _sweep(lab, cos)
        tau = args.threshold or best["t"]
        rep.update({"threshold": tau, "best": best, "sweep": rows, "f1_at_0.80": next(r["f1"] for r in rows if r["t"] == 0.80)})
        # adjudicator vs labels on overlap
        ov = [k for k in lab if k in adjs]
        if ov:
            rep["adj_vs_label_agreement"] = round(sum(1 for k in ov if lab[k]["same"] == adjs[k]["same"]) / len(ov), 3)
    else:
        tau = args.threshold or 0.80
        rep.update({"threshold": tau, "best": None, "note": "fewer than 50 labelled pairs: plan default 0.80, provisional"})
    uf = UF()
    edges = []
    nmerge = collections.Counter()
    for c in cands:
        a, b, cs = c["a"], c["b"], c["cos"]
        if a not in S or b not in S:
            continue
        key = (a, b)
        na, nb = _nums(S[a]), _nums(S[b])
        num_conflict = bool(na and nb and set(na) != set(nb))
        dec = labels.get(key) or adjs.get(key)
        src = "label" if key in labels else ("adjudicated" if key in adjs else "threshold")
        if dec:
            same, rel = dec["same"], dec["relation"]
        else:
            same, rel = cs >= tau, ("same" if cs >= tau else None)
            if c["kind"] in ("S4-S1", "alternate_take") and ADJ_LO <= cs <= ADJ_HI and c.get("rank", 1) == 1 and adjs:
                same, rel = False, None           # borderline best-S1 pair without an adjudication: do not merge
        if same and num_conflict:
            same, rel = False, "contradicts?"
        if same:
            uf.u(a, b)
            nmerge[src] += 1
        if c["kind"] == "alternate_take" and rel is None:
            rel = "alternate_take"
        if rel and rel != "different":
            edges.append({"v": 1, "src": a, "dst": b, "type": "duplicates", "w": cs, "relation": rel, "pair_kind": c["kind"],
                          "evidence": f"cos={cs:.3f}; {src}" + (f"={dec['relation']} ({dec['file']}): {dec['why']}" if dec else f" tau={tau}")
                          + (f"; numbers {na} vs {nb}" if num_conflict else "")})
    groups = collections.defaultdict(list)
    for sid in S:
        groups[uf.f(sid)].append(sid)
    ius = []
    sent_iu = {}
    for n, (root, mem) in enumerate(sorted(groups.items(), key=lambda kv: min(kv[1]))):
        iid = f"iu:{n:05d}"
        srcs = collections.defaultdict(list)
        for m in sorted(mem):
            srcs[_sid_audio(m)].append(m)
            sent_iu[m] = iid
        rep_by = {a: max(ms, key=lambda m: len(S[m].get("gloss_en") or "")) for a, ms in srcs.items()}
        has_s1 = any(a.startswith("a:S1") for a in srcs)
        ius.append({"v": 1, "id": iid, "type": "IdeaUnit", "members": sorted(mem), "rep": rep_by,
                    "gloss_en": S[rep_by.get("a:S1:ar-natural") or sorted(rep_by.values())[0]].get("gloss_en"),
                    "sources": sorted(srcs), "in_trunk": has_s1, "novel_vs_trunk": not has_s1,
                    "kinds": sorted({S[m]["kind"] for m in mem})})
    C.write_jsonl(os.path.join(GDIR, "idea_units.jsonl"), ius)
    C.write_jsonl(os.path.join(GDIR, "dup_edges.jsonl"), edges)
    rep.update({"merges": dict(nmerge), "idea_units": len(ius), "multi_member": sum(1 for i in ius if len(i["members"]) > 1),
                "novel_s4_only": sum(1 for i in ius if i["novel_vs_trunk"]), "dup_edges": len(edges)})
    os.makedirs(REP, exist_ok=True)
    C.write_json(os.path.join(REP, "threshold.json"), rep)
    print(json.dumps({k: rep[k] for k in rep if k not in ("sweep",)}, ensure_ascii=False)[:1500])
    assemble()
    return 0


# ------------------------------------------------------------------ assemble nodes/edges
def assemble():
    S = sentences()
    nodes, edges = [], []
    concepts = C.read_jsonl(os.path.join(CORP, "concepts.jsonl")) if os.path.exists(os.path.join(CORP, "concepts.jsonl")) else []
    cids = {c["id"] for c in concepts}
    nodes += concepts
    for c in concepts:
        for r in c.get("requires") or []:
            edges.append({"v": 1, "src": c["id"], "dst": r, "type": "requires", "w": 1.0, "evidence": "definition batch"})
    for p in (C.read_json(C.p("corpus", "canon", "patterns.json")) or {}).get("patterns", []):
        nodes.append({"v": 1, "id": f"pat:{p['id']}", "type": "Pattern", "label_en": p["title"], "chapters": p.get("chapters", [])})
    for ch in (C.read_json(C.p("corpus", "canon", "chapters.json")) or {}).get("chapters", []):
        nodes.append({"v": 1, "id": f"ch:{ch['id']}", "type": "Chapter", "label_en": ch["title_en"], "act": ch.get("act"),
                      "core": ch.get("core"), "patterns": ch.get("patterns", [])})
        for pt in ch.get("patterns", []):
            edges.append({"v": 1, "src": f"ch:{ch['id']}", "dst": f"pat:{pt}", "type": "uses", "w": 1.0, "evidence": "chapters.json"})
    audios = sorted({s["audio_id"] for s in S})
    for a in audios:
        nodes.append({"v": 1, "id": a, "type": "AudioAsset", "alternate_take_of": ALT_TAKES.get(a)})
    ments = C.read_json(os.path.join(GDIR, "concept_mentions.json"), {}) or {}
    s_conc = collections.defaultdict(set)
    for cid, sids in ments.items():
        if cid in cids:
            for sid in sids:
                s_conc[sid].add(cid)
    iu_path = os.path.join(GDIR, "idea_units.jsonl")
    ius = C.read_jsonl(iu_path) if os.path.exists(iu_path) else []
    sent_iu = {m: iu["id"] for iu in ius for m in iu["members"]}
    for s in S:
        nodes.append({"v": 1, "id": s["sent_id"], "type": "Sentence", "audio_id": s["audio_id"], "chapter": s.get("chapter"),
                      "kind": s["kind"], "start_ms": s["start_ms"], "end_ms": s["end_ms"], "idea_unit": sent_iu.get(s["sent_id"])})
        edges.append({"v": 1, "src": s["audio_id"], "dst": s["sent_id"], "type": "contains", "w": 1.0})
        if s["sent_id"] in sent_iu:
            edges.append({"v": 1, "src": s["sent_id"], "dst": sent_iu[s["sent_id"]], "type": "says", "w": 1.0, "evidence": "idea-unit member"})
    for iu in ius:
        about = collections.Counter(c for m in iu["members"] for c in s_conc.get(m, ()))
        nodes.append({k: v for k, v in iu.items() if k != "members"} | {"n_members": len(iu["members"]), "about": [c for c, _ in about.most_common(6)]})
        for c, n in about.most_common(6):
            edges.append({"v": 1, "src": iu["id"], "dst": c, "type": "about", "w": round(n / len(iu["members"]), 3), "evidence": "term mention"})
    dpath = os.path.join(GDIR, "dup_edges.jsonl")
    if os.path.exists(dpath):
        edges += C.read_jsonl(dpath)
    from . import graph_concepts as GC
    for a in C.read_jsonl(C.p("corpus", "visual", "assets.jsonl")):
        nodes.append({"v": 1, "id": a["asset_id"], "type": "VisualAsset", "kind": a["kind"], "source": a["source"], "quality": a.get("quality")})
        for c in a.get("concepts") or []:
            k = "c:" + GC.norm_key(c[2:] if c.startswith("c:") else c)
            if k in cids:
                edges.append({"v": 1, "src": a["asset_id"], "dst": k, "type": "illustrates", "w": 0.5, "evidence": "caption concept tag"})
    os.makedirs(CORP, exist_ok=True)
    C.write_jsonl(os.path.join(CORP, "nodes.jsonl"), nodes)
    C.write_jsonl(os.path.join(CORP, "edges.jsonl"), edges)
    cnt = collections.Counter(n["type"] for n in nodes)
    ecnt = collections.Counter(e["type"] for e in edges)
    C.write_json(os.path.join(CORP, "counts.json"), {"v": 1, "created": C.now_iso(), "nodes": dict(cnt), "edges": dict(ecnt)})
    print(f"graph: nodes {dict(cnt)}; edges {dict(ecnt)}")


# ------------------------------------------------------------------ queries
def _iu_index():
    ius = C.read_jsonl(os.path.join(GDIR, "idea_units.jsonl"))
    return ius, {m: iu for iu in ius for m in iu["members"]}


def q_novelty():
    S = sentences()
    ius, by_s = _iu_index()
    parts = collections.defaultdict(list)
    for s in S:
        if s["audio_id"].startswith("a:S4"):
            parts[s["audio_id"]].append(s)
    out = []
    for a, ss in sorted(parts.items()):
        ss.sort(key=lambda s: s["start_ms"])
        iu_ids = {by_s[s["sent_id"]]["id"] for s in ss}
        novel = {i for i in iu_ids if by_s_any(ius, i)["novel_vs_trunk"]}
        runs, cur = [], []
        for s in ss:
            if by_s[s["sent_id"]]["novel_vs_trunk"]:
                cur.append(s)
            else:
                if cur:
                    runs.append(cur)
                cur = []
        if cur:
            runs.append(cur)
        long = [r for r in runs if r[-1]["end_ms"] - r[0]["start_ms"] >= 20000]
        dur = sum(s["end_ms"] - s["start_ms"] for s in ss)
        ndur = sum(s["end_ms"] - s["start_ms"] for s in ss if by_s[s["sent_id"]]["novel_vs_trunk"])
        out.append({"part": a, "sentences": len(ss), "idea_units": len(iu_ids), "novel_iu_pct": round(100 * len(novel) / max(1, len(iu_ids)), 1),
                    "novel_time_pct": round(100 * ndur / max(1, dur), 1), "runs_ge_20s": len(long),
                    "runs_ge_20s_s": round(sum(r[-1]["end_ms"] - r[0]["start_ms"] for r in long) / 1000, 1)})
    return out


_IU_BY_ID = {}


def by_s_any(ius, iid):
    if not _IU_BY_ID:
        _IU_BY_ID.update({i["id"]: i for i in ius})
    return _IU_BY_ID[iid]


def q_novelty_matrix():
    """S4 part x S1 chapter: share of the part's idea units that merge with a sentence of that chapter."""
    S = {s["sent_id"]: s for s in sentences()}
    ius, by_s = _iu_index()
    mat = collections.defaultdict(collections.Counter)
    tot = collections.Counter()
    for iu in ius:
        s4parts = {_sid_audio(m) for m in iu["members"] if m.startswith("s:S4")}
        chs = {S[m].get("chapter") for m in iu["members"] if m.startswith("s:S1")}
        for p in s4parts:
            tot[p] += 1
            for ch in chs:
                mat[p][ch] += 1
    return {p: {"idea_units": tot[p], **{ch: round(100 * n / tot[p], 1) for ch, n in sorted(mat[p].items())}} for p in sorted(tot)}


def q_coverage():
    concepts = C.read_jsonl(os.path.join(CORP, "concepts.jsonl"))
    out = {"concepts": len(concepts), "by_source": {}, "uncovered": []}
    for c in concepts:
        m = c["mentions"]
        if not m["S1"] and not m["S4"]:
            out["uncovered"].append(c["id"])
    out["by_source"] = {"S1": sum(1 for c in concepts if c["mentions"]["S1"]), "S4": sum(1 for c in concepts if c["mentions"]["S4"]),
                        "S4_only": sum(1 for c in concepts if c["mentions"]["S4"] and not c["mentions"]["S1"]),
                        "S1_only": sum(1 for c in concepts if c["mentions"]["S1"] and not c["mentions"]["S4"])}
    return out


def q_redundancy():
    ius, _ = _iu_index()
    multi = [i for i in ius if len({a for a in i["sources"] if a not in ALT_TAKES}) > 1]
    return {"idea_units": len(ius), "multi_source": len(multi),
            "top": [{"id": i["id"], "sources": i["sources"], "gloss_en": i["gloss_en"]} for i in sorted(multi, key=lambda i: -len(i["sources"]))[:20]]}


def q_contradictions():
    out = []
    for e in C.read_jsonl(os.path.join(GDIR, "dup_edges.jsonl")):
        if "numbers" in (e.get("evidence") or ""):
            out.append(e)
    canon = C.read_json(C.p("corpus", "canon", "contradictions.json")) or {}
    return {"sentence_pairs_with_number_conflict": len(out), "pairs": out[:50], "canon_contradictions": canon.get("items", canon)}


def q_order():
    concepts = C.read_jsonl(os.path.join(CORP, "concepts.jsonl"))
    req = {c["id"]: c.get("requires") or [] for c in concepts}
    if not any(req.values()):
        return {"note": "no requires yet (definition batches not applied)"}
    first = {}
    for s in sentences():
        if s["audio_id"].startswith("a:S1"):
            pass
    ments = C.read_json(os.path.join(GDIR, "concept_mentions.json"), {}) or {}
    for cid, sids in ments.items():
        s1 = sorted(int(x.split(":")[-1]) for x in sids if x.startswith("s:S1"))
        if s1:
            first[cid] = s1[0]
    viol = [{"concept": c, "first": first[c], "requires": r, "first_req": first[r]} for c, rs in req.items() if c in first
            for r in rs if r in first and first[r] > first[c]]
    # cycles
    import itertools  # noqa: F401
    color, cyc = {}, []

    def dfs(u, stack):
        color[u] = 1
        for v in req.get(u, []):
            if color.get(v) == 1:
                cyc.append(stack[stack.index(v):] + [v] if v in stack else [u, v])
            elif not color.get(v):
                dfs(v, stack + [v])
        color[u] = 2
    for u in req:
        if not color.get(u):
            dfs(u, [u])
    return {"trunk_order_violations": len(viol), "violations": viol[:60], "cycles": cyc[:20]}


def q_visual(iu_id, k=8):
    import numpy as np
    ius, _ = _iu_index()
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
    name = args.name
    if name == "novelty":
        res = {"per_part": q_novelty(), "matrix": q_novelty_matrix()}
    elif name == "coverage":
        res = q_coverage()
    elif name == "redundancy":
        res = q_redundancy()
    elif name == "contradictions":
        res = q_contradictions()
    elif name == "order":
        res = q_order()
    elif name == "visual-candidates":
        res = q_visual(args.arg)
    elif name == "continuity":
        res = {"note": "needs the EDL and shot specs (P5/P8); not available in P4"}
    else:
        raise SystemExit(f"unknown query {name}")
    if args.write:
        os.makedirs(REP, exist_ok=True)
        C.write_json(os.path.join(REP, f"{name}.json"), {"v": 1, "created": C.now_iso(), "result": res})
    print(json.dumps(res, ensure_ascii=False, indent=1)[:args.max_chars])
    return 0


def cmd_export(args):
    cnt = C.read_json(os.path.join(CORP, "counts.json")) or {}
    lines = ["# Semantic graph overview", "", f"Generated {C.now_iso()} by `dc graph export`.", "", "```mermaid", "graph LR"]
    for a, b, t in [("AudioAsset", "Sentence", "contains"), ("Sentence", "IdeaUnit", "says"), ("IdeaUnit", "Concept", "about"),
                    ("Concept", "Concept", "requires"), ("VisualAsset", "Concept", "illustrates"), ("Sentence", "Sentence", "duplicates"),
                    ("Chapter", "Pattern", "uses")]:
        na, nb = cnt.get("nodes", {}).get(a, 0), cnt.get("nodes", {}).get(b, 0)
        lines.append(f"  {a}[\"{a} ({na})\"] -- \"{t} ({cnt.get('edges', {}).get(t, 0)})\" --> {b}[\"{b} ({nb})\"]")
    lines += ["```", "", "| Node type | Count |", "|---|---|"] + [f"| {k} | {v} |" for k, v in sorted(cnt.get("nodes", {}).items())]
    lines += ["", "| Edge type | Count |", "|---|---|"] + [f"| {k} | {v} |" for k, v in sorted(cnt.get("edges", {}).items())]
    os.makedirs(REP, exist_ok=True)
    with open(os.path.join(REP, "overview.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"wrote {C.rel(os.path.join(REP, 'overview.md'))}")
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
    s = g.add_parser("export", help="Mermaid overview + counts -> reports/graph/overview.md")
    s.set_defaults(fn="graph.cmd_export")
