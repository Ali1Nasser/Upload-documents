// Spotlight (catalog: Type & UI). Dims everything except a target layer of the same shot, or a named part of it
// (`to: 'layer.part'`, measured on the settled frame by ../_typeui/target.ts, so the aperture follows the camera push and parallax).
// Iris-in on the anchor (RV1: the dim is already > 0 on the anchor frame): the aperture starts 1.6x wider and tightens onto the
// target with the `arrive` ease while the surround darkens to `dim` (void, never a semantic colour).
// Light (ADR-003 LK-F, 04 §1.2): the aperture is a rim-lit cut-out. A gradient rim (key from the upper right, `signal`) is drawn over
// the dim, a soft lift of the same hue sits inside the aperture, an outer glow follows the tier's glow radius, and a faint cone of
// light falls from the upper right onto the aperture (haze tier). On landing one ping ring leaves the rim, then the rim breathes
// (frame-driven, period 3 s). `rect` = rounded rectangle, `circle` = an ellipse around the target. Exit (until / exit preset):
// the dim lifts and the rim fades. The dim is one cut-out shadow (no blur over the frame), so it is cheap at every tier; 2D only,
// so hero = standard. No copy: text = false. If the target is missing, nothing is dimmed and a DC_TARGET warning is logged.
import React from 'react';
import {interpolate} from 'remotion';
import {C, H, W} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, flashFrames, presetFrames, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {clamp, exitT} from '../_typeui/kit';
import {useTargetRect} from '../_typeui/target';
import type {Props} from './schema';

const PAD = 18; // clearance around the target (layer px) ...
const PAD_K = 0.3; // ... plus this share of the target's short side
const FEATHER = 14; // soft inner edge of the dim (layer px)
const CONE_BLUR = 18; // soft edge of the light cone (layer px)
const PING = 56; // landing ring travel (layer px)

type Hole = {x: number; y: number; w: number; h: number; r: number; circle: boolean};

/** SVG path of the aperture (rounded rect or ellipse), grown by `g` px on every side. */
export const holePath = (o: Hole, g = 0): string => {
  const x = o.x - g;
  const y = o.y - g;
  const w = o.w + 2 * g;
  const h = o.h + 2 * g;
  const f = (n: number) => n.toFixed(1);
  if (o.circle) {
    const rx = w / 2;
    const ry = h / 2;
    return `M ${f(x)} ${f(y + ry)} a ${f(rx)} ${f(ry)} 0 1 0 ${f(w)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(-w)} 0 Z`;
  }
  const r = Math.min(o.r + g, w / 2, h / 2);
  return `M ${f(x + r)} ${f(y)} H ${f(x + w - r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)} V ${f(y + h - r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)} H ${f(x + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)} V ${f(y + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)} Z`;
};

/** Convex hull (monotone chain) of a small point set, for the light cone. */
const hull = (pts: [number, number][]): [number, number][] => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: [number, number][] = [];
  for (const q of [...p].reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
};

