// RaceCondition (catalog: Domain specials; 04 section 6 "Backend depth": race condition = two hands on one counter; lost update ->
// lock / atomic). 2-4 thread capsules (labels from props, thread 1 on the right) each send a HAND down to ONE shared counter
// cell (label from props). The counter is a segmented level bar (no digits: the counts are structural, the narration's numbers
// belong to a NumberCounter). Each hand carries the snapshot it READ (one small segment on the palm).
//   idle    -> the hands hover over the counter, all holding the same read value; the bar shows one segment.
//   collide -> all hands drop on the SAME segment on the same frame and clash: crit shock ring + flash + one failure shake
//              (04 section 3.5); the bar rises by ONE segment only, the other writes rebound and stay as dashed crit "lost"
//              segments marked with a cross (the lost update).
//   lock    -> a lock ring closes around the counter and the hands go one at a time (waiting = warn, in turn = signal, done =
//              ok): every write lands on its own segment, the bar rises one segment per thread (serialised).
// DOM + SVG only (standard tier, no filter); every anchored motion eases through revealProgress (RV1).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Lbl, Wire, acrylic, acts, born, boxStyle, clamp01, f24, mix, pf, prog, pulse, shake, shell, Floor} from '../_dom-c/kit';

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

/** Open hand, palm down, fingers pointing down (line-art acrylic: ground fill, emissive outline). `(x, y)` = palm centre, `s` = size.
 * `snap` = the read value carried on the palm (colour); `side` = +1 puts the thumb on the right. */
