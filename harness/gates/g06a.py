"""Gate G6a Look (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.

 1 ADR-002/003/004/005 decided (harness/state/decisions.json status + docs/decisions/ADR-00N-*.md present)
 2 style frames: look rubric mean >= 8.0 and AI-Unpacked parity >= 7.5, read from the latest reports/lookdev/critic_r*.json;
   OR a decided ADR waiver in decisions.json whose scope covers G6a item 2 (look/parity) on that round (W-009-LOOK, ADR-009)
 3 Arabic reviews pass PER ARTIFACT over ALL reports/lookdev/arabic_r*.md (shared helper artifact_coverage, mirrors
   studio/scripts/freeze_p6.py): each r*/stills|strips/*_fix.jpg is covered when the latest verdict section ("## ...: PASS|FAIL",
   file order then position) naming it is a PASS committed after the artifact (mtime if dirty); a later FAIL re-opens it; a FAIL
   section naming no artifact after the last PASS also fails. With no *_fix artifact: last verdict heading of the latest review.
 4 tokens, presets and component catalog frozen: harness/state/freeze.json hashes equal the files; the freeze covers
   studio/src/tokens.ts, studio/src/type/arabic.ts, the chosen fonts + licences, every 04 section 8 catalog name as
   studio/src/components/<Name>/schema.ts and harness/schemas/components/<Name>.json (+ the {word, lead_frames} anchor)
 5 projected final render (pure P12) for the locked runtime (corpus/edl/lock.json total_frames at ADR-002 fps) <= 24 h,
   using the ADR-002 cost model (S/H bands, RT hero share) and the measured blended rate of the latest look-dev perf.json;
   or a decided ADR (ADR-002 reopen) that covers a miss
 6 ADR-009 close conditions (only when the G6a decision is a conditional close): 1-2 each B-item (B1 F7 chip 6, B2 F3 title,
   F4 card, F6 head, F6 labels) judged per artifact over ALL reports/lookdev/arabic_r*.md (the latest verdict section naming
   the item wins; a later FAIL / non-fixed row re-opens it; its *_fix artifact must also be covered, recency-aware) + the four isolated-render OCR gate strings of r3/fix.json
   (F3-title, roadmap-72, idem-72, F7-chip6) present and >= 0.90 + type suite ok; the 7 affected stills and MD re-rendered, each covered per artifact by a PASS Arabic review newer than it; 4 render-ops no-regression
   diff (latest rN/regress.json, by render-ops, pass=true, covering the re-rendered set, not older than the newest re-render)
"""
import glob
import hashlib
import json
import os
import re
import subprocess

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


def ctime(root, rel_path):
    """Commit time of the last commit touching the path; mtime if uncommitted, dirty or outside git (as freeze_p6.ctime)."""
    run = lambda *a: subprocess.run(["git", "-C", root, *a], capture_output=True, text=True).stdout.strip()
    r, t = run("status", "--porcelain", "--", rel_path), run("log", "-1", "--format=%ct", "--", rel_path)
    return os.path.getmtime(os.path.join(root, rel_path)) if (r or not t) else int(t)


def _sections(text):
    """Split a review into verdict sections at each '## ...: PASS|FAIL' heading (as studio/scripts/freeze_p6.py does for cond 3)."""
    v = [(m.group(1), m.start()) for m in re.finditer(r"(?m)^#{2,3} [^\n]*?\b(PASS|FAIL)\b", text)]
    return [(verdict, text[pos:v[i + 1][1] if i + 1 < len(v) else len(text)]) for i, (verdict, pos) in enumerate(v)]


def names_artifact(name, sec):
    """Full name, or the short id (F4 = F4-standard, F4-hero) inside a section that scopes the *_fix artifacts (freeze_p6.py:62-65)."""
    short = name[:-len("_fix")].replace("-standard", "") if name.endswith("_fix") else name
    return name in sec or ("_fix" in sec and re.search(rf"\b{re.escape(short)}\b(?!-hero)", sec) is not None)


