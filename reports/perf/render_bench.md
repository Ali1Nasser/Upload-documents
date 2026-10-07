# P0.6 Render benchmark (Remotion 4.0.534, 1920x1080, 30 fps, 150 frames, h264 crf 18)

Box: 4 vCPU, 15 GB, no GPU. Browser: preinstalled `chromium_headless_shell-1194` (set in `studio/remotion.config.ts`). Compositions in `studio/src/bench/`.
Driver: `python3 harness/lib/render_bench.py [swangle|swiftshader]` (runs `npx remotion render`, sequential, nothing else heavy running).
Raw numbers: `harness/state/budget.json` keys `render_bench` (swangle, as specified), `render_bench_swiftshader`, `render_projection_3h`.

Definitions. `wall_s` = whole `npx remotion render` (includes ~8-12 s bundle-cache + browser start). `fps_throughput` = 149 / (wall - overhead), the steady-state rate of the whole box.
`s_per_frame` = (wall - overhead) x concurrency / 149 = wall seconds per frame per slot (it grows with concurrency because the 4 cores are shared).

## Results with `--gl=swangle` (the configured default)

| Composition | c=1 s/frame (fps) | c=2 s/frame (fps) | c=3 s/frame (fps) | wall at best |
|---|---|---|---|---|
| Bench2D (Arabic+Latin kinetic words, SVG diagram) | 0.420 (2.38) | 0.754 (2.65) | 1.026 (**2.92**) | 61 s |
| BenchGlow (400 CSS-glow particles + backdrop-blur glass) | 0.868 (1.15) | 1.757 (1.14) | 2.599 (**1.15**) | 141 s |
| BenchR3F (3000 instanced meshes + Bloom, swangle) | 1.432 (0.70) | 2.739 (**0.73**) | 4.125 (0.73) | 213 s |

## Finding: `--gl=swiftshader` is 2.3-5x faster than `swangle` on this box, with identical pixels

Same compositions, same flags except `--gl=swiftshader`. Output vs swangle (ffmpeg PSNR, whole clip): Bench2D 47.5 dB, BenchGlow 46.6 dB (h264 noise only), BenchR3F 84 dB.
A probe with `--gl=angle` on Bench2D c=3 gave 26 s wall, same as swiftshader (swangle: 61-71 s).

| Composition | c=1 s/frame (fps) | c=2 s/frame (fps) | c=3 s/frame (fps) |
|---|---|---|---|
| Bench2D | 0.136 (7.33) | 0.228 (8.78) | 0.304 (**9.88**) |
| BenchGlow | 0.240 (4.16) | 0.358 (**5.59**) | 0.543 (5.52) |
| BenchR3F | 1.160 (0.86) | 2.141 (0.93) | 3.114 (**0.96**) |

Concurrency 3 (= nproc - 1, the tsp slot count) is the best or within 1 % of the best everywhere; use 3.

## Projection for a 3 h film (324,000 frames)

Assumption: 85 % 2D/glow (split 42.5 % plain 2D, 42.5 % glow) and 15 % R3F, each at its best concurrency. Pure frame rendering only; excludes encode, conform, QA re-renders and retries (+20-30 % typical).

| Config | 2D (137,700 f) | Glow (137,700 f) | R3F (48,600 f) | Total | vs 24 h budget (G6a) |
|---|---|---|---|---|---|
| swangle | 13.1 h | 33.1 h | 18.5 h | **64.7 h** | 2.7x over |
| swiftshader | 3.9 h | 6.8 h | 14.0 h | **24.7 h** | at the limit, no headroom |

Sensitivities (swiftshader): 100 % plain 2D = 9.1 h; 100 % glow = 16.1 h. With the hero (R3F) share cut from 15 % to 5 %, total = 4.3 + 7.7 + 4.7 = **16.7 h**. At 0 % R3F = 12.0 h.

## Implications / recommendations (for ADR-002, G6a)

1. R3F with Bloom on software GL costs about 6x a glow frame and 10x a plain 2D frame: it is 57 % of the swiftshader total at only 15 % of the frames. Keep hero tier <= 5 % or move heavy 3D to pre-rendered plates (P10, reusable seamless loops) and composite as video.
2. Switch the CLI default to `--gl=swiftshader` (or `angle`) for everything, including R3F (verified identical pixels). `remotion.config.ts` still sets `swangle` as instructed in the task; the render wrapper (`dc render`) should pass `--gl=swiftshader` explicitly until the Council decides.
3. CSS glow is 1.8x the cost of plain 2D: keep the standard tier at 12-24 px glow, avoid `backdrop-filter` on full-frame panels, and cache static glow layers as pre-rendered sprites.
4. Per-chunk overhead is 8-12 s; at <= 9,000-frame slices (36 slices for 3 h) it is negligible.
5. R3F 3000-instance scene here is deliberately heavy (icosahedra, full-res bloom with mipmapBlur); real hero scenes at <= 5k points sprites should be cheaper. Re-measure in P7 (`reports/perf/components.json`).

## Visual check (Arabic shaping)

`studio/out/bench2d_still.png` (frame 110 of Bench2D, `npx remotion still ... --gl=swangle`) was inspected: Arabic words (الكمبيوتر, بيعمل, حاجة, قاعدة البيانات, الاتساق النهائي) render with joined letters in correct contextual forms, whole-word shaping, right-to-left word order within phrases; Latin words and `99.9%` render alongside in the same face (PlexAR). Confirmed OK.
BenchGlow still frame also shows correct Arabic and a working backdrop blur; BenchR3F shows bloom on the instanced points.
