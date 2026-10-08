"""Pixel-grounded audit of vision captions (G2 `visuals_captioned_ocr`, `dc visual audit`).

Why this exists: the first caption pass judged some slides from their (noisy) OCR text instead of the pixels, so 30 busy slides
were captioned "blank / corrupted" and OCR fragments were copied into `numbers_seen` as if they were read from the picture.
A caption can say anything, so the gate re-checks it against the image itself:

  1. blank_claim   a vision caption that calls the whole image blank / corrupted / illegible / placeholder is accepted only if the
                   picture really is nearly empty (ink fraction below INK_MIN, after masking the "Gemini Notebook" watermark and the
                   frame line) AND OCR found no text AND the record carries no text_seen / numbers_seen.
  2. numbers       every number in numbers_seen has to appear (digit-normalised) in text_seen, ocr, caption_en, caption_ar or layout,
                   unless numbers_seen is exactly a numbered-card run 1..n (n <= 9). A number that appears nowhere else is an invented
                   number: it cannot be tied to anything the caption author said they saw.
  3. ocr_numbers   (G2 verifier fix) for render_keyframes, whose OCR is read from the full 1080p frame (two reads: line OCR psm 6 and
                   sparse OCR psm 11), every number in numbers_seen has to appear in that OCR. The previous check (2) only compared
                   numbers_seen with text the captioner wrote itself, which is circular: an invented "99" passed because the same
                   captioner also wrote "99%" into text_seen. A number that OCR cannot read but the eye can (a chart label drawn in
                   a glyph the OCR drops) is accepted only when the reviewer lists it in `numbers_pixel_only`, which requires
                   `reviewed: pixels`; the gate prints how many numbers were accepted that way.
  4. placeholders  a caption_ar shorter than AR_MIN characters (a truncated stub such as "درس من دورة DA Camp - مفه"), a caption_ar
                   or caption_en shared by more than DUP_MAX assets of one caption batch (batch_026 repeated one stub 25 times and
                   6 English captions 19 times), or a caption_ar repeated anywhere in the corpus more than DUP_MAX times.
  5. review state  `reviewed: pixels` means the CAPTION itself was re-read against the picture (the recaption carries caption_en
                   and caption_ar, or `caption_confirmed: true`). A review of numbers_seen/text_seen alone is `reviewed: numbers`
                   and never counts as a caption review. The merge (visual_merge.py) enforces this; the audit re-checks the result.

`audit(assets)` returns the findings; nothing here weakens a threshold: INK_MIN is deliberately low (a real blank slide measures
below 0.001, the faintest real content in the corpus, a ghosted table, measures 0.005).
"""
import json
import os
import re

from . import common as C

INK_MIN = 0.003
AR_MIN = 20          # shortest plausible Arabic caption; shorter than any real title caption (the shortest in the corpus after the fix is 20+)
AR_THIN = 30         # captions under this are legal but thin: they only raise the review risk score
DUP_MAX = 2          # one caption text may be shared by at most this many assets of a batch (two near-identical frames)
BLANK_RX = re.compile(
    r"\b(?:blank|empty|mostly empty|mostly blank|faded)\b (?:or [\w ]{0,20}?)?(?:slide|frame|transition|image|content)\b"
    r"|\b(?:corrupted|corrupt|garbled|degraded|illegible|obscured|unclear)\b (?:or [\w ]{0,20}?)?(?:slide|frame|image|visual|content|text|ocr)\b"
    r"|\b(?:appears|heavily|partly|partially) (?:corrupted|garbled|degraded|obscured)\b"
    r"|\bnot usable\b|\blow (?:visual )?quality\b|\binsufficient (?:educational|visual|textual|content)\b"
    r"|\bminimal (?:content|visual|unclear)\b|\bplaceholder\b|\bfiller\b|\bvisual clarity\b", re.I)
AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def ink_fraction(path):
    """Share of pixels that differ clearly from the background (median grey), 320x180, watermark and frame line masked."""
    import numpy as np
    from PIL import Image
    im = Image.open(path).convert("L").resize((320, 180))
    a = np.asarray(im, dtype=np.float32)[2:-2, :].copy()
    h, w = a.shape
    a[int(h * 0.93):, int(w * 0.85):] = np.median(a)
    return float((np.abs(a - np.median(a)) > 40).mean())


