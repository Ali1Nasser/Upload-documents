// dom-c group kit (P7 "Domain specials", group dom-c). Owned by the dom-c motion-engineer; imported only by the 11 dom-c
// components (ConnPoolTaxi, RaceCondition, SagaChain, QualityGauges, IdempotentStamp, KAnonBlur, SplitDeck, SamplingDial,
// GuardedAgentLoop, ArtifactChain, BranchPaths). Thin wrappers over the type engine and the frozen tokens: no colour, size
// or FX number lives here. Every label is ONE whole element (MixedText), auto-fitted to its cell (28 px floor, overflow is a
// DC_QA finding); every anchored motion eases through revealProgress (RV1: first visible step on the anchor frame).
import React, {useRef} from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, SIZE, type Fx} from '../../tokens';
import {halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor} from '../../type/arabic';
import {REVEAL_ONSET_F, ease, presetFrames, revealProgress, revealStyle, type RevealDir} from '../../type/reveal';
import type {LayerCtx, ResolvedAction} from '../../spec/types';
import {formatValue} from '../NumberCounter/NumberCounter';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** A frame count authored at the film rate (24 fps) expressed at the composition fps (layout rhythm, never ms). */
export const f24 = (ctx: Pick<LayerCtx, 'fps'>, n: number): number => Math.max(1, Math.round((n * ctx.fps) / 24));
/** Staggered birth frame of element i: anchor + i x `step` film frames (TableGrid rows use 2). Element 0 is born ON the anchor. */
export const born = (ctx: LayerCtx, i: number, step = 2, t0 = ctx.at): number => t0 + Math.round((step * i * ctx.fps) / 24);
/** Actions of one name, in time order. */
export const acts = (ctx: LayerCtx, name: string): ResolvedAction[] => ctx.actions.filter((a) => a.name === name).sort((a, b) => a.at - b.at || a.li - b.li);
/** RV1 eased progress of a motion that starts on frame t0 and lasts n frames (0 before t0, > 0 on t0, 1 at t0 + n - 1). */
export const prog = (ctx: LayerCtx, t0: number, n: number, e: (x: number) => number = ease.arrive): number => revealProgress(ctx.frame - t0, n, e);
/** A roll that must LAND on t1 (counter semantics, NumberCounter): first visible step on t0, value b exactly on t1. */
export const roll = (t: number, t0: number, t1: number, a: number, b: number): number =>
  t < t0 ? a : interpolate(t, [t0 - REVEAL_ONSET_F, Math.max(t0, t1)], [a, b], {...clamp, easing: ease.arrive});
/** Short pulse (1 held, then down to 0) starting on frame t0, `n` frames long (glow flashes; failure flashes). */
export const pulse = (t: number, t0: number, n: number): number => (t < t0 ? 0 : interpolate(t - t0, [0, Math.max(1, n * 0.25), Math.max(2, n)], [1, 1, 0], clamp));
/** Seeded failure shake (04 section 3.5: the only hard motion), `n` frames from t0, amplitude in px. */
export const shake = (key: string, t: number, t0: number | null, n: number, amp = 6): number =>
  t0 === null || t < t0 || t - t0 >= n ? 0 : (random(`${key}:${t}`) - 0.5) * 2 * amp * (1 - (t - t0) / n);

/** Whole-component wrapper style: label-preset entry on the layer anchor + the exit preset on `until`. */
export const shell = (ctx: LayerCtx, dir: RevealDir = 'rtl'): React.CSSProperties =>
  revealStyle(ctx.frame - ctx.at, ctx.fps, 'label', dir, ctx.until !== undefined ? ctx.frame - ctx.until : undefined).style;

export type StatusT = 'idle' | 'active' | 'ok' | 'warn' | 'fail';
/** Status -> semantic colour (04 section 1.1: semantic colours are never decorative). */
export const statusColor = (s?: StatusT): string => (s === 'ok' ? C.ok : s === 'warn' ? C.warn : s === 'fail' ? C.crit : s === 'idle' ? C.ink3 : C.signal);

/** Mixes two token colours (#RRGGBB) at q in [0, 1]; state transitions between semantic colours. */
export const mix = (a: string, b: string, q: number): string => {
  const p = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  const k = clamp01(q);
  const ch = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
};

/** Acrylic node material (04 section 1.2: glowing acrylic edge, glass body, key light from the upper right). */
export const acrylic = (col: string, fx: Fx, k = 0.4, dim = false): React.CSSProperties => ({
  background: `linear-gradient(200deg, ${C.panel}F2 0%, ${C.ground}E0 100%)`,
  border: `2px solid ${col}${dim ? hex(0.45) : ''}`,
  boxShadow: `inset 0 1px 0 ${C.ink}1A, 0 0 ${(fx.glowInner + fx.glowPx * 0.6 * k).toFixed(1)}px ${col}${hex(dim ? 0.1 : 0.2 + 0.45 * Math.min(1, k))}`,
});

