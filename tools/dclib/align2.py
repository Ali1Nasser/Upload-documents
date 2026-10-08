"""dc align second <audio_id>: a second, independent CTC forced aligner for the G3 two-aligner agreement check.

Model: jonatasgrosman/wav2vec2-large-xlsr-53-arabic (XLSR-53 pre-trained, fine-tuned on Arabic Common Voice; Arabic-letter vocabulary, '|' word
delimiter). It aligns the same S1 script tokens that MMS aligned (same chapter windows, same alignment surrogate for acronyms and numbers), so
word i of one aligner is word i of the other. Latin words have no letters in this vocabulary: they are mapped to approximate Arabic letters
(`latin_to_ar`, crude grapheme rules) so that they still occupy their time slot, and the agreement report separates Arabic-only words from
mapped ones.  Output: data/derived/align/a_S1_ar-natural.w2v.words.jsonl (not committed) + a coverage summary.
"""
import json
import os
import re
import statistics as S
import sys
import time
import unicodedata

from . import align as AL
from . import audio as A
from . import common as C
from . import queue as Q

W2V_DIR = C.p("data", "models", "wav2vec2-xlsr53-arabic")
OUT_DIR = C.p("data", "derived", "align")
EMIS_DIR = os.path.join(OUT_DIR, "emis_w2v")
STRIDE = AL.STRIDE
BLOCK_S = 600

_M = None


def model(threads):
    global _M
    import torch
    from transformers import Wav2Vec2ForCTC
    torch.set_num_threads(int(threads))
    if _M is None:
        _M = (Wav2Vec2ForCTC.from_pretrained(str(W2V_DIR), dtype=torch.float32).eval(), json.loads(open(os.path.join(W2V_DIR, "vocab.json"), encoding="utf-8").read()))
    return _M


def emissions_chunked(m, x, window_s=30, context_s=2, bs=4):
    """x float32 16 kHz -> log-probs [T, V] with exactly 50 frames per second (same framing fix as harness/lib/align.py)."""
    import numpy as np
    import torch
    sr = 16000
    x = (x - x.mean()) / (x.std() + 1e-7)
    W, Cx = window_s * sr, context_s * sr
    pad = np.pad(x, (Cx, Cx + (-len(x)) % W))
    chunks = [pad[i:i + W + 2 * Cx] for i in range(0, len(pad) - 2 * Cx, W)]
    fc, wf = int(round(Cx / 320)), int(round(W / 320))
    outs = []
    with torch.inference_mode():
        for i in range(0, len(chunks), bs):
            b = torch.from_numpy(np.stack(chunks[i:i + bs])).float()
            lg = m(b).logits[:, fc:fc + wf]
            outs.append(torch.log_softmax(lg, -1).reshape(-1, lg.shape[-1]))
    return torch.cat(outs)[: int(np.ceil(len(x) / sr / STRIDE))]


def emissions_cached(aid, threads, force=False):
    import numpy as np
    import soundfile as sf
    m, _ = model(threads)
    wav = A.wav16_path(aid)
    info = sf.info(wav)
    sr, total = info.samplerate, info.frames
    d = os.path.join(EMIS_DIR, A.fid(aid))
    os.makedirs(d, exist_ok=True)
    ctx = 2 * sr
    nblk = (total + BLOCK_S * sr - 1) // (BLOCK_S * sr)
    parts = []
    for b in range(nblk):
        f = os.path.join(d, f"blk{b:03d}.npy")
        if os.path.exists(f) and not force:
            parts.append(np.load(f))
            continue
        t0 = time.time()
        a0, a1 = b * BLOCK_S * sr, min(total, (b + 1) * BLOCK_S * sr)
        c0, c1 = max(0, a0 - ctx), min(total, a1 + ctx)
        x, _ = sf.read(wav, start=c0, frames=c1 - c0, dtype="float32")
        em = emissions_chunked(m, x).numpy()
        lead = int(round((a0 - c0) / 320))
        n = int(round((a1 - a0) / 320))
        blk = em[lead:lead + n].astype(np.float16)
        np.save(f + ".tmp.npy", blk)
        os.replace(f + ".tmp.npy", f)
        parts.append(blk)
        print(f"  w2v emissions block {b + 1}/{nblk}: {blk.shape[0]} frames in {time.time() - t0:.0f}s", flush=True)
    return np.concatenate(parts)


