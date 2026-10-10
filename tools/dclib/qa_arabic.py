"""`dc qa arabic`: Arabic on-screen text suite (docs/plan/04 section 3.4, 06 section 1 G6b). Docs: docs/tools/qa_arabic.md.

Input (any combination): --items FILE (JSON list of strings or item objects), --spec FILE... (scene specs: every string leaf of
layers[].props), --src PATH... (TS/TSX: Arabic string literals, for component demos), --frames FILE (items carrying a rendered
frame + crop box), --probes DIR (Chromium isolated renders from studio/scripts/lookdev_typeprobe.mjs).

Per unique string: OCR round-trip (>= 0.9), tofu (font cmap, pure python), overflow/copy limits, BiDi cases, Western digits,
`الـ`+Latin joins, plus a repo scan for per-letter Arabic animation. Isolated renders default to PIL+Raqm (HarfBuzz) with the
frozen faces and the J1 join gap; frame crops and Chromium probes are scored the same way and tagged with their evidence class.
Exit: 0 pass, 1 fail, 2 incomplete (no OCR engine). Stdlib + Pillow only; tesseract is the OCR engine of the r3 sweep.
"""
import concurrent.futures as cf
import datetime
import difflib
import json
import os
import re
import shlex
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = ROOT / "studio/public/fonts"
OCR_MIN = 0.90
FRAME_W, FRAME_H = 1920, 1080
SAFE_X, SAFE_Y = 68, 38  # default text-safe margin: broadcast action-safe 3.5 % of the frame (override with --safe X,Y)
KINETIC_MAX_WORDS, MAX_CHARS_LINE, MAX_LINES, SIZE_FLOOR = 6, 32, 2, 18
DISPLAY_MIN_PX = 56  # tokens.ts FONT.arDisplay.minPx
LAT_SCALE = 0.92  # Mix default latScale (kit.tsx)
ADR9_B2 = {"display": {"caps": 0.20, "latin": 0.14}, "text": {"caps": 0.25, "latin": 0.10}}

# frozen faces (ADR-003 T-A, fonts/LICENSES.md): (file, variable wght or None)
FACES = {
    "ar-display": ("Alexandria-VF.ttf", 700),
    "ar-text": ("IBMPlexSansArabic-SemiBold.ttf", None),
    "ar-label": ("IBMPlexSansArabic-Medium.ttf", None),
    "lat": ("InterTight-VF.ttf", 700),
    "mono": ("JetBrainsMono-VF.ttf", 600),
}

AR_LETTER = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")
CARRIER = "قسم"
CARRIER_BELOW = 8  # Arabic letters in the string; fewer than this and tesseract (script detection, language model) is unreliable on it alone
AR_CORE = re.compile(r"[\u0621-\u064A\u066E-\u06D3\u0750-\u077F]")
TASHKEEL = re.compile(r"[\u064B-\u065F\u0670\u06D6-\u06ED]")
IGNORED_CP = re.compile(r"[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C\u2E80-\u2E80]")
EASTERN_DIGITS = re.compile(r"[\u0660-\u0669\u06F0-\u06F9\u066A-\u066C\uFF10-\uFF19]")
UNITS = ("EGP", "%", "ms", "s", "rows")
MSA_MARKERS = ["الذي", "التي", "سوف", "ماذا", "لماذا", "هذا", "هذه", "حيث", "أيضا", "أيضًا", "لكن", "ليس", "كيف"]
EGY_HINT = "(Egyptian: اللي, هنـ/ هـ, ليه, ده/دي, إزاي, بس, مش)"


# ---------------------------------------------------------------- port of studio/src/type/arabic.ts (segment, join gap, visLen, breaks)

LTR_HINT = re.compile(r"[A-Za-z0-9]")
PUNCT_END = re.compile(r"[.,\u060C:\u061B!?\u061F]+$")
AR_PREFIX = re.compile(r"^([\u0600-\u06FF]*)(.*)$", re.S)


def segment(text):
    """Port of arabic.ts segment(): list of (text, is_ltr). ⟦…⟧ forces one LTR isolate."""
    out = []

    def push_ar(t):
        if not t:
            return
        if out and not out[-1][1]:
            out[-1] = (out[-1][0] + t, False)
        else:
            out.append((t, False))

    for part in re.split(r"(⟦[^⟧]*⟧)", text):
        if part.startswith("⟦"):
            out.append((part[1:-1], True))
            continue
        for tok in re.split(r"(\s+)", part):
            if not tok:
                continue
            if not LTR_HINT.search(tok):
                push_ar(tok)
                continue
            m = PUNCT_END.search(tok)
            p = m.group(0) if m else ""
            core = tok[: len(tok) - len(p)] if p else tok
            m2 = AR_PREFIX.match(core)
            pre, rest = (m2.group(1), m2.group(2)) if m2 else ("", core)
            push_ar(pre)
            out.append((rest, True))
            push_ar(p)
    return out


def read_join_gap():
    """JOIN_GAP as frozen in studio/src/type/arabic.ts (what ships), or None."""
    m = re.search(r"export const JOIN_GAP = \{display: \{caps: ([\d.]+), latin: ([\d.]+)\}, text: \{caps: ([\d.]+), latin: ([\d.]+)\}\}",
                  (ROOT / "studio/src/type/arabic.ts").read_text(encoding="utf-8"))
    if not m:
        return None
    a = [float(x) for x in m.groups()]
    return {"display": {"caps": a[0], "latin": a[1]}, "text": {"caps": a[2], "latin": a[3]}}


def join_gap_em(prev_ar, latin, size, gap=None):
    if not prev_ar or not prev_ar.endswith("\u0640"):
        return 0.0
    g = gap or JOIN_GAP
    band = g["display"] if (size is not None and size >= DISPLAY_MIN_PX) else g["text"]
    return band["caps"] if re.fullmatch(r"[A-Z0-9]+", latin) and re.search(r"[A-Z]", latin) else band["latin"]


JOIN_GAP = read_join_gap() or {"display": {"caps": 0.2, "latin": 0.25}, "text": {"caps": 0.25, "latin": 0.3}}


def vis_len(s):
    return len(re.sub(r"[\u064B-\u0670\u06D6-\u06ED⟦⟧]", "", s))


def break_caption(text, max_chars=MAX_CHARS_LINE, max_lines=MAX_LINES):
    """Port of breakCaption(): (lines, overflow)."""
    if " | " in text:
        lines = [l.strip() for l in text.split(" | ")]
        return lines, len(lines) > max_lines or any(vis_len(l) > max_chars for l in lines)
    words = text.split()
    if vis_len(text) <= max_chars:
        return [text.strip()], False
    if max_lines >= 2:
        best, best_top = None, 1e9
        for k in range(1, len(words)):
            l = [" ".join(words[:k]), " ".join(words[k:])]
            a, b = vis_len(l[0]), vis_len(l[1])
            if a < b or a > max_chars:
                continue
            if a < best_top:
                best_top, best = a, l
        if best:
            return best, False
    lines, cur = [], ""
    for w in words:
        t = f"{cur} {w}" if cur else w
        if vis_len(t) > max_chars and cur:
            lines.append(cur)
            cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines, len(lines) > max_lines or any(vis_len(l) > max_chars for l in lines)


# ---------------------------------------------------------------- font cmap (pure python; no fontTools needed)

_CMAP = {}


