// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'DataRibbons' as const;
export const family = 'Space & 3D';
export const description = 'Flowing ribbons that converge, diverge or run parallel.';

export const props = K.Base.extend({
  ribbons: z.array(z.object({label: K.Label.optional(), color: K.ColorTok}).strict()).min(1).max(8),
  flow: z.enum(['converge', 'diverge', 'parallel']),
  seed: K.Seed,
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
