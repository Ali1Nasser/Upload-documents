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

## Re-confirmation (2026-10-16, independent re-read)

Reviewer: critic. Baselines p0, a1, p50, p100 and reports/p7/snap/LegendOrbs.jpg re-read at full size; the component, schema and demo are unchanged since 1529318. Verdict unchanged: APPROVED, 8/10, no blocking issue. meta.json already holds status approved-critic (score 8, 2026-10-15); not rewritten.
- Confirmed in stills: item 0 (cyan) on the right in a1/p50/p100; whole-phrase Arabic labels, no letter splitting or clipping; six token hues only; rim light, back glow and floor pools give depth; the focused orb swells with an ink label and tone bar while the others dim (p50 green, p100 red).
- Still non-blocking, same as round 1: no baseline at focus word +4f (frames 56 and 102); satellites and unfocused orbit ellipses are faint at 960 px; bottom-row labels (x 100-550, y 458-495) sit near the safe-margin edge; a1 bottom row is empty during the stagger.

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

## Re-confirmation (2026-10-16, independent re-read)

Reviewer: critic. Baselines p0, a1, p50, p100 re-read at full size; code unchanged since 58efe07. Verdict unchanged: APPROVED, 7/10, no blocking issue. meta.json already holds status approved-critic (score 7, 2026-10-15); not rewritten.
- Confirmed: p100 shows 57 s amber bar and 150 ms / 1160 ms / 5 s grey-teal bars on one log scale with equal rail pegs; whole-phrase RTL labels with LTR mono values; the climber orb sits at the focused rung (p50 on 5 s, a1 on the pool rung); a1 shows the ring at the 150 ms tip; p0 is an intentionally empty atmosphere frame.
- Still non-blocking, same as round 1: rails are near-parallel so the ladder reads as a horizontal bar chart (x 640-670, y 120-425); decade gridlines are barely visible (x 200-640, y 120-420); no baseline holds the reach flash or puls; bottom 20 percent (y 430-540) holds only the floor grid.

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

## Re-confirmation (2026-10-16, independent re-read)

Reviewer: critic. Baselines p0, a1, p50, p100 re-read at full size and reports/p7/snap/PermissionLocks.jpg; component unchanged since 705ee15. Verdict unchanged: APPROVED, 7/10, no blocking issue. meta.json already holds status approved-critic (score 7, 2026-10-15); not rewritten.
- Confirmed in stills: open shackle on a hued body (green write, cyan read, violet admin) versus closed steel padlock reads as grant versus deny with no narration; whole-word Arabic role labels (المالك / الجروب / الباقي) right-aligned, LTR mono file names, no clipping; no legacy frames; no bullet-list look, though the 3x3 equal-tile matrix is still close to a table.
- Octal cross-check at p100: index.html = rw- r-- r-- = 644, backup.sql = rw- --- --- = 600, deploy.key = rwx --- --- = 700. All three are the sourced modes (s:S4:P03:0026-0027); no invented numbers.
- New non-blocking observation, p50 (deploy.key column, bottom-right tile x 515-695, y 345-462): the demo's grant opens only the "الباقي" cell, so the column reads rwx --- rwx (707), which is not 777 and not a real mode, while the demo comment promises the 777 disaster. Either grant group too (two grant actions) or have the caller show the octal on screen. The component renders only rwx tags, never 700/600/644/777, so the spoken numbers need a NumberCounter or label from the shot spec to meet "every spoken number on screen".
- Still open from round 1: no grant+3f / deny+3f baseline (flash, ring, shake untested); flat single plane; role ticks (x 705-720) weak and about 80 px from the tiles; "---" tags low contrast; a1 shows only 2 of 3 rows (stagger), p0 empty.

---

# Heartbeat — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Commit reviewed: 8a86b48. Verdict: APPROVED, score 7/10. No blocking issue.

## What was checked
- Baselines p0, a1, p50, p100 (lite, 960x540) at full size, and reports/p7/snap/Heartbeat.jpg (4-frame strip).
- Demo props in studio/src/demos/dom-a.tsx: three DataNodes, interval 630 s citing s:S4:P18:0036 (the only number, shown as "10 min 30 s", the way it is spoken). No unsourced numbers.

