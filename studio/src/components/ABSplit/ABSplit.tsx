// ABSplit (catalog: Domain specials; 04 section 6 "Statistics: A/B = two streams"). One user stream enters from the right
// (RTL frame), passes a random-assignment splitter and divides into 2-4 lanes (violet = partition, 04 1.1). Each lane ends
// in its label and a rate bar. `reveal {winner?}` (anchored to its word; else shortly after the layer anchor): the bars
// grow (RV1 onset on the anchor frame) and the winner lane glows ok (winner = the action's index, else the highest rate).
// Numbers (fact-check D1, reports/facts/p7_data_gaps.md): digits are shown ONLY when every rate ref is a data-contract fact
// (`d:x.y:n`); the A/B figures are not yet in the contract, so today every scene renders ORDINAL bars: lengths follow the
// rank of the rates only (no axis, no ticks, no digits, no proportional length). `users` never sets a dot count: the
// stream dots are decorative (<= FX[tier].particles). The split is drawn equal (the share is a statement the sources
// make only as 50 / 50, add:6.12:13, not yet ratified). CR-006 asks for an explicit numbers mode.
import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {caShadow, glow, halo, hex} from '../../fx/look';
import {ease, presetFrames, REVEAL_ONSET_F} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {At, FitLabel, GlowLine, Stage, Svg, actsOf, bez, f24, glowBox, lerp, prog, progN, ranks, rim, stag, type Pt} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** Digits only for contract facts (D1 ruling 1-2). */
export const showsValues = (p: Props) => p.variants.every((v) => /^d:/.test(v.rate.ref));
const fmtRate = (v: Props['variants'][number]['rate'], x: number) => `${formatValue(x, 'decimal', v.decimals ?? (String(v.value).split('.')[1] ?? '').length)}${v.unit ? (v.unit === '%' ? ' %' : ` ${v.unit}`) : ''}`;

