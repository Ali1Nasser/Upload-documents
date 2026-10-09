// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'SplitDeck' as const;
export const family = 'Domain specials';
export const description = 'A deck dealt into train/validation/test splits (seeded).';

export const props = K.Base.extend({
  splits: z.array(z.object({label: K.Label, share: K.Num}).strict()).min(2).max(4),
  seed: K.Seed,
}).strict();

export const actions = {
  deal: K.Action.extend({target: K.LayerId.optional()}).strict(),
} as const;

export type Props = z.infer<typeof props>;
