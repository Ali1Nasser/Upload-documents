#!/usr/bin/env python3
"""Demo fixture for LoopPlate: a seamless 10 s loop (1920x1080, 24 fps, 240 frames) of slow aurora haze + orbiting dust.

NOT the P10 plate pipeline (`dc render plate <name>`, offline Three.js / Blender). This only gives Demo-LoopPlate a real
loop to play. Every motion is periodic in 10 s (integer cycles), so frame 240 == frame 0 and the loop has no seam.
Colours are read from studio/src/tokens.ts (C.*), never typed here. Deterministic: numpy Generator(seed).
usage: python3 -I make_demo_plate.py <repo root> [slug]   -> data/derived/plates/<slug>.mp4 (+ <slug>.json)
"""
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(sys.argv[1]).resolve()
SLUG = sys.argv[2] if len(sys.argv) > 2 else "demo-aurora-loop"
W, H, FPS, N = 1920, 1080, 24, 240
LW, LH = 480, 270

tok = (ROOT / "studio/src/tokens.ts").read_text()
C = {k: v for k, v in re.findall(r"^\s+(\w+): '#([0-9A-Fa-f]{6})'", tok, re.M)}
rgb = lambda k: np.array([int(C[k][i : i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)

rng = np.random.default_rng(20261010)
ys, xs = np.mgrid[0:LH, 0:LW].astype(np.float32)
xs /= LW
ys /= LH
# base: ground in the upper centre falling to void at the edges
r0 = np.sqrt(((xs - 0.5) * 1.6) ** 2 + ((ys - 0.38) * 1.1) ** 2)
base = rgb("void")[None, None, :] + (rgb("ground") - rgb("void"))[None, None, :] * np.clip(1.15 - r0, 0, 1)[..., None]
# aurora blobs: (colour, intensity, sigma, centre, radii, integer cycles per loop, phase)
blobs = [
    ("signal", 0.16, 0.22, (0.30, 0.42), (0.10, 0.06), (1, 1), 0.0),
    ("violet", 0.13, 0.26, (0.70, 0.36), (0.08, 0.07), (1, 2), 1.7),
    ("signal", 0.08, 0.30, (0.55, 0.70), (0.12, 0.05), (2, 1), 3.1),
    ("ember", 0.035, 0.18, (0.82, 0.78), (0.05, 0.04), (1, 1), 4.4),
]
ND = 260
dust = {
    "x": rng.uniform(0, W, ND),
    "y": rng.uniform(0, H, ND),
    "r": rng.uniform(8, 42, ND),
    "cyc": rng.integers(1, 3, ND),
    "ph": rng.uniform(0, 2 * math.pi, ND),
    "tw": rng.integers(1, 4, ND),
    "a": rng.uniform(0.10, 0.55, ND) ** 1.6,
    "s": rng.uniform(0.8, 2.2, ND),
    "c": rng.choice(["ink", "signal", "violet"], ND, p=[0.55, 0.35, 0.10]),
}
sprite = {}


def spr(s):
    k = round(s, 1)
    if k not in sprite:
        R = int(math.ceil(3 * k))
        g = np.mgrid[-R : R + 1, -R : R + 1].astype(np.float32)
        sprite[k] = np.exp(-(g[0] ** 2 + g[1] ** 2) / (2 * k * k))
    return sprite[k]


out = ROOT / "data/derived/plates" / f"{SLUG}.mp4"
out.parent.mkdir(parents=True, exist_ok=True)
ff = subprocess.Popen(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
     "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-tune", "film", "-g", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)],
    stdin=subprocess.PIPE,
)
for i in range(N):
    th = 2 * math.pi * i / N  # one loop = 2 pi
    low = base.copy()
    for col, amp, sig, (cx, cy), (rx, ry), (kx, ky), ph in blobs:
        bx = cx + rx * math.cos(kx * th + ph)
        by = cy + ry * math.sin(ky * th + ph)
        breathe = 0.85 + 0.15 * math.cos(th + ph)
        g = np.exp(-(((xs - bx) * 1.78) ** 2 + (ys - by) ** 2) / (2 * sig * sig))
        low += (amp * breathe * g)[..., None] * rgb(col)[None, None, :]
    full = np.stack([np.asarray(Image.fromarray(low[..., c]).resize((W, H), Image.BICUBIC)) for c in range(3)], axis=-1)
    for j in range(ND):
        a = th * dust["cyc"][j] + dust["ph"][j]
        x = dust["x"][j] + dust["r"][j] * math.cos(a)
        y = dust["y"][j] + dust["r"][j] * math.sin(a)
        al = dust["a"][j] * (0.6 + 0.4 * math.cos(th * dust["tw"][j] + dust["ph"][j]))
        sp = spr(dust["s"][j])
        R = sp.shape[0] // 2
        x0, y0 = int(round(x)) - R, int(round(y)) - R
        x1, y1 = x0 + sp.shape[1], y0 + sp.shape[0]
        if x0 < 0 or y0 < 0 or x1 > W or y1 > H:
            continue
        full[y0:y1, x0:x1] += (al * sp)[..., None] * rgb(dust["c"][j])[None, None, :]
    full += rng.uniform(-0.5 / 255, 0.5 / 255, full.shape).astype(np.float32)  # dither against banding in the dark gradient
    ff.stdin.write((np.clip(full, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
ff.stdin.close()
if ff.wait() != 0:
    sys.exit("ffmpeg failed")
meta = {"slug": SLUG, "fps": FPS, "frames": N, "seconds": N / FPS, "width": W, "height": H, "seamless": True,
        "kind": "demo fixture (procedural, numpy); not a P10 plate", "generator": "studio/src/components/LoopPlate/fixtures/make_demo_plate.py"}
(out.with_suffix(".json")).write_text(json.dumps(meta, indent=1) + "\n")
print(out, out.stat().st_size)
