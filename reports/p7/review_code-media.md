# P7 code-media review (critic)

## Terminal — round 1

Reviewed: studio/test/baselines/Terminal/{p0,a1,p50,p100}.png (960x540 lite baselines, read at full size; p100 also zoomed 3x), Terminal.tsx, reports/p7/snap/Terminal.json. Author: motion-engineer (not the critic).

Score: 7.5 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 8 | About 30 px mono at 1080p, ink2 on near-black glass; prompt and flags in ink3 stay readable. |
| Token / palette discipline | 8.5 | Only ink, ink2, ink3, signal and crit; no stray hues. |
| Depth and light | 6.5 | Glass plate with a faint signal rim glow and the Atmos haze behind it. Quiet; no light on the active line beyond the 7 % band. |
| Visual verb without narration | 7 | A command typing, then rows cascading, then a red failure row reads as "build ran; the second one was slow". The cache hit vs miss contrast depends on reading words. |
| Arabic | 8.5 | "# الطبقة الوحيدة اللي اتغيرت" appears whole, RTL run shaped and joined, "#" correctly on the left in the LTR block. No per-letter animation. |
| No bullet-list look | 8 | Reads as a terminal, not a list. |
| No legacy frames / no unsourced numbers | 9 | 5 s and 57 s map to d:6.7:1 and d:6.7:2 in corpus/graph/nodes.jsonl (CH-34). |
| Motion intent | 7 | The a1 caret (typed "nilepay-" with a signal block on the baseline) shows per-char typing; the p50 rim shows the active row. No strip was supplied, so row cascade and scroll are inferred from code. |

Non-blocking issues, ordered by impact (for the CH-34 spec and a later polish pass):
1. p50, rows 2 and 3 ("=> CACHED [2/4] ...", "=> CACHED [3/4] ..."): the cache-hit keyword has the same tint as the rest of the row. The mechanism (reused layers vs a rebuilt layer) is the story, so tint CACHED with signal or ok in the tokenizer, and let the miss row carry the contrast. Suggested: a `hl` token class for CACHED / miss.
2. p50 and p100, rows "build finished in 5 s" and "... in 57 s": the two headline figures are the same size and weight as the log text. Bold them, or let the NumberCounter reference component pair-up the 5 s / 57 s beside the plate. Without that the lesson depends on the narration.
3. a1 (frame 13), plate region 200-757 x 143-397: one typed row in a twelve-row plate, so over two thirds of the plate is empty glass early in the shot. Acceptable for a typing beat, but consider sizing the plate to the rows born so far, or a gentle fill-in, to avoid an "empty panel" read on short holds.
4. p100, error row 8: "cache miss at pip install: build finished in 57 s" is a synthetic message (a real docker build does not print this), and "order-wrong" is a contrived branch name. Fine for a metaphor, but the spec should mark the row as an illustration, and keep the figure tied to d:6.7:2 only.
5. Request: a motion strip (frames 0-149 every 6 f) under reports/p7/ so scroll and cascade can be judged by eye rather than from code.

What worked: the caret fix is verified (a1: caret sits on the text baseline, height matches the glyphs); the error band is distinct without a new colour; frame 0 is correctly empty until the first anchor.

## Terminal — round 1 (re-review of polish r2)

Reviewed: studio/test/baselines/Terminal/{p0,a1,p50,p100}.png at full size (960x540 lite), after the author applied r1 #1 and #2 (CACHED in signal; spoken figures one ink step brighter via the additive `Tok.c` field in _code-media/kit.tsx). Author: motion-engineer (not the critic).

Score: 7.8 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 8 | Mono about 30 px at 1080p, ink2 on dark glass; "5 s" and "57 s" now read as the brightest tokens on their rows. |
| Token / palette discipline | 8.5 | ink / ink2 / ink3 / signal / crit only. The new `c` field is additive and uses palette tokens. |
| Depth and light | 6.5 | Glass plate, faint rim glow, haze behind, 7 % active-row band. Still quiet; nothing is lit by the action. |
| Visual verb without narration | 8 | p50: two cyan CACHED rows then an uncoloured rebuilt row reads as "reused layers vs rebuilt". p100: red miss row closes the contrast. Improved from 7. |
| Arabic | 8.5 | p50/p100 comment is whole, joined, "#" on the left in the LTR run; no per-letter animation. |
| No bullet-list look | 8 | Reads as a terminal. |
| No legacy frames / unsourced numbers | 9 | 5 s -> d:6.7:1, 57 s -> d:6.7:2 (CH-34). |
| Motion intent | 7 | a1 shows per-char typing with a baseline-aligned caret; cascade and scroll still inferred from code (no strip). |

