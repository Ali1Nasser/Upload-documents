// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ShatterToBlocks' as const;
export const family = 'State & FX';
export const description = 'A target shatters into seeded blocks.';

export const props = K.Base.extend({
  to: K.LayerId,
  blocks: z.number().int().min(4).max(64).default(16),
  seed: K.Seed,
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
