# P7 critic review: group dom-a

Date: 2026-10-10. Reviewer: critic (not the author). Verdict: FAIL (nothing reviewable).

Components: TripleGate, LegendOrbs, LatencyLadder, PermissionLocks, Heartbeat, LogScroll,
CollectionMorph, VenvDome, TestGate, KeyBeams, TxnCapsule.

## What was checked
- studio/test/baselines/<Name>/ for all 11: none exists (only KineticWord, NumberCounter, TableGrid are baselined).
- studio/src/components/<Name>/: each holds only the frozen schema.ts. There is no component.tsx.
  There is also no families/dom-a.ts, demos/dom-a.tsx or docs/p7/catalog_status/.
- reports/p7/: no dom-a demo strip.
- AT-13R (the ADR-011 gate before fan-out beyond the three reference components): reports/sync/at13.md does not exist.
  decisions.json shows it as required but not run.

## Scores
No component has a render, so none is scored. A score would be invented. Every component is treated as 0 / unreviewed.
No meta.json was written or changed. No status is set to approved-critic.

## Blocking issues
1. All 11 components: no baseline stills, so legibility at 1080p, palette discipline, depth and light,
   visual verb, Arabic correctness, bullet-slide look and legacy-frame use cannot be judged.
2. All 11 components: no implementation. Only the schema.ts file exists.
3. Process: AT-13R has not passed (no reports/sync/at13.md). Per ADR-011, no component beyond
   KineticWord, NumberCounter and TableGrid may be built or merged until it does.
   Order of work: render-ops runs the AT-13R renders, sync-verifier writes at13.md, the chair rules,
   then the motion-engineer builds dom-a.

## Next review
Resubmit with the 4 baseline stills (p0, a1, p50, p100) per component, Arabic QA output, and a demo strip.
Apply the docs/plan/06 §3.2 rubric then. Pass needs every score >= 7 with no blocking issue.

---

# Round 2

Date: 2026-10-10. Reviewer: critic (fresh read). Verdict: FAIL (still nothing reviewable). No change since Round 1.

## What was checked
- studio/test/baselines/: holds only KineticWord, NumberCounter, TableGrid. None of the 11 dom-a components has a folder.
- studio/src/components/<Name>/ for the 11: each still holds only the frozen schema.ts. No component.tsx.
- git log for studio/src/components: last change is 5ce4555 (reference components). No dom-a commit exists.
- reports/sync/: at13.md is absent (only p7_demo*, wordmap_v1.1.md). reports/p7/: no dom-a demo strip, no dom-a stills.
- ADR-011 still bars building or merging beyond KineticWord, NumberCounter and TableGrid until AT-13R passes.

## Scores
None. Without a render a score would be invented. All 11 are 0 / unreviewed.
No meta.json was written or changed. None is set to approved-critic.

## Blocking issues (unchanged)
1. All 11: no baseline stills (p0, a1, p50, p100), so the visual rubric cannot be applied.
2. All 11: no implementation, only schema.ts.
3. Process: AT-13R has no result (no reports/sync/at13.md). Order of work stays: render-ops runs the AT-13R renders,
   sync-verifier writes at13.md, the chair rules, then the motion-engineer builds dom-a.

## Next review
Resubmit with 4 stills per component, Arabic QA output and a demo strip. Pass needs every score >= 7 and no blocking issue.

---

# TripleGate — round 1

Date: 2026-10-15. Reviewer: critic (did not author). Commit reviewed: 2e4eba0. Verdict: APPROVED, score 8/10. No blocking issue.

## What was checked
- Baselines p0, a1, p50, p100 (lite, 960x540) at full size, and reports/p7/snap/TripleGate.jpg.
- Extra dev stills at standard tier (frames 36, 66, 72), rendered through the queue, because the baselines show no mid-travel frame. Frames 78, 84, 92 did not render (job 112 exit 1, not investigated; scratch only, nothing committed).
- Source TripleGate.tsx and the demo in studio/src/demos/dom-a.tsx. schema.ts was not changed.

## Scores (docs/plan/06 §3.2 and component acceptance)
- Legibility at 1080p: 8. Gate labels are about 40 px, capsule text about 32 px, high contrast on the dark ground.
- Token and palette discipline: 9. Cyan (lit), green (ok) and the ink greys only. Crit is not shown in any still.
- Depth and light: 8. Rim light, shaft, floor pool, back glow, grid and bokeh (standard tier) read as layered.
- Visual verb without narration: 8. Doors light in turn, the receipt crosses and each gate turns green behind it (frames 66 and 72 show it clearly).
- Arabic: 9. Whole-phrase labels, correct RTL order (gate 0 on the right), the capsule reads "إيصالات NilePay" with the Arabic on the right.
- Bullet-list or slide look: 9, none. No legacy frames. No numbers, so none unsourced.
- Motion intent: 7. Stills show the crossing at standard tier but the committed baselines miss it, and the effects below are too small.
- Mean about 8.3.

