// LatencyLadder (catalog: Domain specials). 04 §6 "What a computer does": a latency ladder as 10x zoom steps. Rungs stack
// bottom -> top (rung 0 = fastest, at the bottom). Each rung is an acrylic bar on a LOG scale (every 10x is one equal step,
// drawn as decade ticks), its label on the right (RTL start) and its value + unit in a mono LTR isolate at the bar tip.
// Values come from props with `ref` (never invented); formatting = the NumberCounter formatter.
// Motion: rungs arrive staggered 3 f@24 from the layer anchor (label preset). Without `climb`, every bar grows on arrival.
// `climb {to}` (anchored to the word that names the step) -> a climber light rises rung by rung to `to`; each reached bar
// grows to its value (arrive preset, RV1 onset) and lights signal; the previous top rung settles to ink2. The camera-like
// "zoom out" of the bible is the log scale itself: every rung adds one decade of length, never a rescale (no number moves).
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {FitText, acrylic, actsOf, clamp, ff, layerStyle, mix, prog} from '../_dom-a/kit';

const fmt = (n: Props['rungs'][number]['latency']) => `${formatValue(n.value, 'decimal', n.decimals ?? 0)}${n.unit ? ` ${n.unit}` : ''}`;

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
  const vals = props.rungs.map((r) => r.latency.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const rowH = Math.min(150, box.h / n);
  const barH = Math.round(Math.min(rowH * 0.5, 64));
  const labelW = Math.round(box.w * 0.27);
  const valueW = Math.round(box.w * 0.16);
  const gap = 40;
  const barX1 = box.x + box.w - labelW - gap; // right end of the bar track (bars grow right -> left, RTL)
  const trackW = barX1 - box.x - valueW - gap;
  const top = box.y + (box.h - rowH * n) / 2;
  const yOf = (i: number) => top + (n - 1 - i) * rowH + rowH / 2;
  // climb timeline: frame each rung is reached (null = never climbed to)
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
  // climber light position (fractional rung index)
  let climber = -1;
  for (let i = 0; i < n; i++) if (reach[i] !== null && (reach[i] as number) <= t) climber = Math.max(climber, i - 1 + prog(ctx, reach[i] as number, 'arrive'));
  const rtl = props.rungs.some((r) => isArabic(r.label));
  const decades = Math.max(1, Math.ceil(Math.log10(hi) - (Math.log10(lo) - 1)));
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {/* decade ticks: equal steps = 10x each */}
      <svg width={trackW} height={rowH * n} style={{position: 'absolute', left: barX1 - trackW, top, overflow: 'visible'}}>
        {Array.from({length: decades + 1}, (_, d) => {
          const x = trackW - (trackW * d) / decades;
          return <line key={d} x1={x} x2={x} y1={0} y2={rowH * n} stroke={C.grid} strokeWidth={d === 0 ? 2 : 1} strokeDasharray={d === 0 ? undefined : '3 9'} />;
        })}
      </svg>
      {/* ladder rails */}
      <div style={{position: 'absolute', left: barX1 + 10, top, width: 3, height: rowH * n, background: `linear-gradient(0deg, ${C.ink3}${hex(0.2)}, ${C.ink3}${hex(0.6)})`}} />
      {climber >= 0 ? (
        <div style={{position: 'absolute', left: barX1 + 11.5 - 9, top: yOf(Math.max(0, climber)) - 9, width: 18, height: 18, borderRadius: '50%', background: C.signal, boxShadow: `0 0 ${ctx.fx.glowPx}px ${C.signal}, 0 0 ${ctx.fx.glowInner}px ${C.white}`}} />
      ) : null}
      {props.rungs.map((r, i) => {
        const born = ctx.at + ff(3 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'label');
        const ra = reach[i];
        const g = ra !== null && t >= ra ? prog(ctx, ra, 'arrive', undefined, true) : 0;
        const isTop = i === curTop;
        const tone = g <= 0 ? C.ink3 : isTop ? C.signal : mix(C.signal, C.ink2, climbs.length ? 0.6 : 0);
        const w = Math.round(trackW * logFrac(r.latency.value, lo, hi) * g);
        const y = yOf(i);
        const valOn = interpolate(g, [0.5, 1], [0, 1], clamp);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: barX1 + gap * 0.5, top: y - rowH / 2, width: labelW + gap * 0.5, height: rowH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: ent}}>
              <FitText id={`${ctx.id}:l${i}`} text={r.label} size={SIZE.body} maxW={labelW} maxH={rowH} color={isTop ? C.ink : C.ink2} weight={FONT.label.strong} />
            </div>
            {w > 0 ? (
              <div style={{position: 'absolute', left: barX1 - w, top: y - barH / 2, width: w, height: barH, ...acrylic(tone, ctx.fx, isTop ? 1 + ctx.mod.glow : 0.45, barH / 2)}}>
                <div style={{position: 'absolute', inset: 4, borderRadius: barH / 2, background: `linear-gradient(270deg, ${tone}${hex(0.05)}, ${tone}${hex(isTop ? 0.45 : 0.22)})`}} />
              </div>
            ) : null}
            {valOn > 0 ? (
              <div style={{position: 'absolute', left: barX1 - w - gap * 0.5 - valueW, top: y - rowH / 2, width: valueW, height: rowH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: valOn}}>
                <bdi dir="ltr" data-dc-text={`${ctx.id}:v${i}`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: SIZE.body, color: isTop ? C.ink : C.ink2, fontFeatureSettings: '"tnum" 1', whiteSpace: 'nowrap', textShadow: isTop ? `${halo}, ${glow(C.signal, ctx.fx, 0.35)}` : halo}}>
                  {fmt(r.latency)}
                </bdi>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const LatencyLadder: DcComponent<Props> = {name: 'LatencyLadder', Component: LatencyLadderView, text: true, slot: 'full'};
