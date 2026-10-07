"""Parsers for the non-master canon sources (P2.3, P2.4, P2.6). Static reads only.

- NotebookLM part sources (T3) + the unified master (P00 intro + per-part cross-check)
- the three *_EDITABLE_STANDALONE.html cue sets (JS literals decoded with json.raw_decode; never run)
- the legacy picture pipelines: film/scenes_*.py + patterns.py via `ast` (a tiny literal evaluator,
  no exec/eval/import of archive code), and dacamp/story.json
"""
import ast
import difflib
import json
import math as _math
import re

from .canon_md import BOLD_RX, CODE_RX, numbers_in, split_sections, strip_md, tables

AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


# ================================================================ NotebookLM (T3)
SCENE_RX = re.compile(r"^### المشهد (\d+) — (.*)$")
MARKERS = (("on_screen", "**🎬 على الشاشة:**"), ("animation", "**🎞️ الحركة:**"), ("narration", "**🎙️ السرد:**"))


def _scene_fields(block):
    """block = lines after the scene heading. Returns {on_screen:[..], animation:[..], narration:str}."""
    out = {"on_screen": [], "animation": [], "narration": []}
    cur = None
    for ln in block:
        s = ln.rstrip()
        hit = False
        for key, mk in MARKERS:
            if s.startswith(mk):
                cur = key
                rest = s[len(mk):].strip()
                if key == "narration":
                    if rest:
                        out["narration"].append(rest.lstrip("> ").strip())
                else:
                    out[key].append(rest)
                hit = True
                break
        if hit:
            continue
        if cur is None or not s.strip() or s.strip() == "---":
            continue
        if cur == "narration":
            out["narration"].append(s.lstrip(">").strip())
        else:
            out[cur][-1] = (out[cur][-1] + "\n" + s.strip()).strip()
    return {"on_screen": out["on_screen"], "animation": out["animation"], "narration": " ".join(x for x in out["narration"] if x)}


def _bullets(lines):
    out = []
    for ln in lines:
        s = ln.strip()
        if re.match(r"^(?:[-*]|\d+\.)\s+", s):
            out.append(re.sub(r"^(?:[-*]|\d+\.)\s+", "", s))
        elif s and not s.startswith(("|", "#", "---")) and out is not None and s and not s.startswith(">"):
            out.append(s)
    return out


def _part_sections(lines, i0, i1, level):
    """{'scenes':(a,b), 'numbers':..., ...} for a part's numbered sections, by Arabic title keywords."""
    keys = (("تعليمات", "directing"), ("في سطر", "one_liner"), ("المشاهد", "scenes"), ("الأرقام", "numbers"),
            ("المصطلحات", "terms"), ("خريطة", "map"), ("أسئلة", "questions"), ("Prompt", "prompt"))
    out = {}
    for title, a, b in split_sections(lines, level, i0, i1):
        if not re.match(r"^\d+(?:\.\d+)?\.?\s", title):
            continue  # only numbered sections ('3. الأرقام…' / '23.3 الأرقام…'); part titles may contain the keywords
        for kw, name in keys:
            if kw in title and name not in out:
                out[name] = (a, b)
                break
    return out


MAP_KEYS = {"التوقع": "prediction", "العطل": "failure", "الإصلاح": "fix", "الربط اللي جاي": "callback_next",
            "الربط": "callback_next", "الناتج": "artifact"}


