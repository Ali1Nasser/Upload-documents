// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'PipelineStations' as const;
export const family = 'Structure & flow';
export const description = 'A payload travelling through 2-8 stations; a station can fail and be fixed.';

export const props = K.Base.extend({
  stations: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(2).max(8),
  payload: K.Label,
}).strict();

export const actions = {
  advance: K.Action.extend({target: K.LayerId.optional(), to: K.LayerId}).strict(),
  fail: K.Action.extend({target: K.LayerId.optional(), at: K.LayerId, reason: K.Label.optional()}).strict(),
  fix: K.Action.extend({target: K.LayerId.optional(), at: K.LayerId}).strict(),
} as const;

export type Props = z.infer<typeof props>;
