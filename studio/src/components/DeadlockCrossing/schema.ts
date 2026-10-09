// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'DeadlockCrossing' as const;
export const family = 'Domain specials';
export const description = 'Transactions holding and waiting on resources until a victim is chosen.';

export const props = K.Base.extend({
  txns: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(2).max(4),
  resources: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(2).max(4),
  holds: z.array(z.object({txn: K.LayerId, res: K.LayerId}).strict()).min(0).max(8),
  waits: z.array(z.object({txn: K.LayerId, res: K.LayerId}).strict()).min(0).max(8),
}).strict();

export const actions = {
  resolve: K.Action.extend({target: K.LayerId.optional(), victim: K.LayerId}).strict(),
} as const;

export type Props = z.infer<typeof props>;
