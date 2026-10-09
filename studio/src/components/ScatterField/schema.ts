// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ScatterField' as const;
export const family = 'Data';
export const description = 'Seeded point clusters (total <= 1,500 points).';

export const props = K.Base.extend({
  clusters: z.array(z.object({label: K.Label, n: z.number().int().min(1).max(500), center: z.tuple([K.Frac, K.Frac]), spread: z.number().min(0).max(0.5)}).strict()).min(1).max(8),
  outliers: z.number().int().min(0).max(50).default(0),
  seed: K.Seed,
}).strict();

export const actions = {
  highlightCluster: K.Action.extend({target: K.LayerId.optional(), label: K.Label}).strict(),
  showOutliers: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
