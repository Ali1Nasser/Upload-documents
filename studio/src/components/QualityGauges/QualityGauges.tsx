// QualityGauges (catalog: Domain specials; 04 section 6 "ETL/ELT & quality": six quality gauges). 1-6 dial gauges, one per
// metric: a 240-degree track, a value arc that sweeps in from the layer anchor (one gauge every 3 film frames, each counting
// to its value and landing on a 2-frame glow), a bright threshold tick on the arc, the label under the dial.
//   scale  : unit % -> 0..100; otherwise 0..niceCeil(max(value, threshold) x 1.25). The scale ends carry no numerals.
//   status : the given status, else derived from the threshold: value >= threshold -> ok, below -> fail (a quality score:
//            higher is better; a limit that must stay UNDER a gate, like a p95, passes `status` explicitly). No threshold -> active.
//   zones  : with a threshold, the failing side of the track (above a limit, below a floor) is tinted crit.
//   fail   : the arc turns crit and the dial gives one seeded 5 px failure shake on landing (04 section 3.5).
// The threshold has no ref in the contract, so it is drawn as an unlabelled tick (no unlabelled shown number).
// DOM + SVG (standard tier). Number text is mono tabular (NumText); labels are whole elements.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Lbl, NumText, arcPath, boxStyle, clamp01, f24, mix, pf, polar, prog, pulse, roll, shake, shell, statusColor, type StatusT} from '../_dom-c/kit';

const A0 = -120; // degrees from 12 o'clock: the arc spans -120..+120
const A1 = 120;
/** Smallest 1/2/2.5/5 x 10^k at or above x (scale max for a non-percent gauge). */
export const niceCeil = (x: number): number => {
  if (x <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(x)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * e >= x - 1e-9) return m * e;
  return 10 * e;
};
export const scaleMax = (g: Props['gauges'][number]): number => (g.value.unit === '%' ? 100 : niceCeil(Math.max(g.value.value, g.threshold ?? 0) * 1.25));
export const gaugeStatus = (g: Props['gauges'][number]): StatusT => g.status ?? (g.threshold === undefined ? 'active' : g.value.value >= g.threshold ? 'ok' : 'fail');

/** The bezel scale as ONE path per weight: 25 ticks over the arc, every 6th one major (static: no per-tick elements). */
const scaleTicks = (cx: number, cy: number, r: number, major: boolean): string => {
  let d = '';
  for (let k = 0; k <= 24; k++) {
    if ((k % 6 === 0) !== major) continue;
    const ak = A0 + ((A1 - A0) * k) / 24;
    const [x0, y0] = polar(cx, cy, r + 22, ak);
    const [x1, y1] = polar(cx, cy, r + (major ? 10 : 15), ak);
    d += `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} `;
  }
  return d;
};

