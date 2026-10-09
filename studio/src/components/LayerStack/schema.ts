// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LayerStack' as const;
export const family = 'Structure & flow';
export const description = 'Stacked layers (docker image, OSI, model, generic); cached layers glow.';

export const props = K.Base.extend({
  variant: z.enum(['docker', 'osi', 'network', 'model', 'generic']),
  layers: z.array(z.object({label: K.Label, cached: z.boolean().optional(), size: K.Num.optional()}).strict()).min(1).max(12),
}).strict();

export const actions = {
  rebuildFrom: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(11)}).strict(),
  highlight: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(11)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
