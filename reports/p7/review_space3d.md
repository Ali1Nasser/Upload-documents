# P7 critic review: group space3d

## VectorGalaxy — round 1

Critic: critic (not the author). Date: 2026-10-15. Evidence: baselines p0/a1/p50/p100 (lite, 960x540) read at full size plus 4x crops, reports/p7/snap/VectorGalaxy.jpg, source read. Only the lite tier is evidenced; standard (nebulae, halos) and hero (bloom) were not looked at.

Verdict: NOT approved yet (score 7.0, one blocking issue). Baselines stay `pending-critic` (meta.json records `critic.status = changes-requested`).

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p (chips 32 px, leaders 2 px, rings r 9 px) | 7 |
| Token / palette discipline (violet = groups, signal = probe + beams, ink for dust; no raw hex in the file) | 9 |
| Depth and light (lite: flat dots, depth-dimmed, additive; no nebula in the baselines) | 6 |
| Visual verb reads without narration (probe drops into the matching cluster, beams to nearest points, dolly) | 8 |
| Arabic correct (BiDi, "قسم الـ roadmap", "الـ embeddings", query chip shaped and tashkeel intact) | 9 |
| Not a bullet-list / slide look | 8 |
| No legacy frames | 10 |
| No unsourced numbers (none on screen; scores deferred by CR-014) | 10 |
| Motion intent visible (a1 -> p50 -> p100 shows staggered chips, probe, beams, dolly; orbit not provable from stills) | 7 |
| Polish (overlaps, collisions) | 5 |
Mean 7.9, min 5.

### Blocking
1. p50, right-upper region (x 715-905, y 150-250 at 960 px; about 1430-1810 x 300-500 at 1080p): the query chip "تحمّل نفس الصفوف مرتين" sits on top of the probe core and its ring. The chip is placed at q.x+56 and then `clampInto(box, ...)` pushes it left over the probe when the probe is near the slot's right edge. The brightest mark on screen (the probe) is hidden and the beams appear to start from under the label. The text-safe knockout hides the field, but the probe is drawn in the same canvas under the DOM chip. Fix: treat the probe disc (about r 60 px) as an obstacle in the declutter pass; when the chip would overlap it, flip the chip to the left of the probe (x = q.x - 56 - w) or above it. Then re-run snap and re-write p50.

### Non-blocking (fix in the same pass if cheap)
2. p50, left region (x 215-415, y 295-420): the roadmap leader (x 347) runs behind the right end of the "keyword search" chip and re-emerges below it, so it reads as belonging to the keyword chip. The two cluster centres are only about 60 px apart at 960 px. Route the leader to enter its chip from the side, or give the declutter pass a horizontal offset for stacked chips; or widen cluster separation in `buildField` (centre radius 3.0 to 3.4).
3. Ring markers (r 9 px, violet 0.6 alpha, 2 px) are barely visible at 1080p in a1/p50. Raise to r 12 and alpha 0.85, as they are the only link between chip and cluster.
4. p100: the "embeddings" chip at alpha 0.55 over a dim cluster is near the legibility floor (contrast about 3:1). Floor the dimmed alpha at 0.7.
5. Request: a standard-tier still (p50 and p100) and a 6-frame strip around the zoomCluster dolly, to confirm nebula/halo do not wash the chips and that the dolly is smooth. Standard perf margin (0.188 vs 0.201) is thin; keep nebula sprite counts as they are.

### Calibration
9 = rim-lit scene with a clear metaphor and no collision; 7 = correct and on-token but with one label collision (this component); 5 = labels over the key mark and flat lighting.
