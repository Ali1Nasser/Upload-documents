"""`dc corpus maps` (P2.8): corpus/maps/ = hierarchy of short summaries, each <= 300 words, with paths and chunk ids.

corpus.md -> families/<family>.md -> docs/<doc>.md -> sections/<doc>-NN.md   (agents read these before they search)
Summaries are mechanical (heading titles + the first sentence of each section), so they cost no model calls and rebuild
byte-identically from corpus/text/chunks.jsonl + docs.jsonl.
"""
import json
import math
import os
import re
import shutil

from . import common as C
from . import distill
from . import manifest as M

MAPS = C.p("corpus", "maps")
MAX_WORDS = 300
SAFE = 285
FAMILY_NOTE = {
    "masters": "Whole-film masters and their variants (master.md, Unified Master, 28-min merged source, NotebookLM visual masters).",
    "nblm-parts": "The 25 NotebookLM part sources: scenes with on-screen text, animation, narration, numbers, terms, questions.",
    "narration-scripts": "Narration scripts: partA-F (per-chapter beats), Unified Narration, Claude narration, 28-min V2 narration.",
    "tts-chapter-texts": "Per-chapter TTS texts (CH-xx AR/EN), ElevenLabs packs, chaptered references, label sidecars.",
    "subtitles": "SRT / VTT / ASS caption files of earlier cuts (timestamps kept as [h:mm:ss]).",
    "data-json-csv": "JSON and CSV data: story.json, chapters.json, manifests, chapter timing.",
    "reports-notes": "Analyses, reports, manifests, READMEs and notes from earlier attempts.",
    "hub-knowledge": "DA_Camp_KNOWLEDGE.md (42 MB) via corpus/canon/knowledge_index.jsonl byte ranges; verbatim code payloads keep only their head.",
    "sidecar-txt": "Small text sidecars (licences, requirements, lists).",
    "other-docs": "Other markdown documents.",
}


def words(s):
    return len(s.split())


def fit(head, lines, tail=""):
    """Join head + lines + tail within SAFE words: shorten gists, then drop the last lines (the cut is announced)."""
    for gist_w in (14, 9, 5, 0):
        body = [l(gist_w) for l in lines]
        txt = head + "\n".join(body) + ("\n" + tail if tail else "")
        if words(txt) <= SAFE:
            return txt + "\n"
    keep = list(lines)
    while keep:
        keep.pop()
        body = [l(0) for l in keep]
        txt = head + "\n".join(body) + f"\n- ... {len(lines) - len(keep)} more entries; use `dc corpus search \"<q>\" --doc <doc_id>`\n" + tail
        if words(txt) <= SAFE:
            return txt
    return head


def gist_of(text, n):
    if n <= 0:
        return ""
    t = re.sub(r"```.*?```", " ", text, flags=re.S)
    t = re.sub(r"^\s*#{1,6}[^\n]*\n?", "", t.strip(), count=1)
    t = re.sub(r"[`*_>|#\[\]]|^\s*[-•]\s+|\bhttps?://\S+", " ", t, flags=re.M)
    t = re.sub(r"\s+", " ", t).strip()
    w = t.split()
    if not w:
        return ""
    g = " ".join(w[:n])
    return g + ("..." if len(w) > n else "")


def short(s, n=9):
    w = re.sub(r"[`*]", "", s).split()
    return " ".join(w[:n]) + ("..." if len(w) > n else "")


def cid_range(a, b):
    return a if a == b else f"{a}..{b[-5:]}"


def nodes_at(chunks, d):
    """Ordered nodes at heading depth d: [{key,title,first,last,gist_src}]."""
    out, idx = [], {}
    for c in chunks:
        key = tuple(c["hp"][:d])
        if key not in idx:
            idx[key] = len(out)
            out.append({"key": key, "title": key[-1], "first": c["id"], "last": c["id"], "src": c["text"], "n": 0})
        nd = out[idx[key]]
        nd["last"] = c["id"]
        nd["n"] += 1
    return out


def pick_depth(chunks):
    maxd = max(len(c["hp"]) for c in chunks)
    counts = {d: len({tuple(c["hp"][:d]) for c in chunks}) for d in range(1, maxd + 1)}
    ok = [d for d, n in counts.items() if 2 <= n <= 18]
    if ok:
        return max(ok), counts
    big = [d for d, n in counts.items() if n > 18]
    return (min(big), counts) if big else (1, counts)