Blocking: none.

Non-blocking, by impact:
1. p100, row 8 ("cache miss at pip install: build finished in 57 s", region x 205-660, y 340-362): "57 s" is only one step brighter inside a red row, so the headline figure gains little emphasis. Pair it with NumberCounter beside the plate, or make it ink-bright and bold on the crit band.
2. p50, plate bottom (y 320-395): about 20 % empty glass; p100 fills it. Acceptable for a short hold; in the CH-34 spec keep the cut to p50 under about 1.5 s or size the plate to the rows born.
3. Depth and light: add a soft signal glow that follows the active row, or a camera drift (spec-level `camera` push of 2-3 %), so the shot is not static glass.
4. The miss message is synthetic (real docker build does not print it). Mark the row as an illustration in the spec and tie the figure to d:6.7:2 only.
5. Still wanted: a motion strip (frames 0-149 every 6 f) under reports/p7/ for the row cascade and scroll.

## CodeTrace — round 1

Reviewed: studio/test/baselines/CodeTrace/{p0,a1,p50,p100}.png at full size (960x540 lite) and reports/p7/snap/CodeTrace.jpg (the same four frames; no motion strip exists). Author: motion-engineer (not the critic). Demo: CH-27 receipts, amounts 120/80/200/50/150/100 from d:5.2:1..6 (T3 200 and T6 100 FAILED); 120+80+50+150 = 400 is correct and matches d:5.2.

Score: 7.3 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 7.5 | Mono about 24 px on the 960 render, so about 28 px at 1080p; active rows are ink on glass. Inactive rows (ink3 at 0.45) and the Arabic comment on row 7 are low contrast. |
| Token / palette discipline | 8.5 | ink / ink2 / ink3 / signal only; no stray colours. |
| Depth and light | 6.5 | Glass plate, rim glow, signal band with edge bar, pip glow, haze behind. Still a small, quiet plate (about 44 % of frame width) on a mostly empty field. |
| Visual verb without narration | 7 | p50: the lit band on `for ... enumerate` and `if ... not in failed` with the pips and the footer note reads as "the loop checks each receipt". Nothing shows a running state (i, total), so "trace" is a highlighter, not a computation. |
| Arabic | 8.5 | Footers "نمر على كل عملية ناجحة" and "المجموع الناجح أربعمية جنيه" are whole phrases, joined, idiomatic Egyptian. The row-7 comment keeps "#" on the left in the LTR run. No per-letter animation. |
| No bullet-list look | 8 | Reads as an editor, not a list. |
| No legacy frames / unsourced numbers | 9 | All six amounts map to d:5.2:1..6, total 400 derives from them. |
| Motion intent | 6.5 | Whole-row window at p50 is verified (rows 2 to 8, none cut; row 2 fades at the top). The cursor travel and the 0.45-row edge fade between p50 and p100 are inferred from code; no strip was supplied. |

Blocking: none.

Non-blocking, by impact:
1. p100, row 8 "print(total)  # 400" (x 289-477, y 327-347): the headline answer "400" is in the dim comment tint, the dimmest token on the active row. Lift it to ink-bright (the additive `Tok.c` field exists in kit.tsx), or pair it with NumberCounter beside the plate, so the figure does not depend on the footer line.
2. p50 and p100, whole plate: no running state. Add a small side chip for `total` that counts up on each passing receipt (120, 200, 250, 400) and ghost the failed rows T3 and T6 in crit at the moment `not in failed` is read; that makes the verb legible without narration and keeps every number sourced to d:5.2.
3. Depth and light: the plate is about 420 x 260 of 960 x 540 and the surround is empty. In the CH-27 spec use a camera push of 4-6 %, or place the plate off-centre with a data plate (receipt table) beside it, so the frame is not a lone panel.
4. p50 and p100, row 7 (x 292-412, y 304-322): the Arabic comment at 0.45 opacity ink3 is hard to read at 1080p. It is a comment, not the lesson, so acceptable; keep the Arabic spec comments short, or raise the floor to 0.55.
5. p0 is deliberately empty (haze only); keep the first anchor within 0.5 s in specs so the opening does not read as a blank shot.
6. Still wanted: a motion strip (frames 0-149 every 6 f) under reports/p7/ for the band travel and the row fade.

