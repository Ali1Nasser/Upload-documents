// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'HoloGrid' as const;
export const family = 'Space & 3D';
export const description = 'A holographic grid floor or wall.';

export const props = K.Base.extend({
  surface: z.enum(['floor', 'wall']).default('floor'),
  color: K.ColorTok.default('grid'),
  pulse: z.boolean().default(false),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
