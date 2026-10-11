// DepthLayers (catalog: State & FX). SHOT-LEVEL component: it never draws a layer of its own. The scene compiler
// (src/spec/resolve.ts) maps each {layer, plane, parallax, blur} onto the target layer's ResolvedLayer (depth plane, parallax
// factor, DOF fraction); SpecPlayer draws the planes far -> mid -> near -> fg and transforms each with
// rig.ts planeStyle(camera, parallax) (04 section 1.2: 3-5 parallax planes, far planes move less). Fake DOF = blur x
// FX[tier].dofBlurPx (lite 0, standard / hero 4 px: "blur capped by FX tier"); DOF never blurs copy (text: true layers), and
// copy boxes are shrunk by the camera envelope on THEIR plane, so a high-parallax plane stays title-safe.
import type {DcComponent} from '../../spec/types';
import type {Props} from './schema';

const ShotLevel: DcComponent<Props>['Component'] = () => null; // consumed by the compiler, never mounted as a layer

export const DepthLayers: DcComponent<Props> = {name: 'DepthLayers', Component: ShotLevel};
