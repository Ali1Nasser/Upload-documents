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

## GitGraph — round 1

Date 2026-10-15. Reviewed at full size: baselines p0, a1, p50, p100 (960x540, lite, scale 0.5) and reports/p7/snap/GitGraph.jpg (4-state sheet). Arabic QA (qa_arabic_GitGraph.json): pass, OCR 4/4 exact. No motion strip exists; motion is judged from the four-state progression only.

Score: 7.1 / 10. Verdict: APPROVED (no blocking issue). Baseline meta set to approved-critic.

Fix check (310895b): the newest-message plate no longer sits on the incoming merge curve. In a1, p50 and p100 the messages sit on the outer side of their lane (above main, below fix/retry) in two alternating rows, and no plate touches a curve. The larger nodes read at 1080p. Fixed.

Rubric read
- Legibility at 1080p: 7 (node rings, HEAD tag and branch tags clear; old-message labels are grey ~14 px at 960, about 28 px at 1080p, but low contrast).
- Token/palette discipline: 8 (cyan HEAD and active lane, green merge-back, violet fix lane, grey history; colour carries lane identity).
- Depth and light: 6.5 (HEAD glow and background pool read; p100 HEAD glow is faint; no floor, parallax or reflection, so it is flat).
- Visual verb without narration: 8 (fork, parallel commits, merge back; HEAD travels along the lane; reads without voice).
- Arabic: 9 (RTL order correct, Latin `retry` and `test` isolated inside whole-word Arabic, no per-letter animation; tatweel after ال drops to a small gap).
- No bullet-list look / no legacy frames: 9.
- Unsourced numbers: none shown (n/a).
- Motion intent: 7 (edge path-draw, HEAD travel and merge flash are visible as state differences; no strip to confirm easing or impact timing).

Non-blocking issues (ordered by impact)
1. p50 and p100, whole frame: the graph occupies about x 215-775, y 140-410 of 960x540 (~25% of area); top 25% and bottom 25% are empty. Scale the lane spacing and node size up about 1.3x, or use the lower half for a lit floor, so it does not read as a small diagram.
2. p100, region x 280-375 / y 385-412: the highlighted "الـ test نجح" plate is still marked as the newest after HEAD has moved to the merge node at x 240, y 197; the merge commit itself has no message. Re-target the newest-plate highlight to the merge commit (or give it a message) at the final state.
3. p50 and p100, lane tags at x 665-775 / y 185-355: `main` and `fix/retry` float 80-190 px right of the last node with no connecting line, so lane identity is weak. Anchor each tag at the lane start or extend a faint lane guide to it.
4. p50 and p100, old-message labels (نظام الدفع, أول نسخة, إضافة الـ retry): grey on near-black, below the 0.6 contrast floor suggested in the TimelineTrack review. Raise to about 0.7 luminance.
5. p100, region x 215-265 / y 175-220: HEAD glow is weak at the climax. Boost the tiered glow at the merge flash end state.
6. Supply a motion strip (path-draw, HEAD travel, merge flash) in round 2 so easing and impacts can be judged rather than inferred.
