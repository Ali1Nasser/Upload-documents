# P7 fx-a review (critic)

## FailureGlitch — round 1

Date: 2026-10-15. Reviewer: critic (did not author; draft finished in fc5777e). Scope: baselines p0/a1/p50/p100 at full size (960x540, lite tier; sha256 match meta.json), reports/p7/snap/FailureGlitch.jpg strip, FailureGlitch.tsx source. Snap: determinism 0 px, 0 QA findings.

Verdict: APPROVED, 7/10, no blocking issue. meta.json set to approved-critic.

### Good
- p50: the visual verb reads without narration. The table jolts, red/cyan scan slices cut across rows, and a red ring marks the box. p100 holds the failed state: crit corner brackets and the chip.
- Arabic: chip "العملية فشلت" shaped correctly with the cross on the left and the crit edge on the right. Title "إيصالات NilePay" is BiDi-correct. Columns are RTL (الإيصال rightmost, الحالة leftmost). No effect touches copy (slices and ring sit outside the glyphs; no chromatic split on text).
- Token discipline: C.crit / C.signal / C.ink3 only, seeded rnd (no Math.random). One 2-frame onset flash, so at most 2 flashes/s (WCAG 2.3.1). Label at about 26 px at 1080p is legible.
- No legacy frames, no bullet list, and no numbers in the component (demo data comes via props).

### Non-blocking issues (fix at the next re-baseline, with a new critic pass)
1. p50, ring region (x 282-676, y 78-468): the shockwave is a 2 px rounded rectangle at about 25-30 % alpha. It reads as a faint frame, not an expanding blast, and is not circular as 04 section 6 implies. Fix: render a true radial ring from the tar origin with a thicker, brighter leading edge, and add bloom at the onset.
2. Baselines are lite only. Sparks (6-14 rects), glow and screen blend are standard/hero features and none of them appears in any still. This repeats fx-b B2. Fix: add a standard (and a hero) baseline or strip, plus an onion-skin or 3-frame strip across the beat. The a1 still is pre-onset (4 rows, no failure), so no baseline shows the onset frame itself; consider moving a1 or p50 to anchor+1.
3. p50, noise blocks (e.g. x 400-430, y 275-285; x 427-440, y 160-163): ink3 blocks at 0.35 alpha read as grey dead pixels, not sparks or glitch. Fix: tint them crit/signal or drop the ink3 ones.
4. p100 (rows T3 and T6, region x 350-610, y 280-390): FAILED rows carry no red mark, so the held failure state is attached only to the chip and brackets. TableGrid already gives failed rows a red edge bar. Fix: at least offer an optional red row mark or tie the chip to the failed row.
5. p0 is the same empty gradient (sha 84797c...) as in other components and carries no signal. The card is about 31 % of the frame width, with body text about 14 px at 960. The inner bracket frame clips the first letter of the title's "إ" (region x 604-612, y 155-165).

## FixSettle — round 1

Date: 2026-10-15. Reviewer: critic (did not author; finished in 57478f2). Scope: baselines p0/a1/p50/p100 at full size (960x540, lite tier; sha256 match meta.json), reports/p7/snap/FixSettle.jpg (the same 4 frames, no extra strip), FixSettle.tsx source. Snap: determinism 0 px, 0 QA findings.

Verdict: NOT APPROVED, 6/10, 2 blocking issues. meta.json status set to changes-requested (approval stays pending-critic).

### Good
- Held end state (p50/p100): ok rim and L-brackets frame the table, the chip "اتصلحت والعملية نجحت" is shaped correctly (check on the leading right edge, ok edge bar), legible (about 34 px at 1080p). Colours are ok/signal/ink tokens only, seeded rnd, no Math.random, no numbers invented, no bullets, no legacy frames.
- Source intent is sound: outBack drop of 10 px with 1.03 to 1 scale, ring converging as the release of the crit shockwave, motes landing on the rim, sweep right to left.

