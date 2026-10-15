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
