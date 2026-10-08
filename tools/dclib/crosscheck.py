"""dc align crosscheck: the G3 cross-checks that read finished word files (docs/plan/03 P3.10, 06 section 1 G3).

 1. S1 speech inside its 37 chapter windows (from the S1 align report)
 2. S1 speech inside the 637 English cue windows +-500 ms (corpus/canon/cues_70m05.json)
 3. S5 sentence/caption onsets vs the cues: median |deviation| (scripted.cue_check)
 4. S3 vs its per-chapter SRTs (output_sidecars/CH-nn_ar.srt): text identity, first/last envelope, cue-start deviation (reported), and
    which of SRT / MMS lies closer to the acoustic (Silero) onsets. The SRT interior timing is a proportional estimate (drifts up to 3.6 s)
 5. MMS vs second aligner on S1 (reports/asr/s1_agreement_w2v.md, recomputed by `dc asr agreement --second w2v`; read back here)
Writes reports/asr/crosschecks.json (read by harness/gates/g03.py) and reports/asr/crosschecks.md.
"""
import bisect
import difflib
import json
import os
import re
import statistics as S

from . import align as AL
from . import audio as A
from . import common as C
from . import scripted as SCR
from . import textnorm as TN

TRANS = C.p("corpus", "transcripts")
SRT_GLOB_ROOT = C.p("data", "extracted", "DA_Camp_Videos_Files.zip.d")
CUE_PAD_MS = 500
S1 = "a:S1:ar-natural"
S5 = "a:S5:en-natural"


def _union(spans):
    spans = sorted(spans)
    out = []
    for a, b in spans:
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def s1_windows():
    rep = C.read_json(os.path.join(TRANS, A.fid(S1) + ".align.json"))
    chs = rep["chapters"]
    inside = sum(1 for c in chs if c["words_outside_window"] == 0)
    return {"chapters": len(chs), "chapters_all_words_inside": inside, "words_outside_window": sum(c["words_outside_window"] for c in chs),
            "boundary_overlaps": rep.get("boundary_overlaps") or [], "window_mismatch": rep.get("window_mismatch") or [],
            "vad_unexplained_share": (rep.get("vad_coverage") or {}).get("unexplained_share"),
            "pass": inside == len(chs) and not rep.get("boundary_overlaps")}


def s1_in_cues():
    words = C.read_jsonl(os.path.join(TRANS, A.fid(S1) + ".words.jsonl"))
    cues = C.read_json(C.p("corpus", "canon", "cues_70m05.json"))["captions"]
    win = _union([(c["start_ms"] - CUE_PAD_MS, c["end_ms"] + CUE_PAD_MS) for c in cues])
    starts = [w[0] for w in win]

    def inside(a, b):
        tot = 0
        k = max(0, bisect.bisect_right(starts, a) - 1)
        while k < len(win) and win[k][0] < b:
            tot += max(0, min(b, win[k][1]) - max(a, win[k][0]))
            k += 1
        return tot
    dur = sum(w["end_ms"] - w["start_ms"] for w in words)
    ins = sum(inside(w["start_ms"], w["end_ms"]) for w in words)
    n_in = sum(1 for w in words if inside(w["start_ms"], w["end_ms"]) >= 0.5 * (w["end_ms"] - w["start_ms"]))
    vad_p = os.path.join(A.VAD_DIR, A.fid(S1) + ".json")
    vad = None
    if os.path.exists(vad_p):
        seg = C.read_json(vad_p)["segments_ms"]
        tv = sum(b - a for a, b in seg)
        vad = round(sum(inside(a, b) for a, b in seg) / tv, 4)
    share = ins / dur
    return {"words": len(words), "cues": len(cues), "pad_ms": CUE_PAD_MS, "share_of_word_duration": round(share, 4),
            "share_of_words": round(n_in / len(words), 4), "share_of_vad_speech": vad, "pass": share >= 0.90}


def s5_cues():
    words = C.read_jsonl(os.path.join(TRANS, A.fid(S5) + ".words.jsonl"))
    r = SCR.cue_check(words)
    r["pass"] = bool(r.get("compared")) and r["median_abs_ms"] <= 300 and not r["chapters_skipped_word_count_mismatch"]
    return r


# ------------------------------------------------------------------ S3 vs SRT
def srt_dir():
    for root, dirs, files in os.walk(SRT_GLOB_ROOT):
        if os.path.basename(root) == "output_sidecars" and "CH-00_ar.srt" in files:
            return root
    return None


