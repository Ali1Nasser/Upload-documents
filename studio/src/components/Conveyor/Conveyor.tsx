// Conveyor (catalog: Structure & flow). Items on a conveyor passing stations (04 §6 "What a computer does": the bus = a conveyor;
// "Generators": a conveyor yielding items; "Mobile Money": receipts passing the pipeline stations).
//  - RTL when any copy is Arabic: items enter on the right and travel right -> left (reading order).
//  - Layer anchor: the belt draws on from the entry side, the station gates rise (label preset), the items ride in. Belt speed
//    (slow / normal / fast = 0.6 / 1.0 / 1.8 item pitches per second) is a film-time rate, so it does not change with the fps.
//  - Stations are gates over the belt with their label on a plate. An item that crosses a gate flashes it; after the last gate
//    (or at once without stations) the item takes its status colour (semantic: idle neutral, active signal, ok, warn, fail) and
//    a status mark (check / cross / triangle) so it never relies on colour alone.
//  - stop: the belt decelerates to a halt (lamp turns warn on the anchor). resume: it speeds up again (lamp ok; a jam is cleared).
//    jam(index): that item locks where it is (crit, tilted, shaking, lamp crit) while the belt keeps running underneath; the items
//    behind close up against it into a queue (the gap shrinks to 0.35 of the pitch).
//  - Pure kinematics in 24-fps film units, stepped one composition frame at a time from the layer anchor: deterministic.
import React from 'react';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
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

