#!/usr/bin/env python3
"""Tests for harness/gates/g06a.py ADR-009 cond 1-3 and arabic_review_pass (per-artifact, recency-aware coverage over all Arabic
reviews via artifact_coverage, B-items, isolated-render OCR gate strings).
Fixtures are synthetic reviews in a scratch repo root (DC_REPO_ROOT). Run: python3 -I tools/tests/test_g06a.py"""
import importlib.util
import json
import os
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TMP = tempfile.mkdtemp(prefix="g06aroot_")
os.environ["DC_REPO_ROOT"] = TMP          # before dclib is imported
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import gates  # noqa: E402

n = 0


def check(cond, msg):
    global n
    n += 1
    if not cond:
        print("FAIL:", msg)
        shutil.rmtree(TMP, ignore_errors=True)
        sys.exit(1)


sp = importlib.util.spec_from_file_location("g06a", os.path.join(ROOT, "harness/gates/g06a.py"))
g = importlib.util.module_from_spec(sp)
sp.loader.exec_module(g)

FAIL_R3 = "# Arabic r3\n\n## Verdict: FAIL (2 blocking)\n\n### B1 F7 chip 6 fused\nAIJI.\n\n### B2 F3 title fused\n"
RECHECK = """## Re-check of the r3 fixes: PASS

| Fix | Evidence | Result |
|---|---|---|
| B1 F7 chip 6 | chip now `AI 6`; OCR `Al 6` | fixed |
| B2 F3 title | 1.00 | fixed |
| B2 F4 card `قسم الـidempotency` / `قسم الـroadmap` | 1.00 / 1.00 | fixed |
| B2 F6 head 72 px | 1.00 | fixed |
| B2 F6 labels 34 px | roadmap 1.00 (was `roadmapJ\\|`) | fixed (dim-ink noise only) |
"""
UNRELATED_PASS = "# Arabic r4: MD strip\n\n## PASS (0 blocking, 0 required) for cond 3, scope MD-standard_fix\n\n| Rule | Evidence | Result |\n|---|---|---|\n| Strings | 7 | ok |\n"
LATER_FAIL = "# Arabic r5\n\n## FAIL (1 blocking)\n\n| B1 F7 chip 6 | AIJI is back after the token change | open |\n"
LATER_FAIL_HEADING = "# Arabic r5\n\n## Verdict: FAIL (1 blocking)\n\n### B2 F3 title: lam fused with partition again\n"
REVIEWS = [("arabic_r3.md", FAIL_R3 + "\n" + RECHECK), ("arabic_r4.md", UNRELATED_PASS)]


def gate_item(i, score, gate=True):
    return {"id": i, "gate": gate, "score": score, "exact": score == 1.0}


def fix(**kw):
    items = [gate_item("F3-title", 1.0), gate_item("F6-head", 0.651, False), gate_item("roadmap-72", 1.0),
             gate_item("idem-72", 1.0), gate_item("F7-chip6", 1.0)]
    f = {"type_suite": "bash check_type.sh: 43 ok", "typeprobe_ocr": {"items": items}}
    f.update(kw)
    return f


def status(revs):
    return {k: v[0] for k, v in g.b_item_status(revs).items()}


