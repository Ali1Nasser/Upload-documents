"""Static markdown helpers + the master.md (T1) parser for `dc corpus canon` (P2.2).

Pure text parsing: nothing from the archives is executed. Every record keeps the source line it came from,
so a merge or a later correction can always be traced back (provenance).
"""
import re

# ---------------------------------------------------------------- generic markdown helpers
NUM_RX = re.compile(
    r"(?:(?<![\w.])|(?<=\u0640))[−+-]?(?:\d{1,3}(?:(?:[    ]|,(?=\d{3}(?!\d)))\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![\w])")
CH_RX = re.compile(r"\bCH-(\d\d)\b")
PAT_RX = re.compile(r"\bP(\d\d)\b")
BOLD_RX = re.compile(r"\*\*(.+?)\*\*")
CODE_RX = re.compile(r"`([^`]+)`")


def heading_level(line):
    m = re.match(r"^(#{1,6}) ", line)
    return len(m.group(1)) if m else 0


def split_sections(lines, level, start=0, end=None):
    """[(title, i_heading, i_end_exclusive)] for headings of exactly `level` (stops at a shallower heading)."""
    end = len(lines) if end is None else end
    out = []
    cur = None
    for i in range(start, end):
        lv = heading_level(lines[i])
        if lv and lv <= level:
            if cur:
                out.append((cur[0], cur[1], i))
                cur = None
            if lv == level:
                cur = (lines[i][lv + 1:].strip(), i)
    if cur:
        out.append((cur[0], cur[1], end))
    return out


def split_cells(row):
    """Split a markdown table row on | that are not inside backticks."""
    s = row.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    cells, buf, tick = [], [], False
    for i, ch in enumerate(s):
        if ch == "\\" and s[i + 1:i + 2] == "|":
            continue          # markdown escapes a literal pipe in a cell as \| : drop the backslash, keep the pipe in the cell
        if ch == "`":
            tick = not tick
        if ch == "|" and not tick and s[i - 1:i] != "\\":
            cells.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    cells.append("".join(buf).strip())
    return cells


def is_sep_row(cells):
    return all(re.fullmatch(r":?-{2,}:?", c.strip()) for c in cells if c.strip()) and any(cells)


def tables(lines, start=0, end=None):
    """[{header:[...], rows:[[...]], line: 1-based line of header, row_lines:[...]}] for every pipe table."""
    end = len(lines) if end is None else end
    out, i = [], start
    while i < end:
        if lines[i].lstrip().startswith("|") and i + 1 < end and is_sep_row(split_cells(lines[i + 1])):
            t = {"header": split_cells(lines[i]), "rows": [], "line": i + 1, "row_lines": []}
            j = i + 2
            while j < end and lines[j].lstrip().startswith("|"):
                t["rows"].append(split_cells(lines[j]))
                t["row_lines"].append(j + 1)
                j += 1
            out.append(t)
            i = j
        else:
            i += 1
    return out


def strip_md(s):
    s = BOLD_RX.sub(r"\1", s)
    s = re.sub(r"(?<!\*)\*(?!\*)([^*]+)\*(?!\*)", r"\1", s)
    return s.strip()


def plain_text(s):
    """Speech-clean text: markdown emphasis/backticks removed (what dacamp/tts did); a lone ' * ' is kept."""
    s = s.replace("`", "").replace("**", "")
    s = re.sub(r"\*(?=[^\s*])|(?<=[^\s*])\*", "", s)
    return re.sub(r"\s+", " ", s).strip()


def code_spans(s):
    return CODE_RX.findall(s)


def chapters_in(s):
    return sorted({f"CH-{m}" for m in CH_RX.findall(s)})


def chapter_ranges(s):
    """'CH-21–23' or 'CH-03–05' ranges + plain refs."""
    out = set(chapters_in(s))
    for a, b in re.findall(r"CH-(\d\d)\s*[–-]\s*(\d\d)\b", s):
        for k in range(int(a), int(b) + 1):
            out.add(f"CH-{k:02d}")
    return sorted(out)


def parse_number(tok):
    t = tok.replace("−", "-").replace(" ", "").replace(" ", "").replace(" ", "")
    t = re.sub(r"(?<=\d) (?=\d{3})", "", t)
    t = re.sub(r"(?<=\d),(?=\d{3}(?!\d))", "", t)   # NotebookLM comma thousands: 1,250,000
    try:
        v = float(t)
    except ValueError:
        return None
    return int(v) if v.is_integer() and "." not in t else v


def numbers_in(s):
    """Numeric tokens in s (skips CH-nn, Pnn, A-nn, §n.n, T1..T6 ids, 1NF style tokens)."""
    masked = re.sub(r"\b(?:CH|DD|A)-\d+\b|\bP\d\d\b|§\s?\d+(?:\.\d+)*|\bT\d\b|\b\d+NF\b|\bP\d\d\b", lambda m: " " * len(m.group(0)), s)
    out = []
    for m in NUM_RX.finditer(masked):
        v = parse_number(m.group(0))
        if v is not None:
            out.append({"text": m.group(0), "value": v, "pos": m.start()})
    return out


