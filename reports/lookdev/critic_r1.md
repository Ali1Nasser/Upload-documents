# P6 look-dev critic report, round r1 (G6a input)

Fresh critic invocation; the critic did not author these frames. Compared against `reports/lookdev/critic.md` (r0), same criteria and table format.
Method: contact sheet `reports/lookdev/r1/contact.jpg`; all 10 stills read at full size (F1, F2, F3, F4-standard, F4-hero, F5, F6, F7, F8, F9); all 5 motion strips read (MA-standard, MB-standard, MB-hero, MC-standard, MD-standard, 8 frames each); `perf.json` and the r1 section of `reports/lookdev/README.md` for cost. The MP4s were not played; motion is judged from strips. Typography is T-A only (ADR-003), so there is no per-candidate table this round.
Calibration (kept from r0): 9 = could cut straight into an AI-Unpacked film (volumetric light, real DOF, type living in the scene); 7 = clean, premium dark UI with glow and some depth, but still a diagram; 5 = flat widget with one lit element. Nothing here earns a 9. F6 is the only frame near 8.5 on a single criterion (typography).

## Verdict: FAIL for G6a (look mean 7.61 < 8.0; parity 7.1 < 7.5; min criterion 5 < 6)

Real progress over r0 (the six r0 families, standard tier: 7.50 -> 7.81; parity read 6.9 -> 7.1; min 4 -> 5). Every r0 defect I flagged as blocking is fixed or mostly fixed (F5 tashkeel collision, F4 legibility, F2 clipping/imbalance, F3 flatness, MA orphan, MC wash). What is left is not polish: light is still on type and edges rather than on objects, camera and impact are weak in the standard tier, and the two new frames (F7, F8) are the weakest. One more cheap round should reach 8.0 for the stills; parity 7.5 needs motion (camera on every standard shot, impact beats).

## Scores per family (T-A, standard unless noted)

Criteria order: composition, palette discipline, light and depth, typography, legibility, AI-Unpacked parity, render cost (inverse; 10 = about 1.3 s/still and <= 0.2 box s/frame; 5 = hero WebGL at ~2.7 s/frame/slot).

| Family | Std (comp/pal/light/typo/leg/parity/cost) | Mean | r0 mean |
|---|---|---|---|
| F1 cold open (receipts, box, table) | 7/8/7/8/8/7/9 | 7.71 | 7.57 |
| F2 SQL funnel | 8/8/7/8/8/6/9 | 7.71 | 7.43 |
| F3 Kafka lag | 8/8/7/8/7/6/9 | 7.57 | 7.00 |
| F4 RAG galaxy, standard | 8/8/8/8/8/7/6 | 7.57 | 7.29 |
| F4 RAG galaxy, hero (WebGL, 1,500 pts) | 8/8/8/8/7/7/5 | 7.29 | 6.86 |
| F5 Docker layers | 8/9/8/8/7/7/9 | 8.00 | 7.71 |
| F6 kinetic type | 8/8/7/9/8/8/10 | 8.29 | 8.00 |
| F7 Holo-City (new) | 6/8/7/8/6/6/9 | 7.14 | n/a |
| F8 TripleGate ignition frame (new) | 6/8/7/7/7/6/9 | 7.14 | n/a |
| F9 orbit + kinetic word (new) | 7/8/7/8/8/7/9 | 7.71 | n/a |

Overall (10 stills, 70 scores): **look mean 7.61**, **minimum single criterion 5** (F4-hero cost). F1-F6 standard only: 7.81. Scores of 6 are cited in the issue list below.

### AI-Unpacked parity read (1-10)

