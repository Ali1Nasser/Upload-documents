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
