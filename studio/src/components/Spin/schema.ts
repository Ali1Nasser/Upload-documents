// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Spin' as const;
export const family = 'State & FX';
export const description = 'Spin a target about an axis.';

export const props = K.Base.extend({
  to: K.LayerId,
  turns: z.number().min(0.25).max(4).default(1),
  axis: z.enum(['x', 'y', 'z']).default('y'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
