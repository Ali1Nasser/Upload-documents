// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LowerThird' as const;
export const family = 'Type & UI';
export const description = 'Lower-third caption for a source, term, speaker or location.';

export const props = K.Base.extend({
  title: K.Txt(48),
  subtitle: K.Txt(64).optional(),
  kind: z.enum(['source', 'term', 'speaker', 'location']).default('term'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
