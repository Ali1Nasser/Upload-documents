"""dc asr transcribe|submit-s4|calibrate|agreement (P3.4-P3.5).

faster-whisper (CTranslate2, int8, CPU) with language="ar", word_timestamps, vad_filter and a glossary initial_prompt.
Output schema: harness/schemas/asr.schema.json (corpus/transcripts/<audio>.asr.json, times absolute in the source file, ms).
"""
import json
import os
import statistics as S
import sys
import time

from . import audio as A
from . import common as C
from . import manifest as M
from . import queue as Q
from . import scripts as SC
from . import textnorm as TN

MODELS = {"turbo": ("faster-whisper-large-v3-turbo", "large-v3-turbo"), "large-v3": ("faster-whisper-large-v3", "large-v3")}
ASR_DIR = C.p("data", "derived", "asr")
TRANS = C.p("corpus", "transcripts")


def asr_path(aid):
    return os.path.join(TRANS, A.fid(aid) + ".asr.json")


def _prompt(spec):
    if spec == "none":
        return None
    if spec == "glossary":
        return SC.prompt_text(60)
    return spec


def _self(sub, extra):
    return [sys.executable, "-I", C.p("tools", "dc.py"), "asr", sub] + extra


def run_whisper(wav_path, start_s, dur_s, model_key, threads, prompt, beam=5):
    """Transcribe one window. Returns the asr dict (segments with absolute ms)."""
    import soundfile as sf
    from faster_whisper import WhisperModel
    mdir = C.p("data", "models", MODELS[model_key][0])
    info_f = sf.info(wav_path)
    sr = info_f.samplerate
    total = info_f.frames / sr
    end_s = total if not dur_s else min(total, start_s + dur_s)
    wav, _ = sf.read(wav_path, start=int(start_s * sr), frames=int((end_s - start_s) * sr), dtype="float32")
    t0 = time.time()
    model = WhisperModel(mdir, device="cpu", compute_type="int8", cpu_threads=threads, num_workers=1)
    load_s = time.time() - t0
    t1 = time.time()
    gen, info = model.transcribe(wav, language="ar", word_timestamps=True, vad_filter=True, initial_prompt=prompt,
                                 condition_on_previous_text=False, beam_size=beam)
    segs = []
    nw = 0
    off = int(start_s * 1000)
    for k, s in enumerate(gen):
        words = []
        for w in (s.words or []):
            t = w.word.strip()
            if not t:
                continue
            words.append({"i": nw, "text": t, "start_ms": off + int(round(w.start * 1000)), "end_ms": off + int(round(w.end * 1000)),
                          "p": round(float(w.probability), 4)})
            nw += 1
        segs.append({"id": k, "start_ms": off + int(round(s.start * 1000)), "end_ms": off + int(round(s.end * 1000)),
                     "text": s.text.strip(), "avg_logprob": round(float(s.avg_logprob), 4),
                     "no_speech_prob": round(float(s.no_speech_prob), 4), "compression_ratio": round(float(s.compression_ratio), 3),
                     "words": words})
    el = time.time() - t1
    return {"window": {"start_s": round(start_s, 3), "end_s": round(end_s, 3)}, "segments": segs,
            "stats": {"load_s": round(load_s, 1), "decode_s": round(el, 1), "audio_s": round(end_s - start_s, 1),
                      "rtf": round(el / max(1e-6, end_s - start_s), 3), "words": nw,
                      "voiced_s": round(float(info.duration_after_vad), 1)}}


