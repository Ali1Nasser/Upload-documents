"""OCR score for the isolated type probes (arabic r3 B2 gate: >= 0.90 on the gate strings). Smoke-level precursor of `dc qa arabic`.
Usage: python3 -I studio/scripts/lookdev_typeprobe_ocr.py [probe_dir]. Tesseract ara+eng, psm 7, on an inverted 2x grey crop.
Score = SequenceMatcher ratio of (Arabic letters in logical order) + '|' + (every other non-space char), got vs want. Tesseract emits the
Latin isolate before or after the Arabic run (a reading-order artefact, not a join defect), so the two scripts are compared as separate
streams; join noise (`d|`, `J]`, `.t]`) and a lost `ال` still cost. Tatweel, bidi marks, ':' and spaces are dropped.
"""
import difflib, json, pathlib, re, subprocess, sys, tempfile
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[2]
d = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data/renders/lookdev/r3/probe"
probes = json.loads((d / "probes.json").read_text())

def norm(s):
    return " ".join(s.translate({0x640: None, 0x200E: None, 0x200F: None, 0x061C: None, ord(":"): " "}).split())

AR = re.compile(r"[\u0600-\u06FF]")

def streams(s):
    s = norm(s).replace(" ", "")
    return "".join(c for c in s if AR.match(c)) + "|" + "".join(c for c in s if not AR.match(c))

def score(got, want):
    return round(difflib.SequenceMatcher(None, streams(got), streams(want)).ratio(), 3)

out = []
with tempfile.TemporaryDirectory() as td:
    for p in probes:
        im = Image.open(d / f"{p['id']}.png").convert("L")
        bb = im.point(lambda v: 255 if v > 60 else 0).getbbox()
        im = im.crop((max(0, bb[0] - 30), max(0, bb[1] - 30), min(im.width, bb[2] + 30), min(im.height, bb[3] + 30)))
        im = ImageOps.invert(im).resize((im.width * 2, im.height * 2), Image.LANCZOS)
        f = pathlib.Path(td) / "x.png"
        im.save(f)
        txt = subprocess.run(["tesseract", str(f), "-", "-l", "ara+eng", "--psm", "7"], capture_output=True, text=True).stdout.strip()
        s = score(txt, p["text"])
        # strict: the Arabic stream (incl. the `ال` before the isolate) is read exactly and the Latin stream has no join junk
        clean = streams(txt) == streams(p["text"])
        out.append({"id": p["id"], "size": p["size"], "gap_em": p.get("gapEm"), "gate": p["gate"], "want": p["text"], "got": txt, "score": s, "exact": clean, "pass": s >= 0.9})
        print(f"{'GATE' if p['gate'] else '    '} {p['id']:<26} {s:.3f} {'ok ' if s >= 0.9 else 'LOW'} {'exact' if clean else '     '} got={txt!r}")
gate = [o for o in out if o["gate"]]
res = {"gate_strings": len(gate), "gate_pass": sum(o["pass"] for o in gate), "gate_exact": sum(o["exact"] for o in gate), "all_pass": sum(o["pass"] for o in out), "all_exact": sum(o["exact"] for o in out), "n": len(out), "items": out}
(d / "ocr.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
print(f"gate {res['gate_pass']}/{res['gate_strings']} (exact {res['gate_exact']})  all {res['all_pass']}/{res['n']} (exact {res['all_exact']})")
sys.exit(0 if res["gate_pass"] == res["gate_strings"] else 1)