def parse_part(lines, i0, i1, level, part, src):
    """Parse one part (a whole part file, or one '# الجزء NN' block of the unified file)."""
    secs = _part_sections(lines, i0, i1, level)
    rec = {"part": part, "src": src}
    if "one_liner" in secs:
        a, b = secs["one_liner"]
        body = [ln.strip() for ln in lines[a + 1:b] if ln.strip() and ln.strip() != "---"]
        rec["one_liner"] = strip_md(body[0]) if body else None
        rec["outcomes"] = next((strip_md(x.split(":**", 1)[1]) for x in body if x.startswith("**هتطلع بـ")), None)
    if "directing" in secs:
        a, b = secs["directing"]
        rec["directing"] = _bullets(lines[a + 1:b])
    if "numbers" in secs:
        a, b = secs["numbers"]
        rec["numbers"] = [strip_md(x) for x in _bullets(lines[a + 1:b])]
        rec["numbers_tables"] = [{"header": t["header"], "rows": t["rows"]} for t in tables(lines, a, b)]
    if "terms" in secs:
        a, b = secs["terms"]
        rec["terms"] = [{"term": strip_md(r[0]).strip("`"), "meaning_ar": strip_md(r[1]) if len(r) > 1 else ""}
                        for t in tables(lines, a, b) for r in t["rows"]]
    if "map" in secs:
        a, b = secs["map"]
        mp = {}
        for x in _bullets(lines[a + 1:b]):
            m = re.match(r"\*\*(.+?):\*\*\s*(.*)", x)
            if m:
                mp[MAP_KEYS.get(m.group(1).strip(), m.group(1).strip())] = strip_md(m.group(2))
        rec["map"] = mp
    if "questions" in secs:
        a, b = secs["questions"]
        rec["questions"] = [strip_md(x) for x in _bullets(lines[a + 1:b]) if not x.startswith("**")]
    if "prompt" in secs:
        a, b = secs["prompt"]
        rec["prompt"] = " ".join(ln.lstrip("> ").strip() for ln in lines[a + 1:b] if ln.startswith(">"))
    scenes = []
    if "scenes" in secs:
        a, b = secs["scenes"]
        heads = [(k, SCENE_RX.match(lines[k])) for k in range(a, b) if SCENE_RX.match(lines[k])]
        for idx, (k, m) in enumerate(heads):
            end = heads[idx + 1][0] if idx + 1 < len(heads) else b
            f = _scene_fields(lines[k + 1:end])
            scenes.append({"n": int(m.group(1)), "title": m.group(2).strip(), "line": k + 1, **f})
    rec["scenes"] = scenes
    return rec


def _scene_terms(text, part_terms):
    low = text.lower()
    hits = [t["term"] for t in part_terms if t["term"] and t["term"].lower() in low]
    for c in CODE_RX.findall(text):
        c = c.strip()
        if c and c not in hits and len(c) <= 60:
            hits.append(c)
    return hits


def _scene_numbers(text):
    t = text.translate(AR_DIGITS)
    out = []
    for m in BOLD_RX.finditer(t):
        if numbers_in(m.group(1)):
            out.append(strip_md(m.group(1)))
    for x in numbers_in(CODE_RX.sub(" ", BOLD_RX.sub(" ", t))):
        out.append(x["text"])
    seen, res = set(), []
    for x in out:
        if x not in seen:
            seen.add(x)
            res.append(x)
    return res


def _questions(text):
    qs = []
    for m in re.finditer(r"[^.!؟?\n«»*]*[؟?]", text):
        q = m.group(0).strip(" :—-")
        if len(q) > 6:
            qs.append(q)
    return qs