## Scores
- Legibility at 1080p: 7. Node labels about 36 px whole words, interval chip about 34 px mono. SUSPECT tag is about 22 px and weakest.
- Token and palette discipline: 8. Green ok, amber warn, steel ink; nothing stray.
- Depth and light: 6. Rim-lit acrylic rows, spherical cores, soft green or amber floor pool under the stack, faded older beats. All rows sit in one flat plane.
- Visual verb without narration: 8. A beating trace versus a dashed flatline with ghost spikes where beats should have been, hollow core, amber tag, then beats resuming (p100 row 2, ring pulse on core), reads as "alive, stopped, back".
- Arabic: 8. "الـDataNode N" renders RTL, right-aligned, whole label, no clipping; term kept LTR inside the label.
- Bullet-list or slide look: 6-7. Not a list, but three equal horizontal bars with a header chip read close to a monitoring dashboard.
- Motion intent: 7. The strip shows traveling beats and the flatline; the miss flash and recover ring are not isolated in any baseline.
- Legacy frames: none.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. p50 and p100, all rows (x 48-910, y 145-435): add depth. Stagger rows in z or give the stack a mild perspective tilt so it is less of a flat dashboard; let the suspect row's amber pool spill on the floor.
2. p50 and p100, interval chip (x 515-675, y 38-65): it floats detached above the middle of the stack and never changes. Anchor it to the suspect row (or draw a bracket across the flat gap) and let the elapsed-time counter run toward 10 min 30 s, so the spoken number is tied to the failure.
3. Add baselines at miss+3f (about frame 65) and recover+3f (about frame 143): the warn flash, flatline start and radar ring are untested; a1 trace is nearly empty (only one spike).
4. p50 row 2 (x 805-885, y 295-318): SUSPECT tag is about 22 px at 1080p; raise to about 28 px and add an Arabic equivalent or glyph in the shot spec, since English-only tags clash with the Egyptian-Arabic captions.
5. p50 row 2, dashed flatline (x 390-605): thin and low-contrast against the dark row; thicken about 1.5x and raise the alpha so the failure survives 720p compression.
6. p0: empty (nothing before the first word); acceptable for the entrance.

---

# LogScroll — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Commits reviewed: 10d48cb, 1844c39. Verdict: APPROVED, score 7/10. No blocking issue.

## What was checked
- Baselines p0, a1 (frame 11), p50 (74), p100 (149) at full size (lite, 960x540) and reports/p7/snap/LogScroll.jpg (4-frame strip). Source read: studio/src/components/LogScroll/LogScroll.tsx and the demo in studio/src/demos/dom-a.tsx.
- Demo numbers 67, 260, 289, 1160, 25, 100 %, 150 are lab figures; 1160 ms is DataFact d:6.6:4 in the graph. No unsourced numbers seen.

## Scores
- Legibility at 1080p: 7. Line text is about 36 px mono, level tags about 30 px, header tag about 22 px. The spotlighted row is crisp. The 30 % dimmed rows and the DEBUG tag (ink3 at 0.35 gutter) are faint but intentional.
- Token and palette discipline: 8. signal, warn and crit tones only, ink ramp for text, nothing stray.
- Depth and light: 6. The rim takes the hit tone (teal to red), with a back glow and a floor pool over a faint grid. Rows share one flat plane, and the p0 to p100 push-in is the only parallax.
- Visual verb without narration: 8. The feed plus the red rail tick and chevron, `tail -f` becoming `grep ERROR`, and everything else dimming read as "find the one line".
- Arabic: 7. The demo has no Arabic line, so the MixedText path is not on a baseline. qa_arabic_LogScroll passes (7 strings, 0 failed). Latin lines are correctly isolated LTR.
- Bullet-list or slide look: 7. A framed terminal with level colors; not a list, but a stack of equal rows.
- Motion intent: 6. The strip shows the wipe (a1: "against the p") and the spotlight. The scroll, the new-line bloom and the sweep are not isolated in any baseline.
- Legacy frames: none.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. Demo and baselines (whole component): the demo has 7 lines, so vis = 7 and the window never scrolls; the headline behaviour ("scrolls once 9 rows are full, upper rows dim") is untested. Add a demo with 11 or more lines and baselines at about 60 % of the feed (before the spotlight), showing the newest row rising and the top rows receding.
2. p50 and p100, panel (x 48-910, y 103-398): add depth. Tilt or stagger the plate, or let the top rows recede in scale or blur. The panel is a flat rectangle and fills only the middle 55 % of the frame, so the floor grid and the empty bands above and below read as unused.
3. p50 and p100, DEBUG row (x 88-145, y 224-240) and the dimmed INFO and WARN rows: ink3 tag on the dark plate is close to the legibility floor. Raise the debug tag to ink2 and the dim floor from 30 % to about 40 %, so the context rows survive 720p compression.
4. a1, header tag (x 93-156, y 112-131): `tail -f` is about 22 px at 1080p; raise to about 28 px. Also add an Arabic-bearing line to the demo (for example "queue: 289 طلب") so MixedText inside a ledger row is baselined.
5. p50 against p100: nearly identical (only the camera push-in). Replace p100 with a frame at the hit plus 6 f, mid-sweep (about frame 80), so the light sweep and chevron arrival are on a baseline.

