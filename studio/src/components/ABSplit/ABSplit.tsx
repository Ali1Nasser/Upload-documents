// ABSplit (catalog: Domain specials; 04 section 6 "Statistics: A/B = two streams"). One user stream leaves a glass tank on the right
// (RTL frame), passes a random-assignment die and divides through glass tubes into 2-4 lane cards (violet = partition, 04 1.1).
// Each card holds its label and a glass rate bar. The p-value meter of 04 section 6 has no prop in the frozen schema and no
// sourced value (D1), so it is not drawn. `reveal {winner?}` (anchored to its word; else shortly after the layer anchor): the bars
// grow (RV1 onset on the anchor frame) and the winner lane glows ok (winner = the action's index, else the highest rate).
// Numbers (fact-check D1, reports/facts/p7_data_gaps.md): digits are shown ONLY when every rate ref is a data-contract fact
// (`d:x.y:n`); the A/B figures are not yet in the contract, so today every scene renders ORDINAL bars: lengths follow the
// rank of the rates only (no axis, no ticks, no digits, no proportional length). `users` never sets a dot count: the
// stream dots are decorative (<= FX[tier].particles). The split is drawn equal (the share is a statement the sources
// make only as 50 / 50, add:6.12:13, not yet ratified). CR-010 asks for optional users and rate.
import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {caShadow, glow, halo, hex} from '../../fx/look';
import {ease, presetFrames, REVEAL_ONSET_F} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {At, Chip, FitLabel, GlowLine, Stage, Svg, actsOf, bez, dPath, f24, fmtCount, glowBox, lerp, prog, progN, ranks, rim, stag, type Pt} from '../_dom-b/kit';

