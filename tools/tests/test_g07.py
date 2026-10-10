#!/usr/bin/env python3
"""Tests for harness/gates/g07.py in a scratch repo root (DC_REPO_ROOT): the real EDL/word map/corpus are symlinked, the specs,
fact-check, critic, Arabic and coverage evidence are written fresh. Run: python3 -I tools/tests/test_g07.py"""
import importlib.util
import json
import os
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TMP = tempfile.mkdtemp(prefix="g07root_")
os.environ["DC_REPO_ROOT"] = TMP          # before dclib is imported
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import common as C  # noqa: E402
from dclib import gates, qa_arabic, speclint as S  # noqa: E402

n = 0


def check(cond, msg):
    global n
    n += 1
    if not cond:
        print("FAIL:", msg)
        shutil.rmtree(TMP, ignore_errors=True)
        sys.exit(1)


CH = "DD-P06-2"
os.makedirs(os.path.join(TMP, "corpus", "specs"))
for d in os.listdir(os.path.join(ROOT, "corpus")):
    if d != "specs":
        os.symlink(os.path.join(ROOT, "corpus", d), os.path.join(TMP, "corpus", d))
os.makedirs(os.path.join(TMP, "harness", "state"))
for d in ("schemas", "gates"):
    os.symlink(os.path.join(ROOT, "harness", d), os.path.join(TMP, "harness", d))
shutil.copy(os.path.join(ROOT, "harness/state/freeze.json"), os.path.join(TMP, "harness/state/freeze.json"))
SPEC = os.path.join(TMP, "corpus", "specs", f"{CH}.json")
shutil.copy(os.path.join(ROOT, "tools/tests/fixtures/spec", f"{CH}.json"), SPEC)

gs = importlib.util.spec_from_file_location("g07", os.path.join(ROOT, "harness/gates/g07.py"))
g07 = importlib.util.module_from_spec(gs)
gs.loader.exec_module(g07)


def wj(rel, obj):
    p = os.path.join(TMP, *rel.split("/"))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    return p


def evidence(fact=None, critic=None, rounds=None, arabic=None):
    sha = C.sha256_file(SPEC)
    wj(f"reports/facts/{CH}.json", fact if fact is not None else [{"shot_id": f"{CH}-S01", "severity": "minor", "claim": "x", "evidence": "y", "fix": "z"}])
    c = {"v": 1, "chapter": CH, "tier": "storyboard", "round": 2, "metrics": {"spec_sha256": sha},
         "rubric": {f"c{i}": 9 for i in range(1, 11)}, "issues": [], "verdict": "pass", "reviewer": "critic"}
    c.update(critic or {})
    wj(f"reports/qa/storyboard/{CH}.r2.json", c)
    wj(f"reports/qa/storyboard/{CH}.r1.json", dict(c, round=1, verdict="fail"))     # only the latest round counts
    items = [{"text": it["text"]} for it in qa_arabic.items_from_spec(SPEC)[0]]
    wj("reports/qa/arabic/storyboard.json", arabic or {"verdict": "pass", "metrics": {"failed": 0}, "items": items})
    dg = S.digest_specs([CH])
    rr = rounds or [{"round": 1, "by": "critic", "clean": True, "open_issues": 0, "spec_digest": dg},
                    {"round": 2, "by": "critic", "clean": True, "open_issues": 0, "spec_digest": dg}]
    wj("reports/spec/coverage_rounds.json", {"v": 1, "rounds": rr})


def run():
    return {c["name"]: c for c in g07._check(gates.Ctx, [CH])}


def fails(r):
    return sorted(k for k, v in r.items() if not v["pass"])


check(len(g07.check(gates.Ctx)) == 10 and not any(c["pass"] for c in g07.check(gates.Ctx)), "the real gate fails on an empty scratch root (10 checks)")
evidence()
r = run()
check(fails(r) == [], f"all ten checks pass with a clean chapter and evidence: {fails(r)} {[r[k]['detail'] for k in fails(r)]}")
check(len(r) == 10, "ten checks")

