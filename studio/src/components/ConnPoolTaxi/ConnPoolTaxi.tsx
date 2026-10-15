// ConnPoolTaxi (catalog: Domain specials; 04 section 6 "Backend depth": connection pool = taxi rank with N cars; pool
// exhaustion -> the queue grows). Pictorial only: no copy and no digits (pool_size / requests are structural counts without a
// ref, so the narration's numbers are shown by a NumberCounter / TermChip layer, never by this component).
//   - The rank: `pool_size` bays (one taxi each) on the end side (left in the RTL frame), wired to the database (far left).
//   - Requests are passenger dots that arrive from the start side (right), one every few film frames from the layer anchor
//     (the first one ON the anchor, RV1). A request boards the first free taxi (the taxi turns `signal` = borrowed and its
//     bus wire lights); when no taxi is free it joins the queue (`warn`), which grows toward the start side.
//   - exhaust -> every remaining free taxi is borrowed by other traffic; the rank gate becomes a crit wall, the queue turns
//     crit and shakes once (04 section 3.5: the only hard motion is a failure shake).
//   - release {n} -> the n longest-borrowed taxis come back (ok flash); queued requests board them in FIFO order and the queue
//     closes up (morph timing).
// DOM-free SVG (standard tier; no WebGL, no per-frame filter).
import React from 'react';
import {random} from 'remotion';
import {C} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Floor, Glyph, Wire, acts, boxStyle, clamp01, f24, mix, pf, prog, pulse, shake, shell} from '../_dom-c/kit';

type Board = {t: number; bay: number};
type Sim = {
  born: number[]; // arrival frame of request i
  board: (Board | null)[]; // when / where request i boards a taxi (null = still waiting at the end of the shot)
  bayBusy: {t: number; busy: boolean; by: number | -1}[][]; // per bay: state changes in time order (-1 = other traffic)
  exhaustAt: number | null;
  releases: number[];
};

/** Deterministic event simulation of the rank (pure: frames in, frames out). */
export const poolSim = (p: Props, ctx: LayerCtx): Sim => {
  const P = p.pool_size;
  const R = p.requests;
  const step = Math.max(1, Math.min(f24(ctx, 3), Math.floor(f24(ctx, 48) / Math.max(1, R))));
  const travel = f24(ctx, 10);
  const born = Array.from({length: R}, (_, i) => ctx.at + i * step);
  const ex = acts(ctx, 'exhaust')[0];
  const rel = acts(ctx, 'release');
  type Ev = {t: number; kind: 'arrive' | 'exhaust' | 'release'; i?: number; n?: number; o: number};
  const evs: Ev[] = born.map((t, i) => ({t, kind: 'arrive' as const, i, o: 1}));
  if (ex) evs.push({t: ex.at, kind: 'exhaust', o: 0});
  rel.forEach((a) => evs.push({t: a.at, kind: 'release', n: a.props.n as number, o: 2}));
  evs.sort((a, b) => a.t - b.t || a.o - b.o || (a.i ?? 0) - (b.i ?? 0));
  const bayBusy: Sim['bayBusy'] = Array.from({length: P}, () => [{t: -1e9, busy: false, by: -1}]);
  const since: (number | null)[] = Array(P).fill(null);
  const board: (Board | null)[] = Array(R).fill(null);
  const queue: number[] = [];
  const take = (b: number, t: number, by: number) => {
    since[b] = t;
    bayBusy[b].push({t, busy: true, by});
  };
  for (const e of evs) {
    if (e.kind === 'arrive') {
      const b = since.findIndex((s) => s === null);
      if (b >= 0) {
        board[e.i as number] = {t: e.t + travel, bay: b};
        take(b, e.t + travel, e.i as number);
      } else queue.push(e.i as number);
    } else if (e.kind === 'exhaust') {
      for (let b = 0; b < P; b++) if (since[b] === null) take(b, e.t, -1);
    } else {
      const busy = since.map((s, b) => [s, b] as const).filter(([s]) => s !== null).sort((a, b) => (a[0] as number) - (b[0] as number) || a[1] - b[1]);
      for (const [, b] of busy.slice(0, e.n)) {
        since[b] = null;
        bayBusy[b].push({t: e.t, busy: false, by: -1});
        const q = queue.shift();
        if (q !== undefined) {
          board[q] = {t: e.t + travel, bay: b};
          take(b, e.t + travel, q);
        }
      }
    }
  }
  return {born, board, bayBusy, exhaustAt: ex ? ex.at : null, releases: rel.map((a) => a.at)};
};

