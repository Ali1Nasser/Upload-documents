// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'PartitionLanes' as const;
export const family = 'Structure & flow';
export const description = 'Kafka-style topic partitions as lanes with consumers, offsets and lag.';

export const props = K.Base.extend({
  topic: K.Label,
  partitions: z.number().int().min(1).max(12),
  consumers: z.array(z.object({id: K.LayerId, group: K.Label.optional(), lanes: z.array(z.number().int().min(0).max(11)).min(0).max(12)}).strict()).min(0).max(8),
  messages: z.number().int().min(0).max(40).default(12),
  keyed: z.boolean().default(true),
  seed: K.Seed,
}).strict();

export const actions = {
  produce: K.Action.extend({target: K.LayerId.optional(), lane: z.number().int().min(0).max(11), key: K.Label.optional()}).strict(),
  rebalance: K.Action.extend({target: K.LayerId.optional(), assign: z.array(z.object({consumer: K.LayerId, lanes: z.array(z.number().int().min(0).max(11)).min(0).max(12)}).strict()).min(1).max(8)}).strict(),
  lag: K.Action.extend({target: K.LayerId.optional(), lane: z.number().int().min(0).max(11), value: K.Num}).strict(),
} as const;

export type Props = z.infer<typeof props>;
