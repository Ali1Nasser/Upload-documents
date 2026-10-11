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
import {Lbl, Wire, acrylic, acts, born, boxStyle, f24, mix, pf, prog, pulse, shake, shell} from '../_dom-c/kit';

const STEP_F24 = 8; // forward rhythm: one step every 8 film frames (333 ms)
const COMP_F24 = 8; // compensation rhythm

type State = {doneAt: number[]; failIdx: number | null; failAt: number | null; compAt: (number | null)[]};
export const sagaTimeline = (p: Props, ctx: LayerCtx): State => {
  const n = p.steps.length;
  const fail = acts(ctx, 'fail')[0];
  const failIdx = fail ? Math.min(n - 1, fail.props.at as number) : null;
  const failAt = fail ? fail.at : null;
  const doneAt = p.steps.map((_, k) => {
    const b = born(ctx, k, STEP_F24);
    if (failIdx === null || failAt === null) return b;
    return k < failIdx ? Math.min(b, failAt - f24(ctx, 2) * (failIdx - k)) : Infinity; // steps before the failure are done by then
  });
  const comp = acts(ctx, 'compensate')[0];
  const last = failIdx === null ? n - 1 : failIdx - 1; // compensate the completed steps, newest first
  const compAt = p.steps.map((_, k) => (comp && k <= last ? comp.at + f24(ctx, COMP_F24) * (last - k) : null));
  return {doneAt, failIdx, failAt, compAt};
};

export const SagaChainView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const n = props.steps.length;
  const P = pf(ctx);
  const tl = sagaTimeline(props, ctx);
  const cellW = ctx.box.w / n;
  const nodeW = Math.round(cellW * 0.78);
  const nodeH = Math.round(SIZE.label * 2.6);
  const yNode = Math.round(ctx.box.h * 0.36);
  const yComp = Math.round(ctx.box.h * 0.72);
  const compH = Math.round(SIZE.labelMin * 2.2);
  const cx = (k: number) => ctx.box.w - (k + 0.5) * cellW; // RTL: step 1 on the right
  const failedAt = (k: number) => (tl.failIdx === k && tl.failAt !== null && t >= tl.failAt ? tl.failAt : null);
  const node = (k: number) => {
    const b = born(ctx, k, 2);
    const ent = prog(ctx, b, P.arrive);
    const done = t >= tl.doneAt[k];
    const qDone = done ? prog(ctx, tl.doneAt[k], P.label) : 0;
    const fAt = failedAt(k);
    const failed = fAt !== null;
    const inFlight = tl.failIdx === k && !failed && t >= born(ctx, k, STEP_F24);
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
        <Lbl id={`${ctx.id}:s${k}`} text={props.steps[k].label} maxW={nodeW - 24} maxH={nodeH - 8} fps={ctx.fps} color={idle ? C.ink2 : C.ink} weight={FONT.label.strong} />
        {undone > 0 ? <div style={{position: 'absolute', left: 14, right: 14, top: '50%', height: 2, background: C.ink3, transform: `scaleX(${undone.toFixed(3)})`, transformOrigin: 'left center'}} /> : null}
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
        <Lbl id={`${ctx.id}:c${k}`} text={props.steps[k].compensation} maxW={nodeW - 28} maxH={compH} size={SIZE.labelMin} fps={ctx.fps} color={C.warn} />
      </div>
    );
  };
  // wires: forward (node k -> node k+1, right to left), drop (node k -> its compensation), return (comp k -> comp k-1, left -> right)
  const wires: React.ReactNode[] = [];
  for (let k = 0; k < n - 1; k++) {
    const x0 = cx(k) - nodeW / 2;
    const x1 = cx(k + 1) + nodeW / 2;
    const start = born(ctx, k + 1, STEP_F24);
    const isFail = tl.failIdx === k + 1;
    const reached = tl.doneAt[k + 1] !== Infinity || isFail;
    const t0 = isFail && tl.failAt !== null ? Math.min(start, tl.failAt) : Math.min(start, tl.doneAt[k + 1]);
    const q = reached ? prog(ctx, t0, P.arrive) : 0;
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
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {wires}
      </svg>
      {props.steps.map((_, k) => node(k))}
      {props.steps.map((_, k) => comp(k))}
    </div>
  );
};

export const SagaChain: DcComponent<Props> = {name: 'SagaChain', Component: SagaChainView, text: true, slot: 'full'};