### Blocking
1. Motion intent is not evidenced in any still (whole component). a1 (frame 11, region whole card x 333-625, y 128-410) is pre-settle: 4 rows, no rim, no brackets, no chip. p50 (47) and p100 (95) are post-settle holds. The drop, the 100 px converging ring, brackets closing from 36 px, the light sweep and the 10 landing motes appear in none of them. Motes are standard/hero only and no baseline or strip is standard. The two "visual verb" claims (ring is the release of the shockwave; motes land) are therefore unverified. Fix: add a strip at standard tier (or hero) at anchor+0, +1, +2, +3, +5 frames (settle is about 5 frames at 12 fps) plus an onion-skin, and re-point a1 to anchor+1 so a baseline shows the beat. Re-submit for round 2.
2. Contradictory state, p50/p100, region x 350-420, y 280-390 (rows T3 and T6 "FAILED" with a green "fixed and the operation succeeded" chip and ok frame). Without narration the picture says the opposite of the chip, so the verb "fix" does not read. Fix: in the Demo composition, flip the failed rows to OK on the anchor (or retried ok), or draw an ok mark/seat on the settling row. Note that the settle should land on the row that was fixed, not on the whole table.

### Non-blocking (fix at the next re-baseline)
3. p50/p100, region x 604-612, y 152-170: the ok rim (right edge at x about 609) runs through the "إ" of the title "إيصالات". Brackets at x 347-352 sit 5 px from "FAILED". This contradicts "nothing touches the copy". Fix: pad the rim from the card rect (not the table rect) by at least 18 px, or inset it clear of text.
4. Depth and light are modest: the rim is 1 px at about 50 % alpha and the ok glow is nearly invisible at lite. The held state looks like a thin outlined box. Standard/hero baselines should show the sweep and glow so depth can be judged.
5. p0 is the same empty gradient as in other components (sha 84797c...), no signal. Card is about 31 % of frame width, body text about 14 px at 960.
6. Chip (p100) sits very close to the card bottom (gap about 5 px at x 375-580, y 413-418); give it 12-16 px of air.

### Scores (component acceptance, 1-10)
Legibility 8, token discipline 9, depth and light 5, verb reads without narration 5 (end state only, and contradicted by FAILED rows), Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent visible 3 (unevidenced). Mean about 7.4 but the two blocking items cap the verdict at 6.

## FixSettle — round 2

Date: 2026-10-15. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 (960x540 lite, full size), reports/p7/snap/FixSettle_beat.jpg (standard f37-f43 anchor-1..+5, hero +1, hold), crop zoom of p100 title corner. Commit under review 334ad03.

Verdict: APPROVED, 7/10, no blocking issue. meta.json status and approval set to approved-critic.

### Round 1 blockers
1. Motion intent not evidenced: RESOLVED. The beat strip shows the table drop with the 100 px ring converging onto the rim, brackets closing, the green sweep crossing right to left at +5, and motes landing at standard and hero. Chip appears at anchor+0. The verb "converge and settle" reads.
2. Contradictory state: RESOLVED. In the strip, row T3 flips FAILED to OK and the settling highlight lands on the fixed row; at hold both T3 and T6 are OK, matching the chip "اتصلحت والعملية نجحت". a1 is still pre-settle (4 rows, FAILED visible), which is acceptable as the "before" baseline (CR logged).

### Non-blocking (fix at next re-baseline)
1. p50/p100, region x 604-614, y 180-205 (confirmed on zoom): the table-rect bracket frame (vertical line plus top-right L) runs through the "إ" of the title "إيصالات" and clips its hamza. Same in the strip. The outer rim is now padded correctly; the inner brackets are not. Fix: inset the inner frame from the card text box by at least 8 px, or drop the thin joining line and keep only corner L-brackets placed outside the text column.
2. Lite baselines (p50/p100) carry only brackets and chip; no ring, glow or motes, so a lite regression will not catch standard features. Add a standard-tier baseline at anchor+1 (f39) next re-baseline.
3. Depth and light still modest at standard: ring is a thin 1-2 px green line, motes are 1-2 px dots barely visible at 960 px; glow is soft. Consider a thicker leading edge on the ring and 2 px motes at 1080p.
4. In the strip +2/+3 the added row T6 is clipped by the inner frame while sliding in (OK 100 B T6 half cut off); acceptable as motion, but check no clipping of the chip/frame at hero.
5. p0 is still the empty gradient (sha 84797c...); card about 31 % of frame width, body text about 14 px at 960 (about 28 px at 1080p, legible).

