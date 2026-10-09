# P6 look-dev critic report, round r2 (G6a input)

Fresh critic invocation; the critic did not author these frames. Same criteria, table format and calibration as `critic_r1.md`.
Method: `reports/lookdev/r2/contact.jpg`; all 10 stills read at full size (F1, F2, F3, F4-standard, F4-hero, F5, F6, F7, F8, F9) plus pixel crops of F7 and F4; all 5 strips read (MA, MB-standard, MB-hero, MC, MD, 8 frames each); `r2/perf.json` and the r2 section of `README.md` for cost. MP4s were not played; motion is judged from strips.
Calibration (unchanged since r0): 9 = could cut straight into an AI-Unpacked film (volumetric light, real DOF, type living in the scene); 7 = clean premium dark UI with glow and some depth, still a diagram; 5 = flat widget with one lit element. Nothing here is a 9; F6 typography is the only 9. Scores were set from the frames, not from r1: a criterion moved only where I can point at a visible change.

## Verdict: FAIL for G6a (look mean 7.87 < 8.0; parity read 7.4 < 7.5; min criterion 6 passes; cost metric over R5 on 3 of 5 motion shots)

Real progress, nearly there on the stills. Every r1 issue is fixed or substantially fixed (F7 legible and lit, F8 tilted with light cones, F5 collision gone, F1 dead zone filled, F4 point field sharp from f0, MA impact beat lands, hero cost inside the H band). Min criterion rose 5 -> 6. What blocks: (a) look mean 0.13 short, held down by F4-standard cost, F8 and F7; (b) the standard-tier motion cost is still 1.1-1.7x R5; (c) metaphor concreteness is still 7 because F2, F3 and F8 read as widgets or rings; (d) a visible mask artefact in F4.

## Scores per family (T-A)

Criteria order: composition, palette, light and depth, typography, legibility, AI-Unpacked parity, render cost (inverse; 10 = about 1.3 s/still and <= 0.2 box s/frame; 6 = about 1.7x R5; 8 = inside the H band).

| Family | Std (comp/pal/light/typo/leg/parity/cost) | Mean | r1 mean |
|---|---|---|---|
| F1 cold open (receipts, box, table) | 8/8/7/8/8/7/9 | 7.86 | 7.71 |
| F2 SQL funnel | 8/8/7/8/8/7/9 | 7.86 | 7.71 |
| F3 Kafka lag | 8/8/8/8/8/7/9 | 8.00 | 7.57 |
| F4 RAG galaxy, standard | 8/8/8/8/8/7/6 | 7.57 | 7.57 |
| F4 RAG galaxy, hero | 8/8/8/8/8/7/8 | 7.86 | 7.29 |
| F5 Docker layers | 8/9/8/8/8/7/9 | 8.14 | 8.00 |
| F6 kinetic type | 8/8/7/9/8/8/10 | 8.29 | 8.29 |
| F7 Holo-City | 7/8/8/8/7/7/9 | 7.71 | 7.14 |
| F8 TripleGate | 7/8/7/7/8/7/9 | 7.57 | 7.14 |
| F9 orbit + kinetic word | 8/8/7/8/8/7/9 | 7.86 | 7.71 |

Overall (70 scores): **look mean 7.87** (r1 7.61); F1-F6 standard only 7.95 (r1 7.81); **minimum criterion 6** (F4-standard cost; r1 5). Parity column mean 7.1 (r1 6.7).

### AI-Unpacked parity read (1-10)

| Criterion | r2 | r1 | Evidence |
|---|---|---|---|
| Depth and light | 7.5 | 7.0 | F7 emissive windows, fog, glowing metro route; F8/F9 light cones; F3 rows genuinely defocused; MB point field sharp from f0. Still light on type and edges more than on objects; no real DOF on subjects |
| Camera life | 7.5 | 7.0 | MA push + track, MB push, MC whip-pan (still the best moment), MD orbit. MB-hero is indistinguishable from MB-standard at all 8 strip frames, so the hero tier adds cost but no visible camera or depth gain |
| Kinetic-type integration | 7.5 | 7.5 | MA word glow on وغلط (f103-f105), F9 cyan كلها, F6 hierarchy. Elsewhere the title is still a header |
| Metaphor concreteness | 7.0 | 7.0 | F7 city with canon labels and F1 box are concrete; F5 slabs fine. F2 is a dotted area chart, F3 a row of cells, F8 abstract rings, F4 a scatter plot. Unchanged |
| Rhythm and impact | 7.5 | 7.0 | MA f103 burst + flash is a real impact beat landing with the word. MD kinetic reveal has no secondary beat; MC streak is a transition, not an impact |
| **Mean** | **7.4** | 7.1 | Gate 7.5, short by 0.1 |

## Issues remaining, ordered by impact

