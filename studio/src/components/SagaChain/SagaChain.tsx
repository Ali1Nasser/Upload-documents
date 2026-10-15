// SagaChain (catalog: Domain specials; 04 section 6 "Backend depth": saga = chain of compensations; failed step ->
// compensation). Steps sit on one RTL row (step 1 on the right) as acrylic nodes joined by emissive forward wires; the saga
// runs forward from the layer anchor, one step every 8 film frames, each step settling to `ok`.
//   fail {at: i}   -> step i is the one in flight on that word: it flashes `crit` with a failure shake (04 section 3.5: the
//                     only allowed hard motion); later steps stay idle and dim.
//   compensate     -> compensations run BACKWARDS (newest completed step first): each compensation chip arrives under its
//                     step on the label preset, a `warn` return wire draws left -> right, and the step it undoes greys out.
// Labels are whole elements (MixedText), auto-fitted to their node (28 px floor). DOM + SVG only (standard tier; no WebGL).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Floor, Lbl, Wire, acrylic, acts, born, boxStyle, f24, mix, pf, prog, pulse, shake, shell} from '../_dom-c/kit';

const STEP_F24 = 8; // forward rhythm: one step every 8 film frames (333 ms)
const COMP_F24 = 8; // compensation rhythm

type State = {startAt: number[]; doneAt: number[]; failIdx: number | null; failAt: number | null; compAt: (number | null)[]};
/** Forward run: step 0 is in flight from the layer anchor and each step completes STEP_F24 film frames after it started; the
 * next step starts when the previous one completes. A `fail` pins step `at` as the failing one: the steps before it complete
 * (compressed if needed) before the failure frame, the failing step flashes crit on its anchor, later steps never start. */
export const sagaTimeline = (p: Props, ctx: LayerCtx): State => {
  const n = p.steps.length;
  const fail = acts(ctx, 'fail')[0];
  const failIdx = fail ? Math.min(n - 1, fail.props.at as number) : null;
  const failAt = fail ? fail.at : null;
  const step = f24(ctx, STEP_F24);
  const doneAt = p.steps.map((_, k) => {
    const base = ctx.at + (k + 1) * step;
    if (failIdx === null || failAt === null) return base;
    if (k >= failIdx) return Infinity;
    return Math.max(ctx.at + k + 1, Math.min(base, failAt - f24(ctx, 2) * (failIdx - k)));
  });
  const startAt = p.steps.map((_, k) => (k === 0 ? ctx.at : doneAt[k - 1]));
  const comp = acts(ctx, 'compensate')[0];
  const last = failIdx === null ? n - 1 : failIdx - 1; // compensate the completed steps, newest first
  const compAt = p.steps.map((_, k) => (comp && k <= last ? comp.at + f24(ctx, COMP_F24) * (last - k) : null));
  return {startAt, doneAt, failIdx, failAt, compAt};
};

