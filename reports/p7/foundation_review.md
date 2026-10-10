# P7 foundation review (independent)

- **Reviewer:** an independent senior-engineer pass. I did not write this code (golden rule 4).
- **Scope:** commits `97a7e71` and `d4d23ad`:
  - `studio/src/type/` (new files only), `studio/src/spec/`, `studio/src/fx/`;
  - the families/demos registry;
  - KineticWord, NumberCounter and TableGrid;
  - `studio/scripts/p7.ts`, `tools/dclib/render.py` and `docs/tools/component_guide.md`.
- **Date:** 2026-10-10.

## Verdict: FAIL. Three blocking defects (B1–B3).

The core of the foundation is sound:
- the anchor resolver;
- the whole-word type engine;
- determinism;
- frozen-contract hashes.

Two of the harness checks this review was asked to verify do not hold: perf is not measured under load, and the snapshot thresholds are not sane. The camera rig also carries copy out of title-safe at normal shot lengths, and the QA detectors cannot see it. All three fixes are small. Make them before the 104-component fan-out, because every component will be measured, baselined and framed by this code.

## What I ran (all independent of the author's reports)

| Check | Result |
|---|---|
| `freeze.json`: re-hash all 227 entries | 227/227 unchanged, 0 missing |
| `npm run typecheck` (studio) | exit 0, 0 errors |
| `bash studio/scripts/check_p7.sh` | 3 suites pass (arabic, P7 type, compiler on the real EDL, word map and `_demo`) |
| `tools/tests/test_*.py` (each with `python3 -I`) | 12/13 pass. `test_p3a.py` cannot import `rapidfuzz` (environment, pre-P7, unrelated) |
| `p7 snap _selftest` via queue job 30, scratch `--root` (repo untouched) | PASS: both `perletter` and `overflow` fire, and the driver exits 1 when either is missing |
| `p7 snap TableGrid` via queue job 30 | PASS: 0 px vs baseline at p0/p50/p100; determinism 0 px |
| Grep for `Math.random`, `Date`, `performance.now`, timers in `studio/src` | none in P7 render paths. The only hit is `lookdev/galaxy.tsx`, which is P6 and not mounted by SpecPlayer. `Date` appears only in report timestamps in `p7.ts` |
| Time fields in `corpus/specs/_demo.json` | only `lead_frames` and `transition_out.frames`. Both are frozen-contract fields (`05` §8; `scene_spec.schema.json:266`), so the spec contains no seconds and no frame positions |
| Simulated regressions vs the approved baselines (pixelmatch, same params as `SNAP`) | see B2 |

## Blocking defects

### B1. The perf harness does not measure under load, and its budget compares the wrong quantity

Where:
- `studio/scripts/p7.ts:45` (`PERF_BUDGET`);
- `:216-219` (`concurrency: 1`; load is only recorded);
- `:224` (`box_s_per_frame_at_3_slots = spf/3`);
- `:237` (exits 0 unless `--strict`);
- `docs/tools/component_guide.md:74-83`.

What happens:
- Each tier renders at concurrency 1. The only "load" is whatever the queue happens to have.
- In every committed report the perf job ran alone: `queue.running = 1` (itself) and loadavg 1.4–1.6 on 4 vCPU.
- The budget (standard 0.60) is ADR-002's 0.201 box s/frame × 3, which is a **concurrency-3** figure, yet it is compared with a concurrency-1 measurement on an idle box.
- `render_bench.md` (swiftshader) shows that per-slot cost grows about 2.25× from c=1 to c=3:
  - Bench2D: 0.136 → 0.304;
  - BenchGlow: 0.240 → 0.543.

Consequences:
- `box_s_per_frame_at_3_slots` understates the real figure by about 2.25×. TableGrid standard is reported as 0.0548; the bench scaling gives about 0.123.
- A component measuring 0.50 slot s/frame passes `within_budget`, but at 3 slots that is about 0.37 box s/frame. That is 1.85× over the ADR-002 R5 trigger (0.201), which the harness would hide from render-ops.
- The three reference components themselves are fine (about 0.12 box s/frame). The defect is in the harness, which all 104 components will use.

Fix:
- Measure at the production setting: `renderFrames({concurrency: 3})`, or 3 parallel renders. Report box s/frame = wall / frames.
- Compare against ADR-002 directly: standard ≤ 0.201 box s/frame; hero against the H band.
- Drop the linear `/3` field.
- Fail (or at least flag in the aggregate) when over budget.
- Fix the guide text to match.