# per-artifact B-items
check(set(status(REVIEWS).values()) == {"fixed"}, "B1/B2 PASS rows in an older review stay fixed after a newer unrelated PASS review")
check(g.cond12(fix(), REVIEWS)[0], "cond 1-2 passes: B-items fixed (older review) + 4/4 OCR gate strings + suite ok")
check(set(status(REVIEWS[:1]).values()) == {"fixed"}, "the re-check section closes the earlier FAIL section of the same file (latest wins)")
check(status([("arabic_r3.md", FAIL_R3)])["B1 F7 chip 6"] == "open", "a FAIL section naming the item leaves it open")
check(status([("arabic_r3.md", FAIL_R3)])["B2 F4 card"] == "missing", "an item no review names is missing")
later = REVIEWS + [("arabic_r5.md", LATER_FAIL)]
check(status(later)["B1 F7 chip 6"] == "open" and status(later)["B2 F3 title"] == "fixed", "a later FAIL row re-opens only its own item")
ok, det = g.cond12(fix(), later)
check(not ok and "B1 F7 chip 6" in det and "not closed" in det, "later FAIL -> cond 1-2 fails and names the item")
check(status(REVIEWS + [("arabic_r5.md", LATER_FAIL_HEADING)])["B2 F3 title"] == "open", "a later FAIL heading line re-opens the item")
check(status(later + [("arabic_r6.md", RECHECK)])["B1 F7 chip 6"] == "fixed", "a still later PASS re-check closes it again")
check(status(REVIEWS + [("arabic_r5.md", "## PASS\n\n| B2 F4 card | regressed | open |\n")])["B2 F4 card"] == "open", "a PASS section row with a non-fixed result re-opens")
check(not g.cond12(fix(), [("arabic_r4.md", UNRELATED_PASS)])[0], "no review names the B-items -> fails")

# OCR gate strings
no_chip = fix()
no_chip["typeprobe_ocr"]["items"] = [i for i in no_chip["typeprobe_ocr"]["items"] if i["id"] != "F7-chip6"]
ok, det = g.cond12(no_chip, REVIEWS)
check(not ok and "F7-chip6" in det and "3/4" in det, "missing OCR item F7-chip6 -> fails")
low = fix()
low["typeprobe_ocr"]["items"][0]["score"] = 0.89
check(not g.cond12(low, REVIEWS)[0], "an OCR gate string at 0.89 (< 0.90) fails; the threshold is not weakened")
notgate = fix()
notgate["typeprobe_ocr"]["items"][-1]["gate"] = False
check(not g.cond12(notgate, REVIEWS)[0], "an item present but not flagged as a gate string does not count")
check(not g.cond12(fix(type_suite="3 failed"), REVIEWS)[0], "type suite not ok -> fails")
check(not g.cond12({}, REVIEWS)[0], "empty fix.json -> fails")
check(g.cond12(fix(), REVIEWS)[0], "non-gate probes below 0.90 (F6-head 0.651) do not block")

# end to end through check() in a scratch root
def w(rel, txt):
    p = os.path.join(TMP, *rel.split("/"))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(txt if isinstance(txt, str) else json.dumps(txt, ensure_ascii=False))


def run():
    return {c["name"]: c for c in g.check(gates.Ctx)}


w("harness/state/decisions.json", [{"id": "ADR-009", "gate": "G6a", "status": "decided", "decision": {"G6a": "conditional close"}}])
w("reports/lookdev/r3/fix.json", fix())
w("reports/lookdev/arabic_r3.md", FAIL_R3 + "\n" + RECHECK)
w("reports/lookdev/arabic_r4.md", UNRELATED_PASS)
r = run()["ADR-009_cond_1_2_fixes_ocr"]
check(r["pass"], f"check(): B1 PASS in arabic_r3 + newer unrelated arabic_r4 -> pass ({r['detail'][:120]})")
w("reports/lookdev/arabic_r5.md", LATER_FAIL)
r = run()["ADR-009_cond_1_2_fixes_ocr"]
check(not r["pass"], "check(): later FAIL -> fail")
os.remove(os.path.join(TMP, "reports/lookdev/arabic_r5.md"))
w("reports/lookdev/r3/fix.json", no_chip)
check(not run()["ADR-009_cond_1_2_fixes_ocr"]["pass"], "check(): missing OCR item -> fail")


