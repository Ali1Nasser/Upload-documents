"""Gate G7 Storyboard (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.
It fails until P8 has produced the specs; that is expected.

 1 specs_for_all_edl_chapters   a corpus/specs/<CH>.json for 100 % of the locked EDL's chapters
 2 specs_lint_clean             `dc spec lint all` : 0 failing chapters (schema, frozen component props, word-id anchors, no seconds/frames,
                                coverage, density, gaps, numbers/terms on screen, data refs, FX tier + 3D budget); see docs/tools/spec_lint.md
 3 every_sentence_anchored      100 % of EDL sentences carry an anchored event
 4 numbers_terms_on_screen      100 % of spoken numbers and first-mention glossary terms are on screen when spoken
 5 density_min_20_events_per_min  every chapter >= 20 events/min
 6 rt3d_film_share              hero-tier (real-time WebGL) frames <= 5 % of the film (ADR-002 RT5; the per-chapter cap is part of the lint)
 7 fact_check                   reports/facts/<CH>.json for every chapter: 0 critical, 0 major, <= 2 minor (a major is never waved through),
                                written after the spec (spec_sha256 in the report when it is a dict, else file time >= spec file time)
 8 arabic_copy_approved         reports/qa/arabic/storyboard.json: verdict pass (OCR run, not --no-ocr) and it covers every Arabic string
                                of every spec (`dc qa arabic --spec corpus/specs/*.json --label storyboard`)
 9 critic_storyboard_rubric     latest reports/qa/storyboard/<CH>.rN.json per chapter: tier storyboard, reviewer a critic (never the author),
                                >= 10 rubric criteria, mean >= 8.0, min >= 6, verdict pass, fresh against the spec
10 global_coverage_loop         reports/spec/coverage_rounds.json: the last two rounds are consecutive, clean, not recorded by the scene-director,
                                and their spec_digest equals the digest of the specs on disk now (any edit restarts the count)
"""
import glob
import json
import os
import re
import statistics
import sys

MIN_EPM, MAX_RT3D, MEAN_MIN, MIN_MIN, MAX_MINOR, RUBRIC_N = 20.0, 0.05, 8.0, 6, 2, 10


