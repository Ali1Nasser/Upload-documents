#!/usr/bin/env python3
"""Plain-assert tests for tools/dclib/visual.py keyframe selection (synthetic data; no media needed).

Run: .venv/bin/python -I tools/tests/test_visual.py   (exit 0 = all pass)
"""
import os
import sys
import tempfile
import types

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import numpy as np  # noqa: E402

from dclib import visual as V  # noqa: E402

FAILS = []


def check(name, cond, detail=""):
    if not cond:
        FAILS.append(f"{name}: {detail}")


def args(**kw):
    d = dict(threshold=0.25, novel=0.02, settle=0.004, min_gap_s=8.0, max=280, fill_gap_s=30.0)
    d.update(kw)
    return types.SimpleNamespace(**d)


def film(n_states, seconds_each, animate_last=0):
    """Synthetic thumbs: n_states distinct main-panel pictures, each held seconds_each s (2 fps), plus a
    continuously animated tail of animate_last s."""
    rng = np.random.default_rng(7)
    frames = []
    for i in range(n_states):
        img = np.zeros((V.THUMB_H, V.THUMB_W), np.uint8)
        img[20:60, :] = rng.integers(0, 255, (40, V.THUMB_W), dtype=np.uint8)
        img[85:, 120:] = i * 3            # timecode area changes every sample: must be ignored (outside ROI)
        for k in range(int(seconds_each * V.THUMB_FPS)):
            f = img.copy()
            f[85:, 120:] = (k * 37) % 255
            frames.append(f)
    for k in range(int(animate_last * V.THUMB_FPS)):
        frames.append(rng.integers(0, 255, (V.THUMB_H, V.THUMB_W), dtype=np.uint8))
    return np.stack(frames)


chapters = [{"chapter": "CH-00", "start_ms": 0, "end_ms": 60000}, {"chapter": "CH-01", "start_ms": 60000, "end_ms": 10 ** 9}]

# 1. one keyframe per distinct state, spaced >= 8 s, timecode changes ignored
th = film(10, 12)
kept, states, gap = V._select(th, [], chapters, args())
check("states found", len(states) == 10, f"{len(states)} states")
check("all kept", len(kept) == 10, f"{len(kept)} kept")
check("spacing", all(b["t_ms"] - a["t_ms"] >= 8000 for a, b in zip(kept, kept[1:])))
check("latest settled frame of each state", kept[0]["t_ms"] >= 11000, kept[0]["t_ms"])
check("chapters", {k["chapter"] for k in kept} == {"CH-00", "CH-01"})

# 2. cap: 60 states of 9 s, max 20 -> gap widens until <= 20 remain
th = film(60, 9)
kept, states, gap = V._select(th, [], chapters, args(max=20))
check("cap", len(kept) <= 20, f"{len(kept)} kept")
check("gap widened", gap > 8.0, gap)

# 3. hard cut boosts priority; 4. animated stretch gets fill frames
th = film(3, 10, animate_last=70)
kept, states, gap = V._select(th, [(10 * 24 + 3, 0.4)], chapters, args())
fills = [s for s in states if s["reason"] == "fill"]
check("fills in animated tail", len(fills) >= 2, f"{len(fills)} fills")
st2 = [s for s in states if s["reason"] == "state"][1]
check("cut boost", st2["cut"] == 0.4 and st2["prio"] >= 1.0, st2)

# 5. scene-score parser maps pts_time to film frames using the stream start time
with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
    f.write("frame:0    pts:639259  pts_time:52.023\nlavfi.scene_score=0.058614\n"
            "frame:1    pts:860443  pts_time:70.023\nlavfi.scene_score=0.066268\n")
got = V._parse_scores(f.name, 0.023031)
os.remove(f.name)
check("parse scores", got == [(1248, 0.058614), (1680, 0.066268)], got)

if FAILS:
    print("FAIL\n" + "\n".join(FAILS))
    sys.exit(1)
print("test_visual: all checks passed")
