// AudioReactive (catalog: State & FX). SHOT-LEVEL component: it never draws a layer of its own. The scene compiler
// (src/spec/resolve.ts) builds one curve per feature x smoothing from the LOCKED P5 features (24 fps record frames,
// corpus/edl/features/<chapter>.json), normalised to 0..1 (rms_dbfs -50..-10 dBFS, onset_strength 0..1, centroid 0..6 kHz) and
// smoothed with a one-pole filter whose 24 fps coefficient (low 0.5 / medium 0.25 / high 0.1) is re-derived for the composition
// fps. SpecPlayer passes amount x curve to the target layer as ctx.mod[param]: KineticWord reads glow, scale (at most 8 % x
// mod.scale) and opacity; NumberCounter reads glow; `haze` drives the shot backdrop haze; `particles` is read by particle
// components when they land (each target component documents which params it honours). The modulation is deterministic
// (locked data, no randomness). Demo-AudioReactive has no features (DemoDef carries none; CR-005), so its stills show the
// unmodulated layer; _fx-b/shot_level.check.ts proves the curve and the per-layer modulation on synthetic features.
import type {DcComponent} from '../../spec/types';
import type {Props} from './schema';

const ShotLevel: DcComponent<Props>['Component'] = () => null; // consumed by the compiler, never mounted as a layer

export const AudioReactive: DcComponent<Props> = {name: 'AudioReactive', Component: ShotLevel};
