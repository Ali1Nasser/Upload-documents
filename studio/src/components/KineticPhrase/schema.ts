// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'KineticPhrase' as const;
export const family = 'Type & UI';
export const description = 'Up to 6 kinetic words on at most 2 lines, each word arriving on its own spoken word anchor.';

export const props = K.Base.extend({
  words: z.array(z.object({text: K.Txt(32), at: K.WordAnchor, emphasis: z.enum(['none', 'stressed', 'number', 'term']).optional(), color: K.ColorTok.optional()}).strict()).min(1).max(6),
  lines: z.number().int().min(1).max(2).default(1),
  size: K.SizeTok.default('kinetic'),
  align: z.enum(['start', 'center']).default('start'),
  preset: K.PresetTok.default('arrive'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
