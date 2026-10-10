#!/usr/bin/env python3
"""Plain-assert tests for dc qa arabic. Run: python3 -I tools/tests/test_qa_arabic.py
The r3 look-dev stills (reports/lookdev/r3/stills) are the fixtures: fixed stills must score exact, pre-fix stills must be caught.
OCR tests are SKIPPED (printed) when no tesseract ara+eng is installed; everything else is stdlib + Pillow."""
import json
import os
import subprocess
import sys
import tempfile
from types import SimpleNamespace as NS

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import qa_arabic as Q  # noqa: E402

n = 0
skipped = []


def check(cond, msg):
    global n
    n += 1
    if not cond:
        print("FAIL:", msg)
        sys.exit(1)


FIX = os.path.join(ROOT, "tools/tests/fixtures/qa_arabic")
OCR = Q.find_ocr()
ARGS = NS(ocr=True, no_render=False, min_score=0.9, safe=(68, 38), ocr_cmd=None, gap_em=None)

# ---- segment / breaks are ports of arabic.ts (same vectors as arabic.check.ts)
check(Q.segment("قسم الـroadmap") == [("قسم الـ", False), ("roadmap", True)], "segment: tatweel prefix stays Arabic, Latin isolates")
check(Q.segment("أعلى نتيجة: قسم الـroadmap")[-1] == ("roadmap", True), "segment: colon before the phrase")
check(Q.segment("هو ⟦4 / 6 = 66.67 %⟧ كده") == [("هو ", False), ("4 / 6 = 66.67 %", True), (" كده", False)], "segment: forced isolate")
check(Q.segment("شغّل job؟") == [("شغّل ", False), ("job", True), ("؟", False)], "segment: trailing ؟ leaves the isolate")
check(Q.join_gap_em("الـ", "partition", 92, Q.ADR9_B2) == 0.14 and Q.join_gap_em("قسم الـ", "AI", 34, Q.ADR9_B2) == 0.25, "join gap bands (ADR-009 B2 table)")
check(Q.join_gap_em("قسم ", "partition", 92) == 0.0, "no gap without a tatweel")
check(Q.vis_len("بيحوّل") == 5, "visLen ignores shadda")
lines, ov = Q.break_caption("إزاي أمنع job إنها تحمّل نفس الصفوف مرتين")
check(lines == ["إزاي أمنع job إنها تحمّل", "نفس الصفوف مرتين"] and not ov, f"caption break {lines}")

# ---- pure python cmap (no fontTools)
ar = Q.font_cmap(Q.face_path("ar-display"))
check(0x0640 in ar and 0x0627 in ar and 0x061F in ar, "Alexandria cmap has tatweel, alef, ؟")
check(0x4E2D not in ar and 0x1F600 not in ar, "Alexandria has no CJK/emoji (would be tofu)")
check(all(0x2212 in Q.font_cmap(Q.face_path(f)) for f in ("ar-display", "ar-text", "lat", "mono")), "U+2212 covered by every face")
check(Q.check_tofu("قسم الـroadmap ← 0.165", 34, "label")[0] == [], "tofu: clean mixed string")
check(Q.check_tofu("قسم 中", 34, "label")[0] == ["U+4E2D"], "tofu: CJK is reported")

# ---- OCR normalisation
check(Q.ocr_score("Al 6", "AI 6")[1] and Q.ocr_score("roadmap", "roadmap")[0] == 1.0, "Al/AI equivalent")
check(Q.ocr_score("a1b", "alb")[1], "1/l equivalent")
check(Q.ocr_score("قسم ال ‎roadmap‏", "قسم الـroadmap")[1], "OCR split of ال + isolate + bidi marks is exact")
check(Q.ocr_score("partitiond!", "partition")[0] < 1.0, "join junk is not exact")
check(Q.latin_junk("ال partitiond!", "الـpartition") != "" and Q.latin_junk("ال partition", "الـpartition") == "", "latin_junk")