UNIT_AFTER = [
    ("req/s", "req/s"), ("ms", "ms"), ("s ", "s"), ("s.", "s"), ("s,", "s"), ("%", "%"), (" %", "%"), ("EGP", "EGP"),
    ("rows", "rows"), ("row", "rows"), ("pages", "pages"), ("page reads", "page reads"), ("MAE", "MAE"),
    ("weights", "weights"), ("heads", "heads"), ("tasks", "tasks"), ("items", "items"), ("customers", "customers"),
    ("comparisons", "comparisons"), ("defects", "defects"), ("assertions", "assertions"),
    ("-deep", "queue depth"), ("deep", "queue depth"), ("matched", "rows"), ("level", "levels"), ("stages", "stages"),
    ("houses", "rows"), ("spellings", "spellings"), ("fields", "fields"), ("seconds", "s"), ("bytes", "bytes"),
]


def guess_unit(text, start, end):
    before = text[max(0, start - 3):start]
    after = text[end:end + 14]
    if "€" in before:
        return "EUR"
    a = after.lstrip("  *")
    for key, unit in UNIT_AFTER:
        k = key.strip()
        if a.startswith(k):
            if k == "s" and a[1:2].isalpha():
                continue
            return unit
    return None


def sentence_around(text, pos, width=260):
    """The sentence containing pos (split on '. ' / '; ' boundaries), clipped."""
    left = max(text.rfind(". ", 0, pos), text.rfind("; ", 0, pos), text.rfind("\n", 0, pos))
    right_c = [x for x in (text.find(". ", pos), text.find("; ", pos), text.find("\n", pos)) if x != -1]
    right = min(right_c) + 1 if right_c else len(text)
    s = text[left + 1 if left != -1 else 0:right].strip()
    return strip_md(s)[:width]


# ---------------------------------------------------------------- master.md (T1)
def ms_of_mmss(s):
    m = re.fullmatch(r"\s*(\d+):(\d\d)\s*", s)
    if not m:
        return None
    return (int(m.group(1)) * 60 + int(m.group(2))) * 1000


def section_bounds(lines):
    """{'2': (title, i0, i1), '6.3': ...} for ## and ### numbered sections of master.md."""
    out = {}
    for title, i0, i1 in split_sections(lines, 2):
        m = re.match(r"(\d+) · (.*)", title)
        if not m:
            continue
        out[m.group(1)] = (m.group(2), i0, i1)
        for t2, j0, j1 in split_sections(lines, 3, i0 + 1, i1):
            m2 = re.match(r"(\d+\.\d+) (.*)", t2)
            if m2:
                out[m2.group(1)] = (m2.group(2).strip(), j0, j1)
    return out


def _label_list(s):
    items = code_spans(s)
    rest = CODE_RX.sub("", s)
    rest = re.sub(r"[·\s]+", " ", rest).strip(" ·")
    return items, (rest or None)


def parse_runtime_map(lines, sec):
    _, i0, i1 = sec["7"]
    rows = {}
    for t in tables(lines, i0, i1):
        if t["header"][:2] == ["#", "Timecode"]:
            for r, ln in zip(t["rows"], t["row_lines"]):
                a, b = [x.strip() for x in r[1].split("–")]
                rows[r[0]] = {"id": r[0], "start_ms": ms_of_mmss(a), "end_ms": ms_of_mmss(b),
                              "dur_s": int(r[2].rstrip("s")), "core": "✅" in r[3], "act": r[4], "title_en": r[5],
                              "line": ln}
    text = "\n".join(lines[i0:i1])
    acts = []
    m = re.search(r"Acts are: (.+?)\.\s*$", text, re.M)
    if m:
        for part in m.group(1).split(" · "):
            mm = re.match(r"(.+?) \((?:CH-)?(\d\d)[–-](\d\d)\)", part.strip())
            if mm:
                acts.append({"act": mm.group(1), "chapters": [f"CH-{k:02d}" for k in range(int(mm.group(2)), int(mm.group(3)) + 1)]})
    hdr = {}
    for k, rx in (("master", r"Master cut — (\d+) : (\d\d) · (\d+) chapters"), ("core", r"Core cut — (\d+) : (\d\d) · (\d+) chapters")):
        m = re.search(rx, text)
        if m:
            hdr[k] = {"runtime_ms": (int(m.group(1)) * 60 + int(m.group(2))) * 1000, "chapters": int(m.group(3))}
    return rows, acts, hdr