export type LblProps = {
  id: string;
  text: string;
  maxW: number;
  maxH?: number;
  size?: number;
  color?: string;
  weight?: number;
  t?: number; // frames since this label's reveal frame (undefined = always shown)
  fps: number;
  preset?: 'label' | 'arrive' | 'wipe' | 'impact';
  role?: 'sentence' | 'chip' | 'data';
  glow?: string; // extra text-shadow (glow) appended to the halo
  wrap?: boolean; // wrap on word boundaries inside maxW (questions); words are never split
  align?: 'center' | 'right' | 'left';
  style?: React.CSSProperties;
};
/** One whole label, auto-fitted to its cell (floor SIZE.labelMin; below it: crit outline + DC_QA overflow). */
export const Lbl: React.FC<LblProps> = (p) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = p.size ?? SIZE.label;
  const fit = useAutoFit(ref, {id: p.id, size, min: Math.min(size, SIZE.labelMin), maxW: p.maxW, maxH: p.maxH, key: p.text});
  const dir: RevealDir = isArabic(p.text) ? 'rtl' : 'ltr';
  const r = p.t === undefined ? null : revealStyle(p.t, p.fps, p.preset ?? 'label', dir);
  return (
    <div
      ref={ref}
      data-overflow={fit.overflow ? 1 : undefined}
      dir={p.wrap ? dir : undefined}
      style={{
        width: p.wrap ? p.maxW : 'max-content',
        whiteSpace: p.wrap ? 'normal' : 'nowrap',
        textAlign: p.align ?? 'center',
        fontSize: fit.size,
        lineHeight: lineHeightFor(p.text),
        color: p.color ?? C.ink,
        textShadow: p.glow ? `${halo}, ${p.glow}` : halo,
        outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
        ...p.style,
        ...(r ? r.style : {}),
      }}
    >
      <MixedText id={p.id} text={p.text} size={fit.size} weight={p.weight ?? FONT.label.weight} role={p.role} />
    </div>
  );
};

/** Value text: source decimals kept (NumberCounter formatter: NNBSP grouping from 10 000, U+2212 minus). */
export const fmtNum = (v: number, decimals?: number, src?: number): string =>
  formatValue(v, 'decimal', decimals ?? (src === undefined || Number.isInteger(src) ? 0 : (String(src).split('.')[1] ?? '').length));

export type NumTextProps = {id: string; value: number; target: number; decimals?: number; unit?: string; maxW: number; size?: number; color?: string; glow?: string};
/** A number readout (mono tabular, unit after the number in the same LTR isolate). `target` sizes the box (no jitter). */
export const NumText: React.FC<NumTextProps> = (p) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = p.size ?? SIZE.sub;
  const s = fmtNum(p.value, p.decimals, p.target);
  const wide = fmtNum(p.target, p.decimals, p.target);
  const fit = useAutoFit(ref, {id: p.id, size, min: Math.min(size, SIZE.labelMin), maxW: p.maxW, key: `${wide}${p.unit ?? ''}`});
  return (
    <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} style={{width: 'max-content', whiteSpace: 'nowrap', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
      <bdi
        dir="ltr"
        data-dc-text={p.id}
        style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: fit.size, lineHeight: 1.1, color: p.color ?? C.ink, fontFeatureSettings: '"tnum" 1, "zero" 0', textShadow: p.glow ? `${halo}, ${p.glow}` : halo}}
      >
        <span style={{display: 'inline-block', minWidth: `${Math.max(s.length, wide.length)}ch`, textAlign: 'center'}}>{s}</span>
        {p.unit ? <span style={{fontSize: '0.5em', color: C.ink2, marginLeft: '0.3em'}}>{p.unit}</span> : null}
      </bdi>
    </div>
  );
};

/** Emissive wire: a wide dim stroke under a thin bright one (cheap glow; no SVG filter on swiftshader). `draw` 0..1. */
export const Wire: React.FC<{d: string; color: string; w?: number; draw?: number; len?: number; dash?: string; opacity?: number; reverse?: boolean}> = ({d, color, w = 3, draw = 1, len = 2000, dash, opacity = 1, reverse}) => {
  if (draw <= 0 || opacity <= 0) return null;
  const off = (1 - clamp01(draw)) * len * (reverse ? -1 : 1);
  const common = {d, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const da = dash ?? (draw < 1 ? `${len} ${len}` : undefined);
  return (
    <g opacity={opacity}>
      <path {...common} stroke={color} strokeOpacity={0.18} strokeWidth={w * 4} strokeDasharray={da} strokeDashoffset={dash ? undefined : off} />
      <path {...common} stroke={color} strokeWidth={w} strokeDasharray={da} strokeDashoffset={dash ? undefined : off} />
    </g>
  );
};

/** Emissive dot (data token): core + soft halo rings (no filter). */
export const Dot: React.FC<{x: number; y: number; r: number; color: string; k?: number; opacity?: number}> = ({x, y, r, color, k = 1, opacity = 1}) =>
  opacity <= 0 ? null : (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r * (2.6 + k)} fill={color} fillOpacity={0.08} />
      <circle cx={x} cy={y} r={r * 1.7} fill={color} fillOpacity={0.22} />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );

/** Point on a cubic bezier (for tokens travelling along wires). */
export const bez = (p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
};

/** Box frame: the layer's slot as an absolutely positioned container. */
export const boxStyle = (ctx: LayerCtx): React.CSSProperties => ({position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h});

/** Preset frame counts at the composition fps. */
export const pf = (ctx: LayerCtx) => ({
  arrive: presetFrames('arrive', ctx.fps),
  label: presetFrames('label', ctx.fps),
  impact: presetFrames('impact', ctx.fps, true),
  morph: presetFrames('morph', ctx.fps),
  morphLong: presetFrames('morph', ctx.fps, true),
  exit: presetFrames('exit', ctx.fps),
});
