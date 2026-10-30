// BranchPaths (catalog: Domain specials; 04 section 6 "Evidence, portfolio, branches": branches as lit paths). A question sits on a
// lit acrylic plate at the top (whole phrase, wrapped on word boundaries, RTL wipe on the layer anchor) and forks at an emissive
// node into 2-4 paths (branch 1 on the right, RTL). Every path curves down to a branch chip (label) and drops on to an outcome
// plate. The paths draw one after another from the layer anchor (stagger 4 film frames); each outcome arrives 6 film frames after
// its path and is tinted by its status (ok / warn / fail, with a status badge; idle / active stay neutral).
//   choose {index} -> on the word the chosen path lights (signal, a token runs fork -> chip -> outcome), the other branches dim and
//                     recede, and the chosen outcome flashes its status when the token lands (fail = crit with the one allowed
//                     failure shake, 04 section 3.5).
// Light per ADR-003 LK-F (acrylic plates with specular edge, extruded side and contact shadow; receding floor with a light pool).
// Labels are whole elements (MixedText), auto-fitted (28 px floor). No digits. DOM + SVG only, no filter, no WebGL: hero = standard.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Floor, Lbl, Wire, acrylic, acts, bez, boxStyle, f24, mix, pf, prog, pulse, shake, shell, statusColor, type StatusT} from '../_dom-c/kit';

const PATH_F24 = 4; // path stagger
const OUT_F24 = 6; // outcome after its path
const RUN_F24 = 14; // token run fork -> outcome

