// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'CollectionMorph' as const;
export const family = 'Domain specials';
export const description = 'A collection morphing between types (list -> set -> dict ...).';

export const props = K.Base.extend({
  from: z.enum(['list', 'tuple', 'set', 'dict', 'array', 'dataframe', 'series', 'json']),
  to: z.enum(['list', 'tuple', 'set', 'dict', 'array', 'dataframe', 'series', 'json']),
  items: z.array(z.string().max(24)).min(1).max(12),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