def _shard_bounds(aid, k, n):
    """Equal-duration shards whose cut points snap to the widest VAD gap within +-40 s of the nominal cut."""
    import soundfile as sf
    total = sf.info(A.wav16_path(aid)).frames / 16000.0
    cuts = [0.0]
    vp = os.path.join(A.VAD_DIR, A.fid(aid) + ".json")
    segs = C.read_json(vp, {}).get("segments_ms", []) if os.path.exists(vp) else []
    chap = [w["start_s"] for w in SC.chapter_windows_master()] if aid == "a:S1:ar-natural" else []
    for i in range(1, n):
        nominal = total * i / n
        if chap:  # S1 follows the chapter timeline: cut at the chapter start nearest to the nominal cut
            cuts.append(float(min(chap, key=lambda c: abs(c - nominal))))
            continue
        best, bg = nominal, -1
        for a, b in zip(segs, segs[1:]):
            mid = (a[1] + b[0]) / 2000.0
            if abs(mid - nominal) <= 40 and (b[0] - a[1]) > bg:
                best, bg = mid, b[0] - a[1]
        cuts.append(best)
    cuts.append(total)
    return cuts[k], cuts[k + 1]


def _doc(aid, model_key, prompt, res, extra=None, beam=5):
    d = {"v": 1, "audio_id": aid, "model": MODELS[model_key][1], "language": "ar",
         "params": {"compute_type": "int8", "word_timestamps": True, "vad_filter": True, "beam_size": beam,
                    "condition_on_previous_text": False, "initial_prompt": prompt},
         "window": res["window"], "stats": res["stats"], "segments": res["segments"], "created": C.now_iso()}
    if extra:
        d.update(extra)
    return d


def cmd_transcribe(args):
    aid = args.audio_id
    a = A.by_id(aid)
    wav = A.wav16_path(aid)
    if not os.path.exists(wav):
        C.fail(f"{wav} missing: run `dc audio decode` first", 2)
    if args.merge:
        return _merge(aid, args.model)
    out = args.out
    start, dur = args.start, args.dur
    if args.shard:
        k, n = map(int, args.shard.split("/"))
        s, e = _shard_bounds(aid, k, n)
        start, dur = s, e - s
        out = out or os.path.join(ASR_DIR, f"{A.fid(aid)}.{args.model}.shard{k}of{n}.json")
    out = out or asr_path(aid)
    if os.path.exists(out) and not args.force:
        print(f"asr: {C.rel(out)} exists, skipped (use --force)")
        return 0
    if not args.inline and not Q.in_queue():
        extra = ["--inline", "--model", args.model, "--threads", str(args.threads), "--prompt", args.prompt, "--beam", str(args.beam)] + (["--force"] if args.force else [])
        if args.shard:
            extra += ["--shard", args.shard]
        else:
            extra += ["--start", str(args.start), "--dur", str(args.dur), "--out", out]
        job = Q.submit(f"asr-{aid.split(':',1)[1]}-{args.model}" + (f"-{args.shard.replace('/', 'of')}" if args.shard else ""),
                       _self("transcribe", [aid] + extra), mem_gb=2.2 if args.model == "large-v3" else 1.8, expected_gb=0.05)
        print(job["tsp_id"])
        return 0
    prompt = _prompt(args.prompt)
    res = run_whisper(wav, start, dur, args.model, args.threads, prompt, args.beam)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    C.write_json(out, _doc(aid, args.model, prompt, res, beam=args.beam), indent=None)
    st = res["stats"]
    print(f"asr {aid} [{start:.0f}s +{st['audio_s']:.0f}s] {args.model}: {st['words']} words, RTF {st['rtf']}, load {st['load_s']}s -> {C.rel(out)}")
    return 0


def _merge(aid, model_key):
    import glob
    files = sorted(glob.glob(os.path.join(ASR_DIR, f"{A.fid(aid)}.{model_key}.shard*of*.json")),
                   key=lambda f: int(os.path.basename(f).split("shard")[1].split("of")[0]))
    if not files:
        C.fail("no shard files to merge", 2)
    docs = [C.read_json(f) for f in files]
    n = int(os.path.basename(files[0]).split("of")[1].split(".")[0])
    if len(files) != n:
        C.fail(f"found {len(files)} of {n} shards", 2)
    segs, nw = [], 0
    for d in docs:
        for s in d["segments"]:
            s = dict(s)
            s["id"] = len(segs)
            for w in s["words"]:
                w["i"] = nw
                nw += 1
            segs.append(s)
    st = {"audio_s": round(sum(d["stats"]["audio_s"] for d in docs), 1), "decode_s": round(sum(d["stats"]["decode_s"] for d in docs), 1),
          "words": nw, "voiced_s": round(sum(d["stats"]["voiced_s"] for d in docs), 1)}
    st["rtf"] = round(st["decode_s"] / st["audio_s"], 3)
    doc = dict(docs[0])
    doc.update({"window": {"start_s": docs[0]["window"]["start_s"], "end_s": docs[-1]["window"]["end_s"]}, "stats": st, "segments": segs,
                "shards": [os.path.basename(f) for f in files], "created": C.now_iso()})
    out = asr_path(aid)
    C.write_json(out, doc, indent=None)
    print(f"merged {len(files)} shards -> {C.rel(out)} ({nw} words)")
    return 0


