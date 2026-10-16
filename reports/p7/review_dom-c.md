# P7 critic review: group dom-c

## ConnPoolTaxi — round 1

Date: 2026-10-15. Reviewer: critic (not the author). Verdict: APPROVED (7.3/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier), reports/p7/snap/ConnPoolTaxi.json, ConnPoolTaxi.tsx (236 lines). No motion strip exists; the boarding arc, queue close-up on release and the exhaust shake were judged from code plus the three live stills, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (signal borrowed, warn queued, crit exhausted, ok freed; all C tokens) | 8 |
| Light and depth (perspective floor, extruded rank panel, glows) | 6 |
| Legibility at 1080p (taxis ~140 px, request dots 18-30 px) | 8 |
| Visual verb without narration | 9 |
| Arabic (no copy; n/a, correctly left to TermChip/NumberCounter) | 10 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (none drawn) | 10 |
| Motion intent (code plus stills) | 7 |
| AI-Unpacked parity | 6 |

### What works
- a1 to p50: free taxis (dashed grey bays, green roof light) turn cyan and wired to the database as passengers board; at exhaust the rank border, gate and queue go crit red with a halo. The metaphor "connection pool = taxi rank, exhaustion = queue grows" reads in one second.
- p100: after release the red calms, taxis stay borrowed (cyan) while 7 warn-orange requests wait in FIFO order. Correct cause and effect.
- Determinism: det diff 0 px, seed only changes arc height and lane jitter, never positions or timing.

### Non-blocking issues, ordered by impact
1. Composition (a1, p50, p100): the rank sits in the left 60% and the queue only reaches x~880/960; the right third and the upper half are void. Scale bayW toward 0.16 W and push the lane so the queue fills to the right edge; hero reads larger.
2. Depth and light (all stills): flat panel on a faint floor grid, no particles or parallax. Add a few drifting motes, a soft reflection under the rank, and a light bloom from the lit taxi roofs onto the panel.
3. p0 baseline is an empty dark frame and protects nothing. Move it to a frame where the first bay has entered (frame ~6) when baselines are rewritten at 1080p.
4. p50, queue region (x 610-880, y 245-295): per-dot glows overlap into a continuous pill with the halo, so individual requests blur together. Cap the glow radius to ~0.8 qGap or drop dot glow when the queue is longer than ~6.
5. p100, gate region (x ~608, y 190-345): after release the gate is a 1 px grey hairline and the queue loses its boundary. Keep the gate at ~3 px ink3 so the rank edge stays legible.
6. a1, rank centre (x 350-430, y 205-225): arriving dots pass behind the cars and are partly hidden by taxi bodies while crossing; raise passenger dots above the taxi layer or enlarge the arc so they read as boarding.
7. Motion: add a strip (frames 0, 11, 40, 83, 120, 167) to reports/p7/ so the exhaust shake and the release close-up are seen, not inferred.

## RaceCondition — round 1
Date: 2026-10-16. Reviewer: critic (not the author). Verdict: APPROVED (7.1/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, full size), RaceCondition.tsx (288 lines), qa_arabic_RaceCondition.json (pass, OCR 3/3). No motion strip exists; the collide travel, shock ring (impact + 12 frames) and the one-shot shake were judged from code and from the post-impact still p50, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 7 |
| Palette and token discipline (signal idle, crit crash, warn waiting, ok done; all C tokens) | 8 |
| Light and depth | 6 |
| Legibility at 1080p (capsule labels, counter label ~2x of the 960 still) | 8 |
| Visual verb without narration | 8 |
| Arabic (3 strings, tofu 0, overflow 0, OCR exact) | 9 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (none drawn, structural segments) | 10 |
| Motion intent (code plus stills) | 6 |
| AI-Unpacked parity | 6 |

### What works
- a1 to p50: two cyan hands over one bar turn crit red, one hand lands on a segment (fills red), the other rebounds as a ghost and a dashed segment with a cross marks the lost write. "Two writers, one counter, one update survives" reads in one second.
- p50 to p100: lock ring + padlock, both hands wait/go in turn, two green segments land: serialised writes read as the fix, with the same bar so the before/after compare directly.
- Hands are wired to the thread capsules (cause and effect, no floating props); crit/ok colour switch is consistent across capsule border, panel and floor pool.

