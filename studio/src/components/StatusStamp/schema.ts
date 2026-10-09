// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'StatusStamp' as const;
export const family = 'Domain specials';
export const description = 'A status stamp on a target.';

export const props = K.Base.extend({
  status: z.enum(['ok', 'fail', 'pending', 'approved', 'rejected', 'retry']),
  label_ar: K.Label.optional(),
  to: K.LayerId.optional(),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
