"""`dc corpus index|search|smoke` (P2.1 / 02 section 7 tier L4): hybrid retrieval over corpus/text/chunks.jsonl.

BM25 is pure Python (stdlib + array): inverted index pickled under data/derived/index/. Arabic is searched on the folded `norm`
field with a light prefix stemmer (ال / وال / بال / لل ...), Latin with a plural stemmer, so 'الـgrain' finds 'grain', 'doubles' finds 'double'.
Dense (optional): bge-m3 CLS embeddings (data/models/bge-m3) in data/derived/vectors/, encoded through the queue (`dc corpus index --dense`).
Hybrid = reciprocal-rank fusion of BM25 top-60 and dense top-60, plus a phrase bonus (adjacent query words found in the chunk).
Every hit carries a citation: chunk_id, doc_id, repo path, heading path, char_span (and K-section + byte span for the knowledge file).
"""
import array
import json
import math
import os
import pickle
import re
import sys
import time

from . import common as C
from . import distill
from . import manifest as M
from . import textnorm

INDEX_DIR = C.p("data", "derived", "index")
INDEX = os.path.join(INDEX_DIR, "bm25.pkl")
VEC_DIR = C.p("data", "derived", "vectors")
K1, B = 1.2, 0.75
AR_RX = re.compile("[؀-ۿ]")
AR_PREFIXES = ("وال", "بال", "كال", "فال", "لل", "ال")
EN_STOP = set("a an the of in on at to and or is are was were be been it its this that these those for with as by from how what why when "
              "which who does do did vs versus into than then so if not no yes can will".split())
AR_STOP = set("ال في من علي عن الي و ده دي دا هو هي ما لا او ان يعني كده".split())


# ------------------------------------------------------------------ tokenisation
def stem(t):
    if AR_RX.search(t):
        for p in AR_PREFIXES:
            if t.startswith(p) and len(t) - len(p) >= 3:
                return t[len(p):]
        return t
    if len(t) > 4:
        if t.endswith("ies"):
            return t[:-3] + "y"
        if t.endswith("sses"):
            return t[:-2]
        if t.endswith("s") and not t.endswith(("ss", "us", "is")):
            return t[:-1]
    return t


def doc_tokens(norm, heading):
    toks = [stem(t) for t in norm.split()]
    toks += [stem(t) for t in textnorm.fold(" ".join(heading)).split()]
    return toks


def query_tokens(q):
    out = []
    for t in textnorm.fold(q).split():
        if t in EN_STOP or t in AR_STOP:
            continue
        s = stem(t)
        if s not in out:
            out.append(s)
    return out


# ------------------------------------------------------------------ index build / load
def _lang_code(rec):
    return 2 if rec.get("lang_mix") else (0 if rec["lang"] == "ar-EG" else 1)   # 0 ar, 1 en, 2 mixed


def build_index(chunks_path):
    t0 = time.time()
    post, dl, offs, ids, lang, fam, doc = {}, array.array("H"), array.array("Q"), [], array.array("B"), array.array("H"), array.array("I")
    fams, docs = {}, {}
    pos = 0
    with open(chunks_path, "rb") as f:
        for n, line in enumerate(f):
            rec = json.loads(line)
            offs.append(pos)
            pos += len(line)
            toks = doc_tokens(rec["norm"], rec["heading_path"])
            dl.append(min(len(toks), 65535))
            ids.append(rec["chunk_id"])
            lang.append(_lang_code(rec))
            fam.append(fams.setdefault(rec["family"], len(fams)))
            doc.append(docs.setdefault(rec["doc_id"], len(docs)))
            tf = {}
            for t in toks:
                tf[t] = tf.get(t, 0) + 1
            for t, c in tf.items():
                e = post.get(t)
                if e is None:
                    e = post[t] = (array.array("I"), array.array("H"))
                e[0].append(n)
                e[1].append(min(c, 65535))
    N = len(ids)
    ix = {"v": 1, "n": N, "avgdl": sum(dl) / max(1, N), "dl": dl, "post": post, "offs": offs, "ids": ids, "lang": lang, "fam": fam, "doc": doc,
          "families": sorted(fams, key=fams.get), "docs": sorted(docs, key=docs.get), "chunks_path": C.rel(chunks_path),
          "chunks_size": os.path.getsize(chunks_path), "terms": len(post), "built": C.now_iso()}
    os.makedirs(INDEX_DIR, exist_ok=True)
    with open(INDEX + ".tmp", "wb") as f:
        pickle.dump(ix, f, protocol=5)
    os.replace(INDEX + ".tmp", INDEX)
    print(f"corpus index: {N} chunks, {len(post)} terms, avgdl {ix['avgdl']:.0f}, {os.path.getsize(INDEX) / 1e6:.0f} MB, {time.time() - t0:.0f}s -> {C.rel(INDEX)}")
    return ix


