// CameraRig (catalog: State & FX). SHOT-LEVEL component: it never draws a layer of its own. The scene compiler
// (src/spec/resolve.ts) reads its validated props into ResolvedShot.camera (move / ease / intensity, nudges resolved from
// {word, lead_frames} to shot-local frames at the composition fps, one rounding, ADR-011 RD1), and SpecPlayer applies
// src/spec/rig.ts cameraAt() to every depth plane: ambient push 1.5-3 % per 5 s by intensity (04 section 2, capped per shot),
// the move's own displacement, and a one-frame impact nudge of IMPACT.nudgePxMax (4 px) on each nudge anchor frame (RV1: the
// nudge lands ON the anchor frame). Copy boxes are pre-shrunk by the camera envelope (cameraSafeBox), so copy stays title-safe at
// the peak of the move. `follow` is accepted by the frozen schema; until CR-004 lands it moves like `truck` (documented in
// docs/p7/catalog_status/fx-b.md).
import type {DcComponent} from '../../spec/types';
import type {Props} from './schema';

const ShotLevel: DcComponent<Props>['Component'] = () => null; // consumed by the compiler, never mounted as a layer

export const CameraRig: DcComponent<Props> = {name: 'CameraRig', Component: ShotLevel};
