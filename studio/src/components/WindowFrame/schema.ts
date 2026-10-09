// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'WindowFrame' as const;
export const family = 'Data';
export const description = 'A window function frame sliding over ordered rows of a partition.';

export const props = K.Base.extend({
  partition_by: z.string().max(40).optional(),
  order_by: z.string().max(40),
  frame_kind: z.enum(['rows', 'range', 'groups']),
  bounds: z.tuple([z.string().max(24), z.string().max(24)]),
  values: z.array(z.union([z.number(), z.string().max(16)])).min(1).max(16),
  ref: K.NumberRef.optional(),
}).strict();

export const actions = {
  slide: K.Action.extend({target: K.LayerId.optional(), to: z.number().int().min(0).max(15)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
