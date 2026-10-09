// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TestGate' as const;
export const family = 'Domain specials';
export const description = 'Tests that run and pass, fail or skip before a merge gate.';

export const props = K.Base.extend({
  tests: z.array(z.object({name: z.string().max(48), status: z.enum(['pending', 'pass', 'fail', 'skip'])}).strict()).min(1).max(12),
}).strict();

export const actions = {
  run: K.Action.extend({target: K.LayerId.optional()}).strict(),
  fail: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(11)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
