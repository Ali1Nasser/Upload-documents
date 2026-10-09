// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'PredictionTimer' as const;
export const family = 'Type & UI';
export const description = 'Pose a question, run a visible think timer through the prediction pause (<= 144 f), reveal on an anchor.';

export const props = K.Base.extend({
  question_ar: K.Txt(80),
  reveal: K.WordAnchor,
  options: z.array(K.Label).min(2).max(4).optional(),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