### B2. Snapshot thresholds pass real functional regressions, and every p0 still is blank

Where:
- `studio/scripts/p7.ts:43` (`maxDiffRatio 0.001` of the full 960×540 frame = 518 px; `pixelThreshold 0.1`; pixelmatch default `includeAA: false`);
- `:117` (frames at 0/50/100 %).

Evidence (approved TableGrid p100 baseline, same pixelmatch parameters):

| Simulated regression | Mismatched px | Snapshot verdict |
|---|---|---|
| One table cell `150` → `120` (a wrong number on screen) | 51 (0.0098 %) | **PASS** |
| `sortBy` order bug: rows T5 and T1 swapped | 336 (0.065 %) | **PASS** |
| NumberCounter big digit `66.67` → `66.66` | 1,163 | FAIL (caught) |

Other observations:
- The whole TableGrid p100 frame has only 2,435 bright pixels, so the 518 px allowance is about 21 % of all the ink in the frame.
- All three demos start their first reveal at frame 6–8, so every **p0 still has 0 pixels brighter than 120**. The 0 % check only re-tests the backdrop.

Fix:
- Use an absolute cap (e.g. ≤ 16–25 px at scale 0.5). Determinism is 0 px, so a tight cap is safe on this box. Alternatively, take the ratio over the ink bounding box, with `includeAA: true` for type.
- Replace p0 with "first anchor settled" (`at + presetFrames + 1`), or add that as a fourth still.
- Re-approve the baselines after the change.

### B3. The camera push moves copy out of title-safe, and no detector sees it

Where:
- `studio/src/spec/rig.ts:20-21, 51-52` (push = rate per 5 s × shot length, + 0.02·k, with no total cap);
- `studio/src/type/Text.tsx:105-125` (`useAutoFit` checks only natural width against `maxW`, before any transform);
- `studio/src/type/qa.ts` (no on-screen position check);
- also `KineticWord.tsx:30` (audio `mod.scale` up to +8 %) and the `impact` preset (scale 1.08).

What happens:
- Auto-fit fills a slot up to its edge. The slots are exactly title-safe at the edges (`safe.ts:17`).
- With the frozen 04 §2 drift rate, edge copy on the mid plane (parallax 1) lands at:
  - 6 s shot, k 0.4: scale 1.033, x 96 → 67 px (at the action-safe line);
  - 12 s shot (median), k 0.5: scale 1.064, x 96 → 41 px, y 54 → 23 px. That is outside title-safe and outside action-safe;
  - 25 s shot (04 maximum), k 0.5: scale 1.12, x 96 → −10 px, i.e. off frame. On the near plane (×1.3) it reaches −42 px.
- The `_demo` happens to stay inside: its shots average about 10 s and its copy sits away from slot edges. So the defect is latent, but it will trigger on ordinary P8 specs.

Fix (both parts):
1. Cap the total push, e.g. `min(drift, 0.03)` over the shot. Or keep the 04 rate but shrink `maxW`/`maxH` by the shot's peak camera scale × plane parallax (resolve.ts knows both).
2. Add a post-layout check in SpecPlayer that compares every `[data-dc-text]` `getBoundingClientRect()` (corrected for the preview scale) with `safeRect('title')` and logs `DC_QA overflow`.

## Major defects (non-blocking; fix in P7)