def parse_srt(path):
    txt = open(path, encoding="utf-8-sig").read().replace("\r\n", "\n")
    cues = []
    for blk in re.split(r"\n\s*\n", txt.strip()):
        ln = blk.split("\n")
        m = None
        for k, l in enumerate(ln):
            m = re.match(r"(\d+):(\d\d):(\d\d)[,.](\d{3})\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d{3})", l.strip())
            if m:
                break
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        cues.append({"start_ms": ((g[0] * 60 + g[1]) * 60 + g[2]) * 1000 + g[3], "end_ms": ((g[4] * 60 + g[5]) * 60 + g[6]) * 1000 + g[7],
                     "text": " ".join(ln[k + 1:]).strip()})
    return cues


def s3_audio_for(ch):
    """The audio that holds the whole chapter: CH-nn_vo when the chapter is split in two parts, else CH-nn_0."""
    for suf in ("vo", "0"):
        p = os.path.join(TRANS, f"a_S3_{ch}_{suf}.words.jsonl")
        if os.path.exists(p):
            return f"a:S3:{ch}_{suf}", p
    return None, None


def s3_srt():
    d = srt_dir()
    if not d:
        return {"pass": False, "error": "output_sidecars/CH-nn_ar.srt not found"}
    rows, diffs, per, bad, v_srt, v_mms = [], [], [], [], [], []
    for n in range(37):
        ch = f"CH-{n:02d}"
        aid, wp = s3_audio_for(ch)
        sp = os.path.join(d, f"{ch}_ar.srt")
        if not wp or not os.path.exists(sp):
            bad.append([ch, "missing"])
            continue
        words = C.read_jsonl(wp)
        cues = parse_srt(sp)
        ref = [TN.fold(w["text"]) for w in words]
        # tokenise cue text, remember which token starts each cue
        hyp, first = [], []
        for c in cues:
            toks = AL.tokenise(c["text"])
            first.append(len(hyp) if toks else None)
            hyp += [TN.fold(t) for t in toks]
        sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
        mp = {}
        for a, b, size in sm.get_matching_blocks():
            for k in range(size):
                mp[b + k] = a + k
        vad = C.read_json(os.path.join(A.VAD_DIR, A.fid(aid) + ".json"))["segments_ms"]
        vs = [a for a, _ in vad]
        d_ch, n_cmp = [], 0
        for c, f in zip(cues, first):
            if f is None:
                continue
            j = next((f + k for k in range(3) if f + k in mp), None)  # first token or one of the next two (token folded differently)
            if j is None:
                continue
            n_cmp += 1
            d_ch.append(words[mp[j]]["start_ms"] - c["start_ms"])
            v_srt.append(min(abs(c["start_ms"] - v) for v in vs))
            v_mms.append(min(abs(words[mp[j]]["start_ms"] - v) for v in vs))
        ad = [abs(x) for x in d_ch]
        diffs += d_ch
        rows.append({"chapter": ch, "audio": aid, "script_words": len(ref), "srt_tokens": len(hyp), "cues": len(cues), "compared": n_cmp,
                     "matched_token_share": round(len(mp) / max(1, len(hyp)), 3),
                     "median_signed_ms": S.median(d_ch) if d_ch else None, "median_abs_ms": S.median(ad) if ad else None,
                     "within_300ms": round(sum(1 for x in ad if x <= 300) / len(ad), 3) if ad else None,
                     "first_word_vs_first_cue_ms": words[0]["start_ms"] - cues[0]["start_ms"] if cues else None,
                     "last_word_end_vs_last_cue_end_ms": words[-1]["end_ms"] - cues[-1]["end_ms"] if cues else None,
                     "max_abs_ms": max(ad) if ad else None})
    ad = [abs(x) for x in diffs]
    res = {"srt_dir": C.rel(srt_dir()), "chapters": len(rows), "compared": len(diffs), "problems": bad,
           "median_abs_ms": S.median(ad) if ad else None, "median_signed_ms": S.median(diffs) if diffs else None,
           "within_300ms": round(sum(1 for x in ad if x <= 300) / max(1, len(ad)), 4),
           "within_120ms": round(sum(1 for x in ad if x <= 120) / max(1, len(ad)), 4),
           "p90_abs_ms": sorted(ad)[int(0.9 * len(ad))] if ad else None, "per_chapter": rows}
    env = [max(abs(r["first_word_vs_first_cue_ms"]), abs(r["last_word_end_vs_last_cue_end_ms"])) for r in rows]
    res.update({"matched_token_share": round(S.mean(r["matched_token_share"] for r in rows), 4) if rows else 0,
                "envelope_max_ms": max(env) if env else None, "max_abs_ms": max(r["max_abs_ms"] for r in rows) if rows else None,
                "median_dist_to_vad_onset_srt_ms": S.median(v_srt) if v_srt else None, "median_dist_to_vad_onset_mms_ms": S.median(v_mms) if v_mms else None})
    # SRT interior timing is an estimate: the check is text identity + envelope; the deviation is reported, and MMS must sit nearer to the acoustic onsets
    res["pass"] = (len(rows) == 37 and not bad and res["matched_token_share"] >= 0.99 and res["envelope_max_ms"] <= 1000
                   and bool(v_mms) and res["median_dist_to_vad_onset_mms_ms"] < res["median_dist_to_vad_onset_srt_ms"])
    return res


