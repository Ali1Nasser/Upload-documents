// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LossLandscape' as const;
export const family = 'Space & 3D';
export const description = 'A loss surface with an optimiser path (seeded).';

export const props = K.Base.extend({
  kind: z.enum(['convex', 'nonconvex', 'saddle']),
  seed: K.Seed,
  steps: z.number().int().min(1).max(60).default(20),
  lr: K.Num.optional(),
}).strict();

export const actions = {
  step: K.Action.extend({target: K.LayerId.optional(), n: z.number().int().min(1).max(60)}).strict(),
  overshoot: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