### Scores (1-10)
Legibility 8, token discipline 9, depth and light 6, verb reads without narration 7, Arabic 8 (alef clipped by frame), no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent visible 7. Mean about 8.1, min 6, capped to 7 overall by the alef overlap and modest depth.

## FixSettle — round 1 (r3 re-review)

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p100 at full size plus a 8x crop of the title corner (x 560-640, y 150-240), reports/p7/snap/FixSettle_beat.jpg (standard f37-41,43; hero f39). Commit under review 7fddc26.

Verdict: APPROVED, 7.5/10, no blocking issue. meta.json status and approval set to approved-critic.

### Previous non-blocking items
1. Hamza clipping: RESOLVED. p100 crop shows the bracket frame and L-corner at x about 616, 4-5 px right of the "إ" of "إيصالات"; the outer rim is clear of the card. Nothing touches the copy.
2. Ring and motes visibility: IMPROVED. The 3 px ring with glow reads clearly at 960 px in the strip; motes (6-10 px) land visibly at +3/+4 and hero.
3. Verb reads: the card drops, ring converges, brackets close, sweep crosses, T3 flips FAILED to OK and the highlight lands on it; chip agrees with the end state.

### Blocking
None.

### Non-blocking (next re-baseline)
- Lite baselines p50/p100 (whole card, x 330-630, y 158-450) hold only brackets and chip; add a standard-tier a1 at f39 so ring, glow and motes are regression-covered.
- Depth and light: held state is still a quiet outlined card; stronger glow bloom on the ring at hero would help.
- Strip tiles crop the ring top (tile 2, y 0-20) and the chip bottom; frame the tiles larger in the next strip so no clipping is mistaken for a component defect. T6 half-cut at +2/+3 is the row sliding in, acceptable.
- p0 is the empty gradient (sha 84797c...).

### Scores (1-10)
Legibility 8, token discipline 9, depth and light 7, verb reads 8, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent visible 8. Mean about 8.5, min 7; overall 7.5 given modest depth and lite-only baselines.

## FixSettle — round 1 (r4 independent re-check)

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 at full size (960x540 lite), reports/p7/snap/FixSettle_beat.jpg (standard f37-41,43; hero f39). No code changed since 7fddc26; snap/perf not re-run.

Verdict: APPROVED, 7.5/10, no blocking issue. meta.json unchanged (approved-critic, 7.5).

Seen: a1 is the pre-settle card (T3/T6 FAILED, no rim). p50/p100 hold: ok L-brackets and rim clear of the title (the "إ" of "إيصالات" ends x about 611, bracket line x about 616), T3/T6 flipped to OK with green rows, chip "اتصلحت والعملية نجحت" agrees with the table. The beat strip shows the drop, 3 px ring converging, brackets closing, sweep right to left and motes landing. Tokens only, no bullets, no legacy frames, no invented numbers.

Blocking: none.

Non-blocking (unchanged): lite baselines (whole card, x 330-630, y 158-450) have no ring/glow/motes, so add a standard a1 at f39; depth and light are modest in the held state; strip tiles crop the ring top and chip bottom; p0 is the empty gradient; chip sits about 3-4 px below the card in p100 (x 375-580, y 383-415 gap), so give it a little more air.

Scores: Legibility 8, token discipline 9, depth/light 7, verb reads 8, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent 8. Mean 8.5, min 7; overall 7.5.

## ShatterToBlocks — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 at full size (960x540 lite), reports/p7/snap/ShatterToBlocks.jpg and ShatterToBlocks_beat.jpg (strip), commit eb29cee.

Verdict: APPROVED, 7.5/10, no blocking issue. meta.json set to approved-critic.