def parse_chapters(lines, sec, issues):
    """§8 storyboard -> list of chapter dicts (37) with 200 shots."""
    _, i0, i1 = sec["8"]
    rt, acts, hdr = parse_runtime_map(lines, sec)
    chapters = []
    for title, j0, j1 in split_sections(lines, 3, i0 + 1, i1):
        m = re.match(r"(CH-\d\d) · (.*)", title)
        if not m:
            continue
        cid, ttl = m.group(1), m.group(2).strip()
        block = lines[j0:j1]
        ch = {"id": cid, "title_en": ttl, "line": j0 + 1}
        for k, ln in enumerate(block):
            gl = j0 + k + 1
            mt = re.match(r"^`(\d+:\d\d) – (\d+:\d\d)` · \*\*(\d+) s\*\* · (Core ✅|—) · Act: (.+)$", ln)
            if mt:
                ch.update(start_ms=ms_of_mmss(mt.group(1)), end_ms=ms_of_mmss(mt.group(2)),
                          dur_s=int(mt.group(3)), core=mt.group(4).startswith("Core"), act=mt.group(5).strip())
            elif ln.startswith("**Teaches:**"):
                ch["teaches"] = strip_md(ln[len("**Teaches:**"):])
            elif ln.startswith("**Patterns:**"):
                raw = ln[len("**Patterns:**"):].strip()
                ch["patterns_raw"] = raw
                ch["patterns"] = sorted({f"P{x}" for x in PAT_RX.findall(raw)})
                ch["patterns_all"] = raw.lower().startswith("all of them")
                ch["pattern_notes"] = {f"P{p}": n for p, n in re.findall(r"P(\d\d) \(([^)]*)\)", raw)}
            elif ln.startswith("**On-screen labels — EN:**"):
                ch["labels_en"], ch["labels_en_note"] = _label_list(ln.split(":**", 1)[1])
            elif ln.startswith("**On-screen labels — AR:**"):
                ch["labels_ar"], ch["labels_ar_note"] = _label_list(ln.split(":**", 1)[1])
            elif ln.startswith("**Prediction:**"):
                parts = re.split(r"\*\*(Prediction|Failure beat|Callback|Artifact):\*\*", ln)
                kv = {parts[x]: parts[x + 1].strip() for x in range(1, len(parts) - 1, 2)}
                ch["prediction"] = strip_md(kv.get("Prediction", "")) or None
                ch["failure_beat"] = strip_md(kv.get("Failure beat", "")) or None
                ch["callback"] = strip_md(kv.get("Callback", "")) or None
                ch["artifact"] = strip_md(kv.get("Artifact", "")) or None
                ch["callback_refs"] = [c for c in chapter_ranges(kv.get("Callback", "")) if c != cid]
                ch["outcome_line"] = gl
        # narration blocks
        for lang, head in (("en", "**Narration — English**"), ("ar", "**Narration — Egyptian Arabic**")):
            txt, ln_no = [], None
            for k, ln in enumerate(block):
                if ln.strip() == head:
                    for q in range(k + 1, len(block)):
                        b = block[q]
                        if b.startswith(">"):
                            ln_no = ln_no or j0 + q + 1
                            txt.append(b[1:].strip())
                        elif txt and not b.strip():
                            break
                        elif txt:
                            break
                    break
            ch[f"narration_{lang}"] = " ".join(t for t in txt if t)
            ch[f"narration_{lang}_plain"] = plain_text(ch[f"narration_{lang}"])
            ch[f"narration_{lang}_line"] = ln_no
            ch[f"narration_{lang}_words"] = len(ch[f"narration_{lang}"].split())
        # shots
        shots = []
        for t in tables(lines, j0, j1):
            if [h.lower() for h in t["header"][:4]] == ["t", "beat", "on screen", "motion"]:
                for n, (r, ln) in enumerate(zip(t["rows"], t["row_lines"]), 1):
                    a, b = [x.strip() for x in re.split(r"[–-]", r[0], maxsplit=1)]
                    on = r[2]
                    shots.append({"id": f"{cid}-S{n:02d}", "n": n, "t_from": a, "t_to": b,
                                  "t_from_ms": ms_of_mmss(a), "t_to_ms": ms_of_mmss(b), "beat": strip_md(r[1]),
                                  "on_screen": on, "on_screen_terms": code_spans(on),
                                  "on_screen_numbers": [x["text"] for x in numbers_in(CODE_RX.sub(lambda mm: mm.group(0), on))],
                                  "motion": r[3], "patterns": sorted({f"P{x}" for x in PAT_RX.findall(r[3] + " " + on)}),
                                  "line": ln})
        ch["shots"] = shots
        # timing checks
        rtr = rt.get(cid)
        ch["runtime_map_line"] = rtr["line"] if rtr else None
        if rtr:
            for k in ("start_ms", "end_ms", "dur_s", "core", "act", "title_en"):
                if rtr.get(k) != ch.get(k):
                    issues.append(dict(kind="runtime_map_mismatch", where=f"§7 vs §8 {cid}", field=k,
                                       detail=f"§7 says {rtr.get(k)!r}, §8 header says {ch.get(k)!r}", refs=[cid]))
        if ch.get("end_ms") is not None and ch["end_ms"] - ch["start_ms"] != ch["dur_s"] * 1000:
            issues.append(dict(kind="duration_mismatch", where=f"§8 {cid}", detail=f"end-start={(ch['end_ms']-ch['start_ms'])//1000}s, dur={ch['dur_s']}s", refs=[cid]))
        if shots:
            if shots[-1]["t_to_ms"] != ch.get("dur_s", 0) * 1000:
                issues.append(dict(kind="shotlist_length_mismatch", where=f"§8 {cid} shot list",
                                   detail=f"last shot ends {shots[-1]['t_to']} but chapter is {ch.get('dur_s')} s", refs=[cid]))
            for a, b in zip(shots, shots[1:]):
                if a["t_to_ms"] != b["t_from_ms"]:
                    issues.append(dict(kind="shot_gap_or_overlap", where=f"§8 {a['id']}→{b['id']}",
                                       detail=f"{a['t_to']} vs {b['t_from']}", refs=[cid]))
        chapters.append(ch)
    # cross-chapter checks
    for c in chapters:
        art = (c.get("artifact") or "").lower()
        c["artifact_none"] = art.startswith("none")
        if c["artifact_none"]:
            issues.append(dict(kind="artifact_none", where=f"§8 {c['id']} line {c.get('outcome_line')}",
                               detail=f"Artifact: {c['artifact']!r} while §15 requires a named artifact for every chapter",
                               refs=[c["id"], "§15"]))
        pred = (c.get("prediction") or "").lower()
        c["prediction_none"] = pred.startswith("none")
        if c["prediction_none"]:
            issues.append(dict(kind="prediction_none", where=f"§8 {c['id']} line {c.get('outcome_line')}",
                               detail="Prediction: none (§15 needs >= 1 prediction per act; checked per act below)", refs=[c["id"]]))
        if not c["patterns"] and not c["patterns_all"]:
            issues.append(dict(kind="no_patterns", where=f"§8 {c['id']}", detail="no pattern declared", refs=[c["id"]]))
        le, la = len(c.get("labels_en") or []), len(c.get("labels_ar") or [])
        if le != la:
            issues.append(dict(kind="label_count_mismatch", where=f"§8 {c['id']} on-screen labels",
                               detail=f"EN has {le} labels, AR has {la} (both cuts must show the same frames, §0.3)",
                               refs=[c["id"]]))
    # act-level prediction check (§15: at least one prediction prompt per act)
    by_act = {}
    for c in chapters:
        by_act.setdefault(c.get("act"), []).append(c)
    for act, cs in by_act.items():
        if all(c["prediction_none"] for c in cs):
            issues.append(dict(kind="act_without_prediction", where=f"Act {act}",
                               detail=f"no prediction in {', '.join(c['id'] for c in cs)}", refs=[c["id"] for c in cs]))
    # act names in §7 table vs the 'Act rhythm' sentence
    rhythm = {ch for a in acts for ch in a["chapters"]}
    names_tbl = sorted({c.get("act") for c in chapters})
    names_rhythm = [a["act"] for a in acts]
    if set(names_tbl) != set(names_rhythm):
        issues.append(dict(kind="act_names_differ", where="§7 table 'Act' column vs §7 'Act rhythm' sentence",
                           detail=f"table acts {names_tbl} ({len(names_tbl)}); rhythm acts {names_rhythm} ({len(names_rhythm)})",
                           refs=["§7"]))
    tot = sum(c["dur_s"] for c in chapters)
    core = [c for c in chapters if c.get("core")]
    core_tot = sum(c["dur_s"] for c in core)
    totals = {"chapters": len(chapters), "shots": sum(len(c["shots"]) for c in chapters), "runtime_s": tot,
              "core_chapters": len(core), "core_runtime_s": core_tot, "stated": hdr, "acts_rhythm": acts,
              "narration_words_en": sum(c["narration_en_words"] for c in chapters),
              "narration_words_ar": sum(c["narration_ar_words"] for c in chapters)}
    for k, n, s in (("master", len(chapters), tot), ("core", len(core), core_tot)):
        st = hdr.get(k)
        if st and (st["chapters"] != n or st["runtime_ms"] != s * 1000):
            issues.append(dict(kind="runtime_total_mismatch", where=f"§7 {k} cut",
                               detail=f"stated {st['chapters']} ch / {st['runtime_ms']//1000}s; computed {n} ch / {s}s", refs=["§7"]))
    _ = rhythm
    return chapters, totals


