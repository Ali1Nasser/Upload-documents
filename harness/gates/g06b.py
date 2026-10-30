"""Gate G6b Components (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.

 1 catalog_status           every 04 section 8 catalog name (studio/src/components/catalog.ts CATALOG) has exactly one row in a
                            "Status" table of docs/p7/catalog_status/*.md, status implemented | mapped | deferred; a mapped or
                            deferred row must say what replaces it or why (non-empty note)
 2 snapshot_tests           every implemented component: reports/p7/snap/<Name>.json pass, determinism 0 px, 0 DC_QA findings,
                            0 registry problems; studio/test/baselines/<Name>/meta.json approval approved-critic by a critic who is
                            not the author; the snap run is newer than the last change to the component folder, its family demo
                            and the shared engine (studio/src/spec, fx, type, tokens.ts). `dc render snap _selftest` passes and is fresh
 3 perf_budgets             `dc render perf --aggregate` -> reports/perf/components.json lists every implemented component, with
                            over_budget_or_stale empty; each per-component report is concurrency 3 (v2), within the ADR-002 budget at
                            lite / standard / hero, and newer than the last change to the component folder
 4 arabic_type_suite        reports/qa/arabic/g6b.json (`dc qa arabic --src studio/src/components --src studio/src/demos --label g6b`):
                            verdict pass with OCR run on every string, OCR min >= 0.9, 0 tofu, 0 overflow, 0 BiDi, 0 digit,
                            0 per-letter findings, newer than the last change to components/demos; and the unit suites
                            (studio/scripts/check_p7.sh: arabic rules, BiDi isolates, Western digits, RV1, resolver) pass
 5 compiler_demo_anchors    reports/p7/_demo.resolver.json: 100 % of anchors resolved, no invalid props, unknown components or
                            dropped shots, newer than the last change to studio/src/spec and corpus/specs/_demo.json
Freshness (class Fresh) uses commit order for clean paths and file mtimes for dirty ones.
"""
import glob
import json
import os
import re
import subprocess

OCR_MIN = 0.9
PERF_BUDGET = {"lite": 0.201, "standard": 0.201, "hero": 1.038}   # ADR-002, box s/frame at 3 slots (docs/tools/component_guide.md §4)
STATUSES = ("implemented", "mapped", "deferred")
ENGINE = ["studio/src/spec", "studio/src/fx", "studio/src/type", "studio/src/tokens.ts"]


