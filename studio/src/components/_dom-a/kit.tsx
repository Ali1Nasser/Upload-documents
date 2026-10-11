// Shared helpers of P7 group dom-a (Domain specials): TripleGate, LegendOrbs, LatencyLadder, PermissionLocks, Heartbeat,
// LogScroll, CollectionMorph, VenvDome, TestGate, KeyBeams, TxnCapsule. Only dom-a components import from here.
// Thin layer over the FROZEN contract: colours / sizes / FX numbers come from tokens; text goes through the type engine
// (MixedText + useAutoFit); every component-owned motion that starts on an anchor uses revealProgress (RV1, ADR-011).
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, LINE, SIZE, type Fx} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {latinFeatures} from '../../type/words';
import {isArabic, lineHeightFor, type LatinRole} from '../../type/arabic';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {LayerCtx, ResolvedAction} from '../../spec/types';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** A count of film (24 fps) frames at the composition fps (staggers, beat periods); never derived from ms or seconds. */
export const ff = (f24: number, fps: number): number => Math.max(1, Math.round((f24 * fps) / 24));

/** The layer's actions of one kind, in anchor order (ties: spec order). */
export const actsOf = (ctx: LayerCtx, name: string): ResolvedAction[] =>
  ctx.actions.filter((a) => a.name === name).sort((a, b) => a.at - b.at || a.li - b.li);

/** RV1 progress of a component-owned move that starts on frame t0 (ink on t0, settles at t0 + n - 1). */
export const prog = (ctx: LayerCtx, t0: number, preset: 'label' | 'arrive' | 'morph' | 'impact' = 'label', easing = ease.arrive, long = false): number =>
  revealProgress(ctx.frame - t0, presetFrames(preset, ctx.fps, long), easing);

/** Impact flash envelope (80 ms hold, then decay) starting on frame t0; 0 before t0. */
export const flashAt = (ctx: LayerCtx, t0: number): number => {
  const n = flashFrames(ctx.fps);
  return ctx.frame < t0 ? 0 : interpolate(ctx.frame - t0, [0, n, n * 3], [1, 1, 0], clamp);
};

/** Whole-layer envelope: label fade-in on the layer anchor, exit preset on `until`. */
export const layerStyle = (ctx: LayerCtx, rtl = true): React.CSSProperties =>
  revealStyle(ctx.frame - ctx.at, ctx.fps, 'label', rtl ? 'rtl' : 'ltr', ctx.until !== undefined ? ctx.frame - ctx.until : undefined).style;

/** Emissive box glow (acrylic edges, cores) at the tier radii; k scales it (flash, audio). */
export const emit = (color: string, fx: Fx, k = 1): string =>
  `0 0 ${(fx.glowInner * 0.6 * k).toFixed(1)}px ${color}${hex(0.85)}, 0 0 ${(fx.glowPx * 0.7 * k).toFixed(1)}px ${color}${hex(0.35)}`;

/** Acrylic tile (04 §1.2: glowing acrylic edge, glass body, key rim light from the upper right). */
export const acrylic = (accent: string, fx: Fx, on = 1, radius = 14): React.CSSProperties => ({
  borderRadius: radius,
  border: `2px solid ${accent}${hex(0.25 + 0.75 * on)}`,
  background: `linear-gradient(200deg, ${C.panel}F0 0%, ${C.ground}E6 70%), radial-gradient(ellipse 80% 60% at 85% 0%, ${accent}${hex(0.12 * on)} 0%, transparent 70%)`,
  backgroundBlendMode: 'normal',
  boxShadow: `inset 0 1px 0 ${C.ink}1F, inset 0 0 ${Math.round(18 * on)}px ${accent}${hex(0.18 * on)}${on > 0.02 ? `, ${emit(accent, fx, on)}` : ''}`,
});

