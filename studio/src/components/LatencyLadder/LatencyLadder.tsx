// LatencyLadder (catalog: Domain specials). 04 §6 "What a computer does": a latency ladder as 10x zoom steps. A real ladder
// seen in light perspective: two rails on the right (RTL start, tapering upward), one peg per rung, rung 0 (fastest) at the
// bottom. Beside each peg a trough (ghost track) holds an acrylic bar on a LOG scale (every 10x is one equal step, drawn as
// decade ticks), its label on the right and its value + unit in a mono LTR isolate at the bar tip. Mixed units (ns/us/ms/s/min)
// share one scale: the scale is seconds, the numbers shown are exactly the props (with `ref`, never invented).
// Slow rungs shade signal -> warn (04 §1.1: amber = slow). The tip is a bright emitter; the climbed part of the rails is lit.
// Motion: rungs arrive staggered 3 f@24 from the layer anchor (label preset). Without `climb`, every bar grows on arrival.
// `climb {to}` (anchored to the word that names the step) -> a climber orb with a comet tail rises rung by rung to `to`; each
// reached bar grows to its value (arrive preset, RV1 onset), flashes at the tip with two pulse rings and lights its peg; the
// previous top rung settles to a dimmer tone. The "zoom out" of the bible is the log scale itself: every rung adds one decade
// of length, never a rescale (no number moves). DOM + SVG only (no WebGL, no filters): every tier is the same code.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {FitText, Floor, acrylic, actsOf, clamp, emit, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

type Rung = Props['rungs'][number];
const fmt = (n: Rung['latency']) => `${formatValue(n.value, 'decimal', n.decimals ?? 0)}${n.unit ? ` ${n.unit}` : ''}`;

/** Seconds per unit, so a ladder may mix ns / us / ms / s / min on one scale; an unknown unit counts as the base unit. */
const UNIT_S: Record<string, number> = {ns: 1e-9, 'µs': 1e-6, us: 1e-6, ms: 1e-3, s: 1, sec: 1, min: 60, h: 3600};
export const seconds = (n: Rung['latency']): number => n.value * (UNIT_S[(n.unit ?? '').trim()] ?? 1);

/** Bar length fraction on a log scale with one decade of headroom below the fastest rung (it never draws at zero). */
export const logFrac = (v: number, lo: number, hi: number): number => {
  const a = Math.log10(Math.max(1e-12, lo)) - 1;
  const b = Math.log10(Math.max(1e-12, hi));
  return b <= a ? 1 : Math.max(0.04, Math.min(1, (Math.log10(Math.max(1e-12, v)) - a) / (b - a)));
};