---

# LatencyLadder — round 2

Date: 2026-10-16. Reviewer: critic (did not author). Commit reviewed: 861c43a. Verdict: APPROVED, score 7/10. No blocking issue.

## What was checked
- Baselines p0, a1 (frame 11), p50 (79), p100 (159) at full size (lite, 960x540) and reports/p7/snap/LatencyLadder.jpg (4-frame strip).
- Axis geometry measured on p100: the baseline is at x 644 and the decade ticks are at x 520, 396, 272 (one decade is about 124 px). Bar tips: 150 ms at 520, 1160 ms at 411, 5 s at 332, 57 s at 201. Expected from 124*(1+log10(v/150)): 521, 411, 333, 201. The axis now matches the bars, so the round 1 mismatch is fixed. Values keep their refs (d:6.6:6, d:6.6:4, d:6.7:1, d:6.7:2); no unsourced numbers.

## Scores
- Legibility at 1080p: 8. Labels about 40 px, mono values about 36 px, whole phrases, margins respected (57 s value at x 140-190 is inside the safe area). The x10 chips (about 14 px at 960) are the weakest text.
- Token and palette discipline: 8. Cyan climber and rails, grey-teal bars, amber for the slow rung; nothing stray.
- Depth and light: 7 (was 6). Rails lean and converge, each rung up is thinner, bars have an extruded front face and a floor pool, the climber has a head glow. The bars themselves still sit in one plane, so the ladder is read as a perspective bar chart, not a ladder you climb.
- Visual verb without narration: 8. Bar length on a log scale plus the climbing orb and the cyan-to-amber ramp read 150 ms to 57 s. Equal x10 steps are now explicit.
- Arabic: 9. RTL order, "الـ pool" and "pip install" isolates correct; LTR values.
- Bullet-list or slide look: 7. Not a list; the horizontal bar stack still leans dashboard.
- Motion intent: 6-7. a1 shows the ring at the 150 ms tip and the comet tail is now visible under the climber (p100, x 655-665, y 145-180), but no still holds a reach flash or the puls; p50 and p100 are nearly the same image.
- Legacy frames: none.
- Mean about 7.6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. p50 and p100 (same state): replace p100 with a frame at reach+4f of rung 3 or 4 (about frame 108 or 135) so the flash and puls are regression-tested. Both baselines currently show only the settled state.
2. p50 and p100, bars (x 200-645, y 120-390): make the depth read on the bars, not only the rails. Step each bar's y in z (small scale-down plus blur on the far rungs) and lengthen the floor reflection, so the ladder is not a flat bar chart.
3. p100, decade axis (x 270-645, y 405-440): the x10 chips are about 14 px at 960 and low contrast; raise to ink2 and about 17 px. The ticks carry no absolute value (they are 150 ms times 10^k from the first tip); fine as relative steps, but name the first tick (for example "150 ms") so the scale is anchored.
4. p50 and p100, bottom 20 percent (y 440-540): floor grid only, and the top 90 px is empty; shift the ladder box down about 15 px or enlarge the floor pool for a balanced composition.
5. a1: the 5 s and 57 s rows are empty during the stagger; fine, but the scene should not cut here.

---

# PermissionLocks — round 1 (demo change: real 777)

Date: 2026-10-16. Reviewer: critic (did not author). Commit reviewed: c8b41f3. Verdict: APPROVED, score 7/10. No blocking issue. meta.json set to approved-critic (score 7).

## What was checked
- Baselines p0, a1 (frame 11), p50 (84), p100 (169) at full size (lite, 960x540), and reports/p7/snap/PermissionLocks.jpg (4-frame strip).
- Demo in studio/src/demos/dom-a.tsx: two grants and two denies on the same word anchors (الجروب and الباقي on deploy.key).

## Change verification
- p50, deploy.key column (x 515-695, y 92-462): all three cells open and violet, tags rwx / rwx / rwx = 777. The earlier 707 reading (group cell closed) is fixed.
- p100, same column: owner rwx, group and other closed "---" = 700; both denies landed on the same word. Octal cross-check of the other columns: index.html rw- r-- r-- = 644, backup.sql rw- --- --- = 600. All modes are the sourced ones (s:S4:P03:0026-0027); no invented numbers.

