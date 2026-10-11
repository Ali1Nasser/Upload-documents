// Shared helpers of P7 group "code-media" (Terminal, CodeTrace, SqlStages, LoopPlate, AIPlate, ManimInsert). Group-private:
// no other group imports this folder, and nothing here re-implements the frozen type rules (src/type/arabic.ts).
//  - code runs: code / terminal / SQL text is an LTR mono block (04 section 3.4: never translated, never mirrored). Arabic inside
//    code (comments, string literals) is cut out as WHOLE-WORD runs and set by MixedText as RTL isolates; Latin may be typed per
//    character, Arabic never is (golden rule 10);
//  - a small, deterministic syntax tokenizer (colours from tokens only);
//  - film-frame helper, media paths (studio/public/media/* -> data/derived/*), a per-asset JSON sidecar cache.
import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {C, FONT} from '../../tokens';
import {hex} from '../../fx/look';
import {MixedText} from '../../type/Text';
import {isArabic} from '../../type/arabic';

/** A duration given in film frames (24 fps, the ms-truth of 04 section 4) at the composition fps; at least 1. */
export const f24 = (n: number, fps: number): number => Math.max(1, Math.round((n * fps) / 24));

/** JetBrains Mono advance = 600 / 1000 em (fixed pitch): analytic layout for code blocks (no measure-then-shrink loop). */
export const MONO_ADV = 0.6;
/** Rough advance of Plex Sans Arabic in code lines (only used to estimate wrapping of a line that carries Arabic). */
export const AR_ADV = 0.56;
/** 04 section 3.2: code / SQL / terminal 26-32 px mono, <= 12 lines visible. Size = SIZE.label (32), floor = SIZE.labelMin (28). */
export const CODE_ROWS_MAX = 12;
export const CODE_LH = 1.5;

// ---------- Arabic runs inside code ----------
const AR = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
/** A maximal run of whole Arabic words (letters, marks, tatweel, Arabic punctuation) and the blanks between them. */
const AR_RUN = new RegExp(`[${AR}]+(?:[ \\t]+[${AR}]+)*`, 'g');
export type Run = {t: string; ar: boolean; at: number};
/** Split a code line into Latin pieces and whole-word Arabic runs (boundaries never fall inside an Arabic word). */
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
export const hasArabic = (s: string): boolean => isArabic(s);
/** Visual width of a code line in em (mono advance for Latin, an estimate for Arabic runs). Tabs are expanded by `detab`. */
export const lineEm = (line: string): number => codeRuns(line).reduce((a, r) => a + r.t.length * (r.ar ? AR_ADV : MONO_ADV), 0);
export const detab = (s: string): string => s.replace(/\t/g, '    ');

