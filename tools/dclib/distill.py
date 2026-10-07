"""`dc corpus distill` (P2.1): every unique md/txt/json/csv/srt/vtt/ass text source -> heading-chunked corpus/text/chunks.jsonl.

Sources: corpus/catalog/files.jsonl (canonical path of each unique sha), minus quarantine, logs and secrets patterns;
DA_Camp_KNOWLEDGE.md is read through corpus/canon/knowledge_index.jsonl byte ranges (never loaded whole).

Chunk record (schema chunk): chunk_id `<doc_id>#NNNNN`, doc_id (`f:<sha1-12>`), heading_path, lang (`ar-EG`|`en`), lang_mix,
text (original, NFC, LF), norm (search-folded copy, see textnorm.fold), char_span [a,b] in the normalised document text
(JSON: in the rendered text), family; knowledge chunks add section_id + byte_span; payload sections (verbatim code/JSON dumps
embedded in the knowledge file) keep only their first chunks and say so (`payload`, `section_chars`).
Docs catalogue: corpus/text/docs.jsonl (one line per document with family, title, chunk count).
"""
import csv
import io
import json
import os
import re
import unicodedata

from . import common as C
from . import manifest as M
from . import textnorm

OUT_DIR = C.p("corpus", "text")
DERIVED_DIR = C.p("data", "derived", "text")
CHUNKS_CORPUS = os.path.join(OUT_DIR, "chunks.jsonl")
CHUNKS_DERIVED = os.path.join(DERIVED_DIR, "chunks.jsonl")
DOCS = os.path.join(OUT_DIR, "docs.jsonl")
FILES = C.p("corpus", "catalog", "files.jsonl")
KIDX = C.p("corpus", "canon", "knowledge_index.jsonl")
EXTRACTED = C.p("data", "extracted")
KNOW_NAME = "DA_Camp_KNOWLEDGE.md"

