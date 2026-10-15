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