const DBG: number = 8;
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
  const L = layoutOf(n, W, H);
  const {src, split, laneY, cardX, cardW, cardH, barH, pad, labelSize} = L;
  const lanePath = (i: number) => bez(split, {x: lerp(split.x, cardX + cardW, 0.55), y: split.y}, {x: lerp(split.x, cardX + cardW, 0.45), y: laneY(i)}, {x: cardX + cardW, y: laneY(i)}, 20);
  // ---------- timeline ----------
  const act = actsOf(ctx, 'reveal')[0];
  const tRev = act ? act.at : ctx.at + f24(30, fps);
  const rates = props.variants.map((v) => v.rate.value);
  const best = rates.indexOf(Math.max(...rates));
  const winner = act && typeof act.props.winner === 'number' && (act.props.winner as number) < n ? (act.props.winner as number) : best;
  const {rank, levels} = ranks(rates);
  const lenOf = (i: number) => (values ? rates[i] / Math.max(1e-9, Math.max(...rates)) : 0.4 + (0.55 * rank[i]) / Math.max(1, levels - 1));
  const grow = presetFrames('morph', fps, true);
  const tWin = tRev + grow;
  const qWin = progN(ctx, tWin, presetFrames('label', fps));
  const ent = prog(ctx, ctx.at, 'label');
  // ---------- decorative stream dots (never a user count) ----------
  const DOTS = DBG & 1 ? 0 : Math.min(fx.particles, 20 * n + 20);
  const cycle = f24(96, fps); // frames for a dot to run tank -> through the lane
  const dotR = Math.max(6, SIZE.label * 0.22);
  const trunkH = L.tankH * 0.3;
  const dots = Array.from({length: DOTS}, (_, k) => {
    const lane = k % n; // random assignment is drawn equal (see header)
    const phase = random(`ab:${ctx.id}:${k}`);
    const age = ((((t - ctx.at) / cycle + phase) % 1) + 1) % 1; // linear: marching flow (04 section 2)
    let p: Pt;
    if (age < 0.22) p = {x: lerp(src.x - L.tankW / 2, split.x, age / 0.22), y: src.y + (random(`aby:${ctx.id}:${k}`) - 0.5) * trunkH * (1 - (age / 0.22) * 0.8)};
    else if (age < 0.5) {
      const lp = lanePath(lane);
      const f = ((age - 0.22) / 0.28) * (lp.length - 1);
      const j = Math.floor(f);
      const a = lp[j];
      const b = lp[Math.min(j + 1, lp.length - 1)];
      p = {x: lerp(a.x, b.x, f - j), y: lerp(a.y, b.y, f - j) + (random(`abj:${ctx.id}:${k}`) - 0.5) * dotR};
    } else p = {x: lerp(cardX + cardW, cardX + cardW * 0.4, (age - 0.5) / 0.5), y: laneY(lane)};
    const fade = age > 0.85 ? (1 - age) / 0.15 : age < 0.05 ? age / 0.05 : 1;
    return {p, lane, a: fade};
  });
  const lw = Math.max(3, Math.round(SIZE.label * 0.12));
  const tubeW = lw * 4.2;
  const dieS = SIZE.label * 3.4;
  const rot = ((((t - ctx.at) * 90) / Math.max(1, cycle)) % 90) + 0;
  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        {/* floor pools: a soft light on the ground under each card (depth, ADR-003 LK-F); drawn in the SVG, not as gradient divs (tile-seam determinism in lite) */}
        <defs>
          {props.variants.map((_, i) => {
            const win = i === winner && qWin > 0;
            const edge = win ? C.ok : C.violet;
            return (
              <radialGradient key={i} id={`${ctx.id}-pool${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={edge} stopOpacity={win ? 0.2 * qWin + 0.06 : 0.07} />
                <stop offset="100%" stopColor={edge} stopOpacity={0} />
              </radialGradient>
            );
          })}
        </defs>
        {props.variants.map((_, i) => (
          <ellipse key={i} cx={(cardX + cardW / 2).toFixed(1)} cy={(laneY(i) + cardH / 2 + cardH * 0.09).toFixed(1)} rx={(cardW * 0.42).toFixed(1)} ry={(cardH * 0.14).toFixed(1)} fill={`url(#${ctx.id}-pool${i})`} opacity={prog(ctx, ctx.at + stag(i, fps, 3), 'label')} />
        ))}
        {/* glass tubes: wall, inner glow, core line */}
        <path d={`M${(src.x - L.tankW / 2).toFixed(1)} ${src.y.toFixed(1)} L${split.x.toFixed(1)} ${split.y.toFixed(1)}`} stroke={C.ink} strokeOpacity={0.12 * ent} strokeWidth={tubeW} strokeLinecap="round" fill="none" />
        <GlowLine pts={[{x: src.x - L.tankW / 2, y: src.y}, split]} color={C.ink3} w={lw} fx={fx} k={0.3} opacity={ent} />
        {props.variants.map((_, i) => {
          const win = i === winner && qWin > 0;
          const col = win ? C.ok : C.violet;
          const e = prog(ctx, ctx.at + stag(i, fps, 3), 'label');
          return (
            <g key={i} opacity={e}>
              <path d={dPath(lanePath(i))} stroke={C.ink} strokeOpacity={0.12} strokeWidth={tubeW} strokeLinecap="round" fill="none" />
              <GlowLine pts={lanePath(i)} color={col} w={lw} fx={fx} k={0.4 + (win ? 0.6 * qWin : 0)} />
            </g>
          );
        })}
        {dots.map((d, k) => (
          <circle key={k} cx={d.p.x.toFixed(1)} cy={d.p.y.toFixed(1)} r={dotR} fill={d.lane === winner && qWin > 0 ? C.ok : C.signal} opacity={(0.9 * d.a * ent).toFixed(3)} />
        ))}
      </Svg>
      {/* the source: a glass tank of users (decorative dots, seeded; no count) */}
      <At x={src.x} y={src.y} style={{opacity: ent}}>
        <div style={{position: 'relative', width: L.tankW, height: L.tankH, borderRadius: L.tankW * 0.28, border: `1.5px solid ${C.signal}${hex(0.5)}`, background: `linear-gradient(160deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.22)}, ${glowBox(C.signal, fx, 0.35 + ctx.mod.glow)}`}}>
          {Array.from({length: DBG & 2 ? 0 : Math.min(fx.particles, 22)}, (_, k) => {
            const x = 0.16 + 0.68 * random(`abt:${ctx.id}:${k}x`);
            const y = 0.1 + 0.8 * random(`abt:${ctx.id}:${k}y`);
            const bob = Math.sin(((t - ctx.at) / fps) * 2 + random(`abt:${ctx.id}:${k}p`) * 6.28) * 5;
            return <div key={k} style={{position: 'absolute', left: `${x * 100}%`, top: `calc(${y * 100}% + ${bob.toFixed(1)}px)`, width: dotR * 1.6, height: dotR * 1.6, marginLeft: -dotR * 0.8, borderRadius: '50%', background: C.signal, opacity: 0.35 + 0.5 * random(`abt:${ctx.id}:${k}o`)}} />;
          })}
        </div>
      </At>
      {/* the splitter: a random-assignment die on a glass plate */}
      <At x={split.x} y={split.y} style={{opacity: ent}}>
        <div style={{width: dieS, height: dieS, borderRadius: dieS * 0.22, border: `2px solid ${C.violet}`, background: `linear-gradient(135deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.26)}, ${glowBox(C.violet, fx, 0.6 + ctx.mod.glow)}`, transform: DBG & 8 ? undefined : `rotate(${rot.toFixed(2)}deg)`}}>
          {[
            [0.28, 0.28],
            [0.72, 0.72],
            [0.5, 0.5],
            [0.72, 0.28],
            [0.28, 0.72],
          ].map(([x, y], k) => (
            <div key={k} style={{position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: dieS * 0.12, height: dieS * 0.12, marginLeft: -dieS * 0.06, marginTop: -dieS * 0.06, borderRadius: '50%', background: C.ink2}} />
          ))}
        </div>
      </At>
      {/* lane cards */}
      {props.variants.map((v, i) => {
        const y = laneY(i);
        const e = prog(ctx, ctx.at + stag(i, fps, 3), 'label');
        const q = progN(ctx, tRev + stag(i, fps, 2), grow, ease.camera);
        const win = i === winner && qWin > 0;
        const col = win ? C.ok : C.signal;
        const trackW = cardW - 2 * pad;
        const len = trackW * lenOf(i) * q;
        // a value roll lands with the bar (starts one frame early: RV1, as NumberCounter)
        const vx = values ? interpolate(t, [tRev + stag(i, fps, 2) - REVEAL_ONSET_F, tRev + stag(i, fps, 2) + grow - 1], [0, v.rate.value], {...clamp, easing: ease.arrive}) : 0;
        const edge = win ? C.ok : C.violet;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: cardX, top: y - cardH / 2, width: cardW, height: cardH, borderRadius: cardH * 0.14, border: `1.5px solid ${edge}${hex(win ? 0.9 : 0.5)}`, background: `linear-gradient(135deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.2)}, 0 ${(cardH * 0.1).toFixed(0)}px ${(cardH * 0.25).toFixed(0)}px -${(cardH * 0.1).toFixed(0)}px ${C.void}${win ? `, ${glowBox(C.ok, fx, 0.5 * qWin + ctx.mod.glow)}` : ''}`, opacity: DBG & 16 ? 1 : e * (1 - 0.18 * qWin * (win ? 0 : 1)), transform: DBG & 16 ? undefined : `translateY(${((1 - e) * 6).toFixed(2)}px)`}}>
              {/* label: top right (RTL start) */}
              <At x={cardW - pad} y={pad * 0.7} ax={1} ay={0}>
                <FitLabel id={`${ctx.id}:lane${i}`} text={v.label} maxW={cardW * (values ? 0.42 : 0.6)} size={labelSize} color={win ? C.ok : C.ink} weight={FONT.label.strong} shadow={win ? `${halo}, ${glow(C.ok, fx, 0.5 * qWin)}` : undefined} />
              </At>
              {/* users of the lane: a count, shown only in values mode and only when its own ref is a contract fact */}
              {values && /^d:/.test(v.users.ref) ? (
                <At x={cardW * 0.5} y={pad * 0.7 + labelSize * 0.1} ay={0}>
                  <Chip id={`${ctx.id}:users${i}`} text={`n = ${fmtCount(v.users.value, v.users.decimals ?? 0)}${v.users.unit ? ` ${v.users.unit}` : ''}`} color={C.ink2} size={SIZE.labelMin} />
                </At>
              ) : null}
              {/* winner mark: a check ring at the left of the top row */}
              {qWin > 0 && win ? (
                <At x={pad} y={pad * 0.7 + labelSize * 0.05} ax={0} ay={0} style={{opacity: qWin, transform: `scale(${(1.08 - 0.08 * qWin).toFixed(4)})`}}>
                  <svg width={labelSize * 1.1} height={labelSize * 1.1} viewBox="0 0 12 12" style={{overflow: 'visible', filter: 'none'}}>
                    <circle cx={6} cy={6} r={5.2} fill={`${C.ok}${hex(0.18)}`} stroke={C.ok} strokeWidth={0.9} />
                    <path d="M3.4 6.2 L5.3 8 L8.7 4.2" fill="none" stroke={C.ok} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </At>
              ) : null}
              {values && t >= tRev + stag(i, fps, 2) ? (
                <At x={pad + labelSize * 1.4} y={pad * 0.7 + labelSize * 0.1} ax={0} ay={0}>
                  <bdi dir="ltr" data-dc-text={`${ctx.id}:rate${i}`} style={{fontFamily: `'${FONT.mono.family}'`, fontSize: SIZE.body, color: col, fontFeatureSettings: '"tnum" 1', textShadow: `${halo}, ${glow(col, fx, 0.5)}${caShadow(fx)}`, whiteSpace: 'nowrap'}}>
                    {fmtRate(v.rate, vx)}
                  </bdi>
                </At>
              ) : null}
              {/* rate bar: a glass track and a lit fill that grows from the right (ordinal unless values) */}
              <div style={{position: 'absolute', left: pad, top: cardH - pad - barH, width: trackW, height: barH, borderRadius: barH / 2, background: `${C.ink}${hex(0.05)}`, border: `1px solid ${C.grid}`, boxShadow: rim(0.14)}}>
                <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: len, borderRadius: barH / 2, background: `linear-gradient(270deg, ${col}${hex(0.4)} 0%, ${col} 100%)`, boxShadow: q > 0 ? `inset 0 ${Math.max(2, barH * 0.12).toFixed(0)}px 0 ${C.ink}${hex(0.3)}, ${glowBox(col, fx, 0.35 + (win ? 0.7 * qWin : 0) + ctx.mod.glow)}` : undefined}} />
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </Stage>
  );
};

