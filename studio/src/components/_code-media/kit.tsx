// Shared helpers of P7 group "code-media" (Terminal, CodeTrace, SqlStages). Group-private: no other group imports this folder,
// and nothing here re-implements the frozen type rules (src/type/arabic.ts).
//  - code runs: code / terminal / SQL text is an LTR mono block (04 section 3.4: never translated, never mirrored). Arabic inside
//    code (comments, string literals) is cut out as WHOLE-WORD runs and set by MixedText as RTL isolates. Latin may be typed per
//    character (mono-only, allowed by 04 section 3.4); an Arabic run is always shown or hidden as a whole (golden rule 10);
//  - a small deterministic syntax tokenizer. Syntax colours are NEUTRAL (ink / ink2 / ink3 / paperShade): semantic colours are
//    never decorative (04 section 1.1), so `signal` is kept for the line being explained right now;
//  - analytic code layout (JetBrains Mono advance = 0.6 em): size from SIZE.label down to the SIZE.labelMin floor, soft-wrap at
//    the column limit, <= 12 visible rows (04 section 3.2). useAutoFit still measures the real block and reports an overflow.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {MixedText} from '../../type/Text';
import {isArabic} from '../../type/arabic';
import type {Rect} from '../../type/safe';

/** A duration given in film frames (24 fps, the ms-truth of 04 section 4) at the composition fps; at least 1. */
export const f24 = (n: number, fps: number): number => Math.max(1, Math.round((n * fps) / 24));

/** JetBrains Mono advance = 600 / 1000 em (fixed pitch). */
export const MONO_ADV = 0.6;
/** Estimated advance of Plex Sans Arabic per character inside code (only for wrapping; the real width is measured). */
export const AR_ADV = 0.56;
/** 04 section 3.2: code / SQL / terminal 26-32 px mono, <= 12 lines visible. */
export const CODE_ROWS_MAX = 12;
export const CODE_LH = 1.5;

// ---------- Arabic runs inside code ----------
const AR = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
/** A maximal run of whole Arabic words (letters, marks, tatweel, Arabic punctuation) and the blanks between them. */
const AR_RUN = new RegExp(`[${AR}]+(?:[ \\t]+[${AR}]+)*`, 'g');
export type Run = {t: string; ar: boolean; at: number};
/** Split a string into Latin pieces and whole-word Arabic runs (boundaries never fall inside an Arabic word). */
export const codeRuns = (line: string): Run[] => {
  const out: Run[] = [];
  let k = 0;
  for (const m of line.matchAll(AR_RUN)) {
    const i = m.index ?? 0;
    if (i > k) out.push({t: line.slice(k, i), ar: false, at: k});
    out.push({t: m[0], ar: true, at: i});
    k = i + m[0].length;
  }
  if (k < line.length) out.push({t: line.slice(k), ar: false, at: k});
  return out;
};
export const detab = (s: string): string => s.replace(/\t/g, '    ');
/** Width of line[s, e) in mono columns (an Arabic character counts AR_ADV / MONO_ADV of a column). */
const colsOf = (line: string, s: number, e: number): number => {
  let w = 0;
  for (let i = s; i < e; i++) w += isArabic(line[i]) ? AR_ADV / MONO_ADV : 1;
  return w;
};

/** Soft-wrap one line at `cols` columns -> [start, end) pieces. Breaks after a blank or a separator when possible and NEVER
 * inside an Arabic run (a run that does not fit moves to the next row whole; a run wider than a row gets its own row and the
 * measured overflow check reports it). */
