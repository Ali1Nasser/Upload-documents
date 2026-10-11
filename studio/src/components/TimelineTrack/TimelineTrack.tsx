// TimelineTrack (catalog: Structure & flow). Events on a glowing rail; a light cursor moves on anchors (04 §6: SCD-2 rows on a
// timeline, the RPO/RTO timeline, the incident timeline).
//  - RTL when any copy is Arabic: the first event sits on the right and time runs right -> left (reading order).
//  - Layer anchor: the rail path-draws in reading direction (morph, camera ease); each marker pops as the rail reaches it
//    (RV1: first ink on its own frame) and its label rises on the label preset.
//  - Kind = semantic colour (04 §1.1): event ink2 · release ok · incident crit · milestone ink (double ring).
//  - cursorTo(index): the cursor (signal beam + pointer) travels to the event over the anchor word (>= morph long, camera
//    ease); events behind it stay lit, the current one glows on a light pool, events ahead dim. The rail behind it carries
//    the signal.
//  - Labels alternate above / below the rail on plates; `when` sits on the opposite side. Each label auto-fits the room its
//    neighbours on the same side leave (2 steps) and the box edge (floor 28 px; an overflow is reported and fails snapshots).
import React from 'react';
import {C, SIZE} from '../../tokens';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, GlowPath, Lbl, Pool, actionsOf, f24, layerStyle, lerp, prog, rtlOf} from '../_struct-b/kit';

type Kind = NonNullable<Props['events'][number]['kind']>;
const KIND_COLOR: Record<Kind, string> = {event: C.ink2, release: C.ok, incident: C.crit, milestone: C.ink};
type Ctx = DcProps<Props>['ctx'];

/** Cursor position (fractional event index) at frame t; null before the first cursorTo. */
export const cursorAt = (n: number, ctx: Ctx, t: number): {pos: number; shown: number} | null => {
  const acts = actionsOf(ctx, 'cursorTo');
  if (!acts.length || t < acts[0].at) return null;
  let from = Math.min(n - 1, Math.max(0, acts[0].props.index as number));
  let pos = from;
  for (const a of acts) {
    if (t < a.at) break;
    const to = Math.min(n - 1, Math.max(0, a.props.index as number));
    const dur = Math.max(presetFrames('morph', ctx.fps, true), a.end - a.at);
    const q = prog(t, a.at, dur, ease.camera);
    pos = lerp(from, to, q);
    from = q < 1 ? pos : to;
  }
  return {pos, shown: prog(t, acts[0].at, presetFrames('label', ctx.fps))};
};

