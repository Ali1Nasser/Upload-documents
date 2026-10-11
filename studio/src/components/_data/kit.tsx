// Shared helpers of the P7 "data" group (family Data). Owned by this group; other groups never import it.
// Thin wrappers over the frozen tokens and the type engine: no colour, size or FX number lives here.
// Rules kept here once so every data component follows them: whole-word Arabic through MixedText, numbers in ONE LTR
// isolate with their unit (arabic.ts U1), RV1 onsets through revealProgress, auto-fit with the 28 px floor (overflow = DC_QA).
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE, type ColorToken} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
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

// ---------- numbers ----------
/** Decimals written in the source value (120 -> 0, 850.2 -> 1); Num.decimals wins when given. */
export const srcDecimals = (v: number): number => (String(v).split('.')[1] ?? '').length;
/** NumberCounter formatter: NNBSP grouping from 10 000, U+2212 minus, Western digits, source decimals kept. */
export const fmt = (v: number, decimals?: number): string => formatValue(v, 'decimal', decimals ?? srcDecimals(v));
export const fmtNum = (n: NumT, v: number = n.value): string => fmt(v, n.decimals ?? srcDecimals(n.value));
/** Unit glyph inside the number isolate: `%` keeps its thin gap like `95 %` (data contract), others after a space. */
export const unitText = (u?: string): string => (u ? u : '');

// ---------- timing (all frames are shot-local at the composition fps) ----------
/** Actions of one name in anchor order. */
export const acts = (ctx: LayerCtx, name: string): ResolvedAction[] => ctx.actions.filter((a) => a.name === name).sort((a, b) => a.at - b.at || a.li - b.li);
/** Film-frame stagger converted to the composition fps (2 film frames per step by default). */
export const stag = (ctx: LayerCtx, k: number, f24 = 2): number => Math.round((k * f24 * ctx.fps) / 24);
/** RV1 progress of a component-owned move that starts on frame `at` (first visible step ON the anchor frame). */
export const prog = (ctx: LayerCtx, at: number, preset: 'arrive' | 'label' | 'morph' | 'impact' = 'arrive', easing: (x: number) => number = ease.arrive, long = false): number =>
  revealProgress(ctx.frame - at, presetFrames(preset, ctx.fps, long), easing);
/** A value / position roll that starts on its anchor frame t0 (RV1) and LANDS on t1 (the count preset: the anchor word end). */
export const roll = (t: number, t0: number, t1: number, a: number, b: number, easing: (x: number) => number = ease.arrive): number =>
  t < t0 ? a : interpolate(t, [t0 - REVEAL_ONSET_F, Math.max(t0, t1)], [a, b], {...clamp, easing});
/** Landing frame of a move anchored on an action: its word end, but never shorter than the morph preset. */
export const landOf = (ctx: LayerCtx, a: {at: number; end: number}): number => a.at + Math.max(presetFrames('morph', ctx.fps), a.end - a.at);
/** Landing frame of the layer's own arrival roll: the anchor word end, at least two arrive presets. */
export const landLayer = (ctx: LayerCtx): number => ctx.at + Math.max(2 * presetFrames('arrive', ctx.fps), ctx.atEnd - ctx.at);
/** The latest action of `name` that has started at frame t (state changes persist until the next one). */
export const lastAct = (ctx: LayerCtx, name: string, t = ctx.frame): ResolvedAction | null => {
  const xs = acts(ctx, name).filter((a) => a.at <= t);
  return xs.length ? xs[xs.length - 1] : null;
};

// ---------- layer shell ----------
/** Slot box + exit preset on `until` + audio-reactive opacity / scale. Hidden (but laid out) before the layer anchor. */
export const Shell: React.FC<{ctx: LayerCtx; children?: React.ReactNode; style?: React.CSSProperties}> = ({ctx, children, style}) => {
  const ex = ctx.until !== undefined ? revealStyle(1e6, ctx.fps, 'label', 'ltr', ctx.frame - ctx.until).style : {};
  const m = ctx.mod;
  return (
    <div
      style={{
        position: 'absolute',
        left: ctx.box.x,
        top: ctx.box.y,
        width: ctx.box.w,
        height: ctx.box.h,
        visibility: ctx.frame < ctx.at ? 'hidden' : undefined,
        opacity: Math.max(0, 1 - m.opacity),
        transform: m.scale ? `scale(${(1 + 0.04 * m.scale).toFixed(4)})` : undefined,
        ...style,
        ...ex,
      }}
    >
      {children}
    </div>
  );
};

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

