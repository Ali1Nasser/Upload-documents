// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'SampleScoop' as const;
export const family = 'Domain specials';
export const description = 'A sample scooped from a population (seeded).';

export const props = K.Base.extend({
  population: K.Num.optional(),
  sample: K.Num,
  method: z.enum(['random', 'stratified', 'systematic', 'cluster']),
  seed: K.Seed,
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
