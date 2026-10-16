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

## StackHeap — round 1

Date 2026-10-16. Reviewed at full size: baselines p0, a1, p50, p100 (960x540, lite, scale 0.5) and reports/p7/snap/StackHeap.jpg (4-state sheet). Arabic QA (qa_arabic_StackHeap.json): pass, OCR 2/2. No motion strip exists; motion is judged from the four-state progression only.

Score: 7.3 / 10. Verdict: APPROVED (no blocking issue). Baseline meta set to approved-critic.

Rubric read
- Legibility at 1080p: 7 (frame names and heap capsule text are large and clear; the "stack" and "heap" floor labels are about 11 px at 960, roughly 22 px at 1080p, grey and faint).
- Token/palette discipline: 8 (cyan for the live frame and refs, amber for the unreferenced temp capsule, grey for history; colour carries meaning).
- Depth and light: 7 (glass slabs with an edge, a lit perspective floor, a halo around the aliased capsule and a visible light-cursor bar; the floor grid is faint and the heap objects do not touch the floor).
- Visual verb without narration: 8 (frames stack up and the top frame is lit; two refs converge on one object, which gets a double ring; the amber orphan reads as "temporary").
- Arabic: 9 (RTL correct; Latin `object` isolated inside a whole-phrase capsule; no per-letter animation).
- No bullet-list look / no legacy frames: 8 (rows sit inside slabs with ports, not as a list).
- Unsourced numbers: none shown (n/a).
- Motion intent: 6.5 (push of g(y), ref path-draw, pulse and collect are inferred from state differences; no strip).

Non-blocking issues (ordered by impact)
1. a1, region x 0-460 / y 100-400: the left half is empty, and the stack alone is pushed right (x 462-815). Centre the stack when the heap is empty, or pre-draw a dim heap zone, so the first state is not lopsided.
2. p50 and p100, region x 110-380 / y 300-400: heap capsules float 50-60 px above the floor with no visible contact shadow. The floor starts at y ~400, so the "slightly above the floor" claim does not read. Lower the capsules toward the floor plane or add an ellipse shadow on it.
3. p50, region x 140-360 / y 180-240: the amber temp capsule floats high and alone with no stack ref and no floor link, so its heap membership is weak. Place it on the same floor band, or add a faint drop line.
4. all states, floor labels "stack" and "heap" at y ~415-425: small grey text on a grid. Raise to about 0.7 luminance and about 1.3x size.
5. p50 and p100, floor plane: grid lines are about 3-4% luminance and the grid extends past both ends of the content. Add a horizon glow and fade the grid at the edges.
6. a1 and p50, region x 455-470 / y 205-370: the left-edge ref ports are hairline 6 px circles. Enlarge ~1.5x so the origin of each reference reads at 1080p.
7. Supply a motion strip (push, ref path-draw with travelling pulse, aliasing pulse, collect sparks) in round 2 so easing and impacts can be judged rather than inferred.

## PartitionLanes — round 1

Date 2026-10-16. Reviewed at full size: baselines p0, a1, p50, p100 (960x540, lite, scale 0.5) and reports/p7/snap/PartitionLanes.jpg. Arabic QA (qa_arabic_PartitionLanes.json): pass, OCR 1/1 exact. Snap determinism 0 px. The lag value carries ref s:S4:P19:0090. No motion strip exists; motion is judged from the four-state progression only.

Score: 7.2 / 10. Verdict: APPROVED (no blocking issue). Baseline meta set to approved-critic.

Rubric read
- Legibility at 1080p: 7 (topic pill, "5 min" and the consumer pills are clear; tile index digits, "fraud-check" and the P0-P2 tags are about 11-13 px at 960, grey or violet on near-black).
- Token/palette discipline: 8 (violet lanes, cyan for consumers/offsets/producer, amber for lag only; colour carries meaning).
- Depth and light: 7 (glass slabs with edge light, faint violet under-glow, perspective floor grid, raised tiles; the slabs and floor grid are subtle and the tiles read nearly flat).
- Visual verb without narration: 8 (three lanes, keyed shape tiles, a cyan offset marker per lane, amber 5 min lag bracket and then c1/c2 re-wire read as "partitions, offsets, lag, rebalance").
- Arabic: 9 (RTL topic pill with isolated Latin `NilePay`; no per-letter animation).
- No bullet-list look / no legacy frames: 8.
- Unsourced numbers: none (5 min carries a source ref).
- Motion intent: 6.5 (produce, lag bloom and re-wire are inferred from state differences; no strip).

