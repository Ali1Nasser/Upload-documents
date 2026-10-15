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
