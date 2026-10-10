#!/usr/bin/env python3
"""P6.4 freeze: hash tokens, type rules, chosen fonts and the component catalog (zod sources + JSON mirrors) into
harness/state/freeze.json. Re-run only under a Council ADR that changes the contract; dc gate check G6a re-hashes every entry.
Run: python3 -I studio/scripts/freeze_p6.py  (after: bash studio/scripts/check_catalog.sh)

ADR-009 cond 5 ordering (G6a verifier round 0): status "frozen" is written ONLY when close conditions 1-4 hold, each with
evidence newer than what it covers, and the frozen JOIN_GAP equals ADR-009 B2 or a decided Council ADR amends B2.
Otherwise the file is written with status "provisional" (hashes kept for drift tracking) and the open preconditions; exit 2.

Contract changes (re-freeze): every hash that differs from the previous freeze.json must be authorised by an entry of
AUTHORISED below: a decided ADR, its chair record in harness/state/decisions.json, the one frozen file, and the exact line
replacements. Undoing exactly those replacements must reproduce the previously frozen hash, so nothing else in the file may
change. Any other difference is an open precondition (status "provisional")."""
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
# Narrow authorisations of frozen-file changes (one entry per ADR x file). `record` = (decisions.json id, decision key, value).
AUTHORISED = [
    {"adr": "ADR-011", "doc": "docs/decisions/ADR-011-timing-conventions.md", "record": ("ADR-011", "Q3", "P2"),
     "path": "studio/src/tokens.ts", "what": "PREVIEW.fps 15 -> 12 (ADR-011 Q3 P2, CR-001) and the TOKENS_VERSION marker",
     "lines": [
         ("export const PREVIEW = deepFreeze({width: 960, height: 540, fps: 15, tier: 'lite' as const});",
          "export const PREVIEW = deepFreeze({width: 960, height: 540, fps: 12, tier: 'lite' as const}); // ADR-011 Q3 P2 (CR-001): 12 fps, an exact divisor of the 24 fps film rate"),
         ("export const TOKENS_VERSION = 'P6-freeze-1 (look-dev r3 + arabic r3 fixes a3b86c1; ADR-002, ADR-003, ADR-009)';",
          "export const TOKENS_VERSION = 'P6-freeze-2 (look-dev r3 + arabic r3 fixes a3b86c1; ADR-002, ADR-003, ADR-009; ADR-011 Q3 PREVIEW.fps 12)';"),
     ]},
]


def authorised_ok(a):
    """The ADR is decided and its chair record holds the authorising value."""
    doc = ROOT / a["doc"]
    if not doc.exists() or not re.search(r"(?mi)^Status:\s*decided", doc.read_text(encoding="utf-8")):
        return False
    dec = json.loads((ROOT / "harness/state/decisions.json").read_text())
    rid, key, val = a["record"]
    return any(d.get("id") == rid and (d.get("decision") or {}).get(key) == val for d in dec)


def applied(a):
    """Every replacement line is present (the change is in the file)."""
    lines = (ROOT / a["path"]).read_text(encoding="utf-8").splitlines()
    return all(lines.count(new) == 1 for _, new in a["lines"])


def reverts_to(a, old_hash):
    """Undoing exactly the authorised replacements reproduces the previously frozen bytes."""
    txt = (ROOT / a["path"]).read_text(encoding="utf-8")
    for old, new in a["lines"]:
        if txt.count(new) != 1:
            return False
        txt = txt.replace(new, old)
    return hashlib.sha256(txt.encode("utf-8")).hexdigest() == old_hash


def base_groups(prev):
    """The last FROZEN hashes: a provisional file keeps them in baseline_groups, so a failed re-freeze cannot launder a change."""
    return (prev.get("baseline_groups") if prev.get("status") != "frozen" and prev.get("baseline_groups") else prev.get("groups")) or {}