def parse_patterns(lines, sec):
    _, i0, i1 = sec["2"]
    out = []
    for title, j0, j1 in split_sections(lines, 3, i0 + 1, i1):
        m = re.match(r"(P\d\d) · (.*)", title)
        if not m:
            continue
        body = [ln for ln in lines[j0 + 1:j1] if ln.strip() != "---"]
        text = "\n".join(body).strip()
        first = next((ln for ln in body if ln.strip() and not ln.startswith(("|", "```"))), "")
        rec = {"id": m.group(1), "title": m.group(2).strip(), "definition": strip_md(first), "text": text,
               "rules": [strip_md(x) for x in re.findall(r"(?:^|\n)\s*(?:\*\*)?(?:Rule|The test)(?::\*\*|\*\*:|:)\s*(.+)", text)],
               "used_for": [], "line": j0 + 1}
        for x in re.findall(r"Used (?:for|everywhere data physically moves|in)[^:]*:\s*(.+?)(?:\.\s|\.$|$)", text, re.M):
            rec["used_for"] += [strip_md(y).strip(" .") for y in re.split(r",\s*", x) if y.strip()]
        if "Permitted:" in text:
            rec["permitted"] = [y.strip(" .") for y in re.search(r"Permitted:\s*(.+)", text).group(1).split(",")]
            rec["forbidden"] = [y.strip(" .") for y in re.search(r"Forbidden:\s*(.+)", text).group(1).split(",")]
        for t in tables(lines, j0, j1):
            rec["table"] = {"header": t["header"], "rows": t["rows"]}
        code = re.findall(r"```\n(.*?)\n```", text, re.S)
        if code:
            rec["diagram"] = code[0]
        # P03 / P04 list lines (state items / parameters)
        lists = [ln for ln in body if " · " in ln and not ln.startswith("|")]
        if lists:
            rec["items"] = [strip_md(x).strip(" .") for x in lists[0].split(" · ")]
        out.append(rec)
    return out


def parse_motion(lines, sec):
    _, i0, i1 = sec["3"]
    moves = []
    for t in tables(lines, i0, i1):
        for r, ln in zip(t["rows"], t["row_lines"]):
            d = r[1]
            m = re.match(r"([\d.]+)\s*(ms|s)", d)
            ms = None
            if m:
                ms = int(round(float(m.group(1)) * (1000 if m.group(2) == "s" else 1)))
            moves.append({"move": r[0], "duration": d, "duration_ms": ms, "loop": "loop" in d, "use": r[2], "line": ln})
    text = "\n".join(lines[i0 + 1:i1])
    rules = [strip_md(p) for p in re.split(r"\n\s*\n", text) if p.strip().startswith("**")]
    rng = re.search(r"Explanatory transitions: (\d+)–(\d+) ms", text)
    return {"moves": moves, "rules": rules,
            "explanatory_range_ms": [int(rng.group(1)), int(rng.group(2))] if rng else None,
            "parameter_feedback_max_ms": 400}