# per-artifact, recency-aware coverage (cond 3, arabic_review_pass, B-items); artifacts and reviews carry explicit mtimes
FIX = [f"{x}_fix" for x in g.FIX_STILLS]
SCOPE = "Scope: the 7 `*_fix.jpg` stills at 1920x1080 (F3, F4, F4-hero, F5, F6, F7, F8).\n"
R3 = FAIL_R3 + "\n" + RECHECK.replace("PASS\n\n", "PASS\n\n" + SCOPE, 1)
R4 = UNRELATED_PASS
R5 = "# Arabic r5: F7-standard_fix\n\n## PASS: F7-standard_fix (ADR-009 condition 3), 0 blocking\n\nScope: `reports/lookdev/r3/stills/F7-standard_fix.jpg`.\n"
R6_F6 = "# Arabic r6\n\n## FAIL: F6-standard_fix (1 blocking)\n\nThe labels collide again.\n"
R6_LOOSE = "# Arabic r6\n\n## FAIL (1 blocking)\n\nSomething unrelated to any fixed artifact.\n"
check(set(g.names_artifact(n, R3) for n in FIX) == {True}, "r3 re-check section names all seven *_fix stills (full or short id)")
check(not g.names_artifact("MD-standard_fix", R3) and g.names_artifact("MD-standard_fix", R4), "MD-standard_fix is named only by r4")
check(not g.names_artifact("F4-standard_fix", "## PASS\n\n_fix F4-hero only\n"), "F4 short id does not match F4-hero")

ARTS = {n: f"reports/lookdev/r3/{'strips' if n.startswith('MD') else 'stills'}/{n}.jpg" for n in FIX + ["MD-standard_fix"]}
T = {a: 1000 for a in ARTS.values()}


def cover(reviews, times):
    t = {**T, **times}
    return {k: v[0] for k, v in g.artifact_coverage(ARTS, reviews, lambda r: t[r]).items()}


RV = [("reports/lookdev/arabic_r3.md", R3), ("reports/lookdev/arabic_r4.md", R4), ("reports/lookdev/arabic_r5.md", R5)]
TM = {"reports/lookdev/arabic_r3.md": 2000, "reports/lookdev/arabic_r4.md": 3000, "reports/lookdev/arabic_r5.md": 4000}
c = cover(RV, TM)
check(set(c.values()) == {"covered"}, f"cond 3 across r3/r4/r5 is covered per artifact (latest file r5 names only F7): {c}")
c = cover(RV[:2], TM)
check(c["MD-standard_fix"] == "covered" and c["F3-standard_fix"] == "covered", "MD is covered by r4 even though r5 is not the MD review")
c = cover(RV + [("reports/lookdev/arabic_r6.md", R6_F6)], {**TM, "reports/lookdev/arabic_r6.md": 5000})
check(c["F6-standard_fix"] == "open" and {k for k, v in c.items() if v != "covered"} == {"F6-standard_fix"}, f"a later FAIL naming F6 re-opens F6 only: {c}")
c = cover(RV, {**TM, ARTS["F7-standard_fix"]: 4500})
check(c["F7-standard_fix"] == "stale" and {k for k, v in c.items() if v != "covered"} == {"F7-standard_fix"}, f"F7 newer than its only PASS (r5) -> stale for F7 only: {c}")
c = cover(RV, {**TM, ARTS["MD-standard_fix"]: 3000.5})
check(c["MD-standard_fix"] == "stale", "an artifact newer than its only PASS is stale (strictly after)")
c = cover(RV[:1] + RV[2:], TM)
check(c["MD-standard_fix"] == "missing", "an artifact no review names is missing")
check(g.unscoped_fail(ARTS, RV) == [] and g.unscoped_fail(ARTS, RV + [("arabic_r6.md", R6_LOOSE)]) == ["arabic_r6.md"]
      and g.unscoped_fail(ARTS, [("arabic_r6.md", R6_LOOSE)] + RV) == [] and g.unscoped_fail(ARTS, RV + [("r6", R6_F6)]) == [],
      "a FAIL naming no artifact after the last PASS is unscoped; a scoped FAIL or an earlier FAIL is not")
# B-items inherit their artifact's coverage
cv = lambda rv, tm: g.artifact_coverage(ARTS, rv, lambda r: {**T, **tm}[r])
bs = g.b_item_status([(r[-12:], t) for r, t in RV], cv(RV, TM))
check({k: v[0] for k, v in bs.items()} == {k: "fixed" for k in g.B_ITEMS}, "B-items fixed when their *_fix artifacts are covered")
bs = g.b_item_status([(r[-12:], t) for r, t in RV], cv(RV, {**TM, ARTS["F7-standard_fix"]: 4500}))
check(bs["B1 F7 chip 6"][0] == "stale" and bs["B2 F3 title"][0] == "fixed", "B1 goes stale when F7_fix is newer than the PASS covering it; B2 stays fixed")
rv6 = RV + [("reports/lookdev/arabic_r6.md", R6_F6)]
bs = g.b_item_status([(r[-12:], t) for r, t in rv6], cv(rv6, {**TM, "reports/lookdev/arabic_r6.md": 5000}))
check({k for k, v in bs.items() if v[0] != "fixed"} == {"B2 F6 head", "B2 F6 labels"}, "a later FAIL naming F6_fix re-opens only the F6 B-items")

