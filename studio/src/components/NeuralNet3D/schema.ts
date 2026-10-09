// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'NeuralNet3D' as const;
export const family = 'Space & 3D';
export const description = 'Layers of neurons (<= 32 per layer) with forward/backprop pulses.';

export const props = K.Base.extend({
  layers: z.array(z.number().int().min(1).max(32)).min(2).max(8),
  labels: z.array(K.Label).min(2).max(8).optional(),
}).strict();

export const actions = {
  forward: K.Action.extend({target: K.LayerId.optional()}).strict(),
  backprop: K.Action.extend({target: K.LayerId.optional()}).strict(),
  highlightLayer: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(7)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