| # | Where | Defect | Failure scenario / fix |
|---|---|---|---|
| M1 | `studio/scripts/p7.ts:197` | In `--approve` mode, `pass = ok \|\| approve` overrides a determinism failure (`:134` sets `ok = false`) | A non-deterministic render gets written and reported as a PASS baseline. Fix: `pass = ok` when `determinism_diff_px > 0`, regardless of `--approve` |
| M2 | `studio/src/components/TableGrid/TableGrid.tsx:124-128` vs `:92, :131` | The title sits outside the `useAutoFit` ref. Only the grid is measured | A 30–40-char Arabic title (`K.Label` allows 40) in a `start`/`end` slot widens the glass past the slot, or wraps into the fixed `titleH` and overlaps the header. No `DC_QA` finding. Fix: put the ref on a wrapper around the title and the grid |
| M3 | `studio/scripts/p7.ts:288`; `studio/src/spec/SpecPlayer.tsx:66-71` | Spec pass ignores `unimplemented` and `registry_problems`. In `--final`, `Missing` renders `null` | A final render with an unregistered or deferred component (e.g. a family file named `type_ui.ts` that the regex at `registry.ts:21` silently skips) exits 0 with blank layers. Fix: fail `--final` on any unimplemented layer and fail every mode on registry problems; report files skipped by the regex |
| M4 | `studio/scripts/p7.ts:231-236` | `reports/perf/components.json` is a read-modify-write on a shared, committed file | Two family agents run `dc render perf` in parallel (3 slots), one entry is lost, and the commits conflict. That is the shared-file edit the registry was built to avoid. Fix: keep only the per-component files and build the aggregate at gate time (e.g. `dc render perf --aggregate`, or in `g06b`) |
| M5 | `studio/src/spec/rig.ts:73-82, 104`; `SpecPlayer.tsx:164` | A dissolve or match fades the incoming shot in **after** the cut. The cut is only 5 f before the first word | With the `_demo` dissolve (14 f, `inOutCubic`), the first anchored word is at about 4 % opacity when its reveal starts (t = 3) and about 50 % at t = 7. The visual onset is about 4–5 f (≈ 190 ms) late. That threatens G8 sync p95 ≤ 100 ms for every first-of-shot event after a dissolve. Fix: centre the dissolve on the cut (start the incoming shot T/2–T earlier), or keep `text: true` layers at full opacity during the dissolve |
| M6 | `studio/src/type/qa.ts:28` | The per-letter guard walks only `[data-dc-text]` roots and only sees element boundaries | It does not see (a) Arabic set without `data-dc-text`, or (b) a substring "typewriter" reveal (`text.slice(0, n)`) inside one text node. That pattern is likely in Terminal, CodeTrace, LogScroll and TokenStream. Fix: walk every text node under the SpecPlayer root, and add a lint or grep for `.slice`/`substring` on text props, or compare the rendered Arabic text with the full prop text |
| M7 | `studio/src/spec/resolve.ts:33-36` vs frozen `tokens.ts:40` (`PREVIEW.fps 15`) and `03` P7.3 (15 fps) | Code overrides a frozen contract value without an ADR. Hashes pass only because `tokens.ts` is untouched | CR-001 is filed (good). Until the Council decides, the default should follow the token (`--fps 12` stays available), or an ADR must land before P9 previews |

## Minor defects and nits

| # | Where | Note |
|---|---|---|
| m1 | `TableGrid.tsx:51` | `localeCompare` without a locale depends on the host locale (determinism across render hosts). Use `localeCompare(v, 'ar')` or a code-point compare |
| m2 | `TableGrid.tsx:82` | Numbers are rendered with `String(v)`: no NNBSP grouping, ASCII hyphen-minus. This disagrees with `NumberCounter.formatValue` and the data contract (`3 948.50`). Reuse `formatValue` |
| m3 | `NumberCounter.tsx:77-78` | The label is rendered at a scaled px size, but `MixedText size={SIZE.label}`, so the face and join-gap band come from the unscaled size |
| m4 | `registry.ts:41-43` | Duplicate demo names overwrite silently. Components are checked, demos are not |
| m5 | `resolve.ts:158-159` | Shots with no in-span words are dropped without a report entry. That is intended for window demos, but chapter specs should report it |
| m6 | `resolve.ts:142, 190`; `SpecPlayer.tsx:88` | The anchor uses `round(Δ·F/24) − round(lead·F/24)`, not the documented `round((Δ − lead)·F/24)`. Up to 1 preview frame early at 12 fps with odd leads. Exact at 24 |
| m7 | `rig.ts:48-50` | `static` (hold) keeps camera push. 04 §2 says a hold keeps only particle drift. The comment at `rig.ts:20` says 3.5 %, but the cap gives 3.0 % |
| m8 | `types.ts:142` vs `p7.ts:214` | `DemoDef.perfFrames` is documented but never used |
| m9 | `qa.ts:2`, `types.ts:26`, `p7.check.ts:1` | Stale references: `scripts/p7_render.mjs` should be `scripts/p7.ts`, and `text.ts` should be `words.ts` |
| m10 | `words.ts:73` | Redundant `Math.max` |
| m11 | `SpecPlayer.tsx:82` | The text-mask lead is a fixed `2` frames at any fps |
| m12 | `at11/AT11.tsx` | The AT-11 composition does not run `checkWholeWords`, and the self-test covers only overflow and per-letter (the AT-4 `label` detector is unit-tested only) |

## Checks that hold

- **Frozen contract.**
  - All 227 hashes are unchanged.
  - New code sits beside `arabic.ts` and `overrides.ts`, and the frozen rules are imported, not re-implemented.
  - Props are validated with the frozen zod `CATALOG`.
  - The 7 loaded font faces are all in the freeze.
