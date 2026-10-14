#!/usr/bin/env python3
"""Demo fixture for ManimInsert: a VP9-alpha WebM in the Manim insert format (1280x720, 24 fps, 84 frames) + sidecar JSON.

NOT a Manim render (Manim is not installed on this box); it draws the same kind of insert Manim would: the standard normal
curve, then the central area between -1.96 and +1.96 (normCdf(1.96) = 0.975, so 95 % two-sided; data contract d:6.12:5).
Colours come from studio/src/tokens.ts; the tick labels use the repo's JetBrains Mono with U+2212 minus.
usage: python3 -I make_demo_clip.py <repo root> [slug]   -> data/derived/manim/<slug>.webm + <slug>.json
"""
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(sys.argv[1]).resolve()
SLUG = sys.argv[2] if len(sys.argv) > 2 else "demo-normal-95"
W, H, FPS, N, SS = 1280, 720, 24, 84, 2
tok = (ROOT / "studio/src/tokens.ts").read_text()
C = {k: v for k, v in re.findall(r"^\s+(\w+): '#([0-9A-Fa-f]{6})'", tok, re.M)}
col = lambda k, a=1.0: tuple(int(C[k][i : i + 2], 16) for i in (0, 2, 4)) + (int(round(255 * a)),)
font = ImageFont.truetype(str(ROOT / "studio/public/fonts/JetBrainsMono-VF.ttf"), 30 * SS)

X0, X1, YB, AMP = 120, 1160, 600, 1150  # axis span (px), baseline y, curve height scale
sx = lambda z: X0 + (z + 3.5) / 7 * (X1 - X0)
pdf = lambda z: math.exp(-z * z / 2) / math.sqrt(2 * math.pi)
sy = lambda z: YB - AMP * pdf(z)
ease = lambda u: 0.0 if u <= 0 else 1.0 if u >= 1 else 1 - (1 - u) ** 3
prog = lambda i, a, b: ease((i - a) / (b - a))
Z = 1.96

tmp = Path(tempfile.mkdtemp(prefix="manimfix-"))
for i in range(N):
    img = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    S = lambda p: tuple(v * SS for v in p)
    # shaded central 95 % area, then the two tails
    a = prog(i, 36, 52)
    if a > 0:
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        pts = [S((sx(-Z), YB))] + [S((sx(-Z + k * 2 * Z / 120), sy(-Z + k * 2 * Z / 120))) for k in range(121)] + [S((sx(Z), YB))]
        d.polygon(pts, fill=col("signal", 0.26 * a))
        for s in (-1, 1):
            tail = [S((sx(s * Z), YB))] + [S((sx(s * (Z + k * 1.54 / 40)), sy(s * (Z + k * 1.54 / 40)))) for k in range(41)] + [S((sx(s * 3.5), YB))]
            d.polygon(tail, fill=col("crit", 0.30 * a))
        img.alpha_composite(lay)
    d = ImageDraw.Draw(img)
    # axis draws left -> right with ticks at integer z
    ax = prog(i, 1, 12)
    if ax > 0:
        d.line([S((X0, YB)), S((X0 + (X1 - X0) * ax, YB))], fill=col("ink2", 0.9), width=3 * SS)
        for z in range(-3, 4):
            if sx(z) <= X0 + (X1 - X0) * ax:
                d.line([S((sx(z), YB)), S((sx(z), YB + 12))], fill=col("ink3", 0.9), width=2 * SS)
    # the curve, with a soft glow underneath
    cv = prog(i, 6, 36)
    if cv > 0:
        n = max(2, int(240 * cv))
        pts = [S((sx(-3.5 + 7 * k / 240), sy(-3.5 + 7 * k / 240))) for k in range(n + 1)]
        glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(glow).line(pts, fill=col("signal", 0.55), width=14 * SS, joint="curve")
        img = Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(10 * SS)), img)
        d = ImageDraw.Draw(img)
        d.line(pts, fill=col("signal"), width=5 * SS, joint="curve")
    # +-1.96 markers and labels
    m = prog(i, 48, 60)
    if m > 0:
        for s in (-1, 1):
            x = sx(s * Z)
            for y in range(int(sy(Z)) - 30, YB, 18):
                d.line([S((x, y)), S((x, min(YB, y + 9)))], fill=col("ink", 0.85 * m), width=2 * SS)
            lab = ("−" if s < 0 else "") + "1.96"
            tw = d.textlength(lab, font=font)
            d.text((x * SS - tw / 2, (YB + 22) * SS), lab, font=font, fill=col("ink", m))
    img.resize((W, H), Image.LANCZOS).save(tmp / f"f{i:03d}.png")

out = ROOT / "data/derived/manim" / f"{SLUG}.webm"
out.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "f%03d.png"), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                "-b:v", "0", "-crf", "28", "-row-mt", "1", "-auto-alt-ref", "0", "-g", "24", str(out)], check=True)
shutil.rmtree(tmp)
meta = {"slug": SLUG, "fps": FPS, "frames": N, "width": W, "height": H, "alpha": True, "ref": "d:6.12:5",
        "kind": "demo fixture (PIL), Manim insert format; not a Manim render", "generator": "studio/src/components/ManimInsert/fixtures/make_demo_clip.py"}
out.with_suffix(".json").write_text(json.dumps(meta, indent=1) + "\n")
print(out, out.stat().st_size)
