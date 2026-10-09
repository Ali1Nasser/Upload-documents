// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'KeycardDoors' as const;
export const family = 'Domain specials';
export const description = 'Doors by clearance level; a keycard opens some.';

export const props = K.Base.extend({
  doors: z.array(z.object({label: K.Label, level: z.number().int().min(0).max(5)}).strict()).min(1).max(6),
  card: z.number().int().min(0).max(5),
}).strict();

export const actions = {
  swipe: K.Action.extend({target: K.LayerId.optional(), door: z.number().int().min(0).max(5)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
