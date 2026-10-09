// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'RequestJourney' as const;
export const family = 'Structure & flow';
export const description = 'A request travelling hops (client, lb, service, cache, db, queue, external) with per-hop latency.';

export const props = K.Base.extend({
  hops: z.array(z.object({id: K.LayerId, label: K.Label, kind: z.enum(['client', 'lb', 'service', 'db', 'cache', 'queue', 'external']), latency: K.Num.optional()}).strict()).min(2).max(8),
}).strict();

export const actions = {
  travel: K.Action.extend({target: K.LayerId.optional(), to: K.LayerId}).strict(),
  fail: K.Action.extend({target: K.LayerId.optional(), at: K.LayerId}).strict(),
  retry: K.Action.extend({target: K.LayerId.optional(), at: K.LayerId}).strict(),
} as const;

export type Props = z.infer<typeof props>;