TARGET = 1500          # chars per chunk
HARD = 2200            # a paragraph longer than this is split
EXTS = {"md", "txt", "json", "csv", "srt", "vtt", "ass"}
SKIP_RX = re.compile(r"(^|/)(\.ssh|known_hosts|\.sudo_as_admin_successful)(/|$)|id_ed25519|id_rsa|\.pem$|\.key$", re.I)
PAYLOAD_KEEP = 3       # chunks kept from a verbatim payload section
HEAD_RX = re.compile(r"^(#{1,6})[ \t]+(.+?)[ \t#]*$")
FENCE_RX = re.compile(r"^\s{0,3}(```|~~~)")
AR_RX = re.compile("[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
LAT_RX = re.compile("[A-Za-z]")


# ------------------------------------------------------------------ helpers
def clean(s):
    s = s.replace("\r\n", "\n").replace("\r", "\n").replace("﻿", "")
    return unicodedata.normalize("NFC", s)


def lang_of(text):
    ar, la = len(AR_RX.findall(text)), len(LAT_RX.findall(text))
    if ar + la == 0:
        return "en", False
    share = ar / (ar + la)
    return ("ar-EG" if share >= 0.3 else "en"), 0.1 <= share <= 0.9   # Egyptian prose carries many Latin tech terms


def family_of(canon, ext):
    b = os.path.basename(canon)
    low = canon.lower()
    if b == KNOW_NAME:
        return "hub-knowledge"
    if re.search(r"DA_Camp_Part_\d\d_of_25", b):
        return "nblm-parts"
    if ext in ("srt", "vtt", "ass"):
        return "subtitles"
    if ext in ("json", "csv"):
        return "data-json-csv"
    if re.search(r"(master\.md|Unified_Master|Master_Source|Visual_Video_Master)", b, re.I):
        return "masters"
    if re.search(r"narration|partA|partB|partC|partD|partE|partF", b, re.I):
        return "narration-scripts"
    if ext == "txt" and re.search(r"(CH-\d\d|ElevenLab|Chaptered|tts/)", canon):
        return "tts-chapter-texts"
    if ext == "txt":
        return "sidecar-txt"
    if re.search(r"(Artifact_Analysis|SPACE|REPORT|STATE|MANIFEST|README|DELIVERY|Integration|Reconciliation|Verification|SOURCES|inventory|START_HERE|FONTS|SUPERCSET)", b, re.I):
        return "reports-notes"
    return "other-docs"


def _split_hard(text, start):
    """Spans (start,end) of pieces <= ~1800 chars from one over-long block; prefer line, then space boundaries."""
    out, i, n = [], 0, len(text)
    while i < n:
        j = min(n, i + 1800)
        if j < n:
            k = text.rfind("\n", i + 600, j)
            if k < 0:
                k = text.rfind(" ", i + 900, j)
            if k > 0:
                j = k + 1
        out.append((start + i, start + j))
        i = j
    return out


def blocks_of(text, base=0):
    """Paragraph/fence blocks of a markdown body: [(start,end)] absolute (base added). Fences stay atomic unless huge."""
    spans, pos, cur_s, in_fence = [], 0, None, False
    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        if FENCE_RX.match(line):
            in_fence = not in_fence
            if cur_s is None:
                cur_s = pos
        elif not in_fence and not stripped:
            if cur_s is not None:
                spans.append((cur_s, pos))
                cur_s = None
        elif cur_s is None:
            cur_s = pos
        pos += len(line)
    if cur_s is not None:
        spans.append((cur_s, pos))
    out = []
    for a, b in spans:
        if b - a > HARD:
            out += [(base + x, base + y) for x, y in _split_hard(text[a:b], a)]
        else:
            out.append((base + a, base + b))
    return out


def pack(doc, blocks):
    """Greedy packing of block spans into (a,b) chunk spans of about TARGET chars. blocks absolute in `doc`."""
    chunks, cur = [], None
    for a, b in blocks:
        if cur is None:
            cur = [a, b]
        elif b - cur[0] > TARGET:
            chunks.append(tuple(cur))
            cur = [a, b]
        else:
            cur[1] = b
    if cur is not None:
        chunks.append(tuple(cur))
    if len(chunks) > 1 and chunks[-1][1] - chunks[-1][0] < 250:   # no tiny tail
        a, _ = chunks[-2]
        chunks[-2:] = [(a, chunks[-1][1])]
    return chunks


# ------------------------------------------------------------------ per-format chunkers (yield (heading_path, text, (a,b), extra))
def chunk_md(doc, title):
    heads, stack, fence = [], [], False
    pos = 0
    for line in doc.splitlines(keepends=True):
        if FENCE_RX.match(line):
            fence = not fence
        m = None if fence else HEAD_RX.match(line.rstrip("\n"))
        if m:
            lvl = len(m.group(1))
            stack = [(l, t) for l, t in stack if l < lvl] + [(lvl, m.group(2).strip())]
            heads.append((pos, [t for _, t in stack]))
        pos += len(line)
    if not heads or heads[0][0] > 0:
        heads.insert(0, (0, [title]))
    carry = None
    for i, (start, path) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else len(doc)
        body = doc[start:end]
        if not body.strip():
            continue
        if len(body.strip()) < 120 and i + 1 < len(heads):   # heading-only / tiny section: fold into the next one
            carry = start if carry is None else carry
            continue
        if carry is not None:
            start, body, carry = carry, doc[carry:end], None
        for a, b in pack(doc, blocks_of(body, start)):
            t = doc[a:b].strip()
            if t:
                yield path, t, (a, b), {}


def _render_json(x, prefix, out):
    if isinstance(x, dict):
        for k, v in x.items():
            _render_json(v, f"{prefix}.{k}" if prefix else str(k), out)
    elif isinstance(x, list):
        if all(not isinstance(v, (dict, list)) for v in x):
            out.append(f"{prefix}: " + "; ".join(str(v) for v in x))
        else:
            for i, v in enumerate(x):
                _render_json(v, f"{prefix}[{i}]", out)
    elif x is not None and x != "":
        out.append(f"{prefix}: {x}")


def chunk_json(raw, title):
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        yield from chunk_md(clean(raw), title)
        return
    groups = []   # (heading_path, text)
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, list) and v and all(isinstance(i, dict) for i in v):
                for i, item in enumerate(v):
                    lines = []
                    _render_json(item, f"{k}[{i}]", lines)
                    groups.append(([title, str(k), f"[{i}]"], "\n".join(lines)))
            else:
                lines = []
                _render_json(v, str(k), lines)
                groups.append(([title, str(k)], "\n".join(lines)))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            lines = []
            _render_json(item, f"[{i}]", lines)
            groups.append(([title, f"[{i}]"], "\n".join(lines)))
    else:
        groups.append(([title], str(data)))
    doc_pos, cur = 0, None
    for path, text in groups:
        if not text.strip():
            continue
        pieces = [text] if len(text) <= HARD else [text[a:b] for a, b in _split_hard(text, 0)]
        for piece in pieces:
            if cur is not None and len(cur[1]) + len(piece) + 1 > TARGET:
                yield cur[0], cur[1], (cur[2], cur[2] + len(cur[1])), {"rendered": True}
                cur = None
            if cur is None:
                cur = [path, piece, doc_pos]
            else:
                cur[1] += "\n" + piece
            doc_pos += len(piece) + 1
    if cur is not None:
        yield cur[0], cur[1], (cur[2], cur[2] + len(cur[1])), {"rendered": True}


