// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ContextTunnel' as const;
export const family = 'Space & 3D';
export const description = 'A context window as a tunnel; items enter and the oldest are evicted on overflow.';

export const props = K.Base.extend({
  window: K.Num,
  items: z.array(z.object({label: K.Label, kind: z.enum(['system', 'user', 'doc', 'tool', 'answer'])}).strict()).min(0).max(12),
}).strict();

export const actions = {
  push: K.Action.extend({target: K.LayerId.optional(), label: K.Label, kind: z.enum(['system', 'user', 'doc', 'tool', 'answer'])}).strict(),
  evict: K.Action.extend({target: K.LayerId.optional(), count: z.number().int().min(1).max(6)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