def C_(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def _short(items, k=5):
    items = list(items)
    return ", ".join(map(str, items[:k])) + (f" (+{len(items) - k} more)" if len(items) > k else "")


def check(ctx):
    return _check(ctx, None)


def _check(ctx, only):
    """`only` restricts the chapter list for tests (tools/tests/test_g07.py); the gate itself always passes None = every EDL chapter."""
    sys.path.insert(0, ctx.p("tools"))
    from dclib import qa_arabic, schema, speclint as S
    cm = ctx.common
    out = []
    world = S.World()
    chapters = only or [c["id"] for c in world.edl["chapters"]]
    spec_file = lambda ch: ctx.p("corpus", "specs", f"{ch}.json")  # noqa: E731
    have = [c for c in chapters if os.path.exists(spec_file(c))]
    out.append(C_("specs_for_all_edl_chapters", len(have) == len(chapters),
                  f"{len(have)}/{len(chapters)} chapters have a spec; missing {_short(c for c in chapters if c not in have)}"))

    reps = S.run_lint(chapters, world)
    failing = [c for c in chapters if not reps[c]["pass"]]
    out.append(C_("specs_lint_clean", not failing and len(have) == len(chapters),
                  f"{len(chapters) - len(failing)}/{len(chapters)} chapters lint-clean; failing {_short(failing)}"
                  + (f"; first: {reps[failing[0]]['errors'][0][:160]}" if failing else "")))
    ms = [r["metrics"] for r in reps.values() if r.get("metrics")]
    sent, anch = sum(m["sentences"] for m in ms), sum(m["sentences_anchored"] for m in ms)
    out.append(C_("every_sentence_anchored", len(ms) == len(chapters) and sent > 0 and anch == sent,
                  f"{anch}/{sent} sentences anchored over {len(ms)}/{len(chapters)} chapters with metrics"))
    nn, nt = sum(m["numbers_on_screen"] for m in ms), sum(m["numbers_total"] for m in ms)
    tn, tt = sum(m["terms_on_screen"] for m in ms), sum(m["terms_total"] for m in ms)
    out.append(C_("numbers_terms_on_screen", len(ms) == len(chapters) and nn == nt and tn == tt,
                  f"numbers {nn}/{nt}, first-mention terms {tn}/{tt} on screen"))
    low = sorted((m["events_per_min"], m["chapter"]) for m in ms if m["events_per_min"] < MIN_EPM)
    out.append(C_("density_min_20_events_per_min", len(ms) == len(chapters) and not low,
                  f"min {min((m['events_per_min'] for m in ms), default=None)} median "
                  f"{statistics.median([m['events_per_min'] for m in ms]) if ms else None} events/min; below {MIN_EPM:.0f}: "
                  f"{_short(f'{c} {v}' for v, c in low)}"))
    frames = sum(m["chapter_frames"] for m in ms)
    share = sum(m["hero_frames"] for m in ms) / frames if frames else None
    out.append(C_("rt3d_film_share", share is not None and len(ms) == len(chapters) and share <= MAX_RT3D,
                  f"hero-tier (real-time WebGL) share of the film {share if share is None else round(100 * share, 2)} % (cap {100 * MAX_RT3D:.0f} %, ADR-002 RT5)"))

    # 7 fact-check
    bad, missing, stale = [], [], []
    for ch in chapters:
        fp = ctx.p("reports", "facts", f"{ch}.json")
        doc = cm.read_json(fp) if os.path.exists(fp) else None
        if doc is None:
            missing.append(ch)
            continue
        issues = doc.get("issues", []) if isinstance(doc, dict) else doc
        sev = [str(i.get("severity", "")).lower() for i in issues if isinstance(i, dict)]
        crit, major, minor = sev.count("critical"), sev.count("major"), sev.count("minor")
        if crit or major or minor > MAX_MINOR:
            bad.append(f"{ch} (critical {crit}, major {major}, minor {minor})")
        if os.path.exists(spec_file(ch)):
            sha = cm.sha256_file(spec_file(ch))
            if isinstance(doc, dict) and doc.get("spec_sha256"):
                if doc["spec_sha256"] != sha:
                    stale.append(ch)
            elif os.path.getmtime(fp) < os.path.getmtime(spec_file(ch)):
                stale.append(ch)
    out.append(C_("fact_check", not missing and not bad and not stale and len(have) == len(chapters),
                  f"{len(chapters) - len(missing)}/{len(chapters)} chapters checked; over limit {_short(bad)}; stale {_short(stale)}; "
                  f"missing {_short(missing, 3)}"))

    # 8 Arabic copy
    rp = ctx.p("reports", "qa", "arabic", "storyboard.json")
    rep = cm.read_json(rp) if os.path.exists(rp) else None
    if not rep:
        out.append(C_("arabic_copy_approved", False, "reports/qa/arabic/storyboard.json missing (dc qa arabic --spec corpus/specs/*.json --label storyboard)"))
    else:
        texts = {i.get("text") for i in rep.get("items", [])}
        need, uncovered = 0, []
        for ch in have:
            for it in qa_arabic.items_from_spec(spec_file(ch))[0]:
                need += 1
                if it["text"] not in texts:
                    uncovered.append(f"{ch}:{it['text'][:20]}")
        ok = rep.get("verdict") == "pass" and (rep.get("metrics") or {}).get("failed", 1) == 0 and not uncovered and len(have) == len(chapters)
        out.append(C_("arabic_copy_approved", ok, f"verdict {rep.get('verdict')}, {(rep.get('metrics') or {}).get('failed')} failed; "
                      f"{need - len(uncovered)}/{need} spec strings covered; uncovered {_short(uncovered, 3)}"))

    # 9 critic rubric
    bad, missing, stale = [], [], []
    for ch in chapters:
        rounds = sorted(glob.glob(ctx.p("reports", "qa", "storyboard", f"{ch}.r*.json")),
                        key=lambda f: int(re.search(r"\.r(\d+)\.json$", f).group(1)))
        if not rounds:
            missing.append(ch)
            continue
        fp = rounds[-1]
        doc = cm.read_json(fp)
        errs = schema.validate(doc, "qa_report")
        rub = doc.get("rubric") or {}
        vals = list(rub.values())
        mean = sum(vals) / len(vals) if vals else 0
        good = (not errs and doc.get("tier") == "storyboard" and doc.get("chapter") == ch and doc.get("verdict") == "pass"
                and str(doc.get("reviewer", "")).lower().startswith("critic") and len(vals) >= RUBRIC_N
                and mean >= MEAN_MIN and min(vals, default=0) >= MIN_MIN)
        if not good:
            bad.append(f"{ch} r{doc.get('round')} (mean {mean:.2f}, min {min(vals, default=0)}, n {len(vals)}, {doc.get('verdict')}, {doc.get('reviewer')})")
        if os.path.exists(spec_file(ch)):
            sha = (doc.get("metrics") or {}).get("spec_sha256")
            if sha:
                if sha != cm.sha256_file(spec_file(ch)):
                    stale.append(ch)
            elif os.path.getmtime(fp) < os.path.getmtime(spec_file(ch)):
                stale.append(ch)
    out.append(C_("critic_storyboard_rubric", not missing and not bad and not stale and len(have) == len(chapters),
                  f"{len(chapters) - len(missing)}/{len(chapters)} chapters scored; failing {_short(bad, 3)}; stale {_short(stale)}; missing {_short(missing, 3)}"))

    # 10 global coverage loop
    rounds = (cm.read_json(ctx.p("reports", "spec", "coverage_rounds.json"), {}) or {}).get("rounds", [])
    last2 = rounds[-2:]
    digest = S.digest_specs(chapters)
    ok = (len(last2) == 2 and last2[1]["round"] == last2[0]["round"] + 1
          and all(r["clean"] and r["open_issues"] == 0 and r["by"].lower() not in ("scene-director", "scene_director") for r in last2)
          and all(r["spec_digest"] == digest for r in last2) and len(have) == len(chapters))
    out.append(C_("global_coverage_loop", ok, f"{len(rounds)} round(s) recorded; last two clean and current: {ok}"))
    return out
