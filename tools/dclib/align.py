"""dc align scripted <audio_id>: word-level forced alignment of a known script (S1 first) with MMS-300m + uroman + torchaudio forced_align
(harness/lib/align.py provides the model loader, emissions and romanisation).

Pipeline for S1: 70:05 audio -> CTC emissions cached in 10-min blocks (data/derived/align/) -> per chapter window (master §7, checked against
DA_SCENES) force-align the TTS-clean chapter text -> corpus/transcripts/a_S1_ar-natural.words.jsonl + .align.json (per-chapter report).

Alignment surrogate: Latin acronyms are spelled the way the Arabic voice says them (master §10.3 style letter names), numerals are spelled
in Egyptian number words; the stored `text` is always the authored token.
"""
import importlib.util
import json
import os
import re
import statistics as S
import sys
import time

from . import audio as A
from . import common as C
from . import manifest as M
from . import queue as Q
from . import scripts as SC
from . import textnorm as TN

ALIGN_DIR = C.p("data", "derived", "align")
TRANS = C.p("corpus", "transcripts")
STRIDE = 320 / 16000.0
BLOCK_S = 600
PAD_S = 2.0

LETTERS = {"a": "ايه", "b": "بي", "c": "سي", "d": "دي", "e": "اي", "f": "اف", "g": "جي", "h": "ايتش", "i": "اي", "j": "جاي", "k": "كاي",
           "l": "ال", "m": "ام", "n": "ان", "o": "او", "p": "بي", "q": "كيو", "r": "ار", "s": "اس", "t": "تي", "u": "يو", "v": "في",
           "w": "دبليو", "x": "اكس", "y": "واي", "z": "زد"}
WORDS = {"json": "جيسون", "rag": "راج", "api": "ايه بي اي", "sql": "اس كيو ال", "llm": "ال ال ام", "iam": "اي ايه ام", "gpu": "جي بي يو",
         "csv": "سي اس في", "cpu": "سي بي يو", "ram": "رام", "http": "اتش تي تي بي", "https": "اتش تي تي بي اس", "ui": "يو اي",
         "ci/cd": "سي اي سي دي", "etl": "اي تي ال", "elt": "اي ال تي", "ods": "او دي اس", "ads": "ايه دي اس", "hdfs": "اتش دي اف اس",
         "dag": "داج", "dags": "داجز", "sla": "اس ال ايه", "slo": "اس ال او", "rpo": "ار بي او", "rto": "ار تي او", "url": "يو ار ال",
         "ssh": "اس اس اتش", "apis": "ايه بي اي ز", "kpi": "كاي بي اي", "tcp": "تي سي بي", "tls": "تي ال اس", "bfs": "بي اف اس", "dfs": "دي اف اس",
         "ci": "سي اي", "cd": "سي دي", "utf": "يو تي اف", "gdpr": "جي دي بي ار", "sdk": "اس دي كاي", "cli": "سي ال اي", "ide": "اي دي اي", "dns": "دي ان اس", "sso": "اس اس او", "pii": "بي اي اي", "ml": "ام ال", "ai": "ايه اي", "os": "او اس"}
ONES = ["صفر", "واحد", "اتنين", "تلاتة", "اربعة", "خمسة", "ستة", "سبعة", "تمانية", "تسعة", "عشرة", "احداشر", "اتناشر", "تلتاشر", "اربعتاشر",
        "خمستاشر", "ستاشر", "سبعتاشر", "تمنتاشر", "تسعتاشر"]
TENS = ["", "", "عشرين", "تلاتين", "اربعين", "خمسين", "ستين", "سبعين", "تمانين", "تسعين"]
HUND = ["", "ميه", "ميتين", "تلتميه", "ربعميه", "خمسميه", "ستميه", "سبعميه", "تمنميه", "تسعميه"]


def spell_int(n):
    if n < 20:
        return ONES[n]
    if n < 100:
        t, o = divmod(n, 10)
        return TENS[t] if o == 0 else ONES[o] + " و" + TENS[t]
    if n < 1000:
        h, r = divmod(n, 100)
        return HUND[h] if r == 0 else HUND[h] + " و" + spell_int(r)
    th, r = divmod(n, 1000)
    head = "الف" if th == 1 else "الفين" if th == 2 else (spell_int(th) + " الاف")
    return head if r == 0 else head + " و" + spell_int(r)


