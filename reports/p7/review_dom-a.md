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