def build_nblm(part_files, unified_lines, unified_src, issues):
    """part_files: [(part_no, lines, src)] -> (scene records, parts doc)."""
    parts, scene_recs = [], []
    # unified file: P00 intro + per-part blocks for cross-check
    uni = {}
    tops = [(t, a, b) for t, a, b in split_sections(unified_lines, 1)]
    intro_end = tops[1][1] if len(tops) > 1 else len(unified_lines)
    for t, a, b in tops:
        m = re.match(r"الجزء (\d\d) من 25 — (.*)", t)
        if m:
            uni[int(m.group(1))] = parse_part(unified_lines, a + 1, b, 2, int(m.group(1)), unified_src)
            uni[int(m.group(1))]["title"] = m.group(2).strip()
    # P00 intro (part table + visual-language rules)
    intro = unified_lines[:intro_end]
    p00 = {"part": 0, "title": strip_md(intro[0].lstrip("# ")), "src": unified_src, "header": [], "parts_table": [], "rules": []}
    for ln in intro:
        if ln.startswith("> **"):
            p00["header"].append(strip_md(ln[2:]))
    for t in tables(intro):
        for r in t["rows"]:
            if re.fullmatch(r"\d\d", r[0].strip()):
                p00["parts_table"].append({"part": int(r[0]), "title": r[1], "scenes": int(r[2]),
                                           "words": int(r[3].lstrip("~")), "duration_min": int(re.sub(r"\D", "", r[4]) or 0)})
            elif "المجموع" in r[0]:
                p00["totals"] = {"scenes": int(re.sub(r"\D", "", r[2])), "words": int(re.sub(r"\D", "", r[3])),
                                 "duration_min": int(re.sub(r"\D", "", r[4]))}
    rules_i = next((i for i, ln in enumerate(intro) if ln.startswith("## قواعد اللغة البصرية")), None)
    if rules_i is not None:
        for ln in intro[rules_i + 1:]:
            if ln.startswith("- "):
                m = re.match(r"- \*\*(.+?):\*\*\s*(.*)", ln)
                p00["rules"].append({"rule": m.group(1) if m else None, "text": strip_md(m.group(2) if m else ln[2:])})
    parts.append(p00)
    scene_recs.append({"v": 1, "scene_id": "P00-sc01", "part": "P00", "n": 1, "kind": "intro",
                       "title": "قواعد اللغة البصرية (بتنطبق على كل الأجزاء)",
                       "on_screen": "\n".join(f"{r['rule']}: {r['text']}" if r["rule"] else r["text"] for r in p00["rules"]),
                       "animation": "", "narration": "",
                       "numbers": _scene_numbers(" ".join(r["text"] for r in p00["rules"])),
                       "terms": [], "questions": [], "src": {"path": unified_src["path"], "file_id": unified_src["file_id"], "line": (rules_i or 0) + 1},
                       "unified_match": None})
    tot_scenes = 0
    for pno, lines, src in part_files:
        title = strip_md(lines[1].lstrip("# ")) if len(lines) > 1 else ""
        rec = parse_part(lines, 0, len(lines), 2, pno, src)
        rec["title"] = title
        u = uni.get(pno)
        n_match = 0
        for s in rec["scenes"]:
            us = None
            if u:
                us = next((x for x in u["scenes"] if x["n"] == s["n"]), None)
            same = bool(us) and us["on_screen"] == s["on_screen"] and us["animation"] == s["animation"] and us["narration"] == s["narration"]
            n_match += same
            text_all = "\n".join(s["on_screen"] + s["animation"]) + "\n" + s["narration"]
            scene_recs.append({
                "v": 1, "scene_id": f"P{pno:02d}-sc{s['n']:02d}", "part": f"P{pno:02d}", "n": s["n"], "kind": "scene",
                "title": s["title"], "on_screen": "\n".join(s["on_screen"]), "animation": "\n".join(s["animation"]),
                "narration": s["narration"], "numbers": _scene_numbers(text_all),
                "terms": _scene_terms(text_all, rec.get("terms", [])),
                "questions": _questions("\n".join(s["on_screen"]) + "\n" + s["narration"]),
                "on_screen_count": len(s["on_screen"]), "narration_words": len(s["narration"].split()),
                "src": {"path": src["path"], "file_id": src["file_id"], "line": s["line"]},
                "unified_src_line": us["line"] if us else None, "unified_match": same})
            if len(s["on_screen"]) != 1:
                issues.append(dict(kind="nblm_scene_onscreen_count", severity="info", where=f"P{pno:02d}-sc{s['n']:02d}",
                                   detail=f"{len(s['on_screen'])} 🎬 blocks in one scene", refs=[f"P{pno:02d}"]))
        tot_scenes += len(rec["scenes"])
        stated = next((r for r in p00["parts_table"] if r["part"] == pno), None)
        if stated and stated["scenes"] != len(rec["scenes"]):
            issues.append(dict(kind="count_mismatch", where=f"P00 table vs part {pno:02d}",
                               detail=f"P00 says {stated['scenes']} scenes, part file has {len(rec['scenes'])}", refs=[f"P{pno:02d}"]))
        words = sum(len(s["narration"].split()) for s in rec["scenes"])
        rec["narration_words"] = words
        if stated and abs(stated["words"] - words) > max(25, 0.05 * stated["words"]):
            issues.append(dict(kind="count_mismatch", severity="info", where=f"P00 table vs part {pno:02d}",
                               detail=f"P00 says ~{stated['words']} narration words, counted {words}", refs=[f"P{pno:02d}"]))
        rec["scene_count"] = len(rec["scenes"])
        rec["unified_identical_scenes"] = n_match
        if u is None:
            issues.append(dict(kind="missing_in_unified", where=f"part {pno:02d}", detail="no '# الجزء' block in the unified master", refs=[f"P{pno:02d}"]))
        elif n_match != len(rec["scenes"]):
            issues.append(dict(kind="unified_differs", severity="info", where=f"part {pno:02d}",
                               detail=f"{len(rec['scenes']) - n_match} of {len(rec['scenes'])} scenes differ from the unified master", refs=[f"P{pno:02d}"]))
        for k in ("terms", "numbers", "questions", "map"):
            if u and u.get(k) != rec.get(k):
                issues.append(dict(kind="unified_differs", severity="info", where=f"part {pno:02d} §{k}",
                                   detail=f"part file {k} differ from the unified master", refs=[f"P{pno:02d}"]))
        rec.pop("scenes")
        parts.append(rec)
    p00["counted_scenes"] = tot_scenes
    if p00.get("totals") and p00["totals"]["scenes"] != tot_scenes:
        issues.append(dict(kind="count_mismatch", where="P00 totals", detail=f"P00 says {p00['totals']['scenes']}, counted {tot_scenes}", refs=["P00"]))
    # 3D policy differs from master §9.1
    for r in p00["rules"]:
        if "3D" in r["text"]:
            issues.append(dict(kind="policy_differs", where="NotebookLM P00 visual rules vs master §9.1",
                               detail=f"P00 allows 3D in three places only ({r['text'][max(0, r['text'].find('الـ3D')):][:150]}); master §9.1 permits six (CPU/memory/disk, HDFS, Spark executors, embeddings, architecture, atlas)",
                               refs=["P00", "§9.1", "P19"]))
    return scene_recs, parts


