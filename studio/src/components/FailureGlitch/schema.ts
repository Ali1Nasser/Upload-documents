// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'FailureGlitch' as const;
export const family = 'State & FX';
export const description = 'Failure beat: glitch + low thud; flashes stay <= 3/s (WCAG 2.3.1).';

export const props = K.Base.extend({
  to: K.LayerId.optional(),
  intensity: z.number().min(0).max(1).default(0.5),
  label_ar: K.Label.optional(),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