/** Bay state at frame t: last change at or before t. */
const bayAt = (h: Sim['bayBusy'][number], t: number) => {
  let k = 0;
  for (let j = 0; j < h.length; j++) if (h[j].t <= t) k = j;
  return h[k];
};

/** Taxi silhouette facing left (toward the database), centred on (x, y), `w` wide. */
const Taxi: React.FC<{x: number; y: number; w: number; body: string; light: string; lightK: number; dim: boolean}> = ({x, y, w, body, light, lightK, dim}) => {
  const h = w * 0.42;
  const st = {fill: `${C.panel}F0`, stroke: body, strokeWidth: 2.5, strokeLinejoin: 'round' as const};
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} opacity={dim ? 0.55 : 1}>
      <ellipse cx={0} cy={h * 0.62} rx={w * 0.52} ry={h * 0.12} fill={C.void} fillOpacity={0.55} />
      <path d={`M ${-w * 0.5} ${h * 0.35} L ${-w * 0.5} ${-h * 0.02} Q ${-w * 0.48} ${-h * 0.14} ${-w * 0.32} ${-h * 0.16} L ${-w * 0.2} ${-h * 0.5} L ${w * 0.22} ${-h * 0.5} L ${w * 0.36} ${-h * 0.16} L ${w * 0.46} ${-h * 0.12} Q ${w * 0.5} ${-h * 0.06} ${w * 0.5} ${h * 0.05} L ${w * 0.5} ${h * 0.35} Z`} {...st} />
      <path d={`M ${-w * 0.16} ${-h * 0.42} L ${-w * 0.25} ${-h * 0.18} L ${w * 0.3} ${-h * 0.18} L ${w * 0.2} ${-h * 0.42} Z`} fill={body} fillOpacity={0.16} />
      <rect x={-w * 0.09} y={-h * 0.7} width={w * 0.18} height={h * 0.16} rx={3} fill={light} fillOpacity={0.35 + 0.65 * lightK} stroke={light} strokeWidth={1.5} />
      {lightK > 0.05 ? <circle cx={0} cy={-h * 0.62} r={w * 0.16} fill={light} fillOpacity={0.12 * lightK} /> : null}
      <circle cx={-w * 0.47} cy={h * 0.1} r={w * 0.035} fill={light} fillOpacity={0.4 + 0.6 * lightK} />
      {[-0.28, 0.3].map((k) => (
        <circle key={k} cx={w * k} cy={h * 0.36} r={h * 0.17} fill={C.ground} stroke={body} strokeWidth={2.5} />
      ))}
    </g>
  );
};

/** The rank panel: acrylic edge, glass body and the lit/extruded edges of `acrylic`, but no blurred box-shadow. A large panel
 * with 2-3 blurred shadows cost 0.27 box s/frame on swiftshader (measured); the soft glow is a flat radial gradient instead. */
const rankPanel = (col: string, k: number): React.CSSProperties => ({
  background: `linear-gradient(205deg, ${C.panel}F5 0%, ${C.ground}E8 100%)`,
  border: `2px solid ${col}${hex(0.45 + 0.4 * clamp01(k))}`,
  boxShadow: [`inset 0 2px 0 ${C.ink}${hex(0.08)}`, `inset -2px 0 0 ${C.ink}${hex(0.03)}`, `0 9px 0 -3px ${mix(col, C.void, 0.82)}`].join(', '),
});