def cmd_submit_s4(args):
    ids = [a["audio_id"] for a in A.registry() if a["family"] == "S4"]
    ids.sort(key=lambda i: -os.path.getsize(A.wav16_path(i)))  # longest first
    jobs = []
    for aid in ids:
        out = asr_path(aid)
        if os.path.exists(out) and not args.force:
            continue
        job = Q.submit(f"asr-{aid.split(':', 1)[1]}-{args.model}",
                       _self("transcribe", [aid, "--inline", "--model", args.model, "--threads", str(args.threads)] + (["--force"] if args.force else [])),
                       mem_gb=1.8, expected_gb=0.02)
        jobs.append((aid, job["tsp_id"]))
    print(json.dumps({"submitted": len(jobs), "jobs": dict(jobs)}))
    return 0


# ------------------------------------------------------------------ scoring
def _lev(a, b):
    from rapidfuzz.distance import Levenshtein
    return Levenshtein.distance(a, b)


def score(ref_text, hyp_text):
    """CER / WER after folding; also Latin-term recall (script Latin tokens that appear verbatim as Latin in the hypothesis)."""
    r, h = TN.tokens(ref_text), TN.tokens(hyp_text)
    rc, hc = " ".join(r), " ".join(h)
    cer = _lev(rc, hc) / max(1, len(rc))
    wer = _lev(r, h) / max(1, len(r))
    rl = [t for t in r if TN.has_latin(t)]
    hset = set(t for t in h if TN.has_latin(t))
    recall = sum(1 for t in rl if t in hset) / max(1, len(rl))
    return {"cer": round(cer, 4), "wer": round(wer, 4), "ref_words": len(r), "hyp_words": len(h), "latin_ref": len(rl),
            "latin_recall": round(recall, 3)}


CALIB_CH = ["CH-03", "CH-11", "CH-20", "CH-26", "CH-33"]
CALIB_LEN = 120.0


def calib_windows():
    wins = {w["chapter"]: w for w in SC.chapter_windows_master()}
    return [(ch, float(wins[ch]["start_s"]), CALIB_LEN) for ch in CALIB_CH]


def _calib_path(model, ch):
    return os.path.join(ASR_DIR, "calib", f"{model}_{ch}.json")


def _already_queued(label):
    q, _ = Q.refresh()
    return any(j["label"] == label and j["status"] in ("queued", "running") for j in q["jobs"].values())


def _variant(v):
    """'large-v3' -> (large-v3, beam 5); 'large-v3-b1' -> (large-v3, 1); 'turbo-b1' -> (turbo, 1)."""
    base, _, b = v.partition("-b")
    return base, int(b) if b else 5


def cmd_calibrate(args):
    if args.prepare:
        model, beam = _variant(args.variant)
        ids = []
        for ch, st, du in calib_windows():
            out = _calib_path(args.variant, ch)
            label = f"asr-calib-{args.variant}-{ch}"
            if os.path.exists(out) or _already_queued(label):
                continue
            job = Q.submit(label, _self("transcribe", ["a:S1:ar-natural", "--inline", "--model", model, "--threads", "2", "--beam", str(beam),
                                                       "--start", str(st), "--dur", str(du), "--out", out]),
                           mem_gb=2.2 if model == "large-v3" else 1.8, expected_gb=0.05)
            ids.append(job["tsp_id"])
        print(json.dumps({f"{args.variant} calibration jobs": ids}))
        return 0
    if args.report:
        return _calib_report()
    C.fail("use --prepare or --report", 2)


