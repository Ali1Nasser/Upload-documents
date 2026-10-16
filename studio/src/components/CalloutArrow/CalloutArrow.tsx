// CalloutArrow (catalog: Type & UI). An emissive arrow from an object label to a target layer of the same shot, or to a named
// part of it (`to: 'layer.part'`, see ../_typeui/target.ts). The label sits beside the target on `side` (start = right in the RTL frame,
// end = left, top, bottom) on a small glass pill, arrives on the layer anchor with the `label` preset (RTL for Arabic), and the
// arrow then draws from the label to the target edge (PathDraw timing = `morph` preset, camera ease) and lands with a
// 2-frame glow pulse on the target point. The label is clamped into ctx.box (title-safe after the camera envelope).
// Light (ADR-003 LK-F, 04 §1.2): the label is a glass pill with a rim-lit gradient border (key from the upper right), a soft drop
// shadow and an emissive pool; the target is marked by four corner brackets that close in on it as the label lands, the arrow is a
// gradient ribbon (faint at the label, full at the tip) with a comet at its drawing head, a notched head and an impact ring on
// landing; once landed the brackets breathe slowly (frame-driven). 2D only, so hero = standard.
// Text-safe: the label carries its own glass plate (04 §3.4), so the slot-wide haze / bokeh mask is not used (textRect is
// off-frame; see docs/p7/catalog_status/typeui.md). Arabic is never split: the label is one MixedText run.
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, H, SIZE, W} from '../../tokens';
import {halo, hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor} from '../../type/arabic';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Mx, filmF} from '../_typeui/kit';
import {useTargetRect} from '../_typeui/target';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const GAP = 130; // label clearance from the target edge (layer px)
const BRACKET = 12; // bracket clearance around the target (layer px)
const ARM = 26; // bracket arm length (layer px, capped by the target size)
const TIP = BRACKET + 8; // the arrow tip stops this far outside the target edge
const RISE = 0.6; // diagonal: the label sits this share of its gap above / beside the target axis
const PILL = {x: 0.6, y: 0.24}; // pill padding in em of the label size

type Geo = {lx: number; ly: number; ax: number; ay: number; bx: number; by: number; cx: number; cy: number};
/** Label top-left (lx, ly) and the arrow from the label edge (a) via control (c) to the target edge (b). */
export const geometry = (side: Props['side'], t: Rect, lw: number, lh: number, box: Rect): Geo => {
  const cxT = t.x + t.w / 2;
  const cyT = t.y + t.h / 2;
  let lx: number;
  let ly: number;
  if (side === 'start' || side === 'end') {
    lx = side === 'start' ? t.x + t.w + GAP : t.x - GAP - lw;
    ly = cyT - lh / 2 - GAP * RISE;
  } else {
    lx = cxT - lw / 2 + (side === 'top' ? 1 : -1) * GAP * RISE;
    ly = side === 'top' ? t.y - GAP - lh : t.y + t.h + GAP;
  }
  lx = Math.min(Math.max(lx, box.x), box.x + box.w - lw);
  ly = Math.min(Math.max(ly, box.y), box.y + box.h - lh);
  const lcx = lx + lw / 2;
  const lcy = ly + lh / 2;
  // start on the label edge that faces the target, end just outside the target edge
  let ax = lcx;
  let ay = lcy;
  let bx = cxT;
  let by = cyT;
  if (side === 'start') (ax = lx), (bx = t.x + t.w + TIP), (by = cyT);
  else if (side === 'end') (ax = lx + lw), (bx = t.x - TIP), (by = cyT);
  else if (side === 'top') (ay = ly + lh), (by = t.y - TIP), (bx = cxT);
  else (ay = ly), (by = t.y + t.h + TIP), (bx = cxT);
  const horiz = side === 'start' || side === 'end';
  const cx = horiz ? bx + (ax - bx) * 0.5 : ax;
  const cy = horiz ? ay : by + (ay - by) * 0.5;
  return {lx, ly, ax, ay, bx, by, cx, cy};
};

