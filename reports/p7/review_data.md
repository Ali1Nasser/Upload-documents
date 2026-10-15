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
