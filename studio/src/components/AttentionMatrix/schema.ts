// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'AttentionMatrix' as const;
export const family = 'Space & 3D';
export const description = 'A token x token attention matrix (<= 16 tokens).';

export const props = K.Base.extend({
  tokens: z.array(K.Txt(20)).min(2).max(16),
  matrix: z.array(z.array(K.Frac).max(16)).max(16).optional(),
  head: K.Label.optional(),
  ref: K.NumberRef.optional(),
}).strict();

export const actions = {
  highlightRow: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(15)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