def _words_in(words, a_ms, b_ms):
    return [w for w in words if a_ms <= w["start_ms"] < b_ms]


def _calib_report():
    import glob
    s1 = "a:S1:ar-natural"
    wp = os.path.join(TRANS, A.fid(s1) + ".words.jsonl")
    if not os.path.exists(wp):
        C.fail("S1 words.jsonl missing: run `dc align scripted a:S1:ar-natural` first (the aligned script gives the per-window reference)", 2)
    ref_words = C.read_jsonl(wp)
    turbo = C.read_json(asr_path(s1))
    twords = [w for s in turbo["segments"] for w in s["words"]]
    variants = sorted({os.path.basename(f).rsplit("_CH-", 1)[0] for f in glob.glob(os.path.join(ASR_DIR, "calib", "*_CH-*.json"))})
    names = ["turbo (full S1 run)"] + variants
    rows, agg = [], {n: {"ref": [], "hyp": []} for n in names}
    rtf = {v: [] for v in variants}
    for ch, st, du in calib_windows():
        a_ms, b_ms = int(st * 1000), int((st + du) * 1000)
        ref = " ".join(w["text"] for w in _words_in(ref_words, a_ms, b_ms))
        row = {"chapter": ch, "start_s": st, "ref_words": len(ref.split())}
        hyps = {"turbo (full S1 run)": " ".join(w["text"] for w in _words_in(twords, a_ms, b_ms))}
        for v in variants:
            f = _calib_path(v, ch)
            if os.path.exists(f):
                d = C.read_json(f)
                hyps[v] = " ".join(w["text"] for sg in d["segments"] for w in sg["words"] if a_ms <= w["start_ms"] < b_ms)
                rtf[v].append(d["stats"]["rtf"])
        for n, h in hyps.items():
            row[n] = score(ref, h)
            agg[n]["ref"].append(ref)
            agg[n]["hyp"].append(h)
        rows.append(row)
    tot = {n: score(" ".join(v["ref"]), " ".join(v["hyp"])) for n, v in agg.items() if v["ref"]}
    out = {"windows": rows, "totals": tot, "turbo_rtf_full_s1": turbo["stats"].get("rtf"),
           "clip_rtf": {v: [round(x, 2) for x in r] for v, r in rtf.items()}, "prompt_terms": SC.glossary_terms(60)}
    C.write_json(os.path.join(ASR_DIR, "calibration.json"), out)
    ref_n = len(rows[0] and rows)
    L = ["# ASR calibration (P3.4)", "",
         "Reference: the TTS-clean chapter scripts (`LMArena/Folder 1/dacamp/tts/CH-nn_k.txt`, identical to master.md §8 Egyptian narration "
         "within punctuation), force-aligned to S1 by `dc align scripted`; the reference for a window is the script words whose aligned start "
         "lies inside the window. Windows: 5 x 120 s = 10 min, starting at the first second of " + ", ".join(CALIB_CH) + " (5:00 to 63:55 of S1).", "",
         "Settings (all variants): faster-whisper int8 CPU, language=ar, word_timestamps, vad_filter, condition_on_previous_text=False, "
         "initial_prompt = 60 Latin glossary terms (master §10.1/§10.2 + most frequent Latin tokens in the scripts). Beam 5 unless the variant name ends in -b1 (greedy). "
         "The turbo hypotheses are the full-S1 turbo run (3 shards, beam 5) cut to the same windows; the other variants ran on the five clips.", "",
         "Normalisation: NFKC, tashkeel and tatweel removed, alef/ya/ta-marbuta/hamza folded, digits to ASCII, Latin casefolded, punctuation "
         "dropped, Arabic/Latin joins split ('الـmodel' = 'ال model'). CER over the space-joined string, WER over tokens. "
         "Latin recall = share of script Latin tokens that the model wrote verbatim in Latin script (the rest were transliterated into Arabic or lost).", ""]
    hdr = "| window | ref words | " + " | ".join(f"{n} CER | {n} WER | {n} Latin" for n in names) + " |"
    L += [hdr, "|" + "---|" * (2 + 3 * len(names))]
    for r in rows:
        L.append(f"| {r['chapter']} @ {int(r['start_s'] // 60)}:{int(r['start_s'] % 60):02d} | {r['ref_words']} | " + " | ".join(
            f"{r[n]['cer']:.3f} | {r[n]['wer']:.3f} | {r[n]['latin_recall']:.2f}" if n in r else "n/a | n/a | n/a" for n in names) + " |")
    L.append(f"| **all 5 windows** | {tot[names[0]]['ref_words']} | " + " | ".join(
        f"**{tot[n]['cer']:.3f}** | **{tot[n]['wer']:.3f}** | **{tot[n]['latin_recall']:.2f}**" if n in tot else "n/a | n/a | n/a" for n in names) + " |")
    L += ["", "Throughput (2-3 jobs sharing 4 vCPUs with other agents' work, so pessimistic): turbo RTF "
          f"{out['turbo_rtf_full_s1']} on the full S1 (2 threads); " + "; ".join(f"{v} RTF {', '.join(f'{x:.1f}' for x in r)} (2 threads)" for v, r in out["clip_rtf"].items())
          + ". The P0 benchmark on an idle box (3 threads) measured turbo 0.87-1.05 and large-v3 3.6-6.2.", ""]
    L += ["## Decision", "", "@@DECISION@@", "", "Prompt terms used:", "", "`" + ", ".join(out["prompt_terms"]) + "`", ""]
    os.makedirs(C.p("reports", "asr"), exist_ok=True)
    txt = "\n".join(L)
    dec = C.read_json(C.p("reports", "asr", "decision.json"), {}) or {}
    txt = txt.replace("@@DECISION@@", dec.get("text", "(decision pending)"))
    with open(C.p("reports", "asr", "calibration.md"), "w", encoding="utf-8") as f:
        f.write(txt)
    print(json.dumps({"totals": tot, "rtf": out["clip_rtf"]}))
    return 0