### Non-blocking issues, ordered by impact
1. Motion (all): no strip. Add frames at collide start, impact, impact+6 (shake), impact+12 (ring end), lock+10, lock+40 to reports/p7/ so the clash and shake are seen, not inferred.
2. Depth and light (a1, p50, p100): faint floor grid, flat panel, no motes or reflection. Add a few drifting motes, a bloom from the lit hands onto the bar, and a soft reflection under the counter panel.
3. p50, bar region (x 280-410, y 325-395): the lost-update cross sits on the far-left segment while the loser hand hovers over it only by rebound; the hand never visibly hits it. Either rebound the loser toward the lost segment, or draw a short crit thread from the loser palm to its X so the lost write is tied to its thread.
4. Hand art (a1, a1 left hand x 255-330, y 135-270): the thumb is a detached rotated pill and fingers are four equal rects; at 1080p the hand reads as a glove icon. Taper fingertips and attach the thumb to the palm edge.
5. p100, padlock (x 758-790, y 425-465): the lock is ~35 px at 960, the weakest element of the "lock" verb. Enlarge to ~1.6x and centre it on the ring top edge so it reads as the lock before the segments fill.
6. a1, hover shadows (x 235-340 and 620-725, y 315-330): the dark ellipses sit on the panel top edge and look like smudges while hands are idle; fade them until near > 0.3.
7. p0 baseline is an empty dark frame and protects nothing; rewrite at frame ~6 when baselines are next regenerated.

## SagaChain — round 1
Date: 2026-10-16. Reviewer: critic (not the author). Verdict: APPROVED (7.0/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, full size), reports/p7/snap/SagaChain.jpg (4-frame strip of the same frames), SagaChain.tsx (210 lines), the dom-c demo, qa_arabic_SagaChain.json (pass, OCR 8/8, min 0.917). No true motion strip exists; the fail shake (4 f24 frames, 5 px, decaying) and the wire draw / saga token travel were judged from code and from the settled stills, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (signal in flight, ok done, crit fail, warn compensate, ink3 idle/undone; all C tokens) | 9 |
| Light and depth | 6 |
| Legibility at 1080p (node labels ~2x of the 960 still, about 40 px; chip labels about 30 px) | 8 |
| Visual verb without narration | 8 |
| Arabic (8 strings, tofu 0, overflow 0, RTL step 1 on the right) | 9 |
| Not a bullet slide, no legacy frames | 8 |
| Numbers (none drawn) | 10 |
| Motion intent (code plus stills) | 6 |
| AI-Unpacked parity | 6 |
Mean 7.6 by criterion, held to 7.0 overall for the flat composition and unseen motion.

### What works
- a1 to p50: step 1 lights cyan, then 1 and 2 turn green with check badges, step 3 turns red with a cross and step 4 stays dim and unstarted. "Two succeed, third fails, fourth never runs" reads without narration.
- p50 to p100: completed steps grey out with a warn return badge, chips drop under them newest first (رد الخصم before فك الحجز), and the warn wire runs left to right, opposite to the saga. "Undo, newest first" is visible and the failed step correctly gets no chip.
- Colour is semantic only and the floor pool switches signal to crit on failure; no numbers, no bullets, no legacy frames.

### Non-blocking issues, ordered by impact
1. Composition (p50, p100, y 360-540): everything lives in a band y 165-410 and the lower third is empty floor. Lower the chain slightly, or make the nodes ~1.15x taller, so the 4-step row fills the safe area better. Push the compensation row down only if the floor lines are kept as its ground.
2. Depth and light (a1, p50, p100): no motes, no bloom from the lit node onto its wires, and no reflection of the row on the floor. Add a few drifting motes and a soft node bloom on the crit flash (p50, node 3, x 290-455, y 165-260) so the failure hits as light, not only as a border colour.
3. Motion (all): no strip. Add frames at fail, fail+2 (shake), fail+6, compensate, compensate+8 and compensate+16 to reports/p7/ so the shake and the backward travel are seen.
4. p100, badges (x 868-902 and 652-686, y 145-178): the warn return-arc glyph is ~34 px at 960 and reads like a letter "C" or smiley, not "undone". Use a clearer undo arrow with a visible arrowhead.
5. p100, undone nodes (x 500-672 and 717-888, y 165-262): labels drop to ink3 grey on a near-void node and lose contrast. Keep them ink2 so "undone" stays readable.
6. p100, return wire (x 672-717, y 385): the warn arrow is ~45 px at 960 and thin; lengthen it by narrowing the chips (0.8 x node width) so the direction cue is clearer.
7. p0 baseline is an empty dark frame and protects nothing; rewrite at frame ~6 when baselines are next regenerated.

