// TimelineTrack (catalog: Structure & flow). Events on a glass rail with a light cursor that moves on anchors (04 §6: SCD-2 rows
// on a timeline, the RPO/RTO timeline, the incident timeline).
//  - Depth and light (ADR-003 LK-F): a floor plane with converging perspective lines under the rail, a glass slab rail with a
//    rim highlight and a floor reflection, a contact pool under each marker, a key-light cone and a light pool at the cursor
//    (the cursor's event is the brightest thing in the frame). Flat 2.5D vector art: no WebGL, so every tier renders the same
//    geometry (only the tier's glow radii differ).
//  - RTL when any copy is Arabic: the first event sits on the right and time runs right -> left (reading order).
//  - Layer anchor: the rail path-draws in reading direction; each marker pops as the rail reaches it (RV1: first ink on its own
//    frame) and its card rises on the label preset.
//  - Kind = semantic colour (04 §1.1): event ink2 · release ok · incident crit · milestone ink (double ring). Shapes differ too
//    (disc / diamond / triangle / double ring), so the kind never rests on colour alone.
//  - cursorTo(index): the cursor travels to the event over the anchor word (>= morph long, camera ease); events behind it stay
//    lit, the current one lifts on a light pool and sends a ripple, events ahead dim. The rail behind it carries the signal.
//  - Cards alternate above / below the rail; `when` sits on the opposite side. Dense timelines (> 5 events) stagger into two
//    lanes per side so each card keeps 4 steps of room. Each card auto-fits that room and the box edge (floor 28 px; an
//    overflow is reported and fails snapshots).
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex, halo} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor} from '../../type/arabic';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, GlowPath, Lbl, Pool, actionsOf, cardStyle, f24, layerStyle, lerp, placeLabel, prog, rtlOf} from '../_struct-b/kit';

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

/** Vertical layout shared by the view and the text mask: rail line, first-card gap, lane pitch, lanes per side. */
const GAP0 = 84;
const LANE = 92;
export const lanesFor = (n: number, h: number) => (n <= 5 ? 1 : Math.max(1, Math.min(2, Math.floor((h / 2 - GAP0 - 40) / LANE) + 1)));
const textBand = (n: number, h: number) => GAP0 + (lanesFor(n, h) - 1) * LANE + 64;

/** Card: one glass plate, one whole string (never split); auto-fit to the room, floor 28 px, overflow reported. */
const Card: React.FC<{
  id: string;
  text: string;
  x: number;
  y: number;
  total: number; // wanted outer width incl. padding
  align: 'center' | 'left' | 'right';
  up: boolean;
  color: string;
  accent?: string;
  size: number;
  hot: boolean;
  opacity: number;
  lift: number;
}> = ({id, text, x, y, total, align, up, color, accent, size, hot, opacity, lift}) => {
  const ref = useRef<HTMLDivElement>(null);
  const padH = Math.round(size * 0.55);
  const fit = useAutoFit(ref, {id, size, min: SIZE.labelMin, maxW: Math.max(60, total - 2 * padH - 4), key: text});
  const ar = isArabic(text);
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0%';
  const sc = hot ? 1.07 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${tx}, ${up ? '-100%' : '0%'}) translateY(${lift.toFixed(2)}px) scale(${sc})`,
        transformOrigin: up ? '50% 100%' : '50% 0%',
        opacity,
        visibility: opacity < 0.004 ? 'hidden' : undefined,
        pointerEvents: 'none',
      }}
    >
      <div
        ref={ref}
        dir={ar ? 'rtl' : 'ltr'}
        data-overflow={fit.overflow ? 1 : undefined}
        style={{
          width: 'max-content',
          whiteSpace: 'nowrap',
          fontSize: fit.size,
          lineHeight: ar ? lineHeightFor(text) : 1.25,
          color,
          textShadow: halo,
          padding: `${Math.round(fit.size * 0.22)}px ${Math.round(fit.size * 0.55)}px`,
          ...cardStyle(accent, hot ? 0.97 : 0.9),
          borderRadius: 16,
          // no outer box-shadow: it leaves raster-tile seams that break determinism (0 px rule). The rim light is two hollow rings.
          position: 'relative',
          boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.12)}`,
          outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
        }}
      >
        {[4, 9].map((g, j) => (
          <div key={g} style={{position: 'absolute', inset: -g, borderRadius: 16 + g, border: `${g === 4 ? 4 : 5}px solid ${accent ?? C.ink3}${hex((j ? 0.5 : 1) * (hot ? 0.2 : accent ? 0.12 : 0.05))}`, zIndex: -1}} />
        ))}
        <MixedText id={id} text={text} size={fit.size} role={ar ? 'sentence' : 'code'} weight={ar ? FONT.label.strong : FONT.mono.weight} />
      </div>
    </div>
  );
};

