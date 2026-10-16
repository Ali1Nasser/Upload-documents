# P7 data group review

## RowFunnel — round 1

Critic: critic (not the author). Date 2026-10-15. Score 7/10. Verdict: approved-critic (no blocking issue), conditions below.
Evidence: baselines p0/a1/p50/p100 at full size (960x540, lite tier), plus an extra 8-frame strip of the WHERE -> GROUP BY drop (frames 84, 90, 96, 102, 108, 114, 120, 128; rendered by the critic through the queue, not committed).

Scores: legibility 1080p 7 (chips and counts about 26-28 px at 1080p; ghost rail and future chips deliberately dim) · token/palette discipline 8 (signal cyan, ink greys, crit red only for dropped rows) · depth and light 6 · verb reads without narration 8 · Arabic correct 7 · no bullet-list look 9 · no legacy frames 10 · no unsourced numbers 9 (14, 13, 11, 2, 2, 2, 2, 1 carry d:6.3 refs) · motion intent visible 6.

Blocking issues: none.

Required fixes before the scene-directors rely on it (ordered by impact):
1. Dropped-row tumble does not read (frames 84-128, region x 255-370, y 100-420 of the strip crop; p100 x 320-340, y 150-410). Horizontal travel is 0.14 x pitch (about 15 px at 960) and u finishes in 2 x morph frames, so by frame 90 the rows are parked as dim crit dots above and below the survivors. The strip shows a squeeze, not a tumble out of the wall with spin. Raise travel to about 0.35 pitch, keep the arc visible for at least 10 film frames, and let the trail be visible at 960 px (trail opacity is 0.12-0.32 on a dark ground).
2. Light is faint (p50, p100 under every lit column, y 430-440). The under-light pool is a thin ellipse of 30 % signal that disappears at 960 px, and the band gradient tops out at 28 %. Strengthen the pool (about 2x height and a visible reflection of the lit dots) and add a leading-edge highlight on the band so the funnel looks lit from the lit column.
3. Arabic unit order (p50 and p100 header, x 690-910, y 45-110). In the LTR composition the unit "صف" sits to the right of the number, so an Arabic reader meets the unit first ("صف 11"). Have arabic-typographer rule on it; the fix is to put the unit on the reading-start side, or move it under the number. Use the dual (صفّين) for the count 2 if the lexicon allows.
4. Resting crit marks collide with geometry (p100 x 320-345, y 150-240; strip frames 90-128 where the cone edge runs through the first red dot). Offset the rest position clear of the band edge, or draw the band under a mask.
5. Stray dots (p50 x 115-235, y 125-145 and p100 x 755-770, y 238-255). A single dropped row floats detached above the column and looks like a rendering artifact. Fade it with a short link line back to its former slot, or keep the X strike more visible.
6. The a1 still is 80 % empty (the first column alone at the far left, x 90-135). Acceptable as a progressive reveal, but the scene must put a camera drift or a second plane in the gap.

Not seen: standard and hero tiers (stills are lite); no grain, bokeh or particles judged here.

## JoinFusion — round 1

Critic: critic (not the author). Date 2026-10-15. Score 7/10. Verdict: approved-critic (no blocking issue), conditions below.
Evidence: baselines p0/a1/p50/p100 at full size (960x540, lite tier) and reports/p7/snap/JoinFusion.jpg (same four frames). No motion strip exists; the slide-together move between p50 and p100 was not judged.

Scores: legibility 1080p 7 (headers and key chips 20-26 px at 1080p; row content is abstract bars by design; "rows" unit about 18 px) · token/palette discipline 8 (signal cyan, ok green, crit red, warn amber, key swatches from the palette) · depth and light 6.5 (rim-lit slabs read; shaft and pool faint) · verb reads without narration 8 (beams, fan-out, NULL ghosts, seam bars) · Arabic correct 8 (العملاء / الطلبات shaped right, Arabic QA pass; unit not Arabic) · no bullet-list look 8 · no legacy frames 10 · no unsourced numbers 8 (15 carries d:6.4:1) · motion intent visible 6 (stills only).

Blocking issues: none.

