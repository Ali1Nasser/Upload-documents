#!/usr/bin/env python3
"""P0.6 ASR + forced-alignment + separation benchmark on a 60 s Arabic clip. Records into budget.json."""
import json, sys, time, traceback
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import budget_io
ROOT = Path(__file__).resolve().parents[2]
WAV = ROOT / "data/derived/bench/s2_60s.wav"
M = ROOT / "data/models"
DUR = 60.0
res, notes = {}, {}

def asr(name):
    from faster_whisper import WhisperModel
    t0 = time.time()
    m = WhisperModel(str(M / name), device="cpu", compute_type="int8", cpu_threads=3)
    load = time.time() - t0
    t = time.time()
    segs, info = m.transcribe(str(WAV), language="ar", word_timestamps=True, vad_filter=True)
    segs = list(segs)
    el = time.time() - t
    words = [w for s in segs for w in (s.words or [])]
    text = " ".join(s.text.strip() for s in segs)
    notes[name] = {"load_s": round(load, 1), "decode_s": round(el, 1), "segments": len(segs), "words": len(words), "voiced_s": round(info.duration_after_vad, 1)}
    print(name, "RTF", el / DUR, notes[name], flush=True)
    (ROOT / f"data/derived/bench/asr_{name}.json").write_text(json.dumps(
        {"text": text, "words": [{"w": w.word, "s": w.start, "e": w.end} for w in words]}, ensure_ascii=False))
    return el / DUR, text

which = sys.argv[1:] or ["asr", "ctc", "demucs"]
text = ""
if "asr" in which:
    for key, name in [("large-v3", "faster-whisper-large-v3"), ("turbo", "faster-whisper-large-v3-turbo")]:
        try:
            res[key], t = asr(name); text = text or t
            budget_io.update(asr_rtf={key: round(res[key], 3)})
        except Exception:
            traceback.print_exc(); notes[key + "_error"] = traceback.format_exc().splitlines()[-1]
if "ctc" in which:
    try:
        if not text:
            text = json.loads((ROOT / "data/derived/bench/asr_faster-whisper-large-v3-turbo.json").read_text())["text"]
        import torch, soundfile as sf
        import align
        t0 = time.time(); align._load(); load = time.time() - t0
        wav, sr = sf.read(str(WAV), dtype="float32")
        words = text.split()
        t = time.time()
        wt = align.align_words(wav, words, "ara")
        el = time.time() - t
        res["ctc_forced_aligner"] = round(el / DUR, 3)
        notes["ctc_forced_aligner"] = {"load_s": round(load, 1), "align_s": round(el, 1), "words_aligned": len(wt), "sample": wt[:3], "mean_score": round(sum(w["score"] for w in wt)/len(wt),3), "impl": "harness/lib/align.py (HF MMS-300m + uroman + torchaudio forced_align)", "text_source": "faster-whisper turbo transcript of same clip"}
        print("ctc OK", notes["ctc_forced_aligner"], flush=True)
        (ROOT / "data/derived/bench/ctc_words.json").write_text(json.dumps(wt, ensure_ascii=False))
    except Exception:
        traceback.print_exc(); notes["ctc_forced_aligner"] = {"error": traceback.format_exc().splitlines()[-1]}
if "demucs" in which:
    try:
        import torch, soundfile as sf
        from demucs_local import load_htdemucs
        from demucs.apply import apply_model
        torch.set_num_threads(3)
        a, sr = sf.read(str(WAV), dtype="float32")
        import torchaudio
        w = torchaudio.functional.resample(torch.from_numpy(a)[None], sr, 44100).repeat(2, 1)
        m = load_htdemucs()
        t = time.time()
        with torch.no_grad(): apply_model(m, w[None], device="cpu", split=True, overlap=0.25)
        el = time.time() - t
        res["demucs_htdemucs"] = round(el / DUR, 3)
        notes["demucs"] = {"seconds_for_60s": round(el, 1), "weights": "HF mirror AEmotionStudio/htdemucs-models (safetensors)"}
        print("demucs RTF", el / DUR, flush=True)
    except Exception:
        traceback.print_exc(); notes["demucs"] = {"error": traceback.format_exc().splitlines()[-1]}
budget_io.update(asr_rtf={k: v for k, v in res.items()}, asr_bench_notes=notes)
print(json.dumps(res), flush=True)