- **Specs.**
  - Anchors are `{word, lead_frames}` only.
  - The duration comes from the EDL span.
  - `window` is restricted to underscore specs, in both the lint and the resolver.
- **Determinism.**
  - Only `remotion.random(seed)` (Atmos grain and bokeh) is used.
  - Font loading and auto-fit are gated by `delayRender`.
  - Snap renders twice with 0 px difference (re-verified).
- **Overflow detector.** It fires and fails the run for KText, LabelRow and NumberCounter (self-test re-verified). The gaps are M2 and B3.
- **Family registry.**
  - `require.context` over `components/families/` and `demos/` means one file per family, and catalog-name and duplicate-component checks are present.
  - `Root.tsx` was touched once, to mount the compositions.
  - Residual shared-file write: M4.
- **Whole-word Arabic.**
  - KText, MixedText and LabelRow animate whole elements, with an RTL clip wipe over the whole box and vertical overshoot for tashkeel.
  - The three components and AT-11 never split a word.
  - Guard gaps: M6.

## Re-review r0

- **Reviewer:** an independent senior-engineer pass. I did not write the fixes.
- **Scope:** commit `87eb279` (B1–B3, M1–M7, m1–m12). I also read the later commits `33a2999`, `3f232c0` (critic approval of the baselines) and `fa168ac` (ADR-011) where they touch these items.
- **Date:** 2026-10-10.
- **Method.** Every render and check ran through the tsp queue on scratch roots built from `git archive 87eb279`. The repo was not touched.
  - During the review another agent had uncommitted edits in `studio/`. I re-ran every measured probe on clean `87eb279` sources, so those edits are not in any number below.
  - The scratch roots and renders are deleted.

### Verdict: PASS. No blocking defect remains.

- B1–B3 are fixed. Each regression they described now fails, and I reproduced each one.
- M1–M7 are fixed.
- m1–m12 are fixed, except that m12 is partial.
- One new major (M8) should be fixed before the families with long display copy are baselined. The title-safe check reads the layout from before auto-fit in snapshot stills, so it reports false `unsafe` findings.

### What I ran

| Check | Result |
|---|---|
| `freeze.json`: re-hash all 227 entries | 227/227 unchanged, both in the working tree and at `87eb279` |
| `npm run typecheck` (`tsc --noEmit`) on the `87eb279` sources | exit 0 (queue job 81) |
| `check_p7.sh` on the `87eb279` sources | 3 suites pass (job 81). This includes the new cases: the 288 camera-envelope cases, single rounding at 15 fps, and dissolve text opacity |
| `tools/tests/test_*.py` (each with `python3 -I`) | 13/13 pass. `test_p3a` now imports (job 53) |
| `snap _selftest` | PASS (job 54). `overflow`, `perletter`, `fragment` and `unsafe` all fire |
| `snap TableGrid`, unmodified | PASS (job 55). Stills p0 / a1 / p50 / p100 = frames 0 / 11 / 54 / 109, 0 px each. Determinism 0 px, QA 0 |

### B1. Perf at production concurrency: fixed

How perf measures now:
- `dc render perf` renders with `concurrency: 3`.
- It runs in a tsp job that claims all 3 slots (`tsp -N 3`). `queue.json` records `slots: 3` for jobs 39–41.
- It reports box s/frame = wall / frames. The `/3` field is gone.
- The method matches `render_bench.md` (renderer concurrency 3), so the figures compare directly with ADR-002.

Budgets and results:
- The budgets are now ADR-002's own figures: standard and lite 0.201, hero 1.038 box s/frame.
- The committed v2 reports give standard 0.0856–0.0919, hero 0.0849–0.0932 and lite 0.0653–0.0664, with `other_jobs_running` 0. That is about 2.2× headroom on the R5 trigger.

Exit status:
- With the budgets forced to 0.001 in a scratch copy, `perf NumberCounter` exits 1 and so does its tsp job (job 58).
- With `--report-only` the same run exits 0 (job 63).
- From the code: `dc render perf --aggregate` exits 1 on any component that is over budget or still has a v1 report.

### B2. Snapshot thresholds: fixed

I reproduced the regressions against the approved baselines. The parameters are the current `SNAP` ones: threshold 0.1, `includeAA`, cap 16 px.

