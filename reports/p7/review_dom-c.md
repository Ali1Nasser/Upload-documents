# P7 critic review: group dom-c

## ConnPoolTaxi — round 1

Date: 2026-10-15. Reviewer: critic (not the author). Verdict: APPROVED (7.3/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier), reports/p7/snap/ConnPoolTaxi.json, ConnPoolTaxi.tsx (236 lines). No motion strip exists; the boarding arc, queue close-up on release and the exhaust shake were judged from code plus the three live stills, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (signal borrowed, warn queued, crit exhausted, ok freed; all C tokens) | 8 |
| Light and depth (perspective floor, extruded rank panel, glows) | 6 |
| Legibility at 1080p (taxis ~140 px, request dots 18-30 px) | 8 |
| Visual verb without narration | 9 |
| Arabic (no copy; n/a, correctly left to TermChip/NumberCounter) | 10 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (none drawn) | 10 |
| Motion intent (code plus stills) | 7 |
| AI-Unpacked parity | 6 |

### What works
- a1 to p50: free taxis (dashed grey bays, green roof light) turn cyan and wired to the database as passengers board; at exhaust the rank border, gate and queue go crit red with a halo. The metaphor "connection pool = taxi rank, exhaustion = queue grows" reads in one second.
- p100: after release the red calms, taxis stay borrowed (cyan) while 7 warn-orange requests wait in FIFO order. Correct cause and effect.
- Determinism: det diff 0 px, seed only changes arc height and lane jitter, never positions or timing.

### Non-blocking issues, ordered by impact
1. Composition (a1, p50, p100): the rank sits in the left 60% and the queue only reaches x~880/960; the right third and the upper half are void. Scale bayW toward 0.16 W and push the lane so the queue fills to the right edge; hero reads larger.
2. Depth and light (all stills): flat panel on a faint floor grid, no particles or parallax. Add a few drifting motes, a soft reflection under the rank, and a light bloom from the lit taxi roofs onto the panel.
3. p0 baseline is an empty dark frame and protects nothing. Move it to a frame where the first bay has entered (frame ~6) when baselines are rewritten at 1080p.
4. p50, queue region (x 610-880, y 245-295): per-dot glows overlap into a continuous pill with the halo, so individual requests blur together. Cap the glow radius to ~0.8 qGap or drop dot glow when the queue is longer than ~6.
5. p100, gate region (x ~608, y 190-345): after release the gate is a 1 px grey hairline and the queue loses its boundary. Keep the gate at ~3 px ink3 so the rank edge stays legible.
6. a1, rank centre (x 350-430, y 205-225): arriving dots pass behind the cars and are partly hidden by taxi bodies while crossing; raise passenger dots above the taxi layer or enlarge the arc so they read as boarding.
7. Motion: add a strip (frames 0, 11, 40, 83, 120, 167) to reports/p7/ so the exhaust shake and the release close-up are seen, not inferred.

## RaceCondition — round 1
Date: 2026-10-16. Reviewer: critic (not the author). Verdict: APPROVED (7.1/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, full size), RaceCondition.tsx (288 lines), qa_arabic_RaceCondition.json (pass, OCR 3/3). No motion strip exists; the collide travel, shock ring (impact + 12 frames) and the one-shot shake were judged from code and from the post-impact still p50, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 7 |
| Palette and token discipline (signal idle, crit crash, warn waiting, ok done; all C tokens) | 8 |
| Light and depth | 6 |
| Legibility at 1080p (capsule labels, counter label ~2x of the 960 still) | 8 |
| Visual verb without narration | 8 |
| Arabic (3 strings, tofu 0, overflow 0, OCR exact) | 9 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (none drawn, structural segments) | 10 |
| Motion intent (code plus stills) | 6 |
| AI-Unpacked parity | 6 |

