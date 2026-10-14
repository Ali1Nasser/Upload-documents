// RequestJourney (catalog: Structure & flow). A request capsule travels the hops of a system (04 §6 Networks / Mobile Money:
// "a request capsule travels DNS -> TCP -> TLS -> API -> DB -> response ... each hop lights on its word"; "Receipt T1 travels
// phone -> core -> Kafka -> NRT -> warehouse -> report with timestamps per station").
//  - RTL when any label is Arabic: the first hop sits on the right and the request flows right -> left (reading order).
//  - Layer anchor: the rail draws in reading direction (morph); each hop disc pops as the rail reaches it (RV1: first ink on its
//    own frame) with its label on the label preset. Kind = glyph (client phone, lb fan, service box, db cylinder, cache bolt,
//    queue bars, external cloud). The capsule waits at the first hop.
//  - travel(to): on the anchor the destination hop ignites (ring pulse + signal) and the capsule glides along the rail (>= morph
//    long, camera ease; spans the spoken word when it is longer); hops it crosses light as it passes; the rail behind it
//    carries the signal. The hop's latency (data-contract `ref`, unit defaults to ms) lands on the hop when it lights.
//  - fail(at): the hop turns crit and shakes, a red shockwave leaves it and the capsule cracks (crit, held). retry(at): the capsule
//    re-forms at the previous hop and travels to `at` again; the hop is warn while retrying and lights again on arrival.
//  - Labels alternate above / below the rail (2 steps of room each) on plates, the latency sits on the opposite side. Auto-fit,
//    28 px floor; an overflow is reported and fails snapshots.
import React from 'react';
import {C, SIZE} from '../../tokens';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, actionsOf, f24, layerStyle, lerp, numText, placeLabel, prog, rtlOf, shake} from '../_struct-b/kit';
import {HopDisc} from '../_struct-b/glyphs';

type Ctx = DcProps<Props>['ctx'];
type Move = {t0: number; dur: number; from: number; to: number; retry: boolean};
type Mark = {t: number; hop: number; kind: 'lit' | 'fail' | 'retry'};

/** Structural timeline (pure): capsule moves, hop status marks, failures. */
export const journeyTimeline = (p: Props, ctx: Ctx) => {
  const ids = p.hops.map((h) => h.id);
  const idx = (id: unknown) => Math.max(0, ids.indexOf(id as string));
  const morph = presetFrames('morph', ctx.fps, true);
  const moves: Move[] = [];
  const marks: Mark[] = [{t: ctx.at, hop: 0, kind: 'lit'}];
  const fails: {t: number; hop: number}[] = [];
  let cur = 0;
  for (const a of actionsOf(ctx, 'travel', 'fail', 'retry')) {
    if (a.name === 'travel') {
      const to = idx(a.props.to);
      const d = Math.abs(to - cur);
      const dur = Math.max(morph, a.end - a.at, f24(4 * d, ctx.fps));
      moves.push({t0: a.at, dur, from: cur, to, retry: false});
      marks.push({t: a.at, hop: to, kind: 'lit'}); // the destination ignites on its word
      for (let i = Math.min(cur, to) + 1; i < Math.max(cur, to); i++) marks.push({t: a.at + Math.round((dur * Math.abs(i - cur)) / Math.max(1, d)), hop: i, kind: 'lit'});
      cur = to;
    } else if (a.name === 'fail') {
      const at = idx(a.props.at);
      if (at !== cur) {
        moves.push({t0: a.at, dur: morph, from: cur, to: at, retry: false});
        cur = at;
      }
      marks.push({t: a.at, hop: at, kind: 'fail'});
      fails.push({t: a.at, hop: at});
    } else {
      const at = idx(a.props.at);
      const from = Math.max(0, at - 1);
      const dur = Math.max(morph, a.end - a.at);
      moves.push({t0: a.at, dur, from, to: at, retry: true});
      marks.push({t: a.at, hop: at, kind: 'retry'}, {t: a.at + dur, hop: at, kind: 'lit'});
      cur = at;
    }
  }
  const pos = (t: number) => {
    let k = -1;
    for (let i = 0; i < moves.length; i++) if (moves[i].t0 <= t) k = i;
    if (k < 0) return {pos: 0, move: null as Move | null, q: 1};
    const m = moves[k];
    const q = prog(t, m.t0, m.dur, ease.camera);
    return {pos: lerp(m.from, m.to, q), move: m, q};
  };
  const hopMark = (hop: number, t: number) => {
    let r: Mark | null = null;
    for (const m of marks) if (m.hop === hop && m.t <= t && (!r || m.t >= r.t)) r = m;
    return r;
  };
  /** the capsule is cracked from a failure until the next retry */
  const brokenAt = (t: number) => {
    const f = fails.filter((x) => x.t <= t).slice(-1)[0];
    if (!f) return null;
    const rt = moves.find((m) => m.retry && m.t0 > f.t && m.t0 <= t);
    return rt ? null : f;
  };
  return {ids, moves, marks, fails, pos, hopMark, brokenAt, morph};
};