| Simulated regression | Mismatched px | Snapshot verdict | Before the fix |
|---|---|---|---|
| One table cell `150` → `130` | p50 39, p100 37 | **FAIL** | `150` → `120` was 51 px and passed the 518 px ratio |
| `sortBy` bug: rows T5 and T1 swapped | p100 403 (202 + 201 by row) | **FAIL** | 336 px, passed |
| Four single-digit substitutions in one render (`5→6`, `0→8`, `8→6`, `0→9`), measured row by row | 41 / 36 / 53 / 49 | each **FAIL** (smallest is 2.25× the cap) | – |
| M1: random offset injected into KineticWord, then `--approve` | determinism 12,561 px | **FAIL**: "not approved" on all 4 stills. Baseline PNGs and `meta.json` sha256 unchanged | it was written and reported as a PASS |

The new `a1` still:
- It sits at the first anchor + 6 + 1 frames: frame 11 for TableGrid, frame 15 for KineticWord and NumberCounter.
- It carries ink: the digit edits move 130 px at a1.

The baselines were re-approved by the critic in `3f232c0`. `meta.json` is now v2, records the thresholds and says `approved-critic`.

### B3. Camera push and title-safe: fixed

**Push total.** It is the 04 rate × shot length, capped at 6 %, but never below 1.5 % per 5 s. A `static` hold has no push. Measured from the pure function:

| Shot | Total push |
|---|---|
| 6 s, k 0.4 | 2.52 % |
| 12 s, k 0.5 | 5.40 % |
| 25 s, k 0.5 or k 1 | 7.50 % (the floor binds) |
| `static` | none (scale 1) |

So the 6 % cap is soft for shots longer than 20 s. The envelope covers that case.

**Envelope.**
- `cameraSafeBox` shrinks each text layer's box for its depth plane. The `start` slot (829 px wide) shrinks to 797 px for a 6 s shot and to 738 px for a 25 s shot on the near plane.
- In all 10 cases I computed, the peak right edge stays at or below 1823.7 px, against title-safe 1824. The cases include a 60 s shot at k 1 on the near plane.
- Without the shrink, the same copy would reach 1853–1931 px.

**Render reproduction.** A 25 s `push_in` at k 1, with `الـinfrastructure` auto-fitted to fill the `start` slot. Stills at frames 0 / 15 / 299 / 599.

| Envelope | Result |
|---|---|
| on | 0 `DC_QA unsafe` findings (job 62) |
| disabled in `resolve.ts` | `DC_QA unsafe` fires: right edge 1865 at p50 and 1906 at p100, against 1824. The run fails (job 56) |

**Detector coverage.** `checkTitleSafe` measures after every transform. KineticWord's audio scale and the reveal's `impact` scale are both set on ancestors of `[data-dc-text]`, so they are inside the measured box.

### Majors M1–M7

| # | Status | Evidence |
|---|---|---|
| M1 | fixed | Determinism runs before compare and approve. Reproduced in B2 above |
| M2 | fixed | The title has its own `useAutoFit` on the same `maxW`, starts at the table size, and reports overflow. Code read only; not rendered with a 40-char title |
| M3 | fixed | Registry problems fail snap and spec in every mode. Unimplemented layers fail a final before rendering starts. Skipped family or demo files and duplicate demos are registry problems. A chapter spec fails on dropped shots |
| M4 | fixed | Perf writes only `components/<Name>.json`. The aggregate comes from `--aggregate` |
| M5 | fixed | Text layers are not faded in, so the first word after a dissolve is fully opaque (unit test). Residual nit n3 |
| M6 | fixed | `checkArabicWholeWords` walks every text node and compares it with the prop lexicon. The self-test `fragment` case fires on `slice(0, 5)`. Limit (heuristic): a prefix that happens to be a whole word elsewhere in the props passes |
| M7 | fixed | `PREVIEW_FPS = PREVIEW.fps`. ADR-011 (`fa168ac`) now decides 15 → 12 with a re-freeze, and the code follows the token |

### Minors m1–m12

All 12 are addressed in code:

| # | Fix |
|---|---|
| m1 | code-point compare |
| m2 | `formatValue` |
| m3 | `labelPx` |
| m4 | duplicate demos are registry problems |
| m5 | `dropped_shots` |
| m6 | single rounding in both resolve and SpecPlayer |
| m7 | `static` has no push, and the comment is fixed |
| m8 | `perfFrames` removed |
| m9 | stale references fixed |
| m10 | redundant `Math.max` removed |
| m11 | `maskLead` scales with fps |
| m12 | AT11 runs both whole-word guards |

m12 is only partly done: the AT-4 `label` detector is still not in the self-test.

### New findings

**M8 (major, non-blocking): the title-safe check reads the layout from before auto-fit.**

