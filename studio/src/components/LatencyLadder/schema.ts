// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'LatencyLadder' as const;
export const family = 'Domain specials';
export const description = 'A ladder of latencies (cache -> RAM -> disk -> network).';

export const props = K.Base.extend({
  rungs: z.array(z.object({label: K.Label, latency: K.Num}).strict()).min(2).max(10),
}).strict();

export const actions = {
  climb: K.Action.extend({target: K.LayerId.optional(), to: z.number().int().min(0).max(9)}).strict(),
} as const;

export type Props = z.infer<typeof props>;
