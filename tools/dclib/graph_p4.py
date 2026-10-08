"""P4 semantic graph, second half: threshold calibration, idea units, links, analyses (docs/plan/02 section 8, 03 P4, 05 section 5).

apply   label + adjudication outputs -> threshold sweep (cosine-only and cosine+adjudication rule), 5-fold CV, confusion tables;
        merges (union-find over 'same') -> IdeaUnits; subsumes as directed `duplicates`; number conflicts -> `contradicts`;
        idea_unit written back into corpus/sentences/*.jsonl; then assemble()
assemble nodes/edges: says, about (term mention | bge-m3 nearest concept | sentence context), states (numbers <-> data facts),
        illustrates (top-5 assets per idea unit, scores stored), requires (definition batches), contains, uses
report  reports/graph/{threshold,novelty,coverage,contradictions,order,overview}.md + json

Every merge keeps its evidence on the edge and in data/derived/graph/decisions.jsonl (reversible). Claims that differ in numbers are
never merged. All thresholds below are derived from data and written to reports/graph/links.json.
"""
import collections
import glob
import json
import os
import random

from . import common as C
from . import graph as G

N_TOP_ASSETS = 5
MIN_VISUAL = 3
RUN_MIN_MS = 20000


# ------------------------------------------------------------------ calibration
def _prf(tp, fp, fn):
    p = tp / (tp + fp) if tp + fp else 1.0
    r = tp / (tp + fn) if tp + fn else 0.0
    return round(p, 3), round(r, 3), round(2 * p * r / (p + r), 3) if p + r else 0.0


def _confusion(keys, gold, pred):
    tp = sum(1 for k in keys if gold[k] and pred(k))
    fp = sum(1 for k in keys if not gold[k] and pred(k))
    fn = sum(1 for k in keys if gold[k] and not pred(k))
    tn = len(keys) - tp - fp - fn
    p, r, f = _prf(tp, fp, fn)
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn, "precision": p, "recall": r, "f1": f}


def _rules(cos, adjs, numrel):
    def cos_only(t):
        return lambda k: cos[k] >= t

    def combined(t):          # the rule the graph applies: number veto, then adjudication when present, else cosine
        return lambda k: (numrel.get(k) not in G.NUM_VETO) and (adjs[k]["same"] if k in adjs else
                                                                (cos[k] >= t and numrel.get(k) != "nested"))
    return cos_only, combined


def _best(keys, gold, mk, grid):
    best = None
    for t in grid:
        c = _confusion(keys, gold, mk(t))
        if best is None or c["f1"] > best[1]["f1"] + 1e-9:
            best = (t, c)
    return best


def calibrate(S, cos, labels, adjs):
    keys = sorted(k for k in labels if k in cos)
    gold = {k: labels[k]["same"] for k in keys}
    numrel = {k: G._num_rel(G._nums(S[k[0]]), G._nums(S[k[1]])) for k in keys}
    cos_only, combined = _rules(cos, adjs, numrel)
    grid = [t / 100 for t in range(60, 96)]
    sweep = [{"t": t, "cos_only": _confusion(keys, gold, cos_only(t)), "combined": _confusion(keys, gold, combined(t))} for t in grid]
    t_cos, c_cos = _best(keys, gold, cos_only, grid)
    t_comb, c_comb = _best(keys, gold, combined, grid)
    # 5-fold CV of the threshold choice (honest out-of-sample estimate; the 200 pairs also chose tau)
    rnd = random.Random(7)
    ks = keys[:]
    rnd.shuffle(ks)
    folds = [ks[i::5] for i in range(5)]
    pooled = {"cos_only": collections.Counter(), "combined": collections.Counter()}
    taus = {"cos_only": [], "combined": []}
    for i in range(5):
        test = folds[i]
        train = [k for j, f in enumerate(folds) if j != i for k in f]
        for name, mk in (("cos_only", cos_only), ("combined", combined)):
            t, _ = _best(train, gold, mk, grid)
            taus[name].append(t)
            c = _confusion(test, gold, mk(t))
            pooled[name].update({x: c[x] for x in ("tp", "fp", "fn", "tn")})
    cv = {n: dict(pooled[n], **dict(zip(("precision", "recall", "f1"), _prf(pooled[n]["tp"], pooled[n]["fp"], pooled[n]["fn"]))),
                  taus=taus[n]) for n in pooled}
    ov = [k for k in keys if k in adjs]
    by_bin = collections.defaultdict(lambda: collections.Counter())
    for k in keys:
        b = f"{min(0.95, int(cos[k] * 20) / 20):.2f}"
        by_bin[b]["n"] += 1
        by_bin[b]["same"] += gold[k]
    return {"labelled": len(keys), "labelled_same": sum(gold.values()),
            "relations": dict(collections.Counter(labels[k]["relation"] for k in keys)),
            "kinds": dict(collections.Counter(("S4-S1" if k[1].startswith("s:S1") else "S4-S4") for k in keys)),
            "number_vetoed": sum(1 for k in keys if numrel[k] in G.NUM_VETO),
            "number_vetoed_gold_same": sum(1 for k in keys if numrel[k] in G.NUM_VETO and gold[k]),
            "number_nested": sum(1 for k in keys if numrel[k] == "nested"),
            "number_nested_gold_same": sum(1 for k in keys if numrel[k] == "nested" and gold[k]),
            "cos_only": {"threshold": t_cos, **c_cos}, "combined": {"threshold": t_comb, **c_comb},
            "cv5": cv, "adj_overlap": len(ov), "adj_label_agree": sum(1 for k in ov if adjs[k]["same"] == gold[k]),
            "by_bin": {b: dict(v) for b, v in sorted(by_bin.items())}, "sweep": sweep}


