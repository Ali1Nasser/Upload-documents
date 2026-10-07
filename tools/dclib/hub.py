"""dc corpus hub index|crash|items|shots|all (P2.5 HUB / knowledge harvest).

index  DA_Camp_KNOWLEDGE.md (42 MB) -> corpus/canon/knowledge_index.jsonl, streamed in binary, never loaded whole.
crash  "Visual Crash Course - 79 animated steps" -> corpus/canon/crash_course_steps.jsonl
         (readable section of the knowledge file + the VCC bundle in DA-Camp-Visual-Crash-Course.html for the full canvas code).
items  six top HUB builds -> corpus/canon/hub_items.jsonl (mermaid | code | lab | section), static reads only.
shots  Playwright (offline, file://) -> data/derived/hub_shots/<build>/NN.png + corpus/canon/hub_shots.jsonl (queue jobs).

Everything is static: HTML/JS/JSON are parsed as text, never executed (rule 11). Outputs are content-addressed
(manifest.json in corpus/canon/, step names hub_index/hub_crash/hub_items/hub_shots) and re-runs skip when inputs are unchanged.
"""
import hashlib
import json
import os
import re
import sys
import time

from . import common as C
from . import hub_text as T
from . import manifest as M
from . import queue as Q

EXTRACTED = C.p("data", "extracted")
HUB_DIR = os.path.join(EXTRACTED, "DA_Camp_HUB.zip.d", "DA Camp HUB")
KNOW = os.path.join(EXTRACTED, "DA_Camp_Videos_Files.zip.d", "DA Camp Videos Files", "LMArena", "Folder 1", "DA_Camp_KNOWLEDGE.md")
CANON = C.p("corpus", "canon")
SHOTS_DIR = C.p("data", "derived", "hub_shots")

# (slug, file, role). Order matters for dup_of: earlier builds own the text of identical items.
BUILDS = [
    ("vcc", "DA-Camp-Visual-Crash-Course.html"),
    ("lab-m12-ds", "DA-Camp-Lab_M12-DS.html"),
    ("supreme-final2", "DA_Camp_SUPREME_FINAL2.html"),
    ("nilepay-journey", "NilePay-Data-AI-Study-Journey.html"),
    ("fusion", "FUSION-standalone.html"),
    ("unified", "DA-Camp-Unified.html"),
]
BUILD_FILE = dict(BUILDS)

IDX_PATH = os.path.join(CANON, "knowledge_index.jsonl")
CRASH_PATH = os.path.join(CANON, "crash_course_steps.jsonl")
ITEMS_PATH = os.path.join(CANON, "hub_items.jsonl")
SHOTS_PATH = os.path.join(CANON, "hub_shots.jsonl")

CAPS = {"section": 700, "lab": 900, "code": 2500, "mermaid": 4000}


def _fin(path):
    return os.path.relpath(path, C.ROOT) if os.path.isabs(path) else path


def _inputs(paths):
    return [{"path": _fin(p), "sha256": C.sha256_file(p)} for p in paths]


def _short(s, n=12):
    return hashlib.sha256(s.encode("utf-8", "replace")).hexdigest()[:n]


# =============================================================================== index
_HEAD = re.compile(rb"^(#{1,8}) +(.*?)[ \t]*$")
_FENCE = re.compile(rb"^( {0,3})(`{3,}|~{3,})(.*)$")
_PART = re.compile(r"^(\d+[a-z]?) · ")


def _with_next(f):
    """(line, next_line, next_non_blank_line) triples over a binary file (the file is read into memory once, about 45 MB)."""
    lines = f.readlines()
    nb = b""
    nbs = [b""] * len(lines)
    for i in range(len(lines) - 1, -1, -1):   # next non-blank line strictly after line i
        nbs[i] = nb
        if lines[i].strip():
            nb = lines[i]
    for i, raw in enumerate(lines):
        yield raw, (lines[i + 1] if i + 1 < len(lines) else b""), nbs[i]


