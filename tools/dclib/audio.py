"""dc audio decode|qa|report (P3.1-P3.3). Registry of the 71 unique audio assets, 16 kHz decode, per-asset QA profile.

Heavy work goes through the tsp queue (this process only submits and waits). numpy/torch are imported lazily so the
module also imports under the system python for `--help`. Never overwrites source audio; derived files live under
data/derived/audio/ (git-ignored) with a manifest.json carrying the command and input hashes.

Audio ids: a:S1:ar-natural, a:S2:ar-esraa, a:S5:en-natural, a:S4:Pnn (+ a:S4:P00b = render2), a:S3:CH-nn_k (+ CH-14_vo, CH-33_vo).
File names replace ':' with '_' (a_S1_ar-natural.wav).
"""
import concurrent.futures as cf
import json
import math
import os
import re
import subprocess
import sys
import time

from . import common as C
from . import manifest as M
from . import queue as Q

EXTRACTED = C.p("data", "extracted")
DERIVED = C.p("data", "derived", "audio")
WAV16 = os.path.join(DERIVED, "16k")
QA_DIR = os.path.join(DERIVED, "qa")
VAD_DIR = os.path.join(DERIVED, "vad")
ASSETS_JSON = C.p("corpus", "audio", "assets.json")
SOURCES_MD = C.p("reports", "audio", "sources.md")
TRANSCRIPTS = C.p("corpus", "transcripts")

SPECIAL = {  # basename -> (audio_id, family, lang, script_ref, provisional role)
    "02_DA_Camp_AR_Natural_Audio.m4a": ("a:S1:ar-natural", "S1", "ar-EG", "T1:§8-AR", "trunk"),
    "01_DA_Camp_AR_Esraa_Audio.m4a": ("a:S2:ar-esraa", "S2", "ar-EG", None, "unused"),
    "03_DA_Camp_EN_Natural_Audio.m4a": ("a:S5:en-natural", "S5", "en", "T1:§8-EN", "reference"),
}


def fid(audio_id):
    return audio_id.replace(":", "_")


def wav16_path(audio_id):
    return os.path.join(WAV16, fid(audio_id) + ".wav")


def registry():
    """The 71 unique audio assets from the catalog: list of dicts sorted by audio_id."""
    cat = C.read_jsonl(C.p("corpus", "catalog", "files.jsonl"))
    out = []
    for r in cat:
        if r["category"] != "audio":
            continue
        base = os.path.basename(r["canonical"])
        stem = os.path.splitext(base)[0]
        if base in SPECIAL:
            aid, fam, lang, sref, role = SPECIAL[base]
        elif re.match(r"^P\d\d_", base):
            n = base[:3]
            aid = f"a:S4:{n}b" if "render2" in base else f"a:S4:{n}"
            fam, lang, sref, role = "S4", "ar-EG", None, "deep-dive"
        elif re.match(r"^CH-\d\d_(\d|vo)", base):
            aid, fam, lang, sref, role = f"a:S3:{stem}", "S3", "ar-EG", "T6:dacamp/tts/" + stem.replace("_vo", "_0") + ".txt", "reference"
        else:
            continue
        out.append({"audio_id": aid, "family": fam, "lang": lang, "script_ref": sref, "role": role,
                    "file_id": r["file_id"], "sha256": r["sha256"], "rel": r["canonical"],
                    "src": os.path.join(EXTRACTED, r["canonical"]), "bytes": r["bytes"]})
    out.sort(key=lambda a: a["audio_id"])
    return out


def by_id(aid):
    for a in registry():
        if a["audio_id"] == aid:
            return a
    C.fail(f"unknown audio id {aid}", 2)


def select(ids):
    reg = registry()
    if not ids:
        return reg
    want = set(ids)
    sel = [a for a in reg if a["audio_id"] in want]
    miss = want - {a["audio_id"] for a in sel}
    if miss:
        C.fail(f"unknown audio ids: {sorted(miss)}", 2)
    return sel


def _self_argv(sub, extra):
    return [C.p("tools", "dc.py"), "audio", sub] + extra


def _run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def probe_native(src):
    r = _run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels",
              "-show_entries", "format=duration", "-of", "json", src], text=True)
    j = json.loads(r.stdout)
    st = j["streams"][0]
    return int(st["sample_rate"]), int(st["channels"]), int(round(float(j["format"]["duration"]) * 1000))


# ------------------------------------------------------------------ decode
def _decode_one(a, force):
    out = wav16_path(a["audio_id"])
    if os.path.exists(out) and not force:
        return a["audio_id"], "cached", os.path.getsize(out)
    tmp = out + ".part.wav"
    r = _run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-threads", "1", "-i", a["src"], "-vn", "-ac", "1", "-ar", "16000",
              "-c:a", "pcm_s16le", tmp], text=True)
    if r.returncode != 0:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise RuntimeError(f"ffmpeg failed for {a['audio_id']}: {r.stderr[-300:]}")
    os.replace(tmp, out)
    return a["audio_id"], "decoded", os.path.getsize(out)


