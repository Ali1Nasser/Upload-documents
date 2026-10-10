# Component authoring guide (P7)

Read this before writing a component. Specs are data and components are code (golden rule 3). Scene-directors write `corpus/specs/<id>.json`. Motion-engineers implement the frozen catalog **once**, in `studio/`.

## 1. The contract you build on (frozen; never edit)

These files are hashed in `harness/state/freeze.json`:
- `studio/src/tokens.ts`;
- `studio/src/type/arabic.ts` and `studio/src/type/overrides.ts`;
- the fonts;
- every `studio/src/components/<Name>/schema.ts`, plus `contract.ts` and `catalog.ts`;
- `harness/schemas/components/*.json`.

A change to any of them is a contract change. Append the request to `corpus/specs/_component_requests.jsonl`, using `{"v":1,"id":"CR-nnn","by","kind","target","current","proposed","why","status":"open","needs"}`. The Council decides it by ADR. New code always goes in new files **beside** the frozen ones.

## 2. Where your files go (no shared-file edits)

| What | Path |
|---|---|
| Implementation | `studio/src/components/<Name>/<Name>.tsx`. Export a `DcComponent` (`{name, Component, text?, slot?, textRect?}`). |
| Family registration | `studio/src/components/families/<family>.ts`. The default export is `{family, components: [..]}`, with one file per family (`type-ui.ts`, `data.ts`, …). |
| Demo | `studio/src/demos/<family>.tsx`. The default export is `{family, demos: DemoDef[]}`. Each demo is one shot on synthetic word ids `w:DEMO:<Name>:nnnnnn` (24 fps frames). |
| Snapshot baselines | `studio/test/baselines/<Name>/p0.png, a1.png, p50.png, p100.png` + `meta.json` (written by `dc render snap <Name> --approve`). The PNGs stay local and git-ignored, because media is not committed. `meta.json` (sha256 of each PNG, approval) and the JPG strip `reports/p7/snap/<Name>.jpg` are committed. |
| Perf | `reports/perf/components/<Name>.json` only (written by `dc render perf <Name>`). The merged `reports/perf/components.json` is rebuilt at gate time by `dc render perf --aggregate`; never edit it by hand, and never write it from a perf run (parallel agents would lose entries). |

`studio/src/spec/registry.ts` discovers both folders with `require.context`. You never touch `Root.tsx`, `SpecPlayer.tsx` or `registry.ts`. A demo composition `Demo-<Name>` appears automatically.

A component receives `{props, ctx}`:
- `props` are already validated by the frozen zod schema, with defaults applied.
- `ctx` holds shot-local frames at the composition fps: `frame`, `at` (anchor onset − lead), `atEnd` (anchor word end), `until` (exit anchor), `shotDur`, `box` (slot rect inside title-safe), `fx` (tier), `fps`, `preview`, `actions[]` (each `{name, props, at, end}`), `frameOf(anchor)` / `endOf(anchor)` for nested anchors such as `land`, and `mod` (audio-reactive `glow/scale/opacity/particles/haze`).
- Never read seconds, never compute frames from ms in a component, and never read `useCurrentFrame()` for timing. Use `ctx.frame`.

## 3. Hard rules

1. **Whole-word Arabic only.**
   - Never wrap a part of an Arabic word in its own element, and never animate per letter, typewriter-style or scramble-style.
   - The smallest animated unit is a whole word, a tatweel compound (`الـKafka`) or a `⟦…⟧` LTR isolate (`wordUnits()` in `src/type/words.ts`).
   - Per-character effects are allowed only on Latin or mono code, terminal and ID text.
   - The guard `checkWholeWords()` runs on every SpecPlayer frame. Any split is a `DC_QA perletter` finding and fails `dc render snap|spec`.
   - A second guard, `checkArabicWholeWords()`, walks **every** text node under SpecPlayer. Every Arabic letter run on screen must be a whole word of some string in the layer props. A substring or typewriter reveal (`text.slice(0, n)`), per-letter spans, or Arabic set outside the type engine leaves a fragment, which is a `DC_QA fragment` finding. Never render Arabic copy that is not in the props.
