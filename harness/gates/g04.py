"""Gate G4 Semantic graph (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.

 - idea-unit threshold validated: F1 >= 0.85 for 'same' on >= 200 labelled pairs (reports/graph/threshold.json, applied rule)
 - 100 % of sentences (S1 + S4) linked to an idea unit (sentence files and graph agree) and, through it, to >= 1 concept
 - >= 95 % of idea units have >= 3 visual candidates scoring at or above the chance floor (p95 of random unit-asset cosine)
 - novelty, coverage and contradiction reports written (plus order and overview)
 - graph files validate against their schemas; every edge endpoint exists; all label/adjudication/definition batches judged
"""
import collections
import glob
import json
import os
import sys

MIN_F1, MIN_LABELLED, MIN_VISUAL_SHARE, MIN_VISUAL = 0.85, 200, 0.95, 3
REPORTS = ("novelty.md", "novelty.json", "coverage.md", "contradictions.md", "order.md", "overview.md", "threshold.md")


def C(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def check(ctx):
    sys.path.insert(0, ctx.p("tools"))
    from dclib import schema
    cm = ctx.common
    out = []
    R = ctx.p("reports", "graph")
    GR = ctx.p("corpus", "graph")

    # 1 threshold
    th = cm.read_json(os.path.join(R, "threshold.json")) or {}
    comb = th.get("combined") or {}
    f1 = th.get("f1")
    out.append(C("threshold_f1", f1 is not None and f1 >= MIN_F1 and th.get("labelled", 0) >= MIN_LABELLED,
                 f"F1 {f1} (P {comb.get('precision')}, R {comb.get('recall')}) at tau {th.get('threshold')} on {th.get('labelled')} labelled pairs; "
                 f"rule: {th.get('rule')}; cosine only {th.get('cos_only', {}).get('f1')}; 5-fold CV {th.get('cv5', {}).get('combined', {}).get('f1')}"))

    # 2 batches
    gd = ctx.p("data", "derived", "graph")
    nb, bad = 0, []
    for f in sorted(glob.glob(os.path.join(gd, "*_batch_*.json"))):
        if f.endswith(".out.json"):
            continue
        nb += 1
        b, o = cm.read_json(f), cm.read_json(f[:-5] + ".out.json")
        if not o:
            bad.append(os.path.basename(f) + " (no output)")
            continue
        want = {(p["a"], p["b"]) for p in b["pairs"]} if "pairs" in b else {c["id"] for c in b["concepts"]}
        got = {(p.get("a"), p.get("b")) for p in o.get("pairs", [])} if "pairs" in b else {c.get("id") for c in o.get("concepts", [])}
        if want - got:
            bad.append(f"{os.path.basename(f)} ({len(want - got)} unanswered)")
    out.append(C("batches_judged", nb > 0 and not bad, f"{nb - len(bad)}/{nb} batches fully judged" + (f"; {bad}" if bad else "")))

    # 3 schemas
    errs = []
    for rel in ("corpus/graph/nodes.jsonl", "corpus/graph/edges.jsonl") + tuple(
            os.path.relpath(f, ctx.root) for f in sorted(glob.glob(ctx.p("corpus", "sentences", "*.jsonl")))):
        rule = schema.rule_for(rel)
        if rule is None:
            errs.append(f"{rel}: no schema rule")
            continue
        errs += schema.validate_file(ctx.p(*rel.split("/")), rule, limit=5)
    out.append(C("schemas", not errs, "nodes, edges and sentence files valid" if not errs else "; ".join(errs[:5])))

    nodes = cm.read_jsonl(os.path.join(GR, "nodes.jsonl"))
    edges = cm.read_jsonl(os.path.join(GR, "edges.jsonl"))
    ids = {n["id"] for n in nodes}
    dangling = [e for e in edges if e["src"] not in ids or e["dst"] not in ids]
    out.append(C("edge_endpoints", not dangling, f"{len(edges)} edges, {len(dangling)} with a missing endpoint"
                 + (f" e.g. {dangling[0]['src']} -> {dangling[0]['dst']} ({dangling[0]['type']})" if dangling else "")))

    # 4 sentences -> idea unit -> concept
    ius = {n["id"]: n for n in nodes if n["type"] == "IdeaUnit"}
    about = collections.defaultdict(set)
    for e in edges:
        if e["type"] == "about" and e["dst"].startswith("c:"):
            about[e["src"]].add(e["dst"])
    says = {e["src"]: e["dst"] for e in edges if e["type"] == "says"}
    sents, no_iu, mismatch, no_c = 0, 0, 0, 0
    for f in sorted(glob.glob(ctx.p("corpus", "sentences", "*.jsonl"))):
        for s in cm.read_jsonl(f):
            sents += 1
            iu = s.get("idea_unit")
            if not iu or iu not in ius:
                no_iu += 1
                continue
            if says.get(s["sent_id"]) != iu:
                mismatch += 1
            if not about.get(iu):
                no_c += 1
    out.append(C("sentences_in_idea_units", sents > 0 and no_iu == 0 and mismatch == 0,
                 f"{sents - no_iu}/{sents} sentences carry an idea_unit; {mismatch} disagree with the `says` edge"))
    lk = cm.read_json(os.path.join(R, "links.json")) or {}
    out.append(C("sentences_with_concept", sents > 0 and no_c == 0 and no_iu == 0,
                 f"{sents - no_c - no_iu}/{sents} sentences reach >= 1 concept via their unit; unit link method {lk.get('about_method')}"))

    # 5 visual candidates
    floor = lk.get("tau_visual_floor")
    ok_v = sum(1 for n in ius.values() if floor is not None and
               sum(1 for c in n.get("visual_candidates") or [] if c["score"] >= floor) >= MIN_VISUAL)
    share = ok_v / len(ius) if ius else 0.0
    out.append(C("visual_candidates", share >= MIN_VISUAL_SHARE,
                 f"{ok_v}/{len(ius)} units ({100 * share:.1f} %) have >= {MIN_VISUAL} candidates >= floor {floor}"))

    # 6 reports
    miss = [r for r in REPORTS if not os.path.exists(os.path.join(R, r)) or os.path.getsize(os.path.join(R, r)) < 200]
    nv = (cm.read_json(os.path.join(R, "novelty.json")) or {})
    parts = len(nv.get("per_part") or [])
    out.append(C("reports", not miss and parts == 27,
                 f"{len(REPORTS) - len(miss)}/{len(REPORTS)} reports; novelty covers {parts}/27 S4 parts" + (f"; missing {miss}" if miss else "")))
    return out
