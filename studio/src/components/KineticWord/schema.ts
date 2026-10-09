// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'KineticWord' as const;
export const family = 'Type & UI';
export const description = 'One whole word (or a tatweel-joined compound like الـKafka) on screen; never split per letter.';

export const props = K.Base.extend({
  text: K.Txt(32),
  preset: K.PresetTok.default('arrive'),
  size: K.SizeTok.default('kinetic'),
  color: K.ColorTok.default('ink'),
  emphasis: z.enum(['none', 'stressed', 'number', 'term']).default('none'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