export const SagaChainView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const n = props.steps.length;
  const P = pf(ctx);
  const tl = sagaTimeline(props, ctx);
  const cellW = ctx.box.w / n;
  const nodeW = Math.round(Math.min(cellW * 0.8, 330));
  const nodeH = Math.round(Math.min(ctx.box.h * 0.22, n <= 5 ? 190 : 200));
  const yNode = Math.round(ctx.box.h * 0.38);
  const yComp = Math.round(ctx.box.h * 0.74);
  const compH = Math.round(Math.min(ctx.box.h * 0.1, 96));
  const stepSize = n <= 4 ? SIZE.body : SIZE.label;
  const cx = (k: number) => ctx.box.w - (k + 0.5) * cellW; // RTL: step 1 on the right
  const failedAt = (k: number) => (tl.failIdx === k && tl.failAt !== null && t >= tl.failAt ? tl.failAt : null);
  const node = (k: number) => {
    const b = born(ctx, k, 2);
    const ent = prog(ctx, b, P.arrive);
    const done = t >= tl.doneAt[k];
    const qDone = done ? prog(ctx, tl.doneAt[k], P.label) : 0;
    const fAt = failedAt(k);
    const failed = fAt !== null;
    const inFlight = !done && !failed && t >= tl.startAt[k];
    const ca = tl.compAt[k];
    const undone = ca !== null && t >= ca ? prog(ctx, ca, P.morph) : 0;
    let col: string = C.ink3;
    if (failed) col = C.crit;
    else if (done) col = mix(mix(C.signal, C.ok, qDone), C.ink3, undone);
    else if (inFlight) col = C.signal;
    const flash = failed ? pulse(t, fAt, f24(ctx, 8)) : done ? pulse(t, tl.doneAt[k], f24(ctx, 6)) * (1 - undone) : 0;
    const dx = shake(`saga-${ctx.id}-${k}`, t, fAt, f24(ctx, 4), 5);
    const idle = !done && !failed && !inFlight;
    return (
      <div
        key={`n${k}`}
        style={{
          position: 'absolute',
          left: cx(k) - nodeW / 2 + dx,
          top: yNode - nodeH / 2,
          width: nodeW,
          height: nodeH,
          borderRadius: 16,
          ...acrylic(col, ctx.fx, 0.35 + flash + ctx.mod.glow, idle),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: ent * (idle ? 0.7 : 1),
          transform: `translateY(${((1 - ent) * 10).toFixed(2)}px)`,
          visibility: t < b ? 'hidden' : undefined,
        }}
      >
        <Lbl id={`${ctx.id}:s${k}`} text={props.steps[k].label} maxW={nodeW - 28} maxH={nodeH - 24} size={stepSize} wrap fps={ctx.fps} color={mix(idle ? C.ink2 : C.ink, C.ink3, undone)} weight={FONT.label.strong} />
      </div>
    );
  };
  const comp = (k: number) => {
    const ca = tl.compAt[k];
    if (ca === null) return null;
    const q = prog(ctx, ca, P.label);
    return (
      <div
        key={`c${k}`}
        style={{
          position: 'absolute',
          left: cx(k) - nodeW / 2,
          top: yComp - compH / 2,
          width: nodeW,
          height: compH,
          borderRadius: compH / 2,
          border: `1.5px solid ${C.warn}`,
          background: `${C.ground}E6`,
          boxShadow: `0 0 ${(8 + 16 * pulse(t, ca, f24(ctx, 6))).toFixed(1)}px ${C.warn}${hex(0.33)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: q,
          transform: `translateY(${((1 - q) * 6).toFixed(2)}px)`,
          visibility: t < ca ? 'hidden' : undefined,
        }}
      >
        <Lbl id={`${ctx.id}:c${k}`} text={props.steps[k].compensation} maxW={nodeW - 28} maxH={compH} size={SIZE.label} fps={ctx.fps} color={C.warn} />
      </div>
    );
  };
  // wires: forward (node k -> node k+1, right to left), drop (node k -> its compensation), return (comp k -> comp k-1, left -> right)
  const wires: React.ReactNode[] = [];
  for (let k = 0; k < n - 1; k++) {
    const x0 = cx(k) - nodeW / 2;
    const x1 = cx(k + 1) + nodeW / 2;
    const t0 = tl.startAt[k + 1]; // the saga moves on when step k completes (Infinity = never)
    const q = Number.isFinite(t0) ? prog(ctx, t0, P.arrive) : 0;
    const col = failedAt(k + 1) !== null ? C.crit : t >= tl.doneAt[k + 1] ? C.ok : C.signal;
    wires.push(<Wire key={`g${k}`} d={`M ${x0} ${yNode} L ${x1} ${yNode}`} color={C.grid} w={2} opacity={prog(ctx, born(ctx, k + 1, 2), P.arrive)} />);
    wires.push(<Wire key={`f${k}`} d={`M ${x0} ${yNode} L ${x1} ${yNode}`} color={col} w={3} draw={q} len={x0 - x1 + 2} />);
    if (q > 0) {
      const ax = x1 + 2;
      wires.push(<path key={`a${k}`} d={`M ${ax + 14} ${yNode - 8} L ${ax} ${yNode} L ${ax + 14} ${yNode + 8}`} fill="none" stroke={col} strokeWidth={3} opacity={q} strokeLinecap="round" />);
    }
  }
  for (let k = 0; k < n; k++) {
    const ca = tl.compAt[k];
    if (ca === null) continue;
    const q = prog(ctx, ca, P.label);
    wires.push(<Wire key={`d${k}`} d={`M ${cx(k)} ${yNode + nodeH / 2} L ${cx(k)} ${yComp - compH / 2}`} color={C.warn} w={2} draw={q} len={yComp - yNode} />);
    const prev = k > 0 ? tl.compAt[k - 1] : null;
    if (prev !== null && prev !== undefined) {
      // the next compensation (step k-1, to the right) starts when this one ends: the return wire draws left -> right
      const xa = cx(k) + nodeW / 2;
      const xb = cx(k - 1) - nodeW / 2;
      const r = prog(ctx, prev, P.arrive);
      wires.push(<Wire key={`r${k}`} d={`M ${xa} ${yComp} L ${xb} ${yComp}`} color={C.warn} w={2.5} draw={r} len={xb - xa + 2} />);
      if (r > 0) wires.push(<path key={`ra${k}`} d={`M ${xb - 12} ${yComp - 7} L ${xb} ${yComp} L ${xb - 12} ${yComp + 7}`} fill="none" stroke={C.warn} strokeWidth={2.5} opacity={r} strokeLinecap="round" />);
    }
  }
  // status marks on top of the nodes: done = check (ok), failed = cross (crit), compensated = return arc (warn)
  const marks: React.ReactNode[] = [];
  const mk = (k: number) => {
    const x = cx(k) + nodeW / 2 - 6;
    const y = yNode - nodeH / 2 - 4;
    const st = {fill: 'none', strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
    const ca = tl.compAt[k];
    const fAt = failedAt(k);
    // status badge: a round token on the node corner (ok check / crit cross / warn return arrow)
    const badge = (col: string, q: number, glyph: React.ReactNode) => (
      <g key={`m${k}`} opacity={q} transform={`translate(${x} ${y}) scale(${(0.7 + 0.3 * q).toFixed(3)})`}>
        <circle r={36} fill={`${C.void}`} fillOpacity={0.9} />
        <circle r={32} fill={col} fillOpacity={0.18} stroke={col} strokeWidth={4} />
        {glyph}
      </g>
    );
    if (fAt !== null) {
      marks.push(badge(C.crit, prog(ctx, fAt, P.impact), <path d="M -12 -12 L 12 12 M 12 -12 L -12 12" stroke={C.crit} {...st} />));
    } else if (ca !== null && t >= ca) {
      marks.push(badge(C.warn, prog(ctx, ca, P.label), <path d="M 14 -2 A 14 14 0 1 0 6 13 M -14 -16 L -14 -3 L -1 -6" stroke={C.warn} {...st} />));
    } else if (t >= tl.doneAt[k]) {
      marks.push(badge(C.ok, prog(ctx, tl.doneAt[k], P.label), <path d="M -13 1 L -4 11 L 14 -11" stroke={C.ok} {...st} />));
    }
  };
  for (let k = 0; k < n; k++) mk(k);
  // the saga token: rides the forward wire to the step in flight, and the return wire during the compensations
  const tokens: React.ReactNode[] = [];
  for (let k = 0; k < n - 1; k++) {
    const t0 = tl.startAt[k + 1];
    if (!Number.isFinite(t0)) continue;
    const q = prog(ctx, t0, P.arrive);
    if (q > 0 && q < 0.999) tokens.push(<Dot key={`tk${k}`} x={cx(k) - nodeW / 2 + (cx(k + 1) + nodeW / 2 - (cx(k) - nodeW / 2)) * q} y={yNode} r={8} color={C.signal} k={1} />);
  }
  for (let k = n - 1; k > 0; k--) {
    const prev = tl.compAt[k - 1];
    if (prev === null || prev === undefined) continue;
    const q = prog(ctx, prev, P.arrive);
    if (q > 0 && q < 0.999) tokens.push(<Dot key={`tc${k}`} x={cx(k) + nodeW / 2 + (cx(k - 1) - nodeW / 2 - (cx(k) + nodeW / 2)) * q} y={yComp} r={7} color={C.warn} k={1} />);
  }
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`sg-${ctx.id}`} w={ctx.box.w} h={ctx.box.h} y={ctx.box.h * 0.5} color={tl.failIdx !== null && tl.failAt !== null && t >= tl.failAt ? C.crit : C.signal} pool={0.09} />
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {wires}
      </svg>
      {props.steps.map((_, k) => node(k))}
      {props.steps.map((_, k) => comp(k))}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {marks}
        {tokens}
      </svg>
    </div>
  );
};

export const SagaChain: DcComponent<Props> = {name: 'SagaChain', Component: SagaChainView, text: true, slot: 'full'};
