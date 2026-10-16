// Conveyor (catalog: Structure & flow). Items on a conveyor passing stations (04 §6 "What a computer does": the bus = a conveyor;
// "Generators": a conveyor yielding items; "Mobile Money": receipts passing the pipeline stations).
//  - RTL when any copy is Arabic: items enter on the right and travel right -> left (reading order).
//  - Layer anchor: the belt draws on from the entry side, the station gates rise (label preset), the items ride in. Belt speed
//    (slow / normal / fast = 0.6 / 1.0 / 1.8 item pitches per second) is a film-time rate, so it does not change with the fps.
//  - Depth and light (ADR-003 LK-F): oblique 2.5D (no WebGL, so hero = standard): a belt top surface with moving roller ticks on a steel
//    side plate and legs, crates with a lit top and a shaded side, scanner gates (posts, beam, light curtain) the crates thread through,
//    a perspective floor, a signal pool under the line (crit at a jam) drawn inside the SVG (gradient divs made lite tiles non-deterministic).
//  - Stations are scanner gates over the belt with their label on a plate. An item that crosses a gate flashes it; after the last gate
//    (or at once without stations) the item takes its status colour (semantic: idle neutral, active signal, ok, warn, fail) and
//    a status mark (check / cross / triangle) so it never relies on colour alone.
//  - stop: the belt decelerates to a halt (lamp turns warn on the anchor). resume: it speeds up again (lamp ok; a jam is cleared).
//    jam(index): that item locks where it is (crit, tilted, shaking, lamp crit) while the belt keeps running underneath; the items
//    behind close up against it into a queue (the gap shrinks to 0.35 of the pitch).
//  - Pure kinematics in 24-fps film units, stepped one composition frame at a time from the layer anchor: deterministic.
import React from 'react';
import {C, SIZE} from '../../tokens';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, STATUS_COLOR, actionsOf, f24, layerStyle, prog, rtlOf, shake} from '../_struct-b/kit';

type Ctx = DcProps<Props>['ctx'];
const SPEED = {slow: 0.6, normal: 1.0, fast: 1.8} as const; // item pitches per second of film time
const GAP = 1.35; // spacing of items at rest, in pitches
const MIN_GAP = 1.0; // closest an item gets to the one ahead when the line backs up (the item width is 0.78 pitch)

export type Sim = {
  s: number[]; // item position along the belt in pitches (0 = entry edge)
  b: number; // belt speed factor 0..1
  phase: number; // belt surface travel in pitches (rollers)
  jam: {idx: number; t: number} | null;
  clearedJam: {idx: number; t: number} | null;
  stopT: number | null;
  resumeT: number | null;
  cross: number[][]; // [item][station] frame the item crossed the station (-1e9 = before the layer anchor)
  lastEv: {name: string; t: number} | null;
};

/** Belt simulation up to shot-local frame `t` (pure; node-testable). `lp` = belt length in pitches, `stationS` = gate positions (pitches). */
export const conveyorSim = (p: Props, ctx: Ctx, t: number, lp: number, stationS: number[]): Sim => {
  const n = p.items.length;
  const dt24 = 24 / ctx.fps;
  const unit = (SPEED[p.speed] / 24) * dt24; // pitches per composition frame at full belt speed
  const s = p.items.map((_, i) => 0.5 * lp - i * GAP);
  const cross = s.map((x) => stationS.map((st) => (x >= st ? -1e9 : Infinity)));
  const acts = actionsOf(ctx, 'stop', 'jam', 'resume');
  let ai = 0;
  let target = 1;
  let b = 1;
  let phase = 0;
  let jam: Sim['jam'] = null;
  let clearedJam: Sim['clearedJam'] = null;
  let stopT: number | null = null;
  let resumeT: number | null = null;
  let lastEv: Sim['lastEv'] = null;
  let jamPos = 0;
  for (let f = ctx.at; f <= t; f++) {
    while (ai < acts.length && acts[ai].at <= f) {
      const a = acts[ai++];
      lastEv = {name: a.name, t: a.at};
      if (a.name === 'stop') {
        target = 0;
        stopT = a.at;
        resumeT = null;
      } else if (a.name === 'resume') {
        target = 1;
        resumeT = a.at;
        stopT = null;
        if (jam) clearedJam = {idx: jam.idx, t: a.at};
        jam = null;
      } else {
        const idx = Math.min(n - 1, a.props.index as number);
        jam = {idx, t: a.at};
        jamPos = Math.min(Math.max(s[idx], 0.3), lp - 0.9);
        s[idx] = jamPos;
      }
    }
    b += (target - b) * (1 - Math.exp(-dt24 / 4));
    const v = unit * b;
    phase += v;
    for (let i = 0; i < n; i++) {
      let ns = s[i] + v;
      if (jam && i === jam.idx) ns = jamPos;
      if (i > 0) ns = Math.min(ns, s[i - 1] - (jam && i - 1 >= 0 ? MIN_GAP : MIN_GAP));
      for (let k = 0; k < stationS.length; k++) if (cross[i][k] === Infinity && ns >= stationS[k]) cross[i][k] = f;
      s[i] = ns;
    }
  }
  return {s, b, phase, jam, clearedJam, stopT, resumeT, cross, lastEv};
};

