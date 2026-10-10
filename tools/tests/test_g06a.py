#!/usr/bin/env python3
"""Tests for harness/gates/g06a.py ADR-009 cond 1-2 (per-artifact B-items over all Arabic reviews + isolated-render OCR gate strings).
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

shutil.rmtree(TMP, ignore_errors=True)
print(f"test_g06a: {n} checks ok")
