// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'BranchPaths' as const;
export const family = 'Domain specials';
export const description = 'A question that forks into 2-4 paths with outcomes.';

export const props = K.Base.extend({
  question: K.Txt(80),
  branches: z.array(z.object({label: K.Label, outcome: K.Label, status: K.Status.optional()}).strict()).min(2).max(4),
}).strict();

export const actions = {
  choose: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(3)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
