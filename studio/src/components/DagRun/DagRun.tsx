// DagRun (catalog: Structure & flow). A DAG of tasks whose states change on anchors (04 section 6: "DAG lights in topological order;
// retry ...", Spark "lazy DAG drawn but dark until an action lights it"). Tasks are glass cards laid out in longest-path layers
// along the flow (RTL when the copy is Arabic: the first task on the right), dependencies are emissive S-wires.
// Every task starts `queued` (dim ring). `setState` (on the word that names it, 04 section 4 lead -2 f; RV1 = first visible step on
// the anchor frame) recolours the card and swaps its status glyph, so state never relies on colour alone:
//   queued  ring, ink3            running  spinner + marching shimmer, signal (incoming wires carry pulses)
//   success check, ok settle glow failed   cross, crit flash + failure shake (the only hard motion, 04 section 3.5)
//   retry   turning arrow, warn   skipped  dash, dashed ink3 border, dimmed
// A finished upstream task turns its outgoing wires ok. The optional `schedule` sits on a clock chip at the reading-start corner.
// The diagram auto-fits ctx.box as one unit (labels >= 28 px, SIZE.labelMin), else DC_QA overflow (snapshot fails).
import React, {useMemo} from 'react';
import {C, SIZE} from '../../tokens';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, GlyphIcon, Wire, acts, alpha, bornAt, dirOf, exitStyle, fitScale, hS, march, mix, shake, useMeasure, type Cubic, type Glyph} from '../_struct-a/kit';
import {layered} from '../_struct-a/layout';

type State = 'queued' | 'running' | 'success' | 'failed' | 'retry' | 'skipped';
const LOOK: Record<State, {c: string; g: Glyph}> = {
  queued: {c: C.ink3, g: 'ring'},
  running: {c: C.signal, g: 'spin'},
  success: {c: C.ok, g: 'check'},
  failed: {c: C.crit, g: 'cross'},
  retry: {c: C.warn, g: 'retry'},
  skipped: {c: C.ink3, g: 'skip'},
};

/** State history per task: [{t, s}] in anchor order (t = -inf: queued). */
const histories = (p: Props, ctx: DcProps<Props>['ctx']): {t: number; s: State}[][] => {
  const h = p.tasks.map(() => [{t: -1e9, s: 'queued' as State}]);
  const idx = new Map(p.tasks.map((q, i) => [q.id, i]));
  for (const a of acts(ctx, 'setState')) {
    const i = idx.get(a.props.task as string);
    if (i !== undefined) h[i].push({t: a.at, s: a.props.state as State});
  }
  return h;
};
const stateAt = (h: {t: number; s: State}[], t: number) => {
  let k = 0;
  for (let j = 0; j < h.length; j++) if (h[j].t <= t) k = j;
  return {cur: h[k], prev: h[Math.max(0, k - 1)], k};
};