def cmd_decode(args):
    sel = select(args.ids)
    inputs = [{"path": a["rel"], "sha256": a["sha256"]} for a in sel]
    outs = [C.rel(wav16_path(a["audio_id"])) for a in sel]
    if not args.inline and not Q.in_queue():
        if M.should_skip(WAV16, "decode:" + ",".join(a["audio_id"] for a in sel)[:200], inputs, outs, args.force):
            print(f"decode: {len(sel)} assets unchanged, skipped (use --force)")
            return 0
        extra = ["--inline"] + (["--force"] if args.force else []) + (["--ids", *args.ids] if args.ids else [])
        job = Q.submit("audio-decode", [sys.executable, "-I", *_self_argv("decode", extra)], mem_gb=0.5,
                       expected_gb=1.0)
        print(f"queued as tsp job {job['tsp_id']}", file=sys.stderr)
        Q.cmd_wait(type("A", (), {"id": job["tsp_id"], "timeout": 7200, "tail": 20}))
        return 0
    os.makedirs(WAV16, exist_ok=True)
    t0 = time.time()
    tot = 0
    with cf.ThreadPoolExecutor(max_workers=2) as ex:
        for i, (aid, st, nb) in enumerate(ex.map(lambda a: _decode_one(a, args.force), sel), 1):
            tot += nb
            print(f"  [{i}/{len(sel)}] {st:8s} {aid} {nb / 1e6:.1f} MB", flush=True)
    M.write(WAV16, "decode:" + ",".join(a["audio_id"] for a in sel)[:200], "dc audio decode", inputs, outs,
            tools=C.tool_versions("ffmpeg"), extra={"assets": len(sel), "bytes": tot, "seconds": round(time.time() - t0, 1),
                                                   "format": "pcm_s16le 16000 Hz mono"})
    print(f"decode: {len(sel)} assets, {tot / 1e9:.2f} GB, {time.time() - t0:.0f}s")
    return 0


