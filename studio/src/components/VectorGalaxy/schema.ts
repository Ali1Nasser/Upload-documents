// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'VectorGalaxy' as const;
export const family = 'Space & 3D';
export const description = 'An embedding galaxy of seeded clusters (<= 1,500 points); a query probe finds nearest neighbours.';

export const props = K.Base.extend({
  clusters: z.array(K.Label).min(1).max(8),
  points: K.Particles.default(900),
  seed: K.Seed,
  query: K.Label.optional(),
}).strict();

export const actions = {
  highlightNeighbors: K.Action.extend({target: K.LayerId.optional(), k: z.number().int().min(1).max(10), scores_ref: K.DataRef.optional(), query: K.Label.optional()}).strict(),
  probe: K.Action.extend({target: K.LayerId.optional(), query: K.Label}).strict(),
  zoomCluster: K.Action.extend({target: K.LayerId.optional(), cluster: K.Label}).strict(),
} as const;

export type Props = z.infer<typeof props>;
