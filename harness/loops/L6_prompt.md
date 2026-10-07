# L6 render-farm tick (headless prompt; mechanical steps only)

You are running one tick of loop L6. Do exactly this, then stop. Do not wait, sleep or poll; this prompt is re-issued by the caller.

1. Read `harness/loops/L6_render_farm_tick.yaml` (goal and limits live there) and `python3 tools/dc.py state brief`.
2. `python3 tools/dc.py render status` and `python3 tools/dc.py q status`. Note chunks done, running, queued and failed.
3. For every failed chunk with fewer than 2 retries: `python3 tools/dc.py render retry <job>`. On the second retry use the fallback FX tier. Every fallback is logged and must be re-approved by the critic later; do not approve it yourself.
4. Disk: if free disk is under 8 GB, delete preview renders of chapters already approved (only under `data/renders/preview/`). Never touch `data/raw/`.
5. Commit small manifests only (`git add reports/ corpus/render/jobs.jsonl harness/state/`); never media, `data/`, models or secrets. Do not push unless the environment allows it.
6. Append one JSON line to `logs/loops/L6.jsonl`: `{"ts": "<iso8601>", "done": N, "total": N, "failed": N, "disk_free_gb": X}`.
7. Run `python3 tools/dc.py gate check G9b --quiet`. If it passes, say so and stop. Otherwise stop after the log line.

Rules: heavy work only through `tsp` (never inline); never lower a threshold; never edit `docs/plan/`; report failures plainly with numbers.
