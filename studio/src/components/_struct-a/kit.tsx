// Shared kit of the P7 group "struct-a" (family Structure & flow: GraphNetwork, DagRun, TreeView, PipelineStations, LayerStack,
// StarSchema3D, OlapCube). Group-owned folder (`_struct-a/`): never imported by another group, never a shared file.
//  - useMeasure: natural label widths at a nominal size, measured once after the fonts load (fitBegin/fitEnd + delayRender, so the
//    post-layout QA reads the settled layout, review M8). Diagrams lay out in nominal px and shrink as ONE unit (fitScale): the label
//    size never drops below SIZE.labelMin (28 px); below it the diagram is outlined in crit and a DC_QA overflow finding is logged.
//  - Chip: one whole label on a glass chip (MixedText: whole-word Arabic, LTR isolates, Western digits); state colour + glow.
//  - Wire: emissive SVG connector (cubic), drawn with a dash offset; arrowhead; travelling pulse dots.
//  - timing helpers (RV1: every anchored motion uses revealProgress so its first visible step is on the anchor frame).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, random} from 'remotion';
import {C, FONT, IMPACT, SIZE, type Fx} from '../../tokens';
import {MixedText} from '../../type/Text';
import {fontsReady} from '../../type/fonts';
import {fitBegin, fitEnd} from '../../type/settle';
import {reportQa} from '../../type/qa';
import {isArabic, lineHeightFor, type LatinRole} from '../../type/arabic';
import {revealStyle, type RevealDir} from '../../type/reveal';
import {glow, halo, hex} from '../../fx/look';
import type {LayerCtx, ResolvedAction} from '../../spec/types';

export type Pt = {x: number; y: number};
export type Sz = {w: number; h: number};

