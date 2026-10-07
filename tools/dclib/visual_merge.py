"""`dc visual merge` (P2.7 merge): caption batches + HUB shots + legacy shots -> corpus/visual/assets.jsonl.

Inputs
  data/derived/visual/images.jsonl, ocr/ocr.jsonl, batches/*.json, captions/batch_NNN.jsonl   (slides, PNG scenes, keyframes)
  corpus/canon/hub_shots.jsonl, hub_items.jsonl (first Mermaid block)                           (HUB screenshots)
  corpus/canon/legacy_shots.jsonl                                                              (parsed scenes_*.py / story.json)
Output
  corpus/visual/assets.jsonl (schema visual_asset), corpus/visual/manifest.json, reports/visual/missing.md

Nothing is dropped silently: a caption line that is not valid JSON is repaired (unescaped inner quotes in string fields) and
listed under "repaired"; a batch whose output file is missing or has fewer lines than its items is listed with the asset ids that
have no caption. Quality 1-5 (visual-librarian scale) is mapped to the contract's 0-3: 5,4 -> 3; 3 -> 2; 2 -> 1; 1 -> 0.
"""
import hashlib
import json
import os
import re

from . import common as C
from . import hub_text
from . import manifest as M
from . import schema

VIS = C.p("data", "derived", "visual")
IMAGES = os.path.join(VIS, "images.jsonl")
OCR = os.path.join(VIS, "ocr", "ocr.jsonl")
BATCH_DIR = os.path.join(VIS, "batches")
OUT = C.p("corpus", "visual", "assets.jsonl")
OUT_DIR = C.p("corpus", "visual")
REPORT = C.p("reports", "visual", "missing.md")
HUB_SHOTS = C.p("corpus", "canon", "hub_shots.jsonl")
HUB_ITEMS = C.p("corpus", "canon", "hub_items.jsonl")
LEGACY = C.p("corpus", "canon", "legacy_shots.jsonl")

QMAP = {5: 3, 4: 3, 3: 2, 2: 1, 1: 0, 0: 0}
REUSE = {"reference", "data", "do-not-use"}
STR_KEYS = ["asset_id", "caption_en", "caption_ar", "concepts", "layout", "text_seen", "numbers_seen", "reusable_idea", "quality",
            "reuse_mode"]
OCR_MAX = 1200
KIND_EN = {
    "chips": "row of status chips", "rows": "table of rows", "reveal": "layered reveal", "split": "before/after split panel",
    "predict": "predict-before-answer card", "counter": "animated counters", "timeline": "timeline with events",
    "code": "code block with annotations", "flow": "architecture flow diagram", "steps": "step-through frames",
    "bars": "bar chart", "matrix": "cell matrix", "terminal": "terminal session", "funnel": "funnel stages", "tree": "node tree",
    "lines": "line chart", "pool": "connection pool and queue", "star": "star schema", "board": "kanban-style board",
    "cube": "OLAP cube", "log": "append-only log partitions", "ledger": "two-ledger reconciliation", "scatter": "scatter with fit line",
    "net": "neural network layers", "quote": "closing quote card", "beat": "storyboard beat (on-screen description + motion)",
}


# ------------------------------------------------------------------ helpers
def _vid(seed):
    return "v:" + hashlib.sha1(seed.encode("utf-8")).hexdigest()[:12]


def _slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")
    return s


def _concepts(items):
    out = []
    for c in items or []:
        c = str(c)
        s = _slug(c[2:] if c.startswith("c:") else c)
        if s and f"c:{s}" not in out:
            out.append(f"c:{s}")
    return out[:8]


def _repair(line):
    """Escape unescaped inner double quotes of string fields in a one-line caption record. Returns dict or None."""
    s = line.strip()
    for i, k in enumerate(STR_KEYS):
        nxt = STR_KEYS[i + 1:]
        if not nxt:
            continue
        pat = re.compile(r'("%s": ")(.*?)(", "(?:%s)": )' % (re.escape(k), "|".join(map(re.escape, nxt))), re.S)

        def fix(m):
            inner = re.sub(r'(?<!\\)"', r'\\"', m.group(2))
            return m.group(1) + inner + m.group(3)

        s = pat.sub(fix, s, count=1)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return None