def spoken(tok):
    """Alignment surrogate for one script token (never stored)."""
    t = tok.strip()
    t = re.sub(r"^[^\w]+|[^\w]+$", "", t)
    if not t:
        return ""
    low = t.casefold()
    if low in WORDS:
        return WORDS[low]
    out = []
    for run in re.findall(r"[؀-ۿ]+|[A-Za-z]+(?:[-/][A-Za-z]+)*|\d+|[^\w\s]", t):
        if re.match(r"[؀-ۿ]", run):
            out.append(run[:-1] if len(run) >= 4 and run.endswith("وا") else run)  # silent final alef of the plural verb ending
        elif run.isdigit():
            try:
                out.append(spell_int(int(run)))
            except Exception:  # noqa: BLE001
                out.append("")
        elif re.match(r"[A-Za-z]", run):
            r = run.casefold()
            if r in WORDS:
                out.append(WORDS[r])
            elif len(run) == 1:
                out.append(LETTERS[r])
            else:
                out.append(run)  # an English word: leave Latin, MMS handles English phonotactics
    return " ".join(x for x in out if x)


_H = None


def _harness():
    """harness/lib/align.py loaded once per process (its lru_cache holds the 1.2 GB model)."""
    global _H
    if _H is None:
        spec = importlib.util.spec_from_file_location("harness_align", C.p("harness", "lib", "align.py"))
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        _H = m
    return _H


def set_threads(n):
    """Load the MMS model (first call) and fix the torch thread count (the harness loader hard-codes 3)."""
    import torch
    H = _harness()
    H._load()
    torch.set_num_threads(int(n))
    return H


_VU = None


def vocab_uroman():
    """Vocabulary + romaniser only (no 1.2 GB model): enough to align from cached emissions."""
    global _VU
    if _VU is None:
        import uroman
        H = _harness()
        _VU = (json.loads((H.MODEL_DIR / "vocab.json").read_text()), uroman.Uroman(), H)
    return _VU


def emissions_cached(aid, force=False):
    """Whole-file CTC log-probs, float16 [T, 31], computed in 10-min blocks with 2 s of real context and cached per block."""
    import numpy as np
    import soundfile as sf
    H = _harness()
    wav = A.wav16_path(aid)
    info = sf.info(wav)
    sr = info.samplerate
    total = info.frames
    d = os.path.join(ALIGN_DIR, "emis", A.fid(aid))
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
        em = H.emissions(x).numpy()
        lead = int(round((a0 - c0) / 320))
        n = int(round((a1 - a0) / 320))
        blk = em[lead:lead + n].astype(np.float16)
        np.save(f + ".tmp.npy", blk)
        os.replace(f + ".tmp.npy", f)
        parts.append(blk)
        print(f"  emissions block {b + 1}/{nblk}: {blk.shape[0]} frames in {time.time() - t0:.0f}s", flush=True)
    return np.concatenate(parts)


def forced_align_slice(em, words, H=None, lang="ara"):
    """em: float32 torch [T,V] log-probs; words: surrogate strings.
    Returns per word None (nothing to align) or a list of per-char (frame, prob) pairs, in text order."""
    import numpy as np
    import torch
    import torchaudio.functional as F
    vocab, u, H = vocab_uroman()
    rom = [H._romanize(w, u, lang) if w else "" for w in words]
    toks, owner = [], []
    for i, r in enumerate(rom):
        for ch in r:
            toks.append(vocab[ch])
            owner.append(i)
    if not toks:
        raise ValueError("no alignable text")
    if len(toks) > em.shape[0]:
        raise ValueError(f"text longer than audio frames: {len(toks)} > {em.shape[0]}")
    ali, sc = F.forced_align(em[None], torch.tensor([toks], dtype=torch.int32), blank=0)
    ali, sc = ali[0].numpy(), sc[0].exp().numpy()
    # per-token frame: the frame with the highest posterior inside the token's emitted run
    runs, prev = [], 0
    for f, a in enumerate(ali):
        if a != 0 and a != prev:
            runs.append([f])
        elif a != 0 and runs:
            runs[-1].append(f)
        prev = a
    if len(runs) != len(toks):
        raise RuntimeError(f"span/token mismatch {len(runs)} vs {len(toks)}")
    res = [[] for _ in words]
    for fr, o in zip(runs, owner):
        best = max(fr, key=lambda f: sc[f])
        res[o].append((fr[0], fr[-1] + 1, float(sc[best])))
    return [r or None for r in res]


