// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ABSplit' as const;
export const family = 'Domain specials';
export const description = 'A/B (n) split of users with conversion rates.';

export const props = K.Base.extend({
  variants: z.array(z.object({label: K.Label, users: K.Num, rate: K.Num}).strict()).min(2).max(4),
}).strict();

export const actions = {
  reveal: K.Action.extend({target: K.LayerId.optional(), winner: z.number().int().min(0).max(3).optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