def artifact_coverage(artifacts, reviews, ct):
    """The ONE helper for every row that reads Arabic reviews. artifacts {name: repo-relative path}; reviews [(repo-relative path,
    text)] in round order; ct(rel) -> commit/mtime time. Per artifact the LATEST verdict section naming it (file order, then
    position) decides: PASS committed at or after the artifact = 'covered'; PASS older than the artifact = 'stale'; FAIL = 'open';
    never named = 'missing'; file not on disk = 'absent'. Returns {name: (status, review path)}."""
    last = {}
    for rel, text in reviews:
        for verdict, sec in _sections(text):
            for n in artifacts:
                if names_artifact(n, sec):
                    last[n] = (verdict, rel)
    out = {}
    for n, path in artifacts.items():
        if n not in last:
            out[n] = ("missing", "")
        elif last[n][0] != "PASS":
            out[n] = ("open", last[n][1])
        elif ct(last[n][1]) < ct(path):
            out[n] = ("stale", last[n][1])
        else:
            out[n] = ("covered", last[n][1])
    return out


def unscoped_fail(artifacts, reviews):
    """Review paths whose FAIL section names no artifact and comes after the last PASS section of any review (an open verdict
    that no per-artifact lookup would see)."""
    secs = [(rel, v, sec) for rel, text in reviews for v, sec in _sections(text)]
    lp = max([i for i, (_, v, _) in enumerate(secs) if v == "PASS"], default=-1)
    return [rel for rel, v, sec in secs[lp + 1:] if v == "FAIL" and not any(names_artifact(n, sec) for n in artifacts)]


def read_reviews(ctx):
    """All reports/lookdev/arabic_r*.md in round order -> [(repo-relative path, text)]."""
    paths = sorted(glob.glob(ctx.p("reports", "lookdev", "arabic_r*.md")), key=lambda q: int(re.search(r"arabic_r(\d+)\.md$", q).group(1)))
    out = []
    for q in paths:
        with open(q, encoding="utf-8") as f:
            out.append((ctx.common.rel(q), f.read()))
    return out


def fix_artifacts(ctx):
    """{name: rel path} of every reports/lookdev/r*/stills|strips/*_fix.jpg on disk; a later round overrides an earlier one."""
    rounds = sorted(glob.glob(ctx.p("reports", "lookdev", "r[0-9]*")), key=lambda d: int(re.search(r"r(\d+)$", d).group(1)))
    out = {}
    for d in rounds:
        for q in sorted(glob.glob(os.path.join(d, "stills", "*_fix.jpg")) + glob.glob(os.path.join(d, "strips", "*_fix.jpg"))):
            out[os.path.basename(q)[:-4]] = ctx.common.rel(q)
    return out


def round_file(ctx, name):
    """Path of reports/lookdev/r<N>/<name> for the highest N that has it (no fixed round number), else None."""
    best = None
    for q in glob.glob(ctx.p("reports", "lookdev", "r[0-9]*", name)):
        n = int(re.search(r"/r(\d+)/", q).group(1))
        if best is None or n > best[0]:
            best = (n, q)
    return best[1] if best else None


# ADR-009 B-items (cond 1-2): item -> regex on the first cell / line start; OCR gate ids from reports/lookdev/r3/fix.json
B_ITEMS = {"B1 F7 chip 6": r"B1\b.*chip", "B2 F3 title": r"B2\b.*\bF3\b", "B2 F4 card": r"B2\b.*\bF4\b",
           "B2 F6 head": r"B2\b.*\bF6\b.*\bhead", "B2 F6 labels": r"B2\b.*\bF6\b.*\blabels"}
B_ARTIFACT = {"B1 F7 chip 6": "F7-standard_fix", "B2 F3 title": "F3-standard_fix", "B2 F4 card": "F4-standard_fix",
              "B2 F6 head": "F6-standard_fix", "B2 F6 labels": "F6-standard_fix"}   # artifact each B-item is judged on (ADR-009 cond 1-3)