/** A number with its unit in ONE LTR isolate (arabic.ts U1), mono tabular figures, optional glow. */
export const NumText: React.FC<{
  id: string;
  text: string;
  unit?: string;
  size: number;
  color?: string;
  fx?: LayerCtx['fx'];
  glowK?: number;
  minCh?: number;
  unitScale?: number;
  style?: React.CSSProperties;
}> = ({id, text, unit, size, color = C.ink, fx, glowK = 0, minCh, unitScale = 0.5, style}) => (
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
      textShadow: fx && glowK > 0 ? `${halo}, ${glow(color, fx, glowK)}` : halo,
      ...style,
    }}
  >
    <span style={minCh ? {display: 'inline-block', minWidth: `${minCh}ch`, textAlign: 'center'} : undefined}>{text}</span>
    {unit ? <span style={{fontSize: `${unitScale}em`, color: C.ink2, marginLeft: '0.3em', textShadow: halo}}>{unitText(unit)}</span> : null}
  </bdi>
);

/** Mono chip for Latin keywords (SQL clause, join kind, cell code). Arabic text falls back to the Arabic face via MixedText. */
export const Chip: React.FC<{id: string; text: string; size: number; color?: string; fill?: boolean; fx: LayerCtx['fx']; style?: React.CSSProperties}> = ({id, text, size, color = C.signal, fill, fx, style}) => (
  <div
    style={{
      display: 'inline-block',
      padding: `${Math.round(size * 0.16)}px ${Math.round(size * 0.42)}px`,
      borderRadius: Math.round(size * 0.32),
      border: `1px solid ${fill ? color : `${color}${hex(0.65)}`}`,
      background: fill ? color : `${C.panel}${hex(0.9)}`,
      color: fill ? C.void : color,
      fontSize: size,
      lineHeight: 1.25,
      whiteSpace: 'nowrap',
      boxShadow: fill ? `0 0 ${(fx.glowInner * 1.6).toFixed(1)}px ${color}${hex(0.55)}` : undefined,
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
 * Uniform label fit. Every label of a set is laid out once in an invisible probe column (width = the widest label), and the
 * probe is fitted to `maxW` (x `maxH`) with the 28 px floor. The visible labels then render at the returned size, so a whole
 * row or column shares one size and AT-4 spacing holds by construction. Overflow below the floor is a DC_QA finding (fails
 * snapshots) and the caller outlines the copy in `crit`. `render(fs)` draws the probe content at size fs (labels, numbers).
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
  const fit = useAutoFit(ref, {id, size, min: opts.min ?? LABEL_MIN, maxW: Math.max(1, maxW), maxH: opts.maxH, key: `${key}|${Math.round(maxW)}|${Math.round(opts.maxH ?? 0)}`});
  const probe = (
    <div ref={ref} aria-hidden style={{position: 'absolute', left: 0, top: 0, visibility: 'hidden', width: 'max-content', fontSize: fit.size, whiteSpace: 'nowrap', pointerEvents: 'none'}}>
      {render(fit.size)}
    </div>
  );
  return {size: fit.size, overflow: fit.overflow, probe};
};
/** Probe content for a set of one-line labels (stacked, so the probe width is the widest one). */
export const probeLabels = (texts: string[], fs: number, weight: number = FONT.label.weight): React.ReactNode =>
  texts.map((t, i) => (
    <div key={i} style={{lineHeight: lineHeightFor(t, 1.35)}}>
      <MixedText text={t} size={fs} weight={weight} role={isArabic(t) ? 'sentence' : 'data'} />
    </div>
  ));
/** Probe content for numbers: mono, `ch` wide, unit included. */
export const probeNums = (texts: string[], fs: number): React.ReactNode =>
  texts.map((t, i) => (
    <div key={i} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontFeatureSettings: '"tnum" 1', lineHeight: 1.15}}>
      {t}
    </div>
  ));

export {C, FONT, SIZE, glow, halo, hex, ease, presetFrames, revealProgress, revealStyle, REVEAL_ONSET_F, isArabic, MixedText};