def parse_scene_contract(lines, sec):
    _, i0, i1 = sec["4"]
    text = "\n".join(lines[i0 + 1:i1])
    code = re.findall(r"```\n(.*?)\n```", text, re.S)
    beats = []
    if code:
        for ln in code[0].splitlines():
            m = re.match(r"\s*(\d+) (.+)", ln)
            if m:
                beats.append({"n": int(m.group(1)), "beat": m.group(2).strip()})
    example = []
    for t in tables(lines, i0, i1):
        for r, ln in zip(t["rows"], t["row_lines"]):
            example.append({"beat": r[0], "on_screen": r[1], "numbers": [x["text"] for x in numbers_in(r[1])], "line": ln})
    rules = [strip_md(p) for p in re.split(r"\n\s*\n", text) if p.strip().startswith("**On-screen")]
    return {"beats": beats, "worked_example": {"topic": "indexes", "rows": example}, "rules": rules, "line": i0 + 1}


def parse_assets(lines, sec):
    _, i0, i1 = sec["9"]
    assets = []
    for t in tables(lines, i0, i1):
        if t["header"][0] == "ID":
            for r, ln in zip(t["rows"], t["row_lines"]):
                aid = strip_md(r[0])
                assets.append({"id": aid, "asset": r[1], "built_in": chapters_in(r[2]), "built_in_raw": r[2],
                               "returns_in": chapter_ranges(r[3]), "returns_in_raw": r[3], "note": r[4],
                               "is_3d": "(3D)" in r[1], "line": ln})
    s91 = sec.get("9.1")
    scenes3d = []
    if s91:
        _, j0, j1 = s91
        body = "\n".join(lines[j0 + 1:j1])
        first = next(ln for ln in body.splitlines() if ln.strip())
        for part in first.split(" · "):
            part = part.strip().rstrip(".")
            chs = []
            for c in code_spans(part):
                chs += [f"CH-{x}" for x in re.findall(r"(\d\d)", c)]
            what = CODE_RX.sub("", part).strip()
            optional = what.lower().startswith("optional")
            if optional:
                what = what.split(":", 1)[1].strip()
            scenes3d.append({"n": len(scenes3d) + 1, "chapters": chs, "scene": what, "optional": optional})
        rules = [ln.strip() for ln in body.splitlines()[1:] if ln.strip()]
    else:
        rules = []
    return {"assets": assets, "permitted_3d": scenes3d, "rules_3d": rules}


def parse_glossary(lines, sec, chapters):
    g = {"rule": None, "first_mention_gloss": [], "always_english": [], "pronunciation": [], "register_ar": None,
         "register_en": None}
    _, i0, i1 = sec["10.1"]
    body = [ln for ln in lines[i0 + 1:i1] if ln.strip()]
    g["rule"] = strip_md(body[0]) if body else None
    for t in tables(lines, i0, i1):
        for r, ln in zip(t["rows"], t["row_lines"]):
            g["first_mention_gloss"].append({"term": r[0], "gloss_ar": r[1], "line": ln})
    _, i0, i1 = sec["10.2"]
    txt = " ".join(ln.strip() for ln in lines[i0 + 1:i1] if ln.strip()).rstrip(".")
    g["always_english"] = [x.strip() for x in txt.split(" · ") if x.strip()]
    _, i0, i1 = sec["10.3"]
    for t in tables(lines, i0, i1):
        for r, ln in zip(t["rows"], t["row_lines"]):
            m = re.match(r"(.*?)\s*\((first mention: .*)\)\s*$", r[1])
            g["pronunciation"].append({"term": r[0], "say_ar": m.group(1) if m else r[1],
                                       "note": m.group(2) if m else None, "line": ln})
    for key, s in (("register_ar", "10.4"), ("register_en", "10.5")):
        _, i0, i1 = sec[s]
        g[key] = strip_md(" ".join(ln.strip() for ln in lines[i0 + 1:i1] if ln.strip() and ln.strip() != "---"))
    # never-translate list from §0.3
    _, i0, i1 = sec["0.3"]
    for ln in lines[i0:i1]:
        if ln.startswith("Never translate:"):
            body_nt = ln.split(":", 1)[1].split(". ", 1)
            g["never_translate"] = [x.strip(" .") for x in re.split(r",\s*(?:or\s+)?", body_nt[0]) if x.strip(" .")]
            g["never_translate_rule"] = body_nt[1].strip() if len(body_nt) > 1 else None
    # term chips harvested from §8 backticks (labels, shot list, narration-free fields)
    harvest = {}
    for c in chapters:
        srcs = [("shot", s["on_screen"]) for s in c["shots"]] + [("label_en", "`" + "` `".join(c.get("labels_en") or []) + "`"),
                                                                ("label_ar", "`" + "` `".join(c.get("labels_ar") or []) + "`"),
                                                                ("outcome", " ".join(str(c.get(k) or "") for k in ("prediction", "failure_beat", "callback", "artifact")))]
        for where, s in srcs:
            for term in code_spans(s):
                term = term.strip()
                if not term:
                    continue
                h = harvest.setdefault(term, {"term": term, "chapters": set(), "count": 0, "where": set()})
                h["chapters"].add(c["id"])
                h["count"] += 1
                h["where"].add(where)
    terms = []
    for t in sorted(harvest.values(), key=lambda x: (-x["count"], x["term"])):
        s = t["term"]
        if re.search(r"[؀-ۿ]", s):
            kind = "label_ar"
        elif re.fullmatch(r"[\d\s.,:/%→−+×=€-]+", s):
            kind = "number"
        elif re.search(r"[(){}=<>;*]|^\w+\(|\bSELECT\b|\bWHERE\b|\.py\b|/", s):
            kind = "code"
        elif len(s.split()) <= 3:
            kind = "term"
        else:
            kind = "label_en"
        terms.append({"term": s, "kind": kind, "count": t["count"], "chapters": sorted(t["chapters"]),
                      "where": sorted(t["where"])})
    g["term_chips"] = terms
    # one priority-ordered term list (consumers: ASR prompt in dclib/scripts.py, graph Concept seeds)
    ordered, seen = [], set()

    def add(term, kind, src):
        k = term.strip().lower()
        if term.strip() and k not in seen:
            seen.add(k)
            ordered.append({"term": term.strip(), "kind": kind, "source": src})
    for r in g["first_mention_gloss"]:
        for part in r["term"].split(" / "):
            add(part, "glossed", "§10.1")
    for t in g["always_english"]:
        for part in t.split(" / "):
            add(part, "always_english", "§10.2")
    for r in g["pronunciation"]:
        add(r["term"], "acronym", "§10.3")
    for t in terms:
        if t["kind"] in ("term", "code"):
            add(t["term"], "chip_" + t["kind"], "§8")
    g["terms"] = ordered
    return g