Seen: a1 is the intact receipts card (4 rows still arriving); the strip shows it dropping to 6 rows, the 16 cells cut along column/row gaps with cyan key-light rims on top and right edges, an outBack burst staggered from the impact point, and shadows growing with lift. p50/p100 hold 16 tilted glass blocks carrying real pixels: "إيصالات" and "NilePay" are whole in their own cell, no word is split, header/body text stays crisp, all cells sit inside title-safe. Arabic QA pass (OCR min 0.947). Tokens only, no bullets, no legacy frames, no invented numbers (EGP values come from the demo table).

Blocking: none.

Non-blocking (next re-baseline):
- p50/p100, whole group (x 312-660, y 105-437): rims have faded, so the settled state is flat dark glass; keep a faint rim and a slightly deeper shadow at hold for depth.
- p50/p100, top-left two cells (x 315-490, y 105-168): empty chunks read as dead tiles; either drop them from the seed or merge them into the title cell.
- Baselines cover pre-shatter and settled only. Add a burst-frame baseline at standard (about f39-41) so rims, shadows and rotation are regression-covered; p50 and p100 are near duplicates.
- Piece displacement is small (gaps of about 6-14 px at 960): the verb reads as "chunking" rather than a shatter; a larger hero-tier spread would sell it. The group is about 36% of frame width, so text is about 12 px at 960 (about 24 px at 1080p), acceptable but not generous.
- p0 is the empty gradient.

Scores (1-10): Legibility 8, token discipline 9, depth and light 7, verb reads 8, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent visible 8 (strip). Mean 8.5, min 7; overall 7.5.

## MorphTextToObject — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 at full size (960x540 lite), reports/p7/snap/MorphTextToObject.jpg and MorphTextToObject_beat.jpg (strip), commit 65f0331.

Verdict: APPROVED, 7.5/10, no blocking issue. meta.json set to approved-critic.

Seen: a1 is the Arabic word "البيانات" crisp and centred (about 160 px wide at 960). The strip shows the word dissolving right to left into cyan/white particles, a cloud in flight, the particles settling on the outline of a database cylinder, then the glass body filling in (gradient, brighter top face toward the upper right, cyan rim, floor glow). The reverse direction (last tile) reads as the object bursting back to particles. p50/p100 hold a lit glass cylinder with a levitation gap and floor glow; no bullets, no legacy frames, no numbers. Tokens only (cyan/violet on near-black). Arabic QA pass (OCR 1.0, no tofu).

Blocking: none.

Non-blocking (next re-baseline):
- p50/p100, region x 345-610, y 255-320 (behind the lower body): the dark text-plate shadow from the word stays as a faint rectangle after the morph. Fade it out with the word so the object sits on clean background.
- p50/p100, whole object (x 375-583, y 150-390): only about 22% of frame width at 960; at standard hold, scale the object up about 1.3x so the silhouette carries at thumbnail size.
- p50/p100, outline: the particle dots stay visible as a beaded edge; a continuous thin rim stroke under the dots would look more premium (the strip tile 6 shows it better than the baselines).
- Baselines cover pre-morph and settled only; add a standard-tier baseline at about 40% (particles in flight, as in strip tiles 3-4) so the morph is regression-covered. p50 and p100 are near duplicates.
- Strip tile 2: the half-dissolved word shows a blurred ghost copy to the left of the sharp part; fine in motion, but keep it under 3 frames.
- p0 is the empty gradient.

Scores (1-10): Legibility 8, token discipline 9, depth and light 7, verb reads 8 (text becomes thing), Arabic 9, no bullet look 9, no legacy 10, no unsourced numbers 10, motion intent visible 8 (strip). Mean 8.6, min 7; overall 7.5.

## PathDraw — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 at full size (960x540 lite), reports/p7/snap/PathDraw.jpg (4-tile strip), commit 30e7a5b.

Verdict: APPROVED, 7.0/10, no blocking issue. meta.json set to approved-critic.