2. **Use the type engine. Never set Arabic text by hand.**
   - `MixedText` handles Arabic runs plus `<bdi dir="ltr">` Latin isolates, the ADR-010 join gap after `الـ`, Western digits and the Latin face rule L1.
   - `KText` is one kinetic element with a preset reveal and auto-fit.
   - `LabelRow` puts labels on one baseline, ≥ 40 px apart (AT-4). The check always uses the `LABEL_GAP_MIN_PX` floor, whatever `gap` the caller passes; a tighter row is a `DC_QA label` finding.
   - `useAutoFit` fits copy to its slot.
3. **RTL reveals.**
   - Arabic copy is revealed by a clip-path wipe running right → left over the whole box. Latin and numerals wipe left → right.
   - The presets are `arrive` / `impact` / `label` / `wipe` / `exit`, from `src/type/reveal.ts`, with ms taken from `PRESETS` in tokens.
   - The clip overshoots vertically (−60 % / 160 %), so tashkeel and glow are never cut.
   - Ease through `ease.*` from `reveal.ts`. These are the frozen `EASE` curves snapped to exactly 1 at the end (`Easing.out(exp)(1) = 0.999` would leave a counter at 66.60 instead of 66.67).
   - **Onset = RV1 (ADR-011 Q2; the chair record `harness/state/decisions.json` → `ADR-011` `decision.Q2 = "RV1"` (`Q2_history` 2026-10-10: RT-011-2 evaluated by the chair on the RV2-valid AT-13 subset, median 41.7 ms, 60 % at +1 f; ADR-011 §AT-13 result)).** The engine follows that chair record, never a text match in the ADR (INC-011-1); RV1 is implemented in `5ce4555`, and its ratification waits on AT-13R (render-ops + sync-verifier). No fan-out beyond the three reference components until AT-13R passes. The first *visible* step of every reveal lands **on** the anchor frame, never one frame later. `revealStyle` evaluates each preset curve one frame ahead (`REVEAL_ONSET_F = 1`): on the anchor frame progress is `ease(1/n)` (arrive @ 24 fps = 0.685 of the wipe, @ 12 fps = 0.90), the element settles at anchor + n − 1, the preset length n is unchanged, and anchor − 1 is still hidden.
   - A component-owned motion that starts on an anchor (row entry, highlight, sort/filter travel, morph, a counter roll) uses `revealProgress(t − at, n, easing)` from `reveal.ts`, never a raw `interpolate(t, [at, at + n])`, which shows nothing on the anchor frame. A move that must **land** on a fixed frame (the `count` roll lands on the word end) starts its interpolation at `at − REVEAL_ONSET_F` instead. `p7.check.ts` asserts ink > 0 on the anchor frame for every preset × {12, 15, 24} fps × {rtl, ltr}, and that the chair record still says `RV1`.
4. **Western digits** everywhere (`westernDigits()`; Eastern digits fail the frozen `Txt` schema). Numbers use mono tabular figures (`"tnum" 1`). Units go after the number, inside the same LTR isolate.
5. **ALL-CAPS Latin containing `I`** (AI, API, KPI, CI) gets Inter Tight `cv08` (the serifed capital I), so it never reads as `Al` or `l`. `MixedText` applies it through `latinFeatures()`. Never override `fontFeatureSettings` on a Latin run.
6. **Tashkeel clearance.**
   - A line that carries diacritics uses line-height ≥ 1.6 (`lineHeightFor`).
   - Stacked lines use `stackGap()`: title → subtitle gets +0.3 em, and lower marks get extra clearance.