# ---- static checks
check(any(p.startswith("EASTERN") for p in Q.check_digits("النتيجة ٦٦")), "Eastern digits flagged")
check(Q.check_digits("النتيجة 66.67 %") == [], "Western digits pass")
check(any("JOIN-NO-TATWEEL" in e for e in Q.check_joins("الkafka")), "join: no tatweel")
check(any("JOIN-ARTICLE-SPACE" in e for e in Q.check_joins("قسم ال roadmap")), "join: article + space")
check(Q.check_joins("قسم الـroadmap") == [] and Q.check_joins("الترتيب داخل الـpartition") == [], "join: good strings clean")
check(any("BIDI-UNIT" in e for e in Q.check_bidi("النتيجة 66.67 % من الداتا")), "bidi: unit outside the isolate")
check(Q.check_bidi("النتيجة ⟦66.67 %⟧ من الداتا") == [], "bidi: unit inside the isolate passes")
check(any("BIDI-MULTIWORD" in e for e in Q.check_bidi("استخدم vector database هنا")), "bidi: two Latin words need one isolate")
check(Q.check_bidi("استخدم ⟦vector database⟧ هنا") == [], "bidi: ⟦multi word⟧ passes")
check(any("BIDI-AR-IN-LTR" in e for e in Q.check_bidi("(الـpartition) مهم")), "bidi: '(' swallows the Arabic prefix")
check(any("BIDI-PAREN" in e for e in Q.check_bidi("قسم (partition) مهم")) is False, "bidi: balanced parens inside one isolate pass")
check(any("BIDI-PAREN" in e for e in Q.check_bidi("هو partition) كده")), "bidi: unbalanced paren")
check(any("BIDI-QMARK" in e for e in Q.check_bidi("إزاي job?")), "bidi: Latin ? in Arabic")
check(Q.check_bidi("إزاي job؟") == [], "bidi: ؟ after a Latin isolate passes")
check(any("BIDI-ARROW" in e for e in Q.check_bidi("الأول → التاني")), "bidi: → between Arabic blocks")
check(Q.check_bidi("الأول ← التاني") == [] and Q.check_bidi("0.165 ← 0.227 قسم") == [], "bidi: ← passes, decimals in one token")
check(any("BIDI-EXPR" in e for e in Q.check_bidi("الناتج 4 / 6 = 66 هنا")), "bidi: numeric expression outside an isolate")
e, w = Q.check_copy("اللي أي حد شغال في الداتا بيعمله دايما", "kinetic", 80)
check(any("COPY-WORDS" in x for x in e), "copy: > 6 words kinetic")
e, w = Q.check_copy("اللي أي حد شغال في الداتا بيعمله", "label", 32)
check(e == [], "copy: 7-word label is a label, not a kinetic phrase")
e, w = Q.check_copy("كلمة " * 14, "caption", 40)
check(any("COPY-LINES" in x or "COPY-CHARS" in x for x in e), "copy: caption over 2 lines / 32 chars")
check(any("SIZE-FLOOR" in x for x in Q.check_copy("سطر", "label", 14)[0]), "size floor 18 px (R3 unit)")
check(any("REGISTER-MSA" in x for x in Q.check_copy("ماذا يحدث هنا", "label", 32)[1]), "register: MSA marker warns")

# ---- per-letter animation scan
with tempfile.TemporaryDirectory() as td:
    open(os.path.join(td, "Bad.tsx"), "w").write("export const A=({text})=>text.split('').map((c,i)=><span key={i}>{c}</span>);\n")
    open(os.path.join(td, "Ok.tsx"), "w").write("// latin-only code block\nexport const B=({code})=>code.split('').map((c,i)=><span key={i}>{c}</span>);\n")
    open(os.path.join(td, "Bad2.tsx"), "w").write("const t = label.slice(0, frame / 2); // typewriter\n")
    hits = Q.scan_per_letter([td])
    check(sorted({os.path.basename(h["where"].split(":")[0]) for h in hits}) == ["Bad.tsx", "Bad2.tsx"], f"per-letter scan: {hits}")
check(Q.scan_per_letter([os.path.join(ROOT, "studio/src")]) == [], "studio/src has no per-letter text animation")

# ---- spec extraction
items, flags = Q.items_from_spec(os.path.join(FIX, "demo_spec.json"))
texts = [i["text"] for i in items]
check("الترتيب داخل الـpartition" in texts and "offset" in texts and "الإزاحة" in texts and "KWord" not in texts and "arrive" not in texts and "#fff" not in texts, f"spec strings {texts}")
check(len(flags) == 1 and "per-letter" in flags[0]["what"], f"spec per-letter flag {flags}")

# ---- isolated renders (PIL/Raqm) and OCR
if OCR is None:
    skipped.append("OCR tests (no tesseract ara+eng)")