// ---------- colour ----------
const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Linear mix of two token colours (#RRGGBB), q in 0..1. */
export const mix = (a: string, b: string, q: number): string => {
  if (q <= 0) return a;
  if (q >= 1) return b;
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * q).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

/** Token colour at alpha a (#RRGGBBAA). */
export const alpha = (c: string, a: number): string => `${c}${hex(a)}`;

// ---------- copy helpers ----------
export const dirOf = (texts: string[]): RevealDir => (texts.some((t) => isArabic(t)) ? 'rtl' : 'ltr');
export const roleOf = (t: string): LatinRole => (isArabic(t) ? 'sentence' : 'data');

// ---------- measurement ----------
export type MItem = {text: string; size: number; weight?: number; role?: LatinRole};
/**
 * Natural (max-content) width/height of each item at its own size, measured once after the fonts are ready. Returns null until
 * measured; the frame is held (delayRender) and the settle tracker counts the pending fit, so no frame is captured unmeasured.
 */
export const useMeasure = (id: string, items: MItem[]): {w: number[] | null; h: number[] | null; node: React.ReactNode} => {
  const ref = useRef<HTMLDivElement>(null);
  const key = items.map((i) => `${i.size}:${i.weight ?? ''}:${i.role ?? ''}:${i.text}`).join('\n');
  const [m, setM] = useState<{key: string; w: number[]; h: number[]} | null>(null);
  const [handle] = useState(() => {
    if (typeof document === 'undefined') return null;
    fitBegin();
    return delayRender(`struct measure ${id}`);
  });
  const released = useRef(false);
  const release = () => {
    if (handle !== null && !released.current) {
      released.current = true;
      continueRender(handle);
      fitEnd();
    }
  };
  useLayoutEffect(() => {
    let live = true;
    fontsReady()
      .then(() => document.fonts.ready)
      .then(() => {
        const el = ref.current;
        if (!live || !el) return;
        const kids = Array.from(el.children) as HTMLElement[];
        setM({key, w: kids.map((k) => k.offsetWidth + 1), h: kids.map((k) => k.offsetHeight)});
      });
    return () => {
      live = false;
    };
  }, [key]);
  useLayoutEffect(() => {
    if (m && m.key === key) release();
  }, [m, key]);
  useLayoutEffect(() => () => release(), []);
  const node = (
    <div ref={ref} aria-hidden style={{position: 'absolute', left: 0, top: 0, visibility: 'hidden', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
      {items.map((it, i) => (
        <div key={i} style={{width: 'max-content', whiteSpace: 'nowrap', fontSize: it.size, lineHeight: lineHeightFor(it.text)}}>
          <MixedText id={`${id}:m${i}`} text={it.text} size={it.size} weight={it.weight ?? FONT.label.strong} role={it.role ?? roleOf(it.text)} />
        </div>
      ))}
    </div>
  );
  const ok = m && m.key === key;
  // once measured, the hidden probe is dropped from the tree (cheaper frames; it never carries visible copy)
  return {w: ok ? m.w : null, h: ok ? m.h : null, node: ok ? null : node};
};

/**
 * One scale for a whole diagram laid out in nominal px: s = min(maxUp, avail / natural) (maxUp > 1 lets a small diagram grow
 * towards SIZE.sub so it fills its slot). The label size is size * s, floored at `min`
 * (SIZE.labelMin = 28 px for object labels); below the floor -> overflow (DC_QA finding, crit outline, snapshot fails).
 */
export const fitScale = (id: string, natural: Sz, avail: Sz, size: number, min: number = SIZE.labelMin, maxUp = 1): {s: number; fs: number; overflow: boolean} => {
  const s = Math.min(maxUp, avail.w / Math.max(1, natural.w), avail.h / Math.max(1, natural.h));
  const fs = size * s;
  if (fs < min - 0.01) {
    reportQa('overflow', id, {natural_w: Math.round(natural.w), natural_h: Math.round(natural.h), max_w: Math.round(avail.w), max_h: Math.round(avail.h), min, size});
    return {s: min / size, fs: min, overflow: true};
  }
  return {s, fs, overflow: false};
};

// ---------- timing ----------
/** Birth frame of item i of n in a staggered entrance from ctx.at: <= 2 film frames apart, the whole set within 1 s (24 f). */
export const bornAt = (ctx: LayerCtx, i: number, n: number, span24 = 24): number => ctx.at + Math.round((i * Math.min(2, span24 / Math.max(1, n)) * ctx.fps) / 24);
/** Actions of one kind, in anchor order. */
export const acts = (ctx: LayerCtx, name: string): ResolvedAction[] => ctx.actions.filter((a) => a.name === name).sort((a, b) => a.at - b.at || a.li - b.li);
/** Exit of the whole diagram on its `until` anchor (exit preset: fade + recede); {} while not exiting. */
export const exitStyle = (ctx: LayerCtx, dir: RevealDir): React.CSSProperties => {
  if (ctx.until === undefined || ctx.frame < ctx.until) return {};
  return revealStyle(1e6, ctx.fps, 'label', dir, ctx.frame - ctx.until).style;
};
/** Failure shake (04 §3.5: the only hard motion allowed): <= IMPACT.nudgePxMax px for 3 film frames from t = 0, seeded. */
export const shake = (t: number, fps: number, seed: string): number => {
  const n = Math.max(1, Math.round((3 * fps) / 24));
  if (t < 0 || t >= n) return 0;
  return (random(`${seed}:${t}`) * 2 - 1) * IMPACT.nudgePxMax;
};

// ---------- tones ----------
export type Tone = 'idle' | 'dim' | 'signal' | 'ok' | 'warn' | 'crit' | 'violet';
export const toneColor = (t: Tone): string =>
  t === 'signal' ? C.signal : t === 'ok' ? C.ok : t === 'warn' ? C.warn : t === 'crit' ? C.crit : t === 'violet' ? C.violet : t === 'dim' ? C.ink3 : C.ink2;

// ---------- Chip ----------
export type ChipProps = {
  id: string;
  text: string;
  x: number; // centre, px inside the component root
  y: number;
  w: number;
  h: number;
  fs: number;
  color: string; // border / glow colour (token)
  glowK?: number; // 0 = no glow
  fill?: number; // tint alpha of the colour over the glass
  fx: Fx;
  reveal?: React.CSSProperties;
  overflow?: boolean;
  radius?: number;
  dashed?: boolean;
  textColor?: string;
  weight?: number;
  icon?: React.ReactNode; // leading icon (reading-start side), square of h * 0.62
  dir?: RevealDir;
  z?: number;
  mono?: boolean;
};
export const Chip: React.FC<ChipProps> = (p) => {
  const k = p.glowK ?? 0;
  const iconW = p.icon ? Math.round(p.h * 0.62) : 0;
  const rtl = (p.dir ?? (isArabic(p.text) ? 'rtl' : 'ltr')) === 'rtl';
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x - p.w / 2,
        top: p.y - p.h / 2,
        width: p.w,
        height: p.h,
        boxSizing: 'border-box',
        borderRadius: p.radius ?? Math.round(p.h * 0.28),
        background: `linear-gradient(180deg, ${C.panel}F0 0%, ${C.ground}E6 100%)`,
        border: `${p.dashed ? 1.5 : 2}px ${p.dashed ? 'dashed' : 'solid'} ${p.color}`,
        boxShadow: `inset 0 1px 0 ${C.ink}1F, inset 0 0 0 999px ${p.color}${hex(p.fill ?? 0)}, 0 ${Math.round(p.h * 0.22)}px ${Math.round(p.h * 0.5)}px ${C.void}8C${k > 0 ? `, ${glow(p.color, p.fx, k)}` : ''}`,
        display: 'flex',
        flexDirection: rtl ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: p.icon ? Math.round(p.h * 0.18) : 0,
        outline: p.overflow ? `2px dashed ${C.crit}` : undefined,
        zIndex: p.z,
        ...p.reveal,
      }}
    >
      {p.icon ? <div style={{width: iconW, height: iconW, flex: 'none'}}>{p.icon}</div> : null}
      <div style={{width: 'max-content', whiteSpace: 'nowrap', fontSize: p.fs, lineHeight: lineHeightFor(p.text), color: p.textColor ?? C.ink, textShadow: halo}}>
        <MixedText id={p.id} text={p.text} size={p.fs} weight={p.weight ?? FONT.label.strong} role={p.mono ? 'data' : roleOf(p.text)} />
      </div>
    </div>
  );
};

