// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'EquationLine' as const;
export const family = 'Type & UI';
export const description = 'A formula laid out LTR in an isolate; operators use U+2212 minus; terms can arrive on anchors.';

export const props = K.Base.extend({
  terms: z.array(z.object({text: K.Txt(24), kind: z.enum(['operand', 'operator', 'result']), ref: K.NumberRef.optional(), at: K.WordAnchor.optional()}).strict()).min(1).max(9),
  size: K.SizeTok.default('sub'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