export const LatencyLadderView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.rungs.length;
  const box = ctx.box;
  const t = ctx.frame;
  const secs = props.rungs.map(seconds);
  const lo = Math.min(...secs);
  const hi = Math.max(...secs);
  const rowH = Math.min(150, box.h / n);
  const H = rowH * n;
  const barH = Math.round(Math.min(rowH * 0.5, 64));
  const labelW = Math.round(box.w * 0.26);
  const valueW = Math.round(box.w * 0.16);
  const railW = 52; // ladder width between the label column and the bars
  const barX1 = box.x + box.w - labelW - railW - 28; // right end of the bar track (bars grow right -> left, RTL)
  const trackW = barX1 - box.x - valueW - 28;
  const top = box.y + (box.h - H) / 2;
  const yOf = (i: number) => top + (n - 1 - i) * rowH + rowH / 2;
  // ladder rails taper upward (depth cue): half-width 16 at the foot, 12.5 at the head
  const cx = barX1 + 12 + railW / 2;
  const half = (y: number) => 12.5 + 3.5 * ((y - top) / H);
  // climb timeline: frame each rung is reached (null = never reached)
  const climbs = actsOf(ctx, 'climb');
  const reach: (number | null)[] = props.rungs.map((_, i) => (climbs.length ? null : ctx.at + ff(3 * i, ctx.fps)));
  let topAt = -1;
  for (const a of climbs) {
    const to = Math.min(n - 1, a.props.to as number);
    const step = ff(5, ctx.fps);
    for (let i = topAt + 1; i <= to; i++) reach[i] = a.at + (i - topAt - 1) * step;
    topAt = Math.max(topAt, to);
  }
  const reached = reach.filter((r): r is number => r !== null && r <= t);
  const curTop = reached.length ? reach.lastIndexOf(Math.max(...reached)) : -1;
  // climber position (fractional rung index) and the lit height of the rails
  let climber = -1;
  for (let i = 0; i < n; i++) if (reach[i] !== null && (reach[i] as number) <= t) climber = Math.max(climber, i - 1 + prog(ctx, reach[i] as number, 'arrive'));
  const climberY = climber >= 0 ? top + H - rowH / 2 - Math.max(0, climber) * rowH : top + H;
  const rtl = props.rungs.some((r) => isArabic(r.label));
  const decades = Math.max(1, Math.ceil(Math.log10(hi) - (Math.log10(lo) - 1)));
  const glowK = 1 + ctx.mod.glow;
  const topY = curTop >= 0 ? yOf(curTop) : top + H;
  const topFrac = curTop >= 0 ? logFrac(secs[curTop], lo, hi) : 0;
  const topTone = curTop >= 0 ? mix(C.signal, C.warn, Math.pow(topFrac, 1.6) * 0.9) : C.signal;
  const floorY = top + H + 6;
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {/* back glow behind the current top rung, floor grid under the ladder */}
      {curTop >= 0 ? <div style={{position: 'absolute', left: barX1 - trackW * 0.85, top: topY - rowH * 1.2, width: trackW * 0.95, height: rowH * 2.4, borderRadius: '50%', background: `radial-gradient(ellipse, ${topTone}${hex(0.16 * glowK)} 0%, ${topTone}${hex(0.05)} 50%, transparent 72%)`}} /> : null}
      {box.y + box.h - floorY > 70 ? <Floor x={box.x} y={floorY} w={box.w} h={Math.min(box.y + box.h - floorY, 240)} opacity={0.5} /> : null}
      {/* decade ticks and the decade grid: equal steps = 10x each */}
      <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {Array.from({length: decades + 1}, (_, d) => {
          const x = barX1 - (trackW * d) / decades;
          return <line key={d} x1={x} x2={x} y1={top} y2={top + H} stroke={d === 0 ? C.ink3 : C.grid} strokeOpacity={d === 0 ? 0.6 : 1} strokeWidth={d === 0 ? 2 : 1.5} strokeDasharray={d === 0 ? undefined : '3 9'} />;
        })}
        {/* rails: dim, then the climbed part lit (wide faint underlay = glow, never a filter) */}
        {[-1, 1].map((s) => (
          <line key={`r${s}`} x1={cx + s * half(top + H)} y1={top + H} x2={cx + s * half(top)} y2={top} stroke={C.ink3} strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />
        ))}
        {climber >= 0
          ? [-1, 1].map((s) => (
              <React.Fragment key={`l${s}`}>
                <line x1={cx + s * half(top + H)} y1={top + H} x2={cx + s * half(climberY)} y2={climberY} stroke={C.signal} strokeOpacity={0.22 * glowK} strokeWidth={3 + ctx.fx.glowInner * 0.9} strokeLinecap="round" />
                <line x1={cx + s * half(top + H)} y1={top + H} x2={cx + s * half(climberY)} y2={climberY} stroke={C.signal} strokeWidth={3} strokeLinecap="round" />
              </React.Fragment>
            ))
          : null}
        {props.rungs.map((_, i) => {
          const y = yOf(i);
          const lit = reach[i] !== null && t >= (reach[i] as number);
          return <line key={`p${i}`} x1={cx - half(y)} x2={cx + half(y)} y1={y} y2={y} stroke={lit ? C.signal : C.ink3} strokeOpacity={lit ? 1 : 0.55} strokeWidth={lit ? 4 : 3} strokeLinecap="round" />;
        })}
      </svg>
      {props.rungs.map((r, i) => {
        const born = ctx.at + ff(3 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'label');
        const ra = reach[i];
        const g = ra !== null && t >= ra ? prog(ctx, ra, 'arrive', undefined, true) : 0;
        const isTop = i === curTop;
        const frac = logFrac(secs[i], lo, hi);
        const base = mix(C.signal, C.warn, Math.pow(frac, 1.6) * 0.9); // slow = amber
        const tone = g <= 0 ? C.ink3 : isTop ? base : mix(base, C.ink2, climbs.length ? 0.45 : 0.15);
        const w = Math.round(trackW * frac * g);
        const y = yOf(i);
        const valOn = interpolate(g, [0.5, 1], [0, 1], clamp);
        const flash = ra !== null ? flashAt(ctx, ra) : 0;
        const age = ra !== null ? t - ra : -1;
        const ringLife = ff(20, ctx.fps);
        const rings = climbs.length
          ? [0, 1].map((j) => {
              const a2 = age - ff(4 * j, ctx.fps);
              if (ra === null || a2 < 0 || a2 > ringLife) return null;
              const q = a2 / ringLife;
              const rr = 8 + 40 * (1 - Math.pow(1 - q, 2));
              return <div key={j} style={{position: 'absolute', left: barX1 - w - rr, top: y - rr, width: 2 * rr, height: 2 * rr, borderRadius: '50%', border: `2px solid ${tone}${hex(0.85 * (1 - q))}`}} />;
            })
          : null;
        return (
          <React.Fragment key={i}>
            {/* trough (ghost track) the bar fills */}
            <div style={{position: 'absolute', left: barX1 - trackW, top: y - barH / 2, width: trackW, height: barH, borderRadius: barH / 2, border: `1.5px solid ${C.ink3}${hex(0.35 * ent)}`, background: `${C.void}${hex(0.35 * ent)}`}} />
            <div style={{position: 'absolute', left: barX1 + 36, top: y - rowH / 2, width: labelW + 28, height: rowH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: ent}}>
              <FitText id={`${ctx.id}:l${i}`} text={r.label} size={SIZE.body} maxW={labelW} maxH={rowH} color={isTop ? C.ink : C.ink2} weight={FONT.label.strong} />
            </div>
            {w > 0 ? (
              <>
                {/* floor light pool under the bar */}
                <div style={{position: 'absolute', left: barX1 - w, top: y + barH / 2 - 2, width: w, height: barH * 0.55, borderRadius: '50%', background: `radial-gradient(ellipse, ${tone}${hex((isTop ? 0.42 : 0.2) * glowK)} 0%, transparent 70%)`}} />
                <div style={{position: 'absolute', left: barX1 - w, top: y - barH / 2, width: w, height: barH, ...acrylic(tone, ctx.fx, isTop ? 1 + ctx.mod.glow + 0.6 * flash : 0.45, barH / 2)}}>
                  <div style={{position: 'absolute', inset: 4, borderRadius: barH / 2, background: `linear-gradient(270deg, ${tone}${hex(0.05)}, ${tone}${hex(isTop ? 0.5 : 0.24)})`}} />
                  {/* key rim light along the upper edge */}
                  <div style={{position: 'absolute', left: barH / 2, right: barH / 2, top: 2, height: 2, borderRadius: 1, background: `linear-gradient(270deg, ${C.ink}${hex(0.05)}, ${C.ink}${hex(isTop ? 0.55 : 0.25)})`}} />
                </div>
                {/* growth head: bright emitter at the tip */}
                <div style={{position: 'absolute', left: barX1 - w - 8 - 4 * flash, top: y - 8 - 4 * flash, width: 16 + 8 * flash, height: 16 + 8 * flash, borderRadius: '50%', background: `radial-gradient(circle, ${C.white} 0%, ${tone} 55%, ${tone}${hex(0.4)} 100%)`, boxShadow: emit(tone, ctx.fx, 0.7 + 0.8 * flash), opacity: g < 1 || isTop ? 1 : 0.6}} />
                {rings}
              </>
            ) : null}
            {valOn > 0 ? (
              <div style={{position: 'absolute', left: barX1 - w - 22 - valueW, top: y - rowH / 2, width: valueW, height: rowH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: valOn}}>
                <bdi dir="ltr" data-dc-text={`${ctx.id}:v${i}`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: SIZE.body, color: isTop ? C.ink : C.ink2, fontFeatureSettings: '"tnum" 1', whiteSpace: 'nowrap', textShadow: isTop ? `${halo}, ${glow(C.signal, ctx.fx, 0.35)}` : halo}}>
                  {fmt(r.latency)}
                </bdi>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {/* climber: emissive orb on the rails with a comet tail below it (depth over the pegs) */}
      {climber >= 0
        ? [3, 2, 1].map((j) => (
            <div key={j} style={{position: 'absolute', left: cx - (11 - j * 2) / 2, top: climberY + j * 14 - (11 - j * 2) / 2, width: 11 - j * 2, height: 11 - j * 2, borderRadius: '50%', background: C.signal, opacity: 0.55 - j * 0.12}} />
          ))
        : null}
      {climber >= 0 ? (
        <div style={{position: 'absolute', left: cx - 13, top: climberY - 13, width: 26, height: 26, borderRadius: '50%', background: `radial-gradient(circle at 62% 30%, ${C.white} 0%, ${C.signal} 45%, ${C.signal}${hex(0.5)} 100%)`, border: `1.5px solid ${C.ink}${hex(0.3)}`, boxShadow: `${emit(C.signal, ctx.fx, 1.1 * glowK)}, 0 0 ${ctx.fx.glowInner}px ${C.white}`}} />
      ) : null}
    </div>
  );
};

export const LatencyLadder: DcComponent<Props> = {name: 'LatencyLadder', Component: LatencyLadderView, text: true, slot: 'full'};