Where:
- `SpecPlayer.tsx` (`useLayoutEffect`, deps `[frame, lexicon, scale]`);
- the same pattern in `QaSelftest.tsx`;
- `Text.tsx` `useAutoFit`, which waits for fonts and then calls `setState`.

What happens:
- The checks run in SpecPlayer's layout effect, in the commit that sets the frame.
- On a freshly mounted page, auto-fit has not run yet. That is every snapshot still, and the first frame of each render tab.
- When auto-fit settles, the checks do not run again. So `checkTitleSafe` measures the copy at its natural, unfitted size.

Reproduction (job 78):
- Setup: KineticWord `INTERNATIONALIZATIONMIDDLEWARES` in the `full` slot at `impact` size.
- The check logged `DC_QA unsafe` with box x −245…2161.
- The rendered stills show the fitted word at x ≈ 130…1786, inside title-safe. There is no `overflow` finding.
- So the snapshot fails on a correct frame.

Impact:
- It fails closed. Auto-fit only shrinks, and aligned copy shrinks inside its unfitted box. I found no path where it passes an unsafe final layout.
- Spec renders are checked correctly from the second frame of each tab.
- But every component whose natural copy is wider than title-safe before fitting will fail its snapshot.

Fix:
- Re-run the checks once the frame has settled. For example, SpecPlayer holds its own `delayRender` per frame and runs the three checks after `document.fonts.ready` and after every `useAutoFit` handle has been released (a pending counter in `Text.tsx`). Then it calls `continueRender`.
- Add a self-test case: copy that fits only after shrinking must report no `unsafe`.

**Nits:**

| # | Note |
|---|---|
| n1 | `snap --approve` still writes the PNG and `meta.json` when the run has QA findings or registry problems. The run fails, but the baseline is updated. Write baselines only on a passing run |
| n2 | `component_guide.md` §5 lists the `DC_QA` kinds as "(overflow, perletter, label, digits, font)". Add `fragment` and `unsafe` |
| n3 | The `transitionState` comment says two captions never overlap. But outgoing copy with no `until` fades out over the tail while the incoming copy is fully opaque. At t = 3 of a 14 f dissolve the incoming backdrop is still < 0.2 opaque (unit test), so most of the old caption is visible as the first new word reveals. This is a critic call. An exit before the cut avoids it |
| n4 | Not from this review: `/tmp` holds 58 stale `remotion-webpack-bundle-*` folders from 2026-10-09, about 2.9 GB, with 3.5 GB free. render-ops should clear them |

## Pre-fan-out check

- **Reviewer:** an independent senior-engineer pass. I did not write the engine changes.
- **Scope:** the engine commits after `2b5104e`: `08882ce` (Council C5 chair record, read only) and `2c5ea84` (Q3 P2 `PREVIEW.fps` 12 with a re-freeze; RV1 citing the chair record; M8, m12, n1, n2).
- **Date:** 2026-10-10.
- **Method.**
  - Every check ran through the tsp queue on scratch roots built from `git archive 2c5ea84`. The roots used the shared `node_modules` through a symlink. They held copies of the baseline PNGs, which match their `meta.json` sha256 (12/12).
  - The scratch driver is `p7.ts` with `enableCaching: false` added, so nothing was written to the shared webpack cache. That cache stayed at 932 MB, 3 entries. `TMPDIR` was private.
  - Two mutation roots were made from the same tree. Their QA details come from the job logs (tsp 14, 15).
  - The roots, bundles and renders are deleted. The repo was not touched, apart from this section and the queue log (`harness/state/queue.json`, `corpus/render/jobs.jsonl`: tsp 8–15).

### Verdict: PASS. Nothing blocks the fan-out.

- **Onset:** RV1 is implemented as the chair recorded it.
- **Preview fps:** every preview path reads `PREVIEW.fps` = 12 from the token.
- **M8:** fixed. The false positive is gone, and genuinely unsafe copy still fires.
- **m12, n1, n2:** done.
- **Snapshots:** all 3 reference snaps pass, and so does the self-test.
- **Freeze:** only the authorised `tokens.ts` hash changed.
- **New findings:** one minor (m13, reproducibility) and three nits. None blocks the fan-out.

### What I ran