### What works
- a1 to p50: two cyan hands over one bar turn crit red, one hand lands on a segment (fills red), the other rebounds as a ghost and a dashed segment with a cross marks the lost write. "Two writers, one counter, one update survives" reads in one second.
- p50 to p100: lock ring + padlock, both hands wait/go in turn, two green segments land: serialised writes read as the fix, with the same bar so the before/after compare directly.
- Hands are wired to the thread capsules (cause and effect, no floating props); crit/ok colour switch is consistent across capsule border, panel and floor pool.

### Non-blocking issues, ordered by impact
1. Motion (all): no strip. Add frames at collide start, impact, impact+6 (shake), impact+12 (ring end), lock+10, lock+40 to reports/p7/ so the clash and shake are seen, not inferred.
2. Depth and light (a1, p50, p100): faint floor grid, flat panel, no motes or reflection. Add a few drifting motes, a bloom from the lit hands onto the bar, and a soft reflection under the counter panel.
3. p50, bar region (x 280-410, y 325-395): the lost-update cross sits on the far-left segment while the loser hand hovers over it only by rebound; the hand never visibly hits it. Either rebound the loser toward the lost segment, or draw a short crit thread from the loser palm to its X so the lost write is tied to its thread.
4. Hand art (a1, a1 left hand x 255-330, y 135-270): the thumb is a detached rotated pill and fingers are four equal rects; at 1080p the hand reads as a glove icon. Taper fingertips and attach the thumb to the palm edge.
5. p100, padlock (x 758-790, y 425-465): the lock is ~35 px at 960, the weakest element of the "lock" verb. Enlarge to ~1.6x and centre it on the ring top edge so it reads as the lock before the segments fill.
6. a1, hover shadows (x 235-340 and 620-725, y 315-330): the dark ellipses sit on the panel top edge and look like smudges while hands are idle; fade them until near > 0.3.
7. p0 baseline is an empty dark frame and protects nothing; rewrite at frame ~6 when baselines are next regenerated.

## SagaChain — round 1
Date: 2026-10-16. Reviewer: critic (not the author). Verdict: APPROVED (7.0/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, full size), reports/p7/snap/SagaChain.jpg (4-frame strip of the same frames), SagaChain.tsx (210 lines), the dom-c demo, qa_arabic_SagaChain.json (pass, OCR 8/8, min 0.917). No true motion strip exists; the fail shake (4 f24 frames, 5 px, decaying) and the wire draw / saga token travel were judged from code and from the settled stills, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (signal in flight, ok done, crit fail, warn compensate, ink3 idle/undone; all C tokens) | 9 |
| Light and depth | 6 |
| Legibility at 1080p (node labels ~2x of the 960 still, about 40 px; chip labels about 30 px) | 8 |
| Visual verb without narration | 8 |
| Arabic (8 strings, tofu 0, overflow 0, RTL step 1 on the right) | 9 |
| Not a bullet slide, no legacy frames | 8 |
| Numbers (none drawn) | 10 |
| Motion intent (code plus stills) | 6 |
| AI-Unpacked parity | 6 |
Mean 7.6 by criterion, held to 7.0 overall for the flat composition and unseen motion.

### What works
- a1 to p50: step 1 lights cyan, then 1 and 2 turn green with check badges, step 3 turns red with a cross and step 4 stays dim and unstarted. "Two succeed, third fails, fourth never runs" reads without narration.
- p50 to p100: completed steps grey out with a warn return badge, chips drop under them newest first (رد الخصم before فك الحجز), and the warn wire runs left to right, opposite to the saga. "Undo, newest first" is visible and the failed step correctly gets no chip.
- Colour is semantic only and the floor pool switches signal to crit on failure; no numbers, no bullets, no legacy frames.