# ------------------------------------------------------------------ apply
def cmd_apply(args):
    S = {s["sent_id"]: s for s in G.sentences()}
    cands = C.read_jsonl(os.path.join(G.GDIR, "candidates.jsonl"))
    cos = {(c["a"], c["b"]): c["cos"] for c in cands}
    labels, adjs = G._load_outs("label"), G.load_adjs()
    bs = batch_status()
    missing = bs["missing"]
    cal = calibrate(S, cos, labels, adjs)
    tau = args.threshold or cal["combined"]["threshold"]
    uf = G.UF()
    edges, decisions = [], []
    nmerge = collections.Counter()
    covered_by = collections.defaultdict(set)      # S4 sentence -> S1 sentences that state the same claim or more
    extends = collections.defaultdict(set)         # S4 sentence -> S1 sentences it adds detail to
    for c in cands:
        a, b, cs, kind = c["a"], c["b"], c["cos"], c["kind"]
        if a not in S or b not in S:
            continue
        key = (a, b)
        na, nb = G._nums(S[a]), G._nums(S[b])
        nr = G._num_rel(na, nb)
        dec = labels.get(key) or adjs.get(key)
        src = "label" if key in labels else ("adjudicated" if key in adjs else "threshold")
        if dec:
            same, rel = dec["same"], dec["relation"]
        else:
            same, rel = cs >= tau, ("same" if cs >= tau else None)
            if kind in ("S4-S1", "alternate_take") and G.ADJ_LO <= cs <= G.ADJ_HI and c.get("rank", 1) == 1 and adjs:
                same, rel = False, None           # borderline best-S1 pair without an adjudication: never merged on cosine alone
        ev = f"cos={cs:.3f}; " + (f"{src}={dec['relation']} ({dec['file']}): {dec['why']}" if dec else f"threshold tau={tau}")
        if nr:
            ev += f"; numbers {na} vs {nb}"
        out = None
        if same and nr == "nested" and src == "threshold":
            # cosine-only merge where one number set contains the other: no judge said "same", so the side stating more numbers
            # is recorded as subsuming the other instead of merging (judged pairs with nested numbers do merge)
            same, rel = False, ("subsumes" if len(na) > len(nb) else "subsumed")
            ev += "; nested numbers, threshold only -> directed subsumes"
        if same and nr in G.NUM_VETO:
            out = "contradicts" if nr == "disjoint" else "scope"
            edges.append({"v": 1, "src": a, "dst": b, "type": "contradicts" if nr == "disjoint" else "duplicates", "w": cs,
                          "relation": "number_conflict" if nr == "disjoint" else "scope_differs", "pair_kind": kind, "merged": False,
                          "evidence": ev + "; not merged (numbers differ)"})
        elif same:
            uf.u(a, b)
            nmerge[src] += 1
            out = "merged"
            edges.append({"v": 1, "src": a, "dst": b, "type": "duplicates", "w": cs, "relation": "same", "pair_kind": kind,
                          "merged": True, "evidence": ev})
            if b.startswith("s:S1"):
                covered_by[a].add(b)
        elif rel in ("subsumes", "subsumed"):
            big, small = (a, b) if rel == "subsumes" else (b, a)
            out = "subsumes"
            edges.append({"v": 1, "src": big, "dst": small, "type": "duplicates", "w": cs, "relation": "subsumes", "pair_kind": kind,
                          "merged": False, "evidence": ev + f"; {big} states all of {small} and more"})
            if big.startswith("s:S1") and small.startswith("s:S4") and nr not in G.NUM_VETO:
                covered_by[small].add(big)
            elif small.startswith("s:S1") and big.startswith("s:S4"):
                extends[big].add(small)
        elif rel in ("jointly_covered", "covered_by_other") and a.startswith("s:S4") and b.startswith("s:S1"):
            cov_by = sorted(set(dec.get("with") or []) | ({b} if rel == "jointly_covered" else set()))
            cov_by = [x for x in cov_by if x in S]
            u_nums = sorted({n for x in cov_by for n in G._nums(S[x])})
            unr = G._num_rel(na, u_nums)
            if cov_by and unr not in G.NUM_VETO:
                out = rel
                covered_by[a].update(cov_by)
                for x in cov_by:
                    edges.append({"v": 1, "src": x, "dst": a, "type": "duplicates", "w": cs, "relation": "jointly_covers"
                                  if len(cov_by) > 1 else "covers", "pair_kind": kind, "merged": False,
                                  "evidence": ev + f"; {a} is stated by S1 {', '.join(cov_by)}"})
            else:
                out = "kept_apart_numbers" if cov_by else None
        if dec or out:
            decisions.append({"a": a, "b": b, "cos": cs, "kind": kind, "source": src, "relation": rel, "outcome": out or "kept_apart",
                              "numbers": [na, nb] if nr else None, "file": dec["file"] if dec else None,
                              **({"with": dec["with"]} if dec and dec.get("with") else {})})
    groups = collections.defaultdict(list)
    for sid in S:
        groups[uf.f(sid)].append(sid)
    ius, sent_iu = [], {}
    for n, mem in enumerate(sorted((sorted(m) for m in groups.values()), key=lambda m: m[0])):
        iid = f"iu:{n:05d}"
        srcs = collections.defaultdict(list)
        for m in mem:
            srcs[S[m]["audio_id"]].append(m)
            sent_iu[m] = iid
        rep_by = {a: max(ms, key=lambda m: (len(S[m].get("gloss_en") or ""), m)) for a, ms in sorted(srcs.items())}
        in_trunk = any(a.startswith("a:S1") for a in srcs)
        cov = sorted({x for m in mem for x in covered_by.get(m, ())})
        ext = sorted({x for m in mem for x in extends.get(m, ())})
        ius.append({"v": 1, "id": iid, "type": "IdeaUnit", "members": mem, "rep": rep_by,
                    "gloss_en": S[rep_by.get("a:S1:ar-natural") or sorted(rep_by.values())[0]].get("gloss_en") or "",
                    "sources": sorted(srcs), "in_trunk": in_trunk, "covered_by_trunk": cov, "extends_trunk": ext,
                    "novel_vs_trunk": not in_trunk and not cov,
                    "chapters": sorted({S[m]["chapter"] for m in mem if S[m].get("chapter")}),
                    "kinds": sorted({S[m]["kind"] for m in mem}), "dur_ms": sum(S[m]["end_ms"] - S[m]["start_ms"] for m in mem)})
    C.write_jsonl(os.path.join(G.GDIR, "idea_units.jsonl"), ius)
    C.write_jsonl(os.path.join(G.GDIR, "dup_edges.jsonl"), edges)
    C.write_jsonl(os.path.join(G.GDIR, "decisions.jsonl"), decisions)
    # idea_unit back into the sentence files (same record order, only the idea_unit field changes)
    nfile = 0
    for f in sorted(glob.glob(C.p("corpus", "sentences", "a_S1_*.jsonl"))) + sorted(glob.glob(C.p("corpus", "sentences", "a_S4_*.jsonl"))):
        recs = C.read_jsonl(f)
        for r in recs:
            r["idea_unit"] = sent_iu.get(r["sent_id"])
        C.write_jsonl(f, recs)
        nfile += 1
    sizes = collections.Counter(len(i["members"]) for i in ius)
    rep = {"v": 1, "created": C.now_iso(), "threshold": tau, "rule": "number veto (disjoint or partial number sets; nested sets compatible) -> adjudication (rounds adj, adj2, adj3) if "
                   "present -> cos >= tau (nested numbers on cosine alone -> directed subsumes, not merged)",
           "missing_batches": missing, "batches": bs["batches"], "batches_judged": bs["judged"], "adjudicated": len(adjs),
           "adjudicated_by_round": {p: len(G._load_outs(p)) for p in G.ADJ_PREFIXES}, **{k: v for k, v in cal.items() if k != "sweep"},
           "f1": cal["combined"]["f1"] if not args.threshold else None,
           "merges": dict(nmerge), "edges": dict(collections.Counter(e["relation"] for e in edges)),
           "idea_units": len(ius), "multi_member": sum(1 for i in ius if len(i["members"]) > 1),
           "largest_unit": max(sizes), "size_hist": {str(k): v for k, v in sorted(sizes.items())},
           "s4_units": sum(1 for i in ius if any(a.startswith("a:S4") for a in i["sources"])),
           "novel_vs_trunk": sum(1 for i in ius if i["novel_vs_trunk"]),
           "covered_by_subsumption": sum(1 for i in ius if not i["in_trunk"] and i["covered_by_trunk"]),
           "sentence_files_rewritten": nfile, "sentences_with_unit": len(sent_iu), "sentences": len(S)}
    os.makedirs(G.REP, exist_ok=True)
    C.write_json(os.path.join(G.REP, "threshold.json"), dict(rep, sweep=cal["sweep"]))
    write_threshold_md(rep, cal)
    print(json.dumps({k: rep[k] for k in ("threshold", "cos_only", "combined", "merges", "edges", "idea_units", "multi_member",
                                          "largest_unit", "novel_vs_trunk", "missing_batches")}, ensure_ascii=False)[:2500])
    assemble()
    return 0


