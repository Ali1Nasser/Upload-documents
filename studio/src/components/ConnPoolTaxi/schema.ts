// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ConnPoolTaxi' as const;
export const family = 'Domain specials';
export const description = 'A connection pool as a taxi rank; requests queue when exhausted.';

export const props = K.Base.extend({
  pool_size: z.number().int().min(1).max(20),
  requests: z.number().int().min(0).max(40),
  seed: K.Seed,
}).strict();

export const actions = {
  exhaust: K.Action.extend({target: K.LayerId.optional()}).strict(),
  release: K.Action.extend({target: K.LayerId.optional(), n: z.number().int().min(1).max(20)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