def knowledge_sections(path=KNOW):
    """Stream the file once. Returns [{level,title,heading_path,part,line,byte_start,byte_end,chars}].
    Headings inside fenced code are ignored (the file embeds CSS/JS/MD payloads full of '#' lines).
    The Linux guide in section 6 is pasted without fences, so shell comments (`# Schedule a command:`) look like H1 headings. A
    level-1 line (other than line 1) counts as a heading only when it sits between blank lines AND the next non-blank line is not
    another `#` line: a run of shell comments ("# Step 3: ..." then "# Step 4: ...", "# Exercise: ..." then "# Watch ...") is code,
    while a real H1 ("# DA CAMP - SUPERSET ...") is followed by a quote or paragraph."""
    stack, fence, secs = [], None, []
    cur, off, lineno = None, 0, 0
    part = ""
    prev_blank = True
    with open(path, "rb") as f:
        for raw, nxt, nxt_nb in _with_next(f):
            lineno += 1
            was_blank, prev_blank = prev_blank, not raw.strip()
            n = len(raw)
            body = raw.rstrip(b"\r\n")
            m = _FENCE.match(body)
            if m:
                tk = m.group(2)
                if fence is None:
                    fence = (tk[:1], len(tk))
                elif tk[:1] == fence[0] and len(tk) >= fence[1] and not m.group(3).strip():
                    fence = None
            elif fence is None:
                h = _HEAD.match(body)
                if h and (len(h.group(1)) > 1 or lineno == 1 or (was_blank and not nxt.strip() and not nxt_nb.lstrip().startswith(b"#"))):
                    level = len(h.group(1))
                    title = h.group(2).decode("utf-8", "replace")
                    if cur is not None:
                        cur["byte_end"] = off
                        secs.append(cur)
                    while stack and stack[-1][0] >= level:
                        stack.pop()
                    stack.append((level, title))
                    if level <= 2 and _PART.match(title):
                        part = title  # only the file's own "## N · name" markers open a part; embedded H1s do not close it
                    cur = {"level": level, "title": title[:240], "heading_path": [t[:120] for _, t in stack], "part": part,
                           "line": lineno, "byte_start": off, "byte_end": None, "chars": 0}
            if cur is not None:
                cur["chars"] += len(raw.decode("utf-8", "replace"))
            off += n
    if cur is not None:
        cur["byte_end"] = off
        secs.append(cur)
    return secs


def cmd_index(args):
    ins = _inputs([KNOW, C.p("tools", "dclib", "hub.py")])
    if M.should_skip(CANON, "hub_index", ins, [IDX_PATH], getattr(args, "force", False)):
        print("hub index: up to date (inputs unchanged)")
        return 0
    t0 = time.time()
    secs = knowledge_sections()
    recs = []
    for i, s in enumerate(secs, 1):
        recs.append({"v": 1, "section_id": f"K{i:05d}", "heading_path": s["heading_path"], "byte_start": s["byte_start"],
                     "byte_end": s["byte_end"], "chars": s["chars"], "level": s["level"], "title": s["title"],
                     "part": s["part"], "line": s["line"]})
    C.write_jsonl(IDX_PATH, recs)
    size = os.path.getsize(KNOW)
    # coverage check: spans tile the file from the first heading to EOF without gaps or overlaps
    gaps = sum(1 for a, b in zip(recs, recs[1:]) if a["byte_end"] != b["byte_start"])
    assert recs[-1]["byte_end"] == size, "last section must end at EOF"
    parts = {}
    for r in recs:
        parts[r["part"]] = parts.get(r["part"], 0) + 1
    M.write(CANON, "hub_index", "dc corpus hub index", ins, [_fin(IDX_PATH)],
            extra={"sections": len(recs), "file_bytes": size, "gaps": gaps, "first_byte": recs[0]["byte_start"],
                   "sections_by_part": parts, "seconds": round(time.time() - t0, 1)})
    print(f"hub index: {len(recs)} sections over {size:,} bytes, {gaps} gaps, {time.time() - t0:.1f}s -> {_fin(IDX_PATH)}")
    return 0


def read_span(rec, path=KNOW):
    with open(path, "rb") as f:
        f.seek(rec["byte_start"])
        return f.read(rec["byte_end"] - rec["byte_start"]).decode("utf-8", "replace")


# =============================================================================== crash course
def _vcc_bundle_steps(html_path):
    """Parse VCC.step({...}) and VCC.phase({...}) literals from the VCC bundle statically."""
    s = open(html_path, encoding="utf-8", errors="replace").read()
    steps, phases = [], []
    for m in re.finditer(r"VCC\.(step|phase)\(\{", s):
        i = m.end() - 1
        props = T.parse_props(s, i)
        d = {}
        for k, (kind, val) in props.items():
            if kind == "str":
                d[k] = val
            elif k in ("pts",):
                d[k] = T.js_array_strings(val)
            elif k == "quiz":
                qp = T.parse_props(val, 0)
                d[k] = {"q": qp.get("q", ("", ""))[1],
                        "opts": T.js_array_strings(qp["opts"][1]) if "opts" in qp else [],
                        "a": int(qp["a"][1]) if "a" in qp and re.fullmatch(r"\d+", qp["a"][1]) else None,
                        "why": qp.get("why", ("", ""))[1]}
            else:
                d[k] = val
        (steps if m.group(1) == "step" else phases).append(d)
    return steps, phases


_STEP_HEAD = re.compile(r"^#### step (\d+) · `([^`]+)` — (.*)$", re.M)


