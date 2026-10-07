"""dc visual keyframes|list|ocr|batch (P2.7 visual assets; docs/plan/03 P2.7, docs/plan/05 section 6).

keyframes  Keyframes from the best legacy render only (Claude film AR, 1080p24, 70:05). Three stages:
             detect   (queued) one ffmpeg pass: the plan's scene filter `select='gt(scene,F)',showinfo` on full-rate
                      frames (F = --scene-floor; scores are kept so the 0.25 threshold is applied later), plus a
                      2 fps 160x90 gray thumbnail stream for gradual changes. The film is dark and cross-fades, so
                      hard-cut scores stay far below 0.25 (first 5 min: max 0.17); the thumbnails find the shots.
             select   (inline, numpy) settled visual states in the main panel (header, caption bar and running
                      timecode masked), boosted by hard cuts >= --threshold and chapter starts, thinned to one
                      keyframe per >= --min-gap-s seconds and at most --max in total.
             extract  (queued) one 640-px JPG per keyframe -> data/derived/keyframes/claude_film/kf_<ms>.jpg,
                      verified against its thumbnail. asset_id = v:<sha1-12 of the mp4>@<t_ms>.
list       The image list (data/derived/visual/images.jsonl): 519 NotebookLM slides (source S4:Pnn, S4:P00b for the
           second P00 render; t_ms from the filename), the 21 scene PNGs of the 28-min V2 pack (catalog canonical
           copies), the 5 Claude-film stills and the keyframes. Byte-identical files are listed once.
ocr        tesseract ara+eng --psm 6 per image, through the queue in chunked jobs (default 3 chunks per run).
           Keyframes are read from the full-resolution film frame, dark images are inverted first. Cached per
           image under data/derived/visual/ocr/cache/; merged into data/derived/visual/ocr/ocr.jsonl.
batch      Caption batches of --size images -> data/derived/visual/batches/batch_NNN.json
           {"output": "data/derived/visual/captions/batch_NNN.jsonl", "items": [{asset_id, path, source, t_ms, ocr, ...}]}.

Archive files are only read (hashed, decoded by ffmpeg/tesseract/Pillow), never executed. The command group runs
isolated under the venv python (numpy, Pillow); see tools/dc.py.
"""
import argparse
import bisect
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

from . import common as C
from . import manifest as M
from . import queue as Q
from .timeutil import frame2ms

EXTRACTED = C.p("data", "extracted")
FILM_REL = "ClaudeAndOthers.zip.d/Claude.zip.d/Claude/Folder 1/DA_Camp_Film_AR_Full_Voiced.mp4"
FILM_FPS = 24
KF_DIR = C.p("data", "derived", "keyframes", "claude_film")
DET_DIR = os.path.join(KF_DIR, "_detect")
KF_JSONL = os.path.join(KF_DIR, "keyframes.jsonl")
VIS_DIR = C.p("data", "derived", "visual")
IMAGES_JSONL = os.path.join(VIS_DIR, "images.jsonl")
OCR_DIR = os.path.join(VIS_DIR, "ocr")
OCR_CACHE = os.path.join(OCR_DIR, "cache")
OCR_JSONL = os.path.join(OCR_DIR, "ocr.jsonl")
BATCH_DIR = os.path.join(VIS_DIR, "batches")
CAPTION_DIR = os.path.join(VIS_DIR, "captions")

NBLM_SCENES = "DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/DA_Camp_NotebookLM/Scene_Photos"
STILLS_DIR = "DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/LMArena/Folder 3/stills"
SLIDE_RX = re.compile(r"^scene_(\d{4})s_(\d\d)m(\d\d)s\.jpg$")
V2_PACK_RX = re.compile(r"DA_Camp_28min_V2_Production_Pack(?:\.zip\.d)?/da_camp_video_v2/scene_(\d\d)\.png$")
STILL_RX = re.compile(r"^(0\d)_ch(\d\d)_.*\.png$")

THUMB_FPS, THUMB_W, THUMB_H = 2, 160, 90
ROI = (0.14, 0.78)   # rows used for change analysis: below the title + progress bar, above caption bar + timecode
PIX_T = 20           # gray-level difference that counts as a changed pixel
OCR_LANG, OCR_PSM = "ara+eng", 6
DARK_MEAN = 110      # images darker than this (mean gray) are inverted before OCR (light text on dark UI)
OCR_MAX_CHARS = 1500  # cap of the OCR text copied into a batch item (the cache keeps the full text)
BIDI_RX = re.compile("[‎‏‪-‮⁦-⁩]")


# ------------------------------------------------------------------ helpers
_CAT = None


def _catalog():
    """extracted-relative path -> catalog record (corpus/catalog/files.jsonl lists every copy of every file)."""
    global _CAT
    if _CAT is None:
        _CAT = {}
        path = C.p("corpus", "catalog", "files.jsonl")
        if os.path.exists(path):
            for r in C.read_jsonl(path):
                for p in r["paths"]:
                    _CAT[p] = r
    return _CAT


