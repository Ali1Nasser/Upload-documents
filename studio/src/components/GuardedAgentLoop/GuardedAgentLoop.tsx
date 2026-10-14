// GuardedAgentLoop (catalog: Domain specials; 04 section 6 "Embeddings, RAG, agents": agent loop inside guard rings). The agent loop
// (plan -> act -> observe -> guard ...) is an elliptical ring with one node per step, clockwise from the top (step 1 at 12 o'clock),
// each node coloured by its kind (plan violet, act signal, observe ink, guard checkpoint warn) with a line-art glyph. `guards` are
// shield gates ON the ring, each in front of an `act` step (the dangerous move); if there are more guards than acts they take the
// next steps in order. A guard label sits outside the ring next to its gate.
//   iterate        -> a token runs the whole loop from the word (one step every 8 film frames, back to step 1): the node in
//                     flight glows, finished nodes settle ok, every gate passed flashes ok once. Several iterate actions = several laps.
//   block {guard g}-> the run that ends at gate g stops THERE: the gate turns crit with one failure shake (04 section 3.5), the token
//                     rebounds, the step behind the gate is greyed with a crit cross and no later step lights. The run is
//                     timed so the token is on the gate exactly on the `block` word.
// DOM + SVG only (standard tier). Labels are whole elements, auto-fitted (28 px floor).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Lbl, acrylic, acts, boxStyle, clamp01, f24, mix, pf, polar, prog, pulse, shake, shell} from '../_dom-c/kit';

type Kind = Props['steps'][number]['kind'];
const KIND_COLOR: Record<Kind, string> = {plan: C.violet, act: C.signal, observe: C.ink, guard: C.warn};

/** Edge (0 = between step 0 and 1, ..., n-1 = between the last step and step 0) each guard gate sits on. */
export const gateEdges = (steps: Props['steps'], guards: number): number[] => {
  const n = steps.length;
  const used = new Set<number>();
  const out: number[] = [];
  const order = [...steps.map((s, j) => [s, j] as const).filter(([s]) => s.kind === 'act').map(([, j]) => j), ...steps.map((_, j) => j)];
  for (const j of order) {
    if (out.length >= guards) break;
    const e = (j - 1 + n) % n;
    if (used.has(e)) continue;
    used.add(e);
    out.push(e);
  }
  return out;
};

export type Run = {start: number; stop: {edge: number; guard: number; at: number} | null};
/** Laps: one per iterate; a block ends the lap it interrupts (or makes its own lap when no iterate precedes it). */
export const runs = (p: Props, ctx: LayerCtx, step: number): Run[] => {
  const its = acts(ctx, 'iterate').map((a) => a.at);
  const blocks = acts(ctx, 'block');
  const edges = gateEdges(p.steps, p.guards.length);
  const out: Run[] = its.map((s) => ({start: s, stop: null}));
  for (const b of blocks) {
    const g = Math.min(b.props.guard as number, Math.max(0, p.guards.length - 1));
    const edge = edges[g];
    if (edge === undefined) continue;
    const prev = out.filter((r) => r.start <= b.at && r.stop === null).pop();
    if (prev) prev.stop = {edge, guard: g, at: b.at};
    else out.push({start: Math.max(ctx.at, b.at - Math.round((edge + 0.5) * step)), stop: {edge, guard: g, at: b.at}});
  }
  return out.sort((a, b) => a.start - b.start);
};

