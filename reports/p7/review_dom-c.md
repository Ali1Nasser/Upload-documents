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