def w2v():
    """Recompute MMS vs wav2vec2 agreement (cheap: both word files exist) and return the numbers."""
    from . import align2
    p = C.p("data", "derived", "align", "a_S1_ar-natural.w2v.words.jsonl")
    if not os.path.exists(p):
        return {"pass": False, "error": "second aligner words missing"}
    a = C.read_jsonl(os.path.join(TRANS, A.fid(S1) + ".words.jsonl"))
    b = C.read_jsonl(p)
    n = min(len(a), len(b))
    d = [abs(a[i]["start_ms"] - b[i]["start_ms"]) for i in range(n) if a[i]["word_id"] == b[i]["word_id"]]
    share = sum(1 for x in d if x <= 120) / max(1, len(d))
    res = {"words": len(a), "compared": len(d), "within_120ms": round(share, 4), "median_abs_ms": S.median(d) if d else None,
           "pass": len(d) == len(a) and share >= 0.95}
    # S3 clips: same words, second aligner per clip
    dd, n_s3, clips = [], 0, []
    for f in sorted(os.listdir(TRANS)):
        if not (f.startswith("a_S3_") and f.endswith(".words.jsonl")):
            continue
        stem = f[:-len(".words.jsonl")]
        wp = C.p("data", "derived", "align", stem + ".w2v.words.jsonl")
        if not os.path.exists(wp):
            continue
        m_ = C.read_jsonl(os.path.join(TRANS, f))
        w_ = C.read_jsonl(wp)
        n_s3 += len(m_)
        dc = [abs(x["start_ms"] - y["start_ms"]) for x, y in zip(m_, w_) if y["start_ms"] is not None and "interp" not in x["method"] and x["word_id"] == y["word_id"]]
        dd += dc
        clips.append(stem)
    if clips:
        res["s3"] = {"clips": len(clips), "words": n_s3, "compared": len(dd), "within_120ms": round(sum(1 for x in dd if x <= 120) / max(1, len(dd)), 4),
                     "median_abs_ms": S.median(dd) if dd else None}
        res["s3"]["pass"] = len(clips) == 41 and len(dd) >= 0.98 * n_s3 and res["s3"]["within_120ms"] >= 0.95
        res["pass"] = res["pass"] and res["s3"]["pass"]
    # S5 (English): facebook/wav2vec2-base-960h vs MMS, same words, same chapter windows
    p5 = C.p("data", "derived", "align", "a_S5_en-natural.w2v.words.jsonl")
    if os.path.exists(p5):
        m5 = C.read_jsonl(os.path.join(TRANS, "a_S5_en-natural.words.jsonl"))
        w5 = C.read_jsonl(p5)
        d5 = [abs(x["start_ms"] - y["start_ms"]) for x, y in zip(m5, w5) if y["start_ms"] is not None and "interp" not in x["method"] and x["word_id"] == y["word_id"]]
        res["s5"] = {"words": len(m5), "compared": len(d5), "within_120ms": round(sum(1 for x in d5 if x <= 120) / max(1, len(d5)), 4),
                     "median_abs_ms": S.median(d5) if d5 else None, "model": "facebook/wav2vec2-base-960h"}
        res["s5"]["pass"] = len(w5) == len(m5) and len(d5) >= 0.98 * len(m5) and res["s5"]["within_120ms"] >= 0.95
        res["pass"] = res["pass"] and res["s5"]["pass"]
    else:
        res["s5"] = {"pass": False, "error": "S5 second aligner words missing"}
        res["pass"] = False
    return res


