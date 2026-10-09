// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Pulse' as const;
export const family = 'State & FX';
export const description = 'Pulse a target 1-4 times.';

export const props = K.Base.extend({
  to: K.LayerId,
  color: K.ColorTok.default('signal'),
  times: z.number().int().min(1).max(4).default(1),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