1. **MB-standard cost 0.341 box s/frame (1.7x R5 0.201); MC 0.219, MD 0.252.** MA 0.197 and MB-hero 0.510 (H band top 1.038) pass. The plate removed the Bloom cost from the points but MB-standard still costs 1.7x: README attributes +8.7 % to the 10-ring `textSafeMask` (multiply blend over a video plate). Fix: pre-rasterise the mask to one static PNG alpha per layout (the mask is static except when a card moves) and `will-change` the plate; cache card layers; re-measure on an idle box (loadavg was 6-7.4). If still > 0.201, the Council should waive R5 for plate-based shots by ADR, not the critic. Drives F4-standard cost 6 (the min criterion).
2. **F4-standard and F4-hero: hard dark rectangle behind the `cosine similarity` chip, about x 460-555, y 80-160** (visible against the star field right of the chip, also in MB f34-f239 top-left). It is the mask feathering failing at the chip edge; reads as a dark panel. Also a darker band under the title edge near x 720-760, y 100-230. Fix: extend the ramp 1.75 x pad to 2.5 x pad on the chip, or tint the mask with the plate's nebula colour instead of black.
3. **Hero tier gives nothing visible.** MB-hero f0-f239 and F4-hero versus F4-standard differ by a handful of near-field points (for example F4-hero around x 1150-1210, y 420-460) at 1.5x the cost. Fix: spend the 360 live points on a visible parallax foreground (large soft out-of-focus sprites crossing the frame at 3x the plate speed), or drop hero for CH-33 and keep the budget (RT5 hero share 5 %).
4. **F8-standard: no title, flat portals, upper 30 % empty.** y 0-330 is only soft cones; the title does not arrive until MD f248 (F9). The three gates read as ellipses with no floor contact, no reflection, nothing passing through; the near gate (x 175-640, y 335-770) dominates, the label baselines step down 745/805/850 px with no tie to the gates. Fix: hold a ghosted title line at y 100-200 from f0 (or move the F8 frame to f248+), add a floor reflection ellipse per gate and 3-4 bright packets travelling gate to gate (the particle field between gates is only dots at x 650-870 and 1260-1400, y 400-650).
5. **F7-standard defects.** (a) District tag `1 الجهاز` (x 1080-1200, y 428-465) is overlapped by the top of the district-4 tower (x 1075-1150, y 440-560). (b) The `Kafka` chip (x 742-880, y 495-552) floats between districts, not attached to district 4 (x 840-1240); anchor it above the tower cluster or on the metro route. (c) `6 الـAI` (x 405-515, y 487-530): the Latin `AI` is correctly shaped but at 28 px it reads as `AIII`; set `AI` in the display weight or enlarge the tag to 34 px. (d) Upper-left 600 x 330 px is empty (only grid). The Arabic and BiDi are correct; the earlier concern is legibility, not shaping.
6. **MA and MD openings are near-empty.** MA f4 (only a 110 x 40 px caption at x 330-440, y 160-200) and f34 (title only, no numeral until f91); MD f0-f33 (ghost gates, no label until f33). Fix: start MA with the 0.165 numeral already blurring in (f0-f10), and let the MD gate row ignite from f0 with the title; the first 1.4 s of each is the weakest stretch of the set.
7. **F2 and F3 still diagrams (parity 7).** F2 bottom-left 1080 x 250 px (x 0-1080, y 830-1080) is empty and the SQL code panel (x 1090-1790, y 858-1050) is about 20 px mono at low contrast, unreadable at 960 px (acceptable only as texture; then blur it). F3: P2 row (y 220-290) is unreadable even as defocused texture; the light trail on message 11 (x 1535-1630, y 605-625) is barely visible, boost 2x.
8. **F5 asymmetry (minor).** The left stack sits 80 px lower than the right (top y 500 vs 420), leaving a void x 120-890, y 400-500 with only the red arrow; the labels sit at the same y, so the gap reads as a mistake. Align the stack tops or add the 12 s -> 57 s counter in the void.
9. **MC f119-f120** still reads as a near-dip (f119 mostly black with cyan streaks), improved from r1 but 20 % incoming light is only visible as the violet wash at the right of f120. Keep; low priority.
10. **Pending, not scored:** `5 ثواني مقابل 57` display override awaits the Council (egyptian-arabic lens); F7 district order/names (act -> movement mapping, `Kafka` on district 4) awaits the fact-checker. Offsets in F3 and galaxy positions in F4 stay schematic.

## What now works (do not regress)

- F3 depth: P1/P2 rows defocused with a violet haze, bracket + lag formula (150 px "4") as hero; message-slide trail is directionally correct.
- F5 collision and upper-left void fixed; the slab line no longer cuts `عاقل`; the bars to scale are a real mechanism read.
- F7 emissive window grid, lit/warm/dim districts, glowing route; the first frame of the set where lighting separates three states.
- MA f103-f105 burst: light-only, no CA on Arabic, lands on the word.
- MB-standard shows points from f0 (r1 issue 3 fixed); title slot clean; cards 32 px legible at 960 px.
- Arabic: 0 shaping errors, 0 diacritic collisions; caption breaking (<= 2 lines) works in F2 and F4; unit/arrow rules hold (`57 s`, `13 -> 11 rows`).

## Gate view

| Item | Threshold | Measured | Status |
|---|---|---|---|
| Look rubric mean (10 stills) | >= 8.0 | 7.87 (F1-F6: 7.95) | fail |
| AI-Unpacked parity read | >= 7.5 | 7.4 | fail |
| Min single criterion | >= 6 | 6 (F4-standard cost) | pass |
| Arabic shaping errors | 0 | 0 | pass |
| Render cost vs R5 (0.201 box s/frame) | within budget | MA 0.197 ok; MB 0.341, MC 0.219, MD 0.252 over (measured under load 6-7.4); hero 0.510 inside H band | over |

To pass: fix 1 (cost, which also lifts F4 cost 6 -> 8), 2 (F4 artefact), 4 (F8) and 5 (F7); that moves F4-standard +0.3, F8 +0.4, F7 +0.3, giving look mean about 8.0. Parity 7.5 needs one more impact beat in MD and a visibly different hero tier (items 3, 6). I would hold F1-F6 scores as they stand.
