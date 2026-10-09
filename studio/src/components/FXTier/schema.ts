// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'FXTier' as const;
export const family = 'State & FX';
export const description = 'Select the frozen FX tier for the shot (no per-shot overrides; text-safe masks always on).';

export const props = K.Base.extend({
  tier: K.FxTok,
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