export const RequestJourneyView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const hops = props.hops;
  const n = hops.length;
  const tl = journeyTimeline(props, ctx);
  const rtl = rtlOf(hops.map((x) => x.label));
  const padX = Math.max(110, w * 0.08);
  const step = n > 1 ? (w - 2 * padX) / (n - 1) : 0;
  const xOf = (i: number) => (rtl ? w - padX - i * step : padX + i * step);
  const railY = Math.round(h * 0.5);
  const r = Math.min(54, Math.max(36, step * 0.2));
  const k = 1 + ctx.mod.glow;
  const drawN = presetFrames('morph', ctx.fps, true) + f24(2 * n, ctx.fps);
  const draw = prog(t, ctx.at, drawN, ease.camera);
  const bornAt = (i: number) => ctx.at + Math.round((i / Math.max(1, n - 1)) * (drawN - 1));
  const x0 = xOf(0);
  const x1 = xOf(n - 1);
  const railEnd = lerp(x0, x1, draw);
  const cap = tl.pos(t);
  const cx = lerp(x0, x1, cap.pos / Math.max(1, n - 1));
  const broken = tl.brokenAt(t);
  const curHop = Math.round(cap.pos);
  const lblN = presetFrames('label', ctx.fps);
  const impN = presetFrames('impact', ctx.fps, true);
  const arriveN = presetFrames('arrive', ctx.fps);
  const tierLbl = r + Math.round(SIZE.label * 1.7);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {draw > 0 && !broken ? <Pool x={cx} y={railY} r={Math.max(150, step * 0.8)} color={C.signal} a={0.2} squash={0.5} /> : null}
      {broken ? <Pool x={xOf(broken.hop)} y={railY} r={Math.max(150, step * 0.8)} color={C.crit} a={0.22 * (1 - 0.5 * prog(t, broken.t, tl.morph * 2))} squash={0.5} /> : null}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <line x1={x0} y1={railY} x2={x1} y2={railY} stroke={C.grid} strokeWidth={3} opacity={draw > 0 ? 0.7 : 0} />
        <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${railEnd.toFixed(1)} ${railY}`} color={C.ink3} width={3} fx={ctx.fx} k={0.3} opacity={draw > 0 ? 0.8 : 0} />
        {draw > 0 ? <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${cx.toFixed(1)} ${railY}`} color={broken ? C.crit : C.signal} width={4.5} fx={ctx.fx} k={k} /> : null}
        {hops.map((hop, i) => {
          const born = bornAt(i);
          if (t < born) return null;
          const pop = prog(t, born, impN, ease.impact);
          const mk = tl.hopMark(i, t);
          const st = mk?.kind ?? 'idle';
          const isCur = i === curHop && !broken && st !== 'idle';
          const col = st === 'fail' ? C.crit : st === 'retry' ? C.warn : isCur ? C.signal : st === 'lit' ? C.ink : C.ink3;
          const ignite = mk && mk.t >= born ? prog(t, mk.t, arriveN) : 1;
          const dx = st === 'fail' ? shake(t, mk!.t, f24(10, ctx.fps), 7) : 0;
          const emph = 1 + (isCur ? 0.12 : 0) + (mk && ignite < 1 ? 0.12 * (1 - ignite) : 0);
          return (
            <g key={hop.id}>
              {mk && ignite < 1 && st !== 'idle' ? <circle cx={xOf(i)} cy={railY} r={r * (1 + 0.9 * ignite)} fill="none" stroke={col} strokeWidth={3} strokeOpacity={0.8 * (1 - ignite)} /> : null}
              {st === 'fail' ? <circle cx={xOf(i)} cy={railY} r={r * (1 + 2.2 * prog(t, mk!.t, tl.morph * 2, ease.arrive))} fill="none" stroke={C.crit} strokeWidth={3} strokeOpacity={0.7 * (1 - prog(t, mk!.t, tl.morph * 2, ease.arrive))} /> : null}
              <HopDisc kind={hop.kind} x={xOf(i) + dx} y={railY} r={r} color={col} fx={ctx.fx} k={(isCur ? 0.9 : st === 'idle' ? 0 : 0.35) * k} scale={(0.55 + 0.45 * pop) * emph} opacity={Math.min(1, pop * 1.4) * (st === 'idle' && cap.pos < i - 0.5 ? 0.75 : 1)} />
            </g>
          );
        })}
        {/* the request capsule */}
        {t >= bornAt(0) ? (
          <g opacity={prog(t, bornAt(0), lblN)}>
            {cap.q < 1 && cap.move && !broken ? <line x1={cx} y1={railY} x2={cx + (xOf(cap.move.from) < xOf(cap.move.to) ? -1 : 1) * Math.min(90, Math.abs(cx - xOf(cap.move.from)))} y2={railY} stroke={C.signal} strokeWidth={9} strokeLinecap="round" strokeOpacity={0.35} /> : null}
            <circle cx={cx} cy={railY} r={20 + ctx.fx.glowInner * 1.2} fill={broken ? C.crit : C.signal} fillOpacity={0.18} />
            <circle cx={cx} cy={railY} r={13} fill={broken ? C.ground : C.white} stroke={broken ? C.crit : C.signal} strokeWidth={broken ? 3 : 4} />
            {broken ? <path d={`M ${cx - 6} ${railY - 6} L ${cx + 6} ${railY + 6} M ${cx + 6} ${railY - 6} L ${cx - 6} ${railY + 6}`} stroke={C.crit} strokeWidth={3} strokeLinecap="round" /> : null}
          </g>
        ) : null}
      </svg>
      {hops.map((hop, i) => {
        const born = bornAt(i);
        const lp = prog(t, born, lblN);
        const mk = tl.hopMark(i, t);
        const st = mk?.kind ?? 'idle';
        const up = i % 2 === 1;
        const pl = placeLabel(xOf(i), n > 1 ? 2 * step - 40 : w - 80, w);
        const op = t < born ? 0 : lp * (st === 'idle' ? 0.7 : 1);
        const col = st === 'fail' ? C.crit : st === 'retry' ? C.warn : st === 'lit' ? C.ink : C.ink2;
        // the latency lands when the hop first lights (travel / retry arrival), RV1 on that frame
        const litT = tl.marks.filter((m) => m.hop === i && m.kind === 'lit' && m.t >= born).map((m) => m.t)[0];
        const lat = hop.latency;
        const showLat = lat && litT !== undefined && t >= litT;
        const lq = litT !== undefined ? prog(t, litT, presetFrames('impact', ctx.fps, true), ease.impact) : 0;
        return (
          <React.Fragment key={hop.id}>
            <Lbl
              id={`${ctx.id}:h${i}`}
              text={hop.label}
              x={pl.x}
              y={up ? railY - tierLbl : railY + tierLbl}
              align={pl.align}
              valign={up ? 'bottom' : 'top'}
              maxW={pl.maxW}
              color={col}
              plate
              accent={st === 'fail' ? C.crit : st === 'retry' ? C.warn : i === curHop && st !== 'idle' ? C.signal : undefined}
              fx={ctx.fx}
              opacity={op}
              style={{marginTop: (1 - lp) * 6}}
            />
            {showLat ? (
              <Lbl
                id={`${ctx.id}:l${i}`}
                text={numText({...lat, unit: lat.unit ?? 'ms'})}
                x={xOf(i)}
                y={up ? railY + r + 18 : railY - r - 18 - 46}
                valign={up ? 'top' : 'bottom'}
                maxW={Math.max(140, step - 30)}
                size={SIZE.label}
                color={st === 'fail' ? C.crit : C.warn}
                opacity={lq}
                role="data"
                style={{marginTop: (1 - lq) * 5}}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const RequestJourney: DcComponent<Props> = {name: 'RequestJourney', Component: RequestJourneyView, text: true, slot: 'center'};
