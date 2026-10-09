// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ThresholdSlider' as const;
export const family = 'Data';
export const description = 'A threshold handle on a scale; zones flip state as it moves.';

export const props = K.Base.extend({
  label: K.Label,
  min: z.number(),
  max: z.number(),
  value: K.Num,
  zones: z.array(z.object({upto: z.number(), status: K.Status}).strict()).min(1).max(4).optional(),
}).strict();

export const actions = {
  moveTo: K.Action.extend({target: K.LayerId.optional(), value: K.Num}).strict(),
} as const;

export type Props = z.infer<typeof props>;
