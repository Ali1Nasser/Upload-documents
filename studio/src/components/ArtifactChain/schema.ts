// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ArtifactChain' as const;
export const family = 'Domain specials';
export const description = 'A chain of artefacts (code -> data -> model -> report).';

export const props = K.Base.extend({
  artifacts: z.array(z.object({label: K.Label, kind: z.enum(['code', 'data', 'model', 'report', 'image', 'config'])}).strict()).min(2).max(8),
}).strict();

export const actions = {
  link: K.Action.extend({target: K.LayerId.optional(), from: z.number().int().min(0).max(7), to: z.number().int().min(0).max(7)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