export const CalloutArrowView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const labelRef = useRef<HTMLDivElement>(null);
  const t = ctx.frame;
  const exitT = ctx.until !== undefined ? t - ctx.until : undefined;
  const exitN = presetFrames('exit', ctx.fps, true);
  const active = t >= ctx.at - 1 && (exitT === undefined || exitT <= exitN);
  const color = C[props.color];
  const size = SIZE.body;
  const fit = useAutoFit(labelRef, {id: `${ctx.id}:label`, size, min: SIZE.labelMin, maxW: ctx.box.w * 0.45, key: props.label ?? ''});
  const {ref, m, e} = useTargetRect(props.to, t, active, () => {
    const el = labelRef.current;
    return {lw: el ? el.offsetWidth : 0, lh: el ? el.offsetHeight : 0};
  });
  const ar = !!props.label && isArabic(props.label);
  const lr = revealStyle(t - ctx.at, ctx.fps, 'label', ar ? 'rtl' : 'ltr', exitT);
  // the arrow starts 2 film frames after the label (label leads, 04 §4); with no label it starts ON the anchor (RV1 ink on the anchor frame)
  const drawAt = props.label ? ctx.at + filmF(2, ctx.fps) : ctx.at;
  const nDraw = presetFrames('morph', ctx.fps);
  const p = revealProgress(t - drawAt, nDraw, ease.camera);
  const landed = drawAt + nDraw - 1;
  const ff = flashFrames(ctx.fps);
  const pulse = t >= landed ? interpolate(t - landed, [0, ff, ff * 4], [1, 1, 0], clamp) : 0;
  const op = typeof lr.style.opacity === 'number' ? lr.style.opacity : 1;
  const fade = exitT !== undefined && exitT >= 0 ? interpolate(exitT, [0, presetFrames('exit', ctx.fps)], [1, 0], {...clamp, easing: ease.camera}) : 1;
  const g = m && e ? geometry(props.side, m.rect, props.label ? e.lw : 0, props.label ? e.lh : 0, ctx.box) : null;
  const d = g ? `M ${g.ax.toFixed(1)} ${g.ay.toFixed(1)} Q ${g.cx.toFixed(1)} ${g.cy.toFixed(1)} ${g.bx.toFixed(1)} ${g.by.toFixed(1)}` : '';
  // arrow head along the end tangent (control -> end): a notched barb, not a plain triangle
  const head = (() => {
    if (!g) return '';
    const dx = g.bx - g.cx;
    const dy = g.by - g.cy;
    const L = Math.max(1e-3, Math.hypot(dx, dy));
    const ux = dx / L;
    const uy = dy / L;
    const s = 28;
    const w = 14;
    const n = 9; // notch depth
    const bx = g.bx - ux * s;
    const by = g.by - uy * s;
    const nx = g.bx - ux * (s - n);
    const ny = g.by - uy * (s - n);
    const f = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    return `M ${f(g.bx, g.by)} L ${f(bx - uy * w, by + ux * w)} L ${f(nx, ny)} L ${f(bx + uy * w, by - ux * w)} Z`;
  })();
  // comet at the drawing head (quadratic Bezier point at the draw progress)
  const comet = g && p > 0 && p < 1 ? {x: (1 - p) * (1 - p) * g.ax + 2 * (1 - p) * p * g.cx + p * p * g.bx, y: (1 - p) * (1 - p) * g.ay + 2 * (1 - p) * p * g.cy + p * p * g.by} : null;
  // target brackets: they close in from BRACKET + 18 px on the label's anchor frame and then breathe (period 3 s) once landed
  const markP = revealProgress(t - ctx.at, presetFrames('arrive', ctx.fps)) * fade;
  const breathe = t >= landed ? 0.82 + 0.18 * Math.sin((2 * Math.PI * (t - landed)) / (ctx.fps * 3)) : 0.82;
  const br = (() => {
    if (!m) return '';
    const r = m.rect;
    const pad = BRACKET + 18 * (1 - markP);
    const x0 = r.x - pad;
    const y0 = r.y - pad;
    const x1 = r.x + r.w + pad;
    const y1 = r.y + r.h + pad;
    const a = Math.min(ARM, (x1 - x0) / 3, (y1 - y0) / 3);
    const f = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    return [
      `M ${f(x0, y0 + a)} L ${f(x0, y0)} L ${f(x0 + a, y0)}`,
      `M ${f(x1 - a, y0)} L ${f(x1, y0)} L ${f(x1, y0 + a)}`,
      `M ${f(x1, y1 - a)} L ${f(x1, y1)} L ${f(x1 - a, y1)}`,
      `M ${f(x0 + a, y1)} L ${f(x0, y1)} L ${f(x0, y1 - a)}`,
    ].join(' ');
  })();
  const ls = fit.size;
  const gradId = `${ctx.id}-ca-grad`;
  const rim = `linear-gradient(to bottom left, ${color}${hex(0.95)} 0%, ${color}${hex(0.32)} 40%, ${color}${hex(0.16)} 100%)`;
  const stock = `linear-gradient(180deg, ${C.panel}${hex(0.92)}, ${C.ground}${hex(0.88)})`;
  const kLight = 0.5 + 0.5 * markP + ctx.mod.glow;
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0}}>
      {g ? (
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: fade}}>
          <defs>
            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={g.ax} y1={g.ay} x2={g.bx} y2={g.by}>
              <stop offset="0" stopColor={color} stopOpacity={0.35} />
              <stop offset="1" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          {markP > 0 ? (
            <>
              <path d={br} fill="none" stroke={color} strokeOpacity={0.16 * markP} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
              <path d={br} fill="none" stroke={color} strokeOpacity={breathe * markP} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : null}
          {p > 0 ? (
            <>
              <path d={d} pathLength={1} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${p} 1`} />
              <path d={d} pathLength={1} fill="none" stroke={`url(#${gradId})`} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${p} 1`} />
              <circle cx={g.ax} cy={g.ay} r={9} fill="none" stroke={color} strokeOpacity={0.5} strokeWidth={2} />
              <circle cx={g.ax} cy={g.ay} r={5} fill={color} />
              {comet ? <circle cx={comet.x} cy={comet.y} r={7} fill={C.ink} style={{filter: `drop-shadow(0 0 ${ctx.fx.glowInner}px ${color})`}} /> : null}
              {p >= 0.98 ? <path d={head} fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" style={{filter: `drop-shadow(0 0 ${Math.round(ctx.fx.glowInner * (0.6 + pulse))}px ${color})`}} /> : null}
              {pulse > 0 ? <circle cx={g.bx} cy={g.by} r={14 + 34 * (1 - pulse)} fill="none" stroke={color} strokeOpacity={0.7 * pulse} strokeWidth={3} /> : null}
            </>
          ) : null}
        </svg>
      ) : null}
      {props.label ? (
        <div
          style={{
            position: 'absolute',
            left: g ? g.lx : ctx.box.x,
            top: g ? g.ly : ctx.box.y,
            visibility: g ? undefined : 'hidden',
            ...lr.style,
            opacity: g ? op : 0,
          }}
        >
          <div
            ref={labelRef}
            data-dc-part="label"
            data-overflow={fit.overflow ? 1 : undefined}
            style={{
              width: 'max-content',
              whiteSpace: 'nowrap',
              fontSize: ls,
              lineHeight: lineHeightFor(props.label),
              padding: `${(PILL.y * ls).toFixed(1)}px ${(PILL.x * ls).toFixed(1)}px`,
              borderRadius: ls,
              background: `${stock} padding-box, ${rim} border-box`,
              border: '1.5px solid transparent',
              boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.1)}, 0 0 ${Math.round(ctx.fx.glowInner * 1.6 * kLight * (1 + pulse))}px ${color}${hex(0.26 + 0.3 * pulse)}, 0 ${Math.round(ls * 0.3)}px ${Math.round(ls * 0.7)}px ${C.void}${hex(0.55)}`,
              color: C.ink,
              textShadow: halo,
              outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
            }}
          >
            <Mx id={`${ctx.id}:label`} text={props.label} size={ls} weight={FONT.label.strong} role={ar ? 'sentence' : 'chip'} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** Off-frame on purpose: the label sits on its own glass pill, so the haze / bokeh mask would only punch a slot-sized hole. */
const textRect = (): Rect => ({x: -4000, y: -4000, w: 1, h: 1});

export const CalloutArrow: DcComponent<Props> = {name: 'CalloutArrow', Component: CalloutArrowView, text: true, slot: 'full', textRect};
