"""Gate G6a Look (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.

 1 ADR-002/003/004/005 decided (harness/state/decisions.json status + docs/decisions/ADR-00N-*.md present)
 2 style frames: look rubric mean >= 8.0 and AI-Unpacked parity >= 7.5, read from the latest reports/lookdev/critic_r*.json;
   OR a decided ADR waiver in decisions.json whose scope covers G6a item 2 (look/parity) on that round (W-009-LOOK, ADR-009)
 3 latest Arabic review passes: last verdict heading ("## ...: PASS|FAIL") of the latest reports/lookdev/arabic_r*.md
 4 tokens, presets and component catalog frozen: harness/state/freeze.json hashes equal the files; the freeze covers
   studio/src/tokens.ts, studio/src/type/arabic.ts, the chosen fonts + licences, every 04 section 8 catalog name as
   studio/src/components/<Name>/schema.ts and harness/schemas/components/<Name>.json (+ the {word, lead_frames} anchor)
 5 projected final render (pure P12) for the locked runtime (corpus/edl/lock.json total_frames at ADR-002 fps) <= 24 h,
   using the ADR-002 cost model (S/H bands, RT hero share) and the measured blended rate of the latest look-dev perf.json;
   or a decided ADR (ADR-002 reopen) that covers a miss
 6 ADR-009 close conditions (only when the G6a decision is a conditional close): 1-2 fixes + isolated-render OCR gate
   strings >= 0.90; 3 affected stills and MD re-rendered and covered by a PASS Arabic review; 4 render-ops no-regression
   diff (reports/lookdev/r3/regress.json, by render-ops, pass=true, covering the re-rendered set)
"""
import glob
import hashlib
import json
import os
import re

LOOK_MIN, PARITY_MIN, BUDGET_H = 8.0, 7.5, 24.0
ADRS = ["ADR-002", "ADR-003", "ADR-004", "ADR-005"]
FIX_STILLS = ["F3-standard", "F4-standard", "F4-hero", "F5-standard", "F6-standard", "F7-standard", "F8-standard"]
REQUIRED_FREEZE = ["studio/src/tokens.ts", "studio/src/type/arabic.ts", "studio/fonts/LICENSES.md",
                   "studio/src/components/contract.ts", "studio/src/components/catalog.ts",
                   "harness/schemas/components/_WordAnchor.json", "harness/schemas/components/_index.json"]


