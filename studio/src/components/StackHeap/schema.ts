// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'StackHeap' as const;
export const family = 'Structure & flow';
export const description = 'Call stack frames and heap objects with references.';

export const props = K.Base.extend({
  frames: z.array(z.object({label: K.Label, vars: z.array(K.Label).min(0).max(6).optional()}).strict()).min(0).max(10),
  heap: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(0).max(12),
  refs: z.array(z.object({from: z.string().max(32), to: K.LayerId}).strict()).min(0).max(24),
}).strict();

export const actions = {
  push: K.Action.extend({target: K.LayerId.optional(), label: K.Label}).strict(),
  pop: K.Action.extend({target: K.LayerId.optional()}).strict(),
  collect: K.Action.extend({target: K.LayerId.optional(), node: K.LayerId}).strict(),
} as const;

export type Props = z.infer<typeof props>;
