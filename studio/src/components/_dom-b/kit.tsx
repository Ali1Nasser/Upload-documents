// Shared helpers of P7 group dom-b (Domain specials). Thin layer over the frozen tokens and the type engine:
// no colour, size or FX number lives here (tokens only); no timing is read from seconds (ctx frames only, RV1 via
// revealProgress); Arabic copy is always set by MixedText (whole words, never split).
import React, {useRef} from 'react';
import {C, FONT, SIZE, type Fx, type PresetId} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {lineHeightFor, type LatinRole} from '../../type/arabic';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {LayerCtx} from '../../spec/types';

export type Pt = {x: number; y: number};
export const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerpPt = (a: Pt, b: Pt, q: number): Pt => ({x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q)});

/** A fixed offset given in film frames (24 fps) at the composition fps (the TableGrid stagger rule). */
export const f24 = (n: number, fps: number) => Math.round((n * fps) / 24);
/** Stagger of the i-th element: `step` film frames apart. */
export const stag = (i: number, fps: number, step = 2) => f24(step * i, fps);
/** RV1 progress of a component-owned motion that starts at local frame `t0` (ink on t0 itself). */
export const prog = (ctx: LayerCtx, t0: number, preset: PresetId = 'arrive', easing: (x: number) => number = ease.arrive, long = false) =>
  revealProgress(ctx.frame - t0, presetFrames(preset, ctx.fps, long), easing);
/** RV1 progress over an explicit length in comp frames. */
export const progN = (ctx: LayerCtx, t0: number, n: number, easing: (x: number) => number = ease.camera) => revealProgress(ctx.frame - t0, n, easing);
export const morphF = (fps: number) => presetFrames('morph', fps, true);

/** Layer root: the slot box with the label-preset entrance (from the layer anchor) and the exit preset (from `until`). */
export const Stage: React.FC<{ctx: LayerCtx; children?: React.ReactNode; style?: React.CSSProperties}> = ({ctx, children, style}) => {
  const r = revealStyle(ctx.frame - ctx.at, ctx.fps, 'label', 'ltr', ctx.until !== undefined ? ctx.frame - ctx.until : undefined);
  return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...r.style, ...style}}>{children}</div>;
};