def font_cmap(path):
    """{codepoint: glyph id} from a TTF/OTF cmap (formats 0, 4, 6, 12). gid 0 (.notdef) counts as missing."""
    path = str(path)
    if path in _CMAP:
        return _CMAP[path]
    b = Path(path).read_bytes()
    if b[:4] == b"ttcf":
        off = struct.unpack(">I", b[12:16])[0]
    else:
        off = 0
    n = struct.unpack(">H", b[off + 4:off + 6])[0]
    tab = {}
    for i in range(n):
        tag, _, o, ln = struct.unpack(">4sIII", b[off + 12 + 16 * i:off + 28 + 16 * i])
        tab[tag] = o
    base = tab[b"cmap"]
    ntab = struct.unpack(">H", b[base + 2:base + 4])[0]
    cm = {}
    for i in range(ntab):
        pid, eid, so = struct.unpack(">HHI", b[base + 4 + 8 * i:base + 12 + 8 * i])
        if (pid, eid) not in ((0, 3), (0, 4), (0, 6), (3, 1), (3, 10), (0, 0), (0, 1), (0, 2)):
            continue
        s = base + so
        fmt = struct.unpack(">H", b[s:s + 2])[0]
        if fmt == 0:
            for c in range(256):
                cm.setdefault(c, b[s + 6 + c])
        elif fmt == 4:
            segx2 = struct.unpack(">H", b[s + 6:s + 8])[0]
            sc = segx2 // 2
            ends = struct.unpack(f">{sc}H", b[s + 14:s + 14 + segx2])
            starts = struct.unpack(f">{sc}H", b[s + 16 + segx2:s + 16 + 2 * segx2])
            deltas = struct.unpack(f">{sc}h", b[s + 16 + 2 * segx2:s + 16 + 3 * segx2])
            ro_base = s + 16 + 3 * segx2
            ros = struct.unpack(f">{sc}H", b[ro_base:ro_base + segx2])
            for k in range(sc):
                for c in range(starts[k], ends[k] + 1):
                    if c == 0xFFFF:
                        continue
                    if ros[k] == 0:
                        g = (c + deltas[k]) & 0xFFFF
                    else:
                        p = ro_base + 2 * k + ros[k] + 2 * (c - starts[k])
                        g = struct.unpack(">H", b[p:p + 2])[0]
                        g = (g + deltas[k]) & 0xFFFF if g else 0
                    cm.setdefault(c, g)
        elif fmt == 6:
            first, cnt = struct.unpack(">HH", b[s + 6:s + 10])
            for k, g in enumerate(struct.unpack(f">{cnt}H", b[s + 10:s + 10 + 2 * cnt])):
                cm.setdefault(first + k, g)
        elif fmt == 12:
            ng = struct.unpack(">I", b[s + 12:s + 16])[0]
            for k in range(ng):
                a, e, g = struct.unpack(">III", b[s + 16 + 12 * k:s + 28 + 12 * k])
                for c in range(a, e + 1):
                    cm.setdefault(c, g + c - a)
    _CMAP[path] = {c: g for c, g in cm.items() if g}
    return _CMAP[path]


def face_path(face):
    return FONT_DIR / FACES[face][0]


# ---------------------------------------------------------------- items

def is_arabic(s):
    return bool(AR_LETTER.search(s.replace("⟦", "").replace("⟧", "")))


def guess_kind(key):
    k = (key or "").lower()
    if k in ("title", "headline", "impact", "word", "kinetic", "phrase", "text", "hook", "head"):
        return "kinetic"
    if k in ("caption", "subtitle", "sub", "note"):
        return "caption"
    if k in ("term", "chip", "tag", "gloss"):
        return "chip"
    if k in ("number", "value", "count", "unit"):
        return "number"
    return "label"


DEFAULT_SIZE = {"kinetic": 80, "caption": 40, "chip": 32, "number": 96, "label": 32}
TEXT_KEYS = {"text", "title", "label", "labels", "caption", "word", "phrase", "gloss", "term", "chip", "sub", "subtitle", "note", "hook",
             "label_ar", "labels_ar", "headline", "impact", "kinetic", "tag", "unit", "value"}
SKIP_KEYS = {"id", "ref", "color", "ease", "easing", "preset", "component", "anchor", "src", "path", "url", "font", "family", "layout", "kind", "role",
             "notes", "intent", "alt", "comment", "metaphor", "shot_id", "asset", "plate", "sfx", "cue", "mode", "effect", "dir"}
ID_LIKE = re.compile(r"^[a-z0-9_.:/#-]+$")


def walk_props(obj, path=""):
    """Yield (key path, key, string, sibling size) for every string leaf of a props tree."""
    if isinstance(obj, dict):
        size = next((obj[k] for k in ("size", "font_size", "fontSize", "px") if isinstance(obj.get(k), (int, float))), None)
        for k, v in obj.items():
            if isinstance(v, str):
                yield f"{path}.{k}", k, v, size
            else:
                yield from walk_props(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, str):
                yield f"{path}[{i}]", path.rsplit(".", 1)[-1], v, None
            else:
                yield from walk_props(v, f"{path}[{i}]")


def items_from_spec(p):
    d = json.loads(Path(p).read_text(encoding="utf-8"))
    out, flags = [], []
    for sh in d.get("shots", []):
        for li, ly in enumerate(sh.get("layers", [])):
            props = ly.get("props", {})
            for kp, key, s, size in walk_props(props, "props"):
                if key in SKIP_KEYS:
                    continue
                if not (AR_LETTER.search(s) or key in TEXT_KEYS) or (not AR_LETTER.search(s) and ID_LIKE.match(s) and key not in TEXT_KEYS):
                    continue
                kind = guess_kind(key)
                out.append({"text": s, "size": size or DEFAULT_SIZE[kind], "kind": kind, "source": f"{Path(p).name}:{sh.get('shot_id')}:L{li}{kp[5:]}"})
            blob = json.dumps(props, ensure_ascii=False)
            for key in ("effect", "animate", "split", "stagger", "mode", "reveal"):
                for kp, k, s, _ in walk_props(props, "props"):
                    if k == key and re.search(r"(?i)^(letter|char|chars|per[_-]?(letter|char)|typewriter|scramble)$", s) and AR_LETTER.search(blob):
                        flags.append({"where": f"{Path(p).name}:{sh.get('shot_id')}:L{li}{kp[5:]}", "what": f"{k}={s} on a layer carrying Arabic"})
    return out, flags


STR_LIT = re.compile(r"""(?P<q>['"`])(?P<s>(?:\\.|(?!(?P=q)).)*?)(?P=q)""", re.S)


