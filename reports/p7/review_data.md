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