export const TimelineTrackView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const ev = props.events;
  const n = ev.length;
  const rtl = rtlOf(ev.flatMap((e) => [e.label, e.when]));
  const padX = Math.max(80, w * 0.08);
  const step = n > 1 ? (w - 2 * padX) / (n - 1) : 0;
  const xOf = (i: number) => (n === 1 ? w / 2 : rtl ? w - padX - i * step : padX + i * step);
  const railY = Math.round(h * 0.5);
  const x0 = xOf(0);
  const x1 = xOf(n - 1);
  // rail draw-on (reading direction); each event is born when the rail reaches its marker
  const drawN = presetFrames('morph', ctx.fps, true) + f24(2 * n, ctx.fps);
  const draw = prog(t, ctx.at, drawN, ease.camera);
  const bornAt = (i: number) => ctx.at + (n === 1 ? 0 : Math.round((i / (n - 1)) * (drawN - 1)));
  const cur = cursorAt(n, ctx, t);
  const cx = cur ? (n === 1 ? w / 2 : lerp(x0, x1, cur.pos / Math.max(1, n - 1))) : null;
  const k = 1 + ctx.mod.glow;
  const railEnd = lerp(x0, x1, draw);
  const tierLbl = Math.round(SIZE.label * 2.1);
  const tierWhen = Math.round(SIZE.labelMin * 0.9);
  const stateOf = (i: number) => (!cur ? 'all' : Math.abs(cur.pos - i) < 0.5 ? 'cur' : i < cur.pos ? 'past' : 'next');
  const curI = cur ? Math.round(cur.pos) : -1;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {cx !== null ? <Pool x={cx} y={railY} r={Math.max(140, step * 0.7)} color={C.signal} a={0.22 * cur!.shown} squash={0.55} /> : null}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* faint full-length guide, the drawn rail, then the signal portion behind the cursor */}
        <line x1={x0} y1={railY} x2={x1} y2={railY} stroke={C.grid} strokeWidth={2} opacity={draw > 0 ? 0.6 : 0} />
        <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${railEnd.toFixed(1)} ${railY}`} color={C.ink3} width={3} fx={ctx.fx} k={0.4} opacity={draw > 0 ? 0.9 : 0} />
        {cx !== null ? <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${cx.toFixed(1)} ${railY}`} color={C.signal} width={4} fx={ctx.fx} k={k} opacity={cur!.shown} /> : null}
        {ev.map((e, i) => {
          if (t < bornAt(i)) return null;
          const pop = prog(t, bornAt(i), presetFrames('impact', ctx.fps, true), ease.impact);
          const x = xOf(i);
          const kind: Kind = e.kind ?? 'event';
          const col = KIND_COLOR[kind];
          const st = stateOf(i);
          const dim = st === 'next' ? 0.45 : 1;
          const s = (st === 'cur' ? 1.25 : 1) * (0.55 + 0.45 * pop);
          const up = i % 2 === 0;
          const stemY = up ? railY - tierLbl + 6 : railY + tierLbl - 6;
          return (
            <g key={i} opacity={dim * Math.min(1, pop * 1.4)}>
              <line x1={x} y1={railY} x2={x} y2={stemY} stroke={col} strokeOpacity={0.45} strokeWidth={1.5} />
              <g transform={`translate(${x.toFixed(1)} ${railY}) scale(${s.toFixed(3)})`}>
                {kind === 'release' ? <rect x={-11} y={-11} width={22} height={22} transform="rotate(45)" fill={C.ground} stroke={col} strokeWidth={3} /> : null}
                {kind === 'incident' ? <path d="M 0 -15 L 14 11 L -14 11 Z" fill={C.ground} stroke={col} strokeWidth={3} strokeLinejoin="round" /> : null}
                {kind === 'milestone' ? <Dot x={0} y={0} r={14} color={col} fx={ctx.fx} k={0.5} ring={2} /> : null}
                {kind === 'milestone' ? <circle r={6} fill={col} /> : null}
                {kind === 'event' ? <Dot x={0} y={0} r={10} color={col} fx={ctx.fx} k={0.4} ring={3} /> : null}
              </g>
            </g>
          );
        })}
        {cx !== null ? (
          <g opacity={cur!.shown}>
            <GlowPath d={`M ${cx.toFixed(1)} ${railY - 40} L ${cx.toFixed(1)} ${railY + 40}`} color={C.signal} width={2.5} fx={ctx.fx} k={k * 0.9} />
            <circle cx={cx} cy={railY} r={24} fill="none" stroke={C.signal} strokeWidth={2} strokeOpacity={0.75} />
          </g>
        ) : null}
      </svg>
      {ev.map((e, i) => {
        const born = bornAt(i);
        const lp = prog(t, born, presetFrames('label', ctx.fps));
        const x = xOf(i);
        const up = i % 2 === 0;
        const st = stateOf(i);
        const op = t < born ? 0 : lp * (st === 'next' ? 0.55 : 1);
        const kind: Kind = e.kind ?? 'event';
        // centred on the marker when the box edge leaves room; an end label is anchored inward instead (never outside the box)
        const place = (want: number): {x: number; maxW: number; align: 'center' | 'left' | 'right'} => {
          const outerLeft = x < w / 2;
          const outerRoom = (outerLeft ? x : w - x) - 6;
          if (2 * outerRoom >= want) return {x, maxW: want, align: 'center'};
          const lx = outerLeft ? x - Math.min(outerRoom, 36) : x + Math.min(outerRoom, 36);
          return {x: lx, maxW: Math.min(want, outerLeft ? w - lx - 6 : lx - 6), align: outerLeft ? 'left' : 'right'};
        };
        const pl = place(n > 1 ? 2 * step - 48 : w - 80);
        const pw = place(n > 1 ? step - 32 : w - 80);
        return (
          <React.Fragment key={i}>
            <Lbl
              id={`${ctx.id}:e${i}`}
              text={e.label}
              x={pl.x}
              y={up ? railY - tierLbl : railY + tierLbl}
              align={pl.align}
              valign={up ? 'bottom' : 'top'}
              maxW={pl.maxW}
              color={st === 'next' ? C.ink2 : C.ink}
              plate
              accent={i === curI ? C.signal : kind === 'incident' ? C.crit : kind === 'release' ? C.ok : undefined}
              fx={ctx.fx}
              opacity={op}
              style={{marginTop: (1 - lp) * 6}}
            />
            {e.when ? (
              <Lbl
                id={`${ctx.id}:w${i}`}
                text={e.when}
                x={pw.x}
                y={up ? railY + tierWhen : railY - tierWhen}
                align={pw.align}
                valign={up ? 'top' : 'bottom'}
                maxW={pw.maxW}
                size={SIZE.labelMin}
                color={i === curI ? C.signal : C.ink2}
                opacity={op}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const TimelineTrack: DcComponent<Props> = {name: 'TimelineTrack', Component: TimelineTrackView, text: true, slot: 'center'};