# ================================================================ cue HTMLs (C)
def _js_literal(html, name):
    m = re.search(r"\b" + re.escape(name) + r"\s*=\s*", html)
    if not m:
        return None
    i = m.end()
    try:
        val, _ = json.JSONDecoder().raw_decode(html, i)
    except json.JSONDecodeError:
        return None
    return val


def build_cues(html_files, issues):
    """html_files: [(label, text, src)] -> cues doc."""
    sources, base_scenes, base_caps = [], None, None
    for label, html, src in html_files:
        scenes = _js_literal(html, "DA_SCENES") or []
        caps = _js_literal(html, "DA_CAPTIONS_EN") or []
        cfg = _js_literal(html, "DA_CONFIG") or {}
        refs = re.findall(r'"([^"<>]{1,80}\.(?:jpg|jpeg|png|webp))"\s*:\s*"data:image', html)
        sources.append({"label": label, "path": src["path"], "file_id": src["file_id"], "config": cfg,
                        "n_scenes": len(scenes), "n_captions": len(caps), "n_refs": len(refs), "refs": refs})
        if base_scenes is None:
            base_scenes, base_caps = scenes, caps
        else:
            sources[-1]["scenes_identical_to_first"] = scenes == base_scenes
            sources[-1]["captions_identical_to_first"] = caps == base_caps
            if scenes != base_scenes or caps != base_caps:
                issues.append(dict(kind="cue_sets_differ", severity="info", where=label, detail="DA_SCENES/DA_CAPTIONS_EN differ from the first file", refs=["C"]))
    sc = []
    for s in base_scenes or []:
        r = {"id": s.get("id"), "start_ms": int(round(float(s.get("start", 0)) * 1000)), "end_ms": int(round(float(s.get("end", 0)) * 1000)),
             "dur_ms": int(round(float(s.get("duration", 0)) * 1000)), "act": s.get("act"), "name": s.get("name"),
             "title_ar": s.get("titleAr"), "kind": s.get("kind"), "accent": s.get("accent"), "labels": s.get("labels", [])}
        extra = {k: v for k, v in s.items() if k not in ("id", "start", "end", "duration", "act", "name", "titleAr", "kind", "accent", "labels", "title")}
        if extra:
            r["extra"] = extra
        sc.append(r)
    caps = []
    for c in base_caps or []:
        st, en = int(round(float(c["start"]) * 1000)), int(round(float(c["end"]) * 1000))
        ch = next((s["id"] for s in sc if s["start_ms"] <= st < s["end_ms"]), None)
        caps.append({"i": c.get("i"), "start_ms": st, "end_ms": en, "chapter": ch, "text": c.get("text", ""),
                     "words": len(c.get("text", "").split())})
    for a, b in zip(caps, caps[1:]):
        if b["start_ms"] < a["end_ms"]:
            issues.append(dict(kind="cue_overlap", severity="info", where=f"caption {a['i']}→{b['i']}", detail=f"{a['end_ms']} > {b['start_ms']}", refs=["C"]))
    per_ch = {}
    for c in caps:
        per_ch[c["chapter"]] = per_ch.get(c["chapter"], 0) + 1
    return {"timeline": "70:05", "sources": sources, "scenes": sc, "captions": caps,
            "counts": {"scenes": len(sc), "captions": len(caps), "caption_words": sum(c["words"] for c in caps), "per_chapter": per_ch}}