7. **Auto-fit inside safe areas.**
   - Every slot lies inside title-safe (5 % per side; `safeRect`, `slotRect`; RTL `start` = the right half).
   - Copy shrinks to its floor: 28 px for labels tied to speech (`SIZE.labelMin`); 60 % of size for display.
   - Below the floor, the element is outlined in `crit` and a `DC_QA overflow` finding is logged. **Snapshot tests and spec renders fail on it.**
   - **Camera envelope.** `ctx.box` is the slot already shrunk by the shot's camera envelope (`cameraSafeBox` in `src/spec/rig.ts`), on the layer's depth plane (push, truck, pedestal, roll, impact nudge). Copy that auto-fits `ctx.box` is still title-safe at the peak of the move. Never lay copy out against the raw `slotRect`. The ambient push follows the 04 rate (1.5–3 % per 5 s). Its total is capped at 6 % per shot, but it never falls below the 04 floor of 1.5 % per 5 s. A hold (`static`) has no push.
   - **Post-layout check.** On every SpecPlayer frame, once the frame has **settled**, `checkTitleSafe()` takes the on-screen box of every `[data-dc-text]` element, after all transforms (camera, parallax, impact scale, audio scale) and clipped by overflow ancestors, and compares it with title-safe. Copy outside title-safe is a `DC_QA unsafe` finding. The check skips invisible copy and shots inside a transition.
   - **Settled frame (review M8).** The three post-layout checks (per-letter, fragment, title-safe) never read the pre-fit layout. SpecPlayer holds its own `delayRender` per frame and runs them in `checkWhenSettled()` (`src/type/settle.ts`): after the fonts are loaded and after every `useAutoFit` has released its handle (each pending fit is counted by `fitBegin`/`fitEnd`). Copy that fits title-safe only after auto-fit has shrunk it is therefore not `unsafe`. A component with its own measure-then-shrink logic must use `useAutoFit` (or call `fitBegin`/`fitEnd` around its own measurement), otherwise the checks may read its unsettled layout.
   - `dc render snap _selftest` proves that the overflow, per-letter, fragment, unsafe and label (AT-4) detectors each fire on their own fixture, and that the fit-after-shrink fixture (`selftest:fitshrink`, ~3,150 px natural, ≤ 1,000 px fitted) reports **no** `unsafe` and no `overflow`.
8. **Determinism.**
   - Use only `random(seed)` from `remotion`. Never use `Math.random`, `Date.now`, `new Date()` or wall-clock time in a component.
   - No network: fonts come from `public/fonts` via `loadFonts()`.
   - The snapshot test renders the 50 % frame twice and requires 0 differing pixels.
9. **Colours, sizes, fonts and FX numbers come only from tokens** (`C`, `SIZE`, `FONT`, `FX`, `PRESETS`, `IMPACT`, `CAMERA`). Never hard-code a hex value or px size in a component. Layout constants (paddings, ratios) are fine.
10. **Text-safe masks** (ADR-002).
    - Set `text: true` on any component that shows copy. Supply `textRect()` when the copy is smaller than its slot.
    - SpecPlayer cuts haze, bokeh and particles out of that rect, plus `fx.textSafePadPx`, but only while the copy is on screen.
    - A dissolve or match fades in the incoming backdrop and non-text layers. It **never** fades in `text: true` layers, because their own anchored reveal shows them. The first word after a dissolve is therefore fully visible on its frame. The outgoing shot's copy fades out over the tail.
    - Chromatic aberration (`caShadow`) applies to Latin and numeral runs only, **never Arabic**. DOF blur never applies to text layers.
11. **No invented numbers.** Every shown number carries `ref`: a data-contract fact id `d:x.y:n`, or the `s:` sentence that speaks it. Demos use real canon and data-contract values too.
12. **Plates for heavy backgrounds.** Real-time WebGL is for the hero tier only (≤ 5 % of frames, ADR-002 RT5), with particles ≤ `FX[tier].particles` (hero cap 1,500 on swiftshader).

## 4. Perf budgets per tier

`dc render perf <Name>` measures **box seconds per frame** (wall / frames) at 1920×1080 at the production setting:
- swiftshader, JPEG q80;
- **concurrency 3** (ADR-002: 3 render slots = nproc − 1). The queue job claims all 3 slots (`tsp -N 3`), so the box is under exactly the production load and nothing else runs beside it. Load average and queue occupancy are recorded, and `other_jobs_running` should be 0;
- over the whole demo, after a warm-up of 6 frames at the same concurrency.

