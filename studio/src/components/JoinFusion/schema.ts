// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'JoinFusion' as const;
export const family = 'Data';
export const description = 'Two tables fusing on a key; join kind decides which rows survive.';

export const props = K.Base.extend({
  left: z.object({name: K.Label, keys: z.array(z.string().max(24)).min(1).max(8)}).strict(),
  right: z.object({name: K.Label, keys: z.array(z.string().max(24)).min(1).max(8)}).strict(),
  on: z.string().max(40),
  kind: z.enum(['inner', 'left', 'right', 'full', 'anti', 'semi', 'cross']),
  result_rows: K.Num.optional(),
}).strict();

export const actions = {
  fuse: K.Action.extend({target: K.LayerId.optional()}).strict(),
  showUnmatched: K.Action.extend({target: K.LayerId.optional(), side: z.enum(['left', 'right', 'both'])}).strict(),
} as const;

export type Props = z.infer<typeof props>;
