// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'SamplingDial' as const;
export const family = 'Domain specials';
export const description = 'Dials for sampling parameters (temperature, top-p ...).';

export const props = K.Base.extend({
  params: z.array(z.object({label: K.Label, value: K.Num, min: z.number(), max: z.number()}).strict()).min(1).max(3),
}).strict();

export const actions = {
  turn: K.Action.extend({target: K.LayerId.optional(), param: z.number().int().min(0).max(2), to: K.Num}).strict(),
} as const;

export type Props = z.infer<typeof props>;
