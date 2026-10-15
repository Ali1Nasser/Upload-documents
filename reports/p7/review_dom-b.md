# P7 critic review: group dom-b

Date: 2026-10-10. Reviewer: critic (not the author). Verdict: FAIL (nothing reviewable).

Components: DeadlockCrossing, PageScan, AppliedSteps, SampleScoop, ABSplit, WireTangle,
ModuleClusters, ComplexityRace, HashBuckets, StatusStamp, KeycardDoors.

## What was checked
- studio/test/baselines/<Name>/ for all 11: none exists (only KineticWord, NumberCounter, TableGrid are baselined).
- studio/src/components/<Name>/: each holds only the frozen schema.ts. No component.tsx, no meta.json.
- reports/p7/: no dom-b demo strip. docs/p7/catalog_status/dom-b.md (0aab979) is the author's deferral note and build plan only.
- reports/sync/at13.md does not exist, so AT-13R has not run. The ADR-011 chair record in
  harness/state/decisions.json bars fan-out beyond KineticWord, NumberCounter and TableGrid until it passes.

## Judgement on the deferral
The author's reason is correct and consistent with the chair record and with the dom-a reviews. Building the 11
components now would be a rule break, not progress. The critic accepts the deferral as process-compliant.
It does not make the components reviewable. Deferred is not approved.

## Scores
None. There is no render for any component, so a score would be invented. Each is 0 / unreviewed.
No meta.json was written or changed. No component is set to approved-critic.

| Component | Score | Status |
|---|---|---|
| DeadlockCrossing | unreviewed | deferred |
| PageScan | unreviewed | deferred |
| AppliedSteps | unreviewed | deferred |
| SampleScoop | unreviewed | deferred (data gap D2) |
| ABSplit | unreviewed | deferred (data gap D1) |
| WireTangle | unreviewed | deferred |
| ModuleClusters | unreviewed | deferred |
| ComplexityRace | unreviewed | deferred |
| HashBuckets | unreviewed | deferred |
| StatusStamp | unreviewed | deferred (engine note E1) |
| KeycardDoors | unreviewed | deferred |

## Blocking issues
1. All 11: no baseline stills (studio/test/baselines/<Name>/ absent). Legibility at 1080p, palette discipline, depth and light,
   visual verb, Arabic correctness, bullet-slide look and legacy-frame use cannot be judged.
2. All 11: no implementation. Only schema.ts exists in studio/src/components/<Name>/.
3. Process: AT-13R not passed (no reports/sync/at13.md). Order of work: render-ops AT-13R renders, sync-verifier at13.md,
   chair records the pass, then the motion-engineer builds dom-b.