def node_line(nd, ref=None):
    def f(gw):
        g = gist_of(nd["src"], gw)
        return (f"- **{short(nd['title'], 9)}** `{cid_range(nd['first'], nd['last'])}`" + (f" -> `maps/{ref}`" if ref else "")
                + (f": {g}" if g else ""))
    return f


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    assert words(text) <= MAX_WORDS, (path, words(text))
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def load():
    docs = {d["doc_id"]: d for d in C.read_jsonl(distill.DOCS)}
    per = {}
    kpart = {r["section_id"]: (r.get("part") or "0 · Preface") for r in C.read_jsonl(C.p("corpus", "canon", "knowledge_index.jsonl"))}
    with open(distill.chunks_path(), encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            hp = r["heading_path"]
            if r.get("section_id"):   # knowledge file: its own "N · name" part, then the section title
                hp = [kpart.get(r["section_id"], "0 · Preface"), hp[-1]]
            per.setdefault(r["doc_id"], []).append({"id": r["chunk_id"], "hp": hp, "text": r["text"][:600], "sec": r.get("section_id")})
    return docs, per


def _drill(doc, chunks, nodes, d, fid, base, files):
    """Section maps for the big nodes of a document map (>= 60 chunks): their children, at most 16 lines."""
    refs = {}
    for k, nd in enumerate(nodes, 1):
        if nd["n"] < 60:
            continue
        sub = [c for c in chunks if tuple(c["hp"][:d]) == nd["key"]]
        kids = nodes_at(sub, d + 1)
        if len(kids) < 2:
            continue
        if len(kids) > 16:   # equal consecutive groups
            per = math.ceil(len(kids) / 16)
            grp = []
            for i in range(0, len(kids), per):
                g = kids[i:i + per]
                grp.append({"title": f"{short(g[0]['title'], 5)} .. {short(g[-1]['title'], 5)}", "first": g[0]["first"], "last": g[-1]["last"],
                            "src": g[0]["src"], "n": sum(x["n"] for x in g)})
            kids = grp
        sp = f"sections/{fid}-p{k:02d}.md"
        sh = (f"# {short(nd['title'], 10)}\n\nDoc `{doc['doc_id']}` | up: `maps/{base}` | {nd['n']} chunks | "
              f"`data/extracted/{doc['path']}`\n\n")
        write(os.path.join(MAPS, sp), fit(sh, [node_line(x) for x in kids]))
        files.append(sp)
        refs[nd["key"]] = sp
    return refs


def doc_map(doc, chunks, files):
    fid = doc["doc_id"][2:]
    base = f"docs/{fid}.md"
    head = (f"# {short(doc['title'], 14)}\n\nDoc `{doc['doc_id']}` | family `{doc['family']}` | `data/extracted/{doc['path']}`  \n"
            f"{doc['chunks']} chunks, {doc['chars']:,} chars. Read a chunk with `dc corpus show <chunk_id>`; "
            f"search inside with `dc corpus search \"<q>\" --doc {doc['doc_id']}`.\n\n## Sections\n")
    d, counts = pick_depth(chunks)
    nodes = nodes_at(chunks, d)
    if len(nodes) <= 18:
        refs = _drill(doc, chunks, nodes, d, fid, base, files)
        write(os.path.join(MAPS, base), fit(head, [node_line(n, refs.get(n["key"])) for n in nodes]))
        files.append(base)
        return base
    size = max(16, math.ceil(len(nodes) / 16))
    lines = []
    for k in range(0, len(nodes), size):
        grp = nodes[k:k + size]
        sp = f"sections/{fid}-{k // size + 1:02d}.md"
        sh = (f"# {short(doc['title'], 8)}: sections {k + 1}-{k + len(grp)} of {len(nodes)}\n\nDoc `{doc['doc_id']}` | up: `maps/{base}` | "
              f"`data/extracted/{doc['path']}`\n\n")
        write(os.path.join(MAPS, sp), fit(sh, [node_line(n) for n in grp]))
        files.append(sp)
        lines.append((short(grp[0]["title"], 6), short(grp[-1]["title"], 6), sp, grp[0]["first"], grp[-1]["last"]))
    ls = [(lambda gw, t=t: f"- {t[0]} .. {t[1]} `{cid_range(t[3], t[4])}` -> `maps/{t[2]}`") for t in lines]
    write(os.path.join(MAPS, base), fit(head, ls))
    files.append(base)
    return base


def family_map(fam, docs, mapped, files):
    ds = sorted([d for d in docs if d["family"] == fam], key=lambda d: d["path"])
    chunks = sum(d["chunks"] for d in ds)
    head = (f"# Family: {fam}\n\n{FAMILY_NOTE.get(fam, '')}\n\n{len(ds)} documents, {chunks} chunks. Up: `maps/corpus.md`. "
            f"Filter searches with `--family {fam}`.\n\n## Documents\n")
    lines = []
    if len(ds) <= 22:
        for d in ds:
            ref = f" -> `maps/{mapped[d['doc_id']]}`" if d["doc_id"] in mapped else ""
            lines.append((lambda gw, d=d, ref=ref: f"- **{short(d['title'], 8)}** `{d['doc_id']}` {os.path.basename(d['path'])[:40]} ({d['chunks']} ch){ref}"))
    else:   # many small files: group by folder
        groups = {}
        for d in ds:
            groups.setdefault(os.path.dirname(d["path"]), []).append(d)
        for folder, g in sorted(groups.items()):
            tail = "/".join(folder.split("/")[-3:])
            lines.append((lambda gw, g=g, tail=tail: f"- `.../{tail}/` {len(g)} files, {sum(x['chunks'] for x in g)} chunks, e.g. "
                          f"{', '.join(os.path.basename(x['path'])[:28] for x in g[:2])} (ids {g[0]['doc_id']} ..)"))
    p = f"families/{fam}.md"
    write(os.path.join(MAPS, p), fit(head, lines))
    files.append(p)
    return p, len(ds), chunks


def root_map(fams, files):
    canon = C.p("corpus", "canon")

    def cnt(name):
        pth = os.path.join(canon, name)
        if not os.path.exists(pth):
            return "-"
        if name.endswith(".jsonl"):
            with open(pth, "rb") as f:
                return str(sum(1 for _ in f))
        return "json"
    vis = C.p("corpus", "visual", "assets.jsonl")
    nvis = sum(1 for _ in open(vis, "rb")) if os.path.exists(vis) else 0
    head = ("# DA Camp corpus map\n\nStart here, then open one family, then one document, then search. Never load `DA_Camp_KNOWLEDGE.md` or a whole master.\n\n"
            "## Text families (corpus/text/chunks.jsonl)\n")
    lines = [(lambda gw, f=f, nd=nd, nc=nc: f"- **{f}** {nd} docs, {nc} ch -> `maps/families/{f}.md`") for f, nd, nc in fams]
    tail = (f"\n## Other stores\n- Canon: `corpus/canon/` chapters, data_contract, glossary, patterns, nblm_scenes ({cnt('nblm_scenes.jsonl')}), "
            f"crash_course_steps ({cnt('crash_course_steps.jsonl')}), hub_items ({cnt('hub_items.jsonl')}), legacy_shots ({cnt('legacy_shots.jsonl')}).\n"
            f"- Visual: `corpus/visual/assets.jsonl` ({nvis} captioned assets).\n- Transcripts: `corpus/transcripts/`; audio facts: `corpus/audio/`.\n"
            "\n## Commands\n`dc corpus search \"<q>\" --k 8 --lang ar,en [--family F] [--doc ID]`; `dc corpus show <chunk_id>`.\n")
    write(os.path.join(MAPS, "corpus.md"), fit(head, lines, tail))
    files.append("corpus.md")


def cmd_maps(args):
    cp = distill.chunks_path()
    if cp is None:
        C.fail("no chunks yet: run `dc corpus distill`")
    inputs = [{"path": C.rel(cp), "sha256": C.sha256_file(cp)}, {"path": C.rel(distill.DOCS), "sha256": C.sha256_file(distill.DOCS)}]
    first = os.path.join(MAPS, "corpus.md")
    if os.path.exists(first) and M.should_skip(MAPS, "maps", inputs, [C.rel(first)], args.force):
        print("corpus maps: up to date")
        return 0
    docs, per = load()
    for sub in ("families", "docs", "sections"):
        shutil.rmtree(os.path.join(MAPS, sub), ignore_errors=True)
    files, mapped = [], {}
    for did, d in sorted(docs.items(), key=lambda x: x[1]["path"]):
        ch = per.get(did, [])
        if d["chunks"] >= 3 and ch:
            mapped[did] = doc_map(d, ch, files)
    fams = []
    dl = list(docs.values())
    for fam in sorted({d["family"] for d in dl}):
        _, nd, nc = family_map(fam, dl, mapped, files)
        fams.append((fam, nd, nc))
    root_map(fams, files)
    wmax = max(words(open(os.path.join(MAPS, f), encoding="utf-8").read()) for f in files)
    M.write(MAPS, "maps", "dc corpus maps", inputs, ["corpus/maps/corpus.md"],
            extra={"files": len(files), "docs_mapped": len(mapped), "max_words": wmax, "limit": MAX_WORDS})
    print(f"corpus maps: {len(files)} files ({len(mapped)} documents mapped), longest {wmax} words (limit {MAX_WORDS}) -> {C.rel(MAPS)}")
    return 0