Required fixes (ordered by impact):
1. Count contradicts the picture (p100 rows x 305-655, y 118-460 vs counter x 450-510, y 480-500): six fused rows sit above "15 rows", and the demo data say 6 customers in. A viewer counts 6 and hears 15. Either add a visible fan-out tally (for example +9 duplicated rows, with the multiplied rows carrying the warn edge and a count-up on the fuse word), or stack ghost rows behind the result to imply 15, or have the spec scene-directors pair the counter with a "such as" cue. Do not leave an unexplained mismatch.
2. Light is dashboard-level at 960 px. p50 beams (x 285-673) are 1 px hairlines with 5 px sparks; make beams about 2 px with a soft under-glow and a larger spark with a short comet trail. p100 shaft (x 450-510, y 270-290) and floor pool (x 300-660, y 462-480) are 16-30 percent; raise the pool about 1.5x in height and let it reflect the lit rows.
3. Result counter unit (p100 x 450-510, y 485-500): "rows" is about 9 px at 960 (18 px at 1080) English on an Arabic film. The spec must pass an Arabic unit (صف, or the dual or plural per the lexicon) and the counter should be about 1.4x bigger; arabic-typographer to rule on side-of-number order (same issue as RowFunnel fix 3).
4. Amber fan-out edge (p100 rows 3 and 4, x 308-651, y 237-296) has no key. Tie it to the beam: pulse the amber edge when the second beam leaves the same left row (p50 x 285-673, y 218-290), or add a "x2" cue on the source row.
5. Result has no column headers; the dimmed table headers (p100 x 125-880, y 40-95) vanish while the list loses its schema. Keep a combined header over the fused rows, or hold the originals at 40 percent.
6. Wide empty margins at p100 (x 60-300 and 660-900) and a1 (x 345-615). Acceptable as progressive reveal, but the scene needs a camera drift (push_in is in the demo) or a second plane to fill them.

Not seen: standard and hero tiers, grain/bokeh/particles, the slide-together motion between p50 and p100 (request a strip before the first scene relies on its timing).

## JoinFusion — round 1 (re-review of 049866d, after the critic fixes)

Critic: critic (not the author). Date 2026-10-16. Score 7.6/10. Verdict: approved-critic (no blocking issue).
Evidence: baselines p0/a1/p50/p100 at full size (960x540, lite) and the component code for motion timing. No motion strip was rendered (slide-together judged from code: fuse act rolled with ease.camera, beams fade over e*2.2, counter rolls to its value on the fuse word).

Scores: legibility 1080p 7.5 (headers and key chips 20-26 px; counter about 64 px; Arabic unit about 36 px; row content is abstract bars by design) · token/palette discipline 8 · depth and light 7 (rim-lit slabs, 4 px beams with comet spark and warn pulse, visible green floor pool and 3-row ghost stack; seam shaft still faint) · verb reads without narration 8.5 · Arabic correct 8.5 (العملاء / الطلبات shaped right; "15 صف" now reads number-then-unit for an RTL reader) · no bullet-list look 8.5 · no legacy frames 10 · no unsourced numbers 8.5 (15 is a spec-supplied d: ref; the 3-row stack implies "more", it does not state a count) · motion intent visible 6.5 (stills show beam sparks and trails; slide-together not seen).

Blocking issues: none.

Remaining non-blocking fixes (ordered by impact):
1. Fused rows have no column header (p100, region x 305-655, y 60-118). The combined header is only the ON chip plus the LEFT JOIN chip; the original table names and key chips stay dimmed at 45 percent far at the sides (x 125-270 and 640-885), so the result loses its schema. Move or duplicate the key chips above the fused columns, or hold the originals at about 70 percent.
2. Empty margins at p100 (x 55-300 and 660-900, y 110-450) and the floor grid is invisible at 960 (y 455-505 reads as a flat band). The scene must pair with push_in or a second plane; raise floor-grid line alpha about 2x.
3. Seam shaft is still faint (p100 x 450-510, y 150-420). Lift its alpha about 1.5x and let the lit rows reflect into the floor pool.
4. No motion strip: before the first scene relies on timing, render a 8-frame strip of the fuse (e 0 to 1) and check that the dropped rows fade rather than snap and that beams are gone before the rows meet.
5. The ghost stack (p100 x 310-650, y 400-445) is three amber outlines against a counter of 15; scene-directors should pair it with a "such as" cue or the count-up on the fuse word so the 6-versus-15 mismatch stays explained.