## Scores
- Legibility at 1080p: 8. File names about 36-40 px mono, role labels about 40 px whole words, tags about 34 px. Margins respected.
- Token and palette discipline: 8. Green write, cyan read, violet admin, steel grey none; no stray colors.
- Depth and light: 6. Rim-lit tiles, floor pools, floor grid, push-in; but one flat plane, and the floor grid is a thin strip (y 470-540).
- Visual verb without narration: 8-9. In p50 the whole key column opens, which is the "everyone can do everything" disaster; p100 closes it again.
- Arabic: 9. Whole-word RTL role labels right-aligned, LTR mono resources, no clipping.
- Bullet-list or slide look: 7. A 3x3 tile matrix is close to a permissions table, but the lock objects carry the scene.
- Motion intent: 6. Stills show end states only; no baseline at grant+3f or deny+3f (flash, ring, shake).
- Legacy frames: none. Unsourced numbers: none.
- Mean about 7.5, min 6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. Baselines: add frames at about 67 (grant+3f) and about 117 (deny+3f) so the flash, pulse ring and shake are regression-tested. p50 and p100 are both settled states.
2. p50 and p100, tile matrix (x 120-700, y 88-466): mild perspective or z-stagger of rows, and let the active tile's floor pool spill onto the grid, so it does not read as a flat table.
3. p50 and p100, role ticks (x 705-725, y 150-410): about 80 px from the tile edge and hairline; extend to the tile edge or tint with row color.
4. p50 and p100, "---" tags (x 380-440 and 575-635): raise contrast to about 55 percent alpha.
5. The spoken 700 / 777 are not rendered by the component; the shot spec should pair a NumberCounter or label with those words.

---

# LatencyLadder — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Commit reviewed: a00f3ea (component unchanged since 861c43a). Independent fresh read; verdict: APPROVED, score 7/10. No blocking issue. meta.json holds approved-critic (score 7, notes refreshed).

## What was checked
- Baselines p0, a1 (frame 11), p50 (79), p100 (159) at full size (lite, 960x540) and reports/p7/snap/LatencyLadder.jpg (4-frame strip). Snap PASS reported by the author (det 0 px, 0 QA findings); perf within budget at all tiers (lite 0.086, standard 0.117, hero 0.109 vs 0.201 / 0.201 / 1.038).

## Scores
- Legibility at 1080p: 8. Whole-phrase Arabic labels about 40 px, mono values about 36 px, the 57 s value (x 140-190) inside the safe margin. The x10 chips (x 320-580, y 425-440) are the weakest text.
- Token and palette discipline: 8. Cyan rails and climber, grey-teal bars, amber only for the 57 s rung.
- Depth and light: 7. Leaning converging rails, extruded bar faces, floor pools, amber glow, floor perspective grid; the bars still share one plane.
- Visual verb without narration: 8. Bar length on a log scale with equal x10 ticks and the cyan-to-amber ramp reads 150 ms to 57 s.
- Arabic: 9. RTL phrases, "الـ pool" and "pip install" isolates, LTR mono values; no clipping or letter splitting.
- Bullet-list or slide look: 7. Not a list; a horizontal bar stack still leans dashboard.
- Motion intent: 6-7. a1 shows the ring at the 150 ms tip and the climber head glow; p50 and p100 are the same settled state, so no still holds the reach flash or puls.
- Legacy frames: none. Unsourced numbers: none (refs d:6.6:6, d:6.6:4, d:6.7:1, d:6.7:2).
- Mean about 7.5, min 6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. p100 (frame 159) duplicates p50: replace with a frame at reach+4f of rung 3 or 4 (about 108 or 135) so the flash and puls are baselined.
2. p50 and p100, bars (x 200-645, y 120-390): put depth on the bars themselves (scale-down and blur on far rungs, longer floor reflection) so it reads as a ladder, not a flat bar chart.
3. p100, axis (x 270-645, y 405-440): x10 chips about 14 px at 960 and low contrast; raise to ink2 and about 17 px, and label the first tick "150 ms" to anchor the scale.
4. p50 and p100, composition: top 90 px empty and the bottom 100 px is only the floor grid; shift the ladder box down about 15 px.
5. a1: lower rungs are empty during the stagger (x 200-640, y 120-200); fine, but do not cut here.

---

