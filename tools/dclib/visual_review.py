"""`dc visual frames|sheet|queue` (G2 verifier fix): the tools of the second pixel pass over vision captions.

frames  1080p film frames for every render_keyframe (data/derived/visual/review/frames/kf_<t_ms>.jpg, git-ignored) plus a second,
        sparse-text OCR read of the same frame (tesseract ara+eng --psm 11, finds numbers that psm 6 line-OCR misses in charts and
        labels) -> data/derived/visual/ocr/sparse.jsonl. The audit (visual_audit.py) backs numbers_seen of keyframes with the union
        of both reads. Runs through the queue in chunked jobs; cached per asset.
sheet   Contact sheets for a human/LLM pixel review: N tiles per JPG with a numbered corner label, and the current caption,
        text_seen, numbers_seen, OCR digits and review state of every tile printed to stdout. Keyframes use the 1080p frame.
queue   The review worklist: which vision captions still have no caption-level pixel review, by kind, with a risk score
        (low OCR confidence, text_seen not found in OCR, numbers not in OCR, duplicated caption).
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import time

from . import common as C
from . import manifest as M
from . import queue as Q

VIS = C.p("data", "derived", "visual")
IMAGES = os.path.join(VIS, "images.jsonl")
REV = os.path.join(VIS, "review")
FRAMES = os.path.join(REV, "frames")
SHEETS = os.path.join(REV, "sheets")
SPARSE_CACHE = os.path.join(VIS, "ocr", "sparse_cache")
SPARSE = os.path.join(VIS, "ocr", "sparse.jsonl")
ASSETS = C.p("corpus", "visual", "assets.jsonl")
BIDI_RX = re.compile("[‎‏‪-‮⁦-⁩]")
FILM_FPS = 24


def frame_path(it):
    """1080p film frame of a keyframe; the five Claude-film stills are real PNG files and are used as they are."""
    if it.get("frame") is None:
        return C.p(it["path"])
    return os.path.join(FRAMES, "kf_%07d.jpg" % it["t_ms"])


def _film():
    from .visual import EXTRACTED, FILM_REL
    return os.path.join(EXTRACTED, FILM_REL)


def _grab(it, film, dest):
    ss = f"{(it['frame'] - 0.5) / FILM_FPS:.4f}"
    tmp = dest + ".tmp.jpg"
    r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", ss, "-i", film, "-frames:v", "1", "-q:v", "3", tmp],
                       capture_output=True, timeout=300)
    if r.returncode != 0 or not os.path.exists(tmp):
        raise RuntimeError("ffmpeg frame grab failed: " + r.stderr.decode(errors="replace")[:200])
    os.replace(tmp, dest)


def _sparse_ocr(path, tmpdir):
    from PIL import Image, ImageOps
    with Image.open(path) as im:
        g = im.convert("L")
    w, h = g.size
    mean = sum(i * n for i, n in enumerate(g.histogram())) / float(w * h)
    if mean < 110:
        g = ImageOps.invert(g)
    tmp_png = os.path.join(tmpdir, "in.png")
    g.save(tmp_png)
    base = os.path.join(tmpdir, "out")
    env = dict(os.environ, OMP_THREAD_LIMIT="1")
    r = subprocess.run(["tesseract", tmp_png, base, "-l", "ara+eng", "--psm", "11", "txt"], capture_output=True, text=True,
                       timeout=600, env=env)
    if r.returncode != 0:
        raise RuntimeError("tesseract failed: " + r.stderr.strip()[:200])
    with open(base + ".txt", encoding="utf-8", errors="replace") as f:
        raw = BIDI_RX.sub("", f.read())
    return re.sub(r"[ \t]+", " ", raw).strip(), round(mean, 1)


def _worker(chunk_file, grab_only=False):
    ids = [x.strip() for x in open(chunk_file, encoding="utf-8") if x.strip()]
    items = {r["asset_id"]: r for r in C.read_jsonl(IMAGES) if r["kind"] == "render_keyframe"}
    os.makedirs(FRAMES, exist_ok=True)
    os.makedirs(SPARSE_CACHE, exist_ok=True)
    film, fails = _film(), 0
    with tempfile.TemporaryDirectory(prefix="sp_", dir=REV) as tmp:
        for n, aid in enumerate(ids, 1):
            it = items.get(aid)
            if not it:
                continue
            cache = os.path.join(SPARSE_CACHE, aid.replace(":", "_").replace("@", "_") + ".json")
            fp = frame_path(it)
            try:
                if not os.path.exists(fp):
                    _grab(it, film, fp)   # (stills: frame_path is the PNG itself, which always exists)
                rec = C.read_json(cache)
                if not grab_only and (not rec or rec.get("sha1") != it["sha1"]):
                    text, mean = _sparse_ocr(fp, tmp)
                    C.write_json(cache, {"v": 1, "asset_id": aid, "sha1": it["sha1"], "psm": 11, "text": text, "mean_gray": mean,
                                         "created": C.now_iso()})
            except Exception as e:  # noqa: BLE001
                fails += 1
                print(f"FRAMES FAIL {aid}: {e}", file=sys.stderr)
            if n % 20 == 0:
                print(f"  {n}/{len(ids)}", file=sys.stderr)
    print(f"frames chunk {os.path.basename(chunk_file)}: {len(ids)} ids, {fails} failures")
    return 1 if fails else 0


def cmd_frames(args):
    if args.worker:
        return _worker(args.worker, args.grab_only)
    items = [r for r in C.read_jsonl(IMAGES) if r["kind"] == "render_keyframe"]
    film_p = _film()
    inputs = [{"path": C.rel(IMAGES), "sha256": C.sha256_file(IMAGES)}, {"path": C.rel(film_p), "sha256": C.sha256_file(film_p)}]
    outs = [SPARSE]

    def done(it):
        c = C.read_json(os.path.join(SPARSE_CACHE, it["asset_id"].replace(":", "_").replace("@", "_") + ".json"))
        return os.path.exists(frame_path(it)) and bool(c) and c.get("sha1") == it["sha1"]

    todo = [it for it in items if args.force or not done(it)]
    if not todo and not args.force and M.should_skip(REV, "frames", inputs, outs, False):
        print(f"visual frames: up to date ({len(items)} keyframes)")
        return 0
    print(f"visual frames: {len(items)} keyframes, {len(items) - len(todo)} cached, {len(todo)} to do")
    if todo:
        os.makedirs(REV, exist_ok=True)
        cdir = os.path.join(REV, "_chunks")
        os.makedirs(cdir, exist_ok=True)
        n = max(1, min(args.jobs, len(todo)))
        stamp = time.strftime("%Y%m%d%H%M%S")
        tids = []
        for i in range(n):
            cf_ = os.path.join(cdir, f"{stamp}_{i + 1:02d}.txt")
            with open(cf_, "w", encoding="utf-8") as f:
                f.write("\n".join(it["asset_id"] for it in todo[i::n]) + "\n")
            if args.inline:
                _worker(cf_)
                continue
            job = Q.submit(f"visual-frames-{i + 1}of{n}", [sys.executable, "-I", C.p("tools", "dc.py"), "visual", "frames", "--worker", cf_],
                           mem_gb=0.8, expected_gb=0.1)
            tids.append(job["tsp_id"])
        for tid in tids:
            class A:  # noqa: D401
                id = tid
                timeout = 7200
                tail = 2
            Q.cmd_wait(A)
    rows = []
    for it in items:
        c = C.read_json(os.path.join(SPARSE_CACHE, it["asset_id"].replace(":", "_").replace("@", "_") + ".json"))
        if c:
            rows.append({k: c[k] for k in ("asset_id", "sha1", "psm", "text", "mean_gray")})
    C.write_jsonl(SPARSE, rows)
    M.write(REV, "frames", "dc visual frames", inputs, [C.rel(SPARSE)], extra={"keyframes": len(items), "sparse_ocr": len(rows)})
    print(f"visual frames: sparse OCR for {len(rows)}/{len(items)} keyframes -> {C.rel(SPARSE)}")
    return 0 if len(rows) == len(items) else 1


# ------------------------------------------------------------------ contact sheets
def _tile_source(a, images):
    it = images.get(a["asset_id"])
    if a["kind"] == "render_keyframe" and it and os.path.exists(frame_path(it)):
        return frame_path(it)
    return C.p(a["path"])


def _digits(s):
    return sorted(set(re.findall(r"\d+(?:[.,]\d+)?", (s or "").translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")))), key=lambda x: (len(x), x))


def select_assets(args):
    assets = [a for a in C.read_jsonl(ASSETS) if a.get("caption_src") == "vision"]
    if args.ids:
        want = [x.strip() for x in args.ids.split(",") if x.strip()]
        by = {a["asset_id"]: a for a in assets}
        return [by[w] for w in want if w in by]
    if args.ids_file:
        want = [x.strip() for x in open(args.ids_file, encoding="utf-8") if x.strip()]
        by = {a["asset_id"]: a for a in assets}
        return [by[w] for w in want if w in by]
    if args.kind:
        assets = [a for a in assets if a["kind"] == args.kind]
    if args.chapter:
        assets = [a for a in assets if a.get("chapter") == args.chapter]
    if args.pending:
        assets = [a for a in assets if a.get("reviewed") != "pixels"]
    return assets


def cmd_sheet(args):
    from PIL import Image, ImageDraw, ImageFont
    sel = select_assets(args)
    sel = sel[args.start:]
    if args.count:
        sel = sel[: args.count]
    if not sel:
        print("visual sheet: nothing selected")
        return 1
    images = {r["asset_id"]: r for r in C.read_jsonl(IMAGES)}
    os.makedirs(SHEETS, exist_ok=True)
    per = args.cols * args.rows
    cw, ch = args.cell_w, int(args.cell_w * 9 / 16)
    try:
        font = ImageFont.load_default(size=26)
    except TypeError:
        font = ImageFont.load_default()
    sheets = []
    for s0 in range(0, len(sel), per):
        part = sel[s0:s0 + per]
        W, H = args.cols * cw, args.rows * ch
        sheet = Image.new("RGB", (W, H), (30, 30, 30))
        for k, a in enumerate(part):
            with Image.open(_tile_source(a, images)) as im:
                im = im.convert("RGB")
                im.thumbnail((cw - 4, ch - 4))
                x, y = (k % args.cols) * cw + 2, (k // args.cols) * ch + 2
                sheet.paste(im, (x, y))
            d = ImageDraw.Draw(sheet)
            d.rectangle([x, y, x + 46, y + 34], fill=(200, 0, 0))
            d.text((x + 6, y + 2), str(s0 + k + 1 + args.start), fill=(255, 255, 255), font=font)
        name = f"{args.name}_{args.start + s0 + 1:04d}-{args.start + s0 + len(part):04d}.jpg"
        out = os.path.join(SHEETS, name)
        sheet.save(out, quality=88)
        sheets.append(out)
        print(f"== sheet {out}")
        if not args.quiet:
            for k, a in enumerate(part):
                print(f"[{s0 + k + 1 + args.start}] {a['asset_id']} {a['kind']} {a.get('chapter') or a.get('part') or ''} t={a.get('t_ms')} "
                      f"ocr_conf={a.get('ocr_conf')} reviewed={a.get('reviewed', '-')} q={a['quality']}")
                print(f"    EN: {a['caption_en'][:230]}")
                print(f"    AR: {a['caption_ar'][:140]}")
                print(f"    seen: {a['text_seen'][:140]} | nums: {a['numbers_seen'][:14]} | ocr digits: {_digits(a.get('ocr'))[:16]}")
    return 0


def cmd_queue(args):
    from . import visual_audit
    assets = [a for a in C.read_jsonl(ASSETS) if a.get("caption_src") == "vision"]
    risk = visual_audit.risk_scores(assets)
    by = {}
    for a in assets:
        k = (a["kind"], a.get("reviewed", "none"))
        by[k] = by.get(k, 0) + 1
    print("vision captions by kind / review state:")
    for k, v in sorted(by.items()):
        print(f"  {k[0]:16s} {k[1]:8s} {v}")
    pend = [a for a in assets if a.get("reviewed") != "pixels"]
    pend.sort(key=lambda a: -risk.get(a["asset_id"], {}).get("score", 0))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write("\n".join(a["asset_id"] for a in pend) + "\n")
        print(f"worklist of {len(pend)} unreviewed captions (highest risk first) -> {args.out}")
    for a in pend[: args.top]:
        r = risk.get(a["asset_id"], {})
        print(f"  {r.get('score', 0):4.1f} {a['asset_id']} {a['kind']} {r.get('why', '')}")
    return 0


RECAP = C.p("corpus", "visual", "recaptions.jsonl")


def cmd_recaption(args):
    """Upsert reviewer records (JSONL, one object per line, partial fields allowed) into corpus/visual/recaptions.jsonl.
    A new record replaces the old one field by field, so a caption review keeps the numbers read earlier."""
    from . import schema
    old = {r["asset_id"]: r for r in C.read_jsonl(RECAP)} if os.path.exists(RECAP) else {}
    known = {r["asset_id"] for r in C.read_jsonl(IMAGES)}
    n_new = n_upd = 0
    errs = []
    for path in args.files:
        for ln, line in enumerate(open(path, encoding="utf-8"), 1):
            if not line.strip():
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError as e:
                errs.append(f"{path}:{ln}: {e}")
                continue
            aid = d.get("asset_id")
            if aid not in known:
                errs.append(f"{path}:{ln}: unknown asset {aid}")
                continue
            d.setdefault("v", 1)
            merged = {**old.get(aid, {}), **d}
            if d.get("reviewed") == "pixels" and old.get(aid, {}).get("caption_confirmed") and not d.get("caption_confirmed") \
                    and d.get("caption_en") and d.get("caption_ar"):
                merged.pop("caption_confirmed", None)   # rewritten captions supersede an earlier "confirmed"
            for e in schema.validate(merged, "visual_recaption", limit=3):
                errs.append(f"{path}:{ln}: {aid}: {e}")
            if aid in old:
                n_upd += 1
            else:
                n_new += 1
            old[aid] = merged
    if errs:
        print("visual recaption: REFUSED, nothing written:\n  " + "\n  ".join(errs[:20]))
        return 1
    C.write_jsonl(RECAP, [old[k] for k in sorted(old)])
    print(f"visual recaption: {n_new} new, {n_upd} updated, {len(old)} records in {C.rel(RECAP)}")
    return 0


def register(vs):
    s = vs.add_parser("recaption", help="upsert pixel-review records into corpus/visual/recaptions.jsonl (schema-checked)")
    s.add_argument("files", nargs="+")
    s.set_defaults(fn="visual_review.cmd_recaption")
    s = vs.add_parser("frames", help="1080p keyframe frames + sparse OCR for the second pixel pass (chunked queue jobs)")
    s.add_argument("--jobs", type=int, default=2)
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.add_argument("--worker", help=__import__("argparse").SUPPRESS)
    s.add_argument("--grab-only", action="store_true", help="only extract the 1080p frames (no sparse OCR); quick job")
    s.set_defaults(fn="visual_review.cmd_frames")
    s = vs.add_parser("sheet", help="contact sheets of vision-captioned images with their captions (pixel review)")
    s.add_argument("--kind", choices=["slide", "png_scene", "render_keyframe"])
    s.add_argument("--chapter")
    s.add_argument("--ids", help="comma-separated asset ids")
    s.add_argument("--ids-file")
    s.add_argument("--pending", action="store_true", help="only captions without a caption-level pixel review")
    s.add_argument("--start", type=int, default=0)
    s.add_argument("--count", type=int, default=0)
    s.add_argument("--cols", type=int, default=2)
    s.add_argument("--rows", type=int, default=2)
    s.add_argument("--cell-w", type=int, default=800)
    s.add_argument("--name", default="sheet")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(fn="visual_review.cmd_sheet")
    s = vs.add_parser("queue", help="review worklist: unreviewed vision captions ranked by audit risk")
    s.add_argument("--top", type=int, default=15)
    s.add_argument("--out")
    s.set_defaults(fn="visual_review.cmd_queue")