// ---------- geometry ----------
export type Cubic = [Pt, Pt, Pt, Pt];
export const bez = (c: Cubic, u: number): Pt => {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const d = 3 * v * u * u;
  const e = u * u * u;
  return {x: a * c[0].x + b * c[1].x + d * c[2].x + e * c[3].x, y: a * c[0].y + b * c[1].y + d * c[2].y + e * c[3].y};
};
export const bezLen = (c: Cubic): number => {
  let L = 0;
  let p = c[0];
  for (let i = 1; i <= 16; i++) {
    const q = bez(c, i / 16);
    L += Math.hypot(q.x - p.x, q.y - p.y);
    p = q;
  }
  return L;
};
export const line = (a: Pt, b: Pt): Cubic => [a, {x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3}, {x: a.x + (2 * (b.x - a.x)) / 3, y: a.y + (2 * (b.y - a.y)) / 3}, b];
/** Horizontal S connector (flow along x). */
export const hS = (a: Pt, b: Pt): Cubic => {
  const m = (b.x - a.x) * 0.5;
  return [a, {x: a.x + m, y: a.y}, {x: b.x - m, y: b.y}, b];
};
/** Vertical S connector (flow along y). */
export const vS = (a: Pt, b: Pt): Cubic => {
  const m = (b.y - a.y) * 0.5;
  return [a, {x: a.x, y: a.y + m}, {x: b.x, y: b.y - m}, b];
};
/** Point where the ray from the centre of a w x h rect (plus pad) towards `to` leaves the rect. */
export const rectExit = (c: Pt, s: Sz, to: Pt, pad = 6): Pt => {
  const dx = to.x - c.x;
  const dy = to.y - c.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return c;
  const hw = s.w / 2 + pad;
  const hh = s.h / 2 + pad;
  const t = Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity);
  return {x: c.x + dx * t, y: c.y + dy * t};
};
const cubicD = (c: Cubic) => `M${c[0].x.toFixed(1)},${c[0].y.toFixed(1)} C${c[1].x.toFixed(1)},${c[1].y.toFixed(1)} ${c[2].x.toFixed(1)},${c[2].y.toFixed(1)} ${c[3].x.toFixed(1)},${c[3].y.toFixed(1)}`;

