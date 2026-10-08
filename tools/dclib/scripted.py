"""dc align scripted for S2 (Arabic, music bed), S3 (41 TTS clips) and S5 (English): MMS-300m CTC forced alignment of the known script.

* S2 (a:S2:ar-esraa) reads the same script as S1 (TTS-clean chapter texts), so its words get the same token sequence as S1 and the
  same index i. Chapter windows come from S2's own VAD gaps near the master section 7 boundaries (S2 has no ASR of its own).
* S5 (a:S5:en-natural) aligns master section 8 English narration (chapters.json narration_en_plain) with the MMS 'eng' romaniser.
* S3 clips are aligned whole against dacamp/tts/CH-nn_k.txt (`_vo` clips: _0 + _1 joined).

Window variants (L2 loop, at most 3): VAD gap within +-6 s of the nominal chapter boundary, +-12 s, nominal +-1 s. A chapter takes the first
variant whose median confidence reaches the acceptance bar, otherwise the best one. Chapters still under 0.6 on S2 are listed in the report
as `needs_demucs` (vocal separation is done only for those, see `--demucs`).
"""
import json
import os
import re
import statistics as S
import sys
import time

from . import align as AL
from . import audio as A
from . import common as C
from . import manifest as M
from . import queue as Q
from . import scripts as SC
from . import textnorm as TN

TRANS = AL.TRANS
STRIDE = AL.STRIDE
VARIANTS = [("vad6", 6.0), ("vad12", 12.0), ("nominal", 0.0)]
ACCEPT = {"S2": 0.55, "S5": 0.55}

# ------------------------------------------------------------------ English surrogate
E_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
          "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
E_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def en_int(n):
    if n < 20:
        return E_ONES[n]
    if n < 100:
        t, o = divmod(n, 10)
        return E_TENS[t] + ("" if o == 0 else " " + E_ONES[o])
    if n < 1000:
        h, r = divmod(n, 100)
        return E_ONES[h] + " hundred" + ("" if r == 0 else " " + en_int(r))
    for unit, name in ((10 ** 9, "billion"), (10 ** 6, "million"), (1000, "thousand")):
        if n >= unit:
            h, r = divmod(n, unit)
            return en_int(h) + " " + name + ("" if r == 0 else " " + en_int(r))
    return ""


def spoken_en(tok):
    """Alignment surrogate for one English script token (never stored): digits spelled, symbols named, hyphen/slash splits kept."""
    t = tok.strip()
    t = re.sub(r"^[^\w$€£%]+|[^\w$€£%]+$", "", t)
    if not t:
        return ""
    out = []
    t = re.sub(r"([€£$])(\d[\d,]*(?:\.\d+)?)", r"\2 \1", t)  # "$3,948.50" is said "3,948.50 dollars"
    for run in re.findall(r"\d+(?:,\d{3})*(?:\.\d+)?|[A-Za-z']+|[%€£$]", t):
        if run[0].isdigit():
            ip, _, fp = run.replace(",", "").partition(".")
            try:
                s = en_int(int(ip))
            except Exception:  # noqa: BLE001
                s = ""
            if fp:
                s += " point " + " ".join(E_ONES[int(d)] for d in fp)
            out.append(s)
        elif run == "%":
            out.append("percent")
        elif run in "€£$":
            out.append({"€": "euro", "£": "pound", "$": "dollar"}[run])
        else:
            out.append(run.replace("'", ""))
    return " ".join(x for x in out if x)


# ------------------------------------------------------------------ texts and windows
def family(aid):
    return aid.split(":")[1]


def chapter_texts(aid):
    """chapter -> script text. S2: the TTS-clean chapter scripts (same as S1). S5: master section 8 English narration."""
    if family(aid) == "S2":
        return {ch: d["text"] for ch, d in SC.chapter_texts_tts().items()}
    ch = C.read_json(C.p("corpus", "canon", "chapters.json"))["chapters"]
    return {c["id"]: c["narration_en_plain"] for c in ch}


def vad_gaps(aid):
    segs = C.read_json(os.path.join(A.VAD_DIR, A.fid(aid) + ".json"))["segments_ms"]
    return segs, [(a[1], b[0]) for a, b in zip(segs, segs[1:])]