# ================================================================ legacy pipelines (ast, never executed)
class Unresolved(Exception):
    pass


class _MathNS:
    """Whitelisted pure math functions. `math` / `__import__('math')` in archive literals resolve here;
    nothing is ever imported on the archive's behalf."""
    ALLOW = {k: getattr(_math, k) for k in ("log", "log2", "log10", "exp", "sqrt", "sin", "cos", "tan", "tanh", "pi", "e",
                                             "floor", "ceil", "pow", "hypot", "atan2", "fabs")}


MATH = _MathNS()


class LiteralEval:
    """Evaluate a restricted AST subset over literal data. Names resolve only from `env` (values parsed
    from the archive's own literal assignments). Calls: dict(), a small set of pure builtins, and
    `stubs` (function name -> callable that records the call instead of running archive code)."""
    PURE = {"len": len, "range": range, "round": round, "min": min, "max": max, "abs": abs, "str": str, "int": int,
            "float": float, "list": list, "tuple": tuple, "enumerate": enumerate, "zip": zip, "sum": sum, "sorted": sorted}
    BIN = {ast.Add: lambda a, b: a + b, ast.Sub: lambda a, b: a - b, ast.Mult: lambda a, b: a * b,
           ast.Div: lambda a, b: a / b, ast.FloorDiv: lambda a, b: a // b, ast.Mod: lambda a, b: a % b,
           ast.Pow: lambda a, b: a ** b if abs(b) < 64 else (_ for _ in ()).throw(Unresolved("pow"))}

    def __init__(self, env, stubs=None, budget=200000):
        self.env, self.stubs, self.budget = dict(env), stubs or {}, budget

    def ev(self, n, scope=None):
        self.budget -= 1
        if self.budget < 0:
            raise Unresolved("budget")
        scope = scope or {}
        if isinstance(n, ast.Constant):
            return n.value
        if isinstance(n, (ast.List, ast.Tuple, ast.Set)):
            out = []
            for e in n.elts:
                if isinstance(e, ast.Starred):
                    out.extend(self.ev(e.value, scope))
                else:
                    out.append(self.ev(e, scope))
            return out
        if isinstance(n, ast.Dict):
            d = {}
            for k, v in zip(n.keys, n.values):
                if k is None:
                    d.update(self.ev(v, scope))
                else:
                    d[self.ev(k, scope)] = self.ev(v, scope)
            return d
        if isinstance(n, ast.Name):
            if n.id in scope:
                return scope[n.id]
            if n.id in self.env:
                return self.env[n.id]
            if n.id in ("True", "False", "None"):
                return {"True": True, "False": False, "None": None}[n.id]
            raise Unresolved(f"name {n.id}")
        if isinstance(n, ast.UnaryOp):
            v = self.ev(n.operand, scope)
            if isinstance(n.op, ast.USub):
                return -v
            if isinstance(n.op, ast.UAdd):
                return +v
            if isinstance(n.op, ast.Not):
                return not v
            raise Unresolved("unary")
        if isinstance(n, ast.BinOp) and type(n.op) in self.BIN:
            a, b = self.ev(n.left, scope), self.ev(n.right, scope)
            if isinstance(a, str) and isinstance(n.op, ast.Mod) and re.search(r"%-?\d{4,}", a):
                raise Unresolved("format width")
            if isinstance(a, str) and isinstance(b, (int,)) or isinstance(b, str) and isinstance(a, int):
                if isinstance(n.op, ast.Mult) and max(a if isinstance(a, int) else 0, b if isinstance(b, int) else 0) > 10000:
                    raise Unresolved("big repeat")
            return self.BIN[type(n.op)](a, b)
        if isinstance(n, ast.Attribute):
            base = self.ev(n.value, scope)
            if base is MATH and n.attr in _MathNS.ALLOW:
                return _MathNS.ALLOW[n.attr]
            raise Unresolved(f"attr {n.attr}")
        if isinstance(n, ast.Subscript):
            v = self.ev(n.value, scope)
            if isinstance(n.slice, ast.Slice):
                lo = self.ev(n.slice.lower, scope) if n.slice.lower else None
                hi = self.ev(n.slice.upper, scope) if n.slice.upper else None
                st = self.ev(n.slice.step, scope) if n.slice.step else None
                return v[lo:hi:st]
            return v[self.ev(n.slice, scope)]
        if isinstance(n, ast.JoinedStr):
            parts = []
            for p in n.values:
                if isinstance(p, ast.Constant):
                    parts.append(str(p.value))
                elif isinstance(p, ast.FormattedValue):
                    v = self.ev(p.value, scope)
                    spec = self.ev(p.format_spec, scope) if p.format_spec else ""
                    parts.append(format(v, spec))
            return "".join(parts)
        if isinstance(n, ast.IfExp):
            return self.ev(n.body, scope) if self.ev(n.test, scope) else self.ev(n.orelse, scope)
        if isinstance(n, ast.Compare) and len(n.ops) == 1:
            a, b = self.ev(n.left, scope), self.ev(n.comparators[0], scope)
            op = type(n.ops[0])
            ops = {ast.Eq: a == b if op is ast.Eq else None}
            if op is ast.Eq:
                return a == b
            if op is ast.NotEq:
                return a != b
            if op is ast.Lt:
                return a < b
            if op is ast.LtE:
                return a <= b
            if op is ast.Gt:
                return a > b
            if op is ast.GtE:
                return a >= b
            if op is ast.In:
                return a in b
            if op is ast.NotIn:
                return a not in b
            _ = ops
            raise Unresolved("compare")
        if isinstance(n, (ast.ListComp, ast.GeneratorExp)):
            return self._comp(n, scope)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute):
            f = self.ev(n.func, scope)
            args = [self.ev(a, scope) for a in n.args if not isinstance(a, ast.Starred)]
            if any(isinstance(a, (int, float)) and abs(a) > 1e6 for a in args):
                raise Unresolved("math arg range")
            return f(*args)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "__import__":
            if len(n.args) == 1 and isinstance(n.args[0], ast.Constant) and n.args[0].value == "math":
                return MATH
            raise Unresolved("__import__")
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name):
            fn = n.func.id
            args = [self.ev(a, scope) for a in n.args if not isinstance(a, ast.Starred)]
            kw = {k.arg: self.ev(k.value, scope) for k in n.keywords if k.arg}
            if fn == "dict":
                d = dict(args[0]) if args else {}
                d.update(kw)
                return d
            if fn in self.stubs:
                return self.stubs[fn](*args, **kw)
            if fn in self.PURE:
                r = self.PURE[fn](*args, **kw)
                return list(r) if fn in ("range", "enumerate", "zip") else r
            raise Unresolved(f"call {fn}")
        raise Unresolved(type(n).__name__)

    def _assign(self, target, value, scope):
        if isinstance(target, ast.Name):
            scope[target.id] = value
        elif isinstance(target, (ast.Tuple, ast.List)):
            vals = list(value)
            if len(vals) != len(target.elts):
                raise Unresolved("unpack")
            for t, v in zip(target.elts, vals):
                self._assign(t, v, scope)
        else:
            raise Unresolved("target")

    def _comp(self, n, scope, gi=0, acc=None):
        acc = [] if acc is None else acc
        if gi == len(n.generators):
            acc.append(self.ev(n.elt, scope))
            return acc
        g = n.generators[gi]
        for item in self.ev(g.iter, scope):
            s2 = dict(scope)
            self._assign(g.target, item, s2)
            if all(self.ev(c, s2) for c in g.ifs):
                self._comp(n, s2, gi + 1, acc)
        return acc

    def safe(self, n):
        """Evaluate; on failure keep the source text so nothing is silently dropped."""
        try:
            return self.ev(n), None
        except Exception as e:  # noqa: BLE001  (Unresolved, TypeError, KeyError, ...)
            return {"_expr": ast.unparse(n)[:400]}, f"{type(e).__name__}: {e}"[:120]


