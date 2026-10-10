"""dc spec pack <CH|DD-id|a,b|all>  (P8 step 1; recipe: docs/plan/02 section 7, runbook 03 P8.1).

Writes corpus/packs/<id>.json (the briefing pack a scene-director loads) and corpus/packs/<id>.md (a one-page summary).
Everything is read from files (EDL + word map, sentences, transcripts, glossary, data contract, graph, visual catalog,
frozen component schemas, docs/plan/04 section 6, ADR-001); nothing is invented. Rules held here:
  - sentences and data facts are never cut. Over budget: lowest-ranked visual candidates go first, then background text.
  - word ids: a sentence carries its first..last word id inside the chapter; word k of the sentence is first + k
    (verified for all 3126 sentences: sentence text == the transcript words joined by a space).
  - visual candidates are IDEAS, never footage (legacy frames are banned as footage, 04 section 11).
  - the pack header records the sha256 of every input; `dc spec pack` skips a pack whose inputs are unchanged.
Token counts are an offline estimate (no tokenizer is installed): Arabic-block chars / 2.0 + other chars / 3.2, i.e. a
deliberately conservative figure; the true count is lower.
"""
import collections
import glob
import hashlib
import json
import math
import os
import re

from . import common as C
from . import speclint as L

PACK_V = 1
PACK_DIR = C.p("corpus", "packs")
TARGET_TOKENS = 25000
GROUP_OF_ACT = {"Craft": "Craft & Systems", "Systems": "Craft & Systems", "Ship": "Ship & Close", "Close": "Ship & Close"}
_AR = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
_NUM_RE = re.compile(r"\d+(?:\.\d+)?")
WRE = re.compile(r"^(w:[A-Za-z0-9]+:[A-Za-z0-9._-]+:)(\d{6})$")
BASE_COMPONENTS = ["KineticWord", "KineticPhrase", "TermChip", "NumberCounter", "CalloutArrow", "FailureGlitch", "FixSettle",
                   "CameraRig", "MatchCut", "LowerThird", "PathDraw", "Pulse"]
BUDGET_RESERVE = 450   # the `budget` block itself, added after the fit
THUMB_BASE = "data/extracted/DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/"
GENERIC_PROPS = {"id", "slot", "depth", "until"}
ADR1 = "docs/decisions/ADR-001-narrative-spine.md"

RESTATING = {"DD-P08-1", "DD-P08-2", "DD-P11-1", "DD-P11-2", "DD-P15", "DD-P22-1", "DD-P24"}   # ADR-001 note 5 (P08a, P08b, P11a, P11b, P15, P22a, P24)


def est_tokens(text):
    ar = len(_AR.findall(text))
    return int(math.ceil(ar / 2.0 + (len(text) - ar) / 3.2))


def _trim(s, n):
    s = " ".join((s or "").split())
    return s if len(s) <= n else s[:n - 1].rstrip() + "…"


def _nums(text):
    return [float(x) for x in _NUM_RE.findall((text or "").translate(L._AR_DIG).replace(",", ""))]


def fmt_json(obj):
    """Top-level keys one per line; lists of dicts one dict per line; everything else compact. Deterministic."""
    def d(x):
        return json.dumps(x, ensure_ascii=False, separators=(",", ":"))
    lines = ["{"]
    keys = list(obj)
    for i, k in enumerate(keys):
        v = obj[k]
        comma = "," if i < len(keys) - 1 else ""
        if isinstance(v, list) and v and all(isinstance(e, dict) for e in v):
            lines.append(f"{json.dumps(k)}:[")
            lines.append(",\n".join(d(e) for e in v))
            lines.append(f"]{comma}")
        elif isinstance(v, dict) and v and all(isinstance(e, dict) for e in v.values()):
            lines.append(f"{json.dumps(k)}:{{")
            lines.append(",\n".join(f"{json.dumps(kk, ensure_ascii=False)}:{d(vv)}" for kk, vv in v.items()))
            lines.append(f"}}{comma}")
        else:
            lines.append(f"{json.dumps(k)}:{d(v)}{comma}")
    lines.append("}")
    return "\n".join(lines) + "\n"