def window_variants(aid, wins, total_s):
    """-> {variant: [{'chapter','start_s','end_s'}]}. Starts: first chapter = first speech - 1 s; the others = centre of the longest VAD gap
    (>= 300 ms) within +-radius of the nominal boundary, or nominal - 1 s for the 'nominal' variant. End of chapter k = start of k+1
    (nominal variant: + 2 s overlap). Last end = last speech + 2 s."""
    segs, gaps = vad_gaps(aid)
    end_all = min(total_s, segs[-1][1] / 1000.0 + 2.0)
    out = {}
    for name, rad in VARIANTS:
        b = []
        for k, w in enumerate(wins):
            nom = float(w["start_s"])
            if k == 0:
                b.append(max(0.0, segs[0][0] / 1000.0 - 1.0))
            elif rad <= 0:
                b.append(nom - 1.0)
            else:
                cand = [(g1 - g0, -abs((g0 + g1) / 2000.0 - nom), (g0 + g1) / 2000.0) for g0, g1 in gaps
                        if abs((g0 + g1) / 2000.0 - nom) <= rad and g1 - g0 >= 300]
                b.append(max(cand)[2] if cand else nom)
        ov = 2.0 if rad <= 0 else 0.0
        ends = [b[k + 1] + ov for k in range(len(wins) - 1)] + [end_all]
        out[name] = [{"chapter": w["chapter"], "start_s": b[k], "end_s": ends[k]} for k, w in enumerate(wins)]
    return out


def _rows(res, f0, n_tok):
    """Per word (start_ms, end_ms, conf) or None."""
    rows = []
    for r in res:
        if r is None:
            rows.append(None)
        else:
            fs, fe, cf, _ = AL.word_span(r)
            rows.append((int(round((f0 + fs) * STRIDE * 1000)), int(round((f0 + fe) * STRIDE * 1000)), cf))
    return rows


def _fill(rows, start_ms):
    """Interpolate words without alignment between their neighbours (as the S1 aligner does)."""
    rows = list(rows)
    for k, r in enumerate(rows):
        if r is None:
            prev = next((rows[j] for j in range(k - 1, -1, -1) if rows[j]), None)
            nxt = next((rows[j] for j in range(k + 1, len(rows)) if rows[j]), None)
            a = prev[1] if prev else (nxt[0] if nxt else start_ms)
            b = nxt[0] if nxt else a + 20
            rows[k] = (a, max(a + 20, b), 0.0, True)
    return rows


def align_window(em, toks, sur, lang, a_s, b_s):
    import numpy as np
    import torch
    f0 = max(0, int(a_s / STRIDE))
    f1 = min(em.shape[0], int(b_s / STRIDE))
    sl = torch.from_numpy(em[f0:f1].astype(np.float32))
    res = AL.forced_align_slice(sl, sur, lang=lang)
    rows = _rows(res, f0, len(toks))
    confs = [r[2] for r in rows if r]
    return rows, (S.median(confs) if confs else 0.0)


def _record(aid, gi, tok, r, ch, method, glossary, lang):
    interp = len(r) == 4
    s_ms, e_ms = r[0], max(r[1], r[0] + 20)
    conf = round(max(0.0, min(1.0, r[2])), 4)
    fam = family(aid)
    word_id = f"w:{fam}:{aid.split(':', 2)[2]}:{gi:06d}"
    latin = re.sub(r"[^A-Za-z0-9\-]", "", tok).casefold()
    if lang == "eng":
        is_term = latin in glossary
    else:
        is_term = bool(re.search(r"[A-Za-z]{2,}", tok)) and latin in glossary
    return {"v": 1, "word_id": word_id, "audio_id": aid, "i": gi, "text": tok, "norm": TN.fold(tok) or tok, "start_ms": s_ms, "end_ms": e_ms,
            "conf": conf, "method": method + ("+interp" if interp else ""), "chapter": ch, "is_term": is_term, "term": None,
            "is_number": bool(re.search(r"\d", tok)), "polish": None}