def batch_status():
    out = {"batches": 0, "judged": 0, "missing": [], "incomplete": []}
    for f in sorted(glob.glob(os.path.join(G.GDIR, "*_batch_*.json"))):
        if f.endswith(".out.json"):
            continue
        out["batches"] += 1
        b = C.read_json(f)
        o = C.read_json(f[:-5] + ".out.json")
        if not o:
            out["missing"].append(os.path.basename(f))
            continue
        if "pairs" in b:
            want, got = {(p["a"], p["b"]) for p in b["pairs"]}, {(p.get("a"), p.get("b")) for p in o.get("pairs", [])}
        else:
            want, got = {c["id"] for c in b["concepts"]}, {c.get("id") for c in o.get("concepts", [])}
        if want - got:
            out["incomplete"].append(f"{os.path.basename(f)}: {len(want - got)} of {len(want)} unanswered")
        else:
            out["judged"] += 1
    return out


def _cm_table(c):
    return ["| | gold same | gold not same |", "|---|---|---|", f"| predicted same | TP {c['tp']} | FP {c['fp']} |",
            f"| predicted not same | FN {c['fn']} | TN {c['tn']} |"]


def write_threshold_md(rep, cal):
    co, cb, cv = cal["cos_only"], cal["combined"], cal["cv5"]
    L = ["# Idea-unit threshold calibration (G4)", "", f"Generated {rep['created']} by `dc graph apply`.", "",
         f"Labelled pairs: **{cal['labelled']}** (Educator lens; {cal['labelled_same']} same; kinds {cal['kinds']}; relations "
         f"{cal['relations']}). Adjudicated borderline pairs: {rep['adjudicated']}. Missing batch outputs: "
         f"{', '.join(rep['missing_batches']) or 'none'} ({rep['batches_judged']}/{rep['batches']} batches judged).", "",
         "## Result", "",
         "| Rule | tau | Precision | Recall | F1 | 5-fold CV F1 |", "|---|---|---|---|---|---|",
         f"| cosine only | {co['threshold']:.2f} | {co['precision']:.3f} | {co['recall']:.3f} | {co['f1']:.3f} | {cv['cos_only']['f1']:.3f} |",
         f"| cosine + adjudication + number veto (applied) | {cb['threshold']:.2f} | {cb['precision']:.3f} | {cb['recall']:.3f} | "
         f"**{cb['f1']:.3f}** | {cv['combined']['f1']:.3f} |", "",
         f"Cosine alone peaks at F1 {co['f1']:.3f} (target 0.85 not reached). The applied rule (claims with different numbers are never "
         f"merged; a pair in the adjudication band {G.ADJ_LO}-{G.ADJ_HI} that is a best-S1 match takes the LLM adjudication; everything "
         f"else uses cos >= tau) reaches F1 {cb['f1']:.3f} at tau {cb['threshold']:.2f}. The CV column picks tau on 4/5 of the labels "
         f"and scores the held-out 1/5 (pooled); CV taus: cosine {cv['cos_only']['taus']}, combined {cv['combined']['taus']}.", "",
         f"Adjudicator vs labels on the {cal['adj_overlap']} pairs present in both: {cal['adj_label_agree']}/{cal['adj_overlap']} agree. "
         f"Number veto (disjoint or partially overlapping number sets) fired on {cal['number_vetoed']} labelled pairs "
         f"({cal['number_vetoed_gold_same']} of them labelled same). Nested number sets (one contains the other) are compatible: "
         f"{cal['number_nested']} labelled pairs, {cal['number_nested_gold_same']} labelled same.", "",
         f"## Confusion, applied rule at tau {cb['threshold']:.2f}", ""] + _cm_table(cb) + [
         "", f"## Confusion, cosine only at tau {co['threshold']:.2f}", ""] + _cm_table(co) + [
         "", "## Label rate by cosine bin", "", "| cos bin | pairs | same |", "|---|---|---|"] + [
         f"| {b} | {v.get('n', 0)} | {v.get('same', 0)} |" for b, v in cal["by_bin"].items()] + [
         "", "## Sweep (0.70-0.90)", "", "| tau | cos P | cos R | cos F1 | rule P | rule R | rule F1 |", "|---|---|---|---|---|---|---|"] + [
         f"| {r['t']:.2f} | {r['cos_only']['precision']:.3f} | {r['cos_only']['recall']:.3f} | {r['cos_only']['f1']:.3f} | "
         f"{r['combined']['precision']:.3f} | {r['combined']['recall']:.3f} | {r['combined']['f1']:.3f} |"
         for r in cal["sweep"] if 0.70 <= r["t"] <= 0.90] + [
         "", "## Merge outcome", "", f"- merges by source: {rep['merges']}", f"- pair edges by relation: {rep['edges']}",
         f"- idea units: {rep['idea_units']} ({rep['multi_member']} multi-member; largest {rep['largest_unit']} sentences; "
         f"size histogram {rep['size_hist']})",
         f"- novel vs trunk: {rep['novel_vs_trunk']} of {rep['s4_units']} units with S4 audio; {rep['covered_by_subsumption']} units count as "
         "covered only because an S1 sentence subsumes them", "",
         "Reversibility: every decision (label, adjudication or threshold) is in `data/derived/graph/decisions.jsonl` and on the edge "
         "evidence; re-running `dc graph apply --threshold X` rebuilds the units."]
    with open(os.path.join(G.REP, "threshold.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


# ------------------------------------------------------------------ assemble
def _norm_rows(X):
    import numpy as np
    return X / (np.linalg.norm(X, axis=1, keepdims=True) + 1e-9)


def _p95_random(Q, V, seed):
    import numpy as np
    rng = np.random.default_rng(seed)
    i = rng.integers(0, len(Q), 20000)
    j = rng.integers(0, len(V), 20000)
    return round(float(np.percentile((Q[i] * V[j]).sum(1), 95)), 3)


def _clean(d):
    return {k: v for k, v in d.items() if v is not None}


def assemble():
    import numpy as np
    from . import graph_concepts as GC
    S = G.sentences()
    Sb = {s["sent_id"]: s for s in S}
    nodes, edges = [], []
    concepts = C.read_jsonl(os.path.join(G.CORP, "concepts.jsonl"))
    cids = {c["id"] for c in concepts}
    for c in concepts:
        nodes.append(_clean(c))
        for r in c.get("requires") or []:
            edges.append({"v": 1, "src": c["id"], "dst": r, "type": "requires", "w": 1.0, "evidence": "definition batch (LLM, def_batch_NN.out.json)"})
    for p in (C.read_json(C.p("corpus", "canon", "patterns.json")) or {}).get("patterns", []):
        nodes.append({"v": 1, "id": f"pat:{p['id']}", "type": "Pattern", "label_en": p["title"], "chapters": p.get("chapters", [])})
    for ch in (C.read_json(C.p("corpus", "canon", "chapters.json")) or {}).get("chapters", []):
        nodes.append(_clean({"v": 1, "id": f"ch:{ch['id']}", "type": "Chapter", "label_en": ch["title_en"], "act": ch.get("act"),
                             "core": ch.get("core"), "patterns": ch.get("patterns", [])}))
        for pt in ch.get("patterns", []):
            edges.append({"v": 1, "src": f"ch:{ch['id']}", "dst": f"pat:{pt}", "type": "uses", "w": 1.0, "evidence": "chapters.json"})
    for a in sorted({s["audio_id"] for s in S}):
        nodes.append(_clean({"v": 1, "id": a, "type": "AudioAsset", "alternate_take_of": G.ALT_TAKES.get(a)}))
        if a in G.ALT_TAKES:
            edges.append({"v": 1, "src": a, "dst": G.ALT_TAKES[a], "type": "version_of", "w": 1.0,
                          "evidence": "alternate NotebookLM take of part 0 (same brief, different script)"})
    facts = (C.read_json(C.p("corpus", "canon", "data_contract.json")) or {}).get("facts", [])
    for f in facts:
        nodes.append(_clean({"v": 1, "id": f["id"], "type": "DataFact", "label_en": str(f.get("value")), "section": f.get("section"),
                             "chapters": f.get("chapters"), "numbers": [G._nnorm(x) for x in f.get("numbers") or []],
                             "unit": f.get("unit")}))
    ius = C.read_jsonl(os.path.join(G.GDIR, "idea_units.jsonl"))
    sent_iu = {m: iu["id"] for iu in ius for m in iu["members"]}
    for s in S:
        nodes.append(_clean({"v": 1, "id": s["sent_id"], "type": "Sentence", "audio_id": s["audio_id"], "chapter": s.get("chapter"),
                             "kind": s["kind"], "start_ms": s["start_ms"], "end_ms": s["end_ms"], "idea_unit": sent_iu.get(s["sent_id"])}))
        edges.append({"v": 1, "src": s["audio_id"], "dst": s["sent_id"], "type": "contains", "w": 1.0})
        if s["sent_id"] in sent_iu:
            edges.append({"v": 1, "src": s["sent_id"], "dst": sent_iu[s["sent_id"]], "type": "says", "w": 1.0,
                          "evidence": "idea-unit member (union-find over same-claim edges)"})

    # ---- vectors
    sid, sv = G.load_vecs("sent")
    cid, cv = G.load_vecs("concept")
    aid, av = G.load_vecs("asset")
    fid, fv = G.load_vecs("fact")
    pos = {i: j for j, i in enumerate(sid)}
    Q = _norm_rows(np.stack([sv[[pos[m] for m in iu["members"]]].mean(0) for iu in ius]))
    tau_c, tau_v, tau_f = _p95_random(Q, cv, 1), _p95_random(Q, av, 2), _p95_random(Q, fv, 3)
    SC, SA, SF = Q @ cv.T, Q @ av.T, Q @ fv.T

    # ---- about: (1) term mention, (2) bge-m3 nearest concepts >= tau_c, (3) context of neighbour sentences, (4) weak nearest
    ments = C.read_json(os.path.join(G.GDIR, "concept_mentions.json"), {}) or {}
    s_conc = collections.defaultdict(set)
    for c, sids in ments.items():
        if c in cids:
            for x in sids:
                s_conc[x].add(c)
    for s in S:
        for t in s.get("terms") or []:
            if t in cids:
                s_conc[s["sent_id"]].add(t)
    about = {}
    method = collections.Counter()
    for i, iu in enumerate(ius):
        cnt = collections.Counter(c for m in iu["members"] for c in s_conc.get(m, ()))
        links = [(c, round(n / len(iu["members"]), 3), f"term mention in {n}/{len(iu['members'])} member sentences") for c, n in cnt.most_common(6)]
        have = {c for c, _, _ in links}
        order = np.argsort(-SC[i])[:6]
        emb = [(cid[j], round(float(SC[i, j]), 4)) for j in order if SC[i, j] >= tau_c and cid[j] not in have][:2]
        links += [(c, w, f"cos={w:.3f}; bge-m3 nearest concept (tau_c={tau_c}, p95 of random unit-concept cosine)") for c, w in emb]
        about[iu["id"]] = links
        method["term" if cnt else ("embedding" if emb else "none")] += 1
    # neighbours in the same audio, for units with nothing yet
    by_audio = collections.defaultdict(list)
    for s in S:
        by_audio[s["audio_id"]].append(s)
    nb = {}
    for a, ss in by_audio.items():
        ss.sort(key=lambda s: s["start_ms"])
        for k, s in enumerate(ss):
            nb[s["sent_id"]] = [x["sent_id"] for x in ss[max(0, k - 1):k + 2] if x is not s]
    iu_idx = {iu["id"]: i for i, iu in enumerate(ius)}
    for i, iu in enumerate(ius):
        if about[iu["id"]]:
            continue
        ctx = collections.Counter()
        for m in iu["members"]:
            for x in nb.get(m, []):
                for c, w, _ in about.get(sent_iu[x], []):
                    ctx[c] += 1
        if ctx:
            c = max(ctx, key=lambda c: (ctx[c], SC[i, cid.index(c)]))
            about[iu["id"]] = [(c, 0.3, f"context: concept of the neighbouring sentence(s); cos={SC[i, cid.index(c)]:.3f}")]
            method["context"] += 1
            method["none"] -= 1
        else:
            j = int(np.argmax(SC[i]))
            about[iu["id"]] = [(cid[j], round(float(SC[i, j]), 4), f"weak: nearest concept below tau_c={tau_c} (cos={SC[i, j]:.3f})")]
            method["weak_nearest"] += 1
            method["none"] -= 1

    # ---- states: shared numbers with a data fact, and either cos >= tau_f or an S1 member in one of the fact's chapters
    fnums = [{G._nnorm(x) for x in f.get("numbers") or []} for f in facts]
    fpos = {f: j for j, f in enumerate(fid)}
    states = collections.defaultdict(list)
    for i, iu in enumerate(ius):
        nums = {n for m in iu["members"] for n in G._nums(Sb[m])}
        if not nums:
            continue
        chs = set(iu.get("chapters") or [])
        for f, fn in zip(facts, fnums):
            sh = nums & fn
            if not sh:
                continue
            distinct = any(not (x.lstrip("-").isdigit() and 0 <= int(x) <= 10) for x in sh) or len(sh) >= 2
            sc = float(SF[i, fpos[f["id"]]])
            ch_ok = bool(chs & set(f.get("chapters") or []))
            if distinct and (sc >= tau_f or ch_ok):
                states[iu["id"]].append((f["id"], round(sc, 4), f"numbers {sorted(sh)} shared with {f['id']} ({f.get('value')}); cos={sc:.3f}"
                                         + ("; S1 chapter matches" if ch_ok else "")))
    # ---- illustrates: top-5 assets per unit. Query = unit centroid + 0.5 x mean of the neighbouring sentences (+-1 in the same
    # audio): a short question or transition is illustrated in the context of its passage. Floor recomputed on this query.
    tau_v0 = tau_v
    n_cent = sum(1 for i in range(len(ius)) if (SA[i] >= tau_v0).sum() >= MIN_VISUAL)
    ctxv = []
    for iu in ius:
        nbs = sorted({x for m in iu["members"] for x in nb.get(m, []) if x not in iu["members"]})
        ctxv.append(sv[[pos[x] for x in nbs]].mean(0) if nbs else np.zeros(sv.shape[1], dtype=sv.dtype))
    Qv = _norm_rows(Q + 0.5 * _norm_rows(np.stack(ctxv)))
    tau_v = _p95_random(Qv, av, 2)
    SA = Qv @ av.T
    vis = {}
    for i, iu in enumerate(ius):
        top = np.argsort(-SA[i])[:N_TOP_ASSETS]
        vis[iu["id"]] = [(aid[j], round(float(SA[i, j]), 4)) for j in top]
    for i, iu in enumerate(ius):
        a_links, f_links, v_links = about[iu["id"]], states.get(iu["id"], []), vis[iu["id"]]
        node = {k: v for k, v in iu.items() if k != "members"}
        node.update({"members": iu["members"], "n_members": len(iu["members"]), "about": [c for c, _, _ in a_links],
                     "states": [f for f, _, _ in f_links],
                     "visual_candidates": [{"asset": a, "score": s} for a, s in v_links],
                     "n_visual_ge_floor": sum(1 for _, s in v_links if s >= tau_v)})
        nodes.append(node)
        for c, w, ev in a_links:
            edges.append({"v": 1, "src": iu["id"], "dst": c, "type": "about", "w": min(1.0, max(0.0, w)), "evidence": ev})
        for f, w, ev in f_links:
            edges.append({"v": 1, "src": iu["id"], "dst": f, "type": "states", "w": max(0.0, w), "evidence": ev})
        for r, (a, s) in enumerate(v_links):
            edges.append({"v": 1, "src": a, "dst": iu["id"], "type": "illustrates", "w": max(0.0, s), "rank": r + 1,
                          "evidence": f"cos={s:.3f}; rank {r + 1}; bge-m3 caption+OCR vs unit centroid; floor {tau_v}; thumbnail rerank in P8"})
    edges += C.read_jsonl(os.path.join(G.GDIR, "dup_edges.jsonl"))
    for a in C.read_jsonl(C.p("corpus", "visual", "assets.jsonl")):
        nodes.append(_clean({"v": 1, "id": a["asset_id"], "type": "VisualAsset", "kind": a["kind"], "source": a["source"], "quality": a.get("quality")}))
        for c in a.get("concepts") or []:
            k = "c:" + GC.norm_key(c[2:] if c.startswith("c:") else c)
            if k in cids:
                edges.append({"v": 1, "src": a["asset_id"], "dst": k, "type": "illustrates", "w": 0.5, "evidence": "caption concept tag"})
    C.write_jsonl(os.path.join(G.CORP, "nodes.jsonl"), nodes)
    C.write_jsonl(os.path.join(G.CORP, "edges.jsonl"), edges)
    cnt = collections.Counter(n["type"] for n in nodes)
    ecnt = collections.Counter(e["type"] for e in edges)
    C.write_json(os.path.join(G.CORP, "counts.json"), {"v": 1, "created": C.now_iso(), "nodes": dict(cnt), "edges": dict(ecnt)})
    links = {"v": 1, "created": C.now_iso(), "tau_concept": tau_c, "tau_visual_floor": tau_v, "tau_fact": tau_f,
             "thresholds_note": "each tau = 95th percentile of cosine between random (idea unit, target) pairs, 20k samples",
             "about_method": dict(method), "about_edges": ecnt.get("about", 0),
             "units_with_states": len(states), "states_edges": sum(len(v) for v in states.values()),
             "units_ge3_visual_above_floor": sum(1 for v in vis.values() if sum(1 for _, s in v if s >= tau_v) >= MIN_VISUAL),
             "units_ge3_visual_centroid_only": n_cent, "tau_visual_centroid_only": tau_v0,
             "units": len(ius), "visual_top1_median": round(float(np.median(SA.max(1))), 3)}
    C.write_json(os.path.join(G.REP, "links.json"), links)
    print(f"graph: nodes {dict(cnt)}; edges {dict(ecnt)}")
    print(json.dumps(links))


# ------------------------------------------------------------------ analyses
def _load():
    S = {s["sent_id"]: s for s in G.sentences()}
    ius = C.read_jsonl(os.path.join(G.GDIR, "idea_units.jsonl"))
    by_s = {m: iu for iu in ius for m in iu["members"]}
    return S, ius, by_s


def novelty():
    S, ius, by_s = _load()
    chapters_of = {}
    for iu in ius:
        chapters_of[iu["id"]] = sorted({S[m]["chapter"] for m in iu["members"] + iu["covered_by_trunk"] if m.startswith("s:S1")})
    ments = C.read_json(os.path.join(G.GDIR, "concept_mentions.json"), {}) or {}
    s_conc = collections.defaultdict(set)
    for c, sids in ments.items():
        for x in sids:
            s_conc[x].add(c)
    s1_conc = {c for x, cs in s_conc.items() if x.startswith("s:S1") for c in cs}
    unit_conc = {iu["id"]: {c for m in iu["members"] for c in s_conc.get(m, ())} for iu in ius}
    parts = collections.defaultdict(list)
    for s in S.values():
        if s["audio_id"].startswith("a:S4"):
            parts[s["audio_id"]].append(s)
    per, matrix = [], {}
    for a, ss in sorted(parts.items()):
        ss.sort(key=lambda s: s["start_ms"])
        units = {by_s[s["sent_id"]]["id"]: by_s[s["sent_id"]] for s in ss}
        novel = {i for i, u in units.items() if u["novel_vs_trunk"]}
        shared_s4 = {i for i, u in units.items() if any(x.startswith("a:S4") and x != a for x in u["sources"])}
        runs, cur = [], []
        for s in ss + [None]:
            if s is not None and by_s[s["sent_id"]]["novel_vs_trunk"]:
                cur.append(s)
                continue
            if cur and cur[-1]["end_ms"] - cur[0]["start_ms"] >= RUN_MIN_MS:
                runs.append({"start_ms": cur[0]["start_ms"], "end_ms": cur[-1]["end_ms"],
                             "dur_s": round((cur[-1]["end_ms"] - cur[0]["start_ms"]) / 1000, 1), "n_sentences": len(cur),
                             "sent_ids": [x["sent_id"] for x in cur], "idea_units": sorted({by_s[x["sent_id"]]["id"] for x in cur})})
            cur = []
        dur = ss[-1]["end_ms"] - ss[0]["start_ms"]
        speech = sum(s["end_ms"] - s["start_ms"] for s in ss)
        nspeech = sum(s["end_ms"] - s["start_ms"] for s in ss if by_s[s["sent_id"]]["novel_vs_trunk"])
        chs = collections.Counter(ch for i in units for ch in chapters_of[i])
        matrix[a] = {ch: round(100 * n / len(units), 1) for ch, n in sorted(chs.items())}
        per.append({"part": a, "alternate_take_of": G.ALT_TAKES.get(a), "sentences": len(ss), "idea_units": len(units),
                    "novel_units": len(novel), "novel_unit_pct": round(100 * len(novel) / len(units), 1),
                    "novel_speech_pct": round(100 * nspeech / max(1, speech), 1), "shared_with_other_s4_pct": round(100 * len(shared_s4) / len(units), 1),
                    "span_s": round(dur / 1000, 1), "runs_ge_20s": len(runs), "runs_ge_20s_total_s": round(sum(r["dur_s"] for r in runs), 1),
                    "top_trunk_chapters": [ch for ch, _ in chs.most_common(3)],
                    "units_with_terms": sum(1 for i in units if unit_conc[i]),
                    "concept_new_pct": round(100 * sum(1 for i in units if unit_conc[i] and not unit_conc[i] & s1_conc)
                                             / max(1, sum(1 for i in units if unit_conc[i])), 1), "runs": runs})
    s4u = [u for u in ius if any(x.startswith("a:S4") for x in u["sources"])]
    tot = {"s4_units": len(s4u), "novel_units": sum(1 for u in s4u if u["novel_vs_trunk"]),
           "novel_unit_pct": round(100 * sum(1 for u in s4u if u["novel_vs_trunk"]) / len(s4u), 1),
           "runs_ge_20s": sum(p["runs_ge_20s"] for p in per), "runs_ge_20s_total_min": round(sum(p["runs_ge_20s_total_s"] for p in per) / 60, 1),
           "s4_span_min": round(sum(p["span_s"] for p in per) / 60, 1),
           "s4_units_with_terms": sum(1 for u in s4u if unit_conc[u["id"]]),
           "concept_new_pct": round(100 * sum(1 for u in s4u if unit_conc[u["id"]] and not unit_conc[u["id"]] & s1_conc)
                                    / max(1, sum(1 for u in s4u if unit_conc[u["id"]])), 1)}
    tot["residual"] = _residual(tot, by_s)
    return {"totals": tot, "per_part": per, "matrix_part_x_chapter_pct": matrix}


def _residual(tot, by_s):
    """Novelty as a range: the graph's novel share is an upper bound because restatements below the adjudicated cosine bands stay
    'novel'. reports/graph/novelty_audit.json (stratified 40-samples of the novel S4 sentences) gives a clear-restatement rate per
    stratum; the estimate subtracts rate x stratum size (sentences -> units by the novel units/sentences ratio). Stale when the
    audit's novel-sentence count differs from the graph's."""
    au = C.read_json(os.path.join(G.REP, "novelty_audit.json"))
    novel_sent = sum(1 for sid, u in by_s.items() if sid.startswith("s:S4") and u["novel_vs_trunk"])
    if not au:
        return {"status": "no audit"}
    f = tot["novel_units"] / max(1, novel_sent)
    est = {q: sum(v["size"] * (v["rate"] if q == "point" else v["rate_ci95"][0 if q == "low" else 1]) for v in au["strata"].values())
           for q in ("point", "low", "high")}
    pct = {q: round(100 * (tot["novel_units"] - f * n) / tot["s4_units"], 1) for q, n in est.items()}
    return {"status": "current" if au["novel_sentences"] == novel_sent else f"stale (audit {au['novel_sentences']} vs graph {novel_sent})",
            "audit": "reports/graph/novelty_audit.json", "kind": au.get("kind"), "novel_sentences": novel_sent,
            "restated_sentences_est": {q: round(n) for q, n in est.items()},
            "novel_unit_pct_upper_bound": tot["novel_unit_pct"], "novel_unit_pct_est": pct["point"],
            "novel_unit_pct_range95": [pct["high"], pct["low"]]}


def coverage():
    S, ius, by_s = _load()
    concepts = C.read_jsonl(os.path.join(G.CORP, "concepts.jsonl"))
    # coverage counts lexical evidence only (term-mention about edges + concept mention counts); embedding/context links are excluded
    edges = [e for e in C.read_jsonl(os.path.join(G.CORP, "edges.jsonl")) if e["type"] == "about"
             and (e.get("evidence") or "").startswith("term mention")]
    iu_src = {iu["id"]: iu["sources"] for iu in ius}
    by_c = collections.defaultdict(lambda: collections.Counter())
    for e in edges:
        srcs = iu_src.get(e["src"], [])
        by_c[e["dst"]]["S1_units"] += any(x.startswith("a:S1") for x in srcs)
        by_c[e["dst"]]["S4_units"] += any(x.startswith("a:S4") for x in srcs)
    ci = C.read_json(C.p("corpus", "canon", "coverage_index.json")) or {}
    rows = []
    for d in ci.get("domains", []):
        chs = set(d.get("chapters") or [])
        cs = [c for c in concepts if chs & set(c.get("chapters") or [])]
        topics = []
        for t in d.get("topics", []):
            tl = t.lower()
            hit = [c["id"] for c in concepts if any(x and (x.lower() in tl or tl in x.lower()) and len(x) >= 3
                                                    for x in [c["label_en"]] + list(c.get("aliases") or []))]
            topics.append({"topic": t, "concepts": hit[:4]})
        rows.append({"domain": d["domain"], "chapters": sorted(chs), "concepts": len(cs),
                     "S1": sum(1 for c in cs if c["mentions"]["S1"] or by_c[c["id"]]["S1_units"]),
                     "S4": sum(1 for c in cs if c["mentions"]["S4"] or by_c[c["id"]]["S4_units"]),
                     "scenes": sum(1 for c in cs if c["mentions"].get("nblm_scenes")),
                     "visual": sum(1 for c in cs if c["mentions"].get("visual")),
                     "no_audio": [c["id"] for c in cs if not (c["mentions"]["S1"] or c["mentions"]["S4"] or by_c[c["id"]]["S1_units"]
                                                              or by_c[c["id"]]["S4_units"])],
                     "topics_total": len(topics), "topics_matched": sum(1 for t in topics if t["concepts"]),
                     "topics_unmatched": [t["topic"] for t in topics if not t["concepts"]]})
    per = [{"id": c["id"], "label_en": c["label_en"], "chapters": c.get("chapters", [])[:4], "S1": c["mentions"]["S1"],
            "S4": c["mentions"]["S4"], "scenes": c["mentions"].get("nblm_scenes", 0), "visual": c["mentions"].get("visual", 0),
            "S1_units": by_c[c["id"]]["S1_units"], "S4_units": by_c[c["id"]]["S4_units"]} for c in concepts]
    tot = {"concepts": len(concepts), "S1": sum(1 for r in per if r["S1"] or r["S1_units"]), "S4": sum(1 for r in per if r["S4"] or r["S4_units"]),
           "S4_only": sum(1 for r in per if (r["S4"] or r["S4_units"]) and not (r["S1"] or r["S1_units"])),
           "S1_only": sum(1 for r in per if (r["S1"] or r["S1_units"]) and not (r["S4"] or r["S4_units"])),
           "no_audio": sum(1 for r in per if not (r["S1"] or r["S4"] or r["S1_units"] or r["S4_units"]))}
    return {"totals": tot, "domains": rows, "gaps": ci.get("gaps", []), "concepts": per}


def contradictions():
    S, ius, by_s = _load()
    E = C.read_jsonl(os.path.join(G.CORP, "edges.jsonl"))
    pairs = [e for e in E if e["type"] == "contradicts"]
    scope = [e for e in E if e.get("relation") == "scope_differs"]
    # unit vs data-contract fact: semantically the fact's sentence (cos >= tau_fact + 0.1) yet no shared number
    import numpy as np
    links = C.read_json(os.path.join(G.REP, "links.json")) or {}
    tf = (links.get("tau_fact") or 0.55) + 0.10
    facts = {f["id"]: f for f in (C.read_json(C.p("corpus", "canon", "data_contract.json")) or {}).get("facts", [])}
    sid, sv = G.load_vecs("sent")
    fid, fv = G.load_vecs("fact")
    pos = {i: j for j, i in enumerate(sid)}
    fact_mm = []
    for s in S.values():
        ns = set(G._nums(s))
        if not ns:
            continue
        sc = fv @ sv[pos[s["sent_id"]]]
        j = int(np.argmax(sc))
        f = facts[fid[j]]
        fn = {G._nnorm(x) for x in f.get("numbers") or []}
        if sc[j] >= tf and fn and not (ns & fn):
            fact_mm.append({"sent_id": s["sent_id"], "fact": f["id"], "cos": round(float(sc[j]), 3), "sentence_numbers": sorted(ns),
                            "fact_numbers": sorted(fn), "fact_value": f.get("value"), "gloss_en": s.get("gloss_en")})
    canon = C.read_json(C.p("corpus", "canon", "contradictions.json")) or {}
    return {"sentence_pairs": [dict(e, a_gloss=S[e["src"]].get("gloss_en"), b_gloss=S[e["dst"]].get("gloss_en")) for e in pairs],
            "scope_pairs": len(scope), "fact_mismatch_threshold": round(tf, 3),
            "fact_mismatch": sorted(fact_mm, key=lambda x: -x["cos"]), "canon": canon.get("items", [])}


def order():
    S, ius, by_s = _load()
    concepts = C.read_jsonl(os.path.join(G.CORP, "concepts.jsonl"))
    req = {c["id"]: c.get("requires") or [] for c in concepts}
    ments = C.read_json(os.path.join(G.GDIR, "concept_mentions.json"), {}) or {}
    s1 = sorted((s for s in S.values() if s["audio_id"].startswith("a:S1")), key=lambda s: s["start_ms"])
    rank = {s["sent_id"]: k for k, s in enumerate(s1)}
    first = {}
    for c, sids in ments.items():
        r = [rank[x] for x in sids if x in rank]
        if r:
            first[c] = s1[min(r)]
    viol, missing = [], []
    for c, rs in req.items():
        if c not in first:
            continue
        for r in rs:
            if r not in first:
                missing.append({"concept": c, "requires": r, "concept_first": first[c]["sent_id"], "concept_chapter": first[c].get("chapter")})
            elif rank[first[r]["sent_id"]] > rank[first[c]["sent_id"]]:
                viol.append({"concept": c, "requires": r, "concept_first": first[c]["sent_id"], "concept_chapter": first[c].get("chapter"),
                             "req_first": first[r]["sent_id"], "req_chapter": first[r].get("chapter"),
                             "same_chapter": first[c].get("chapter") == first[r].get("chapter"),
                             "gap_sentences": rank[first[r]["sent_id"]] - rank[first[c]["sent_id"]]})
    color, cycles = {}, []

    def dfs(u, stack):
        color[u] = 1
        for v in req.get(u, []):
            if color.get(v) == 1:
                cycles.append(stack[stack.index(v):] + [v])
            elif not color.get(v):
                dfs(v, stack + [v])
        color[u] = 2
    for u in sorted(req):
        if not color.get(u):
            dfs(u, [u])
    return {"requires_edges": sum(len(v) for v in req.values()), "concepts_in_trunk": len(first),
            "violations": sorted(viol, key=lambda v: -v["gap_sentences"]),
            "cross_chapter_violations": sum(1 for v in viol if not v["same_chapter"]),
            "missing_prereq_in_trunk": missing, "cycles": cycles}


def _md(path, lines):
    with open(os.path.join(G.REP, path), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def cmd_report(args):
    os.makedirs(G.REP, exist_ok=True)
    now = C.now_iso()
    nv = novelty()
    C.write_json(os.path.join(G.REP, "novelty.json"), {"v": 1, "created": now, **nv})
    t = nv["totals"]
    L = ["# Novelty of the NotebookLM parts (S4) vs the trunk (S1)", "", f"Generated {now} by `dc graph report`. ADR-001 evidence.", "",
         "A unit is *novel* when no S1 sentence is in it and no S1 sentence subsumes any of its members. Runs = maximal stretches of "
         f"consecutive novel sentences in one part, listed when >= {RUN_MIN_MS // 1000} s (start of first to end of last sentence).", "",
         f"Totals: {t['novel_units']} of {t['s4_units']} S4 idea units novel ({t['novel_unit_pct']} %); {t['runs_ge_20s']} runs >= 20 s "
         f"totalling {t['runs_ge_20s_total_min']} min of {t['s4_span_min']} min S4 span.", ""] + ([
         f"Novelty as a range: {t['novel_unit_pct']} % is an upper bound (restatements that no adjudication band reached stay novel). "
         f"The stratified residual audit (`{t['residual']['audit']}`, {t['residual']['kind']}; {t['residual']['status']}) puts "
         f"{t['residual']['restated_sentences_est']['point']} of {t['residual']['novel_sentences']} novel sentences as clear "
         f"restatements of S1 (95 % range {t['residual']['restated_sentences_est']['low']}-{t['residual']['restated_sentences_est']['high']}), "
         f"so the estimated novel share is **{t['residual']['novel_unit_pct_est']} %** (95 % range "
         f"{t['residual']['novel_unit_pct_range95'][0]}-{t['residual']['novel_unit_pct_range95'][1]} %). Run minutes are upper bounds "
         "on the same footing.", ""] if t.get("residual", {}).get("audit") else []) + [
         f"Adjudication: round 1 = best-S1 pairs with cos {G.ADJ_LO}-{G.ADJ_HI}; round 2 = still-novel sentences, rank-1 pairs "
         f"{G.ADJ2_R1_LO}-{G.ADJ_LO}, rank 2-3 pairs >= {G.ADJ2_RANK_LO}, pairs >= {G.ADJ2_LO} sharing a number or >= 2 rare terms; "
         f"round 3 = still-novel sentences sharing >= 1 concept with a rank-1 (cos >= {G.ADJ3_R1_LO}) or rank-2 (cos >= {G.ADJ2_LO}) "
         "S1 match. A sentence is covered when an S1 sentence states the same claim (merge), states it and more (subsumed), or when "
         "several S1 sentences state it jointly (`jointly_covers` / `covers` edges). Nested number sets ({1007} vs {1007, 9}) no "
         "longer veto a judged merge; disjoint or partially overlapping sets still do.", "",
         f"Claim-level novelty is strict (same claim at the same level of detail). Topic-level check: of the {t['s4_units_with_terms']} S4 "
         f"units with a term mention, {t['concept_new_pct']} % mention only concepts that S1 never mentions; the rest restate S1 topics "
         "with new claims, examples or detail (column *Concept-new %*).", "",
         "| Part | Sent. | Units | Novel units % | Novel speech % | Concept-new % | Shared w/ other S4 % | Span s | Runs >= 20 s | Run total s | Top trunk chapters |",
         "|---|---|---|---|---|---|---|---|---|---|---|"]
    for p in nv["per_part"]:
        L.append(f"| {p['part'].split(':')[-1]}{' (alt. take of P00)' if p['alternate_take_of'] else ''} | {p['sentences']} | {p['idea_units']} | "
                 f"{p['novel_unit_pct']} | {p['novel_speech_pct']} | {p['concept_new_pct']} | {p['shared_with_other_s4_pct']} | {p['span_s']} | {p['runs_ge_20s']} | "
                 f"{p['runs_ge_20s_total_s']} | {', '.join(p['top_trunk_chapters'])} |")
    L += ["", "## Novel runs >= 20 s", ""]
    for p in nv["per_part"]:
        if not p["runs"]:
            continue
        L.append(f"### {p['part']}")
        for r in p["runs"]:
            ids = r["sent_ids"]
            L.append(f"- {r['start_ms']}-{r['end_ms']} ms ({r['dur_s']} s, {r['n_sentences']} sentences): `{ids[0]}` .. `{ids[-1]}`")
        L.append("")
    L += ["Full sentence-id lists per run and the S4 part x S1 chapter matrix (% of the part's units that merge with or are subsumed by "
          "a sentence of that chapter) are in `reports/graph/novelty.json`."]
    _md("novelty.md", L)

    cv = coverage()
    C.write_json(os.path.join(G.REP, "coverage.json"), {"v": 1, "created": now, **cv})
    t = cv["totals"]
    L = ["# Coverage: curriculum concepts x sources", "", f"Generated {now} by `dc graph report`.", "",
         f"{t['concepts']} concepts: S1 {t['S1']}, S4 {t['S4']}, S4-only {t['S4_only']}, S1-only {t['S1_only']}, no audio at all {t['no_audio']} "
         "(a concept counts for a source when one of its terms/aliases is mentioned in that source; embedding-only links excluded).", "",
         "## By curriculum domain (coverage index, master.md)", "",
         "| Domain | Chapters | Concepts | in S1 | in S4 | in NBLM scenes | in visuals | Topics matched |", "|---|---|---|---|---|---|---|---|"]
    for r in cv["domains"]:
        L.append(f"| {r['domain']} | {', '.join(r['chapters'])} | {r['concepts']} | {r['S1']} | {r['S4']} | {r['scenes']} | {r['visual']} | "
                 f"{r['topics_matched']}/{r['topics_total']} |")
    L += ["", "Topics without a concept match (lexical label/alias match; candidates for the story-editor):", ""]
    L += [f"- {r['domain']}: {', '.join(r['topics_unmatched'])}" for r in cv["domains"] if r["topics_unmatched"]]
    L += ["", "## S4-only concepts (top 30 by S4 mentions)", "", "| Concept | S4 mentions | S4 units | NBLM scenes |", "|---|---|---|---|"]
    s4o = sorted([c for c in cv["concepts"] if (c["S4"] or c["S4_units"]) and not (c["S1"] or c["S1_units"])], key=lambda c: -c["S4"])
    L += [f"| `{c['id']}` | {c['S4']} | {c['S4_units']} | {c['scenes']} |" for c in s4o[:30]]
    L += ["", "## Concepts with no audio coverage", "", ", ".join(f"`{c['id']}`" for c in cv["concepts"]
                                                                  if not (c["S1"] or c["S4"] or c["S1_units"] or c["S4_units"])) or "none"]
    _md("coverage.md", L)

    ct = contradictions()
    C.write_json(os.path.join(G.REP, "contradictions.json"), {"v": 1, "created": now, **ct})
    L = ["# Contradictions (conflicting numbers across sources)", "", f"Generated {now} by `dc graph report`. Candidates for the "
         "fact-checker; nothing here was merged.", "",
         f"- sentence pairs judged the same claim but with disjoint numbers (`contradicts` edges): **{len(ct['sentence_pairs'])}**",
         f"- pairs with partially different numbers (scope differs, kept apart): {ct['scope_pairs']}",
         f"- sentences closest to a data-contract fact (cos >= {ct['fact_mismatch_threshold']}) that share none of its numbers: "
         f"**{len(ct['fact_mismatch'])}**", f"- canon (master.md) contradictions preserved by ADR-008: {len(ct['canon'])}", "",
         "## Sentence pairs", "", "| a | b | numbers | evidence |", "|---|---|---|---|"]
    for e in ct["sentence_pairs"]:
        L.append(f"| `{e['src']}` {e['a_gloss'] or ''} | `{e['dst']}` {e['b_gloss'] or ''} | | {e['evidence']} |")
    L += ["", "## Sentence vs data contract", "", "| sentence | fact | cos | sentence numbers | fact value | gloss |", "|---|---|---|---|---|---|"]
    L += [f"| `{x['sent_id']}` | `{x['fact']}` | {x['cos']} | {', '.join(x['sentence_numbers'])} | {x['fact_value']} | {x['gloss_en']} |"
          for x in ct["fact_mismatch"][:60]]
    L += ["", "## Canon contradictions (master.md)", ""] + [f"- {k['id']} ({k.get('severity')}): {k.get('detail')}" for k in ct["canon"]]
    _md("contradictions.md", L)

    od = order()
    C.write_json(os.path.join(G.REP, "order.json"), {"v": 1, "created": now, **od})
    L = ["# Prerequisite order vs the S1 trunk", "", f"Generated {now} by `dc graph report`.", "",
         f"{od['requires_edges']} `requires` edges (definition batches); {od['concepts_in_trunk']} concepts first mentioned in S1. "
         f"A violation = concept X first mentioned in S1 before its prerequisite Y.", "",
         f"- violations: **{len(od['violations'])}** ({od['cross_chapter_violations']} across chapters, "
         f"{len(od['violations']) - od['cross_chapter_violations']} inside one chapter)",
         f"- prerequisite never mentioned in S1: {len(od['missing_prereq_in_trunk'])}", f"- cycles in `requires`: {len(od['cycles'])}", "",
         "## Violations (largest gap first)", "", "| concept | first in | requires | first in | gap (sentences) |", "|---|---|---|---|---|"]
    L += [f"| `{v['concept']}` | {v['concept_chapter']} `{v['concept_first']}` | `{v['requires']}` | {v['req_chapter']} `{v['req_first']}` | "
          f"{v['gap_sentences']} |" for v in od["violations"][:80]]
    L += ["", "## Cycles", ""] + [f"- {' -> '.join(c)}" for c in od["cycles"][:30]]
    L += ["", "## Prerequisites missing from the trunk (first 60)", ""] + [
        f"- `{m['concept']}` ({m['concept_chapter']}) requires `{m['requires']}`" for m in od["missing_prereq_in_trunk"][:60]]
    _md("order.md", L)
    export(now)
    print(json.dumps({"novelty": nv["totals"], "coverage": cv["totals"], "contradictions": {"pairs": len(ct["sentence_pairs"]),
                      "fact_mismatch": len(ct["fact_mismatch"]), "canon": len(ct["canon"])},
                      "order": {"violations": len(od["violations"]), "cross_chapter": od["cross_chapter_violations"],
                                "missing": len(od["missing_prereq_in_trunk"]), "cycles": len(od["cycles"])}}))
    return 0


def export(now=None):
    cnt = C.read_json(os.path.join(G.CORP, "counts.json")) or {}
    th = C.read_json(os.path.join(G.REP, "threshold.json")) or {}
    lk = C.read_json(os.path.join(G.REP, "links.json")) or {}
    nn, ne = cnt.get("nodes", {}), cnt.get("edges", {})
    L = ["# Semantic graph overview", "", f"Generated {now or C.now_iso()} by `dc graph report`.", "", "```mermaid", "graph LR"]
    for a, b, t in [("AudioAsset", "Sentence", "contains"), ("Sentence", "IdeaUnit", "says"), ("IdeaUnit", "Concept", "about"),
                    ("IdeaUnit", "DataFact", "states"), ("Concept", "Concept", "requires"), ("VisualAsset", "IdeaUnit", "illustrates"),
                    ("Sentence", "Sentence", "duplicates"), ("Sentence", "Sentence", "contradicts"), ("Chapter", "Pattern", "uses"),
                    ("AudioAsset", "AudioAsset", "version_of")]:
        L.append(f"  {a}[\"{a} ({nn.get(a, 0)})\"] -- \"{t} ({ne.get(t, 0)})\" --> {b}[\"{b} ({nn.get(b, 0)})\"]")
    L += ["```", "", f"Idea-unit rule: tau {th.get('threshold')}, F1 {th.get('combined', {}).get('f1')} on {th.get('labelled')} labelled pairs "
          f"(cosine only {th.get('cos_only', {}).get('f1')}). Link floors (p95 of random cosine): concept {lk.get('tau_concept')}, "
          f"visual {lk.get('tau_visual_floor')}, fact {lk.get('tau_fact')}. `illustrates` counts include {N_TOP_ASSETS} candidates per unit "
          "plus caption concept tags.", "",
          "| Node type | Count |", "|---|---|"] + [f"| {k} | {v} |" for k, v in sorted(nn.items())]
    L += ["", "| Edge type | Count |", "|---|---|"] + [f"| {k} | {v} |" for k, v in sorted(ne.items())]
    _md("overview.md", L)
    return 0