export const ConveyorView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const items = props.items;
  const stations = props.stations ?? [];
  const rtl = rtlOf([...items.map((i) => i.label), ...stations]);
  const maxLen = Math.max(...items.map((i) => i.label.length));
  const itemW = Math.round(Math.min(340, Math.max(190, maxLen * 19 + 80)));
  const itemH = Math.round(SIZE.label * 2.9);
  const pitch = Math.round(itemW / 0.78);
  const lp = w / pitch;
  const beltY = Math.round(h * 0.68);
  const slabH = 52;
  const xAt = (s: number) => (rtl ? w - s * pitch : s * pitch);
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
  const beltX0 = rtl ? w : 0;
  const lastK = stations.length - 1;
  const stampT = (i: number) => (lastK >= 0 ? sim.cross[i][lastK] : -1e9);
  const stampCol = (i: number) => {
    const st = items[i].status;
    if (stampT(i) > t) return C.ink2;
    return st ? STATUS_COLOR[st] : C.ink2;
  };
  const jamI = sim.jam?.idx ?? -1;
  const visible = items.map((_, i) => i).filter((i) => sim.s[i] > -0.6 && sim.s[i] < lp + 0.6);
  // an item (card and label) is only visible inside the box, fading in/out over 0.35 of its width at the edges (title-safe)
  const edgeFade = (s: number) => {
    const x = xAt(s);
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
  const archH = Math.round(itemH * 1.75);
  const phasePx = (sim.phase * pitch) % 36;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      <Pool x={w / 2} y={beltY} r={w * 0.4} color={sim.jam ? C.crit : C.signal} a={0.1} squash={0.3} />
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* belt slab: surface highlight, body, moving roller ticks */}
        {beltDraw > 0 ? (
          <g>
            <clipPath id={`${ctx.id}-belt`}>
              <rect x={rtl ? w * (1 - beltDraw) : 0} y={beltY - 2} width={w * beltDraw} height={slabH + 6} rx={10} />
            </clipPath>
            <rect x={rtl ? w * (1 - beltDraw) : 0} y={beltY} width={w * beltDraw} height={slabH} rx={10} fill={C.panel} stroke={C.grid} strokeWidth={2} />
            <g clipPath={`url(#${ctx.id}-belt)`} stroke={C.ink3} strokeOpacity={0.35} strokeWidth={2}>
              {Array.from({length: Math.ceil(w / 36) + 2}, (_, q) => {
                const x = (rtl ? -1 : 1) * (q * 36 + phasePx) + (rtl ? w : -36);
                return <line key={q} x1={x} y1={beltY + 6} x2={x - (rtl ? 10 : -10)} y2={beltY + slabH - 6} />;
              })}
            </g>
            <circle cx={rtl ? w : 0} cy={beltY + slabH / 2} r={slabH * 0.72} fill={C.ground} stroke={C.grid} strokeWidth={2.5} />
            <circle cx={rtl ? w : 0} cy={beltY + slabH / 2} r={slabH * 0.28} fill={C.panel} stroke={C.ink3} strokeWidth={2} />
            <circle cx={rtl ? w * (1 - beltDraw) : w * beltDraw} cy={beltY + slabH / 2} r={slabH * 0.72} fill={C.ground} stroke={C.grid} strokeWidth={2.5} />
            <circle cx={rtl ? w * (1 - beltDraw) : w * beltDraw} cy={beltY + slabH / 2} r={slabH * 0.28} fill={C.panel} stroke={C.ink3} strokeWidth={2} />
            <line x1={rtl ? w * (1 - beltDraw) : 0} y1={beltY + 1} x2={rtl ? w : w * beltDraw} y2={beltY + 1} stroke={C.ink} strokeOpacity={0.22} strokeWidth={2} />
            <GlowPath d={`M ${beltX0.toFixed(1)} ${beltY + slabH + 6} L ${(rtl ? w * (1 - beltDraw) : w * beltDraw).toFixed(1)} ${beltY + slabH + 6}`} color={sim.jam ? C.crit : C.signal} width={3} fx={ctx.fx} k={0.5 * k} opacity={0.8} />
          </g>
        ) : null}
        {/* station gates */}
        {stations.map((_, kk) => {
          const born = ctx.at + f24(3 * kk + 2, ctx.fps);
          if (t < born) return null;
          const q = prog(t, born, arriveN);
          const x = xAt(stationS[kk]);
          const fl = flash(kk);
          const col = fl > 0.02 ? C.signal : C.ink2;
          const half = itemW * 0.62;
          return (
            <g key={kk} opacity={q}>
              <ellipse cx={x} cy={beltY + 2} rx={half + 14} ry={9} fill={C.signal} fillOpacity={0.06 + 0.2 * fl} />
              <path d={`M ${x - half} ${beltY} V ${beltY - archH * q} H ${x + half} V ${beltY}`} fill="none" stroke={col} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
              <path d={`M ${x - half} ${beltY} V ${beltY - archH * q} H ${x + half} V ${beltY}`} fill="none" stroke={C.signal} strokeWidth={4.5 + 10 * fl} strokeOpacity={0.18 * fl + 0.0} strokeLinejoin="round" strokeLinecap="round" />
              <rect x={x - half + 6} y={beltY - archH * q + 6} width={2 * half - 12} height={7} rx={3.5} fill={C.signal} fillOpacity={0.12 + 0.6 * fl} />
            </g>
          );
        })}
      </svg>
      {/* items */}
      {visible.map((i) => {
        const x = xAt(sim.s[i]);
        const jammed = i === jamI;
        const was = sim.clearedJam && sim.clearedJam.idx === i ? 1 - prog(t, sim.clearedJam.t, arriveN) : 0;
        const col = jammed ? C.crit : stampCol(i);
        const status = jammed ? 'fail' : stampT(i) <= t ? items[i].status : undefined;
        const tilt = jammed ? 5 * prog(t, sim.jam!.t, impN, ease.impact) : was * 5;
        const dx = jammed ? shake(t, sim.jam!.t, f24(12, ctx.fps), 6) : 0;
        const op = edgeFade(sim.s[i]);
        const stampQ = status && stampT(i) > -1e8 ? prog(t, stampT(i), impN, ease.impact) : status ? 1 : 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x - itemW / 2 + dx,
                top: beltY - itemH + 2,
                width: itemW,
                height: itemH,
                opacity: op,
                transform: `rotate(${(rtl ? -tilt : tilt).toFixed(2)}deg)`,
                transformOrigin: '50% 100%',
                borderRadius: 14,
                background: `linear-gradient(180deg, ${C.panel}F2 0%, ${C.ground}F2 100%)`,
                border: `2px solid ${col}`,
                boxShadow: `inset 0 2px 0 ${C.ink}${hex(0.12)}, 0 10px 22px ${C.void}${hex(0.55)}, 0 0 ${(ctx.fx.glowInner * (jammed ? 1.8 : 0.8)).toFixed(1)}px ${col}${hex(jammed ? 0.6 : 0.3)}`,
              }}
            />
            <Lbl id={`${ctx.id}:i${i}`} text={items[i].label} x={x + dx} y={beltY - itemH / 2 + 2} maxW={itemW - 30} size={SIZE.body} color={jammed ? C.crit : C.ink} opacity={op} />
            {status && STAMP[status] ? (
              <svg width={28} height={28} viewBox="-14 -14 28 28" style={{position: 'absolute', left: x + (rtl ? -itemW / 2 + 6 : itemW / 2 - 34) + dx, top: beltY - itemH - 12, opacity: op * stampQ, overflow: 'visible'}}>
                <circle r={13} fill={C.ground} stroke={col} strokeWidth={2.5} />
                <g transform="scale(0.7)">
                  <path d={STAMP[status]} fill={status === 'warn' ? col : 'none'} stroke={col} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </svg>
            ) : null}
          </React.Fragment>
        );
      })}
      {/* station labels */}
      {stations.map((name, kk) => {
        const born = ctx.at + f24(3 * kk + 2, ctx.fps);
        if (t < born) return null;
        const lp2 = prog(t, born, lblN);
        const fl = flash(kk);
        return (
          <Lbl
            key={kk}
            id={`${ctx.id}:s${kk}`}
            text={name}
            x={xAt(stationS[kk])}
            y={beltY - archH - 22}
            valign="bottom"
            maxW={Math.max(160, (w / (stations.length + 1)) - 30)}
            color={fl > 0.02 ? C.signal : C.ink}
            plate
            accent={fl > 0.02 ? C.signal : undefined}
            fx={ctx.fx}
            opacity={lp2}
            style={{marginTop: (1 - lp2) * 6}}
          />
        );
      })}
      {/* belt lamp: ok = running, warn = stopped, crit = jam */}
      <svg width={60} height={60} style={{position: 'absolute', left: rtl ? 8 : w - 68, top: beltY + slabH + 18, overflow: 'visible', opacity: prog(t, ctx.at + f24(4, ctx.fps), lblN)}}>
        <circle cx={30} cy={30} r={22 + ctx.fx.glowInner * 0.6 * lampPop} fill={lamp} fillOpacity={0.14} />
        <circle cx={30} cy={30} r={13 * (0.8 + 0.2 * lampPop)} fill={lamp} stroke={C.ground} strokeWidth={3} />
      </svg>
    </div>
  );
};

export const Conveyor: DcComponent<Props> = {name: 'Conveyor', Component: ConveyorView, text: true, slot: 'center'};
