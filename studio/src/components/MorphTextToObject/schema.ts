// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'MorphTextToObject' as const;
export const family = 'State & FX';
export const description = 'Text dissolves into particles that become an object, or the reverse (preset morph).';

export const props = K.Base.extend({
  text: K.Txt(32),
  object: z.string().max(48),
  direction: z.enum(['text_to_object', 'object_to_text']).default('text_to_object'),
  particles: K.Particles.default(600),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
