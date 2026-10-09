// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LegendOrbs' as const;
export const family = 'Domain specials';
export const description = 'Orbiting legend orbs keyed to token colours.';

export const props = K.Base.extend({
  items: z.array(z.object({label: K.Label, color: K.ColorTok}).strict()).min(2).max(8),
}).strict();

export const actions = {
  focus: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(7)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