def _stats(words_ch, nominal, tol_s):
    confs = [w["conf"] for w in words_ch if "interp" not in w["method"]]
    first, last = words_ch[0]["start_ms"], words_ch[-1]["end_ms"]
    outside = [w for w in words_ch if w["start_ms"] < (nominal[0] - tol_s) * 1000 or w["end_ms"] > (nominal[1] + tol_s) * 1000]
    return {"median_conf": round(S.median(confs), 4) if confs else 0.0, "p10_conf": round(sorted(confs)[len(confs) // 10], 4) if confs else 0.0,
            "first_word_s": round(first / 1000, 2), "last_word_s": round(last / 1000, 2), "lead_in_s": round(first / 1000 - nominal[0], 2),
            "tail_s": round(nominal[1] - last / 1000, 2), "words_outside_window": len(outside), "low_conf_words": sum(1 for c in confs if c < 0.3),
            "interpolated": sum(1 for w in words_ch if "interp" in w["method"])}


# ------------------------------------------------------------------ chaptered (S2, S5)
def run_chaptered(aid, args):
    import numpy as np
    fam = family(aid)
    lang = "eng" if fam == "S5" else "ara"
    sfn = spoken_en if fam == "S5" else AL.spoken
    AL.set_threads(args.threads)
    em = AL.emissions_cached(aid)
    if args.emissions_only:
        print(f"emissions: {em.shape}")
        return 0
    AL.vocab_uroman()
    total_s = em.shape[0] * STRIDE
    wins = SC.chapter_windows_master()
    texts = chapter_texts(aid)
    variants = window_variants(aid, wins, total_s)
    glossary = {t.casefold() for t in SC.glossary_terms(400)}
    method = "mms_fa"
    words, chapters, gi = [], [], 0
    for k, w in enumerate(wins):
        ch = w["chapter"]
        toks = AL.tokenise(texts[ch])
        sur = [sfn(t) for t in toks]
        tried, best = [], None
        for vname, _ in VARIANTS:
            vw = variants[vname][k]
            t0 = time.time()
            try:
                rows, med = align_window(em, toks, sur, lang, vw["start_s"], vw["end_s"])
            except Exception as e:  # noqa: BLE001
                tried.append({"variant": vname, "window_s": [round(vw["start_s"], 2), round(vw["end_s"], 2)], "error": str(e)[:80]})
                continue
            tried.append({"variant": vname, "window_s": [round(vw["start_s"], 2), round(vw["end_s"], 2)], "median_conf": round(med, 4)})
            if best is None or med > best[1]:
                best = (vname, med, rows, vw)
            if med >= ACCEPT[fam]:
                break
        if best is None:
            C.fail(f"{ch}: no window variant could be aligned: {tried}", 6)
        vname, med, rows, vw = best
        rows = _fill(rows, int(w["start_s"] * 1000))
        cw = []
        for tok, r in zip(toks, rows):
            cw.append(_record(aid, gi, tok, r, ch, method, glossary, lang))
            gi += 1
        words += cw
        st = _stats(cw, (w["start_s"], w["end_s"]), args.tol)
        chapters.append({"chapter": ch, "window_s": [w["start_s"], w["end_s"]], "align_window_s": [round(vw["start_s"], 2), round(vw["end_s"], 2)],
                         "variant": vname, "variants_tried": tried, "n_words": len(toks), **st})
        print(f"  {ch}: {len(toks)} words, conf {st['median_conf']} [{vname}] lead {st['lead_in_s']}s tail {st['tail_s']}s outside {st['words_outside_window']}", flush=True)
    overlaps = [[a["chapter"], b["chapter"], round(a["last_word_s"] - b["first_word_s"], 2)] for a, b in zip(chapters, chapters[1:])
                if a["last_word_s"] > b["first_word_s"] + 0.01]
    med_all = S.median(x["conf"] for x in words if "interp" not in x["method"])
    flagged = [c["chapter"] for c in chapters if c["median_conf"] < 0.5 or c["words_outside_window"] > 0]
    doc = {"v": 1, "audio_id": aid, "method": method, "words": len(words), "median_conf": round(med_all, 4), "chapters": chapters, "flagged": flagged,
           "boundary_overlaps": overlaps, "window_mode": "VAD-gap variants vad6 > vad12 > nominal (first with median conf >= %.2f)" % ACCEPT[fam],
           "text_source": "LMArena/Folder 1/dacamp/tts/CH-nn_k.txt" if fam == "S2" else "corpus/canon/chapters.json narration_en_plain (master §8 English)",
           "needs_demucs": [c["chapter"] for c in chapters if c["median_conf"] < 0.6] if fam == "S2" else [],
           "created": C.now_iso()}
    if fam == "S5":
        doc["cue_check"] = cue_check(words)
    out = os.path.join(TRANS, A.fid(aid) + ".words.jsonl")
    rep = os.path.join(TRANS, A.fid(aid) + ".align.json")
    C.write_jsonl(out, words)
    C.write_json(rep, doc)
    A.set_alignment(aid, method, doc["median_conf"])
    print(f"align {aid}: {len(words)} words, median conf {med_all:.3f}, flagged {flagged}, overlaps {overlaps}, needs_demucs {doc['needs_demucs']}")
    return 0


def cue_check(words):
    """S5 word onsets vs the English cues (corpus/canon/cues_70m05.json): first word of caption k = cumulative caption word count."""
    cues = C.read_json(C.p("corpus", "canon", "cues_70m05.json"))["captions"]
    per_ch = {}
    for w in words:
        per_ch.setdefault(w["chapter"], []).append(w)
    diffs, skipped = [], []
    k = {}
    for c in cues:
        k.setdefault(c["chapter"], []).append(c)
    for ch, cs in k.items():
        ws = per_ch.get(ch, [])
        counts = [len(AL.tokenise(c["text"])) for c in cs]  # alignable tokens (standalone dashes are not words)
        if sum(counts) != len(ws):
            skipped.append([ch, sum(counts), len(ws)])
            continue
        pos = 0
        for c, nw in zip(cs, counts):
            if nw:
                diffs.append(ws[pos]["start_ms"] - c["start_ms"])
            pos += nw
    ad = [abs(d) for d in diffs]
    res = {"captions": len(cues), "compared": len(diffs), "chapters_skipped_word_count_mismatch": skipped}
    if ad:
        res.update({"median_abs_ms": S.median(ad), "median_signed_ms": S.median(diffs), "within_300ms": round(sum(1 for d in ad if d <= 300) / len(ad), 4),
                    "p90_abs_ms": sorted(ad)[int(0.9 * len(ad))]})
    return res


# ------------------------------------------------------------------ clips (S3)
def clip_text(aid):
    stem = aid.split(":")[2]  # CH-14_0 | CH-14_vo
    base = stem.split("_")[0]
    parts = [stem] if not stem.endswith("_vo") else [f"{base}_0", f"{base}_1"]
    texts = []
    for p in parts:
        f = os.path.join(SC.TTS_DIR, p + ".txt")
        if os.path.exists(f):
            with open(f, encoding="utf-8") as fh:
                texts.append(fh.read().strip())
    return " ".join(texts), parts


def run_clips(ids, args):
    import numpy as np
    import soundfile as sf
    import torch
    H = AL.set_threads(args.threads)
    AL.vocab_uroman()
    glossary = {t.casefold() for t in SC.glossary_terms(400)}
    for aid in ids:
        text, parts = clip_text(aid)
        toks = AL.tokenise(text)
        sur = [AL.spoken(t) for t in toks]
        x, sr = sf.read(A.wav16_path(aid), dtype="float32")
        em = H.emissions(x).numpy()
        t0 = time.time()
        sl = torch.from_numpy(em.astype(np.float32))
        res = AL.forced_align_slice(sl, sur)
        rows = _fill(_rows(res, 0, len(toks)), 0)
        ch = aid.split(":")[2][:5]
        words = [_record(aid, i, t, r, ch, "mms_fa", glossary, "ara") for i, (t, r) in enumerate(zip(toks, rows))]
        dur = len(x) / sr
        st = _stats(words, (0.0, dur), 1.0)
        doc = {"v": 1, "audio_id": aid, "method": "mms_fa", "words": len(words), "median_conf": st["median_conf"],
               "chapters": [{"chapter": ch, "window_s": [0.0, round(dur, 2)], "n_words": len(words), **{k: v for k, v in st.items()}}],
               "flagged": [ch] if st["median_conf"] < 0.5 else [], "text_source": [os.path.relpath(os.path.join(SC.TTS_DIR, p + ".txt"), SC.EX) for p in parts],
               "duration_s": round(dur, 2), "created": C.now_iso()}
        C.write_jsonl(os.path.join(TRANS, A.fid(aid) + ".words.jsonl"), words)
        C.write_json(os.path.join(TRANS, A.fid(aid) + ".align.json"), doc)
        A.set_alignment(aid, "mms_fa", st["median_conf"])
        print(f"{aid}: {len(words)} words, conf {st['median_conf']}, lead {st['lead_in_s']}s tail {st['tail_s']}s [{time.time() - t0:.0f}s]", flush=True)
    return 0


def s3_ids():
    return [a["audio_id"] for a in A.registry() if a["family"] == "S3"]


# ------------------------------------------------------------------ entry
def cmd(args):
    aid = args.audio_id
    fam = family(aid) if aid.count(":") >= 2 else aid
    if aid.lower() in ("s3", "all-s3"):
        fam, aid = "S3", "all-s3"
    if fam not in ("S2", "S3", "S5"):
        C.fail("scripted alignment supports S1 (align.py), S2, S3 (use 'all-s3' or a clip id) and S5", 2)
    ids = None
    if fam == "S3":
        ids = s3_ids() if aid == "all-s3" else [aid]
        if args.only:
            ids = [i for i in ids if i in set(args.only)]
    if not args.inline and not Q.in_queue():
        base = [sys.executable, "-I", C.p("tools", "dc.py"), "align", "scripted"]
        flags = ["--inline", "--threads", str(args.threads), "--tol", str(args.tol)] + (["--emissions-only"] if args.emissions_only else [])
        if fam == "S3":
            n = max(1, args.jobs)
            jobs = []
            for k in range(n):
                part = ids[k::n]
                if not part:
                    continue
                job = Q.submit(f"align-S3-mms-{k + 1}of{n}", base + ["all-s3"] + flags + ["--only"] + part, mem_gb=2.0, expected_gb=0.1)
                jobs.append(job["tsp_id"])
            print(json.dumps(jobs))
            return 0
        job = Q.submit(f"align-{fam}-mms", base + [aid] + flags, mem_gb=2.0, expected_gb=0.3)
        print(job["tsp_id"])
        return 0
    if fam == "S3":
        return run_clips(ids, args)
    return run_chaptered(aid, args)
