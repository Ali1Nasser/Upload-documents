# P7 catalog status: group dom-b (Domain specials)

Date: 2026-10-10. Author: motion-engineer (dom-b).

## Status: all 11 deferred (blocked by ADR-011 AT-13R)

| Component | Status | Reason |
|---|---|---|
| DeadlockCrossing | deferred | AT-13R gate |
| PageScan | deferred | AT-13R gate |
| AppliedSteps | deferred | AT-13R gate |
| SampleScoop | deferred | AT-13R gate; data gap D2 |
| ABSplit | deferred | AT-13R gate; data gap D1 |
| WireTangle | deferred | AT-13R gate |
| ModuleClusters | deferred | AT-13R gate |
| ComplexityRace | deferred | AT-13R gate |
| HashBuckets | deferred | AT-13R gate |
| StatusStamp | deferred | AT-13R gate; engine note E1 |
| KeycardDoors | deferred | AT-13R gate |

**Reason.** The chair record says "no fan-out beyond the 3 reference components until AT-13R passes". It is in `harness/state/decisions.json`, ADR-011, under `follow_ups`: "motion-engineer: keep RV1 (no revert)". ADR-011 §AT-13R makes the same point: "due before any component beyond KineticWord, NumberCounter and TableGrid is merged".
- No AT-13R result exists. `reports/sync/at13.md` is absent, and the chair has made no pass record.
- AT-13R must render from a clean, pinned `studio/` tree. Every render re-bundles `studio/src` through `require.context`. New component, family or demo files in the shared tree would put the engine under test back under no control, which is what happened in INC-011-1.
- The orchestration task asked for the fan-out. Per the INC-011-1 prevention rule, orchestration may act only on a chair record, so the gate stands.

**Unblock.**
1. render-ops runs the AT-13R renders through the queue.
2. sync-verifier writes `reports/sync/at13.md` and the JSON.
3. The chair records the pass in `decisions.json`.

Then dom-b is built as planned below, with no further design work needed.

## Build plan (ready for when the gate passes)

All 11 are DOM/SVG at the standard tier, with no WebGL and no 3D. None needs a hero tier: the catalog implies no 3D for any of them.

| Component | Visual verb (04 §6) | Key motion (all component motion via `revealProgress`, RV1) | Demo content (refs) |
|---|---|---|---|
| DeadlockCrossing | Two trains locked at a crossing. Txn = capsule train, resource = crossing block. Hold = solid lock tether; wait = dashed, pulsing warn arrow. The wait-for cycle glows crit. | `resolve`: the victim train rolls back and fades (crit). The other train crosses (ok). | T1/T2 on حساب A / حساب B (NilePay transfer). No numbers. |
| PageScan | Page tiles in an RTL grid. `full`: the beam reads every page. `index`: 3 hop arcs land on the hit. `range`: hop, then a contiguous sweep. | `scan` action. Hits glow ok. | Full vs index side by side. Counts are shown by NumberCounter: 12 500 pages (`d:6.5:3`) vs 3 reads (`d:6.5:2`). PageScan shows no number of its own (≤ 64 tiles stand for pages). |
| AppliedSteps | A Power Query step list as a film strip. Glyph per `kind`. | `select`: the pointer travels and the step fills with signal. | CH-15 steps: TRIM, PROPER, the type cast, dedupe of 1008, filter, group. Order story from `d:6.2:1`/`d:6.2:2`. |
| SampleScoop | A seeded dot population (dots ≤ `FX[tier].particles`). The scoop draws by `method` (random / strata bands / every k-th / whole clusters) into a cup. | Highlight, then morph travel. | N = 5000 (`s:S4:P11:0070`). n: see D2. |
| ABSplit | A user stream splits into 2–4 lanes. A rate bar per lane. | `reveal`: rates roll (count) and the winner glows ok. | See D1. |
| WireTangle | Seeded bezier wires between two terminals. | `untangle`: wires morph into parallel bundles. | 12 wires, seed fixed. No copy. |
| ModuleClusters | Module chips inside cluster hulls. Dependencies are curves; cross-cluster ones are warn. | `decouple`: cross-cluster dependencies flash crit and cut, and the clusters separate. | NilePay modules (payments / ledger / notify). |
| ComplexityRace | Growth curves on an LTR math axis. O(n²) and O(2ⁿ) leave the chart in crit. | `race`: the curves draw. | n = 10 000 (`d:6.20:7`). List O(n) vs set O(1) (`s:S4:P05:0060`, `s:S4:P05:0062`). |
| HashBuckets | A bucket column with mono indices. Keys hop to `hash(key) mod b`. Collisions chain. | `insert` (hop), `collide` (chain glows warn). | Order ids 1001–1014 (`d:6.1:1`), `id mod 7`. Numeric keys use the true mod; strings use a fixed FNV-1a. |
| StatusStamp | A rubber stamp. ok/approved = ok, fail/rejected = crit, pending/retry = warn. | Impact preset slam: scale 1.08 to 1 and a 2 f flash. | `label_ar` مقبول / مرفوض on NilePay T3 (`d:5.2:3`, FAILED). |
| KeycardDoors | A row of doors. The level is shown as pips, not digits. A keycard. | `swipe`: card level ≥ door level opens (ok); otherwise denied (crit, shake ≤ 4 px). | IDOR lesson: إيصالاتك (1) opens; إيصالات غيرك (3) must not. |

