// CalloutArrow (catalog: Type & UI). An emissive arrow from an object label to a target layer of the same shot, or to a named
// part of it (`to: 'layer.part'`, see ../_typeui/target.ts). The label sits beside the target on `side` (start = right in the RTL frame,
// end = left, top, bottom) on a small glass pill, arrives on the layer anchor with the `label` preset (RTL for Arabic), and the
// arrow then draws from the label to the target edge (PathDraw timing = `morph` preset, camera ease) and lands with a
// 2-frame glow pulse on the target point. The label is clamped into ctx.box (title-safe after the camera envelope).
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
const GAP = 110; // label clearance from the target edge (layer px)
const RISE = 0.6; // diagonal: the label sits this share of its gap above / beside the target axis
const PILL = {x: 0.55, y: 0.22}; // pill padding in em of the label size

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
  if (side === 'start') (ax = lx), (bx = t.x + t.w + 10), (by = cyT);
  else if (side === 'end') (ax = lx + lw), (bx = t.x - 10), (by = cyT);
  else if (side === 'top') (ay = ly + lh), (by = t.y - 10), (bx = cxT);
  else (ay = ly), (by = t.y + t.h + 10), (bx = cxT);
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
  const size = SIZE.label;
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
  // arrow head along the end tangent (control -> end)
  const head = (() => {
    if (!g) return '';
    const dx = g.bx - g.cx;
    const dy = g.by - g.cy;
    const L = Math.max(1e-3, Math.hypot(dx, dy));
    const ux = dx / L;
    const uy = dy / L;
    const s = 16;
    const w = 9;
    const bx = g.bx - ux * s;
    const by = g.by - uy * s;
    return `M ${g.bx.toFixed(1)} ${g.by.toFixed(1)} L ${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)} L ${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)} Z`;
  })();
  const ls = fit.size;
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0}}>
      {g && p > 0 ? (
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: fade}}>
          <path d={d} pathLength={1} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${p} 1`} />
          <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${p} 1`} />
          <circle cx={g.ax} cy={g.ay} r={4} fill={color} />
          {p >= 0.98 ? <path d={head} fill={color} /> : null}
          {pulse > 0 ? <circle cx={g.bx} cy={g.by} r={10 + 22 * (1 - pulse)} fill="none" stroke={color} strokeOpacity={0.7 * pulse} strokeWidth={2} /> : null}
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
              background: `${C.panel}${hex(0.86)}`,
              border: `1px solid ${color}${hex(0.55)}`,
              boxShadow: `0 0 ${Math.round(ctx.fx.glowInner * (1 + pulse))}px ${color}${hex(0.25 + 0.3 * pulse)}`,
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
