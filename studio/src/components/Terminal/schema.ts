// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'Terminal' as const;
export const family = 'Code';
export const description = 'A terminal (LTR isolate) whose lines appear on anchors.';

export const props = K.Base.extend({
  shell: z.enum(['bash', 'python', 'sql', 'docker', 'git', 'other']).default('bash'),
  prompt: z.string().max(24).optional(),
  lines: z.array(z.object({kind: z.enum(['cmd', 'out', 'err']), text: K.Code(160), at: K.WordAnchor.optional()}).strict()).min(1).max(16),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