Blocking issues: none.

Non-blocking issues (ordered by impact)
1. p50 and p100, region x 500-780 / y 100-450: the right 40% of each slab is empty while tiles are about 100 px wide. Enlarge tiles ~1.3x or narrow the slabs so the lanes feel filled and the tiles read at 1080p.
2. p50 and p100, region x 280-490 / y 110-440: tile index digits and shape icons are grey at ~25% luminance. Raise to about 0.7 luminance; give the keyed shapes a faint tint.
3. p50 and p100, region x 795-900 / y 225-325: the producer tile floats right of the lanes with no visible link. Add a short faint feed line or a trailing arrow into the lane it writes to.
4. p100, region x 400-500 / y 335-460: the lag bracket and amber tiles are gone, but the "5 min" pill stays next to the offset marker with no anchor to the lag it measures. Keep a thin amber tick or tint on the pill.
5. p50 and p100, region x 140-900 / y 450-490: the floor grid is about 3-4% luminance and the "T3" tag sits on top of it. Add a horizon glow and place T3 under the tile it keys.
6. p50, region x 70-190 / y 340-390: the idle c2 boat is nearly invisible (about 10% luminance); acceptable as "not yet joined", but raise slightly so it reads as a consumer.
7. Supply a motion strip (produce drop, lag bracket bloom, rebalance re-wire) in round 2 so easing and impacts can be judged rather than inferred.

### PartitionLanes — round 1, independent re-read (2026-10-16)

Re-read p0, a1, p50, p100 at full size. Confirms the earlier approval: score 7.1, no blocking issue, meta.json status stays approved-critic. Extra non-blocking observations:
- a1, region x 285-700 / y 105-440: the slabs are drawn at three different widths (grow-in), which looks like a bar chart for one frame. Stagger the width reveal or keep a common slab width.
- p50 and p100, region x 485-600 / y 95-460: the offset markers are thin cyan lines whose arrowheads sit in the gaps between slabs; they read as lane dividers. Thicken the marker to about 3 px and anchor its head on the tile edge.
- p0 is an intentionally empty frame (pre-entrance); fine, but the baseline carries no signal, so regressions there are not detectable.
- Still no motion strip; motion intent stays inferred (6.5).

## BlockReplication — round 1

Date 2026-10-16. Critic did not author it. Reviewed at full size: baselines p0, a1, p50, p100 (960x540, lite, scale 0.5) and reports/p7/snap/BlockReplication.jpg. Arabic QA (qa_arabic_BlockReplication.json): pass, OCR 3/3 exact, 0 tofu, 0 bidi. Snap determinism 0 px. No motion strip exists; motion is judged from the four-state progression only.

Score: 7.0 / 10. Verdict: APPROVED (no blocking issue). Baseline meta set to approved-critic.

Rubric read
- Legibility at 1080p: 7 (rack labels "سيرفر A..E" are bold white and clear; chip ids b1..b8 are about 10 px at 960, i.e. ~20 px at 1080p, light on teal glass; the file tiles are clear).
- Token/palette discipline: 8 (teal glass for ok, red for the dead rack, green for re-created copies; colour carries state).
- Depth and light: 6 (file tiles and chips are raised with a soft key pool; but the racks read as flat window-frame cards, a titlebar with three dots over a 3x3 grid, not tall cabinets with a lit top face and drive bays; the floor grid is about 3-4% luminance).
- Visual verb without narration: 8 (bar -> tiles -> chips landing 3x across five racks -> one rack turns red and hollow -> green copies appear elsewhere reads as "replicate, node dies, data survives").
- Arabic: 9 (RTL placement, A on the right, Latin ids isolated, no per-letter animation).
- No bullet-list look / no legacy frames: 7 (the rack row is a uniform card grid; it is close to a dashboard of cards).
- Unsourced numbers: none (block ids and node letters are labels, not claims).
- Motion intent: 6.5 (flight arcs, light trails, sparks and warn bars are not visible in any of the four stills; inferred only).

