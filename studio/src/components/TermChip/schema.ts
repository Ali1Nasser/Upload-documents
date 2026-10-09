// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TermChip' as const;
export const family = 'Type & UI';
export const description = 'A technical term chip (Latin in an LTR isolate) with an optional Arabic gloss; 28 px floor if spoken.';

export const props = K.Base.extend({
  term: K.Txt(40),
  gloss_ar: K.Txt(40).optional(),
  kind: z.enum(['term', 'acronym', 'code', 'metric']).default('term'),
  spoken: z.boolean().default(true),
  color: K.ColorTok.default('signal'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
