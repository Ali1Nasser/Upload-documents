// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'AIPlate' as const;
export const family = 'Media';
export const description = 'A generated plate with 2.5D parallax from a depth map; usable only if ADR-006 enables it.';

export const props = K.Base.extend({
  plate: K.Slug,
  depth_map: K.Slug,
  parallax: K.Frac.default(0.4),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
