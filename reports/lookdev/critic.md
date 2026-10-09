# P6 look-dev critic report (G6a input)

Critic pass on the P6 style frames and motion tests. The critic did not author the look-dev.
Method: contact sheet (`contact.jpg`) plus full-size reads of F1-A-hero, F2-A-hero, F3-A-hero, F4-A-hero, F5-A-hero, F5-B-standard, F6-A-hero, F6-B-standard, F6-C-standard, F1-C-standard, and motion contact frames MA-hero, MB-hero, MB-standard, MC-hero (docs/plan/06 §3.2 look rubric, §3.3 parity read). Frames not opened at full size were scored from the contact sheet only. The MP4s themselves were not played; motion is judged from 4-frame strips.
Scores are 1-10; scores are for the stills as authored. Calibration: this is the first look-dev read, so the numbers are provisional; re-score once three chapters of previews exist (06 §3 calibration rule).

## Verdict: FAIL for G6a as it stands (look mean 7.4 < 8.0; parity 6.9 < 7.5)

Gate G6a wants look mean >= 8.0 and parity >= 7.5. The base is strong (palette, Arabic shaping, number/type hierarchy, cost). It misses on light and depth in the flat stills, one real Arabic diacritic collision, several unreadable micro-labels, and the fact that four of six families read as UI diagrams rather than scenes. All fixes are cheap (CSS/layout). Re-run the 6 families after fixes; the target is >= 8.0 without any re-architecture.

## Scores per family (candidate A, standard / hero)

Criteria order: composition, palette discipline, light and depth, typography, legibility, AI-Unpacked parity, render cost (inverse; 10 = about 1.3 s/still).

| Family | Std (comp/pal/light/typo/leg/parity/cost) | Std mean | Hero mean |
|---|---|---|---|
| F1 cold open | 7/8/6/8/8/6/10 | 7.57 | 7.71 |
| F2 SQL funnel | 6/8/7/8/7/6/10 | 7.43 | 7.57 |
| F3 Kafka | 7/8/6/7/6/5/10 | 7.00 | 7.14 |
| F4 RAG galaxy | 7/8/8/7/5/7/9 | 7.29 | 6.86 (cost 5, legibility 4 under 4,000 points) |
| F5 Docker | 8/9/7/6/7/7/10 | 7.71 | 7.86 |
| F6 kinetic type | 8/8/6/9/8/7/10 | 8.00 | 8.14 |

Per typography candidate (mean over the 6 families, standard tier unless noted):

| Candidate | Look mean | Notes |
|---|---|---|
| A Alexandria / Inter Tight, standard | 7.50 | Best impact and glow; heavy display weight reads as AI-Unpacked |
| A hero | 7.55 | FX gain is nearly invisible except on F4 (and there it costs legibility) |
| B Readex Pro / Space Grotesk | 7.40 | Cleaner, more neutral, slightly less punch; Space Grotesk digits wider but fine |
| C Plex Sans Arabic 700 / Inter Tight | 7.15 | Safest legibility, weakest impact: "وغلط" in F6-C is visibly lighter and smaller than A/B |

Overall (24 frames): look mean 7.4, minimum single criterion 4 (F4-A-hero legibility). Parity read: depth and light 6.5, camera life 7.0 (from MB/MC strips; stills cannot show it), kinetic-type integration 7.5, metaphor concreteness 7.5, rhythm/impact 6.0 (impacts only measurable in MA, which is type-only). Parity mean 6.9.

## Ranked recommendation

### Font pairing
1. **A (Alexandria 700 display + Inter Tight 700 + JetBrains Mono + IBM Plex Sans Arabic 500-600 labels).** Best fit to the target look: heavy, glowing, contextual forms joined correctly in every frame (F1-F6, MA f200). Conditions: keep `word-spacing: 0.08em` (the ر tail crowding), and cap Alexandria at display sizes >= 56 px; below that use Plex Sans Arabic 600.
2. **B (Readex Pro).** Acceptable fallback. Its Arabic is the cleanest at 48-56 px and Space Grotesk digits pair well with Readex x-height (F5-B, F6-B). Pick B only if the Arabic-typographer finds ر/ي collisions in A at real script.
3. **C.** Reject for display (F6-C impact word loses weight; F1-C title reads as a caption). Keep Plex Sans Arabic as the label/body face in A and B (it already is).

