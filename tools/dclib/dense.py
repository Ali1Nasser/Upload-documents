"""Dense side of retrieval: bge-m3 (data/models/bge-m3, CLS pooling, L2-normalised) vectors for chunks, stored float16.

`dc corpus index --dense` writes data/derived/vectors/plan.json (the chunk ids per shard are fixed at submit time) and queues one
job per shard; each worker checkpoints its vectors, so a killed job resumes. `dense_top` embeds the query (cached on disk) and
returns the best chunks over every shard that exists. Nothing here is required for BM25 search.
"""
import json
import os
import sys
import time

from . import common as C

VEC_DIR = C.p("data", "derived", "vectors")
MODEL_DIR = C.p("data", "models", "bge-m3")
PLAN = os.path.join(VEC_DIR, "plan.json")
QCACHE = os.path.join(VEC_DIR, "qcache.json")
MAX_LEN = 192
_state = {}


def _torch(threads=None):
    import torch
    if threads:
        torch.set_num_threads(threads)
    return torch


def load_model(threads=None):
    if "model" in _state:
        return _state["tok"], _state["model"]
    torch = _torch(threads or int(os.environ.get("DC_DENSE_THREADS", "2")))
    from transformers import AutoModel, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
    model = AutoModel.from_pretrained(MODEL_DIR, local_files_only=True, dtype=torch.float32).eval()
    _state["tok"], _state["model"] = tok, model
    return tok, model


def encode(texts, bs=8, max_len=MAX_LEN, threads=None):
    """float32 unit vectors, shape (n, 1024), in the order of `texts`."""
    import numpy as np
    torch = _torch()
    tok, model = load_model(threads)
    order = sorted(range(len(texts)), key=lambda i: len(texts[i]))
    out = np.zeros((len(texts), model.config.hidden_size), dtype=np.float32)
    with torch.inference_mode():
        for s in range(0, len(order), bs):
            idx = order[s:s + bs]
            b = tok([texts[i] for i in idx], padding=True, truncation=True, max_length=max_len, return_tensors="pt")
            h = model(**b).last_hidden_state[:, 0]
            h = torch.nn.functional.normalize(h, dim=-1)
            out[idx] = h.numpy()
    return out


def chunk_text(rec):
    return " > ".join(rec["heading_path"][-2:]) + "\n" + rec["text"][:1200]


# ------------------------------------------------------------------ plan / workers
CORE_FAMILIES = {"nblm-parts", "narration-scripts", "tts-chapter-texts", "reports-notes", "data-json-csv"}
CORE_MASTERS = ("master.md", "DA_Camp_00_Unified_Master_Full_Egyptian.md")


def subset(ix, all_chunks=False):
    """Chunk indices to embed, shortest first. Core = the 25 NotebookLM parts, narration scripts, TTS chapter texts, notes, JSON/CSV and the
    two canonical masters (~3.3k chunks, bge-m3 on CPU runs at about 1 chunk/s/thread). --dense-all adds the 3 near-duplicate big masters,
    subtitles and the 6k knowledge chunks (BM25 still covers them)."""
    import json as _j
    docs = {d["doc_id"]: d for d in C.read_jsonl(C.p("corpus", "text", "docs.jsonl"))}
    out = []
    with open(ix["_cp"], "rb") as f:
        for n, line in enumerate(f):
            rec = _j.loads(line)
            if rec.get("payload") or len(rec["text"]) < 40:
                continue
            path = docs.get(rec["doc_id"], {}).get("path", "")
            if all_chunks or rec["family"] in CORE_FAMILIES or (rec["family"] == "masters" and path.endswith(CORE_MASTERS)):
                out.append((n, len(rec["text"])))
    out.sort(key=lambda x: x[1])
    return [n for n, _ in out]


