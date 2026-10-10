// P7 typography engine, pure helpers (no React, no DOM). Builds on the FROZEN rules in ./arabic.ts (segment, joinGapEm,
// arabicFace, lineHeightFor, stackGap) and never re-implements them. Arabic words are atomic: the smallest animated unit
// is a whole word (or a ⟦…⟧ LTR isolate, or a tatweel compound such as `الـKafka`).
import {isArabic} from './arabic';

// ---------- digits (04 §3.4: Western digits throughout) ----------
const EASTERN = /[٠-٩۰-۹]/g;
/** Map Arabic-Indic and Extended Arabic-Indic digits to Western digits. */
export const westernDigits = (s: string): string =>
  s.replace(EASTERN, (d) => String((d.charCodeAt(0) - (d.charCodeAt(0) >= 0x06f0 ? 0x06f0 : 0x0660)) % 10));
export const hasEasternDigits = (s: string): boolean => /[٠-٩۰-۹]/.test(s);

// ---------- Latin face features ----------
/**
 * Rule I1 (arabic_r5): an ALL-CAPS Latin run that contains `I` (AI, API, KPI, CI) is set with Inter Tight `cv08`
 * (serifed capital I) so it never reads as `Al` / `l`. Returns the CSS font-feature-settings value or undefined.
 */
export const needsSerifI = (latin: string): boolean => /I/.test(latin) && /^[A-Z0-9 ./+&_-]+$/.test(latin) && /[A-Z]/.test(latin);
export const latinFeatures = (latin: string): string | undefined => (needsSerifI(latin) ? '"cv08" 1, "tnum" 1' : undefined);

// ---------- whole-word units ----------
export type WordUnit = {t: string; ltr: boolean};
/**
 * Split copy into the smallest units an animation may address: whole words separated by whitespace; a ⟦…⟧ isolate is one
 * unit; `الـKafka` stays one unit. NEVER returns a fragment of an Arabic word (golden rule 10).
 */
export const wordUnits = (text: string): WordUnit[] => {
  const out: WordUnit[] = [];
  for (const part of text.split(/(⟦[^⟧]*⟧)/)) {
    if (!part) continue;
    if (part.startsWith('⟦')) {
      out.push({t: part, ltr: true});
      continue;
    }
    for (const w of part.split(/\s+/)) if (w) out.push({t: w, ltr: !isArabic(w)});
  }
  return out;
};

/** Arabic letters that join (everything Arabic except marks, tatweel, digits and punctuation). */
const AR_LETTER = /[ؠ-يٮ-ۓۺ-ۼݐ-ݿ]/;
const AR_MARK = /[ً-ٰٟۖ-ۭ]/;
/**
 * Per-letter split detector over a flat list of DOM text pieces (in document order, each tagged with its element id).
 * A violation is an element boundary that falls between two Arabic letters (or a letter and its mark) of the same word:
 * that breaks contextual joining. A tatweel followed by Latin (`الـ` + <bdi>Kafka</bdi>) is NOT a violation.
 */
export const perLetterViolations = (pieces: {text: string; el: number}[]): string[] => {
  const bad: string[] = [];
  for (let i = 1; i < pieces.length; i++) {
    const a = pieces[i - 1];
    const b = pieces[i];
    if (a.el === b.el || !a.text || !b.text) continue;
    const last = a.text[a.text.length - 1];
    const first = b.text[0];
    if ((AR_LETTER.test(last) || AR_MARK.test(last)) && (AR_LETTER.test(first) || AR_MARK.test(first))) {
      bad.push(`${a.text.slice(-6)}|${b.text.slice(0, 6)}`);
    }
  }
  return bad;
};

// ---------- fit math ----------
export type FitResult = {size: number; overflow: boolean; natural: number};
/**
 * Largest size <= `size` (step px, never below `min`) at which a run whose width is `naturalAtSize` px at `size` fits
 * `maxWidth`. Width is linear in font size (word-spacing and join gaps are em-based), so one measurement is enough.
 */
export const fitToWidth = (naturalAtSize: number, size: number, maxWidth: number, min: number, step = 2): FitResult => {
  if (!(naturalAtSize > 0) || naturalAtSize <= maxWidth) return {size, overflow: false, natural: naturalAtSize};
  let s = Math.floor((size * maxWidth) / naturalAtSize / step) * step;
  if (s < min) return {size: min, overflow: true, natural: naturalAtSize};
  s = Math.max(min, s);
  return {size: s, overflow: false, natural: naturalAtSize};
};