// ---------- Wire ----------
export type WireProps = {
  c: Cubic;
  p: number; // draw progress 0..1 (from the start)
  color: string;
  width?: number;
  opacity?: number;
  arrow?: boolean;
  glowPx?: number; // emissive halo (0 = none)
  dash?: boolean;
  pulses?: number[]; // pulse positions u in 0..1 along the drawn part
  pulseR?: number;
  arrowK?: number; // arrowhead scale (default 1)
};
/** One SVG group: halo stroke, core stroke, arrowhead and pulse dots. Render inside an <svg> sized to the component root. */
export const Wire: React.FC<WireProps> = ({c, p, color, width = 2, opacity = 1, arrow, glowPx = 0, dash, pulses, pulseR = 5, arrowK = 1}) => {
  if (p <= 0) return null;
  const L = bezLen(c);
  const d = cubicD(c);
  const drawn = p >= 1 ? undefined : `${(L * p).toFixed(1)} ${(L + 10).toFixed(1)}`;
  const end = bez(c, Math.min(1, p));
  const prev = bez(c, Math.max(0, Math.min(1, p) - 0.04));
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
  const ah = (7 + width * 2.2) * arrowK;
  const tri = [0, 2.5, -2.5].map((da, i) => {
    const r = i === 0 ? 0 : ah;
    const a = ang + Math.PI + (i === 0 ? 0 : da * 0.16);
    return `${(end.x + Math.cos(a) * r).toFixed(1)},${(end.y + Math.sin(a) * r).toFixed(1)}`;
  });
  // alpha lives in each shape's stroke-/fill-opacity, never on the <g>: a group opacity < 1 becomes an offscreen compositing layer
  // that spans raster tiles, and its tile seams differ run to run (snapshot determinism, struct-a lesson L1)
  return (
    <g>
      {glowPx > 0 ? <path d={d} fill="none" stroke={color} strokeOpacity={0.28 * opacity} strokeWidth={width + glowPx} strokeLinecap="round" strokeDasharray={drawn} /> : null}
      <path d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash && p >= 1 ? '10 8' : drawn} />
      {arrow && p > 0.85 ? <polygon points={tri.join(' ')} fill={color} fillOpacity={opacity} /> : null}
      {(pulses ?? []).map((u, i) => {
        if (u < 0 || u > p) return null;
        const q = bez(c, u);
        return (
          <g key={i}>
            <circle cx={q.x} cy={q.y} r={pulseR * 2.2} fill={color} fillOpacity={0.22 * opacity} />
            <circle cx={q.x} cy={q.y} r={pulseR} fill={C.white} fillOpacity={0.95 * opacity} />
          </g>
        );
      })}
    </g>
  );
};
/** Marching pulses (linear motion is allowed for marching flows, 04 §2): `n` dots per wire, one lap every `period` frames. */
export const march = (frame: number, period: number, n = 1, phase = 0): number[] => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((((frame / period + i / n + phase) % 1) + 1) % 1);
  return out;
};

// ---------- overlap removal ----------
/**
 * Push overlapping rects apart (axis of least penetration, half each) and keep them inside `b` (x0,y0,x1,y1 = centre bounds).
 * Deterministic: fixed pair order and iteration count.
 */
export const separate = (pts: Pt[], sz: Sz[], b: {x0: number; y0: number; x1: number; y1: number}, gap: number, iters = 80): Pt[] => {
  const p = pts.map((q) => ({...q}));
  const clampP = (i: number) => {
    p[i].x = Math.min(b.x1 - sz[i].w / 2, Math.max(b.x0 + sz[i].w / 2, p[i].x));
    p[i].y = Math.min(b.y1 - sz[i].h / 2, Math.max(b.y0 + sz[i].h / 2, p[i].y));
  };
  for (let it = 0; it < iters; it++) {
    let moved = false;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++) {
        const ox = (sz[i].w + sz[j].w) / 2 + gap - Math.abs(p[i].x - p[j].x);
        const oy = (sz[i].h + sz[j].h) / 2 + gap * 0.6 - Math.abs(p[i].y - p[j].y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox * 0.6 < oy) {
          const s = (p[i].x < p[j].x || (p[i].x === p[j].x && i < j) ? -1 : 1) * (ox / 2 + 0.5);
          p[i].x += s;
          p[j].x -= s;
        } else {
          const s = (p[i].y < p[j].y || (p[i].y === p[j].y && i < j) ? -1 : 1) * (oy / 2 + 0.5);
          p[i].y += s;
          p[j].y -= s;
        }
        clampP(i);
        clampP(j);
      }
    for (let i = 0; i < p.length; i++) clampP(i);
    if (!moved) break;
  }
  return p;
};

/** Residual overlaps after layout (pairs whose rects intersect); a non-zero count is reported as a DC_QA overflow. */
export const overlaps = (pts: Pt[], sz: Sz[], gap = 0): number => {
  let n = 0;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      if ((sz[i].w + sz[j].w) / 2 + gap - Math.abs(pts[i].x - pts[j].x) > 0.5 && (sz[i].h + sz[j].h) / 2 + gap - Math.abs(pts[i].y - pts[j].y) > 0.5) n++;
  return n;
};

