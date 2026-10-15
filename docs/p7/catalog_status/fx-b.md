# P7 catalog status: group fx-b (State & FX, shot-level)

Date: 2026-10-11. Author: motion-engineer (fx-b). Engine: `studio/src/spec` at 2c5ea84 (ADR-011: RD1 rounding, onset RV1, preview 12 fps).
The WIP drafts from 7d76221 were reviewed and kept. The unit checks were re-run, and snap, perf and Arabic QA were re-measured on 2026-10-11.

All seven components are **shot-level**: the scene compiler consumes them, and none draws a layer of its own (04 §8; component guide §6 "Shot-level layers").
`resolve.ts` reads their validated props, and `rig.ts` / `SpecPlayer.tsx` apply them. The fx-b files register them, document them, demo them and test them.
The fx-b files never edit the shared engine. Where the engine drops a frozen prop, a component request is filed.

| Component | Status | What renders it | Snap (lite, 4 stills) | Box s/frame lite / standard / hero (budget 0.201 / 0.201 / 1.038) |
|---|---|---|---|---|
| CameraRig | implemented | `resolve.ts` builds `ResolvedShot.camera` (move, ease, intensity, nudges resolved with one rounding); `rig.ts` provides `cameraAt`, `cameraSafeBox` and `planeStyle` | PASS, det 0 px, qa 0 | 0.1645 (queue load 6.7) / **0.0792** / 0.0769 (re-measured 2026-10-15 21:42) |
| DepthLayers | implemented | `resolve.ts` maps each layer to its depth plane, parallax and blur; SpecPlayer draws the planes far→fg with `planeStyle`; DOF = blur × `FX[tier].dofBlurPx`, never on copy | PASS, det 0 px, qa 0 | 0.0795 / **0.0991** / 0.0991 |
| FXTier | implemented | `ResolvedShot.tier` (priority: preview = lite > forced perf tier > FXTier > shot.fx_tier > standard); the frozen `FX[tier]` object; text-safe masks at every tier | PASS, det 0 px, qa 0 | 0.0779 / **0.1051** / 0.1064 |
| AudioReactive | implemented | `resolve.ts` builds one curve per feature × smoothing from the locked P5 features (24 fps; coefficient re-derived per fps); `modAt` feeds `ctx.mod[param]`; haze drives the backdrop | PASS, det 0 px, qa 0 | 0.0749 / **0.0991** / 0.1038 |
| WhipPan | mapped → compiler transition `whip` | `TRANSITION_ALIAS` WhipPan → whip (12 f @ 24); `rig.ts transitionState` | n/a (see below) | n/a |
| LightStreakTransition | mapped → compiler transition `streak` | streak → `streakAt` overlay in SpecPlayer | n/a | n/a |
| MatchCut | mapped → compiler transition `match` | match → backdrop fade-in with a 1.04 → 1 scale; copy is never faded in (M5) | n/a | n/a |

Evidence:
- snapshots: `reports/p7/snap/<Name>.{json,jpg}`; the baselines in `studio/test/baselines/<Name>/meta.json` are **pending-critic**;
- perf: `reports/perf/components/<Name>.json`, concurrency 3, `other_jobs_running` 0;
- Arabic QA: `reports/qa/arabic/p7-fx-b.json`. It passed on 8 strings, OCR min 0.947, with 0 tofu, overflow, BiDi, digit, join or per-letter findings.
- unit checks: `studio/src/components/_fx-b/shot_level.check.ts`, all 69 passed. To run it, bundle with esbuild exactly as `check_p7.sh` does, then run `node` with `NODE_PATH=studio/node_modules` and `DC_ROOT=<repo>`.

The hero figures match standard because none of these demos uses WebGL. The hero cost of a 3D layer belongs to the component that draws it.

## Why the three transitions are *mapped*, not implemented

1. **They cannot be mounted.**
   - `resolve.ts` returns early for WhipPan, LightStreakTransition and MatchCut. They are never pushed as layers, so a `<Name>.tsx` Component would never render.
   - `DemoDef` is a single shot. The last shot's transition is always 0 frames, so a `Demo-<Name>` cannot show a transition at all.
   - The visual verb (04 §2: "whip-pan with a light streak = scene transition"; "prefer match cuts") is therefore delivered by the compiler's built-in transition kinds. Any spec that uses these layers resolves to them, and they never count as unimplemented in a final.
