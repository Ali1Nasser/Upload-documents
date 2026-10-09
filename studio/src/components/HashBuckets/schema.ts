// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'HashBuckets' as const;
export const family = 'Domain specials';
export const description = 'Keys hashed into buckets; collisions chain.';

export const props = K.Base.extend({
  buckets: z.number().int().min(2).max(16),
  keys: z.array(z.string().max(24)).min(0).max(24),
  hash: K.Label.optional(),
}).strict();

export const actions = {
  insert: K.Action.extend({target: K.LayerId.optional(), key: z.string().max(24)}).strict(),
  collide: K.Action.extend({target: K.LayerId.optional(), bucket: z.number().int().min(0).max(15)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