export const SpotlightView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const ex = exitT(ctx);
  const nX = presetFrames('exit', ctx.fps, true);
  const active = t >= -1 && (ex === undefined || ex <= nX);
  const {ref, m} = useTargetRect(props.to, ctx.frame, active);
  const nA = presetFrames('arrive', ctx.fps);
  const nIris = nA * 2;
  const p = revealProgress(t, nIris, ease.arrive); // iris + dim over 2 arrive spans
  const lift = ex !== undefined && ex >= 0 ? interpolate(ex, [0, presetFrames('exit', ctx.fps)], [1, 0], {...clamp, easing: ease.camera}) : 1;
  const dim = props.dim * p * lift;
  const sig = C.signal;
  let body: React.ReactNode = null;
  if (m && dim > 0.001) {
    const r = m.rect;
    const circle = props.shape === 'circle';
    const pad = PAD + PAD_K * Math.min(r.w, r.h);
    // a circle hole circumscribes the target box (ellipse with the box aspect, x sqrt 2)
    const w0 = (circle ? r.w * Math.SQRT2 : r.w) + 2 * pad;
    const h0 = (circle ? r.h * Math.SQRT2 : r.h) + 2 * pad;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const grow = 1 + 0.6 * (1 - p);
    const hw = w0 * grow;
    const hh = h0 * grow;
    const o: Hole = {x: cx - hw / 2, y: cy - hh / 2, w: hw, h: hh, r: Math.min(24, Math.min(hw, hh) / 4), circle};
    const shade = `${C.void}${hex(dim)}`;
    const landed = ctx.at + nIris - 1;
    const ff = flashFrames(ctx.fps);
    const ping = ctx.frame >= landed ? interpolate(ctx.frame - landed, [0, ff * 5], [0, 1], {...clamp, easing: ease.camera}) : 1;
    const breathe = ctx.frame >= landed ? 0.85 + 0.15 * Math.sin((2 * Math.PI * (ctx.frame - landed)) / (ctx.fps * 3)) : 0.85;
    const k = p * lift; // light strength
    // cone of light from the upper right (the key) onto the aperture, hole carved out (evenodd) so the target is never veiled
    const apex: [number, number] = [Math.min(W * 1.04, cx + W * 0.5), -H * 0.1];
    // one hull from the apex over the aperture box; its edge is softened with a blur (below), the hole is carved out
    const cone = hull([apex, [o.x, o.y], [o.x + o.w, o.y], [o.x, o.y + o.h], [o.x + o.w, o.y + o.h]]);
    const conePath = `M ${cone.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L ')} Z ${holePath(o)}`;
    const coneA = Math.min(0.2, ctx.fx.haze * 2.4 + ctx.mod.haze * 0.5) * k * dim;
    const gid = `${ctx.id}-sp`;
    body = (
      <>
        {/* the dim: one cut-out shadow; the outer glow sits on top of it, the inside edge is feathered */}
        <div
          style={{
            position: 'absolute',
            left: o.x,
            top: o.y,
            width: o.w,
            height: o.h,
            borderRadius: circle ? '50%' : o.r,
            background: `radial-gradient(closest-side, ${sig}${hex(0.07 * k)}, ${sig}00)`,
            boxShadow: `0 0 ${ctx.fx.glowPx}px ${Math.round(ctx.fx.glowInner / 2)}px ${sig}${hex(0.22 * k * breathe + ctx.mod.glow * 0.1)}, 0 0 0 ${Math.max(W, H) * 2}px ${shade}, inset 0 0 ${FEATHER}px ${Math.round(FEATHER / 3)}px ${shade}`,
          }}
        />
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <linearGradient id={`${gid}-rim`} gradientUnits="userSpaceOnUse" x1={o.x + o.w} y1={o.y} x2={o.x} y2={o.y + o.h}>
              <stop offset="0" stopColor={sig} stopOpacity={0.98} />
              <stop offset="0.45" stopColor={sig} stopOpacity={0.34} />
              <stop offset="1" stopColor={sig} stopOpacity={0.16} />
            </linearGradient>
            <linearGradient id={`${gid}-cone`} gradientUnits="userSpaceOnUse" x1={apex[0]} y1={apex[1]} x2={cx} y2={cy}>
              <stop offset="0" stopColor={sig} stopOpacity={0} />
              <stop offset="1" stopColor={sig} stopOpacity={1} />
            </linearGradient>
          </defs>
          {coneA > 0.001 ? <path d={conePath} fillRule="evenodd" fill={`url(#${gid}-cone)`} opacity={coneA} style={{filter: `blur(${CONE_BLUR}px)`}} /> : null}
          <path d={holePath(o, 1)} fill="none" stroke={sig} strokeOpacity={0.2 * k * breathe} strokeWidth={9} />
          <path d={holePath(o, 1)} fill="none" stroke={`url(#${gid}-rim)`} strokeOpacity={k} strokeWidth={2.5} />
          {ping < 1 ? <path d={holePath(o, 4 + PING * ping)} fill="none" stroke={sig} strokeOpacity={0.55 * (1 - ping) * lift} strokeWidth={2.5} /> : null}
        </svg>
      </>
    );
  }
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {body}
    </div>
  );
};

export const Spotlight: DcComponent<Props> = {name: 'Spotlight', Component: SpotlightView, text: false, slot: 'full'};
