// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'PermissionLocks' as const;
export const family = 'Domain specials';
export const description = 'Roles x resources with grant levels; locks deny or open.';

export const props = K.Base.extend({
  roles: z.array(K.Label).min(1).max(6),
  resources: z.array(K.Label).min(1).max(6),
  grants: z.array(z.object({role: K.Label, resource: K.Label, level: z.enum(['none', 'read', 'write', 'admin'])}).strict()).min(0).max(36),
}).strict();

export const actions = {
  deny: K.Action.extend({target: K.LayerId.optional(), role: K.Label, resource: K.Label}).strict(),
  grant: K.Action.extend({target: K.LayerId.optional(), role: K.Label, resource: K.Label, level: z.enum(['read', 'write', 'admin'])}).strict(),
} as const;

export type Props = z.infer<typeof props>;