export const QualityGaugesView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.gauges.length;
  const cols = n <= 3 ? n : n === 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const W = ctx.box.w;
  const H = ctx.box.h;
  const cellW = W / cols;
  const cellH = H / rows;
  const r = Math.min(cellW * 0.33, cellH * 0.33, 270);
  const sweep = f24(ctx, 14);
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      {props.gauges.map((g, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const inRow = row === rows - 1 && n % cols !== 0 ? n % cols : cols;
        const cx = W / 2 + ((inRow - 1) / 2 - col) * cellW; // RTL: gauge 1 on the right, a short last row is centred
        const cy = row * cellH + cellH * 0.46;
        const t0 = ctx.at + Math.round((3 * i * ctx.fps) / 24);
        const t1 = t0 + sweep;
        const st = gaugeStatus(g);
        const smax = scaleMax(g);
        const v = roll(t, t0, t1, 0, g.value.value);
        const frac = clamp01(v / smax);
        const e = prog(ctx, t0, P.arrive);
        const land = t >= t1 ? pulse(t, t1, f24(ctx, 6)) : 0;
        const dx = st === 'fail' ? shake(`qg-${ctx.id}-${i}`, t, t1, f24(ctx, 5), 5) : 0;
        const live = t >= t1 ? statusColor(st) : mix(C.signal, statusColor(st), clamp01((t - t0) / sweep));
        const a = A0 + (A1 - A0) * frac;
        const tick = g.threshold === undefined ? null : A0 + (A1 - A0) * clamp01(g.threshold / smax);
        const dec = g.value.decimals;
        const X = cellW / 2;
        const Y = cy - row * cellH;
        // which side fails: a lower-is-better limit (status says so against the value) fails above the tick, a floor below it
        const lowerBetter = g.threshold !== undefined && ((st === 'ok' && g.value.value < g.threshold) || (st === 'fail' && g.value.value > g.threshold));
        const failZone = !lowerBetter;
        return (
          <div key={i} style={{position: 'absolute', left: cx - cellW / 2 + dx, top: row * cellH, width: cellW, height: cellH, opacity: e < 1 ? e : undefined, visibility: t < t0 ? 'hidden' : undefined}}>
            <svg width={cellW} height={cellH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
              {/* dial housing: contact shadow, extruded side, glass face with a lit rim (key light upper right) */}
              <ellipse cx={X} cy={Y + r + 58} rx={r * 1.02} ry={r * 0.13} fill={C.void} fillOpacity={0.6} />
              <circle cx={X} cy={Y + 10} r={r + 36} fill={mix(live, C.void, 0.8)} />
              <circle cx={X} cy={Y} r={r + 36} fill={`${C.panel}F2`} stroke={`${C.ink}${hex(0.16)}`} strokeWidth={2} />
              <path d={arcPath(X, Y, r + 35, 20, 100)} fill="none" stroke={C.ink} strokeOpacity={0.18} strokeWidth={3} strokeLinecap="round" />
              {/* engraved scale: 25 minor ticks on the bezel, no numerals (the scale ends carry no numbers) */}
              <path d={scaleTicks(X, Y, r, false)} fill="none" stroke={C.ink3} strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" />
              <path d={scaleTicks(X, Y, r, true)} fill="none" stroke={C.ink3} strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" />
              <path d={arcPath(X, Y, r, A0, A1)} fill="none" stroke={C.grid} strokeWidth={26} strokeLinecap="round" />
              <path d={arcPath(X, Y, r, A0, A1)} fill="none" stroke={C.ink3} strokeOpacity={0.22} strokeWidth={26} strokeLinecap="round" />
              {/* the side of the gate that fails, tinted on the track (a limit that must stay under it: above; a floor: below) */}
              {tick !== null ? <path d={failZone ? arcPath(X, Y, r, A0 + 1.5, tick) : arcPath(X, Y, r, tick, A1 - 1.5)} fill="none" stroke={C.crit} strokeOpacity={0.2} strokeWidth={26} /> : null}
              {frac > 0.004 ? (
                <>
                  <path d={arcPath(X, Y, r, A0, a)} fill="none" stroke={live} strokeOpacity={0.2 + 0.2 * land} strokeWidth={26 + 16 + 10 * land} strokeLinecap="round" />
                  <path d={arcPath(X, Y, r, A0, a)} fill="none" stroke={live} strokeWidth={22} strokeLinecap="round" />
                  <circle cx={polar(X, Y, r, a)[0]} cy={polar(X, Y, r, a)[1]} r={7 + 3 * land} fill={C.ink} />
                </>
              ) : null}
              {tick !== null ? (
                <>
                  <path d={`M ${polar(X, Y, r - 14, tick)[0].toFixed(2)} ${polar(X, Y, r - 14, tick)[1].toFixed(2)} L ${polar(X, Y, r + 26, tick)[0].toFixed(2)} ${polar(X, Y, r + 26, tick)[1].toFixed(2)}`} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
                  {/* gate flag: a small pointer on the bezel, so the tick reads as a limit marker */}
                  <path d={`M ${polar(X, Y, r + 31, tick - 3)[0].toFixed(2)} ${polar(X, Y, r + 31, tick - 3)[1].toFixed(2)} L ${polar(X, Y, r + 31, tick + 3)[0].toFixed(2)} ${polar(X, Y, r + 31, tick + 3)[1].toFixed(2)} L ${polar(X, Y, r + 44, tick)[0].toFixed(2)} ${polar(X, Y, r + 44, tick)[1].toFixed(2)} Z`} fill={C.ink} />
                </>
              ) : null}
              {land > 0 ? <circle cx={X} cy={Y} r={r * 0.92} fill={live} fillOpacity={0.05 * land} /> : null}
            </svg>
            <div style={{position: 'absolute', left: 0, right: 0, top: cy - row * cellH - SIZE.numberBig * 0.42, display: 'flex', justifyContent: 'center'}}>
              <NumText id={`${ctx.id}:v${i}`} value={v} target={g.value.value} decimals={dec} unit={g.value.unit} maxW={r * 1.5} size={n > 3 ? SIZE.sub : SIZE.numberBig * 0.6} color={t >= t1 ? C.ink : C.ink2} glow={land > 0 ? `0 0 ${(ctx.fx.glowPx * land).toFixed(1)}px ${live}${hex(0.6)}` : undefined} />
            </div>
            <div style={{position: 'absolute', left: (cellW - cellW * 0.92) / 2, width: cellW * 0.92, top: cy - row * cellH + r * 0.7, display: 'flex', justifyContent: 'center'}}>
              <Lbl id={`${ctx.id}:l${i}`} text={g.label} maxW={Math.min(cellW * 0.9, r * 2.3)} maxH={SIZE.body * 2.4} size={n > 3 ? SIZE.label : SIZE.body} wrap fps={ctx.fps} color={C.ink} weight={FONT.label.strong} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const QualityGauges: DcComponent<Props> = {name: 'QualityGauges', Component: QualityGaugesView, text: true, slot: 'full'};
