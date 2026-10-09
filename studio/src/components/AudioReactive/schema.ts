// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'AudioReactive' as const;
export const family = 'State & FX';
export const description = 'Modulate one visual parameter of a layer from a locked audio feature (P5 features at 24 fps).';

export const props = K.Base.extend({
  feature: z.enum(['rms_dbfs', 'onset_strength', 'centroid_hz']),
  to: K.LayerId,
  param: z.enum(['glow', 'scale', 'opacity', 'particles', 'haze']),
  amount: K.Frac.default(0.3),
  smoothing: z.enum(['low', 'medium', 'high']).default('medium'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