def _md_steps(sec_text, base_byte):
    """Split the §5.2 readable listing into per-step dicts with byte spans inside the knowledge file."""
    out = []
    heads = list(_STEP_HEAD.finditer(sec_text))
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(sec_text)
        blk = sec_text[h.start():end]
        b0 = base_byte + len(sec_text[:h.start()].encode("utf-8"))
        b1 = b0 + len(blk.encode("utf-8"))
        phase = (re.search(r"^\*phase `([^`]+)`\*", blk, re.M) or [None, ""])[1]
        life = (re.search(r"^\*real life:\* (.*)$", blk, re.M) or [None, ""])[1]
        life = re.sub(r"^\*\*Real life:\*\*\s*", "", life).rstrip("*").strip()
        intu = (re.search(r"^\*\*Intuition\.\*\* (.*)$", blk, re.M) or [None, ""])[1]
        qi = blk.find("\n**Quiz**")
        mid_start = blk.find("**Intuition.**")
        mid = blk[blk.find("\n", mid_start) + 1:qi] if mid_start >= 0 and qi > 0 else ""
        quiz = {}
        qm = re.search(r"\*\*Quiz\*\* — (.*?)\n((?:- \[[ x]\] .*\n)+)\*why: (.*?)\*?\s*(?:\n\n|\Z)", blk, re.S)
        if qm:
            opts = re.findall(r"- \[([ x])\] (.*)", qm.group(2))
            quiz = {"q": qm.group(1).strip(), "options": [o[1] for o in opts],
                    "answer_index": next((j for j, o in enumerate(opts) if o[0] == "x"), None), "why": qm.group(3).strip()}
        cm = re.search(r"\*\*Canvas scene\*\* \((\d+) lines", blk)
        out.append({"step": int(h.group(1)), "step_id": h.group(2), "title": h.group(3).strip(), "phase": phase,
                    "real_life": life, "intuition": intu, "body_md": mid.strip(), "quiz": quiz,
                    "md_shown_lines": int(cm.group(1)) if cm else None, "byte_start": b0, "byte_end": b1})
    return out


def cmd_crash(args):
    vcc_path = os.path.join(HUB_DIR, BUILD_FILE["vcc"])
    ins = _inputs([KNOW, vcc_path, C.p("tools", "dclib", "hub.py"), C.p("tools", "dclib", "hub_text.py")])
    if not os.path.exists(IDX_PATH):
        cmd_index(args)
    if M.should_skip(CANON, "hub_crash", ins, [CRASH_PATH], getattr(args, "force", False)):
        print("hub crash: up to date")
        return 0
    idx = C.read_jsonl(IDX_PATH)
    sec = next((r for r in idx if r["level"] == 2 and r["title"].startswith("5 · Visual Crash Course")), None)
    if not sec:
        return C.fail("knowledge_index has no '5 · Visual Crash Course' section; run `dc corpus hub index --force`")
    # sections are flat (each ends at the next heading), so the whole part runs to the next heading of level <= 2 whose title starts "N · "
    nxt = next((r for r in idx if r["byte_start"] > sec["byte_start"] and r["level"] <= 2 and re.match(r"^\d+[a-z]? · ", r["title"])), None)
    sec_text = read_span({"byte_start": sec["byte_start"], "byte_end": nxt["byte_start"] if nxt else sec["byte_end"]})
    md = _md_steps(sec_text, sec["byte_start"])
    steps, phases = _vcc_bundle_steps(vcc_path)
    ph_title = {p["id"]: p.get("title", "") for p in phases}
    by_id = {s["id"]: s for s in steps}
    by_title = {T.squash(s.get("title", "")): s for s in steps}
    sec_by_start = {r["byte_start"]: r["section_id"] for r in idx if r["level"] == 4}
    recs, problems, notes = [], [], []
    for m in md:
        # the knowledge file's id for steps 72 and 77 is a nested canvas-node id (d2, rec), so match on id then title
        b = by_id.get(m["step_id"]) or by_title.get(T.squash(m["title"]))
        md_id = m["step_id"]
        if not b:
            problems.append(f"step {m['step']} {m['step_id']} missing from VCC bundle")
        elif b["id"] != md_id:
            notes.append(f"step {m['step']}: knowledge md id `{md_id}` is not the VCC step id; using `{b['id']}` (matched by title)")
            m["step_id"] = b["id"]
        build = b.get("build", "") if b else ""
        pts = [T.html_text(x) for x in (b or {}).get("pts", [])]
        body_txt = T.html_text((b or {}).get("body", "")) or T.html_text(m["body_md"])
        data = T.code_data(build) if build else {}
        quiz = m["quiz"] or ({"q": b["quiz"]["q"], "options": b["quiz"]["opts"], "answer_index": b["quiz"]["a"], "why": b["quiz"]["why"]}
                              if b and b.get("quiz") else {})
        if b and m["quiz"] and b.get("quiz") and b["quiz"]["q"] != m["quiz"]["q"]:
            problems.append(f"step {m['step']} quiz question differs between knowledge md and VCC bundle")
        ctrl = [x for x in T.code_motion(build) if "control" in x or "interaction" in x or "slider" in x]
        recs.append({
            "v": 1, "step": m["step"], "step_id": m["step_id"], "title": m["title"], "phase": m["phase"],
            "phase_title": ph_title.get(m["phase"], ""),
            "real_life": re.sub(r"^Real life:\s*", "", T.html_text((b or {}).get("life", ""))) or m["real_life"],
            "intuition": T.html_text((b or {}).get("lead", "")) or m["intuition"],
            "what_moves": {"description": body_txt, "motion": T.code_motion(build), "controls": ctrl},
            "key_points": pts,
            "labels": T.code_labels(build) if build else [],
            "data": data,
            "quiz": quiz,
            "canvas": {"lines": build.count("\n") + 1 if build else 0, "chars": len(build), "sha256_12": _short(build) if build else "",
                       "md_shown_lines": m["md_shown_lines"], "full_code_in": BUILD_FILE["vcc"] if build else None},
            "source": {"knowledge_section_id": sec_by_start.get(m["byte_start"]), "md_step_id": md_id, "byte_start": m["byte_start"], "byte_end": m["byte_end"],
                       "file": "DA_Camp_KNOWLEDGE.md"},
            "concepts_guess": T.concepts_guess(m["title"], m["intuition"], body_txt, m["real_life"]),
        })
    extra_bundle = sorted(set(by_id) - {r["step_id"] for r in recs})
    if extra_bundle:
        problems.append(f"in VCC bundle but not in knowledge md: {extra_bundle}")
    C.write_jsonl(CRASH_PATH, recs)
    if problems or len(recs) != 79:
        print(f"hub crash: {len(recs)} steps, {len(problems)} problems (manifest not written)")
        for p_ in problems[:10]:
            print("  PROBLEM:", p_)
        return 1
    M.write(CANON, "hub_crash", "dc corpus hub crash", ins, [_fin(CRASH_PATH)],
            extra={"steps_md": len(md), "steps_bundle": len(steps), "phases": len(phases), "problems": problems, "notes": notes,
                   "with_labels": sum(1 for r in recs if r["labels"]), "with_data": sum(1 for r in recs if r["data"].get("arrays"))})
    print(f"hub crash: {len(recs)} steps (md {len(md)}, bundle {len(steps)}), phases {len(phases)}, problems {len(problems)} -> {_fin(CRASH_PATH)}")
    for p_ in problems[:10]:
        print("  PROBLEM:", p_)
    return 0 if len(recs) == 79 and not problems else 1