OCR_GATE_IDS = ["F3-title", "roadmap-72", "idem-72", "F7-chip6"]   # ADR-009 cond 2: partition, roadmap, idempotency, F7 chip 6
OCR_MIN = 0.90


def b_item_status(reviews, cov=None):
    """reviews: [(name, text)] in round order. Per B-item the LATEST verdict section (file order, then position) that names it wins:
    a PASS section closes it only through a table row `| <item> ... | fixed... |`; in a FAIL section any line starting with the
    item re-opens it, and in a PASS section a table row whose result is not 'fixed' re-opens it. Returns {item: (status, review)}
    with status 'fixed', 'open' or 'missing'. cov (artifact_coverage result, optional): a row-closed item is 'fixed' only while its
    artifact (B_ARTIFACT) is covered; a later FAIL naming the artifact makes it 'open', a PASS older than the artifact 'stale'."""
    st = {k: ("missing", "") for k in B_ITEMS}
    for name, text in reviews:
        for verdict, sec in _sections(text):
            for line in sec.splitlines():
                is_row = line.lstrip().startswith("|")
                if is_row:
                    cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
                    head, result = cells[0].replace("*", ""), (cells[-1] if len(cells) > 1 else "")
                else:
                    head, result = re.sub(r"^[\s#>*\-\d.]+", "", line).replace("*", ""), ""
                for k, rx in B_ITEMS.items():
                    if not re.match(rx, head):
                        continue
                    if is_row and verdict == "PASS":
                        st[k] = ("fixed" if re.match(r"(?i)fixed\b", result) else "open", name)
                    elif verdict == "FAIL":
                        st[k] = ("open", name)
    for k, (s_, r_) in list(st.items()):
        a = (cov or {}).get(B_ARTIFACT[k])
        if s_ == "fixed" and a and a[0] != "covered":
            st[k] = ({"open": "open", "stale": "stale"}.get(a[0], "open"), a[1] or r_)
    return st


