// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'OlapCube' as const;
export const family = 'Structure & flow';
export const description = 'A 3-axis cube supporting slice, dice, roll-up and drill-down.';

export const props = K.Base.extend({
  axes: z.tuple([z.object({label: K.Label, members: z.array(K.Label).min(1).max(8)}).strict(), z.object({label: K.Label, members: z.array(K.Label).min(1).max(8)}).strict(), z.object({label: K.Label, members: z.array(K.Label).min(1).max(8)}).strict()]),
}).strict();

export const actions = {
  slice: K.Action.extend({target: K.LayerId.optional(), axis: z.number().int().min(0).max(2), member: K.Label}).strict(),
  dice: K.Action.extend({target: K.LayerId.optional(), members: z.array(K.Label).min(1).max(8)}).strict(),
  rollup: K.Action.extend({target: K.LayerId.optional(), axis: z.number().int().min(0).max(2)}).strict(),
  drill: K.Action.extend({target: K.LayerId.optional(), axis: z.number().int().min(0).max(2)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
