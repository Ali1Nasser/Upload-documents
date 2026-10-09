// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'InferenceCore' as const;
export const family = 'Space & 3D';
export const description = 'The model core: idle, thinking, streaming or error.';

export const props = K.Base.extend({
  state: z.enum(['idle', 'thinking', 'streaming', 'error']).default('idle'),
  label: K.Label.optional(),
  load: K.Frac.default(0.5),
}).strict();

export const actions = {
  setState: K.Action.extend({target: K.LayerId.optional(), state: z.enum(['idle', 'thinking', 'streaming', 'error'])}).strict(),
} as const;

export type Props = z.infer<typeof props>;
