// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'StarSchema3D' as const;
export const family = 'Structure & flow';
export const description = 'A fact table with dimension tables in 3D.';

export const props = K.Base.extend({
  fact: z.object({name: K.Label, measures: z.array(K.Label).min(1).max(6)}).strict(),
  dims: z.array(z.object({name: K.Label, attrs: z.array(K.Label).min(1).max(6)}).strict()).min(2).max(8),
}).strict();

export const actions = {
  focusDim: K.Action.extend({target: K.LayerId.optional(), name: K.Label}).strict(),
} as const;

export type Props = z.infer<typeof props>;
