#!/usr/bin/env python3
"""P6.4 freeze: hash tokens, type rules, chosen fonts and the component catalog (zod sources + JSON mirrors) into
harness/state/freeze.json. Re-run only under a Council ADR that changes the contract; dc gate check G6a re-hashes every entry.
Run: python3 -I studio/scripts/freeze_p6.py  (after: bash studio/scripts/check_catalog.sh)

ADR-009 cond 5 ordering (G6a verifier round 0): status "frozen" is written ONLY when close conditions 1-4 hold, each with
evidence newer than what it covers, and the frozen JOIN_GAP equals ADR-009 B2 or a decided Council ADR amends B2.
Otherwise the file is written with status "provisional" (hashes kept for drift tracking) and the open preconditions; exit 2."""
import datetime, glob, hashlib, json, os, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FONTS = ["Alexandria-VF.ttf", "IBMPlexSansArabic-Regular.ttf", "IBMPlexSansArabic-Medium.ttf", "IBMPlexSansArabic-SemiBold.ttf",
         "IBMPlexSansArabic-Bold.ttf", "InterTight-VF.ttf", "JetBrainsMono-VF.ttf",
         "OFL-alexandria.txt", "OFL-ibmplexsansarabic.txt", "OFL-intertight.txt", "OFL-jetbrainsmono.txt"]


def sha(p):
    return hashlib.sha256((ROOT / p).read_bytes()).hexdigest()


def group(paths):
    return {p: sha(p) for p in sorted(paths)}


rel = lambda ps: [os.path.relpath(p, ROOT) for p in ps]
groups = {
    "tokens": group(["studio/src/tokens.ts"]),
    "type": group(["studio/src/type/arabic.ts", "studio/src/type/overrides.ts"]),
    "fonts": group(["studio/fonts/LICENSES.md"] + [f"studio/public/fonts/{f}" for f in FONTS]),
    "catalog_src": group(["studio/src/components/contract.ts", "studio/src/components/catalog.ts"] + rel(glob.glob(str(ROOT / "studio/src/components/*/schema.ts")))),
    "catalog_json": group(rel(glob.glob(str(ROOT / "harness/schemas/components/*.json")))),
}
FIX_STILLS = ["F3-standard", "F4-standard", "F4-hero", "F5-standard", "F6-standard", "F7-standard", "F8-standard"]
ADR9_B2 = {"display": {"caps": 0.2, "latin": 0.14}, "text": {"caps": 0.25, "latin": 0.1}}  # ADR-009 B2 (>= 56 px / < 56 px)


def ctime(rel_path):
    """Commit time of the last commit touching the path; mtime if uncommitted or dirty."""
    r = subprocess.run(["git", "-C", str(ROOT), "status", "--porcelain", "--", rel_path], capture_output=True, text=True).stdout.strip()
    t = subprocess.run(["git", "-C", str(ROOT), "log", "-1", "--format=%ct", "--", rel_path], capture_output=True, text=True).stdout.strip()
    return os.path.getmtime(ROOT / rel_path) if (r or not t) else int(t)


