# P7 review — struct-b (critic)

## TimelineTrack — round 1

Date 2026-10-15. Reviewed: baselines p0, a1, p50, p100 (960x540, lite, scale 0.5), reports/p7/snap/TimelineTrack.jpg, schema, demo (studio/src/demos/struct-b.tsx). No motion strip exists; motion judged from the four-state progression (empty, entrance, mid-path-draw with cursor on idx 2, finished with cursor on idx 4).

Score: 7.3 / 10. Verdict: APPROVED (no blocking issue).

Rubric read
- Legibility at 1080p: 6.5 (cards ~22 px, mono `when` ~26 px but grey; dim pre-cursor cards drop to roughly 40% contrast).
- Token/palette discipline: 8 (cyan cursor, green release, red incident, white milestone; shape plus colour).
- Depth and light: 6.5 (glass rail, light pool and reflection read; floor perspective lines are almost invisible).
- Visual verb without narration: 8 (rail fills cyan behind the cursor, grey ahead, markers differ by shape).
- Arabic: 8.5 (RTL order right-to-left, ال + Latin term and ⟦355 ms⟧ isolates come out in correct logical order; the tatweel is dropped, leaving a small gap between ال and gate, acceptable).
- No bullet-list look / no legacy frames: 8.5.
- Motion intent: 7.5 (path-draw and cursor handoff visible, no strip to confirm easing/impacts).
- Unsourced numbers: 355/500/675 ms are demo props; fine as a baseline, but real specs must anchor them to canon.

Non-blocking issues (ordered by impact)
1. p50/p100, whole frame: composition is a thin band at y 190-340 of 540; the lower ~45% and top ~30% are empty. Use more of the frame (taller card lanes, larger scale, or the floor plane as a lit surface) so it does not read as a UI strip.
2. p50, cards/labels: size and contrast. Card text ~22 px at 1080p and the `when` labels (p95, CI, rollback) in grey are the weakest text; the dimmed left cards (رجوع للنسخة القديمة, رفض النسخة) are close to unreadable. Raise label min size to >= 26 px at 1080p and keep the dim floor >= 0.6.
3. p50, region x 465-515 / y 255-285: cursor reticle and dot sit on top of the red incident triangle and hide its shape at the exact moment of emphasis. Offset the reticle above the marker or draw it as a ring around, not over, the glyph.
4. p50, region x 475-515 / y 175-215: the light cone is cut hard behind the incident card, leaving a trapezoid stub above it. Fade the cone out before the card plate.
5. p50 and p100, floor plane: perspective lines are ~3% luminance; depth is mostly carried by the reflection. Raise line alpha or add a horizon glow.
6. Provide a motion strip (cursorTo ease, path-draw) next round so motion can be judged, not inferred.
