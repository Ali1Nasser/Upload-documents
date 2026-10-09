// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LoopPlate' as const;
export const family = 'Media';
export const description = 'A pre-rendered seamless 10 s loop from data/derived/plates/ (dc render plate <name>).';

export const props = K.Base.extend({
  plate: K.Slug,
  opacity: K.Frac.default(1),
  blend: z.enum(['normal', 'screen', 'add']).default('normal'),
  speed: z.number().min(0.5).max(2).default(1),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
