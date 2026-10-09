# P6 look-dev critic report, round r3 (G6a input)

Fresh critic invocation; the critic did not author these frames. Same criteria, table format and calibration as `critic_r1.md` / `critic_r2.md`.
Method: `reports/lookdev/r3/contact.jpg`; all 10 stills at full size (F1, F2, F3, F4-standard, F4-hero, F5, F6, F7, F8, F9) plus a 2x crop of F7 tags; all 5 strips (MA, MB-standard, MB-hero, MC, MD, 8 frames each); `r3/perf.json` for cost. MP4s were not played; motion is judged from strips.
Calibration (unchanged): 9 = could cut into an AI-Unpacked film (volumetric light, real DOF, type living in the scene); 7 = clean premium dark UI with glow and some depth, still a diagram; 5 = flat widget with one lit element. Nothing here is a 9 except F6 typography. A score moved only where I can point at a visible change from r2.

## Verdict: PASS for G6a look-dev thresholds, marginal (look mean 8.01 >= 8.0; parity read 7.5 >= 7.5; min criterion 7 >= 6; 0 shaping errors; cost within R5 on 5 of 5 motion shots)

The margin is razor thin on two numbers (8.014 and 7.50). I would not read it as headroom: the set is still "premium dark UI with glow and one real 3D scene (F7)", not AI-Unpacked parity. What moved the numbers: the cost fix (F4-standard cost 6 -> 9), the F4 mask artefact is gone, the F7 and F8 fixes, the hero tier now visibly different, and the second impact beat (MD "كلها"). Metaphor concreteness did not move (7.0).

## Scores per family (T-A)

Criteria order: composition, palette, light and depth, typography, legibility, AI-Unpacked parity, render cost (inverse; 10 = <= 0.2 box s/frame and < 1 s/still; 9 = within R5 under load, about 1 s/still or hero inside the H band).

| Family | Std (comp/pal/light/typo/leg/parity/cost) | Mean | r2 mean |
|---|---|---|---|
| F1 cold open (receipts, box, table) | 8/8/7/8/8/7/9 | 7.86 | 7.86 |
| F2 SQL funnel | 8/8/7/8/8/7/9 | 7.86 | 7.86 |
| F3 Kafka lag | 8/8/7/8/8/7/9 | 7.86 | 8.00 |
| F4 RAG galaxy, standard | 8/8/8/8/8/7/9 | 8.00 | 7.57 |
| F4 RAG galaxy, hero | 8/8/8/8/8/8/9 | 8.14 | 7.86 |
| F5 Docker layers | 8/9/8/8/8/7/9 | 8.14 | 8.14 |
| F6 kinetic type | 8/8/7/9/8/8/10 | 8.29 | 8.29 |
| F7 Holo-City | 8/8/8/8/7/8/9 | 8.00 | 7.71 |
| F8 TripleGate | 8/8/8/7/8/7/9 | 7.86 | 7.57 |
| F9 orbit + kinetic word | 8/8/8/8/8/7/10 | 8.14 | 7.86 |

Overall (70 scores): **look mean 8.01** (r2 7.87, r1 7.61); F1-F6 standard only 8.00 (r2 7.95); **minimum criterion 7** (r2 6). Parity column mean 7.3 (r2 7.1). No score is <= 6, so no mandatory fix citations; the 7s are discussed in the issue list.
F3 went down 0.14: the P1/P2 rows are now readable but less defocused, so the depth separation is smaller (light 8 -> 7).

### AI-Unpacked parity read (1-10)

| Criterion | r3 | r2 | Evidence |
|---|---|---|---|
| Depth and light | 7.5 | 7.5 | F7 emissive windows and glowing route; F8/F9 cones plus floor reflections; MB-hero foreground bokeh. Objects are still not lit by scene lights; no DOF on subjects |
| Camera life | 7.5 | 7.5 | MA push + track, MB push, MC whip-pan (best moment), MD yawed push. MB-hero now differs visibly from standard at f171-f239 (foreground bokeh), r2's "indistinguishable" is fixed, but the camera move itself is the same |
| Kinetic-type integration | 7.5 | 7.5 | MA glow on وغلط, MD cyan كلها with flare, F6 hierarchy. F1-F5 titles are still headers above diagrams |
| Metaphor concreteness | 7.0 | 7.0 | F7 city, F1 box and receipts, F5 slabs concrete. F2 area chart, F3 cell row, F8 rings, F4 scatter plot remain widget or abstract |
| Rhythm and impact | 8.0 | 7.5 | Two beats now land on stressed words: MA f103-f105 burst, MD f262 flare + nudge + burst on كلها. MB has no impact beat; MC streak is a transition |
| **Mean** | **7.5** | 7.4 | Gate 7.5, met exactly |

## Issues remaining, ordered by impact