def contract_changes(prev):
    """-> (records of authorised changes in force, open preconditions for unauthorised hash changes)."""
    prev_h = {k: v for g in base_groups(prev).values() for k, v in g.items()}
    now_h = {k: v for g in groups.values() for k, v in g.items()}
    recs = {(c["adr"], c["path"]): c for c in prev.get("contract_changes", [])}
    opn = []
    for path in sorted(set(prev_h) | set(now_h)):
        if prev_h.get(path) == now_h.get(path):
            continue
        a = next((a for a in AUTHORISED if a["path"] == path), None)
        if a and authorised_ok(a) and path in prev_h and path in now_h and reverts_to(a, prev_h[path]):
            recs[(a["adr"], path)] = {"adr": a["adr"], "path": path, "what": a["what"], "from": prev_h[path], "to": now_h[path],
                                      "chair_record": "harness/state/decisions.json %s decision.%s = %s" % a["record"]}
        else:
            opn.append(f"unauthorised contract change: {path} hash differs from the previous freeze and no decided ADR in AUTHORISED covers exactly this change [council-chair]")
    for a in AUTHORISED:  # an authorised change already frozen stays listed (idempotent re-runs)
        if (a["adr"], a["path"]) not in recs and applied(a) and authorised_ok(a):
            recs[(a["adr"], a["path"])] = {"adr": a["adr"], "path": a["path"], "what": a["what"], "to": now_h.get(a["path"]),
                                           "chair_record": "harness/state/decisions.json %s decision.%s = %s" % a["record"]}
    return list(recs.values()), opn


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
    # Cond 3 may be met by several arabic-typographer reviews (r3 re-check: 7 *_fix stills; r4: MD strip). For each covered
    # artifact the LATEST verdict section naming it (file order, then position) must be PASS and committed after the artifact.
    revs = sorted(glob.glob(str(ROOT / "reports/lookdev/arabic_r*.md")), key=lambda q: int(re.search(r"arabic_r(\d+)\.md$", q).group(1)))
    covered = {"MD-standard_fix": "reports/lookdev/r3/strips/MD-standard_fix.jpg"} | {f"{x}_fix": f"reports/lookdev/r3/stills/{x}_fix.jpg" for x in FIX_STILLS}
    newest = max(ctime(c) for c in covered.values())
    last = {}  # name -> (verdict, review path)
    for q in revs:
        txt = Path(q).read_text(encoding="utf-8")
        v = [(m.group(1), m.start()) for m in re.finditer(r"(?m)^#{2,3} [^\n]*?\b(PASS|FAIL)\b", txt)]
        for i, (verdict, pos) in enumerate(v):
            sec = txt[pos:v[i + 1][1] if i + 1 < len(v) else len(txt)]
            for name in covered:
                # full name, or the short id (F4 = F4-standard, F4-hero) inside a section that scopes the *_fix stills
                short = name[:-len("_fix")].replace("-standard", "")
                if name in sec or ("_fix" in sec and re.search(rf"\b{re.escape(short)}\b(?!-hero)", sec)):
                    last[name] = (verdict, os.path.relpath(q, ROOT))
    bad = [n for n in covered if last.get(n, ("", ""))[0] != "PASS"]
    stale = [n for n in covered if n not in bad and ctime(last[n][1]) < ctime(covered[n])]
    if bad:
        opn.append(f"cond 3: no PASS arabic_r*.md verdict (0 blocking, 0 required) as latest for {bad} [arabic-typographer]")
    elif stale:
        opn.append(f"cond 3: the PASS Arabic review predates the re-rendered still/strip for {stale} [arabic-typographer]")
    cond3_reviews = sorted({r for _, r in last.values()})
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
    return opn, (os.path.relpath(amend[0], ROOT) if amend else None), jg, cond3_reviews


open_pre, amend_adr, join_gap, cond3_reviews = preconditions()
fz_path = ROOT / "harness/state/freeze.json"
prev = json.loads(fz_path.read_text()) if fz_path.exists() else {}
changes, unauth = contract_changes(prev)
open_pre += unauth
head = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
out = {
    "v": 1, "phase": "P6", "step": "03 P6.4 freeze (contract between P7 and P8)",
    "status": "frozen" if not open_pre else "provisional", "open_preconditions": open_pre, "join_gap": join_gap, "join_gap_amendment": amend_adr, "cond3_reviews": cond3_reviews,
    "frozen_at" if not open_pre else "hashed_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "base_commit": head, "by": "motion-engineer",
    "look": "reports/lookdev/r3 (critic_r3: look 8.01, parity 7.5) + arabic r3 fixes a3b86c1 (re-check PASS d6ac265)",
    "adrs": ["ADR-002", "ADR-003", "ADR-009"] + ([Path(amend_adr).name.split("-join")[0][:7]] if amend_adr else [])
            + sorted({c["adr"] for c in changes}),
    "contract_changes": changes,
    "tokens_version": next(l.split("'")[1] for l in (ROOT / "studio/src/tokens.ts").read_text().splitlines() if l.startswith("export const TOKENS_VERSION")),
    "counts": {"components": len(glob.glob(str(ROOT / "studio/src/components/*/schema.ts"))), "json_schemas": len(groups["catalog_json"])},
    "rule": "Any hash change = a contract change: Council ADR first, then re-run this script and dc gate check G6a.",
    "groups": groups,
}
if open_pre and base_groups(prev):
    out["baseline_groups"] = base_groups(prev)
p = fz_path
p.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print(p, out["status"], {k: len(v) for k, v in groups.items()})
for o in open_pre:
    print("  open:", o)
sys.exit(2 if open_pre else 0)