Seen: p0 empty gradient. a1 (f11) shows only the Arabic title "مسار الدفع" (about 155 px wide, crisp, muted blue-grey); no conduit or source node is visible yet. p50 (f47) shows a lit cyan route with white core, a ring source node at the right (x 748-762, y 210-224) and a cyan arrowhead riding the pen tip, with the unfilled dark conduit remaining beyond it (x 200-250, y 315-327). p100 holds the finished route, arrowhead at the left end. The strip reads as "a route is traced from source to destination" without narration. No bullets, no legacy frames, no numbers. Palette is cyan on near-black only. Arabic QA pass (OCR exact 1/1).

Blocking: none.

Non-blocking (next re-baseline):
- p50/p100, route stroke (x 200-760, y 220-325): about 3 px wide at 960 (about 6 px at 1080p); thicken about 1.3x at lite/standard so the line carries at thumbnail size and the white core stays visible.
- p50/p100, arrowhead (x 200-272, y 298-335): oversized and flat-shaded against the thin line; scale it to about 70% and give it the same white core/halo as the stroke. In p50 it sits slightly off the line direction.
- p100, destination (x 195-215, y 315-330): there is no arrival marker; the route just ends at an arrow. A lit ring at arrival (the code mentions it) should be visible at hold; the source ring alone makes the route feel one-sided.
- Whole frame: route occupies about 58% of width and the lower 40% (y 330-540) is empty; fine as a component (it is placed by the spec) but the demo shows little depth. Add a faint trail/glow floor under the route for depth.
- a1 (f11): the conduit and source node are not yet visible, so the baseline does not cover "anchor frame" behaviour as the author note claims; add a baseline at anchor+1..2 frames. p50 and p100 are near duplicates; add a baseline at about 25% draw, standard tier, to cover sparks and comet.
- Title colour is dim grey (about 55% luminance) on the near-black; raise to the ink token for legibility at 960 px.
- Strip has only 4 tiles, one of them mid-draw; request an 8-tile strip at standard for the next round to judge the comet and sparks.

Scores (1-10): Legibility 7, token discipline 9, depth and light 6.5, verb reads 8, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent visible 6.5 (strip is thin). Mean 8.1, min 6.5; overall 7.0.

### ShatterToBlocks — round 1, independent re-check

Date: 2026-10-16. Reviewer: critic (did not author; re-read stills and beat strip rather than relying on the earlier approval). Scope: baselines a1/p50/p100 at 960x540 and reports/p7/snap/ShatterToBlocks_beat.jpg (9 tiles).

Verdict: APPROVED, 7.0/10, no blocking issue (earlier 7.5 lowered by 0.5 for depth/light and the weak "shatter" verb). meta.json: approved-critic, score 7.0.

Seen: a1 is the intact receipts card. The strip shows the card cutting into 16 cyan-rimmed cells along column/row gaps, a staggered outBack burst with 2D tilt, then a settle into dark glass blocks. Real pixels, no word split ("إيصالات", "NilePay", "الحالة", "المشغل" each whole), Arabic correct, tokens only, no bullets, no legacy, no invented numbers (EGP values from demo table).

Blocking: none.

Non-blocking (next re-baseline, ordered by impact):
1. p50/p100, whole group (x 312-660, y 105-437): displacement is 6-14 px, so it reads as tiles drifting apart, not a shatter; no debris, dust or light flash at the impact point. Hero tier: spread x2, add a few small fragments/motes and a brief impact flare.
2. p50/p100, same region: rims have faded, so the held state is flat dark glass with weak depth/light; keep a faint cyan rim plus deeper drop shadow at hold.
3. p50/p100, top-left two cells (x 315-490, y 105-168): empty chunks read as dead tiles; merge into the title cell or drop from the seed.
4. Strip tile 4 (NilePay cell vs header cell, x ~1405-1475): the two top-right blocks overlap mid-flight; add a small stagger or collision margin.
5. Group is about 36% of frame width (text about 24 px at 1080p): enlarge about 1.3x at standard.
6. Baselines: add a burst-frame baseline (f39-41, standard); p50/p100 are near duplicates; p0 is the empty gradient.

