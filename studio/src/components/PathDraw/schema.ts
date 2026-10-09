// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'PathDraw' as const;
export const family = 'State & FX';
export const description = 'Draw an SVG path (stroke reveal; RTL by default for Arabic layouts).';

export const props = K.Base.extend({
  d: z.string().min(1).max(4000),
  color: K.ColorTok.default('signal'),
  width: z.number().min(1).max(12).default(3),
  arrowhead: z.boolean().default(false),
  direction: K.Dir.optional(),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
