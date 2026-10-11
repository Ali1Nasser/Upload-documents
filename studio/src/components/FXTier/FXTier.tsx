// FXTier (catalog: State & FX). SHOT-LEVEL component: it never draws a layer of its own. The scene compiler
// (src/spec/resolve.ts) sets ResolvedShot.tier from `tier` (priority: preview = lite > forced tier of a perf run > FXTier >
// shot.fx_tier > standard). Every layer then receives the FROZEN FX[tier] token object (ADR-002 FX2: glow radii, grain,
// vignette, CA px, haze, DOF, bokeh count, particle cap, GL bloom flag). No per-shot overrides exist by design, and text-safe
// masks stay on at every tier (FX[*].textSafe = true). Real-time WebGL is allowed only where FX[tier].webgl (hero; <= 5 % of
// frames, ADR-002 RT5), always with a standard-tier fallback in the component that uses it.
import type {DcComponent} from '../../spec/types';
import type {Props} from './schema';

const ShotLevel: DcComponent<Props>['Component'] = () => null; // consumed by the compiler, never mounted as a layer

export const FXTier: DcComponent<Props> = {name: 'FXTier', Component: ShotLevel};
