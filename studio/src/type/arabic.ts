// Arabic-first type rules (ADR-003 T-A). Pure functions: no React, no DOM except the optional canvas measure.
// The browser does the shaping. Arabic words are never split into letters; the only split inside a token is
// at an Arabic-prefix / Latin boundary (`الـKafka` -> `الـ` + <bdi>Kafka</bdi>), which keeps the tatweel join.
import {FONT, LINE} from '../tokens';

// ---------- runs ----------

const LTR_HINT = /[A-Za-z0-9]/;
const PUNCT_END = /[.,،:؛!?؟]+$/;
const AR_PREFIX = /^([؀-ۿـ]*)(.*)$/;

export type Seg = {t: string; ltr: boolean};

/**
 * Split a mixed Arabic/Latin string into Arabic runs and LTR isolates. Use ⟦…⟧ to force one LTR isolate
 * (e.g. `⟦4 / 6 = 66.67 %⟧`). Digits are Western and always sit in an LTR isolate.
 */
export const segment = (text: string): Seg[] => {
  const out: Seg[] = [];
  const pushAr = (t: string) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && !last.ltr) last.t += t;
    else out.push({t, ltr: false});
  };
  for (const part of text.split(/(⟦[^⟧]*⟧)/)) {
    if (part.startsWith('⟦')) {
      out.push({t: part.slice(1, -1), ltr: true});
      continue;
    }
    for (const tok of part.split(/(\s+)/)) {
      if (!tok) continue;
      if (!LTR_HINT.test(tok)) {
        pushAr(tok);
        continue;
      }
      const p = (tok.match(PUNCT_END) || [''])[0];
      const core = p ? tok.slice(0, -p.length) : tok;
      const m = core.match(AR_PREFIX);
      const pre = m ? m[1] : '';
      const rest = m ? m[2] : core;
      pushAr(pre);
      out.push({t: rest, ltr: true});
      pushAr(p);
    }
  }
  return out;
};

/** True if the string contains Arabic letters (CA must be 0 on these runs, ADR-002). */
/**
 * Rule J1 (arabic-typographer r2): a tatweel join (`الـ`) followed by a Latin isolate gets a small gap so the join does not
 * fuse with the first Latin glyph (`الـAI` read as `AIJI`). ALL-CAPS / digit isolates get 0.12em, other Latin 0.06em.
 * The gap is applied on the isolate's RIGHT edge (physical): in RTL flow that is the side facing the Arabic prefix.
 */
export const JOIN_GAP = {caps: 0.12, latin: 0.06} as const;
export const joinGapEm = (prevArabic: string | undefined, latin: string): number => {
  if (!prevArabic || !/ـ$/.test(prevArabic)) return 0;
  return /[A-Z]/.test(latin) && /^[A-Z0-9]+$/.test(latin) ? JOIN_GAP.caps : JOIN_GAP.latin;
};

export const isArabic = (s: string) => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s);

// ---------- tashkeel descender clearance (ADR-003; critic r0 issue 2, F5 ثوانٍ over the subtitle) ----------