# end to end: cond 3 + arabic_review_pass + cond 1-2 + cond 4 through check()
for q in os.listdir(os.path.join(TMP, "reports", "lookdev")):
    if q.startswith("arabic_r"):
        os.remove(os.path.join(TMP, "reports", "lookdev", q))
w("reports/lookdev/r3/fix.json", fix())
w("reports/lookdev/r3/regress.json", {"by": "render-ops", "pass": True, "covers": g.FIX_STILLS, "outside_px": 0})
for rel in ARTS.values():
    w(rel, "jpg")


def stamp(rel, t):
    os.utime(os.path.join(TMP, *rel.split("/")), (t, t))


def put(n, txt, t):
    w(f"reports/lookdev/arabic_r{n}.md", txt)
    stamp(f"reports/lookdev/arabic_r{n}.md", t)


for rel in ARTS.values():
    stamp(rel, 1000)
stamp("reports/lookdev/r3/regress.json", 1500)
put(3, R3, 2000)
put(4, R4, 3000)
put(5, R5, 4000)
r = run()
names = ("arabic_review_pass", "ADR-009_cond_1_2_fixes_ocr", "ADR-009_cond_3_rerender_review", "ADR-009_cond_4_no_regression_diff")
check(all(r[k]["pass"] for k in names), f"check(): r3 + r4 + r5 each cover their artifacts -> all four rows pass: {[(k, r[k]['detail'][:200]) for k in names if not r[k]['pass']]}")
put(6, R6_F6, 5000)
r = run()
check(not r["ADR-009_cond_3_rerender_review"]["pass"] and "F6-standard_fix open" in r["ADR-009_cond_3_rerender_review"]["detail"]
      and "F3-standard_fix covered" in r["ADR-009_cond_3_rerender_review"]["detail"], "check(): a later FAIL naming F6 fails cond 3 for F6 only")
check(not r["arabic_review_pass"]["pass"] and not r["ADR-009_cond_1_2_fixes_ocr"]["pass"], "check(): the same FAIL fails arabic_review_pass and the F6 B-items")
put(6, R6_LOOSE, 5000)
r = run()
check(not r["arabic_review_pass"]["pass"] and "unscoped" in r["arabic_review_pass"]["detail"] and r["ADR-009_cond_3_rerender_review"]["pass"],
      "check(): an unscoped FAIL after the last PASS fails arabic_review_pass only")
os.remove(os.path.join(TMP, "reports/lookdev/arabic_r6.md"))
stamp(ARTS["F7-standard_fix"], 4500)
r = run()
check(not r["ADR-009_cond_3_rerender_review"]["pass"] and "F7-standard_fix stale" in r["ADR-009_cond_3_rerender_review"]["detail"]
      and "F3-standard_fix covered" in r["ADR-009_cond_3_rerender_review"]["detail"] and not r["arabic_review_pass"]["pass"],
      "check(): F7_fix newer than its only PASS -> stale for F7 only")
check("regress.json is older" in r["ADR-009_cond_4_no_regression_diff"]["detail"] and not r["ADR-009_cond_4_no_regression_diff"]["pass"],
      "check(): regress.json older than the newest re-render fails cond 4")
os.remove(os.path.join(TMP, ARTS["MD-standard_fix"]))
r = run()
check("missing: ['MD-standard_fix']" in r["ADR-009_cond_3_rerender_review"]["detail"], "check(): a missing required artifact is named")

shutil.rmtree(TMP, ignore_errors=True)
print(f"test_g06a: {n} checks ok")