def cmd_crosscheck(args):
    res = {"v": 1, "created": C.now_iso(), "s1_chapter_windows": s1_windows(), "s1_in_cue_windows": s1_in_cues(), "s5_vs_cues": s5_cues(),
           "s3_vs_srt": s3_srt(), "mms_vs_w2v": w2v()}
    res["pass"] = all(v["pass"] for k, v in res.items() if isinstance(v, dict))
    C.write_json(C.p("reports", "asr", "crosschecks.json"), res)
    w, c, s5, s3, g = res["s1_chapter_windows"], res["s1_in_cue_windows"], res["s5_vs_cues"], res["s3_vs_srt"], res["mms_vs_w2v"]
    L = ["# G3 cross-checks (dc align crosscheck)", "", f"Generated {res['created']}. Overall: **{'PASS' if res['pass'] else 'FAIL'}**.", "",
         "| check | threshold | result | verdict |", "|---|---|---|---|",
         f"| S1 speech inside its 37 chapter windows | all chapters, no overlaps | {w['chapters_all_words_inside']}/{w['chapters']} chapters with every word inside (+-250 ms), {w['words_outside_window']} words outside, overlaps {w['boundary_overlaps'] or 'none'} | {'PASS' if w['pass'] else 'FAIL'} |",
         f"| S1 speech inside the {c['cues']} cue windows (+-{c['pad_ms']} ms) | >= 90 % | {100 * c['share_of_word_duration']:.1f} % of word duration, {100 * c['share_of_words']:.1f} % of words, {100 * (c['share_of_vad_speech'] or 0):.1f} % of VAD speech | {'PASS' if c['pass'] else 'FAIL'} |",
         f"| S5 caption onsets vs the {s5['captions']} English cues | median abs <= 300 ms | median {s5.get('median_abs_ms')} ms (signed {s5.get('median_signed_ms')}), {100 * s5.get('within_300ms', 0):.1f} % within 300 ms, {s5['compared']} compared, chapters skipped {s5['chapters_skipped_word_count_mismatch'] or 'none'} | {'PASS' if s5['pass'] else 'FAIL'} |",
         f"| S3 vs per-chapter SRTs | the plan names the check, not a number: text identical (>= 99 % tokens), first/last cue within 1 s of first/last word, MMS nearer to Silero onsets than the SRT | tokens matched {100 * s3.get('matched_token_share', 0):.1f} %, envelope max {s3.get('envelope_max_ms')} ms; cue-start deviation median {s3.get('median_abs_ms')} ms (signed {s3.get('median_signed_ms')}), max {s3.get('max_abs_ms')} ms, {100 * s3.get('within_300ms', 0):.1f} % within 300 ms (SRT interior timing is an estimate); median distance to the nearest VAD onset: SRT {s3.get('median_dist_to_vad_onset_srt_ms')} ms vs MMS {s3.get('median_dist_to_vad_onset_mms_ms')} ms; {s3.get('compared')} cues, {s3.get('chapters')} chapters | {'PASS' if s3['pass'] else 'FAIL'} |",
         f"| MMS vs a second CTC aligner on S1, S3 clips and S5 | >= 95 % within 120 ms | S1 {100 * g.get('within_120ms', 0):.1f} % of {g.get('compared')} words, median |diff| {g.get('median_abs_ms')} ms; S3 {100 * g.get('s3', {}).get('within_120ms', 0):.1f} % of {g.get('s3', {}).get('compared')} words in {g.get('s3', {}).get('clips')} clips, median |diff| {g.get('s3', {}).get('median_abs_ms')} ms; S5 (wav2vec2-base-960h, English) {100 * g.get('s5', {}).get('within_120ms', 0):.1f} % of {g.get('s5', {}).get('compared')} words, median |diff| {g.get('s5', {}).get('median_abs_ms')} ms | {'PASS' if g['pass'] else 'FAIL'} |", "",
         "## S3 per chapter", "", "| chapter | audio | cues | compared | token match | median signed ms | median abs ms | within 300 ms | first word - first cue ms | last word end - last cue end ms | max abs ms |", "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in s3.get("per_chapter", []):
        L.append(f"| {r['chapter']} | {r['audio'].split(':')[2]} | {r['cues']} | {r['compared']} | {r['matched_token_share']} | {r['median_signed_ms']} | {r['median_abs_ms']} | {r['within_300ms']} | {r['first_word_vs_first_cue_ms']} | {r['last_word_end_vs_last_cue_end_ms']} | {r['max_abs_ms']} |")
    with open(C.p("reports", "asr", "crosschecks.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print(json.dumps({k: (v.get("pass") if isinstance(v, dict) else v) for k, v in res.items() if k not in ("v", "created")}))
    return 0 if res["pass"] else 1
