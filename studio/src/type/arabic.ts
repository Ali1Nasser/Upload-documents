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