What worked: whole-row scroll with no half-cut rows at p50; band, edge bar and pips agree on the active rows; the Arabic footer is the brightest text in the plate, so it carries the sentence.

## SqlStages — round 1

Reviewed: studio/test/baselines/SqlStages/{p0,a1,p50,p100}.png at full size (960x540 lite) and SqlStages.tsx. No motion strip exists. Author: motion-engineer (not the critic). Demo query is verbatim from d:6.3:1 (300, LIMIT 1; confirmed in reports/graph/contradictions.md). Author's change (edge bar as a background layer, not inset box-shadow) is visible in code and in p50 (GROUP BY row: 4 px bar plus band, no artefacts).

Score: 7.2 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 7.5 | Code about 17 px on the 960 render (about 34 px at 1080p); chips about 15 px. Badges 1-3 on done rows (ink on grid, about 12 px) are the weakest text. |
| Token / palette discipline | 8.5 | ink / ink2 / ink3 / grid / signal only; semantic colour used for state only. |
| Depth and light | 6.5 | Glass plate, warming rim, signal pool under the plate, chip glow. Plate is about 550 x 335 of 960 x 540 on a near-flat black field. |
| Visual verb without narration | 7.5 | p100 reads: SELECT carries 6 while 1-5 run below it, and the rail fills in order. p50 alone (1-4 in order) does not yet show the mismatch. |
| Arabic | n/a | Latin LTR mono, correct. Arabic captions live in the spec. |
| No bullet-list look | 7.5 | Reads as an editor plus a pipeline; the two-row chip rail is the nearest thing to a list. |
| No legacy frames / unsourced numbers | 9 | 300, LIMIT 1 and the clause set trace to d:6.3:1. |
| Motion intent | 6.5 | Cascade from a1 to p50 to p100 is consistent (previous stage settles, pipe fills). The 6-before-5 jump is inferred from code. |

Blocking: none.

Non-blocking, by impact:
1. p50 (rows y 145-340, x 210-750): the mismatch is not visible until the late stages. In the spec, anchor stage 6 (SELECT) with a longer hold so the badge 6 lands on row 1 while the lit band jumps back to the top; or ghost a "written 1" tag on SELECT.
2. p100, rail (x 218-670, y 366-432): the wrap to two rows breaks the pipe between chip 4 and chip 5, so the "flow" is cut. Add an elbow or a "4 > 5" connector, or fit 8 chips in one row at hero tier.
3. p50, badges 1-3 (x 713-735, y 170-238): ink on grid at about 12 px is low contrast at 1080p. Raise to ink at full opacity or enlarge by 1.25.
4. p0 is deliberately empty (haze only), as for earlier code-media plates; keep the first anchor within 0.5 s in specs.
5. Depth and light: plate is small and centred on an empty field. Specs should add a camera push of 4-6 % or a data plate (a result row) beside it.
6. Snap determinism: the author reports det 0 on 3 of 4 runs; the fourth failed. The baseline is approved on the 3 stable runs, but the residual flake needs a root cause (likely another Glass / backdrop layer, for example the rim `border-box` gradient or the chip `boxShadow`). Log it in corpus/specs/_component_requests.jsonl if it is not resolved in the next pass.
7. Still wanted: a motion strip (frames 0-229 every 12 f) under reports/p7/ for the badge landing and rail fill.

## LoopPlate — round 1

Reviewed: studio/test/baselines/LoopPlate/{p0,a1,p50,p100}.png at full size (960x540 lite), LoopPlate.tsx, media.tsx (missingMedia), the demo spec and the snap/Arabic QA reports. Author: motion-engineer (not the critic). No motion strip exists; motion read from p50 vs p100 (glow lobes and particle field differ, so the loop advances) plus the pure-function index in code.

Score: 7.1 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 7.5 | Plate stays dark enough that the term (about 34 px at 960, kinetic) and the counter read cleanly; screen blend does not wash text. |
| Token / palette discipline | 7.5 | Teal / indigo aurora on void stays inside the palette family; no stray hues. |
| Depth and light | 6.5 | Soft glow pools and a sparse particle field give atmosphere, but peak luminance is low and the field is nearly uniform at p50/p100; little parallax cue between plate and text. |
| Visual verb without narration | 6.5 | A plate is atmosphere by design; the demo meaning is carried by KineticWord and NumberCounter (50 s to 57 s count-up is clear). |
| Arabic | 8 | زمن البناء and الـcache render joined and correct; QA pass 2/2. |
| No bullet-list look | 8.5 | Full-bleed atmosphere, no list. |
| No legacy frames / unsourced numbers | 9 | Procedural fixture, 57 s sourced d:6.7:2. |
| Motion intent | 7 | Plate drift is visible between p50 and p100; fade-in from p0 (near black) to a1 (about half) matches the morph preset. A strip would confirm seamless wrap. |

