// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'GuardedAgentLoop' as const;
export const family = 'Domain specials';
export const description = 'An agent loop (plan -> act -> observe) with guard checkpoints that can block a step.';

export const props = K.Base.extend({
  steps: z.array(z.object({label: K.Label, kind: z.enum(['plan', 'act', 'observe', 'guard'])}).strict()).min(3).max(8),
  guards: z.array(K.Label).min(0).max(4),
}).strict();

export const actions = {
  iterate: K.Action.extend({target: K.LayerId.optional()}).strict(),
  block: K.Action.extend({target: K.LayerId.optional(), guard: z.number().int().min(0).max(3)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