/** Marks drawn BELOW the baseline: kasratan, kasra, hamza below, subscript alef, dot below, wavy hamza below, small low marks; plus إ. */
export const LOWER_MARKS = /[ٍِٕٖٜٟۣ۪ۭإ]/;
/** Marks drawn ABOVE: fathatan, dammatan, fatha, damma, shadda, sukun, maddah, hamza above, superscript alef, etc. */
export const UPPER_MARKS = /[ًٌَُّْٓٔٗ-ٰٛٝٞۖ-ۜ۟-ۢۤۧۨ۫۬]/;
export const TASHKEEL = /[ً-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/;

export const hasTashkeel = (s: string) => TASHKEEL.test(s);
export const hasLowerMarks = (s: string) => LOWER_MARKS.test(s);
export const hasUpperMarks = (s: string) => UPPER_MARKS.test(s);

/** Rule T1: any Arabic line carrying diacritics uses line-height >= 1.6; otherwise the base 1.3. */
export const lineHeightFor = (text: string, base: number = LINE.base): number => (hasTashkeel(text) ? Math.max(base, LINE.tashkeel) : base);

export type StackRole = 'title-sub' | 'lines';
/**
 * Rule T2: extra vertical clearance (px) between two stacked lines, on top of their line boxes.
 *  - title -> subtitle: always + 0.3 em of the title size (ADR-003);
 *  - upper line with lower marks (kasra, tanween kasr, hamza below, إ) set tighter than 1.6: + LINE.lowerMarkEm x upper size;
 *  - lower line with upper marks set tighter than 1.6: + LINE.upperMarkEm x lower size.
 * A line already set at line-height >= 1.6 (rule T1) carries its own mark room, so it gets no extra on that side.
 */
export const stackGap = (
  upper: {text: string; size: number; lineHeight?: number},
  lower: {text: string; size: number; lineHeight?: number},
  role: StackRole = 'lines',
): number => {
  const uLH = upper.lineHeight ?? lineHeightFor(upper.text);
  const lLH = lower.lineHeight ?? lineHeightFor(lower.text);
  let g = 0;
  if (role === 'title-sub') g += LINE.titleSubGapEm * upper.size;
  if (hasLowerMarks(upper.text) && uLH < LINE.tashkeel) g += LINE.lowerMarkEm * upper.size;
  if (hasUpperMarks(lower.text) && lLH < LINE.tashkeel) g += LINE.upperMarkEm * lower.size;
  return Math.round(g);
};

// ---------- face selection (ADR-003 T-A) ----------

export type Face = {family: string; weight: number; wordSpacing?: string};
/** Alexandria 700 only at display sizes >= 56 px; below that IBM Plex Sans Arabic 600 with word-spacing 0.08 em. */
export const arabicFace = (sizePx: number): Face =>
  sizePx >= FONT.arDisplay.minPx
    ? {family: FONT.arDisplay.family, weight: FONT.arDisplay.weight, wordSpacing: LINE.arWordSpacing}
    : {family: FONT.arText.family, weight: FONT.arText.weight, wordSpacing: FONT.arText.wordSpacing};

// ---------- numerals and operators ----------

export const MINUS = '−';
/**
 * Rule N1: arithmetic minus is U+2212, never U+002D. Converts a hyphen-minus that stands as an operator or sign
 * (` - `, `= -4`, `(-3`, leading `-0.5`) and leaves hyphenated words and ids alone (`at-least-once`, `T-A`, `CH-26`).
 */
export const minus = (s: string): string => s.replace(/(^|[\s(=+×÷/<>≤≥])-(?=[\s\d.])/g, `$1${MINUS}`);
/** Throws if a formula string still carries an operator hyphen (use in dev / lint). */
export const assertFormula = (s: string): string => {
  if (/(^|\s)-(\s|\d)/.test(s)) throw new Error(`hyphen-minus used as operator in "${s}" (use U+2212)`);
  return s;
};

// ---------- inline Latin face (ADR-003 r2 freeze; arabic-typographer r1) ----------

export type LatinRole = 'sentence' | 'chip' | 'code' | 'data';
/**
 * Rule L1: a Latin run INSIDE an Arabic sentence (title, kinetic word, caption, object label) is set in Inter Tight,
 * in the same colour and optical size as the Arabic around it (never cyan mono). JetBrains Mono is only for chips,
 * code and data labels (a label made only of Latin / digits, e.g. `producer`, `T1`, `0.165`).
 */
export const latinFamily = (role: LatinRole): string => (role === 'sentence' ? FONT.lat.family : FONT.mono.family);
/** Role of a label from its text: Arabic present -> sentence (Inter Tight); pure Latin / numeric -> data (mono). */
export const labelRole = (text: string): LatinRole => (isArabic(text.replace(/⟦[^⟧]*⟧/g, '')) ? 'sentence' : 'data');

// ---------- arrows and units (arabic-typographer r1) ----------

export const ARROW_LTR = '→';
export const ARROW_RTL = '←';
/**
 * Rule A1: `→` only inside a Latin / numeric isolate (`14 → 13`, `0.165 → 0.227`); between Arabic blocks use `←`
 * (reading direction). Throws on a `→` with Arabic on both sides outside an isolate.
 */
export const assertArrows = (text: string): string => {
  const outside = text.replace(/⟦[^⟧]*⟧/g, ' X ');
  const m = outside.match(/([^→]*)→([^→]*)/);
  if (m && isArabic(m[1].slice(-12)) && isArabic(m[2].slice(0, 12))) throw new Error(`'→' between Arabic blocks in "${text}" (use '←')`);
  return text;
};
/** Frozen units, Latin, after the number, in one LTR isolate (Rule U1). */
export const UNITS = ['EGP', '%', 'ms', 's', 'rows'] as const;
export type Unit = (typeof UNITS)[number];
export const withUnit = (n: number | string, u: Unit): string => `⟦${minus(String(n))}${u === '%' ? ' %' : ` ${u}`}⟧`;

// ---------- caption line breaking (arabic-typographer r1: <= 32 chars/line, <= 2 lines) ----------

export const CAPTION = {maxChars: 32, maxLines: 2} as const;
/** Visible length: combining marks (tashkeel, shadda) do not count; ⟦⟧ isolate brackets do not count. */
export const visLen = (s: string): number => s.replace(/[ً-ٰٟۖ-ۭ⟦⟧]/g, '').length;
export type Broken = {lines: string[]; overflow: boolean};
/**
 * Break a caption into at most `maxLines` lines of at most `maxChars` visible characters, at word boundaries only
 * (Arabic words are never split). An explicit ` | ` in the text forces the break (spec authors). Otherwise a
 * two-line caption is TOP-HEAVY and as balanced as possible (line 1 >= line 2, minimise line 1), which lands on the
 * phrase seam in the r1 cases (`إزاي أمنع job إنها تحمّل` / `نفس الصفوف مرتين`). `overflow` = the rule cannot be met.
 */
export const breakCaption = (text: string, maxChars: number = CAPTION.maxChars, maxLines: number = CAPTION.maxLines): Broken => {
  if (text.includes(' | ')) {
    const lines = text.split(' | ').map((l) => l.trim());
    return {lines, overflow: lines.length > maxLines || lines.some((l) => visLen(l) > maxChars)};
  }
  const words = text.trim().split(/\s+/);
  const join = (a: number, b: number) => words.slice(a, b).join(' ');
  if (visLen(text) <= maxChars) return {lines: [text.trim()], overflow: false};
  if (maxLines >= 2) {
    let best: string[] | null = null;
    let bestTop = Infinity;
    for (let k = 1; k < words.length; k++) {
      const l = [join(0, k), join(k, words.length)];
      const [a, b] = l.map(visLen);
      if (a < b || a > maxChars) continue;
      if (a < bestTop) {
        bestTop = a;
        best = l;
      }
    }
    if (best) return {lines: best, overflow: false};
  }
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (visLen(t) > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return {lines, overflow: lines.length > maxLines || lines.some((l) => visLen(l) > maxChars)};
};
/** Line-height for a multi-line caption block: 1.6 if ANY line carries tashkeel or shadda (rule T1 over the block). */
export const blockLineHeight = (lines: string[]): number => Math.max(...lines.map((l) => lineHeightFor(l)));

// ---------- auto-fit and overflow ----------

export type Fit = {size: number; width: number; overflow: boolean};
let ctx: CanvasRenderingContext2D | null = null;
const measureCtx = (): CanvasRenderingContext2D | null => {
  if (ctx) return ctx;
  if (typeof document === 'undefined') return null;
  ctx = document.createElement('canvas').getContext('2d');
  return ctx;
};

/** Width (px) of a mixed line at `size`, measuring each run in its own face (Chromium shapes Arabic in canvas). */
export const measureLine = (text: string, size: number, latFamily: string = FONT.lat.family, latScale = 0.92): number | null => {
  const c = measureCtx();
  if (!c) return null;
  const f = arabicFace(size);
  let w = 0;
  for (const s of segment(text)) {
    if (s.ltr) {
      c.font = `${FONT.lat.weight} ${size * latScale}px '${latFamily}'`;
      c.direction = 'ltr';
    } else {
      c.font = `${f.weight} ${size}px '${f.family}'`;
      c.direction = 'rtl';
    }
    w += c.measureText(s.t).width;
  }
  const spaces = (text.match(/\s/g) || []).length;
  return w + spaces * 0.08 * size; // word-spacing
};

/** Largest size in [min, max] (step px) whose measured width fits `maxWidth`; overflow = true if even `min` does not fit. */
export const fitSize = (text: string, maxWidth: number, max: number, min: number, step = 2): Fit => {
  for (let s = max; s >= min; s -= step) {
    const w = measureLine(text, s);
    if (w === null) return {size: max, width: NaN, overflow: false}; // no DOM (node): layout check happens in the browser
    if (w <= maxWidth) return {size: s, width: w, overflow: false};
  }
  const w = measureLine(text, min) ?? NaN;
  return {size: min, width: w, overflow: true};
};

/** DOM overflow check after layout (used by snapshot tests and the overflow lint). */
export const overflows = (el: HTMLElement | null, tolPx = 1): boolean => !!el && (el.scrollWidth > el.clientWidth + tolPx || el.scrollHeight > el.clientHeight + tolPx);