### Non-blocking issues, ordered by impact
1. Composition (p50, p100, y 360-540): everything lives in a band y 165-410 and the lower third is empty floor. Lower the chain slightly, or make the nodes ~1.15x taller, so the 4-step row fills the safe area better. Push the compensation row down only if the floor lines are kept as its ground.
2. Depth and light (a1, p50, p100): no motes, no bloom from the lit node onto its wires, and no reflection of the row on the floor. Add a few drifting motes and a soft node bloom on the crit flash (p50, node 3, x 290-455, y 165-260) so the failure hits as light, not only as a border colour.
3. Motion (all): no strip. Add frames at fail, fail+2 (shake), fail+6, compensate, compensate+8 and compensate+16 to reports/p7/ so the shake and the backward travel are seen.
4. p100, badges (x 868-902 and 652-686, y 145-178): the warn return-arc glyph is ~34 px at 960 and reads like a letter "C" or smiley, not "undone". Use a clearer undo arrow with a visible arrowhead.
5. p100, undone nodes (x 500-672 and 717-888, y 165-262): labels drop to ink3 grey on a near-void node and lose contrast. Keep them ink2 so "undone" stays readable.
6. p100, return wire (x 672-717, y 385): the warn arrow is ~45 px at 960 and thin; lengthen it by narrowing the chips (0.8 x node width) so the direction cue is clearer.
7. p0 baseline is an empty dark frame and protects nothing; rewrite at frame ~6 when baselines are next regenerated.

## QualityGauges — round 1
Date: 2026-10-16. Reviewer: critic (not the author). Verdict: APPROVED (7.0/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, full size), reports/p7/snap/QualityGauges.jpg, QualityGauges.tsx (125 lines), the dom-c demo (refs d:6.11:2/3, d:5.2:7, d:6.3:2), qa_arabic_QualityGauges.json (pass, OCR 4/4, min 0.923, tofu 0). No true motion strip exists; the 5 px fail shake and the 14-frame sweep were judged from code and from the a1 mid-count still (608 ms, 346 ms, 40.21 % on the way up), not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (ok green, crit red, signal cyan active, ink threshold tick; C tokens only) | 9 |
| Light and depth (extruded side, lit rim, contact shadow, glow on landing) | 7 |
| Legibility at 1080p (value ~2x of the 960 still, about 40 px; labels about 30 px) | 8 |
| Visual verb without narration (arc passes the white tick, turns red, tinted failing zone) | 8 |
| Arabic (4 strings, RTL: gauge 1 on the right, mixed p95 and JOIN labels ordered correctly) | 9 |
| Not a bullet slide, no legacy frames | 8 |
| Numbers (all ref-bound: 355, 675, 66.67, 13; threshold is an unlabelled tick, nothing invented) | 9 |
| Motion intent (code plus a1 mid-count) | 6 |
| AI-Unpacked parity | 6 |
Mean 7.6 by criterion, held to 7.0 overall for the flat composition and unseen motion.

### What works
- a1 to p50: the dials sweep up with a live count, then the 675 ms arc crosses the white gate tick and turns red while 355 ms stays green. "Before passes, after breaks the gate" reads without narration.
- The 13 rows dial stops short of its tick and goes red, so a floor gate and a ceiling gate both read, with the failing side tinted on the track.
- Tabular mono numerals plus a unit, Arabic labels on whole elements, no per-letter animation, no numerals on the scale, no legacy frames.

### Non-blocking issues, ordered by impact
1. Composition (p50, p100, whole frame): the 2x2 grid hugs x 165-365 and 595-790, leaving a 230 px dead column in the centre and bare floor at the bottom. Widen the cell grid (r up to ~1.15x) or tighten the gutter so the group fills the safe area.
2. Motion (all): no strip. Add frames at land, land+1 and land+2 (shake), land+6 for the fail gauge (p50 top-left, x 165-365, y 40-250) to reports/p7/ so the shake and the landing glow are seen, not inferred.
3. Depth and light (all): no motes and no reflection or bloom of the lit arc on the glass face. Add a few drifting motes and a soft arc bloom on the fail landing so the failure hits as light, not only as a colour change.
4. a1, gauge 4 (x 595-785, y 285-480): at frame 11 the 3rd and 4th dials are not yet visible while the grid slot is empty at bottom-left; the stagger leaves a hole that reads as a layout error. Start 3-4 frames earlier or fade the hidden slots in at a low opacity.
5. p100, threshold tick (x 258-270, y 36-70 and x 690-700, y 36-70): the 5 px tick and its flag are the only gate cue, with no label. With a free label slot per contract, a future spec should pass a callout for the threshold value (e.g. via CalloutArrow, d:6.11:1) so the gate value is on screen when it is spoken.
6. p100, contact shadows (x 180-345 and 610-775, y 238-258): the dark ellipses are lighter-footprint than the dial and look detached at 540p; tighten rx to ~0.9 r and raise opacity.
7. p0 baseline is an empty dark frame and protects nothing; rewrite at frame ~6 when baselines are next regenerated.