| Check | Result |
|---|---|
| `freeze.json` against `2b5104e` | 227 → 227 entries, none added or removed. **1 changed: `studio/src/tokens.ts`** (`fc7f05ca…` → `e679727e…`), recorded in `contract_changes` (ADR-011, chair record `decision.Q3 = P2`) |
| Re-hash of all 227 entries | 227/227 match, both in the working tree and in `git show HEAD:`. Of the files changed in `2b5104e..HEAD`, `tokens.ts` is the only hashed one |
| `tokens.ts` undo test | Reverting exactly the 2 authorised lines (`PREVIEW` and `TOKENS_VERSION`) reproduces the old frozen hash `fc7f05ca…`. Nothing else in the file changed |
| `dc gate check G6a` on the scratch root | PASS 8/8: "227 hashed files, 0 changed" |
| `tsc --noEmit` | exit 0 (tsp 12). On a clean archive it fails first with exit 2: see m13 |
| `check_p7.sh` | 3 suites pass (tsp 12): type, P7 type, compiler. They include the chair-record asserts (`Q2 = RV1`; `Q3 = P2`, `PREVIEW.fps` = token), `PREVIEW.fps = 12`, the hard-coded preview fps scan, and a 12 fps resolve that halves the span |
| `snap _selftest` | **PASS** (tsp 13). `overflow`, `perletter`, `fragment`, `unsafe` and `label` each fire on their own fixture. `selftest:fitshrink` stays clean: 0 findings |
| `snap KineticWord` | **PASS** (tsp 13). Frames 0/15/35/71, 0 px on all 4 stills, det 0, qa 0 |
| `snap NumberCounter` | **PASS** (tsp 13). Frames 0/15/35/71, 0 px on all 4 stills, det 0, qa 0 |
| `snap TableGrid` | **PASS** (tsp 13). Frames 0/11/54/109, 0 px on all 4 stills, det 0, qa 0 |

### Onset = RV1, as the chair recorded it

- **The chair record.** `harness/state/decisions.json` → `ADR-011` has `decision.Q2 = "RV1"`. `Q2_history` reads RV2 (C5 ballot), then RV1 (RT-011-2, evaluated by the chair on the RV2-valid AT-13 subset). `reveal_onset` says: first visible step on the anchor frame, preset length unchanged, settles at anchor + n − 1. `ADR-011` has `Status: decided`.
- **The code.** `revealProgress(t, n) = interpolate(t + REVEAL_ONSET_F, [0, n])` with `REVEAL_ONSET_F = 1`. It returns 0 for t < 0, so anchor − 1 stays hidden.
  - On the anchor frame, progress is `ease(1/n)`. For arrive that is 0.685 @ 24 fps (n 6) and 0.90 @ 12 fps (n 3), as the guide states.
  - Progress reaches 1 at t = n − 1.
  - Every preset branch of `revealStyle` goes through it. So do the component-owned motions: the TableGrid row entry, highlight and sort/filter travel.
- **NumberCounter.** The roll starts at `t0 − REVEAL_ONSET_F`, so it has ink on the anchor and still lands on the word end. Its label is a secondary element, delayed by half a label preset and not tied to an anchor, so its raw `interpolate` is correct.
- **The guard.** `p7.check.ts` asserts ink > 0 on the anchor frame for every preset × {12, 15, 24} fps × {rtl, ltr}. It also asserts that the chair record says RV1.
- **Limit:** snapshot stills cannot see the onset. They fall on frames before the reveal or after it settles, which is why the baselines approved before `5ce4555` still pass at 0 px. The onset evidence is the unit check and the AT-11 RV1 set. The guide (§ onset) keeps fan-out beyond the three reference components behind **AT-13R** (render-ops + sync-verifier). I found no AT-13R result in `decisions.json`. That is a Council / sync-verifier precondition, not an engine defect.

### `PREVIEW.fps` 12 is read from the token everywhere

- `tokens.ts`: `PREVIEW.fps: 12`.
- `resolve.ts`: `PREVIEW_FPS = PREVIEW.fps`.
- The readers:
  - SpecPlayer `calculateSpecMetadata` reads `props.fps ?? (preview ? PREVIEW_FPS : FPS)`.
  - The `SpecPlayer` fallback now does the same. It used to read `FPS`, a real fix.
  - `p7.ts spec` reads `opt.fps || (final ? FPS : PREVIEW_FPS)`.
  - `dc render spec` passes `--fps` only when one is given.
- **No hard-coded preview fps.** A grep of `studio/src`, `studio/scripts` and `tools/dclib` finds none. The remaining literals are:
  - `fps={24}` in film-rate fixtures (QaSelftest, AT11);
  - the 15 fps single-rounding test;
  - the `freeze_p6.py` authorisation lines.
