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
| Snapshot baselines | `studio/test/baselines/<Name>/p0.png, p50.png, p100.png` + `meta.json` (written by `dc render snap <Name> --approve`). The PNGs stay local and git-ignored, because media is not committed. `meta.json` (sha256 of each PNG, approval) and the JPG strip `reports/p7/snap/<Name>.jpg` are committed. |
| Perf | `reports/perf/components/<Name>.json` and the merged `reports/perf/components.json` (written by `dc render perf <Name>`). |

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
2. **Use the type engine. Never set Arabic text by hand.**
   - `MixedText` handles Arabic runs plus `<bdi dir="ltr">` Latin isolates, the ADR-010 join gap after `الـ`, Western digits and the Latin face rule L1.
   - `KText` is one kinetic element with a preset reveal and auto-fit.
   - `LabelRow` puts labels on one baseline, ≥ 40 px apart (AT-4).
   - `useAutoFit` fits copy to its slot.
3. **RTL reveals.**
   - Arabic copy is revealed by a clip-path wipe running right → left over the whole box. Latin and numerals wipe left → right.
   - The presets are `arrive` / `impact` / `label` / `wipe` / `exit`, from `src/type/reveal.ts`, with ms taken from `PRESETS` in tokens.
   - The clip overshoots vertically (−60 % / 160 %), so tashkeel and glow are never cut.
   - Ease through `ease.*` from `reveal.ts`. These are the frozen `EASE` curves snapped to exactly 1 at the end (`Easing.out(exp)(1) = 0.999` would leave a counter at 66.60 instead of 66.67).
4. **Western digits** everywhere (`westernDigits()`; Eastern digits fail the frozen `Txt` schema). Numbers use mono tabular figures (`"tnum" 1`). Units go after the number, inside the same LTR isolate.
5. **ALL-CAPS Latin containing `I`** (AI, API, KPI, CI) gets Inter Tight `cv08` (the serifed capital I), so it never reads as `Al` or `l`. `MixedText` applies it through `latinFeatures()`. Never override `fontFeatureSettings` on a Latin run.
6. **Tashkeel clearance.**
   - A line that carries diacritics uses line-height ≥ 1.6 (`lineHeightFor`).
   - Stacked lines use `stackGap()`: title → subtitle gets +0.3 em, and lower marks get extra clearance.
7. **Auto-fit inside safe areas.**
   - Every slot lies inside title-safe (5 % per side; `safeRect`, `slotRect`; RTL `start` = the right half).
   - Copy shrinks to its floor: 28 px for labels tied to speech (`SIZE.labelMin`); 60 % of size for display.
   - Below the floor, the element is outlined in `crit` and a `DC_QA overflow` finding is logged. **Snapshot tests and spec renders fail on it.**
   - `dc render snap _selftest` proves that the overflow and per-letter detectors fire.
8. **Determinism.**
   - Use only `random(seed)` from `remotion`. Never use `Math.random`, `Date.now`, `new Date()` or wall-clock time in a component.
   - No network: fonts come from `public/fonts` via `loadFonts()`.
   - The snapshot test renders the 50 % frame twice and requires 0 differing pixels.
9. **Colours, sizes, fonts and FX numbers come only from tokens** (`C`, `SIZE`, `FONT`, `FX`, `PRESETS`, `IMPACT`, `CAMERA`). Never hard-code a hex value or px size in a component. Layout constants (paddings, ratios) are fine.
10. **Text-safe masks** (ADR-002).
    - Set `text: true` on any component that shows copy. Supply `textRect()` when the copy is smaller than its slot.
    - SpecPlayer cuts haze, bokeh and particles out of that rect, plus `fx.textSafePadPx`, but only while the copy is on screen.
    - Chromatic aberration (`caShadow`) applies to Latin and numeral runs only, **never Arabic**. DOF blur never applies to text layers.
11. **No invented numbers.** Every shown number carries `ref`: a data-contract fact id `d:x.y:n`, or the `s:` sentence that speaks it. Demos use real canon and data-contract values too.
12. **Plates for heavy backgrounds.** Real-time WebGL is for the hero tier only (≤ 5 % of frames, ADR-002 RT5), with particles ≤ `FX[tier].particles` (hero cap 1,500 on swiftshader).

## 4. Perf budgets per tier