def _module_literals(tree, ev, names=None):
    """Literal module-level assignments (NAME = <literal>), in order; failures are skipped."""
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            nm = node.targets[0].id
            if names and nm not in names:
                continue
            try:
                ev.env[nm] = ev.ev(node.value)
            except Exception:  # noqa: BLE001
                pass


def _engine_env(engine_src):
    """Colour constants etc. from engine.py: keep the NAME as a token string ('@SIGNAL'); keep numbers."""
    env = {}
    tree = ast.parse(engine_src)
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            nm = node.targets[0].id
            try:
                v = ast.literal_eval(node.value)
            except Exception:  # noqa: BLE001
                continue
            if isinstance(v, tuple) and len(v) == 3 and all(isinstance(x, int) for x in v):
                env[nm] = "@" + nm
            elif isinstance(v, (int, float, str)):
                env[nm] = v
            elif isinstance(v, tuple) and all(isinstance(x, (int, float)) for x in v):
                env[nm] = list(v)
    return env


def _mix_stub(a, b, t):
    return {"mix": [a, b, round(t, 4) if isinstance(t, float) else t]}


def _arch_stub(title, note=None, hl=(), fail=None, step=.26, ghost=False):
    d = {"kind": "flow", "asset": "A-01", "title": title, "via": "scenes_common.arch", "hl": list(hl) if hl else [],
         "step": step, "ghost": ghost}
    if note:
        d["note"] = note
    if fail:
        d["fail"] = fail
    return d


