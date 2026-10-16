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

## NeuralNet3D — round 1 (re-review after carry-forwards 1-5, commit 1df664b)
Reviewed: studio/test/baselines/NeuralNet3D/{p0,a1,p50,p100}.png (960x540, lite, hashes match meta.json) and Arabic QA (pass). Standard/hero tiers not viewed.

### Verified carry-forwards
- CF1 backprop: p50 now shows amber warn packets travelling in the hidden-to-input gap (x 680-720, y 55-320) with the hidden pane tinted warn. The wave is visible and directional (output to input). Closed for stills.
- CF2 panes: rims and fill read in the unhighlighted state (a1, all three panes). Depth is better, though still flat glass without a floor reflection.
- CF3 links: weak links are fainter, strong weights stand out, and hidden neurons are readable in the middle (a1, x 200-740). Closed.
- CF4 wave head: p50 packets are brighter than the amber cores. Closed, though the head reads as a dot cluster rather than a distinct spark.
- CF5 labels: closer to the layers, a smaller dead band at y 400-430.

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p (labels about 28 px) | 8 |
| Token / palette discipline (cyan, amber warn) | 9 |
| Depth and light | 7 |
| Visual verb reads without narration | 8.5 |
| Arabic correct | 9 |
| Not a slide / bullet look | 8 |
| No legacy frames | 10 |
| No unsourced numbers | 10 |
| Motion intent visible (stills only) | 7 |
| Polish | 7 |
Mean 8.3, min 7. Overall 7.6.

### Blocking
None.

### Non-blocking, carry forward
1. p50, hidden pane (x 495-560, y 30-385): the whole pane is flooded amber, so the activation tint on neurons is lost. Tint only the rim or half of the fill.
2. p100, hidden neurons (x 500-560): cores are dark against the cyan highlight, so the activation tint is lost under highlightLayer. Keep the core tint under highlight.
3. p50, packets (x 680-720): the wave is a clustered dot swarm. A single elongated head with a trail would read as a wave. Add a short trail.
4. The labels' floor glow (y 400-440) is a dim smear and does not read as a reflection.
5. Still not evidenced: a 6-frame strip of one forward and one backprop pass, and standard and hero stills. Required before the final lock.
6. p0 is empty by design. Rely on a1 for the opening.

### Calibration
9 = rim-lit scene, clear metaphor, no collision. 7 = correct and on-token, with a clear verb but flat lighting or unproven motion (this component). 5 = labels over the key mark.

## NeuralNet3D — round 1 (round-2 polish: softer wave tint, core tint under highlight, spark trail)
Reviewed: studio/test/baselines/NeuralNet3D/{p0,a1,p50,p100}.png (960x540, lite, sha256 match meta.json). Standard/hero tiers and a motion strip not viewed.

### Verified non-blocking items from the previous review
- Item 1 (p50, hidden pane x 495-560, y 30-385): the amber wash is lighter and neuron cores now read as individual amber discs with ring variation. Closed.
- Item 2 (p100, hidden neurons x 500-560): cores now alternate cyan-lit and grey under the highlighted pane, so activation tint survives highlightLayer. Closed.
- Item 3 (p50, packets x 680-720): sparks carry a short trail, so the wave reads more as a directional front. Still partly a dot cluster at y 100-260 (x 685-700); the trail is subtle at lite scale.

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p (labels about 28 px) | 8 |
| Token / palette discipline | 9 |
| Depth and light | 7 |
| Visual verb reads without narration | 8.5 |
| Arabic correct | 9 |
| Not a slide / bullet look | 8 |
| No legacy frames | 10 |
| No unsourced numbers | 10 |
| Motion intent visible (stills only) | 7.5 |
| Polish | 7.5 |
Mean 8.45, min 7. Overall 7.8.

### Blocking
None. Status set to approved-critic (lite tier).

### Non-blocking, carry forward
1. p50, spark head (x 680-720, y 60-320): trail is short; lengthen about 1.5x or elongate the lead spark so one front reads at 960 px.
2. Floor glow under the labels (y 400-440) is still a dim smear, not a reflection.
3. Required before final lock: a 6-frame strip of one forward and one backprop pass, plus standard and hero stills.
4. p0 is empty by design; rely on a1 for the opening.

### Calibration
9 = rim-lit scene, clear metaphor, no collision. 7 = correct and on-token, clear verb, flat lighting or unproven motion (this component). 5 = labels over the key mark.

## AttentionBeams — round 1
Reviewed: studio/test/baselines/AttentionBeams/{p0,a1,p50,p100}.png (960x540, lite, sha256 match meta.json) and reports/p7/snap/AttentionBeams.jpg. Standard and hero tiers and an attend-transition strip not viewed (not evidenced).

### What works
- a1/p50: six whole-word chips on one baseline, RTL (العميل at right, رفض at left). Focus chip رفض carries a signal outline; arcs leave it and land on earlier tokens with a dot at the landing foot. Arc height rises with distance, so arcs do not collide at the landing feet.
- p50: width and brightness fall off with weight (مرتين / الدفع thick and bright, ضغط / العميل hairline and dim). Reads as "who is attended" without narration.
- p100: after `attend`, focus is الـ API; رفض and العميل are dimmed (outside the attended set), a new fan of beams stands. The focus move reads.
- "الـ API" mixed script renders correctly; Arabic QA pass 6/6 (reports/p7/qa_arabic_AttentionBeams.json). No numbers, no legacy frames, palette is signal on dark only.

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p (chip text about 28 px at 1080p, above the 18 px floor) | 7.5 |
| Token / palette discipline | 8.5 |
| Depth and light | 6 |
| Visual verb reads without narration | 8.5 |
| Arabic correct | 9 |
| Not a slide / bullet look | 7.5 |
| No legacy frames | 10 |
| No unsourced numbers | 10 |
| Motion intent visible (stills only) | 6.5 |
| Polish | 7 |
Mean 8.05, min 6. Overall 7.3 (lite tier only).

