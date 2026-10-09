// FROZEN component-catalog contract primitives (03 P6.4: "the contract between P7 and P8").
// Every studio/src/components/<Name>/schema.ts builds its props from these; scripts/export_catalog.ts mirrors them into
// harness/schemas/components/*.json. A change here is a catalog change: it needs a Council ADR and a new freeze hash.
import {z} from 'zod';
import {C, FX, PRESET_IDS, SIZE, type ColorToken, type FxId, type PresetId} from '../tokens';

// ---------- IDs (05 §0; patterns identical to harness/schemas/scene_spec.schema.json) ----------
export const WordId = z.string().regex(/^w:[A-Za-z0-9]+:[A-Za-z0-9._-]+:\d{6}$/);
export const SentenceId = z.string().regex(/^s:[A-Za-z0-9]+:[A-Za-z0-9._-]+:\d{4}$/);
export const DataRef = z.string().regex(/^d:\d+(\.\d+)*:\d+$/);
export const ConceptId = z.string().regex(/^c:[a-z0-9]+(-[a-z0-9]+)*$/);
export const ChapterId = z.string().regex(/^(CH-\d{2}|DD-P\d{2}(-\d+)?)$/);
/** Layer id inside a shot (targets of actions, callouts, depth planes). */
export const LayerId = z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/);
/** Plate / asset slug (data/derived/plates/<slug>.mp4 etc.). */
export const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** THE word anchor (golden rule 2): picture is bound to a word id plus a lead in frames at the film fps (ADR-002 F24).
 * Seconds, ms and absolute frames are forbidden in specs. lead_frames bounds match scene_spec.schema.json (0..90). */
export const WordAnchor = z
  .object({
    word: WordId,
    lead_frames: z.number().int().min(0).max(90), // required, like scene_spec.schema.json; default lead = LEAD_FRAMES.kinetic (2 f)
  })
  .strict();
export type WordAnchorT = z.infer<typeof WordAnchor>;

// ---------- text ----------
const NO_EASTERN_DIGITS = /^[^\u0660-\u0669\u06F0-\u06F9]*$/; // Western digits only (04 §3.4)
/** On-screen copy: UTF-8 NFC, Western digits only. Arabic is never split per letter by any component (golden rule 10). */
export const Txt = (max = 80) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(NO_EASTERN_DIGITS, 'Western digits only')
    .refine((s) => s === s.normalize('NFC'), 'text must be NFC');
export const Label = Txt(40);
/** Code / identifiers / Latin-only runs (rendered in an LTR isolate). */
export const Code = (max = 2000) => z.string().min(1).max(max);

// ---------- numbers (every shown number carries a data_ref or the sentence that speaks it; 05 §8 lint) ----------
export const NumberRef = z.union([DataRef, SentenceId]);
export const Num = z
  .object({
    value: z.number(),
    ref: NumberRef,
    unit: z.string().max(12).optional(),
    decimals: z.number().int().min(0).max(4).optional(),
  })
  .strict();

// ---------- tokens as enums (components never take raw colours, px sizes or FX numbers) ----------
const keys = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as [T, ...T[]];
export const ColorTok = z.enum(keys(C) as [ColorToken, ...ColorToken[]]);
export const SizeTok = z.enum(keys(SIZE) as [keyof typeof SIZE, ...(keyof typeof SIZE)[]]);
export const PresetTok = z.enum(PRESET_IDS as [PresetId, ...PresetId[]]);
export const FxTok = z.enum(keys(FX) as [FxId, ...FxId[]]);
export const Status = z.enum(['idle', 'active', 'ok', 'warn', 'fail']);
export const Frac = z.number().min(0).max(1);
export const Seed = z.number().int().min(0).max(2147483647);
/** Particle counts are capped by the hero cap (ADR-002: 1,500 on swangle); the tier cap is applied at render time. */
export const Particles = z.number().int().min(0).max(FX.hero.particles);
export const Plane = z.enum(['far', 'mid', 'near', 'fg']);
export const Slot = z.enum(['full', 'center', 'start', 'end', 'top', 'bottom', 'upper-third', 'lower-third']);
export const Dir = z.enum(['rtl', 'ltr', 'up', 'down']);

// ---------- bases ----------
/** Fields every component accepts. `start` = right side in the RTL frame. */
export const Base = z.object({
  id: LayerId.optional(),
  slot: Slot.optional(),
  depth: Plane.optional(),
  until: WordAnchor.optional(), // explicit exit anchor; default = shot end (exit preset)
});
/** Fields every action accepts; an action is addressed as "<Component>.<action>" in a spec layer with its own `at`. */
export const Action = z.object({target: LayerId.optional()});

export type ComponentSchema = {
  name: string;
  family: string;
  description: string;
  props: z.ZodType;
  actions: Record<string, z.ZodType>;
};
