// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'KpiPanel' as const;
export const family = 'Data';
export const description = 'A panel of 1-6 KPIs with status colours.';

export const props = K.Base.extend({
  kpis: z.array(z.object({label: K.Label, value: K.Num, delta: K.Num.optional(), status: K.Status.optional()}).strict()).min(1).max(6),
}).strict();

export const actions = {
  update: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(5), value: K.Num}).strict(),
} as const;

export type Props = z.infer<typeof props>;
