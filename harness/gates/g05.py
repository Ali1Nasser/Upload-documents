"""Gate G5 Audio lock (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.

 - ADR-001 decided (harness/state/decisions.json + docs/decisions/ADR-001-*.md)
 - EDL validates (harness/schemas/edl.schema.json); chapters contiguous over the record timeline; AR + EN titles
 - 100 % of unique idea units included (said by an EDL sentence or covered by an EDL S1 sentence) or waived by ADR id list
 - redundancy <= 5 % of EDL speech time (callbacks excluded: a unit already covered earlier counts once; P4 definitions)
 - 0 prerequisite violations (cleaned requires graph, B-family context review)
 - radio edit: 0 clipped words (static + re-align on >= 20 windows), per-minute loudness within +-1.5 LU, no unplanned gap > 2.5 s
 - VO SHA-256 and word map generated: corpus/edl/lock.json hashes equal the files; word map complete, monotonic, 30 fps frames,
   every word in a sentence; per-chapter 30 fps features present and hashed
 - FYI sample offered: a verified entry in harness/state/fyi.json whose SHA-256 is the current sample cut from the locked VO
"""
import glob
import hashlib
import json
import os
import sys

MAX_REDUNDANCY, MAX_LU_DEV, MAX_GAP_MS, MIN_WINDOWS, FPS = 5.0, 1.5, 2500, 20, 30