# =============================================================================== items
class Items:
    def __init__(self, build, seen_global):
        self.build = build
        self.items = []
        self.seen = {}  # (kind,text_sha) -> item_id within build
        self.global_seen = seen_global  # text_sha -> item_id (first build that holds it)
        self.counts = {}

    def add(self, kind, title, text, concepts_from=(), **meta):
        text = (text or "").strip("\n")
        if not (title or text):
            return None
        full = text
        sha = _short(full, 16)
        key = (kind, sha, title if kind in ("section", "lab") else "")
        if key in self.seen:
            return None
        cap = CAPS[kind]
        clipped = full if len(full) <= cap else full[:cap]
        n = self.counts[kind] = self.counts.get(kind, 0) + 1
        iid = f"hub:{self.build}:{kind}:{n:04d}"
        self.seen[key] = iid
        rec = {"v": 1, "item_id": iid, "build": self.build, "kind": kind, "title": T.squash(title)[:200], "text": clipped,
               "concepts_guess": T.concepts_guess(title, *concepts_from, full[:1500]), "chars": len(full), "truncated": len(full) > cap,
               "text_sha": sha}
        for k, v in meta.items():
            if v not in (None, "", [], {}):
                rec[k] = v
        gk = f"{kind}:{sha}" if kind in ("code", "mermaid") else f"{kind}:{sha}:{T.squash(title)[:60]}"
        if len(full) >= 40 and gk in self.global_seen:
            rec["dup_of"] = self.global_seen[gk]
            rec["text"] = ""
        else:
            self.global_seen.setdefault(gk, iid)
        self.items.append(rec)
        return rec


_TITLE_KEYS = ("title", "t", "name", "n", "label")
_TEXT_KEYS = ("definition", "desc", "description", "d", "lead", "blurb", "why", "focus", "outcome", "mission", "trap", "production",
              "question", "q", "extension", "claim", "sub")
_LIST_KEYS = ("steps", "topics", "deliverables", "evidence", "practice", "pts", "mechanism")


def record_text(d):
    parts = []
    for k in _TEXT_KEYS:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            parts.append(v.strip())
    for k in _LIST_KEYS:
        v = d.get(k)
        if isinstance(v, list) and v and all(isinstance(x, str) for x in v):
            parts.append("; ".join(x.strip() for x in v))
    return "\n".join(parts)


def record_title(d):
    for k in _TITLE_KEYS:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


CODE_KEYS = ("code", "starter", "sql", "snippet")


def _looks_code(s):
    s = s.strip()
    if len(s) < 12:
        return False
    if "\n" in s:
        return True
    return bool(re.search(r"[=(){};]|\bselect\b|\bdef\b|\bimport\b", s, re.I))


