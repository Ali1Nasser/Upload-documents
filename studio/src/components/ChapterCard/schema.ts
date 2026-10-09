// FROZEN catalog contract (03 P6.4; 04 §8). Props only: the implementation lands in P7 in this folder.
// Generated once from the P6 freeze; edit by hand only through a Council ADR (hash in harness/state/freeze.json).
import {z} from 'zod';
import * as K from '../contract';

export const name = 'ChapterCard' as const;
export const family = 'Type & UI';
export const description = 'Trunk chapter title card (riser + sting in the SFX map).';

export const props = K.Base.extend({
  chapter: K.ChapterId,
  index: z.number().int().min(0).max(99),
  title_ar: K.Txt(48),
  title_en: K.Txt(48).optional(),
  act: K.Label.optional(),
}).strict();

export const actions = {
  
} as const;

export type Props = z.infer<typeof props>;
