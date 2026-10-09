// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ParticleField' as const;
export const family = 'Space & 3D';
export const description = 'Seeded ambient particles (text-safe masked).';

export const props = K.Base.extend({
  count: K.Particles.default(400),
  kind: z.enum(['dust', 'data', 'sparks', 'snow']).default('dust'),
  color: K.ColorTok.default('signal'),
  seed: K.Seed,
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