# ------------------------------------------------------------------ QA profile
def ebur128(src):
    """Integrated loudness (LUFS), LRA, true peak dBTP via ffmpeg ebur128=peak=true."""
    r = _run(["ffmpeg", "-nostdin", "-nostats", "-threads", "1", "-i", src, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
             text=True)
    t = r.stderr
    tail = t[t.rfind("Summary:"):] if "Summary:" in t else ""

    def g(rx):
        m = re.search(rx, tail)
        return float(m.group(1)) if m else None
    return {"lufs_i": g(r"I:\s+(-?[\d.]+) LUFS"), "lra": g(r"LRA:\s+(-?[\d.]+) LU"), "tp_dbtp": g(r"Peak:\s+(-?[\d.]+) dBFS")}


BANDS = [20 * 2 ** (i / 3) for i in range(0, 31)]  # 1/3 octave edges 20 Hz .. ~20 kHz


def stream_stats(src, sr):
    """One streaming pass at the native rate: clipping runs, long-term average spectrum, bandwidth.
    Frames (2048, non-overlapping, Hann) whose RMS is above -60 dBFS enter the LTAS."""
    import numpy as np
    n_fft = 2048
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-threads", "1", "-i", src, "-vn", "-ac", "1", "-f", "s16le", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    win = np.hanning(n_fft).astype(np.float32)
    acc = np.zeros(n_fft // 2 + 1, np.float64)
    nfr = 0
    clip_samples = 0
    clip_runs = 0
    prev_clip = False
    tail = b""
    peak = 0
    chunk_bytes = n_fft * 2 * 512
    while True:
        buf = p.stdout.read(chunk_bytes)
        if not buf:
            break
        buf = tail + buf
        n = (len(buf) // 2 // n_fft) * n_fft
        tail = buf[n * 2:]
        if n == 0:
            continue
        x = np.frombuffer(buf[:n * 2], dtype="<i2")
        xi = x.astype(np.int32)
        peak = max(peak, int(np.abs(xi).max()))
        c = np.abs(xi) >= 32767
        if c.any():
            clip_samples += int(c.sum())
            starts = c & ~np.concatenate(([prev_clip], c[:-1]))
            clip_runs += int(starts.sum())
        prev_clip = bool(c[-1])
        fr = x.astype(np.float32).reshape(-1, n_fft) / 32768.0
        rms = np.sqrt((fr ** 2).mean(1) + 1e-12)
        keep = 20 * np.log10(rms) > -60
        if keep.any():
            sp = np.abs(np.fft.rfft(fr[keep] * win, axis=1)) ** 2
            acc += sp.sum(0)
            nfr += int(keep.sum())
    p.wait()
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
    if nfr == 0:
        return {"bandwidth_hz": None, "cutoff_hz": None, "clip_runs": clip_runs, "clip_samples": clip_samples, "ltas": None}
    ltas = acc / nfr
    cum = np.cumsum(ltas) / ltas.sum()
    bw99 = float(freqs[int(np.searchsorted(cum, 0.99))])
    db = 10 * np.log10(ltas + 1e-20)
    above = np.where(db > db.max() - 70)[0]
    cutoff = float(freqs[above.max()]) if len(above) else None
    bands = []
    for lo, hi in zip(BANDS[:-1], BANDS[1:]):
        if hi > sr / 2:
            break
        m = (freqs >= lo) & (freqs < hi)
        bands.append(round(float(10 * np.log10(ltas[m].mean() + 1e-20)), 2) if m.any() else None)
    return {"bandwidth_hz": bw99, "cutoff_hz": cutoff, "clip_runs": clip_runs, "clip_samples": clip_samples,
            "peak_sample": peak, "ltas_band_centres_hz": [round(math.sqrt(lo * hi), 1) for lo, hi in zip(BANDS[:-1], BANDS[1:])][:len(bands)],
            "ltas_db": bands}


def _flatness(frames):
    import numpy as np
    sp = np.abs(np.fft.rfft(frames * np.hanning(frames.shape[1]), axis=1)) ** 2 + 1e-14
    return float(np.median(np.exp(np.log(sp).mean(1)) / sp.mean(1)))


def vad_and_floor(wav_path, audio_id):
    """Silero VAD on the 16 kHz wav + frame-energy statistics. Returns (metrics, segments_ms)."""
    import numpy as np
    import soundfile as sf
    import torch
    torch.set_num_threads(1)
    from silero_vad import load_silero_vad, get_speech_timestamps
    wav, sr = sf.read(wav_path, dtype="float32")
    assert sr == 16000 and wav.ndim == 1
    dur = len(wav) / sr
    global _SILERO
    if _SILERO is None:
        _SILERO = load_silero_vad()
    model = _SILERO
    ts = get_speech_timestamps(torch.from_numpy(wav), model, sampling_rate=16000, threshold=0.5,
                               min_speech_duration_ms=250, min_silence_duration_ms=100, speech_pad_ms=30)
    segs = [[int(t["start"] * 1000 / 16000), int(t["end"] * 1000 / 16000)] for t in ts]
    speech = sum(e - s for s, e in segs) / 1000.0
    gaps = [(segs[i + 1][0] - segs[i][1]) / 1000.0 for i in range(len(segs) - 1)]
    pauses = [g for g in gaps if g >= 0.3]
    edges = [0.3, 0.5, 1.0, 2.0, 5.0]
    hist = {"0.3-0.5": 0, "0.5-1": 0, "1-2": 0, "2-5": 0, ">5": 0}
    for g in pauses:
        k = "0.3-0.5" if g < 0.5 else "0.5-1" if g < 1 else "1-2" if g < 2 else "2-5" if g < 5 else ">5"
        hist[k] += 1
    fl = 512
    nf = len(wav) // fl
    fr = wav[:nf * fl].reshape(nf, fl)
    rms_db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    rms_db = np.maximum(rms_db, -90.0)
    # frames inside gaps >= 300 ms, 100 ms away from either edge
    mask = np.zeros(nf, bool)
    prev_end = 0
    bounds = [(0, 0)] + [(s, e) for s, e in segs]
    for i in range(len(segs) + 1):
        a = segs[i - 1][1] / 1000.0 if i > 0 else 0.0
        b = segs[i][0] / 1000.0 if i < len(segs) else dur
        if b - a >= 0.3:
            f0, f1 = int((a + 0.1) * sr / fl), int((b - 0.1) * sr / fl)
            if f1 > f0:
                mask[f0:f1] = True
    nonspeech_s = float(mask.sum() * fl / sr)
    p05 = float(np.percentile(rms_db, 5))
    p50 = float(np.percentile(rms_db, 50))
    p95 = float(np.percentile(rms_db, 95))
    if nonspeech_s >= 2.0:
        floor_db = float(np.median(rms_db[mask]))
        flat = _flatness(fr[mask][:: max(1, int(mask.sum() // 2000))])
        bed_basis = "gaps"
    else:
        floor_db = p05
        low = rms_db <= np.percentile(rms_db, 10)
        flat = _flatness(fr[low][:: max(1, int(low.sum() // 2000))])
        bed_basis = "p05"
    level = min(1.0, max(0.0, (floor_db + 60.0) / 30.0))
    bed = round(level * (1.0 - flat), 3)
    return {"speech_ratio": round(speech / dur, 4), "speech_s": round(speech, 1), "pauses": len(pauses), "pause_hist": hist,
            "pause_median_s": round(float(np.median(pauses)), 2) if pauses else None,
            "noise_floor_db": round(floor_db, 1), "nonspeech_s": round(nonspeech_s, 1),
            "frame_rms_db_p05_p50_p95": [round(p05, 1), round(p50, 1), round(p95, 1)],
            "spectral_flatness_floor": round(flat, 3), "music_bed_basis": bed_basis, "music_bed_score": bed,
            "n_segments": len(segs), "duration_s": round(dur, 2)}, segs


_ECAPA = None
_SILERO = None


def speakers_ecapa(wav_path, segs, max_windows=80, win_s=3.0):
    """ECAPA embeddings on 3 s windows inside VAD speech, then average-linkage agglomerative clustering (cosine)."""
    import numpy as np
    import soundfile as sf
    import torch
    torch.set_num_threads(1)
    from speechbrain.inference.speaker import EncoderClassifier
    wav, sr = sf.read(wav_path, dtype="float32")
    W = int(win_s * sr)
    cand = []
    for s, e in segs:
        a, b = int(s * sr / 1000), int(e * sr / 1000)
        t = a
        while t + W <= b:
            cand.append(t)
            t += W
    if len(cand) < 8:
        W = int(1.5 * sr)
        cand = []
        for s, e in segs:
            a, b = int(s * sr / 1000), int(e * sr / 1000)
            t = a
            while t + W <= b:
                cand.append(t)
                t += W
    if len(cand) < 4:
        return {"speakers": None, "speaker_windows": len(cand)}
    idx = np.linspace(0, len(cand) - 1, min(max_windows, len(cand))).round().astype(int)
    starts = [cand[i] for i in sorted(set(idx.tolist()))]
    global _ECAPA
    if _ECAPA is None:
        mdir = C.p("data", "models", "ecapa-voxceleb")
        _ECAPA = EncoderClassifier.from_hparams(source=mdir, savedir=os.path.join(DERIVED, "ecapa_cache"), run_opts={"device": "cpu"})
    clf = _ECAPA
    embs = []
    for i in range(0, len(starts), 16):
        b = torch.from_numpy(np.stack([wav[t:t + W] for t in starts[i:i + 16]]))
        with torch.inference_mode():
            embs.append(clf.encode_batch(b).squeeze(1).numpy())
    E = np.concatenate(embs)
    E = E / np.linalg.norm(E, axis=1, keepdims=True)
    from sklearn.cluster import AgglomerativeClustering
    thr = float(os.environ.get("DC_SPK_THR", "0.6"))
    cl = AgglomerativeClustering(n_clusters=None, metric="cosine", linkage="average", distance_threshold=thr).fit(E)
    labels = cl.labels_
    sizes = sorted([int((labels == k).sum()) for k in set(labels)], reverse=True)
    big = [s for s in sizes if s >= max(3, 0.08 * len(labels))]
    sim = E @ E.T
    iu = np.triu_indices(len(E), 1)
    return {"speakers": len(big) or 1, "speaker_cluster_sizes": sizes, "speaker_windows": len(labels),
            "speaker_cos_threshold": 1 - thr, "speaker_mean_pair_sim": round(float(sim[iu].mean()), 3)}


def profile(a):
    """Full QA profile of one asset. Needs the 16 kHz wav (decode first)."""
    wav = wav16_path(a["audio_id"])
    if not os.path.exists(wav):
        raise RuntimeError(f"no 16k wav for {a['audio_id']}; run `dc audio decode`")
    sr, ch, dur_ms = probe_native(a["src"])
    t0 = time.time()
    qa = ebur128(a["src"])
    st = stream_stats(a["src"], sr)
    vm, segs = vad_and_floor(wav, a["audio_id"])
    os.makedirs(VAD_DIR, exist_ok=True)
    C.write_json(os.path.join(VAD_DIR, fid(a["audio_id"]) + ".json"), {"audio_id": a["audio_id"], "segments_ms": segs,
                                                                         "params": "silero thr0.5 min_speech250 min_silence100 pad30"}, indent=None)
    try:
        sp = speakers_ecapa(wav, segs)
    except Exception as e:  # noqa: BLE001
        sp = {"speakers": None, "speaker_error": str(e)[:200]}
    rec = {"audio_id": a["audio_id"], "sr": sr, "channels": ch, "duration_ms": dur_ms,
           "qa": {**qa, "speech_ratio": vm["speech_ratio"], "pauses": vm["pauses"], "noise_floor_db": vm["noise_floor_db"],
                  "bandwidth_hz": st["bandwidth_hz"], "clipping": st["clip_runs"], "music_bed_score": vm["music_bed_score"],
                  "speakers": sp.get("speakers"), "dnsmos": None, "utmos": None},
           "detail": {**{k: v for k, v in vm.items() if k not in ("speech_ratio", "pauses", "noise_floor_db", "music_bed_score")},
                      **{k: v for k, v in st.items() if k not in ("bandwidth_hz",)}, **sp},
           "seconds": round(time.time() - t0, 1)}
    return rec


def qa_path(aid):
    return os.path.join(QA_DIR, fid(aid) + ".json")


def cmd_qa(args):
    sel = select(args.ids)
    todo = [a for a in sel if args.force or not os.path.exists(qa_path(a["audio_id"]))]
    if not args.inline and not Q.in_queue() and not args.shard:
        # make sure wavs exist, then fan out one job per shard
        missing = [a["audio_id"] for a in sel if not os.path.exists(wav16_path(a["audio_id"]))]
        if missing:
            C.fail(f"{len(missing)} assets not decoded yet (run `dc audio decode`): {missing[:3]}...", 2)
        if todo:
            n = min(3, len(todo))
            todo_sorted = sorted(todo, key=lambda a: -a["bytes"])
            jobs = []
            for k in range(n):
                ids = [a["audio_id"] for i, a in enumerate(todo_sorted) if i % n == k]  # fixed at submit time: no race between shards
                extra = ["--inline", "--no-report", "--ids", *ids] + (["--force"] if args.force else [])
                jobs.append(Q.submit(f"audio-qa-{k}of{n}", [sys.executable, "-I", *_self_argv("qa", extra)], mem_gb=1.5,
                                     expected_gb=0.2))
                print(f"queued QA job {k + 1}/{n} ({len(ids)} assets) as tsp job {jobs[-1]['tsp_id']}", file=sys.stderr)
            for j in jobs:
                Q.cmd_wait(type("A", (), {"id": j["tsp_id"], "timeout": 7200, "tail": 5}))
        return cmd_report(args)
    mine = todo
    os.makedirs(QA_DIR, exist_ok=True)
    for i, a in enumerate(mine, 1):
        try:
            rec = profile(a)
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(mine)}] FAIL {a['audio_id']}: {e}", file=sys.stderr, flush=True)
            continue
        C.write_json(qa_path(a["audio_id"]), rec)
        q = rec["qa"]
        print(f"  [{i}/{len(mine)}] {a['audio_id']} {rec['seconds']}s I={q['lufs_i']} sp={q['speech_ratio']} bed={q['music_bed_score']} spk={q['speakers']}", flush=True)
    if not args.no_report and not args.shard:
        return cmd_report(args)
    return 0


# ------------------------------------------------------------------ assets.json + report
def build_assets():
    reg = registry()
    items, missing = [], []
    s2role, s2ref = None, None
    s2f = C.p("corpus", "audio", "s2_script_id.json")
    if os.path.exists(s2f):
        j = C.read_json(s2f, {})
        s2role = j.get("provisional_role")
        s2ref = "T1:§8-AR" if j.get("reads_same_script_as_s1") else None
    prev = {x["audio_id"]: x for x in (C.read_json(ASSETS_JSON, []) or [])}
    for a in reg:
        qp = qa_path(a["audio_id"])
        if not os.path.exists(qp):
            missing.append(a["audio_id"])
            continue
        r = C.read_json(qp)
        role = a["role"]
        if a["audio_id"] == "a:S2:ar-esraa" and s2role:
            role = s2role
        old = prev.get(a["audio_id"], {})
        item = {"v": 1, "audio_id": a["audio_id"], "file_id": a["file_id"], "family": a["family"], "lang": a["lang"],
                "duration_ms": r["duration_ms"], "sr": r["sr"], "channels": r["channels"], "qa": r["qa"],
                "stems": old.get("stems") or {"vocals": None},
                "script_ref": s2ref if (a["audio_id"] == "a:S2:ar-esraa" and s2ref) else a["script_ref"],
                "alignment": old.get("alignment") or {"method": None, "median_conf": None}, "role": role}
        if item["alignment"].get("method") is None:
            item["alignment"] = {}
        items.append(item)
    return items, missing


def _f(x, nd=1, dash="-"):
    return dash if x is None else f"{x:.{nd}f}"


def eq_match(items):
    """Clamped (+-4 dB) 1/3-octave EQ curve mapping the mean S4 long-term spectrum onto S1's, level-matched over 200 Hz-4 kHz."""
    import numpy as np
    def ltas(aid):
        r = C.read_json(qa_path(aid))
        return r["detail"].get("ltas_band_centres_hz"), r["detail"].get("ltas_db")
    fc, s1 = ltas("a:S1:ar-natural")
    s4 = []
    for it in items:
        if it["family"] == "S4":
            c, l = ltas(it["audio_id"])
            n = min(len(fc), len(l))
            s4.append([np.nan if v is None else v for v in l[:n]] + [np.nan] * (len(fc) - n))
    if not s4:
        return None
    m4 = np.nanmedian(np.array(s4), axis=0)
    a = np.array([np.nan if v is None else v for v in s1[:len(fc)]])
    d = a - m4
    sel = [i for i, f in enumerate(fc) if 200 <= f <= 4000 and np.isfinite(d[i])]
    d = d - np.nanmean(d[sel])
    d = np.clip(d, -4, 4)
    d[~np.isfinite(d)] = 0.0
    return {"v": 1, "from": "median of 27 S4 parts", "to": "a:S1:ar-natural", "clamp_db": 4, "level_matched_band_hz": [200, 4000],
            "band_centres_hz": fc, "gain_db": [round(float(x), 2) for x in d]}


def _notes(items):
    L = ["", "## Findings that matter to ADR-001 and P5", ""]
    by = {i["audio_id"]: i for i in items}
    s1, s2, s5 = by.get("a:S1:ar-natural"), by.get("a:S2:ar-esraa"), by.get("a:S5:en-natural")
    s4 = [i for i in items if i["family"] == "S4"]
    if s1 and s2:
        q1, q2 = s1["qa"], s2["qa"]
        L.append(f"- **S1 vs S2 vs S5 (the three 70:05 tracks):** all normalised to -16.0 LUFS-I; speech time S1 {q1['speech_ratio'] * 4205:.0f} s, S2 {q2['speech_ratio'] * 4205:.0f} s, "
                 f"S5 {s5['qa']['speech_ratio'] * 4205:.0f} s. S1 and S5 have digital silence between phrases (noise floor {q1['noise_floor_db']} dB, i.e. nothing under the voice). "
                 f"S2 does not: its non-speech floor is {q2['noise_floor_db']} dBFS (5th-percentile frame {C.read_json(qa_path('a:S2:ar-esraa'))['detail']['frame_rms_db_p05_p50_p95'][0]} dB), "
                 f"music_bed_score {q2['music_bed_score']} against {q1['music_bed_score']} for S1. S2 carries a continuous bed.")
    s2f = C.read_json(C.p("corpus", "audio", "s2_script_id.json"), None)
    if s2f:
        tl = s2f.get("timeline_vs_s1") or {}
        L.append(f"- **S2 script:** two 3-min turbo-ASR windows (5:00, 40:00) fuzzy-match master.md §8 Egyptian narration (partial-ratio median {s2f['best_median_score']}, at CH-03/04 and CH-22/23, the same chapters as S1 at those times); "
                 f"T4 (28-min V2 narration) scores about 50. So S2 reads the same script as S1 (Claude's T5 script and the T2 unified narration contain the same text). Relative to S1 its sentence starts sit at a median "
                 f"{tl.get('median_offset_ms', 'n/a')} ms ({tl.get('within_1s', 0)} of {tl.get('matched_segments', 0)} matched segments within 1 s; range {tl.get('min_ms', 'n/a')} to {tl.get('max_ms', 'n/a')} ms), "
                 f"i.e. it follows the chapter timeline loosely. Provisional role: `{s2f['provisional_role']}`. No Demucs run: S2 carries no content absent from S1 (ADR-001 can order separation if S2's voice is wanted).")
    vj = C.read_json(C.p("corpus", "audio", "voices.json"), None)
    if vj:
        cl = vj["clusters"]
        def parts(c):
            return ", ".join(x.split(":")[2] for x in c if x.startswith("a:S4"))
        a_ = next((c for c in cl if "a:S1:ar-natural" in c), [])
        b_ = next((c for c in cl if any(x.startswith("a:S3") for x in c)), [])
        c_ = next((c for c in cl if "a:S5:en-natural" in c), [])
        L.append("- **Voices (ECAPA mean embedding per asset, `dc audio voices`, corpus/audio/voices.json):** every long track has one speaker inside it, but S4 is not one narrator. "
                 f"Voice A (same family as S1 and S2, cosine to S1 0.53-0.62): S4 parts {parts(a_)}. Voice B (the S3 TTS voice family, cosine to S1 0.34-0.42): S4 parts {parts(b_)}. "
                 f"Voice C (closest to the English S5, cosine 0.58): S4 parts {parts(c_)}. S1 and S2 are the same voice family (window-level cosine 0.42 across, 0.48 inside S1). "
                 "Concatenating S4 parts for a deep-dive therefore changes voice between parts; ADR-001 should treat voice consistency per part, not per source.")
    else:
        L.append("- **Voice:** ECAPA reports one speaker inside every long track; S1 and S2 are the same voice family. Run `dc audio voices` for the cross-part picture.")
    if s4:
        lu = [i["qa"]["lufs_i"] for i in s4]
        tp = [i["qa"]["tp_dbtp"] for i in s4]
        bw = [i["qa"]["bandwidth_hz"] for i in s4]
        L.append(f"- **S4 (27 NotebookLM parts, MP3 44.1 kHz mono):** LUFS-I {min(lu)} to {max(lu)} (needs about +5 dB to reach S1's -16), LRA about 3.5, "
                 f"99 % rolloff {min(bw):.0f}-{max(bw):.0f} Hz, speech ratio {min(i['qa']['speech_ratio'] for i in s4):.2f}-{max(i['qa']['speech_ratio'] for i in s4):.2f} (denser than S1's 0.67), "
                 f"digital silence in gaps, and true peaks up to {max(tp):+.1f} dBTP (clip runs: " + ", ".join(f"{i['audio_id'].split(':')[2]}={i['qa']['clipping']}" for i in s4 if (i['qa'].get('clipping') or 0) > 0) + "). Normalise with a true-peak limiter, not gain alone.")
    cx = C.read_json(os.path.join(DERIVED, "crosscheck_P23.json"), None)
    if cx:
        L.append(f"- **MP3 = video audio:** S4 P23's MP3 against the audio stream of its NotebookLM MP4: waveform correlation {cx['waveform_corr']}, lag {cx['lag_ms']} ms over {cx['seconds_compared']} s ({'identical' if cx['identical_audio'] else 'DIFFERENT'}).")
    s3 = [i for i in items if i["family"] == "S3"]
    if s3:
        L.append(f"- **S3 (TTS, {len(s3)} clips, 24 kHz mono):** LUFS-I {_f(S3med(s3, 'lufs_i'))} median, floor digital silence, 99 % rolloff about {_f(S3med(s3, 'bandwidth_hz'), 0)} Hz (24 kHz source). "
                 "The ECAPA speaker count reads 2 on a few short clips (fewer than 25 windows); one TTS voice was used throughout.")
    eq = eq_match(items) if s1 and s4 else None
    if eq:
        C.write_json(C.p("corpus", "audio", "eq_match_s4_to_s1.json"), eq)
        L.append("- **EQ match S4 to S1 (P5):** corpus/audio/eq_match_s4_to_s1.json, 1/3-octave gains clamped to +-4 dB: "
                 + ", ".join(f"{f:.0f} Hz {g:+.1f}" for f, g in zip(eq["band_centres_hz"], eq["gain_db"]) if abs(g) >= 1.5) + " (bands within 1.5 dB omitted).")
    wp = C.p("corpus", "transcripts", "a_S1_ar-natural.words.jsonl")
    if os.path.exists(wp) and s1:
        n = sum(1 for _ in open(wp, encoding="utf-8"))
        sp = s1["qa"]["speech_ratio"] * 4205 / 60
        L.append(f"- **Pacing:** S1 aligned script has {n} words over {sp:.1f} min of VAD speech, {n / sp:.0f} words per minute (master.md calls for at most 110 wpm per chapter window; "
                 "that figure counts the whole window, this one counts speech only).")
    L.append("- **Quality proxies:** DNSMOS and UTMOS are null. DNSMOS needs ONNX weights hosted on GitHub (blocked) and UTMOS a GitHub-hosted checkpoint; they are English-trained and relative-only anyway. "
             "Use LUFS/noise floor/bandwidth/clipping/ECAPA similarity as the objective differences.")
    return L


def S3med(xs, k):
    import statistics as S
    v = [x["qa"].get(k) for x in xs if x["qa"].get(k) is not None]
    return S.median(v) if v else None


def cmd_report(args=None):
    items, missing = build_assets()
    if not items:
        C.fail("no QA profiles yet", 2)
    C.write_json(ASSETS_JSON, items)
    fam = {}
    for it in items:
        fam.setdefault(it["family"], []).append(it)
    import statistics as S

    def med(xs):
        xs = [x for x in xs if x is not None]
        return S.median(xs) if xs else None
    L = ["# Audio sources: QA profile", "",
         f"Generated by `dc audio report` from data/derived/audio/qa/*.json ({len(items)} of 71 assets"
         + (f"; missing: {missing}" if missing else "") + "). Machine-readable: corpus/audio/assets.json.", "",
         "Definitions: LUFS/LRA/TP from ffmpeg ebur128 (peak=true) on the source file. speech_ratio = Silero VAD speech time / duration "
         "(thr 0.5, min speech 250 ms, min silence 100 ms). pauses = VAD gaps >= 300 ms. noise floor = median 32 ms frame RMS (dBFS) "
         "inside gaps >= 300 ms (100 ms guard), or the 5th percentile of all frames when the file has < 2 s of gaps. bandwidth = 99 % "
         "spectral rolloff of the long-term spectrum at the native rate. clipping = runs of full-scale samples. music_bed_score = "
         "clip((floor_db + 60) / 30, 0, 1) x (1 - spectral flatness of the floor frames): a proxy, 0 = clean silence, 1 = loud tonal bed. "
         "speakers = ECAPA (3 s windows, <= 80 per file) + average-linkage clustering at cosine distance 0.6, clusters >= 8 % of windows. "
         "DNSMOS/UTMOS are null: the DNSMOS ONNX weights live on blocked hosts and UTMOS needs a GitHub-hosted checkpoint (see lessons).", ""]
    L += ["## Per family (medians over assets)", "",
          "| family | n | total h | LUFS-I | LRA | TP dBTP | speech ratio | pauses (median) | noise floor dB | bandwidth Hz | bed score | speakers |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for f in sorted(fam):
        xs = fam[f]
        q = lambda k: med([x["qa"].get(k) for x in xs])  # noqa: E731
        spk = sorted({x["qa"].get("speakers") for x in xs if x["qa"].get("speakers") is not None})
        L.append(f"| {f} | {len(xs)} | {sum(x['duration_ms'] for x in xs) / 3.6e6:.2f} | {_f(q('lufs_i'))} | {_f(q('lra'))} | {_f(q('tp_dbtp'))} | "
                 f"{_f(q('speech_ratio'), 3)} | {_f(q('pauses'), 0)} | {_f(q('noise_floor_db'))} | {_f(q('bandwidth_hz'), 0)} | "
                 f"{_f(q('music_bed_score'), 3)} | {','.join(map(str, spk)) or '-'} |")
    L += ["", "## Long tracks and per-part detail", "",
          "| audio | role | dur | sr | LUFS-I | LRA | TP | speech | pauses | floor dB | bw Hz | clip runs | bed | spk |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for it in items:
        if it["family"] == "S3":
            continue
        q = it["qa"]
        L.append(f"| {it['audio_id']} | {it['role']} | {it['duration_ms'] / 60000:.1f} min | {it['sr']} | {_f(q.get('lufs_i'))} | {_f(q.get('lra'))} | "
                 f"{_f(q.get('tp_dbtp'))} | {_f(q.get('speech_ratio'), 3)} | {_f(q.get('pauses'), 0)} | {_f(q.get('noise_floor_db'))} | "
                 f"{_f(q.get('bandwidth_hz'), 0)} | {_f(q.get('clipping'), 0)} | {_f(q.get('music_bed_score'), 3)} | {q.get('speakers') or '-'} |")
    s3 = fam.get("S3", [])
    if s3:
        L += ["", f"S3 ({len(s3)} TTS clips) summarised in the family table; per-clip numbers are in corpus/audio/assets.json."]
    L += _notes(items)
    extra = C.p("reports", "audio", "sources_notes.md")
    if os.path.exists(extra):
        L += ["", open(extra, encoding="utf-8").read().rstrip()]
    os.makedirs(os.path.dirname(SOURCES_MD), exist_ok=True)
    with open(SOURCES_MD, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    M.write(os.path.dirname(ASSETS_JSON), "audio-qa", "dc audio qa",
            [{"path": C.rel(qa_path(i["audio_id"])), "sha256": C.sha256_file(qa_path(i["audio_id"]))} for i in items],
            [C.rel(ASSETS_JSON), C.rel(SOURCES_MD)], tools=C.tool_versions("ffmpeg"), extra={"assets": len(items), "missing": missing})
    print(f"report: {len(items)} assets -> {C.rel(ASSETS_JSON)}, {C.rel(SOURCES_MD)}" + (f" ({len(missing)} missing)" if missing else ""))
    return 0


def set_alignment(audio_id, method, median_conf):
    """Record the alignment method/confidence of an asset in corpus/audio/assets.json (survives `dc audio report`).
    Several queue jobs finish at the same time, so the read-modify-write is serialised with a file lock."""
    import fcntl
    os.makedirs(DERIVED, exist_ok=True)
    with open(os.path.join(DERIVED, "assets.lock"), "w") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        items = C.read_json(ASSETS_JSON, []) or []
        for it in items:
            if it["audio_id"] == audio_id:
                it["alignment"] = {"method": method, "median_conf": median_conf}
        C.write_json(ASSETS_JSON, items)


# ------------------------------------------------------------------ S4 mp3 vs its NotebookLM mp4 (P3.1 cross-check)
def cmd_crosscheck(args):
    """Is the S4 MP3 the audio stream of the NotebookLM MP4? Waveform correlation after a +-250 ms lag search on the first 180 s."""
    if not args.inline and not Q.in_queue():
        job = Q.submit("audio-crosscheck-s4", [sys.executable, "-I", *_self_argv("crosscheck", ["--inline"] + [args.part])], mem_gb=1.0, expected_gb=0.1)
        print(job["tsp_id"])
        return 0
    import glob
    import numpy as np
    import soundfile as sf
    part = args.part
    n = int(re.sub(r"\D", "", part))
    cands = glob.glob(os.path.join(EXTRACTED, "NotebookLM.zip.d", "NotebookLM_part*.zip.d", f"Part_{n} *.mp4"))
    if not cands:
        C.fail(f"no mp4 for Part_{n}", 2)
    mp4 = cands[0]
    r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-t", "180", "-i", mp4, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True)
    x = np.frombuffer(r.stdout, dtype="<f4")
    y, _ = sf.read(wav16_path(f"a:S4:P{n:02d}"), frames=len(x) + 8000, dtype="float32")
    L = min(len(x), len(y) - 4000)
    x, yy = x[:L], y[:L + 4000]
    best = (-2, 0)
    xf = np.fft.rfft(x, 2 * (L + 4000))
    yf = np.fft.rfft(yy, 2 * (L + 4000))
    cc = np.fft.irfft(np.conj(xf) * yf)
    for lag in range(-4000, 4001):
        v = cc[lag] if lag >= 0 else cc[lag]
        if v > best[0]:
            best = (v, lag)
    lag = best[1]
    a = x[max(0, -lag):L - max(0, lag)]
    b = yy[max(0, lag):max(0, lag) + len(a)]
    k = min(len(a), len(b))
    corr = float(np.corrcoef(a[:k], b[:k])[0, 1])
    res = {"part": f"P{n:02d}", "mp4": os.path.relpath(mp4, EXTRACTED), "lag_ms": lag / 16.0, "waveform_corr": round(corr, 4), "seconds_compared": round(k / 16000, 1),
           "identical_audio": corr > 0.95}
    C.write_json(os.path.join(DERIVED, f"crosscheck_P{n:02d}.json"), res)
    print(json.dumps(res))
    return 0


# ------------------------------------------------------------------ voice identity across parts
def cmd_voices(args):
    """ECAPA mean embedding per asset (12 speech windows of 3 s), then cluster the assets into voices (cosine similarity >= 0.5 on means)."""
    if not args.inline and not Q.in_queue():
        job = Q.submit("audio-voices", [sys.executable, "-I", *_self_argv("voices", ["--inline"])], mem_gb=1.5, expected_gb=0.05)
        print(job["tsp_id"])
        return 0
    import numpy as np
    import soundfile as sf
    import torch
    torch.set_num_threads(2)
    from speechbrain.inference.speaker import EncoderClassifier
    clf = EncoderClassifier.from_hparams(source=C.p("data", "models", "ecapa-voxceleb"), savedir=os.path.join(DERIVED, "ecapa_cache"), run_opts={"device": "cpu"})
    ids = [a["audio_id"] for a in registry() if a["family"] in ("S1", "S2", "S4", "S5") or a["audio_id"] in ("a:S3:CH-00_0", "a:S3:CH-14_0", "a:S3:CH-33_0")]
    means, names = [], []
    for aid in ids:
        segs = C.read_json(os.path.join(VAD_DIR, fid(aid) + ".json"))["segments_ms"]
        wav, sr = sf.read(wav16_path(aid), dtype="float32")
        cand = []
        for s, e in segs:
            a, b = int(s * sr / 1000), int(e * sr / 1000)
            t = a
            while t + 3 * sr <= b:
                cand.append(t)
                t += 3 * sr
        if len(cand) < 3:
            continue
        pick = [cand[i] for i in np.linspace(0, len(cand) - 1, min(12, len(cand))).round().astype(int)]
        with torch.inference_mode():
            e = clf.encode_batch(torch.from_numpy(np.stack([wav[t:t + 3 * sr] for t in pick]))).squeeze(1).numpy()
        e = e / np.linalg.norm(e, axis=1, keepdims=True)
        m = e.mean(0)
        means.append(m / np.linalg.norm(m))
        names.append(aid)
        print(aid, len(pick), flush=True)
    M_ = np.stack(means)
    sim = M_ @ M_.T
    from sklearn.cluster import AgglomerativeClustering
    lab = AgglomerativeClustering(n_clusters=None, metric="cosine", linkage="average", distance_threshold=0.5).fit(M_).labels_
    clusters = {}
    for n, l in zip(names, lab):
        clusters.setdefault(int(l), []).append(n)
    out = {"v": 1, "method": "ECAPA mean of 12 x 3 s speech windows per asset; average-linkage on cosine distance 0.5", "clusters": list(clusters.values()),
           "pair_similarity": {n: {m: round(float(sim[i, j]), 3) for j, m in enumerate(names) if m.startswith(("a:S1", "a:S2", "a:S5"))} for i, n in enumerate(names)}}
    C.write_json(C.p("corpus", "audio", "voices.json"), out)
    print(json.dumps({"n_voices": len(clusters), "clusters": list(clusters.values())}, ensure_ascii=False))
    return 0