export const DagRunView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.tasks.length;
  const fs0 = n <= 10 ? SIZE.body : SIZE.label;
  const items = [...props.tasks.map((q) => ({text: q.label, size: fs0})), ...(props.schedule ? [{text: props.schedule, size: fs0, weight: 500}] : [])];
  const m = useMeasure(ctx.id, items);
  const dir = dirOf(props.tasks.map((q) => q.label));
  const rtl = dir === 'rtl';
  const idx = useMemo(() => new Map(props.tasks.map((q, i) => [q.id, i])), [props.tasks]);
  const E = useMemo(
    () => props.deps.map((d) => [idx.get(d.from), idx.get(d.to)]).filter((e): e is [number, number] => e[0] !== undefined && e[1] !== undefined && e[0] !== e[1]),
    [props.deps, idx],
  );
  const geo = useMemo(() => {
    if (!m.w) return null;
    const h = Math.round(fs0 * 2.1);
    const icon = Math.round(h * 0.62);
    const padX = fs0 * 0.75;
    const sz = props.tasks.map((_, i) => ({w: (m.w as number[])[i] + 2 * padX + icon + Math.round(h * 0.18), h}));
    const lay = layered(n, E, sz, Math.max(fs0 * 2.4, 96), fs0 * 1.0, rtl);
    const schedH = props.schedule ? h * 1.5 : 0;
    const nat = {w: Math.max(lay.nat.w, props.schedule ? (m.w as number[])[n] + h * 2 : 0), h: lay.nat.h + schedH};
    const fit = fitScale(ctx.id, nat, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin, 1.3);
    const s = fit.s;
    const ox = (ctx.box.w - nat.w * s) / 2;
    const oy = (ctx.box.h - nat.h * s) / 2 + schedH * s;
    const lx = (nat.w - lay.nat.w) / 2;
    const pos = lay.pos.map((q) => ({x: ox + (q.x + lx) * s, y: oy + q.y * s}));
    const ssz = sz.map((q) => ({w: q.w * s, h: q.h * s}));
    const sched = props.schedule
      ? {w: ((m.w as number[])[n] + 2 * padX + icon + Math.round(h * 0.18)) * s * 0.8, h: h * 0.8 * s, y: oy - schedH * s + (h * 0.8 * s) / 2, x0: ox, x1: ox + nat.w * s}
      : null;
    return {pos, sz: ssz, fs: fit.fs, s, overflow: fit.overflow, layer: lay.layer, sched};
  }, [m.w, props.tasks, props.schedule, E, ctx.box.w, ctx.box.h, ctx.id, rtl, fs0, n]);

  if (!geo) return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y}}>{m.node}</div>;

  const t = ctx.frame;
  const fps = ctx.fps;
  const lab = presetFrames('label', fps);
  const arr = presetFrames('arrive', fps);
  const ff = flashFrames(fps);
  const hist = histories(props, ctx);
  // topological entrance: layer by layer from the anchor (the DAG is drawn, then lit by setState)
  const order = props.tasks.map((_, i) => i).sort((a, b) => geo.layer[a] - geo.layer[b] || a - b);
  const born = new Array<number>(n).fill(0);
  order.forEach((i, k) => (born[i] = bornAt(ctx, k, n)));
  const look = props.tasks.map((_, i) => {
    const {cur, prev, k} = stateAt(hist[i], t);
    const q = k === 0 ? 1 : revealProgress(t - cur.t, lab);
    const since = t - cur.t;
    const col = mix(LOOK[prev.s].c, LOOK[cur.s].c, q);
    const flash = k > 0 && (cur.s === 'failed' || cur.s === 'success') ? (since < ff ? 1 : Math.max(0, 1 - (since - ff) / (3 * ff))) : 0;
    const base = cur.s === 'queued' || cur.s === 'skipped' ? 0 : cur.s === 'running' ? 0.55 + 0.25 * Math.sin((since / fps) * Math.PI * 2) : 0.6;
    const pop = k > 0 ? 1 + 0.06 * (1 - revealProgress(since, presetFrames('impact', fps, true), ease.impact)) : 1;
    const dx = k > 0 && cur.s === 'failed' ? shake(since, fps, `${ctx.id}:${i}:${k}`) : 0;
    return {s: cur.s, col, q, flash, glowK: (base + flash * 1.2) * q, pop, dx, since};
  });
  const period = Math.round(1.6 * fps);

  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {E.map(([a, b], k) => {
          const A = geo.pos[a];
          const B = geo.pos[b];
          const sgn = B.x >= A.x ? 1 : -1;
          const c: Cubic = hS({x: A.x + (sgn * geo.sz[a].w) / 2 + sgn * 4, y: A.y}, {x: B.x - (sgn * geo.sz[b].w) / 2 - sgn * 8, y: B.y});
          const p = revealProgress(t - (Math.max(born[a], born[b]) + lab), arr, ease.camera);
          const up = look[a];
          const down = look[b];
          const done = up.s === 'success' ? up.q : 0;
          const hot = done > 0 && (down.s === 'running' || down.s === 'retry');
          const col = up.s === 'failed' ? mix(C.ink3, C.crit, up.q * 0.7) : mix(C.ink3, C.ok, done);
          return (
            <Wire
              key={k}
              c={c}
              p={p}
              color={col}
              width={2.5 * geo.s}
              arrow
              glowPx={done > 0 ? ctx.fx.glowInner * done : 0}
              dash={up.s === 'skipped' || up.s === 'failed'}
              pulses={hot ? march(t, period, 2) : undefined}
              pulseR={4 * geo.s}
            />
          );
        })}
      </svg>
      {geo.sched ? (
        <Chip
          id={`${ctx.id}:schedule`}
          text={props.schedule as string}
          x={rtl ? geo.sched.x1 - geo.sched.w / 2 : geo.sched.x0 + geo.sched.w / 2}
          y={geo.sched.y}
          w={geo.sched.w}
          h={geo.sched.h}
          fs={Math.max(SIZE.labelMin, geo.fs * 0.8)}
          color={C.violet}
          fx={ctx.fx}
          weight={500}
          textColor={C.ink2}
          icon={<GlyphIcon g="clock" color={C.violet} />}
          dir={dir}
          reveal={revealStyle(t - ctx.at, fps, 'label', dirOf([props.schedule as string])).style}
        />
      ) : null}
      {props.tasks.map((q, i) => {
        const L = look[i];
        const rv = revealStyle(t - born[i], fps, 'label', dirOf([q.label]));
        const run = L.s === 'running';
        const turn = run ? (L.since / fps) % 1 : L.s === 'retry' ? revealProgress(L.since, presetFrames('morph', fps, true), ease.camera) : 0;
        const P = geo.pos[i];
        const S = geo.sz[i];
        return (
          <React.Fragment key={q.id}>
            <Chip
              id={`${ctx.id}:${q.id}`}
              text={q.label}
              x={P.x + L.dx}
              y={P.y}
              w={S.w}
              h={S.h}
              fs={geo.fs}
              color={L.col}
              glowK={L.glowK}
              fill={L.s === 'queued' || L.s === 'skipped' ? 0 : 0.12 * L.q}
              fx={ctx.fx}
              dashed={L.s === 'skipped'}
              textColor={L.s === 'skipped' || L.s === 'queued' ? C.ink2 : C.ink}
              overflow={geo.overflow}
              icon={<GlyphIcon g={LOOK[L.s].g} color={L.col} turn={turn} />}
              dir={dir}
              reveal={{...rv.style, transform: `${rv.style.transform ?? ''} scale(${L.pop.toFixed(4)})`.trim()}}
            />
            {run && rv.visible ? (
              // running shimmer: a marching highlight along the card's lower edge (linear: marching flow, 04 section 2)
              <div
                style={{
                  position: 'absolute',
                  left: P.x - S.w / 2 + S.h * 0.3,
                  top: P.y + S.h / 2 - 4 * geo.s,
                  width: S.w - S.h * 0.6,
                  height: 3 * geo.s,
                  borderRadius: 2,
                  overflow: 'hidden',
                  background: alpha(C.signal, 0.15),
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    height: '100%',
                    width: '35%',
                    [rtl ? 'right' : 'left']: `${(((L.since / period) % 1) * 135 - 35).toFixed(2)}%`,
                    background: `linear-gradient(90deg, transparent, ${C.signal}, transparent)`,
                  }}
                />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const DagRun: DcComponent<Props> = {name: 'DagRun', Component: DagRunView, text: true, slot: 'full'};