Not seen: standard and hero tiers; grain, bokeh and particles.

## WindowFrame — round 1 (1ce1e81)

Critic: critic (not the author). Date 2026-10-16. Score 7.2/10. Verdict: approved-critic (no blocking issue).
Evidence: baselines p0/a1/p50/p100 at full size (960x540, lite), reports/p7/snap/WindowFrame.jpg, arabic_WindowFrame.json (pass) and component code for the ghost and slide timing. No motion strip exists; the slide and the ghost trail are judged from code only.

Scores: legibility 1080p 7.5 (cell values about 44 px at 1080, chips about 24 px, SUM about 80 px; dimmed out-of-frame cells are low-contrast but intentionally secondary) · token/palette discipline 8 (violet slab = partition, ember = frame, cyan marker; one accent family per role) · depth and light 6.5 (rim-lit glass frame and floor pool read; shaft is about 15 percent alpha and invisible at 960; no particles or grain visible) · verb reads without narration 8 (a lens sliding over ordered cells with a rolling SUM; sums check: 120, 80+120=200, 50+150+100=300) · Arabic correct 6.5 (the pass is vacuous: 4 strings, all Latin or numeric; no Arabic carrier is on screen) · no bullet-list look 8 · no legacy frames 10 · no unsourced numbers 8.5 (receipt values and sums are d: refs; 330 is the row-4 frame) · motion intent visible 6 (stills show frame position per state, but ghost trail and roll are not seen).

Blocking issues: none.

Non-blocking fixes (ordered by impact):
1. Motion not evidenced. Render an 8-frame strip of the slide a1 to p50 (frames 11 to 79) and check the ghost (code: border alpha 0.5*(1-q)) is visible at 960 and that the SUM roll lands on the word. Region: ghost at p50 x 262-345, y 212-318, currently not visible in any still.
2. Light is dashboard-level. p50 and p100 shaft (x 300-420, y 318-335) and floor pool (x 210-770, y 315-340) are 10-25 percent; raise the pool about 1.5x in height and let it tint the neighbouring cells. At p100 the pool runs past the panel right edge (x 700-770, y 315-335), so clip or fade it.
3. English-only chrome on an Arabic film (a1/p50/p100: ORDER BY chip x 200-375, y 147-170; SUM chip x 630-675, y 358-380; frame kind chip x 200-555, y 358-382). Keep SQL tokens LTR as code, but the spec must pass an Arabic carrier (for example ترتيب, المجموع) for the SUM chip, same ruling as JoinFusion fix 3, and arabic-typographer should confirm the order.
4. The panel fills only about 60 percent of the frame (x 180-780, y 125-415); margins are empty. Pair with push_in or a second plane in the scene, or allow a wider panel variant.
5. Dimmed out-of-frame cells (p100 120, 80, 200, x 265-470, y 225-305) fall near 3.5:1; lift ink alpha about 1.2x so the whole partition stays readable.
6. The p0 baseline is a blank field and guards nothing; replace it with frame 6 to 8 (partial reveal) at the next re-bake.

Not seen: standard and hero tiers; grain, bokeh and particles; groups and range frame kinds (only rows demo).

## WindowFrame — round 2 (382002d, post-fix re-review)

Critic: critic (not the author). Date 2026-10-16. Score 7.5/10. Verdict: approved-critic (no blocking issue).
Evidence: baselines p0/a1/p50/p100 at full size (960x540, lite). No motion strip exists; motion is judged from the stills' frame positions only.

Fix verification: floor pool now ends inside the partition panel at p100 (x about 700) and is taller, so the earlier overrun is gone. Dimmed out-of-frame cells (p100 120/80/200, x 265-470, y 225-305) are readable at 960. The Arabic column chip (الإيصال, a1/p50/p100 x 290-340, y 147-168) shapes and joins correctly (lam-alef, hamza-under alef) and sits as its own chip beside the LTR ORDER BY chip, so there is no bidi reversal. The Arabic QA report is no longer vacuous.

Scores: legibility 7.5 (Arabic chip text about 14 px at 960, about 28 px at 1080; adequate) · palette discipline 8 · depth and light 6.5 · verb without narration 8 · Arabic correct 8 · no bullet look 8 · no legacy 10 · no unsourced numbers 8.5 (120/200/300 are sums of d: receipts) · motion intent 6.5.

