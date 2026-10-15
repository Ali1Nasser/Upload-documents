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