def items_from_src(paths):
    out = []
    files = []
    for p in paths:
        p = Path(p)
        files += sorted(f for f in p.rglob("*") if f.suffix in (".ts", ".tsx") and "node_modules" not in f.parts and ".check." not in f.name) if p.is_dir() else [p]
    for f in files:
        t = f.read_text(encoding="utf-8", errors="replace")
        t = re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), t, flags=re.S)  # block/JSDoc comments are not on-screen
        t = re.sub(r"(?m)(^|[^:'\"`])//[^\n]*", lambda m: m.group(1) + " " * (len(m.group(0)) - len(m.group(1))), t)
        for m in STR_LIT.finditer(t):
            s = m.group("s")
            if not AR_LETTER.search(s) or "${" in s or "\n" in s:
                continue
            if len(re.findall(r"(?<![A-Za-z])[A-Za-z]{3,}(?![A-Za-z])", re.sub(r"⟦[^⟧]*⟧", "", s))) >= 3:
                continue  # prose with 3+ Latin words is a developer note / comment string, not on-screen copy
            if re.search(r"(?i)\b(notes?|reason|why|comment|todo|rationale|alt)\w*\s*[:=]\s*$", t[max(0, m.start() - 40):m.start()]):
                continue
            line = t.count("\n", 0, m.start()) + 1
            rel = os.path.relpath(f, ROOT) if str(f).startswith(str(ROOT)) else str(f)
            out.append({"text": s.replace("\\'", "'").replace('\\"', '"'), "size": None, "kind": "label", "source": f"{rel}:{line}"})
    return out


def load_items(path):
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    d = d["items"] if isinstance(d, dict) else d
    return [({"text": x} if isinstance(x, str) else dict(x)) for x in d]


def dedupe(items):
    by = {}
    for it in items:
        it.setdefault("kind", "label")
        key = (it["text"], it.get("size"), it["kind"], it.get("png") or it.get("frame"), tuple(it.get("box") or ()))
        if key in by:
            by[key].setdefault("sources", []).append(it.get("source", ""))
            continue
        it["sources"] = [it.get("source", "")] if it.get("source") else []
        it.pop("source", None)
        by[key] = it
    out = list(by.values())
    for i, it in enumerate(out):
        it.setdefault("id", f"s{i:03d}")
    return out


# ---------------------------------------------------------------- isolated render (PIL + Raqm = HarfBuzz shaping)

def _font(face, size):
    from PIL import ImageFont
    f = ImageFont.truetype(str(face_path(face)), size, layout_engine=ImageFont.Layout.RAQM)
    w = FACES[face][1]
    if w:
        f.set_variation_by_axes([w])
    return f


def label_role(text):
    return "sentence" if is_arabic(text) else "data"


def ar_face_for(size):
    return "ar-display" if size >= DISPLAY_MIN_PX else "ar-text"