/** Absolutely placed flex cell centred on (x, y). */
export const Place: React.FC<{x: number; y: number; w: number; h: number; align?: 'center' | 'start' | 'end'; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, w, h, align = 'center', style, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: align === 'center' ? 'center' : align === 'start' ? 'flex-start' : 'flex-end',
      ...style,
    }}
  >
    {children}
  </div>
);

export type FitTextProps = {
  id: string;
  text: string;
  size: number;
  maxW: number;
  maxH?: number;
  min?: number;
  color?: string;
  weight?: number;
  role?: LatinRole;
  glowColor?: string;
  fx?: Fx;
  k?: number;
  style?: React.CSSProperties;
};
/** One whole label (Arabic, Latin or mixed) auto-fit to maxW x maxH, floor SIZE.labelMin unless `min` says otherwise;
 * below the floor it is outlined in crit and a DC_QA overflow finding is logged (snapshot tests fail). Never split. */
export const FitText: React.FC<FitTextProps> = ({id, text, size, maxW, maxH, min, color = C.ink, weight, role = 'sentence', glowColor, fx, k = 0.5, style}) => {
  const ref = useRef<HTMLDivElement>(null);
  const fit = useAutoFit(ref, {id, size, min: min ?? SIZE.labelMin, maxW, maxH, key: text});
  const ar = isArabic(text);
  const shadow = glowColor && fx ? `${halo}, ${glow(glowColor, fx, k)}` : halo;
  return (
    <div
      ref={ref}
      data-overflow={fit.overflow ? 1 : undefined}
      style={{
        width: 'max-content',
        whiteSpace: 'nowrap',
        fontSize: fit.size,
        lineHeight: ar ? lineHeightFor(text) : LINE.base,
        color,
        textShadow: shadow,
        outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
        ...style,
      }}
    >
      <MixedText id={id} text={text} size={fit.size} role={role} weight={weight ?? (role === 'sentence' ? FONT.label.strong : FONT.mono.weight)} />
    </div>
  );
};

/** Latin / mono tag (states such as COMMIT, PASS, read): an LTR isolate, never Arabic (component-owned copy must not be
 * Arabic: every Arabic word on screen comes from the layer props). */
export const Tag: React.FC<{id: string; text: string; color: string; size: number; fx: Fx; on?: number; style?: React.CSSProperties}> = ({id, text, color, size, fx, on = 1, style}) => (
  <bdi
    dir="ltr"
    data-dc-text={id}
    style={{
      display: 'inline-block',
      fontFamily: `'${FONT.mono.family}'`,
      fontWeight: FONT.mono.weight,
      fontSize: size,
      lineHeight: 1.2,
      letterSpacing: '0.04em',
      padding: `${Math.round(size * 0.18)}px ${Math.round(size * 0.5)}px`,
      borderRadius: Math.round(size * 0.5),
      color,
      border: `1.5px solid ${color}${hex(0.4 + 0.6 * on)}`,
      background: `${C.void}${hex(0.7)}`,
      boxShadow: on > 0.02 ? emit(color, fx, 0.5 * on) : undefined,
      textShadow: halo,
      whiteSpace: 'nowrap',
      fontFeatureSettings: latinFeatures(text) ?? '"tnum" 1', // rule 5: ALL-CAPS Latin with I gets cv08
      ...style,
    }}
  >
    {text}
  </bdi>
);

/** Mix two hex token colours (a -> b by q) for state transitions; inputs are token values, never literals. */
export const mix = (a: string, b: string, q: number): string => {
  const p = (s: string, i: number) => parseInt(s.slice(1 + 2 * i, 3 + 2 * i), 16);
  const c = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * Math.max(0, Math.min(1, q)));
  return `#${[0, 1, 2].map((i) => c(i).toString(16).padStart(2, '0')).join('')}`;
};

/** Holographic floor grid under a set (04 §1.1 grid @ 30-40 %), perspective-tilted; decorative, no copy. */
export const Floor: React.FC<{w: number; h: number; y: number; x?: number; opacity?: number}> = ({w, h, y, x = 0, opacity = 0.5}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, perspective: 900, pointerEvents: 'none', opacity}}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: 'rotateX(68deg)',
        transformOrigin: '50% 0%',
        backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: `radial-gradient(ellipse 60% 90% at 50% 0%, ${C.void} 0%, transparent 75%)`,
      }}
    />
  </div>
);