def _read_captions(path, repaired, bad):
    """Parse one captions file; returns list of dicts. Repaired / unparsable lines are recorded."""
    out = []
    with open(path, encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                d = _repair(line)
                if d is None:
                    bad.append({"file": C.rel(path), "line": n, "head": line[:120]})
                else:
                    m = re.search(r'"asset_id": "(v:[0-9a-f]+)', line)
                    repaired.append({"file": C.rel(path), "line": n, "asset_id": d.get("asset_id") or (m.group(1) if m else "?")})
                    out.append(d)
    return out


def _short_strings(obj, cap=14, maxlen=48):
    """Strings shown on screen in a legacy data blob (depth-first, order kept, de-duplicated)."""
    seen, out = set(), []

    def walk(x, key=""):
        if len(out) >= 400:
            return
        if isinstance(x, str):
            t = x.strip()
            if t and len(t) <= 160 and not t.startswith("@") and key not in ("color", "mode", "fmt", "via", "asset") and t not in seen:
                seen.add(t)
                out.append(t)
        elif isinstance(x, dict):
            for k, v in x.items():
                walk(v, k)
        elif isinstance(x, list):
            for v in x:
                walk(v, key)

    walk(obj)
    return out


def _quality(q):
    try:
        return QMAP.get(int(q), 1)
    except (TypeError, ValueError):
        return 1


# ------------------------------------------------------------------ sources
def _vision_assets(report):
    images = {r["asset_id"]: r for r in C.read_jsonl(IMAGES)}
    ocr = {r["asset_id"]: r for r in C.read_jsonl(OCR)} if os.path.exists(OCR) else {}
    index = C.read_json(os.path.join(BATCH_DIR, "index.json"), {})
    batches = index.get("batches") or sorted(
        C.rel(os.path.join(BATCH_DIR, f)) for f in os.listdir(BATCH_DIR) if re.match(r"batch_\d{3}\.json$", f))
    caps, seen_in, repaired, bad = {}, {}, [], []
    batch_rows = []
    for bp in batches:
        b = C.read_json(C.p(bp))
        out_path = C.p(b["output"])
        item_ids = [it["asset_id"] for it in b["items"]]
        row = {"batch": b["batch"], "items": len(item_ids), "output": b["output"], "lines": 0, "parsed": 0, "missing_ids": []}
        if not os.path.exists(out_path):
            row["status"] = "output missing"
            row["missing_ids"] = item_ids
            batch_rows.append(row)
            continue
        with open(out_path, encoding="utf-8") as f:
            row["lines"] = sum(1 for ln in f if ln.strip())
        recs = _read_captions(out_path, repaired, bad)
        row["parsed"] = len(recs)
        got = set()
        for d in recs:
            aid = d.get("asset_id")
            if not aid:
                continue
            got.add(aid)
            if aid in caps:
                report["duplicate_caption_ids"].append(aid)
            caps[aid] = d
            seen_in[aid] = b["batch"]
        row["missing_ids"] = [i for i in item_ids if i not in got]
        row["foreign_ids"] = sorted(got - set(item_ids))
        row["status"] = "ok" if not row["missing_ids"] and row["lines"] >= row["items"] else "short"
        batch_rows.append(row)
    report["batches"] = batch_rows
    report["repaired"] = repaired
    report["unparsable"] = bad
    out = []
    for aid, it in images.items():
        d = caps.get(aid)
        o = ocr.get(aid, {})
        if d is None:
            report["uncaptioned"].append(aid)
            continue
        rm = d.get("reuse_mode") if d.get("reuse_mode") in REUSE else "reference"
        rec = {"v": 1, "asset_id": aid, "file_id": it["file_id"], "kind": it["kind"], "source": it["source"], "t_ms": it.get("t_ms"),
               "caption_en": str(d.get("caption_en", "")), "caption_ar": str(d.get("caption_ar", "")),
               "ocr": (o.get("text") or "")[:OCR_MAX], "concepts": _concepts(d.get("concepts")), "layout": str(d.get("layout", "")),
               "reusable_idea": str(d.get("reusable_idea", "")), "reuse_mode": rm, "quality": _quality(d.get("quality")),
               "path": it["path"], "text_seen": str(d.get("text_seen", "")), "numbers_seen": [str(x) for x in d.get("numbers_seen") or []],
               "caption_src": "vision"}
        if o.get("mean_conf") is not None:
            rec["ocr_conf"] = o["mean_conf"]
        if it.get("chapter"):
            rec["chapter"] = it["chapter"]
        if it.get("part"):
            rec["part"] = it["part"]
        out.append(rec)
    report["images"] = len(images)
    report["no_ocr"] = [a for a in images if a not in ocr]
    return out


def _hub_assets():
    if not os.path.exists(HUB_SHOTS):
        return []
    out, build_file = [], {}
    for r in C.read_jsonl(HUB_SHOTS):
        build_file[r["build"]] = r["build_file_id"]
        title = hub_text.squash(r.get("section_title", ""))
        dom = hub_text.squash(r.get("dom_text_excerpt", ""))
        cap = f"HUB build '{r['build']}' screen {r['n']}: {title}."
        if dom:
            cap += " Visible text: " + dom[:220]
        out.append({"v": 1, "asset_id": r["asset_id"], "file_id": r["build_file_id"], "kind": "hub_section", "source": f"hub:{r['build']}",
                    "t_ms": None, "caption_en": cap, "caption_ar": "", "ocr": dom[:OCR_MAX],
                    "concepts": _concepts(hub_text.concepts_guess(title, dom)), "layout": f"{r.get('width', 0)}x{r.get('height', 0)} app screen",
                    "reusable_idea": f"Interactive lab/lesson state '{title}' as a reference for an explainer component.",
                    "reuse_mode": "reference", "quality": 2, "path": r["path"], "caption_src": "dom-text"})
    if os.path.exists(HUB_ITEMS):
        for it in C.read_jsonl(HUB_ITEMS):
            if it["kind"] == "mermaid" and it.get("text") and not it.get("dup_of") and it["build"] in build_file:
                out.append({"v": 1, "asset_id": _vid(it["item_id"]), "file_id": build_file[it["build"]], "kind": "mermaid",
                            "source": f"hub:{it['build']}", "t_ms": None, "caption_en": f"Mermaid diagram: {it['title']}. Source: {it['text']}",
                            "caption_ar": "", "ocr": it["text"][:OCR_MAX], "concepts": _concepts(it.get("concepts_guess")),
                            "layout": "mermaid flowchart", "reusable_idea": "Linear pipeline as boxes and arrows.",
                            "reuse_mode": "data", "quality": 2, "caption_src": "source-text"})
    return out


def _legacy_assets():
    if not os.path.exists(LEGACY):
        return []
    out = []
    for r in C.read_jsonl(LEGACY):
        data = r.get("data") or {}
        strs = _short_strings(data)
        kind_en = KIND_EN.get(r["kind"], r["kind"])
        title = r.get("title", "")
        latin = [s for s in strs if re.search(r"[A-Za-z0-9]", s) and len(s) <= 48][:8]
        beat = r["kind"] == "beat"
        if beat:
            cap = f"Storyboard beat of an earlier cut ({r['source']} {r['chapter']} #{r['i']}): {data.get('onscreen', '')} Motion: {data.get('motion', '')}"
            idea = "On-screen description and motion of one beat; reuse the idea, not the pixels."
        else:
            cap = f"Legacy '{r['kind']}' shot ({kind_en}), {r['source']} {r['chapter']} #{r['i']}: {title}."
            if latin:
                cap += " Shows: " + "; ".join(latin) + "."
            idea = f"{kind_en.capitalize()} built from data fields {', '.join(list(data)[:6])}; rebuild as a component, never reuse legacy pixels."
        txt = " | ".join(strs)[:OCR_MAX]
        ar = title if re.search("[؀-ۿ]", title) else ""
        out.append({"v": 1, "asset_id": _vid(r["id"]), "file_id": (r.get("src") or {}).get("file_id") or "f:000000000000", "kind": "legacy_shot",
                    "source": f"legacy:{r['source']}:{r['chapter']}", "t_ms": None, "caption_en": cap[:900], "caption_ar": ar,
                    "ocr": txt, "concepts": _concepts(hub_text.concepts_guess(title, " ".join(strs))), "layout": r["kind"],
                    "reusable_idea": idea, "reuse_mode": "data", "quality": 2, "chapter": r["chapter"], "legacy_id": r["id"],
                    "caption_src": "legacy-data"})
    return out


# ------------------------------------------------------------------ command
def _inputs():
    paths = [IMAGES, OCR, HUB_SHOTS, HUB_ITEMS, LEGACY]
    for d in (BATCH_DIR, os.path.join(VIS, "captions")):
        if os.path.isdir(d):
            paths += [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith((".json", ".jsonl"))]
    return [{"path": C.rel(x), "sha256": C.sha256_file(x)} for x in paths if os.path.exists(x)]


def cmd_merge(args):
    inputs = _inputs()
    if M.should_skip(OUT_DIR, "merge", inputs, [OUT, REPORT], getattr(args, "force", False)):
        print("visual merge: up to date")
        return 0
    report = {"duplicate_caption_ids": [], "uncaptioned": []}
    vis = _vision_assets(report)
    hub = _hub_assets()
    leg = _legacy_assets()
    merged, seen, collisions = [], {}, []
    for rec in vis + hub + leg:   # vision captions win over derived ones on an id collision
        if rec["asset_id"] in seen:
            collisions.append({"asset_id": rec["asset_id"], "kept": seen[rec["asset_id"]]["kind"], "dropped": rec["kind"]})
            continue
        seen[rec["asset_id"]] = rec
        merged.append(rec)
    errs = []
    for n, rec in enumerate(merged, 1):
        for e in schema.validate(rec, "visual_asset", limit=3):
            errs.append(f"{rec['asset_id']}: {e}")
    if errs:
        C.fail("visual merge: schema errors:\n  " + "\n  ".join(errs[:15]))
    C.write_jsonl(OUT, merged)
    counts = {}
    for r in merged:
        counts[r["kind"]] = counts.get(r["kind"], 0) + 1
    _write_report(report, counts, len(merged), collisions)
    M.write(OUT_DIR, "merge", "dc visual merge", inputs, [C.rel(OUT), C.rel(REPORT)],
            extra={"assets": len(merged), "by_kind": counts, "uncaptioned": len(report["uncaptioned"]),
                   "repaired_lines": len(report["repaired"]), "unparsable_lines": len(report["unparsable"]),
                   "collisions": len(collisions)})
    print(f"visual merge: {len(merged)} assets {counts}; uncaptioned {len(report['uncaptioned'])}, repaired {len(report['repaired'])}, "
          f"unparsable {len(report['unparsable'])}, id collisions {len(collisions)} -> {C.rel(OUT)}")
    return 0


def _write_report(rep, counts, total, collisions):
    short = [b for b in rep["batches"] if b["status"] != "ok"]
    L = ["# Visual assets merge: completeness", "", f"Created {C.now_iso()} by `dc visual merge`.", "",
         f"- listed images (images.jsonl): {rep['images']}; captioned: {rep['images'] - len(rep['uncaptioned'])}; "
         f"with OCR: {rep['images'] - len(rep['no_ocr'])}",
         f"- merged assets: {total}; by kind: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())),
         f"- caption batches: {len(rep['batches'])}; batches with a missing output or fewer lines than items: {len(short)}",
         f"- caption lines repaired (unescaped quotes inside a string): {len(rep['repaired'])}; unparsable even after repair: {len(rep['unparsable'])}",
         f"- images without a caption (not in the merged file): {len(rep['uncaptioned'])}",
         f"- duplicate caption ids across batches (last wins): {len(rep['duplicate_caption_ids'])}",
         f"- asset_id collisions between sources (first kept): {len(collisions)}", ""]
    if short:
        L += ["## Batches that are short or missing", "", "| batch | items | lines | status | asset ids without caption |", "|---|---|---|---|---|"]
        for b in short:
            L.append(f"| {b['batch']} | {b['items']} | {b['lines']} | {b['status']} | {', '.join(b['missing_ids'][:6])}{' ...' if len(b['missing_ids']) > 6 else ''} |")
        L.append("")
    else:
        L += ["## Batches", "", "None: every batch output exists and has at least as many lines as its items.", ""]
    if rep["repaired"]:
        L += ["## Repaired caption lines", "",
              "These lines were invalid JSON (a `\"` inside the `layout` string). The text was kept and the quotes were escaped; nothing was edited.", ""]
        L += [f"- {r['file']}:{r['line']} {r['asset_id']}" for r in rep["repaired"]]
        L.append("")
    if rep["unparsable"]:
        L += ["## Unparsable lines (dropped, need re-captioning)", ""]
        L += [f"- {r['file']}:{r['line']} `{r['head']}`" for r in rep["unparsable"]]
        L.append("")
    if rep["uncaptioned"]:
        L += ["## Images without caption", ""] + [f"- {a}" for a in rep["uncaptioned"]] + [""]
    if collisions:
        L += ["## Id collisions", ""] + [f"- {c['asset_id']}: kept {c['kept']}, dropped {c['dropped']}" for c in collisions] + [""]
    L += ["## Notes", "",
          "- HUB screenshots (`hub_section`) and the Mermaid block carry a text-derived caption (`caption_src` dom-text / source-text), not a vision caption; "
          "legacy shots carry a data-derived caption (`legacy-data`). Only `slide`, `png_scene` and `render_keyframe` records have `caption_src: vision`.",
          "- `quality` is mapped from the librarian's 1-5 scale to the contract's 0-3 (5,4 -> 3; 3 -> 2; 2 -> 1; 1 -> 0). Legacy and HUB records are 2.",
          "- The 2,398 HUB `code` items are not assets; search them through `hub_items.jsonl`.", ""]
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def register_visual(vs):
    s = vs.add_parser("merge", help="captions + HUB shots + legacy shots -> corpus/visual/assets.jsonl (+ reports/visual/missing.md)")
    s.add_argument("--force", action="store_true")
    s.set_defaults(fn="visual_merge.cmd_merge")