/** Layout shared by the view and the text-safe rect (RTL: tank and die on the right, lane cards on the left). */
function layoutOf(n: number, W: number, H: number) {
  const cardH = Math.min((H / n) * 0.8, SIZE.label * 8);
  const gap = Math.min((H / n) * 0.9, cardH * 1.25);
  const cardX = W * 0.04;
  const cardW = W * 0.54;
  const tankW = W * 0.1;
  const tankH = Math.min(H * 0.42, tankW * 2.2);
  const src: Pt = {x: W * 0.94 - tankW / 2, y: H / 2};
  const split: Pt = {x: W * 0.76, y: H / 2};
  const labelSize = n <= 2 ? SIZE.sub : SIZE.body;
  return {
    src,
    split,
    cardX,
    cardW,
    cardH,
    tankW,
    tankH,
    labelSize,
    pad: SIZE.label * 0.85,
    barH: Math.min(cardH * 0.24, SIZE.label * 1.5),
    laneY: (i: number) => H / 2 + (i - (n - 1) / 2) * gap,
    gap,
  };
}

/** Text-safe rect: the lane cards (labels and bars). */
const textRect = (p: Props, b: Rect): Rect => {
  const L = layoutOf(p.variants.length, b.w, b.h);
  const top = L.laneY(0) - L.cardH / 2;
  const bot = L.laneY(p.variants.length - 1) + L.cardH / 2;
  return {x: b.x + L.cardX, y: b.y + top, w: L.cardW, h: bot - top};
};

export const ABSplit: DcComponent<Props> = {name: 'ABSplit', Component: ABSplitView, text: true, slot: 'full', textRect};