Scores (1-10): Legibility 8, token discipline 9, depth and light 6.5, verb reads 7, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent visible 8 (strip). Mean 8.4, min 6.5; overall 7.0. Score 6.5 items: p50/p100 whole group, fix per items 1-2 above.

### MorphTextToObject — round 1, independent re-check (after determinism fix)

Date: 2026-10-16. Reviewer: critic (did not author). Re-read a1/p50/p100 at 960x540 and the 7-tile beat strip; baseline PNG sha256 equal to meta.json (no visual change from the fix).

Verdict: APPROVED, 7.5/10, no blocking issue. Seen: whole Arabic word "البيانات" crisp (a1), dissolving right to left into cyan/white outline particles (strip tiles 2-3), settling into a lit glass cylinder (tile 4-6) with key-light top face, cyan rim and floor glow (p50/p100); tile 7 shows the reverse. No bullets, no legacy, no numbers; palette cyan/violet on near-black.

Blocking: none. Non-blocking, unchanged from round 1, ordered by impact:
1. p50/p100, x 345-610, y 255-320: faint dark text-plate rectangle persists behind the lower body; fade it with the word.
2. p50/p100, x 375-583, y 150-390: object about 22% of frame width; scale about 1.3x at hold.
3. p50/p100 outline: beaded dots only; add a continuous thin rim under them (the strip tile 6 rim is stronger).
4. Baselines lack a particle-flight frame (about 40%); p50 and p100 are near duplicates.

Scores: Legibility 8, token discipline 9, depth and light 7, verb reads 8, Arabic 9, no bullet look 9, no legacy 10, no unsourced numbers 10, motion intent 8. Mean 8.6, min 7; overall 7.5.

### Pulse — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 (960x540, lite) and reports/p7/snap/Pulse_beat.jpg (6 tiles, standard/hero) plus Pulse.jpg (4 tiles).

Verdict: APPROVED, 7.0/10, no blocking issue. meta.json: approved-critic.

Seen: the beat strip shows the target lit as an object: key-lit cyan rim with brighter top edge, a second trailing ring, outer swell outside the outline only, floor glow pool under the box and short sparks; copy ("66.67 %", "نسبة النجاح") stays crisp and uncovered, Arabic correct, tokens only (cyan on near-black), no bullets, no legacy, no invented numbers (demo counter values 64.12 / 66.67 from the fixture). The pulse reads as "this number matters now" without narration. Lite p50 shows only the rim, which is the intended minimum.

Blocking: none.

Non-blocking, ordered by impact:
1. p50 and strip tiles 1-6, rim at x 355-603, y 211-327 (p50): rim hugs the glyphs; the "6" and "%" touch the outline (x ~357 and ~603). Increase the rim pad around copy to at least 14 px at 1080p (RIM_PAD 10 is measured to leaf bounds, not glyph ink).
2. Baselines: a1 (f13) is the counter before any pulse (anchor is f38 = word 2 minus 2 lead); no baseline covers the anchor frame or standard tier. Add anchor+1 and anchor+9 at standard so RV1 and the rings/sparks are regression-protected; p100 (after the last pulse) duplicates a1 and can be dropped.
3. a1 and p100, x 318-640, y 255-335: a faint dark plate rectangle sits low and off-centre behind the label at idle; align it to the copy or fade it with the pulse.
4. Group is about 26% of frame width at 960 px (digits about 60 px high at 1080p equivalent is fine, label about 11 px at 960); enlarge label 1.2x.
5. Sparks in tile 6 cluster at the top-left corner of the rim only; spread around the perimeter.

Scores (1-10): Legibility 7.5, token discipline 9, depth and light 8, verb reads 8, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 9 (demo values), motion intent visible 7.5 (6-tile strip good; lite stills thin). Mean 8.4, min 7.5; overall 7.0.

### ShatterToBlocks — round 1, third read

Date: 2026-10-16. Reviewer: critic (did not author; did not rely on earlier approvals). Scope: baselines a1/p50/p100 at 960x540 (PNG sha256 equal to meta.json) and reports/p7/snap/ShatterToBlocks_beat.jpg (9 tiles).

