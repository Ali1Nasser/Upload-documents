// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Heatmap' as const;
export const family = 'Data';
export const description = 'A labelled matrix of values on a sequential or diverging token scale.';

export const props = K.Base.extend({
  x: z.array(K.Label).min(1).max(24),
  y: z.array(K.Label).min(1).max(24),
  values: z.array(z.array(z.number()).max(24)).max(24),
  ref: K.NumberRef,
  scale: z.enum(['sequential', 'diverging']).default('sequential'),
}).strict();

export const actions = {
  highlightCell: K.Action.extend({target: K.LayerId.optional(), x: z.number().int().min(0).max(23), y: z.number().int().min(0).max(23)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
