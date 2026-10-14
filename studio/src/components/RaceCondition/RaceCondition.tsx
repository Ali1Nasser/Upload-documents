// RaceCondition (catalog: Domain specials; 04 section 6 "Backend depth": race condition = two hands on one counter; lost update ->
// lock / atomic). 2-4 thread capsules (labels from props, thread 1 on the right) reach for ONE shared cell (label from props).
// The cell carries a segmented level bar (no digits: the counts are structural, the narration's numbers belong to a NumberCounter).
//   idle    -> each thread holds a read token wired to the cell; the bar shows the value everyone read (one segment).
//   collide -> all tokens race in on the same frame and hit together: crit flash + one failure shake (04 section 3.5), the bar
//              rises by ONE segment only; the other writes are drawn as dashed crit "lost" segments (the lost update).
//   lock    -> a lock ring closes around the cell and the threads go one at a time (waiting = warn, in turn = signal, done =
//              ok): every write lands, the bar rises one segment per thread (serialised).
// DOM + SVG only (standard tier); every anchored motion eases through revealProgress (RV1).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Lbl, Wire, acrylic, acts, born, boxStyle, clamp01, f24, mix, pf, prog, pulse, shake, shell} from '../_dom-c/kit';

export const raceTimeline = (n: number, ctx: DcProps<Props>['ctx']) => {
  const travel = f24(ctx, 8);
  const step = f24(ctx, 12);
  const col = acts(ctx, 'collide')[0];
  const lk = acts(ctx, 'lock')[0];
  return {travel, step, tStart: col ? col.at : null, tImpact: col ? col.at + travel : null, tLock: lk ? lk.at : null, n};
};