## IdempotentStamp — round 1 (critic, 2026-10-16)

Looked at: baselines p0, a1, p50, p100 (960x540, lite, full size), reports/p7/snap/IdempotentStamp.jpg. No motion strip exists; the stamp strike, contact shadow, ring pulse, ghost dissolve and rebound were judged from the p50 mid-state and not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (cyan active, green ok seal, amber warn ring and pips) | 9 |
| Light and depth (contact shadow, glow under the seal, lit page rim; no motes) | 7 |
| Legibility at 1080p (chip about 30 px; key glyph on envelopes about 24 px) | 6 |
| Visual verb without narration (outbox to ledger, one stamp, repeats absorbed) | 7 |
| Arabic (no Arabic strings; the only text is the Latin literal key chip, LTR mono, correct) | 8 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (none shown; nothing invented) | 9 |
| Motion intent (p50 mid-state only) | 6 |
| AI-Unpacked parity | 6 |
Overall 7.0 (mean 7.3, held down for flat composition and unseen motion). Approved-critic, no blocking issue.

### What works
- a1 to p100: stamp over the first envelope, then a green seal with check, one filled green ledger row, and the later duplicate stopping at the seal with a faint amber ring and a dashed ghost row that is gone by p100. "Same key, one effect" reads.
- Metaphor is concrete (envelope, ledger, rubber stamp), not a table or bullets. Palette is token-only.

### Non-blocking issues, ordered by impact
1. p50 and p100, whole frame: the page plus outbox hug x 110-885 and y 135-425 with the key chip above; the bottom band and the gap between page and outbox are empty. Enlarge the page and envelopes about 1.25x or move the outbox closer.
2. p50, seal and envelope (x 265-555, y 280-430): the big seal ring overlaps the arriving envelope and its ghost, so the rebound reads as clutter. Stop the envelope short of the ring, or draw the ring behind it with lower opacity.
3. Stamp visibility (p50, p100): the rubber stamp is only visible at a1; at p50 and p100 the seal appears with no stamp. Add a strike strip (frames at press, press+1, press+3, lift) to reports/p7/ so the impact is seen.
4. a1, envelope key glyph (x 358-388, y 338-360): about 24 px at 1080p, too small to carry "the same key". Enlarge the glyph or let the envelope show the key text in mono.
5. a1 to p100, outbox (x 750-885, y 270-415): the left arrow in an empty dashed box reads as "back", not "outbox". Use an envelope stack or tray icon, and show a pending count only if ref-bound.
6. p100, ledger rows (x 150-515, y 160-235): two grey bars are blank and the pips (x 295-370, y 445-465) have no legend; the second pip is amber with nothing saying duplicate. Add a ref-bound callout via CalloutArrow when specs use it.
7. p0 baseline is empty and protects nothing; rewrite at frame ~6 when baselines are regenerated.

## KAnonBlur — round 1 (critic, 2026-10-16)

