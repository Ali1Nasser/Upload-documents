// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Spotlight' as const;
export const family = 'Type & UI';
export const description = 'Dim everything except a target layer or part.';

export const props = K.Base.extend({
  to: z.string().regex(/^[a-z][a-z0-9_-]{0,31}(\.[A-Za-z0-9_-]+)?$/),
  shape: z.enum(['circle', 'rect']).default('rect'),
  dim: z.number().min(0).max(0.85).default(0.6),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