def _split_topics(s):
    out, buf, depth = [], [], 0
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            out.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    if "".join(buf).strip():
        out.append("".join(buf).strip())
    return [x for x in out if x]


def parse_coverage(lines, sec, issues):
    res = {"domains": [], "gaps": [], "primers": []}
    _, i0, i1 = sec["12.1"]
    for t in tables(lines, i0, i1):
        for r, ln in zip(t["rows"], t["row_lines"]):
            res["domains"].append({"domain": strip_md(r[0]), "topics": _split_topics(r[1]), "chapters": chapter_ranges(r[2]),
                                   "chapters_raw": r[2], "line": ln})
    title, i0, i1 = sec["12.2"]
    for t in tables(lines, i0, i1):
        for r, ln in zip(t["rows"], t["row_lines"]):
            res["gaps"].append({"gap": r[0], "closed_in": chapters_in(r[1]), "closed_in_raw": r[1], "line": ln})
    m = re.search(r"The (\w+) gaps", title)
    words = {"seven": 7, "eight": 8, "nine": 9, "ten": 10}
    if m and words.get(m.group(1)) != len(res["gaps"]):
        issues.append(dict(kind="count_mismatch", where="§12.2 heading", detail=f"heading says '{m.group(1)} gaps' but the table has {len(res['gaps'])} rows", refs=["§12.2"]))
    title, i0, i1 = sec["12.3"]
    body = " ".join(ln for ln in lines[i0 + 1:i1] if ln.strip().startswith("`"))
    for m2 in re.finditer(r"`([^`]+)`\s*((?:CH-\d\d(?:,\s*)?)+)", body):
        res["primers"].append({"q": m2.group(1), "chapters": chapters_in(m2.group(2))})
    m = re.search(r"The (\d+) beginner primers", title)
    if m and int(m.group(1)) != len(res["primers"]):
        issues.append(dict(kind="count_mismatch", where="§12.3 heading", detail=f"heading says {m.group(1)} primers but {len(res['primers'])} are listed", refs=["§12.3"]))
    res["stated"] = {"gaps": 7, "primers": int(m.group(1)) if m else None}
    return res


SEC_CH = re.compile(r"— ((?:CH-\d\d(?:, )?)+)$")


