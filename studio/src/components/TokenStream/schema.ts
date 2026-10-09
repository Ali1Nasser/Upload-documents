// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TokenStream' as const;
export const family = 'Space & 3D';
export const description = 'Text broken into tokens that stream past (optionally with ids).';

export const props = K.Base.extend({
  tokens: z.array(K.Txt(20)).min(1).max(40),
  show_ids: z.boolean().default(false),
  tokenizer: K.Label.optional(),
}).strict();

export const actions = {
  emit: K.Action.extend({target: K.LayerId.optional(), count: z.number().int().min(1).max(40)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