def C_(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def _short(items, k=6):
    items = list(items)
    return ", ".join(map(str, items[:k])) + (f" (+{len(items) - k} more)" if len(items) > k else "")


def catalog_names(ctx):
    src = open(ctx.p("studio", "src", "components", "catalog.ts"), encoding="utf-8").read()
    body = src[src.index("export const CATALOG"):]
    body = body[body.index("{") + 1:body.index("};")]
    return re.findall(r"^\s*([A-Z]\w*):", body, re.M)


def status_rows(ctx):
    """{name: [(file, status, note)]} from every markdown table whose header has a Status column."""
    rows = {}
    for f in sorted(glob.glob(ctx.p("docs", "p7", "catalog_status", "*.md"))):
        cols = None
        for line in open(f, encoding="utf-8"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")] if line.lstrip().startswith("|") else None
            if cells is None:
                cols = None
                continue
            if cols is None:
                cols = [c.lower() for c in cells]
                continue
            if set("".join(cells)) <= set("-: "):
                continue
            if "status" not in cols or "component" not in cols[0]:
                continue
            name = re.sub(r"[`*]", "", cells[0]).strip()
            st = re.sub(r"[`*]", "", cells[cols.index("status")]).strip()
            word = next((s for s in STATUSES if st.lower().startswith(s)), "")
            note = " ".join(c for i, c in enumerate(cells) if i not in (0,)).strip()
            rows.setdefault(name, []).append((os.path.basename(f), word, note))
    return rows


class Fresh:
    """Is a report newer than its sources?  Dirty sources: report mtime >= newest dirty source mtime. Clean sources: the report is
    dirty and written after the sources' last commit, or the report's last commit contains (descends from) the sources' last commit.
    Commit order, not commit time: a report committed together with its source is fresh even though it was written before the commit."""

    def __init__(self, ctx):
        self.ctx = ctx

    def _git(self, *args):
        return subprocess.run(["git", *args], capture_output=True, text=True, cwd=self.ctx.root).stdout.strip()

    def _files(self, p):
        full = self.ctx.p(*p.split("/"))
        if os.path.isfile(full):
            return [full]
        return [os.path.join(d, n) for d, _, ns in os.walk(full) for n in ns]

    def __call__(self, report, *sources):
        sources = [s for s in sources if s and os.path.exists(self.ctx.p(*s.split("/")))]
        rep_full = self.ctx.p(*report.split("/"))
        if not os.path.exists(rep_full):
            return False
        if not sources:
            return True
        dirty = [s for s in sources if self._git("status", "--porcelain", "--", s)]
        if dirty:
            newest = max((os.path.getmtime(f) for s in dirty for f in self._files(s)), default=0.0)
            return os.path.getmtime(rep_full) >= newest
        src_c = self._git("log", "-1", "--format=%H", "--", *sources)
        if not src_c:
            return True
        if self._git("status", "--porcelain", "--", report):
            return os.path.getmtime(rep_full) >= float(self._git("log", "-1", "--format=%ct", src_c) or 0)
        rep_c = self._git("log", "-1", "--format=%H", "--", report)
        if not rep_c:
            return False
        return rep_c == src_c or subprocess.run(["git", "merge-base", "--is-ancestor", src_c, rep_c],
                                                cwd=self.ctx.root).returncode == 0


def family_demo(ctx, name):
    for f in glob.glob(ctx.p("studio", "src", "demos", "*.tsx")):
        if re.search(rf"\b{name}\b", open(f, encoding="utf-8").read()):
            return ctx.rel(f)
    return None


def check(ctx):
    out = []
    names = catalog_names(ctx)
    rows = status_rows(ctx)
    missing = [n for n in names if n not in rows]
    dup = [n for n in names if len(rows.get(n, [])) > 1]
    bad = [n for n in names if n in rows and len(rows[n]) == 1 and not rows[n][0][1]]
    no_note = [n for n in names if n in rows and len(rows[n]) == 1 and rows[n][0][1] in ("mapped", "deferred")
               and len(rows[n][0][2]) < 12]
    status = {n: rows[n][0][1] for n in names if len(rows.get(n, [])) == 1}
    impl = [n for n in names if status.get(n) == "implemented"]
    counts = {s: sum(1 for n in names if status.get(n) == s) for s in STATUSES}
    out.append(C_("catalog_status", len(names) > 0 and not (missing or dup or bad or no_note),
                  f"{len(names)} catalog components: {counts}; no row {_short(missing)}; duplicate rows {_short(dup)}; "
                  f"unknown status {_short(bad)}; mapped/deferred without a note {_short(no_note)}"))

    fresh = Fresh(ctx)
    snap_fail = []
    for n in impl + ["_selftest"]:
        f = ctx.p("reports", "p7", "snap", f"{n}.json")
        if not os.path.exists(f):
            snap_fail.append(f"{n} (no report)")
            continue
        r = json.load(open(f, encoding="utf-8"))
        det = max([x.get("determinism_diff_px") or 0 for x in r.get("results", [])] or [0])
        why = []
        if r.get("pass") is not True:
            why.append("fail")
        if det:
            why.append(f"det {det} px")
        if r.get("qa_findings"):
            why.append(f"{len(r['qa_findings'])} QA")
        if r.get("registry_problems"):
            why.append("registry")
        rep = f"reports/p7/snap/{n}.json"
        if n != "_selftest":
            meta_f = ctx.p("studio", "test", "baselines", n, "meta.json")
            meta = json.load(open(meta_f, encoding="utf-8")) if os.path.exists(meta_f) else {}
            cr = meta.get("critic") if isinstance(meta.get("critic"), dict) else {}
            critic = meta.get("approved_by") or cr.get("by") or meta.get("approver") or \
                ("critic" if cr.get("score") is not None or meta.get("score") is not None else None)
            if meta.get("approval") != "approved-critic" or not critic:
                why.append(f"baseline {meta.get('approval') or 'missing'}")
            elif critic == meta.get("written_by"):
                why.append("approved by its author")
            demo = family_demo(ctx, n)
            if not fresh(rep, f"studio/src/components/{n}", demo, *ENGINE):
                why.append("stale")
        elif not fresh(rep, *ENGINE):
            why.append("stale")
        if why:
            snap_fail.append(f"{n} ({', '.join(why)})")
    out.append(C_("snapshot_tests", impl and not snap_fail,
                  f"{len(impl) + 1 - len(snap_fail)}/{len(impl) + 1} pass (implemented + _selftest); failing {_short(snap_fail, 10)}"))

    agg_f = ctx.p("reports", "perf", "components.json")
    agg = json.load(open(agg_f, encoding="utf-8")) if os.path.exists(agg_f) else {}
    perf_fail = list(agg.get("over_budget_or_stale") or [])
    for n in impl:
        f = ctx.p("reports", "perf", "components", f"{n}.json")
        if n not in (agg.get("components") or {}):
            perf_fail.append(f"{n} (not in aggregate)")
        if not os.path.exists(f):
            perf_fail.append(f"{n} (no report)")
            continue
        p = json.load(open(f, encoding="utf-8"))
        tiers = p.get("tiers") or {}
        why = []
        if p.get("concurrency") != 3:
            why.append(f"concurrency {p.get('concurrency')}")
        for tier, cap in PERF_BUDGET.items():
            v = (tiers.get(tier) or {}).get("box_s_per_frame")
            if v is None:
                why.append(f"no {tier}")
            elif v > cap:
                why.append(f"{tier} {v} > {cap}")
        if not fresh(f"reports/perf/components/{n}.json", f"studio/src/components/{n}"):
            why.append("stale")
        if why:
            perf_fail.append(f"{n} ({', '.join(why)})")
    out.append(C_("perf_budgets", impl and agg and not perf_fail,
                  f"{len(impl)} implemented; aggregate {'present' if agg else 'missing (run dc render perf --aggregate)'}; "
                  f"failing {_short(perf_fail, 10)}"))

    qa_f = ctx.p("reports", "qa", "arabic", "g6b.json")
    why = []
    if not os.path.exists(qa_f):
        why.append("no reports/qa/arabic/g6b.json (dc qa arabic --src studio/src/components --src studio/src/demos --label g6b)")
    else:
        q = json.load(open(qa_f, encoding="utf-8"))
        m = q.get("metrics") or {}
        if q.get("verdict") != "pass":
            why.append(f"verdict {q.get('verdict')}")
        if not m.get("strings") or m.get("ocr_scored") != m.get("strings"):
            why.append(f"OCR on {m.get('ocr_scored')}/{m.get('strings')} strings")
        if (m.get("ocr_min") or 0) < OCR_MIN:
            why.append(f"OCR min {m.get('ocr_min')}")
        for k in ("tofu_codepoints", "overflow", "bidi", "digits", "per_letter_hits"):
            if m.get(k):
                why.append(f"{k} {m[k]}")
        if not fresh("reports/qa/arabic/g6b.json", "studio/src/components", "studio/src/demos"):
            why.append("stale")
    rc, log = ctx.run(["bash", ctx.p("studio", "scripts", "check_p7.sh")], timeout=900)
    if rc != 0:
        why.append(f"check_p7.sh exit {rc}: {log.strip().splitlines()[-1][:160] if log.strip() else ''}")
    out.append(C_("arabic_type_suite", not why, "; ".join(why) or
                  f"g6b.json pass ({m.get('strings')} strings, OCR min {m.get('ocr_min')}); unit suites pass"))

    res_f = ctx.p("reports", "p7", "_demo.resolver.json")
    why = []
    if not os.path.exists(res_f):
        why.append("no reports/p7/_demo.resolver.json (dc render spec _demo --report reports/p7/_demo.resolver.json)")
    else:
        r = json.load(open(res_f, encoding="utf-8"))
        if r.get("resolved_pct") != 100 or r.get("unresolved") or r.get("anchors_resolved") != r.get("anchors_total"):
            why.append(f"anchors {r.get('anchors_resolved')}/{r.get('anchors_total')}")
        for k in ("invalid_props", "unknown_components", "dropped_shots", "registry_problems", "blockers"):
            if r.get(k):
                why.append(f"{k} {r[k]}" if not isinstance(r[k], list) else f"{k} {len(r[k])}")
        if not fresh("reports/p7/_demo.resolver.json", "studio/src/spec", "corpus/specs/_demo.json"):
            why.append("stale")
    out.append(C_("compiler_demo_anchors", not why, "; ".join(why) or
                  f"{r.get('anchors_resolved')}/{r.get('anchors_total')} anchors resolved on _demo"))
    return out