Verdict: APPROVED, 7.0/10, no blocking issue. meta.json: approved-critic, score 7.0.

Seen: a1 is the intact receipts card; strip tiles 2-9 show 16 cyan-rimmed cells cut along row/column gaps, staggered outBack burst with tilt and growing shadows, then a settle to dark glass blocks (tile 9). "إيصالات", "NilePay", "الحالة", "المشغل", "الإيصال" each whole in their own cell, Arabic correct, tokens only, no bullets, no legacy, no invented numbers (EGP values from the demo fixture).

Blocking: none. Non-blocking, ordered by impact (unchanged from the re-check, still valid):
1. p50/p100, group x 312-660, y 105-437: displacement 6-14 px; reads as tiles drifting, not a shatter; no debris or impact flare. Hero tier: spread x2, add motes and a short flare at the anchor.
2. p50/p100, same region: rims gone at hold; keep a faint cyan rim and deeper drop shadow.
3. p50/p100, top-left two cells (x 315-490, y 105-168): empty tiles read as dead; merge or drop.
4. Strip tile 4, top-right (NilePay vs header cell): overlap mid-flight; add stagger or collision margin.
5. Group about 36% of frame width; enlarge about 1.3x at standard.
6. Baselines: add a burst frame (f39-41, standard); p50/p100 near duplicates.

Scores (1-10): Legibility 8, token discipline 9, depth and light 6.5, verb reads 7, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 10, motion intent 8 (strip). Mean 8.4, min 6.5; overall 7.0.

### Pulse — round 1, independent re-read

Date: 2026-10-16. Reviewer: critic (did not author; did not rely on the earlier approval). Scope: baselines p0/a1/p50/p100 (PNG sha256 equal to meta.json) at 960x540 and reports/p7/snap/Pulse_beat.jpg (6 tiles, standard). Snap, perf and Arabic QA not re-run.

Verdict: APPROVED, 7.0/10, no blocking issue. meta.json stays approved-critic.

Seen: the beat strip shows a key-lit cyan rim, a second ring trailing it, an outer swell, a floor glow pool and sparks, all around a crisp "66.67 %" and "نسبة النجاح". Palette is cyan on near-black only. No bullets, no legacy frames, demo counter values only. The verb "this matters now" reads without narration. Lite p50 shows only the thin rim, which is the intended minimum.

Blocking: none. Non-blocking, ordered by impact:
1. p50, rim x 355-603, y 211-327: the "6" at x ~357 and "%" at x ~603 touch the outline (RIM_PAD 10 is measured to leaf bounds, not glyph ink). Pad to at least 14 px at 1080p. The same collision shows in strip tiles 1, 4 and 6 at the right edge of "%".
2. Baselines: a1 (f13) is before any pulse and p100 duplicates it, so no baseline covers the anchor frame (f38) or standard tier. Add anchor+1 and anchor+9 at standard so rings and sparks are regression-protected.
3. a1 and p100, x 318-640, y 255-335: faint dark plate sits low and off-centre behind the label at idle. Align it to the copy or fade it with the pulse.
4. Strip tile 6: sparks cluster at the top-left and bottom edges. Spread them around the perimeter.
5. Look: a rectangle outline reads slightly as a UI highlight box. At hero tier let the swell bloom wider than the rim, with a wider falloff.

Scores (1-10): legibility 7.5, token discipline 9, depth and light 7.5, verb reads 8, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 9, motion intent 7.5. Mean 8.4, min 7.5; overall 7.0.

### Shake — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 (PNG sha256 equal to meta.json) at 960x540 and reports/p7/snap/Shake.jpg (4 tiles, standard). Snap, perf and Arabic QA not re-run (reports show pass, Arabic OCR 1.0, perf within budget).

Verdict: APPROVED, 7.0/10, no blocking issue. meta.json: approved-critic, score 7.0.

