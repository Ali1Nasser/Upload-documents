// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'IdempotentStamp' as const;
export const family = 'Domain specials';
export const description = 'Repeated deliveries with one idempotency key stamp once.';

export const props = K.Base.extend({
  key: K.Label,
  attempts: z.number().int().min(1).max(6),
}).strict();

export const actions = {
  replay: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
