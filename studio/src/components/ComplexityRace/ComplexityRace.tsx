// ComplexityRace (catalog: Domain specials; 04 section 6 "DSA: Big-O racing curves"). A math chart on an LTR axis
// (x = input size n, y = work): each racer is a growth curve of its `big_o`. `race` (anchored to its word; else shortly after
// the layer anchor): a head runs along every curve from n = 0 to the right edge (camera ease, RV1: the first visible step is on
// the anchor frame). Curves that outgrow the chart (O(n^2), O(2^n)) leave it through the top edge in crit with an off-chart
// arrow, while O(1) / O(log n) stay flat. The y scale is a shape, not a measurement: the chart shows no tick digits. The
// legend (RTL start = right) lists each racer's whole-word label with its Big-O in an LTR chip, in growth order. `n` (optional,
// with its ref) is the one number on the chart: an end marker on the x axis. No other digits.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {ease} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, Chip, FitLabel, GlowLine, Stage, Svg, actsOf, f24, fmtCount, glowBox, lerp, prog, progN, rim, stag, type Pt} from '../_dom-b/kit';

type BigO = Props['racers'][number]['big_o'];
const XMAX = 12; // the n range of the picture (a shape, never labelled)
const YFULL = 48; // work at the chart top, in the same arbitrary units
const ORDER: BigO[] = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'];
const WORK: Record<BigO, (u: number) => number> = {
  'O(1)': () => 1,
  'O(log n)': (u) => Math.log2(1 + u),
  'O(n)': (u) => u,
  'O(n log n)': (u) => (u * Math.log2(1 + u)) / 1.0,
  'O(n^2)': (u) => u * u,
  'O(2^n)': (u) => Math.pow(2, u),
};
/** Display text of a Big-O (superscripts are typographic, the prop stays ASCII). */
export const bigOText = (b: BigO) => b.replace('^2', '²').replace('^n', 'ⁿ');
const TONE: Record<BigO, string> = {'O(1)': C.ok, 'O(log n)': C.signal, 'O(n)': C.violet, 'O(n log n)': C.ink, 'O(n^2)': C.warn, 'O(2^n)': C.crit};
/** y (0 = axis, 1 = chart top; > 1 = off the chart) of a curve at x in 0..1. */
export const yOf = (b: BigO, x: number) => 0.035 + WORK[b](x * XMAX) / YFULL;

