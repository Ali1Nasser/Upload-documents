#!/usr/bin/env python3
"""P0.6 render benchmark: 3 compositions x concurrency 1..3, swangle, h264 crf18. Writes budget.json[render_bench].
Run:  python3 harness/lib/render_bench.py [swangle|swiftshader|angle]   (sequential; do not run other heavy jobs at the same time)."""
import json, os, subprocess, sys, time
GL = sys.argv[1] if len(sys.argv) > 1 else "swangle"
KEY = "render_bench" if GL == "swangle" else f"render_bench_{GL}"
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import budget_io

ROOT = Path(__file__).resolve().parents[2]
STUDIO = ROOT / "studio"
OUT = STUDIO / "out" / "bench"
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = 150

def render(comp, conc, frames=None):
    out = OUT / f"{comp}_{GL}_c{conc}{'_1f' if frames else ''}.mp4"
    cmd = ["npx", "remotion", "render", "src/index.ts", comp, str(out), f"--concurrency={conc}", f"--gl={GL}",
           "--codec=h264", "--crf=18", "--log=error"]
    if frames: cmd.append(f"--frames={frames}")
    t = time.time()
    r = subprocess.run(cmd, cwd=STUDIO, capture_output=True, text=True)
    dt = time.time() - t
    if r.returncode != 0:
        print(r.stdout[-2000:], r.stderr[-2000:], file=sys.stderr); raise SystemExit(f"render failed {comp} c{conc}")
    return dt, out

res = {}
for comp in ["Bench2D", "BenchGlow", "BenchR3F"]:
    res[comp] = {}
    ov, _ = render(comp, 1, "0-0")   # fixed overhead: bundle cache + browser launch + 1 frame
    print(f"{comp}: overhead(1 frame, c1) = {ov:.1f}s", flush=True)
    for conc in (1, 2, 3):
        dt, out = render(comp, conc)
        net = max(dt - ov, 0.001)
        s_per_frame_slot = net * conc / (FRAMES - 1)   # CPU-seconds-ish per frame per slot
        fps = (FRAMES - 1) / net
        res[comp][str(conc)] = {"wall_s": round(dt, 2), "overhead_s": round(ov, 2), "s_per_frame": round(s_per_frame_slot, 3),
                                "fps_throughput": round(fps, 3), "gross_fps": round(FRAMES / dt, 3), "mb": round(out.stat().st_size / 1e6, 2)}
        print(comp, conc, res[comp][str(conc)], flush=True)
        budget_io.update(**{KEY: {comp: dict(res[comp])}})
print(json.dumps(res, indent=2))
