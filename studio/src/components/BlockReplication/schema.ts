// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'BlockReplication' as const;
export const family = 'Structure & flow';
export const description = 'Blocks replicated across nodes; a node fails and blocks re-replicate.';

export const props = K.Base.extend({
  blocks: z.number().int().min(1).max(12),
  nodes: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(2).max(8),
  factor: z.number().int().min(1).max(5).default(3),
}).strict();

export const actions = {
  failNode: K.Action.extend({target: K.LayerId.optional(), node: K.LayerId}).strict(),
  rereplicate: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
