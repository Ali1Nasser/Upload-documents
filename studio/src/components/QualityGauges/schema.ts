// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'QualityGauges' as const;
export const family = 'Domain specials';
export const description = 'Data-quality gauges with thresholds.';

export const props = K.Base.extend({
  gauges: z.array(z.object({label: K.Label, value: K.Num, threshold: z.number().optional(), status: K.Status.optional()}).strict()).min(1).max(6),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