def parse_data_contract(lines, sec, issues):
    facts, sections = [], []
    _, s6_0, s6_1 = sec["6"]
    for title, j0, j1 in split_sections(lines, 3, s6_0 + 1, s6_1):
        m = re.match(r"(6\.\d+) (.*)", title)
        if not m:
            continue
        sid = m.group(1)
        mc = SEC_CH.search(m.group(2))
        sec_ch = chapters_in(mc.group(1)) if mc else []
        stitle = SEC_CH.sub("", m.group(2)).strip()
        sections.append({"section": sid, "title": stitle, "chapters": sec_ch, "line": j0 + 1})
        n = 0
        tbl_lines = set()
        for t in tables(lines, j0, j1):
            tbl_lines.update(range(t["line"], t["row_lines"][-1] + 1 if t["row_lines"] else t["line"] + 1))
            for r, ln in zip(t["rows"], t["row_lines"]):
                n += 1
                nums = numbers_in(" | ".join(r))
                facts.append({"id": f"d:{sid}:{n}", "section": sid, "kind": "table_row", "chapters": sorted(set(sec_ch) | set(chapters_in(" ".join(r)))),
                              "value": [strip_md(x) for x in r], "header": t["header"], "numbers": [x["value"] for x in nums],
                              "unit": "EUR" if "€" in " ".join(r) else None, "context": stitle, "line": ln})
        for k in range(j0 + 1, j1):
            ln = lines[k]
            if (k + 1) in tbl_lines or not ln.strip() or ln.strip() == "---":
                continue
            # spans: bold or code containing a digit -> one fact; remaining plain numbers -> one fact each
            taken = []
            for rx, kind in ((BOLD_RX, "bold"), (CODE_RX, "code")):
                for mm in rx.finditer(ln):
                    if any(a <= mm.start() < b for a, b in taken):
                        continue
                    inner = mm.group(1)
                    nums = numbers_in(inner)
                    if not nums:
                        continue
                    taken.append((mm.start(), mm.end()))
                    n += 1
                    unit = None
                    if len(nums) == 1:
                        x0 = nums[0]
                        unit = guess_unit(inner, x0["pos"], x0["pos"] + len(x0["text"])) or guess_unit(ln, mm.start(), mm.end())
                    if re.fullmatch(r"[\d.]+\s*:\s*1", inner.strip()):
                        unit = "ratio"
                    if "€" in inner or "€" in ln[max(0, mm.start() - 2):mm.start()]:
                        unit = "EUR"
                    elif "%" in inner:
                        unit = "%"
                    elif "EGP" in inner:
                        unit = "EGP"
                    facts.append({"id": f"d:{sid}:{n}", "section": sid, "kind": kind,
                                  "chapters": sorted(set(sec_ch) | set(chapters_in(sentence_around(ln, mm.start(), 400)))),
                                  "value": strip_md(inner), "numbers": [x["value"] for x in nums], "unit": unit,
                                  "context": sentence_around(ln, mm.start()), "line": k + 1})
            for x in numbers_in(ln):
                if any(a <= x["pos"] < b for a, b in taken):
                    continue
                n += 1
                end = x["pos"] + len(x["text"])
                facts.append({"id": f"d:{sid}:{n}", "section": sid, "kind": "plain",
                              "chapters": sorted(set(sec_ch) | set(chapters_in(sentence_around(ln, x["pos"], 400)))),
                              "value": x["text"], "numbers": [x["value"]], "unit": guess_unit(ln, x["pos"], end),
                              "context": sentence_around(ln, x["pos"]), "line": k + 1})
    # §5.2 receipts T1..T6 + stated derived figures
    _, i0, i1 = sec["5.2"]
    rec = []
    n = 0
    for t in tables(lines, i0, i1):
        for r, ln in zip(t["rows"], t["row_lines"]):
            n += 1
            rec.append({"id": r[0], "operator": r[1], "amount_egp": int(r[2]), "status": r[3]})
            facts.append({"id": f"d:5.2:{n}", "section": "5.2", "kind": "table_row", "chapters": ["CH-00", "CH-27"],
                          "value": r, "header": t["header"], "numbers": [int(r[2])], "unit": "EGP",
                          "context": f"NilePay receipt {r[0]}", "line": ln})
    for k in range(i0 + 1, i1):
        ln = lines[k]
        if ln.startswith("Success rate"):
            for mm in BOLD_RX.finditer(ln):
                n += 1
                nums = numbers_in(mm.group(1))
                facts.append({"id": f"d:5.2:{n}", "section": "5.2", "kind": "bold", "chapters": ["CH-00", "CH-27"],
                              "value": mm.group(1), "numbers": [x["value"] for x in nums],
                              "unit": "%" if "%" in mm.group(1) else "EGP", "context": sentence_around(ln, mm.start()),
                              "line": k + 1})
    # derived figures, recomputed (arithmetic only; never measurements)
    ok = [r for r in rec if r["status"] == "OK"]
    derived = {
        "success_rate_pct": round(100 * len(ok) / len(rec), 2) if rec else None,
        "successful_total_egp": sum(r["amount_egp"] for r in ok),
        "operator_ok_totals_egp": {op: sum(r["amount_egp"] for r in ok if r["operator"] == op) for op in sorted({r["operator"] for r in rec})},
        "operator_all_totals_egp": {op: sum(r["amount_egp"] for r in rec if r["operator"] == op) for op in sorted({r["operator"] for r in rec})},
    }
    checks = [
        _chk("§5.2 success rate", "4 / 6", derived["success_rate_pct"], 66.67),
        _chk("§5.2 successful total", "sum(amount where OK)", derived["successful_total_egp"], 400),
        _chk("§5.2 operator A (OK only)", "sum A OK", derived["operator_ok_totals_egp"].get("A"), 250),
        _chk("§5.2 operator B (OK only)", "sum B OK", derived["operator_ok_totals_egp"].get("B"), 150),
        _chk("§6.3/§6.21 gold + silver", "3098.30 + 850.20", round(3098.30 + 850.20, 2), 3948.50),
        _chk("§6.2/§6.21 blank quantity as zero", "3948.50 - 95.00", round(3948.50 - 95.00, 2), 3853.50),
        _chk("§6.4 fan-out rows", "4+3+4+2+1+1", 4 + 3 + 4 + 2 + 1 + 1, 15),
        _chk("§6.20 binary search", "log2(16)", 4, 4),
        _chk("§6.10 transposition", "-36 % 9 == 0", (-36) % 9 == 0, True),
        _chk("§6.3 funnel JOIN", "14 - 1 (order 1007)", 14 - 1, 13),
        _chk("§6.3 funnel WHERE", "13 - 2 (1004 cancelled, 1010 refunded)", 13 - 2, 11),
        _chk("§6.17 attention heads", "d_model 8 = 2 heads x d_head 4", 2 * 4, 8),
    ]
    if derived["operator_all_totals_egp"].get("B") != derived["operator_ok_totals_egp"].get("B"):
        issues.append(dict(kind="ambiguous_label", where="§5.2 'Operator totals: A = 250, B = 150'",
                           detail=(f"the figures are OK-only totals; all-status totals are A = {derived['operator_all_totals_egp'].get('A')}, "
                                   f"B = {derived['operator_all_totals_egp'].get('B')}. Label on screen must say 'successful'."),
                           refs=["§5.2", "§6.19", "CH-00", "CH-27"]))
    for c in checks:
        if not c["ok"]:
            issues.append(dict(kind="arithmetic_check_failed", where=c["what"], detail=f"{c['expr']} = {c['computed']} vs stated {c['stated']}", refs=["§6"]))
    return {"sections": sections, "facts": facts, "receipts": rec, "derived": derived, "checks": checks}


