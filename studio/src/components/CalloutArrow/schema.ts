// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'CalloutArrow' as const;
export const family = 'Type & UI';
export const description = "An arrow from a label to a target layer (or a named part of it, 'layer.part').";

export const props = K.Base.extend({
  to: z.string().regex(/^[a-z][a-z0-9_-]{0,31}(\.[A-Za-z0-9_-]+)?$/),
  label: K.Label.optional(),
  side: z.enum(['start', 'end', 'top', 'bottom']).default('start'),
  color: K.ColorTok.default('signal'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