def walk_json(o, X, ctx_title="", path="", depth=0, src=""):
    """Generic JSON walk: pull fenced / <pre><code> blocks and code-valued keys out of every string, with the nearest titled ancestor."""
    if depth > 12:
        return
    if isinstance(o, dict):
        t = record_title(o) or ctx_title
        for k, v in o.items():
            if isinstance(v, str):
                if len(v) >= 12 and ("<pre" in v or "```" in v):
                    for kind, lang, code in T.code_blocks(v):
                        X.add(kind, t, code, lang=lang or T.guess_lang(code), source_ref=f"{src}{path}/{k}")
                elif k in CODE_KEYS and _looks_code(v) and not v.lstrip().startswith("<"):
                    X.add("code", t, v, lang=T.guess_lang(v), source_ref=f"{src}{path}/{k}")
            elif isinstance(v, list) and k == "src" and o.get("lang") and v and all(isinstance(x, str) for x in v):
                code = "\n".join(v)
                X.add("code", t, code, lang=o.get("lang") or T.guess_lang(code), source_ref=f"{src}{path}/{k}")
            elif isinstance(v, (dict, list)):
                walk_json(v, X, t, f"{path}/{k}", depth + 1, src)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, (dict, list)):
                walk_json(v, X, ctx_title, f"{path}[{i}]", depth + 1, src)
            elif isinstance(v, str) and len(v) >= 12 and ("<pre" in v or "```" in v):
                for kind, lang, code in T.code_blocks(v):
                    X.add(kind, ctx_title, code, lang=lang or T.guess_lang(code), source_ref=f"{src}{path}[{i}]")


def add_records(X, recs, label, src, kind="section"):
    for i, d in enumerate(recs):
        if not isinstance(d, dict):
            continue
        title = record_title(d)
        text = record_text(d)
        if not title and not text:
            continue
        X.add(kind, title, text, concepts_from=(d.get("tags") or "",), role=label, source_ref=f"{src}[{i}]",
              ref_id=d.get("id") if isinstance(d.get("id"), str) else None)


def split_scripts(html):
    """[(attrs, body)] without regex backtracking on 20 MB strings."""
    out, i = [], 0
    while True:
        a = html.find("<script", i)
        if a < 0:
            break
        b = html.find(">", a)
        e = html.find("</script>", b)
        if b < 0 or e < 0:
            break
        out.append((html[a + 7:b], html[b + 1:e]))
        i = e + 9
    return out


def static_dom(html):
    """Non-script, non-style markup (the app chrome that exists before JS runs)."""
    out, i = [], 0
    while True:
        a = html.find("<script", i)
        if a < 0:
            out.append(html[i:])
            break
        out.append(html[i:a])
        e = html.find("</script>", a)
        i = (e + 9) if e >= 0 else len(html)
    s = "".join(out)
    return re.sub(r"<style\b.*?</style>", "", s, flags=re.S)


def dom_headings(dom, X):
    for m in re.finditer(r"<h([1-4])\b[^>]*>(.*?)</h\1>", dom, re.S):
        t = T.html_text(m.group(2))
        if len(t) >= 3:
            tail = T.html_text(dom[m.end():m.end() + 1500])[:400]
            X.add("section", t, tail, role="static-heading", source_ref=f"dom:h{m.group(1)}")
    for m in re.finditer(r"<(?:button|a)\b[^>]*\b(?:data-page|data-nav|data-lab|data-route)=\"([^\"]+)\"[^>]*>(.*?)</(?:button|a)>", dom, re.S):
        t = T.html_text(m.group(2))
        if t:
            X.add("section", t, "", role="nav-entry", ref_id=m.group(1), source_ref="dom:nav")


_LAB_DEF = re.compile(r"\blab\(\{\s*id\s*:\s*[\"']([\w-]+)[\"']")
_GROUPS = re.compile(r"const GROUPS=\[(.*?)\];", re.S)


def lab_defs_from_js(js, X, src):
    groups = {}
    gm = _GROUPS.search(js)
    if gm:
        for a, b in re.findall(r"\[\s*\"([^\"]+)\"\s*,\s*\"([\w-]+)\"\s*\]", gm.group(1)):
            groups[b] = a
    starts = [m for m in _LAB_DEF.finditer(js)]
    for i, m in enumerate(starts):
        j = js.find("{", m.start())
        props = T.parse_props(js, j)
        end = starts[i + 1].start() if i + 1 < len(starts) else min(len(js), m.start() + 60000)
        body = js[m.start():min(end, m.start() + 60000)]
        g = props.get("g", ("", ""))[1]
        labels = T.code_labels(body, cap=40)
        X.add("lab", props.get("n", ("", m.group(1)))[1], " | ".join([props.get("d", ("", ""))[1]] + labels),
              concepts_from=(" ".join(labels),), lab_id=m.group(1), group=groups.get(g, g), tag=props.get("tag", ("", ""))[1],
              source_ref=src)


_SETUPLAB = re.compile(r"(?:type|t|k)\s*===\s*'([\w-]+)'\s*\)?\s*\{\s*setupLab\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'")


