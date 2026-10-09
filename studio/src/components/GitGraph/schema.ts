// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'GitGraph' as const;
export const family = 'Structure & flow';
export const description = 'Commits on branches; checkout, commit and merge on anchors.';

export const props = K.Base.extend({
  branches: z.array(z.object({name: z.string().max(24), color: K.ColorTok.optional()}).strict()).min(1).max(6),
  commits: z.array(z.object({id: K.LayerId, branch: z.string().max(24), msg: K.Label.optional(), parents: z.array(K.LayerId).min(0).max(2)}).strict()).min(1).max(30),
}).strict();

export const actions = {
  checkout: K.Action.extend({target: K.LayerId.optional(), branch: z.string().max(24)}).strict(),
  commit: K.Action.extend({target: K.LayerId.optional(), branch: z.string().max(24), msg: K.Label.optional()}).strict(),
  merge: K.Action.extend({target: K.LayerId.optional(), from: z.string().max(24), into: z.string().max(24)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