def _hash(relpath):
    """(sha1, sha256) of an extracted file: from the catalog when its size matches, else hashed now."""
    full = os.path.join(EXTRACTED, relpath)
    rec = _catalog().get(relpath)
    if rec and rec.get("bytes") == os.path.getsize(full):
        return rec["sha1"], rec["sha256"]
    s1, s2, _ = C.sha1_sha256_file(full)
    return s1, s2


def _sha1(path):
    import hashlib
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(C.CHUNK), b""):
            h.update(b)
    return h.hexdigest()


def _film():
    path = os.path.join(EXTRACTED, FILM_REL)
    if not os.path.isfile(path):
        C.fail(f"missing {path} (run dc ingest first)")
    s1, s2 = _hash(FILM_REL)
    return path, s1, s2


def _params_input(name, params):
    return {"path": f"params:{name}", "sha256": C.sha256_text(json.dumps(params, sort_keys=True))}


def _self_queue(label, argv_tail, inline, mem_gb=1.0, expected_gb=0.0):
    """Run `dc visual <argv_tail>` inside the tsp queue and wait (isolated venv python). None = run here."""
    if inline or Q.in_queue():
        return None
    return Q.run_heavy(label, ["-I", C.p("tools", "dc.py"), "visual", *argv_tail], False, mem_gb, expected_gb)


def _ffprobe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=start_time,r_frame_rate,nb_frames,width,height:format=duration", "-show_chapters",
                        "-of", "json", path], capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        C.fail(f"ffprobe failed: {r.stderr.strip()[:300]}")
    d = json.loads(r.stdout)
    st = d["streams"][0]
    chapters = []
    for c in d.get("chapters", []):
        title = (c.get("tags") or {}).get("title", "")
        m = re.match(r"(CH-\d\d)", title)
        chapters.append({"chapter": m.group(1) if m else f"#{c['id']}", "title": title,
                         "start_ms": int(round(float(c["start_time"]) * 1000)),
                         "end_ms": int(round(float(c["end_time"]) * 1000))})
    return {"start_time": float(st.get("start_time") or 0.0), "fps": st.get("r_frame_rate"),
            "nb_frames": int(st.get("nb_frames") or 0), "width": st.get("width"), "height": st.get("height"),
            "duration": float(d["format"]["duration"]), "chapters": chapters}


def _chapter_at(chapters, t_ms):
    for c in chapters:
        if c["start_ms"] <= t_ms < c["end_ms"]:
            return c["chapter"]
    return chapters[-1]["chapter"] if chapters else ""


# ------------------------------------------------------------------ keyframes: detect
def _detect_paths():
    return {k: os.path.join(DET_DIR, v) for k, v in
            {"scores": "scenes.txt", "info": "showinfo.log", "thumbs": f"thumbs_{THUMB_W}x{THUMB_H}_{THUMB_FPS}fps.gray",
             "meta": "meta.json"}.items()}


def _stage_detect(args):
    film, s1, s2 = _film()
    P = _detect_paths()
    params = {"scene_floor": args.scene_floor, "thumb": [THUMB_W, THUMB_H, THUMB_FPS]}
    inputs = [{"path": "data/extracted/" + FILM_REL, "sha256": s2}, _params_input("detect", params)]
    outs = [C.rel(p) for p in P.values()]
    if M.should_skip(DET_DIR, "detect", inputs, outs, args.force):
        print("keyframes detect: film and params unchanged, skipped")
        return 0
    rc = _self_queue("visual-kf-detect", ["keyframes", "--stage", "detect", "--scene-floor", str(args.scene_floor)]
                     + (["--force"] if args.force else []), args.inline, mem_gb=1.5, expected_gb=0.2)
    if rc is not None:
        return rc
    os.makedirs(DET_DIR, exist_ok=True)
    meta = _ffprobe(film)
    fc = (f"[0:v]split=2[a][b];[a]select='gt(scene,{args.scene_floor})',showinfo,metadata=print:file=scenes.tmp[ao];"
          f"[b]fps={THUMB_FPS},scale={THUMB_W}:{THUMB_H}:flags=area,format=gray[bo]")
    cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-loglevel", "info", "-threads", "2", "-i", film,
           "-filter_complex", fc, "-map", "[ao]", "-f", "null", "-", "-map", "[bo]", "-f", "rawvideo", "-y", "thumbs.tmp"]
    t0 = time.time()
    with open(os.path.join(DET_DIR, "showinfo.tmp"), "w") as err:
        r = subprocess.run(cmd, cwd=DET_DIR, stderr=err, stdout=subprocess.DEVNULL)
    if r.returncode != 0:
        C.fail(f"ffmpeg detect failed (exit {r.returncode}); see {C.rel(os.path.join(DET_DIR, 'showinfo.tmp'))}")
    os.replace(os.path.join(DET_DIR, "scenes.tmp"), P["scores"])
    os.replace(os.path.join(DET_DIR, "thumbs.tmp"), P["thumbs"])
    os.replace(os.path.join(DET_DIR, "showinfo.tmp"), P["info"])
    nthumb = os.path.getsize(P["thumbs"]) // (THUMB_W * THUMB_H)
    meta.update({"film": "data/extracted/" + FILM_REL, "sha1": s1, "sha256": s2, "params": params,
                 "thumbs": nthumb, "seconds": round(time.time() - t0, 1), "cmd": cmd})
    C.write_json(P["meta"], meta)
    M.write(DET_DIR, "detect", "dc visual keyframes --stage detect", inputs, outs, tools=C.tool_versions("ffmpeg"),
            extra={"thumbs": nthumb, "seconds": meta["seconds"]})
    print(f"keyframes detect: {nthumb} thumbs, scene scores > {args.scene_floor} in {C.rel(P['scores'])} "
          f"({meta['seconds']} s)")
    return 0