Decision needed from the Council (ADR-003): A as display, Plex Sans Arabic as label face, JetBrains Mono for code/numbers. Do not mix B and A within a chapter.

### FX tier defaults
- **Standard is the default for everything.** At 1.2-1.5 s/still and 0.4-0.65 s/frame it is cheap, and the CSS-only "hero" differences (glow 10/32 vs 6/18, CA 0.6 px, grain 1.5 vs 1.2) are not distinguishable at contact-sheet scale (compare F1-A-standard vs F1-A-hero, F2, F3, F5, F6).
- **Lift the CSS glow/haze/CA toward the hero values inside "standard"** (free per findings 2). The visible gap today is light and depth, not render cost.
- **Hero = real-time WebGL only for short beats** (the galaxy, a camera push, cold-open reveal). Hero must not mean "denser particles": 4,000 points made F4-A-hero less legible than F4-A-standard (white points under the title and the 0.165 card), at 2.2x the still cost and 4.5x the per-frame cost (MB-hero 2.71 s vs MB-standard 0.61 s).
- Long galaxy shots use the SVG standard tier or a pre-rendered P10 plate. Do not mix GL backends within a shot (swiftshader only), as the findings say.

### Hero share
- Hold the 15 % ceiling from 04 §5; plan **8-10 % hero on average**, up to the cap only for CH-00 (cold open), the RAG chapter (CH-33) and the 3 to 4 big transitions. At 2.7 s/frame (MB-hero) every extra 1 % of a 3 h film is about 3.2 box-hours; the producer should cost this against the 24 h budget before ADR-002 freezes.
- Whip-pan transitions (MC) are standard-tier cost (0.65 s/frame) and give the strongest "living camera" moment; use them liberally instead of spending hero share.

## Issues to fix before freeze (ordered by impact)

