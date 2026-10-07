"""Gate G2 Corpus (docs/plan/06 section 1). Thresholds are never weakened here; only the Council changes them, by ADR.

 - canon files validate: 37 chapters, 200 shots, data-contract facts, glossary, patterns (22)
 - 351 NotebookLM scenes parsed (plus the P00 intro record)
 - cues_70m05 imported (37 chapters, 637 caption cues)
 - 100 % of listed slides, PNG scenes and keyframes captioned and OCR'd (merged into corpus/visual/assets.jsonl, valid, unique ids)
 - those captions are checked against the PIXELS (tools/dclib/visual_audit.py): no "blank / corrupted / illegible" caption on an image with
   ink or text, and every numbers_seen entry is backed by text the caption author recorded (no OCR-noise numbers)
 - canon numbers are faithful: comma thousands are never split ('1,250,000' stays one number) and no markdown table escape (\\|) survives
 - HUB harvest report written and its outputs present (2,207 knowledge sections tiling the file, 79 crash-course steps, 150 shots)
 - every unique md/txt/json/csv/srt/vtt/ass source distilled into chunks, with a retrieval index
 - corpus maps written: each file <= 300 words, every family mapped, built from the current chunks
 - retrieval smoke: 10/10 queries return the expected source in the top 3
"""
import json
import os
import re
import sys

EXPECT = {"chapters": 37, "shots": 200, "patterns": 22, "nblm_scenes": 351, "cue_captions": 637, "cue_chapters": 37,
          "knowledge_sections": 2207, "crash_steps": 79, "hub_shots": 150, "smoke": 10}