def cond12(fix, reviews, cov=None):
    """ADR-009 conditions 1-2 -> (ok, detail). Thresholds fixed by the ADR (OCR >= 0.90 on each of four gate strings)."""
    items = {i.get("id"): i for i in (fix.get("typeprobe_ocr") or {}).get("items", [])}
    ocr_bad = [g for g in OCR_GATE_IDS if g not in items or not items[g].get("gate") or float(items[g].get("score", 0)) < OCR_MIN]
    ocr_n = sum(g in items and bool(items[g].get("gate")) and float(items[g].get("score", 0)) >= OCR_MIN for g in OCR_GATE_IDS)
    extra = [i["id"] for i in items.values() if i.get("gate") and i["id"] not in OCR_GATE_IDS and float(i.get("score", 0)) < OCR_MIN]
    suite = "ok" in str(fix.get("type_suite", ""))
    bs = b_item_status(reviews, cov)
    b_bad = [k for k, (s, _) in bs.items() if s != "fixed"]
    ok = not ocr_bad and not extra and suite and not b_bad
    det = (f"isolated-render OCR gate strings {ocr_n}/{len(OCR_GATE_IDS)} >= {OCR_MIN:.2f}"
           + "".join(f" {g}={float(items[g].get('score', 0)):.2f}{'' if items[g].get('exact') else '~'}" for g in OCR_GATE_IDS if g in items)
           + (f"; missing/failing: {ocr_bad + extra}" if ocr_bad or extra else "")
           + f"; type suite {'ok' if suite else 'NOT ok'}; B-items per artifact over {len(reviews)} Arabic reviews: "
           + ", ".join(f"{k} {s}" + (f" ({r})" if r else "") for k, (s, r) in bs.items())
           + (f" - not closed: {b_bad}" if b_bad else ""))
    return ok, det


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
        in_scope = waiver is not None and re.search(rf"\br{lc[0]}\b", str(waiver[1].get("scope", ""))) is not None
        det = f"{cm.rel(lc[1])}: look {look} (>= {LOOK_MIN}), parity {par} (>= {PARITY_MIN}), min criterion {cr.get('min_criterion')}"
        if waiver:
            det += f"; {waiver[0]} {waiver[1].get('id')} scope '{waiver[1].get('scope')}' ({'covers' if in_scope else 'does NOT cover'} r{lc[0]})"
        out.append(C_("look_parity", met or in_scope, det + ("" if met else " - below threshold" + (", accepted under the scoped waiver" if in_scope else ""))))
    else:
        out.append(C_("look_parity", False, "no reports/lookdev/critic_r*.json"))

    # 3 Arabic reviews: per artifact, recency-aware, over ALL arabic_r*.md (one shared helper, also used by cond 1-3 below)
    reviews = read_reviews(ctx)
    arts = fix_artifacts(ctx)
    ct = lambda r: ctime(ctx.root, r)
    cov = artifact_coverage({n: q for n, q in arts.items()}, reviews, ct) if arts else {}
    if not reviews:
        out.append(C_("arabic_review_pass", False, "no reports/lookdev/arabic_r*.md"))
    elif arts:
        bad = {n: v for n, v in cov.items() if v[0] != "covered"}
        loose = unscoped_fail(arts, reviews)
        out.append(C_("arabic_review_pass", not bad and not loose,
                      f"{len(reviews)} reviews, {len(arts) - len(bad)}/{len(arts)} *_fix artifacts covered by a PASS verdict that is the latest naming each and is newer than it"
                      + (f"; not covered: {', '.join(f'{n} {v[0]}' + (f' ({v[1]})' if v[1] else '') for n, v in bad.items())}" if bad else "")
                      + (f"; unscoped FAIL after the last PASS in {loose}" if loose else "")))
    else:
        v, sec = arabic_verdict(reviews[-1][1])
        out.append(C_("arabic_review_pass", v == "PASS", f"{reviews[-1][0]}: last verdict heading = {v}: {sec.splitlines()[0][:140] if sec else ''} (no *_fix artifacts)"))

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
        fixp = round_file(ctx, "fix.json")
        fix = (cm.read_json(fixp) if fixp else None) or {}
        c12, det12 = cond12(fix, reviews, cov)
        out.append(C_(f"{g6a_adr['id']}_cond_1_2_fixes_ocr", c12, det12 + f"; suite: {str(fix.get('type_suite'))[:90]}"))
        required = {f"{x}_fix": None for x in FIX_STILLS} | {"MD-standard_fix": None}
        missing = [n for n in required if n not in arts]
        bad = {n: v for n, v in cov.items() if v[0] != "covered"}
        out.append(C_(f"{g6a_adr['id']}_cond_3_rerender_review", not missing and not bad,
                      f"re-rendered {len(required) - len(missing)}/{len(required)} required artifacts ({len(arts)} *_fix found)"
                      + (f"; missing: {missing}" if missing else "")
                      + f"; per-artifact coverage (latest naming verdict PASS, newer than the artifact) {sum(v[0] == 'covered' for v in cov.values())}/{len(cov)}: "
                      + ", ".join(f"{n} {v[0]}" + (f" ({os.path.basename(v[1])})" if v[1] else "") for n, v in cov.items())))
        rgp = round_file(ctx, "regress.json")
        rg = (cm.read_json(rgp) if rgp else None) or {}
        cov4 = set(rg.get("covers") or [])
        newest = max([ct(q) for q in arts.values()], default=0)
        c4 = rg.get("by") == "render-ops" and rg.get("pass") is True and set(FIX_STILLS) <= cov4 and (not rgp or ct(cm.rel(rgp)) >= newest)
        out.append(C_(f"{g6a_adr['id']}_cond_4_no_regression_diff", c4,
                      ("reports/lookdev/rN/regress.json missing (render-ops: |delta| > 8/255 at 960 px only inside edited text boxes + 16 px)" if not rg
                       else f"{cm.rel(rgp)} by={rg.get('by')} pass={rg.get('pass')} covers {sorted(cov4)}; outside-box px {rg.get('outside_px')}"
                       + ("" if ct(cm.rel(rgp)) >= newest else "; regress.json is older than the newest re-rendered artifact"))))
    return out
