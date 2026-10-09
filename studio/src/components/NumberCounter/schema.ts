// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'NumberCounter' as const;
export const family = 'Type & UI';
export const description = 'A counter that rolls from the previous value to the target over the spoken number (preset count).';

export const props = K.Base.extend({
  to: K.Num,
  from: z.number().optional(),
  format: z.enum(['int', 'decimal', 'percent', 'currency', 'duration', 'bytes', 'ratio']).default('int'),
  label: K.Label.optional(),
  size: K.SizeTok.default('numberBig'),
  color: K.ColorTok.default('ink'),
  land: K.WordAnchor.optional(),
}).strict();

export const actions = {
  set: K.Action.extend({target: K.LayerId.optional(), to: K.Num}).strict(),
} as const;

export type Props = z.infer<typeof props>;