# ------------------------------------------------------------------ text -> vocabulary
_TASHKEEL = re.compile("[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]")
_CHARMAP = str.maketrans({"ڤ": "ف", "گ": "ك", "پ": "ب", "چ": "ج", "ک": "ك", "ی": "ي", "ﻻ": "لا", "ٱ": "ا"})
_DIG = [("sh", "ش"), ("ch", "تش"), ("th", "ث"), ("ph", "ف"), ("ck", "ك"), ("kh", "خ"), ("gh", "غ"), ("ee", "ي"), ("oo", "و"), ("ou", "او"), ("ea", "ي"),
        ("ai", "ي"), ("ay", "ي"), ("ow", "او"), ("qu", "كو"), ("ng", "نج"), ("ie", "ي"), ("oa", "و"), ("ey", "ي")]
_SING = dict(a="ا", b="ب", c="ك", d="د", e="ي", f="ف", g="ج", h="ه", i="ي", j="ج", k="ك", l="ل", m="م", n="ن", o="و", p="ب", q="ك", r="ر", s="س",
             t="ت", u="و", v="ف", w="و", x="كس", y="ي", z="ز")


def latin_to_ar(w):
    w = w.casefold()
    out, i = [], 0
    while i < len(w):
        for dg, ar in _DIG:
            if w.startswith(dg, i):
                out.append(ar)
                i += len(dg)
                break
        else:
            ch = w[i]
            if ch in _SING:
                if not (out and out[-1] == _SING[ch] and ch not in "oe"):  # collapse doubled consonants
                    out.append(_SING[ch])
            i += 1
    return "".join(out)


def to_vocab(sur, vocab):
    """Alignment surrogate (Arabic, possibly with Latin runs) -> (string of vocabulary letters, n_latin_chars_mapped)."""
    mapped = 0
    parts = []
    for run in re.findall(r"[A-Za-z]+|[^A-Za-z]+", sur):
        if re.match(r"[A-Za-z]", run):
            r = latin_to_ar(run)
            mapped += len(run)
            parts.append(r)
        else:
            parts.append(run)
    s = unicodedata.normalize("NFKC", "".join(parts))
    s = _TASHKEEL.sub("", s).translate(_CHARMAP)
    s = "".join(ch for ch in s if ch in vocab and ch not in "|-" and vocab[ch] >= 6 and not (43 <= vocab[ch] <= 50))
    return s, mapped


def forced_align_w2v(em, letters, vocab):
    """letters: per word string of vocabulary letters (may be ''). Word delimiter '|' is inserted between non-empty words.
    -> per word None or [(f0, f1, p)] per letter."""
    import numpy as np
    import torch
    import torchaudio.functional as F
    toks, owner = [], []
    first = True
    for i, w in enumerate(letters):
        if not w:
            continue
        if not first:
            toks.append(vocab["|"])
            owner.append(None)
        first = False
        for ch in w:
            toks.append(vocab[ch])
            owner.append(i)
    if not toks:
        raise ValueError("no alignable text")
    if len(toks) > em.shape[0]:
        raise ValueError(f"text longer than audio frames: {len(toks)} > {em.shape[0]}")
    ali, sc = F.forced_align(em[None], torch.tensor([toks], dtype=torch.int32), blank=0)
    ali, sc = ali[0].numpy(), sc[0].exp().numpy()
    runs, prev = [], 0
    for f, a in enumerate(ali):
        if a != 0 and a != prev:
            runs.append([f])
        elif a != 0 and runs:
            runs[-1].append(f)
        prev = a
    if len(runs) != len(toks):
        raise RuntimeError(f"span/token mismatch {len(runs)} vs {len(toks)}")
    res = [[] for _ in letters]
    for fr, o in zip(runs, owner):
        if o is None:
            continue
        best = max(fr, key=lambda f: sc[f])
        res[o].append((fr[0], fr[-1] + 1, float(sc[best])))
    return [r or None for r in res]