const Hand: React.FC<{x: number; y: number; s: number; color: string; snap: string; side: 1 | -1; alpha: number; glow: number}> = ({x, y, s, color, snap, side, alpha, glow}) => {
  const sw = Math.max(3, s * 0.03);
  const fl = [0.5, 0.6, 0.55, 0.44];
  const fx = [-0.21, -0.07, 0.07, 0.21];
  const fw = 0.125;
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} opacity={alpha}>
      <ellipse cx={0} cy={s * 0.1} rx={s * 0.62} ry={s * 0.62} fill={color} fillOpacity={0.05 + 0.1 * glow} />
      <ellipse cx={0} cy={s * 0.1} rx={s * 0.4} ry={s * 0.42} fill={color} fillOpacity={0.07 + 0.12 * glow} />
      <rect x={-s * 0.2} y={-s * 0.78} width={s * 0.4} height={s * 0.4} rx={s * 0.06} fill={C.ground} stroke={color} strokeWidth={sw} strokeOpacity={0.7} />
      {fx.map((u, i) => (
        <rect key={`f${i}`} x={(u - fw / 2) * s} y={s * (0.02 + 0.0)} width={fw * s} height={fl[i] * s} rx={fw * s * 0.5} fill={C.ground} stroke={color} strokeWidth={sw} />
      ))}
      <rect x={side * s * 0.34 - s * 0.075} y={-s * 0.3} width={s * 0.15} height={s * 0.38} rx={s * 0.075} fill={C.ground} stroke={color} strokeWidth={sw} transform={`rotate(${side * -25} ${side * s * 0.34} ${-s * 0.11})`} />
      <rect x={-s * 0.3} y={-s * 0.42} width={s * 0.6} height={s * 0.5} rx={s * 0.12} fill={C.ground} stroke={color} strokeWidth={sw} />
      <rect x={-s * 0.14} y={-s * 0.26} width={s * 0.28} height={s * 0.14} rx={s * 0.04} fill={snap} fillOpacity={0.95} />
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
  const spacing = Math.min((W * 0.94) / n, 640);
  const capW = Math.min(spacing * 0.82, 480);
  const capH = Math.round(Math.min(H * 0.13, 130));
  const capY = Math.round(H * 0.03);
  const xs = props.threads.map((_, i) => W / 2 + ((n - 1) / 2 - i) * spacing);
  const cw = Math.min(W * 0.76, 1240);
  const ch = Math.round(H * 0.38);
  const cx = W / 2;
  const topY = Math.round(H * 0.56);
  const hs = Math.round(Math.min(H * 0.2, (cw / (n + 1)) * 0.9, 190)); // hand size
  const S = n + 1;
  const segW = Math.min(250, (cw * 0.9) / S - 14);
  const gap = 14;
  const barW = S * (segW + gap) - gap;
  const barY = topY + Math.round(ch * 0.15);
  const barH = Math.round(ch * 0.4);
  const segX = (j: number) => cx + barW / 2 - (j + 1) * segW - j * gap; // segment 0 on the start (right) side
  const segC = (j: number) => segX(j) + segW / 2;
  const {tImpact, tStart, tLock, travel, step} = tl;
  const ent = prog(ctx, ctx.at, P.arrive);
  const retreat = f24(ctx, 8);
  const turn = (i: number) => (tLock === null ? null : tLock + retreat + i * step);
  const fillAt = (i: number) => (turn(i) as number) + Math.round(step * 0.6);
  const shakeX = shake(`race-${ctx.id}`, t, tImpact, f24(ctx, 6), 7);
  const impactK = tImpact !== null && t >= tImpact ? pulse(t, tImpact, f24(ctx, 10)) : 0;
  const lockK = tLock !== null ? prog(ctx, tLock, P.impact) : 0;
  const crashed = tImpact !== null && t >= tImpact && (tLock === null || t < tLock);
  const cellCol = crashed ? C.crit : lockK > 0 ? mix(C.signal, C.ok, lockK) : C.signal;
  const lerp = (a: [number, number], b: [number, number], q: number): [number, number] => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  // hand poses (palm centre). hover: above the counter over its own spot; hit(j): fingertips on segment j.
  const hover = (i: number): [number, number] => [cx + ((n - 1) / 2 - i) * (cw * 0.62 / Math.max(1, n - 1)) * (n > 1 ? 1 : 0), topY - hs * 0.95];
  const hit = (i: number, j: number, spread: number): [number, number] => [segC(j) + ((n - 1) / 2 - i) * spread, barY - hs * 0.42];
  const rebound = (i: number): [number, number] => lerp(hit(i, 1, hs * 0.3), hover(i), 0.55);

  const wires: React.ReactNode[] = [];
  const hands: React.ReactNode[] = [];
  const shadows: React.ReactNode[] = [];
  const hitPt = hit(0, 1, 0);
  props.threads.forEach((_, i) => {
    const e = prog(ctx, born(ctx, i, 3), P.arrive);
    let pos = hover(i);
    let col: string = C.signal;
    let snap: string = C.ink2;
    let alpha = e;
    let near = 0; // proximity to the counter (contact shadow)
    if (tImpact !== null && tStart !== null && t >= tStart && (tLock === null || t < tLock + retreat)) {
      // collide phase (and the retreat at the start of the lock)
      const q = prog(ctx, tStart, travel, (x) => x * x);
      const h1 = hit(i, 1, hs * 0.3);
      if (t < tImpact) pos = lerp(hover(i), h1, q);
      else {
        const r = prog(ctx, tImpact, f24(ctx, 8));
        const win = i === 0;
        const end = win ? h1 : rebound(i);
        pos = lerp(h1, end, win ? 0 : r);
        col = C.crit;
        snap = C.crit;
        alpha = e * (win ? 1 : 1 - 0.45 * r);
        if (tLock !== null && t >= tLock) pos = lerp(end, hover(i), prog(ctx, tLock, retreat));
      }
      near = t < tImpact ? q : tLock !== null && t >= tLock ? 1 - prog(ctx, tLock, retreat) : 1;
    }
    if (tLock !== null && t >= tLock + retreat) {
      const a = turn(i) as number;
      const f = fillAt(i);
      const m = prog(ctx, a, Math.round(step * 0.7));
      const home = prog(ctx, f + 2, f24(ctx, 6));
      const tgt = hit(i, i + 1, 0);
      if (t < a) {
        col = C.warn;
        snap = C.warn;
        alpha = e * 0.55;
      } else if (t < f + 2) {
        col = C.signal;
        snap = C.signal;
        pos = lerp(hover(i), tgt, m);
        near = m;
      } else {
        col = C.ok;
        snap = C.ok;
        pos = lerp(tgt, hover(i), home);
        near = 1 - home;
        alpha = e * (1 - 0.35 * home);
      }
    } else if (tLock !== null && t >= tLock && tImpact === null) {
      col = C.warn;
      snap = C.warn;
      alpha = e * 0.55;
    }
    // idle drift: a hover that is exactly still reads as a frozen frame; the sway is a pure function of the frame
    if (near === 0) pos = [pos[0], pos[1] + Math.sin((t + i * 7) * 0.16) * 3];
    const [px, py] = pos;
    if (e > 0.02) {
      const x0 = xs[i];
      const y0 = capY + capH;
      const d = (py - hs * 0.72 - y0) * 0.5;
      wires.push(<Wire key={`w${i}`} d={`M ${x0} ${y0} C ${x0} ${y0 + d} ${px} ${py - hs * 0.72 - d} ${px} ${py - hs * 0.72}`} color={col} w={3} opacity={e * 0.7} />);
      hands.push(<Hand key={`h${i}`} x={px} y={py} s={hs} color={col} snap={snap} side={px < cx ? 1 : -1} alpha={clamp01(alpha)} glow={Math.max(near, impactK)} />);
      shadows.push(<ellipse key={`sh${i}`} cx={px} cy={barY - 4} rx={hs * (0.55 - 0.2 * near)} ry={hs * 0.1} fill={C.void} fillOpacity={0.55 * (0.3 + 0.7 * near) * e} />);
    }
  });

  // level bar segments
  const seg = (j: number) => {
    const x = segX(j);
    const y = barY;
    const h = barH;
    const track = <rect key={`t${j}`} x={x} y={y} width={segW} height={h} rx={10} fill={`${C.ground}CC`} stroke={C.grid} strokeWidth={2} />;
    const inner = {x: x + 4, y: y + 4, width: segW - 8, height: h - 8, rx: 7};
    let fill: React.ReactNode = null;
    if (j === 0) fill = <rect key={`f${j}`} {...inner} fill={C.ink2} fillOpacity={0.85 * ent} />;
    else if (tLock !== null && t >= tLock) {
      const k = t >= tLock + retreat ? prog(ctx, fillAt(j - 1), P.label) : 0;
      const old = tImpact !== null && j === 1 ? 1 - lockK : 0; // the crashed value is reset by the lock
      fill = (
        <g key={`f${j}`}>
          {old > 0 ? <rect {...inner} fill={C.crit} fillOpacity={0.9 * old} /> : null}
          {k > 0 ? <rect {...inner} fill={C.ok} fillOpacity={0.95 * k} /> : null}
        </g>
      );
    } else if (tImpact !== null && t >= tImpact) {
      const k = prog(ctx, tImpact, P.label);
      if (j === 1) fill = <rect key={`f${j}`} {...inner} fill={C.crit} fillOpacity={0.9 * k} />;
      else {
        const mx = x + segW / 2;
        const my = y + h / 2;
        const r = Math.min(segW, h) * 0.18;
        fill = (
          <g key={`f${j}`} opacity={(0.4 + 0.6 * impactK) * k}>
            <rect {...inner} fill="none" stroke={C.crit} strokeWidth={3} strokeDasharray="8 7" />
            <path d={`M ${mx - r} ${my - r} L ${mx + r} ${my + r} M ${mx + r} ${my - r} L ${mx - r} ${my + r}`} stroke={C.crit} strokeWidth={4} strokeLinecap="round" />
          </g>
        );
      }
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
    if (tLock !== null && t >= tLock + retreat) {
      const a = turn(i) as number;
      const f = fillAt(i) + 2;
      col = t < a ? C.warn : t < f ? C.signal : C.ok;
      dim = t < a;
    } else if (crashed || (tLock !== null && t >= tLock && tImpact !== null)) col = tLock !== null && t >= tLock ? C.warn : C.crit;
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

  const ringPad = 24;
  const shockR = tImpact !== null && t >= tImpact ? prog(ctx, tImpact, f24(ctx, 12)) : 0;
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`rc-${ctx.id}`} w={W} h={H} y={H * 0.62} color={crashed ? C.crit : lockK > 0 ? C.ok : C.signal} pool={0.12 + 0.1 * impactK} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {lockK > 0 ? <rect x={cx - cw / 2 - ringPad} y={topY - ringPad} width={cw + 2 * ringPad} height={ch + 2 * ringPad} rx={40} fill="none" stroke={C.ok} strokeOpacity={0.35} strokeWidth={14} pathLength={1} strokeDasharray={`${lockK.toFixed(4)} 1`} /> : null}
        {lockK > 0 ? <rect x={cx - cw / 2 - ringPad} y={topY - ringPad} width={cw + 2 * ringPad} height={ch + 2 * ringPad} rx={40} fill="none" stroke={C.ok} strokeWidth={4} pathLength={1} strokeDasharray={`${lockK.toFixed(4)} 1`} /> : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: cx - cw / 2 + shakeX,
          top: topY,
          width: cw,
          height: ch,
          borderRadius: 30,
          ...acrylic(cellCol, ctx.fx, 0.35 + impactK + ctx.mod.glow),
          opacity: ent,
        }}
      >
        <div style={{position: 'absolute', left: 0, right: 0, bottom: ch * 0.1, display: 'flex', justifyContent: 'center'}}>
          <Lbl id={`${ctx.id}:shared`} text={props.shared} maxW={cw - 180} maxH={ch * 0.3} size={SIZE.sub} fps={ctx.fps} weight={FONT.label.strong} />
        </div>
        {impactK > 0 ? <div style={{position: 'absolute', inset: 0, borderRadius: 30, background: `radial-gradient(closest-side at ${(((segC(1) - (cx - cw / 2)) / cw) * 100).toFixed(1)}% 30%, ${C.crit}${hex(0.34 * impactK)}, transparent)`}} /> : null}
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: shakeX ? `translateX(${shakeX}px)` : undefined}}>
        {Array.from({length: S}, (_, j) => seg(j))}
        {lockK > 0 ? <Padlock x={cx + cw / 2 - 52} y={topY + ch - 72} s={64} color={C.ok} shut={clamp01(lockK)} /> : null}
      </svg>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {wires}
        {shadows}
        {shockR > 0 && shockR < 1 ? <circle cx={hitPt[0]} cy={barY} r={hs * (0.4 + 1.5 * shockR)} fill="none" stroke={C.crit} strokeWidth={5 * (1 - shockR) + 1} strokeOpacity={1 - shockR} /> : null}
        {hands}
      </svg>
      {props.threads.map((_, i) => capsule(i))}
    </div>
  );
};

export const RaceCondition: DcComponent<Props> = {name: 'RaceCondition', Component: RaceConditionView, text: true, slot: 'full'};
