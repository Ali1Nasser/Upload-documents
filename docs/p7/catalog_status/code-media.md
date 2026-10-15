# P7 catalog status: group code-media (Code + Media)

Rows are added per component by the engineer who finishes it.

| Component | Status | Evidence |
|---|---|---|
| Terminal | implemented | snap PASS det 0, baselines pending-critic (`studio/test/baselines/Terminal/`, strip `reports/p7/snap/Terminal.jpg`); perf box s/frame lite 0.060 / standard 0.075 / hero 0.095 (budgets 0.201 / 0.201 / 1.038), `reports/perf/components/Terminal.json`; qa arabic PASS (`reports/qa/arabic/Terminal.json`); demo = CH-34 Docker layer cache, 5 s / 57 s from d:6.7:1 and d:6.7:2. r2 polish for critic r1 non-blocking #1/#2: CACHED keyword in signal, spoken figures (5 s / 57 s) one ink step brighter (Tok.c colour override in _code-media/kit.tsx, additive). DOM-only (no WebGL), so every tier runs the same markup and the hero tier adds only the shot-level FX. |

Engine note (Terminal): an `inset` box-shadow on a row of the code block made the 50 % frame non-deterministic (about 1,170 px of tile-seam differences over the backdrop) once the 100 % frame had been rendered in the same page. Row rims are therefore drawn as a background gradient layer, never as `box-shadow: inset`. Other components that combine a large masked backdrop with an inset shadow may see the same flake.
