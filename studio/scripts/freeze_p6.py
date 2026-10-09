#!/usr/bin/env python3
"""P6.4 freeze: hash tokens, type rules, chosen fonts and the component catalog (zod sources + JSON mirrors) into
harness/state/freeze.json. Re-run only under a Council ADR that changes the contract; dc gate check G6a re-hashes every entry.
Run: python3 -I studio/scripts/freeze_p6.py  (after: bash studio/scripts/check_catalog.sh)"""
import datetime, glob, hashlib, json, os, subprocess
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
head = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
out = {
    "v": 1, "phase": "P6", "step": "03 P6.4 freeze (contract between P7 and P8)", "status": "frozen",
    "frozen_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "base_commit": head, "by": "motion-engineer",
    "look": "reports/lookdev/r3 (critic_r3: look 8.01, parity 7.5) + arabic r3 fixes a3b86c1 (re-check PASS d6ac265)",
    "adrs": ["ADR-002", "ADR-003", "ADR-009"],
    "tokens_version": next(l.split("'")[1] for l in (ROOT / "studio/src/tokens.ts").read_text().splitlines() if l.startswith("export const TOKENS_VERSION")),
    "counts": {"components": len(glob.glob(str(ROOT / "studio/src/components/*/schema.ts"))), "json_schemas": len(groups["catalog_json"])},
    "rule": "Any hash change = a contract change: Council ADR first, then re-run this script and dc gate check G6a.",
    "groups": groups,
}
p = ROOT / "harness/state/freeze.json"
p.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print(p, {k: len(v) for k, v in groups.items()})