def _tokens(s):
    return set(re.findall(r"\d+(?:\.\d+)?", _group_digits(s.translate(AR_DIGITS).replace(",", ""))))


_GROUP_SP = re.compile(r"(?<=\d)[ \u00a0\u202f\u2009](?=\d{3}(?!\d))")


def _group_digits(s):
    """'12 500' / '1 000 000' / '1\u202f240.00' are one number: drop space-like thousands separators between digit groups."""
    prev = None
    while prev != s:
        prev, s = s, _GROUP_SP.sub("", s)
    return s


def number_supported(num, blob_tokens, blob_text):
    n = str(num).translate(AR_DIGITS).replace(",", "").strip()
    core = n.rstrip("%")
    if core in blob_tokens or n in blob_text.replace(",", ""):
        return True
    inner = re.findall(r"\d+(?:\.\d+)?", core)   # '4k', '6/9', '0x05': every digit group has to be backed
    return bool(inner) and all(t in blob_tokens for t in inner)


def numbers_unsupported(rec):
    ns = [str(x) for x in rec.get("numbers_seen") or []]
    if not ns:
        return []
    try:
        v = sorted(int(x) for x in ns)
        if v == list(range(1, len(v) + 1)) and len(v) <= 9:
            return []     # numbered cards 1..n
    except ValueError:
        pass
    blob = " ".join(str(rec.get(k, "")) for k in ("text_seen", "ocr", "caption_en", "caption_ar", "layout"))
    toks, text = _tokens(blob), _group_digits(blob.translate(AR_DIGITS))
    return [n for n in ns if not number_supported(n, toks, text)]


def blank_claim(rec):
    return bool(BLANK_RX.search(rec.get("caption_en", "")))


_SPARSE = None


def _sparse_text(aid, root):
    global _SPARSE
    if _SPARSE is None or _SPARSE[0] != root:
        d = {}
        pth = os.path.join(root, "data", "derived", "visual", "ocr", "sparse.jsonl")
        if os.path.exists(pth):
            for r in C.read_jsonl(pth):
                d[r["asset_id"]] = r.get("text", "")
        _SPARSE = (root, d)
    return _SPARSE[1].get(aid, "")


def _norm_ar(s):
    s = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", s)
    return s.translate(str.maketrans("أإآٱىة", "ااااية"))


def _words(s, minlen=3):
    return [w for w in re.findall(r"[A-Za-z0-9\u0600-\u06ff]+", _norm_ar(s.lower())) if len(w) >= minlen]


def text_overlap(rec):
    """Share of the captioner's text_seen words (>= 3 chars) that OCR also found (exact, or close: difflib ratio >= 0.8).
    A low value on a slide with decent OCR hints that text_seen was copied from another image (the swapped-caption defect)."""
    import difflib
    seen = _words(rec.get("text_seen", ""))
    if len(seen) < 3:
        return None
    ocr = set(_words(rec.get("ocr", "")))
    if not ocr:
        return None
    hit = 0
    for w in seen:
        if w in ocr or any(abs(len(w) - len(o)) <= 2 and difflib.SequenceMatcher(None, w, o).ratio() >= 0.8 for o in ocr):
            hit += 1
    return hit / len(seen)


def numbers_vs_ocr(rec, root=None):
    """numbers_seen entries of a render_keyframe that neither OCR read contains (and the reviewer did not list as pixel-only)."""
    if rec.get("kind") != "render_keyframe":
        return []
    ns = [str(x) for x in rec.get("numbers_seen") or []]
    if not ns:
        return []
    blob = (rec.get("ocr") or "") + " " + _sparse_text(rec["asset_id"], root or C.ROOT)
    toks, text = _tokens(blob), _group_digits(blob.translate(AR_DIGITS))
    ok_pix = {str(x) for x in rec.get("numbers_pixel_only") or []} if rec.get("reviewed") == "pixels" else set()
    return [n for n in ns if n not in ok_pix and not number_supported(n, toks, text)]


