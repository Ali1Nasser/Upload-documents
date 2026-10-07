"""Gate G0 Harness (docs/plan/06 section 1). All checks must hold; nothing here is a tunable threshold."""
import json
import os
import re

LAYOUT = ["corpus/catalog", "corpus/canon", "corpus/text", "corpus/transcripts", "corpus/sentences", "corpus/audio", "corpus/graph",
          "corpus/edl", "corpus/specs", "corpus/packs", "corpus/maps", "corpus/visual", "corpus/rules", "corpus/render",
          "corpus/sfx_cues", "reports/gates", "reports/qa", "reports/sync", "reports/facts", "reports/type", "reports/graph",
          "reports/perf", "reports/evals", "reports/story", "reports/asr", "reports/audio", "docs/decisions", "docs/handoffs",
          "docs/memory", "harness/schemas", "harness/hooks", "harness/gates", "harness/loops", "harness/state", "tools/dclib",
          "tools/tests", "logs/loops"]
SCHEMAS = ["files", "media", "quarantine", "audio_assets", "words", "sentences", "graph_node", "graph_edge", "visual_asset",
           "edl", "word_map", "scene_spec", "render_job", "qa_report", "progress"]
GATES = ["G0", "G1", "G2", "G3", "G4", "G5", "G6a", "G6b", "G7", "G8", "G9a", "G9b", "G10a", "G10"]