def render_line(line, size, kind="label", gap=None, pad=None):
    """Render one line in RTL flow as the Mix component lays it out. Returns (L image white-on-black, ink bbox, advance width)."""
    from PIL import Image, ImageDraw
    pad = pad if pad is not None else int(size * 0.6)
    role = label_role(line)
    arf = _font(ar_face_for(size), size)
    latf = _font("lat" if role == "sentence" else "mono", size * (LAT_SCALE if role == "sentence" else 1.0))
    ws = 0.08 * size
    segs = segment(line)
    parts = []
    for i, (t, ltr) in enumerate(segs):
        if ltr:
            w = latf.getlength(t, direction="ltr", features=["tnum"]) + t.count(" ") * ws
            gp = join_gap_em(segs[i - 1][0], t, size, gap) * size if i and not segs[i - 1][1] else 0.0
            parts.append((t, True, w, gp))
        else:
            w = arf.getlength(t, direction="rtl", language="ar") + t.count(" ") * ws
            parts.append((t, False, w, 0.0))
    total = sum(p[2] + p[3] for p in parts)
    W, H = int(total + 2 * pad), int(size * 2.2 + 2 * pad // 2)
    im = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(im)
    base = int(size * 1.45)
    x = W - pad
    for t, ltr, w, gp in parts:
        x -= gp
        x0 = x - w
        if t.strip():
            # word-spacing: draw word by word so the extra 0.08 em shows; Raqm handles shaping inside each word
            words = re.split(r"(\s+)", t)
            order = words
            cx = x0 if ltr else x
            for wd in order:
                if not wd:
                    continue
                wl = (latf if ltr else arf).getlength(wd, direction="ltr" if ltr else "rtl", language=None if ltr else "ar", **({"features": ["tnum"]} if ltr else {}))
                wl += wd.count(" ") * ws if wd.isspace() else 0
                if wd.isspace():
                    cx = cx + wl if ltr else cx - wl
                    continue
                if ltr:
                    dr.text((cx, base), wd, font=latf, fill=255, anchor="ls", direction="ltr", features=["tnum"])
                    cx += wl
                else:
                    cx -= wl
                    dr.text((cx, base), wd, font=arf, fill=255, anchor="ls", direction="rtl", language="ar")
        x = x0
    bb = im.point(lambda v: 255 if v > 40 else 0).getbbox()
    return im, bb, total


def render_text(item, gap=None):
    """Render all lines of an item stacked (RTL right aligned). Returns (image, ink bbox, widest line advance, lines)."""
    from PIL import Image
    size = item.get("size") or DEFAULT_SIZE.get(item["kind"], 32)
    text = item["text"].replace("\\n", "\n")
    lines = text.split("\n") if "\n" in text else [text]
    if len(lines) == 1:
        lines = break_caption(text)[0] if (" | " in text) else lines
    imgs = [render_line(l.replace(" | ", " "), size, item["kind"], gap) for l in lines]
    lh = int(size * (1.6 if TASHKEEL.search(text) else 1.3))
    from PIL import Image as I
    W = max(i[0].width for i in imgs)
    H = int(imgs[0][0].height + lh * (len(imgs) - 1))
    im = I.new("L", (W, H), 0)
    for k, (li, _, _) in enumerate(imgs):
        im.paste(li, (W - li.width, k * lh))
    bb = im.point(lambda v: 255 if v > 40 else 0).getbbox() or (0, 0, W, H)
    return im, bb, max(i[2] for i in imgs), lines


# ---------------------------------------------------------------- OCR

def find_ocr(cmd=None):
    """Returns a callable (image_path, psm) -> text, or None. Order: --ocr-cmd / $DC_OCR_CMD, tesseract binary."""
    cmd = cmd or os.environ.get("DC_OCR_CMD")
    if cmd:
        return lambda f, psm: subprocess.run(shlex.split(cmd) + [str(f), str(psm)], capture_output=True, text=True, timeout=120).stdout.strip()
    tb = shutil.which("tesseract")
    if tb:
        env = dict(os.environ, OMP_THREAD_LIMIT="1")
        return lambda f, psm: subprocess.run([tb, str(f), "-", "-l", "ara+eng", "--psm", str(psm)], capture_output=True, text=True, timeout=120, env=env).stdout.strip()
    return None


def _drop(s):
    return s.translate({0x640: None, 0x200E: None, 0x200F: None, 0x061C: None, 0x202A: None, 0x202B: None, 0x202C: None,
                        0x2066: None, 0x2067: None, 0x2068: None, 0x2069: None, ord("⟦"): None, ord("⟧"): None, ord(":"): None, ord("\u060C"): None})


def streams(s, junk=False):
    """Two streams, Arabic letters in logical order and Latin letters/digits/% (Tesseract emits a Latin isolate before or after the Arabic
    run). Dropped: tatweel, bidi marks, tashkeel, spaces and every symbol (`:` `،` `·` arrows, `≠`, `-`: OCR cannot tell them apart and the
    static BiDi checks own punctuation). Equated: `I l 1 | !` and case (so `Al` = `AI`), Eastern digits to Western. `junk=True` keeps `! | [ ]`
    so that join junk (`d!`, `J|`, `t]`) stays visible to latin_junk()."""
    s = _drop(s)
    s = TASHKEEL.sub("", s)
    s = s.translate({0x660 + i: ord(str(i)) for i in range(10)} | {0x6F0 + i: ord(str(i)) for i in range(10)})
    s = "".join(s.split())
    ar = "".join(c for c in s if AR_CORE.match(c))
    keep = (lambda c: c.isalnum() or c in "%!|[]") if junk else (lambda c: c.isalnum() or c == "%")
    ot = "".join(c for c in s if not AR_CORE.match(c) and keep(c) and not AR_LETTER.match(c)).lower()
    ot = re.sub(r"[il1|!]", "l", ot)
    return ar + "|" + ot


def want_visual(text):
    """Expected OCR text: Arabic runs in logical order, Latin isolates in VISUAL order (an RTL parent lays isolates out right to left, so a
    string with two isolates, e.g. the chip `6 AI`, reads `AI 6` on screen and tesseract returns it that way)."""
    segs = segment(text)
    return "".join(t for t, l in segs if not l) + " " + " ".join(t for t, l in reversed([x for x in segs if x[1]]))


def ocr_score(got, want):
    a, b = streams(got), streams(want)
    return round(difflib.SequenceMatcher(None, a, b).ratio(), 3), a == b


def latin_junk(got, want):
    """Join junk (`d!`, `J|`, `t]`, `JI`): 1-2 characters OCR added right next to the Latin term of a tatweel-joined string. '' when clean
    (longer extras are other words misread, not the join)."""
    lw = streams(want, True).split("|", 1)[1]
    lg = streams(got, True).split("|", 1)[1]
    i = lg.find(lw) if lw else -1
    if i < 0 or lg == lw:
        return ""
    pre, post = lg[:i], lg[i + len(lw):]
    return (pre if len(pre) <= 2 else "") + (post if len(post) <= 2 else "")


def join_region_ok(got, want):
    """True when the Latin term was read intact and without adjacent junk: a low score is then Arabic-side OCR noise, not a join defect."""
    lw = streams(want, True).split("|", 1)[1]
    lg = streams(got, True).split("|", 1)[1]
    return bool(lw) and lw in lg and not latin_junk(got, want)


def prep_isolated(im, size, scale_target=100):
    """White-on-black render -> black-on-white, ink cropped with padding, scaled so one line is ~100 px high (tesseract sweet spot)."""
    from PIL import Image, ImageOps
    bb = im.point(lambda v: 255 if v > 40 else 0).getbbox() or (0, 0, im.width, im.height)
    p = 24
    im = im.crop((max(0, bb[0] - p), max(0, bb[1] - p), min(im.width, bb[2] + p), min(im.height, bb[3] + p)))
    im = ImageOps.invert(im)
    sc = max(0.5, min(4.0, scale_target / max(size, 1)))
    return im.resize((max(8, int(im.width * sc)), max(8, int(im.height * sc))), Image.LANCZOS)


def prep_frame(path, box, size=None, target=100):
    """Frame crop (glow-composited JPG/PNG): crop, grey, autocontrast, scale so a line is ~100 px high (3x at <= 34 px), invert when dark."""
    from PIL import Image, ImageOps, ImageStat
    im = Image.open(path).convert("L")
    x0, y0, x1, y1 = box
    im = im.crop((max(0, x0), max(0, y0), min(im.width, x1), min(im.height, y1)))
    im = ImageOps.autocontrast(im, cutoff=1)
    sc = max(0.5, min(4.0, target / max(size or 34, 1)))
    im = im.resize((max(8, int(im.width * sc)), max(8, int(im.height * sc))), Image.LANCZOS)
    if ImageStat.Stat(im).mean[0] < 110:
        im = ImageOps.invert(im)
    return im


SCALES = (100, 70, 140, 85, 120)  # target line height (px) fed to tesseract; the best of the variants is scored (test-time augmentation)


def do_ocr(ocr, make_img, multiline):
    """Yield (psm, scale, text) over scale variants x psm; the caller stops at the first pass."""
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / "x.png"
        for tg in SCALES:
            make_img(tg).save(f)
            for psm in ((6, 4) if multiline else (7, 13)):
                yield psm, tg, ocr(f, psm)


# ---------------------------------------------------------------- static checks

def check_digits(text):
    return [f"EASTERN-DIGIT {m.group(0)!r} (U+{ord(m.group(0)):04X}): Western digits only (master 0.3)" for m in EASTERN_DIGITS.finditer(text)][:3]


def blank_iso(text):
    return re.sub(r"⟦[^⟧]*⟧", lambda m: "\u2588" * len(m.group(0)), text)


def check_bidi(text):
    """BiDi case list (arabic_r3 open cases + 04 3.4). Only meaningful with an Arabic parent."""
    errs = []
    if not is_arabic(text):
        return errs
    out = blank_iso(text)
    segs = segment(text)
    for t, ltr in segs:
        if ltr and AR_CORE.search(t):
            errs.append(f"BIDI-AR-IN-LTR Arabic letters inside an LTR isolate {t!r} (a leading '(' or other non-Arabic char swallowed the prefix)")
        if ltr and t.count("(") != t.count(")"):
            errs.append(f"BIDI-PAREN unbalanced parenthesis inside LTR isolate {t!r} (mirroring splits it across the isolate edge)")
    for i in range(len(segs) - 2):
        numeric = lambda t: re.fullmatch(r"[\d.,]+", t) is not None
        if segs[i][1] and not segs[i + 1][1] and segs[i + 1][0].strip() == "" and segs[i + 2][1] and numeric(segs[i][0]) == numeric(segs[i + 2][0]):  # number + word (`6 AI`) is the numbered-tag idiom; word+word and number+number reverse
            errs.append(f"BIDI-MULTIWORD Latin words {segs[i][0]!r} {segs[i + 2][0]!r} are separate isolates (RTL reverses them); wrap in ⟦…⟧")
    if re.search(r"\d[\d.,]*\s+(%|EGP|ms|s|rows)(?![A-Za-z])", out):
        errs.append("BIDI-UNIT number and unit are not one isolate (`66.67 %`, `11 rows`): use ⟦n unit⟧ or withUnit()")
    if re.search(r"\d\s*[=/×÷+−<>≤≥]\s*\d", out):
        errs.append("BIDI-EXPR numeric expression outside one isolate: use ⟦4 / 6 = 66.67 %⟧")
    if re.search(r"\d\s-\s\d|\d-\d(?!\d)|=\s-\d|\(-\d", out) and "−" not in out:
        errs.append("BIDI-MINUS hyphen-minus in a numeric expression: use U+2212 (rule N1)")
    if "?" in out:
        errs.append("BIDI-QMARK Latin '?' in an Arabic string: use '؟' (U+061F)")
    if re.search(r"(?<=[\u0600-\u06FF]),(?=\s|$)", out):
        errs.append("BIDI-COMMA Latin ',' after Arabic: use '،' (U+060C)")
    if re.search(r"(?<=[\u0600-\u06FF]);(?=\s|$)", out):
        errs.append("BIDI-SEMI Latin ';' after Arabic: use '؛' (U+061B)")
    if re.search(r"\d[٫.]\d", out) is None and re.search(r"\d\u060C\d", out):
        errs.append("BIDI-DECIMAL Arabic comma between digits (decimal inside an RTL parent): use '.' in one isolate")
    outside = out
    m = re.search(r"([^→]*)→([^→]*)", outside)
    if m and AR_LETTER.search(m.group(1)[-12:]) and AR_LETTER.search(m.group(2)[:12]):
        errs.append("BIDI-ARROW '→' between Arabic blocks: use '←' (rule A1)")
    if re.search(r"\u061F(?=[\u0600-\u06FF])", out):
        errs.append("BIDI-QMARK-POS '؟' not at the end of its phrase")
    if "\u2028" in text or "\u2029" in text:
        errs.append("BIDI-SEP line/paragraph separator in text")
    lines = break_caption(text)[0]
    for l in lines:
        if l.count("⟦") != l.count("⟧"):
            errs.append(f"BIDI-WRAP a line break falls inside an isolate ⟦…⟧ ({l!r}); keep the isolate on one line")
    return errs


def check_joins(text):
    """`الـ` + Latin (ADR-009 B2 / ADR-010): the article joins with a tatweel; Arabic never touches a Latin glyph directly."""
    errs = []
    if not is_arabic(text):
        return errs
    out = blank_iso(text)
    for m in re.finditer(r"([\u0621-\u063F\u0641-\u064A][\u064B-\u065F]*)(?=[A-Za-z])", out):
        errs.append(f"JOIN-NO-TATWEEL Arabic letter {m.group(1)!r} glued to Latin without tatweel (write `الـKafka`)")
    for m in re.finditer(r"(?<![\u0621-\u063F\u0641-\u064A])(ال|بال|وال|لل|فال|كال)\s+(?=[A-Za-z⟦\u2588])", out):
        errs.append(f"JOIN-ARTICLE-SPACE article {m.group(1)!r} separated from the Latin term by a space: `{m.group(1)}ـterm`")
    for m in re.finditer(r"\u0640\s+(?=[A-Za-z])", out):
        errs.append("JOIN-ORPHAN-TATWEEL tatweel followed by a space before Latin")
    for m in re.finditer(r"\u0640\u0640+", out):
        errs.append("JOIN-DOUBLE-TATWEEL")
    for m in re.finditer(r"\u0640(?![A-Za-z\u2588])", out):
        errs.append("JOIN-TATWEEL-JUSTIFY tatweel not before a Latin isolate (elongation is not allowed)")
    for m in re.finditer(r"(?<=[A-Za-z0-9])(?=[\u0621-\u063F\u0641-\u064A])", out):
        errs.append("JOIN-LATIN-ARABIC Arabic suffix glued to a Latin word; separate it")
        break
    return errs[:4]


def check_copy(text, kind, size):
    errs, warns = [], []
    plain = text.replace("\\n", " | ").replace("\n", " | ")
    lines, ov = break_caption(plain)
    if len(lines) > MAX_LINES:
        errs.append(f"COPY-LINES {len(lines)} lines > {MAX_LINES}")
    for l in lines:
        if vis_len(l) > MAX_CHARS_LINE:
            errs.append(f"COPY-CHARS {vis_len(l)} chars > {MAX_CHARS_LINE} on a line: {l!r}")
    words = len(re.sub(r"⟦[^⟧]*⟧", "X", plain.replace(" | ", " ")).split())
    if kind == "kinetic" and is_arabic(text) and words > KINETIC_MAX_WORDS:
        errs.append(f"COPY-WORDS {words} words > {KINETIC_MAX_WORDS} (kinetic phrase)")
    if size is not None and size < SIZE_FLOOR:
        errs.append(f"SIZE-FLOOR {size}px < {SIZE_FLOOR}px floor (ADR-003)")
    if is_arabic(text):
        for w in MSA_MARKERS:
            if re.search(rf"(?<![\u0621-\u063F\u0641-\u064A]){w}(?![\u0621-\u063F\u0641-\u064A])", text):
                warns.append(f"REGISTER-MSA {w!r} reads MSA {EGY_HINT}")
                break
    if re.search(r"\d\s?(LE|L\.E|ج\.م|جنيه)\b", text):
        warns.append("UNIT-EGP use `EGP` after the number (one isolate)")
    if re.search(r"(?i)\d\s?(secs?|seconds?|milliseconds?|MS)\b(?<!ms)", text) and not re.search(r"\d\s?ms\b", text):
        warns.append("UNIT-FORM use `s` / `ms` (Latin, lower case)")
    if re.search(r"\d%", text) and re.search(r"\d\s%", text):
        warns.append("UNIT-SPACING mixed `66%` and `66 %` in one string (withUnit() uses `66 %`)")
    return errs, warns


def check_tofu(text, size, kind):
    """Every rendered codepoint must have a non-.notdef glyph in the face chain the Mix component uses."""
    plain = IGNORED_CP.sub("", text.replace("⟦", "").replace("⟧", "").replace("\\n", "").replace("\n", "").replace(" | ", " "))
    sz = size or 32
    arabic_faces = [ar_face_for(sz)] if size else ["ar-display", "ar-text"]
    lat = "lat" if label_role(text) == "sentence" else "mono"
    segs = segment(text)
    missing, used = {}, set()
    for t, ltr in segs:
        for ch in IGNORED_CP.sub("", t):
            if ch.isspace():
                continue
            chain = ([lat] + arabic_faces[:1]) if ltr else (arabic_faces[:1] + [lat])
            cands = chain if size else (chain + arabic_faces[1:])
            ok = False
            for f in cands:
                if ord(ch) in font_cmap(face_path(f)):
                    used.add(f)
                    ok = True
                    break
            if not ok:
                # a size-unknown string only has to be covered by one of the Arabic faces
                missing[ord(ch)] = ch
    return [f"U+{c:04X}" for c in sorted(missing)], sorted(used)


# ---------------------------------------------------------------- per-letter animation scan (static)

LETTER_PATTERNS = [
    (re.compile(r"\.split\(\s*(''|\"\")\s*\)"), "split('') (per-character split)"),
    (re.compile(r"\.split\(\s*/\(\?:\)/u?\s*\)"), "split(/(?:)/) (per-character split)"),
    (re.compile(r"\[\.\.\.\s*(?:text|str|label|word|phrase|line|s|t|children|title)\s*\]"), "[...text] spread into characters"),
    (re.compile(r"Array\.from\(\s*(?:text|str|label|word|phrase|line|s|t|children|title)\s*\)"), "Array.from(text) characters"),
    (re.compile(r"\.(?:charAt|codePointAt)\("), "charAt on text"),
    (re.compile(r"\b(?:text|label|word|phrase|str|title)\.slice\(\s*0\s*,\s*[^)]*(?:frame|progress|count|n|i)\b"), "text.slice(0, f(frame)) typewriter"),
    (re.compile(r"(?i)\b(?:typewriter|scramble)\b"), "typewriter/scramble effect"),
]
LATIN_ONLY = re.compile(r"latin-only|mono-only|// *ok-letter|isArabic\(", re.I)


def scan_per_letter(paths):
    hits = []
    files = []
    for p in paths:
        p = Path(p)
        files += sorted(f for f in p.rglob("*") if f.suffix in (".ts", ".tsx") and "node_modules" not in f.parts and ".check." not in f.name) if p.is_dir() else [p]
    for f in files:
        lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
        for i, l in enumerate(lines):
            if l.lstrip().startswith(("//", "*", "/*")):
                continue
            for rx, what in LETTER_PATTERNS:
                if rx.search(l):
                    ctx = "\n".join(lines[max(0, i - 3):i + 4])
                    if LATIN_ONLY.search(ctx):
                        continue
                    hits.append({"where": f"{os.path.relpath(f, ROOT) if str(f).startswith(str(ROOT)) else f}:{i + 1}", "what": what, "code": l.strip()[:110]})
    return hits


# ---------------------------------------------------------------- per-item pipeline

def qa_item_core(it, ocr, args, gap):
    text, size, kind = it["text"], it.get("size"), it["kind"]
    res = {"id": it["id"], "text": text, "size": size, "render_size": size or DEFAULT_SIZE.get(kind, 32), "kind": kind, "sources": it.get("sources", []), "problems": [], "warnings": []}
    P, W = res["problems"], res["warnings"]
    P += check_digits(text)
    bd = check_bidi(text)
    P += bd
    P += check_joins(text)
    res["join"] = bool(re.search(r"\u0640\s*[A-Za-z⟦]", text)) and is_arabic(text)
    ce, cw = check_copy(text, kind, size)
    P += ce
    W += cw
    # sources with Eastern digits etc. still go through render; tofu is checked against the faces
    miss, used = check_tofu(text, size, kind)
    res["tofu"] = {"missing": miss, "faces": used}
    if miss:
        P.append(f"TOFU {len(miss)} codepoint(s) without a glyph: {' '.join(miss)}")
    # --- render + overflow + OCR
    im, evidence, box = None, None, None
    ocr_text = text
    multiline = "\n" in text.replace("\\n", "\n") or " | " in text or len(break_caption(text)[0]) > 1
    try:
        if it.get("png"):
            from PIL import Image
            im = Image.open(it["png"]).convert("L")
            evidence = "chromium-isolated" if not it.get("frame_mode") else "frame"
            pre = lambda tg: prep_isolated(im, size or 32, tg)
            box = (0, 0, *Image.open(it["png"]).size)
        elif it.get("frame"):
            from PIL import Image
            box = tuple(it["box"])
            fp = it["frame"] if os.path.isabs(it["frame"]) else ROOT / it["frame"]
            pre = lambda tg: prep_frame(fp, box, size, tg)
            evidence = "frame-crop"
        else:
            if args.no_render:
                pre = None
            else:
                rim, bb, adv, lines = render_text({**it, "text": text}, gap)
                evidence = "pil-raqm-isolated"
                if len(AR_CORE.findall(text)) < CARRIER_BELOW:
                    # tesseract cannot reliably read a short Arabic stream out of context (`الـAI` -> `Al JI`): OCR it behind a neutral carrier word
                    # laid out by the same code (same faces, same join gap); the carrier is in the want string too
                    res["carrier"] = CARRIER
                    ocr_text = f"{CARRIER} {text}"
                    rim = render_text({**it, "text": ocr_text}, gap)[0]
                pre = lambda tg: prep_isolated(rim, size or DEFAULT_SIZE[kind], tg)
                w_px = bb[2] - bb[0]
                cont_w = it.get("container", {}).get("w") if isinstance(it.get("container"), dict) else None
                cont_w = cont_w or (FRAME_W - 2 * args.safe[0])
                res["overflow"] = {"ink_w": w_px, "ink_h": bb[3] - bb[1], "container_w": cont_w, "lines": len(lines)}
                if res["join"]:  # ADR-010 AT-12 / RT-010-3: the join gap must not be what overflows or adds a line
                    _, bb0, _, _ = render_text({**it, "text": text}, {b: {"caps": 0.0, "latin": 0.0} for b in ("display", "text")})
                    res["overflow"]["ink_w_without_gap"] = bb0[2] - bb0[0]
                    if bb0[2] - bb0[0] <= cont_w < w_px:
                        P.append(f"OVERFLOW-JOIN-GAP fits without the join gap ({bb0[2] - bb0[0]}px) but not with it ({w_px}px > {cont_w}px): RT-010-3")
                if w_px > cont_w:
                    P.append(f"OVERFLOW ink width {w_px}px > container {cont_w}px at {size or DEFAULT_SIZE[kind]}px")
                ch = it.get("container", {}).get("h") if isinstance(it.get("container"), dict) else None
                if ch and bb[3] - bb[1] > ch:
                    P.append(f"OVERFLOW ink height {bb[3] - bb[1]}px > container {ch}px")
    except Exception as e:  # missing file etc.
        P.append(f"RENDER-ERROR {type(e).__name__}: {e}")
        pre = None
    if it.get("box") and not it.get("png"):  # frame crop must sit inside the text-safe rectangle
        x0, y0, x1, y1 = it["box"]
        if x0 < args.safe[0] or y0 < args.safe[1] or x1 > FRAME_W - args.safe[0] or y1 > FRAME_H - args.safe[1]:
            P.append(f"OVERFLOW box {list(it['box'])} leaves the text-safe area ({args.safe[0]},{args.safe[1]} margins)")
        res["overflow"] = {"box": list(it["box"]), "safe": [args.safe[0], args.safe[1], FRAME_W - args.safe[0], FRAME_H - args.safe[1]]}
    res["evidence"] = evidence
    res["renderer"] = {"pil-raqm-isolated": "PIL/Raqm (HarfBuzz) + frozen faces + J1 gap", "chromium-isolated": "Chromium (Remotion) probe PNG",
                       "frame-crop": "delivered frame crop (glow composited)"}.get(evidence)
    if args.ocr and pre is not None and ocr is not None and (is_arabic(text) or it.get("force_ocr")):
        best = {"score": -1.0, "rank": (-1, -1.0)}
        for psm, tg, got in do_ocr(ocr, pre, multiline):
            want = want_visual(ocr_text.replace(" | ", " ").replace("\\n", " "))
            s, exact = ocr_score(got, want)
            junk = latin_junk(got, want) if res["join"] else ""
            rank = (not junk and s >= args.min_score, s)
            if rank > best["rank"]:
                best = {"score": s, "exact": exact, "psm": psm, "scale": tg, "got": got, "rank": rank, "join_junk": junk}
                if res["join"]:
                    best["join_region_ok"] = join_region_ok(got, want)
            if rank[0]:
                break
        best.pop("rank")
        best["pass"] = best["score"] >= args.min_score and not best.get("join_junk")
        res["ocr"] = best
        if (not best["pass"] and res["join"] and evidence == "pil-raqm-isolated"
                and len(re.sub(r"[^A-Za-z]", "", re.sub(r"[\u0600-\u06FF]+", "", text))) <= 3):
            # 1-3 letter Latin term (`AI`): tesseract reads it as Arabic (`ام`) even with no join at all. Control: the same string with the tatweel
            # replaced by a space. If the control fails too, the failure is script ambiguity, not the join: warning + native-reader review (AT-11).
            ctl = re.sub(r" +", " ", text.replace("\u0640", " "))
            ctl_ocr = f"{CARRIER} {ctl}" if res.get("carrier") else ctl
            crim = render_text({**it, "text": ctl_ocr}, gap)[0]
            cbest = -1.0
            for _psm, _tg, got in do_ocr(ocr, lambda tg: prep_isolated(crim, size or DEFAULT_SIZE[kind], tg), multiline):
                cbest = max(cbest, ocr_score(got, want_visual(ctl_ocr.replace(" | ", " ")))[0])
                if cbest >= args.min_score:
                    break
            best["control"] = {"text": ctl, "score": cbest}
            if cbest < args.min_score:
                best["script_ambiguous"] = True
                W.append(f"OCR-SCRIPT-AMBIGUOUS {best['score']} on a 1-3 letter Latin term; the no-join control {ctl!r} also scores {cbest} (Latin `AI` reads as Arabic `ام`): "
                         "OCR cannot judge this join, native-reader review required (ADR-010 AT-11)")
        if best.get("script_ambiguous"):
            pass
        elif not best["pass"] and it.get("known_noise") and evidence == "frame-crop":
            W.append(f"FRAME-OCR-NOISE score {best['score']} on a glow-composited frame crop (known_noise; the isolated render is the gate)")
        elif not best["pass"]:
            P.append(f"OCR score {best['score']} < {args.min_score} ({res['evidence']}); got {best['got']!r}"
                     if best["score"] < args.min_score else
                     f"OCR join junk {best['join_junk']!r} next to the Latin term ({res['evidence']}; ADR-010 AT-11): got {best['got']!r}")
    elif args.ocr and ocr is None:
        res["ocr"] = {"skipped": "no OCR engine"}
    elif not is_arabic(text):
        res["ocr"] = {"skipped": "no Arabic letters (Latin/numeric string; OCR gate is for Arabic shaping)"}
    seen = set()
    P[:] = [x for x in P if not (x in seen or seen.add(x))]
    exp = it.get("expect")
    res["status"] = "fail" if P else "pass"
    if exp == "fail":  # negative fixtures: the checker must catch this string
        res["status"] = "pass" if P else "fail"
        res["expected_fail"] = True
    return res


def qa_item(it, ocr, args, gap):
    """Known size (or a PNG/frame): one pass. Unknown size (strings lifted from source): both type bands, 34 px text and 92 px display;
    the string fails OCR only if it fails in BOTH (one weak band is a warning), non-OCR checks run once at 34 px."""
    if it.get("size") or it.get("png") or it.get("frame"):
        return qa_item_core(it, ocr, args, gap)
    a, b = qa_item_core({**it, "size": 34}, ocr, args, gap), qa_item_core({**it, "size": 92}, ocr, args, gap)
    res = dict(a)
    res["size"], res["render_size"] = None, [34, 92]
    isocr = lambda x: x.startswith("OCR ")
    if "score" in a.get("ocr", {}) and "score" in b.get("ocr", {}):
        best = a if a["ocr"]["score"] >= b["ocr"]["score"] else b
        worst = b if best is a else a
        res["ocr"] = {**best["ocr"], "bands": {"34": a["ocr"]["score"], "92": b["ocr"]["score"]}}
        res["problems"] = [x for x in a["problems"] if not isocr(x)] + [x for x in best["problems"] if isocr(x)]
        res["warnings"] = a["warnings"] + [f"OCR-BAND {x}" for x in worst["problems"] if isocr(x)] if best["ocr"]["pass"] else a["warnings"]
    res["tofu"] = {"missing": sorted(set(a["tofu"]["missing"]) | set(b["tofu"]["missing"])), "faces": sorted(set(a["tofu"]["faces"]) | set(b["tofu"]["faces"]))}
    res["status"] = "fail" if res["problems"] else "pass"
    if it.get("expect") == "fail":
        res["status"] = "pass" if res["problems"] else "fail"
        res["expected_fail"] = True
    return res


def probe_items(d):
    d = Path(d)
    pr = json.loads((d / "probes.json").read_text())
    out = []
    for p in pr:
        out.append({"id": p["id"], "text": p["text"], "size": p["size"], "kind": "kinetic" if p["size"] >= 56 else "label", "png": str(d / f"{p['id']}.png"),
                    "sources": [f"probe:{d.name}/{p['id']}"], "gate": p.get("gate", False)})
    return out


def run(args):
    t0 = datetime.datetime.now(datetime.timezone.utc)
    items, flags, scan_paths = [], [], list(args.scan or [])
    for f in args.items or []:
        items += load_items(f)
    for f in args.frames or []:
        items += [{**x, "frame": x.get("frame") or x.get("png"), "kind": x.get("kind", "kinetic")} for x in load_items(f)]
    for f in args.spec or []:
        i, fl = items_from_spec(f)
        items += i
        flags += fl
    if args.src:
        items += items_from_src(args.src)
        scan_paths += args.src
    for d in args.probes or []:
        items += probe_items(d)
    for s in args.string or []:
        m = re.match(r"^(.*)@(\d+)$", s, re.S)
        items.append({"text": m.group(1) if m else s, "size": int(m.group(2)) if m else args.size, "kind": args.kind})
    if not items and not scan_paths:
        print("dc qa arabic: nothing to check (use --items/--spec/--src/--frames/--probes/--string/--scan)", file=sys.stderr)
        return 2
    items = dedupe(items)
    gap = None
    if args.gap_em is not None:
        gap = {b: {"caps": args.gap_em, "latin": args.gap_em} for b in ("display", "text")}
    ocr = find_ocr(args.ocr_cmd) if args.ocr else None
    if args.ocr and ocr is None:
        print("dc qa arabic: no OCR engine (install tesseract with ara+eng, or pass --ocr-cmd / $DC_OCR_CMD, or --no-ocr for a structural-only run)", file=sys.stderr)
    jobs = max(1, args.jobs)
    with cf.ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(lambda it: qa_item(it, ocr, args, gap), items))
    letters = scan_per_letter(scan_paths) if scan_paths else []
    letters += flags
    negatives = [r for r in results if r.get("expected_fail")]
    caught = sum(r["status"] == "pass" for r in negatives)
    results_all = results
    results = [r for r in results if not r.get("expected_fail")]
    jg = read_join_gap()
    adr10, adr10_gap = None, None
    for q in sorted((ROOT / "docs/decisions").glob("ADR-010*.md")):
        t = q.read_text(encoding="utf-8")
        if re.search(r"(?mi)^Status:\s*decided", t):
            adr10 = str(q.relative_to(ROOT))
            m = re.search(r"JOIN_GAP = \{display: \{caps: ([\d.]+), latin: ([\d.]+)\}, text: \{caps: ([\d.]+), latin: ([\d.]+)\}\}", t)
            if m:
                a = [float(x) for x in m.groups()]
                adr10_gap = {"display": {"caps": a[0], "latin": a[1]}, "text": {"caps": a[2], "latin": a[3]}}
    ref = adr10_gap if adr10_gap else ADR9_B2
    policy = {"code_join_gap": jg, "basis": adr10 or "docs/decisions/ADR-009 B2 (no decided ADR-010)", "reference_join_gap": ref,
              "code_matches_basis": jg == ref, "adr009_b2": ADR9_B2,
              "note": None if jg == ref else "arabic.ts JOIN_GAP differs from the decided join policy: Council amendment needed (freeze_p6.py cond 5)"}
    if args.gap_em is not None:
        policy["note"] = f"gap overridden to {args.gap_em} em for a sweep: not gate evidence"
    join_items = [r for r in results if r.get("join")]
    join_scored = [r for r in join_items if "score" in r.get("ocr", {})]
    ocr_items = [r for r in results if "score" in r.get("ocr", {})]
    skipped_ocr = [r for r in results if r.get("ocr", {}).get("skipped") == "no OCR engine"]
    n_fail = sum(r["status"] == "fail" for r in results_all)
    tofu_n = sum(len(r["tofu"]["missing"]) for r in results)
    metrics = {
        "strings": len(results), "failed": n_fail, "negative_fixtures": len(negatives), "negative_caught": caught, "ocr_scored": len(ocr_items), "ocr_pass": sum(r["ocr"]["pass"] for r in ocr_items),
        "ocr_min": min((r["ocr"]["score"] for r in ocr_items), default=None), "ocr_exact": sum(r["ocr"]["exact"] for r in ocr_items),
        "tofu_codepoints": tofu_n, "overflow": sum(any(p.startswith("OVERFLOW") for p in r["problems"]) for r in results),
        "bidi": sum(any(p.startswith("BIDI") for p in r["problems"]) for r in results),
        "digits": sum(any(p.startswith("EASTERN") for p in r["problems"]) for r in results),
        "joins": sum(any(p.startswith("JOIN") for p in r["problems"]) for r in results),
        "copy": sum(any(p.startswith(("COPY", "SIZE")) for p in r["problems"]) for r in results),
        "join_strings": len(join_items), "join_min": min((r["ocr"]["score"] for r in join_scored), default=None),
        "join_below_min": [r["id"] for r in join_scored if not r["ocr"]["pass"] and not r["ocr"].get("script_ambiguous")],
        "rt_010_2": [r["id"] for r in join_scored if not r["ocr"]["pass"] and not r["ocr"].get("script_ambiguous") and not r["ocr"].get("join_region_ok")],
        "join_script_ambiguous": [r["id"] for r in join_scored if r["ocr"].get("script_ambiguous")], "per_letter_hits": len(letters), "evidence": {e: sum(r.get("evidence") == e for r in results) for e in {r.get("evidence") for r in results}},
    }
    incomplete = (not args.ocr) or bool(skipped_ocr) or (not ocr_items and any(is_arabic(r["text"]) for r in results))
    verdict = "fail" if (n_fail or letters) else ("incomplete" if incomplete else "pass")
    if args.no_ocr_ok and verdict == "incomplete":
        verdict = "pass"
    rep = {"v": 1, "tool": "dc qa arabic", "created": t0.strftime("%Y-%m-%dT%H:%M:%SZ"), "label": args.label,
           "thresholds": {"ocr_min": args.min_score, "kinetic_max_words": KINETIC_MAX_WORDS, "max_chars_line": MAX_CHARS_LINE, "max_lines": MAX_LINES,
                          "size_floor_px": SIZE_FLOOR, "safe_margin_px": list(args.safe)},
           "verdict": verdict, "metrics": metrics, "join_policy": policy, "per_letter": letters, "items": results_all,
           "open_bidi_not_automatable": ["mirrored ؟ under the RTL wipe (frame-time check)", "Latin isolate wrapping across a 2-line break in the browser (static check covers ⟦⟧ only)"]}
    out = Path(args.out) if args.out else ROOT / f"reports/qa/arabic/{args.label}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rep, ensure_ascii=False, indent=1))
    for r in results:
        if r["problems"] or args.verbose:
            sc = r.get("ocr", {}).get("score")
            print(f"{'FAIL' if r['status'] == 'fail' else ' ok '} {r['id']:<22} {str(r['render_size']):>8}px ocr={sc if sc is not None else '-'} {r['text']!r}")
            for p in r["problems"]:
                print(f"       - {p}")
    if metrics["rt_010_2"]:
        print(f"RT-010-2 evidence: {len(metrics['rt_010_2'])} join string(s) below {args.min_score} with the Latin term damaged or junk beside it: {', '.join(metrics['rt_010_2'])} (Council reopens the band, ADR-010)")
    for h in letters:
        print(f"LETTER {h['where']}: {h['what']}")
    m = metrics
    print(f"dc qa arabic [{args.label}] {verdict.upper()}: {m['strings']} strings, {m['failed']} failed; OCR {m['ocr_pass']}/{m['ocr_scored']} >= {args.min_score} "
          f"(min {m['ocr_min']}, exact {m['ocr_exact']}); tofu {m['tofu_codepoints']}; overflow {m['overflow']}; bidi {m['bidi']}; digits {m['digits']}; "
          f"joins {m['joins']} (join strings {m['join_strings']}, min OCR {m['join_min']}); copy {m['copy']}; per-letter {m['per_letter_hits']}; join basis: {policy['basis']}. Report {os.path.relpath(out, ROOT)}")
    return {"pass": 0, "fail": 1, "incomplete": 2}[verdict]