def load_index(auto=True):
    cp = distill.chunks_path()
    if cp is None:
        C.fail("no chunks yet: run `dc corpus distill`")
    ix = None
    if os.path.exists(INDEX):
        with open(INDEX, "rb") as f:
            ix = pickle.load(f)
        if ix.get("chunks_size") != os.path.getsize(cp) or ix.get("chunks_path") != C.rel(cp):
            ix = None
    if ix is None:
        if not auto:
            C.fail("index is stale: run `dc corpus index`")
        print("(building BM25 index, one-off)", file=sys.stderr)
        ix = build_index(cp)
    ix["_cp"] = cp
    return ix


def _docs():
    return {d["doc_id"]: d for d in C.read_jsonl(distill.DOCS)} if os.path.exists(distill.DOCS) else {}


def read_chunk(ix, n):
    with open(ix["_cp"], "rb") as f:
        f.seek(ix["offs"][n])
        return json.loads(f.readline())


# ------------------------------------------------------------------ scoring
def bm25(ix, qt, allowed=None, top=100):
    N, avg, dl, post = ix["n"], ix["avgdl"], ix["dl"], ix["post"]
    sc = {}
    for t in qt:
        e = post.get(t)
        if not e:
            continue
        df = len(e[0])
        idf = math.log(1 + (N - df + 0.5) / (df + 0.5))
        for d, tf in zip(e[0], e[1]):
            if allowed is not None and not allowed(d):
                continue
            sc[d] = sc.get(d, 0.0) + idf * tf * (K1 + 1) / (tf + K1 * (1 - B + B * dl[d] / avg))
    return sorted(sc.items(), key=lambda x: -x[1])[:top]


def _phrase_frac(qwords, norm):
    if len(qwords) < 2:
        return 0.0
    hit = sum(1 for a, b in zip(qwords, qwords[1:]) if f"{a} {b}" in norm)
    return hit / (len(qwords) - 1)


