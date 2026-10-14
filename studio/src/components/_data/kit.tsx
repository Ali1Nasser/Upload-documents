// Shared helpers of the P7 "data" group (family Data). Owned by this group; other groups never import it.
// Thin wrappers over the frozen tokens and the type engine: no colour, size or FX number lives here.
// Rules kept here once so every data component follows them (docs/tools/component_guide.md):
//  - whole-word Arabic through MixedText (never split, never sliced); Arabic copy only from props;
//  - numbers with their unit in ONE LTR isolate (arabic.ts U1), mono tabular figures, NumberCounter formatter;
//  - RV1 onsets: every component-owned move that starts on an anchor goes through revealProgress (ink ON the anchor frame);
//    a move that must LAND on a word end starts its interpolation at t0 - REVEAL_ONSET_F (like NumberCounter's count roll);
//  - auto-fit with the 28 px floor; an overflow is a DC_QA finding and the copy is outlined in crit.
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE, type ColorToken} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {caShadow, glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor, type LatinRole} from '../../type/arabic';
import {ease, presetFrames, REVEAL_ONSET_F, revealProgress, revealStyle} from '../../type/reveal';
import {LABEL_GAP_MIN_PX} from '../../type/safe';
import type {LayerCtx, ResolvedAction} from '../../spec/types';
import {formatValue} from '../NumberCounter/NumberCounter';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export type NumT = {value: number; ref: string; unit?: string; decimals?: number};
export type StatusT = 'idle' | 'active' | 'ok' | 'warn' | 'fail';
/** Status -> token (04 section 1.1: semantic colours are never decorative). */
export const STATUS: Record<StatusT, ColorToken> = {idle: 'ink3', active: 'signal', ok: 'ok', warn: 'warn', fail: 'crit'};
/** AT-4: labels on one row are >= 40 px apart. */
export const GAP = LABEL_GAP_MIN_PX;
export const LABEL_MIN = SIZE.labelMin;
/** `color` + alpha (0..1) as an 8-digit hex. */
export const tint = (color: string, a: number): string => `${color}${hex(a)}`;
const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Linear mix of two token colours (k = 0 -> a, 1 -> b), as #rrggbb. Endpoints are always tokens. */
export const mix = (a: string, b: string, k: number): string => {
  const x = rgb(a);
  const y = rgb(b);
  const q = Math.max(0, Math.min(1, k));
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * q).toString(16).padStart(2, '0')).join('')}`;
};

// ---------- numbers ----------
/** Decimals written in the source value (120 -> 0, 850.2 -> 1); Num.decimals wins when given. */
export const srcDecimals = (v: number): number => (String(v).split('.')[1] ?? '').length;
/** NumberCounter formatter: NNBSP grouping from 10 000, U+2212 minus, Western digits, source decimals kept. */
export const fmt = (v: number, decimals?: number): string => formatValue(v, 'decimal', decimals ?? srcDecimals(v));
export const fmtNum = (n: NumT, v: number = n.value): string => fmt(v, n.decimals ?? srcDecimals(n.value));

// ---------- timing (all frames are shot-local at the composition fps) ----------
/** Actions of one name in anchor order. */
export const acts = (ctx: LayerCtx, name: string): ResolvedAction[] => ctx.actions.filter((a) => a.name === name).sort((a, b) => a.at - b.at || a.li - b.li);
/** The latest action of `name` that has started at frame t (state changes persist until the next one). */
export const lastAct = (ctx: LayerCtx, name: string, t = ctx.frame): ResolvedAction | null => {
  const xs = acts(ctx, name).filter((a) => a.at <= t);
  return xs.length ? xs[xs.length - 1] : null;
};
/** Film-frame stagger converted to the composition fps (2 film frames = 83 ms per step by default). */
export const stag = (ctx: LayerCtx, k: number, f24 = 2): number => Math.round((k * f24 * ctx.fps) / 24);
/** RV1 progress of a component-owned move that starts on frame `at` (first visible step ON the anchor frame). */
export const prog = (ctx: LayerCtx, at: number, preset: 'arrive' | 'label' | 'morph' | 'impact' = 'arrive', easing: (x: number) => number = ease.arrive, long = false): number =>
  revealProgress(ctx.frame - at, presetFrames(preset, ctx.fps, long), easing);
/** A roll that starts on its anchor frame t0 (RV1: first step on t0) and LANDS on t1 (the count preset: the word end). */
export const roll = (t: number, t0: number, t1: number, a: number, b: number, easing: (x: number) => number = ease.arrive): number =>
  t < t0 ? a : interpolate(t, [t0 - REVEAL_ONSET_F, Math.max(t0, t1)], [a, b], {...clamp, easing});
/** Landing frame of a move anchored on an action: its word end, never shorter than the morph preset. */
export const landOf = (ctx: LayerCtx, a: {at: number; end: number}): number => a.at + Math.max(presetFrames('morph', ctx.fps), a.end - a.at);
/** Landing frame of the layer's own arrival build: the anchor word end, at least two arrive presets. */
export const landLayer = (ctx: LayerCtx): number => ctx.at + Math.max(2 * presetFrames('arrive', ctx.fps), ctx.atEnd - ctx.at);
/** 0..1 flash that peaks on frame `t0` (2 film frames hold, then decays): the landing glow of NumberCounter. */
export const flashAt = (ctx: LayerCtx, t0: number | null): number => {
  if (t0 === null || ctx.frame < t0) return 0;
  const ff = Math.max(1, Math.round((2 * ctx.fps) / 24));
  return interpolate(ctx.frame - t0, [0, ff, ff * 3], [1, 1, 0], clamp);
};

// ---------- layer shell ----------
/** Slot box + exit preset on `until`. Hidden (but laid out) before the layer anchor. */
export const Shell: React.FC<{ctx: LayerCtx; children?: React.ReactNode; style?: React.CSSProperties}> = ({ctx, children, style}) => {
  const ex = ctx.until !== undefined ? revealStyle(1e6, ctx.fps, 'wipe', 'ltr', ctx.frame - ctx.until).style : {};
  return (
    <div
      style={{
        position: 'absolute',
        left: ctx.box.x,
        top: ctx.box.y,
        width: ctx.box.w,
        height: ctx.box.h,
        visibility: ctx.frame < ctx.at ? 'hidden' : undefined,
        ...style,
        ...ex,
      }}
    >
      {children}
    </div>
  );
};

/** Glass plate (04 section 3.4: every string sits on a plate or a halo) with an optional emissive accent edge. */
export const Plate: React.FC<{accent?: string; style?: React.CSSProperties; children?: React.ReactNode}> = ({accent, style, children}) => (
  <Glass accent={accent} style={{position: 'relative', ...style}}>
    {children}
  </Glass>
);

// ---------- copy ----------
/** One label (Arabic, Latin or mixed) through the type engine on a dark halo; never split. */
export const Lbl: React.FC<{
  id: string;
  text: string;
  size: number;
  color?: string;
  weight?: number;
  role?: LatinRole;
  style?: React.CSSProperties;
  glowK?: number;
  fx?: LayerCtx['fx'];
  overflow?: boolean;
}> = ({id, text, size, color = C.ink2, weight = FONT.label.weight, role, style, glowK, fx, overflow}) => (
  <div
    data-overflow={overflow ? 1 : undefined}
    style={{
      fontSize: size,
      lineHeight: lineHeightFor(text, 1.35),
      color,
      whiteSpace: 'nowrap',
      width: 'max-content',
      textShadow: glowK && fx ? `${halo}, ${glow(color, fx, glowK)}` : halo,
      outline: overflow ? `2px dashed ${C.crit}` : undefined,
      ...style,
    }}
  >
    <MixedText id={id} text={text} size={size} weight={weight} role={role ?? (isArabic(text) ? 'sentence' : 'data')} />
  </div>
);

/** A number with its unit in ONE LTR isolate (arabic.ts U1), mono tabular figures, optional glow (+ CA: numerals only). */
export const NumText: React.FC<{
  id: string;
  text: string;
  unit?: string;
  size: number;
  color?: string;
  fx?: LayerCtx['fx'];
  glowK?: number;
  ca?: boolean;
  minCh?: number;
  unitScale?: number;
  style?: React.CSSProperties;
}> = ({id, text, unit, size, color = C.ink, fx, glowK = 0, ca, minCh, unitScale = 0.5, style}) => (
  <bdi
    dir="ltr"
    data-dc-text={id}
    style={{
      fontFamily: `'${FONT.mono.family}'`,
      fontWeight: FONT.mono.weight,
      fontSize: size,
      lineHeight: 1.15,
      color,
      fontFeatureSettings: '"tnum" 1, "zero" 0',
      whiteSpace: 'nowrap',
      textShadow: fx && glowK > 0 ? `${halo}, ${glow(color, fx, glowK)}${ca ? caShadow(fx) : ''}` : halo,
      ...style,
    }}
  >
    <span style={minCh ? {display: 'inline-block', minWidth: `${minCh}ch`, textAlign: 'center'} : undefined}>{text}</span>
    {unit ? <span style={{fontSize: `${unitScale}em`, color: C.ink2, marginLeft: '0.3em', textShadow: halo}}>{unit}</span> : null}
  </bdi>
);

/** Mono chip for Latin keywords (SQL clause, join kind, cell code). Arabic falls back to the Arabic face via MixedText. */
export const Chip: React.FC<{id: string; text: string; size: number; color?: string; fill?: number; fx: LayerCtx['fx']; style?: React.CSSProperties}> = ({id, text, size, color = C.signal, fill = 0, fx, style}) => (
  <div
    style={{
      display: 'inline-block',
      padding: `${Math.round(size * 0.14)}px ${Math.round(size * 0.42)}px`,
      borderRadius: Math.round(size * 0.32),
      border: `1px solid ${tint(color, 0.35 + 0.65 * fill)}`,
      background: fill > 0 ? tint(color, 0.18 * fill) : tint(C.panel, 0.9),
      color: fill > 0.5 ? C.ink : color,
      fontSize: size,
      lineHeight: 1.25,
      whiteSpace: 'nowrap',
      boxShadow: fill > 0 ? `0 0 ${(fx.glowInner * 1.6 * fill).toFixed(1)}px ${tint(color, 0.55)}` : undefined,
      width: 'max-content',
      ...style,
    }}
  >
    <MixedText id={id} text={text} size={size} role="chip" weight={FONT.mono.weight} />
  </div>
);

/** Reading direction of a set of labels: RTL when any is Arabic (start = right, 04 / safe.ts). */
export const rtlOf = (...labels: (string | undefined)[]): boolean => labels.some((l) => !!l && isArabic(l));

/**
 * Uniform fit of a SET of copy. Every item is laid out once in an invisible probe (stacked: probe width = the widest item)
 * that is fitted to maxW x maxH with the 28 px floor (useAutoFit: M8 settle handles, DC_QA overflow below the floor). The
 * visible copy renders at the returned size, so a row / column shares one size and AT-4 spacing holds by construction.
 */
export const useFitProbe = (
  id: string,
  size: number,
  maxW: number,
  render: (fs: number) => React.ReactNode,
  key: string,
  opts: {min?: number; maxH?: number} = {},
): {size: number; overflow: boolean; probe: React.ReactNode} => {
  const ref = useRef<HTMLDivElement>(null);
  const fit = useAutoFit(ref, {id, size, min: opts.min ?? LABEL_MIN, maxW: Math.max(1, Math.floor(maxW)), maxH: opts.maxH ? Math.max(1, Math.floor(opts.maxH)) : undefined, key: `${key}|${Math.round(maxW)}|${Math.round(opts.maxH ?? 0)}`});
  const probe = (
    <div ref={ref} aria-hidden style={{position: 'absolute', left: 0, top: 0, visibility: 'hidden', width: 'max-content', fontSize: fit.size, whiteSpace: 'nowrap', pointerEvents: 'none'}}>
      {render(fit.size)}
    </div>
  );
  return {size: fit.size, overflow: fit.overflow, probe};
};
/** Probe content: one-line labels, stacked (probe width = the widest). */
export const probeLabels = (texts: string[], fs: number, weight: number = FONT.label.weight): React.ReactNode =>
  texts.map((t, i) => (
    <div key={i} style={{lineHeight: lineHeightFor(t, 1.35)}}>
      <MixedText text={t} size={fs} weight={weight} role={isArabic(t) ? 'sentence' : 'data'} />
    </div>
  ));
/** Probe content: mono numbers (unit included as text). */
export const probeNums = (texts: string[], fs: number): React.ReactNode =>
  texts.map((t, i) => (
    <div key={i} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontFeatureSettings: '"tnum" 1', lineHeight: 1.15}}>
      {t}
    </div>
  ));
/** Approximate rendered width of a mono string at size fs (JetBrains Mono advance = 0.6 em). Layout only, never QA. */
export const monoW = (s: string, fs: number): number => Math.ceil(s.length * fs * 0.6);

export {C, FONT, SIZE, glow, halo, hex, caShadow, ease, presetFrames, revealProgress, revealStyle, REVEAL_ONSET_F, isArabic, MixedText};
