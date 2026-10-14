// BranchPaths (catalog: Domain specials; 04 section 6 "Evidence, portfolio, branches": six career branches as lit paths). A question
// (whole phrase at the top, wrapped on word boundaries) forks into 2-4 paths (branch 1 on the right). Every path leaves the question
// as a curve, passes a branch label chip, and ends in an outcome node. The paths are drawn one after another from the layer anchor
// (stagger 4 film frames, grey = not chosen yet); the status of a branch tints its outcome node (ok / warn / fail; idle / active keep
// the neutral colour) once the outcome is revealed.
//   choose {index} -> the path of that branch lights up (signal, a pulse travels it), the others dim and recede, and the outcome of
//                     the chosen branch takes its status colour with a glow (ok = ok, fail = crit with one failure shake, 04 section 3.5).
// DOM + SVG only (standard tier). Labels are whole elements, auto-fitted (28 px floor).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Lbl, Wire, acrylic, acts, bez, boxStyle, f24, mix, pf, prog, pulse, shake, shell, statusColor} from '../_dom-c/kit';

export const BranchPathsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.branches.length;
  const W = ctx.box.w;
  const H = ctx.box.h;
  const choose = acts(ctx, 'choose')[0];
  const pick = choose ? Math.min(n - 1, choose.props.index as number) : null;
  const colW = Math.min(W / n, 520);
  const bx = props.branches.map((_, i) => W / 2 + ((n - 1) / 2 - i) * colW);
  const qW = Math.min(W * 0.8, 1300);
  const qY = H * 0.02;
  const qH = H * 0.2;
  const forkY = qY + qH + H * 0.03;
  const chipY = H * 0.45;
  const outY = H * 0.74;
  const chipW = Math.min(colW * 0.86, 440);
  const chipH = Math.round(Math.min(H * 0.1, 96));
  const outW = chipW;
  const outH = Math.round(Math.min(H * 0.17, 150));
  const ent = prog(ctx, ctx.at, P.arrive);
  const tPick = choose ? choose.at : null;
  const dimK = tPick !== null ? prog(ctx, tPick, P.morph) : 0;
  const bT = (i: number) => ctx.at + Math.round((4 * (i + 1) * ctx.fps) / 24);
  const paths: React.ReactNode[] = [];
  const nodes: React.ReactNode[] = [];
  const tokens: React.ReactNode[] = [];
  props.branches.forEach((b, i) => {
    const draw = prog(ctx, bT(i), P.morph);
    const chosen = pick === i;
    const lit = chosen && tPick !== null && t >= tPick;
    const faded = pick !== null && !chosen ? dimK : 0;
    const col = lit ? C.signal : C.ink3;
    const p0: [number, number] = [W / 2, forkY];
    const p1: [number, number] = [W / 2, chipY - chipH / 2 - 20];
    const p2: [number, number] = [bx[i], forkY + (chipY - forkY) * 0.5];
    const p3: [number, number] = [bx[i], chipY - chipH / 2];
    const d1 = `M ${p0[0]} ${p0[1]} C ${p0[0]} ${(forkY + chipY) / 2} ${bx[i]} ${(forkY + chipY) / 2} ${p3[0]} ${p3[1]}`;
    void p1;
    void p2;
    const d2 = `M ${bx[i]} ${chipY + chipH / 2} L ${bx[i]} ${outY - outH / 2}`;
    const op = (1 - 0.65 * faded) * (draw > 0 ? 1 : 0);
    paths.push(<Wire key={`a${i}`} d={d1} color={lit ? C.signal : C.grid} w={lit ? 5 : 3} draw={draw} len={900} opacity={op} />);
    paths.push(<Wire key={`b${i}`} d={d2} color={lit ? C.signal : C.grid} w={lit ? 5 : 3} draw={prog(ctx, bT(i) + f24(ctx, 4), P.morph)} len={H} opacity={op} />);
    if (lit) {
      const q = prog(ctx, tPick as number, f24(ctx, 14), (x) => x);
      if (q < 0.999) {
        const pos = q < 0.55 ? bez(p0, [p0[0], (forkY + chipY) / 2], [bx[i], (forkY + chipY) / 2], p3, q / 0.55) : [bx[i], p3[1] + ((q - 0.55) / 0.45) * (outY - outH / 2 - p3[1])];
        tokens.push(<Dot key={`tk${i}`} x={pos[0]} y={pos[1]} r={11} color={C.signal} k={1.3} />);
      }
    }
    // branch chip
    const be = prog(ctx, bT(i), P.label);
    const stc = statusColor(b.status);
    const outAt = tPick !== null && chosen ? tPick + f24(ctx, 8) : bT(i) + f24(ctx, 6);
    const oe = prog(ctx, outAt, P.label);
    const showStatus = b.status !== undefined && b.status !== 'idle' && b.status !== 'active' && (pick === null || chosen);
    const oc = showStatus ? stc : lit ? C.signal : C.ink3;
    const land = chosen && tPick !== null ? pulse(t, outAt, f24(ctx, 8)) : 0;
    const dx = chosen && b.status === 'fail' && tPick !== null ? shake(`bp-${ctx.id}`, t, outAt, f24(ctx, 5), 5) : 0;
    nodes.push(
      <div
        key={`c${i}`}
        style={{position: 'absolute', left: bx[i] - chipW / 2, top: chipY - chipH / 2, width: chipW, height: chipH, borderRadius: chipH / 2, ...acrylic(lit ? C.signal : C.ink3, ctx.fx, lit ? 0.9 : 0.25, !lit), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: be * (1 - 0.55 * faded), transform: `translateY(${((1 - be) * 6).toFixed(2)}px)`, visibility: t < bT(i) ? 'hidden' : undefined}}
      >
        <Lbl id={`${ctx.id}:b${i}`} text={b.label} maxW={chipW - 40} maxH={chipH - 12} size={SIZE.body} fps={ctx.fps} color={lit ? C.ink : C.ink2} weight={FONT.label.strong} />
      </div>,
    );
    nodes.push(
      <div
        key={`o${i}`}
        style={{position: 'absolute', left: bx[i] - outW / 2 + dx, top: outY - outH / 2, width: outW, height: outH, borderRadius: 24, ...acrylic(oc, ctx.fx, 0.25 + 0.8 * land + (showStatus ? 0.4 : 0), !showStatus && !lit), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: oe * (1 - 0.55 * faded), transform: `translateY(${((1 - oe) * 8).toFixed(2)}px)`, visibility: t < outAt ? 'hidden' : undefined}}
      >
        <Lbl id={`${ctx.id}:o${i}`} text={b.outcome} maxW={outW - 44} maxH={outH - 20} size={SIZE.label} wrap fps={ctx.fps} color={showStatus || lit ? C.ink : C.ink2} weight={FONT.label.strong} />
      </div>,
    );
    void col;
    void mix;
  });
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <div style={{position: 'absolute', left: W / 2 - qW / 2, top: qY, width: qW, height: qH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ent}}>
        <Lbl id={`${ctx.id}:q`} text={props.question} maxW={qW} maxH={qH} size={SIZE.sub} wrap fps={ctx.fps} t={t - ctx.at} preset="arrive" color={C.ink} weight={FONT.arDisplay.weight} />
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <circle cx={W / 2} cy={forkY} r={9} fill={C.ink2} opacity={ent} />
        {paths}
      </svg>
      {nodes}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{tokens}</svg>
    </div>
  );
};
export const BranchPaths: DcComponent<Props> = {name: 'BranchPaths', Component: BranchPathsView, text: true, slot: 'full'};
