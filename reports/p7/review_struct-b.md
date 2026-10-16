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

### RequestJourney — round 1 (2026-10-16)

Read p0, a1, p50, p100 at full size (960x540, lite). Score 7.3, no blocking issue; meta.json set to approved-critic.

Scores: legibility 1080p 7.5 (labels about 13 px at 960, latency mono readable); token/palette discipline 8 (cyan carrier, red fail, amber settled latency); depth and light 7 (glass discs on pedestals with light pools; floor grid weak); visual verb 8 (capsule hops, rail draws, db turns red with cracked capsule at p50, re-forms cyan at p100); Arabic 8 (RTL order: client at right, rail runs right to left; "الـ" prefix isolated from Latin terms correctly); no bullet look 8; no legacy frames 10; unsourced numbers 8 (1160 ms = d:6.6:4 verified in graph, from iu:01541); motion intent 6.5 (no strip, inferred from stills).

Blocking issues: none.

Non-blocking, ordered by impact
1. p100 / p50, region x 175-780 / y 345-440: perspective floor is about 3-5% luminance and the discs barely sit on it; raise grid to 8-10% with a horizon glow and contact reflections.
2. All states, region x 0-960 / y 0-130 and 440-540: about 50% of the frame is empty; scale the arrangement about 1.25x or lower it to centre.
3. p50 / p100, region x 80-170 / y 380-400: "1160 ms" has no thousands separator and no "p95" tag, while the spoken line is "p95 wait exceeds 1,160 ms". It is also a queue wait attached to the db hop in the demo; keep the demo, but add a "p95" chip and format 1,160 (graph label is "1 160 ms").
4. p100, region x 100-140 / y 312-335: the capsule is about 35 px wide and the pill at the db hop is the only carrier cue; enlarge x1.4 so the retry re-form reads. The author says retry re-forms at the previous hop; the settled frame shows it at db, so the intermediate state is not demonstrated.
5. p50, region x 60-180 / y 225-360: shockwave and shards are not visible in the settled failure frame; supply a strip across the fail anchor (frames about 126-150) so shake and impact can be judged (motion 6.5).
6. p0 is an empty vignette (no regression signal); baseline a frame after the first hop lands instead.

### PartitionLanes — round 1, third independent read (2026-10-16)

Read p0, a1, p50, p100 at full size plus snap/PartitionLanes.jpg. Score 7.0 / 10, APPROVED, no blocking issue; meta.json stays approved-critic (reads list added). Arabic QA pass (OCR 1/1), no unsourced numbers (5 min carries s:S4:P19:0090), no legacy frames, no bullet-list look. Rubric: legibility 7, palette 8, depth and light 7, verb 8, Arabic 9, motion intent 6.5 (inferred, no strip). Non-blocking, ordered by impact:
1. p50 and p100, region x 500-780 / y 100-450: right 40% of the slabs is empty and tiles are ~100 px; enlarge tiles ~1.3x or narrow slabs.
2. p100, region x 485-600 / y 95-460: offset markers are thin cyan lines that read as lane dividers; thicken to ~3 px and anchor the arrowhead on the tile edge. At P2 the marker runs straight into the "5 min" pill (x 490-505), crowding it.
3. p50 and p100, region x 280-490 / y 110-440: tile digits and shape icons are low-contrast grey; raise luminance.
4. p50 and p100, region x 795-900 / y 225-325: producer tile has no visible feed link to a lane.
5. a1, region x 285-700 / y 105-440: slabs at three different widths read as a bar chart for one frame; stagger or fix the width.
6. Floor grid ~3-4% luminance, T3 tag sits on it; add horizon glow.
7. Motion strip (produce drop, lag bracket bloom, re-wire) still owed in round 2; p0 baseline is an empty frame and carries no regression signal.

### BlockReplication — round 1, third read (2026-10-16)

Read a1, p50, p100 at full size (960x540, lite) plus reports/p7/snap/BlockReplication.jpg. SHA-256 of the four PNGs matches meta.json (baselines current; source unchanged since 07bd9d2; snap PASS det 0 px, Arabic QA PASS recorded, not re-run here). Score 7.0, APPROVED, no blocking issue; meta.json stays approved-critic.

Rubric: legibility at 1080p 7 (chip ids about 10 px at 960, readable at 1080p, tight on teal glass); palette/token discipline 8 (cyan carrier, red dead node, green re-created copies); depth and light 6.5 (tile key-pool glow is good, racks read as flat window cards); visual verb 8 (bar, tiles, 3x landing, rack C red and hollow, green copies elsewhere); Arabic 9 (RTL, A at right, Latin letter isolated); no bullet look 7 (uniform card row, near dashboard); legacy frames none; unsourced numbers none; motion intent 6.5 (no strip, inferred).

Blocking: none.

Non-blocking, ordered by impact
1. p50 and p100, region x 175-780 / y 250-362: racks are square window cards (titlebar, dots, 3x3 grid); make them taller cabinets with lit top face and drive-bay rows.
2. all states, region x 0-960 / y 0-140 and 400-540: about 55% of the frame is empty; scale the arrangement about 1.25x.
3. all states, region x 0-960 / y 362-420: floor grid about 3% luminance and racks do not touch it; raise to 8-10% with a horizon glow and contact shadow.
4. p100, region x 670-780 / y 275-350: green copies differ only by a thin outline; add a soft green glow.
5. a1 is a lopsided transitional frame and p0 is empty; baseline a frame after all five racks land for stronger regression signal.
6. Round 2 owes a motion strip (split morph, flight arcs with light trail, failNode sparks and shake, rereplicate flights) to judge easing and impacts.