def setuplabs_from_js(js, X, src):
    """NilePay Journey: `else if(type==='records'){setupLab('Title','Description',...)}` lab definitions."""
    for m in _SETUPLAB.finditer(js):
        body = js[m.start():m.start() + 2500]
        labels = T.code_labels(body, cap=20)
        X.add("lab", T.unescape_js(m.group(2)), " | ".join([T.unescape_js(m.group(3))] + labels), lab_id=m.group(1), tag="setupLab", source_ref=src)


def scenes_from_js(js, X, src):
    names = []
    for m in re.finditer(r"\breg\(\s*['\"]([\w-]+)['\"]\s*,", js):
        names.append((m.group(1), m.start()))
    for m in re.finditer(r"SCENES_A(?:\.([A-Za-z_]\w*)|\[\s*['\"]([\w-]+)['\"]\s*\])\s*=", js):
        names.append((m.group(1) or m.group(2), m.start()))
    names.sort(key=lambda x: x[1])
    for i, (nm, pos) in enumerate(names):
        end = names[i + 1][1] if i + 1 < len(names) else pos + 8000
        body = js[pos:min(end, pos + 8000)]
        labels = T.code_labels(body, cap=30)
        X.add("lab", f"scene:{nm}", " | ".join(labels), concepts_from=(nm.replace("-", " "),), lab_id=nm, tag="scene", source_ref=src)


def vcc_from_js(js, X, src):
    for m in re.finditer(r"VCC\.(step|phase)\(\{", js):
        props = T.parse_props(js, m.end() - 1)
        d = {k: v for k, (kind, v) in props.items() if kind == "str"}
        if m.group(1) == "phase":
            X.add("section", d.get("title", ""), d.get("sub", ""), role="vcc-phase", ref_id=d.get("id"), source_ref=src)
        else:
            pts = [T.html_text(x) for x in T.js_array_strings(props["pts"][1])] if "pts" in props else []
            X.add("lab", d.get("title", ""), "\n".join([d.get("lead", ""), T.html_text(d.get("body", ""))] + pts),
                  concepts_from=(d.get("life", ""),), lab_id=d.get("id"), tag="vcc-step", group=d.get("phase"), source_ref=src)


def const_literals(js, X, src, skip=("GTS_DONORS",), maxlen=3_000_000):
    """`const NAME=[...]/{...};` with JSON-compatible bodies (Unified's M6/M7/M9 tables, GTS_DOC)."""
    dec = json.JSONDecoder()
    for m in re.finditer(r"(?m)^\s*(?:const|var|let)\s+([A-Z][A-Z0-9_]{2,})\s*=\s*", js):
        name = m.group(1)
        if name in skip:
            continue
        j = m.end()
        if j >= len(js) or js[j] not in "[{\"":
            continue
        try:
            val, k = dec.raw_decode(js[j:j + maxlen])
        except Exception:  # noqa: BLE001
            continue
        if isinstance(val, str) and name.endswith("DOC") and "<h" in val:
            dom_headings(val, X)
            for kind, lang, code in T.code_blocks(val):
                X.add(kind, name, code, lang=lang or T.guess_lang(code), source_ref=f"{src}:{name}")
        elif isinstance(val, list) and val and isinstance(val[0], dict):
            add_records(X, val, name, f"{src}:{name}")
            walk_json(val, X, name, f"/{name}", 0, src)
        elif isinstance(val, dict):
            walk_json(val, X, name, f"/{name}", 0, src)


def extract_build(slug, global_seen):
    path = os.path.join(HUB_DIR, BUILD_FILE[slug])
    html = open(path, encoding="utf-8", errors="replace").read()
    X = Items(slug, global_seen)
    scripts = split_scripts(html)
    dom_headings(static_dom(html), X)
    dec = json.JSONDecoder()
    for attrs, body in scripts:
        sid = (re.search(r"\bid=\"([^\"]+)\"", attrs) or [None, ""])[1]
        is_json = "application/json" in attrs
        src = f"{BUILD_FILE[slug]}#{sid or 'script'}"
        payload = None
        if is_json:
            try:
                payload = json.loads(body)
            except Exception:  # noqa: BLE001
                payload = None
        elif body.lstrip().startswith("window.__COURSE="):
            payload = dec.raw_decode(body.lstrip()[len("window.__COURSE="):])[0]
            sid = "__COURSE"
            src = f"{BUILD_FILE[slug]}#__COURSE"
        if payload is not None:
            handle_payload(X, sid, payload, src)
            continue
        if is_json or len(body) < 200:
            continue
        # plain JS: static reads only
        if _LAB_DEF.search(body):
            lab_defs_from_js(body, X, src)
        if "setupLab(" in body:
            setuplabs_from_js(body, X, src)
        if "reg('" in body or "SCENES_A" in body:
            scenes_from_js(body, X, src)
        if "VCC.step({" in body:
            vcc_from_js(body, X, src)
        if slug == "unified":
            const_literals(body, X, src)
    return X