export const TimelineTrackView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const ev = props.events;
  const n = ev.length;
  const rtl = rtlOf(ev.flatMap((e) => [e.label, e.when]));
  const padX = Math.max(96, w * 0.08);
  const step = n > 1 ? (w - 2 * padX) / (n - 1) : 0;
  const xOf = (i: number) => (n === 1 ? w / 2 : rtl ? w - padX - i * step : padX + i * step);
  const railY = Math.round(h * 0.5);
  const x0 = xOf(0);
  const x1 = xOf(n - 1);
  const lanes = lanesFor(n, h);
  // rail draw-on (reading direction); each event is born when the rail reaches its marker
  const drawN = presetFrames('morph', ctx.fps, true) + f24(2 * n, ctx.fps);
  const draw = prog(t, ctx.at, drawN, ease.camera);
  const bornAt = (i: number) => ctx.at + (n === 1 ? 0 : Math.round((i / (n - 1)) * (drawN - 1)));
  const cur = cursorAt(n, ctx, t);
  const cx = cur ? (n === 1 ? w / 2 : lerp(x0, x1, cur.pos / Math.max(1, n - 1))) : null;
  const k = 1 + ctx.mod.glow;
  const railEnd = lerp(x0, x1, draw);
  const sx = Math.min(x0, railEnd);
  const sw = Math.abs(railEnd - x0);
  const stateOf = (i: number) => (!cur ? 'all' : Math.abs(cur.pos - i) < 0.5 ? 'cur' : i < cur.pos ? 'past' : 'next');
  const curI = cur ? Math.round(cur.pos) : -1;
  const floorH = Math.min(h / 2 - 8, 250);
  const total = Math.min(520, n === 1 ? w - 160 : lanes === 1 ? 2 * step - 40 : 4 * step - 48);
  const gid = `${ctx.id}-tl`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const kinds: Kind[] = ['event', 'release', 'incident', 'milestone'];
  const beamH = Math.min(h * 0.32, 190);
  // arrival ripples: one ring per cursorTo, on the event it lands on
  const ripples = actionsOf(ctx, 'cursorTo').flatMap((a) => {
    const idx = Math.min(n - 1, Math.max(0, a.props.index as number));
    const arrive = a.at + Math.max(presetFrames('morph', ctx.fps, true), a.end - a.at);
    const q = (t - arrive) / f24(22, ctx.fps);
    return q >= 0 && q < 1 ? [{idx, q}] : [];
  });
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {cx !== null ? <Pool x={cx} y={railY} r={Math.max(170, step * 0.8)} color={C.signal} a={0.26 * cur!.shown} squash={0.6} /> : null}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          {kinds.map((kd) => (
            <linearGradient key={kd} id={`${gid}-rf-${kd}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={KIND_COLOR[kd]} stopOpacity={0.5} />
              <stop offset="1" stopColor={KIND_COLOR[kd]} stopOpacity={0} />
            </linearGradient>
          ))}
          <linearGradient id={`${gid}-beam`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.4} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* floor plane: horizon on the rail, perspective lines toward the viewer (depth cue, fades with the rail draw-on) */}
        <g opacity={draw * 0.9}>
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((j) => (
            <line key={`v${j}`} x1={w / 2 + j * (w * 0.02)} y1={railY + 12} x2={w / 2 + j * (w * 0.13)} y2={railY + floorH} stroke={C.grid} strokeOpacity={0.5} strokeWidth={1.5} />
          ))}
          {[0.12, 0.28, 0.5, 0.78, 1].map((u, j) => (
            <line key={`h${j}`} x1={w / 2 - w * (0.04 + 0.52 * u)} y1={railY + 12 + (floorH - 12) * u * u} x2={w / 2 + w * (0.04 + 0.52 * u)} y2={railY + 12 + (floorH - 12) * u * u} stroke={C.grid} strokeOpacity={0.7 - 0.45 * u} strokeWidth={1.5} />
          ))}
        </g>
        {/* rail: glass slab with a rim highlight, its floor reflection, quarter-step ticks, then the drawn signal */}
        {sw > 1 ? (
          <g>
            <rect x={sx} y={railY + 16} width={sw} height={6} rx={3} fill={C.ink3} fillOpacity={0.1} />
            <rect x={sx} y={railY - 8} width={sw} height={16} rx={8} fill={C.panel} stroke={C.grid} strokeWidth={1.5} />
            <line x1={sx + 8} y1={railY - 6} x2={sx + sw - 8} y2={railY - 6} stroke={C.ink} strokeOpacity={0.22} strokeWidth={1.5} strokeLinecap="round" />
            {n > 1
              ? Array.from({length: (n - 1) * 4 + 1}, (_, j) => j)
                  .filter((j) => j % 4 !== 0)
                  .map((j) => {
                    const x = x0 + ((x1 - x0) * j) / ((n - 1) * 4);
                    return Math.abs(x - x0) <= sw ? <line key={j} x1={x} y1={railY + 12} x2={x} y2={railY + 20} stroke={C.ink3} strokeOpacity={0.55} strokeWidth={2} /> : null;
                  })
              : null}
          </g>
        ) : null}
        <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${railEnd.toFixed(1)} ${railY}`} color={C.ink3} width={3} fx={ctx.fx} k={0.4} opacity={draw > 0 ? 0.9 : 0} />
        {cx !== null ? <GlowPath d={`M ${x0.toFixed(1)} ${railY} L ${cx.toFixed(1)} ${railY}`} color={C.signal} width={5} fx={ctx.fx} k={k} opacity={cur!.shown} /> : null}
        {cx !== null ? <polygon points={`${cx - 10},${railY - 6} ${cx + 10},${railY - 6} ${cx + 38},${railY - beamH} ${cx - 38},${railY - beamH}`} fill={`url(#${gid}-beam)`} opacity={cur!.shown} /> : null}
        {ev.map((e, i) => {
          if (t < bornAt(i)) return null;
          const pop = prog(t, bornAt(i), presetFrames('impact', ctx.fps, true), ease.impact);
          const x = xOf(i);
          const kind: Kind = e.kind ?? 'event';
          const col = KIND_COLOR[kind];
          const st = stateOf(i);
          const dim = st === 'next' ? 0.5 : 1;
          const s = (st === 'cur' ? 1.3 : 1) * (0.55 + 0.45 * pop);
          const up = i % 2 === 0;
          const lane = n <= 5 ? 0 : (i >> 1) % lanes;
          const stemY = up ? railY - GAP0 - lane * LANE : railY + GAP0 + lane * LANE;
          return (
            <g key={i} opacity={dim * Math.min(1, pop * 1.4)}>
              <ellipse cx={x} cy={railY + 4} rx={46 * s} ry={11 * s} fill={col} fillOpacity={st === 'cur' ? 0.3 : 0.14} />
              <rect x={x - 3} y={railY + 14} width={6} height={44} fill={`url(#${gid}-rf-${kind})`} opacity={0.5} />
              <line x1={x} y1={railY} x2={x} y2={stemY} stroke={col} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray={st === 'next' ? '3 5' : undefined} />
              <circle cx={x} cy={stemY} r={3.5} fill={col} />
              <g transform={`translate(${x.toFixed(1)} ${railY}) scale(${s.toFixed(3)})`}>
                {kind === 'release' ? <rect x={-13} y={-13} width={26} height={26} transform="rotate(45)" fill={C.ground} stroke={col} strokeWidth={3.5} /> : null}
                {kind === 'incident' ? <path d="M 0 -19 L 17 13 L -17 13 Z" fill={C.ground} stroke={col} strokeWidth={3.5} strokeLinejoin="round" /> : null}
                {kind === 'milestone' ? <Dot x={0} y={0} r={17} color={col} fx={ctx.fx} k={0.5} ring={2.5} /> : null}
                {kind === 'milestone' ? <circle r={7.5} fill={col} /> : null}
                {kind === 'event' ? <Dot x={0} y={0} r={12} color={col} fx={ctx.fx} k={0.4} ring={3.5} /> : null}
                {st === 'cur' ? <circle r={kind === 'incident' ? 8 : 5} fill={C.ink} fillOpacity={0.9} cy={kind === 'incident' ? 3 : 0} /> : null}
              </g>
            </g>
          );
        })}
        {ripples.map((r, j) => (
          <circle key={j} cx={xOf(r.idx)} cy={railY} r={24 + 78 * r.q} fill="none" stroke={KIND_COLOR[ev[r.idx].kind ?? 'event'] === C.ink2 ? C.signal : KIND_COLOR[ev[r.idx].kind ?? 'event']} strokeWidth={3 * (1 - r.q) + 0.8} strokeOpacity={0.75 * (1 - r.q) * (1 - r.q)} />
        ))}
        {cx !== null ? (
          <g opacity={cur!.shown}>
            <GlowPath d={`M ${cx.toFixed(1)} ${railY - 44} L ${cx.toFixed(1)} ${railY + 40}`} color={C.signal} width={3} fx={ctx.fx} k={k * 0.9} />
            <circle cx={cx} cy={railY} r={30} fill="none" stroke={C.signal} strokeWidth={2.5} strokeOpacity={0.85} />
          </g>
        ) : null}
      </svg>
      {ev.map((e, i) => {
        const born = bornAt(i);
        const lp = prog(t, born, presetFrames('label', ctx.fps));
        const x = xOf(i);
        const up = i % 2 === 0;
        const lane = n <= 5 ? 0 : (i >> 1) % lanes;
        const st = stateOf(i);
        const op = t < born ? 0 : lp * (st === 'next' ? 0.58 : 1);
        const kind: Kind = e.kind ?? 'event';
        const pl = placeLabel(x, total, w);
        const pw = placeLabel(x, n > 1 ? step - 32 : w - 80, w);
        const y = up ? railY - GAP0 - lane * LANE : railY + GAP0 + lane * LANE;
        const hot = i === curI;
        return (
          <React.Fragment key={i}>
            <Card
              id={`${ctx.id}:e${i}`}
              text={e.label}
              x={pl.x}
              y={y}
              total={Math.min(total, pl.maxW)}
              align={pl.align}
              up={up}
              color={st === 'next' ? C.ink2 : C.ink}
              accent={hot ? C.signal : kind === 'incident' ? C.crit : kind === 'release' ? C.ok : undefined}
              size={SIZE.label}
              hot={hot}
              opacity={op}
              lift={(1 - lp) * 8 + (hot ? (up ? -8 : 8) : 0)}
            />
            {e.when ? (
              <Lbl
                id={`${ctx.id}:w${i}`}
                text={e.when}
                x={pw.x}
                y={up ? railY + 48 : railY - 48}
                align={pw.align}
                valign={up ? 'top' : 'bottom'}
                maxW={pw.maxW}
                size={SIZE.labelMin}
                color={hot ? C.signal : C.ink2}
                opacity={op}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const textRect = (p: Props, b: {x: number; y: number; w: number; h: number}) => {
  const band = textBand(p.events.length, b.h);
  return {x: b.x, y: b.y + b.h / 2 - band, w: b.w, h: 2 * band};
};

export const TimelineTrack: DcComponent<Props> = {name: 'TimelineTrack', Component: TimelineTrackView, text: true, slot: 'full', textRect};