### Conveyor — round 1 (2026-10-16)

Read a1, p50, p100 (p0 is an empty vignette) at full size (960x540, lite) plus reports/p7/snap/Conveyor.jpg. Snap PASS det 0 / qa 0 mismatched, Arabic QA PASS (OCR 2/2) as recorded; not re-run. Score 7.5 / 10, APPROVED, no blocking issue; meta.json set to approved-critic.

Rubric: legibility at 1080p 7.5 (crate ids about 20 px at 960, station pills about 14 px; Kafka / core / الموبايل readable); palette and token discipline 8 (neutral glass, cyan active gate, red jam with warn pool, green pass with check; no stray hues); depth and light 8 (lit top and shaded side on crates, belt top with roller ticks, drums, legs, perspective floor, red signal pool under the jam at p50); visual verb 8.5 (items pass scanner gates in sequence, one crate tilts and locks red while followers queue, the next resumes green; reads without narration); Arabic 8.5 (الموبايل and الـcore are well shaped, Latin core isolated with ال attached correctly, pills render right-to-left); no bullet look 9; legacy frames none; unsourced numbers none (T1..T6 are receipt tags, no figures); motion intent 6.5 (inferred from four states, no strip).

Blocking: none.

Non-blocking, ordered by impact
1. p100, region x 440-470 / y 255-330: the cyan light-curtain post for the core gate crosses the "6" of T6 and the crate face; draw the post behind the crate front face or shift the gate 20 px so it does not overlap the glyph. Same overlap on T1 and T2 in a1 (x 460-490 / y 220-325) and on T3 in p50 (x 270-290).
2. p50 and p100, region x 55-95 / y 320-365: the left end drum is cut off by the box edge while the right drum is whole; widen the margin on the entry side or fade the belt tail.
3. all states, region x 0-960 / y 0-150: the upper 28% of the frame is empty and the line occupies about 45% of the height; scale the line about 1.2x or lift the gate lamps and labels.
4. p50, region x 225-360 / y 240-330: the jam shockwave and shake are not visible in the settled frame; supply a strip across the jam anchor (a few frames either side) to judge the lock, tilt and queue behaviour (motion 6.5).
5. p100, region x 128-150 / y 250-270: the check mark on T4 is about 16 px; enlarge x1.4 so pass status reads at 960.
6. p0 carries no regression signal; baseline a frame after the first crate lands (a1 is mid-arrival and right-clustered, x 375-865).

### WorldMapA01 — round 1 (2026-10-16)

Read p0, a1, p50, p100 at full size (960x540, lite) plus reports/p7/snap/WorldMapA01.jpg and the component source. SHA-256 of the PNGs matches meta.json; snap and Arabic QA results as recorded (QA: 0 strings, pass), not re-run. Score 7.0 / 10, APPROVED, no blocking issue; meta.json set to approved-critic.

Rubric: legibility at 1080p 7 (tag chips about 15 px at 960, about 30 px at 1080p; dim-district tags lose contrast); palette and token discipline 8 (signal cyan current, warm windows learned, grey dormant; no stray hues); depth and light 8 (true 3D towers with lit faces and windows, far skyline, floor grid, signal pool under the current district, key light upper right); visual verb 8 (city rises, learned districts light warm, current district ignites cyan, route draws with a head, camera orbits to face the new district: p50 to p100 reads without narration); Arabic 7 (no Arabic rendered; Latin chips only, which suits the Latin movement names, but Arabic movement names are deferred, see 5); no bullet-list look 9; legacy frames none; unsourced numbers none (chip numbers are the CH-01 order 1-7); motion intent 6.5 (inferred from four states, no strip).

Blocking: none.

Non-blocking, ordered by impact
1. p50, region x 590-700 / y 305-335 and x 765-840 / y 320-345: the "1 machine" and "2 data" chips sit on top of their own towers (fallback slot clamp), cutting the window rows; push the tag above the roofline with a leader, or reserve a tag lane outside the district box. In p100 the "2 data" leader line crosses a tower face (x 685-700 / y 185-280).
2. p50, region x 490-560 / y 95-440: the light shaft over 3 systems is a hard-edged flat rectangle that reads as a ghost slab over "7 evidence"; taper it to a cone with soft side falloff and fade it before the far row.
3. p50 and p100, region x 300-420 / y 285-400 (5 domain, 4 platform in p50) and x 260-350 / y 175-360 (6 AI, 5 domain in p100): dormant tags are ink2 on near-void and drop below comfortable contrast at 1080p; lift to about ink at 0.8 or add a faint plate fill.
4. p100, region x 560-740 / y 340-380: the 4-to-3 route is a thin grey/cyan line that disappears behind the 2 data towers at x 685-735; raise the route above the tower base or draw the head larger, so the journey reads at a glance. Hub "Orientation" is not visible in any state; confirm it lights for the intro anchor.
5. Arabic names: the source comment cites CR-SB-001 (a `labels` prop for Arabic movement names), but no matching entry exists in corpus/specs/_component_requests.jsonl (grep for WorldMap returns nothing). File it so scene-directors can supply Arabic names; a Latin-only city in an Arabic film needs it.
6. p0 is an empty vignette and carries no regression signal, and a1 is mid-rise and right-clustered (x 360-740); add a baseline after the last district rises (about 0.35).
7. Round 2 owes a motion strip (district rise stagger, ignite sequence, route head, flyTo orbit with the previous district settling) to judge easing and impacts; with no strip, motion is scored 6.5 by inference.