Blocking issues: none.

Non-blocking (by impact):
1. No motion strip: ghost trail and SUM roll (p50 x 262-345, y 212-318) are unproven. Render an 8-frame a1-to-p50 strip before a scene relies on timing.
2. Light still modest: shaft under the frame is faint (a1/p50 y 315-335) and no particles or grain are visible at lite. Check standard and hero tiers.
3. Panel fills about 60 percent of the frame (x 180-780, y 125-415); pair with push_in or a second plane.
4. p0 is a blank field and guards nothing; rebake at frame 6 to 8.
5. Arabic chip is small beside the ORDER BY chip (x 290-340); consider matching its cap height to the Latin chip.

Not seen: standard and hero tiers; groups and range frame kinds.

## LedgerPair — round 1 (03c9b63)

Critic: critic (not the author). Date 2026-10-16. Score 7.4/10. Verdict: approved-critic (no blocking issue).
Evidence: baselines p0/a1/p50/p100 at full size (960x540, lite), reports/p7/snap/LedgerPair.json, arabic_LedgerPair.json (pass, 2 strings, OCR exact), demo spec in studio/src/demos/data.tsx. No motion strip exists; the sweep and bridge animation are judged from stills only. Sums verified: successful 120+80+50+150 = 400 (d:5.2:8), all 120+80+200+50+150+100 = 700.

Scores: legibility 1080p 7.5 (amounts about 44 px at 1080, T-labels about 40 px; the EGP unit is about 10 px at 960, about 20 px at 1080, borderline) · palette discipline 8.5 (green = agree, red = mismatch, cyan rim; one accent per role) · depth and light 6 (rim-lit glass and floor lines read; the verdict shaft and floor glow are faint red smudges at y 430-455; no particles or grain at lite) · verb reads without narration 8.5 (pair, ghost, check/cross, total, unequal) · Arabic correct 7.5 (titles shape and join correctly and sit on the right as the source; but only 2 strings are tested and all chrome, T1..T6 and EGP, is Latin) · no bullet look 8 · no legacy 10 · no unsourced numbers 8.5 (entries carry d: refs; 700 is a derived sum) · motion intent 6.5 (a1 to p50 shows layout changes and sweep dots, but bridge draw and roll-up timing are unproven).

Blocking issues: none.

Non-blocking fixes (ordered by impact):
1. Light is dashboard-level. p50/p100 verdict shaft and floor glow (x 60-440 and 520-900, y 430-458) are 10-20 percent red and nearly invisible at 960; raise shaft alpha about 1.5x and extend it upward through the link column (x 440-520, y 360-430) so the verdict lights the scene. No particles or grain visible; check standard and hero tiers.
2. No motion strip. Render an 8-frame strip a1 to p100 (frames 11 to 169) and confirm the sweep dot, bridge draw and the total roll land on LP(2) and LP(3). At p50 the sweep dots are at x 467 (T1 left) and x 508 (T4 right) while T3 is already crossed; confirm the order is intended.
3. Ghost rows carry no label (a1 left panel x 77-427, y 222-256; p50/p100 y 220-258 and y 342-380). A missing partner should echo its label (T3, T6) in dim ink so the gap is readable without looking across; as is, the eye must trace the cross to the right row.
4. English-only chrome: EGP unit (x 120-160, y 160-165 at a1) and T-labels. Keep T1..T6 as ids, but let the spec pass an Arabic unit carrier (جنيه) as in WindowFrame fix 3; EGP at 20 px (1080) is the smallest text in the scene.
5. The panels leave empty glass: left panel at a1 (x 62-440, y 300-430) is about 35 percent blank before the reconcile; and the p100 totals sit at y 400-425, close to the panel edge. Either size the panel to its entries or reveal the totals row as a slot.
6. The p0 baseline is a blank field and guards nothing; rebake at frame 6 to 8 at the next re-bake.
7. The p50 to p100 panels shift about 8 px (push_in); this is fine, but the cyan rim on the left panel is clipped near x 48 at p100, so check the safe margin (68 px at 1080 is 34 px at 960).

Not seen: standard and hero tiers; grain, bokeh and particles; the bridge draw animation.
