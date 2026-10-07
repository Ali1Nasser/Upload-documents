"""Word-level CTC forced alignment with the MMS 300m-1130 aligner (HF weights) + uroman + torchaudio forced_align.
Replacement for the GitHub-only MahmoudAshraf ctc-forced-aligner (github blocked); PyPI 'ctc-forced-aligner' is a
different (ONNX/MMS_FA) package whose weights come from blocked/other hosts.
API: align_words(wav_path_or_array, words, language="ara") -> [{"word","start","end","score"}]
Words are the ORIGINAL strings; romanization is internal. Words that romanize to nothing get zero-length spans."""
import json, re, unicodedata
from functools import lru_cache
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "data" / "models" / "mms-300m-1130-forced-aligner"
STRIDE_S = 320 / 16000  # wav2vec2 20 ms frames
_TASHKEEL = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")

@lru_cache(maxsize=1)
def _load(threads=3):
    import torch
    from transformers import AutoModelForCTC
    import uroman
    torch.set_num_threads(threads)
    model = AutoModelForCTC.from_pretrained(str(MODEL_DIR), dtype=torch.float32).eval()
    vocab = json.loads((MODEL_DIR / "vocab.json").read_text())
    return model, vocab, uroman.Uroman()

def emissions(wav, window_s=30, context_s=2, batch_size=4):
    """wav: float32 mono 16 kHz numpy. Returns log-prob [T, V] (20 ms frames)."""
    import torch
    model, _, _ = _load()
    sr = 16000
    x = (wav - wav.mean()) / (wav.std() + 1e-7)
    W, C = window_s * sr, context_s * sr
    pad = np.pad(x, (C, C + (-len(x)) % W))
    chunks = [pad[i:i + W + 2 * C] for i in range(0, len(pad) - 2 * C, W)]
    outs = []
    with torch.inference_mode():
        for i in range(0, len(chunks), batch_size):
            b = torch.from_numpy(np.stack(chunks[i:i + batch_size])).float()
            lg = model(b).logits
            lg = lg[:, int(C / sr / STRIDE_S):-int(C / sr / STRIDE_S) or None]
            outs.append(torch.log_softmax(lg, -1).reshape(-1, lg.shape[-1]))
    em = torch.cat(outs)[: int(np.ceil(len(x) / sr / STRIDE_S))]
    return em

def _romanize(word, u, lang):
    w = _TASHKEEL.sub("", unicodedata.normalize("NFKC", word))
    r = u.romanize_string(w, lcode=lang).lower()
    return re.sub(r"[^a-z']", "", r)

def align_words(wav, words, language="ara"):
    import torch, torchaudio.functional as F
    model, vocab, u = _load()
    if isinstance(wav, (str, Path)):
        import soundfile as sf
        wav, sr = sf.read(str(wav), dtype="float32")
        assert sr == 16000 and wav.ndim == 1, "expect 16 kHz mono"
    em = emissions(wav)
    rom = [_romanize(w, u, language) for w in words]
    toks, owner = [], []
    for i, r in enumerate(rom):
        for ch in r:
            toks.append(vocab[ch]); owner.append(i)
    if not toks: raise ValueError("no alignable text")
    if len(toks) > em.shape[0]: raise ValueError(f"text longer than audio frames: {len(toks)} > {em.shape[0]}")
    ali, sc = F.forced_align(em[None], torch.tensor([toks], dtype=torch.int32), blank=0)
    ali, sc = ali[0].numpy(), sc[0].exp().numpy()
    # collapse path into per-token frame spans
    spans, k = [], -1
    prev = 0
    for f, a in enumerate(ali):
        if a != 0 and (a != prev):
            k += 1; spans.append([f, f + 1, [sc[f]]])
        elif a != 0 and spans:
            spans[-1][1] = f + 1; spans[-1][2].append(sc[f])
        prev = a
    # repeated identical tokens separated by blank start a new span via a!=prev (blank resets prev); same-token adjacency without blank cannot occur in CTC
    if len(spans) != len(toks): raise RuntimeError(f"span/token mismatch {len(spans)} vs {len(toks)}")
    out = [{"word": w, "start": None, "end": None, "score": 0.0} for w in words]
    for (s, e, scs), o in zip(spans, owner):
        d = out[o]
        d["start"] = s * STRIDE_S if d["start"] is None else d["start"]
        d["end"] = e * STRIDE_S
        d["score"] = d["score"] + float(np.mean(scs))
    cnt = {}
    for o in owner: cnt[o] = cnt.get(o, 0) + 1
    for i, d in enumerate(out):
        if i in cnt: d["score"] = round(d["score"] / cnt[i], 4)
        d["start"] = None if d["start"] is None else round(d["start"], 3)
        d["end"] = None if d["end"] is None else round(d["end"], 3)
    return out