def preconditions():
    opn = []
    fix = json.loads((ROOT / "reports/lookdev/r3/fix.json").read_text())
    gate = [i for i in fix.get("typeprobe_ocr", {}).get("items", []) if i.get("gate")]
    if not gate or any(float(i.get("score", 0)) < 0.90 for i in gate) or "ok" not in str(fix.get("type_suite", "")):
        opn.append("cond 1-2: isolated-render OCR gate strings >= 0.90 and type suite ok")
    revs = sorted(glob.glob(str(ROOT / "reports/lookdev/arabic_r*.md")), key=lambda q: int(re.search(r"arabic_r(\d+)\.md$", q).group(1)))
    txt = Path(revs[-1]).read_text(encoding="utf-8") if revs else ""
    v = [(m.group(1), m.start()) for m in re.finditer(r"(?m)^#{2,3} [^\n]*?\b(PASS|FAIL)\b", txt)]
    sec = txt[v[-1][1]:] if v else ""
    covered = ["reports/lookdev/r3/strips/MD-standard_fix.jpg"] + [f"reports/lookdev/r3/stills/{x}_fix.jpg" for x in FIX_STILLS]
    newest = max(ctime(c) for c in covered)
    if not (v and v[-1][0] == "PASS" and "MD-standard_fix" in sec and all(x + "_fix" in sec for x in FIX_STILLS)):
        opn.append("cond 3: latest arabic_r*.md verdict must be PASS (0 blocking, 0 required) and name MD-standard_fix + all 7 *_fix stills [arabic-typographer]")
    elif ctime(os.path.relpath(revs[-1], ROOT)) < newest:
        opn.append("cond 3: the PASS Arabic review predates the newest re-rendered still/strip [arabic-typographer]")
    rg_p = ROOT / "reports/lookdev/r3/regress.json"
    rg = json.loads(rg_p.read_text()) if rg_p.exists() else {}
    if not (rg.get("by") == "render-ops" and rg.get("pass") is True and set(FIX_STILLS) <= set(rg.get("covers") or [])):
        opn.append("cond 4: reports/lookdev/r3/regress.json by render-ops, pass=true, covering the 7 fix stills [render-ops]")
    elif ctime("reports/lookdev/r3/regress.json") < newest:
        opn.append("cond 4: regress.json predates the newest re-rendered still [render-ops]")
    m = re.search(r"export const JOIN_GAP = \{display: \{caps: ([\d.]+), latin: ([\d.]+)\}, text: \{caps: ([\d.]+), latin: ([\d.]+)\}\}",
                  (ROOT / "studio/src/type/arabic.ts").read_text())
    jg = {"display": {"caps": float(m.group(1)), "latin": float(m.group(2))}, "text": {"caps": float(m.group(3)), "latin": float(m.group(4))}} if m else None
    amend = [q for q in glob.glob(str(ROOT / "docs/decisions/ADR-*.md")) if "ADR-009-" not in q
             and re.search(r"(?mi)^Status:\s*decided", (t := Path(q).read_text(encoding="utf-8")))
             and re.search(r"(?i)amends?[^\n]*ADR-009", t) and "JOIN_GAP" in t]
    if jg != ADR9_B2 and not amend:
        opn.append(f"JOIN_GAP {jg} != ADR-009 B2 {ADR9_B2}: a decided Council ADR amending ADR-009 B2 is required [council-chair]")
    return opn, (os.path.relpath(amend[0], ROOT) if amend else None), jg


open_pre, amend_adr, join_gap = preconditions()
head = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
out = {
    "v": 1, "phase": "P6", "step": "03 P6.4 freeze (contract between P7 and P8)",
    "status": "frozen" if not open_pre else "provisional", "open_preconditions": open_pre, "join_gap": join_gap, "join_gap_amendment": amend_adr,
    "frozen_at" if not open_pre else "hashed_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "base_commit": head, "by": "motion-engineer",
    "look": "reports/lookdev/r3 (critic_r3: look 8.01, parity 7.5) + arabic r3 fixes a3b86c1 (re-check PASS d6ac265)",
    "adrs": ["ADR-002", "ADR-003", "ADR-009"],
    "tokens_version": next(l.split("'")[1] for l in (ROOT / "studio/src/tokens.ts").read_text().splitlines() if l.startswith("export const TOKENS_VERSION")),
    "counts": {"components": len(glob.glob(str(ROOT / "studio/src/components/*/schema.ts"))), "json_schemas": len(groups["catalog_json"])},
    "rule": "Any hash change = a contract change: Council ADR first, then re-run this script and dc gate check G6a.",
    "groups": groups,
}
p = ROOT / "harness/state/freeze.json"
p.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print(p, out["status"], {k: len(v) for k, v in groups.items()})
for o in open_pre:
    print("  open:", o)
sys.exit(2 if open_pre else 0)
