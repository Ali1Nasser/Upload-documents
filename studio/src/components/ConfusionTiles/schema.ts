// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ConfusionTiles' as const;
export const family = 'Data';
export const description = 'A 2x2 confusion matrix of tiles.';

export const props = K.Base.extend({
  tp: K.Num,
  fp: K.Num,
  fn: K.Num,
  tn: K.Num,
  positive: K.Label,
  negative: K.Label,
}).strict();

export const actions = {
  focus: K.Action.extend({target: K.LayerId.optional(), cell: z.enum(['tp', 'fp', 'fn', 'tn'])}).strict(),
} as const;

export type Props = z.infer<typeof props>;
