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

## VectorGalaxy — round 2

Critic: critic (not the author). Date: 2026-10-15. Evidence: baselines p0/a1/p50/p100 (lite, 960x540) read at full size, reports/p7/snap/VectorGalaxy.jpg present. Only the lite tier is evidenced. Commit 5dd90f0 reviewed.

Verdict: APPROVED (score 7.6, no blocking issue). meta.json set to `approved-critic`.

### Round-1 blocker
Fixed. p50 upper-right (x 525-905, y 150-250): the query chip now sits left of the probe (chip right edge about x 712, ring left edge about x 726). The probe core, ring and the three beam origins are fully visible. p100: chip placed right of the probe, clear. No chip-over-probe collision in any still.

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p | 7 |
| Token / palette discipline | 9 |
| Depth and light (lite only, flat dim dots, probe glow good) | 6 |
| Visual verb reads without narration | 8 |
| Arabic correct | 9 |
| Not a bullet-list / slide look | 8 |
| No legacy frames | 10 |
| No unsourced numbers | 10 |
| Motion intent visible (a1 -> p50 -> p100: clusters, probe, beams, dolly) | 7 |
| Polish (collisions) | 7 |
Mean 8.1, min 6. Overall 7.6 (depth and polish residuals weigh it down).

### Non-blocking, carry forward (none gates approval)
1. p50, left (x 215-415, y 295-420): the roadmap leader (x 347) still passes behind the right end of the "keyword search" chip and reappears below it, so it reads as the keyword chip's leader. Enter the leader from the side, or add a horizontal offset for stacked chips, or widen cluster separation in `buildField`.
2. a1/p50, ring markers (r 9 px, thin): still the weakest link between chip and cluster at 1080p. Raise to r 12, alpha 0.85.
3. p100, bottom-left (x 273-393, y 262-290): the "embeddings" chip is dimmed to about 3:1 contrast. Floor dimmed alpha at 0.7.
4. p50: the probe is far from the cluster it will drop into, and the beams reach unlabelled dots, so the match is only completed at p100. Acceptable as a motion beat, but a 6-frame strip around the drop would confirm it reads.
5. Still requested before the final lock: standard-tier p50 and p100 stills (nebula/halo must not wash chips) and a strip of the zoomCluster dolly. Not evidenced here.

### Calibration
9 = rim-lit scene, clear metaphor, no collision. 7 = correct, on-token, small residual overlap or flat lighting (this component). 5 = labels over the key mark.

## VectorGalaxy — round 1 (re-baseline after carry-forward fixes)

Critic: critic (not the author). Date: 2026-10-15. Evidence: baselines p0/a1/p50/p100 (lite, 960x540) read at full size. Only the lite tier is evidenced; no strip read this pass. Perf as reported by the author: lite 0.070, standard 0.121, hero 0.116 s/frame (budget 0.201 / 0.201 / 1.038); snap determinism 0.

Verdict: APPROVED (score 7.7, no blocking issue). meta.json set to `approved-critic`.

### Carry-forward fixes verified
- Ring markers (r 12, alpha 0.85): now clearly visible in a1 (idempotency ring, x 710 y 299), p50 (four rings) and p100 (embeddings, idempotency). They read as the link between chip and cluster. Closed.
- Dimmed chip floor 0.7: p100 "embeddings" chip (x 273-393, y 262-290) is dim but legible; label text and leader readable. Closed.
- Query chip no longer covers the probe (p50 chip left of probe; p100 right of probe). Still clear.

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p | 8 |
| Token / palette discipline | 9 |
| Depth and light (lite only; flat dim dots, probe glow good) | 6 |
| Visual verb reads without narration | 8 |
| Arabic correct (BiDi, tashkeel, "الـ") | 9 |
| Not a bullet-list / slide look | 8 |
| No legacy frames | 10 |
| No unsourced numbers | 10 |
| Motion intent visible | 7 |
| Polish | 7 |
Mean 8.2, min 6. Overall 7.7.

### Blocking
None.

### Non-blocking, carry forward
1. p50, left (x 215-415, y 295-420): the roadmap leader (x 347) still passes behind the right end of the "keyword search" chip (right edge x 357). Enter from the side or widen cluster separation in `buildField`.
2. p0 is an empty graded field (no particles, by design at frame 0); do not use p0 as the only proof of the opening. Request a frame around 8-12 for the next re-baseline.
3. Standard- and hero-tier stills and a 6-frame strip of the zoomCluster dolly are still not evidenced; required before the final lock (nebula/halo must not wash chips).
4. p50: the probe is far from the cluster it drops into; the match only completes at p100.

### Calibration
9 = rim-lit scene, clear metaphor, no collision. 7 = correct, on-token, small residual overlap or flat lighting (this component). 5 = labels over the key mark.

## NeuralNet3D — round 1
Reviewed: studio/test/baselines/NeuralNet3D/{p0,a1,p50,p100}.png (960x540, lite tier, scale 0.5) and reports/p7/snap/NeuralNet3D.jpg. Arabic QA: pass (31/31 OCR exact).

### What works
- Verb reads: three layers in depth, input on the right (RTL flow), wider hidden layer as a 2-column y-z grid, links of seeded brightness/width, neuron cores tinted by activation (a1).
- p50: forward signal packets sit in the hidden-to-output gap while the hidden pane is lit. Wave is visible and directional.
- p100: highlightLayer rings the hidden layer, brightens its pane and chip, and dims the others. Clear focus.
- Labels المدخلات / الطبقة المخفية / المخرجات are correctly shaped and BiDi-safe. About 14 px at half scale, so about 28 px at 1080p. Legible.
- Palette is cyan on near-black and on token. No bullets, legacy frames or numbers.

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p | 8 |
| Token / palette discipline | 9 |
| Depth and light | 6.5 |
| Visual verb reads without narration | 8 |
| Arabic correct | 9 |
| Not a slide / bullet look | 8 |
| No legacy frames | 10 |
| No unsourced numbers | 10 |
| Motion intent visible | 6.5 |
| Polish | 7 |
Mean 8.2, min 6.5. Overall 7.2.

### Blocking
None. Approved at 7.2 for the lite tier, with the carry-forwards below required before the final lock.

### Non-blocking, carry forward
1. Backprop is not evidenced: no still shows the warn-coloured wave (frames a1, p50 and p100 are forward or highlight only). Add a snap frame mid-backprop (warn tint, travelling right to left in the data direction reversed) and a 6-frame strip of one forward and one backprop pass. Motion intent is only partly proven.
2. a1, all three panes (x 40-60, 490-550, 740-775): the "rim-lit glass" is barely visible. Panes read as thin outlines until highlighted at p100. Raise pane fill and rim alpha about 1.5x so the depth reads in the unhighlighted state.
3. a1, centre field (x 200-740, y 60-380): the full-connection link field is dense spaghetti, and at the middle the links hide the hidden-layer neurons. Cap the visible link alpha or draw weak links thinner than 0.5 px so strong weights stand out.
4. p50, hidden layer: all neurons at full cyan with the wave still on the output side. Activation tint loses contrast against the forward wave. Make the wave head brighter than the lit cores.
5. p0 is empty (by design). Request frame about 8 for the next re-baseline. Labels sit at y 430, far below the layers (y 40-390), with a large dark band between. Raise labels about 20 px or add a floor reflection under them.
6. Standard and hero tier stills are not evidenced. Add them before lock.

### Calibration
9 = rim-lit scene, clear metaphor, no collision. 7 = correct and on-token with flat panes or one unproven motion verb (this component). 5 = labels over the key mark.