def placeholder_findings(assets):
    """Placeholder / recycled captions: short caption_ar, and caption texts shared by too many assets of one batch (or of the corpus)."""
    import collections
    batch_of = {}
    bdir = os.path.join(C.ROOT, "data", "derived", "visual", "batches")
    if os.path.isdir(bdir):
        for f in sorted(os.listdir(bdir)):
            if re.match(r"batch_\d{3}\.json$", f):
                b = C.read_json(os.path.join(bdir, f))
                for it in b.get("items", []):
                    batch_of[it["asset_id"]] = b["batch"]
    short, dup_en, dup_ar = [], [], []
    by_b_en, by_b_ar, by_ar = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
    for r in assets:
        if r.get("caption_src") != "vision":
            continue
        if len(r.get("caption_ar", "").strip()) < AR_MIN:
            short.append(r["asset_id"])
        b = batch_of.get(r["asset_id"], "?")
        by_b_en[(b, r.get("caption_en", "").strip())].append(r["asset_id"])
        by_b_ar[(b, r.get("caption_ar", "").strip())].append(r["asset_id"])
        by_ar[r.get("caption_ar", "").strip()].append(r["asset_id"])
    for (b, t), ids in by_b_en.items():
        if t and len(ids) > DUP_MAX:
            dup_en.append({"batch": b, "assets": len(ids), "caption": t[:70], "first": ids[0]})
    for (b, t), ids in by_b_ar.items():
        if t and len(ids) > DUP_MAX:
            dup_ar.append({"batch": b, "assets": len(ids), "caption": t[:50], "first": ids[0]})
    for t, ids in by_ar.items():
        if t and len(ids) > DUP_MAX and not any(d["caption"] == t[:50] for d in dup_ar):
            dup_ar.append({"batch": "corpus", "assets": len(ids), "caption": t[:50], "first": ids[0]})
    return {"short_caption_ar": short, "duplicate_caption_en": dup_en, "duplicate_caption_ar": dup_ar}


def risk_scores(assets, root=None):
    """asset_id -> {score, why}: where a second pixel look is most likely to find a wrong caption (review worklist order)."""
    ph = placeholder_findings(assets)
    dup_ids = set()
    for k in ("duplicate_caption_en", "duplicate_caption_ar"):
        dup_ids.update(d["first"] for d in ph[k])
    short = set(ph["short_caption_ar"])
    out = {}
    for r in assets:
        if r.get("caption_src") != "vision":
            continue
        sc, why = 0.0, []
        if r["asset_id"] in short:
            sc += 5; why.append("short-ar")
        elif len(r.get("caption_ar", "").strip()) < AR_THIN:
            sc += 0.7; why.append("thin-ar")
        if r["asset_id"] in dup_ids:
            sc += 3; why.append("dup")
        c = r.get("ocr_conf")
        if r["kind"] == "slide" and c is not None and c < 60:
            sc += 1.5; why.append(f"conf{c:.0f}")
        ov = text_overlap(r) if r["kind"] != "render_keyframe" else None
        if ov is not None and ov < 0.35 and (c or 0) >= 55:
            sc += 2.5; why.append(f"overlap{ov:.2f}")
        nb = numbers_vs_ocr(r, root)
        if nb:
            sc += min(3, len(nb)); why.append(f"nums-not-in-ocr{nb[:3]}")
        if r.get("reviewed") != "pixels":
            sc += 0.5
        out[r["asset_id"]] = {"score": sc, "why": " ".join(why)}
    return out