def C_(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def _sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def _latest(pattern, rx):
    best = None
    for f in glob.glob(pattern):
        m = re.search(rx, os.path.basename(f))
        if m and (best is None or int(m.group(1)) > best[0]):
            best = (int(m.group(1)), f)
    return best


def _decided(decisions, adr):
    d = [x for x in decisions if x.get("id") == adr]
    return d[-1] if d and d[-1].get("status") == "decided" else None


def catalog_names(plan_text):
    """Component names from the 04 section 8 table (backticked identifiers in the table rows)."""
    sec = plan_text.split("## 8 ", 1)[1].split("\n## 9 ", 1)[0]
    names = []
    for line in sec.splitlines():
        if line.startswith("| ") and not line.startswith("| Family") and not line.startswith("|---"):
            cells = line.split("|")
            if len(cells) > 2:
                names += re.findall(r"`([A-Za-z0-9]+)`", cells[2])
    return names


def arabic_verdict(text):
    """Last verdict heading wins: '## <anything>: PASS' or '## Verdict: FAIL (...)'."""
    v = [(m.group(1), m.start()) for m in re.finditer(r"(?m)^#{2,3} [^\n]*?\b(PASS|FAIL)\b", text)]
    return (v[-1][0], text[v[-1][1]:]) if v else (None, "")


def check(ctx):
    cm = ctx.common
    out = []
    decisions = cm.read_json(ctx.p("harness", "state", "decisions.json")) or []

    # 1 ADRs
    miss = []
    for a in ADRS:
        if not _decided(decisions, a) or not glob.glob(ctx.p("docs", "decisions", f"{a}-*.md")):
            miss.append(a)
    out.append(C_("adr_002_005_decided", not miss, "decided: " + ", ".join(a for a in ADRS if a not in miss) + (f"; missing/undecided: {miss}" if miss else "")))

    # 2 look / parity (latest critic round) or a scoped decided waiver
    lc = _latest(ctx.p("reports", "lookdev", "critic_r*.json"), r"critic_r(\d+)\.json$")
    g6a_adr = next((x for x in reversed(decisions) if x.get("gate") == "G6a" and x.get("status") == "decided"), None)
    waiver = None
    if g6a_adr:
        for w in g6a_adr.get("waivers") or []:
            if "look" in str(w.get("what", "")).lower() and "parity" in str(w.get("what", "")).lower():
                waiver = (g6a_adr["id"], w)
    if lc:
        cr = cm.read_json(lc[1]) or {}
        look, par = float(cr.get("look_mean", 0)), float(cr.get("parity_mean", 0))
        met = look >= LOOK_MIN and par >= PARITY_MIN
        in_scope = waiver is not None and f"r{lc[0]}" in str(waiver[1].get("scope", ""))
        det = f"{cm.rel(lc[1])}: look {look} (>= {LOOK_MIN}), parity {par} (>= {PARITY_MIN}), min criterion {cr.get('min_criterion')}"
        if waiver:
            det += f"; {waiver[0]} {waiver[1].get('id')} scope '{waiver[1].get('scope')}' ({'covers' if in_scope else 'does NOT cover'} r{lc[0]})"
        out.append(C_("look_parity", met or in_scope, det + ("" if met else " - below threshold" + (", accepted under the scoped waiver" if in_scope else ""))))
    else:
        out.append(C_("look_parity", False, "no reports/lookdev/critic_r*.json"))

    # 3 latest Arabic review
    la = _latest(ctx.p("reports", "lookdev", "arabic_r*.md"), r"arabic_r(\d+)\.md$")
    a_text = ""
    if la:
        with open(la[1], encoding="utf-8") as f:
            a_text = f.read()
        v, sec = arabic_verdict(a_text)
        out.append(C_("arabic_review_pass", v == "PASS", f"{cm.rel(la[1])}: last verdict heading = {v}: {sec.splitlines()[0][:140] if sec else ''}"))
    else:
        out.append(C_("arabic_review_pass", False, "no reports/lookdev/arabic_r*.md"))

    # 4 freeze
    fz = cm.read_json(ctx.p("harness", "state", "freeze.json"))
    if not fz or fz.get("status") != "frozen":
        out.append(C_("tokens_presets_catalog_frozen", False, "harness/state/freeze.json missing or not status=frozen"))
    else:
        entries = {p: h for g in (fz.get("groups") or {}).values() for p, h in g.items()}
        changed = [p for p, h in entries.items() if not os.path.exists(ctx.p(p)) or _sha(ctx.p(p)) != h]
        with open(ctx.p("docs", "plan", "04_VISUAL_BIBLE_V2.md"), encoding="utf-8") as f:
            names = catalog_names(f.read())
        need = list(REQUIRED_FREEZE)
        need += [f"studio/src/components/{n}/schema.ts" for n in names] + [f"harness/schemas/components/{n}.json" for n in names]
        absent = [p for p in need if p not in entries]
        extra_dirs = sorted(set(os.path.basename(os.path.dirname(p)) for p in glob.glob(ctx.p("studio", "src", "components", "*", "schema.ts"))) - set(names))
        fonts = [p for p in entries if p.startswith("studio/public/fonts/") and p.endswith(".ttf")]
        tokens_txt = open(ctx.p("studio", "src", "tokens.ts"), encoding="utf-8").read()
        presets = all(f"  {k}: {{ms:" in tokens_txt for k in ("arrive", "impact", "label", "count", "morph", "exit"))
        ok = bool(names) and not changed and not absent and not extra_dirs and len(fonts) >= 4 and presets and "TOKENS_VERSION" in tokens_txt
        out.append(C_("tokens_presets_catalog_frozen", ok,
                      f"freeze.json {fz.get('frozen_at')} @ {fz.get('base_commit')}: {len(entries)} hashed files, {len(changed)} changed"
                      + (f" {changed[:5]}" if changed else "") + f"; 04 section 8 catalog {len(names)} names, {len(absent)} not frozen"
                      + (f" {absent[:5]}" if absent else "") + f"; unlisted component dirs {extra_dirs}; fonts {len(fonts)}; presets table {'ok' if presets else 'missing'}"))

    # 5 projected final render time
    lock = cm.read_json(ctx.p("corpus", "edl", "lock.json")) or {}
    a2 = _decided(decisions, "ADR-002") or {}
    adr2_md = glob.glob(ctx.p("docs", "decisions", "ADR-002-*.md"))
    band = None
    if adr2_md:
        with open(adr2_md[0], encoding="utf-8") as f:
            m = re.search(r"S = ([\d.]+)[–-]([\d.]+) and H = ([\d.]+)[–-]([\d.]+) box s/frame", f.read())
        band = tuple(float(x) for x in m.groups()) if m else None
    mh = re.match(r"\s*RT(\d+)", str((a2.get("decision") or {}).get("Q2.3", "")))
    mf = re.match(r"\s*F(\d+)", str((a2.get("decision") or {}).get("Q2.1", "")))
    perfs = sorted(glob.glob(ctx.p("reports", "lookdev", "r*", "perf.json")), key=lambda f: int(re.search(r"/r(\d+)/", f).group(1)))
    perf = cm.read_json(perfs[-1]) if perfs else {}
    meas = ((perf or {}).get("blended") or {}).get("blended_box_s_per_frame")
    frames = lock.get("total_frames")
    if not (band and mh and mf and frames and meas) or int(mf.group(1)) != int(lock.get("fps", -1)):
        out.append(C_("projected_render_le_24h", False, f"inputs missing/inconsistent: band={band} RT={mh and mh.group(1)} F={mf and mf.group(1)} lock fps={lock.get('fps')} frames={frames} measured={meas}"))
    else:
        h = int(mh.group(1)) / 100.0
        s_lo, s_hi, h_lo, h_hi = band
        lo = frames * ((1 - h) * s_lo + h * h_lo) / 3600
        hi = frames * ((1 - h) * s_hi + h * h_hi) / 3600
        me = frames * meas / 3600
        worst = max(hi, me)
        reopen = next((x for x in decisions if x.get("status") == "decided"
                       and any("G6a item 4" in str(w.get("what", "")) for w in x.get("waivers") or [])), None)
        out.append(C_("projected_render_le_24h", worst <= BUDGET_H or reopen is not None,
                      f"{frames} frames @ {lock.get('fps')} fps ({lock.get('total_ms', 0) / 3.6e6:.2f} h runtime): ADR-002 model RT{mh.group(1)} "
                      f"{lo:.1f}-{hi:.1f} h; measured {cm.rel(perfs[-1])} blended {meas} box s/frame -> {me:.1f} h; worst {worst:.1f} h vs {BUDGET_H} h pure P12"
                      f" (+25 % contingency read: {worst * 1.25:.1f} h, ADR-002 R2 ladder); plate bake cost not yet in (ADR-009 AT-9, blocks P10)"))

    # 6 ADR-009 conditional-close conditions
    if g6a_adr and "conditional" in json.dumps(g6a_adr.get("decision", "")).lower():
        fix = cm.read_json(ctx.p("reports", "lookdev", "r3", "fix.json")) or {}
        tp = fix.get("typeprobe_ocr") or {}
        gate_items = [i for i in tp.get("items", []) if i.get("gate")]
        c12 = bool(gate_items) and all(float(i.get("score", 0)) >= 0.90 for i in gate_items) and "ok" in str(fix.get("type_suite", ""))
        b1 = re.search(r"(?m)^\| B1[^\n]*\|\s*fixed\s*\|", arabic_verdict(a_text)[1]) is not None
        c12 = c12 and b1
        out.append(C_(f"{g6a_adr['id']}_cond_1_2_fixes_ocr", c12, f"isolated-render OCR gate strings {sum(float(i.get('score', 0)) >= 0.9 for i in gate_items)}/{len(gate_items)} >= 0.90; "
                      f"F7 chip 6 (now Latin 'AI 6', no Arabic join): no isolated-render score, B1 closed by the Arabic re-check: {b1} (its OCR 'Al 6' = Inter I/l); type suite: {fix.get('type_suite')}"))
        stills_ok = [s for s in FIX_STILLS if os.path.exists(ctx.p("reports", "lookdev", "r3", "stills", f"{s}_fix.jpg"))]
        md = ctx.p("reports", "lookdev", "r3", "strips", "MD-standard_fix.jpg")
        _, sec = arabic_verdict(a_text)
        md_reviewed = os.path.exists(md) and "MD-standard_fix" in sec and arabic_verdict(a_text)[0] == "PASS"
        out.append(C_(f"{g6a_adr['id']}_cond_3_rerender_review", len(stills_ok) == len(FIX_STILLS) and md_reviewed,
                      f"fix stills {len(stills_ok)}/{len(FIX_STILLS)}; MD strip {'present' if os.path.exists(md) else 'missing'}; "
                      f"latest PASS Arabic review covers MD-standard_fix: {md_reviewed}"))
        rg = cm.read_json(ctx.p("reports", "lookdev", "r3", "regress.json")) or {}
        cov = set(rg.get("covers") or [])
        c4 = rg.get("by") == "render-ops" and rg.get("pass") is True and set(FIX_STILLS) <= cov
        out.append(C_(f"{g6a_adr['id']}_cond_4_no_regression_diff", c4,
                      ("reports/lookdev/r3/regress.json missing (render-ops: |delta| > 8/255 at 960 px only inside edited text boxes + 16 px)" if not rg
                       else f"by={rg.get('by')} pass={rg.get('pass')} covers {sorted(cov)}; outside-box px {rg.get('outside_px')}")))
    return out
