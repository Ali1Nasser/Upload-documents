# P7 review: group typeui (critic)

## KineticPhrase — round 1

Verdict: **approved-critic**, score **7/10** (no blocking issue). Evidence: baselines p0, a1, p50, p100 at 960x540 (read at full size, plus a 6x levels-boosted copy of p100) and reports/p7/snap/KineticPhrase.jpg (4 settled frames; no mid-wipe frames exist).

Strengths
- Legible: 92 px at 1080p, ink on near-black, cyan term colour only on the term and the signal word (token discipline holds).
- Arabic is correct: shadda over waw in "متحوّلة", "الـ" + Latin isolate with tatweel joins and orders right in RTL; whole words only, no per-letter animation.
- Layout is computed once: line 1 does not move between a1, p50 and p100 as words arrive (hidden words keep their place); two lines stack with clear tashkeel clearance; rows are balanced enough (about 420 vs 520 px at half scale).
- Copy is a faithful trim of CH-10 s:S1:ar-natural:0145 ("وconstraints، وهي قواعد الشغل وهي متحوّلة لحيطان"); no numbers, no legacy frames, not a bullet slide.

Non-blocking issues (fix next round, ordered by impact)
1. p50 and p100, word w3 "متحوّلة" (line 2, centre): the `stressed` emphasis is not visible. It is the same white as unstressed words, and the extra glow (+0.3) does not read at 960 px. The stressed word should carry a visible lift (glow radius or a brief scale/weight pulse on the onset).
2. p100, region under the block (x 165-790, y 255-350 at 960x540; visible without boosting as a faint shelf edge at x about 790, y 300-345): a hard-edged darker plate or shadow rectangle sits behind the text. It reads as a card edge rather than light. Soften the mask (feather at least 40 px) or replace it with a real glow pool behind the block.
3. All stills: depth and light are minimal for the AI-Unpacked standard (a flat vignette plus text-shadow halo; no rim light, bokeh or parallax). Acceptable for a type component, but the host shot must add depth layers. The "walls" metaphor of the copy is not carried by the component, so the scene-director must pair it with a wall object.
4. Docs mismatch: SIZE.kinetic = 92 px, but 04 §3.2 lists kinetic phrase 56-80 px (92 is in the title/impact band). The author's note says it is inside the range; it is not. Either use size 'sub' (56) or 'body' for real phrases, or file an ADR/amend request to align the token and the table. Spec lint must treat 92 px with 2 lines as intentional.
5. a1 (frame 13): the first word sits alone at the right at x about 500-775 with 255 px empty on the left; expected for an RTL start-aligned phrase, but with `align: start` in a centre slot the block reads off-centre. Prefer `align: center` for 2-line demos.
6. Motion intent is unverified by stills: the strip holds settled frames only. Request a 6-frame strip at anchor-3, -1, 0, +2, +4, +6 for word 4 (clip-path wipe, scale 0.92 to 1, blur 6 to 0) in round 2 or at the G8 pilot.

Score breakdown: legibility 8, palette/tokens 8, depth and light 5, visual verb without narration 7, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 6 (unverified), layout stability 9.

## TermChip — round 1

Verdict: **approved-critic**, score **7/10** (no blocking issue). Evidence: baselines p0, a1, p50, p100 at 960x540 read at full size, a 4x crop of each chip, and a 6x levels-boosted copy of p100. No strip or snap exists for TermChip under reports/p7/ (only settled frames plus one mid-wipe frame, p50 SLO). Only kinds `term` (idempotency) and `acronym` (SLO) are baselined.

Strengths
- Legible: term mono about 32 px and gloss 28 px at 1080p; cyan on near-black; the green `ok` token used only for the acronym; no off-palette colour (token discipline holds).
- Arabic gloss is correct, whole words, RTL right edge aligned under the chip, no per-letter animation; Latin term sits in an LTR isolate.
- Light: the upper-right rim light reads on the pill border (p100, idempotency chip, top-right arc brighter than lower-left); an emissive pool sits behind the chip; the leading dot gives `term` its visual verb. p50 SLO shows the rim leading the wipe with a clean clip.
- Not a bullet slide, no legacy frames, no numbers. Frozen schema respected.