export const wrapLine = (line: string, cols: number): [number, number][] => {
  if (!line.length) return [[0, 0]];
  const runs = codeRuns(line).filter((r) => r.ar);
  const out: [number, number][] = [];
  let s = 0;
  const c = Math.max(8, Math.floor(cols));
  while (s < line.length) {
    let e = s;
    while (e < line.length && colsOf(line, s, e + 1) <= c) e++;
    if (e >= line.length) {
      out.push([s, line.length]);
      break;
    }
    const cut = runs.find((r) => r.at < e && r.at + r.t.length > e);
    if (cut) e = cut.at > s ? cut.at : cut.at + cut.t.length;
    else {
      let b = -1;
      for (let i = e; i > s + Math.floor(c * 0.4); i--) if (/[\s,;(=]/.test(line[i - 1])) {
        b = i;
        break;
      }
      if (b > s) e = b;
    }
    if (e <= s) e = Math.min(line.length, s + 1);
    out.push([s, e]);
    s = e;
  }
  return out;
};

export type CodeLayout = {size: number; cols: number; rows: {line: number; s: number; e: number}[]; visRows: number; rowH: number; textW: number; panelW: number; panelH: number; chromeH: number; pad: number; gutter: number};
/** Analytic layout of a code block in a `maxW` x `maxH` rectangle: the largest size in [SIZE.labelMin, SIZE.label] at which
 * no line wraps, else the floor with soft-wrapping. `gutterCols` = line-number gutter width in columns (0 = none). */
export const codeLayout = (lines: string[], maxW: number, maxH: number, gutterCols = 0, extraRows = 0): CodeLayout => {
  const lens = lines.map((l) => colsOf(l, 0, l.length));
  const longest = Math.max(1, ...lens);
  let size = SIZE.labelMin;
  for (let s = SIZE.label; s >= SIZE.labelMin; s -= 2) {
    const pad = Math.round(s * 0.9);
    const avail = maxW - 2 * pad - (gutterCols ? (gutterCols + 1.5) * s * MONO_ADV : 0);
    if (longest * s * MONO_ADV <= avail) {
      size = s;
      break;
    }
  }
  const pad = Math.round(size * 0.9);
  const gutter = gutterCols ? Math.round((gutterCols + 1.5) * size * MONO_ADV) : 0;
  const cols = Math.max(8, Math.floor((maxW - 2 * pad - gutter) / (size * MONO_ADV)));
  const rows: CodeLayout['rows'] = [];
  lines.forEach((l, i) => wrapLine(l, cols).forEach(([s, e]) => rows.push({line: i, s, e})));
  const rowH = Math.round(size * CODE_LH);
  const chromeH = Math.round(size * 1.6);
  const fitRows = Math.max(1, Math.floor((maxH - chromeH - 2 * pad) / rowH));
  const visRows = Math.max(1, Math.min(CODE_ROWS_MAX, fitRows, rows.length + extraRows));
  const textCols = Math.min(cols, Math.max(...rows.map((r) => colsOf(lines[r.line], r.s, r.e)), 1));
  const textW = Math.ceil(textCols * size * MONO_ADV);
  return {size, cols, rows, visRows, rowH, textW, panelW: Math.min(maxW, textW + gutter + 2 * pad), panelH: chromeH + visRows * rowH + 2 * pad, chromeH, pad, gutter};
};
/** Rect of a w x h panel centred in `box` (the text-safe rect of a code panel). */
export const centred = (box: Rect, w: number, h: number): Rect => ({x: Math.round(box.x + (box.w - w) / 2), y: Math.round(box.y + (box.h - h) / 2), w: Math.round(w), h: Math.round(h)});

// ---------- syntax tokens ----------
export type TokKind = 'kw' | 'fn' | 'str' | 'num' | 'com' | 'op' | 'id' | 'ws' | 'ty';
export type Tok = {t: string; k: TokKind; at: number};
const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));
const KW: Record<string, Set<string>> = {
  sql: words(
    'SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS ON AS GROUP BY HAVING ORDER LIMIT OFFSET DISTINCT AND OR NOT IN IS NULL LIKE BETWEEN CASE WHEN THEN ELSE END ASC DESC UNION ALL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX VIEW WITH OVER PARTITION WINDOW ROWS RANGE EXISTS PRIMARY KEY REFERENCES BEGIN COMMIT ROLLBACK USING',
  ),
  python: words('def return if elif else for while in not and or is None True False import from as class with try except finally raise lambda yield pass break continue async await'),
  js: words('const let var function return if else for while of in new class extends import from export default async await try catch finally throw typeof instanceof null undefined true false this'),
  bash: words('if then else fi for do done while case esac function export echo cd ls cat grep wc sudo docker git python3 pip psql'),
  yaml: words('true false null yes no on off'),
  json: words('true false null'),
  dockerfile: words('FROM RUN COPY ADD WORKDIR ENV ARG EXPOSE CMD ENTRYPOINT USER LABEL VOLUME AS'),
  scala: words('val var def object class trait extends with case match if else for yield import new return true false null'),
  java: words('public private protected static final class interface extends implements new return if else for while try catch finally throw void int long double boolean true false null import package'),
  go: words('func package import var const type struct interface return if else for range go defer chan map select case switch default nil true false'),
};
KW.ts = new Set([...KW.js, ...words('type interface enum implements readonly as keyof')]);
KW.docker = KW.bash;
KW.git = KW.bash;
const COMMENT: Record<string, RegExp> = {sql: /^--.*/, python: /^#.*/, bash: /^#.*/, yaml: /^#.*/, dockerfile: /^#.*/, js: /^\/\/.*/, ts: /^\/\/.*/, scala: /^\/\/.*/, java: /^\/\/.*/, go: /^\/\/.*/};
const CASELESS = new Set(['sql', 'dockerfile']);
const BLOCK_C = new Set(['js', 'ts', 'java', 'go', 'scala', 'sql']);

/** Tokenize one line (state = inside a block comment / triple-quoted string from the previous line). One pass, deterministic. */
export const tokenize = (line: string, lang: string, state: {block: string | null} = {block: null}): Tok[] => {
  const out: Tok[] = [];
  const kw = KW[lang] ?? new Set<string>();
  const com = COMMENT[lang];
  let i = 0;
  const push = (t: string, k: TokKind) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && last.k === k && (k === 'ws' || k === 'op' || k === 'com' || k === 'str')) last.t += t;
    else out.push({t, k, at: i});
    i += t.length;
  };
  if (state.block) {
    const end = line.indexOf(state.block);
    const k: TokKind = state.block === '*/' ? 'com' : 'str';
    if (end < 0) {
      push(line, k);
      return out;
    }
    push(line.slice(0, end + state.block.length), k);
    state.block = null;
  }
  while (i < line.length) {
    const rest = line.slice(i);
    let m: RegExpMatchArray | null;
    if (com && (m = rest.match(com))) push(m[0], 'com');
    else if (BLOCK_C.has(lang) && rest.startsWith('/*')) {
      const end = rest.indexOf('*/', 2);
      if (end < 0) {
        state.block = '*/';
        push(rest, 'com');
      } else push(rest.slice(0, end + 2), 'com');
    } else if (lang === 'python' && (rest.startsWith('"""') || rest.startsWith("'''"))) {
      const q = rest.slice(0, 3);
      const end = rest.indexOf(q, 3);
      if (end < 0) {
        state.block = q;
        push(rest, 'str');
      } else push(rest.slice(0, end + 3), 'str');
    } else if ((m = rest.match(/^\s+/))) push(m[0], 'ws');
    else if ((m = rest.match(/^(?:[fbrFBR]{0,2})("([^"\\]|\\.)*"?|'([^'\\]|\\.)*'?|`([^`\\]|\\.)*`?)/))) push(m[0], 'str');
    else if ((m = rest.match(/^\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b/))) push(m[0], 'num');
    else if ((m = rest.match(/^[A-Za-z_$][\w$]*/))) {
      const w = m[0];
      const isKw = kw.has(CASELESS.has(lang) ? w.toUpperCase() : w);
      const call = /^\s*\(/.test(rest.slice(w.length));
      push(w, isKw ? 'kw' : call ? 'fn' : /^[A-Z][a-z]/.test(w) && lang !== 'sql' ? 'ty' : 'id');
    } else if ((m = rest.match(new RegExp(`^[${AR}]+(?:[ \\t]+[${AR}]+)*`)))) push(m[0], 'id');
    else push(rest[0], 'op');
  }
  return out;
};
/** Tokens of every line of a block (block-comment / docstring state carried across lines). */
export const tokenizeBlock = (lines: string[], lang: string): Tok[][] => {
  const st = {block: null as string | null};
  return lines.map((l) => tokenize(l, lang, st));
};
/** Neutral syntax colours (tokens only; 04 section 1.1: semantic colours are never decorative). */
export const TOK_COLOR: Record<TokKind, string> = {kw: C.ink, fn: C.ink, ty: C.ink, str: C.paperShade, num: C.ink, com: C.ink3, op: C.ink3, id: C.ink2, ws: C.ink2};

/**
 * One visual row [s, e) of a tokenized code line. Arabic runs go through MixedText as whole-word RTL isolates. `shown` (chars of
 * the line typed so far, absolute index) types LATIN characters one by one (mono-only, 04 section 3.4); an Arabic run appears
 * whole once typing reaches it and is never sliced. Hidden characters keep their layout (visibility: hidden): typing never reflows.
 */
export const CodeRow: React.FC<{id: string; toks: Tok[]; s: number; e: number; size: number; shown?: number; tint?: string; caret?: React.ReactNode}> = ({id, toks, s, e, size, shown, tint, caret}) => {
  const out: React.ReactNode[] = [];
  const caretAt = caret && shown !== undefined ? Math.min(shown, e) : -1; // the caret sits after the last typed character
  let placed = caretAt < 0;
  const place = (at: number) => {
    if (!placed && at >= caretAt) {
      out.push(<React.Fragment key="caret">{caret}</React.Fragment>);
      placed = true;
    }
  };
  for (const tk of toks) {
    const a = Math.max(s, tk.at);
    const b = Math.min(e, tk.at + tk.t.length);
    if (b <= a) continue;
    const color = tint ?? TOK_COLOR[tk.k];
    for (const r of codeRuns(tk.t.slice(a - tk.at, b - tk.at))) {
      const start = a + r.at;
      place(start);
      if (r.ar) {
        // whole-word Arabic run: visible as a unit once the typing cursor reaches its first character
        const vis = shown === undefined || shown > start;
        out.push(
          <span key={`a${start}`} style={{visibility: vis ? undefined : 'hidden'}}>
            <MixedText id={`${id}:a${start}`} text={r.t} size={size} role="code" weight={FONT.arText.weight} color={color} />
          </span>,
        );
        continue;
      }
      // mono-only: per-character reveal of Latin / code text (never Arabic: Arabic runs are handled above)
      if (shown === undefined || shown >= start + r.t.length) out.push(<span key={`l${start}`} style={{color}}>{r.t}</span>);
      else {
        const n = Math.max(0, shown - start); // mono-only
        if (n > 0) out.push(<span key={`l${start}`} style={{color}}>{r.t.slice(0, n) /* mono-only: Latin code text */}</span>);
        place(start + n);
        out.push(<span key={`h${start}`} style={{color, visibility: 'hidden'}}>{r.t.slice(n) /* mono-only */}</span>);
      }
    }
  }
  place(e);
  return (
    <bdi dir="ltr" data-dc-text={id} style={{whiteSpace: 'pre', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontFeatureSettings: '"tnum" 1, "calt" 0', fontVariantLigatures: 'none'}}>
      {out}
    </bdi>
  );
};

/** Window chrome: three dim status dots + a mono caption (the shell or the language). Dots are neutral (never semantic). */
export const Chrome: React.FC<{label: string; size: number; h: number}> = ({label, size, h}) => {
  const d = Math.round(size * 0.34);
  return (
    <div dir="ltr" style={{display: 'flex', alignItems: 'center', gap: Math.round(d * 0.8), height: h, padding: `0 ${Math.round(size * 0.7)}px`, borderBottom: `1px solid ${C.grid}`}}>
      {[0.5, 0.34, 0.22].map((a, i) => (
        <div key={i} style={{width: d, height: d, borderRadius: '50%', background: `${C.ink2}${hex(a)}`}} />
      ))}
      <div style={{flex: 1}} />
      <bdi dir="ltr" style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: Math.max(SIZE.secondaryMin, Math.round(size * 0.62)), color: C.ink3, letterSpacing: '0.04em'}}>
        {label}
      </bdi>
    </div>
  );
};