type Pt = [number, number];
const curveLen = (p0: Pt, p1: Pt, p2: Pt, p3: Pt): number => {
  let s = 0;
  let prev = p0;
  for (let i = 1; i <= 16; i++) {
    const p = bez(p0, p1, p2, p3, i / 16);
    s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return s;
};
const shown = (s?: StatusT): s is 'ok' | 'warn' | 'fail' => s === 'ok' || s === 'warn' || s === 'fail';

export const BranchPathsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.branches.length;
  const W = ctx.box.w;
  const H = ctx.box.h;
  const choose = acts(ctx, 'choose')[0];
  const pick = choose ? Math.min(n - 1, choose.props.index as number) : null;
  const tPick = choose ? choose.at : null;
  const colW = Math.min(W / n, 540);
  const bx = props.branches.map((_, i) => W / 2 + ((n - 1) / 2 - i) * colW); // RTL: branch 1 on the right
  const qW = Math.round(Math.min(W * 0.78, 1300));
  const qH = Math.round(H * 0.19);
  const qY = Math.round(H * 0.02);
  const forkY = qY + qH + H * 0.07;
  const chipY = H * 0.5;
  const outY = H * 0.78;
  const chipW = Math.round(Math.min(colW * 0.86, 460));
  const chipH = Math.round(Math.min(H * 0.1, 96));
  const outW = chipW;
  const outH = Math.round(Math.min(H * 0.17, 150));
  const ent = prog(ctx, ctx.at, P.arrive);
  const dimK = tPick !== null ? prog(ctx, tPick, P.morph) : 0;
  const runF = f24(ctx, RUN_F24);
  const landAt = tPick !== null ? tPick + runF - 1 : null;
  const bT = (i: number) => ctx.at + Math.round((PATH_F24 * (i + 1) * ctx.fps) / 24);
  const p0: Pt = [W / 2, forkY];
  const midY = (forkY + chipY) / 2;
  const paths: React.ReactNode[] = [];
  const nodes: React.ReactNode[] = [];
  const marks: React.ReactNode[] = [];
  const tokens: React.ReactNode[] = [];
  props.branches.forEach((b, i) => {
    const chosen = pick === i;
    const lit = chosen && tPick !== null && t >= tPick;
    const faded = pick !== null && !chosen ? dimK : 0;
    const c1: Pt = [W / 2, midY];
    const c2: Pt = [bx[i], midY];
    const p3: Pt = [bx[i], chipY - chipH / 2];
    const len1 = curveLen(p0, c1, c2, p3) + 4;
    const yOutTop = outY - outH / 2;
    const d1 = `M ${p0[0]} ${p0[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p3[0]} ${p3[1]}`;
    const d2 = `M ${bx[i]} ${chipY + chipH / 2} L ${bx[i]} ${yOutTop}`;
    const op = 1 - 0.6 * faded;
    const draw1 = prog(ctx, bT(i), P.morph);
    const draw2 = prog(ctx, bT(i) + f24(ctx, PATH_F24), P.morph);
    paths.push(<Wire key={`a${i}`} d={d1} color={C.grid} w={3} draw={draw1} len={len1} opacity={op} />);
    paths.push(<Wire key={`b${i}`} d={d2} color={C.grid} w={3} draw={draw2} len={yOutTop - chipY - chipH / 2 + 4} opacity={op} />);
    let q = 0;
    if (lit) {
      // the chosen path lights behind the token: the curve over the first 60 % of the run, the drop over the rest
      q = prog(ctx, tPick as number, runF, (x) => x);
      const s = 0.6;
      paths.push(<Wire key={`la${i}`} d={d1} color={C.signal} w={5} draw={Math.min(1, q / s)} len={len1} />);
      if (q > s) paths.push(<Wire key={`lb${i}`} d={d2} color={landAt !== null && t >= landAt && shown(b.status) ? statusColor(b.status) : C.signal} w={5} draw={(q - s) / (1 - s)} len={yOutTop - chipY - chipH / 2 + 4} />);
      if (q < 0.999) {
        const pos: Pt = q < s ? bez(p0, c1, c2, p3, q / s) : [bx[i], chipY + chipH / 2 + ((q - s) / (1 - s)) * (yOutTop - chipY - chipH / 2)];
        tokens.push(<Dot key={`tk${i}`} x={pos[0]} y={pos[1]} r={11} color={C.signal} k={1.3} />);
      }
    }
    // branch chip
    const be = prog(ctx, bT(i), P.label);
    const chipCol = lit ? C.signal : C.ink3;
    nodes.push(
      <div
        key={`c${i}`}
        style={{
          position: 'absolute',
          left: bx[i] - chipW / 2,
          top: chipY - chipH / 2,
          width: chipW,
          height: chipH,
          borderRadius: chipH / 2,
          ...acrylic(chipCol, ctx.fx, lit ? 0.8 + ctx.mod.glow : 0.25, !lit),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: be * (1 - 0.55 * faded),
          transform: `translateY(${((1 - be) * 6).toFixed(2)}px)`,
          visibility: t < bT(i) ? 'hidden' : undefined,
        }}
      >
        <Lbl id={`${ctx.id}:b${i}`} text={b.label} maxW={chipW - 40} maxH={chipH - 12} size={SIZE.body} fps={ctx.fps} color={lit ? C.ink : C.ink2} weight={FONT.label.strong} />
      </div>,
    );
    // outcome plate: status tint on arrival; the chosen one flashes (and a fail shakes) when the token lands
    const outAt = bT(i) + f24(ctx, OUT_F24);
    const oe = prog(ctx, outAt, P.label);
    const st = shown(b.status) ? b.status : null;
    const landed = chosen && landAt !== null && t >= landAt;
    const flash = landed ? pulse(t, landAt as number, f24(ctx, 8)) : 0;
    const dx = landed && st === 'fail' ? shake(`bp-${ctx.id}-${i}`, t, landAt, f24(ctx, 5), 5) : 0;
    const oc = st ? statusColor(st) : lit ? C.signal : C.ink3;
    const ocShown = st && !landed ? mix(oc, C.ink3, 0.35) : oc;
    nodes.push(
      <div
        key={`o${i}`}
        style={{
          position: 'absolute',
          left: bx[i] - outW / 2 + dx,
          top: yOutTop,
          width: outW,
          height: outH,
          borderRadius: 22,
          ...acrylic(ocShown, ctx.fx, 0.3 + 0.9 * flash + (landed ? 0.45 + ctx.mod.glow : 0), !st && !lit),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: oe * (1 - 0.55 * faded),
          transform: `translateY(${((1 - oe) * 8).toFixed(2)}px)`,
          visibility: t < outAt ? 'hidden' : undefined,
        }}
      >
        <Lbl id={`${ctx.id}:o${i}`} text={b.outcome} maxW={outW - 48} maxH={outH - 24} size={SIZE.label} wrap fps={ctx.fps} color={st || lit ? C.ink : C.ink2} weight={FONT.label.strong} />
      </div>,
    );
    if (st && t >= outAt) {
      const bq = landed ? prog(ctx, landAt as number, P.impact) : oe;
      const x = bx[i] + outW / 2 - 4 + dx;
      const y = yOutTop - 2;
      const sw = {fill: 'none', stroke: oc, strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
      const glyph = st === 'ok' ? <path d="M -11 1 L -3 9 L 12 -9" {...sw} /> : st === 'fail' ? <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" {...sw} /> : <path d="M 0 -12 L 0 3 M 0 11 L 0 11.5" {...sw} />;
      marks.push(
        <g key={`m${i}`} opacity={bq * (1 - 0.55 * faded)} transform={`translate(${x} ${y}) scale(${(0.7 + 0.3 * bq).toFixed(3)})`}>
          <circle r={30} fill={C.void} fillOpacity={0.9} />
          <circle r={26} fill={oc} fillOpacity={0.18} stroke={oc} strokeWidth={4} />
          {glyph}
        </g>,
      );
    }
  });
  const forkLit = tPick !== null && t >= tPick;
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`bp-${ctx.id}`} w={W} h={H} y={outY - outH * 0.1} color={C.signal} pool={0.09} opacity={ent} />
      <div
        style={{
          position: 'absolute',
          left: W / 2 - qW / 2,
          top: qY,
          width: qW,
          height: qH,
          borderRadius: 26,
          ...acrylic(C.signal, ctx.fx, 0.35 + ctx.mod.glow),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: ent,
        }}
      >
        <Lbl id={`${ctx.id}:q`} text={props.question} maxW={qW - 72} maxH={qH - 20} size={SIZE.sub} wrap fps={ctx.fps} t={t - ctx.at} preset="arrive" color={C.ink} />
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <Wire d={`M ${W / 2} ${qY + qH} L ${W / 2} ${forkY}`} color={forkLit ? C.signal : C.grid} w={3} draw={ent} len={forkY - qY - qH + 2} />
        {paths}
        <Dot x={W / 2} y={forkY} r={10} color={forkLit ? C.signal : C.ink2} k={forkLit ? 1.2 + pulse(t, tPick as number, f24(ctx, 8)) : 0.6} opacity={ent} />
      </svg>
      {nodes}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {marks}
        {tokens}
      </svg>
    </div>
  );
};

export const BranchPaths: DcComponent<Props> = {name: 'BranchPaths', Component: BranchPathsView, text: true, slot: 'full'};
