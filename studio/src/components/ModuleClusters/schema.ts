// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ModuleClusters' as const;
export const family = 'Domain specials';
export const description = 'Modules grouped in clusters with dependencies.';

export const props = K.Base.extend({
  modules: z.array(z.object({id: K.LayerId, label: K.Label, cluster: z.string().max(24)}).strict()).min(1).max(24),
  deps: z.array(z.object({from: K.LayerId, to: K.LayerId}).strict()).min(0).max(48),
}).strict();

export const actions = {
  decouple: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
