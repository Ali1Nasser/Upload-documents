// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'RowFunnel' as const;
export const family = 'Data';
export const description = 'Rows narrowing through query stages (FROM -> WHERE -> GROUP BY -> HAVING -> ...).';

export const props = K.Base.extend({
  stages: z.array(z.object({label: K.Label, rows: K.Num}).strict()).min(2).max(8),
  unit_ar: K.Label.optional(),
}).strict();

export const actions = {
  advance: K.Action.extend({target: K.LayerId.optional(), stage: z.number().int().min(0).max(7)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
