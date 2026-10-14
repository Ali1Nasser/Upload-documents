// SplitDeck (catalog: Domain specials; 04 section 6 "ML from a question": train/test split = cutting a deck). A face-down deck of
// 50 cards (top centre) is dealt into 2-4 piles (bottom, split 1 on the right), one pile per split: label + share under it.
//   shares : relative to the whole. Unit % (the default) means percent of the whole deck: shares that sum to less than 100 leave
//            the remainder in the deck (undealt); a sum above 100, or any other unit, is normalised to the sum.
//   deal   : cards fly one per film frame from the layer's `deal` word, in a seeded random order (random(seed): the deck is
//            shuffled, never sorted), each landing on its pile and flipping to the pile colour. Without `deal` the deck waits.
// The share number is the fact the narration speaks (Num.ref in the contract): it appears with its pile on the label preset and
// is never invented here. DOM + SVG only (standard tier); the cards are plain panels (no per-card filter).
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Lbl, NumText, acts, apportion, boxStyle, f24, pf, prog, shell, shuffle} from '../_dom-c/kit';

export const CARDS = 50;
const PILE_COLORS = [C.signal, C.violet, C.ink, C.ember] as const;
export const dealPlan = (p: Props): {counts: number[]; left: number; seq: number[]} => {
  const sum = p.splits.reduce((a, s) => a + Math.max(0, s.share.value), 0);
  const pct = (p.splits[0].share.unit ?? '%') === '%';
  const denom = pct ? Math.max(100, sum) : sum;
  const w = [...p.splits.map((s) => Math.max(0, s.share.value)), Math.max(0, denom - sum)];
  const all = apportion(w, CARDS);
  const counts = all.slice(0, p.splits.length);
  const flat = counts.flatMap((c, i) => Array.from({length: c}, () => i));
  const perm = shuffle(flat.length, `deck-${p.seed}`);
  return {counts, left: all[p.splits.length], seq: perm.map((j) => flat[j])};
};

export const SplitDeckView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.splits.length;
  const W = ctx.box.w;
  const H = ctx.box.h;
  const plan = dealPlan(props);
  const deal = acts(ctx, 'deal')[0];
  const step = Math.max(1, Math.round(ctx.fps / 24));
  const flight = f24(ctx, 9);
  const cw = Math.min(104, (W / n) * 0.3);
  const chh = cw * 1.4;
  const spacing = Math.min((W * 0.92) / n, 440);
  const px = props.splits.map((_, i) => W / 2 + ((n - 1) / 2 - i) * spacing);
  const pileY = H * 0.62;
  const deckX = W / 2;
  const deckY = H * 0.17;
  const ent = prog(ctx, ctx.at, P.arrive);
  // landing index inside each pile
  const slot: number[] = [];
  const seen = Array(n).fill(0);
  plan.seq.forEach((p, i) => {
    slot[i] = seen[p]++;
  });
  const launchOf = (i: number) => (deal ? deal.at + i * step : Infinity);
  const dealt = plan.seq.filter((_, i) => t >= launchOf(i)).length;
  const inDeck = CARDS - dealt;
  const back = (key: string, x: number, y: number, rot: number, tint: string | null, a = 1) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: x - cw / 2,
        top: y - chh / 2,
        width: cw,
        height: chh,
        borderRadius: 10,
        background: tint ? `linear-gradient(200deg, ${tint}33 0%, ${C.ground} 100%)` : `linear-gradient(200deg, ${C.panel} 0%, ${C.ground} 100%)`,
        border: `2.5px solid ${tint ?? C.ink3}`,
        boxShadow: tint ? `0 0 ${ctx.fx.glowInner}px ${tint}${hex(0.35)}` : `inset 0 1px 0 ${C.ink}14`,
        transform: `rotate(${rot.toFixed(2)}deg)`,
        opacity: a,
      }}
    >
      {tint ? null : <div style={{position: 'absolute', left: '22%', right: '22%', top: '30%', bottom: '30%', border: `2px solid ${C.grid}`, borderRadius: 6}} />}
    </div>
  );
  const els: React.ReactNode[] = [];
  // pile slots
  props.splits.forEach((_, i) => {
    const b = ctx.at + Math.round((2 * i * ctx.fps) / 24);
    const e = prog(ctx, b, P.label);
    if (t < b) return;
    els.push(<div key={`slot${i}`} style={{position: 'absolute', left: px[i] - cw / 2 - 8, top: pileY - chh / 2 - 8, width: cw + 16, height: chh + 16, borderRadius: 16, border: `2px dashed ${C.grid}`, opacity: e}} />);
  });
  // deck
  const layers = Math.min(10, Math.ceil(inDeck / 5));
  for (let d = 0; d < layers; d++) els.push(back(`deck${d}`, deckX - d * 1.5, deckY - d * 2.5, 0, null, ent));
  // cards (in flight or landed)
  plan.seq.forEach((p, i) => {
    const t0 = launchOf(i);
    if (t < t0) return;
    const q = prog(ctx, t0, flight);
    const m = slot[i];
    const tx = px[p] + (random(`sd:${props.seed}:${i}:x`) - 0.5) * 12;
    const ty = pileY - Math.min(m, 24) * 2.2 + (random(`sd:${props.seed}:${i}:y`) - 0.5) * 8;
    const rot = (random(`sd:${props.seed}:${i}:r`) - 0.5) * 8;
    const arc = Math.sin(q * Math.PI) * 70;
    const x = deckX + (tx - deckX) * q;
    const y = deckY + (ty - deckY) * q - arc;
    const tint = q > 0.55 ? PILE_COLORS[p % PILE_COLORS.length] : null;
    els.push(back(`c${i}`, x, y, rot * q + (1 - q) * 0, tint));
  });
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      {els}
      {props.splits.map((s, i) => {
        const tb = deal ? deal.at + Math.round((4 * i * ctx.fps) / 24) : Infinity;
        const bornL = ctx.at + Math.round((2 * i * ctx.fps) / 24);
        if (deal ? t < tb : t < bornL) return null; // a split's label + share appear on the deal word, 4 film frames apart (no deal: with its slot)
        const e = prog(ctx, deal ? tb : bornL, P.label);
        return (
          <div key={`l${i}`} style={{position: 'absolute', left: px[i] - spacing / 2, width: spacing, top: pileY + chh / 2 + 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: e, transform: `translateY(${((1 - e) * 6).toFixed(2)}px)`}}>
            <Lbl id={`${ctx.id}:sp${i}`} text={s.label} maxW={spacing - 50} maxH={SIZE.body * 1.8} size={SIZE.body} fps={ctx.fps} color={PILE_COLORS[i % PILE_COLORS.length]} weight={FONT.label.strong} />
            <NumText id={`${ctx.id}:sh${i}`} value={s.share.value} target={s.share.value} decimals={s.share.decimals} unit={s.share.unit ?? '%'} maxW={spacing - 50} size={SIZE.sub} />
          </div>
        );
      })}
    </div>
  );
};
export const SplitDeck: DcComponent<Props> = {name: 'SplitDeck', Component: SplitDeckView, text: true, slot: 'full'};
