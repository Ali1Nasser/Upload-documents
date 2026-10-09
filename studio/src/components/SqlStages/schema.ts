// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'SqlStages' as const;
export const family = 'Code';
export const description = 'A SQL query split into its logical execution stages, lit in execution order.';

export const props = K.Base.extend({
  query: K.Code(1200),
  stages: z.array(z.enum(['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'WINDOW', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'])).min(1).max(10),
}).strict();

export const actions = {
  activate: K.Action.extend({target: K.LayerId.optional(), stage: z.enum(['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'WINDOW', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'])}).strict(),
} as const;

export type Props = z.infer<typeof props>;
