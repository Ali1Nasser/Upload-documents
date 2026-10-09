// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TreeView' as const;
export const family = 'Structure & flow';
export const description = 'A tree as a flat parent list: variant btree | plan | decision | fs.';

export const props = K.Base.extend({
  variant: z.enum(['btree', 'plan', 'decision', 'fs']),
  nodes: z.array(z.object({id: K.LayerId, parent: K.LayerId.optional(), label: K.Label, kind: z.string().max(16).optional()}).strict()).min(1).max(63),
}).strict();

export const actions = {
  expand: K.Action.extend({target: K.LayerId.optional(), node: K.LayerId}).strict(),
  highlightPath: K.Action.extend({target: K.LayerId.optional(), nodes: z.array(K.LayerId).min(1).max(12)}).strict(),
  search: K.Action.extend({target: K.LayerId.optional(), key: K.Label}).strict(),
} as const;

export type Props = z.infer<typeof props>;