export const ABSplitView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const n = props.variants.length;
  const values = showsValues(props);
  // ---------- layout (RTL: source on the right, lanes run leftwards) ----------
  const src: Pt = {x: W * 0.94, y: H * 0.5};
  const split: Pt = {x: W * 0.7, y: H * 0.5};
  const laneGap = Math.min((H / n) * 0.7, SIZE.label * 8);
  const laneY = (i: number) => H / 2 + (i - (n - 1) / 2) * laneGap;
  const laneX0 = W * 0.6; // lane mouth
  const laneX1 = W * 0.36; // lane end (label + bar start)
  const barMax = W * 0.3;
  const barH = Math.max(SIZE.labelMin * 0.7, Math.min(laneGap * 0.3, SIZE.label * 1.6));
  const lanePath = (i: number) => bez(split, {x: lerp(split.x, laneX0, 0.6), y: split.y}, {x: lerp(split.x, laneX0, 0.4), y: laneY(i)}, {x: laneX0, y: laneY(i)}, 20);
  // ---------- timeline ----------
  const act = actsOf(ctx, 'reveal')[0];
  const tRev = act ? act.at : ctx.at + f24(30, fps);
  const rates = props.variants.map((v) => v.rate.value);
  const best = rates.indexOf(Math.max(...rates));
  const winner = act && typeof act.props.winner === 'number' && (act.props.winner as number) < n ? (act.props.winner as number) : best;
  const {rank, levels} = ranks(rates);
  const lenOf = (i: number) => (values ? rates[i] / Math.max(1e-9, Math.max(...rates)) : 0.42 + (0.5 * rank[i]) / Math.max(1, levels - 1));
  const grow = presetFrames('morph', fps, true);
  const tWin = tRev + grow;
  const qWin = progN(ctx, tWin, presetFrames('label', fps));
  const ent = prog(ctx, ctx.at, 'label');
  // ---------- decorative stream dots ----------
  const DOTS = Math.min(fx.particles, 18 * n + 18);
  const cycle = f24(54, fps); // frames for a dot to run source -> lane end
  const dotR = Math.max(4, SIZE.label * 0.2);
  const dots = Array.from({length: DOTS}, (_, k) => {
    const lane = k % n; // random assignment is drawn equal (see header)
    const phase = random(`ab:${ctx.id}:${k}`);
    const age = (((t - ctx.at) / cycle + phase) % 1 + 1) % 1; // linear: marching flow (04 section 2)
    let p: Pt;
    if (age < 0.3) p = {x: lerp(src.x, split.x, age / 0.3), y: src.y + (random(`aby:${ctx.id}:${k}`) - 0.5) * barH * 0.8};
    else if (age < 0.6) {
      const lp = lanePath(lane);
      const f = ((age - 0.3) / 0.3) * (lp.length - 1);
      const j = Math.floor(f);
      p = {x: lerp(lp[j].x, lp[Math.min(j + 1, lp.length - 1)].x, f - j), y: lerp(lp[j].y, lp[Math.min(j + 1, lp.length - 1)].y, f - j)};
    } else p = {x: lerp(laneX0, laneX1 + W * 0.02, (age - 0.6) / 0.4), y: laneY(lane)};
    const fade = age > 0.9 ? (1 - age) / 0.1 : age < 0.05 ? age / 0.05 : 1;
    return {p, lane, a: fade};
  });
  const lw = Math.max(2, Math.round(SIZE.label * 0.08));
  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        {/* trunk and lanes */}
        <GlowLine pts={[src, split]} color={C.ink3} w={lw} fx={fx} k={0.3} opacity={ent} />
        {props.variants.map((_, i) => {
          const win = i === winner && qWin > 0;
          const col = win ? C.ok : C.violet;
          return (
            <g key={i} opacity={prog(ctx, ctx.at + stag(i, fps, 3), 'label')}>
              <GlowLine pts={lanePath(i)} color={col} w={lw} fx={fx} k={0.4 + (win ? 0.6 * qWin : 0)} />
              <GlowLine pts={[{x: laneX0, y: laneY(i)}, {x: laneX1, y: laneY(i)}]} color={col} w={lw} fx={fx} k={0.4 + (win ? 0.6 * qWin : 0)} />
            </g>
          );
        })}
        {dots.map((d, k) => (
          <circle key={k} cx={d.p.x.toFixed(1)} cy={d.p.y.toFixed(1)} r={dotR} fill={d.lane === winner && qWin > 0 ? C.ok : C.signal} opacity={(0.85 * d.a * ent).toFixed(3)} />
        ))}
      </Svg>
      {/* the splitter: a random-assignment die on a glass plate */}
      <At x={split.x} y={split.y} style={{opacity: ent}}>
        <div style={{width: SIZE.label * 2, height: SIZE.label * 2, borderRadius: SIZE.label * 0.4, border: `2px solid ${C.violet}`, background: `linear-gradient(135deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.22)}, ${glowBox(C.violet, fx, 0.4 + ctx.mod.glow)}`, transform: `rotate(${(((t - ctx.at) * 90) / Math.max(1, cycle)) % 90}deg)`}}>
          {[
            [0.28, 0.28],
            [0.72, 0.72],
            [0.5, 0.5],
            [0.72, 0.28],
            [0.28, 0.72],
          ].map(([x, y], k) => (
            <div key={k} style={{position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: SIZE.label * 0.26, height: SIZE.label * 0.26, marginLeft: -SIZE.label * 0.13, marginTop: -SIZE.label * 0.13, borderRadius: '50%', background: C.ink2}} />
          ))}
        </div>
      </At>
      {props.variants.map((v, i) => {
        const y = laneY(i);
        const e = prog(ctx, ctx.at + stag(i, fps, 3), 'label');
        const q = progN(ctx, tRev + stag(i, fps, 2), grow, ease.camera);
        const win = i === winner && qWin > 0;
        const col = win ? C.ok : C.signal;
        const len = barMax * lenOf(i) * q;
        // a value roll lands with the bar (starts one frame early: RV1, as NumberCounter)
        const vx = values ? interpolate(t, [tRev + stag(i, fps, 2) - REVEAL_ONSET_F, tRev + stag(i, fps, 2) + grow - 1], [0, v.rate.value], {...clamp, easing: ease.arrive}) : 0;
        return (
          <React.Fragment key={i}>
            {/* lane label on the lane mouth (above the line) */}
            <At x={(laneX0 + laneX1) / 2} y={y - SIZE.label * 0.95} style={{opacity: e}}>
              <FitLabel id={`${ctx.id}:lane${i}`} text={v.label} maxW={laneX0 - laneX1 - 16} color={win ? C.ok : C.ink} weight={FONT.label.strong} shadow={win ? `${halo}, ${glow(C.ok, fx, 0.5 * qWin)}` : undefined} />
            </At>
            {/* rate bar track + fill (ordinal unless values) */}
            <div style={{position: 'absolute', left: laneX1 - barMax - SIZE.label * 0.6, top: y - barH / 2, width: barMax, height: barH, borderRadius: barH / 2, background: `${C.ink}${hex(0.05)}`, border: `1px solid ${C.grid}`, opacity: e, boxShadow: rim(0.12)}}>
              <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: len, borderRadius: barH / 2, background: `linear-gradient(270deg, ${col}${hex(0.35)} 0%, ${col} 100%)`, boxShadow: q > 0 ? glowBox(col, fx, 0.35 + (win ? 0.7 * qWin : 0) + ctx.mod.glow) : undefined}} />
            </div>
            {values && t >= tRev + stag(i, fps, 2) ? (
              <At x={laneX1 - barMax - SIZE.label * 1.0} y={y} ax={1} style={{}}>
                <bdi dir="ltr" data-dc-text={`${ctx.id}:rate${i}`} style={{fontFamily: `'${FONT.mono.family}'`, fontSize: SIZE.body, color: col, fontFeatureSettings: '"tnum" 1', textShadow: `${halo}, ${glow(col, fx, 0.5)}${caShadow(fx)}`, whiteSpace: 'nowrap'}}>
                  {fmtRate(v.rate, vx)}
                </bdi>
              </At>
            ) : null}
          </React.Fragment>
        );
      })}
      {/* the winner mark: a check ring at the winning bar's end */}
      {qWin > 0 ? (
        <At x={laneX1 - SIZE.label * 0.6 - barMax * lenOf(winner) - SIZE.label * (values ? 5.2 : 1.1)} y={laneY(winner)} style={{opacity: qWin, transform: `translate(-50%, -50%) scale(${(1.08 - 0.08 * qWin).toFixed(4)})`}}>
          <svg width={SIZE.label * 1.2} height={SIZE.label * 1.2} viewBox="0 0 12 12" style={{overflow: 'visible'}}>
            <circle cx={6} cy={6} r={5.2} fill={`${C.ok}${hex(0.16)}`} stroke={C.ok} strokeWidth={1} />
            <path d="M3.4 6.2 L5.3 8 L8.7 4.2" fill="none" stroke={C.ok} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </At>
      ) : null}
    </Stage>
  );
};

/** Text-safe rect: lane labels and bars (the left two thirds of the slot). */
const textRect = (_p: Props, b: Rect): Rect => ({x: b.x, y: b.y, w: b.w * 0.62, h: b.h});

export const ABSplit: DcComponent<Props> = {name: 'ABSplit', Component: ABSplitView, text: true, slot: 'full', textRect};

// keep Glass import tree-shaken out if unused by future edits
void Glass;
