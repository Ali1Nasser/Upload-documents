// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LineTrace' as const;
export const family = 'Data';
export const description = 'Line series drawn on anchors with point markers.';

export const props = K.Base.extend({
  series: z.array(z.object({label: K.Label, points: z.array(z.tuple([z.number(), z.number()])).min(2).max(200), ref: K.NumberRef, color: K.ColorTok.optional()}).strict()).min(1).max(4),
  x_label: K.Label.optional(),
  y_label: K.Label.optional(),
}).strict();

export const actions = {
  drawTo: K.Action.extend({target: K.LayerId.optional(), x: z.number()}).strict(),
  markPoint: K.Action.extend({target: K.LayerId.optional(), series: z.number().int().min(0).max(3), index: z.number().int().min(0).max(199), label: K.Label.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
