// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'RaceCondition' as const;
export const family = 'Domain specials';
export const description = 'Threads racing on shared state; a lock serialises them.';

export const props = K.Base.extend({
  threads: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(2).max(4),
  shared: K.Label,
}).strict();

export const actions = {
  collide: K.Action.extend({target: K.LayerId.optional()}).strict(),
  lock: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
