"""F1 stage A: joint MMS alignment (+ second aligner xlsr53-arabic) of each hole's new tokens with their existing neighbours.
Usage (venv, queued):  python -I holes_align.py   -> data/derived/f1/holes_align.json"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools")); sys.path.insert(0, HERE)
import numpy as np, torch, soundfile as sf
from dclib import align as AL, align2 as A2, common as C, audio as A
from holes_def import HOLES, RETIME, SUR
torch.set_num_threads(3)
_em, _words = {}, {}
def words(aid):
    if aid not in _words: _words[aid] = C.read_jsonl(os.path.join(ROOT, "corpus", "transcripts", A.fid(aid) + ".words.jsonl"))
    return _words[aid]
def emis(aid):
    if aid not in _em: _em[aid] = AL.emissions_cached(aid)
    return _em[aid]
def run(aid, toks, t0, t1, m2, v2):
    AL.vocab_uroman()
    em = emis(aid); f0 = int(t0 / AL.STRIDE); f1 = min(em.shape[0], int(t1 / AL.STRIDE))
    res = AL.forced_align_slice(torch.from_numpy(em[f0:f1].astype(np.float32)), [s for _, s in toks])
    out = []
    for r in res:
        if r is None: out.append(None); continue
        fs, fe, cf, sh = AL.word_span(r)
        out.append([int(round((f0 + fs) * AL.STRIDE * 1000)), int(round((f0 + fe) * AL.STRIDE * 1000)), round(cf, 3)])
    x, _ = sf.read(A.wav16_path(aid), start=int(t0 * 16000), frames=int((t1 - t0) * 16000), dtype="float32")
    r2 = A2.forced_align_w2v(A2.emissions_chunked(m2, x), [A2.to_vocab(s, v2)[0] for _, s in toks], v2)
    o2 = []
    for r in r2:
        if not r: o2.append(None); continue
        o2.append([int(round((t0 + r[0][0] * AL.STRIDE) * 1000)), int(round((t0 + r[-1][1] * AL.STRIDE) * 1000)), round(sum(c[2] for c in r) / len(r), 3)])
    return out, o2
if __name__ == "__main__":
    m2, v2 = A2.model(3)
    result = {}
    groups = {}
    for h in HOLES + [RETIME]:
        groups.setdefault((h["aid"], h["id"][:2] if h["id"].startswith("H5") else h["id"]), []).append(h)
    for (aid, gid), hs in groups.items():
        W = words(aid)
        h0 = hs[0]
        b0, b1 = h0["before"]; a0, a1 = h0["after"]
        before = W[b0:b1 + 1]; after = W[a0:a1 + 1]
        if "target" in h0:
            new = [(W[h0["target"]]["text"], h0["surrogate"])]
        else:
            new = [(t, SUR.get(t) or AL.spoken(t)) for h in hs for t in h["new"]]
        toks = [(w["text"], AL.spoken(w["text"])) for w in before] + new + [(w["text"], AL.spoken(w["text"])) for w in after]
        t0 = max(0, before[0]["start_ms"] / 1000 - 0.3); t1 = after[-1]["end_ms"] / 1000 + 0.3
        mm, w2 = run(aid, toks, t0, t1, m2, v2)
        nb = len(before); rows = []
        for k, (t, s) in enumerate(toks):
            if k < nb: old = before[k]
            elif k < nb + len(new): old = None
            else: old = after[k - nb - len(new)]
            rows.append(dict(text=t, sur=s, new=old is None, old=None if old is None else [old["word_id"], old["start_ms"], old["end_ms"], old["conf"]], mms=mm[k], w2v=w2[k]))
        result[gid] = dict(aid=aid, window=[round(t0, 3), round(t1, 3)], rows=rows)
        print("==", gid, aid, flush=True)
        for r in rows: print("  ", "NEW" if r["new"] else "   ", r["text"], r["old"], "mms", r["mms"], "w2v", r["w2v"], flush=True)
    json.dump(result, open(os.path.join(ROOT, "data", "derived", "f1", "holes_align.json"), "w"), ensure_ascii=False, indent=1)