_TS = re.compile(r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})")


def _t_ms(m):
    h = int(m.group(1) or 0)
    return ((h * 60 + int(m.group(2))) * 60 + int(m.group(3))) * 1000 + int(m.group(4).ljust(3, "0"))


def _fmt(ms):
    s = ms // 1000
    return f"{s // 3600:d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def parse_cues(doc, ext):
    """[(start_ms, text)] from SRT / VTT / ASS."""
    cues = []
    if ext == "ass":
        for line in doc.split("\n"):
            if line.startswith("Dialogue:"):
                parts = line.split(",", 9)
                if len(parts) == 10:
                    m = re.match(r"(\d+):(\d{2}):(\d{2})\.(\d{2})", parts[1].strip())
                    ms = ((int(m.group(1)) * 60 + int(m.group(2))) * 60 + int(m.group(3))) * 1000 + int(m.group(4)) * 10 if m else 0
                    cues.append((ms, re.sub(r"\{[^}]*\}", "", parts[9]).replace("\\N", " ").strip()))
        return cues
    lines = doc.split("\n")
    i, n = 0, len(lines)
    while i < n:
        if "-->" in lines[i]:
            m = _TS.search(lines[i])
            txt = []
            i += 1
            while i < n and lines[i].strip() and "-->" not in lines[i] \
                    and not (lines[i].strip().isdigit() and i + 1 < n and "-->" in lines[i + 1]):
                txt.append(lines[i].strip())
                i += 1
            if m:
                cues.append((_t_ms(m), " ".join(txt)))
        else:
            i += 1
    return cues


def chunk_subs(doc, ext, title):
    cues = [(t, x) for t, x in parse_cues(doc, ext) if x]
    cur, pos = None, 0
    for t, x in cues:
        line = f"[{_fmt(t)}] {x}"
        if cur is not None and len(cur[1]) + len(line) + 1 > TARGET:
            yield [title, f"{_fmt(cur[0])}-{_fmt(cur[3])}"], cur[1], (cur[2], cur[2] + len(cur[1])), {"rendered": True}
            cur = None
        if cur is None:
            cur = [t, line, pos, t]
        else:
            cur[1] += "\n" + line
            cur[3] = t
        pos += len(line) + 1
    if cur is not None:
        yield [title, f"{_fmt(cur[0])}-{_fmt(cur[3])}"], cur[1], (cur[2], cur[2] + len(cur[1])), {"rendered": True}


def chunk_csv(doc, title):
    rows = list(csv.reader(io.StringIO(doc)))
    if not rows:
        return
    header = ",".join(rows[0])
    cur, pos = None, 0
    for r in rows[1:]:
        line = ",".join(r)
        if cur is not None and len(cur[1]) + len(line) + 1 > TARGET:
            yield [title, "rows"], cur[1], (cur[2], cur[2] + len(cur[1])), {"rendered": True}
            cur = None
        if cur is None:
            cur = [None, header + "\n" + line, pos]
        else:
            cur[1] += "\n" + line
        pos += len(line) + 1
    if cur is not None:
        yield [title, "rows"], cur[1], (cur[2], cur[2] + len(cur[1])), {"rendered": True}


