// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ComplexityRace' as const;
export const family = 'Domain specials';
export const description = 'Racers with Big-O growth curves as n grows.';

export const props = K.Base.extend({
  racers: z.array(z.object({label: K.Label, big_o: z.enum(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'])}).strict()).min(2).max(6),
  n: K.Num.optional(),
}).strict();

export const actions = {
  race: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