1. **MA-standard opening is still near-empty (rhythm, composition).** f0 and f4 show only a 56 px caption box (about x 262-426, y 130-185 at strip scale, mid-frame); f34 is title only; the numeral `0.165` does not appear until f91 (3.8 s). That is about 3.5 s of the weakest picture in the set; r2 issue 6 is fixed for MD but not for MA. Fix: start the `0.165` numeral blurring in from f0 at its final position (x 213-780, y 700-860 in full-frame terms) and let the title arrive by f10.
2. **F7-standard: `6 الـAI` tag legibility (x 418-505, y 280-305).** Shaping is correct, but the Latin `AI` abuts the tatweel and "ال", so the chip reads "AIJI 6" at 1x (confirmed on a 2x crop). Fix: set `AI` in the display weight with 4 px side-bearing, or render the tag as `6 الذكاء (AI)` per canon, or enlarge to 34 px. Minor: the district-1 leader line (x 1030-1140, y 325-380) crosses the tower base; the faint far bars at the top right (x 1560-1900, y 20-200) sit behind the title tail "كلها" and soften its left edge.
3. **F4-hero bokeh discs are neutral grey and muddy.** x 1200-1350 / y 650-780, x 1090-1190 / y 740-840, x 390-465 / y 500-575 and x 1590-1690 / y 310-410 read as flat grey/tan discs, off palette and dirtier than the cyan/violet field around them. Fix: tint to cyan/violet and use additive blend with a brighter rim; keep the three large discs below 25 % opacity. Also make one foreground element cross the frame in MB-hero (parallax at about 3x plate speed) so the tier gain is visible in motion, not only per still.
4. **F3-standard: depth dropped after the lighter defocus.** The P2 row (x 305-1115, y 215-310) and P1 row (x 230-1115, y 335-450) are now almost as sharp as P0; digits 0-9 are about 14 px (y 280-295 and 410-425) and still unreadable at 960 px, so they are noise, not information. Fix: either re-add 1.5-2 px blur to P2/P1 only and drop their digits, or enlarge digits to 24 px. Also clip: the P1 cell at x 1010-1100 is cut by the cyan offset line at x 1100.
5. **F8-standard / MD: gates are still rings.** Reflections, packets and the ghost title fixed r2's flat portals; what remains is metaphor 7: three rings on a floor, no object passing "through" and being changed. The ghost title (x 580-1795, y 95-165) at about 35 % contrast reads as disabled in the still (fine in motion, as it hands over at f248). The labels still step down (y about 760, 805, 860) and "خليها موثوقة" (x 865-1240) nearly touches the third label (x 1335-1735); align baselines to one y or tie each by its leader tick at the same offset. Fix idea: let a receipt (F1 asset) travel gate to gate and change state at each gate; that is also the cross-chapter callback.
6. **F1 and F2 stay "glowing dashboards" (parity 7).** F1: bottom 250 px (y 830-1080, x 0-1100) is empty; the box interior is still flat dark glass (x 1310-1740, y 640-890). F2: bar of dots is a chart; add camera parallax or a falling-row animation on the two red rows (the arcs at x 580-740, y 200-420 are static in the still). F5: 5 s / 57 s is shown twice (bars x 120-830, y 175-265 and big numerals y 890-1000); keep one.
7. **Cost caveat (does not change a score).** All five shots are inside R5 (MA 0.114, MB 0.132, MB-hero 0.201, MC 0.144, MD 0.132 box s/frame at loadavg 4.7-8.1, so conservative), blended 0.134 vs R2 0.24. But `perf.plates` is empty: the P10 plate bake (galaxy nebula, Bloom) is not in the per-shot figures. Render-ops must add the bake cost and the 240-frame JPG sequence disk (about 35 MB per 10 s plate at current sizes; disk is 5.4 GB free) to the chapter budget before P10.
8. **Pending, not scored:** `5 ثواني مقابل 57` display override (egyptian-arabic lens); F7 district order and names (act -> movement mapping; `Kafka` on district 4) await the fact-checker; offsets in F3 and galaxy positions in F4 are schematic and must stay unlabeled as data.

## What now works (do not regress)

- F4 mask artefact fixed: no dark rectangle behind `cosine similarity` (x 120-465, y 90-150) and a clean title band; cards 32 px legible at 960 px.
- F7: all seven district tags canon-labelled; `Kafka` chip now sits on the glowing metro route (x 1210-1350, y 790-850); tag 1 no longer overlapped by a tower; the lit/warm/dim three-state lighting is the best depth read in the set.
- F8/F9: floor reflections, four packets queueing at the first dark gate, leader ticks, flare on كلها (MD f262) with no CA on Arabic.
- F5: stacks aligned, the counter bars fill the upper-left void, the slab line no longer cuts "عاقل".
- F1: receipts carry a particle trail to the box; header labels now 28 px; NilePay caption fills the top-left.
- MB-standard: sharp points from f0, title at f34; MC whip-pan clean (incoming scene intact by f121, near-dip at f119-f120 acceptable).
- Arabic: 0 shaping errors, 0 diacritic collisions, BiDi and Western digits correct in all 10 stills and 5 strips.

## Gate view

| Item | Threshold | Measured | Status |
|---|---|---|---|
| Look rubric mean (10 stills) | >= 8.0 | 8.01 (F1-F6: 8.00) | pass (marginal) |
| AI-Unpacked parity read | >= 7.5 | 7.5 | pass (marginal) |
| Min single criterion | >= 6 | 7 | pass |
| Arabic shaping errors | 0 | 0 shaping, 0 diacritic collisions; 1 legibility defect (F7 AI chip) | pass |
| Render cost vs R5 (0.201 box s/frame) | within budget | 5 of 5 within (max MB-hero 0.201, hero band) | pass; plate bake not measured |

Recommendation: G6a may close on these numbers, but carry issues 1-3 into the P8 storyboard as acceptance items, since the pilot (G8) rubric is stricter (10 criteria incl. rhythm and polish) and the set has no 9s. Do not use this round's marginal 8.01 as a reason to relax the pilot bar.