def C_(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def _sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def check(ctx):
    sys.path.insert(0, ctx.p("tools"))
    from dclib import schema, story
    from dclib.timeutil import ms2frame
    cm = ctx.common
    out = []

    # 1 ADR-001
    dec = [d for d in (cm.read_json(ctx.p("harness", "state", "decisions.json")) or []) if d.get("id") == "ADR-001"]
    adr = dec[-1] if dec else {}
    md = glob.glob(ctx.p("docs", "decisions", "ADR-001-*.md"))
    out.append(C_("adr001_decided", adr.get("status") == "decided" and md,
                  f"ADR-001 status {adr.get('status')}; {len(md)} ADR file(s); EDL {(adr.get('decision') or {}).get('edl')}"))

    # 2 lock + EDL
    lock = cm.read_json(ctx.p("corpus", "edl", "lock.json")) or {}
    if not lock:
        out.append(C_("lock", False, "corpus/edl/lock.json missing"))
        return out
    edl_p = ctx.p(*lock["edl"].split("/"))
    edl = cm.read_json(edl_p)
    errs = schema.validate(edl, "edl")
    chs = edl["chapters"]
    contiguous = chs[0]["start_frame"] == 0 and chs[-1]["end_frame"] == edl["total_frames"] and all(
        a["end_frame"] == b["start_frame"] for a, b in zip(chs, chs[1:]))
    titles = all(c.get("title_ar") and c.get("title_en") and c.get("act") for c in chs)
    out.append(C_("edl_validates", not errs and contiguous and titles,
                  f"{lock['edl']} {'valid' if not errs else errs[:3]}; {len(chs)} chapters "
                  f"({sum(c['kind'] == 'trunk' for c in chs)} trunk, {sum(c['kind'] == 'deep-dive' for c in chs)} Deep-Dives), "
                  f"contiguous {contiguous}, AR/EN titles + acts {titles}; runtime {edl['stats']['runtime']} ({edl['total_frames']} frames)"))

    # 3-5 coverage, redundancy, prerequisites on the master EDL's sentence order
    D = story._load()
    G = story._graph_ctx(D, "B")
    order = list(dict.fromkeys(s for sg in edl["segments"] if sg.get("role") != "card" for s in sg.get("sentences") or []))
    unknown = [s for s in order if s not in D["S"]]
    covered, red_t, tot_t = set(), 0.0, 0.0
    for sid in order:
        if sid in unknown:
            continue
        u = D["by_s"][sid]
        d = (D["S"][sid]["end_ms"] - D["S"][sid]["start_ms"]) / 1000
        red_t += d if u in covered else 0.0
        tot_t += d
        covered.add(u)
        covered |= D["cover_inv"].get(sid, set())
    allu = set(D["IU"])
    waived = set()
    for w in adr.get("waivers") or []:
        for lst in (w.get("units") or {}).values():
            waived |= set(lst)
    missing = sorted(allu - covered - waived)
    pct = 100 * len(covered & allu) / len(allu)
    out.append(C_("coverage", not missing and not unknown,
                  f"{len(covered & allu)}/{len(allu)} unique idea units included ({pct:.1f} %); {len(allu - covered)} not included, "
                  f"all in ADR waiver lists ({len(waived)} waived ids: W-001-D2)" if not missing else
                  f"{len(missing)} units neither included nor waived, e.g. {missing[:5]}; unknown sentences {len(unknown)}"))
    red = 100 * red_t / max(1e-9, tot_t)
    out.append(C_("redundancy", red <= MAX_REDUNDANCY, f"{red:.1f} % of {tot_t / 3600:.2f} h EDL speech re-says an already covered unit "
                                                       f"(<= {MAX_REDUNDANCY} %)"))
    viol, miss = story.violations(D, G, [s for s in order if s not in unknown])
    out.append(C_("prereq_violations", not viol, f"{len(viol)} violations over {len(order)} sentences ({len(miss)} prerequisites never "
                                                f"mentioned, not violations)" + (f"; e.g. {viol[:2]}" if viol else "")))

    # 6 radio edit
    v = lock["version"]
    rc = cm.read_json(ctx.p("reports", "story", f"radio_check.{v}.json")) or {}
    st, ra, lo, ga = rc.get("static") or {}, rc.get("realign") or {}, rc.get("loudness") or {}, rc.get("gaps") or {}
    nwin = ra.get("windows") if isinstance(ra.get("windows"), int) else len(ra.get("windows") or [])
    clip_ok = st.get("edge_inside_fail") == 0 and st.get("neighbour_inside_fail") == 0 and ra.get("clipped") == 0 \
        and ra.get("errors") == 0 and nwin >= MIN_WINDOWS
    out.append(C_("radio_clipped_words", clip_ok and rc.get("vo_sha256_file") == lock["vo_sha256"],
                  f"static edge fails {st.get('edge_inside_fail')}/{st.get('segments')}, neighbour {st.get('neighbour_inside_fail')}; "
                  f"re-align {ra.get('clipped')} clipped of {ra.get('words')} words in {nwin} windows ({ra.get('errors')} errors)"))
    out.append(C_("radio_loudness", lo.get("minutes_out_of_tol") == 0 and (lo.get("max_abs_dev_lu") or 99) <= MAX_LU_DEV,
                  f"{lo.get('minutes')} minutes {lo.get('min_lufs')}..{lo.get('max_lufs')} LUFS, max dev {lo.get('max_abs_dev_lu')} LU "
                  f"(<= {MAX_LU_DEV}); integrated {lo.get('integrated_lufs')} LUFS, TP {lo.get('true_peak_dbtp')} dBTP"))
    out.append(C_("radio_gaps", ga.get("unplanned_acoustic_gt_2500") == 0,
                  f"{ga.get('unplanned_acoustic_gt_2500')} unplanned acoustic gaps > {MAX_GAP_MS} ms; planned card gaps "
                  f"{ga.get('planned_card_gaps_gt_2500')} (max {ga.get('max_planned_gap_ms')} ms); word-map holes over audible "
                  f"untranscribed speech {ga.get('word_map_holes_gt_2500')} (transcript follow-up, not gaps)"))

    # 7 lock hashes, word map, features
    vo = ctx.p(*lock["vo"].split("/"))
    vo_sha = _sha(vo) if os.path.exists(vo) else None
    wm_p = ctx.p(*lock["word_map"].split("/"))
    ok_h = (vo_sha == lock["vo_sha256"] == edl["vo_sha256"] and _sha(edl_p) == lock["edl_sha256"]
            and _sha(wm_p) == lock["word_map_sha256"] and lock.get("fps") == FPS == edl["fps"])
    out.append(C_("lock_hashes", ok_h, f"VO {(vo_sha or 'missing')[:16]}.. = lock = EDL: {vo_sha == lock['vo_sha256'] == edl['vo_sha256']}; "
                                       f"EDL and word-map SHA-256 equal lock.json; fps {lock.get('fps')}"))
    wm = cm.read_jsonl(wm_p)
    bad, prev = [], None
    werrs = schema.validate_file(wm_p, schema.rule_for(lock["word_map"]), limit=3)
    for w in wm:
        if not w.get("sent_id") or w.get("rec_start_s") is None or w["rec_start_frame"] != ms2frame(w["rec_start_ms"]) \
                or w["rec_end_frame"] < w["rec_start_frame"] or abs(w["rec_start_s"] * 1000 - w["rec_start_ms"]) > 0.5:
            bad.append(w["word_id"])
        if prev and w["rec_start_ms"] < prev["rec_start_ms"]:
            bad.append(w["word_id"] + " (order)")
        prev = w
    n_ok = len(wm) == edl["stats"]["words"] and len({w["word_id"] for w in wm}) == len(wm)
    out.append(C_("word_map", not bad and not werrs and n_ok and wm[-1]["rec_end_frame"] <= edl["total_frames"],
                  f"{len(wm)} words (EDL {edl['stats']['words']}), unique ids, start-monotonic, 30 fps frames = ms2frame, sentence id on "
                  f"every word; {len(bad)} bad" + (f" e.g. {bad[:3]}" if bad else "") + (f"; schema {werrs}" if werrs else "")))
    fbad = []
    for c in chs:
        fp = ctx.p("corpus", "edl", "features", f"{c['id']}.json")
        if not os.path.exists(fp) or _sha(fp) != (lock.get("features") or {}).get(c["id"]):
            fbad.append(c["id"])
            continue
        f = cm.read_json(fp)
        n = c["end_frame"] - c["start_frame"]
        if f.get("fps") != FPS or f.get("vo_sha256") != lock["vo_sha256"] or any(len(f.get(k) or []) != n for k in ("rms_dbfs", "onset_strength", "centroid_hz")):
            fbad.append(c["id"])
    out.append(C_("features", not fbad, f"{len(chs) - len(fbad)}/{len(chs)} chapters with RMS, onset strength and centroid at 30 fps, "
                                        f"one value per frame, hash = lock" + (f"; bad {fbad[:5]}" if fbad else "")))

    # 8 FYI sample offered (verified upload of the current sample)
    smp = cm.read_json(ctx.p("reports", "story", f"fyi_sample.{v}.json")) or {}
    fyi = cm.read_json(ctx.p("harness", "state", "fyi.json")) or {}
    want = (smp.get("file") or {}).get("sha256")
    hit = [e for e in fyi.get("items") or [] if e.get("verified") and e.get("sha256") == want and e.get("host") in ("temp.sh", "x0.at")]
    from_lock = smp.get("vo_sha256") == lock["vo_sha256"]
    out.append(C_("fyi_sample", bool(hit) and from_lock,
                  f"{hit[-1]['host']} {hit[-1]['url']} sha256 {want[:16]}.. verified, expires {hit[-1]['expires']}; window "
                  f"{smp.get('master_from')}-{smp.get('master_to')} ({' > '.join(w['chapter'] for w in smp.get('window') or [])})"
                  if hit and from_lock else f"no verified fyi.json entry for sample {want} (from locked VO: {from_lock})"))
    return out