def _chk(what, expr, computed, stated):
    ok = (abs(computed - stated) < 1e-9) if isinstance(computed, (int, float)) and not isinstance(computed, bool) else computed == stated
    return {"what": what, "expr": expr, "computed": computed, "stated": stated, "ok": bool(ok)}


def parse_spec(lines, sec):
    out = {}
    for key, s in (("format", "1.1"), ("typography", "1.2"), ("colour_tokens", "1.3")):
        _, i0, i1 = sec[s]
        rows = []
        for t in tables(lines, i0, i1):
            for r, ln in zip(t["rows"], t["row_lines"]):
                rows.append(dict(zip([h.strip("`").lower().replace(" ", "_").replace("—", "").strip("_") or f"c{i}" for i, h in enumerate(t["header"])],
                                     [x.strip("`") for x in r]), line=ln))
        out[key] = rows
    _, i0, i1 = sec["1.4"]
    out["rendering_both_cuts"] = strip_md(" ".join(ln.strip() for ln in lines[i0 + 1:i1] if ln.strip() and ln.strip() != "---"))
    _, i0, i1 = sec["0.3"]
    out["language_layers"] = [dict(zip(["layer", "en", "ar"], r)) for t in tables(lines, i0, i1) for r in t["rows"]]
    _, i0, i1 = sec["11"]
    out["captions_accessibility"] = [strip_md(re.sub(r"^\d+\.\s*", "", ln.strip())) for ln in lines[i0 + 1:i1] if re.match(r"\d+\. ", ln.strip())]
    _, i0, i1 = sec["15"]
    qa, cur = {}, None
    for ln in lines[i0 + 1:i1]:
        m = re.match(r"\*\*(\w+)\*\*$", ln.strip())
        if m:
            cur = m.group(1).lower()
            qa[cur] = []
        elif ln.strip().startswith("- [ ]") and cur:
            qa[cur].append(strip_md(ln.strip()[5:]))
    out["qa_gate_15"] = qa
    _, i0, i1 = sec["13.3"]
    out["honest_limits"] = [strip_md(ln.strip()[2:]) for ln in lines[i0 + 1:i1] if ln.startswith("- ")]
    return out


def parse_master(text):
    """Return ({name: doc}, issues) for every canon output derived from master.md."""
    lines = text.split("\n")
    sec = section_bounds(lines)
    issues = []
    chapters, totals = parse_chapters(lines, sec, issues)
    patterns = parse_patterns(lines, sec)
    usage = {}
    for c in chapters:
        for p in c["patterns"]:
            usage.setdefault(p, []).append(c["id"])
    for p in patterns:
        p["chapters"] = usage.get(p["id"], [])
        p["chapter_count"] = len(p["chapters"])
    unused = [p["id"] for p in patterns if not p["chapters"]]
    if unused:
        issues.append(dict(kind="pattern_unused", where="§2 vs §8", detail=f"declared by no chapter: {unused}", refs=unused))
    assets = parse_assets(lines, sec)
    # P19 permitted list vs §9.1
    p19 = next((p for p in patterns if p["id"] == "P19"), None)
    if p19 and len(p19.get("permitted", [])) != len(assets["permitted_3d"]):
        issues.append(dict(kind="count_mismatch", where="§2 P19 vs §9.1", detail=f"P19 permits {len(p19['permitted'])}, §9.1 lists {len(assets['permitted_3d'])}", refs=["P19", "§9.1"]))
    chs_3d = {c for s in assets["permitted_3d"] for c in s["chapters"]}
    for c in chapters:
        if "P19" in c["patterns"] and c["id"] not in chs_3d:
            issues.append(dict(kind="3d_not_permitted", where=f"§8 {c['id']}", detail="declares P19 but is not in §9.1", refs=[c["id"]]))
    for c in sorted(chs_3d):
        ch = next((x for x in chapters if x["id"] == c), None)
        if ch and "P19" not in ch["patterns"]:
            issues.append(dict(kind="3d_scene_without_p19", where=f"§9.1 {c}", detail=f"§9.1 permits a 3D scene in {c} but its §8 Patterns line does not declare P19 ({ch['patterns_raw']})", refs=[c]))
    docs = {
        "chapters": {"chapters": chapters, "totals": totals},
        "data_contract": parse_data_contract(lines, sec, issues),
        "glossary": parse_glossary(lines, sec, chapters),
        "coverage_index": parse_coverage(lines, sec, issues),
        "assets_registry": assets,
        "patterns": {"patterns": patterns},
        "scene_contract": parse_scene_contract(lines, sec),
        "motion": parse_motion(lines, sec),
        "spec": parse_spec(lines, sec),
    }
    # coverage chapters must exist
    ids = {c["id"] for c in chapters}
    for d in docs["coverage_index"]["domains"]:
        bad = [c for c in d["chapters"] if c not in ids]
        if bad:
            issues.append(dict(kind="unknown_chapter_ref", where=f"§12.1 {d['domain']}", detail=str(bad), refs=bad))
    uncovered = sorted(ids - {c for d in docs["coverage_index"]["domains"] for c in d["chapters"]})
    docs["coverage_index"]["chapters_without_domain"] = uncovered
    return docs, issues