| Criterion | r1 | r0 | Evidence |
|---|---|---|---|
| Depth and light | 7.0 | 6.5 | Planes, haze, rim light on the F1 box, F5 slab under-light, F7 extruded towers, F4 nebula; but objects are not lit by scene lights and there is no real DOF on subjects |
| Camera life | 7.0 | 7.0 | MB push/orbit, MC whip-pan (strong), MD orbit squashing rings to ellipses (F8 -> F9). MB-standard f0-f102 is only out-of-focus discs; MA has no camera at all |
| Kinetic-type integration | 7.5 | 7.5 | F6 ghost numeral behind the impact word, F9 cyan "كلها", MA reveals; elsewhere the title is a header above a diagram |
| Metaphor concreteness | 7.0 | 7.5 | Receipts into box, layer slabs and the city are concrete; the F2 funnel and F3 cells are still chart/widget; F8 gates are flat rings. The mean fell only because three new, weaker metaphors are now in the set |
| Rhythm and impact | 7.0 | 6.0 | MA f105 "وغلط" lands by scale/colour, MD f248-f287 reveal on the word; there is no secondary impact (flash, shake, particle burst) and no sound hook |
| **Mean** | **7.1** | 6.9 | Gate 7.5 |

Per-family parity column mean (table above): 6.7 (r0: 6.3).

## Issues remaining, ordered by impact

1. **F7-standard: composition 6, legibility 6, parity 6.** The seven districts fill about 35 % of the frame; the six unlit districts are unlabelled grey blocks (flat shading, no window emission), so the map cannot be read as the film's seven movements. Upper-left and bottom thirds are empty. Fix: push camera 1.4x, add an emissive window texture to all towers (dim for unlit, bright for lit), put a 28 px label chip on each district (canon movement names), add fog planes between towers, and let one metro route glow.
2. **F4-hero / MB-hero cost 5, and F4-standard / MB-standard cost 6.** The hero point cap went from 4,000 to 1,500 and the cost did not move (2.746 vs 2.712 s/frame/slot): the driver is Bloom/EffectComposer under swiftshader, not points. MB-standard is 1.14 s/frame/slot = 0.380 box s/frame, 1.9x the R5 figure of 0.201 (README flags it too; MC 0.216 and MD 0.257 are also over). Fix: bake the galaxy nebula and bloom into a P10 plate and render only the probe, links and cards live, or drop Bloom and use pre-blurred sprites; re-measure on an idle box. Hero stays for CH-33 beats only. In F4-hero white points still brush the tail of the title word "لموضع" at about x 745-830, y 140-200 despite the text-safe mask; widen that mask by 24 px.
3. **MB-standard f0-f102: the galaxy is out-of-focus discs for the first 4 s** (the standard tier shows no points until about f137), while MB-hero f0 already shows distinct nebulae. The first 4 s of the RAG shot is the weakest cinematic moment in the set. Fix: render the far plane with sharp small sprites from f0 (fake DOF only on the near plane) or start the push mid-field.
4. **F8-standard: composition 6, parity 6.** Upper 30 % of the frame is empty, the three gates are flat circles at similar scale, and the label is mid-reveal ("السؤا", acceptable as a motion frame) with no title. F9 shows the fix works: the orbit turns the rings into ellipses and adds depth. Fix: tilt the camera from f0 (not after f200), give each gate an inner ring and a vertical light cone so it reads as a portal, enlarge gates 1.3x and anchor the row at 50 % height, not 65 %.
5. **F2-standard and F3-standard parity 6 (still diagrams).** F2 is an area chart with dots; F3 is a row of cells. Both read as dashboards with glow. Fix: give both a standard-tier camera (slow push 1.04x over the hold, parallax on the far plane) and one moving element (F2 the two dropped rows tumbling off, F3 messages sliding into P0 cells 8-11 with a trail). In F3 the P1/P2 digits are unreadable (0-8, 0-9 at about 14 px); fine as a defocused background, but then blur the whole row, not just darken it.
6. **F5-standard: label collision, upper-left void.** The label "بترتيب layers عاقل" (x 1006-1340, y 392-425) sits on the top edge of the blue slab (y about 418), so the slab line cuts through the descenders of "عاقل". Raise it 30 px or push the stack 30 px down. The upper-left 900 x 350 px is empty because the title is right-aligned only; put the `layer cache` chip or the 5 s versus 57 s counter there. The tashkeel collision from r0 is fixed (the kasratan on "ثوانٍ" clears the subtitle).
7. **F6-standard: ghost numeral muddies the impact word, small labels dim.** The 12 % ghost "0.165" (x 440-1380, y 340-600) overlaps "وغلط" and "وضعيف". Move it below the word or drop to 6 %. The captions under the numbers ("قسم الـroadmap" at x 213-440, y 905-940, and "قسم الـidempotency") are about 28 px grey at roughly 3:1 contrast; raise to 70 % white.
8. **F1-standard: UI-panel feel and dead zone.** Top-left 960 x 190 px is empty and the table is a flat panel; table header text (`id`, `operator`, `amount_egp`) is about 22 px at low contrast. The receipts and the box (rim light, emissive lip) are now the strongest metaphor in the set, but nothing travels (no motion trail from the receipts to row T5/T6; the paths are static lines). Fix: raise header labels to 28 px, add a particle trail on the two paths, put the box interior glow on the lip (it is flat dark glass inside).
9. **MA-standard (rhythm, camera).** f8-f34 are empty bokeh; there is no camera move; the impact on "وغلط" (f105) is scale and colour only. Fix: 2-3 % push over the whole shot, a 3-frame flash/chromatic pulse on the stressed word (Latin/numeral runs only, per the CA rule), and a sound-hook marker for P11.
10. **MC-standard: resolved, minor.** The incoming scene is clean by f123 (cut + 3), no lifted black, the streak beat f115-f120 is the best living-camera moment in the set. At f119-f120 the frame is nearly black with streaks (reads as a dip); consider holding 20 % of the incoming scene's light there.

