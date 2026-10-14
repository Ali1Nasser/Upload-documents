// PathDraw (catalog: State & FX). Draws an SVG path as an emissive stroke reveal (04 §6: routes, wires, flows).
//  - `d` is in any coordinate system: its bounding box is fitted (uniform scale) into the layer's slot box, so the slot places it
//    like every other component. Stroke width is in 1080p px (not scaled with the fit).
//  - Direction (default rtl, the Arabic reading direction): the stroke is drawn from the end that is upstream in that direction to the
//    downstream end, i.e. a path written left -> right is drawn right -> left unless `direction: "ltr"`. Closed shapes are drawn
//    counter-clockwise for rtl and clockwise for ltr; up / down on a closed shape keep the written order. The arrowhead sits at the
//    END OF THE DRAWING (the head), pointing along the stroke, so it always points where the line travels.
//  - Timing: the first visible stroke length lands on the anchor frame (RV1, revealProgress with the `arrive` curve); the draw runs
//    over the anchor word (at least one morph beat, at most three), then a quiet lit pulse travels along the finished line.
//  - Look: a faint rail shows the whole route from the anchor, the stroke is the token colour with two soft halo strokes at standard
//    and hero (box-shadow free, no filter), and a white pen-tip leads the head. Copy-free (no text), so no text-safe mask.
import React from 'react';
import {C} from '../../tokens';
import {ease, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {abs, beat, exitK} from '../_fx-a/kit';
import {pointAt, samplePath, shouldReverse} from '../_fx-a/pathkit';
import type {Props} from './schema';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const PERIOD_F24 = 60; // travelling pulse period (film frames)
const PULSE_SHARE = 0.1; // pulse length / path length

/** Draw length n (frames): the anchor word, at least one morph beat, at most three. */
export const drawLen = (fps: number, word: number): number => Math.max(beat(fps), Math.min(beat(fps) * 3, Math.round(word)));
export const drawProgress = (t: number, n: number): number => revealProgress(t, n, ease.arrive);

export const PathDrawView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const info = samplePath(props.d);
  if (t < 0 || !info) return null;
  const box = ctx.box;
  const dir = props.direction ?? 'rtl';
  const reversed = shouldReverse(info, dir);
  const n = drawLen(ctx.fps, ctx.atEnd - ctx.at);
  const p = drawProgress(t, n);
  const col = C[props.color];
  const lite = ctx.fx.id === 'lite';
  // fit the path box into the slot (margin: stroke + arrowhead room)
  const margin = props.width * 2 + (props.arrowhead ? 30 : 8);
  const bw = Math.max(info.box.x1 - info.box.x0, 1e-6);
  const bh = Math.max(info.box.y1 - info.box.y0, 1e-6);
  const aw = Math.max(1, box.w - 2 * margin);
  const ah = Math.max(1, box.h - 2 * margin);
  const flatW = bw < info.len * 0.002;
  const flatH = bh < info.len * 0.002;
  const s = flatW ? ah / bh : flatH ? aw / bw : Math.min(aw / bw, ah / bh);
  const tx = box.w / 2 - ((info.box.x0 + info.box.x1) / 2) * s;
  const ty = box.h / 2 - ((info.box.y0 + info.box.y1) / 2) * s;
  const L = info.len;
  const sw = props.width / s; // stroke width in path units
  const px = 1 / s; // one screen px in path units
  const head = pointAt(info, p * L, reversed);
  const dash = (len: number) => ({strokeDasharray: `${Math.max(0, len).toFixed(3)} ${(L * 3).toFixed(3)}`});
  const dashOff = (x0: number) => ({strokeDashoffset: (-x0).toFixed(3)});
  const drawn = dash(p * L);
  const drawnOff = dashOff(reversed ? L * (1 - p) : 0);
  const common = {fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  // travelling pulse after the draw completes
  const done = t >= n - 1;
  const ph = done ? ((((t - (n - 1)) * 24) / ctx.fps) % PERIOD_F24) / PERIOD_F24 : 0;
  const D = L * PULSE_SHARE;
  const a0 = -D + ph * (L + D);
  const pulseX0 = reversed ? L - a0 - D : a0;
  // arrowhead at the head of the drawing
  let arrow: React.ReactNode = null;
  if (props.arrowhead && p > 0.9) {
    const tip = pointAt(info, L, reversed);
    const back = pointAt(info, Math.max(0, L - Math.min(L * 0.08, 40 * px)), reversed);
    let vx = tip.p[0] - back.p[0];
    let vy = tip.p[1] - back.p[1];
    const vl = Math.hypot(vx, vy) || 1;
    vx /= vl;
    vy /= vl;
    const arm = (props.width * 3.6 + 12) * px;
    const rot = (sgn: number): [number, number] => {
      const a = (sgn * 28 * Math.PI) / 180;
      return [-(vx * Math.cos(a) - vy * Math.sin(a)) * arm, -(vx * Math.sin(a) + vy * Math.cos(a)) * arm];
    };
    const [x1, y1] = rot(1);
    const [x2, y2] = rot(-1);
    const o = clamp01((p - 0.9) / 0.1);
    arrow = (
      <g opacity={o}>
        {!lite ? <path d={`M ${tip.p[0] + x1} ${tip.p[1] + y1} L ${tip.p[0]} ${tip.p[1]} L ${tip.p[0] + x2} ${tip.p[1] + y2}`} stroke={col} strokeOpacity={0.22} strokeWidth={sw * 2.6} {...common} /> : null}
        <path d={`M ${tip.p[0] + x1} ${tip.p[1] + y1} L ${tip.p[0]} ${tip.p[1]} L ${tip.p[0] + x2} ${tip.p[1] + y2}`} stroke={col} strokeWidth={sw} {...common} />
      </g>
    );
  }
  return (
    <div style={{...abs(box), opacity: exitK(ctx), pointerEvents: 'none'}}>
      <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <g transform={`translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(6)})`}>
          <path d={props.d} stroke={C.ink3} strokeOpacity={0.14} strokeWidth={sw} {...common} />
          {!lite ? (
            <>
              <path d={props.d} stroke={col} strokeOpacity={0.1} strokeWidth={sw * 6} {...common} {...drawn} {...drawnOff} />
              <path d={props.d} stroke={col} strokeOpacity={0.24} strokeWidth={sw * 2.6} {...common} {...drawn} {...drawnOff} />
            </>
          ) : null}
          <path d={props.d} stroke={col} strokeWidth={sw} {...common} {...drawn} {...drawnOff} />
          {done ? <path d={props.d} stroke={C.white} strokeOpacity={0.85} strokeWidth={sw * 0.7} {...common} {...dash(D)} {...dashOff(pulseX0)} /> : null}
          {arrow}
          {p < 0.995 ? (
            <>
              {!lite ? <circle cx={head.p[0]} cy={head.p[1]} r={props.width * 3.2 * px} fill={col} fillOpacity={0.35} /> : null}
              <circle cx={head.p[0]} cy={head.p[1]} r={props.width * 1.5 * px} fill={C.white} fillOpacity={0.95} />
            </>
          ) : null}
        </g>
      </svg>
    </div>
  );
};

export const PathDraw: DcComponent<Props> = {name: 'PathDraw', Component: PathDrawView, slot: 'center'};
