// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Conveyor' as const;
export const family = 'Structure & flow';
export const description = 'Items on a conveyor passing stations.';

export const props = K.Base.extend({
  items: z.array(z.object({label: K.Label, status: K.Status.optional()}).strict()).min(1).max(20),
  stations: z.array(K.Label).min(1).max(6).optional(),
  speed: z.enum(['slow', 'normal', 'fast']).default('normal'),
}).strict();

export const actions = {
  stop: K.Action.extend({target: K.LayerId.optional()}).strict(),
  jam: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(19)}).strict(),
  resume: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
