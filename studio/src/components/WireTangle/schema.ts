// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'WireTangle' as const;
export const family = 'Domain specials';
export const description = 'Tangled wires (coupling) that untangle.';

export const props = K.Base.extend({
  wires: z.number().int().min(3).max(24),
  state: z.enum(['tangled', 'untangled']).default('tangled'),
  seed: K.Seed,
}).strict();

export const actions = {
  untangle: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