def audit(assets, root=None):
    """assets: iterable of merged records. Returns dict with lists of findings."""
    root = root or C.ROOT
    assets = list(assets)
    out = {"checked": 0, "blank_claims": [], "blank_false": [], "numbers_unsupported": [], "ink_errors": [], "numbers_not_in_ocr": [],
           "numbers_pixel_only": 0, "reviewed_pixels": 0, "reviewed_numbers": 0, "unreviewed": 0, "reviewed_bad": [],
           "keyframes_without_sparse_ocr": 0, "text_overlap_low": []}
    out.update(placeholder_findings(assets))
    for r in assets:
        if r.get("caption_src") != "vision":
            continue
        out["checked"] += 1
        bad = numbers_unsupported(r)
        if bad:
            out["numbers_unsupported"].append({"asset_id": r["asset_id"], "numbers": bad})
        if r["kind"] == "render_keyframe":
            if not _sparse_text(r["asset_id"], root):
                out["keyframes_without_sparse_ocr"] += 1
            nb = numbers_vs_ocr(r, root)
            if nb:
                out["numbers_not_in_ocr"].append({"asset_id": r["asset_id"], "numbers": nb})
            if r.get("reviewed") == "pixels":
                out["numbers_pixel_only"] += len(r.get("numbers_pixel_only") or [])
        rv = r.get("reviewed")
        if rv == "pixels":
            out["reviewed_pixels"] += 1
            if not r.get("review_note") or not r.get("caption_checked"):
                out["reviewed_bad"].append(r["asset_id"])
        elif rv == "numbers":
            out["reviewed_numbers"] += 1
        else:
            out["unreviewed"] += 1
        ov = text_overlap(r) if r["kind"] != "render_keyframe" else None
        if ov is not None and ov < 0.2 and (r.get("ocr_conf") or 0) >= 65 and rv != "pixels":
            out["text_overlap_low"].append({"asset_id": r["asset_id"], "overlap": round(ov, 2)})
        if blank_claim(r):
            out["blank_claims"].append(r["asset_id"])
            p = os.path.join(root, r.get("path", ""))
            try:
                ink = ink_fraction(p)
            except Exception as e:   # unreadable image: cannot confirm the claim, so it fails
                out["ink_errors"].append({"asset_id": r["asset_id"], "error": str(e)[:120]})
                continue
            has_content = ink >= INK_MIN or len((r.get("ocr") or "").strip()) >= 15 or r.get("text_seen") or r.get("numbers_seen")
            if has_content:
                out["blank_false"].append({"asset_id": r["asset_id"], "ink": round(ink, 4), "ocr_chars": len((r.get("ocr") or "").strip()),
                                           "caption": r.get("caption_en", "")[:90]})
    return out


def audit_ok(res):
    return not (res["blank_false"] or res["numbers_unsupported"] or res["ink_errors"] or res["numbers_not_in_ocr"] or res["short_caption_ar"]
                or res["duplicate_caption_en"] or res["duplicate_caption_ar"] or res["reviewed_bad"] or res["text_overlap_low"]
                or res["keyframes_without_sparse_ocr"])


def cmd_audit(args):
    path = C.p("corpus", "visual", "assets.jsonl")
    res = audit(C.read_jsonl(path))
    ok = audit_ok(res)
    res["ink_min"] = INK_MIN
    res["ok"] = ok
    C.write_json(C.p("reports", "visual", "audit.json"), res)
    print(f"visual audit: {res['checked']} vision captions; blank/corrupt claims {len(res['blank_claims'])} "
          f"(contradicted by the pixels: {len(res['blank_false'])}); numbers not backed by any text: {len(res['numbers_unsupported'])}; "
          f"unreadable images {len(res['ink_errors'])}; keyframe numbers not in OCR {len(res['numbers_not_in_ocr'])}; short caption_ar "
          f"{len(res['short_caption_ar'])}; recycled captions en/ar {len(res['duplicate_caption_en'])}/{len(res['duplicate_caption_ar'])}; "
          f"reviewed caption-level {res['reviewed_pixels']}, numbers-only {res['reviewed_numbers']}, never {res['unreviewed']} "
          f"-> {'OK' if ok else 'FAIL'} (reports/visual/audit.json)")
    for k in ("numbers_not_in_ocr", "duplicate_caption_en", "duplicate_caption_ar", "text_overlap_low"):
        for f in res[k][:6]:
            print(f"  {k}:", f)
    for f in res["blank_false"][:10]:
        print("  blank claim on busy image:", f)
    for f in res["numbers_unsupported"][:10]:
        print("  unsupported numbers:", f)
    return 0 if ok else 1


def register_audit(vs):
    s = vs.add_parser("audit", help="pixel-grounded audit of vision captions: blank claims vs ink, numbers_seen vs text (G2 uses it)")
    s.set_defaults(fn="visual_audit.cmd_audit")