def handle_payload(X, sid, o, src):
    if sid == "corpus" and isinstance(o, dict) and "sections" in o:  # DA Camp Lab corpus
        for key, label in (("parts", "part"), ("domains", "domain"), ("sections", "lab-section"), ("roadmap", "roadmap-week"),
                           ("mission", "mission"), ("story", "story"), ("architecture", "architecture")):
            if key == "sections":
                for i, d in enumerate(o[key]):
                    X.add("section", f"{d.get('n', '')} {d.get('t', '')}".strip(), T.html_text(d.get("html", "")),
                          role=label, ref_id=d.get("id"), group=d.get("p"), source_ref=f"{src}/sections[{i}]")
            else:
                add_records(X, o.get(key, []), label, f"{src}/{key}")
        for i, d in enumerate(o.get("labs", [])):
            X.add("lab", d.get("title", ""), "; ".join(d.get("topics", [])), concepts_from=(d.get("domain", ""),), lab_id=d.get("id"),
                  group=d.get("domain"), tag="domain-lab", source_ref=f"{src}/labs[{i}]")
        walk_json(o, X, "", "", 0, src)
        return
    if sid == "traces" and isinstance(o, list):
        for i, d in enumerate(o):
            code = "\n".join(d.get("src", []))
            X.add("code", d.get("title", ""), code, concepts_from=(d.get("blurb", ""),), lang=d.get("lang", ""),
                  trace_id=d.get("id"), blurb=d.get("blurb"), source_ref=f"{src}[{i}]")
        return
    if sid == "testrun":
        return
    if sid == "course-data" and isinstance(o, dict):  # SUPREME + NilePay
        for key, label in (("stages", "stage"), ("lessons", "lesson"), ("deepDives", "deep-dive"), ("sources", "source-doc"), ("refs", "ref")):
            add_records(X, o.get(key, []), label, f"{src}/{key}")
        for i, ph in enumerate(o.get("phases", []) if isinstance(o.get("phases"), list) else []):
            if isinstance(ph, list) and ph:
                X.add("section", str(ph[0]), " ".join(str(x) for x in ph[1:]), role="phase", source_ref=f"{src}/phases[{i}]")
        if isinstance(o.get("starter"), str):
            X.add("code", "NilePay practice starter", o["starter"], lang="python", source_ref=f"{src}/starter")
        if isinstance(o.get("csv"), str):
            X.add("code", "NilePay receipts CSV", o["csv"], lang="csv", source_ref=f"{src}/csv")
        walk_json({k: v for k, v in o.items() if k not in ("bank", "sourceHashes")}, X, "", "", 0, src)
        return
    if sid == "__COURSE" and isinstance(o, dict):  # FUSION
        add_records(X, o.get("spine", []), "stage", f"{src}/spine")
        for i, d in enumerate(o.get("items", [])):
            k = d.get("kind")
            if k == "lab":
                code = (d.get("render") or {}).get("__code__", "") if isinstance(d.get("render"), dict) else ""
                labels = T.code_labels(code, cap=40)
                X.add("lab", d.get("n") or d.get("title", ""), " | ".join([d.get("d", "")] + labels), concepts_from=(" ".join(labels),),
                      lab_id=d.get("id"), group=d.get("g"), tag=d.get("tag"), source_ref=f"{src}/items[{i}]")
            elif k == "canvas-step":
                X.add("lab", d.get("title", ""), record_text(d), lab_id=d.get("id"), tag="canvas-step", group=d.get("phase"),
                      source_ref=f"{src}/items[{i}]")
            else:
                X.add("section", record_title(d), record_text(d), concepts_from=(d.get("tags") or "",), role=k, ref_id=d.get("id"),
                      group=d.get("stage"), source_ref=f"{src}/items[{i}]")
        add_records(X, o.get("dives", []), "dive", f"{src}/dives")
        add_records(X, o.get("sources", []), "source-doc", f"{src}/sources")
        add_records(X, o.get("capabilities", []) if o.get("capabilities") and isinstance(o["capabilities"][0], dict) else [], "capability", f"{src}/capabilities")
        walk_json({k: v for k, v in o.items() if k not in ("bank", "items")}, X, "", "", 0, src)
        for i, d in enumerate(o.get("items", [])):
            if d.get("kind") != "lab":
                walk_json(d, X, record_title(d), f"/items[{i}]", 0, src)
        return
    walk_json(o, X, "", "", 0, src)


