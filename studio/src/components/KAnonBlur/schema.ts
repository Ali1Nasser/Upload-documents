// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'KAnonBlur' as const;
export const family = 'Domain specials';
export const description = 'Rows generalised until each quasi-identifier group has k members.';

export const props = K.Base.extend({
  k: z.number().int().min(2).max(50),
  rows: z.number().int().min(1).max(24),
  quasi_ids: z.array(K.Label).min(1).max(4),
}).strict();

export const actions = {
  generalize: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