const Padlock: React.FC<{x: number; y: number; s: number; color: string; shut: number}> = ({x, y, s, color, shut}) => {
  const st = {fill: 'none', stroke: color, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const lift = (1 - shut) * s * 0.28;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M ${-s * 0.28} ${-s * 0.08 - lift} L ${-s * 0.28} ${-s * 0.3 - lift} A ${s * 0.28} ${s * 0.28} 0 0 1 ${s * 0.28} ${-s * 0.3 - lift} L ${s * 0.28} ${-s * 0.08}`} {...st} />
      <rect x={-s * 0.42} y={-s * 0.08} width={s * 0.84} height={s * 0.62} rx={s * 0.1} fill={`${C.ground}F2`} stroke={color} strokeWidth={4} />
      <circle cx={0} cy={s * 0.2} r={s * 0.07} fill={color} />
    </g>
  );
};

export const RaceConditionView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.threads.length;
  const tl = raceTimeline(n, ctx);
  const W = ctx.box.w;
  const H = ctx.box.h;
  const spacing = Math.min((W * 0.92) / n, 620);
  const capW = Math.min(spacing * 0.8, 470);
  const capH = Math.round(Math.min(H * 0.14, 130));
  const capY = Math.round(H * 0.15);
  const xs = props.threads.map((_, i) => W / 2 + ((n - 1) / 2 - i) * spacing);
  const cw = Math.min(W * 0.62, 1080);
  const ch = Math.round(H * 0.38);
  const cx = W / 2;
  const cy = Math.round(H * 0.68);
  const aw = cw * 0.74;
  const ax = props.threads.map((_, i) => cx + ((n - 1) / 2 - i) * (aw / (n - 1)));
  const topY = cy - ch / 2;
  const S = n + 1;
  const segW = Math.min(150, (cw * 0.8) / S - 12);
  const barW = S * (segW + 12) - 12;
  const barY = cy + ch * 0.12;
  const segX = (j: number) => cx + barW / 2 - (j + 1) * segW - j * 12; // segment 0 on the start (right) side
  const {tImpact, tStart, tLock, travel, step} = tl;
  const ent = prog(ctx, ctx.at, P.arrive);
  // who is in turn under the lock
  const turn = (i: number) => (tLock === null ? null : tLock + i * step);
  const doneAt = (i: number) => (tLock === null ? null : tLock + (i + 1) * step);
  const shakeX = shake(`race-${ctx.id}`, t, tImpact, f24(ctx, 6), 7);
  const impactK = tImpact !== null && t >= tImpact ? pulse(t, tImpact, f24(ctx, 10)) : 0;
  const lockK = tLock !== null ? prog(ctx, tLock, P.impact) : 0;
  const crashed = tImpact !== null && t >= tImpact && (tLock === null || t < tLock);
  const cellCol = crashed ? C.crit : lockK > 0 ? mix(C.signal, C.ok, lockK) : C.signal;

  const wires: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  props.threads.forEach((_, i) => {
    const e = prog(ctx, born(ctx, i, 3), P.arrive);
    const x0 = xs[i];
    const y0 = capY + capH / 2;
    wires.push(<Wire key={`w${i}`} d={`M ${x0} ${y0} L ${ax[i]} ${topY}`} color={C.ink3} w={2.5} opacity={e * 0.8} dash="3 12" />);
    // token position
    let q = 0; // 0 at the thread, 1 at the cell
    let col: string = C.signal;
    let show = e > 0.3;
    if (tLock !== null && t >= tLock) {
      const a = turn(i) as number;
      const d = doneAt(i) as number;
      if (t < a) {
        col = C.warn;
        q = 0;
      } else if (t < d) q = prog(ctx, a, step * 0.8);
      else {
        show = false;
        col = C.ok;
      }
    } else if (tStart !== null && t >= tStart) {
      q = prog(ctx, tStart, travel, (x) => x * x);
      if (tImpact !== null && t >= tImpact) {
        if (i === n - 1) q = 1;
        else {
          // the lost writes rebound and fade (dashed crit ghosts stay in the bar)
          const r = prog(ctx, tImpact, f24(ctx, 8));
          q = 1 - 0.5 * r;
          col = C.crit;
          show = r < 0.98;
        }
      }
    }
    if (tImpact !== null && t >= tImpact && tLock === null && i === n - 1) col = C.crit;
    if (show) {
      const px = x0 + (ax[i] - x0) * q;
      const py = y0 + (topY - y0) * q;
      dots.push(<Dot key={`d${i}`} x={px} y={py} r={13} color={col} k={q > 0.05 ? 1.2 : 0.8} />);
    }
  });

  // level bar segments
  const seg = (j: number) => {
    const x = segX(j);
    const y = barY;
    const h = Math.round(ch * 0.28);
    const track = <rect key={`t${j}`} x={x} y={y} width={segW} height={h} rx={8} fill={`${C.ground}CC`} stroke={C.grid} strokeWidth={2} />;
    let fill: React.ReactNode = null;
    if (j === 0) fill = <rect key={`f${j}`} x={x + 3} y={y + 3} width={segW - 6} height={h - 6} rx={6} fill={C.ink2} fillOpacity={0.85 * ent} />;
    else if (tLock !== null && t >= tLock) {
      const tf = tLock + j * step;
      const k = prog(ctx, tf, P.label);
      const old = tImpact !== null && j === 1 ? 1 - lockK : 0; // the crashed value is reset by the lock
      fill = (
        <g key={`f${j}`}>
          {old > 0 ? <rect x={x + 3} y={y + 3} width={segW - 6} height={h - 6} rx={6} fill={C.crit} fillOpacity={0.9 * old} /> : null}
          {k > 0 ? <rect x={x + 3} y={y + 3} width={segW - 6} height={h - 6} rx={6} fill={C.ok} fillOpacity={0.95 * k} /> : null}
        </g>
      );
    } else if (tImpact !== null && t >= tImpact) {
      const k = prog(ctx, tImpact, P.label);
      if (j === 1) fill = <rect key={`f${j}`} x={x + 3} y={y + 3} width={segW - 6} height={h - 6} rx={6} fill={C.crit} fillOpacity={0.9 * k} />;
      else
        fill = (
          <rect key={`f${j}`} x={x + 3} y={y + 3} width={segW - 6} height={h - 6} rx={6} fill="none" stroke={C.crit} strokeWidth={3} strokeDasharray="7 6" strokeOpacity={(0.35 + 0.65 * impactK) * k} />
        );
    }
    return (
      <g key={`s${j}`}>
        {track}
        {fill}
      </g>
    );
  };

  const capsule = (i: number) => {
    const b = born(ctx, i, 3);
    const e = prog(ctx, b, P.arrive);
    let col: string = C.signal;
    let dim = false;
    if (tLock !== null && t >= tLock) {
      const a = turn(i) as number;
      const d = doneAt(i) as number;
      col = t < a ? C.warn : t < d ? C.signal : C.ok;
      dim = t < a;
    } else if (crashed) col = C.crit;
    return (
      <div
        key={`c${i}`}
        style={{
          position: 'absolute',
          left: xs[i] - capW / 2,
          top: capY,
          width: capW,
          height: capH,
          borderRadius: capH / 2,
          ...acrylic(col, ctx.fx, 0.4 + (crashed ? impactK : 0) + ctx.mod.glow, dim),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: e,
          transform: `translateY(${((1 - e) * 10).toFixed(2)}px)`,
          visibility: t < b ? 'hidden' : undefined,
        }}
      >
        <Lbl id={`${ctx.id}:t${i}`} text={props.threads[i].label} maxW={capW - 60} maxH={capH - 12} size={SIZE.body} fps={ctx.fps} color={dim ? C.ink2 : C.ink} weight={FONT.label.strong} />
      </div>
    );
  };

  const ringPad = 22;
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {wires}
        {lockK > 0 ? <rect x={cx - cw / 2 - ringPad} y={topY - ringPad} width={cw + 2 * ringPad} height={ch + 2 * ringPad} rx={36} fill="none" stroke={C.ok} strokeWidth={4} strokeOpacity={lockK} strokeDasharray={`${(0.4 + 0.6 * lockK) * 2400} 2400`} /> : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: cx - cw / 2 + shakeX,
          top: topY,
          width: cw,
          height: ch,
          borderRadius: 28,
          ...acrylic(cellCol, ctx.fx, 0.35 + impactK + ctx.mod.glow),
          opacity: ent,
        }}
      >
        <div style={{position: 'absolute', left: 0, right: 0, top: ch * 0.1, display: 'flex', justifyContent: 'center'}}>
          <Lbl id={`${ctx.id}:shared`} text={props.shared} maxW={cw - 160} maxH={ch * 0.3} size={SIZE.sub} fps={ctx.fps} weight={FONT.label.strong} />
        </div>
        {impactK > 0 ? <div style={{position: 'absolute', inset: 0, borderRadius: 28, background: `radial-gradient(closest-side, ${C.crit}${hex(0.28 * impactK)}, transparent)`}} /> : null}
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: shakeX ? `translateX(${shakeX}px)` : undefined}}>
        {Array.from({length: S}, (_, j) => seg(j))}
        {lockK > 0 ? <Padlock x={cx + cw / 2 - 44} y={topY + 52} s={64} color={C.ok} shut={clamp01(lockK)} /> : null}
      </svg>
      {props.threads.map((_, i) => capsule(i))}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {dots}
      </svg>
    </div>
  );
};

export const RaceCondition: DcComponent<Props> = {name: 'RaceCondition', Component: RaceConditionView, text: true, slot: 'full'};