## What now works (do not regress)

- Arabic shaping and BiDi: contextual joins in all 10 stills and all strips; `الـpartition` (title on F3 reads correctly with the Latin run to the left of the tatweel), `الـquery`, `الـroadmap`, `الـidempotency`; Western digits; RTL order of `5 ثوانٍ مقابل 57`; U+2212-style minus now reads as a true minus in `lag = 11 − 7 = 4`. Tashkeel clearance rule works (F5).
- F3 now has depth (P2/P1 receding planes, violet haze, bloomed bracket) and a hero element (`lag` formula plus the 4 at 150 px). F2 now fills the frame and the dropped rows are labelled without clipping. F4 cards are legible at 960 px (0.165 / 0.227 with Arabic labels at 36 px).
- Cost is controlled for stills: 1.5-2.2 s each; F4-hero 4.5 s.
- Microcopy is now verbatim S1 narration (r0 issue 9); still needs the egyptian-arabic and fact-checker pass because S1 voice is ADR-001-dependent. Offsets in F3 and galaxy positions in F4 remain schematic (README finding 5) and must stay unlabeled as data.

## Gate view

| Item | Threshold | Measured | Status |
|---|---|---|---|
| Look rubric mean (10 stills) | >= 8.0 | 7.61 (F1-F6: 7.81) | fail |
| AI-Unpacked parity read | >= 7.5 | 7.1 | fail |
| Min single criterion | >= 6 | 5 (F4-hero cost) | fail |
| Arabic shaping errors | 0 | 0 shaping, 0 diacritic collisions; 1 slab/label overlap (F5) | fix |
| Render cost vs R5 (0.201 box s/frame) | within budget | MB-standard 0.380, MD 0.257, MC 0.216 (measured under load) | over |

To pass: fix issues 1-4 (the new and weakest frames and the MB cost), 5-6 (cheap), and add a standard-tier camera move plus one impact beat (issue 9). Expected effect: F7/F8 to 7.7+, F2/F3 parity to 7, parity read to about 7.6, look mean to about 8.0. Re-score after those; I would keep F1-F6 scores as they stand (calibration unchanged since r0).