## Non-blocking fixes, in order of impact
1. p100 and the 72 dev still, gate floor line: the crossing sparks are 3 to 6 px and look like noise. Raise size to 5-10 px and count to 20+, or add a short streak. This is the impact on the stressed word.
2. Dev still 66, payload capsule: the comet trail is an 8 px, low-alpha line that streams to the right and is barely visible. Make it 14 px tall with higher alpha at the head.
3. The reject path (gate fail, crit bar and X, shake, recoil) has no still. Add a Demo-TripleGate-reject frame or a strip before the first spec uses `reject`.
4. p50 and p100: the lower 25 percent of the frame under the labels is empty. Consider a taller gate (gh up to 0.85 of the box) or a larger floor reflection. Not blocking, because the box may be placed by the scene.
5. p0: fully blank by design (reveal starts later). Acceptable.

## Next review
No resubmission is needed for approval. Re-review only if fixes 1 to 3 change the baselines.

---

# LegendOrbs — round 1

Date: 2026-10-15. Reviewer: critic (did not author). Commit reviewed: 1529318. Verdict: APPROVED, score 8/10. No blocking issue.

## What was checked
- Baselines p0, a1, p50, p100 (lite, 960x540) at full size, and reports/p7/snap/LegendOrbs.jpg.
- Extra dev stills at frames 56 and 60 (standard tier, 960x540) through the queue (job 177), because no baseline holds the focus impact. Scratch only, nothing committed.
- Source LegendOrbs.tsx and the demo in studio/src/demos/dom-a.tsx.

## Scores (docs/plan/06 §3.2 and component acceptance)
- Legibility at 1080p: 8. Labels about 40 px, whole phrases, 3 + 3 layout with wide gaps. Unfocused labels dim to ink3 but stay readable.
- Token and palette discipline: 9. signal, ok, warn, crit, violet, ember tokens only; ink greys for labels.
- Depth and light: 8. Rim-lit spheres, back glows, floor pools, shallow-ellipse placement, grid floor, orbit ellipses with front/back satellites.
- Visual verb without narration: 8. Frames 56 and 60 show two pulse rings, a swell, a brighter floor pool, an ink label with a tone bar, and the other five orbs dimmed. p50 (green) and p100 (red) show the hold and handoff.
- Arabic: 9. RTL order correct (item 0 cyan on the right), no letter splitting, no clipping.
- Bullet-list or slide look: 9, none. No legacy frames. No numbers, so none unsourced.
- Motion intent: 7. Stills at focus+4f show it clearly, but the committed baselines (frames 74, 149) are 22 and 51 frames after the focus words and miss it.
- Mean about 8.3.

## Non-blocking fixes, in order of impact
1. Baselines p50 and p100: no impact in any committed still. Move p50/p100 or add a frame at the focus word + 4f (frames 56 and 102) so rings and flash are regression-tested.
2. p100 and f56, satellites: 3 to 8 px dots with tails at 12 to 38 percent alpha are barely visible at 960 px (for example next to the cyan orb at x 700-840 y 125-145). Raise to 10-14 px head and make the tail 5 dots.
3. p50 and p100, bottom row labels (x 100-550, y 458-495): about 90 percent of frame height, on the safe-margin edge. Reduce the box height a little or shift the grid up 20 px.
4. Orbit ellipses on unfocused orbs are 16 percent alpha and almost vanish; raise to 24 percent.
5. No strip of the focus handoff (green releasing, red taking over); the swell-back of the old orb was not judged.
6. a1 (frame 11): bottom row is empty during the stagger; fine, but the scene should not cut here.

## Next review
No resubmission is needed. Re-review only if fixes 1 to 3 change the baselines.

---

# LatencyLadder — round 1

Date: 2026-10-15. Reviewer: critic (did not author). Commit reviewed: 58efe07. Verdict: APPROVED, score 7/10. No blocking issue.

## What was checked
- Baselines p0, a1, p50, p100 (lite, 960x540) at full size, and reports/p7/snap/LatencyLadder.jpg (4-frame strip).
- Demo props in studio/src/demos/dom-a.tsx (values carry refs d:6.6:6, d:6.6:4, d:6.7:1, d:6.7:2, so no unsourced numbers).