export const ComplexityRaceView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const legW = Math.min(W * 0.3, 520);
  const px0 = SIZE.label * 1.4; // chart left (y axis)
  const px1 = W - legW - 30;
  const py1 = SIZE.label * 1.6; // chart top
  const py0 = H - SIZE.label * 2.4; // axis line
  const X = (x: number) => lerp(px0, px1, x);
  const Y = (y: number) => lerp(py0, py1, Math.min(1, y));
  const act = actsOf(ctx, 'race')[0];
  const tR = act ? act.at : ctx.at + f24(20, fps);
  const dur = Math.max(f24(54, fps), act ? act.end - act.at : 0);
  const q = progN(ctx, tR, dur, ease.camera);
  const ent = prog(ctx, ctx.at, 'label');
  const racers = props.racers.map((r, i) => ({...r, i})).sort((a, b) => ORDER.indexOf(a.big_o) - ORDER.indexOf(b.big_o) || a.i - b.i);
  const lw = Math.max(3, Math.round(SIZE.label * 0.11));
  const rowH = Math.min((H - 40) / racers.length, SIZE.label * 3.6);
  const legY0 = (H - rowH * racers.length) / 2;
  const nTxt = props.n ? `${fmtCount(props.n.value, props.n.decimals ?? 0)}${props.n.unit ? ` ${props.n.unit}` : ''}` : null;
  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        {/* axes (LTR, math convention) */}
        <g opacity={ent}>
          <GlowLine pts={[{x: px0, y: py0}, {x: px1 + 18, y: py0}]} color={C.ink3} w={2} fx={fx} k={0.1} arrow />
          <GlowLine pts={[{x: px0, y: py0}, {x: px0, y: py1 - 14}]} color={C.ink3} w={2} fx={fx} k={0.1} arrow />
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={px0} x2={px1} y1={Y(g)} y2={Y(g)} stroke={C.grid} strokeWidth={1} strokeDasharray="3 9" />
          ))}
        </g>
        {racers.map((r) => {
          const col = r.big_o === 'O(n^2)' || r.big_o === 'O(2^n)' ? C.crit : TONE[r.big_o];
          const N = 80;
          const pts: Pt[] = [];
          let off = false;
          let offAt = 1;
          for (let s = 0; s <= N; s++) {
            const x = (s / N) * q;
            const y = yOf(r.big_o, x);
            if (y > 1) {
              // clip at the top edge by interpolating the crossing
              const prev = s > 0 ? ((s - 1) / N) * q : 0;
              const yp = yOf(r.big_o, prev);
              const f = yp < 1 ? (1 - yp) / (y - yp) : 0;
              const xc = prev + (x - prev) * f;
              pts.push({x: X(xc), y: Y(1)});
              off = true;
              offAt = xc;
              break;
            }
            pts.push({x: X(x), y: Y(y)});
          }
          if (q <= 0 || t < tR) return null;
          const head = pts[pts.length - 1];
          const tone = off ? C.crit : col;
          return (
            <g key={r.i}>
              <GlowLine pts={pts} color={tone} w={lw} fx={fx} k={0.5 + (off ? 0.5 : 0) + ctx.mod.glow} />
              <circle cx={head.x} cy={head.y} r={lw * 2.3} fill={tone} />
              <circle cx={head.x} cy={head.y} r={lw * 4.6} fill={tone} opacity={0.2} />
              {off ? (
                <g transform={`translate(${head.x.toFixed(1)} ${(head.y - lw * 3).toFixed(1)})`} opacity={Math.min(1, (q - offAt) * 4 + 0.4)}>
                  <path d={`M${-lw * 3} ${lw * 2} L0 ${-lw * 2} L${lw * 3} ${lw * 2}`} fill="none" stroke={C.crit} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ) : null}
            </g>
          );
        })}
      </Svg>
      <At x={px1 + 18} y={py0 + SIZE.label * 1.1} ax={1} style={{opacity: ent}}>
        <Chip id={`${ctx.id}:xn`} text={nTxt ? `n = ${nTxt}` : 'n'} color={C.ink2} size={SIZE.label} />
      </At>
      <At x={px0 + 6} y={py1 - SIZE.label * 0.6} ax={0} style={{opacity: ent}}>
        <Chip id={`${ctx.id}:yw`} text="work" color={C.ink2} size={SIZE.label} />
      </At>
      {racers.map((r, k) => {
        const e = prog(ctx, ctx.at + stag(k, fps, 3), 'label');
        const off = r.big_o === 'O(n^2)' || r.big_o === 'O(2^n)';
        const col = off && q > 0 && t >= tR ? C.crit : TONE[r.big_o];
        const y = legY0 + rowH * (k + 0.5);
        return (
          <div key={r.i} style={{position: 'absolute', left: W - legW, top: y - rowH / 2 + 4, width: legW, height: rowH - 8, opacity: e, transform: `translateY(${((1 - e) * 6).toFixed(2)}px)`, borderRadius: 16, border: `1.5px solid ${col}${hex(0.6)}`, background: `linear-gradient(135deg, ${C.panel}${hex(0.85)} 0%, ${C.ground}${hex(0.85)} 100%)`, boxShadow: `${rim(0.16)}, ${glowBox(col, fx, 0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse', padding: '0 18px', gap: 12}}>
            <div style={{width: lw * 4, alignSelf: 'stretch', margin: '12px 0', borderRadius: lw * 2, background: col, boxShadow: `0 0 10px ${col}${hex(0.5)}`, flex: 'none'}} />
            <FitLabel id={`${ctx.id}:r${r.i}`} text={r.label} maxW={legW - 36 - lw * 4 - 150} color={C.ink} weight={FONT.label.strong} />
            <div style={{flex: 'none', textShadow: `${halo}, ${glow(col, fx, 0.3)}`}}>
              <Chip id={`${ctx.id}:b${r.i}`} text={bigOText(r.big_o)} color={col} size={SIZE.label} />
            </div>
          </div>
        );
      })}
    </Stage>
  );
};

export const ComplexityRace: DcComponent<Props> = {name: 'ComplexityRace', Component: ComplexityRaceView, text: true, slot: 'full'};
