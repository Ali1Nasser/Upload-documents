// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'VenvDome' as const;
export const family = 'Domain specials';
export const description = 'Virtual environments as domes isolating package sets.';

export const props = K.Base.extend({
  envs: z.array(z.object({name: K.Label, packages: z.array(z.string().max(32)).min(0).max(8)}).strict()).min(1).max(3),
  python: K.Label.optional(),
}).strict();

export const actions = {
  isolate: K.Action.extend({target: K.LayerId.optional()}).strict(),
  conflict: K.Action.extend({target: K.LayerId.optional(), package: z.string().max(32)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