def second_clips(ids, threads):
    """S3 TTS clips: same script tokens as the MMS words, one window per clip -> data/derived/align/<clip>.w2v.words.jsonl."""
    import numpy as np
    import torch
    m, vocab = model(threads)
    for aid in ids:
        words = C.read_jsonl(os.path.join(AL.TRANS, A.fid(aid) + ".words.jsonl"))
        em = emissions_cached(aid, threads)
        letters = [to_vocab(AL.spoken(w["text"]), vocab)[0] for w in words]
        t0 = time.time()
        try:
            res = forced_align_w2v(torch.from_numpy(em.astype(np.float32)), letters, vocab)
        except Exception as e:  # noqa: BLE001
            print(f"  {aid}: FAILED {e}", flush=True)
            res = [None] * len(words)
        out = []
        for w, r in zip(words, res):
            if r is None:
                out.append({"v": 1, "word_id": w["word_id"], "audio_id": aid, "i": w["i"], "text": w["text"], "start_ms": None, "end_ms": None, "conf": 0.0, "method": "w2v_none"})
                continue
            fs, fe, cf, _ = AL.word_span(r)
            out.append({"v": 1, "word_id": w["word_id"], "audio_id": aid, "i": w["i"], "text": w["text"], "start_ms": int(round(fs * STRIDE * 1000)),
                        "end_ms": int(round(fe * STRIDE * 1000)), "conf": round(cf, 4), "method": "w2v_fa"})
        os.makedirs(OUT_DIR, exist_ok=True)
        C.write_jsonl(os.path.join(OUT_DIR, A.fid(aid) + ".w2v.words.jsonl"), out)
        print(f"  {aid}: {len(out)} words, aligned {sum(1 for o in out if o['start_ms'] is not None)} [{time.time() - t0:.1f}s]", flush=True)
    return 0