const STAMP: Record<string, string> = {
  ok: 'M -9 1 L -3 8 L 10 -8',
  fail: 'M -8 -8 L 8 8 M 8 -8 L -8 8',
  warn: 'M 0 -9 L 10 8 L -10 8 Z',
  active: 'M -9 0 H 9 M 3 -7 L 10 0 L 3 7',
};

const SvgPool: React.FC<{id: string; x: number; y: number; r: number; color: string; a: number; squash: number}> = ({id, x, y, r, color, a, squash}) =>
  a <= 0.003 ? null : (
    <>
      <radialGradient id={id} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor={color} stopOpacity={Math.min(1, a)} />
        <stop offset="0.72" stopColor={color} stopOpacity={0} />
      </radialGradient>
      <ellipse cx={x} cy={y} rx={r} ry={r * squash} fill={`url(#${id})`} />
    </>
  );

const DX = 0.45; // oblique depth vector per px of belt depth: right ...
const DY = 0.42; // ... and up
const poly = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';

export const ConveyorView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const items = props.items;
  const stations = props.stations ?? [];
  const rtl = rtlOf([...items.map((i) => i.label), ...stations]);
  const maxLen = Math.max(...items.map((i) => i.label.length));
  const itemW = Math.round(Math.min(340, Math.max(200, maxLen * 19 + 90)));
  const itemH = Math.round(SIZE.label * 3.5);
  const itemD = 70; // crate depth on the belt
  const z0 = 32; // front face of a crate sits this far behind the belt's front edge
  const depth = 160; // belt depth
  const pitch = Math.round(itemW / 0.78);
  const slabH = 56;
  const mX = 46; // margin so the end drums stay inside the box (the layer wipe clips at the box edge)
  const beltW = w - depth * DX - 2 * mX; // belt length along its front edge
  const lp = beltW / pitch;
  const beltY = Math.round(h * 0.62); // front edge of the belt top surface
  const floorY = beltY + slabH + 100;
  const xAt = (s: number) => mX + (rtl ? beltW - s * pitch : s * pitch);
  const P = (x: number, z: number, up: number): [number, number] => [x + z * DX, beltY - z * DY - up];
  const stationS = stations.map((_, k) => lp * ((k + 1) / (stations.length + 1)));
  const sim = conveyorSim(props, ctx, t, lp, stationS);
  const k = 1 + ctx.mod.glow;
  const lblN = presetFrames('label', ctx.fps);
  const arriveN = presetFrames('arrive', ctx.fps);
  const impN = presetFrames('impact', ctx.fps, true);
  const morph = presetFrames('morph', ctx.fps, true);
  const beltDraw = prog(t, ctx.at, morph + f24(4, ctx.fps), ease.camera);
  const lamp = sim.jam ? C.crit : sim.stopT !== null ? C.warn : C.ok;
  const lampAt = sim.lastEv?.t ?? ctx.at;
  const lampPop = prog(t, lampAt, impN, ease.impact);
  const lineCol = sim.jam ? C.crit : C.signal;
  const lastK = stations.length - 1;
  const stampT = (i: number) => (lastK >= 0 ? sim.cross[i][lastK] : -1e9);
  const stampCol = (i: number) => {
    const st = items[i].status;
    if (stampT(i) > t) return C.ink2;
    return st ? STATUS_COLOR[st] : C.ink2;
  };
  const jamI = sim.jam?.idx ?? -1;
  const visible = items.map((_, i) => i).filter((i) => sim.s[i] > -0.6 && sim.s[i] < lp + 0.6);
  // a crate (and its label) is only visible inside the box, fading in/out over 0.35 of its width at the edges (title-safe)
  const edgeFade = (s: number) => {
    const x = xAt(s) + z0 * DX;
    return Math.max(0, Math.min(1, Math.min(x - itemW / 2, w - x - itemW / 2) / (0.35 * itemW)));
  };
  const flash = (kk: number) => {
    let f = 0;
    for (let i = 0; i < items.length; i++) {
      const c = sim.cross[i][kk];
      if (c !== Infinity && c > -1e8 && t >= c) f = Math.max(f, 1 - prog(t, c, impN * 2, ease.arrive));
    }
    return f;
  };
  const archH = Math.round(itemH * 1.85);
  const phasePx = (sim.phase * pitch) % 36;
  const x0 = rtl ? beltW : 0; // entry end of the belt (front-edge coordinates)
  const drawX = rtl ? beltW * (1 - beltDraw) : beltW * beltDraw; // leading end of the belt while it draws on
  const bx0 = Math.min(x0, drawX);
  const bx1 = Math.max(x0, drawX);
  const legX = [beltW * 0.17, beltW * 0.83];
  const jamQ = sim.jam ? prog(t, sim.jam.t, impN * 3, ease.arrive) : 0;
  const lampX = rtl ? 78 : beltW - 78;
  const lampOn = prog(t, ctx.at + f24(4, ctx.fps), lblN);
  const clipId = `${ctx.id}-belt`;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id={`${ctx.id}-fl`} gradientUnits="userSpaceOnUse" x1="0" y1={floorY} x2="0" y2={floorY + 230}>
            <stop offset="0" stopColor={lineCol} stopOpacity={0.3} />
            <stop offset="1" stopColor={lineCol} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-pl`} gradientUnits="userSpaceOnUse" x1="0" y1={beltY} x2="0" y2={beltY + slabH}>
            <stop offset="0" stopColor={C.panel} />
            <stop offset="1" stopColor={C.ground} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-lg`} gradientUnits="userSpaceOnUse" x1="0" y1={beltY + slabH} x2="0" y2={floorY}>
            <stop offset="0" stopColor={C.ink3} stopOpacity={0.5} />
            <stop offset="1" stopColor={C.ink3} stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-top`} gradientUnits="userSpaceOnUse" x1="0" y1={beltY - depth * DY} x2="0" y2={beltY}>
            <stop offset="0" stopColor={C.ground} />
            <stop offset="1" stopColor={C.panel} />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={bx0 - 30} y={beltY - depth * DY - 6} width={bx1 - bx0 + depth * DX + 60} height={depth * DY + slabH + 12} />
          </clipPath>
        </defs>
        {/* light: key pool on the floor under the line and rim pool on the belt (crit at a jam) */}
        <SvgPool id={`${ctx.id}-p1`} x={mX + beltW / 2 + 40} y={floorY} r={beltW * 0.46} color={lineCol} a={0.2 * k * beltDraw} squash={0.16} />
        <SvgPool id={`${ctx.id}-p2`} x={mX + beltW / 2 + 40} y={beltY - 30} r={beltW * 0.4} color={lineCol} a={0.1 * k * beltDraw} squash={0.4} />
        {/* perspective floor: receding rows and converging depth lines, fading away from the lit line */}
        <g opacity={beltDraw}>
          {Array.from({length: 5}, (_, i) => {
            const d = Math.pow((i + 1) / 5, 1.55) * 200;
            return <line key={`fh${i}`} x1={-40} x2={w + 40} y1={floorY + 10 + d} y2={floorY + 10 + d} stroke={`url(#${ctx.id}-fl)`} strokeWidth={1.5} />;
          })}
          {Array.from({length: 17}, (_, j) => {
            const xa = -40 + (j / 16) * (w + 80);
            const mid = w / 2;
            return <line key={`fv${j}`} x1={xa} x2={mid + (xa - mid) * 1.6} y1={floorY + 10} y2={floorY + 210} stroke={`url(#${ctx.id}-fl)`} strokeWidth={1.5} />;
          })}
        </g>
        {/* the belt: contact shadow, legs, steel side plate, top surface with moving roller ticks, edge light tube */}
        {beltDraw > 0 ? (
          <g transform={`translate(${mX} 0)`}>
            <ellipse cx={beltW / 2 + 30} cy={floorY + 6} rx={beltW * 0.5} ry={20} fill={C.void} fillOpacity={0.6} />
            {legX.map((lx, q) => (
              <g key={q} opacity={prog(t, ctx.at + Math.round(morph * (Math.abs(lx - x0) / beltW)), arriveN)}>
                <path d={poly([[lx - 22, beltY + slabH - 4], [lx + 22, beltY + slabH - 4], [lx + 28, floorY], [lx - 28, floorY]])} fill={`url(#${ctx.id}-lg)`} />
                <ellipse cx={lx} cy={floorY} rx={44} ry={11} fill={C.void} fillOpacity={0.55} stroke={C.ink3} strokeOpacity={0.5} strokeWidth={1.5} />
              </g>
            ))}
            <g clipPath={`url(#${clipId})`}>
              <path d={poly([[0, beltY], [beltW, beltY], [beltW + depth * DX, beltY - depth * DY], [depth * DX, beltY - depth * DY]])} fill={`url(#${ctx.id}-top)`} stroke={C.grid} strokeWidth={2} strokeLinejoin="round" />
              <g stroke={C.ink3} strokeOpacity={0.4} strokeWidth={2}>
                {Array.from({length: Math.ceil(beltW / 36) + 3}, (_, q) => {
                  const xf = (rtl ? -1 : 1) * (q * 36 + phasePx) + (rtl ? beltW : -36);
                  const a = P(xf, 0, 0);
                  const b = P(xf, depth, 0);
                  return <line key={q} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
                })}
              </g>
              <line x1={depth * DX} y1={beltY - depth * DY} x2={beltW + depth * DX} y2={beltY - depth * DY} stroke={C.ink} strokeOpacity={0.12} strokeWidth={2} />
              <rect x={0} y={beltY} width={beltW} height={slabH} rx={12} fill={`url(#${ctx.id}-pl)`} stroke={C.grid} strokeWidth={2} />
              <line x1={10} y1={beltY + 2} x2={beltW - 10} y2={beltY + 2} stroke={C.ink} strokeOpacity={0.22} strokeWidth={2} />
              {[0, beltW].map((ex, q) => (
                <g key={q}>
                  <circle cx={ex} cy={beltY + slabH / 2} r={slabH * 0.72} fill={C.ground} stroke={C.grid} strokeWidth={2.5} />
                  <circle cx={ex} cy={beltY + slabH / 2} r={slabH * 0.28} fill={C.panel} stroke={C.ink3} strokeWidth={2} />
                </g>
              ))}
              <GlowPath d={`M 0 ${beltY + slabH + 7} L ${beltW} ${beltY + slabH + 7}`} color={lineCol} width={3} fx={ctx.fx} k={0.6 * k} opacity={0.85} />
              {/* belt lamp on the side plate: ok = running, warn = stopped, crit = jam */}
              <g opacity={lampOn}>
                <circle cx={lampX} cy={beltY + slabH / 2} r={15 + ctx.fx.glowInner * 0.55 * lampPop} fill={lamp} fillOpacity={0.16} />
                <circle cx={lampX} cy={beltY + slabH / 2} r={11 * (0.8 + 0.2 * lampPop)} fill={lamp} stroke={C.ground} strokeWidth={3} />
              </g>
            </g>
          </g>
        ) : null}
        {/* jam shockwave on the belt surface */}
        {sim.jam && jamQ > 0 && jamQ < 1 ? (() => {
          const c = P(sim.jam.idx >= 0 ? xAt(sim.s[sim.jam.idx]) : 0, z0 + itemD / 2, 0);
          return <ellipse cx={c[0]} cy={c[1]} rx={itemW * (0.5 + 0.9 * jamQ)} ry={itemW * (0.5 + 0.9 * jamQ) * 0.26} fill="none" stroke={C.crit} strokeWidth={3} strokeOpacity={0.7 * (1 - jamQ)} />;
        })() : null}
        {/* back posts of the gates (behind the crates) */}
        {stations.map((_, kk) => {
          const born = ctx.at + f24(3 * kk + 2, ctx.fps);
          if (t < born) return null;
          const q = prog(t, born, arriveN);
          const xg = xAt(stationS[kk]);
          const a = P(xg, depth - 8, 0);
          const b = P(xg, depth - 8, archH * q);
          const fl = flash(kk);
          const m = P(xg, depth / 2, 0);
          return (
            <g key={kk} opacity={q}>
              <ellipse cx={m[0]} cy={m[1] + 2} rx={26 + 30 * fl} ry={(depth - 16) * DY * 0.6} fill={C.signal} fillOpacity={0.06 + 0.3 * fl} />
              <GlowPath d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} color={fl > 0.02 ? C.signal : C.ink3} width={9} fx={ctx.fx} k={fl * k} opacity={0.9} />
            </g>
          );
        })}
        {/* crates */}
        {visible.map((i) => {
          const xf = xAt(sim.s[i]);
          const jammed = i === jamI;
          const was = sim.clearedJam && sim.clearedJam.idx === i ? 1 - prog(t, sim.clearedJam.t, arriveN) : 0;
          const col = jammed ? C.crit : stampCol(i);
          const status = jammed ? 'fail' : stampT(i) <= t ? items[i].status : undefined;
          const tilt = jammed ? 5 * prog(t, sim.jam!.t, impN, ease.impact) : was * 5;
          const dx = jammed ? shake(t, sim.jam!.t, f24(12, ctx.fps), 6) : 0;
          const op = edgeFade(sim.s[i]);
          const stampQ = status && stampT(i) > -1e8 ? prog(t, stampT(i), impN, ease.impact) : status ? 1 : 0;
          const fl = P(xf - itemW / 2 + dx, z0, 0); // front face bottom-left
          const [fx, fy] = fl;
          const ox = itemD * DX;
          const oy = -itemD * DY;
          const rot = (rtl ? -tilt : tilt).toFixed(2);
          return (
            <g key={i} opacity={op} transform={`rotate(${rot} ${(fx + itemW / 2).toFixed(1)} ${fy.toFixed(1)})`}>
              <ellipse cx={fx + itemW / 2 + ox / 2} cy={fy + oy / 2 + 4} rx={itemW * 0.62} ry={itemD * 0.5} fill={C.void} fillOpacity={0.5} />
              <path d={poly([[fx + itemW, fy], [fx + itemW + ox, fy + oy], [fx + itemW + ox, fy + oy - itemH], [fx + itemW, fy - itemH]])} fill={C.void} fillOpacity={0.55} stroke={col} strokeOpacity={0.7} strokeWidth={2} strokeLinejoin="round" />
              <path d={poly([[fx, fy - itemH], [fx + itemW, fy - itemH], [fx + itemW + ox, fy - itemH + oy], [fx + ox, fy - itemH + oy]])} fill={C.ink} fillOpacity={0.16} stroke={col} strokeOpacity={0.9} strokeWidth={2} strokeLinejoin="round" />
              <rect x={fx} y={fy - itemH} width={itemW} height={itemH} rx={6} fill={`url(#${ctx.id}-pl)`} stroke={col} strokeWidth={2.5} />
              <line x1={fx + 8} y1={fy - itemH + 2.5} x2={fx + itemW - 8} y2={fy - itemH + 2.5} stroke={C.ink} strokeOpacity={0.22} strokeWidth={2} />
              <rect x={fx} y={fy - itemH} width={itemW} height={itemH} rx={6} fill="none" stroke={col} strokeOpacity={0.35} strokeWidth={5 + ctx.fx.glowInner * (jammed ? 1.2 : 0.5)} />
              {status && STAMP[status] ? (
                <g transform={`translate(${(rtl ? fx + 24 : fx + itemW - 24).toFixed(1)} ${(fy - itemH - 4).toFixed(1)})`} opacity={stampQ}>
                  <circle r={15} fill={C.ground} stroke={col} strokeWidth={2.5} />
                  <g transform="scale(0.8)">
                    <path d={STAMP[status]} fill={status === 'warn' ? col : 'none'} stroke={col} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
              ) : null}
            </g>
          );
        })}
        {/* front posts, beam and light curtain of the gates (in front of the crates) */}
        {stations.map((_, kk) => {
          const born = ctx.at + f24(3 * kk + 2, ctx.fps);
          if (t < born) return null;
          const q = prog(t, born, arriveN);
          const xg = xAt(stationS[kk]);
          const fl = flash(kk);
          const col = fl > 0.02 ? C.signal : C.ink2;
          const fb = P(xg, 8, 0);
          const ft = P(xg, 8, archH * q);
          const bb = P(xg, depth - 8, 0);
          const bt = P(xg, depth - 8, archH * q);
          return (
            <g key={kk} opacity={q}>
              <path d={poly([fb, ft, bt, bb])} fill={C.signal} fillOpacity={0.07 + 0.26 * fl} />
              <GlowPath d={`M ${fb[0]} ${fb[1]} L ${ft[0]} ${ft[1]} L ${bt[0]} ${bt[1]}`} color={col} width={9} fx={ctx.fx} k={fl * k} opacity={0.95} />
              <rect x={(ft[0] + bt[0]) / 2 - 24} y={(ft[1] + bt[1]) / 2 - 11} width={48} height={22} rx={7} fill={C.ground} stroke={col} strokeWidth={2.5} />
              <rect x={(ft[0] + bt[0]) / 2 - 15} y={(ft[1] + bt[1]) / 2 - 3.5} width={30} height={7} rx={3.5} fill={C.signal} fillOpacity={0.2 + 0.75 * fl} />
            </g>
          );
        })}
      </svg>
      {/* item labels (one whole string per crate, upright) */}
      {visible.map((i) => {
        const jammed = i === jamI;
        const dx = jammed ? shake(t, sim.jam!.t, f24(12, ctx.fps), 6) : 0;
        const c = P(xAt(sim.s[i]) + dx, z0, itemH / 2);
        return <Lbl key={i} id={`${ctx.id}:i${i}`} text={items[i].label} x={c[0]} y={c[1]} maxW={itemW - 30} size={SIZE.body} color={jammed ? C.crit : C.ink} opacity={edgeFade(sim.s[i])} />;
      })}
      {/* station labels */}
      {stations.map((name, kk) => {
        const born = ctx.at + f24(3 * kk + 2, ctx.fps);
        if (t < born) return null;
        const lp2 = prog(t, born, lblN);
        const fl = flash(kk);
        const c = P(xAt(stationS[kk]), depth / 2, archH);
        return (
          <Lbl
            key={kk}
            id={`${ctx.id}:s${kk}`}
            text={name}
            x={c[0]}
            y={c[1] - 36}
            valign="bottom"
            maxW={Math.max(160, w / (stations.length + 1) - 30)}
            color={fl > 0.02 ? C.signal : C.ink}
            plate
            accent={fl > 0.02 ? C.signal : undefined}
            fx={ctx.fx}
            opacity={lp2}
            style={{marginTop: (1 - lp2) * 6}}
          />
        );
      })}
    </div>
  );
};

export const Conveyor: DcComponent<Props> = {name: 'Conveyor', Component: ConveyorView, text: true, slot: 'center'};