`dc render perf <Name>` measures slot-seconds per frame at 1920×1080:
- swiftshader, concurrency 1, JPEG q80;
- run through the queue, under whatever load the queue has (load average and queue occupancy are recorded);
- over the whole demo, after one warm-up frame.

| Tier | Budget (slot s/frame) | Basis |
|---|---|---|
| lite | ≤ 0.45 | previews only, at 960×540 in practice; this 1080p number is conservative |
| standard | ≤ 0.60 | ADR-002: the standard rate must stay ≤ 0.201 box s/frame (S-hi + 10 %), ≈ 0.60 slot-s at 3 slots |
| hero | ≤ 3.10 | ADR-002: H = 0.904–1.038 box s/frame × 3 slots |

A component over budget must get cheaper first: cache canvases, avoid per-frame `filter: blur` on large boxes, prefer pre-rendered plates. Otherwise it needs an ADR. `--strict` makes `dc render perf` exit 1 when a tier is over budget.

## 5. Tests and thresholds

`bash studio/scripts/check_p7.sh` runs the unit suites. It is light and does no rendering:
- `arabic.check.ts` (frozen rules);
- `p7.check.ts` (whole-word units, per-letter detector, digits, cv08, ADR-010 bands, fit and overflow, safe areas, AT-4, reveal);
- `resolve.check.ts` (the compiler on the real EDL, word map and `_demo` spec: anchor = word start − lead, cut leads, 12 fps halves, failure reporting, audio curves).

`dc render snap <Name>` runs through the queue:
- It renders stills of `Demo-<Name>` at 0 / 50 / 100 % of its frames, at scale 0.5 (960×540 PNG), in the **lite** tier. Lite has no grain or bokeh noise, so the snapshot diffs only layout, type and motion. Tier looks are frozen tokens, covered by look-dev and perf.
- Each still is compared with pixelmatch (`threshold 0.1`, YIQ per pixel) against `studio/test/baselines/<Name>/`. **Pass: ≤ 0.1 % of pixels differ** (518 px at 960×540).
- It also checks:
  - determinism (the 50 % frame rendered twice, 0 px);
  - that each baseline PNG still matches its sha256 in `meta.json` (a baseline edited outside `--approve` fails);
  - zero `DC_QA` findings (overflow, perletter, label, digits, font);
  - zero registry problems.
- On failure it writes `data/renders/p7/snap/<Name>/<tag>_diff.png`.
- Report: `reports/p7/snap/<Name>.json`.

Every component change re-runs its snapshot and its perf measurement:
- `dc render snap <Name>` must PASS against the approved baseline.
- A *visual* change needs `--approve`, which writes `meta.json` with `approval: "pending-critic"`, followed by a critic review of the three stills. The critic's sign-off is recorded with `--approve --approver <critic-run-id>`. Authors never grade their own baselines (golden rule 4).

## 6. Scene compiler (for reference)

`studio/src/spec/resolve.ts` is pure and also runs in node tests:
- **Anchors.** An anchor lands at `word.rec_start_frame − lead_frames`, in 24 fps record frames, exactly as `dc spec lint` computes it. At fps F a 24 fps frame x maps to `round((x − span.start) · F / 24)`.
- **Shots.** Each shot covers its sentences. The cut sits 5 f before the shot's first word, never before the previous shot's last word ends.
- **Validation.** Props are checked against the frozen zod schemas. Actions (`<Name>.<action>`) attach to their target layer.
- **Shot-level layers.** `CameraRig`, `DepthLayers`, `FXTier`, `AudioReactive`, `WhipPan`, `LightStreakTransition` and `MatchCut` are consumed at shot level.
- **Previews** are 960×540 at 12 fps with the lite tier (open request CR-001: tokens say 15 fps). Finals are 1920×1080 at 24 fps.
- **Resolver report.** `calculateMetadata` sets the duration from the EDL span and returns the resolver report: anchors resolved / unresolved, invalid props, unknown and unimplemented components.
- **Report location.** `dc render spec <id>` writes `data/renders/spec/<id>/<mode>/resolver.json` next to the MP4. `--report <repo path>` keeps a small copy in git.
- **Exit status.** The render fails unless 100 % of anchors resolve and there are no invalid props and no QA findings.
- **Demo specs.** Underscore demo specs (`corpus/specs/_demo.json`) may carry `window: {from, to}` sentence ids, padded 12 f before and 24 f after. `dc spec lint _demo` honours the window. Chapter specs may never carry one.