2. **Gaps against the frozen props and 04 §1.3, filed as CR-003.**
   - `direction`, `color`, `motion_blur` and MatchCut `from` / `to` / `kind` are validated but dropped.
   - The engine whip and streak apply a whole-frame CSS blur at **every** tier, but 04 §1.3 says motion blur is "none" at lite and standard, with `CameraMotionBlur` on hero whips only.
   - The streak only appears in the outgoing shot, so it vanishes at its peak on the cut.
   - MatchCut has no geometric from → to match.
3. **The drop-in exists.**
   - `studio/src/components/_fx-b/transitions.ts` provides `fxbTransitionOf`, `fxbTransitionState`, `fxbStreakP`, `streakBand` and `matchWrap`, with the same return shape as `TransitionState` plus `motionBlur`.
   - It is unit-tested in `shot_level.check.ts`: 4 directions; no whole-frame blur below hero; a streak continuous across the cut; match shape / position / colour.
   - The engine owner wires it once CR-003 is decided. The three components then become *implemented*, and they get two-shot snapshots (which also needs CR-005-style DemoDef support for a second shot, or a `_demo` spec).

## Known limitations of the implemented four (closest correct behaviour)

- **CameraRig re-verification 2026-10-15.** Demo is the exaggerated dolly_zoom (intensity 1) with a nudge on the third word; snap PASS (det 0 px; one run under box load 10 gave a 1,070 px determinism miss on p50, not reproduced in 2 further runs, reported to render-ops); baselines unchanged (pending-critic, critic round-1 B4 addressed by the demo plus `reports/p7/evidence/fx-b/CameraRig_motion.jpg`: onion skin f8/f95 and the f61/f62 nudge difference); Arabic QA `reports/qa/arabic/p7-CameraRig.json` PASS (2 strings, OCR 1.0). Still open: CR-004 (engine).
- **CameraRig round-1 critic conditions (2026-10-15, 21:40).** Evidence strip `reports/p7/evidence/fx-b/CameraRig_motion.jpg` re-rendered: panels 960 px wide (2 per line), onion legend corrected (f30 cyan / f95 yellow, so the counter is in both frames). Snap re-run without `--approve` (visuals unchanged, so the approved-critic baselines stay): 0 px on p0/a1/p50/p100, det 0, qa 0. The run reports FAIL only because `demos/fx-b.tsx` carries the DepthLayers draft demos `DepthLayersX1` / `DepthLayersX2`, which are not catalog components (DC_REGISTRY); that belongs to the DepthLayers owner. Baseline tier (lite) and the p0 frame are fixed by the shared snap harness (CR-016 covers frame choice). A spec-lint warning for `move: 'follow'` is still needed (spec lint is outside the fx-b paths).
- **CameraRig `follow`** (CR-004). The `follow` layer id is dropped, so `move: 'follow'` behaves like `truck`. `orbit` and `yaw` are 2D hints (pan + slight roll); a true orbit lives in the 3D components (04 §2).
- **AudioReactive demo** (CR-005). `DemoDef` carries no features, so `Demo-AudioReactive` stills and perf show the unmodulated layers.
  - The modulation path is proven on synthetic features in `shot_level.check.ts`: curves in 0..1, smoothing order, the target only, and 12 fps tracking 24 fps.
  - It is also proven in chapter renders, which carry the locked P5 features.
  - Which params a target honours is up to the target component: KineticWord reads glow, scale and opacity; NumberCounter reads glow; haze drives the backdrop.
- **DepthLayers demo.**
  - Both subject layers carry copy, so the far plane's `blur: 0.6` has no visible effect: DOF never blurs copy (ADR-002).
  - Snapshots are lite, where `dofBlurPx` is 0, so they show parallax only.
  - The demos use only the reviewed reference components (KineticWord, NumberCounter, TableGrid), so other groups' baselines cannot break fx-b snapshots.

## Demo content (canon, data contract §5.2)

All demo copy comes from NilePay receipts T1–T6 (`d:5.2:1`–`d:5.2:6`):
- success rate 66.67 % (`d:5.2:7` = 4/6 OK);
- successful total 400 EGP (`d:5.2:8` = 120 + 80 + 50 + 150);
- T3 200 EGP FAILED (`d:5.2:3`).

There are no invented numbers. The Arabic labels are الإيصالات / نسبة النجاح / الإجمالي الناجح / إيصال T3 / إيصالات NilePay.
