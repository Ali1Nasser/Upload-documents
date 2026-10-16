# P7 catalog status: group fx-b (State & FX, shot-level)

Date: 2026-10-11. Author: motion-engineer (fx-b). Engine: `studio/src/spec` at 2c5ea84 (ADR-011: RD1 rounding, onset RV1, preview 12 fps).
The WIP drafts from 7d76221 were reviewed and kept. The unit checks were re-run, and snap, perf and Arabic QA were re-measured on 2026-10-11.

All seven components are **shot-level**: the scene compiler consumes them, and none draws a layer of its own (04 §8; component guide §6 "Shot-level layers").
`resolve.ts` reads their validated props, and `rig.ts` / `SpecPlayer.tsx` apply them. The fx-b files register them, document them, demo them and test them.
The fx-b files never edit the shared engine. Where the engine drops a frozen prop, a component request is filed.

| Component | Status | What renders it | Snap (lite, 4 stills) | Box s/frame lite / standard / hero (budget 0.201 / 0.201 / 1.038) |
|---|---|---|---|---|
| CameraRig | implemented | `resolve.ts` builds `ResolvedShot.camera` (move, ease, intensity, nudges resolved with one rounding); `rig.ts` provides `cameraAt`, `cameraSafeBox` and `planeStyle` | PASS, det 0 px, qa 0 | 0.1645 (queue load 6.7) / **0.0792** / 0.0769 (re-measured 2026-10-15 21:42) |
| DepthLayers | implemented | `resolve.ts` maps each layer to its depth plane, parallax and blur; SpecPlayer draws the planes far→fg with `planeStyle`; DOF = blur × `FX[tier].dofBlurPx`, never on copy | PASS, det 0 px, qa 0 | 0.1289 / **0.1872** / 0.2033 (2026-10-15, 4 planes: HoloGrid far, KineticWord, NumberCounter, ParticleField fg; blur 0, see CR-017) |
| FXTier | implemented | `ResolvedShot.tier` (priority: preview = lite > forced perf tier > FXTier > shot.fx_tier > standard); the frozen `FX[tier]` object; text-safe masks at every tier | PASS, det 0 px, qa 0 | 0.0629 / **0.0802** / 0.0832 (re-measured 2026-10-16, other_jobs_running 0) |
| AudioReactive | implemented | `resolve.ts` builds one curve per feature × smoothing from the locked P5 features (24 fps; coefficient re-derived per fps); `modAt` feeds `ctx.mod[param]`; haze drives the backdrop | PASS, det 0 px, qa 0 | 0.0589 / **0.0755** / 0.0773 (re-measured 2026-10-16, other_jobs_running 0) |
| WhipPan | mapped → compiler transition `whip` | `TRANSITION_ALIAS` WhipPan → whip (12 f @ 24); `rig.ts transitionState` | n/a (see below) | n/a |
| LightStreakTransition | **mapped** → compiler transition `streak` (same verb as WhipPan's streak, 04 §2); props-aware drop-in ready in `_fx-b/transitions.ts`, blocked on CR-003 | streak → `streakAt` overlay in SpecPlayer | n/a (cannot be mounted) | n/a |
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

- **WhipPan re-check 2026-10-16 (status unchanged: mapped).** The engine is unchanged since 2c5ea84 and CR-003 is still `open`, so `resolve.ts` (line ~276) still returns early for WhipPan and a `WhipPan.tsx` layer could never be mounted. The compiler `whip` transition renders it (12 f @ 24, `TRANSITION_ALIAS`), with the known gaps listed above (always RTL, `motion_blur` ignored, whole-frame CSS blur at every tier). Critic B5 ("do not approve on mapped") can only be met by wiring `_fx-b/transitions.ts` (`fxbTransitionOf`, `fxbTransitionState`, `fxbStreakP`) into `rig.ts` / `SpecPlayer.tsx`, which is outside the fx-b paths. No baseline, snap or perf run exists or is possible for it (a two-shot demo also needs DemoDef support for a second shot). Unblock: Council ADR on CR-003, then the engine owner wires the drop-in and WhipPan gets a 3-frame strip (out, mid, in) plus a hero-tier whip with `CameraMotionBlur`.

- **FXTier re-verification 2026-10-16.** Critic B2 (tier look not visible in lite stills) is addressed by `reports/p7/evidence/fx-b/FXTier_tiers.jpg` (same frame at lite / standard / hero with a difference panel, plus the impact flash and bloom on FAILED); the snap harness fixes the baseline tier at lite (CR-016), as accepted for DepthLayers round 2. The review note on two unconnected objects is fixed (FAILED lands under the failed 200 EGP, one idea). Snap re-run PASS (0 px on p0/a1/p50/p100, det 0, qa 0); Arabic QA `reports/qa/arabic/p7-FXTier.json` PASS (OCR 1.0). Baselines stay pending-critic; hero equals standard because FXTier itself draws no WebGL.

## Known limitations of the implemented four (closest correct behaviour)

- **CameraRig re-verification 2026-10-15.** Demo is the exaggerated dolly_zoom (intensity 1) with a nudge on the third word; snap PASS (det 0 px; one run under box load 10 gave a 1,070 px determinism miss on p50, not reproduced in 2 further runs, reported to render-ops); baselines unchanged (pending-critic, critic round-1 B4 addressed by the demo plus `reports/p7/evidence/fx-b/CameraRig_motion.jpg`: onion skin f8/f95 and the f61/f62 nudge difference); Arabic QA `reports/qa/arabic/p7-CameraRig.json` PASS (2 strings, OCR 1.0). Still open: CR-004 (engine).
- **CameraRig round-1 critic conditions (2026-10-15, 21:40).** Evidence strip `reports/p7/evidence/fx-b/CameraRig_motion.jpg` re-rendered: panels 960 px wide (2 per line), onion legend corrected (f30 cyan / f95 yellow, so the counter is in both frames). Snap re-run without `--approve` (visuals unchanged, so the approved-critic baselines stay): 0 px on p0/a1/p50/p100, det 0, qa 0. The run reports FAIL only because `demos/fx-b.tsx` carries the DepthLayers draft demos `DepthLayersX1` / `DepthLayersX2`, which are not catalog components (DC_REGISTRY); that belongs to the DepthLayers owner. Baseline tier (lite) and the p0 frame are fixed by the shared snap harness (CR-016 covers frame choice). A spec-lint warning for `move: 'follow'` is still needed (spec lint is outside the fx-b paths).
- **CameraRig `follow`** (CR-004). The `follow` layer id is dropped, so `move: 'follow'` behaves like `truck`. `orbit` and `yaw` are 2D hints (pan + slight roll); a true orbit lives in the 3D components (04 §2).
- **AudioReactive re-verification 2026-10-16 (critic B1).** The evidence strip `reports/p7/evidence/fx-b/AudioReactive_quiet_loud.jpg` now uses REAL locked P5 features (CH-29 record frames 306..377 = a 40-frame pause, and 1170..1241 = a word onset at -15 dBFS), not synthetic ones: quiet and loud f60 at standard, the |loud - quiet| x3 difference (halo on the 400 EGP counter, scale fringe on NilePay) and the two feature curves. Snap re-run PASS (0 px, det 0, qa 0, baseline PNGs unchanged, pending-critic); perf as above; Arabic QA `reports/qa/arabic/p7-AudioReactive.json` PASS (OCR 1.0). The Demo-AudioReactive baselines themselves stay unmodulated until CR-005 (engine, open) lets a DemoDef carry features.
- **AudioReactive demo** (CR-005). `DemoDef` carries no features, so `Demo-AudioReactive` stills and perf show the unmodulated layers.
  - The modulation path is proven on synthetic features in `shot_level.check.ts`: curves in 0..1, smoothing order, the target only, and 12 fps tracking 24 fps.
  - It is also proven in chapter renders, which carry the locked P5 features.
  - Which params a target honours is up to the target component: KineticWord reads glow, scale and opacity; NumberCounter reads glow; haze drives the backdrop.
- **DepthLayers demo (2026-10-15, critic round-1 B3 addressed).**
  - The demo has 4 planes: HoloGrid far (0.4), NumberCounter 400 EGP mid (1.0), KineticWord NilePay near (1.3) and ParticleField dust fg (1.6) under a 0.7 truck. Foreground bokeh discs come from the tier backdrop. The two non-copy planes are the far and fg ones.
  - Evidence `reports/p7/evidence/fx-b/DepthLayers_parallax.jpg`: onion f0/f95 (differential parallax), DOF on vs off at standard and hero, lite vs standard. The evidence stills are not byte-deterministic at threshold 0 for the lite and DOF-standard jobs (about 1,550 px); the snapshot (threshold 0.1) is det 0 px.
  - **DOF is OFF (blur 0) in the shipped demo because of cost (CR-017).** The engine blurs a layer as one full-frame CSS filter. Measured at standard: 0.194 without blur, 0.311 with the grid blurred, 0.485 with grid and dust blurred (budget 0.201). Hero fits (0.478 of 1.038). Until CR-017 lands, a spec that sets `planes[].blur > 0` in a standard shot spends 0.12-0.17 box s/frame per blurred plane; use it on hero shots only. Spec lint does not warn yet (outside the fx-b paths).
  - Snapshots are lite, where `dofBlurPx` is 0, so they show parallax and atmospheric dimming only. The baselines are pending-critic (p50 re-written; 0 px visual diff against the previous one).
  - The hard-edged dark rectangle behind the counter in the lite stills is the NumberCounter / backdrop text-safe cut-out, not DepthLayers.
  - The old draft demos `DepthLayersX1` / `DepthLayersX2` were removed (they were not catalog components and made the snap runs of other fx-b components report a registry problem).

## Demo content (canon, data contract §5.2)

All demo copy comes from NilePay receipts T1–T6 (`d:5.2:1`–`d:5.2:6`):
- success rate 66.67 % (`d:5.2:7` = 4/6 OK);
- successful total 400 EGP (`d:5.2:8` = 120 + 80 + 50 + 150);
- T3 200 EGP FAILED (`d:5.2:3`).

There are no invented numbers. The Arabic labels are الإيصالات / نسبة النجاح / الإجمالي الناجح / إيصال T3 / إيصالات NilePay.

Arabic QA for DepthLayers (label الإجمالي الناجح, the only Arabic string): `reports/qa/arabic/p7-DepthLayers.json`, PASS (OCR 1.0).

## LightStreakTransition decision (2026-10-16, motion-engineer fx-b)

Status: **mapped** (not implemented, not approved). Reasons, with numbers:
- It cannot be mounted. `resolve.ts:230-233` finds the layer, reads `{type, frames}` only, and returns before any layer is pushed (`resolve.ts:276`). A `LightStreakTransition.tsx`, a `Demo-LightStreakTransition` or a snapshot would never draw anything. `DemoDef` is one shot and its transition is 0 frames, so there is no honest still to baseline. Registering a component that the compiler never mounts would only make `isImplemented` lie.
- It is the same visual verb as WhipPan: 04 section 2 has one phrase, "whip-pan with a light streak = scene transition". The compiler already has one `streak` kind (`rig.ts streakAt`, `SpecPlayer.tsx:151`). The only difference is that the streak transition travels a quarter frame with a bright band and the whip travels half a frame. Both are drawn by the same engine path.
- The frozen props `direction` (4 values) and `color` (a colour token) are validated and then dropped: the band is always RTL and always `C.signal`. Critic B5 (reports/p7/review_fx-b.md) lists the same gaps: whole-frame CSS blur 12 px at every tier (04 section 1.3 allows no motion blur at lite and standard), and the band ends at its peak on the cut because it is drawn in the outgoing shot only.
- The fix is engine work outside the fx-b paths and needs the Council ADR for CR-003 (still `open`). The drop-in `fxbTransitionOf / fxbTransitionState / fxbStreakP / streakBand` in `studio/src/components/_fx-b/transitions.ts` is complete: 4 directions, `color` token, no blur below hero, a band continuous across the cut, text-safe. Its unit checks pass (69 ok; the 2 failures in `shot_level.check.ts` are stale DepthLayers expectations for blur 0.6 / 1 that CR-017 turned into 0, not transitions).
- When CR-003 lands: wire the drop-in, add a two-shot demo path (a `_demo` spec with a second shot, or `DemoDef.next`), take the critic's out / mid / in strip at standard (one RTL, one LTR with `color: coral`), re-run snap, perf and Arabic QA, then move this row to implemented. The streak carries no copy, so Arabic QA is n/a for the transition itself.