def cmd_arabic(args):
    return run(args)


def register(sub):
    q = sub.add_parser("qa", help="QA suites: arabic (implemented); chapter/film/sync land in P9")
    qs = q.add_subparsers(dest="qa_cmd", required=True)
    s = qs.add_parser("arabic", help="Arabic on-screen text suite: OCR round-trip, tofu, overflow, BiDi, digits, joins, per-letter scan")
    s.add_argument("--items", action="append", metavar="FILE", help="JSON list of strings or items {id,text,size,kind,container,png,expect}")
    s.add_argument("--spec", action="append", metavar="FILE", help="scene spec(s): every string leaf of layers[].props")
    s.add_argument("--src", action="append", metavar="PATH", help="TS/TSX file or dir: Arabic literals (component demos) + per-letter scan")
    s.add_argument("--frames", action="append", metavar="FILE", help="JSON items with frame (JPG/PNG) + box [x0,y0,x1,y1] in 1920x1080")
    s.add_argument("--probes", action="append", metavar="DIR", help="Chromium isolated renders (probes.json + <id>.png)")
    s.add_argument("--string", action="append", help="one string, `text` or `text@size` (repeatable); with --size/--kind")
    s.add_argument("--size", type=int, default=None)
    s.add_argument("--kind", default="label", choices=["kinetic", "caption", "chip", "number", "label"])
    s.add_argument("--scan", action="append", metavar="PATH", help="extra TS/TSX paths for the per-letter animation scan")
    s.add_argument("--label", default="latest", help="report name: reports/qa/arabic/<label>.json")
    s.add_argument("--out", default=None)
    s.add_argument("--min-score", type=float, default=OCR_MIN)
    s.add_argument("--no-ocr", dest="ocr", action="store_false", help="structural checks only (verdict becomes 'incomplete', exit 2)")
    s.add_argument("--no-ocr-ok", action="store_true", help="with --no-ocr: report pass instead of incomplete (never for G6b evidence)")
    s.add_argument("--no-render", action="store_true")
    s.add_argument("--ocr-cmd", default=None, help="OCR command: `<cmd> <image> <psm>` prints text (default tesseract ara+eng)")
    s.add_argument("--gap-em", type=float, default=None, help="override the J1 join gap (em) for a sweep")
    s.add_argument("--safe", type=lambda v: tuple(int(x) for x in v.split(",")), default=(SAFE_X, SAFE_Y), help="text-safe margins X,Y in px (default 68,38)")
    s.add_argument("--jobs", type=int, default=1)
    s.add_argument("-v", "--verbose", action="store_true")
    s.set_defaults(fn="qa_arabic.cmd_arabic")
    for name in ("chapter", "film", "sync"):
        p = qs.add_parser(name, help="not implemented yet (P9)")
        p.add_argument("rest", nargs="*")
        p.set_defaults(fn="qa_arabic.cmd_planned", qa_name=name)


def cmd_planned(args):
    print(f"dc qa {args.qa_name}: not implemented yet (owner phase P9; see docs/plan/02 section 9.2)", file=sys.stderr)
    return 3