Blocking: none.

Non-blocking, by impact:
1. a1 / p50 / p100 whole frame: plate luminance is low (brightest lobe about 25 % grey-blue at x 300-450, y 200-330). The real P10 plates should carry a clear key light and a second rim colour so the text layer separates in depth; do not ship plates this flat.
2. p50 (x 345-615, y 285-320 and x 372-585, y 350-440): faint darker rectangles behind the KineticWord and NumberCounter. They belong to those components (shadow or glass plate), not to LoopPlate; check against the plate under screen blend and soften or remove.
3. p0: near black by design (fade-in begins at the anchor); keep the first anchor within 0.5 s in specs so the plate is already present when the first word lands.
4. Still wanted: a motion strip (frames 0-119 every 12 f) demonstrating the loop wrap at the 10 s seam on a real plate, once a P10 plate exists.
5. Spec guidance: use `blend: screen` with opacity 0.6-0.8 on dark plates; avoid `add` over bright diagrams.

## AIPlate — round 1

Reviewed: studio/test/baselines/AIPlate/{p0,a1,p50,p100}.png at full size (960x540 lite), reports/p7/snap/AIPlate.{jpg,json}, AIPlate.tsx, media.tsx (missingMedia), the demo spec (Demo-AIPlate, KineticWord الـdepth over the plate). Author: motion-engineer (not the critic). No motion strip exists; motion read from a1 vs p50 vs p100 (left/right edge panels and bars shift, drift passes through zero at p50) plus the pure-function drift in code.

Score: 7.2 / 10. Verdict: approved-critic. Blocking issues: none.

| Criterion | Score | Note |
|---|---|---|
| Legibility at 1080p | 7.5 | Plate is dark and low-contrast; the term (kinetic, upper third) reads cleanly at p50/p100. |
| Token / palette discipline | 8 | Teal grid and bars plus indigo edge panels on void; no stray hues. |
| Depth and light | 7 | Horizon glow, perspective grid, particles and two planes give real depth; peak luminance is low and the key light is weak. |
| Visual verb without narration | 6.5 | A backplate by design; the demo stand-in reads as a "glass hall" with parallax, meaning is carried by the type on top. |
| Arabic | 8 | الـdepth joined and correct (KineticWord); plate has no text; QA pass. |
| No bullet-list look | 9 | Full-bleed environment. |
| No legacy frames / unsourced numbers | 9 | Procedural fixture, no numbers. Missing plate: marked placeholder in preview, throw in final (media.tsx:52). |
| Motion intent | 7 | Slow camera-eased drift with a visible lateral shift between a1 and p100; fade-in p0 to a1 matches the morph preset. Strip would confirm the seam-free pass through p50. |

Blocking: none.

Non-blocking, by impact:
1. Work resolution (AIPlate.tsx WORK table): hero canvas 1280 px is stretched over a ~2150 px box (1.7x), standard 2.2x, lite 3.4x. At final the plate will look soft against sharp type. Raise hero/final work width to about 1920 or measure that a P10 plate survives; log in corpus/specs/_component_requests.jsonl if the perf budget blocks it.
2. a1 (bars at x 430-497, y 230-510 and x 738-838, y 215-515) and p100 (bars at x 100-195): doubled outlines where a near slice is offset from the farther fill. At a1 the offset is already at its maximum because the drift starts at +x. Soften slice edges (feather 1-2 px in depth threshold) or start the drift from zero offset at the anchor.
3. a1 / p50 / p100 whole frame: plate luminance is low (brightest glow about 25 % teal at x 380-580, y 60-300). Real P10 plates need a clear key and a rim colour so the type separates in depth.
4. p0: near-empty haze (fade-in), keep the first anchor within 0.5 s of the shot start in specs.
5. Still wanted: motion strip (frames 0-119 every 12 f) on a real P10 plate; check the drift through the pivot and the exit fade.
