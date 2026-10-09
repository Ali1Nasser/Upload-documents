// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'AppliedSteps' as const;
export const family = 'Domain specials';
export const description = 'Power Query-style applied steps list.';

export const props = K.Base.extend({
  steps: z.array(z.object({label: K.Label, kind: z.string().max(16).optional()}).strict()).min(1).max(12),
}).strict();

export const actions = {
  select: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(11)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