Looked at: baselines p0, a1, p50, p100 (960x540, lite, full size) and reports/p7/snap/KAnonBlur.jpg. No motion strip exists; the linkage reticle hops, the feathered-band widening and the bracket close were judged from end states, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (amber warn sharp marks, green ok groups and brackets, no stray hues) | 9 |
| Light and depth (acrylic table, ok-tinted rim and floor glow at p100; no motes, no reticle light) | 7 |
| Legibility at 1080p (header labels about 32 px, row pills about 24 px tall, id dots about 4 px) | 7 |
| Visual verb without narration (unique amber marks to identical green rows in groups of 2-3, closed by brackets) | 8 |
| Arabic (3 headers, RTL order, shaping correct, qa arabic PASS, ocr 1.0, no digits) | 9 |
| Not a bullet slide, no legacy frames | 8 |
| Numbers (none shown; nothing invented) | 9 |
| Motion intent (end states only) | 5 |
| AI-Unpacked parity | 6 |
Overall 7.0 (mean 7.4, held down for unseen motion and flat composition). Approved-critic, no blocking issue.

### What works
- a1 to p50 to p100 tells k-anonymity without words: five distinct amber pills become matching green pills, rows slide into 3/2/2/2 groups, each closed by a green bracket and a green rim. Colour carries the state (warn to ok), headers recolour with their column.
- Table of marks, not bullets; token-only palette; Arabic headers clean.

### Non-blocking issues, ordered by impact
1. Motion (all): no strip. Add frames at reticle hop 1 and 2 (about f14-f30), mid-generalize (about f50-f70, the feathered band) and bracket land to reports/p7/ so the verb is seen, not inferred. The warn reticle appears in none of the four baselines (a1 is f7, before the first hop).
2. Intermediate state (baselines): no baseline between a1 (f7) and p50 (f94) shows the feathered band, which is the component's signature. Add a baseline at about f60 when baselines are next regenerated.
3. a1 (x 190-870, y 100-490): rows fill only the top 190 px at 540p; the lower 60% of the table is an empty panel. Stagger rows in sooner or size the panel to the visible rows; p0 (a frame with one row) protects nothing, rewrite at about f6.
4. p50 and p100, id column (x 700-880, y 100-480): the masked identifier is four 2 px dots in a 180 px dead column; it reads as an empty gutter. Enlarge the dots to about 3x or add a masked-bar chip so "hidden name" registers at 960 px.
5. p100, brackets (x 170-182, y 95-210, 230-300, 322-398, 418-490): the brackets touch the table rim and read as stray edge lines; offset them 10-14 px outside the panel and add a subtle ok glow.
6. p50 and p100, band pills (x 200-690): the pills have a halo but no visible feather; at 540p they look like glowing pills, not blurred bands. Widen the halo falloff so the generalisation reads as blur.
7. Depth (all): no motes or reflection on the glass face; add a few drifting motes under LK-F so the table is lit space, not a flat card.

## SplitDeck — round 1 (critic, 2026-10-16)

Looked at: baselines p0, a1, p50, p100 (960x540, lite, full size), reports/p7/snap/SplitDeck.jpg and the source. No motion strip exists; the deal motion was judged from p50 (mid-deal), which does show cards in flight.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 6 |
| Palette and token discipline (signal / violet / ink / ember piles, void ground, no stray hues) | 8 |
| Light and depth (extruded stacks, contact shadows, tinted floor pools, perspective floor grid; no motes) | 7 |
| Legibility at 1080p (labels about 40 px, share numerals about 44 px, % glyph about 16 px) | 7 |
| Visual verb without narration (deck dealt into piles, pile height = share; p50 shows turn in flight) | 8 |
| Arabic (RTL label shaped correctly, qa arabic PASS, ocr 1.0, no tofu) | 9 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (35/25/20/10 refs to CH-30 s:S4:P25:0052/0053; nothing invented) | 9 |
| Motion intent (p50 only; edge-on cyan card sliver is a readable turn) | 6 |
| AI-Unpacked parity | 7 |
Overall 7.4 (mean 7.6, held down for composition and unseen motion). Approved-critic, no blocking issue.

### What works
- A seeded shuffled deal: p50 shows colours interleaved (Python and SQL land mixed), cards turn from grey hatched back to pile colour in flight, so it reads as dealing, not sorting.
- Pile height carries share (SQL stack about 5x Java at p100); the undealt 10 percent stays as a thin deck at top.
- Tokens only, whole-word labels, DOM only; hero equals standard.

