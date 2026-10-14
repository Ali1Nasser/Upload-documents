#!/usr/bin/env python3
"""Demo fixture for AIPlate: a text-free backplate + its depth map (1920x1080 PNG, depth 0 = far, 255 = near).

NOT a generated (ADR-006) plate: it is procedural (PIL + numpy) and exists only so Demo-AIPlate has real inputs. It follows the style
kernel of 04 section 10 (charcoal void, cyan haze, glass / acrylic slabs, thin grid floor, rim light; no text, no faces).
Colours are read from studio/src/tokens.ts, never typed here. Deterministic (fixed seed).
usage: python3 -I make_demo_plate.py <repo root> [slug]   -> data/derived/plates/<slug>.png + <slug>-depth.png + <slug>.json
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(sys.argv[1]).resolve()
SLUG = sys.argv[2] if len(sys.argv) > 2 else "demo-glass-hall"
W, H, SS = 1920, 1080, 2
tok = (ROOT / "studio/src/tokens.ts").read_text()
C = {k: v for k, v in re.findall(r"^\s+(\w+): '#([0-9A-Fa-f]{6})'", tok, re.M)}
rgb = lambda k, a=255: tuple(int(C[k][i : i + 2], 16) for i in (0, 2, 4)) + (a,)
rng = np.random.default_rng(20261011)

# ---- background: void with a soft cyan horizon glow (depth 0)
ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xs / W - 0.5) * 1.5) ** 2 + ((ys / H - 0.52) * 1.2) ** 2)
glow = np.clip(1.0 - r, 0, 1) ** 2.2
base = np.array(rgb("void")[:3], np.float32)[None, None] + (np.array(rgb("signal")[:3], np.float32) * 0.16 - np.array(rgb("void")[:3], np.float32) * 0.16)[None, None] * glow[..., None]
base += (np.array(rgb("ground")[:3], np.float32) - np.array(rgb("void")[:3], np.float32))[None, None] * np.clip(1.2 - r, 0, 1)[..., None]
col = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert("RGBA")
dep = Image.new("L", (W, H), 0)


def layer(draw_fn, depth_fn):
    """draw_fn(ImageDraw rgba layer at SS scale); the layer's alpha > 0 pixels get depth_fn(mask) in the depth map."""
    global col, dep
    lay = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(lay))
    lay = lay.resize((W, H), Image.LANCZOS)
    col = Image.alpha_composite(col, lay)
    m = lay.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    d = depth_fn(m)
    dep = Image.composite(d, dep, m)


S = lambda *p: tuple(v * SS for v in p)

# ---- far: perspective grid floor (depth ramps 20 -> 110 from the horizon down)
hy = int(H * 0.56)
floor = Image.new("L", (W, H), 0)
fd = ImageDraw.Draw(floor)
for y in range(hy, H):
    fd.line([(0, y), (W, y)], fill=int(20 + 90 * (y - hy) / (H - hy)))
dep = ImageChops.lighter(dep, floor.point(lambda v: v if v else 0).filter(ImageFilter.GaussianBlur(1)))


def grid(d):
    for i in range(-24, 25):
        x0 = W / 2 + i * 60
        x1 = W / 2 + i * 420
        d.line([S(x0, hy), S(x1, H)], fill=rgb("signal", 70), width=2 * SS)
    for k in range(1, 14):
        y = hy + (H - hy) * (k / 14) ** 1.9
        d.line([S(0, y), S(W, y)], fill=rgb("signal", int(30 + 46 * k / 14)), width=2 * SS)


lay = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
grid(ImageDraw.Draw(lay))
col = Image.alpha_composite(col, lay.resize((W, H), Image.LANCZOS))

# ---- mid: acrylic slabs of different heights (depth 120..170), rim-lit
slabs = [(300, 420, 150, 560, 130), (520, 360, 120, 640, 150), (1180, 380, 140, 620, 140), (1420, 440, 170, 540, 165), (880, 470, 110, 500, 120)]
for x, y, w, h, dz in slabs:
    def draw(d, x=x, y=y, w=w, h=h):
        d.rounded_rectangle(S(x, y, x + w, y + h), radius=14 * SS, fill=rgb("panel", 150), outline=rgb("signal", 190), width=3 * SS)
        d.rounded_rectangle(S(x + 10, y + 10, x + w - 10, y + h * 0.5), radius=8 * SS, fill=rgb("signal", 26))
    layer(draw, lambda m, dz=dz: m.point(lambda v: dz if v else 0))

# ---- near: two tall dark frames at the edges (depth 215..250) with a violet rim
for x, y, w, h, dz in [(-40, 120, 230, 900, 220), (1730, 80, 250, 940, 245)]:
    def draw(d, x=x, y=y, w=w, h=h):
        d.rounded_rectangle(S(x, y, x + w, y + h), radius=22 * SS, fill=rgb("ground", 235), outline=rgb("violet", 200), width=4 * SS)
        d.rounded_rectangle(S(x + 18, y + 18, x + w - 18, y + 90), radius=10 * SS, fill=rgb("violet", 40))
    layer(draw, lambda m, dz=dz: m.point(lambda v: dz if v else 0))

# ---- floating dust specks across depths (point sprites)
lay = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
dd = ImageDraw.Draw(lay)
for _ in range(90):
    x, y, rad = rng.uniform(0, W), rng.uniform(0, H * 0.9), rng.uniform(1.2, 3.8)
    dd.ellipse(S(x - rad, y - rad, x + rad, y + rad), fill=rgb("ink", int(rng.uniform(40, 150))))
col = Image.alpha_composite(col, lay.resize((W, H), Image.LANCZOS))
dep = dep.filter(ImageFilter.GaussianBlur(1.2))

out = ROOT / "data/derived/plates"
out.mkdir(parents=True, exist_ok=True)
col.convert("RGB").save(out / f"{SLUG}.png", optimize=True)
dep.save(out / f"{SLUG}-depth.png", optimize=True)
meta = {"slug": SLUG, "depth_map": f"{SLUG}-depth", "width": W, "height": H, "depth": "0 = far, 255 = near",
        "kind": "demo fixture (procedural, PIL); not an ADR-006 generated plate", "generator": "studio/src/components/AIPlate/fixtures/make_demo_plate.py"}
(out / f"{SLUG}.json").write_text(json.dumps(meta, indent=1) + "\n")
print(out / f"{SLUG}.png", (out / f"{SLUG}.png").stat().st_size, (out / f"{SLUG}-depth.png").stat().st_size)
