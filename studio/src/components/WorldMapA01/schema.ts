// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'WorldMapA01' as const;
export const family = 'Structure & flow';
export const description = 'The A-01 holo-city map (recurring asset, 04 §7): districts light up; routes between them.';

export const props = K.Base.extend({
  district: K.Slug,
  highlights: z.array(K.Slug).min(0).max(8),
  route: z.tuple([K.Slug, K.Slug]).optional(),
}).strict();

export const actions = {
  flyTo: K.Action.extend({target: K.LayerId.optional(), district: K.Slug}).strict(),
} as const;

export type Props = z.infer<typeof props>;