### Blocking
None. Status set to approved-critic (lite tier).

### Non-blocking, carry forward (ordered by impact)
1. Depth and light (p50, whole frame; CH-any lite): flat at lite. There is no pool or rim under the focus chip (x 95-155, y 340-385) and the baseline hairline (y 383) is nearly invisible. Required before final lock: standard and hero stills showing the glow underlay, focus light pool and landing ripples promised in the header comment.
2. Composition (p50, p100, y 0-185): the top 35 percent of the frame is empty and the whole scene lives in a band y 190-385. Scale chip type and arc height about 1.3x, or move the baseline down to about y 400 and let arcs rise to about y 120, so the arcs become the hero rather than a thin strip.
3. Focus chip (p50, x 95-155, y 342-376): the focus is only a 1 px cyan outline with the same white text as other chips. At 960 px it is easy to miss. Add a signal-tinted fill or a brighter outline so focus reads before the arcs draw.
4. Motion (a1 to p100): the retract of old beams and the draw of new beams is not evidenced; only the end state is. Provide a 6-frame strip across the `attend` action (about frames 70-100) showing old beams retracting toward the old focus while new ones draw.
5. p100 (x 330-550, y 250-345): the beam to الدفع is dimmer than the beam to مرتين, but its arc is partly occluded where it crosses the thick ضغط arc near x 330-360. Acceptable; a 1 to 2 px lateral spread of foot origins would keep them distinct.
6. p0 is empty by design; rely on a1 for the opening.

### Calibration
9 = rim-lit scene, clear metaphor, no collision. 7 = correct and on-token, clear verb, flat lighting or unproven motion (this component). 5 = labels over the key mark.

## AttentionMatrix — round 1
Reviewed: studio/test/baselines/AttentionMatrix/{p0,a1,p50,p100}.png (960x540, lite) and reports/p7/snap/AttentionMatrix.jpg. Arabic QA 6/6 (reports/p7/qa_arabic_AttentionMatrix.json). Standard/hero tiers and a motion strip not viewed (not evidenced). Palette in source is C.* tokens only (panel, signal, ink, void, grid, white).

### What works
- a1/p50: 6x6 grid in math orientation; the lower-triangular causal mask is immediately visible, brightest cell at (العميل, العميل) in a1 and the row of الـ API outlined in signal in p50/p100 with its row label lit and the others dimmed. Reads as "each word looks only backwards" without narration.
- Row labels (about 14 px at 960, about 28 px at 1080p) are above the 18 px floor; the 45 degree column labels read, mixed script "الـ API" is correct.
- Panel-to-signal ramp, bevelled cells, rim on the panel top edge; no numbers, no legacy frames, no bullet look.
- Masked cell of the highlighted row (p50, x 622-688, y 370-432) is a clear recessed void, correct for future position.

### Scores (1-10)
| Criterion | Score |
|---|---|
| Legible at 1080p | 7.5 |
| Token / palette discipline | 9 |
| Depth and light | 6 |
| Visual verb reads without narration | 8.5 |
| Arabic correct | 9 |
| Not a slide / bullet look | 7.5 |
| No legacy frames | 10 |
| No unsourced numbers | 10 |
| Motion intent visible (stills only) | 6 |
| Polish | 7 |
Mean 8.05, min 6. Overall 7.3 (lite tier only).

### Blocking
None. Status set to approved-critic (lite tier).

### Non-blocking, carry forward (ordered by impact)
1. Depth and light (p50, whole frame): lite is flat; the glass panel edge (x 292-692, y 102-503) is barely distinct from ground and there is no visible contact shadow. Required before final lock: standard and hero stills with light pool, glow on strong cells and bloom.
2. Motion (a1 to p100): the anti-diagonal arrival wave and the highlightRow move are not evidenced; a1 (frame 11) shows a very bright first cell and a different weight pattern than p50, so the settle is large but unproven. Provide a 6-frame strip frames 0-30 and one across a highlightRow change.
3. Mask versus low weight (p50, x 360-690, y 105-300 and y 435-500): masked cells and near-zero weights are close in value (rows مرتين and رفض). Lower the void value or give masked cells a more visible edge so the triangle reads at 960 px.
4. Scale (p50, x 0-290 and 690-960): the matrix uses about 41 percent of the width; at hero scale grow the cell size (CS_MAX 128 is not reached at 6 tokens) so the grid fills the safe area.
5. Axes (p50, y 40-100 and x 220-290): there is no query/key cue or weight legend. A small signal-ramp key or a words-anchored "who looks / at whom" label would remove ambiguity for the first-time viewer. "Head 1" is Latin script; fine under the terms policy but confirm in the pack.
6. p0 is empty by design; rely on a1 for the opening.

### Calibration
9 = rim-lit scene, clear metaphor, no collision. 7 = correct and on-token, clear verb, flat lighting or unproven motion (this component). 5 = labels over the key mark.