def cmd_items(args):
    only = getattr(args, "build", None) or [b for b, _ in BUILDS]
    paths = [os.path.join(HUB_DIR, BUILD_FILE[b]) for b, _ in BUILDS]
    ins = _inputs(paths) + [{"path": "tools/dclib/hub_text.py", "sha256": C.sha256_file(C.p("tools", "dclib", "hub_text.py"))},
                            {"path": "tools/dclib/hub.py", "sha256": C.sha256_file(C.p("tools", "dclib", "hub.py"))}]
    if M.should_skip(CANON, "hub_items", ins, [ITEMS_PATH], getattr(args, "force", False)) and not getattr(args, "build", None):
        print("hub items: up to date")
        return 0
    t0 = time.time()
    seen, allrecs, stats = {}, [], {}
    for slug, _ in BUILDS:
        tb = time.time()
        X = extract_build(slug, seen)
        allrecs.extend(X.items)
        st = {k: sum(1 for r in X.items if r["kind"] == k) for k in ("mermaid", "code", "lab", "section")}
        st["dup_of"] = sum(1 for r in X.items if r.get("dup_of"))
        st["seconds"] = round(time.time() - tb, 1)
        stats[slug] = st
        print(f"  {slug:16s} {st}")
    C.write_jsonl(ITEMS_PATH, allrecs)
    M.write(CANON, "hub_items", "dc corpus hub items", ins, [_fin(ITEMS_PATH)],
            extra={"items": len(allrecs), "by_build": stats, "bytes": os.path.getsize(ITEMS_PATH), "seconds": round(time.time() - t0, 1)})
    print(f"hub items: {len(allrecs)} items, {os.path.getsize(ITEMS_PATH) / 1e6:.2f} MB, {time.time() - t0:.0f}s -> {_fin(ITEMS_PATH)}")
    return 0


# =============================================================================== shots (queue)
def _self_argv(sub, extra):
    return [C.p("tools", "dc.py"), "corpus", "hub", sub] + extra


def cmd_shots(args):
    from . import hub_shots as S
    builds = getattr(args, "build", None) or [b for b, _ in BUILDS]
    mx = getattr(args, "max_shots", 25)
    if getattr(args, "worker", False):  # inside a queue job: the listed builds, one after another (one browser at a time)
        rc = 0
        for b in builds:
            rc = S.run_build(b, mx, force=getattr(args, "force", False)) or rc
        return rc
    paths = [os.path.join(HUB_DIR, BUILD_FILE[b]) for b in builds]
    ins = _inputs(paths) + [{"path": "tools/dclib/hub_shots.py", "sha256": C.sha256_file(C.p("tools", "dclib", "hub_shots.py"))},
                            {"path": "max_shots", "sha256": _short(str(mx))}]
    if (not getattr(args, "build", None) and not getattr(args, "merge_only", False)
            and M.should_skip(CANON, "hub_shots", ins, [SHOTS_PATH], getattr(args, "force", False))):
        print("hub shots: up to date")
        return 0
    rc_all = 0
    if getattr(args, "merge_only", False):
        pass  # rebuild corpus/canon/hub_shots.jsonl + manifest from the per-build results already on disk
    elif getattr(args, "inline", False) or Q.in_queue() or not Q.tsp_bin():
        for b in builds:
            rc_all = S.run_build(b, mx, force=getattr(args, "force", False)) or rc_all
    else:
        # one queue job for all requested builds: one chromium at a time keeps the RAM promise small (3 shared slots, 15 GB)
        argv = _self_argv("shots", ["--build", *builds, "--max-shots", str(mx), "--worker"] + (["--force"] if getattr(args, "force", False) else []))
        job = Q.submit("hubshots-" + ("all" if len(builds) > 1 else builds[0]), [sys.executable, *argv], 1.8, 0.3)
        print(f"hub shots: queued tsp job {job['tsp_id']} for {', '.join(builds)}")
        if getattr(args, "front", False):
            import subprocess
            subprocess.run([Q.tsp_bin(), "-u", str(job["tsp_id"])], capture_output=True)

        class A:
            id = job["tsp_id"]
            timeout = 7200
            tail = 8
        rc_all = Q.cmd_wait(A)
    # merge per-build jsonl -> corpus/canon/hub_shots.jsonl
    recs = []
    for slug, _ in BUILDS:
        p_ = os.path.join(SHOTS_DIR, slug, "shots.jsonl")
        if os.path.exists(p_):
            recs.extend(C.read_jsonl(p_))
    if recs and (not getattr(args, "build", None) or getattr(args, "merge_only", False)):
        C.write_jsonl(SHOTS_PATH, recs)
        by = {}
        for r in recs:
            by[r["build"]] = by.get(r["build"], 0) + 1
        M.write(CANON, "hub_shots", "dc corpus hub shots", ins, [_fin(SHOTS_PATH)], extra={"shots": len(recs), "by_build": by,
                "build_notes": {b: (C.read_json(os.path.join(SHOTS_DIR, b, "notes.json"), {}) or {}) for b in by}})
        print(f"hub shots: {len(recs)} shots {by} -> {_fin(SHOTS_PATH)}")
    elif recs:
        C.write_jsonl(SHOTS_PATH, recs)
        print(f"hub shots: merged {len(recs)} shots (partial run; manifest not updated)")
    return rc_all


def cmd_all(args):
    for fn in (cmd_index, cmd_crash, cmd_items, cmd_shots):
        rc = fn(args)
        if rc:
            return rc
    return 0


def run(args):
    sub = args.hub_cmd
    return {"index": cmd_index, "crash": cmd_crash, "items": cmd_items, "shots": cmd_shots, "all": cmd_all}[sub](args)
