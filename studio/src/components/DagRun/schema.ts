// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'DagRun' as const;
export const family = 'Structure & flow';
export const description = 'A DAG of tasks whose states change on anchors (queued/running/success/failed/retry/skipped).';

export const props = K.Base.extend({
  tasks: z.array(z.object({id: K.LayerId, label: K.Label}).strict()).min(1).max(24),
  deps: z.array(z.object({from: K.LayerId, to: K.LayerId}).strict()).min(0).max(48),
  schedule: K.Label.optional(),
}).strict();

export const actions = {
  setState: K.Action.extend({target: K.LayerId.optional(), task: K.LayerId, state: z.enum(['queued', 'running', 'success', 'failed', 'retry', 'skipped'])}).strict(),
} as const;

export type Props = z.infer<typeof props>;
