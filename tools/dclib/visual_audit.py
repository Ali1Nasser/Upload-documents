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
  3. recheck       the record must not be flagged `reviewed` unless it carries `reviewed_note` (who looked, when). Optional.

`audit(assets)` returns the findings; nothing here weakens a threshold: INK_MIN is deliberately low (a real blank slide measures
below 0.001, the faintest real content in the corpus, a ghosted table, measures 0.005).
"""
import json
import os
import re

from . import common as C

INK_MIN = 0.003
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
    return set(re.findall(r"\d+(?:\.\d+)?", s.translate(AR_DIGITS).replace(",", "")))


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
    toks, text = _tokens(blob), blob.translate(AR_DIGITS)
    return [n for n in ns if not number_supported(n, toks, text)]


def blank_claim(rec):
    return bool(BLANK_RX.search(rec.get("caption_en", "")))


def audit(assets, root=None):
    """assets: iterable of merged records. Returns dict with lists of findings."""
    root = root or C.ROOT
    out = {"checked": 0, "blank_claims": [], "blank_false": [], "numbers_unsupported": [], "ink_errors": []}
    for r in assets:
        if r.get("caption_src") != "vision":
            continue
        out["checked"] += 1
        bad = numbers_unsupported(r)
        if bad:
            out["numbers_unsupported"].append({"asset_id": r["asset_id"], "numbers": bad})
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


def cmd_audit(args):
    path = C.p("corpus", "visual", "assets.jsonl")
    res = audit(C.read_jsonl(path))
    ok = not (res["blank_false"] or res["numbers_unsupported"] or res["ink_errors"])
    res["ink_min"] = INK_MIN
    res["ok"] = ok
    C.write_json(C.p("reports", "visual", "audit.json"), res)
    print(f"visual audit: {res['checked']} vision captions; blank/corrupt claims {len(res['blank_claims'])} "
          f"(contradicted by the pixels: {len(res['blank_false'])}); numbers not backed by any text: {len(res['numbers_unsupported'])}; "
          f"unreadable images {len(res['ink_errors'])} -> {'OK' if ok else 'FAIL'} (reports/visual/audit.json)")
    for f in res["blank_false"][:10]:
        print("  blank claim on busy image:", f)
    for f in res["numbers_unsupported"][:10]:
        print("  unsupported numbers:", f)
    return 0 if ok else 1


def register_audit(vs):
    s = vs.add_parser("audit", help="pixel-grounded audit of vision captions: blank claims vs ink, numbers_seen vs text (G2 uses it)")
    s.set_defaults(fn="visual_audit.cmd_audit")
