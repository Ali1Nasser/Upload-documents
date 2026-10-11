// Shared helpers of P7 group "struct-b" (Structure & flow: TimelineTrack, GitGraph, StackHeap, PartitionLanes,
// BlockReplication, RequestJourney, Conveyor, WorldMapA01). Group-owned file: no other group imports or edits it.
// Tokens only (no hex, no font px beyond tokens; stroke widths / paddings are layout constants). Copy always goes through the
// type engine (MixedText + useAutoFit, 28 px floor), so whole-word Arabic, BiDi isolates, Western digits and overflow
// reporting come for free. Every component-owned motion that starts on an anchor uses `prog` (RV1: ink on the anchor frame).
import React, {useRef} from 'react';
import * as THREE from 'three';
import {C, FONT, SIZE, type Fx} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor, type LatinRole} from '../../type/arabic';
import {revealProgress, revealStyle} from '../../type/reveal';
import type {LayerCtx, ResolvedAction} from '../../spec/types';

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export type Pt = {x: number; y: number};

/** Frames at the composition fps for a step authored in 24-fps film frames (stagger steps, holds). Never below 1 when n > 0. */
export const f24 = (n: number, fps: number) => (n <= 0 ? 0 : Math.max(1, Math.round((n * fps) / 24)));

/** Actions with one of `names`, in anchor order (stable on ties by spec layer index). */
export const actionsOf = (ctx: LayerCtx, ...names: string[]): ResolvedAction[] =>
  ctx.actions.filter((a) => names.includes(a.name)).sort((a, b) => a.at - b.at || a.li - b.li);

/** RV1 progress of a component-owned motion that starts on shot-local frame `at` and lasts `n` frames (> 0 on `at`). */
export const prog = (t: number, at: number, n: number, easing?: (x: number) => number) => revealProgress(t - at, n, easing);

/** Layer-level style: the label preset from the layer anchor, plus the exit preset from `until` (mirrors TableGrid). */
export const layerStyle = (ctx: LayerCtx, rtl: boolean) =>
  revealStyle(ctx.frame - ctx.at, ctx.fps, 'label', rtl ? 'rtl' : 'ltr', ctx.until !== undefined ? ctx.frame - ctx.until : undefined).style;

/** The copy direction of a component: RTL as soon as one of its strings is Arabic (first item on the right). */
export const rtlOf = (strings: (string | undefined)[]) => strings.some((s) => !!s && isArabic(s));

/** Semantic status colours (04 §1.1: semantic colours are never decorative). */
export const STATUS_COLOR = {idle: C.ink3, active: C.signal, ok: C.ok, warn: C.warn, fail: C.crit} as const;

/** One positioned label on a plate or halo. The whole string is one element (never split); auto-fit to `maxW`, floor 28 px
 * (or `min`); a label that cannot fit at its floor is outlined in `crit` and reported (DC_QA overflow) by useAutoFit. */
export const Lbl: React.FC<{
  id: string;
  text: string;
  x: number;
  y: number;
  maxW: number;
  size?: number;
  min?: number;
  align?: 'center' | 'left' | 'right';
  valign?: 'center' | 'top' | 'bottom';
  color?: string;
  weight?: number;
  role?: LatinRole;
  opacity?: number;
  plate?: boolean;
  accent?: string;
  fx?: Fx;
  style?: React.CSSProperties;
}> = ({id, text, x, y, maxW, size = SIZE.label, min = SIZE.labelMin, align = 'center', valign = 'center', color = C.ink, weight, role, opacity = 1, plate, accent, fx, style}) => {
  const ref = useRef<HTMLDivElement>(null);
  const fit = useAutoFit(ref, {id, size, min, maxW, key: text});
  const ar = isArabic(text);
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0%';
  const ty = valign === 'center' ? '-50%' : valign === 'bottom' ? '-100%' : '0%';
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${tx}, ${ty})`, opacity, visibility: opacity < 0.004 ? 'hidden' : undefined, pointerEvents: 'none', ...style}}>
      <div
        ref={ref}
        dir={ar ? 'rtl' : 'ltr'}
        data-overflow={fit.overflow ? 1 : undefined}
        style={{
          width: 'max-content',
          whiteSpace: 'nowrap',
          fontSize: fit.size,
          lineHeight: ar ? lineHeightFor(text) : 1.25,
          color,
          textShadow: halo,
          padding: plate ? `${Math.round(fit.size * 0.14)}px ${Math.round(fit.size * 0.5)}px` : undefined,
          borderRadius: plate ? 999 : undefined,
          background: plate ? `${C.ground}${hex(0.86)}` : undefined,
          border: plate ? `1.5px solid ${accent ?? C.grid}` : undefined,
          boxShadow: plate && accent && fx ? `0 0 ${(fx.glowInner * 1.2).toFixed(1)}px ${accent}${hex(0.45)}` : undefined,
          outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
        }}
      >
        <MixedText id={id} text={text} size={fit.size} role={role ?? (ar ? 'sentence' : 'code')} weight={weight ?? (ar ? FONT.label.strong : FONT.mono.weight)} />
      </div>
    </div>
  );
};

/** Cheap emissive line: two wide low-alpha strokes under a sharp one (no per-frame CSS blur on large boxes; ADR-002 perf). */
export const GlowPath: React.FC<{d: string; color: string; width: number; fx: Fx; k?: number; opacity?: number; dash?: string; dashOffset?: number; cap?: 'round' | 'butt'; len?: number; draw?: number}> = ({
  d,
  color,
  width,
  fx,
  k = 1,
  opacity = 1,
  dash,
  dashOffset,
  cap = 'round',
  len,
  draw,
}) => {
  // draw-on: pathLength-normalised dash (len = 1) so no DOM measurement is needed
  const dd = draw !== undefined ? {pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - clamp01(draw)} : {strokeDasharray: dash, strokeDashoffset: dashOffset};
  if (draw !== undefined && draw <= 0) return null;
  void len;
  return (
    <g opacity={opacity}>
      {k > 0 ? <path d={d} fill="none" stroke={color} strokeOpacity={0.14 * Math.min(1.6, k)} strokeWidth={width + fx.glowInner * 1.6 * k} strokeLinecap={cap} {...dd} /> : null}
      {k > 0 ? <path d={d} fill="none" stroke={color} strokeOpacity={0.26 * Math.min(1.6, k)} strokeWidth={width + fx.glowInner * 0.6 * k} strokeLinecap={cap} {...dd} /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap={cap} {...dd} />
    </g>
  );
};

/** Soft radial light pool (key / rim light per ADR-003 LK-F: the subject is the brightest thing on screen). */
export const Pool: React.FC<{x: number; y: number; r: number; color: string; a: number; squash?: number}> = ({x, y, r, color, a, squash = 0.5}) =>
  a <= 0.003 ? null : (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r * squash,
        width: r * 2,
        height: r * 2 * squash,
        borderRadius: '50%',
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${color}${hex(a)} 0%, transparent 72%)`,
        pointerEvents: 'none',
      }}
    />
  );

