// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TxnCapsule' as const;
export const family = 'Domain specials';
export const description = 'A transaction capsule of operations that commits or rolls back.';

export const props = K.Base.extend({
  ops: z.array(z.string().max(48)).min(1).max(8),
  isolation: z.enum(['read_uncommitted', 'read_committed', 'repeatable_read', 'serializable']).optional(),
  outcome: z.enum(['commit', 'rollback']).optional(),
}).strict();

export const actions = {
  commit: K.Action.extend({target: K.LayerId.optional()}).strict(),
  rollback: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
