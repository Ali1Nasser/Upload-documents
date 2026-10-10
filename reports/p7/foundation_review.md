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
