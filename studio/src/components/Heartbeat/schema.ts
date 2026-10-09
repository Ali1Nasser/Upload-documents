// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Heartbeat' as const;
export const family = 'Domain specials';
export const description = 'Nodes sending heartbeats; a missed beat marks a node suspect.';

export const props = K.Base.extend({
  nodes: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(1).max(8),
  interval: K.Num.optional(),
}).strict();

export const actions = {
  miss: K.Action.extend({target: K.LayerId.optional(), node: K.LayerId}).strict(),
  recover: K.Action.extend({target: K.LayerId.optional(), node: K.LayerId}).strict(),
} as const;

export type Props = z.infer<typeof props>;