evidence(fact=[{"severity": "critical"}])
check("fact_check" in fails(run()), "a critical fact error fails")
evidence(fact=[{"severity": "major"}])
check("fact_check" in fails(run()), "a major fact error fails")
evidence(fact=[{"severity": "minor"}] * 3)
check("fact_check" in fails(run()), "3 minors fail")
evidence(fact=[{"severity": "minor"}] * 2)
check(fails(run()) == [], "2 minors pass")
evidence(fact={"spec_sha256": "0" * 64, "issues": []})
check("fact_check" in fails(run()), "a fact-check of another spec revision is stale")

evidence(critic={"rubric": {f"c{i}": (8 if i < 10 else 7) for i in range(1, 11)}})   # mean 7.9
check("critic_storyboard_rubric" in fails(run()), "mean 7.9 fails")
evidence(critic={"rubric": {f"c{i}": (10 if i < 10 else 5) for i in range(1, 11)}})  # mean 9.5, min 5
check("critic_storyboard_rubric" in fails(run()), "min 5 fails")
evidence(critic={"reviewer": "scene-director"})
check("critic_storyboard_rubric" in fails(run()), "the author cannot grade the storyboard")
evidence(critic={"rubric": {f"c{i}": 10 for i in range(1, 6)}})
check("critic_storyboard_rubric" in fails(run()), "fewer than 10 criteria fails")
evidence(critic={"verdict": "revise"})
check("critic_storyboard_rubric" in fails(run()), "verdict must be pass")
evidence(critic={"metrics": {"spec_sha256": "f" * 64}})
check("critic_storyboard_rubric" in fails(run()), "a critic score for another spec revision is stale")

evidence(arabic={"verdict": "fail", "metrics": {"failed": 2}, "items": []})
check("arabic_copy_approved" in fails(run()), "Arabic report fail")
evidence(arabic={"verdict": "pass", "metrics": {"failed": 0}, "items": [{"text": "x"}]})
check("arabic_copy_approved" in fails(run()), "Arabic report must cover every spec string")

dg = S.digest_specs([CH])
ok1 = {"round": 1, "by": "critic", "clean": True, "open_issues": 0, "spec_digest": dg}
evidence(rounds=[ok1])
check("global_coverage_loop" in fails(run()), "one clean round is not two")
evidence(rounds=[ok1, dict(ok1, round=2, by="scene-director")])
check("global_coverage_loop" in fails(run()), "the author's round does not count")
evidence(rounds=[ok1, dict(ok1, round=2, clean=False)])
check("global_coverage_loop" in fails(run()), "an unclean round does not count")
evidence(rounds=[ok1, dict(ok1, round=2, spec_digest="0" * 64)])
check("global_coverage_loop" in fails(run()), "rounds recorded against other specs do not count")
evidence(rounds=[ok1, dict(ok1, round=3)])
check("global_coverage_loop" in fails(run()), "rounds must be consecutive")

# an edit of the spec after all evidence: lint must still pass but every freshness check must flag it
evidence()
sp = json.load(open(SPEC, encoding="utf-8"))
sp["shots"][0]["intent"] = "edited after review"
wj("corpus/specs/" + f"{CH}.json", sp)
f = fails(run())
check({"critic_storyboard_rubric", "global_coverage_loop"} <= set(f) and "specs_lint_clean" not in f, f"edited spec makes the evidence stale: {f}")

# lint failure propagates
sp["shots"].pop(2)
wj("corpus/specs/" + f"{CH}.json", sp)
f = fails(run())
check("specs_lint_clean" in f and "every_sentence_anchored" in f, f"a broken spec fails lint + anchoring: {f}")

shutil.rmtree(TMP, ignore_errors=True)
print(f"test_g07: {n} checks ok")