export const ConnPoolTaxiView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const sim = poolSim(props, ctx);
  const n = props.pool_size;
  const W = ctx.box.w;
  const H = ctx.box.h;
  // rank grid on the end side
  const cols = n <= 4 ? n : n <= 10 ? Math.ceil(n / 2) : 5;
  const rows = Math.ceil(n / cols);
  const rankX0 = W * 0.12;
  const bayW = Math.min((W * 0.5) / cols, W * 0.14); // a 1-2 car rank stays a rank, not two giant taxis
  const rankW = bayW * cols;
  const bayH = Math.min((H * 0.74) / rows, bayW * 1.02);
  const rankY0 = H / 2 - (rows * bayH) / 2;
  const bayC = (b: number): [number, number] => {
    const r = Math.floor(b / cols);
    const c = b % cols;
    return [rankX0 + rankW - (c + 0.5) * bayW, rankY0 + (r + 0.5) * bayH];
  };
  const gateX = rankX0 + rankW + W * 0.03;
  const qY = H / 2;
  const laneR = W * 0.985;
  const maxQ = Math.max(1, props.requests - n);
  const qGap = Math.min(W * 0.036, (laneR - gateX - W * 0.04) / Math.max(1, maxQ));
  const dbX = W * 0.05;
  const exT = sim.exhaustAt;
  const exK = exT !== null && t >= exT ? prog(ctx, exT, P.arrive) : 0;
  const lastRel = sim.releases.filter((r) => r <= t).pop() ?? null;
  const calm = lastRel !== null && exT !== null && lastRel > exT ? prog(ctx, lastRel, P.morph) : 0; // a release clears the crit state
  const critK = exK * (1 - calm);
  const qShake = shake(`pool-${ctx.id}`, t, exT, f24(ctx, 5), 6);
  // waiting index of request i at frame t (FIFO among born, not yet boarded)
  const waiting = (i: number, at: number) => at >= sim.born[i] && (sim.board[i] === null || at < (sim.board[i] as Board).t - f24(ctx, 10)) && i >= 0;
  const qIndex = (i: number, at: number) => {
    let k = 0;
    for (let j = 0; j < i; j++) if (waiting(j, at)) k++;
    return k;
  };
  const els: React.ReactNode[] = [];
  // database + bus
  const ent = prog(ctx, ctx.at, P.arrive);
  els.push(<Glyph key="db" kind="db" x={dbX} y={H / 2} s={Math.min(W * 0.07, H * 0.16)} color={C.ink2} w={3} opacity={ent} />);
  const busX = rankX0 - W * 0.02;
  els.push(<Wire key="bus" d={`M ${dbX + W * 0.035} ${H / 2} L ${busX} ${H / 2} M ${busX} ${rankY0 + bayH * 0.5} L ${busX} ${rankY0 + bayH * (rows - 0.5)}`} color={C.grid} w={2} opacity={ent} />);
  // bays
  for (let b = 0; b < n; b++) {
    const [x, y] = bayC(b);
    const st = bayAt(sim.bayBusy[b], t);
    const busyK = st.busy ? prog(ctx, st.t, P.label) : 1 - prog(ctx, st.t, P.label);
    const freed = !st.busy && st.t > -1e8 ? pulse(t, st.t, f24(ctx, 8)) : 0;
    const bornB = ctx.at + Math.round((b * ctx.fps) / 24);
    const e = prog(ctx, bornB, P.label);
    if (e <= 0) continue;
    const col = st.busy ? mix(C.signal, C.crit, critK * 0.6) : mix(C.ink3, C.ok, freed);
    const bw = bayW * 0.84;
    const bh = bayH * 0.8;
    els.push(
      <g key={`b${b}`} opacity={e}>
        <rect x={x - bw / 2} y={y - bh / 2} width={bw} height={bh} rx={12} fill={`${C.ground}B0`} stroke={col} strokeOpacity={0.35 + 0.4 * busyK} strokeWidth={1.5} strokeDasharray={st.busy ? undefined : '6 6'} />
        {busyK > 0.02 ? <path d={`M ${x - bw / 2} ${y} L ${busX} ${y}`} stroke={C.signal} strokeOpacity={0.5 * busyK} strokeWidth={2} /> : null}
        <Taxi x={x} y={y + bh * 0.05} w={bw * 0.78} body={st.busy ? mix(C.ink2, C.signal, busyK) : mix(C.ink2, C.ok, freed)} light={st.busy ? C.signal : C.ok} lightK={st.busy ? busyK : 0.5 + 0.5 * freed} dim={false} />
      </g>,
    );
  }
  // bus glow while any connection is borrowed
  const anyBusy = sim.bayBusy.some((h) => bayAt(h, t).busy);
  if (anyBusy) els.push(<Wire key="busOn" d={`M ${dbX + W * 0.035} ${H / 2} L ${busX} ${H / 2}`} color={C.signal} w={2.5} opacity={0.8} />);
  // gate (crit wall on exhaust)
  els.push(
    <g key="gate" opacity={ent}>
      <path d={`M ${gateX} ${qY - bayH * 0.7} L ${gateX} ${qY + bayH * 0.7}`} stroke={mix(C.grid, C.crit, critK)} strokeWidth={3 + 5 * critK} strokeLinecap="round" />
      {critK > 0 ? <path d={`M ${gateX} ${qY - bayH * 0.7} L ${gateX} ${qY + bayH * 0.7}`} stroke={C.crit} strokeOpacity={0.18 * critK} strokeWidth={28} strokeLinecap="round" /> : null}
    </g>,
  );
  // queue lane
  els.push(<Wire key="lane" d={`M ${gateX + 10} ${qY} L ${laneR} ${qY}`} color={C.grid} w={2} opacity={ent * 0.8} dash="2 14" />);
  // requests
  const dotR = Math.max(9, Math.min(15, qGap * 0.32));
  for (let i = 0; i < props.requests; i++) {
    if (t < sim.born[i]) continue;
    const bd = sim.board[i];
    const tb = bd ? bd.t : Infinity;
    const travel = f24(ctx, 10);
    const qi = qIndex(i, t);
    // queue position (eased close-up after a release)
    const qiPrev = lastRel !== null ? qIndex(i, lastRel - 1) : qi;
    const qShift = lastRel !== null ? prog(ctx, lastRel, P.morph) : 1;
    const qPos = qiPrev + (qi - qiPrev) * qShift;
    const qx = gateX + W * 0.025 + qPos * qGap;
    if (bd && t >= tb - travel) {
      // boarding: travel from the entry (or the queue) to the bay, then ride inside the taxi (hidden)
      if (t >= tb) continue;
      const [bx, by] = bayC(bd.bay);
      const from = sim.born[i] >= tb - travel ? [laneR, qY] : [qx, qY];
      const q = clamp01(prog(ctx, tb - travel, travel));
      const x = from[0] + (bx - from[0]) * q;
      const y = from[1] + (by - from[1]) * q - Math.sin(q * Math.PI) * bayH * (0.18 + 0.14 * random(`cpt-arc-${props.seed}-${i}`));
      els.push(<Dot key={`r${i}`} x={x} y={y} r={dotR} color={C.signal} k={1} />);
      continue;
    }
    // waiting in the queue: enters from the lane end
    const e = prog(ctx, sim.born[i], P.arrive);
    const x = laneR + (qx - laneR) * e + (critK > 0 ? qShake : 0);
    const col = mix(C.warn, C.crit, critK);
    els.push(<Dot key={`r${i}`} x={x} y={qY + (random(`cpt-lane-${props.seed}-${i}`) - 0.5) * dotR * 0.7} r={dotR} color={col} k={0.6 + 0.6 * critK} />);
  }
  // exhausted halo over the queue
  if (critK > 0) {
    const waitingN = Array.from({length: props.requests}, (_, i) => i).filter((i) => waiting(i, t)).length;
    if (waitingN > 0)
      els.push(<rect key="qh" x={gateX + 8} y={qY - dotR * 3} width={W * 0.025 + waitingN * qGap} height={dotR * 6} rx={dotR * 3} fill={C.crit} fillOpacity={0.07 * critK} stroke={C.crit} strokeOpacity={0.4 * critK} strokeWidth={1.5} />);
  }
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx, 'ltr')}}>
      <Floor gid={`cpt-${ctx.id}`} w={W} h={H} y={H * 0.36} color={critK > 0 ? C.crit : C.signal} pool={0.1 + 0.08 * critK} cx={rankX0 + rankW / 2} opacity={ent} />
      <div style={{position: 'absolute', left: rankX0 - W * 0.01, top: rankY0 - bayH * 0.1, width: rankW + W * 0.02, height: rows * bayH + bayH * 0.2, borderRadius: 22, ...rankPanel(critK > 0 ? C.crit : C.grid, 0.15 + 0.4 * critK + ctx.mod.glow), opacity: ent * 0.9}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {els}
      </svg>
      {critK > 0 ? <div style={{position: 'absolute', left: gateX - 40, top: qY - bayH, width: 80, height: bayH * 2, background: `radial-gradient(closest-side, ${C.crit}${hex(0.22 * critK)}, transparent)`}} /> : null}
    </div>
  );
};

export const ConnPoolTaxi: DcComponent<Props> = {name: 'ConnPoolTaxi', Component: ConnPoolTaxiView, text: true, slot: 'full'};