// ---------- status glyphs (no copy: shape + colour, so state never relies on colour alone) ----------
export type Glyph = 'dot' | 'ring' | 'check' | 'cross' | 'retry' | 'skip' | 'spin' | 'db' | 'folder' | 'file' | 'clock' | 'diamond' | 'layers' | 'table' | 'bars';
/** A 24 x 24 viewBox glyph. `spin` rotates with `turn` (0..1). */
export const GlyphIcon: React.FC<{g: Glyph; color: string; turn?: number}> = ({g, color, turn = 0}) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" style={{overflow: 'visible', display: 'block'}}>
    {g === 'dot' ? <circle cx={12} cy={12} r={5} fill={color} /> : null}
    {g === 'ring' ? <circle cx={12} cy={12} r={8} fill="none" stroke={color} strokeWidth={2.4} /> : null}
    {g === 'check' ? (
      <>
        <circle cx={12} cy={12} r={10} fill={`${color}33`} stroke={color} strokeWidth={2} />
        <path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : null}
    {g === 'cross' ? (
      <>
        <circle cx={12} cy={12} r={10} fill={`${color}33`} stroke={color} strokeWidth={2} />
        <path d="M8 8 L16 16 M16 8 L8 16" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      </>
    ) : null}
    {g === 'retry' ? (
      <g transform={`rotate(${(turn * 360).toFixed(1)} 12 12)`}>
        <path d="M19 12 A7 7 0 1 1 15.5 5.9" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M14 2.8 L17.6 6.2 L13.2 8.2 Z" fill={color} />
      </g>
    ) : null}
    {g === 'skip' ? <path d="M6 12 H18" stroke={color} strokeWidth={2.6} strokeLinecap="round" /> : null}
    {g === 'spin' ? (
      <>
        <circle cx={12} cy={12} r={8} fill="none" stroke={`${color}44`} strokeWidth={2.6} />
        <path d="M12 4 A8 8 0 0 1 20 12" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" transform={`rotate(${(turn * 360).toFixed(1)} 12 12)`} />
      </>
    ) : null}
    {g === 'db' ? (
      <>
        <ellipse cx={12} cy={6} rx={7} ry={2.6} fill="none" stroke={color} strokeWidth={2} />
        <path d="M5 6 V18 A7 2.6 0 0 0 19 18 V6" fill="none" stroke={color} strokeWidth={2} />
        <path d="M5 12 A7 2.6 0 0 0 19 12" fill="none" stroke={color} strokeWidth={1.6} />
      </>
    ) : null}
    {g === 'folder' ? <path d="M3 7 V18 H21 V9 H11 L9 7 Z" fill={`${color}2E`} stroke={color} strokeWidth={2} strokeLinejoin="round" /> : null}
    {g === 'clock' ? (
      <>
        <circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={2} />
        <path d="M12 7 V12 L15.5 14" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : null}
    {g === 'diamond' ? <path d="M12 3 L21 12 L12 21 L3 12 Z" fill={`${color}2E`} stroke={color} strokeWidth={2} strokeLinejoin="round" /> : null}
    {g === 'layers' ? (
      <>
        <path d="M12 4 L21 8.5 L12 13 L3 8.5 Z" fill={`${color}2E`} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M3 12.5 L12 17 L21 12.5 M3 16.5 L12 21 L21 16.5" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      </>
    ) : null}
    {g === 'table' ? (
      <>
        <rect x={3} y={4} width={18} height={16} rx={2} fill={`${color}1F`} stroke={color} strokeWidth={2} />
        <path d="M3 9.5 H21 M9.5 9.5 V20" stroke={color} strokeWidth={1.8} />
      </>
    ) : null}
    {g === 'bars' ? (
      <>
        <rect x={3.5} y={12} width={4.5} height={8} rx={1} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1.6} />
        <rect x={9.8} y={7} width={4.5} height={13} rx={1} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1.6} />
        <rect x={16} y={3} width={4.5} height={17} rx={1} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1.6} />
      </>
    ) : null}
    {g === 'file' ? <path d="M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19" fill={`${color}1F`} stroke={color} strokeWidth={2} strokeLinejoin="round" /> : null}
  </svg>
);