def submit(args, cp):
    from . import search as S
    ix = S.load_index()
    ids = subset(ix, getattr(args, "dense_all", False))
    shards = 2
    plan = {"v": 1, "model": "bge-m3", "max_len": MAX_LEN, "chunks_path": C.rel(cp), "chunks_size": os.path.getsize(cp), "n": len(ids),
            "shards": [ids[k::shards] for k in range(shards)], "created": C.now_iso()}
    old = C.read_json(PLAN)
    if old and old.get("chunks_size") == plan["chunks_size"] and old["n"] == plan["n"] and not args.force:
        plan = old
    else:
        for f in os.listdir(VEC_DIR) if os.path.isdir(VEC_DIR) else []:
            if f.startswith("vec_"):
                os.remove(os.path.join(VEC_DIR, f))
        C.write_json(PLAN, plan, indent=None)
    jobs = []
    from . import queue as Q
    for k in range(shards):
        done = os.path.exists(os.path.join(VEC_DIR, f"vec_{k}.npy"))
        if done:
            continue
        cmd = [sys.executable, "-I", C.p("tools", "dc.py"), "corpus", "index", "--worker", f"{k}/{shards}"]
        try:
            job = Q.submit(f"dense-{k}", cmd, mem_gb=3.5, expected_gb=0.2)
        except SystemExit as e:   # the queue guard refused (RAM promised to other queued jobs): say so, leave the plan in place
            print(f"corpus index --dense: shard {k} not queued (guard refused, exit {e.code}). plan.json is kept; "
                  f"re-run `dc corpus index --dense` when the queue backlog shrinks (BM25 search works without vectors).", file=sys.stderr)
            return 4
        jobs.append(job["tsp_id"])
    print(f"corpus index --dense: {plan['n']} chunks in {shards} shards; queued jobs {jobs or 'none (all shards done)'}")
    return 0


def worker(args):
    import numpy as np
    k, n = [int(x) for x in args.worker.split("/")]
    plan = C.read_json(PLAN)
    ids = plan["shards"][k]
    from . import search as S
    ix = S.load_index()
    part = os.path.join(VEC_DIR, f"vec_{k}.part.npy")
    done = np.load(part) if os.path.exists(part) else np.zeros((0, 1024), dtype=np.float16)
    start = len(done)
    t0 = time.time()
    load_model()
    print(f"dense shard {k}/{n}: {len(ids)} chunks, resume at {start}", flush=True)
    step = 128
    vecs = [done] if start else []
    for s in range(start, len(ids), step):
        recs = [S.read_chunk(ix, i) for i in ids[s:s + step]]
        v = encode([chunk_text(r) for r in recs]).astype(np.float16)
        vecs.append(v)
        np.save(part, np.concatenate(vecs))
        el = time.time() - t0
        print(f"  {min(s + step, len(ids))}/{len(ids)}  {(s + step - start) / max(el, 1e-9):.2f} chunks/s", flush=True)
    full = np.concatenate(vecs) if vecs else np.zeros((0, 1024), dtype=np.float16)
    np.save(os.path.join(VEC_DIR, f"vec_{k}.npy"), full)
    C.write_json(os.path.join(VEC_DIR, f"vec_{k}.json"), {"ids": ids, "model": "bge-m3", "plan_n": plan["n"]}, indent=None)
    if os.path.exists(part):
        os.remove(part)
    print(f"dense shard {k}: done {len(ids)} in {time.time() - t0:.0f}s")
    return 0


# ------------------------------------------------------------------ query side
def _load_vectors():
    import numpy as np
    if "V" in _state:
        return _state["V"], _state["ids"]
    if not os.path.isdir(VEC_DIR):
        return None, None
    vs, ids = [], []
    for f in sorted(os.listdir(VEC_DIR)):
        if f.startswith("vec_") and f.endswith(".npy") and not f.endswith(".part.npy"):
            meta = C.read_json(os.path.join(VEC_DIR, f[:-4] + ".json"))
            if not meta:
                continue
            vs.append(np.load(os.path.join(VEC_DIR, f)))
            ids += meta["ids"]
    if not vs:
        return None, None
    _state["V"], _state["ids"] = np.concatenate(vs).astype(np.float32), np.array(ids)
    return _state["V"], _state["ids"]


def query_vec(q):
    import numpy as np
    cache = C.read_json(QCACHE, {}) or {}
    if q in cache:
        return np.array(cache[q], dtype=np.float32)
    v = encode([q], bs=1)[0]
    cache[q] = [round(float(x), 5) for x in v]
    C.write_json(QCACHE, cache, indent=None)
    return v


def dense_top(query, ix, allowed=None, top=60):
    import numpy as np
    V, ids = _load_vectors()
    if V is None:
        return None
    sc = V @ query_vec(query)
    order = np.argsort(-sc)
    out = []
    for j in order:
        n = int(ids[j])
        if allowed is None or allowed(n):
            out.append((n, float(sc[j])))
            if len(out) >= top:
                break
    return out