1. **F3-* (all 12 variants incl. F3-A-hero): flat and widget-like; parity 5.** The Kafka partition rows are the only depth cue; nothing lights up or moves in frame. Fix: add a foreground/background layer split (blurred far partition P2 at 60 % scale, crisp P0 with a bloom on the lag bracket), enlarge offset cells by 1.4x and digits to >= 18 px at 1080p (current 0-11 digits ~12 px are unreadable at 960 px), and make `lag = 11 - 7 = 4` the hero element (28 px+, count-up anchored to a word id). The bottom Arabic formula box has an empty left half; fit the box to its text or move the consumer-group chip into it. Also use a proper minus sign (U+2212) rather than hyphen in the lag formula.
2. **F5-A-hero, F5-A/B/C-standard: Arabic diacritic collision.** The tanween kasra under ن in `ثوانٍ` (title line) lands on the subtitle `تعديل سطر واحد` between `سطر` and `واحد` and reads as a stray stroke over the subtitle (clearest in F5-A-hero, visible as a bracket in F5-B-standard). Fix: increase title-subtitle vertical gap by >= 0.3 em (or line-height >= 1.6 for any Arabic line carrying diacritics) and add an auto-fit rule in `studio/src/type/` that reserves descender clearance for tashkeel. This is a P7 requirement, not just a copy fix.
3. **F4-A-hero (and -standard): legibility 4-5.** The 0.165 card is intentionally dimmed but is only about 30 % contrast against particles; `من غير توسيع` / `مع توسيع الـquery` microcopy is about 11 px and unreadable at 960 px; in the hero tier, white points cross the title and the bottom caption pill. Fix: raise the dimmed card to >= 55 % opacity and 18 px minimum for all micro labels; add a radial dark scrim behind the title (text-safe zone mask on the particle field); in hero cap points within the title/caption rectangles at 30 % density.
4. **F2-*: composition imbalance and clipping.** The upper centre (x 550-1500, y 250-500) is empty; the funnel occupies a quarter of the frame and only three of nine stages are populated, so the "9 stages" idea (`9 مراحل منطقية`) is not seen. Callouts `1010 . refunded` are clipped by the SQL panel (y about 655 at 1080p) and `1004 . cancelled` crowds the stage chips. Fix: scale the funnel dots and bracket 1.6x and centre it; move the removed-rows callouts to the right of the WHERE column; shrink the SQL panel so nothing overlaps.
5. **Light and depth are mostly on type, not on objects (F1, F2, F3, F5).** Only F4 has real depth. F1's box is a flat grey volume with no rim light and the receipts (the strongest metaphor) are small; the table has two empty rows and a quarter-empty footer. Fix: add a rim/under-light and an emissive lip to the box, enlarge the receipts to about 1.5x, light the table rows from the receipts' path (no empty dashed rows in the idle state), and add a haze layer between table and background with parallax planes (the DepthLayers contract).
6. **MA f299 (MA-hero, MA-standard): orphaned dim `0.165` at top-left** after the counter finishes. It reads as a leftover rather than an intentional receding number. Fix: either fade it out or anchor it as a ghost beside the new `0.227` target; same in MB f200-f299 where the 0.165 card dims behind the particles.
7. **MC f147-f153: transition hold.** The streak/blur is excellent, but the incoming scene (f153) is still motion-blurred and slightly lifted in black level (grey wash). Fix: ease the blur to 0 by the cut + 3 frames and keep black level at the tier's base. Keep 520 ms, it is a good rhythm.
8. **F6-C-standard / F1-C-standard: C display weight too light for the impact word** (see pairing). Only relevant if C were chosen; moot if A is frozen.
9. **Authored microcopy flagged in README finding 5** (not canon): `بيشيل قبل أي حساب`, `9 مراحل منطقية`, `الترتيب الموثّق`, `كاش الطبقات`, etc. need the arabic-typographer/fact-checker pass before freeze; the critic has not verified them.
10. **Missing from the look-dev set (cannot be scored):** an Egyptian-city or "Holo-City" style hero, the portal/TripleGate ignition (04 §6), and a shot with a camera orbit and kinetic Arabic word at the same time. Add one frame of each so G6a is not decided on dashboard-style families alone.

## What already works (do not regress)

- Arabic shaping: joined contextual forms in all 24 stills; whole-word reveals (MA); RTL order of `واثق وغلط وضعيف`; Latin isolates (`roadmap`, `job`, `COPY . .`); tatweel joins (`الـpartition`, `الـquery`, `الـroadmap`); Western digits; `5 ثوانٍ مقابل 57` correct read order in RTL.
- Palette discipline: cyan = focus, green = good, red = failure, amber = warning/secondary, violet for partitions. Hero numerals (F2 `11 rows`, F5 `57 s` vs `5 s`, F6 `0.165 -> 0.227`) are legible at 960 px and carry the idea in one glance.
- F5 and F6 are the closest to the target (7.7-8.1). Use F5's isometric layer slabs and F6's kinetic-type hierarchy as the template for the other families.
- Camera: MB push with orbit and parallax planes, and the MC whip-pan, convey a living camera; the MB-hero bloom on the galaxy has the right cinematic feel.
- Cost: standard tier is essentially free in CSS; the R3F first-frame bug is documented with a warmup fix.

## Gate view

| Item | Threshold | Measured | Status |
|---|---|---|---|
| Look rubric mean (24 stills) | >= 8.0 | 7.4 | fail |
| AI-Unpacked parity | >= 7.5 | 6.9 | fail |
| Min single criterion | >= 6 | 4 (F4-A-hero legibility) | fail |
| Arabic shaping errors | 0 | 0 shaping, 1 diacritic collision (F5) | fix |
| Projected render time | budget 24 h | not computed here (producer) | open |

Re-score after items 1-5 are applied. No change to the typography candidate is required for the gate; the failure is composition, depth and micro-legibility.