export const GuardedAgentLoopView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.steps.length;
  const W = ctx.box.w;
  const H = ctx.box.h;
  const cx = W / 2;
  const cy = H / 2;
  const rx = W * 0.3;
  const ry = H * 0.33;
  const stepF = f24(ctx, 8);
  const pt = (s: number): [number, number] => polar(cx, cy, rx, (s * 360) / n, ry); // s in step units, 0..n
  const nodeW = n <= 6 ? 320 : 270;
  const nodeH = 104;
  const edges = gateEdges(props.steps, props.guards.length);
  const rs = runs(props, ctx, stepF);
  const run = rs.filter((r) => r.start <= t).pop() ?? null;
  // progress along the loop in step units for the current run
  let s = -1;
  let blocked: Run['stop'] = null;
  let blockedHit = false;
  if (run) {
    if (run.stop) {
      const total = run.stop.edge + 0.5;
      s = clamp01((t - run.start) / Math.max(1, run.stop.at - run.start)) * total;
      blocked = run.stop;
      blockedHit = t >= run.stop.at;
    } else s = Math.min(n, (t - run.start) / stepF);
  }
  const ent = prog(ctx, ctx.at, P.arrive);
  const ringPath = (() => {
    const pts = Array.from({length: 97}, (_, i) => pt((i / 96) * n));
    return `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} Z`;
  })();
  // node states
  const nodeState = (j: number): 'idle' | 'active' | 'done' | 'blocked' | 'off' => {
    if (!run) return 'idle';
    if (blocked) {
      const behind = (blocked.edge + 1) % n;
      if (j === behind && blockedHit) return 'blocked';
      if (j > blocked.edge) return blockedHit && j !== behind ? 'off' : 'idle';
    }
    if (s >= j + 0.6 || (!blocked && s >= n)) return 'done';
    if (s >= j) return 'active';
    return 'idle';
  };
  const nodes = props.steps.map((st, j) => {
    const b = ctx.at + Math.round((2 * j * ctx.fps) / 24);
    const e = prog(ctx, b, P.arrive);
    const [x, y] = pt(j);
    const state = nodeState(j);
    const kc = KIND_COLOR[st.kind];
    const col = state === 'done' ? mix(kc, C.ok, 0.55) : state === 'blocked' ? C.crit : state === 'off' ? C.ink3 : kc;
    const activeK = state === 'active' ? 1 : 0;
    return (
      <div
        key={`n${j}`}
        style={{
          position: 'absolute',
          left: x - nodeW / 2,
          top: y - nodeH / 2,
          width: nodeW,
          height: nodeH,
          borderRadius: 22,
          ...acrylic(col, ctx.fx, 0.3 + 0.7 * activeK + ctx.mod.glow, state === 'idle' || state === 'off'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingInlineStart: 72,
          paddingInlineEnd: 14,
          opacity: e * (state === 'off' ? 0.5 : 1),
          transform: `translateY(${((1 - e) * 10).toFixed(2)}px)`,
          visibility: t < b ? 'hidden' : undefined,
        }}
      >
        <Lbl id={`${ctx.id}:s${j}`} text={st.label} maxW={nodeW - 100} maxH={nodeH - 16} size={SIZE.label} wrap fps={ctx.fps} color={state === 'idle' || state === 'off' ? C.ink2 : C.ink} weight={FONT.label.strong} />
      </div>
    );
  });
  const svgOver: React.ReactNode[] = [];
  // kind glyphs (line art on the start side of each node)
  props.steps.forEach((st, j) => {
    const b = ctx.at + Math.round((2 * j * ctx.fps) / 24);
    if (t < b) return;
    const e = prog(ctx, b, P.arrive);
    const [x, y] = pt(j);
    const gx = x + nodeW / 2 - 44;
    const kc = KIND_COLOR[st.kind];
    const state = nodeState(j);
    const c = state === 'blocked' ? C.crit : state === 'off' ? C.ink3 : kc;
    const sw = {fill: 'none', stroke: c, strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
    let g: React.ReactNode;
    if (st.kind === 'plan') g = <path d="M -14 -12 L 14 -12 M -14 0 L 14 0 M -14 12 L 4 12" {...sw} />;
    else if (st.kind === 'act') g = <path d="M 4 -18 L -12 3 L -1 3 L -5 18 L 13 -4 L 1 -4 Z" {...sw} />;
    else if (st.kind === 'observe')
      g = (
        <>
          <path d="M -20 0 Q 0 -18 20 0 Q 0 18 -20 0 Z" {...sw} />
          <circle r={5} fill={c} />
        </>
      );
    else g = <path d="M 0 -18 L 15 -11 L 15 3 Q 15 14 0 20 Q -15 14 -15 3 L -15 -11 Z" {...sw} />;
    svgOver.push(
      <g key={`gl${j}`} transform={`translate(${gx.toFixed(1)} ${y.toFixed(1)})`} opacity={e}>
        {g}
      </g>,
    );
    if (state === 'blocked') svgOver.push(<path key={`x${j}`} d={`M ${x - 22} ${y - nodeH / 2 - 26} L ${x + 22} ${y - nodeH / 2 + 4} M ${x + 22} ${y - nodeH / 2 - 26} L ${x - 22} ${y - nodeH / 2 + 4}`} stroke={C.crit} strokeWidth={6} strokeLinecap="round" opacity={prog(ctx, (blocked as NonNullable<Run['stop']>).at, P.impact)} />);
  });
  // gates + guard labels
  const gates = props.guards.map((lab, g) => {
    const e = edges[g];
    if (e === undefined) return null;
    const [gx, gy] = pt(e + 0.5);
    const b = ctx.at + Math.round(((n + g) * 2 * ctx.fps) / 24);
    const ge = prog(ctx, b, P.arrive);
    const passAt = run && (!run.stop || run.stop.edge !== e) ? run.start + Math.round((e + 0.5) * stepF) : null;
    const passed = passAt !== null && t >= passAt && (!run || !run.stop || e < run.stop.edge);
    const flash = passed ? pulse(t, passAt as number, f24(ctx, 8)) : 0;
    const isBlock = blocked !== null && blocked.edge === e && blockedHit;
    const col = isBlock ? C.crit : passed ? mix(C.warn, C.ok, 0.7) : C.warn;
    const dx = isBlock ? shake(`gal-${ctx.id}-${g}`, t, blocked!.at, f24(ctx, 5), 6) : 0;
    // outward direction of the label chip
    const ux = (gx - cx) / rx;
    const uy = (gy - cy) / ry;
    const L = Math.hypot(ux, uy) || 1;
    const lx = gx + (ux / L) * 86;
    const ly = gy + (uy / L) * 62;
    return { g, lab, gx: gx + dx, gy, ge, col, flash, isBlock, lx, ly, b };
  });
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={ringPath} fill="none" stroke={C.grid} strokeWidth={6} opacity={ent} />
        <path d={ringPath} fill="none" stroke={C.ink3} strokeWidth={2} strokeDasharray="2 14" strokeLinecap="round" opacity={ent * 0.9} />
        {run
          ? (() => {
              const end = blocked ? s : Math.min(s, n);
              if (end <= 0) return null;
              const pts = Array.from({length: Math.max(2, Math.ceil(end * 16) + 1)}, (_, i) => pt((i / Math.max(1, Math.ceil(end * 16))) * end));
              const d = `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')}`;
              const c = blocked && blockedHit ? C.crit : C.signal;
              return (
                <>
                  <path d={d} fill="none" stroke={c} strokeOpacity={0.2} strokeWidth={22} strokeLinecap="round" />
                  <path d={d} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" />
                </>
              );
            })()
          : null}
      </svg>
      {nodes}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {gates.map((gt) =>
          gt && t >= gt.b ? (
            <g key={`gt${gt.g}`} transform={`translate(${gt.gx.toFixed(1)} ${gt.gy.toFixed(1)})`} opacity={gt.ge}>
              <circle r={42 + 8 * gt.flash} fill={`${C.ground}F2`} stroke={gt.col} strokeWidth={4} />
              <circle r={52 + 10 * gt.flash} fill={gt.col} fillOpacity={0.12 + 0.25 * gt.flash + (gt.isBlock ? 0.1 : 0)} />
              <path d="M 0 -22 L 17 -13 L 17 4 Q 17 16 0 23 Q -17 16 -17 4 L -17 -13 Z" fill="none" stroke={gt.col} strokeWidth={4} strokeLinejoin="round" />
              {gt.isBlock ? <path d="M -8 -6 L 8 10 M 8 -6 L -8 10" stroke={gt.col} strokeWidth={4} strokeLinecap="round" /> : <path d="M -8 0 L -2 7 L 9 -7" stroke={gt.col} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
            </g>
          ) : null,
        )}
        {svgOver}
        {run && s > 0 && (!blocked || !blockedHit || t - (blocked as NonNullable<Run['stop']>).at < f24(ctx, 8)) && (blocked || s < n) ? (
          (() => {
            const rebound = blocked && blockedHit ? prog(ctx, blocked.at, f24(ctx, 8)) : 0;
            const [x, y] = pt(Math.max(0, s - rebound * 0.5));
            return <Dot x={x} y={y} r={14} color={blocked && blockedHit ? C.crit : C.signal} k={1.4} />;
          })()
        ) : null}
      </svg>
      {gates.map((gt) =>
        gt && t >= gt.b ? (
          <div key={`gl${gt.g}`} style={{position: 'absolute', left: gt.lx - 150, top: gt.ly - 24, width: 300, display: 'flex', justifyContent: 'center', opacity: gt.ge}}>
            <Lbl id={`${ctx.id}:g${gt.g}`} text={gt.lab} maxW={300} maxH={SIZE.labelMin * 1.6} size={SIZE.labelMin} fps={ctx.fps} color={gt.isBlock ? C.crit : C.warn} />
          </div>
        ) : null,
      )}
    </div>
  );
};
export const GuardedAgentLoop: DcComponent<Props> = {name: 'GuardedAgentLoop', Component: GuardedAgentLoopView, text: true, slot: 'full'};
