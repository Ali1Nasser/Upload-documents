// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'PageScan' as const;
export const family = 'Domain specials';
export const description = 'Data pages scanned fully, by index or by range.';

export const props = K.Base.extend({
  pages: z.number().int().min(1).max(64),
  scan: z.enum(['full', 'index', 'range']),
  hits: z.array(z.number().int().min(0).max(63)).min(0).max(64).optional(),
}).strict();

export const actions = {
  scan: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
