// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'GraphNetwork' as const;
export const family = 'Structure & flow';
export const description = 'Nodes and edges (seeded layout).';

export const props = K.Base.extend({
  nodes: z.array(z.object({id: K.LayerId, label: K.Label, group: z.string().max(24).optional()}).strict()).min(1).max(60),
  edges: z.array(z.object({from: K.LayerId, to: K.LayerId, label: K.Label.optional(), directed: z.boolean().default(true)}).strict()).min(0).max(120),
  layout: z.enum(['force', 'radial', 'layered', 'circle']).default('force'),
  seed: K.Seed,
}).strict();

export const actions = {
  highlightPath: K.Action.extend({target: K.LayerId.optional(), nodes: z.array(K.LayerId).min(1).max(60)}).strict(),
  pulseNode: K.Action.extend({target: K.LayerId.optional(), node: K.LayerId}).strict(),
  addEdge: K.Action.extend({target: K.LayerId.optional(), from: K.LayerId, to: K.LayerId}).strict(),
} as const;

export type Props = z.infer<typeof props>;