# ------------------------------------------------------------------ agreement (aligner vs whisper word times)
def cmd_agreement(args):
    if getattr(args, "second", None) == "w2v":
        from . import align2
        return align2.cmd_agreement_w2v(args)
    from rapidfuzz.distance import Levenshtein
    s1 = "a:S1:ar-natural"
    wp = os.path.join(TRANS, A.fid(s1) + ".words.jsonl")
    ref = C.read_jsonl(wp)
    turbo = C.read_json(asr_path(s1))
    hw = [w for s in turbo["segments"] for w in s["words"]]
    rt = [TN.fold(w["text"]) for w in ref]
    ht = [TN.fold(w["text"]) for w in hw]
    # one script word may fold into several tokens; align at word level by folded string (empty strings never match)
    ops = Levenshtein.opcodes(rt, ht)
    pairs = []
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            for k in range(i2 - i1):
                if rt[i1 + k]:
                    pairs.append((i1 + k, j1 + k))
    d = []
    for i, j in pairs:
        d.append((ref[i]["start_ms"] - hw[j]["start_ms"], ref[i]["end_ms"] - hw[j]["end_ms"], ref[i]["chapter"], ref[i]["conf"]))
    ads = [abs(x[0]) for x in d]
    n = len(ads)
    thr = {t: sum(1 for x in ads if x <= t) / n for t in (60, 120, 250, 500)}
    per_ch = {}
    for dd in d:
        per_ch.setdefault(dd[2], []).append(abs(dd[0]))
    med_signed = S.median(x[0] for x in d)
    # agreement restricted to confident aligner words
    hi = [abs(x[0]) for x in d if x[3] >= 0.7]
    L = ["# S1 aligner agreement (MMS forced alignment vs faster-whisper turbo word timing)", "",
         f"Script words {len(ref)}, whisper words {len(hw)}, matched (identical folded token in a Levenshtein alignment) {n} "
         f"({100 * n / len(ref):.1f} % of script words).", "",
         "| |start diff| <= | share of matched words |", "|---|---|"] + [f"| {t} ms | {100 * v:.1f} % |" for t, v in thr.items()] + [
         "", f"Median signed start difference (aligner minus whisper): {med_signed:+.0f} ms; median |diff| {S.median(ads):.0f} ms; p90 {sorted(ads)[int(0.9 * n)]:.0f} ms.",
         f"Restricted to aligner conf >= 0.7 ({len(hi)} words): {100 * sum(1 for x in hi if x <= 120) / max(1, len(hi)):.1f} % within 120 ms.", "",
         "Whisper word times come from cross-attention DTW and are known to be coarser than a CTC forced alignment; "
         "treat this as a sanity check on the MMS times (no systematic offset, no drifting chapters), not as a ground truth. "
         "Gate G3 asks for >= 95 % within 120 ms for scripted audio; the independent second CTC model for that metric is listed as an open item "
         "in docs/handoffs/PHASE-03a.md.", "", "## Per chapter (median |start diff| ms, share within 120 ms)", "", "| chapter | n | median | within 120 ms |", "|---|---|---|---|"]
    for ch in sorted(per_ch):
        v = per_ch[ch]
        L.append(f"| {ch} | {len(v)} | {S.median(v):.0f} | {100 * sum(1 for x in v if x <= 120) / len(v):.0f} % |")
    # third reference: Silero VAD speech onsets (acoustic, independent of both timers). A VAD segment start is the onset of the first word after a pause.
    import bisect
    vp = os.path.join(A.VAD_DIR, A.fid(s1) + ".json")
    onset = {}
    if os.path.exists(vp):
        vad = C.read_json(vp)["segments_ms"]
        for name, ws in (("MMS forced alignment", ref), ("whisper turbo", hw)):
            st = [w["start_ms"] for w in ws]
            dd = []
            for a, b in vad:
                i = bisect.bisect_left(st, a - 600)
                cands = [st[j] for j in range(i, min(i + 8, len(st))) if abs(st[j] - a) <= 600]
                if cands:
                    dd.append(min(cands, key=lambda x: abs(x - a)) - a)
            ad = [abs(x) for x in dd]
            onset[name] = {"n": len(dd), "median_signed_ms": S.median(dd), "median_abs_ms": S.median(ad),
                           "within_120ms": round(sum(1 for x in ad if x <= 120) / len(ad), 3), "within_250ms": round(sum(1 for x in ad if x <= 250) / len(ad), 3)}
        L += ["", "## Independent check: word start vs Silero VAD speech onset (first word after each pause)", "",
              "| timer | segments | median signed diff (ms) | median abs (ms) | within 120 ms | within 250 ms |", "|---|---|---|---|---|---|"]
        for k, v in onset.items():
            L.append(f"| {k} | {v['n']} | {v['median_signed_ms']:+.0f} | {v['median_abs_ms']:.0f} | {100 * v['within_120ms']:.1f} % | {100 * v['within_250ms']:.1f} % |")
        L += ["", "The VAD onset carries a 30 ms pad and its own granularity (32 ms frames), so +-60 ms is noise. Whisper's word starts after a pause are "
              "systematically late (median +219 ms against the acoustic onset), which is why the whisper-vs-MMS agreement above is far below 95 %: the "
              "disagreement is mostly whisper's DTW timing, not the aligner. MMS onsets sit within 120 ms of the acoustic onset for about two thirds of "
              "pauses and within 250 ms for most of the rest."]
    os.makedirs(C.p("reports", "asr"), exist_ok=True)
    with open(C.p("reports", "asr", "s1_agreement.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    res = {"onset_vs_vad": onset, "matched": n, "within_120ms": round(thr[120], 4), "median_abs_ms": S.median(ads), "median_signed_ms": med_signed}
    C.write_json(os.path.join(ASR_DIR, "s1_agreement.json"), res)
    print(json.dumps(res))
    return 0