# ================================================================================================ inputs
class Inputs:
    """Everything the packs read, loaded once per invocation."""

    def __init__(self):
        self.world = L.World()
        lock = C.read_json(C.p("corpus", "edl", "lock.json"), {}) or {}
        v11 = C.p("corpus", "edl", "word_map.v1.1.jsonl")
        if os.path.exists(v11):
            self.world.word_map_path = v11
        self.lock = lock
        self.edl = self.world.edl
        self.chs = self.edl["chapters"]
        self.order = {c["id"]: i for i, c in enumerate(self.chs)}
        self.by_id = {c["id"]: c for c in self.chs}
        self.fps = int(self.edl["fps"])
        # sentences
        self.S = {}
        for fp in sorted(glob.glob(C.p("corpus", "sentences", "*.jsonl"))):
            for r in C.read_jsonl(fp):
                self.S[r["sent_id"]] = r
        self.seg_by_ch = collections.defaultdict(list)
        for s in self.edl["segments"]:
            self.seg_by_ch[s["chapter"]].append(s)
        # word map: chapter -> sentence -> [(word_id, start_frame, end_frame)]
        self.cw = collections.defaultdict(lambda: collections.defaultdict(list))
        wm = self.world.wm
        for ch in self.order:
            for w in self.world.chapter_words(ch):
                a, b, sid, _ = wm[w]
                self.cw[ch][sid].append((w, a, b))
        self.ch_sents = {ch: self.world.chapter_sentences(ch) for ch in self.order}
        # concept -> chapters (EDL order) where a sentence names it
        self.concept_chs = collections.defaultdict(list)
        for ch in self.chs:
            for sid in self.ch_sents[ch["id"]]:
                for c in self.S.get(sid, {}).get("terms") or []:
                    if ch["id"] not in self.concept_chs[c]:
                        self.concept_chs[c].append(ch["id"])
        # canon
        self.glossary = C.read_json(self.world.glossary_path, {})
        self.contract = C.read_json(self.world.contract_path, {})
        self.facts = {f["id"]: f for f in self.contract.get("facts", [])}
        self.canon_ch = {c["id"]: c for c in (C.read_json(C.p("corpus", "canon", "chapters.json"), {}) or {}).get("chapters", [])}
        self.patterns = {p["id"]: p for p in (C.read_json(C.p("corpus", "canon", "patterns.json"), {}) or {}).get("patterns", [])}
        # graph
        self.concepts = {r["id"]: r for r in C.read_jsonl(C.p("corpus", "graph", "concepts.jsonl"))}
        self.req = collections.defaultdict(list)
        for r in C.read_jsonl(C.p("corpus", "graph", "requires_clean.jsonl")):
            self.req[r["src"]].append(r["dst"])
        self.iu = {}
        for r in C.read_jsonl(C.p("corpus", "graph", "nodes.jsonl")):
            if r["type"] == "IdeaUnit":
                self.iu[r["id"]] = r
        self.states = collections.defaultdict(list)
        self.dups = collections.defaultdict(list)
        for r in C.read_jsonl(C.p("corpus", "graph", "edges.jsonl")):
            if r["type"] == "states":
                self.states[r["src"]].append((r["dst"], r.get("w", 0)))
            elif r["type"] == "duplicates" and r.get("relation") == "same":
                self.dups[r["src"]].append((r["dst"], r.get("w", 0)))
                self.dups[r["dst"]].append((r["src"], r.get("w", 0)))
        self.assets = {r["asset_id"]: r for r in C.read_jsonl(C.p("corpus", "visual", "assets.jsonl"))}
        self.sent_ch = collections.defaultdict(list)
        for ch in self.order:
            for sid in self.ch_sents[ch]:
                self.sent_ch[sid].append(ch)
        self.metaphors = parse_metaphors()
        self.comp_dir = C.p("harness", "schemas", "components")
        idx = C.read_json(os.path.join(self.comp_dir, "_index.json"), {}) or {}
        self.comp_index = idx.get("components", {})
        self.hashes = self._hashes()

    def word_text(self, wid):
        return self.world.word_info(wid)[0]

    def _hashes(self):
        files = {
            "edl": self.world.edl_path, "word_map": self.world.word_map_path,
            "lock": C.p("corpus", "edl", "lock.json"),
            "glossary": self.world.glossary_path, "data_contract": self.world.contract_path,
            "chapters_canon": C.p("corpus", "canon", "chapters.json"), "patterns": C.p("corpus", "canon", "patterns.json"),
            "graph_nodes": C.p("corpus", "graph", "nodes.jsonl"), "graph_edges": C.p("corpus", "graph", "edges.jsonl"),
            "graph_requires": C.p("corpus", "graph", "requires_clean.jsonl"),
            "graph_concepts": C.p("corpus", "graph", "concepts.jsonl"),
            "visual_catalog": C.p("corpus", "visual", "assets.jsonl"),
            "components_index": os.path.join(self.comp_dir, "_index.json"),
            "freeze": C.p("harness", "state", "freeze.json"),
            "visual_bible": C.p("docs", "plan", "04_VISUAL_BIBLE_V2.md"), "adr001": C.p(ADR1),
            "specpack_py": os.path.abspath(__file__).replace(".pyc", ".py"),
        }
        out = {}
        h = hashlib.sha256()
        for fp in sorted(glob.glob(C.p("corpus", "sentences", "*.jsonl"))):
            h.update(C.sha256_file(fp).encode())
        out["sentences"] = h.hexdigest()
        for k, path in files.items():
            if path and os.path.exists(path):
                out[k] = C.sha256_file(path)
        out["word_map_file"] = C.rel(self.world.word_map_path)
        return out

    def header_hashes(self):
        """Hashes recorded in a pack header: full for the locked EDL + word map, 16 hex chars (sha256 prefix) for the rest."""
        return {k: (v if k in ("edl", "word_map") or not re.fullmatch(r"[0-9a-f]{64}", str(v)) else v[:16]) for k, v in self.hashes.items()}


