// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'CameraRig' as const;
export const family = 'State & FX';
export const description = 'The shot camera: move + ease + intensity; drift always on; optional impact nudges (<= 4 px) on anchors.';

export const props = K.Base.extend({
  move: z.enum(['static', 'push_in', 'pull_out', 'truck', 'pedestal', 'orbit', 'yaw', 'crane', 'dolly_zoom', 'follow']).default('push_in'),
  ease: z.enum(['inOutCubic', 'outExpo', 'linear']).default('inOutCubic'),
  intensity: K.Frac.default(0.5),
  follow: K.LayerId.optional(),
  nudges: z.array(K.WordAnchor).min(0).max(6).optional(),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
