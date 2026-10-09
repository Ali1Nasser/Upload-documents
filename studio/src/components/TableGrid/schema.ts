// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'TableGrid' as const;
export const family = 'Data';
export const description = 'A data table (<= 8 columns, <= 12 visible rows); numbers come from a data_ref.';

export const props = K.Base.extend({
  columns: z.array(z.object({key: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,31}$/), label: K.Label, kind: z.enum(['text', 'number', 'id', 'date', 'money', 'bool']).optional()}).strict()).min(1).max(8),
  rows: z.array(z.record(z.string(), z.union([z.string().max(40), z.number(), z.boolean(), z.null()]))).min(0).max(12),
  ref: K.NumberRef.optional(),
  title: K.Label.optional(),
}).strict();

export const actions = {
  highlightRows: K.Action.extend({target: K.LayerId.optional(), rows: z.array(z.number().int().min(0).max(11)).min(1).max(12), color: K.ColorTok.default('signal')}).strict(),
  filterRows: K.Action.extend({target: K.LayerId.optional(), keep: z.array(z.number().int().min(0).max(11)).min(0).max(12)}).strict(),
  sortBy: K.Action.extend({target: K.LayerId.optional(), key: z.string(), dir: z.enum(['asc', 'desc'])}).strict(),
  addRow: K.Action.extend({target: K.LayerId.optional(), row: z.record(z.string(), z.union([z.string().max(40), z.number(), z.boolean(), z.null()]))}).strict(),
} as const;

export type Props = z.infer<typeof props>;