def build_legacy(film_files, engine_src, common_src, story, story_src, patterns_src, patterns_path, issues):
    """film_files: [(name, src_text, srcinfo)] for scenes_a..d. Returns (shot records, legacy_patterns doc)."""
    env = _engine_env(engine_src)
    env["math"] = MATH
    ev = LiteralEval(env, stubs={"arch": _arch_stub, "mix": _mix_stub})
    ctree = ast.parse(common_src)
    _module_literals(ctree, ev)
    recs = []
    for name, src, info in film_files:
        tree = ast.parse(src)
        ev_f = LiteralEval(ev.env, stubs=ev.stubs)
        _module_literals(tree, ev_f, names=None)
        for node in tree.body:
            if not (isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Subscript)):
                continue
            t = node.targets[0]
            if not (isinstance(t.value, ast.Name) and t.value.id == "S"):
                continue
            try:
                cid = ev_f.ev(t.slice)
            except Exception:  # noqa: BLE001
                continue
            call = node.value
            if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Name) and call.func.id == "dict"):
                continue
            kws = {k.arg: k.value for k in call.keywords}
            title_ar, _ = ev_f.safe(kws["title_ar"]) if "title_ar" in kws else (None, None)
            shots_node = kws.get("shots")
            elts = shots_node.elts if isinstance(shots_node, ast.List) else []
            for i, sn in enumerate(elts, 1):
                val, err = ev_f.safe(sn)
                unresolved = []
                if err:
                    unresolved.append({"path": "$", "error": err})
                    data = val
                    kind = None
                    if isinstance(sn, ast.Call) and isinstance(sn.func, ast.Name) and sn.func.id == "dict":
                        data = {}
                        for k in sn.keywords:
                            v, e2 = ev_f.safe(k.value)
                            data[k.arg] = v
                            if e2:
                                unresolved.append({"path": k.arg, "error": e2})
                        unresolved = [u for u in unresolved if u["path"] != "$"]
                else:
                    data = val
                kind = data.get("kind") if isinstance(data, dict) else None
                title = None
                if isinstance(data, dict):
                    title = data.get("title") or data.get("q")
                d2 = {k: v for k, v in data.items() if k not in ("kind", "title")} if isinstance(data, dict) else {"_value": data}
                recs.append({"v": 1, "id": f"LG:film:{cid}:{i:02d}", "source": "film", "chapter": cid, "i": i,
                             "kind": kind, "title": title, "chapter_title_ar": title_ar if isinstance(title_ar, str) else None,
                             "data": d2, "unresolved": unresolved,
                             "src": {"path": info["path"], "file_id": info["file_id"], "line": sn.lineno}})
    # story.json (dacamp, V7): 37 chapters x beats
    for cid, ch in sorted((story.get("chapters") or {}).items()):
        for i, b in enumerate(ch.get("beats") or [], 1):
            recs.append({"v": 1, "id": f"LG:story:{cid}:{i:02d}", "source": "story", "chapter": cid, "i": i, "kind": "beat",
                         "title": b.get("beat"), "chapter_title_ar": None,
                         "data": {k: v for k, v in b.items() if k != "beat"}, "unresolved": [],
                         "src": {"path": story_src["path"], "file_id": story_src["file_id"], "line": None}})
    # patterns.py renderers
    ptree = ast.parse(patterns_src)
    funcs = {n.name: n for n in ptree.body if isinstance(n, ast.FunctionDef)}
    render = {}
    for node in ptree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            t = node.targets[0]
            if isinstance(t, ast.Name) and t.id == "RENDER" and isinstance(node.value, ast.Dict):
                for k, v in zip(node.value.keys, node.value.values):
                    if isinstance(k, ast.Constant) and isinstance(v, ast.Name):
                        render[k.value] = v.id
            elif isinstance(t, ast.Subscript) and isinstance(t.value, ast.Name) and t.value.id == "RENDER" and isinstance(node.value, ast.Name):
                render[ast.literal_eval(t.slice)] = node.value.id
    lines = patterns_src.split("\n")
    rends = []
    for kind, fname in render.items():
        f = funcs.get(fname)
        if not f:
            issues.append(dict(kind="legacy_renderer_missing", severity="info", where=f"patterns.py RENDER[{kind!r}]", detail=fname, refs=["V6"]))
            continue
        req, opt = set(), {}
        for n in ast.walk(f):
            if isinstance(n, ast.Subscript) and isinstance(n.value, ast.Name) and n.value.id == "s" and isinstance(n.slice, ast.Constant):
                req.add(n.slice.value)
            if (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "get"
                    and isinstance(n.func.value, ast.Name) and n.func.value.id == "s" and n.args and isinstance(n.args[0], ast.Constant)):
                dv = None
                if len(n.args) > 1:
                    try:
                        dv = ast.literal_eval(n.args[1])
                    except Exception:  # noqa: BLE001
                        dv = {"_expr": ast.unparse(n.args[1])[:80]}
                opt.setdefault(n.args[0].value, dv)
        # helper calls head()/note() read title/sub/note
        called = {n.func.id for n in ast.walk(f) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
        if "head" in called:
            opt.setdefault("title", None)
            opt.setdefault("sub", None)
        if "note" in called:
            for k in ("note", "note_t", "note_color"):
                opt.setdefault(k, None)
        # nearest preceding banner comment: '# ---... Pnn name'
        banner = None
        for k in range(f.lineno - 2, max(0, f.lineno - 6), -1):
            m = re.match(r"#\s*-+\s*(P\d\d[^\n]*|[A-Za-z].*)$", lines[k].strip())
            if m:
                banner = m.group(1).strip()
                break
        pids = re.findall(r"P\d\d", banner or "")
        rends.append({"kind": kind, "fn": fname, "line": f.lineno, "doc": ast.get_docstring(f),
                      "banner": banner, "patterns": pids, "params_required": sorted(req),
                      "params_optional": {k: opt[k] for k in sorted(opt) if k not in req}})
    used = {}
    for r in recs:
        if r["source"] == "film" and r["kind"]:
            used[r["kind"]] = used.get(r["kind"], 0) + 1
    for r in rends:
        r["shots_using"] = used.get(r["kind"], 0)
    unknown = sorted(set(used) - set(render))
    if unknown:
        issues.append(dict(kind="legacy_unknown_kind", severity="info", where="scenes_*.py", detail=f"shot kinds without a renderer: {unknown}", refs=["V6"]))
    doc = {"source": {"path": patterns_path["path"], "file_id": patterns_path["file_id"]}, "renderers": rends,
           "counts": {"renderers": len(rends), "film_shots": sum(1 for r in recs if r["source"] == "film"),
                      "story_beats": sum(1 for r in recs if r["source"] == "story"),
                      "film_shots_with_unresolved": sum(1 for r in recs if r["source"] == "film" and r["unresolved"])},
           "story": {"patterns": story.get("patterns"), "stats": story.get("stats"), "figures": story.get("figures")}}
    return recs, doc


def compare_story_master(story, chapters, issues):
    """Cross-check dacamp/story.json (V7 story graph) against master.md §8."""
    diffs = 0
    for c in chapters:
        s = (story.get("chapters") or {}).get(c["id"])
        if not s:
            issues.append(dict(kind="story_missing_chapter", severity="info", where=c["id"], detail="not in story.json", refs=[c["id"]]))
            continue
        beats = s.get("beats") or []
        if len(beats) != len(c["shots"]):
            diffs += 1
            issues.append(dict(kind="story_beats_differ", severity="info", where=c["id"],
                               detail=f"story.json {len(beats)} beats vs master {len(c['shots'])} shots", refs=[c["id"]]))
        for b, sh in zip(beats, c["shots"]):
            if (b.get("beat") or "").strip() != sh["beat"].strip():
                diffs += 1
        if s.get("locked_sec") != c["dur_s"]:
            issues.append(dict(kind="story_duration_differs", severity="info", where=c["id"],
                               detail=f"story locked_sec {s.get('locked_sec')} vs master {c['dur_s']}", refs=[c["id"]]))
    return diffs


def text_similarity(a, b):
    wa, wb = a.split(), b.split()
    if wa == wb:
        return 1.0
    return round(difflib.SequenceMatcher(None, wa, wb, autojunk=False).ratio(), 4)