# PermissionLocks — round 1 (independent re-read)

Date: 2026-10-16. Reviewer: critic (did not author). Component, demo and baselines unchanged since c8b41f3. Verdict: APPROVED, 7/10. No blocking issue. meta.json stays approved-critic (score 7, notes refreshed).

## What was checked
- p0, a1 (frame 11), p50 (84), p100 (169) at full size (lite, 960x540) and reports/p7/snap/PermissionLocks.jpg (4-frame strip). Arabic QA: reports/p7/qa_arabic_PermissionLocks.json pass.

## Scores
- Legibility at 1080p 8; token and palette discipline 8 (green write, cyan read, violet admin, steel none); Arabic 9 (whole-word RTL labels, no clipping); visual verb 8 (p50 all-open key column vs p100 closed, 777 to 700 reads without narration); bullet-list look 7 (3x3 tile matrix, lock objects carry it); depth and light 6; motion intent 6 (stills and strip show end states only); legacy frames none; unsourced numbers none (644, 600, 700, 777 sourced).
- Mean about 7.5, min 6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. Baselines: p50 and p100, whole grid (x 120-700, y 88-466): add frames at about grant+3f (67) and deny+3f (117) so the shackle spring, flash and snap-shut are regression-tested. Current stills are all settled states, and p0 is an empty vignette (frame 0).
2. p50 and p100, tile matrix (x 120-700, y 88-466): one flat plane over a thin floor grid (y 470-540); add row z-stagger or perspective and let the active tile's pool spill onto the grid.
3. p100, "---" tags (x 380-440, 575-635, y 297-460): contrast too low at 960 px; raise to about 55 percent alpha.
4. p50 and p100, role ticks (x 705-725): hairline, 80 px from the tile edge; extend to the tile edge or tint with the row color.

---

# LatencyLadder — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Component unchanged since 861c43a. Fresh read of p0, a1, p50, p100 at full size (lite, 960x540) and reports/p7/snap/LatencyLadder.jpg. Verdict: APPROVED, score 7/10. No blocking issue.

## Scores
- Legibility at 1080p: 8. Whole-phrase Arabic labels about 40 px, mono values about 36 px, nothing clipped; the "57 s" value (x 140-190) is inside the margin. The x10 chips (x 320-580, y 425-440) are the weakest text.
- Palette and token discipline: 8. Cyan rails and climber, grey-teal bars, amber only on the 57 s rung.
- Depth and light: 7. Rim-lit extruded bars, floor pools, amber glow, floor perspective grid, converging rails. All bars share one plane.
- Visual verb without narration: 8. Log-scale bar length, equal x10 ticks and the cyan-to-amber ramp read 150 ms to 57 s. The rails sit at the far right edge, so "ladder you climb" is weaker than "bar chart".
- Arabic: 9. RTL order, "الـ pool" and "pip install" isolates correct; LTR mono values.
- Bullet-list or slide look: 7. Not a list, but the horizontal stack leans dashboard.
- Motion intent: 6-7. a1 shows the ring at the 150 ms tip and the climber head glow; p50 and p100 are identical settled states.
- Legacy frames: none. Unsourced numbers: none (refs d:6.6:6, d:6.6:4, d:6.7:1, d:6.7:2).
- Mean about 7.5, min 6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. p100 (frame 159) duplicates p50: swap for a frame at reach+4f of rung 3 or 4 (about 108 or 135) so the flash and puls are regression-tested.
2. p50 and p100, rails (x 640-680, y 100-410): thin 1-2 px lines far from the bars; thicken and add rung crossbars that reach into the bar rows so the climb reads as a ladder.
3. p50 and p100, x10 chips (x 320-580, y 425-440): about 14 px at 960; raise size and contrast, and label the first tick "150 ms".
4. p50 and p100, composition: top 90 px empty; shift the ladder box down about 15 px.

---

# PermissionLocks — round 1 (fourth read, same day)

Date: 2026-10-16. Reviewer: critic (did not author). Component, demo, registry and baselines unchanged since c8b41f3. Verdict: APPROVED, 7/10. No blocking issue. meta.json already holds approved-critic (score 7, 2026-10-16); not rewritten.

## What was checked
- p0, a1 (frame 11, rows still staggering in), p50 (84), p100 (169) at full size (lite, 960x540).
- Re-confirmed: p50 deploy.key column is all open violet (777); p100 closes group and other to "---" (700); index.html 644 and backup.sql 600 as sourced.