def cmd_second(args):
    aid = args.audio_id
    if aid in ("all-s3", "s3") or aid.startswith("a:S3:"):
        ids = sorted(a["audio_id"] for a in A.registry() if a["family"] == "S3") if aid in ("all-s3", "s3") else [aid]
        if not args.inline and not Q.in_queue() and len(ids) > 1:
            jobs = []
            for k in range(2):
                part = ids[k::2]
                job = Q.submit(f"align-S3-w2v-{k + 1}of2", [sys.executable, "-I", C.p("tools", "dc.py"), "align", "second", part[0], "--inline", "--threads", str(args.threads),
                                                              "--also"] + part[1:], mem_gb=2.5, expected_gb=0.1)
                jobs.append(job["tsp_id"])
            print(json.dumps(jobs))
            return 0
        return second_clips(ids + list(getattr(args, "also", None) or []), args.threads)
    if aid != "a:S1:ar-natural":
        C.fail("second aligner is implemented for a:S1:ar-natural and the S3 clips (all-s3 | a:S3:CH-nn_k)", 2)
    if not args.inline and not Q.in_queue():
        job = Q.submit("align-S1-w2v", [sys.executable, "-I", C.p("tools", "dc.py"), "align", "second", aid, "--inline", "--threads", str(args.threads)]
                       + (["--emissions-only"] if args.emissions_only else []), mem_gb=2.5, expected_gb=0.1)
        print(job["tsp_id"])
        return 0
    import numpy as np
    import torch
    m, vocab = model(args.threads)
    em = emissions_cached(aid, args.threads)
    if args.emissions_only:
        print(f"emissions: {em.shape}")
        return 0
    words = C.read_jsonl(os.path.join(AL.TRANS, A.fid(aid) + ".words.jsonl"))
    rep = C.read_json(os.path.join(AL.TRANS, A.fid(aid) + ".align.json"))
    by = {}
    for w in words:
        by.setdefault(w["chapter"], []).append(w)
    out, per_ch = [], []
    cover = {"tokens": 0, "arabic_only": 0, "latin_mapped": 0, "empty": 0, "latin_chars": 0}
    for c in rep["chapters"]:
        ch = c["chapter"]
        ws = by[ch]
        sur = [AL.spoken(w["text"]) for w in ws]
        letters, ml = [], []
        for s in sur:
            t, mp = to_vocab(s, vocab)
            letters.append(t)
            ml.append(mp)
        for t, mp in zip(letters, ml):
            cover["tokens"] += 1
            cover["empty"] += 0 if t else 1
            cover["latin_mapped"] += 1 if (mp and t) else 0
            cover["arabic_only"] += 1 if (t and not mp) else 0
            cover["latin_chars"] += mp
        a_s, b_s = c["align_window_s"]
        f0, f1 = max(0, int(a_s / STRIDE)), min(em.shape[0], int(b_s / STRIDE))
        sl = torch.from_numpy(em[f0:f1].astype(np.float32))
        t0 = time.time()
        try:
            res = forced_align_w2v(sl, letters, vocab)
        except Exception as e:  # noqa: BLE001
            print(f"  {ch}: FAILED {e}", flush=True)
            res = [None] * len(ws)
        rows = []
        for r in res:
            if r is None:
                rows.append(None)
            else:
                fs, fe, cf, _ = AL.word_span(r)
                rows.append((int(round((f0 + fs) * STRIDE * 1000)), int(round((f0 + fe) * STRIDE * 1000)), cf))
        confs = [r[2] for r in rows if r]
        for w, r, mp in zip(ws, rows, ml):
            out.append({"v": 1, "word_id": w["word_id"], "audio_id": aid, "i": w["i"], "text": w["text"], "start_ms": r[0] if r else None, "end_ms": r[1] if r else None,
                        "conf": round(r[2], 4) if r else 0.0, "method": "w2v_fa" if r else "w2v_none", "chapter": ch, "latin_mapped": bool(mp)})
        per_ch.append({"chapter": ch, "n": len(ws), "aligned": len(confs), "median_conf": round(S.median(confs), 4) if confs else 0.0})
        print(f"  {ch}: {len(ws)} words, w2v median conf {per_ch[-1]['median_conf']} [{time.time() - t0:.1f}s]", flush=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    C.write_jsonl(os.path.join(OUT_DIR, A.fid(aid) + ".w2v.words.jsonl"), out)
    summ = {"v": 1, "audio_id": aid, "model": "jonatasgrosman/wav2vec2-large-xlsr-53-arabic", "words": len(out), "coverage": cover,
            "median_conf": round(S.median([w["conf"] for w in out if w["method"] == "w2v_fa"]), 4), "chapters": per_ch, "created": C.now_iso()}
    C.write_json(os.path.join(OUT_DIR, A.fid(aid) + ".w2v.json"), summ)
    print(f"second aligner: {len(out)} words, coverage {cover}, median conf {summ['median_conf']}")
    return 0


# ------------------------------------------------------------------ agreement MMS vs w2v (dc asr agreement --second w2v)
def cmd_agreement_w2v(args):
    aid = args.audio_id
    mms = C.read_jsonl(os.path.join(AL.TRANS, A.fid(aid) + ".words.jsonl"))
    w2v = C.read_jsonl(os.path.join(OUT_DIR, A.fid(aid) + ".w2v.words.jsonl"))
    summ = C.read_json(os.path.join(OUT_DIR, A.fid(aid) + ".w2v.json"))
    assert len(mms) == len(w2v), "word lists differ in length"
    rows = []
    for a, b in zip(mms, w2v):
        assert a["i"] == b["i"] and a["text"] == b["text"], f"word {a['i']} differs"
        if b["start_ms"] is None or "interp" in a["method"]:
            continue
        rows.append({"i": a["i"], "ch": a["chapter"], "text": a["text"], "latin": bool(re.search(r"[A-Za-z]", a["text"])), "ds": b["start_ms"] - a["start_ms"],
                     "de": b["end_ms"] - a["end_ms"], "cm": a["conf"], "cw": b["conf"]})
    n = len(rows)

    def share(sel, key="ds", t=120):
        v = [abs(r[key]) for r in sel]
        return (100.0 * sum(1 for x in v if x <= t) / len(v)) if v else float("nan"), len(v)
    sets = {"all comparable words": rows, "Arabic-script words (no Latin letters)": [r for r in rows if not r["latin"]],
            "words containing Latin letters (w2v letters mapped)": [r for r in rows if r["latin"]],
            "both aligners conf >= 0.5": [r for r in rows if r["cm"] >= 0.5 and r["cw"] >= 0.5]}
    med = S.median(r["ds"] for r in rows)
    L = ["# S1 aligner agreement: MMS-300m vs wav2vec2-large-xlsr-53-arabic (second CTC aligner)", "",
         f"Words in the script {len(mms)}; comparable (aligned by both, not interpolated) {n} ({100 * n / len(mms):.1f} %). Same chapter windows, same alignment surrogate; "
         "start time of a word = first frame of its first letter's CTC run (identical rule for both models). Coverage of the second aligner's vocabulary: "
         f"{summ['coverage']['arabic_only']} Arabic-only tokens, {summ['coverage']['latin_mapped']} tokens with Latin letters mapped to approximate Arabic letters "
         f"({summ['coverage']['latin_chars']} Latin characters), {summ['coverage']['empty']} tokens with nothing to align.", "",
         "| word set | n | start <= 60 ms | start <= 120 ms | start <= 250 ms | end <= 120 ms |", "|---|---|---|---|---|---|"]
    res = {}
    for name, sel in sets.items():
        if not sel:
            continue
        s60, _ = share(sel, "ds", 60)
        s120, k = share(sel, "ds", 120)
        s250, _ = share(sel, "ds", 250)
        e120, _ = share(sel, "de", 120)
        L.append(f"| {name} | {k} | {s60:.1f} % | **{s120:.1f} %** | {s250:.1f} % | {e120:.1f} % |")
        res[name] = {"n": k, "start_le_60": round(s60, 2), "start_le_120": round(s120, 2), "start_le_250": round(s250, 2), "end_le_120": round(e120, 2)}
    ads = sorted(abs(r["ds"]) for r in rows)
    shifted = [abs(r["ds"] - med) for r in rows]
    L += ["", f"Median signed start difference (w2v minus MMS): {med:+.0f} ms; median |diff| {S.median(ads):.0f} ms; p90 {ads[int(0.9 * n)]:.0f} ms; p99 {ads[int(0.99 * n)]:.0f} ms. "
          f"After removing the median offset: {100 * sum(1 for x in shifted if x <= 120) / n:.1f} % within 120 ms.", "",
          "G3 asks for >= 95 % of words within 120 ms for scripted audio. Verdict on the Arabic-script words: "
          + ("**PASS**" if res.get("Arabic-script words (no Latin letters)", {}).get("start_le_120", 0) >= 95 else "**FAIL**")
          + f" ({res.get('Arabic-script words (no Latin letters)', {}).get('start_le_120', float('nan')):.1f} %); on all comparable words: "
          + ("**PASS**" if res.get("all comparable words", {}).get("start_le_120", 0) >= 95 else "**FAIL**") + f" ({res.get('all comparable words', {}).get('start_le_120', float('nan')):.1f} %).",
          "", "## Per chapter (all comparable words)", "", "| chapter | n | median signed ms | start <= 120 ms | w2v median conf |", "|---|---|---|---|---|"]
    per = {}
    for r in rows:
        per.setdefault(r["ch"], []).append(r)
    cc = {c["chapter"]: c["median_conf"] for c in summ["chapters"]}
    for ch in sorted(per):
        v = per[ch]
        L.append(f"| {ch} | {len(v)} | {S.median(x['ds'] for x in v):+.0f} | {share(v)[0]:.0f} % | {cc.get(ch, 0):.3f} |")
    worst = sorted(rows, key=lambda r: -abs(r["ds"]))[:15]
    L += ["", "Largest disagreements (word index, text, diff ms): " + "; ".join(f"{r['i']} {r['text']} {r['ds']:+d}" for r in worst)]
    os.makedirs(C.p("reports", "asr"), exist_ok=True)
    with open(C.p("reports", "asr", "s1_agreement_w2v.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    C.write_json(os.path.join(OUT_DIR, "s1_agreement_w2v.json"), {"comparable": n, "median_signed_ms": med, "sets": res})
    print(json.dumps({"comparable": n, "median_signed_ms": med, "sets": res}))
    return 0
