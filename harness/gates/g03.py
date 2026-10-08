"""Gate G3 Audio truth (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.

 - every audio asset profiled (duration, loudness) in corpus/audio/assets.json
 - ASR calibration report + decision written
 - scripted audio (S1, S3, S5): median word conf >= 0.80; two-aligner agreement >= 95 % within 120 ms (reports/asr/crosschecks.json)
 - S2 (role reference: alignment required, sentences optional) and S4: transcribed, polished, aligned; median conf >= 0.75; polish edits logged with original indices
 - cross-checks: S1 inside its 37 chapter windows; S5 onsets vs the 637 English cues median <= 300 ms; >= 90 % of S1 speech inside the cue windows;
   S3 vs its per-chapter SRTs
 - sentences (S1, S4) and emphasis (impact_words) computed; sentences <= 28 words, each with a gloss; sentence ranges tile the words
 - words/sentences/align files validate against their schemas; word ids unique and sequential
"""
import glob
import os
import statistics as S
import sys

MIN_SCRIPTED, MIN_UNSCRIPTED, MIN_AGREE = 0.80, 0.75, 0.95
EXPECT = {"assets": 71, "S4": 27, "S3": 41, "cues": 637, "chapters": 37}


def C(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def check(ctx):
    sys.path.insert(0, ctx.p("tools"))
    from dclib import schema
    cm = ctx.common
    T = ctx.p("corpus", "transcripts")
    SE = ctx.p("corpus", "sentences")
    out = []

    def words(fid):
        return cm.read_jsonl(os.path.join(T, fid + ".words.jsonl"))

    def med(ws):
        c = [w["conf"] for w in ws if "interp" not in w.get("method", "")]
        return S.median(c) if c else 0.0

    # 1 profiled
    assets = cm.read_json(ctx.p("corpus", "audio", "assets.json")) or []
    unprof = [a["audio_id"] for a in assets if not a.get("duration_ms") or (a.get("qa") or {}).get("lufs_i") is None]
    out.append(C("audio_profiled", len(assets) == EXPECT["assets"] and not unprof,
                 f"{len(assets)} audio assets (expect {EXPECT['assets']}), unprofiled {unprof[:5] or 'none'}"))

    # 2 calibration
    dec = cm.read_json(ctx.p("reports", "asr", "decision.json")) or {}
    cal = ctx.p("reports", "asr", "calibration.md")
    out.append(C("asr_calibration", os.path.exists(cal) and os.path.getsize(cal) > 500 and bool(dec.get("model")),
                 f"reports/asr/calibration.md present, model chosen: {dec.get('model')}"))

    # 3 scripted confidence
    s1, s5 = words("a_S1_ar-natural"), words("a_S5_en-natural")
    s3 = []
    s3_files = sorted(glob.glob(os.path.join(T, "a_S3_*.words.jsonl")))
    s3_clip_med = {}
    for f in s3_files:
        ws = cm.read_jsonl(f)
        s3 += ws
        s3_clip_med[os.path.basename(f)[:-len(".words.jsonl")]] = med(ws)
    m1, m3, m5 = med(s1), med(s3), med(s5)
    low_clips = sorted(k for k, v in s3_clip_med.items() if v < 0.70)
    out.append(C("scripted_median_conf", min(m1, m3, m5) >= MIN_SCRIPTED and len(s3_files) == EXPECT["S3"],
                 f"S1 {m1:.3f} ({len(s1)} words), S3 {m3:.3f} ({len(s3)} words, {len(s3_files)} clips; clips < 0.70: {low_clips or 'none'}), "
                 f"S5 {m5:.3f} ({len(s5)} words); threshold {MIN_SCRIPTED}"))

    # 4 S2
    s2 = words("a_S2_ar-esraa")
    m2 = med(s2)
    out.append(C("s2_aligned", len(s2) > 0 and m2 >= MIN_UNSCRIPTED, f"S2 {len(s2)} words, median conf {m2:.3f} (threshold {MIN_UNSCRIPTED}; sentences optional)"))

    # 5 S4 transcribed + polished + aligned
    s4 = sorted(glob.glob(os.path.join(T, "a_S4_*.words.jsonl")))
    allw, rows, logged_bad = [], [], []
    n_edit = n_ins = 0
    for f in s4:
        stem = os.path.basename(f)[:-len(".words.jsonl")]
        ws = cm.read_jsonl(f)
        allw += ws
        pj = cm.read_json(os.path.join(T, stem + ".polish.json")) or {}
        asr_ok = os.path.exists(os.path.join(T, stem + ".asr.json"))
        ed = pj.get("edits") or []
        for e in ed:
            if e["op"] == "insert":
                n_ins += 1
                if "after_i" not in e:
                    logged_bad.append(stem)
            else:
                n_edit += 1
                if "i" not in e or "orig" not in e:
                    logged_bad.append(stem)
        rows.append((stem, len(ws), med(ws), asr_ok, bool(pj)))
    ms4 = med(allw)
    low4 = [r[0] for r in rows if r[2] < MIN_UNSCRIPTED]
    miss = [r[0] for r in rows if not r[3] or not r[4]]
    out.append(C("s4_transcribed_polished_aligned", len(rows) == EXPECT["S4"] and not miss and ms4 >= MIN_UNSCRIPTED and not low4,
                 f"{len(rows)}/{EXPECT['S4']} parts, {len(allw)} words, median conf {ms4:.3f} (min part {min(r[2] for r in rows):.3f}; parts < {MIN_UNSCRIPTED}: {low4 or 'none'}), "
                 f"missing asr/polish logs {miss or 'none'}"))
    out.append(C("polish_edits_logged", len(rows) == EXPECT["S4"] and not logged_bad and n_edit > 0,
                 f"{n_edit} replace/delete + {n_ins} insert edits logged with original token indices in corpus/transcripts/a_S4_*.polish.json; malformed entries {sorted(set(logged_bad)) or 'none'}"))

    # 6 cross-checks (computed by `dc align crosscheck`)
    xc = cm.read_json(ctx.p("reports", "asr", "crosschecks.json")) or {}
    newest = max([os.path.getmtime(os.path.join(T, "a_S1_ar-natural.words.jsonl")), os.path.getmtime(os.path.join(T, "a_S5_en-natural.words.jsonl"))]
                 + [os.path.getmtime(f) for f in s3_files])
    fresh = bool(xc) and os.path.getmtime(ctx.p("reports", "asr", "crosschecks.json")) >= newest
    w2 = xc.get("mms_vs_w2v") or {}
    w23 = w2.get("s3") or {}
    out.append(C("two_aligner_agreement", w2.get("pass") and w2.get("within_120ms", 0) >= MIN_AGREE and w23.get("within_120ms", 0) >= MIN_AGREE and w23.get("clips") == EXPECT["S3"] and (w2.get("s5") or {}).get("pass") and (w2.get("s5") or {}).get("within_120ms", 0) >= MIN_AGREE and fresh,
                 f"MMS vs second CTC aligner within 120 ms (threshold 95 %; xlsr53-arabic for S1/S3, wav2vec2-base-960h for S5): S1 {100 * w2.get('within_120ms', 0):.1f} % of {w2.get('compared')} words, "
                 f"S3 {100 * w23.get('within_120ms', 0):.1f} % of {w23.get('compared')} words in {w23.get('clips')} clips, "
                 f"S5 {100 * (w2.get('s5') or {}).get('within_120ms', 0):.1f} % of {(w2.get('s5') or {}).get('compared')} words; "
                 f"{'' if fresh else 'crosschecks.json stale or missing: run `dc align crosscheck`; '}S5 is also checked against the 637 cues"))
    w = xc.get("s1_chapter_windows") or {}
    out.append(C("s1_inside_chapter_windows", w.get("pass"), f"{w.get('chapters_all_words_inside')}/{w.get('chapters')} chapters, {w.get('words_outside_window')} words outside, overlaps {w.get('boundary_overlaps')}"))
    c = xc.get("s1_in_cue_windows") or {}
    out.append(C("s1_inside_cue_windows", c.get("pass") and c.get("cues") == EXPECT["cues"],
                 f"{100 * c.get('share_of_word_duration', 0):.1f} % of S1 speech inside {c.get('cues')} cue windows +-{c.get('pad_ms')} ms (threshold 90 %)"))
    s = xc.get("s5_vs_cues") or {}
    out.append(C("s5_onsets_vs_cues", s.get("pass") and s.get("captions") == EXPECT["cues"],
                 f"median abs {s.get('median_abs_ms')} ms over {s.get('compared')} of {s.get('captions')} cues (threshold 300 ms)"))
    t = xc.get("s3_vs_srt") or {}
    out.append(C("s3_vs_srt", t.get("pass"),
                 f"{t.get('chapters')} chapters, tokens matched {100 * t.get('matched_token_share', 0):.1f} %, envelope max {t.get('envelope_max_ms')} ms, "
                 f"cue-start deviation median {t.get('median_abs_ms')} ms (SRT interior timing is an estimate; MMS {t.get('median_dist_to_vad_onset_mms_ms')} ms vs SRT "
                 f"{t.get('median_dist_to_vad_onset_srt_ms')} ms from the nearest speech onset)"))

    # 7 sentences + emphasis
    prob, n_s, n_imp = [], {}, {}
    for stem, ws in [("a_S1_ar-natural", s1)] + [(os.path.basename(f)[:-len('.words.jsonl')], cm.read_jsonl(f)) for f in s4]:
        sp = os.path.join(SE, stem + ".jsonl")
        if not os.path.exists(sp):
            prob.append(f"{stem}: sentences missing")
            continue
        ss = cm.read_jsonl(sp)
        n_s[stem] = len(ss)
        ids = [x["word_id"] for x in ws]
        pos = {k: i for i, k in enumerate(ids)}
        prev = -1
        for x in ss:
            a, z = pos.get(x["w_from"]), pos.get(x["w_to"])
            if a is None or z is None or a != prev + 1 or z < a:
                prob.append(f"{stem}: {x.get('sentence_id')} does not tile")
                break
            prev = z
            if z - a + 1 > 28:
                prob.append(f"{stem}: {x.get('sentence_id')} has {z - a + 1} words")
            if not (x.get("gloss_en") or "").strip():
                prob.append(f"{stem}: {x.get('sentence_id')} no gloss")
        if prev != len(ws) - 1:
            prob.append(f"{stem}: ends at word {prev + 1} of {len(ws)}")
        n_imp[stem] = sum(1 for x in ss if x.get("impact_words"))
        if n_imp[stem] < 0.8 * len(ss):
            prob.append(f"{stem}: impact_words on only {n_imp[stem]}/{len(ss)} sentences")
        if any("prominence" not in w for w in ws):
            prob.append(f"{stem}: words without prominence")
    out.append(C("sentences_and_emphasis", not prob and len(n_s) == EXPECT["S4"] + 1,
                 f"S1 + S4: {sum(n_s.values())} sentences in {len(n_s)} audio files (S1 {n_s.get('a_S1_ar-natural')}), impact words on {sum(n_imp.values())} of them; problems {prob[:6] or 'none'}"))

    # 8 schemas and ids
    errs = []
    nfile = 0
    for pat in ("corpus/transcripts/*.words.jsonl", "corpus/transcripts/*.align.json", "corpus/transcripts/*.asr.json", "corpus/sentences/*.jsonl"):
        for f in sorted(glob.glob(ctx.p(*pat.split("/")))):
            rule = schema.rule_for(ctx.rel(f))
            if rule:
                nfile += 1
                errs += schema.validate_file(f, rule, limit=3)[:2]
    bad_ids = []
    for f in sorted(glob.glob(os.path.join(T, "*.words.jsonl"))):
        ws = cm.read_jsonl(f)
        ids = [w["word_id"] for w in ws]
        if len(set(ids)) != len(ids) or any(w["i"] != k or not w["word_id"].endswith(f":{k:06d}") for k, w in enumerate(ws)):
            bad_ids.append(os.path.basename(f))
    out.append(C("schemas_and_word_ids", not errs and not bad_ids,
                 f"{nfile} files validated; schema errors {errs[:3] or 'none'}; files with non-sequential or duplicate word ids {bad_ids[:5] or 'none'}"))
    return out