else:
    gate = [("الترتيب داخل الـpartition", 92, "kinetic"), ("قسم الـroadmap", 72, "kinetic"), ("قسم الـidempotency", 72, "kinetic"),
            ("قسم الـroadmap", 34, "label"), ("قسم الـidempotency", 34, "label"), ("الـSQL", 92, "kinetic"), ("بيحوّل النص لموضع", 92, "kinetic")]
    for t, sz, k in gate:
        r = Q.qa_item_core({"id": "t", "text": t, "size": sz, "kind": k, "sources": []}, OCR, ARGS, None)
        check(r["status"] == "pass" and r["ocr"]["pass"] and r["ocr"]["score"] >= 0.9, f"isolated render passes: {t} {sz}px -> {r['ocr']} {r['problems']}")
    # canon `6 الـAI` (ADR-010 RT-010-4 evidence): tesseract reads Latin `AI` after the tatweel as Arabic `ام`. The result must be reported with its
    # no-join control, never hidden: either it passes, or it carries `control` (and is only a warning if the control fails too).
    r = Q.qa_item_core({"id": "t", "text": "6 الـAI", "size": 32, "kind": "label", "sources": []}, OCR, ARGS, None)
    check(r["ocr"]["pass"] or "control" in r["ocr"], f"AI join case carries a control: {r['ocr']}")
    # the zero-gap render reproduces the r3 B2 defect: junk next to the Latin term, or a failing score
    zero = {b: {"caps": 0.0, "latin": 0.0} for b in ("display", "text")}
    for t, sz in (("قسم الـroadmap", 34), ("الترتيب داخل الـpartition", 92)):
        r = Q.qa_item_core({"id": "t", "text": t, "size": sz, "kind": "label", "sources": []}, OCR, ARGS, zero)
        check(r["status"] == "fail" and any(p.startswith("OCR") for p in r["problems"]), f"no join gap is caught: {t} -> {r['ocr']}")
    # r3 stills fixtures (frame crops)
    fx = Q.load_items(os.path.join(FIX, "r3_stills.json"))
    res = {}
    for it in fx:
        it = {**it, "frame": it["frame"], "sources": [], "kind": it.get("kind", "label")}
        res[it["id"]] = Q.qa_item(it, OCR, ARGS, None)
    must = ["F3-title", "F4-roadmap", "F4-idem", "F6-head", "F6-label-roadmap", "F6-label-idem", "F6-wrong", "F6-weak", "F7-district-3"]
    for i in must:
        check(res[i]["status"] == "pass" and res[i]["ocr"]["exact"], f"fixture {i} exact: {res[i].get('ocr')}")
    check(res["F4-title"]["ocr"]["score"] >= 0.9 and res["F7-title"]["status"] == "pass", "fixtures F4-title, F7-title (known glow noise is a warning)")
    for i in ("NEG-F3-title-prefix", "NEG-F7-chip6-prefix"):
        check(res[i]["expected_fail"] and res[i]["status"] == "pass" and res[i]["ocr"]["pass"] is False, f"pre-fix still {i} is caught: {res[i]['ocr']}")

# ---- Chromium probe mode (probes.json + PNGs from studio/scripts/lookdev_typeprobe.mjs); PNGs faked here with the PIL renderer
if OCR is not None:
    with tempfile.TemporaryDirectory() as td:
        im = Q.render_text({"text": "قسم الـroadmap", "size": 72, "kind": "kinetic"})[0]
        im.save(os.path.join(td, "roadmap-72.png"))
        json.dump([{"id": "roadmap-72", "text": "قسم الـroadmap", "size": 72, "latScale": 0.92, "gate": True}], open(os.path.join(td, "probes.json"), "w"), ensure_ascii=False)
        pi = Q.dedupe(Q.probe_items(td))
        r = Q.qa_item(pi[0], OCR, ARGS, None)
        check(r["evidence"] == "chromium-isolated" and r["status"] == "pass" and r["ocr"]["exact"], f"probe PNG mode {r}")

# ---- CLI exit codes and report
with tempfile.TemporaryDirectory() as td:
    out = os.path.join(td, "r.json")
    base = [sys.executable, "-I", os.path.join(ROOT, "tools/dc.py"), "qa", "arabic", "--out", out, "--label", "t"]
    rc = subprocess.run(base + ["--spec", os.path.join(FIX, "demo_spec.json"), "--no-ocr"], capture_output=True, text=True)
    rep = json.load(open(out))
    check(rc.returncode == 1 and rep["verdict"] == "fail", f"demo spec fails (Eastern digits, per-letter, caption): rc={rc.returncode}")
    check(rep["metrics"]["digits"] == 1 and rep["metrics"]["per_letter_hits"] == 1 and rep["metrics"]["copy"] >= 1, f"demo spec metrics {rep['metrics']}")
    rc = subprocess.run(base + ["--string", "قسم الـroadmap", "--size", "34", "--no-ocr"], capture_output=True, text=True)
    check(rc.returncode == 2 and json.load(open(out))["verdict"] == "incomplete", "--no-ocr never reports pass (exit 2, incomplete)")
    if OCR is not None:
        rc = subprocess.run(base + ["--frames", os.path.join(FIX, "r3_stills.json")], capture_output=True, text=True)
        rep = json.load(open(out))
        check(rc.returncode == 0 and rep["verdict"] == "pass" and rep["metrics"]["negative_caught"] == 2, f"r3 stills fixture run passes: rc={rc.returncode} {rep['metrics']}")
        check(rep["join_policy"]["code_matches_basis"] is True and "ADR-010" in rep["join_policy"]["basis"], f"join policy {rep['join_policy']}")

print(f"ok: {n} checks" + (f" (skipped: {'; '.join(skipped)})" if skipped else ""))