Blocking issues: none.

Non-blocking issues (ordered by impact)
1. p50 and p100, region x 175-780 / y 250-362: racks are 105 px square cards with a titlebar; the brief asks for glass cabinets with a lit top face, LEDs and drive bays. Make each rack taller than wide, add a visible lit top face (a lighter parallelogram on the roof edge) and drive-bay rows instead of a 3x3 grid, so it stops reading as a window card.
2. all states, region x 0-960 / y 362-420: the perspective floor is about 3-4% luminance, the racks stop at y ~360 and the grid starts at y ~362, so the racks do not sit on it and the labels float over it. Raise grid to ~8-10% luminance with a horizon glow, drop the racks onto the floor, and add a reflection or contact shadow.
3. p50 and p100, region x 175-780 / y 285-345: chip ids are about 10 px at 960 on teal glass. Raise to ~13 px (26 px at 1080p) or brighten the text.
4. p100, region x 424-534 / y 250-362: dead rack C is clear (red outline, red label, hollow chips), but the sparks and warn bars from failNode are not visible in the settled state; the surviving copies (e.g. in B and E) show no warn tint. Provide a strip across the failNode anchor so the impact can be judged.
5. all states, region x 0-960 / y 0-140 and 400-540: about 55% of the frame is empty dark; the content band is 250-380 only. Enlarge the whole arrangement ~1.25x or lower the file bar into the frame centre.
6. p100, region x 220-725 / y 143-190: the file tiles stay unchanged after the copies leave; dim them or add a faint link from tiles to their replicas so b-n to its three chips is traceable.
7. Supply a motion strip (split morph, flight arcs with light trail, landing, failNode sparks/shake, rereplicate flights) in round 2 so easing and impacts can be judged rather than inferred.

### StackHeap — round 1, independent re-read (2026-10-16)

Re-read p0, a1, p50, p100 at full size (960x540). Confirms the earlier approval: score 7.2, no blocking issue, meta.json stays approved-critic. Reference: Arabic QA pass (OCR 2/2), snap 0 px, no unsourced numbers, no legacy frames, no bullet-list look (rows live in glass slabs with ports and a light-cursor bar). Extra non-blocking observations:
- p0 is a pre-entrance empty frame (soft vignette only); it carries no signal, so regressions at entrance are undetectable. Consider baselining a frame just after the first push instead.
- p100, region x 110-460 / y 180-400: the heap capsule and its twin refs read clearly, but the whole scene fills about 45% of the width and the top 30% is empty; scale the arrangement about 1.25x.
- p100, region x 395-410 / y 335-365: the ref pulse dots sit mid-curve and are the only motion cue in the stills; a strip (push g(y), ref draw, aliasing ring, collect sparks) is still owed to judge easing and impacts (motion 6.5).
- p50 / p100, region x 60-900 / y 400-490: floor grid and "heap"/"stack" labels are faint, as in the first read (items 4-5).

### BlockReplication — round 1, independent re-read (2026-10-16)

Re-read a1, p50, p100 at full size (960x540, lite). Confirms 7.0, no blocking issue; meta.json stays approved-critic. Replication reads without narration: file bar, then each block landing 3x across five racks, rack C going red and hollow, and six green re-created copies (b3 b2 b8 b7 in A, b1 in E, b6 in D) matching the six lost chips. Arabic labels "سيرفر A..E" are correct (RTL, Latin letter isolated). No bullet look, no legacy frames, no unsourced numbers. Extra non-blocking observations:
- a1, region x 425-770 / y 250-360: only three racks have entered, all right-aligned, so the frame is lopsided (left half empty). Fine as a transitional state, but a1 is a weak regression frame; consider baselining a frame after all five racks land.
- p100, region x 670-780 / y 275-350: rack A holds 9 chips and fills its grid; the green copies are only distinguishable by a thin green outline at 960 px. Add a faint green glow or a "+" tick so the re-created copies read at a glance on mobile-size playback.
- p50 / p100, region x 0-960 / y 362-420: the floor grid sits under rack labels at about 3% luminance; the racks still do not touch it (same as items 2 and 5 above).
- Motion strip still owed (flight arcs, failNode sparks, rereplicate flights); motion intent is inferred only (6.5).