Non-blocking issues (fix next round, ordered by impact)
1. p50 and p100, both chips, region x 600-915 / y 240-318 (idempotency) and x 30-305 / y 240-318 (SLO): a hard-edged darker rectangle sits behind the chip and gloss, with a vertical edge at x about 305 and x about 605 (visible unboosted, obvious at 6x). This is the same defect as KineticPhrase issue 2: it reads as a card edge, not light. Find what clips the pool or shadow (the glow div extends -35% beyond the wrapper; the 0 0.3fs 0.7fs void shadow plus the backdrop blur are the suspects) and feather it, or move the shadow to a filter drop-shadow so it follows the pill.
2. Kinds `code` and `metric` have no baseline, no still and no demo use. The note says four kinds are finished; two are unverified. Add them to the demo (or a second baseline set) and request approval in round 2. Note `code` has ink text on darker stock and `metric` an underline at 12-88% width; both need a still.
3. p100, gloss: `ink2` at 28 px reads dim against the pool; at 960 px the gloss is the weakest element. Lift to ink at about 0.85 or give it the pill's halo, so it holds on bright host shots.
4. Motion intent is only partly verifiable: the +-1.5 px float is about 1.5 px at 1080p, under what a viewer perceives, so it adds determinism risk and no read. Either raise to about 4 px, or drop it. A 6-frame strip at anchor-2, 0, +2, +4, +8, +16 (rim, wipe, gloss rise) is requested for the G8 pilot.
5. p50: chip and glow of SLO appear while its gloss is absent; the pool is already at near full strength for a half-revealed pill. Ramp the pool with the wipe so it lands with the term.

Score breakdown: legibility 8, palette/tokens 8, depth and light 6 (hard plate, pool only), visual verb without narration 7, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 6 (unverified), polish 6.

## TermChip - round 2 (critic)

Verdict: **approved-critic**, score **8/10** (no blocking issue). Evidence: baselines p0, a1, p50, p100 at 960x540 read at full size, a 4x crop of the idempotency chip, a 6x levels-boosted p100, and reports/p7/snap/TermChip.jpg. Commit 17cd37f.

Round-1 items
1. Hard plate: closed. Unboosted, no card edge is visible at p50/p100; the pool is a soft ellipse. At 6x boost only a faint shelf edge remains (x 640-920, y about 232 above idempotency; same band left of SLO). Not visible at normal gain.
2. Code and metric kinds: closed. GROUP BY department (code, lighter mono on darker stock, cool border) and p95 (metric, amber with underline) are in p50/p100 with glosses; all four kinds are distinct without narration.
3. Gloss contrast: closed. Gloss reads clearly at 960 px.
4. Float: closed. Visible 3-4 px drop between p50 and p100 (chips settle), deterministic.
5. Pool ramp: closed. The pool lands with the wipe in a1 (idempotency only, soft glow, no orphan SLO pool).

Open, non-blocking
- Motion intent still unverified by a strip: request 6 frames at anchor-2, 0, +2, +4, +8, +16 (rim, wipe, gloss rise) at the G8 pilot.
- Chips are small (largest about 210 px wide at 960 px); the host shot must supply depth, camera and a concrete object. TermChip alone is a label, not a scene.
- Faint residual shelf at 6x gain (above): feather the pool a further 20 percent if it ever shows on bright plates.

Score breakdown: legibility 8, palette/tokens 9, depth and light 7, visual verb without narration 8, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 7 (unverified), polish 8.

## EquationLine - round 1 (critic)

Verdict: **approved-critic**, score **7/10** (no blocking issue). Evidence: baselines p0, a1, p50, p100 at 960x540 read at full size, a 4x crop of the p100 slab, a 6x levels-boosted p100, reports/p7/snap/EquationLine.jpg, qa_arabic_EquationLine.json (pass), demo in studio/src/demos/type-ui.tsx. Commit under review 18e3c1f. No strip exists; stills are settled frames only.

