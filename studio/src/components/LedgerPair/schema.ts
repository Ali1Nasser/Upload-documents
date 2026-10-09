// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LedgerPair' as const;
export const family = 'Data';
export const description = 'Two ledgers side by side (source vs target) that reconcile or expose a mismatch.';

export const props = K.Base.extend({
  left: z.object({label: K.Label, entries: z.array(z.object({label: K.Label, amount: K.Num}).strict()).min(1).max(8)}).strict(),
  right: z.object({label: K.Label, entries: z.array(z.object({label: K.Label, amount: K.Num}).strict()).min(1).max(8)}).strict(),
}).strict();

export const actions = {
  reconcile: K.Action.extend({target: K.LayerId.optional()}).strict(),
  mismatch: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(7)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
