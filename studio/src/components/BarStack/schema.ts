// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'BarStack' as const;
export const family = 'Data';
export const description = 'Bars (single or stacked) with token colours; values carry refs.';

export const props = K.Base.extend({
  series: z.array(z.object({label: K.Label, value: K.Num, color: K.ColorTok.optional()}).strict()).min(1).max(12),
  orientation: z.enum(['h', 'v']).default('h'),
  stacked: z.boolean().default(false),
  sort: z.enum(['none', 'asc', 'desc']).default('none'),
}).strict();

export const actions = {
  grow: K.Action.extend({target: K.LayerId.optional()}).strict(),
  highlight: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(11), color: K.ColorTok.default('signal')}).strict(),
} as const;

export type Props = z.infer<typeof props>;
