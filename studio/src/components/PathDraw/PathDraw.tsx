// PathDraw (catalog: State & FX). Draws an SVG path as a lit route: a hollow conduit that fills with emissive light (04 §6: routes,
// wires, flows; "a path is a lit route"; LK-F depth + light, ADR-003).
//  - `d` is in any coordinate system: its bounding box is fitted (uniform scale) into the layer's slot box, so the slot places it
//    like every other component. Stroke width is in 1080p px (not scaled with the fit).
//  - Direction (default rtl, the Arabic reading direction): the stroke is drawn from the end that is upstream in that direction to the
//    downstream end, i.e. a path written left -> right is drawn right -> left unless `direction: "ltr"`. Closed shapes are drawn
//    counter-clockwise for rtl and clockwise for ltr; up / down on a closed shape keep the written order. The arrowhead sits at the
//    END OF THE DRAWING (the head), pointing along the stroke, so it always points where the line travels.
//  - Timing: the first visible stroke length lands on the anchor frame (RV1, revealProgress with the `arrive` curve); the draw runs
//    over the anchor word (at least one morph beat, at most three), then a comet travels the finished route.
//  - Look: source node + hollow conduit (void core, ink3 rim) from the anchor; the stroke is the token colour with a white specular
//    core and two soft halo strokes (standard / hero; no filter, no blur); the pen tip leads with a few seeded sparks (standard / hero,
//    count from the tier particle cap); the arrival lights the end node (a filled head with the arrowhead) with one pulse ring.
//    Copy-free (no text), so no text-safe mask.
import React from 'react';
import {C} from '../../tokens';
import {ease, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {abs, beat, exitK, rnd} from '../_fx-a/kit';
import {pointAt, samplePath, shouldReverse} from '../_fx-a/pathkit';
import type {Props} from './schema';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const PERIOD_F24 = 66; // travelling comet period (film frames)
const COMET_SHARE = 0.12; // comet length / path length
const SPARK_DIV = 100; // sparks = tier particle cap / SPARK_DIV (standard / hero 15, lite 0)
const SPARK_LIFE = 0.55; // spark life as a share of the beat

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
  const margin = props.width * 2 + 18 + (props.arrowhead ? 30 : 8);
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
  const px = 1 / s; // one screen px in path units
  const sw = props.width * px; // stroke width in path units
  const head = pointAt(info, p * L, reversed);
  const start = pointAt(info, 0, reversed);
  const end = pointAt(info, L, reversed);
  const dash = (len: number) => ({strokeDasharray: `${Math.max(0, len).toFixed(3)} ${(L * 3).toFixed(3)}`});
  const dashOff = (x0: number) => ({strokeDashoffset: (-x0).toFixed(3)});
  const common = {fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const done = t >= n - 1;
  const arrived = Math.max(0, t - (n - 1)); // frames since the head reached the end

  // arrowhead (filled, glowing) at the head of the drawing; the stroke is trimmed under it so the cap never pokes out
  const ao = props.arrowhead ? clamp01(p / 0.06) : 0; // rides the pen tip from the first stroke
  const ah_ = (props.width * 3.6 + 22) * px; // arrow length
  const trim = ao * ah_ * 0.7;
  const drawnLen = Math.max(0, p * L - trim);
  const dStart = reversed ? L - drawnLen : 0; // dash offset start along the written path
  const drawn = dash(drawnLen);
  const drawnOff = dashOff(dStart);
  let arrow: React.ReactNode = null;
  if (ao > 0.001) {
    const [vx, vy] = head.tan;
    const nx = -vy;
    const ny = vx;
    const len = ah_;
    const hw = len * 0.5;
    const bx = head.p[0] - vx * len;
    const by = head.p[1] - vy * len;
    const tri = `M ${head.p[0]} ${head.p[1]} L ${bx + nx * hw} ${by + ny * hw} L ${bx - nx * hw * 0.0 - vx * len * 0.18} ${by - vy * len * 0.18} L ${bx - nx * hw} ${by - ny * hw} Z`;
    arrow = (
      <g opacity={ao}>
        {!lite ? <path d={tri} fill={col} fillOpacity={0.3} stroke={col} strokeOpacity={0.22} strokeWidth={sw * 3} strokeLinejoin="round" /> : null}
        <path d={tri} fill={col} stroke={col} strokeWidth={sw * 0.6} strokeLinejoin="round" />
        <path d={tri} fill="none" stroke={C.white} strokeOpacity={0.5} strokeWidth={sw * 0.3} strokeLinejoin="round" />
      </g>
    );
  }

  // comet: white-hot head with a fading tail (4 stacked dashes), travelling the finished route
  let comet: React.ReactNode = null;
  if (done) {
    const ph = ((((t - (n - 1)) * 24) / ctx.fps) % PERIOD_F24) / PERIOD_F24;
    const D = L * COMET_SHARE;
    const lead = -0.1 * L + ph * (L * 1.2); // head position along the drawing direction
    const seg = (back: number, op: number, w: number, k: number) => {
      const a0 = lead - back; // segment start (drawing direction)
      return <path key={k} d={props.d} stroke={C.white} strokeOpacity={op} strokeWidth={sw * w} {...common} {...dash(back)} {...dashOff(reversed ? L - lead : a0)} />;
    };
    comet = (
      <g>
        {seg(D, 0.1, 1.0, 0)}
        {seg(D * 0.7, 0.2, 0.8, 1)}
        {seg(D * 0.4, 0.4, 0.6, 2)}
        {seg(D * 0.15, 0.85, 0.45, 3)}
      </g>
    );
  }

  // sparks at the pen tip (standard / hero): seeded, born along the drawing, drift off the normal and fade
  const sparks: React.ReactNode[] = [];
  const nSpark = Math.floor(ctx.fx.particles / SPARK_DIV);
  if (!lite && p > 0 && p < 0.999) {
    const life = Math.max(2, beat(ctx.fps) * SPARK_LIFE);
    for (let i = 0; i < nSpark; i++) {
      const b = ((i + rnd('pd-b', props.d.length, i)) / nSpark) * (n - 1);
      const age = t - b;
      if (age < 0 || age > life) continue;
      const u = age / life;
      const bp = pointAt(info, drawProgress(b, n) * L, reversed);
      const a = rnd('pd-a', props.d.length, i) * Math.PI * 2;
      const sp = (14 + rnd('pd-s', props.d.length, i) * 26) * px;
      const x = bp.p[0] + Math.cos(a) * sp * u + bp.tan[0] * sp * 0.6 * u;
      const y = bp.p[1] + Math.sin(a) * sp * u + bp.tan[1] * sp * 0.6 * u;
      sparks.push(<circle key={i} cx={x} cy={y} r={(1.2 + rnd('pd-r', i) * 1.2) * px * (1 - 0.5 * u)} fill={rnd('pd-w', i) > 0.5 ? C.white : col} fillOpacity={0.9 * (1 - u) * (1 - u)} />);
    }
  }

  // nodes: source ring from the anchor, arrival ring lit when the head lands (no end node with an arrowhead: the head is the end)
  const r0 = props.width * 2.4 * px;
  const node = (pt: [number, number], lit: number, key: string) => (
    <g key={key}>
      <circle cx={pt[0]} cy={pt[1]} r={r0} fill={C.void} stroke={col} strokeOpacity={0.35 + 0.6 * lit} strokeWidth={sw * 0.8} />
      <circle cx={pt[0]} cy={pt[1]} r={r0 * 0.45} fill={col} fillOpacity={0.45 + 0.55 * lit} />
      {!lite && lit > 0 ? <circle cx={pt[0]} cy={pt[1]} r={r0 * 1.9} fill={col} fillOpacity={0.18 * lit} /> : null}
    </g>
  );
  const nodeIn = revealProgress(t, beat(ctx.fps) * 0.5, ease.arrive);
  const endLit = done ? clamp01(1 - Math.max(0, arrived - 12 * (ctx.fps / 24)) / (12 * (ctx.fps / 24))) * 0.5 + 0.5 : 0;
  const ringU = done && !props.arrowhead ? clamp01(arrived / beat(ctx.fps)) : 1;
  return (
    <div style={{...abs(box), opacity: exitK(ctx), pointerEvents: 'none'}}>
      <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <g transform={`translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(6)})`}>
          {/* hollow conduit: rim, then a dark core */}
          <path d={props.d} stroke={C.ink3} strokeOpacity={0.42 * nodeIn} strokeWidth={sw * 2.8} {...common} />
          <path d={props.d} stroke={C.void} strokeOpacity={0.92 * nodeIn} strokeWidth={sw * 1.9} {...common} />
          {!lite ? (
            <>
              <path d={props.d} stroke={col} strokeOpacity={0.09} strokeWidth={sw * 7} {...common} {...drawn} {...drawnOff} />
              <path d={props.d} stroke={col} strokeOpacity={0.22} strokeWidth={sw * 3} {...common} {...drawn} {...drawnOff} />
            </>
          ) : null}
          <path d={props.d} stroke={col} strokeWidth={sw * 1.5} {...common} {...drawn} {...drawnOff} />
          <path d={props.d} stroke={C.white} strokeOpacity={0.55} strokeWidth={sw * 0.5} {...common} {...drawn} {...drawnOff} />
          {comet}
          {node(start.p, nodeIn, 'src')}
          {!props.arrowhead && p > 0.98 ? node(end.p, endLit, 'dst') : null}
          {!props.arrowhead && done && !lite && ringU < 1 ? <circle cx={end.p[0]} cy={end.p[1]} r={r0 * (1.4 + 3.2 * ringU)} fill="none" stroke={col} strokeOpacity={0.7 * (1 - ringU)} strokeWidth={sw * 0.8} /> : null}
          {arrow}
          {sparks}
          {p < 0.995 && !props.arrowhead ? (
            <>
              {!lite ? <circle cx={head.p[0]} cy={head.p[1]} r={props.width * 3.4 * px} fill={col} fillOpacity={0.35} /> : null}
              <circle cx={head.p[0]} cy={head.p[1]} r={props.width * 1.5 * px} fill={C.white} fillOpacity={0.95} />
            </>
          ) : null}
        </g>
      </svg>
    </div>
  );
};

export const PathDraw: DcComponent<Props> = {name: 'PathDraw', Component: PathDrawView, slot: 'center'};
