// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TimelineTrack' as const;
export const family = 'Structure & flow';
export const description = 'Events on a track; the cursor moves on anchors.';

export const props = K.Base.extend({
  events: z.array(z.object({label: K.Label, when: K.Label.optional(), kind: z.enum(['event', 'release', 'incident', 'milestone']).optional()}).strict()).min(1).max(16),
}).strict();

export const actions = {
  cursorTo: K.Action.extend({target: K.LayerId.optional(), index: z.number().int().min(0).max(15)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