## Pre-review notes for the build (not scored)
- Contamination risk: git status shows uncommitted, untracked fx-b files in the shared tree
  (studio/src/components/{AudioReactive,CameraRig,DepthLayers,FXTier}/*.tsx, components/families/fx-b.ts, demos/fx-b.tsx).
  If another group is also building, AT-13R's "clean, pinned studio/ tree" is already at risk. The chair or render-ops
  should pin a commit or worktree for AT-13R and confirm that fx-b files are excluded.
- Data gaps D1 (ABSplit) and D2 (SampleScoop) need a fact-checker ruling before any number is shown. Do not invent A/B rates or n.
  Arithmetic over d:5.2:1..6 is not a listed fact.
- StatusStamp E1 (no target rect in LayerCtx) is an engine question. Stamping in the layer's own slot is acceptable if the
  scene-director places it.
- When resubmitting, give 4 stills per component (p0, a1, p50, p100) at 1080p, Arabic QA output (StatusStamp label_ar,
  KeycardDoors labels, DeadlockCrossing account names), and a demo strip. Check that HashBuckets and AppliedSteps do not
  read as a list or table slide, that ComplexityRace stays LTR with Western numerals only where the spec allows, and that
  WireTangle and PageScan show depth and light, not flat diagrams.
- Pass needs a mean >= 8.0 over the 06 section 3.2 rubric and a minimum >= 7 with no blocking issue.

---

## Round 2 (2026-10-10, critic, fresh read)

Verdict: FAIL (still nothing reviewable). Scores: none. No meta.json written or changed. approved-critic: none.

### Re-check of Round 1 blockers
1. Baselines: studio/test/baselines/<Name>/ still absent for all 11 (only KineticWord, NumberCounter, TableGrid, plus an untracked CameraRig dir that is fx-b, not dom-b).
2. Implementation: studio/src/components/<Name>/ for all 11 still holds only the frozen schema.ts. No component.tsx, no meta.json, no demo strip under reports/p7/.
3. Process gate AT-13R: reports/sync/at13.md still does not exist and no chair record of a pass appears in harness/state/decisions.json
   (the last HEAD commits, 07ca84b and f8f4a5c, are deferral/re-check notes). ADR-011 bars fan-out beyond the three reference components until AT-13R passes.
4. Tree cleanliness: worse than in Round 1. git status still shows untracked fx-b work (AudioReactive, CameraRig incl. baselines, DepthLayers, FXTier, families/fx-b.ts,
   demos/fx-b.tsx, _structb/) and now also ArtifactChain/domc_kit.tsx and CalloutArrow/target.ts, plus modified harness state and the render job log.
   AT-13R needs a clean pinned RV1 engine; pin a commit or git worktree and exclude all of these.
5. Data gaps D1 (ABSplit) and D2 (SampleScoop): no fact-checker ruling found. Do not show any A/B rate or sample size until ruled.

### Scores
All 11 (DeadlockCrossing, PageScan, AppliedSteps, SampleScoop, ABSplit, WireTangle, ModuleClusters, ComplexityRace, HashBuckets, StatusStamp, KeycardDoors):
unreviewed. Legibility at 1080p, palette, depth and light, visual verb, Arabic, bullet-slide look cannot be judged without stills. A score would be invented.

### Required order (unchanged)
render-ops AT-13R renders from a pinned clean tree -> sync-verifier writes reports/sync/at13.md -> chair records pass -> motion-engineer builds the 11 dom-b components ->
4 stills per component (p0, a1, p50, p100) at 1080p, Arabic QA output, demo strip -> critic Round 3.
Pass bar for Round 3: mean >= 8.0 on the 06 section 3.2 rubric, minimum >= 7, no blocking issue.

---

## DeadlockCrossing — round 1 (2026-10-15, critic, not the author)

Verdict: APPROVED (7.2/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, scale 0.5) and DeadlockCrossing.tsx. No motion strip exists under reports/p7/, so motion was judged from code (march, retract, ease), not seen.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition | 7 |
| Palette and token discipline | 8 |
| Light and depth | 6 |
| Typography and Arabic | 8 |
| Legibility at 1080p (labels 32 px, chips 28-32 px, at the token floor) | 7 |
| Visual verb without narration | 8 |
| Not a bullet slide, no legacy frames, no numbers | 9 |
| Motion intent (code only) | 7 |
| AI-Unpacked parity | 6 |

### What works
- p50: two solid red tethers with cyan padlocks versus two dashed warn arrows closing a ring, with a DEADLOCK chip at the centre. The cycle reads as a loop.
- p100: B recedes (dim, smaller) with a ROLLBACK chip, A's wait becomes a solid green grant and its padlock turns green, and A keeps the cyan hold on row 1.
- Arabic "الصف الأول" and "الصف التاني" are whole connected words through MixedText. No digits, so nothing is unsourced.

### Non-blocking issues, ordered by impact
1. p50, DEADLOCK chip (centre): a small chip in a large empty middle. The key beat has no light event. Add a crit bloom or vignette pulse behind the ring and a 2-3 % camera push on the chip anchor. Light and depth are the weakest scores (6).
2. p0/a1/p50, row blocks: the X crossing lines read as a broken-image placeholder. Replace them with a rail-crossing glyph (two rails and a sleeper, offset from the label) or lower the X stroke to a texture level.
3. All stills, trains: each session is a single capsule with two dots. "Train" is not legible. Add 2-3 trailing coupled cars, or a motion trail, behind the capsule.
4. p100: the layout becomes asymmetric (B fades low, large void bottom-left and bottom-right). Keep B on the ring and fade it in place, or recentre the group.
5. p50: both sessions are amber while the edges are crit. Tint the session rim crit-ish on the cycle so the "stuck" state sits on the trains too.
6. Process: add a demo strip (frames 6, 24, 60, 104, 124, 167) to reports/p7/ so motion can be verified, and write baselines at 1080p for the next critic round. Required before the pilot, not before this approval.

## PageScan — round 1 (2026-10-15, critic, not the author)

Verdict: APPROVED (7.5/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, scale 0.5), reports/p7/snap/PageScan.jpg and PageScan.tsx. No motion strip exists, so motion (read head sweep, 3 hops, arc landing) was judged from code and the stills, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition (grid top 74 %, counter lane free) | 8 |
| Palette and token discipline (signal cyan reads, ok green hit, grey unread) | 8 |
| Light and depth | 6 |
| Typography and Arabic ("صفحة اتقرت" / "صفحات اتقرت" whole connected words; mono chips) | 8 |
| Legibility at 1080p (chips ~28 px, tiles ~50 px, counter label ~36 px) | 7 |
| Visual verb without narration | 8 |
| Not a bullet slide, no legacy frames | 9 |
| Numbers (12 470 / 3 are NumberCounter refs, none in the component) | 9 |
| Motion intent (code plus stills) | 7 |
| AI-Unpacked parity | 6 |

### What works
- p100: left slab is almost all dark, one green page lit by a cyan root-branch-leaf path and a green arc, against a right slab where every page is cyan. "3 versus all" reads with no narration.
- p50: the read head sits at the lit frontier of the full scan with the hit page already green, and the counter lane under it is clean.
- Dark unread pages make the count visible as a picture, as the author intended.

### Non-blocking issues, ordered by impact
1. p100, right slab: 60 identical cyan tiles read as a flat wall; 12 500 has no sense of scale. Add a faint pile or edge-stack under the slab (2-3 offset plates) or an ellipsis fade at the slab edge, and a brief crit-tinted bloom as the last page lights.
2. p50, read head: the wedge is faint and one tile wide at 960 px. Widen to about 2.5 tiles and lift its start opacity from 0.3 to about 0.45, plus a trailing blur on the lit frontier.
3. p100, tree: the nodes are about 14 px at 960 (28 px at 1080p), so the three-level index is small next to two large slabs. Scale the glyph by 1.3 and let the tree breathe into the empty band below it.
4. a1 versus p50: column count changes (11 to 10 on the left, 12 on the right) as the slot boxes ease in, so tiles visibly reflow during entrance. Compute the layout from the final box, or hold it until the slot settles.
5. Process: add a demo strip (frames 0, 11, 40, 101, 150, 203) to reports/p7/ and write baselines at 1080p before the pilot.

## AppliedSteps — round 1 (2026-10-15, critic, not the author)

Verdict: APPROVED (7.2/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite tier, scale 0.5), reports/p7/snap/AppliedSteps.jpg, AppliedSteps.tsx and schema.ts. No motion strip exists, so the select travel, RV1 onset and the table clean-up were judged from code plus the three live stills, not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition (two plates, strip on the RTL start side, table opposite) | 7 |
| Palette and token discipline (all C tokens: signal lit, ok applied, warn dirty, crit duplicate) | 8 |
| Light and depth | 6 |
| Typography and Arabic (six Egyptian labels, whole connected words, mono Latin kind chips in an aligned column) | 8 |
| Legibility at 1080p (labels ~34 px, chips ~24 px) | 7 |
| Visual verb without narration (dirty to clean as the lit frame advances) | 8 |
| Not a bullet slide, no legacy frames | 7 |
| Numbers (none drawn; counts left to NumberCounter) | 10 |
| Motion intent (code plus stills) | 7 |
| AI-Unpacked parity | 6 |

### What works
- a1 vs p50 vs p100: the table is truly "as of" the selected step. Orange cells remain only in the columns whose step is not yet applied (p50, group column), the red duplicate rows shrink as dedupe/filter apply, and at p100 the table is fully grey with a green rim and a GROUP chip. Cause and effect reads with no narration.
- p50: lit frame has signal border, glow and chip, applied glyphs turn green, upcoming steps dim, and the beam fans from the lit row to the table.
- Arabic is correct and idiomatic (شيل المسافات الزيادة, امسح الصف المكرر, اجمع حسب العميل), RTL order right, Latin chips isolated.

### Non-blocking issues, ordered by impact
1. Depth and light (all stills): two flat glass slabs on a near-black vignette, no particles, no parallax, no light on the table side except the thin green rim. Add a soft lit-frame bloom spilling onto the neighbouring rows, a faint floor reflection under the plates, and a few drifting dust motes behind the beam.
2. Film-strip read (p50, strip region): rows are separated only by dashed lines, and the sprocket holes are ~16 px dark squares at the edges, so it reads closer to a list than a strip. Draw each row as a frame cell (rounded border, inter-frame gap of ~6 px) and brighten the sprocket holes next to the lit frame.
3. Frame fill (all stills): the content occupies about 60 % of the width and 45 % of the height, with ~30 % empty void above and below. Let plateH grow with the slot (bigger row pitch) so labels reach ~40 px at 1080p.
4. p50, FILTER and GROUP rows (upcoming steps): ink3 at 0.5 opacity is about 3:1; at 1080p the Arabic hairlines are weak. Raise the floor from 0.5 to about 0.65.
5. p100, table region: the clean end state is a plain grey grid with only a border change; the payoff "clean" has no moment. Add a brief ok-green sweep across the table when allQ reaches 1, and let the group step visibly merge rows rather than only highlight a column.
6. First select (code, bar and beam at selY = -1): the lit bar and beam start one row above the first step, i.e. over the APPLIED STEPS chip while opacity ramps. Start the bar at index 0 (or clamp the beam origin) so it never crosses the header.
7. Process: p0 baseline is an empty frame (entrance not started), so it protects nothing. Move it to a frame where the first plate has entered, add a strip (frames 0, 11, 40, 83, 120, 167) to reports/p7/, and write 1080p baselines before the pilot.

## SampleScoop — round 1

Verdict: APPROVED (7.3/10, no blocking issue). meta.json set to approved-critic.
Looked at: baselines p0, a1, p50, p100 (960x540, lite, scale 0.5), reports/p7/snap/SampleScoop.jpg strip of the four frames, SampleScoop.tsx and schema.ts. No true motion strip exists, so the lift arc, mean-drop line and return-to-pool were judged from code plus stills (p50 lit dots in pool, p100 rings at origins with dots in beaker), not seen live.

### Scores (06 section 3.2 plus component acceptance)
| Criterion | Score |
|---|---|
| Composition (dish right, beaker and histogram on the RTL end side) | 6 |
| Palette and token discipline (C tokens only; signal lit, violet reserved for strata/clusters) | 8 |
| Light and depth (rim light, floor shadow, seeded dot size/tone/halo, liquid) | 7 |
| Typography and Arabic (`5 000 طلب` as one LTR isolate plus Arabic unit, correct RTL order; Latin mono method chip) | 8 |
| Legibility at 1080p (population label ~34 px, dots ~10 px, blocks ~48 px) | 7 |
| Visual verb without narration (scoop lifts into beaker, block drops onto histogram, stack grows) | 8 |
| Not a bullet slide, no legacy frames | 8 |
| Numbers (only the sourced population prop; dots/histogram carry no quantity, no axis, no digits) | 9 |
| Motion intent (code plus stills) | 7 |
| AI-Unpacked parity | 6 |

### What works
- a1 to p50 to p100: lit dots in the dish, liquid rising in the beaker, blocks stacking (p100 has a 2-high bin) tell sampling-distribution assembly with no words. Lit dots return to the pool between draws (independence).
- Dish has a real top face, wall, floor shadow and upper-right rim arc; near dots carry halos.
- Arabic population label is correct; digits are Latin tabular with a thin group space, the unit sits outside the isolate.

### Non-blocking issues, ordered by impact
1. Composition (all stills, lower-left): beaker and histogram are disconnected from the dish, and ~35 % of the frame between beaker foot and histogram is dead. Raise the histogram toward the beaker (histY ~0.80) and widen it, or add a faint pour-lane glow between dish and beaker.
2. p50/p100, histogram region: the blocks are 0.62 signal fill on a near-black plate and the 7 px base slab is nearly invisible; at 1080p it reads as a small footnote. Enlarge blockH by ~1.4 and brighten the base line.
3. Depth (all stills): no drifting motes or parallax behind the dish; dots are all one plane apart from size. Add 20-30 far motes and a slight dish tilt/camera drift.
4. a1, beaker: liquid is a thin sliver at 11 frames and the 'random' chip floats over the rim; nudge the chip up ~8 px and give the empty beaker a faint inner back-wall tint.
5. p0 baseline is an empty frame; move to a frame after the first entrance, add a motion strip (frames 11, 30, 50, 75, 107, 150, 215) under reports/p7/, and write 1080p baselines before the pilot.
6. The mean-drop dashed line (stroke 2 px, 0.8 opacity) is not visible in any still; confirm in a strip and thicken to ~3 px if lost at 1080p.
