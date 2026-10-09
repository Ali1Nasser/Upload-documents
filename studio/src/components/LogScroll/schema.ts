// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LogScroll' as const;
export const family = 'Domain specials';
export const description = 'Scrolling log lines (LTR isolate) by level.';

export const props = K.Base.extend({
  lines: z.array(z.object({level: z.enum(['debug', 'info', 'warn', 'error']), text: K.Code(160)}).strict()).min(1).max(30),
  speed: z.enum(['slow', 'normal', 'fast']).default('normal'),
}).strict();

export const actions = {
  highlight: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(29)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
