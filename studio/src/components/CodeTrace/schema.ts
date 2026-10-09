// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'CodeTrace' as const;
export const family = 'Code';
export const description = 'A code block (<= 30 lines) with line highlights stepped on anchors.';

export const props = K.Base.extend({
  lang: z.enum(['sql', 'python', 'js', 'ts', 'bash', 'yaml', 'json', 'dockerfile', 'scala', 'java', 'go', 'other']),
  code: K.Code(2400),
  highlights: z.array(z.object({lines: z.tuple([z.number().int().min(1), z.number().int().min(1)]), at: K.WordAnchor, note_ar: K.Label.optional()}).strict()).min(0).max(12).optional(),
}).strict();

export const actions = {
  step: K.Action.extend({target: K.LayerId.optional(), line: z.number().int().min(1).max(30)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