The budgets compare like with like, directly against ADR-002:

| Tier | Budget (box s/frame at 3 slots) | Basis |
|---|---|---|
| lite | ≤ 0.201 | previews only, at 960×540 in practice, so this 1080p figure is conservative. It is held to the standard figure. |
| standard | ≤ 0.201 | ADR-002 R5: the FX2 standard rate must stay ≤ 0.201 box s/frame (S-hi + 10 %) |
| hero | ≤ 1.038 | ADR-002: the top of the H band (0.904–1.038 box s/frame) |

`slot_s_per_frame` (= box × 3) is reported for comparison with `render_bench.md` only. A run over budget **exits 1** (use `--report-only` to just record it), and the component must get cheaper first: cache canvases, avoid per-frame `filter: blur` on large boxes, prefer pre-rendered plates. Otherwise it needs an ADR. `dc render perf --aggregate` rebuilds `reports/perf/components.json` and exits 1 if any component is over budget or still has a v1 (concurrency-1) report.

## 5. Tests and thresholds

`bash studio/scripts/check_p7.sh` runs the unit suites. It is light and does no rendering:
- `arabic.check.ts` (frozen rules);
- `p7.check.ts` (whole-word units, per-letter detector, digits, cv08, ADR-010 bands, fit and overflow, safe areas, AT-4, reveal, RV1 anchor-frame ink > 0 for every preset / fps / direction, and the ADR-011 chair record: `decision.Q2 = RV1`, `decision.PREVIEW.fps` = the token);
- `resolve.check.ts` (the compiler on the real EDL, word map and `_demo` spec: anchor = word start − lead, cut leads, 12 fps halves, `PREVIEW.fps = 12` and no hard-coded preview fps, single rounding at 15 fps, failure reporting, audio curves, the camera envelope (288 move × length × plane × slot cases stay title-safe), dissolve text opacity).

`dc render snap <Name>` runs through the queue:
- It renders stills of `Demo-<Name>` at scale 0.5 (960×540 PNG), in the **lite** tier. Lite has no grain or bokeh noise, so the snapshot diffs only layout, type and motion. Tier looks are frozen tokens, covered by look-dev and perf. There are four stills:
  - `p0`, `p50` and `p100`: 0 / 50 / 100 % of the demo;
  - `a1`: the first anchored reveal settled (anchor frame + the longest reveal preset + 1). Every demo starts its first reveal a few frames in, so `p0` alone only tests the backdrop.
- Each still is compared with pixelmatch (`threshold 0.1`, YIQ per pixel, **anti-aliased pixels counted**) against `studio/test/baselines/<Name>/`. **Pass: ≤ 16 differing pixels** (an absolute cap, not a ratio of the frame). Determinism is 0 px on this box. One substituted table digit is about 50–60 px, and two swapped rows are about 400 px, so both fail.
- It also checks:
  - determinism (the 50 % frame rendered twice, 0 px). This check runs **before** any compare or approve, and a determinism failure fails the run even with `--approve`. A non-deterministic render never becomes a baseline;
  - that each baseline PNG still matches its sha256 in `meta.json` (a baseline edited outside `--approve` fails);
  - zero `DC_QA` findings: `overflow`, `perletter`, `fragment`, `unsafe`, `label`, `digits`, `font`;
  - zero registry problems.
- On failure it writes `data/renders/p7/snap/<Name>/<tag>_diff.png`.
- Report: `reports/p7/snap/<Name>.json`.

Every component change re-runs its snapshot and its perf measurement:
- `dc render snap <Name>` must PASS against the approved baseline.
- `--approve` writes baselines **only from a run that would otherwise pass**: it refuses, and leaves the baseline and `meta.json` untouched, when determinism is not 0 px, when there is any `DC_QA` finding, or when there is any registry problem (review n1; the report lists `approve_refused`).
- A *visual* change needs `--approve`, which writes `meta.json` with `approval: "pending-critic"`, followed by a critic review of the three stills. The critic's sign-off is recorded with `--approve --approver <critic-run-id>`. Authors never grade their own baselines (golden rule 4).