def C(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def _jl(path):
    out = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                out.append(json.loads(line))
    return out


def check(ctx):
    sys.path.insert(0, ctx.p("tools"))
    from dclib import distill, schema
    cm = ctx.common
    P = ctx.p
    out = []

    # 1 canon validates + counts
    errs = []
    rules = [r for r in schema.load_rules() if r["glob"].startswith("corpus/canon/")]
    nfiles = 0
    for r in rules:
        pth = P(*r["glob"].split("/"))
        if os.path.exists(pth):
            nfiles += 1
            errs += schema.validate_file(pth, r, limit=3)
        else:
            errs.append(f"{r['glob']}: missing")
    ch = cm.read_json(P("corpus", "canon", "chapters.json"), {}) or {}
    chapters = ch.get("chapters", ch if isinstance(ch, list) else [])
    nshots = sum(len(c.get("shots", [])) for c in chapters)
    dc = cm.read_json(P("corpus", "canon", "data_contract.json"), {}) or {}
    facts = dc.get("facts", [])
    checks_ok = all(c.get("ok") for c in dc.get("checks", [])) if dc.get("checks") else True
    gl = cm.read_json(P("corpus", "canon", "glossary.json"), {}) or {}
    pat = cm.read_json(P("corpus", "canon", "patterns.json"), {}) or {}
    npat = len(pat.get("patterns", pat if isinstance(pat, list) else []))
    out.append(C("canon_validates", not errs and len(chapters) == EXPECT["chapters"] and nshots == EXPECT["shots"] and len(facts) > 0 and checks_ok
                 and bool(gl.get("terms") or gl) and npat == EXPECT["patterns"],
                 f"{nfiles} canon files schema-valid ({len(errs)} errors{': ' + errs[0] if errs else ''}); chapters {len(chapters)}/{EXPECT['chapters']}, "
                 f"shots {nshots}/{EXPECT['shots']}, data-contract facts {len(facts)} (arithmetic checks ok: {checks_ok}), "
                 f"glossary terms {len(gl.get('terms', []))}, patterns {npat}/{EXPECT['patterns']}"))

    # 2 NotebookLM scenes
    sc = _jl(P("corpus", "canon", "nblm_scenes.jsonl")) if os.path.exists(P("corpus", "canon", "nblm_scenes.jsonl")) else []
    real = [s for s in sc if s.get("kind") != "intro"]
    out.append(C("nblm_scenes_parsed", len(real) == EXPECT["nblm_scenes"] or len(sc) == EXPECT["nblm_scenes"] + 1,
                 f"{len(real)} scenes (+{len(sc) - len(real)} intro record); expected {EXPECT['nblm_scenes']}"))

    # 2b canon numbers faithful, no markdown escapes
    comma_rx = re.compile(r"\d{1,3}(?:,\d{3})+")
    split_bad, checked_num = [], 0
    for r in real:
        text = " ".join(str(r.get(k, "")) for k in ("title", "on_screen", "animation", "narration")).translate(
            str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
        nums = [str(n) for n in r.get("numbers", [])]
        checked_num += len(nums)
        stripped = comma_rx.sub(" ", text)          # text without comma-thousands groups
        for g in comma_rx.findall(text):
            for part in g.split(","):
                if part in nums and not re.search(r"(?<![\d,.])" + re.escape(part) + r"(?![\d,])", stripped):
                    split_bad.append(f"{r['scene_id']}:{g}")
        for n in nums:                                # every listed number must come from the scene text
            if n.replace("€", "").replace("$", "") not in text.replace("€", "").replace("$", "") and n not in text:
                split_bad.append(f"{r['scene_id']}:{n} not in text")
    def _has_escape(o):
        if isinstance(o, str):
            return "\\|" in o
        if isinstance(o, dict):
            return any(_has_escape(v) for v in o.values())
        if isinstance(o, list):
            return any(_has_escape(v) for v in o)
        return False
    esc = [f for f in ("chapters.json", "glossary.json") if _has_escape(cm.read_json(P("corpus", "canon", f), {}))]
    out.append(C("canon_numbers_faithful", not split_bad and not esc,
                 f"{checked_num} NotebookLM scene numbers checked against their scene text: {len(split_bad)} split or invented{' ' + str(split_bad[:3]) if split_bad else ''}; "
                 f"markdown table escapes left in chapters.json/glossary.json: {len(esc)}"))

    # 3 cues
    cu = cm.read_json(P("corpus", "canon", "cues_70m05.json"), {}) or {}
    caps = cu.get("captions") or []
    chs = {c.get("chapter") for c in caps if isinstance(c, dict)}
    out.append(C("cues_imported", len(caps) == EXPECT["cue_captions"] and len(chs) >= EXPECT["cue_chapters"],
                 f"{len(caps)} caption cues over {len(chs)} chapters; expected {EXPECT['cue_captions']} over {EXPECT['cue_chapters']}"))

    # 4 visuals captioned + OCR'd
    vis = P("data", "derived", "visual")
    assets_p = P("corpus", "visual", "assets.jsonl")
    if os.path.exists(P(vis, "images.jsonl")) and os.path.exists(assets_p) and os.path.exists(P(vis, "ocr", "ocr.jsonl")):
        images = _jl(P(vis, "images.jsonl"))
        ocr_ids = {r["asset_id"] for r in _jl(P(vis, "ocr", "ocr.jsonl"))}
        assets = _jl(assets_p)
        by = {}
        dup = 0
        for a in assets:
            dup += a["asset_id"] in by
            by[a["asset_id"]] = a
        kinds = {}
        bad = []
        for im in images:
            a = by.get(im["asset_id"])
            ok = bool(a and a.get("caption_en", "").strip() and a.get("caption_ar", "").strip() and a.get("caption_src") == "vision" and im["asset_id"] in ocr_ids)
            k = kinds.setdefault(im["kind"], [0, 0])
            k[0] += 1
            k[1] += ok
            if not ok:
                bad.append(im["asset_id"])
        verr = []
        rule = schema.rule_for("corpus/visual/assets.jsonl")
        if rule:
            verr = schema.validate_file(assets_p, rule, limit=3)
        miss = cm.p("reports", "visual", "missing.md")
        from dclib import visual_audit
        aud = visual_audit.audit(assets, ctx.root)
        out.append(C("visuals_captioned_ocr", not bad and not dup and not verr and os.path.exists(miss) and len(images) > 0,
                     "; ".join(f"{k} {v[1]}/{v[0]}" for k, v in sorted(kinds.items())) + f"; listed {len(images)}, in assets.jsonl {len(assets)} "
                     f"({dup} duplicate ids, {len(verr)} schema errors), missing-report {'present' if os.path.exists(miss) else 'MISSING'}"
                     + (f"; not captioned+OCR'd: {bad[:3]}" if bad else "")))
        nrec = len(_jl(P("corpus", "visual", "recaptions.jsonl"))) if os.path.exists(P("corpus", "visual", "recaptions.jsonl")) else 0
        out.append(C("visual_captions_match_pixels", not aud["blank_false"] and not aud["numbers_unsupported"] and not aud["ink_errors"] and aud["checked"] == len(images),
                     f"{aud['checked']} vision captions audited against the images (ink threshold {visual_audit.INK_MIN}); 'blank/corrupt' claims {len(aud['blank_claims'])}, "
                     f"of which contradicted by the pixels {len(aud['blank_false'])}{' ' + str([f['asset_id'] for f in aud['blank_false'][:3]]) if aud['blank_false'] else ''}; "
                     f"numbers_seen not backed by any recorded text {len(aud['numbers_unsupported'])}{' ' + str(aud['numbers_unsupported'][:2]) if aud['numbers_unsupported'] else ''}; "
                     f"unreadable images {len(aud['ink_errors'])}; pixel-verified recaptions in corpus/visual/recaptions.jsonl: {nrec}"))
    else:
        out.append(C("visuals_captioned_ocr", False, "images.jsonl / ocr.jsonl / corpus/visual/assets.jsonl missing: run dc visual list|ocr|batch, caption, then dc visual merge"))

    # 5 HUB harvest
    ki = P("corpus", "canon", "knowledge_index.jsonl")
    nk = len(_jl(ki)) if os.path.exists(ki) else 0
    ncs = len(_jl(P("corpus", "canon", "crash_course_steps.jsonl"))) if os.path.exists(P("corpus", "canon", "crash_course_steps.jsonl")) else 0
    nhs = len(_jl(P("corpus", "canon", "hub_shots.jsonl"))) if os.path.exists(P("corpus", "canon", "hub_shots.jsonl")) else 0
    nhi = len(_jl(P("corpus", "canon", "hub_items.jsonl"))) if os.path.exists(P("corpus", "canon", "hub_items.jsonl")) else 0
    rep = os.path.exists(P("docs", "handoffs", "PHASE-02-hub.md"))
    out.append(C("hub_harvest", rep and nk == EXPECT["knowledge_sections"] and ncs == EXPECT["crash_steps"] and nhs >= EXPECT["hub_shots"] and nhi > 0,
                 f"report {'present' if rep else 'MISSING'} (docs/handoffs/PHASE-02-hub.md); knowledge sections {nk}/{EXPECT['knowledge_sections']}, "
                 f"crash steps {ncs}/{EXPECT['crash_steps']}, shots {nhs}/{EXPECT['hub_shots']}, items {nhi}"))

    # 6 chunks cover every unique text source + index exists
    cp = distill.chunks_path()
    docs = _jl(distill.DOCS) if os.path.exists(distill.DOCS) else []
    want = {r["file_id"] for r, _ in distill.sources()}
    have = {d["doc_id"] for d in docs}
    nch = sum(d["chunks"] for d in docs)
    idx_ok = os.path.exists(P("data", "derived", "index", "bm25.pkl"))
    mf = cm.read_json(P("corpus", "text", "manifest.json"), {}) or {}
    miss_files = (mf.get("extra") or {}).get("missing_files", ["?"])
    out.append(C("text_distilled", cp is not None and want <= have and nch > 0 and idx_ok and not miss_files,
                 f"{nch} chunks from {len(have)}/{len(want)} unique text sources ({os.path.relpath(cp, ctx.root) if cp else 'no chunks.jsonl'}); "
                 f"BM25 index {'present' if idx_ok else 'MISSING'}; files missing on disk: {len(miss_files)}"))

    # 7 maps
    mp = P("corpus", "maps")
    mfiles = []
    for dp, _, fn in os.walk(mp):
        mfiles += [os.path.join(dp, f) for f in fn if f.endswith(".md")]
    over = [os.path.relpath(f, mp) for f in mfiles if len(open(f, encoding="utf-8").read().split()) > 300]
    fam_have = {os.path.basename(f)[:-3] for f in mfiles if os.sep + "families" + os.sep in f}
    fam_want = {d["family"] for d in docs}
    mm = cm.read_json(os.path.join(mp, "manifest.json"), {}) or {}
    fresh = bool(cp) and any(i["path"] == os.path.relpath(cp, ctx.root) and i["sha256"] == cm.sha256_file(cp) for i in mm.get("inputs", []))
    out.append(C("corpus_maps", os.path.exists(os.path.join(mp, "corpus.md")) and not over and fam_want <= fam_have and fresh and len(mfiles) > 0,
                 f"{len(mfiles)} map files (corpus.md, {len(fam_have)}/{len(fam_want)} families, documents, sections); over 300 words: {len(over)}; "
                 f"built from current chunks: {fresh}"))

    # 8 retrieval smoke (re-run so the result is current)
    rc, txt = ctx.dc("corpus", "smoke", timeout=900)
    m = re.search(r"retrieval smoke: (\d+)/(\d+) in top 3 \(([^)]*)\)", txt)
    n, t = (int(m.group(1)), int(m.group(2))) if m else (0, 0)
    out.append(C("retrieval_smoke", m is not None and n == t == EXPECT["smoke"],
                 f"{n}/{t} queries return the expected source in the top 3 ({m.group(3) if m else 'smoke failed to run'}); reports/retrieval_smoke.md"))
    return out