### Non-blocking issues, ordered by impact
1. Composition (p100, whole frame, x 130-830, y 60-450): cards are about 85 px wide at 540p (9 percent of the frame); top-left, top-right and bottom band are empty. Raise the card width cap (190 to about 250) and pile spacing, or move the piles lower.
2. Motion (all): add a strip (deal launch, 3 in-flight frames, last landing) to reports/p7/ so the turn and landing impact are seen, not inferred.
3. p0 and a1 (whole frame): p0 is blank and a1 shows only the deck and dashed slots; neither protects piles or labels. Rewrite baselines at about f6 and f30 when next regenerated.
4. p100, share unit (x 195-210, y 436-446 and the other three): the % glyph is about 8 px at 540p (16 px at 1080p), below the 18 px floor. Raise the unit to about 0.7x of the numeral.
5. p100, ink pile (x 340-420, y 230-375): the grey AI pile reads as the "dim" pile against the coloured ones; use a token with a hue (for example ok or amber) so the 20 percent share is not visually demoted.
6. p100, piles (x 140-820, y 330-380): stack edge lines have no count; consider a ref-bound count only if the narration speaks it.

## KAnonBlur — round 1 (critic re-review after author fixes, 2026-10-16)

Looked at: baselines p0, a1, p50, p100 (960x540, lite, full size). No strip was supplied; motion judged from end states plus the grow-with-rows plate visible between p0 and a1.

### Scores
| Criterion | Score |
|---|---|
| Composition (plate now sized to rows: p0 one row, a1 five rows, p100 nine rows; no dead panel) | 7 |
| Palette and token discipline (warn amber to ok green, ink chip; no stray hue) | 9 |
| Light and depth (ok rim glow at p100, floor pool at p0/a1, band halos; no motes) | 7 |
| Legibility at 1080p (headers about 32 px, pills about 24 px, id chip dots about 16 px) | 8 |
| Visual verb without narration (unique amber marks to identical green bands, 3/2/2/2 groups, brackets) | 8 |
| Arabic (3 headers, RTL, shaped, qa arabic 0) | 9 |
| Not a bullet slide, no legacy frames | 8 |
| Numbers (none; nothing invented) | 9 |
| Motion intent (end states only) | 6 |
| AI-Unpacked parity | 7 |
Overall 7.6 (mean 7.8, held down for unseen motion). Approved-critic, no blocking issue.

### Round 1 items 3-6 verified
- Item 3: p0 now holds one real row (protects header, chip, pills); a1 fills the plate with five rows, no empty lower panel.
- Item 4: masked-id chip with four larger dots at x 748-822 reads as "hidden name" at 960 px.
- Item 5: p100 brackets (x 155-175, y 93-495) now sit clear of the rim with a green glow; they read as group closers.
- Item 6: p50/p100 pills carry a wider halo; the bands read as soft blur, though the feather is still subtle at 540p.

### Non-blocking, ordered by impact
1. Motion (all): add a strip (reticle hops, mid-generalise about f60, bracket land) to reports/p7/. Items 1 and 2 of the earlier round remain open; no baseline shows the warn reticle or the mid-feather state.
2. p100, id chips (x 755-822, y 105-480): the chip is dim grey against green; lift its stroke to ink-high so it holds against the green rim.
3. p50 vs p100 (x 185-880, y 90-500): the rim glow is the only light on the plate; add a few drifting motes under LK-F (carried from round 1 item 7).

## SplitDeck — round 1 (critic re-review after author fixes, 2026-10-16)

Looked at: baselines p0, a1, p50, p100 (960x540, lite, full size) and reports/p7/snap/SplitDeck.jpg. No motion strip was supplied; motion judged from p50 (cards in flight, edge-on cyan card at x 617, y 82-215) and the snap sheet.

