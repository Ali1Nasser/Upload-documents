// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TripleGate' as const;
export const family = 'Domain specials';
export const description = 'Three gates (e.g. validate -> authorise -> settle) that ignite in turn; a payload passes or is rejected.';

export const props = K.Base.extend({
  gates: z.tuple([z.object({label: K.Label, state: z.enum(['dormant', 'open', 'closed', 'fail']).optional()}).strict(), z.object({label: K.Label, state: z.enum(['dormant', 'open', 'closed', 'fail']).optional()}).strict(), z.object({label: K.Label, state: z.enum(['dormant', 'open', 'closed', 'fail']).optional()}).strict()]),
  payload: K.Label.optional(),
}).strict();

export const actions = {
  ignite: K.Action.extend({target: K.LayerId.optional(), gate: z.union([z.number().int().min(0).max(2), z.literal('all')])}).strict(),
  pass: K.Action.extend({target: K.LayerId.optional()}).strict(),
  reject: K.Action.extend({target: K.LayerId.optional(), gate: z.number().int().min(0).max(2)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