def _snippet(text, qt_raw, width=320):
    low = text.lower()
    pos = -1
    for t in qt_raw:
        i = low.find(t)
        if i >= 0 and (pos < 0 or i < pos):
            pos = i
    if pos < 0:
        pos = 0
    a = max(0, pos - width // 4)
    s = text[a:a + width].replace("\n", " ")
    return ("..." if a else "") + s + ("..." if a + width < len(text) else "")


def search(query, k=8, langs=("ar", "en"), family=None, doc=None, dense=True, ix=None, with_text=False):
    ix = ix or load_index()
    docs = _docs()
    qt = query_tokens(query)
    fam_i = ix["families"].index(family) if family in ix["families"] else (-1 if family else None)
    doc_set = None
    if doc:
        doc_set = {i for i, d in enumerate(ix["docs"]) if d == doc or doc.lower() in docs.get(d, {}).get("path", "").lower()}
    want = set()
    for l in langs:
        if l.startswith("ar"):
            want |= {0, 2}
        elif l.startswith("en"):
            want |= {1, 2}
    langs_all = want >= {0, 1, 2}

    def allowed(n):
        if not langs_all and ix["lang"][n] not in want:
            return False
        if fam_i is not None and ix["fam"][n] != fam_i:
            return False
        if doc_set is not None and ix["doc"][n] not in doc_set:
            return False
        return True

    filtered = not langs_all or fam_i is not None or doc_set is not None
    bm = bm25(ix, qt, allowed if filtered else None, top=100)
    fused = {n: 1.0 / (60 + r) for r, (n, _) in enumerate(bm[:60])}
    bm_rank = {n: r for r, (n, _) in enumerate(bm)}
    used_dense = False
    dense_rank = {}
    if dense:
        try:
            from . import dense as D
            hits = D.dense_top(query, ix, allowed if filtered else None, top=60)
        except Exception as e:  # noqa: BLE001  dense is optional
            hits = None
            print(f"(dense unavailable: {type(e).__name__}: {e})", file=sys.stderr)
        if hits:
            used_dense = True
            for r, (n, _) in enumerate(hits):
                fused[n] = fused.get(n, 0.0) + 1.0 / (60 + r)
                dense_rank[n] = r
    qwords = textnorm.fold(query).split()
    qwords = [w for w in qwords if w not in EN_STOP and w not in AR_STOP]
    cand = sorted(fused, key=lambda n: -fused[n])[:60]
    scored = []
    for n in cand:
        rec = read_chunk(ix, n)
        bonus = 1.0 + 0.5 * _phrase_frac(qwords, rec["norm"])
        scored.append((fused[n] * bonus, n, rec))
    scored.sort(key=lambda x: -x[0])
    out, per_doc = [], {}
    raw_terms = [w for w in textnorm.fold(query).split() if w not in EN_STOP and w not in AR_STOP]
    for s, n, rec in scored:
        if per_doc.get(rec["doc_id"], 0) >= 2:   # diversity: at most two hits per document
            continue
        per_doc[rec["doc_id"]] = per_doc.get(rec["doc_id"], 0) + 1
        d = docs.get(rec["doc_id"], {})
        hit = {"rank": len(out) + 1, "score": round(s * 1000, 2), "chunk_id": rec["chunk_id"], "doc_id": rec["doc_id"], "path": d.get("path", ""),
               "family": rec["family"], "heading_path": rec["heading_path"], "lang": rec["lang"], "char_span": rec["char_span"],
               "bm25_rank": bm_rank.get(n), "dense_rank": dense_rank.get(n), "snippet": _snippet(rec["text"], raw_terms)}
        if rec.get("section_id"):
            hit["section_id"] = rec["section_id"]
            hit["byte_span"] = rec["byte_span"]
        if with_text:
            hit["text"] = rec["text"]
        out.append(hit)
        if len(out) >= k:
            break
    return out, {"query_tokens": qt, "dense": used_dense, "candidates": len(bm)}


def cite(h):
    base = os.path.basename(h["path"]) or h["doc_id"]
    sec = f" {h['section_id']}" if h.get("section_id") else ""
    return f"[{h['chunk_id']}{sec}] {base} > {' > '.join(h['heading_path'][-3:])}"


# ------------------------------------------------------------------ commands
def cmd_index(args):
    cp = distill.chunks_path()
    if cp is None:
        C.fail("no chunks yet: run `dc corpus distill`")
    if args.worker:
        from . import dense as D
        return D.worker(args)
    stale = True
    if os.path.exists(INDEX) and not args.force:
        with open(INDEX, "rb") as f:
            ix = pickle.load(f)
        stale = ix.get("chunks_size") != os.path.getsize(cp) or ix.get("chunks_path") != C.rel(cp)
    if stale or args.force:
        build_index(cp)
        M.write(INDEX_DIR, "bm25", "dc corpus index", [{"path": C.rel(cp), "sha256": C.sha256_file(cp)}], [C.rel(INDEX)])
    else:
        print("corpus index: BM25 up to date")
    if args.dense or args.dense_all:
        from . import dense as D
        return D.submit(args, cp)
    return 0


def cmd_search(args):
    langs = [x.strip() for x in args.lang.split(",") if x.strip()]
    hits, info = search(args.query, args.k, langs, args.family, args.doc, dense=not args.no_dense, with_text=args.full or args.json)
    if args.json:
        print(json.dumps({"query": args.query, **info, "hits": hits}, ensure_ascii=False, indent=1))
        return 0
    print(f"query {args.query!r}  tokens {info['query_tokens']}  mode {'hybrid bm25+bge-m3' if info['dense'] else 'bm25'}")
    for h in hits:
        print(f"{h['rank']:>2}. {h['score']:7.2f}  {cite(h)}")
        print(f"      {h['family']} | {h['path']} | chars {h['char_span'][0]}-{h['char_span'][1]}" + (f" | bytes {h['byte_span'][0]}-{h['byte_span'][1]}" if h.get("byte_span") else ""))
        print(f"      {h['snippet'] if not args.full else h['text']}")
    if not hits:
        print("no results")
    return 0


# Smoke queries. Expectation fixed from the sources, not from the ranking: a top-3 hit must come from a teaching source (the
# masters, the 25 NotebookLM parts, the narration scripts or the knowledge base) AND its chunk must contain the required term.
# `specific` names the single most precise source (the NotebookLM part of that topic); its best rank within the top 10 is reported
# as extra information.
TEACH = (r"master\.md|Unified_Master|Merged_Video_Master|Visual_Video_Master|DA_Camp_Part_\d\d_of_25|part[A-F]\.md|KNOWLEDGE|"
         r"Unified_Narration|Narration_Script|Narration_Egyptian")
SMOKE = [
    ("fan-out SUM doubles", ["fan"], r"Part_09_of_25"),
    ("consumer lag", ["lag"], r"Part_19_of_25"),
    ("الـgrain", ["grain"], r"Part_16_of_25|Part_08_of_25|Part_11_of_25"),
    ("idempotency retry duplicates", ["idempot"], r"Part_15_of_25"),
    ("k-anonymity", ["anonym"], r"Part_20_of_25|Part_13_of_25"),
    ("six receipts NilePay", ["nilepay"], r"Part_01_of_25|master\.md|Unified_Master"),
    ("attention Q K V", ["attention"], r"Part_22_of_25"),
    ("docker layer cache", ["docker"], r"Part_24_of_25"),
    ("RPO RTO", ["rpo"], r"Part_20_of_25"),
    ("B-tree 3 page reads", ["tree"], r"Part_10_of_25"),
]


def cmd_smoke(args):
    ix = load_index()
    rows, ok = [], 0
    for q, must, specific in SMOKE:
        hits, info = search(q, 10, dense=not args.no_dense, ix=ix, with_text=True)
        found = None
        for h in hits[:3]:
            if re.search(TEACH, h["path"]) and all(m in textnorm.fold(h["text"]) for m in must):
                found = h["rank"]
                break
        spec = next((h["rank"] for h in hits if re.search(specific, h["path"]) and all(m in textnorm.fold(h["text"]) for m in must)), None)
        ok += found is not None
        rows.append((q, must, specific, found, spec, hits[:3], info))
    mode = "hybrid BM25 + bge-m3" if any(r[6]["dense"] for r in rows) else "BM25 only (dense vectors not built)"
    L = ["# Retrieval smoke test", "", f"Created {C.now_iso()} by `dc corpus smoke`. Mode: {mode}. Chunks: {ix['n']}. Index terms: {ix['terms']}.", "",
         f"Result: **{ok}/{len(SMOKE)}** queries return an expected source in the top 3.", "",
         "A query passes when one of its top-3 chunks comes from a teaching source (regex below) and its text contains the required term. "
         "The expectation was fixed from the sources, not from the ranking. The column `specific part` is extra information: "
         "the best rank (top 10) of the single most precise source for the topic.", "",
         f"Teaching-source regex: `{TEACH.replace('|', ' or ')}`", "",
         "| # | query | required term | rank (top 3) | specific part | specific rank | top-3 |", "|---|---|---|---|---|---|---|"]
    for i, (q, must, specific, found, spec, hits, info) in enumerate(rows, 1):
        top = "<br>".join(f"{h['rank']}. {os.path.basename(h['path'])[:44]} > {h['heading_path'][-1][:36]}" for h in hits)
        L.append(f"| {i} | `{q}` | {', '.join(must)} | {found or 'MISS'} | {specific.replace('|', ' or ')} | {spec or '-'} | {top} |")
    path = C.p("reports", "retrieval_smoke.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    C.write_json(C.p("reports", "retrieval_smoke.json"), {"created": C.now_iso(), "mode": mode, "passed": ok, "total": len(SMOKE),
                                                          "cases": [{"query": r[0], "rank": r[3], "specific_rank": r[4]} for r in rows]})
    print(f"retrieval smoke: {ok}/{len(SMOKE)} in top 3 ({mode}) -> reports/retrieval_smoke.md")
    for r in rows:
        print(f"  {'ok  ' if r[3] else 'MISS'} {r[0]!r} rank {r[3]}  specific-part rank {r[4]}")
    return 0 if ok == len(SMOKE) else 1