Strengths
- Legible: operands about 40 px and result about 56 px at 1080p; ink-on-slab and signal cyan on near-black, no off-palette colour. Result at 1.25x clearly dominates (p100, x 440-690 / y 240-295).
- Depth and light: rim-lit slab with a bright top edge toward the upper right, an emissive pool under the result, an emissive underline. A real object, not a flat card.
- Visual verb reads without narration: 4, then / 6, then = 66.67 %, with the result flaring. Not a bullet slide; no legacy frame.
- Numbers sourced: 4 / 6 = 66.67 % tagged d:5.2:7 (arithmetic checks, 66.666... rounds to 66.67). One LTR isolate, no Arabic strings, Arabic QA pass (5 strings, 0 failed).

Non-blocking issues (ordered by impact)
1. a1 and p50, slab region x 246-712 / y 216-324: the slab is already at nearly full final width while holding "4" (a1) or "4 / 6" (p50), so the right 40-60 percent is an empty glass panel. It reads as a placeholder box before the result lands. Grow the slab with the terms (width follows the last landed term, with the final width reserved only for centring), or fade the unreached part of the slab.
2. Motion intent unverified: the impact flash and chromatic aberration at the result anchor are not in any still (the baselines are at frames 0, 13, 39, 79; the result anchor is about frame 42). At 4x crop the aberration on numerals is a barely visible cyan fringe. Request a 6-frame strip at result anchor-2, 0, +1, +3, +6, +12 for the G8 pilot, and an extra baseline at anchor+2.
3. p100, region x 400-440 / y 262-290: the operator "=" is ink2 grey, dim next to the white operands. The U+2212 minus is not exercised by any baseline or demo (the demo uses "/" and "="). Add a minus variant (for example 6 - 2 = 4) so the claimed glyph is verified, and lift operator contrast slightly.
4. 6x boost of p100, region x 230-300 / y 250-350 and below the slab: the pool and shadow have a faint hard-edged lobe left of the slab (same shelf as TermChip round 2). Invisible at normal gain; feather if it shows on bright plates.
5. The slab is 940 px wide at 1080p in a 1920 frame; the host shot must carry camera and a concrete object (the demo's push_in 0.3 is not visible in the stills). The component is a label, not a scene.

Score breakdown: legibility 8, palette/tokens 8, depth and light 7, visual verb without narration 8, Arabic 8 (no Arabic content; isolate correct), not a slide 8, no legacy/unsourced 10, motion intent 6 (unverified), polish 6 (empty slab in a1/p50).

## LowerThird - round 1 (critic)

Verdict: **approved-critic**, score **7/10** (no blocking issue). Evidence: baselines p0, a1, p50, p100 at 960x540 read at full size, a 4x crop and a 6x levels-boosted p100, reports/p7/snap/LowerThird.jpg, qa_arabic_LowerThird.json (pass), demo in studio/src/demos/type-ui.tsx. Commit under review c525f27. No strip exists; stills are settled frames.

Strengths
- Legible: title about 56 px bold ink and subtitle about 40 px ink2 on a dark glass plate (p100, x 580-856 / y 400-502 at 960 px). Shadda in بيمثّل and the tatweel + Latin "الـ grain" title render correctly, order right-to-left correct, badge sits on the start side.
- Light and depth: cyan rim along the upper-right edge, emissive accent bar on the start edge, glowing toggle badge, thin foot sweep. It reads as a lit object, not a flat card.
- Palette: only signal cyan, ink, ink2, panel, ground; kind glyph is drawn SVG, no copy. No legacy frames, no numbers.
- Visual verb: toggle badge in cyan = a term being defined; subtitle supplies the gloss. Not a bullet slide.

Non-blocking issues (ordered by impact)
1. All stills (a1 f13, p50, p100), whole plate: a1 is already fully open, so the bar growth, RTL plate wipe, 2-frame subtitle lag and foot sweep are not visible anywhere. Request a strip at anchor-2, 0, +2, +4, +8, +16 for the G8 pilot, plus a baseline at anchor+2.
2. Baselines cover kind=term only. The source (document), speaker (waveform) and location (pin) glyphs are not in any still; add one baseline or demo frame per kind.
3. p100 at 6x boost, region x 440-580 / y 395-440: the floor pool shows a shelf edge to the left of the plate; at normal gain the pool (alpha 0.16) is nearly invisible, so it contributes little depth. Feather the left edge and lift peak to about 0.22.
4. p100, plate overall: about 540 px wide at 1080p, an anchored label. The host shot must supply the camera, depth and a concrete object; LowerThird alone is not a scene.
5. p100, foot sweep, region x 580-840 / y 497-500: a 2 px line that is fully settled and barely perceptible at 960 px; optional.

Score breakdown: legibility 8, palette/tokens 8, depth and light 7, visual verb without narration 7, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 5 (unverified), polish 8.

## TermChip — round 1 (independent re-read, 2026-10-16)

Verdict: **approved-critic**, score **7/10**, no blocking issue. Evidence: p0, a1, p50, p100 at full size (960x540) and reports/p7/snap/TermChip.jpg. Supersedes the earlier 8/10 as the calibrated score; status unchanged.

Checks: legible at 1080p (term mono and gloss readable at 960 px); palette limited to cyan/green/amber/cool-ink tokens; Arabic glosses whole words, correct RTL, no per-letter animation; no bullet-list look, no legacy frames, no numbers (p95 is a term, not a figure).

Blocking issues: none.

Non-blocking
1. p50/p100, all chips (largest idempotency x 690-905 / y 242-298): chips are small and the pool is faint; depth and light score 6-7. The host shot must give camera and a concrete object.
2. p0 to p50: motion intent (wipe, rim, 4 px settle) cannot be proven from stills. Strip at anchor-2, 0, +2, +4, +8, +16 requested at G8.
3. a1, region right of idempotency (x 860-910 / y 240-300): faint shelf visible at high gain only; feather if it shows on bright plates.

Score breakdown: legibility 8, palette/tokens 9, depth and light 6, visual verb 8, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 6 (unverified), polish 8.

## ChapterCard — round 1 (critic, 2026-10-16)

Verdict: **approved-critic**, score **7/10**, no blocking issue. Evidence: p0, a1, p50, p100 at full size (960x540) and reports/p7/snap/ChapterCard.jpg. Text is the CH-10 EDL title (corpus/edl/master_edl.v1.json), so nothing is invented.

Checks
- Legible at 1080p: Arabic title (~56 px bold ink), mono CH-10 tag, 40 px ink2 subtitle and SQL rail label are all readable at 960 px.
- Palette: signal cyan, ink, ink2 and ground only; no legacy frames, no unsourced numbers (ghost "10" and CH-10 come from props.index/chapter).
- Arabic: whole-word title, correct RTL order (ليه, Database, ؟, dash, الـ, Relational Model); Latin runs isolated; tatweel joins; no per-letter animation. The rail grows from the start (right) edge with 13 segments, matching the 13 trunk acts in the EDL; the lit one is the 4th from the start = SQL. Correct.
- Not a bullet slide: tag over hairline, ghost outline numeral, act rail. It reads as a title card without narration.

Blocking issues: none.

Non-blocking (ordered by impact)
1. a1/p50/p100, whole card: motion intent (hairline draw, RTL title wipe, rail growth, key haze drift) cannot be proven from stills; a1 (f12) already shows the title complete. Strip at f0, 4, 8, 12, 24, 48 requested for G8, plus a baseline at an earlier frame (about f6) so the wipe is regression-guarded.
2. p50/p100, haze and floor pool (x 380-760 / y 300-420): both are faint at normal gain; depth and light score 6-7. Lift the floor pool a step or let the host shot supply light.
3. p50/p100, ghost numeral "10" (x 85-435 / y 145-390): outline is very low contrast and collides with the title left end and rail segments (x 115-330 / y 230-320); clutter risk on bright plates. Dim it where it crosses text, or shift it up.
4. p100, composition: block is flush right with a dead left third (x 0-110); acceptable for RTL, but only the ghost numeral balances it.
5. Baselines cover a single title; add a short-title and a 48-character worst-case baseline to prove the auto-fit.

Score breakdown: legibility 8, palette/tokens 9, depth and light 6, visual verb 7, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 5 (unverified), polish 8. Mean of the main axes lands at 7.

## DeepDiveCard — round 1 (critic, 2026-10-16)

Verdict: **approved-critic**, score **7/10**, no blocking issue. Evidence: p0, a1, p50, p100 at full size (960x540), title strip crops at 2x, reports/p7/snap/DeepDiveCard.jpg. Violet is the 04 §33 Deep-Dive accent; no other hue, so palette is clean. Chips (kNN, chunk, embedding) and P23 are demo props, not numbers claimed as fact.

Checks
- Legible at 1080p: DEEP DIVE tag, bold Arabic title (~28 px at 960, 56 px at 1080), ink2 English subtitle and mono chips all readable. CH-33 and PREREQ labels are the smallest text (about 14 / 12 px at 960).
- Visual verb: lit node on a ticked trunk rail, violet branch merging into the slab's top rim at x~705, dim dashed return arc rising from the slab at x~240 back to the rail node at x~175. It reads as "step off the trunk, dive, come back" without narration.
- Arabic: the title is one whole string; visual order is correct RTL (Embeddings, والـ, RAG, والـ, Agents then the colon to its left, then المعنى كموضع). Latin runs isolated, tatweel joins intact, no per-letter animation, tight single-line fit.
- Not a bullet slide: it is a rim-lit glass slab with a rail, branch and arc. No legacy frames. p0 is pure ground haze (correct, 0 %).

Blocking issues: none.

Non-blocking (ordered by impact)
1. a1/p50/p100, motion intent: the branch draw, RTL title wipe, ripple rings, rim sweep and arc rise cannot be shown by stills. Ripple rings are not visible in any baseline. Strip at anchor-2, 0, +2, +4, +8, +16 requested at G8, plus a baseline at about f4 and one at about f20 so the wipe and arc are regression-guarded.
2. p50/p100, haze and floor pool (haze x 560-900 / y 20-200; pool x 250-700 / y 410-500): both are faint at normal gain; depth and light score 6-7. Lift the pool one step or let the host shot supply light.
3. p50/p100, ghost numeral P23 (x 140-360 / y 255-355): outline is very faint and collides with the Arabic title's left end ("كموضع", x 155-250). Dim it where it crosses text or shift it down-left.
4. p100, CH-33 label (x 700-750 / y 128-146) and PREREQ (x 748-802 / y 358-370): small and low contrast against the slab; raise ink2 one step or scale 1.15x.
5. a1, slab bottom rim (x 135-205 / y 393-400): a brighter partial segment shows while the rim is still sweeping; acceptable mid-motion but confirm on the strip that it is not a stuck shelf.
6. Baselines cover a single title; add a 48-character worst-case baseline to prove auto-fit.

Score breakdown: legibility 8, palette/tokens 9, depth and light 6, visual verb 8, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 6 (unverified), polish 8. Mean of the main axes lands at 7.

## PredictionTimer — round 1 (critic, 2026-10-16)

Verdict: **approved-critic**, score **7/10**, no blocking issue. Evidence: p0, a1, p50, p100 at full size (960x540) and reports/p7/snap/PredictionTimer.jpg. Question and options are demo props (CH-11 grain question); no digits are drawn, so there are no unsourced numbers.

Checks
- Legible at 1080p: PREDICT mono tag (cyan), 56 px bold Arabic question and 40 px option text are readable at 960 px. Dial (R = 2.0 x 56 = 112 px, about 300 px with ticks at 1080p) now reads as a clock at a glance.
- Visual verb: the 60-tick ring and cyan arc drain clockwise with a white comet head (p50: exactly half gone, head at the bottom, `?` hub). It reads "think before the answer" without narration. The recede at p100 hands the frame over cleanly.
- Arabic: whole-line question with the colon at the left end, correct RTL order; option "لكل customer في اليوم" shows لكل at the right, Latin run isolated; no per-letter animation. dc qa arabic: pass (OCR 5/5).
- Not a bullet slide: tag, glass dial and raised rim-lit cards on a floor hairline. No legacy frames; palette is signal, warn, ink, panel, ground only.

Blocking issues: none.

Non-blocking (ordered by impact)
1. All stills, motion intent: scan pulse (one card lit at a time; only the middle card is lit at p50), warn warm-up (last quarter), burst plus shockwave and the 80 ms flash are not shown in any baseline. p100 (f119) is already 20 frames past the reveal and shows only the recede. Strip at anchor-2, 0, +2, +4, +8 plus f90 (warn) requested for G8, and add baselines at about f90 and f99 so warn and burst are regression-guarded.
2. p50, dial interior (x 425-535 / y 245-350): the time-left sector (fillOpacity 0.07) is almost invisible, and the dashed far-plane orbit (x 400-560 / y 220-375) is barely visible; depth reads as flat. Raise the sector to about 0.12 and the orbit stroke one step.
3. p50, floor pool and hairline (x 200-750 / y 380-440): faint at normal gain; depth and light 6-7. Lift the pool one step or let the host shot supply light.
4. p50, composition: the block occupies y 125-430 and leaves a dead band below the cards (y 430-540); the gap between the tick ring and the cards (y 355-375) is the tightest spacing in the block. Add about 0.15 x sub to the dial-to-options margin, or let slot 'full' centre on the dial.
5. p50, option cards (x 210-745 / y 375-420): at 40 px they are the smallest read in the frame; acceptable, but the lit card differs from the others only by a thin border. Raise the scan border a step.
6. Baselines cover a single 2-line question with 3 options; add a 3-line worst case (auto-fit shrink) and a 2-option, short-question baseline.

Score breakdown: legibility 8, palette/tokens 9, depth and light 6, visual verb 8, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 6 (unverified), polish 7. Mean of the main axes lands at 7.

## CalloutArrow — round 1 (critic, 2026-10-16)

Verdict: **approved-critic**, score **7/10**, no blocking issue. Evidence: p0, a1, p50, p100 at full size (960x540, scale 0.5) and reports/p7/snap/CalloutArrow.jpg. Labels and "4 / 6 = 66.67 %" are demo props (4/6 = 66.67 is arithmetically correct; no invented figures).

Checks
- Legible at 1080p: pill labels are about 20 px at half scale (about 40 px at 1080p, SIZE.body), bright ink on a dark glass pill; readable.
- Visual verb: pill, ribbon with origin node, notched head and four corner brackets around the target read as "look here" without narration. Two colours (signal green, cyan) tie each callout to its target.
- Arabic: "العمليات الناجحة" and "نسبة النجاح" shaped and ordered correctly, whole-string, no per-letter animation. Dc qa arabic reported pass by the author.
- Not a bullet slide; no legacy frames; palette is signal/cyan/ink/panel/ground only. 2D only, so hero equals standard (accepted).

Blocking issues: none.

Non-blocking (ordered by impact)
1. All stills, motion intent: the bracket close-in then breathe, ribbon draw with comet, and landing ring cannot be shown by stills. Strip at anchor-2, 0, +2, +4, +8, +16 requested at G8; add baselines near f4 and f20 so the draw and bracket close-in are regression-guarded.
2. a1, landing ring and arrowhead (x 265-305 / y 215-265): the ring, arrowhead and the top-left bracket of the "4" pile up at the same spot and the ring reads as a stray circle. Either let the ring replace the arrowhead tip or hold the brackets back until the ring fades.
3. p100, bracket bottoms under 66.67 (x 435-695 / y 305-318): the lower corners sit on the underline and merge with it. Inset the bracket frame about 6 px (half-scale 3 px) at the bottom or put the box outside the underline.
4. p50/p100, depth and light (pill rims x 245-405 / y 140-178 and x 465-585 / y 375-410): rim and glow are faint at normal gain; the pill looks only slightly raised from the ground. Lift the rim gradient one step and add a small contact glow under the pill; score 6-7.
5. p100, green brackets on "4" (x 262-305 / y 235-312): thin and lower contrast than the cyan set; raise the signal stroke one step.
6. Baselines cover two short labels in LTR host layout; add a long-label (wrap or auto-fit) baseline and one with the label to the right of the target, to prove side placement.

Score breakdown: legibility 8, palette/tokens 9, depth and light 6, visual verb 8, Arabic 9, not a slide 8, no legacy/unsourced 10, motion intent 6 (unverified), polish 7. Mean of the main axes lands at 7.