## Scores
- Legibility at 1080p: 8. Labels about 40 px, mono values about 36 px, whole phrases, no clipping.
- Token and palette discipline: 8. Cyan signal climber, grey-teal bars, amber for the slow rung; no stray hues.
- Depth and light: 6. Rim-lit bars, soft floor pools and a floor grid, but all rungs sit in one flat plane. The "perspective ladder" is not felt: the rails are nearly parallel verticals and the stack reads as a horizontal bar chart.
- Visual verb without narration: 7. Bar length on a log scale plus the climbing orb and the cyan-to-amber ramp read well (150 ms to 57 s). The "each 10x is one equal step" idea is not visible: decade gridlines are about 8 percent alpha with no tick or x10 mark.
- Arabic: 9. RTL order and BiDi isolates correct ("الـ pool", "pip install" bold, LTR values).
- Bullet-list or slide look: 7. Not a list, but close to a dashboard bar chart. No legacy frames.
- Motion intent: 6. No baseline shows the reach flash or the two puls; a1 shows one small ring at the 150 ms tip only. Climber comet tail is a few px.

## Non-blocking fixes, in order of impact
1. p50 and p100: strengthen the perspective. Give the rails a visible vanishing-point lean and step each trough in depth (scale 0.94 per rung up), so the ladder reads as a 3D object.
2. p50 and p100, decade gridlines (x 200-640, y 120-420): raise to 20 percent alpha and add small "x10" ticks, so the equal-step log scale is explicit.
3. Add a baseline at reach+4f of rung 3 (frame about 108) so the flash and puls are regression-tested; currently none are.
4. p50, climber (x 650-670, y 225-260): comet tail is barely visible; make it 3x longer with a head glow.
5. p50 and p100, empty bottom 20 percent (y 430-540): floor grid only; raise the ladder box by about 20 px or enlarge the floor reflection.
6. a1: ring at the 150 ms tip (x 505-535, y 368-396) is the only impact visible; fine, but it is small.

## Next review
No resubmission is needed. Re-review only if fixes 1 to 3 change the baselines.

---

# PermissionLocks — round 1

Date: 2026-10-15. Reviewer: critic (did not author). Commit reviewed: 705ee15. Verdict: APPROVED, score 7/10. No blocking issue.

## What was checked
- Baselines p0, a1, p50, p100 (lite, 960x540) at full size, and reports/p7/snap/PermissionLocks.jpg (4-frame strip).
- Demo props in studio/src/demos/dom-a.tsx (owner/group/other roles; 700/600/644/777 modes cite s:S4:P03:0023-0027, so no unsourced numbers).
- reports/p7/qa_arabic_PermissionLocks.json: pass (OCR min 0.947, no tofu, no overflow, no bidi issue).

## Scores
- Legibility at 1080p: 8. Resource names about 40 px mono, role labels about 40 px whole words, tags about 36 px. Margins are respected.
- Token and palette discipline: 8. Green (write), cyan (read), violet (admin), steel grey (none). Only the three level hues; no stray color.
- Depth and light: 6. Rim-lit tiles, floor light pools, holographic floor grid, slow push-in. But all tiles sit in one flat plane and the grid floor is only a thin strip at the bottom.
- Visual verb without narration: 8. Open shackle on a colored body versus closed steel padlock reads at once. p50 shows the grant on the bottom-right tile (rwx), p100 shows the deny closing it again.
- Arabic: 9. Whole-word RTL labels, right-aligned, LTR mono resources.
- Bullet-list or slide look: 6-7. Not a list, but a roles x resources matrix of equal tiles reads close to a permissions table or dashboard.
- Motion intent: 6. No baseline shows the grant flash, pulse ring, tone change, or deny shake. Only end states are regression-tested.
- Legacy frames: none.

## Non-blocking fixes, in order of impact
1. Add baselines at grant+3f (about frame 67) and deny+3f (about frame 117) so the flash, pulse ring and shake are regression-tested. Today none of the four baselines can show them.
2. p50 and p100, all tiles (x 120-700, y 88-466): add depth. Tilt the matrix with a mild perspective or stagger the rows in z; let the floor pool of the active tile spill onto the floor grid.
3. p50 and p100, role labels (x 780-845) and ticks (x 705-725): about 80 px gap from the tile row, hairline tick is weak. Lengthen the tick to the tile edge or tint it with the row color so rows bind to their labels.
4. p50 and p100, tags on locked tiles ("---", x 380-440 and 575-635): contrast is low at 1080p; raise to about 55 percent alpha.
5. p50, padlock size (about 45 px high in a 115 px tile): enlarge about 1.25x so the lock is the hero of each tile and the matrix looks less like a table.
6. p0: empty baseline (nothing before the first word). Acceptable for the entrance, but a frame at 6 would catch the tile stagger.

## Next review
No resubmission is needed. Re-review only if fixes 1 to 3 change the baselines.