/** Absolutely placed anchor (coordinates local to the Stage); ax/ay = 0..1 alignment of the child on the point. */
export const At: React.FC<{x: number; y: number; ax?: number; ay?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, ax = 0.5, ay = 0.5, style, children}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(${-ax * 100}%, ${-ay * 100}%)`, ...style}}>{children}</div>
);

/** One label fitted to `maxW` (floor SIZE.labelMin; below it the label is outlined crit and a DC_QA overflow is logged). */
export const FitLabel: React.FC<{id: string; text: string; maxW: number; size?: number; min?: number; color?: string; weight?: number; role?: LatinRole; shadow?: string; style?: React.CSSProperties}> = (p) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = p.size ?? SIZE.label;
  const fit = useAutoFit(ref, {id: p.id, size, min: p.min ?? SIZE.labelMin, maxW: p.maxW, key: p.text});
  return (
    <div
      ref={ref}
      data-overflow={fit.overflow ? 1 : undefined}
      style={{width: 'max-content', whiteSpace: 'nowrap', fontSize: fit.size, lineHeight: lineHeightFor(p.text), color: p.color ?? C.ink, textShadow: p.shadow ?? halo, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined, ...p.style}}
    >
      <MixedText id={p.id} text={p.text} size={fit.size} weight={p.weight ?? FONT.label.weight} role={p.role} />
    </div>
  );
};

/** Emissive glow text-shadow for a label (halo + tier glow). */
export const glowText = (color: string, fx: Fx, k = 0.6) => `${halo}, ${glow(color, fx, k)}`;
/** Emissive box glow for a mark (tier radii). */
export const glowBox = (color: string, fx: Fx, k = 1) => `0 0 ${(fx.glowInner * k).toFixed(1)}px ${color}${hex(0.55)}, 0 0 ${(fx.glowPx * k).toFixed(1)}px ${color}${hex(0.22)}`;
/** Key rim light from the upper right (04 1.2, ADR-003 LK-F) on a glass / acrylic edge. */
export const rim = (a = 0.16) => `inset -1px 1px 0 ${C.ink}${hex(a)}`;

// ---------- geometry ----------
/** Cubic bezier sampled into n + 1 points. */
export const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    out.push({x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x, y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y});
  }
  return out;
};
/** Quadratic arc from a to b bowed by `bow` x length along the left normal. */
export const arc = (a: Pt, b: Pt, bow = 0.15, n = 20): Pt[] => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const c = {x: mx - dy * bow, y: my + dx * bow};
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    out.push({x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y});
  }
  return out;
};
/** The leading fraction q (0..1) of a polyline, interpolated at the cut. */
export const partial = (pts: Pt[], q: number): Pt[] => {
  if (q >= 1) return pts;
  if (q <= 0 || pts.length < 2) return pts.slice(0, 1);
  const f = q * (pts.length - 1);
  const i = Math.floor(f);
  return [...pts.slice(0, i + 1), lerpPt(pts[i], pts[Math.min(i + 1, pts.length - 1)], f - i)];
};
export const dPath = (pts: Pt[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
/** Point where the ray from the centre of a (hw x hh) rect along (dx, dy) leaves the rect. */
export const rectExit = (c: Pt, hw: number, hh: number, dx: number, dy: number): Pt => {
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const s = Math.min(Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : 1e9);
  return {x: c.x + ux * s, y: c.y + uy * s};
};

/** Emissive SVG stroke: a soft halo and an inner glow under a sharp core (no SVG filter: cheap on swiftshader). */
export const GlowLine: React.FC<{pts: Pt[]; color: string; w: number; fx: Fx; k?: number; dash?: string; dashOffset?: number; opacity?: number; arrow?: boolean}> = ({pts, color, w, fx, k = 1, dash, dashOffset, opacity = 1, arrow}) => {
  if (pts.length < 2 || opacity <= 0.001) return null;
  const d = dPath(pts);
  const a = pts[pts.length - 1];
  const b = pts[Math.max(0, pts.length - 3)];
  const ang = Math.atan2(a.y - b.y, a.x - b.x);
  const hl = w * 3.2;
  const head = arrow
    ? `M${(a.x - hl * Math.cos(ang - 0.5)).toFixed(1)} ${(a.y - hl * Math.sin(ang - 0.5)).toFixed(1)} L${a.x.toFixed(1)} ${a.y.toFixed(1)} L${(a.x - hl * Math.cos(ang + 0.5)).toFixed(1)} ${(a.y - hl * Math.sin(ang + 0.5)).toFixed(1)}`
    : null;
  const common = {fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <g opacity={opacity}>
      <path d={d} stroke={color} strokeOpacity={0.1} strokeWidth={w + fx.glowPx * 0.6 * k} {...common} strokeDasharray={dash} strokeDashoffset={dashOffset} />
      <path d={d} stroke={color} strokeOpacity={0.28} strokeWidth={w + fx.glowInner * 0.8 * k} {...common} strokeDasharray={dash} strokeDashoffset={dashOffset} />
      <path d={d} stroke={color} strokeWidth={w} {...common} strokeDasharray={dash} strokeDashoffset={dashOffset} />
      {head ? <path d={head} stroke={color} strokeWidth={w} {...common} /> : null}
    </g>
  );
};

/** Full-stage SVG overlay (local coordinates = the Stage box). */
export const Svg: React.FC<{w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({w, h, children, style}) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);

/** A small mono chip (Latin identifiers / kinds): one LTR isolate, never Arabic. */
export const Chip: React.FC<{id: string; text: string; color?: string; size?: number; fill?: string; border?: string; style?: React.CSSProperties}> = ({id, text, color = C.ink2, size = SIZE.labelMin, fill, border, style}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', padding: `${Math.round(size * 0.12)}px ${Math.round(size * 0.4)}px`, borderRadius: Math.round(size * 0.35), border: `1px solid ${border ?? `${color}${hex(0.55)}`}`, background: fill ?? `${C.void}${hex(0.55)}`, fontSize: size, lineHeight: 1.25, color, whiteSpace: 'nowrap', textShadow: halo, ...style}}>
    <MixedText id={id} text={text} size={size} role="chip" />
  </div>
);

/** Semantic status colour tokens (04 1.1: never decorative). */
export const toneOf = (s: 'idle' | 'active' | 'ok' | 'warn' | 'fail'): string => (s === 'ok' ? C.ok : s === 'warn' ? C.warn : s === 'fail' ? C.crit : s === 'active' ? C.signal : C.ink3);

// ---------- data helpers ----------
/** Ordinal rank of every value among the distinct values (0 = lowest). Used where a ruling allows order but no magnitude
 * (fact-check D1/D2): a length built from rank implies no value. */
export const ranks = (vals: number[]): {rank: number[]; levels: number} => {
  const d = [...new Set(vals)].sort((a, b) => a - b);
  return {rank: vals.map((v) => d.indexOf(v)), levels: d.length};
};
/** FNV-1a 32-bit (deterministic on every host; never locale- or engine-dependent). */
export const fnv1a = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};
/** Sorted actions of one name. */
export const actsOf = (ctx: LayerCtx, name: string) => ctx.actions.filter((a) => a.name === name).sort((a, b) => a.at - b.at || a.li - b.li);
/** Linear marching phase (04 section 2: linear motion is allowed for marching flows only), in cycles since `t0`. */
export const march = (ctx: LayerCtx, t0: number, cyclesPerSecond: number) => ((ctx.frame - t0) * cyclesPerSecond) / ctx.fps;