def chunk_txt(doc, title):
    yield from chunk_md_plain(doc, title)


def chunk_md_plain(doc, title):
    """Plain text: paragraphs only (a leading '#' in a .txt is not a heading)."""
    for a, b in pack(doc, blocks_of(doc, 0)):
        t = doc[a:b].strip()
        if t:
            yield [title], t, (a, b), {}


# ------------------------------------------------------------------ sources
def _title_of(doc, canon):
    for line in doc.splitlines()[:40]:
        m = HEAD_RX.match(line)
        if m:
            return m.group(2).strip()[:120]
    return os.path.splitext(os.path.basename(canon))[0]


def sources():
    out = []
    for r in C.read_jsonl(FILES):
        c = r["canonical"]
        ext = c.rsplit(".", 1)[-1].lower() if "." in os.path.basename(c) else ""
        if ext not in EXTS or SKIP_RX.search(c) or r["bytes"] < 20:
            continue
        out.append((r, ext))
    return out


def _is_payload(title):
    t = title.strip()
    return t.startswith("▸") or "verbatim" in t.lower()


def distill_iter(stats):
    """Yield (doc_rec, chunk_rec) streams document by document. Records chunk counts into doc_rec."""
    for r, ext in sources():
        c = r["canonical"]
        path = os.path.join(EXTRACTED, c)
        fam = family_of(c, ext)
        doc_id = r["file_id"]
        if os.path.basename(c) == KNOW_NAME:
            yield from _knowledge(r, path, doc_id, stats)
            continue
        if not os.path.exists(path):
            stats["missing_files"].append(c)
            continue
        with open(path, "rb") as f:
            raw = f.read()
        text = clean(raw.decode("utf-8", "replace"))
        title = _title_of(text, c) if ext == "md" else os.path.splitext(os.path.basename(c))[0]
        if ext == "md":
            it = chunk_md(text, title)
        elif ext == "txt":
            it = chunk_txt(text, title)
        elif ext == "json":
            it = chunk_json(text, os.path.splitext(os.path.basename(c))[0])
        elif ext == "csv":
            it = chunk_csv(text, os.path.splitext(os.path.basename(c))[0])
        else:
            it = chunk_subs(text, ext, os.path.splitext(os.path.basename(c))[0])
        recs = []
        for n, (hp, t, span, extra) in enumerate(it):
            lang, mix = lang_of(t)
            rec = {"v": 1, "chunk_id": f"{doc_id}#{n:05d}", "doc_id": doc_id, "heading_path": hp, "lang": lang, "lang_mix": mix,
                   "text": t, "norm": textnorm.fold(t), "char_span": list(span), "family": fam}
            rec.update(extra)
            recs.append(rec)
        langs = {}
        for x in recs:
            langs[x["lang"]] = langs.get(x["lang"], 0) + 1
        doc = {"v": 1, "doc_id": doc_id, "path": c, "ext": ext, "family": fam, "title": title, "bytes": r["bytes"],
               "chars": len(text), "chunks": len(recs), "langs": langs, "n_paths": len(r.get("paths") or [])}
        yield doc, recs


def _knowledge(r, path, doc_id, stats):
    if not os.path.exists(path):
        stats["missing_files"].append(r["canonical"])
        return
    idx = C.read_jsonl(KIDX)
    n, kept_payload, cut_chars = 0, 0, 0
    recs = []
    with open(path, "rb") as f:
        for s in idx:
            f.seek(s["byte_start"])
            raw = f.read(s["byte_end"] - s["byte_start"]).decode("utf-8", "replace")
            text = clean(raw)
            if not text.strip():
                continue
            payload = _is_payload(s["title"])
            body = list(pack(text, blocks_of(text, 0)))
            total = len(body)
            if payload and total > PAYLOAD_KEEP:
                cut_chars += len(text) - body[PAYLOAD_KEEP - 1][1]
                body = body[:PAYLOAD_KEEP]
                kept_payload += 1
            for a, b in body:
                t = text[a:b].strip()
                if not t:
                    continue
                lang, mix = lang_of(t)
                rec = {"v": 1, "chunk_id": f"{doc_id}#{n:05d}", "doc_id": doc_id, "heading_path": s["heading_path"], "lang": lang,
                       "lang_mix": mix, "text": t, "norm": textnorm.fold(t), "char_span": [a, b], "family": "hub-knowledge",
                       "section_id": s["section_id"], "byte_span": [s["byte_start"], s["byte_end"]]}
                if payload:
                    rec["payload"] = True
                    rec["section_chars"] = len(text)
                n += 1
                recs.append(rec)
    langs = {}
    for x in recs:
        langs[x["lang"]] = langs.get(x["lang"], 0) + 1
    stats["knowledge"] = {"sections": len(idx), "chunks": len(recs), "payload_sections_cut": kept_payload, "payload_chars_not_indexed": cut_chars}
    yield {"v": 1, "doc_id": doc_id, "path": r["canonical"], "ext": "md", "family": "hub-knowledge", "title": "DA Camp Consolidated Knowledge Base",
           "bytes": r["bytes"], "chars": sum(len(x["text"]) for x in recs), "chunks": len(recs), "langs": langs, "n_paths": len(r.get("paths") or [])}, recs