def _parse_scores(path, start_time):
    """[(film frame index, scene score)] from metadata=print output."""
    out, cur = [], None
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = re.search(r"pts_time:([0-9.]+)", line)
            if m:
                cur = float(m.group(1))
                continue
            m = re.search(r"lavfi\.scene_score=([0-9.]+)", line)
            if m and cur is not None:
                out.append((int(round((cur - start_time) * FILM_FPS)), float(m.group(1))))
                cur = None
    return out


# ------------------------------------------------------------------ keyframes: select
def _select(thumbs, cuts, chapters, args):
    """Pick keyframe samples from the 2 fps thumbnails. Returns (kept states, all states, effective gap s)."""
    import numpy as np
    K = thumbs.shape[0]
    r0, r1 = int(ROI[0] * THUMB_H), int(ROI[1] * THUMB_H)
    R = thumbs[:, r0:r1, :].astype(np.int16)
    step = FILM_FPS // THUMB_FPS   # film frames per thumbnail sample
    c = np.ones(K)
    c[1:] = (np.abs(R[1:] - R[:-1]) > PIX_T).mean(axis=(1, 2))
    nxt = np.append(c[1:], 0.0)
    settled = (c < args.settle) & (nxt < args.settle)
    cut_at = np.zeros(K)
    for n, s in cuts:
        k = min(K - 1, -(-n // step))   # first sample at/after the cut frame
        cut_at[k] = max(cut_at[k], s)

    def t_of(k):
        return frame2ms(k * step, FILM_FPS)

    states, ref, pend_cut = [], None, 0.0
    for k in range(K):
        pend_cut = max(pend_cut, float(cut_at[k]))
        if not settled[k]:
            continue
        d = 1.0 if ref is None else float((np.abs(R[k] - ref) > PIX_T).mean())
        if d >= args.novel:
            states.append({"k0": k, "k_img": k, "novelty": round(d, 4), "cut": round(pend_cut, 4), "reason": "state"})
            ref, pend_cut = R[k], 0.0
        elif states:
            states[-1]["k_img"] = k   # same visual state, further built up: prefer the latest settled frame
    # fill long stretches with no settled state (continuous animation): the stillest sample in the gap
    gap_k = int(args.fill_gap_s * THUMB_FPS)
    bounds = [0] + [s["k0"] for s in states] + [K]
    fills = []
    for a, b in zip(bounds, bounds[1:]):
        if b - a > gap_k:
            lo, hi = a + THUMB_FPS * 2, b - THUMB_FPS * 2
            for seg0 in range(lo, hi, gap_k):
                seg1 = min(hi, seg0 + gap_k)
                if seg1 - seg0 < THUMB_FPS * 4:
                    continue
                k = seg0 + int(np.argmin(c[seg0:seg1]))
                fills.append({"k0": k, "k_img": k, "novelty": 0.0, "cut": float(cut_at[max(seg0, 0):k + 1].max()),
                              "reason": "fill"})
    states = sorted(states + fills, key=lambda s: s["k0"])
    seen_ch = set()
    for s in states:
        s["t_ms"] = t_of(s["k_img"])
        s["state_t_ms"] = t_of(s["k0"])
        s["frame"] = s["k_img"] * step
        s["chapter"] = _chapter_at(chapters, s["state_t_ms"])
        first_in_ch = s["chapter"] not in seen_ch
        seen_ch.add(s["chapter"])
        s["prio"] = round(s["novelty"] + (1.0 if s["cut"] >= args.threshold else 2.0 * s["cut"])
                          + (0.75 if first_in_ch else 0.0), 4)
    order = sorted(range(len(states)), key=lambda i: (-states[i]["prio"], states[i]["t_ms"]))
    gap = float(args.min_gap_s)
    while True:
        times, kept = [], []
        for i in order:
            t = states[i]["t_ms"]
            j = bisect.bisect_left(times, t)
            if (j > 0 and t - times[j - 1] < gap * 1000) or (j < len(times) and times[j] - t < gap * 1000):
                continue
            times.insert(j, t)
            kept.append(i)
        if len(kept) <= args.max:
            break
        gap += 0.5
    return [states[i] for i in sorted(kept, key=lambda i: states[i]["t_ms"])], states, gap


def _stage_select(args):
    import numpy as np
    P = _detect_paths()
    for k in ("scores", "thumbs", "meta"):
        if not os.path.exists(P[k]):
            C.fail(f"keyframes select: {C.rel(P[k])} missing; run `dc visual keyframes --stage detect` first")
    meta = C.read_json(P["meta"])
    thumbs = np.fromfile(P["thumbs"], dtype=np.uint8)
    thumbs = thumbs[: (thumbs.size // (THUMB_W * THUMB_H)) * THUMB_W * THUMB_H].reshape(-1, THUMB_H, THUMB_W)
    cuts = _parse_scores(P["scores"], meta["start_time"])
    kept, states, gap = _select(thumbs, cuts, meta["chapters"], args)
    plan = {"v": 1, "film": meta["film"], "sha1": meta["sha1"], "created": C.now_iso(),
            "params": {"threshold": args.threshold, "scene_floor": meta["params"]["scene_floor"], "novel": args.novel,
                       "settle": args.settle, "min_gap_s": args.min_gap_s, "effective_gap_s": gap, "max": args.max,
                       "fill_gap_s": args.fill_gap_s, "roi_rows": ROI, "pix_t": PIX_T},
            "stats": {"thumbs": int(thumbs.shape[0]), "scene_scores_recorded": len(cuts),
                      "hard_cuts_ge_threshold": sum(1 for _, s in cuts if s >= args.threshold),
                      "max_scene_score": max((s for _, s in cuts), default=0.0),
                      "states": len(states), "fills": sum(1 for s in states if s["reason"] == "fill"),
                      "kept": len(kept)},
            "keyframes": [{k: s[k] for k in ("t_ms", "frame", "state_t_ms", "chapter", "novelty", "cut", "prio", "reason")}
                          for s in kept]}
    C.write_json(os.path.join(KF_DIR, "plan.json"), plan)
    st = plan["stats"]
    print(f"keyframes select: {st['states']} visual states ({st['fills']} gap fills), {st['hard_cuts_ge_threshold']} hard "
          f"cuts >= {args.threshold} (max scene score {st['max_scene_score']:.3f}); kept {st['kept']} "
          f"at >= {gap:g} s spacing (max {args.max})")
    return 0


# ------------------------------------------------------------------ keyframes: extract
def _kf_name(t_ms):
    return f"kf_{t_ms:07d}.jpg"


def _stage_extract(args):
    plan = C.read_json(os.path.join(KF_DIR, "plan.json"))
    if not plan:
        C.fail("keyframes extract: plan.json missing; run --stage select first")
    film, s1, s2 = _film()
    if plan["sha1"] != s1:
        C.fail("keyframes extract: plan.json was made from another film hash; re-run detect/select")
    want = {_kf_name(k["t_ms"]): k for k in plan["keyframes"]}
    plan_sha = C.sha256_file(os.path.join(KF_DIR, "plan.json"))
    inputs = [{"path": "data/extracted/" + FILM_REL, "sha256": s2},
              {"path": C.rel(os.path.join(KF_DIR, "plan.json")), "sha256": C.sha256_text(json.dumps(plan["keyframes"]))}]
    outs = [C.rel(KF_JSONL)] + [C.rel(os.path.join(KF_DIR, n)) for n in want]
    if M.should_skip(KF_DIR, "extract", inputs, outs, args.force):
        print(f"keyframes extract: {len(want)} keyframes unchanged, skipped")
        return 0
    rc = _self_queue("visual-kf-extract", ["keyframes", "--stage", "extract"] + (["--force"] if args.force else []),
                     args.inline, mem_gb=1.0, expected_gb=0.1)
    if rc is not None:
        return rc
    import numpy as np
    from PIL import Image
    P = _detect_paths()
    thumbs = np.fromfile(P["thumbs"], dtype=np.uint8)
    thumbs = thumbs[: (thumbs.size // (THUMB_W * THUMB_H)) * THUMB_W * THUMB_H].reshape(-1, THUMB_H, THUMB_W)
    step = FILM_FPS // THUMB_FPS
    for n in os.listdir(KF_DIR):   # stale keyframes from an older plan
        if n.startswith("kf_") and n.endswith(".jpg") and n not in want:
            os.remove(os.path.join(KF_DIR, n))
    recs, worst = [], 0.0
    t0 = time.time()
    for name, k in sorted(want.items()):
        out = os.path.join(KF_DIR, name)
        if args.force or not os.path.exists(out):
            ss = f"{(k['frame'] - 0.5) / FILM_FPS:.4f}"   # accurate seek: first frame at/after frame k['frame']
            r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", ss, "-i", film, "-frames:v", "1",
                                "-vf", "scale=640:-1:flags=lanczos", "-q:v", "3", "-y", out + ".tmp.jpg"],
                               capture_output=True, text=True, timeout=300)
            if r.returncode != 0 or not os.path.exists(out + ".tmp.jpg"):
                C.fail(f"extract {name} failed: {r.stderr.strip()[:300]}")
            os.replace(out + ".tmp.jpg", out)
        # self-check: the JPG must match its 2 fps thumbnail (same frame, same time mapping)
        with Image.open(out) as im:
            g = np.asarray(im.convert("L").resize((THUMB_W, THUMB_H), Image.BOX), dtype=np.int16)
        kk = k["frame"] // step
        diff = float(np.abs(g - thumbs[kk].astype(np.int16)).mean()) if kk < thumbs.shape[0] else -1.0
        worst = max(worst, diff)
        recs.append({"v": 1, "asset_id": f"v:{s1[:12]}@{k['t_ms']}", "file_id": f"f:{s1[:12]}", "kind": "render_keyframe",
                     "path": C.rel(out), "source": f"V8:claude-film:{k['chapter']}", "chapter": k["chapter"],
                     "t_ms": k["t_ms"], "frame": k["frame"], "fps": FILM_FPS, "state_t_ms": k["state_t_ms"],
                     "cut_score": k["cut"], "novelty": k["novelty"], "reason": k["reason"], "sha1": _sha1(out), "sha256": C.sha256_file(out),
                     "thumb_mad": round(diff, 2)})
    C.write_jsonl(KF_JSONL, recs)
    bad = [r["asset_id"] for r in recs if r["thumb_mad"] > 12 or r["thumb_mad"] < 0]
    M.write(KF_DIR, "extract", "dc visual keyframes --stage extract", inputs, outs, tools=C.tool_versions("ffmpeg"),
            extra={"keyframes": len(recs), "plan_sha256": plan_sha, "worst_thumb_mad": round(worst, 2),
                   "thumb_mismatch": bad, "seconds": round(time.time() - t0, 1)})
    print(f"keyframes extract: {len(recs)} JPGs in {C.rel(KF_DIR)} (worst thumb mean-abs-diff {worst:.2f}; "
          f"{len(bad)} mismatches)")
    return 1 if bad else 0


def cmd_keyframes(args):
    stages = ["detect", "select", "extract"] if args.stage == "all" else [args.stage]
    for st in stages:
        rc = {"detect": _stage_detect, "select": _stage_select, "extract": _stage_extract}[st](args)
        if rc:
            return rc
    return 0


# ------------------------------------------------------------------ list
def build_images():
    """The image list for OCR + captioning. Returns (items, skipped duplicates)."""
    items, skipped, seen = [], [], {}

    def add(it):
        key = it["sha1"] if it["kind"] != "render_keyframe" or it.get("t_ms") is None else it["asset_id"]
        if key in seen:
            skipped.append({"path": it["path"], "duplicate_of": seen[key]})
            return
        seen[key] = it["path"]
        items.append(it)

    # 1. NotebookLM slides (S4): Scene_Photos/<part>/scene_XXXXs_MMmSSs.jpg
    base = os.path.join(EXTRACTED, NBLM_SCENES)
    slides = []
    for dp, dn, fn in os.walk(base):
        dn.sort()
        for f in fn:
            m = SLIDE_RX.match(f)
            if not m:
                continue
            part = os.path.relpath(dp, base).split(os.sep)[0]
            pm = re.match(r"P(\d\d)", part)
            if not pm:
                continue
            sec = int(m.group(1))
            if int(m.group(2)) * 60 + int(m.group(3)) != sec:
                print(f"WARNING: slide name time mismatch {part}/{f}", file=sys.stderr)
            src = f"S4:P{pm.group(1)}" + ("b" if part.endswith("_render2") else "")
            rel = os.path.relpath(os.path.join(dp, f), EXTRACTED)
            slides.append((src, sec, rel, part))
    for src, sec, rel, part in sorted(slides):
        s1, s2 = _hash(rel)
        add({"asset_id": f"v:{s1[:12]}", "file_id": f"f:{s1[:12]}", "kind": "slide", "path": "data/extracted/" + rel,
             "source": src, "t_ms": sec * 1000, "part": part, "sha1": s1, "sha256": s2})
    # 2. scene PNGs of the 28-min V2 pack: catalog canonical copy of scene_01..21.png
    pngs = {}
    for p, r in _catalog().items():
        m = V2_PACK_RX.search(p)
        if m:
            pngs[r["sha1"]] = (m.group(1), r)
    for num, r in sorted(pngs.values(), key=lambda x: (x[0], x[1]["canonical"])):
        add({"asset_id": f"v:{r['sha1'][:12]}", "file_id": r["file_id"], "kind": "png_scene",
             "path": "data/extracted/" + r["canonical"], "source": f"V4:28min-v2:scene_{num}", "t_ms": None,
             "sha1": r["sha1"], "sha256": r["sha256"]})
    # 3. Claude-film stills (stills/0*.png)
    sd = os.path.join(EXTRACTED, STILLS_DIR)
    for f in sorted(os.listdir(sd)) if os.path.isdir(sd) else []:
        m = STILL_RX.match(f)
        if not m:
            continue
        rel = os.path.join(STILLS_DIR, f)
        s1, s2 = _hash(rel)
        add({"asset_id": f"v:{s1[:12]}", "file_id": f"f:{s1[:12]}", "kind": "render_keyframe",
             "path": "data/extracted/" + rel, "source": f"V4:claude-still:CH-{m.group(2)}", "t_ms": None,
             "chapter": f"CH-{m.group(2)}", "label": f[:-4], "sha1": s1, "sha256": s2})
    # 4. keyframes of the Claude film
    if os.path.exists(KF_JSONL):
        for r in C.read_jsonl(KF_JSONL):
            add({k: r[k] for k in ("asset_id", "file_id", "kind", "path", "source", "t_ms", "chapter", "frame", "sha1",
                                   "sha256")})
    else:
        print("WARNING: no keyframes yet (run dc visual keyframes)", file=sys.stderr)
    for it in items:
        if not os.path.exists(C.p(it["path"])):
            C.fail(f"listed image missing on disk: {it['path']}")
    return items, skipped


def cmd_list(args):
    items, skipped = build_images()
    inputs = [{"path": it["path"], "sha256": it["sha256"]} for it in items]
    C.write_jsonl(IMAGES_JSONL, items)
    counts = {}
    for it in items:
        counts[it["kind"]] = counts.get(it["kind"], 0) + 1
    M.write(VIS_DIR, "list", "dc visual list", inputs, [C.rel(IMAGES_JSONL)],
            extra={"images": len(items), "by_kind": counts, "skipped_duplicates": skipped})
    if not getattr(args, "quiet", False):
        print(f"visual list: {len(items)} images {counts}; {len(skipped)} byte-identical duplicates skipped "
              f"-> {C.rel(IMAGES_JSONL)}")
    return 0


# ------------------------------------------------------------------ ocr
def _ocr_key(asset_id):
    return asset_id.replace(":", "_").replace("@", "_")


def _ocr_cache_path(asset_id):
    return os.path.join(OCR_CACHE, _ocr_key(asset_id) + ".json")


def _tess_version():
    try:
        r = subprocess.run(["tesseract", "--version"], capture_output=True, text=True, timeout=20)
        return (r.stdout or r.stderr).splitlines()[0].strip()
    except Exception:  # noqa: BLE001
        return "?"


def _ocr_params():
    return {"engine": "tesseract", "lang": OCR_LANG, "psm": OCR_PSM, "dark_mean": DARK_MEAN, "keyframes": "full-res film frame"}


def _cache_ok(it):
    rec = C.read_json(_ocr_cache_path(it["asset_id"]))
    return bool(rec) and rec.get("sha1") == it["sha1"] and rec.get("params") == _ocr_params()


def _ocr_image(it, film, tmpdir):
    """OCR one image. Returns the cache record."""
    from PIL import Image
    if it["kind"] == "render_keyframe" and it.get("frame") is not None:
        ss = f"{(it['frame'] - 0.5) / FILM_FPS:.4f}"
        r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", ss, "-i", film, "-frames:v", "1",
                            "-f", "image2pipe", "-c:v", "png", "-"], capture_output=True, timeout=300)
        if r.returncode != 0 or not r.stdout:
            raise RuntimeError(f"ffmpeg frame grab failed: {r.stderr.decode(errors='replace')[:200]}")
        im = Image.open(io.BytesIO(r.stdout))
        src = "film-frame-1080p"
    else:
        im = Image.open(C.p(it["path"]))
        src = "file"
    with im:
        g = im.convert("L")
    w, h = g.size
    mean = sum(i * n for i, n in enumerate(g.histogram())) / float(w * h)
    inverted = mean < DARK_MEAN
    if inverted:
        from PIL import ImageOps
        g = ImageOps.invert(g)
    tmp_png = os.path.join(tmpdir, "in.png")
    g.save(tmp_png)
    base = os.path.join(tmpdir, "out")
    env = dict(os.environ, OMP_THREAD_LIMIT="1")
    t0 = time.time()
    r = subprocess.run(["tesseract", tmp_png, base, "-l", OCR_LANG, "--psm", str(OCR_PSM), "txt", "tsv"],
                       capture_output=True, text=True, timeout=600, env=env)
    if r.returncode != 0:
        raise RuntimeError(f"tesseract failed: {r.stderr.strip()[:200]}")
    with open(base + ".txt", encoding="utf-8", errors="replace") as f:
        raw = f.read()
    confs, words = [], 0
    with open(base + ".tsv", encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f):
            cols = line.rstrip("\n").split("\t")
            if i == 0 or len(cols) < 12 or cols[0] != "5" or not cols[11].strip():
                continue
            words += 1
            try:
                cf_ = float(cols[10])
            except ValueError:
                continue
            if cf_ >= 0:
                confs.append(cf_)
    lines = []
    for ln in BIDI_RX.sub("", raw).splitlines():
        ln = re.sub(r"\s+", " ", ln).strip()
        if ln and re.search(r"[0-9A-Za-z؀-ۿ]{2}", ln):   # drop pure-noise lines
            lines.append(ln)
    return {"v": 1, "asset_id": it["asset_id"], "sha1": it["sha1"], "params": _ocr_params(), "engine": _tess_version(),
            "input": src, "size": [w, h], "mean_gray": round(mean, 1), "inverted": inverted, "text": "\n".join(lines),
            "words": words, "mean_conf": round(sum(confs) / len(confs), 1) if confs else None,
            "seconds": round(time.time() - t0, 2), "created": C.now_iso()}


def _ocr_worker(chunk_file):
    """Inside a queue job: OCR every asset listed in chunk_file (one asset_id per line) into the cache."""
    ids = [x.strip() for x in open(chunk_file, encoding="utf-8") if x.strip()]
    items = {it["asset_id"]: it for it in C.read_jsonl(IMAGES_JSONL)}
    film = os.path.join(EXTRACTED, FILM_REL)
    os.makedirs(OCR_CACHE, exist_ok=True)
    fails = 0
    with tempfile.TemporaryDirectory(prefix="ocr_", dir=OCR_DIR) as tmpdir:
        for n, aid in enumerate(ids, 1):
            it = items.get(aid)
            if not it or _cache_ok(it):
                continue
            try:
                rec = _ocr_image(it, film, tmpdir)
            except Exception as e:  # noqa: BLE001
                fails += 1
                print(f"OCR FAIL {aid}: {e}", file=sys.stderr)
                continue
            C.write_json(_ocr_cache_path(aid), rec)
            if n % 25 == 0:
                print(f"  {n}/{len(ids)}", file=sys.stderr)
    print(f"ocr chunk {os.path.basename(chunk_file)}: {len(ids)} ids, {fails} failures")
    return 1 if fails else 0


def cmd_ocr(args):
    if args.worker:
        return _ocr_worker(args.worker)
    if not os.path.exists(IMAGES_JSONL) or args.relist:
        cmd_list(args)
    items = C.read_jsonl(IMAGES_JSONL)
    if args.limit:
        items = items[: args.limit]
    todo = [it for it in items if args.force or not _cache_ok(it)]
    if args.force:
        for it in todo:
            try:
                os.remove(_ocr_cache_path(it["asset_id"]))
            except FileNotFoundError:
                pass
    print(f"visual ocr: {len(items)} images, {len(items) - len(todo)} cached, {len(todo)} to OCR")
    if todo:
        cdir = os.path.join(OCR_DIR, "_chunks")
        os.makedirs(cdir, exist_ok=True)
        n = max(1, min(args.jobs, len(todo)))
        chunks = [todo[i::n] for i in range(n)]   # interleaved: each job gets a mix of slides and film frames
        stamp = time.strftime("%Y%m%d%H%M%S")
        jobs = []
        for i, ch in enumerate(chunks, 1):
            cf_ = os.path.join(cdir, f"{stamp}_{i:02d}.txt")
            with open(cf_, "w", encoding="utf-8") as f:
                f.write("\n".join(it["asset_id"] for it in ch) + "\n")
            if args.inline:
                _ocr_worker(cf_)
                continue
            job = Q.submit(f"visual-ocr-{i}of{n}", [sys.executable, "-I", C.p("tools", "dc.py"), "visual", "ocr",
                                                    "--worker", cf_], mem_gb=0.8, expected_gb=0.0)
            jobs.append(job["tsp_id"])
            print(f"  queued chunk {i}/{n} ({len(ch)} images) as tsp job {job['tsp_id']}", file=sys.stderr)
        for tid in jobs:
            class A:  # noqa: D401
                id = tid
                timeout = 7200
                tail = 3
            Q.cmd_wait(A)
        for f in os.listdir(cdir):
            if f.startswith(stamp):
                os.remove(os.path.join(cdir, f))
    # merge
    recs, missing = [], []
    for it in items:
        rec = C.read_json(_ocr_cache_path(it["asset_id"]))
        if not rec or rec.get("sha1") != it["sha1"]:
            missing.append(it["asset_id"])
            continue
        recs.append({k: rec[k] for k in ("asset_id", "text", "words", "mean_conf", "inverted", "input", "engine")})
    if args.limit:
        print(f"visual ocr (--limit {args.limit}): {len(recs)} done, {len(missing)} missing; merge skipped")
        return 1 if missing else 0
    C.write_jsonl(OCR_JSONL, recs)
    inputs = [{"path": it["path"], "sha256": it["sha256"]} for it in items] + [_params_input("ocr", _ocr_params())]
    M.write(OCR_DIR, "ocr", "dc visual ocr", inputs, [C.rel(OCR_JSONL)], tools={"tesseract": _tess_version(),
                                                                               "python": sys.version.split()[0]},
            extra={"images": len(items), "ocr": len(recs), "missing": missing,
                   "with_text": sum(1 for r in recs if r["text"])})
    print(f"visual ocr: {len(recs)}/{len(items)} images have OCR ({sum(1 for r in recs if r['text'])} with text); "
          f"{len(missing)} missing -> {C.rel(OCR_JSONL)}")
    return 1 if missing else 0


# ------------------------------------------------------------------ batch
KIND_ORDER = {"slide": 0, "png_scene": 1, "render_keyframe": 2}


def cmd_batch(args):
    if not os.path.exists(IMAGES_JSONL):
        cmd_list(args)
    items = C.read_jsonl(IMAGES_JSONL)
    ocr = {r["asset_id"]: r for r in C.read_jsonl(OCR_JSONL)} if os.path.exists(OCR_JSONL) else {}
    no_ocr = [it["asset_id"] for it in items if it["asset_id"] not in ocr]
    if no_ocr and not args.allow_missing_ocr:
        C.fail(f"visual batch: {len(no_ocr)} images have no OCR yet (run dc visual ocr, or --allow-missing-ocr)")

    def key(it):
        film = it["source"].startswith("V8:")
        return (KIND_ORDER.get(it["kind"], 9), 1 if film else 0, it["source"] if not film else "",
                it["t_ms"] if it["t_ms"] is not None else -1, it["path"])

    items.sort(key=key)
    os.makedirs(BATCH_DIR, exist_ok=True)
    os.makedirs(CAPTION_DIR, exist_ok=True)
    size = args.size
    nb = max(1, -(-len(items) // size))   # as few batches as --size allows, filled evenly (no 2-image tail batch)
    cuts = [round(j * len(items) / nb) for j in range(nb + 1)]
    paths = []
    for b in range(1, nb + 1):
        name = f"batch_{b:03d}"
        out = []
        for it in items[cuts[b - 1]:cuts[b]]:
            o = ocr.get(it["asset_id"], {})
            text = o.get("text", "")
            rec = {"asset_id": it["asset_id"], "path": it["path"], "source": it["source"], "t_ms": it["t_ms"],
                   "ocr": text[:OCR_MAX_CHARS], "kind": it["kind"], "file_id": it["file_id"]}
            if len(text) > OCR_MAX_CHARS:
                rec["ocr_truncated"] = True
            if o.get("mean_conf") is not None:
                rec["ocr_conf"] = o["mean_conf"]
            if it.get("chapter"):
                rec["chapter"] = it["chapter"]
            out.append(rec)
        doc = {"v": 1, "batch": name, "root": C.ROOT, "output": f"data/derived/visual/captions/{name}.jsonl",
               "count": len(out), "items": out}
        bp = os.path.join(BATCH_DIR, name + ".json")
        C.write_json(bp, doc)
        paths.append(bp)
    keep = {os.path.basename(p) for p in paths}
    for f in os.listdir(BATCH_DIR):   # stale batches from a larger earlier run
        if re.match(r"batch_\d{3}\.json$", f) and f not in keep:
            os.remove(os.path.join(BATCH_DIR, f))
    index = {"v": 1, "created": C.now_iso(), "size": size, "images": len(items), "batches": [C.rel(p) for p in paths],
             "no_ocr": no_ocr}
    C.write_json(os.path.join(BATCH_DIR, "index.json"), index)
    inputs = [{"path": C.rel(IMAGES_JSONL), "sha256": C.sha256_file(IMAGES_JSONL)}]
    if os.path.exists(OCR_JSONL):
        inputs.append({"path": C.rel(OCR_JSONL), "sha256": C.sha256_file(OCR_JSONL)})
    M.write(BATCH_DIR, "batch", f"dc visual batch --size {size}", inputs,
            [C.rel(p) for p in paths] + [C.rel(os.path.join(BATCH_DIR, "index.json"))],
            extra={"images": len(items), "batches": len(paths)})
    print(f"visual batch: {len(items)} images -> {len(paths)} batches of <= {size} in {C.rel(BATCH_DIR)}")
    return 0


# ------------------------------------------------------------------ argparse
def register(sub):
    v = sub.add_parser("visual", help="P2.7 visual assets: keyframes, image list, OCR, caption batches")
    vs = v.add_subparsers(dest="visual_cmd", required=True)
    s = vs.add_parser("keyframes", help="Claude-film keyframes: detect (queued) -> select -> extract (queued)")
    s.add_argument("--stage", default="all", choices=["all", "detect", "select", "extract"])
    s.add_argument("--threshold", type=float, default=0.25, help="hard-cut scene score (plan: 0.25)")
    s.add_argument("--scene-floor", type=float, default=0.02, help="lowest scene score recorded by detect")
    s.add_argument("--novel", type=float, default=0.02, help="share of changed main-panel pixels that makes a new state")
    s.add_argument("--settle", type=float, default=0.004, help="max changed share vs neighbours for a settled sample")
    s.add_argument("--min-gap-s", type=float, default=8.0, help="at most one keyframe per this many seconds")
    s.add_argument("--max", type=int, default=280, help="at most this many keyframes")
    s.add_argument("--fill-gap-s", type=float, default=30.0, help="fill stretches longer than this with no settled state")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true", help="run heavy stages here instead of through tsp")
    s.set_defaults(fn="visual.cmd_keyframes")
    s = vs.add_parser("list", help="image list -> data/derived/visual/images.jsonl")
    s.set_defaults(fn="visual.cmd_list")
    s = vs.add_parser("ocr", help="tesseract ara+eng psm 6 per image (chunked queue jobs)")
    s.add_argument("--jobs", type=int, default=3, help="queue jobs (chunks) per run")
    s.add_argument("--limit", type=int, help="smoke test on the first N images (no merge)")
    s.add_argument("--relist", action="store_true", help="rebuild images.jsonl first")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.add_argument("--worker", help=argparse.SUPPRESS)
    s.set_defaults(fn="visual.cmd_ocr")
    s = vs.add_parser("batch", help="caption batches -> data/derived/visual/batches/batch_NNN.json")
    s.add_argument("--size", type=int, default=25)
    s.add_argument("--allow-missing-ocr", action="store_true")
    s.set_defaults(fn="visual.cmd_batch")
    from . import visual_merge
    visual_merge.register_visual(vs)
    return v