Seen: p50 (f47, one frame into the jolt) shows the receipts card thrown about 3 px left (about 6 px at 1080p) while a crit hairline rest outline with outer swell stays at the rest position, and the red-tinted FAILED rows (T3, T6) plus the lower-third "العملية فشل" (mid-reveal) stay still. p100 shows the card settled and the label complete as "العملية فشلت". Palette is crit red on near-black glass only, no bullets, no legacy frames, EGP values are demo fixture data from TableGrid, nothing invented.

Blocking: none. Non-blocking, ordered by impact:
1. Motion intent, p50, card x 330-628, y 126-413: a single still shows a roughly 3 px (half-scale) displacement, so the jolt is carried almost entirely by the rest outline. The decay over 400 ms is not demonstrable from the four tiles. Add a strip anchor..anchor+9 (f46-55) and make it a baseline.
2. Baselines: a1 (f11) is the intact card before any shake and p100 near-duplicates it, so the anchor frame (f46) is not regression-protected. Replace a1 with f46 and add f50 (mid decay).
3. p50, card edge x 330-345, y 126-413: the rest outline sits only about 4 px outside the plate, so with a 3-6 px throw it reads as a doubled edge rather than a thrown card. At amplitude <= 12 px consider a wider outline pad or a faint ghost of the rest plate.
4. p50, label x 395-580, y 415-445: the label is clipped mid-reveal ("فشل" without the final taa); that is KineticWord timing, not Shake, but pair the demo word to land the label complete at the anchor.
5. Whole-frame shake (no `to`) has no baseline; add a demo so its title-safe clamp is covered.

Scores (1-10): legibility 7.5, token discipline 9, depth and light 7, verb reads 7, Arabic 9, no bullet look 8, no legacy 10, no unsourced numbers 9, motion intent 6.5 (no strip). Mean 8.1, min 6.5; overall 7.0.

### Spin — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Scope: baselines p0/a1/p50/p100 at 960x540 (lite) and reports/p7/snap/Spin.jpg (same 4 tiles). No strip exists. Snap, perf and Arabic QA not re-run (reports show pass).

Verdict: APPROVED, 7.0/10, no blocking issue. meta.json: approved-critic, score 7.0.

Seen: p50 (f47) shows the "400 EGP / الإجمالي الناجح" card turned about 75-80 degrees about y: a narrow glass slab (x 452-506, y 203-336) with a cyan-teal rim, a darker face, and the copy foreshortened but not mirrored, so the Arabic is not reversed. p100 shows the face restored and crisp (digits, EGP, Arabic label). Palette is cyan/teal on near-black only. No bullets, no legacy frames, the numbers are demo counter values (385 then 400) from NumberCounter, nothing invented. The verb "turn the card to reveal the new face" reads without narration.

Blocking: none. Non-blocking, ordered by impact:
1. Motion intent: one mid-turn still (p50) cannot show the sweep, the glint or the face darkening. Add a strip f46-f95 (about every 5 frames) as evidence and baseline.
2. p50, region x 360-600, y 255-335: the target's dark backing plate stays at full width behind the narrow card, so it reads as a leftover ghost rectangle and the card seems to float in front of it. Turn or fade the plate with the face, or hide it during the sweep.
3. p50, card x 452-506, y 203-336: at about 75 degrees the copy is about 50 px wide at 960 px (about 100 px at 1080p) and barely legible. Acceptable for a transit frame, but the lit edge slab at edge-on and the glint are not distinguishable. Capture f at the 0.5 turn midpoint (edge-on) to prove the slab.
4. Baselines: a1 (f13) is the idle card before the turn and p100 duplicates it in layout, so the anchor frame is not regression-protected, and the floor pool and sparks (standard 10, hero 18) are not covered, since lite omits them. Replace a1 with anchor+1 and add standard-tier anchor+9.
5. Depth: at lite the turn has no cast shadow or floor reflection, so the card looks pasted over the background. The standard pool should be shown in evidence before the next round.

Scores (1-10): legibility 7, token discipline 9, depth and light 6.5, verb reads 7.5, Arabic 9, no bullet look 8.5, no legacy 10, no unsourced numbers 9, motion intent 6.5 (no strip). Mean 8.0, min 6.5; overall 7.0.