/** Emissive dot (station / node / commit) with a tier-scaled halo ring; no CSS filter. */
export const Dot: React.FC<{x: number; y: number; r: number; color: string; fill?: string; fx: Fx; k?: number; ring?: number}> = ({x, y, r, color, fill, fx, k = 1, ring = 2.5}) => (
  <g>
    {k > 0 ? <circle cx={x} cy={y} r={r + fx.glowInner * 1.1 * k} fill={color} fillOpacity={0.1 * Math.min(1.5, k)} /> : null}
    {k > 0 ? <circle cx={x} cy={y} r={r + fx.glowInner * 0.45 * k} fill={color} fillOpacity={0.18 * Math.min(1.5, k)} /> : null}
    <circle cx={x} cy={y} r={r} fill={fill ?? C.ground} stroke={color} strokeWidth={ring} />
  </g>
);

/** Glass card (04 §1.2 materials): panel gradient, grid edge, an acrylic top highlight; `accent` = rim light colour. */
export const cardStyle = (accent?: string, a = 0.9): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${C.panel}${hex(a)} 0%, ${C.ground}${hex(a * 0.92)} 100%)`,
  border: `1.5px solid ${accent ?? C.grid}`,
  borderRadius: 14,
  boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.1)}, 0 18px 40px ${C.void}${hex(0.5)}${accent ? `, 0 0 18px ${accent}${hex(0.22)}` : ''}`,
});

/** Path helpers. */
const f1 = (v: number) => v.toFixed(1);
export const qPath = (a: Pt, c: Pt, b: Pt) => `M ${f1(a.x)} ${f1(a.y)} Q ${f1(c.x)} ${f1(c.y)} ${f1(b.x)} ${f1(b.y)}`;
export const cPath = (a: Pt, c1: Pt, c2: Pt, b: Pt) => `M ${f1(a.x)} ${f1(a.y)} C ${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(b.x)} ${f1(b.y)}`;
export const lPath = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${f1(p.x)} ${f1(p.y)}`).join(' ');
export const qAt = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
export const cAt = (a: Pt, c1: Pt, c2: Pt, b: Pt, t: number): Pt => {
  const u = 1 - t;
  return {x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y};
};
/** Horizontal S-curve between two points (edges between lanes / stack -> heap references). */
export const sCurve = (a: Pt, b: Pt, k = 0.5): [Pt, Pt, Pt, Pt] => {
  const dx = (b.x - a.x) * k;
  return [a, {x: a.x + dx, y: a.y}, {x: b.x - dx, y: b.y}, b];
};
/** Arrow head (filled triangle) at `p` pointing along `dir` (unit-free vector). */
export const arrowHead = (p: Pt, dir: Pt, s: number) => {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / l;
  const uy = dir.y / l;
  const a = {x: p.x - ux * s * 1.6 - uy * s, y: p.y - uy * s * 1.6 + ux * s};
  const b = {x: p.x - ux * s * 1.6 + uy * s, y: p.y - uy * s * 1.6 - ux * s};
  return `M ${f1(p.x)} ${f1(p.y)} L ${f1(a.x)} ${f1(a.y)} L ${f1(b.x)} ${f1(b.y)} Z`;
};

/** Deterministic shake offset (failure beats; 04 FailureGlitch grammar): decays over `n` frames, amplitude `amp` px. */
export const shake = (t: number, at: number, n: number, amp: number) => {
  const u = t - at;
  if (u < 0 || u >= n) return 0;
  const k = 1 - u / n;
  return Math.sin(u * 2.6) * amp * k;
};

// ---------- 2.5D projection (true 3D geometry into SVG, standard tier, no WebGL; look-dev r3 Holo-City method) ----------
export type Cam3 = {pos: [number, number, number]; target: [number, number, number]; fov?: number};
export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const makeCam = (cam: Cam3, w: number, h: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov ?? 42, w / h, 0.1, 200);
  c.position.set(...cam.pos);
  c.lookAt(V3(...cam.target));
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
};
export const proj = (c: THREE.PerspectiveCamera, v: THREE.Vector3, w: number, h: number) => {
  const p = v.clone().project(c);
  return {x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, d: c.position.distanceTo(v), ok: p.z < 1 && p.z > -1};
};

/** Glow text-shadow for Latin / numeral tags (never Arabic CA; plain glow is fine on any script). */
export const tagGlow = (color: string, fx: Fx, k = 0.35) => `${halo}, ${glow(color, fx, k)}`;
