// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'FixSettle' as const;
export const family = 'State & FX';
export const description = 'Fix beat: the target settles into place with a settle chime.';

export const props = K.Base.extend({
  to: K.LayerId.optional(),
  label_ar: K.Label.optional(),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