### Scores
| Criterion | Score |
|---|---|
| Composition (cards about 100 px wide at 540p, piles larger; corners and bottom band still empty) | 7 |
| Palette and token discipline (signal / violet / ok green / ember; no stray hue, void ground) | 9 |
| Light and depth (extruded stacks, tinted floor pools, perspective grid; no motes) | 7 |
| Legibility at 1080p (labels about 40 px, numerals about 44 px, % unit now about 28 px) | 8 |
| Visual verb without narration (deal into piles, pile height = share, turn in flight) | 8 |
| Arabic (RTL label shaped, no tofu, qa arabic 0) | 9 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (35/25/20/10 sourced; nothing invented) | 9 |
| Motion intent (p50 and snap sheet only) | 6 |
| AI-Unpacked parity | 7 |
Overall 7.7 (mean 7.9, held down for unseen motion and empty margins). Approved-critic, no blocking issue.

### Round 1 items verified
- Item 1: cards and spacing larger; the four piles now span x 130-830 with readable stacks. Margins still loose.
- Item 4: % unit at x 195-210 now reads clearly at 960 px.
- Item 5: AI pile is ok green, no longer reads as the dim pile; palette is balanced across the four shares.

### Non-blocking, ordered by impact
1. Motion (all): add a strip (deal launch, 3 in-flight frames, last landing) to reports/p7/; items 2 of round 1 still open.
2. p0 (whole frame) and a1 (x 130-830, y 240-390): p0 is fully blank, a1 shows only deck and dashed slots; neither protects piles or labels. Re-baseline at about f6 and f30 next regeneration.
3. p100 (x 0-130, x 830-960, y 0-190): empty top corners and a dead band under the numerals; push piles up to scale 1.2 or add a faint floor reflection or motes under LK-F for depth.

## SamplingDial — round 1 (critic, 2026-10-16)

Looked at: baselines p0, a1, p50, p100 (960x540, lite, full size) and reports/p7/snap/SamplingDial.jpg. No motion strip supplied; motion judged from a1 (bars entering) vs p50/p100 (flat to spike) and the snap sheet. Baselines show only the temperature dial.

### Scores
| Criterion | Score |
|---|---|
| Composition (plate left, dial right, shadow pools; plate top ~40 % empty) | 7 |
| Palette and token discipline (signal cyan, violet tail bars, void ground; no stray hue) | 8 |
| Light and depth (glass rim lit teal, floor grid, plate shadow; no motes) | 7 |
| Legibility at 1080p (mono value ~60 px at 540p, label ~24 px at 540p, ticks bare) | 8 |
| Visual verb without narration (dial turn sharpens bars to one spike; ghost dashed bars show the old shape) | 8 |
| Arabic (single Latin label; qa arabic 0 failures; Arabic labels not shown in any baseline) | 7 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (0.3 and 0 carry refs s:S4:P22:0085 / s:S4:P23:0062; bars unlabelled illustration) | 9 |
| Motion intent (a1 and p50 only; no strip) | 6 |
| Spec coverage (1 dial only; top-p cut line and 2-3 dials unseen) | 6 |
Mean 7.5, held to 7.0 for unseen top-p behaviour and motion. Approved-critic, no blocking issue.

### Non-blocking, ordered by impact
1. Coverage (all): no baseline shows a top-p or nucleus dial, so the dashed warn cut line (code ~line 161) is unverified visually. Add a two-dial demo (temperature + top-p) and a still of the cut line at about 1080p.
2. Motion (all): add a strip (dial sweep 0.3 to 0, bars reshape, ghost dashed bars fading) to reports/p7/.
3. p50/p100 (x 95-495, y 100-160): the top of the plate is empty; raise the bar scale or shrink the plate height. Tail bars at x 125-410 are tiny violet blobs; give them a minimal visible height.
4. p0 (whole frame): blank; re-baseline at about f6 to protect plate and dial.
5. a1 (x 405-465, y 270-425): only two bars present, the other eight are absent; re-baseline at about f30 so the full distribution is protected.
6. p50/p100 (x 0-960, y 0-100): no motes under LK-F; add a few to lift depth.
