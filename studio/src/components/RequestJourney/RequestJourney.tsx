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
//  - Labels sit above the hops on plates (two tiers with a leader line when the hops are close); the latency is a readout on the
//    floor under the hop. Auto-fit, 28 px floor; an overflow is reported and fails snapshots.
//  - Depth and light (ADR-003 LK-F): the hops are glass discs on stems over contact ellipses on a perspective floor grid, the rail
//    is a light tube, the capsule is a glossy pill with a bloom, a motion streak and its own light pool and shadow on the floor
//    (the brightest thing on screen); a failure throws seeded shards and a crit shockwave. 2.5D only, no WebGL (all tiers).
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, actionsOf, f24, layerStyle, lerp, numText, placeLabel, prog, rtlOf, shake} from '../_struct-b/kit';
import {HopDisc} from '../_struct-b/glyphs';

type Ctx = DcProps<Props>['ctx'];
/** group opacity only while it is really < 1 (an opacity group at 1 still costs a layer and made tile seams non-deterministic) */
const o1 = (x: number) => (x >= 0.999 ? undefined : Math.max(0, x));
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
  const padX = Math.max(120, w * 0.085);
  const step = n > 1 ? (w - 2 * padX) / (n - 1) : 0;
  const xOf = (i: number) => (rtl ? w - padX - i * step : padX + i * step);
  const r = Math.min(80, Math.max(44, step * 0.24));
  const railY = Math.round(h * 0.485);
  const parkY = railY + r + 38; // where a docked capsule rests, on the pedestal stem under the disc
  const floorY = railY + r + 84; // contact ellipses of the pedestals
  const eRx = r * 1.08;
  const eRy = r * 0.27;
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
  const two = step < 340; // neighbouring labels would collide: alternate two tiers
  const lblBottom = railY - r - 30;
  const plateH = Math.round(SIZE.label * 1.5);
  const tierY = (i: number) => (two && i % 2 === 1 ? lblBottom - plateH - 22 : lblBottom);
  const dir = x1 >= x0 ? 1 : -1;
  const capCol = broken ? C.crit : C.signal;
  const failT = broken ? broken.t : 0;
  const fp = broken ? prog(t, failT, tl.morph * 2, ease.arrive) : 0;
  const cw = 40; // capsule half width
  const ch = 20; // capsule half height
  const streak = cap.q < 1 && cap.move && !broken ? Math.min(150, Math.abs(cx - xOf(cap.move.from))) : 0;
  const retryM = cap.move && cap.move.retry ? cap.move : null;
  const formQ = retryM ? prog(t, retryM.t0, arriveN) : 1;
  const floorOn = draw;
  const svgY = Math.max(0, Math.round(railY - r * 3.7));
  const svgH = Math.round(floorY + 260 - svgY);
  // the capsule lifts onto the rail while it travels and docks on the pedestal stem when it stops
  const lift = cap.move && !broken ? Math.min(1, Math.sin(Math.PI * cap.q) * 3.2) : 0;
  const capY = parkY + (railY - parkY) * lift;
  const capS = (0.78 + 0.22 * lift) * (0.7 + 0.3 * formQ);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {/* light: signal pool under the capsule on the floor (key light), crit pool at a failure, a faint violet-free ground haze */}
      {draw > 0 && !broken ? <Pool x={cx} y={floorY} r={Math.max(190, step * 0.7)} color={C.signal} a={0.24 * k} squash={0.2} /> : null}
      {draw > 0 && !broken ? <Pool x={cx} y={railY} r={Math.max(150, step * 0.6)} color={C.signal} a={0.12 * k} squash={0.55} /> : null}
      {broken ? <Pool x={xOf(broken.hop)} y={floorY} r={Math.max(200, step * 0.75)} color={C.crit} a={0.28 * (1 - 0.45 * fp)} squash={0.2} /> : null}
      {broken ? <Pool x={xOf(broken.hop)} y={railY} r={Math.max(150, step * 0.6)} color={C.crit} a={0.14 * (1 - 0.45 * fp)} squash={0.55} /> : null}
      <svg width={w} height={svgH} viewBox={`0 ${svgY} ${w} ${svgH}`} style={{position: 'absolute', left: 0, top: svgY, overflow: 'visible'}}>
        <defs>
          <linearGradient id={`${ctx.id}-fl`} gradientUnits="userSpaceOnUse" x1="0" y1={floorY} x2="0" y2={floorY + 230}>
            <stop offset="0" stopColor={C.signal} stopOpacity={0.34} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-st`} gradientUnits="userSpaceOnUse" x1="0" y1={railY} x2="0" y2={floorY}>
            <stop offset="0" stopColor={C.ink3} stopOpacity={0.55} />
            <stop offset="1" stopColor={C.ink3} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-tr`} gradientUnits="userSpaceOnUse" x1={cx} y1="0" x2={cx - dir * Math.max(1, streak)} y2="0">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.55} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-cp`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.white} />
            <stop offset="1" stopColor={broken ? C.ink3 : C.signal} />
          </linearGradient>
        </defs>
        {/* perspective floor: converging depth lines and receding rows, fading away from the lit hops */}
        <g>
          {Array.from({length: 5}, (_, i) => {
            const d = Math.pow((i + 1) / 5, 1.55) * 200;
            return <line key={`fh${i}`} x1={x0 - 90} x2={x1 + 90} y1={floorY + eRy + d} y2={floorY + eRy + d} stroke={`url(#${ctx.id}-fl)`} strokeOpacity={floorOn} strokeWidth={1.5} />;
          })}
          {Array.from({length: n + 4}, (_, j) => {
            const xa = Math.min(x0, x1) - 90 + (j / (n + 3)) * (Math.abs(x1 - x0) + 180);
            const mid = (x0 + x1) / 2;
            return <line key={`fv${j}`} x1={xa} x2={mid + (xa - mid) * 1.7} y1={floorY + eRy} y2={floorY + eRy + 210} stroke={`url(#${ctx.id}-fl)`} strokeOpacity={floorOn} strokeWidth={1.5} />;
          })}
        </g>
        {/* the rail: a light tube through the hops, with a floor reflection */}
        <line x1={x0} y1={floorY} x2={railEnd} y2={floorY} stroke={C.signal} strokeWidth={2} opacity={0.18 * Math.min(1, draw * 20)} />
        <line x1={x0} y1={railY} x2={x1} y2={railY} stroke={C.grid} strokeWidth={5} opacity={draw > 0 ? 0.9 : 0} strokeLinecap="round" />
        <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${railEnd.toFixed(1)} ${railY}`} color={C.ink3} width={3} fx={ctx.fx} k={0.3} opacity={draw > 0 ? 0.85 : 0} />
        {draw > 0 && Math.abs(cx - x0) > 0.5 ? <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${cx.toFixed(1)} ${railY}`} color={C.signal} width={5.5} fx={ctx.fx} k={k * 1.1 * (broken ? 0.6 : 1)} opacity={broken ? 0.7 : 1} /> : null}
        {broken && Math.abs(cx - x0) > 0.5 ? <GlowPath d={`M ${(cx - dir * step * 0.45).toFixed(1)} ${railY} L ${cx.toFixed(1)} ${railY}`} color={C.crit} width={5.5} fx={ctx.fx} k={k * 1.1} opacity={fp} /> : null}
        {/* pedestals + hops */}
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
          const emph = 1 + (isCur ? 0.1 : 0) + (mk && ignite < 1 ? 0.12 * (1 - ignite) : 0);
          const hx = xOf(i);
          const lit = st !== 'idle';
          return (
            <g key={hop.id}>
              <g opacity={o1(pop * 1.5)}>
                <ellipse cx={hx} cy={floorY + 10} rx={eRx * 1.25} ry={eRy * 1.3} fill={C.void} opacity={0.55} />
                <ellipse cx={hx} cy={floorY} rx={eRx} ry={eRy} fill={`${col}${hex(lit ? 0.2 : 0.07)}`} stroke={col} strokeWidth={2} strokeOpacity={lit ? 0.9 : 0.5} />
                <ellipse cx={hx} cy={floorY} rx={eRx * 0.6} ry={eRy * 0.6} fill="none" stroke={col} strokeWidth={1.5} strokeOpacity={lit ? 0.55 : 0.2} />
                <rect x={hx - 5} y={railY + r * 0.8} width={10} height={floorY - railY - r * 0.8} fill={`url(#${ctx.id}-st)`} />
              </g>
              {mk && ignite < 1 && lit ? <ellipse cx={hx} cy={floorY} rx={eRx * (1 + 1.1 * ignite)} ry={eRy * (1 + 1.1 * ignite)} fill="none" stroke={col} strokeWidth={3} strokeOpacity={0.8 * (1 - ignite)} /> : null}
              {mk && ignite < 1 && lit ? <circle cx={hx} cy={railY} r={r * (1 + 0.9 * ignite)} fill="none" stroke={col} strokeWidth={3} strokeOpacity={0.8 * (1 - ignite)} /> : null}
              {st === 'fail' ? <circle cx={hx} cy={railY} r={r * (1 + 2.4 * prog(t, mk!.t, tl.morph * 2, ease.arrive))} fill="none" stroke={C.crit} strokeWidth={3.5} strokeOpacity={0.75 * (1 - prog(t, mk!.t, tl.morph * 2, ease.arrive))} /> : null}
              {st === 'fail' ? <ellipse cx={hx} cy={floorY} rx={eRx * (1 + 3 * prog(t, mk!.t, tl.morph * 2, ease.arrive))} ry={eRy * (1 + 3 * prog(t, mk!.t, tl.morph * 2, ease.arrive))} fill="none" stroke={C.crit} strokeWidth={2.5} strokeOpacity={0.6 * (1 - prog(t, mk!.t, tl.morph * 2, ease.arrive))} /> : null}
              <HopDisc kind={hop.kind} x={hx + dx} y={railY} r={r} color={col} fx={ctx.fx} k={(isCur ? 1 : st === 'idle' ? 0 : 0.4) * k} scale={(0.55 + 0.45 * pop) * emph} opacity={Math.min(1, pop * 1.4) * (st === 'idle' && cap.pos < i - 0.5 ? 0.8 : 1)} />
              {/* acrylic top highlight on the glass disc */}
              <path d={`M ${(hx + dx - r * 0.62).toFixed(1)} ${(railY - r * 0.55).toFixed(1)} A ${(r * 0.85).toFixed(1)} ${(r * 0.85).toFixed(1)} 0 0 1 ${(hx + dx + r * 0.62).toFixed(1)} ${(railY - r * 0.55).toFixed(1)}`} fill="none" stroke={C.white} strokeWidth={2.5} strokeLinecap="round" strokeOpacity={0.22 * Math.min(1, pop)} />
            </g>
          );
        })}
        {/* failure shards (seeded) */}
        {broken
          ? Array.from({length: 9}, (_, j) => {
              const a = random(`rj-a-${ctx.id}-${j}`) * Math.PI * 2;
              const d = (50 + random(`rj-d-${ctx.id}-${j}`) * 90) * fp;
              const sx = xOf(broken.hop) + Math.cos(a) * d;
              const sy = railY + Math.sin(a) * d * 0.8 + 40 * fp * fp;
              const sz = 5 + random(`rj-s-${ctx.id}-${j}`) * 7;
              return <rect key={`sh${j}`} x={sx - sz / 2} y={sy - sz / 2} width={sz} height={sz} rx={1.5} fill={C.crit} opacity={0.9 * (1 - fp)} transform={`rotate(${(a * 57 + fp * 200).toFixed(0)} ${sx.toFixed(1)} ${sy.toFixed(1)})`} />;
            })
          : null}
        {/* the request capsule: shadow on the floor, streak, glossy pill with bloom */}
        {t >= bornAt(0) ? (
          <g opacity={o1(prog(t, bornAt(0), lblN))}>
            <ellipse cx={cx} cy={floorY + 2} rx={cw * 1.3 * capS} ry={eRy * 0.5} fill={C.void} opacity={0.6} />
            <ellipse cx={cx} cy={floorY} rx={cw * 1.6 * capS} ry={eRy * 0.6} fill={capCol} opacity={0.3} />
            {streak > 2 ? <rect x={Math.min(cx, cx - dir * streak)} y={railY - ch * 0.7} width={streak} height={ch * 1.4} rx={ch * 0.7} fill={`url(#${ctx.id}-tr)`} /> : null}
            <g transform={`translate(${cx.toFixed(1)} ${capY.toFixed(1)}) scale(${capS.toFixed(3)})`} opacity={retryM ? o1(formQ * 1.6) : undefined}>
              <rect x={-cw - ctx.fx.glowInner * 1.1} y={-ch - ctx.fx.glowInner * 1.1} width={2 * cw + ctx.fx.glowInner * 2.2} height={2 * ch + ctx.fx.glowInner * 2.2} rx={ch + ctx.fx.glowInner * 1.1} fill={capCol} fillOpacity={0.16} />
              <rect x={-cw - ctx.fx.glowInner * 0.45} y={-ch - ctx.fx.glowInner * 0.45} width={2 * cw + ctx.fx.glowInner * 0.9} height={2 * ch + ctx.fx.glowInner * 0.9} rx={ch + ctx.fx.glowInner * 0.45} fill={capCol} fillOpacity={0.26} />
              <rect x={-cw} y={-ch} width={2 * cw} height={2 * ch} rx={ch} fill={`url(#${ctx.id}-cp)`} stroke={capCol} strokeWidth={broken ? 3 : 4} />
              <rect x={-cw + 9} y={-ch + 4} width={2 * cw - 18} height={4} rx={2} fill={C.white} opacity={broken ? 0.2 : 0.7} />
              {broken ? <path d={`M ${-9} ${-ch} L ${-2} ${-4} L ${-11} ${4} L ${-3} ${ch} M ${12} ${-ch} L ${6} ${0} L ${14} ${ch}`} fill="none" stroke={C.crit} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </g>
            {retryM && formQ < 1 ? <ellipse cx={cx} cy={capY} rx={(cw + 30) * (1 + 1.4 * formQ)} ry={(ch + 30) * (1 + 1.4 * formQ)} fill="none" stroke={C.warn} strokeWidth={3} strokeOpacity={0.8 * (1 - formQ)} /> : null}
          </g>
        ) : null}
      </svg>
      {hops.map((hop, i) => {
        const born = bornAt(i);
        const lp = prog(t, born, lblN);
        const mk = tl.hopMark(i, t);
        const st = mk?.kind ?? 'idle';
        const pl = placeLabel(xOf(i), two ? 2 * step - 40 : step - 36, w);
        const op = t < born ? 0 : lp * (st === 'idle' ? 0.75 : 1);
        const col = st === 'fail' ? C.crit : st === 'retry' ? C.warn : st === 'lit' ? C.ink : C.ink2;
        // the latency lands when the hop first lights (travel / retry arrival), RV1 on that frame
        const litT = tl.marks.filter((m) => m.hop === i && m.kind === 'lit' && m.t >= born).map((m) => m.t)[0];
        const lat = hop.latency;
        const showLat = lat && litT !== undefined && t >= litT;
        const lq = litT !== undefined ? prog(t, litT, impN, ease.impact) : 0;
        const ty = tierY(i);
        return (
          <React.Fragment key={hop.id}>
            {two && i % 2 === 1 ? (
              <div style={{position: 'absolute', left: xOf(i) - 1, top: ty + 4, width: 2, height: lblBottom + 6 - ty - 4, background: col, opacity: op * 0.4}} />
            ) : null}
            <Lbl
              id={`${ctx.id}:h${i}`}
              text={hop.label}
              x={pl.x}
              y={ty}
              align={pl.align}
              valign="bottom"
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
                y={floorY + eRy * 1.3 + 26}
                valign="top"
                maxW={Math.max(150, step - 30)}
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