def cmd_show(args):
    """Print chunks by id: `f:abc123def456#00012`, a range `f:abc123def456#00012-00015`, or a knowledge section `K01384`."""
    ref = args.ref
    if re.fullmatch(r"K\d{5}", ref):
        from . import hub
        sec = next((r for r in C.read_jsonl(C.p("corpus", "canon", "knowledge_index.jsonl")) if r["section_id"] == ref), None)
        if not sec:
            C.fail(f"unknown knowledge section {ref}", 2)
        txt = hub.read_span(sec)
        print(f"[{ref}] {' > '.join(sec['heading_path'])}  bytes {sec['byte_start']}-{sec['byte_end']} ({len(txt):,} chars)")
        print(txt[:args.max_chars] + ("\n... (cut; raise --max-chars)" if len(txt) > args.max_chars else ""))
        return 0
    m = re.fullmatch(r"(f:[0-9a-f]{12})#(\d{5})(?:-(\d{5}))?", ref)
    if not m:
        C.fail("usage: dc corpus show f:<doc>#NNNNN[-NNNNN] | K#####", 2)
    ix = load_index()
    a, b = int(m.group(2)), int(m.group(3) or m.group(2))
    ids = {cid: n for n, cid in enumerate(ix["ids"])}
    docs = _docs()
    for k in range(a, b + 1):
        cid = f"{m.group(1)}#{k:05d}"
        if cid not in ids:
            C.fail(f"no such chunk {cid}", 2)
        rec = read_chunk(ix, ids[cid])
        d = docs.get(rec["doc_id"], {})
        print(f"[{cid}] {d.get('path', '')} > {' > '.join(rec['heading_path'])}  chars {rec['char_span'][0]}-{rec['char_span'][1]}")
        print(rec["text"][:args.max_chars])
        print()
    return 0
