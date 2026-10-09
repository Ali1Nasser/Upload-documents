// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'MatchCut' as const;
export const family = 'State & FX';
export const description = 'Match cut between a layer of this shot and one of the next.';

export const props = K.Base.extend({
  from: K.LayerId,
  to: K.LayerId,
  kind: z.enum(['shape', 'position', 'color']).default('shape'),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
