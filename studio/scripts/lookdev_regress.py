#!/usr/bin/env python3
"""ADR-009 close condition 4 tool (owner: render-ops; the author of the fix does not run it as evidence).
Diffs each r3 still against its *_fix still at 960 px. Every pixel with |delta| > 8/255 (max over RGB) must lie inside
the edited text boxes + 16 px (boxes given by render-ops in 1920x1080 coordinates, derived from the source diff 8f245ee..a3b86c1).
Writes reports/lookdev/r3/regress.json {by, pass, covers, outside_px, items{id: {changed_px, outside_px, outside_bboxes}}}.
Run: python3 -I studio/scripts/lookdev_regress.py --boxes <boxes.json> --by render-ops
boxes.json: {"F3-standard": [[x0, y0, x1, y1], ...], ...} (1920x1080 px)."""
import argparse, json
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / "reports/lookdev/r3/stills"
ap = argparse.ArgumentParser()
ap.add_argument("--boxes", required=True)
ap.add_argument("--by", required=True)
ap.add_argument("--thr", type=int, default=8)
ap.add_argument("--pad", type=int, default=16)
a = ap.parse_args()
boxes = json.loads(Path(a.boxes).read_text())
items, total_out = {}, 0
for sid, bxs in sorted(boxes.items()):
    old = Image.open(D / f"{sid}.jpg").convert("RGB").resize((960, 540), Image.LANCZOS)
    new = Image.open(D / f"{sid}_fix.jpg").convert("RGB").resize((960, 540), Image.LANCZOS)
    diff = ImageChops.difference(old, new).split()
    m = ImageChops.lighter(ImageChops.lighter(diff[0], diff[1]), diff[2]).point(lambda v: 255 if v > a.thr else 0)
    changed = sum(1 for v in m.getdata() if v)
    allow = Image.new("L", (960, 540), 0)
    for x0, y0, x1, y1 in bxs:  # 1920 -> 960 coords, pad in 1920 px
        allow.paste(255, (max(0, (x0 - a.pad) // 2), max(0, (y0 - a.pad) // 2), min(960, (x1 + a.pad + 1) // 2), min(540, (y1 + a.pad + 1) // 2)))
    outside = ImageChops.subtract(m, allow)
    n_out = sum(1 for v in outside.getdata() if v)
    total_out += n_out
    items[sid] = {"boxes": bxs, "changed_px": changed, "outside_px": n_out, "outside_bbox_960": outside.getbbox()}
rep = {"v": 1, "condition": "ADR-009 close condition 4", "by": a.by, "scale": "960x540", "thr_255": a.thr, "pad_px_1080p": a.pad,
       "covers": sorted(items), "outside_px": total_out, "pass": total_out == 0, "items": items}
(ROOT / "reports/lookdev/r3/regress.json").write_text(json.dumps(rep, indent=1) + "\n")
print(json.dumps({k: rep[k] for k in ("covers", "outside_px", "pass")}))