## QualityGauges — round 1
Date: 2026-10-16. Reviewer: critic (not the author). Verdict: APPROVED (7.0/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, full size), reports/p7/snap/QualityGauges.jpg, QualityGauges.tsx (125 lines), the dom-c demo (refs d:6.11:2/3, d:5.2:7, d:6.3:2), qa_arabic_QualityGauges.json (pass, OCR 4/4, min 0.923, tofu 0). No true motion strip exists; the 5 px fail shake and the 14-frame sweep were judged from code and from the a1 mid-count still (608 ms, 346 ms, 40.21 % on the way up), not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (ok green, crit red, signal cyan active, ink threshold tick; C tokens only) | 9 |
| Light and depth (extruded side, lit rim, contact shadow, glow on landing) | 7 |
| Legibility at 1080p (value ~2x of the 960 still, about 40 px; labels about 30 px) | 8 |
| Visual verb without narration (arc passes the white tick, turns red, tinted failing zone) | 8 |
| Arabic (4 strings, RTL: gauge 1 on the right, mixed p95 and JOIN labels ordered correctly) | 9 |
| Not a bullet slide, no legacy frames | 8 |
| Numbers (all ref-bound: 355, 675, 66.67, 13; threshold is an unlabelled tick, nothing invented) | 9 |
| Motion intent (code plus a1 mid-count) | 6 |
| AI-Unpacked parity | 6 |
Mean 7.6 by criterion, held to 7.0 overall for the flat composition and unseen motion.

### What works
- a1 to p50: the dials sweep up with a live count, then the 675 ms arc crosses the white gate tick and turns red while 355 ms stays green. "Before passes, after breaks the gate" reads without narration.
- The 13 rows dial stops short of its tick and goes red, so a floor gate and a ceiling gate both read, with the failing side tinted on the track.
- Tabular mono numerals plus a unit, Arabic labels on whole elements, no per-letter animation, no numerals on the scale, no legacy frames.

### Non-blocking issues, ordered by impact
1. Composition (p50, p100, whole frame): the 2x2 grid hugs x 165-365 and 595-790, leaving a 230 px dead column in the centre and bare floor at the bottom. Widen the cell grid (r up to ~1.15x) or tighten the gutter so the group fills the safe area.
2. Motion (all): no strip. Add frames at land, land+1 and land+2 (shake), land+6 for the fail gauge (p50 top-left, x 165-365, y 40-250) to reports/p7/ so the shake and the landing glow are seen, not inferred.
3. Depth and light (all): no motes and no reflection or bloom of the lit arc on the glass face. Add a few drifting motes and a soft arc bloom on the fail landing so the failure hits as light, not only as a colour change.
4. a1, gauge 4 (x 595-785, y 285-480): at frame 11 the 3rd and 4th dials are not yet visible while the grid slot is empty at bottom-left; the stagger leaves a hole that reads as a layout error. Start 3-4 frames earlier or fade the hidden slots in at a low opacity.
5. p100, threshold tick (x 258-270, y 36-70 and x 690-700, y 36-70): the 5 px tick and its flag are the only gate cue, with no label. With a free label slot per contract, a future spec should pass a callout for the threshold value (e.g. via CalloutArrow, d:6.11:1) so the gate value is on screen when it is spoken.
6. p100, contact shadows (x 180-345 and 610-775, y 238-258): the dark ellipses are lighter-footprint than the dial and look detached at 540p; tighten rx to ~0.9 r and raise opacity.
7. p0 baseline is an empty dark frame and protects nothing; rewrite at frame ~6 when baselines are next regenerated.