## Scores
Legibility 8, palette 8, depth and light 6, visual verb 8, Arabic 9, bullet-list look 7, motion intent 6, legacy none, unsourced numbers none. Mean about 7.5, min 6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. Baselines, whole grid (x 120-700, y 88-466): add frames at grant+3f (about 67) and deny+3f (about 117) so flash, ring and shake are regression-tested. All four stills are settled or empty states.
2. p50 and p100, tile matrix: one flat plane; add row z-stagger and let active pools spill onto the floor grid (y 470-540).
3. p100, "---" tags (x 380-440, 575-635, y 297-460): raise contrast to about 55 percent alpha.
4. p50 and p100, role ticks (x 705-725): hairline, about 80 px from tile edge; extend or tint.

---

# LogScroll — round 1 (independent re-read)

Date: 2026-10-16. Reviewer: critic (did not author). Component, demo and baselines unchanged since the first round-1 read. Verdict: APPROVED, 7/10. No blocking issue. meta.json already holds approved-critic (score 7, 2026-10-16); not rewritten.

## What was checked
- p0 (empty vignette), a1 (frame 11, line 2 mid-wipe "against the p"), p50 (74) and p100 (149) at full size (lite, 960x540). Arabic QA qa_arabic_LogScroll pass.
- Re-confirmed: the ERROR row is the only bright row (red rim, chevron, rail tick), `tail -f` becomes `grep ERROR`, others dim. Numbers 67, 260, 289, 1160, 25, 100 %, 150 are lab figures; no invented values; no legacy frames.

## Scores
Legibility 7, palette 8, depth and light 6, visual verb 8, Arabic 7 (no Arabic line on a baseline), bullet-list look 7, motion intent 6, legacy none, unsourced numbers none. Mean about 7.0, min 6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. Demo and baselines: 7 lines never reach the 9-row scroll; add an 11-line demo with a baseline at about 60 % of the feed (newest row rising, top rows receding).
2. p50 and p100, panel (x 48-910, y 103-398): flat single plane; add tilt or recession (scale or blur) on upper rows.
3. p50 and p100, DEBUG tag (x 88-145, y 224-240) and dimmed rows: raise to ink2 and the dim floor from 30 % to about 40 %.
4. a1, header tag (x 93-156, y 112-131): about 22 px at 1080p; raise to about 28 px and add an Arabic-bearing line to the demo.
5. p100 nearly duplicates p50: swap for about frame 80 (hit plus 6 f, mid-sweep).

---

# CollectionMorph — round 1

Date: 2026-10-16. Reviewer: critic (did not author). Verdict: APPROVED, 7/10. No blocking issue. meta.json set to approved-critic (score 7). Stills only; no strip existed, so motion intent is judged from the p50 mid-morph state.

## What was checked
- p0 (empty vignette), a1 (frame 15, four cars on the rail), p50 (74, mid-morph), p100 (149, settled set) at full size (lite, 960x540). Arabic QA qa_arabic_CollectionMorph pass (0 failures). Colours come from tokens (C, FONT, SIZE) via the shared kit; no raw hex in the component. Ids 1006-1010 are receipt ids from the corpus transcripts; no legacy frames.

## Scores
Legibility 8 (numbers about 40 px at 1080p, type pair about 36 px), palette 8, depth and light 7 (back glow, holographic floor, glass rim highlights), visual verb 8 (car on rail becomes glass bubble, brackets [ ] become { }, duplicate 1008 collapses), Arabic 8 (QA pass, no Arabic line on a baseline), bullet-list look 8 (spatial objects, not a list), motion intent 6, legacy none, unsourced numbers none. Mean about 7.4, min 6.

## Blocking issues
None.

## Non-blocking fixes, in order of impact
1. p50, merge point (x 515-620, y 222-275): the duplicate 1008 car and bubble overprint, so "1008" reads as doubled, garbled text. Fade the label of the merging copy first (or offset it) while the warn glow runs.
2. a1 and p50, duplicate 1008 (x 490-615, y 225-310): the amber warn glow is not visible in any still. Add a baseline at about frame 60 so the warn colour is regression-tested.
3. p0 is an empty vignette and a1 shows only four of five cars (1009, 1010 not yet entered); swap p0 for a frame at about 45 that shows the first copy and the duplicate side by side.
4. p100, bubbles (x 310-650, y 180-390): all five bubbles sit on one plane with equal size. Add a z-stagger and the floor spill so the set has depth.
5. p50 and p100, "list" tag (x 398-458, y 122-148): dims to near-invisible once the morph ends; lift the dim floor to about 45 percent.