def parse_metaphors():
    """Rows of docs/plan/04 section 6: {group, concept, metaphor, beats, components, failure_fix}."""
    path = C.p("docs", "plan", "04_VISUAL_BIBLE_V2.md")
    rows, group, on = [], None, False
    for line in open(path, encoding="utf-8"):
        if line.startswith("## "):
            on = line.startswith("## 6")
            continue
        if not on:
            continue
        m = re.match(r"^\*\*(.+?)\*\*\s*$", line.strip())
        if m:
            group = m.group(1)
            continue
        if line.startswith("|") and group and not line.startswith("|---") and not line.startswith("| Concept"):
            cells = [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
            if len(cells) >= 5:
                comps = []
                for name, _arg in re.findall(r"`([A-Z][A-Za-z0-9]+)(?:\(([^)`]*)\))?`", cells[3]):
                    if name not in comps:
                        comps.append(name)
                rows.append({"group": group, "concept": cells[0].replace("**", ""), "metaphor": cells[1], "beats": cells[2],
                             "components": comps, "failure_fix": cells[4]})
    return rows


# ================================================================================================ helpers
def base_chapter(inp, ch):
    c = inp.by_id[ch]
    return c["anchor"] if c["kind"] != "trunk" and c.get("anchor") else ch


def sentence_entries(inp, ch):
    """One entry per sentence of the chapter, in EDL order, with the in-chapter word range."""
    out = []
    for sid in inp.ch_sents[ch]:
        s = inp.S.get(sid)
        words = inp.cw[ch].get(sid)
        if not s or not words:
            continue
        pre = WRE.match(s["w_from"]).group(1)
        a0 = int(s["w_from"][-6:])
        ids = [int(w[0][-6:]) for w in words]
        lo, hi = min(ids), max(ids)
        toks = s["text"].split()
        cut = (lo != a0) or (hi != int(s["w_to"][-6:])) or (hi - lo + 1 != len(ids))
        text = " ".join(toks[lo - a0:hi - a0 + 1]) if cut else s["text"]
        fr = [min(w[1] for w in words), max(w[2] for w in words)]
        out.append({"ch": ch, "s": s, "pre": pre, "lo": lo, "hi": hi, "fr": fr, "text": text, "cut": cut, "ids": set(ids)})
    return out


def impact_in(inp, e):
    out = []
    for w in e["s"].get("impact_words") or []:
        m = WRE.match(w)
        if m and int(m.group(2)) in e["ids"]:
            out.append(f"{w}={inp.word_text(w)}")
    return out


def match_facts(inp, e, base):
    """[{v, fact:[ids], src}] for every number the sentence speaks. Never invents: no match -> fact [] and src 'sentence'."""
    res = []
    linked = sorted(inp.states.get(e["s"].get("idea_unit") or "", []), key=lambda t: -t[1])
    for n in e["s"].get("numbers") or []:
        vals = _nums(n)
        if not vals:
            res.append({"v": n, "fact": [], "src": "sentence"})
            continue
        v = vals[0]
        mine = {base, e["ch"]}
        has = lambda fid: fid in inp.facts and any(abs(v - x) < 1e-9 for x in inp.facts[fid].get("numbers") or [])
        # graph link (IdeaUnit -states-> DataFact) accepted when the fact belongs to this chapter, or the link is strong (cos >= 0.7)
        hit = [fid for fid, w in linked if has(fid) and (mine & set(inp.facts[fid].get("chapters") or []) or w >= 0.7)]
        src = "graph"
        if not hit:
            src = "chapter"
            hit = [fid for fid, f in inp.facts.items() if mine & set(f.get("chapters") or []) and has(fid)]
        res.append({"v": n, "fact": hit[:3], "src": src if hit else "sentence"})
    return res


def first_mention_map(inp, ch):
    try:
        return {wid: key for wid, key in L.first_mentions(inp.world, ch)}
    except Exception:
        return {}


def prereq_table(inp, ch, concept_ids):
    """[{c, needs:[{c, status, at}]}] ; status: before | here | later | never-in-film."""
    pos = inp.order[ch]
    rows = []
    for c in concept_ids:
        needs = []
        for p in inp.req.get(c, []):
            where = inp.concept_chs.get(p, [])
            earlier = [w for w in where if inp.order[w] < pos]
            if earlier:
                needs.append({"c": p, "status": "before", "at": earlier[0]})
            elif ch in where:
                needs.append({"c": p, "status": "here", "at": ch})
            elif where:
                needs.append({"c": p, "status": "later", "at": where[0]})
            else:
                needs.append({"c": p, "status": "never-in-film", "at": None})
        if needs:
            rows.append({"c": c, "needs": [f"{n['c']}:{n['status']}" + (f"@{n['at']}" if n["at"] else "") for n in needs]})
    return rows


def concept_cards(inp, ch, concept_ids, lite=False):
    cards = []
    for c in concept_ids:
        n = inp.concepts.get(c)
        if not n:
            continue
        firsts = inp.concept_chs.get(c, [])
        before = bool(firsts) and inp.order[firsts[0]] < inp.order[ch]
        card = {"id": c, "en": n.get("label_en"), "ar": n.get("label_ar"), "status": "taught-before" if before else "first-here"}
        if before:
            card["taught_in"] = firsts[0]
            if not lite:
                # already taught earlier in the film: the definition is retrievable (dc graph q / corpus search); keep it short
                card["def_en"] = _trim(n.get("def_en"), 90)
                if n.get("failure"):
                    card["failure"] = _trim(n["failure"], 90)
                cards.append(card)
                continue
        card["def_en"] = _trim(n.get("def_en"), 150 if lite else 260)
        if not lite:
            card["def_ar"] = _trim(n.get("def_ar"), 200)
        if n.get("failure"):
            card["failure"] = _trim(n["failure"], 110 if lite else 200)
        if n.get("aliases") and not lite:
            card["aliases"] = n["aliases"][:4]
        cards.append(card)
    return cards


def glossary_block(inp, texts, ch):
    g = inp.glossary
    low = " ".join(texts).lower()

    def present(t):
        t = (t or "").lower()
        return bool(t) and (t in low)
    chips = [{"term": t["term"], "kind": t.get("kind")} for t in g.get("term_chips", []) if ch in (t.get("chapters") or [])]
    return {
        "rule": g.get("rule"), "register_ar": g.get("register_ar"), "register_en": g.get("register_en"),
        "never_translate": g.get("never_translate"), "never_translate_rule": g.get("never_translate_rule"),
        "always_english_here": [t for t in g.get("always_english", []) if isinstance(t, str) and present(t)],
        "first_mention_gloss": [{"term": t["term"], "gloss_ar": t.get("gloss_ar")} for t in g.get("first_mention_gloss", []) if present(t["term"])],
        "pronunciation": [{"term": t["term"], "say_ar": t.get("say_ar")} for t in g.get("pronunciation", []) if present(t["term"])],
        "term_chips_for_chapter": chips,
        "on_screen": "Western digits, Latin terms in LTR isolates, Egyptian Arabic copy (no MSA), no per-letter animation (04 section 3.4).",
    }


def metaphor_rows(inp, ch, cards_, k=4):
    c = inp.by_id[ch]
    canon = inp.canon_ch.get(base_chapter(inp, ch), {})
    q = " ".join([c.get("title_en", ""), canon.get("teaches", ""), " ".join(x.get("en") or "" for x in cards_)]).lower()
    qt = set(re.findall(r"[a-z][a-z0-9]{3,}", q))
    group = GROUP_OF_ACT.get(c["act"], c["act"])
    stop = {"with", "from", "that", "this", "into", "data", "and", "the", "your", "each", "every", "when"}
    scored = []
    for i, r in enumerate(inp.metaphors):
        kt = set(re.findall(r"[a-z][a-z0-9]{3,}", (r["concept"] + " " + r["failure_fix"]).lower())) - stop
        ov = len(kt & qt)
        same = r["group"] == group
        sc = ov * 2 + (2 if same else 0)
        ok = ov >= 2 or (ov >= 1 and same)
        if re.search(r"\b" + re.escape(ch) + r"\b", r["concept"]):
            sc, ok = sc + 100, True
        scored.append((sc if ok else 0, -i, r))
    scored.sort(key=lambda t: (-t[0], -t[1]))
    best = scored[0][0]
    top = [r for sc, _, r in scored if sc > 0 and sc >= 0.6 * best][:k]
    return top or [r for _, _, r in scored if r["group"] == group][:2] or [scored[0][2]]


def component_subset(inp, rows, dive):
    names = list(BASE_COMPONENTS)
    for r in rows:
        for n in r["components"]:
            if n not in names:
                names.append(n)
    names.append("DeepDiveCard" if dive else "ChapterCard")
    return names


def compact_schema(inp, name):
    sch = C.read_json(os.path.join(inp.comp_dir, f"{name}.json"))
    if not sch:
        return None

    def ptype(p):
        if not isinstance(p, dict):
            return "any"
        if "enum" in p:
            return "|".join(map(str, p["enum"][:8])) + ("…" if len(p["enum"]) > 8 else "")
        t = p.get("type")
        if t == "array":
            return f"[{ptype(p.get('items', {}))}]"
        if t == "object":
            return "{" + ",".join((p.get("properties") or {}).keys()) + "}"
        if "anyOf" in p:
            return "|".join(ptype(x) for x in p["anyOf"])[:40]
        return t or "any"

    def props(s):
        req = set(s.get("required") or [])
        return [("*" if k in req else "") + f"{k}:{ptype(v)}" for k, v in (s.get("properties") or {}).items() if k not in GENERIC_PROPS]
    d = {"c": name, "family": sch.get("x-family"), "does": _trim(sch.get("description"), 110), "props": props(sch)}
    acts = {a: props(s) for a, s in (sch.get("x-actions") or {}).items()}
    if acts:
        d["actions"] = acts
    return d


def candidate_view(inp, e, vis_k):
    iu = inp.iu.get(e["s"].get("idea_unit") or "")
    out = []
    for c in (iu or {}).get("visual_candidates") or []:
        a = inp.assets.get(c["asset"])
        if not a or a.get("reuse_mode") == "do-not-use" or (a.get("quality") or 0) <= 1:
            continue
        out.append((c["asset"], c.get("score", 0)))
    return out[:vis_k]


def asset_card(a, brief=False):
    p = a.get("path") or ""
    d = {"k": a["kind"], "src": a.get("source"), "q": a.get("quality"), "cap": _trim(a.get("caption_en"), 110 if brief else 150),
         "idea": _trim(a.get("reusable_idea"), 90 if brief else 130), "mode": a.get("reuse_mode")}
    if p.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        d["thumb"] = "@/" + p[len(THUMB_BASE):] if p.startswith(THUMB_BASE) else p
    if a.get("numbers_seen") and not brief:
        d["nums"] = a["numbers_seen"][:6]
    d["use"] = "idea-only"
    return d


def airflow_gap(inp):
    """Locked-EDL distance between the CH-04 'Airflow in ~35 minutes' sentence and CH-22 (DAG orchestration), from the word map."""
    try:
        first = inp.cw["CH-04"]["s:S1:ar-natural:0065"][0][0]
        for line in open(inp.world.word_map_path, encoding="utf-8"):
            if first in line:
                r = json.loads(line)
                if r["word_id"] == first:
                    fr = r["rec_start_ms"]
                    to = inp.by_id["CH-22"]["start_ms"]
                    return {"from_min": round(fr / 60000, 1), "to_min": round(to / 60000, 1), "gap_min": round((to - fr) / 60000)}
    except (KeyError, IndexError):
        pass
    return None


def dive_relations(inp, ch):
    c = inp.by_id[ch]
    rel = {}
    if c["kind"] == "trunk":
        return rel
    i = inp.order[ch]
    rel["dur_min"] = round((c["end_ms"] - c["start_ms"]) / 60000, 1)
    nxt = next((x for x in inp.chs[i + 1:] if x["kind"] == "trunk"), None)
    if nxt:
        mine = {cid for cid, chs in inp.concept_chs.items() if chs and chs[0] == ch}
        theirs = {cid for cid, chs in inp.concept_chs.items() if nxt["id"] in chs}
        shared = sorted(mine & theirs)
        allsh = {cid for cid, chs in inp.concept_chs.items() if ch in chs and nxt["id"] in chs}
        rel["next_trunk"] = {"chapter": nxt["id"], "shared_concepts": len(allsh), "next_concepts": len(theirs), "first_taught_here": len(shared)}
        if len(shared) >= 3 or (theirs and len(shared) / len(theirs) >= 0.2 and len(shared) >= 2):
            rel["pre_empts"] = {"chapter": nxt["id"], "shared": shared}
    j = i
    while j > 0 and inp.chs[j - 1]["kind"] != "trunk":
        j -= 1
    k = i
    while k + 1 < len(inp.chs) and inp.chs[k + 1]["kind"] != "trunk":
        k += 1
    stack = [x["id"] for x in inp.chs[j:k + 1]]
    if len(stack) >= 2:
        rel["stack"] = stack
        rel["stack_min"] = round(sum(x["end_ms"] - x["start_ms"] for x in inp.chs[j:k + 1]) / 60000, 1)
        rel["stack_last"] = stack[-1] == ch
    return rel


def adr_notes(inp, ch, rel):
    """The ADR-001 'P8 storyboard notes' that apply to this chapter."""
    c = inp.by_id[ch]
    notes = []

    def add(nid, text, owners="scene-director, story-editor"):
        notes.append({"id": nid, "text": text, "owners": owners, "src": f"{ADR1} (P8 storyboard notes)"})
    if ch in ("CH-01", "DD-P00-1", "DD-P00-2", "CH-02"):
        add("N1-orientation-stack",
            "Front-loaded orientation stack (DD-P00-1, DD-P00-2 before CH-03; about 8 min shorter without DD-P01): give it a visual roadmap spine, an A-01 "
            "zoom-out and progress cues so it reads as an overview, not a delay. Director and educator lenses review it.")
    if ch == "CH-02":
        add("N-E002", "E-002 (ADR-001 R1) is PENDING: council-chair rules at P8 start. If it passes, the P01 core specifics are shown as short sync-anchored "
            "labels over CH-02 (4-step predict/inject/diagnose/fix loop, hash index = exact match only, 90 % skew example, weekly pacing, 3 projects, "
            "interview questions): at most 6 words each, Egyptian Arabic, English terms in Latin, one idea per moment, never a bullet list. If it fails, "
            "O2 stands and nothing is added. Do not author these labels before the ruling; mark shots `shown_on_screen` only after it.",
            "story-editor, fact-checker, egyptian-arabic, arabic-typographer, scene-director, critic, council-chair")
    if ch == "CH-04":
        gap = airflow_gap(inp)
        txt = ("CH-04 on-screen promise fix (fix it on screen, never in the audio). Sentence s:S1:ar-natural:0065 says Airflow comes 'after about thirty-five "
               "minutes' (the original film's figure). Show that spoken figure as a number card (D4), marked as the original film's, beside the locked-EDL figure "
               "or the target chapter marker. No invented numbers: the 35 is a source sentence; the locked figure is measured from the word map")
        if gap:
            txt += (f" (provisional: the sentence starts at {gap['from_min']} min of the film, CH-22 'DAG orchestration' at {gap['to_min']} min, "
                    f"so about {gap['gap_min']} min; the fact-checker confirms).")
        add("N4-ch04-promise", txt, "scene-director, fact-checker")
    if c["kind"] != "trunk":
        i = inp.order[ch]
        nxt_trunk = next((x for x in inp.chs[i + 1:] if x["kind"] == "trunk"), None)
        pre = rel.get("pre_empts")
        if pre:
            add("N2-bridge", f"This dive pre-empts {pre['chapter']} (first taught here: {', '.join(pre['shared'][:6])}). Close the dive with a forward callback "
                f"card '-> {pre['chapter']}'; {pre['chapter']} opens with a match-cut callback to this dive's visual (04 section 11: call back to earlier scenes).")
        if ch in ("DD-P07", "DD-P17"):
            add("N5-reorder", f"{ch} plays after {inp.chs[i - 1]['id']} (anchor {c.get('anchor')}): add a bridge card naming the chapter it explains and a "
                "return-to-trunk motif at the end.")
        if rel.get("dur_min", 9) <= 2.0:
            add("N5-micro-dive", f"Micro-dive ({rel['dur_min']} min): use the consistent 'side note' card treatment (same card grammar every time).")
        if rel.get("stack") and rel.get("stack_last"):
            add("N5-stack", f"Stacked dives ({' + '.join(rel['stack'])}, {rel['stack_min']} min with no narrator): end the stack with the return-to-trunk motif.")
        if ch in RESTATING:
            add("N5-restating", "Restating dive: treat it as a visual callback that reuses the trunk chapter's assets (see `restates` in continuity); the "
                "fact-checker checks its numbers against the trunk.", "scene-director, fact-checker")
    if ch == "DD-P14":
        add("N3-java-framing", "DD-P14 is the Java dive with no Java in the trunk. The framing card sets the context ('DD-P14 · Backend from the inside'), "
            "with a visual bridge from the trunk's nearest backend or API mention (CH-21 and the API chapters). Placement does not move.")
    if ch in ("CH-15", "CH-16", "CH-17", "CH-18", "CH-19", "CH-20", "CH-23"):
        add("N5-zigzag", "CH-15..CH-20 zigzag and CH-17 before CH-23 (ADR-001): open and close with callbacks that re-establish where we are on the "
            "A-01 map and name the chapter we return to.")
    return notes


def continuity(inp, ch, ents, rel):
    c = inp.by_id[ch]
    i = inp.order[ch]
    base = base_chapter(inp, ch)
    canon = inp.canon_ch.get(base, {})

    def edge_sentence(cid, last):
        ids = inp.ch_sents.get(cid) or []
        for sid in (reversed(ids) if last else ids):
            s = inp.S.get(sid)
            if s and s.get("kind") != "transition":
                return _trim(s.get("gloss_en"), 140)
        return None

    def nb(j, last):
        if j < 0 or j >= len(inp.chs):
            return None
        x = inp.chs[j]
        return {"id": x["id"], "kind": x["kind"], "title_en": x["title_en"], "act": x["act"], "voice": x["voice"],
                ("last_idea" if last else "first_idea"): edge_sentence(x["id"], last)}
    acts = []
    for x in inp.chs[:i + 1]:
        a = GROUP_OF_ACT.get(x["act"], x["act"])
        if a not in acts:
            acts.append(a)
    act_end = False
    if c["kind"] == "trunk":
        nxt = next((x for x in inp.chs[i + 1:] if x["kind"] == "trunk"), None)
        act_end = nxt is None or GROUP_OF_ACT.get(nxt["act"], nxt["act"]) != GROUP_OF_ACT.get(c["act"], c["act"])
    pats = [{"id": p, "title": inp.patterns.get(p, {}).get("title")} for p in (canon.get("patterns") or [])]
    restates = collections.Counter()
    for e in ents:
        for o, _w in sorted(inp.dups.get(e["s"]["sent_id"], []), key=lambda t: -t[1]):
            oc = next((x for x in inp.sent_ch.get(o, []) if x != ch), None)
            if oc:
                restates[oc] += 1
                break
    out = {
        "prev": nb(i - 1, True), "next": nb(i + 1, False),
        "teaches": canon.get("teaches"), "artifact": canon.get("artifact"),
        "callbacks_to": {"text": canon.get("callback"), "refs": canon.get("callback_refs") or []},
        "called_back_by": [x for x, cc in inp.canon_ch.items() if base in (cc.get("callback_refs") or []) and x != base],
        "patterns": pats,
        "a01": {"districts_lit_so_far": acts, "current": GROUP_OF_ACT.get(c["act"], c["act"]), "act_end_zoom_out_P20": act_end,
                "note": "A-01 Holo-City: each act lights its district; every act ends on a P20 zoom-out (04 section 7)."},
        "recurring": "NilePay receipts T1-T6 (CH-00, return in CH-27); ShopFlow blueprint grows one component per chapter; Deep-Dive identity = violet frame + DEEP DIVE lower-third + sting card.",
        "scene_contract": [b["beat"] for b in (C.read_json(C.p("corpus", "canon", "scene_contract.json"), {}) or {}).get("beats", [])],
    }
    if c["kind"] != "trunk":
        out["anchor"] = c.get("anchor")
        out["restates"] = dict(restates.most_common(4))
        out["dive_relations"] = {k: v for k, v in rel.items() if k != "dur_min"}
    else:
        for k in ("prediction", "failure_beat"):
            if canon.get(k):
                out[k] = canon[k]
    return out


CONSTRAINTS = {
    "fps": 24, "resolution": "1920x1080 final (960x540 previews)",
    "anchors": "{word, lead_frames} only; never seconds or frames; event frame = word start - lead_frames",
    "lead_frames": "kinetic word -3, graphic state change -2, shot cut -4..-6 (inside a pause >= 200 ms), counter starts at the number word",
    "density": f">= {L.MIN_EVENTS_PER_MIN:.0f} events/min; no gap > {L.MAX_GAP_MS / 1000:.0f} s without an event (hold <= {L.MAX_HOLD_MS / 1000:.0f} s with reason); "
               f"shot median 6-12 s, max {L.MAX_SHOT_MS / 1000:.0f} s (shots > {L.LONG_SHOT_MS / 1000:.0f} s: an event every {L.LONG_SHOT_GAP_MS / 1000:.0f} s)",
    "coverage": f"every sentence >= 1 anchored event; >= {L.MIN_MECHANISM_PCT:.0f} % of sentences a mechanism event; every spoken number and every first-mention term on screen",
    "kinetic": "8-20 kinetic words per minute; <= 6 words and <= 2 lines on screen; impact word 1-2 words",
    "fx": f"hero (real-time 3D) <= {L.MAX_RT3D_RATIO * 100:.0f} % of chapter frames (ADR-002 RT5); fx_tier lite|standard|hero",
    "text": "text on busy backgrounds needs a plate or halo; sizes and safe areas: 04 sections 3.2 and 3.4",
    "banned": ["legacy frames as footage", "bullet-list slides", "per-letter Arabic animation", "invented numbers (every number: data-contract id or source sentence)",
               "full burned-in captions (ADR-004)", "static frames > 4 s", "decorative semantic colour", "second-based timing", "paragraphs on screen"],
    "components": "use only frozen components (harness/schemas/components/); requests go to corpus/specs/_component_requests.jsonl",
    "chapter_rhythm": "problem -> mental model -> progressive visual -> worked example -> prediction -> failure (crit) -> fix (ok) -> callback -> artifact (per chapter, not per sentence)",
}


# ================================================================================================ build
def build_pack(inp, ch, target=TARGET_TOKENS):
    c = inp.by_id[ch]
    base = base_chapter(inp, ch)
    ents = sentence_entries(inp, ch)
    fm = first_mention_map(inp, ch)
    rel = dive_relations(inp, ch)
    cards = [{"seg": s["seg_id"], "card": s.get("card"), "fr": [s["rec_in_frame"], s["rec_out_frame"]], "sting": s.get("sting")}
             for s in inp.seg_by_ch[ch] if s["role"] == "card"]
    sent_rows, concept_ids, num_total, num_matched = [], [], 0, 0
    used_facts = collections.OrderedDict()
    for e in ents:
        s = e["s"]
        row = {"id": s["sent_id"], "w": f"{e['pre']}{e['lo']:06d}..{e['hi']:06d}", "n": e["hi"] - e["lo"] + 1, "fr": e["fr"], "kind": s.get("kind"),
               "ar": e["text"], "en": s.get("gloss_en")}
        if e["cut"]:
            row["cut"] = True
        imp = impact_in(inp, e)
        if imp:
            row["impact"] = imp
        nums = match_facts(inp, e, base)
        if nums:
            row["num"] = nums
            for n in nums:
                num_total += 1
                num_matched += 1 if n["fact"] else 0
                for f in n["fact"]:
                    used_facts[f] = True
        if s.get("terms"):
            row["terms"] = s["terms"]
            for t in s["terms"]:
                if t not in concept_ids:
                    concept_ids.append(t)
        fms = [f"{w}={k}" for w, k in fm.items() if w.startswith(e["pre"]) and e["lo"] <= int(w[-6:]) <= e["hi"]]
        if fms:
            row["first_mention"] = fms
        if s.get("entities"):
            row["entities"] = s["entities"]
        if s.get("idea_unit"):
            row["iu"] = s["idea_unit"]
        for o, _w in sorted(inp.dups.get(s["sent_id"], []), key=lambda t: -t[1]):
            if any(oc != ch for oc in inp.sent_ch.get(o, [])):
                row["dup"] = o
                break
        sent_rows.append(row)
    chapter_facts = [f for f in inp.facts.values() if base in (f.get("chapters") or [])]
    facts = {
        "base_chapter": base,
        "rule": "A number goes on screen with its fact id as `ref`/`data_refs`. `unmatched_numbers` are spoken but have no data-contract fact: their "
                "source is the sentence itself (a valid `s:` ref); never replace them with a different figure.",
        "referenced": [{"id": fid, "sec": inp.facts[fid].get("section"), "value": inp.facts[fid].get("value"), "unit": inp.facts[fid].get("unit"),
                        "ctx": _trim(inp.facts[fid].get("context"), 170)} for fid in used_facts if fid in inp.facts],
        "chapter_other": [{"id": f["id"], "value": f.get("value")} for f in chapter_facts if f["id"] not in used_facts],
        "unmatched_numbers": [{"sent": r["id"], "v": n["v"]} for r in sent_rows for n in r.get("num", []) if not n["fact"]],
    }
    cards_full = concept_cards(inp, ch, concept_ids)
    prereq = prereq_table(inp, ch, concept_ids)
    gaps = [f"{r['c']} needs {n.split(':')[0]}:{n.split(':', 1)[1]}" for r in prereq for n in r["needs"] if ":later" in n or ":never-in-film" in n]
    glossary = glossary_block(inp, [r["ar"] + " " + (r.get("en") or "") for r in sent_rows] + [c.get("title_en", "")], ch)
    mrows_all = metaphor_rows(inp, ch, cards_full)
    dive = c["kind"] != "trunk"
    comps_all = [x for x in (compact_schema(inp, n) for n in component_subset(inp, mrows_all, dive)) if x]
    missing = sorted({n for n in component_subset(inp, mrows_all, dive) if n not in inp.comp_index})
    cont = continuity(inp, ch, ents, rel)
    notes = adr_notes(inp, ch, rel)
    iu_rows, seen = [], set()
    for r, e in zip(sent_rows, ents):
        iu = r.get("iu")
        if iu and iu not in seen:
            seen.add(iu)
            cands = candidate_view(inp, e, 5)
            if cands:
                iu_rows.append((iu, r["id"], cands))

    # candidate entries ranked: best-ranked first (rank 0 of every idea unit), then rank 1, ...; ties by score. Cutting = dropping the tail.
    entries = sorted(((rk, -sc, ui, a) for ui, (_iu, _sid, cands) in enumerate(iu_rows) for rk, (a, sc) in enumerate(cands)))
    n_iu = len(iu_rows)

    def visuals(m, brief):
        keep = collections.defaultdict(list)
        for rk, nsc, ui, a in entries[:m]:
            keep[ui].append((a, -nsc))
        rows_, assets_ = [], {}
        for ui, (iu, sid, _c) in enumerate(iu_rows):
            if keep.get(ui):
                rows_.append({"iu": iu, "sent": sid, "top": [[a, round(sc, 2)] for a, sc in keep[ui]]})
                for a, _ in keep[ui]:
                    if a not in assets_:
                        assets_[a] = asset_card(inp.assets[a], brief)
        return rows_, assets_

    def assemble(m, level):
        vrows, vassets = visuals(m, level >= 1)
        mrows = mrows_all[:(4 if level < 2 else 2)]
        keep = set(component_subset(inp, mrows, dive))
        pk = collections.OrderedDict()
        pk["pack_v"] = PACK_V
        pk["id"] = ch
        pk["kind"] = c["kind"]
        pk["title_ar"] = c.get("title_ar")
        pk["title_en"] = c.get("title_en")
        pk["act"] = c["act"]
        pk["voice"] = c.get("voice")
        pk["anchor"] = c.get("anchor")
        pk["span"] = {"start_frame": c["start_frame"], "end_frame": c["end_frame"], "frames": c["end_frame"] - c["start_frame"],
                      "dur_s": round((c["end_ms"] - c["start_ms"]) / 1000, 1), "fps": inp.fps}
        pk["inputs"] = {"edl_version": inp.lock.get("version"), "hash_note": "sha256 prefix (16 hex) except edl/word_map (full)", **inp.header_hashes()}
        pk["how_to_read"] = ("sentences[].w = first..last word id inside this chapter; word k (0-based) of the sentence is first+k and `ar` is the spoken text "
                             "(its space-separated tokens are those words); fr = [start_frame, end_frame] at 24 fps from the word map; impact = hook words "
                             "(id=text); num = spoken numbers with data-contract fact ids; first_mention = glossary terms to chip (id=term); dup = same claim "
                             "in another chapter. Anchor with {word, lead_frames} only. Visual candidates are ideas, never footage.")
        pk["constraints"] = CONSTRAINTS
        pk["storyboard_notes"] = notes
        pk["cards"] = cards
        pk["sentences"] = sent_rows
        pk["facts"] = facts
        pk["glossary"] = glossary
        pk["concepts"] = cards_full if level < 3 else concept_cards(inp, ch, concept_ids, lite=True)
        pk["prereqs"] = {"gaps": gaps, "table": prereq,
                         "status_key": "table: concept -> prerequisite:status[@chapter]; before@X = taught earlier in the film (chapter X); here = first taught in this chapter; later/never-in-film = a gap: gloss it on screen"}
        pk["continuity"] = cont
        pk["metaphors"] = mrows
        pk["components"] = [x for x in comps_all if x["c"] in keep] if level >= 2 else comps_all
        if missing:
            pk["components_not_in_frozen_catalog"] = missing
        pk["visual_candidates"] = vrows
        pk["visual_assets"] = vassets
        return pk

    # cut ladder: (1) drop the lowest-ranked visual candidates, down to the top-1 of every idea unit; (2) cut background text
    # (shorter captions, fewer metaphor rows/components, lite concept cards); (3) only then drop the remaining top-1 candidates.
    # Sentences and data facts are never cut.
    def fits(m, lvl):
        return est_tokens(fmt_json(assemble(m, lvl))) <= target - BUDGET_RESERVE

    chosen = None
    full = len(entries)
    for lvl in range(4):
        floor_m = min(n_iu, full) if lvl < 3 else 0
        if fits(floor_m, lvl):
            lo, hi = floor_m, full
            while lo < hi:
                mid = (lo + hi + 1) // 2
                if fits(mid, lvl):
                    lo = mid
                else:
                    hi = mid - 1
            chosen = (lo, lvl)
            break
    if chosen is None:           # even the deepest cut does not fit: keep everything protected, report OVER
        chosen = (0, 3)
    m, lvl = chosen
    pack = assemble(m, lvl)
    cuts = []
    if m < len(entries):
        cuts.append(f"visual candidates {len(entries)}->{m} (lowest-ranked first; {n_iu} idea units)")
    if lvl:
        cuts.append(f"background text level {lvl} (" + {1: "shorter captions", 2: "2 metaphor rows, fewer components", 3: "lite concept cards"}[lvl] + ")")
    keys = ("sentences", "facts", "glossary", "concepts", "prereqs", "continuity", "metaphors", "components", "visual_candidates", "visual_assets",
            "storyboard_notes", "constraints", "cards")
    pack["budget"] = {"target_tokens": target, "est_tokens": 0, "within_target": True, "estimator": "Arabic chars/2.0 + other/3.2 (conservative, offline)",
                      "sections": {k: est_tokens(json.dumps(pack[k], ensure_ascii=False, separators=(",", ":"))) for k in keys if k in pack},
                      "cuts_applied": cuts, "never_cut": ["sentences", "facts"],
                      "stats": {"sentences": len(sent_rows), "numbers": num_total, "numbers_with_fact": num_matched, "concepts": len(concept_ids),
                                "visual_ideas": len(pack["visual_assets"]), "prereq_gaps": len(gaps)}}
    t = est_tokens(fmt_json(pack))
    pack["budget"]["est_tokens"] = t
    pack["budget"]["within_target"] = t <= target
    pack["budget"]["est_tokens"] = est_tokens(fmt_json(pack))
    return pack


def render_md(pack):
    b = pack["budget"]
    st = b["stats"]
    out = [f"# Pack {pack['id']} · {pack['title_en']}", "",
           f"{pack['kind']} · {pack['act']} · voice {pack['voice']} · {pack['span']['dur_s']} s · frames {pack['span']['start_frame']}..{pack['span']['end_frame']} "
           f"@ {pack['span']['fps']} fps" + (f" · anchor {pack['anchor']}" if pack.get("anchor") else ""), "",
           f"Load `corpus/packs/{pack['id']}.json`. Est. {b['est_tokens']} tokens (target {b['target_tokens']}, {'within' if b['within_target'] else 'OVER'}). "
           f"Built from EDL {pack['inputs'].get('edl_version')} sha {str(pack['inputs'].get('edl'))[:12]}; every input hash is in `inputs`.", "",
           f"- {st['sentences']} sentences, {st['numbers']} spoken numbers ({st['numbers_with_fact']} with a data-contract fact), {st['concepts']} concepts, "
           f"{st['visual_ideas']} visual ideas, {st['prereq_gaps']} prerequisite gaps.",
           f"- Cuts: {'; '.join(b['cuts_applied']) or 'none'}. Sentences and facts are never cut.", ""]
    if pack["storyboard_notes"]:
        out.append("## ADR-001 storyboard notes")
        out += [f"- **{n['id']}**: {_trim(n['text'], 420)}" for n in pack["storyboard_notes"]]
        out.append("")
    out += ["## JSON sections", "constraints · storyboard_notes · cards · sentences · facts · glossary (+dialect) · concepts · prereqs · continuity · metaphors · components · visual_candidates/visual_assets", ""]
    if pack["metaphors"]:
        out.append("## Metaphor rows chosen (04 section 6)")
        out += [f"- {r['concept']}: {', '.join(r['components'])}" for r in pack["metaphors"][:3]]
    return "\n".join(out) + "\n"


# ================================================================================================ CLI
def pack_current(inp, out_json):
    try:
        old = json.load(open(out_json, encoding="utf-8"))
    except (OSError, ValueError):
        return False
    h = old.get("inputs", {})
    return all(h.get(k) == v for k, v in inp.header_hashes().items())


def cmd_pack(args):
    inp = Inputs()
    chapters = L.resolve_chapters(inp.world, args.chapter)
    out_dir = args.out_dir or PACK_DIR
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for ch in chapters:
        oj = os.path.join(out_dir, f"{ch}.json")
        if not args.force and os.path.exists(oj) and pack_current(inp, oj):
            b = json.load(open(oj, encoding="utf-8"))["budget"]
            rows.append((ch, b["est_tokens"], b["within_target"], "current"))
            continue
        pack = build_pack(inp, ch, args.target)
        with open(oj, "w", encoding="utf-8") as f:
            f.write(fmt_json(pack))
        if not args.no_md:
            with open(os.path.join(out_dir, f"{ch}.md"), "w", encoding="utf-8") as f:
                f.write(render_md(pack))
        rows.append((ch, pack["budget"]["est_tokens"], pack["budget"]["within_target"], "built"))
    toks = [r[1] for r in rows]
    if args.json:
        print(json.dumps([{"id": r[0], "est_tokens": r[1], "within_target": r[2], "state": r[3]} for r in rows]))
    else:
        for ch, t, ok, st in rows:
            print(f"{ch:10s} {t:7d} tok  {'ok  ' if ok else 'OVER'}  {st}")
        print(f"{len(rows)} packs · max {max(toks)} · mean {sum(toks) // len(toks)} · total {sum(toks)} est tokens · over target {sum(1 for r in rows if not r[2])}")
    return 0 if all(r[2] for r in rows) else 1
