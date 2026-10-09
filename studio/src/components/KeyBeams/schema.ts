// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'KeyBeams' as const;
export const family = 'Domain specials';
export const description = 'Keys emitting beams that unlock targets.';

export const props = K.Base.extend({
  keys: z.array(z.object({label: K.Label, kind: z.enum(['public', 'private', 'api', 'shared'])}).strict()).min(1).max(4),
  targets: z.array(K.Label).min(1).max(6),
}).strict();

export const actions = {
  unlock: K.Action.extend({target: K.LayerId.optional(), key: z.number().int().min(0).max(3), to: z.number().int().min(0).max(5)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