TAU = 0.2       # a char counts as acoustically supported when its posterior at the chosen frame is >= TAU
GAP_S = 0.35    # a char further than this from its in-word neighbour is a stray (CTC parks unsupported/silent letters in pauses)


def word_span(chars):
    """(start_frame, end_frame, conf, kept_share) from per-char (f0, f1, p).
    CTC lets a char with no acoustic evidence (silent final alef of 'نجحوا', a letter the speaker swallowed) sit anywhere in the neighbouring
    pause, which stretches the word over the pause. Trim, in order: edge chars separated from their neighbour by > GAP_S, then edge chars
    with posterior < TAU. conf = sum of retained posteriors / all chars, so trimmed words come out with lower confidence."""
    gap = int(GAP_S / STRIDE)
    cs = list(chars)
    while len(cs) > 1 and cs[-1][0] - cs[-2][1] > gap:
        cs.pop()
    while len(cs) > 1 and cs[1][0] - cs[0][1] > gap:
        cs.pop(0)
    sup = [c for c in cs if c[2] >= TAU] or cs
    s, e = sup[0][0], sup[-1][1]
    conf = sum(c[2] for c in cs) / len(chars)
    return s, e, conf, len(cs) / len(chars)


def tokenise(text):
    """Script tokens: whitespace-separated, standalone punctuation dropped."""
    return [t for t in text.split() if re.search(r"\w", t)]


def asr_windows(aid, wins, texts, total_s):
    """Chapter windows anchored on the whisper transcript: script words are matched to whisper words (Levenshtein on folded tokens);
    chapter k spans [midpoint of the pause before its first matched run, midpoint of the pause after its last matched run].
    Falls back to the nominal master §7 boundary where the ASR anchors are missing or inconsistent. Returns (windows, info)."""
    from rapidfuzz.distance import Levenshtein
    from . import asr as R
    ap = R.asr_path(aid)
    if not os.path.exists(ap):
        return None, "no asr.json"
    doc = C.read_json(ap)
    hw = [w for sg in doc["segments"] for w in sg["words"]]
    script, owner = [], []
    for w in wins:
        for t in tokenise(texts[w["chapter"]]["text"]):
            script.append(TN.fold(t).replace(" ", ""))
            owner.append(w["chapter"])
    ht = [TN.fold(w["text"]).replace(" ", "") for w in hw]
    ops = Levenshtein.opcodes(script, ht)
    pairs = []
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal" and (i2 - i1) >= 2:  # runs of >= 2 equal tokens only
            pairs += [(i1 + k, j1 + k) for k in range(i2 - i1) if script[i1 + k]]
    first, last = {}, {}
    for i, j in pairs:
        ch = owner[i]
        if ch not in first:
            first[ch] = hw[j]["start_ms"] / 1000.0
        last[ch] = hw[j]["end_ms"] / 1000.0
    chs = [w["chapter"] for w in wins]
    nominal = {w["chapter"]: w for w in wins}
    bounds, notes = [], []
    for k in range(len(chs) + 1):
        if k == 0:
            b = max(0.0, first.get(chs[0], nominal[chs[0]]["start_s"]) - 1.0)
        elif k == len(chs):
            b = min(total_s, last.get(chs[-1], nominal[chs[-1]]["end_s"]) + 2.0)
        else:
            a, c = chs[k - 1], chs[k]
            if a in last and c in first and first[c] > last[a]:
                b = (last[a] + first[c]) / 2.0
            else:
                b = float(nominal[c]["start_s"])
                notes.append(f"{a}|{c}: nominal boundary (anchors {'missing' if a not in last or c not in first else 'inconsistent'})")
        bounds.append(b)
    out = [{"chapter": ch, "start_s": bounds[k], "end_s": bounds[k + 1]} for k, ch in enumerate(chs)]
    return out, {"matched_words": len(pairs), "notes": notes, "first_s": first, "last_s": last}