def C(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def _load(ctx, rel, default=None):
    return ctx.common.read_json(ctx.p(*rel.split("/")), default)


def check(ctx):
    out = []
    # 1 layout
    miss = [d for d in LAYOUT if not os.path.isdir(ctx.p(d))]
    out.append(C("layout", not miss, "all %d directories present" % len(LAYOUT) if not miss else "missing: " + ", ".join(miss)))

    # 2 setup.sh exists, executable, last run clean, idempotent re-run evidence
    sh = ctx.p("harness", "setup.sh")
    rep = ctx.p("reports", "perf", "setup_last.txt")
    if not os.path.isfile(sh):
        out.append(C("setup_sh", False, "harness/setup.sh missing"))
    else:
        txt = open(rep, encoding="utf-8", errors="replace").read() if os.path.exists(rep) else ""
        clean = "nothing missing" in txt.split("== summary ==")[-1] if "== summary ==" in txt else False
        idem = any(k in txt for k in ("(skip", "already", "exists"))
        out.append(C("setup_sh", os.access(sh, os.X_OK), "harness/setup.sh present and executable" if os.access(sh, os.X_OK) else "harness/setup.sh is not executable (chmod +x)"))
        out.append(C("setup_idempotent_marker", clean and idem,
                     f"reports/perf/setup_last.txt: last run clean={clean}, shows skipped (already-done) sections={idem}"
                     if txt else "reports/perf/setup_last.txt missing: run harness/setup.sh twice and read its report"))

    # 3 dc works
    rc, o = ctx.dc("state", "brief", timeout=60)
    n = len(o.strip().splitlines())
    out.append(C("dc_state_brief", rc == 0 and 0 < n <= 25, f"exit {rc}, {n} lines (max 25)"))
    rc1, o1 = ctx.dc("time", "ms2frame", "1000")
    rc2, o2 = ctx.dc("time", "frame2ms", "1", "--fps", "30")
    rc3, o3 = ctx.dc("time", "ms2frame", "50")
    out.append(C("dc_time_helpers", (rc1, o1.strip(), rc2, o2.strip(), rc3, o3.strip()) == (0, "30", 0, "33", 0, "2"),
                 f"ms2frame 1000 -> {o1.strip()} (30), frame2ms 1 -> {o2.strip()} (33), ms2frame 50 -> {o3.strip()} (2, half-up)"))
    out.append(C("tsp_available", ctx.run(["bash", "-c", "command -v tsp"])[0] == 0, "task-spooler (tsp) on PATH"))

    # 4 schemas
    sdir = ctx.p("harness", "schemas")
    missing = [s for s in SCHEMAS if not os.path.exists(os.path.join(sdir, f"{s}.schema.json"))]
    bad = []
    try:
        import jsonschema
        for s in SCHEMAS:
            fp = os.path.join(sdir, f"{s}.schema.json")
            if os.path.exists(fp):
                try:
                    jsonschema.Draft202012Validator.check_schema(json.load(open(fp, encoding="utf-8")))
                except Exception as e:  # noqa: BLE001
                    bad.append(f"{s}: {str(e)[:80]}")
    except ImportError:
        pass
    paths = ctx.common.read_json(os.path.join(sdir, "paths.json"), {}) or {}
    dangling = [r["schema"] for r in paths.get("rules", []) if not os.path.exists(os.path.join(sdir, r["schema"] + ".schema.json"))]
    out.append(C("schemas_present", not missing and not bad and not dangling and bool(paths.get("rules")),
                 f"{len(SCHEMAS) - len(missing)}/{len(SCHEMAS)} schemas, {len(paths.get('rules', []))} path rules"
                 + (f"; missing {missing}" if missing else "") + (f"; invalid {bad}" if bad else "") + (f"; dangling {dangling}" if dangling else "")))

    # 5 hooks proven by the test suite
    t = ctx.p("tools", "tests", "test_hooks.py")
    if os.path.exists(t):
        rc, o = ctx.run(["python3", t], timeout=300)
        out.append(C("hooks_proven", rc == 0, (o.strip().splitlines() or [""])[-1][:200]))
    else:
        out.append(C("hooks_proven", False, "tools/tests/test_hooks.py missing"))

    # 6 settings merged
    sp = ctx.p(".claude", "settings.json")
    src = ctx.common.read_json(ctx.p("docs", "plan", "harness", "settings.hooks.json"), {}) or {}
    cur = ctx.common.read_json(sp, None)
    if cur is None:
        out.append(C("settings_merged", False, ".claude/settings.json missing"))
    else:
        want = [h["command"] for ev in src.get("hooks", {}).values() for blk in ev for h in blk.get("hooks", [])]
        have = [h["command"] for ev in cur.get("hooks", {}).values() for blk in ev for h in blk.get("hooks", [])]
        miss_h = [w for w in want if w not in have]
        deny = [d for d in src.get("permissions", {}).get("deny", []) if d not in cur.get("permissions", {}).get("deny", [])]
        out.append(C("settings_merged", not miss_h and not deny, f"{len(want) - len(miss_h)}/{len(want)} hooks wired, "
                     f"{len(src.get('permissions', {}).get('deny', [])) - len(deny)} deny rules present"))

    # 7 state files
    prog = _load(ctx, "harness/state/progress.json")
    errs = ["progress.json missing"]
    if prog is not None:
        sys_path = ctx.p("tools")
        import sys
        if sys_path not in sys.path:
            sys.path.insert(0, sys_path)
        from dclib import schema
        errs = schema.validate(prog, "progress")
        missing_g = [g for g in GATES if g not in prog.get("gates", {})]
        errs += [f"gate {g} not registered" for g in missing_g]
    dec = _load(ctx, "harness/state/decisions.json")
    bud = _load(ctx, "harness/state/budget.json")
    que = _load(ctx, "harness/state/queue.json")
    ok_types = isinstance(dec, list) and isinstance(bud, dict) and isinstance(que, dict)
    out.append(C("state_files", not errs and ok_types, "progress/decisions/budget/queue present and well-formed" if not errs and ok_types
                 else f"problems: {errs[:3]} types_ok={ok_types}"))

    # 8 benchmarks: render numbers are derived from budget.json[render_bench] (3 compositions x concurrency 1/2/3, real runs)
    b = bud or {}
    r_ok, r_detail, _ = ctx.common.render_bench_summary(b)
    a_ok = bool(b.get("asr_rtf"))
    out.append(C("benchmarks_recorded", r_ok and a_ok,
                 f"budget.json: render_s_per_frame={'set' if r_ok else 'MISSING'} ({r_detail}); asr_rtf={'set' if a_ok else 'MISSING'}"))

    # 9 upload smoke test
    u = b.get("upload_smoke")
    hosts = {}
    if isinstance(u, dict):
        for name, v in (u.get("hosts", u)).items() if isinstance(u.get("hosts", u), dict) else []:
            hosts[name.lower()] = v
    has_x0 = any("x0" in h for h in hosts)
    has_tmp = any("temp" in h for h in hosts)
    summ = {h: (v.get("ok") if isinstance(v, dict) else v) for h, v in hosts.items() if isinstance(h, str) and ("x0" in h or "temp" in h)}
    out.append(C("upload_smoke_recorded", has_x0 and has_tmp, f"budget.json upload_smoke: {summ or 'MISSING'} (a recorded failure is a P14 risk, not a G0 blocker)"))

    # 10 raw archives present (P1 downloads started and complete)
    rows = ctx.common.read_tsv(ctx.p("docs", "plan", "inventory", "archives.tsv"))
    bad_raw = []
    for r in rows:
        f = ctx.p("data", "raw", r["archive"])
        if not os.path.isfile(f) or os.path.getsize(f) != int(r["bytes"]):
            bad_raw.append(r["archive"])
    out.append(C("raw_archives_present", not bad_raw, f"{len(rows) - len(bad_raw)}/{len(rows)} archives in data/raw with expected byte size"
                 + (f"; bad: {bad_raw}" if bad_raw else "")))

    # 10b documented limitations: blocked hosts etc. must be recorded honestly, never silently passed
    lim = b.get("limitations")
    ok_lim = isinstance(lim, list) and len(lim) > 0 and all(isinstance(x, dict) and x.get("id") and x.get("what") and x.get("workaround") for x in lim)
    out.append(C("limitations_documented", ok_lim,
                 "documented limitations (not silent passes): " + "; ".join(f"{x['id']} -> {x['workaround'][:60]}" for x in lim)
                 if ok_lim else "budget.json limitations missing or malformed (each needs id, what, workaround)"))

    # 11 gates registered
    nogate = [g for g in GATES if not os.path.exists(ctx.p("harness", "gates", "g%02d%s.py" % (int(re.match(r"G(\d+)", g).group(1)), g[len(re.match(r"G\d+", g).group(0)):])))]
    out.append(C("gates_registered", not nogate, f"{len(GATES) - len(nogate)}/{len(GATES)} gate modules" + (f"; missing {nogate}" if nogate else "")))
    return out