/** Piecewise state timeline: the state in force at frame t, the one before it, and the RV1 progress of the change. */
export type Ev<S> = {t: number; s: S};
export const stateAt = <S,>(ev: Ev<S>[], ctx: LayerCtx, preset: 'label' | 'arrive' | 'morph' | 'impact' = 'label', easing = ease.arrive): {cur: S; prev: S; q: number; t: number; k: number} => {
  let k = 0;
  for (let j = 0; j < ev.length; j++) if (ev[j].t <= ctx.frame) k = j;
  const q = k === 0 ? 1 : prog(ctx, ev[k].t, preset, easing);
  return {cur: ev[k].s, prev: ev[Math.max(0, k - 1)].s, q, t: ev[k].t, k};
};

/** Padlock glyph (SVG, no copy). open 0..1 lifts and swings the shackle; tone = token colour. */
export const LockGlyph: React.FC<{size: number; tone: string; open: number; fx: Fx; on?: number}> = ({size, tone, open, fx, on = 1}) => {
  const w = size;
  const h = size * 1.15;
  const lift = open * size * 0.22;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow: 'visible', filter: on > 0.05 ? `drop-shadow(0 0 ${(fx.glowInner * 0.6 * on).toFixed(1)}px ${tone})` : undefined}}>
      <g transform={`translate(${w * 0.68} ${h * 0.47 - lift}) rotate(${(-28 * open).toFixed(2)}) translate(${-w * 0.68} ${-(h * 0.47)})`}>
        <path d={`M ${w * 0.3} ${h * 0.47} V ${h * 0.3} A ${w * 0.2} ${w * 0.2} 0 0 1 ${w * 0.7} ${h * 0.3} V ${h * 0.47}`} fill="none" stroke={tone} strokeWidth={Math.max(2, size * 0.09)} strokeLinecap="round" />
      </g>
      <rect x={w * 0.16} y={h * 0.45} width={w * 0.68} height={h * 0.5} rx={size * 0.1} fill={`${tone}${hex(0.16 + 0.2 * on)}`} stroke={tone} strokeWidth={Math.max(1.5, size * 0.06)} />
      <circle cx={w * 0.5} cy={h * 0.66} r={size * 0.06} fill={tone} />
      <rect x={w * 0.475} y={h * 0.68} width={w * 0.05} height={h * 0.12} fill={tone} />
    </svg>
  );
};

/** Key glyph (SVG, no copy): bow ring + blade with two bits. */
export const KeyGlyph: React.FC<{size: number; tone: string; fx: Fx; on?: number}> = ({size, tone, fx, on = 1}) => (
  <svg width={size * 1.6} height={size} viewBox={`0 0 ${size * 1.6} ${size}`} style={{overflow: 'visible', filter: on > 0.05 ? `drop-shadow(0 0 ${(fx.glowInner * 0.6 * on).toFixed(1)}px ${tone})` : undefined}}>
    <circle cx={size * 1.22} cy={size * 0.5} r={size * 0.3} fill={`${tone}${hex(0.12 + 0.2 * on)}`} stroke={tone} strokeWidth={Math.max(2, size * 0.09)} />
    <circle cx={size * 1.22} cy={size * 0.5} r={size * 0.1} fill={C.void} stroke={tone} strokeWidth={1.5} />
    <path d={`M ${size * 0.92} ${size * 0.5} H ${size * 0.1} M ${size * 0.22} ${size * 0.5} V ${size * 0.74} M ${size * 0.42} ${size * 0.5} V ${size * 0.68}`} stroke={tone} strokeWidth={Math.max(2, size * 0.09)} strokeLinecap="round" fill="none" />
  </svg>
);