## Open data and engine questions (for the fact-checker and story-editor; not contract changes)

- **D1 ABSplit.** The canon and data contract hold no A/B users or conversion rates. §6.12 has only CI and t-table values, and `s:S4:P11:0082` speaks "power 80 %" but no sample size. Per-operator NilePay success rates (A 3/3, B 1/3) are arithmetic over `d:5.2:1..6`, not listed facts. The demo needs a fact-checker ruling, or a §6.20-style constructed-illustration fact, before any number is shown.
- **D2 SampleScoop.** No sample size n is in canon. n = 30 is only implied by `tCrit(29, .05)` (`d:6.12:2`, df = n − 1). This needs the same ruling as D1.
- **E1 StatusStamp `to`.** `LayerCtx` exposes only the layer's own `box`, not another layer's rect. Until the engine exposes target rects, the closest behaviour is to stamp inside the layer's own slot, with the scene-director using the target's slot. This is an engine question (`spec/`), not a frozen-schema change, so no CR is filed.

## Re-check after critic review `f8f4a5c` (2026-10-10, round 2)

The critic's verdict (FAIL, nothing reviewable) is accepted. The fix it asks for (component.tsx, 4 stills per component, Arabic QA output, a demo strip) depends on AT-13R, and AT-13R has still not run. The critic gives the order as AT-13R renders, then `at13.md`, then the chair record, then the dom-b build.

State at re-check:
- `reports/sync/at13.md` is absent.
- `harness/state/decisions.json` has no AT-13R record. The only `at13_pass` flag is `false`, on the original AT-13.
- `tools/dc.py q` has no AT-13R job queued or run.
- `git status --porcelain studio/` lists 8 entries. These are uncommitted fx-b files, not dom-b files.

The chair record still reads: "no fan-out beyond the 3 reference components until AT-13R passes". An orchestration request is not a chair record (INC-011-1 prevention), so all 11 components stay deferred. No dom-b code, stills or perf rows were produced, and no `dc render snap` was run.

Unblock suggestions (for render-ops and the chair, not acted on here):
- Pin the AT-13R engine with `git worktree add <scratch>/at13r f8f4a5c`. That commit's committed `studio/` is fx-b-free, and RV1 has been in place since `5ce4555`. Record that HEAD, plus an empty `git status --porcelain studio/` in the worktree.
- Have the fact-checker rule on D1 (ABSplit) and D2 (SampleScoop) in parallel. Until then, the ABSplit and SampleScoop demos show no numbers.
