// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'AttentionBeams' as const;
export const family = 'Space & 3D';
export const description = 'Beams from a focus token to the tokens it attends to.';

export const props = K.Base.extend({
  tokens: z.array(K.Txt(20)).min(2).max(16),
  focus: z.number().int().min(0).max(15),
  weights: z.array(K.Frac).min(2).max(16).optional(),
  ref: K.NumberRef.optional(),
}).strict();

export const actions = {
  attend: K.Action.extend({target: K.LayerId.optional(), from: z.number().int().min(0).max(15), to: z.array(z.number().int().min(0).max(15)).min(1).max(16)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