- **Demo report.** `reports/p7/_demo.resolver.json` says fps 12, 615 f, 960x540, lite, 100 % resolved, qa 0.

### M8: fixed, reproduced both ways

How the fix works:
- `settle.ts`. `useAutoFit` counts pending fits (`fitBegin` when it takes its handle, `fitEnd` when it releases it).
- SpecPlayer and QaSelftest hold one `delayRender` per frame. They run per-letter, fragment and title-safe in `checkWhenSettled`: after the fonts are ready, pending = 0 and one more macrotask.
- I read the commit order:
  - `fitBegin` runs during render, before the parent's layout effect.
  - A later re-fit (`setFit` in a child layout effect) re-renders synchronously, before the macrotask.
  - Unmount releases the handle.

  I found no path that hangs or checks early.

Mutations of the KineticWord demo (all three are the `full` slot at `impact` size):

| Root | kw2 = `INTERNATIONALIZATIONMIDDLEWARES` (fits only after shrinking) | kw3 = `…MIDDLEWARESINTERNATIONALIZATION` (51 chars; cannot fit at the 72 px floor) |
|---|---|---|
| `2c5ea84` (settled checks, tsp 14) | **no finding**: the r0 false positive is gone | **`overflow`** (natural 3838 px, max_w 1688, min 72) **and `unsafe`** (box −217…2133 vs title-safe 96…1824): still fires |
| Control: same tree with `checkWhenSettled` forced synchronous, i.e. pre-M8 (tsp 15) | **`unsafe` box −245…2161**, the r0 job 78 box to the pixel: M8 reproduced | `unsafe` box −1001…2917 (pre-fit) + `overflow` |

The self-test, mutated: the `selftest:fitshrink` box moved to x = 1100 (tsp 14), so the copy crosses title-safe only once it has been fitted.
- Result: **`unsafe` box 1100…2074** fires on the settled layout.
- The snap correctly reports it as a false positive and FAILs.

So the settle step does not hide real violations. It removes only the pre-fit misread.

### m12, n1, n2

| # | Status | Evidence |
|---|---|---|
| m12 | done | `selftest:label` (LabelRow, gap 16) fires: "gap 16.0 px < 39.99". `LabelRow` checks against `LABEL_GAP_MIN_PX` × render scale, never the caller's `gap`. The self-test needs each kind on its own fixture id |
| n1 | done (code read) | `snap --approve` computes `refuse` (determinism ≠ 0, QA findings, registry problems) before it writes anything. On refusal it does not copy the PNGs, does not write `meta.json`, fails each still with "not approved (baseline untouched)" and lists `approve_refused` |
| n2 | done | Guide §5 lists `overflow, perletter, fragment, unsafe, label, digits, font`. It also documents the settle rule, and that components with their own measure-and-shrink must use `useAutoFit` or `fitBegin`/`fitEnd` |

### New findings (non-blocking)

**m13 (minor, pre-existing, matters for fan-out): a clean checkout neither typechecks nor bundles.**

Where:
- `studio/src/lookdev/motion.tsx:11` and `world.tsx:14` import `./data/ch33_window.json` and `./data/ch00_gates_window.json`.
- The root `.gitignore` rule `data/` (meant for the top-level `data/`) also ignores `studio/src/lookdev/data/`.

What happens on a `git archive 2c5ea84`:
- `tsc` exits 2 with TS2307 (tsp 8).
- The Remotion bundle fails on the missing module, so every snap and spec fails (tsp 9–11).
- With the 2 local files copied in (5 KB), everything passes (tsp 12–15).

Any fan-out agent that works in a worktree or a clean scratch root hits this.

Fix: anchor the rule (`/data/`) or add `!studio/src/lookdev/data/`, then commit the two small JSON files. Owner: harness-engineer. They are derived look-dev data, not media.

**Nits:**

| # | Note |
|---|---|
| n5 | The settle contract is opt-in: a component that measures and shrinks outside `useAutoFit` without `fitBegin`/`fitEnd` would bring M8 back for itself. The guide says so. A cheap guard for the fan-out would be a registry or lint warning on `scrollWidth`/`getBoundingClientRect` plus `setState` in `src/components/**` outside `useAutoFit` |
| n6 | Snapshot stills never sample the anchor frame (see the limit above). The fan-out reviewers should take onset evidence from the unit check, the AT-11 RV1 set and AT-13R, not from snaps |
| n7 | `dc time ms2frame` and `frame2ms` default to `--fps 30`. The film rate is 24 (ADR-002). This is a P0 tool, not from this commit. Default it to `film_fps()` |