## 6. Scene compiler (for reference)

`studio/src/spec/resolve.ts` is pure and also runs in node tests:
- **Anchors.** An anchor lands at `word.rec_start_frame − lead_frames`, in 24 fps record frames, exactly as `dc spec lint` computes it. At fps F a 24 fps frame x maps to `round((x − span.start) · F / 24)`.
- **Onset on the anchor (RV1).** The anchor frame is the first frame with visible ink (ADR-011 Q2 = RV1; the chair record `harness/state/decisions.json` → `ADR-011` `decision.Q2 = "RV1"` (`Q2_history` 2026-10-10: RT-011-2 evaluated by the chair on the RV2-valid AT-13 subset, median 41.7 ms, 60 % at +1 f; ADR-011 §AT-13 result)). The lead to the first visible change is therefore exactly `lead_frames`, and the `06` sync metric's expected frame `rec_start_frame − lead_frames` needs no +1 f allowance. `dc render at11` writes the RV1 set as `reports/p7/at11/*_rv1.*` (frames t0 = anchor, t1, t2, settled; plus `anchor_ink` = changed pixels between anchor − 1 and anchor, which must be > 0). The unsuffixed RV2 set is kept for comparison.
- **Shots.** Each shot covers its sentences. The cut sits 5 f before the shot's first word, never before the previous shot's last word ends.
- **Validation.** Props are checked against the frozen zod schemas. Actions (`<Name>.<action>`) attach to their target layer.
- **Shot-level layers.** `CameraRig`, `DepthLayers`, `FXTier`, `AudioReactive`, `WhipPan`, `LightStreakTransition` and `MatchCut` are consumed at shot level.
- **Previews** are 960×540 at `PREVIEW.fps` (**12**, the frozen token since ADR-011 Q3 = P2; CR-001 resolved; re-frozen in `harness/state/freeze.json` `contract_changes`) with the lite tier, labelled "lite · 12 fps". Every preview path (`calculateMetadata`, the SpecPlayer fallback, `p7.ts spec`, `dc render spec`) reads the token through `PREVIEW_FPS`; nothing hard-codes a preview fps (`resolve.check.ts` scans for it). `--fps N` overrides it for one render. Finals are 1920×1080 at 24 fps. Sync evidence (G8) comes from 24 fps measurement renders, never from 12 fps previews; critics verify judder on a ≤ 10 s 24 fps clip first.
- **Anchor rounding (ADR-011 Q1 = RD1).** At fps F an anchor lands at `round_half_up((rec_start_frame − lead_frames − span.start) · F / 24)`, with one rounding (`floor(x + 0.5)`, never Python `round()`). This is exact at 24; at 12 every anchor is a film frame halved. Word-map frames are `floor(start_ms · 24 / 1000)` and `ceil(end_ms · 24 / 1000)` (CR-002 resolved by ADR-011).
- **Measurement renders.** `dc render spec <id> --fps 24 --nocam --nofx --cut [--solo <layer id>]` renders without the camera, the backdrop/post FX or transitions, optionally with a single layer. Use these for per-layer sync onsets; they are never deliverables.
- **Resolver report.** `calculateMetadata` sets the duration from the EDL span and returns the resolver report: anchors resolved / unresolved, invalid props, unknown and unimplemented components.
- **Report location.** `dc render spec <id>` writes `data/renders/spec/<id>/<mode>/resolver.json` next to the MP4. `--report <repo path>` keeps a small copy in git.
- **Exit status.** The render fails unless all of the following hold:
  - 100 % of anchors resolve;
  - there are no invalid props, no unknown components and no QA findings;
  - there are no registry problems. A family or demo file whose name the discovery pattern skips is a registry problem, and so is a duplicate demo;
  - in a final, there are no unimplemented layers. This is checked before rendering starts;
  - a chapter spec drops no shots.
- **Demo specs.** Underscore demo specs (`corpus/specs/_demo.json`) may carry `window: {from, to}` sentence ids, padded 12 f before and 24 f after. `dc spec lint _demo` honours the window. Chapter specs may never carry one.