def cmd_scripted(args):
    aid = args.audio_id
    if aid != "a:S1:ar-natural":
        from . import scripted as SCR
        return SCR.cmd(args)
    wav = A.wav16_path(aid)
    if not os.path.exists(wav):
        C.fail("decode first: dc audio decode", 2)
    out = os.path.join(TRANS, A.fid(aid) + ".words.jsonl")
    rep = os.path.join(TRANS, A.fid(aid) + ".align.json")
    inputs = [{"path": C.rel(wav), "sha256": C.sha256_file(wav)}] + [
        {"path": os.path.relpath(f, C.ROOT), "sha256": C.sha256_file(f)} for f in (SC.MASTER, os.path.join(SC.TTS_DIR, "CH-00_0.txt"))]
    if not args.inline and not Q.in_queue():
        if (not args.force) and M.should_skip(TRANS, "align:" + aid, inputs, [C.rel(out), C.rel(rep)]):
            print("align: inputs unchanged, skipped (use --force)")
            return 0
        extra = ["--inline"] + (["--force"] if args.force else []) + (["--emissions-only"] if args.emissions_only else [])
        job = Q.submit("align-S1-mms", [sys.executable, "-I", C.p("tools", "dc.py"), "align", "scripted", aid] + extra, mem_gb=2.0, expected_gb=0.3)
        print(job["tsp_id"])
        return 0
    import numpy as np
    import torch
    torch.set_num_threads(3)
    em = emissions_cached(aid)
    if args.emissions_only:
        print(f"emissions: {em.shape}")
        return 0
    vocab_uroman()
    H = _harness()
    wins = SC.chapter_windows_master()
    html = {w["chapter"]: w for w in SC.chapter_windows_html()}
    win_mismatch = [w["chapter"] for w in wins if abs(html[w["chapter"]]["start_s"] - w["start_s"]) > 0.01 or abs(html[w["chapter"]]["end_s"] - w["end_s"]) > 0.01]
    texts = SC.chapter_texts_tts()
    glossary = {t.casefold() for t in SC.glossary_terms(400)}
    total_s = em.shape[0] * STRIDE
    awins, ainfo = asr_windows(aid, wins, texts, total_s)
    use = awins if awins else wins
    win_src = "asr-anchored (midpoint of the pauses between matched whisper words)" if awins else "nominal master §7 +- pad"
    pad = 0.0 if awins else PAD_S
    words, chapters = [], []
    gi = 0
    for w, aw in zip(wins, use):
        ch = w["chapter"]
        toks = tokenise(texts[ch]["text"])
        sur = [spoken(t) for t in toks]
        f0 = max(0, int((aw["start_s"] - pad) / STRIDE))
        f1 = min(em.shape[0], int((aw["end_s"] + pad) / STRIDE))
        sl = torch.from_numpy(em[f0:f1].astype(np.float32))
        t0 = time.time()
        res = forced_align_slice(sl, sur)
        rows = []
        for k, (tok, r) in enumerate(zip(toks, res)):
            if r is None:
                rows.append(None)
            else:
                fs, fe, cf, sup = word_span(r)
                rows.append((int(round((f0 + fs) * STRIDE * 1000)), int(round((f0 + fe) * STRIDE * 1000)), cf))
        # unaligned tokens (empty surrogate): interpolate between neighbours
        for k, r in enumerate(rows):
            if r is None:
                prev = next((rows[j] for j in range(k - 1, -1, -1) if rows[j]), None)
                nxt = next((rows[j] for j in range(k + 1, len(rows)) if rows[j]), None)
                a = prev[1] if prev else (nxt[0] if nxt else int(w["start_s"] * 1000))
                b = nxt[0] if nxt else a + 20
                rows[k] = (a, max(a + 20, b), 0.0, True)
        confs = []
        first_ms = last_ms = None
        for tok, r in zip(toks, rows):
            interp = len(r) == 4
            s_ms, e_ms = r[0], max(r[1], r[0] + 20)
            conf = round(max(0.0, min(1.0, r[2])), 4)
            rec = {"v": 1, "word_id": f"w:S1:ar-natural:{gi:06d}", "audio_id": aid, "i": gi, "text": tok, "norm": TN.fold(tok) or tok,
                   "start_ms": s_ms, "end_ms": e_ms, "conf": conf, "method": "mms_fa+interp" if interp else "mms_fa", "chapter": ch,
                   "is_term": bool(re.search(r"[A-Za-z]{2,}", tok)) and re.sub(r"[^A-Za-z0-9\-]", "", tok).casefold() in glossary,
                   "term": None, "is_number": bool(re.search(r"\d", tok)), "polish": None}
            words.append(rec)
            gi += 1
            if not interp:
                confs.append(conf)
                first_ms = s_ms if first_ms is None else first_ms
                last_ms = e_ms
        cw = [x for x in words if x["chapter"] == ch]
        outside = [x for x in cw if x["start_ms"] < (w["start_s"] - 0.25) * 1000 or x["end_ms"] > (w["end_s"] + 0.25) * 1000]
        chapters.append({"chapter": ch, "window_s": [w["start_s"], w["end_s"]], "align_window_s": [round(aw["start_s"], 2), round(aw["end_s"], 2)],
                         "n_words": len(toks), "files": texts[ch]["files"],
                         "median_conf": round(S.median(confs), 4), "p10_conf": round(sorted(confs)[len(confs) // 10], 4),
                         "first_word_s": round(first_ms / 1000, 2), "last_word_s": round(last_ms / 1000, 2),
                         "lead_in_s": round(first_ms / 1000 - w["start_s"], 2), "tail_s": round(w["end_s"] - last_ms / 1000, 2),
                         "words_outside_window": len(outside), "low_conf_words": sum(1 for c in confs if c < 0.3),
                         "interpolated": sum(1 for r in rows if len(r) == 4), "align_s": round(time.time() - t0, 1)})
        print(f"  {ch}: {len(toks)} words, median conf {chapters[-1]['median_conf']}, lead {chapters[-1]['lead_in_s']}s tail {chapters[-1]['tail_s']}s "
              f"outside {len(outside)}", flush=True)
    # monotonic / overlap check across chapter boundaries
    overlaps = []
    for a, b in zip(chapters, chapters[1:]):
        if a["last_word_s"] > b["first_word_s"] + 0.01:
            overlaps.append([a["chapter"], b["chapter"], round(a["last_word_s"] - b["first_word_s"], 2)])
    C.write_jsonl(out, words)
    med_all = S.median(x["conf"] for x in words if x["method"] == "mms_fa")
    flagged = [c["chapter"] for c in chapters if c["median_conf"] < 0.5 or c["words_outside_window"] > 0 or c["lead_in_s"] < -0.25 or c["tail_s"] < -0.25]
    doc = {"v": 1, "audio_id": aid, "method": "mms_fa", "words": len(words), "median_conf": round(med_all, 4), "chapters": chapters,
           "window_source": "master.md §7 (identical to DA_SCENES in 02_Natural_AR_EDITABLE_STANDALONE.html)" if not win_mismatch else f"MISMATCH {win_mismatch}",
           "window_mismatch": win_mismatch, "boundary_overlaps": overlaps, "flagged": flagged, "pad_s": pad, "window_mode": win_src, "anchor_info": {k: v for k, v in (ainfo.items() if isinstance(ainfo, dict) else []) if k in ("matched_words", "notes")},
           "text_source": "LMArena/Folder 1/dacamp/tts/CH-nn_k.txt",
           "created": C.now_iso()}
    C.write_json(rep, doc)
    M.write(TRANS, "align:" + aid, "dc align scripted " + aid, inputs, [C.rel(out), C.rel(rep)], tools=C.tool_versions(),
            extra={"words": len(words), "median_conf": doc["median_conf"]})
    A.set_alignment(aid, "mms_fa", doc["median_conf"])
    print(f"align: {len(words)} words, median conf {med_all:.3f}, flagged chapters {flagged}, boundary overlaps {overlaps}")
    return 0


def cmd_check(args):
    """dc align check a:S1:ar-natural: containment of speech in the 37 chapter windows, VAD speech not explained by aligned words,
    per-chapter confidence table -> reports/audio/s1_alignment.md (+ vad_coverage block in the .align.json)."""
    import bisect
    aid = args.audio_id
    words = C.read_jsonl(os.path.join(TRANS, A.fid(aid) + ".words.jsonl"))
    rep_p = os.path.join(TRANS, A.fid(aid) + ".align.json")
    rep = C.read_json(rep_p)
    vad = C.read_json(os.path.join(A.VAD_DIR, A.fid(aid) + ".json"))["segments_ms"]
    # union of word spans, each grown by 400 ms (breath/pause inside a phrase)
    spans = sorted((w["start_ms"] - 400, w["end_ms"] + 400) for w in words)
    merged = []
    for a, b in spans:
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    starts = [m[0] for m in merged]

    def covered(a, b):
        tot = 0
        i = max(0, bisect.bisect_right(starts, a) - 1)
        while i < len(merged) and merged[i][0] < b:
            tot += max(0, min(b, merged[i][1]) - max(a, merged[i][0]))
            i += 1
        return tot
    tot_v = sum(b - a for a, b in vad)
    unexpl = [(a, b, (b - a) - covered(a, b)) for a, b in vad]
    unexpl_ms = sum(u for _, _, u in unexpl)
    big = sorted([x for x in unexpl if x[2] >= 700], key=lambda x: -x[2])
    per_ch = {}
    for a, b, u in unexpl:
        ch = next((c["chapter"] for c in rep["chapters"] if c["window_s"][0] * 1000 <= a < c["window_s"][1] * 1000), None)
        if ch:
            per_ch.setdefault(ch, 0)
            per_ch[ch] += u
    # speech crossing a nominal chapter boundary
    cross = []
    for c in rep["chapters"][1:]:
        bnd = c["window_s"][0] * 1000
        for a, b in vad:
            if a < bnd - 250 and b > bnd + 250:
                cross.append([c["chapter"], a, b])
    inside_words = sum(1 for c in rep["chapters"] for _ in [0] if c["words_outside_window"] == 0)
    cov = {"vad_speech_s": round(tot_v / 1000, 1), "unexplained_s": round(unexpl_ms / 1000, 1), "unexplained_share": round(unexpl_ms / tot_v, 4),
           "segments_with_ge_0.7s_unexplained": [[round(a / 1000, 1), round(b / 1000, 1), round(u / 1000, 1)] for a, b, u in big[:25]],
           "chapters_with_all_words_inside_nominal_window": inside_words, "vad_segments_crossing_a_chapter_boundary": cross[:20]}
    rep["vad_coverage"] = cov
    C.write_json(rep_p, rep)
    L = [f"# S1 forced alignment: {aid}", "",
         f"Script: LMArena/Folder 1/dacamp/tts/CH-nn_k.txt, {rep['words']} words. Windows: master.md §7 (identical to DA_SCENES in 02_Natural_AR_EDITABLE_STANDALONE.html: "
         f"{'yes' if not rep['window_mismatch'] else 'NO ' + str(rep['window_mismatch'])}). Aligner windows: {rep['window_mode']}. Method: MMS-300m-1130 CTC emissions (cached, 10-min blocks) + uroman + torchaudio forced_align; "
         "alignment surrogate spells acronyms and numerals the way they are spoken; edge chars with no acoustic support or stranded more than 0.35 s from their neighbour are trimmed.", "",
         f"- Median word confidence (mean char posterior): **{rep['median_conf']}** over {rep['words']} words; chapters with median < 0.70: "
         f"{[c['chapter'] for c in rep['chapters'] if c['median_conf'] < 0.70] or 'none'}.",
         f"- Containment: chapters with every word inside its nominal window (+-250 ms): **{sum(1 for c in rep['chapters'] if c['words_outside_window'] == 0)} of {len(rep['chapters'])}**; "
         f"chapter-to-chapter overlaps: {rep['boundary_overlaps'] or 'none'}; Silero speech segments crossing a nominal boundary by more than 250 ms either side: {len(cross)}.",
         f"- VAD speech {cov['vad_speech_s']} s, of which {cov['unexplained_s']} s ({100 * cov['unexplained_share']:.2f} %) lies more than 400 ms from any aligned word "
         f"(narration not in the script, or noise taken for speech). Segments with >= 0.7 s unexplained: {len(big)}.", "",
         "| chapter | window | words | median conf | p10 conf | lead-in s | tail s | conf < 0.3 | VAD s unexplained |", "|---|---|---|---|---|---|---|---|---|"]
    for c in rep["chapters"]:
        L.append(f"| {c['chapter']} | {int(c['window_s'][0]) // 60}:{int(c['window_s'][0]) % 60:02d}-{int(c['window_s'][1]) // 60}:{int(c['window_s'][1]) % 60:02d} | {c['n_words']} | {c['median_conf']:.3f} | "
                 f"{c['p10_conf']:.3f} | {c['lead_in_s']:.2f} | {c['tail_s']:.2f} | {c['low_conf_words']} | {per_ch.get(c['chapter'], 0) / 1000:.1f} |")
    if big:
        L += ["", "Largest unexplained speech segments (start s, end s, unexplained s): " + "; ".join(f"{a / 1000:.1f}-{b / 1000:.1f} ({u / 1000:.1f})" for a, b, u in big[:12])]
    os.makedirs(C.p("reports", "audio"), exist_ok=True)
    with open(C.p("reports", "audio", "s1_alignment.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print(json.dumps({k: v for k, v in cov.items() if k not in ("segments_with_ge_0.7s_unexplained",)}))
    return 0
