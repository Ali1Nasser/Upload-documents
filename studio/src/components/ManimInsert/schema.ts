// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ManimInsert' as const;
export const family = 'Media';
export const description = 'A Manim alpha-video insert.';

export const props = K.Base.extend({
  clip: K.Slug,
  alpha: z.boolean().default(true),
  fit: z.enum(['contain', 'cover']).default('contain'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
