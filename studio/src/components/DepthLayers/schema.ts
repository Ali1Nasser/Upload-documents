// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'DepthLayers' as const;
export const family = 'State & FX';
export const description = 'Assign layers to depth planes with parallax and fake DOF (blur capped by FX tier).';

export const props = K.Base.extend({
  planes: z.array(z.object({layer: K.LayerId, plane: K.Plane, parallax: z.number().min(0).max(3).default(1), blur: K.Frac.default(0)}).strict()).min(1).max(12),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