// ---------- syntax tokens ----------
export type TokKind = 'kw' | 'fn' | 'str' | 'num' | 'com' | 'op' | 'id' | 'ws' | 'ty';
export type Tok = {t: string; k: TokKind; at: number};
const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));
const KW: Record<string, Set<string>> = {
  sql: words(
    'SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS ON AS GROUP BY HAVING ORDER LIMIT OFFSET DISTINCT AND OR NOT IN IS NULL LIKE BETWEEN CASE WHEN THEN ELSE END ASC DESC UNION ALL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX VIEW WITH OVER PARTITION WINDOW ROWS RANGE EXISTS PRIMARY KEY REFERENCES BEGIN COMMIT ROLLBACK USING',
  ),
  python: words('def return if elif else for while in not and or is None True False import from as class with try except finally raise lambda yield pass break continue async await print len sum range'),
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
const COMMENT: Record<string, RegExp> = {
  sql: /^--.*/,
  python: /^#.*/,
  bash: /^#.*/,
  yaml: /^#.*/,
  dockerfile: /^#.*/,
  js: /^\/\/.*/,
  ts: /^\/\/.*/,
  scala: /^\/\/.*/,
  java: /^\/\/.*/,
  go: /^\/\/.*/,
};
const CASELESS = new Set(['sql', 'dockerfile']);

/** Tokenize one line (state = inside a block comment / triple-quoted string from the previous line). Deterministic, no regex
 * backtracking surprises: one pass, longest-match per position. */
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
    if (end < 0) {
      push(line, state.block === '*/' ? 'com' : 'str');
      return out;
    }
    push(line.slice(0, end + state.block.length), state.block === '*/' ? 'com' : 'str');
    state.block = null;
  }
  while (i < line.length) {
    const rest = line.slice(i);
    let m: RegExpMatchArray | null;
    if (com && (m = rest.match(com))) push(m[0], 'com');
    else if ((lang === 'js' || lang === 'ts' || lang === 'java' || lang === 'go' || lang === 'scala' || lang === 'sql') && rest.startsWith('/*')) {
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
/** Token colours (tokens only). Quiet by design: keywords carry the signal colour, strings violet, numbers ember. */
export const TOK_COLOR: Record<TokKind, string> = {kw: C.signal, fn: C.ink, ty: C.ink, str: C.violet, num: C.ember, com: C.ink3, op: C.ink3, id: C.ink2, ws: C.ink2};

/**
 * One code line as spans: syntax colours, Arabic runs as whole-word MixedText isolates, and an optional per-character reveal
 * (`shown` = number of visible characters, Latin only: a line that carries Arabic is always passed shown = undefined and is
 * revealed as a whole by its caller). Hidden characters keep their layout (visibility: hidden), so typing never reflows.
 */
export const CodeSpans: React.FC<{id: string; line: string; lang: string; size: number; state?: {block: string | null}; shown?: number; tint?: string; colorOf?: (k: TokKind) => string}> = ({
  id,
  line,
  lang,
  size,
  state,
  shown,
  tint,
  colorOf,
}) => {
  const toks = tokenize(line, lang, state);
  const out: React.ReactNode[] = [];
  let ak = 0;
  toks.forEach((tk, j) => {
    const color = tint ?? (colorOf ? colorOf(tk.k) : TOK_COLOR[tk.k]);
    // Arabic inside the token: whole-word runs through the type engine, never sliced
    for (const r of codeRuns(tk.t)) {
      const start = tk.at + r.at;
      if (r.ar) {
        out.push(
          <span key={`${j}a${start}`} style={{color, fontSize: size}}>
            <MixedText id={`${id}:ar${ak++}`} text={r.t} size={size} role="code" weight={FONT.arText.weight} color={color} />
          </span>,
        );
        continue;
      }
      if (shown === undefined || shown >= start + r.t.length) out.push(<span key={`${j}l${start}`} style={{color}}>{r.t}</span>);
      else {
        const n = Math.max(0, shown - start);
        if (n > 0) out.push(<span key={`${j}l${start}`} style={{color}}>{r.t.slice(0, n)}</span>);
        out.push(<span key={`${j}h${start}`} style={{color, visibility: 'hidden'}}>{r.t.slice(n)}</span>);
      }
    }
  });
  return <>{out}</>;
};

/** Window chrome: three dim status dots + a mono caption (e.g. the shell or the language). */
export const Chrome: React.FC<{label: string; size: number; accent?: string}> = ({label, size, accent = C.signal}) => {
  const d = Math.round(size * 0.36);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: Math.round(d * 0.8), height: Math.round(size * 1.6), padding: `0 ${Math.round(size * 0.7)}px`, borderBottom: `1px solid ${C.grid}`}}>
      {[C.crit, C.warn, C.ok].map((c, i) => (
        <div key={i} style={{width: d, height: d, borderRadius: '50%', background: `${c}${hex(0.55)}`}} />
      ))}
      <div style={{flex: 1}} />
      <bdi dir="ltr" style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: Math.round(size * 0.62), color: C.ink3, letterSpacing: '0.04em'}}>
        {label}
      </bdi>
      <div style={{width: Math.round(size * 0.18), height: Math.round(size * 0.62), background: `${accent}${hex(0.7)}`, borderRadius: 2, marginLeft: Math.round(d * 0.8)}} />
    </div>
  );
};

// ---------- media (P10 plates, Manim inserts, ADR-006 plates) ----------
/** studio/public/media/<kind> are symlinks to data/derived/<kind> (forwarded, never copied, into every bundle). */
export const MEDIA = {plates: 'media/plates', manim: 'media/manim', genai: 'media/genai'} as const;
export const mediaUrl = (kind: keyof typeof MEDIA, file: string): string => staticFile(`${MEDIA[kind]}/${file}`);

/** JSON sidecar (<slug>.json next to a plate / clip): fetched once per page, render held with delayRender until it lands.
 * A missing sidecar resolves to null (the caller falls back to defaults); it never hangs a render. */
const sidecars = new Map<string, Promise<unknown>>();
const sidecarVals = new Map<string, unknown>();
export const useSidecar = <T,>(url: string): T | null | undefined => {
  const [, force] = React.useState(0);
  const [handle] = React.useState(() => (sidecarVals.has(url) || typeof document === 'undefined' ? null : delayRender(`sidecar ${url}`)));
  React.useLayoutEffect(() => {
    if (sidecarVals.has(url)) {
      if (handle !== null) continueRender(handle);
      return;
    }
    let p = sidecars.get(url);
    if (!p) {
      p = fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      sidecars.set(url, p);
    }
    let live = true;
    p.then((v) => {
      sidecarVals.set(url, v);
      if (live) force((x) => x + 1);
      if (handle !== null) continueRender(handle);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return sidecarVals.has(url) ? (sidecarVals.get(url) as T | null) : undefined;
};