# ------------------------------------------------------------------ command
def chunks_path():
    """Where chunks.jsonl lives (corpus/text when small, else data/derived/text)."""
    for pth in (CHUNKS_CORPUS, CHUNKS_DERIVED):
        if os.path.exists(pth):
            return pth
    return None


def cmd_distill(args):
    srcs = sources()
    inputs = [{"path": "corpus/catalog/files.jsonl", "sha256": C.sha256_file(FILES)},
              {"path": "corpus/canon/knowledge_index.jsonl", "sha256": C.sha256_file(KIDX)}]
    outputs = [C.rel(DOCS)]
    existing = chunks_path()
    if existing:
        outputs.append(C.rel(existing))
    if existing and M.should_skip(OUT_DIR, "distill", inputs, outputs, args.force):
        print(f"corpus distill: up to date ({C.rel(existing)})")
        return 0
    os.makedirs(DERIVED_DIR, exist_ok=True)
    tmp = CHUNKS_DERIVED + ".tmp"
    stats = {"missing_files": []}
    docs, nch, fam = [], 0, {}
    with open(tmp, "w", encoding="utf-8") as f:
        for doc, recs in distill_iter(stats):
            for rc in recs:
                f.write(C.dumps(rc) + "\n")
            nch += len(recs)
            docs.append(doc)
            fam[doc["family"]] = fam.get(doc["family"], [0, 0])
            fam[doc["family"]][0] += 1
            fam[doc["family"]][1] += len(recs)
    size = os.path.getsize(tmp)
    # placement: small enough -> versioned corpus/text; else data/derived/text + manifest only (CLAUDE.md rule 6)
    for stale in (CHUNKS_CORPUS, CHUNKS_DERIVED):
        if os.path.exists(stale):
            os.remove(stale)
    if size / 1e6 <= args.max_mb:
        os.makedirs(OUT_DIR, exist_ok=True)
        os.replace(tmp, CHUNKS_CORPUS)
        final = CHUNKS_CORPUS
    else:
        os.replace(tmp, CHUNKS_DERIVED)
        final = CHUNKS_DERIVED
    C.write_jsonl(DOCS, docs)
    outputs = [C.rel(DOCS), C.rel(final)]
    sha = C.sha256_file(final)
    M.write(OUT_DIR, "distill", "dc corpus distill", inputs, outputs,
            extra={"chunks": nch, "docs": len(docs), "bytes": size, "chunks_path": C.rel(final), "chunks_sha256": sha,
                   "in_git": final == CHUNKS_CORPUS, "by_family": {k: {"docs": v[0], "chunks": v[1]} for k, v in sorted(fam.items())},
                   "knowledge": stats.get("knowledge"), "missing_files": stats["missing_files"], "sources": len(srcs), "max_mb": args.max_mb})
    print(f"corpus distill: {nch} chunks from {len(docs)} documents, {size / 1e6:.1f} MB -> {C.rel(final)}")
    for k, v in sorted(fam.items()):
        print(f"  {k}: {v[0]} docs, {v[1]} chunks")
    if stats["missing_files"]:
        print(f"  WARNING: {len(stats['missing_files'])} listed files missing on disk")
    return 0
