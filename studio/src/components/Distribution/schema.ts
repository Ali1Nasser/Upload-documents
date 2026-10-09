// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Distribution' as const;
export const family = 'Data';
export const description = 'A distribution curve (parametric or empirical) with labelled markers.';

export const props = K.Base.extend({
  kind: z.enum(['normal', 'skewed', 'bimodal', 'uniform', 'long-tail', 'empirical']),
  values: z.array(z.number()).min(2).max(400).optional(),
  ref: K.NumberRef,
  markers: z.array(z.object({at_value: z.number(), label: K.Label}).strict()).min(0).max(4).optional(),
}).strict();

export const actions = {
  shade: K.Action.extend({target: K.LayerId.optional(), lo: z.number(), hi: z.number()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
