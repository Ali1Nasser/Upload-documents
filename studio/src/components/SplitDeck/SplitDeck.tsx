// SplitDeck (catalog: Domain specials; 04 section 6 "ML from a question": train/test split = cutting a deck). A face-down deck of
// 50 cards (top centre) is dealt into 2-4 piles (bottom, split 1 on the right), one pile per split: label + share under it.
//   shares : relative to the whole. Unit % (the default) means percent of the whole deck: shares that sum to less than 100 leave
//            the remainder in the deck (undealt); a sum above 100, or any other unit, is normalised to the sum.
//   deal   : cards fly one per film frame from the layer's `deal` word, in a seeded random order (random(seed): the deck is
//            shuffled, never sorted), each flipping face-up to its pile colour in flight and landing on its pile. A pile is an
//            extruded stack (edge lines = cards), so its height is its share. Without `deal` the deck waits.
// The share number is the fact the narration speaks (Num.ref in the contract): it appears with its pile on the label preset and
// is never invented here. DOM + SVG only (standard tier); the cards are plain panels (no per-card filter).
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE, type Fx} from '../../tokens';
import {ease} from '../../type/reveal';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Floor, Lbl, NumText, acts, apportion, born, boxStyle, clamp01, f24, mix, pf, prog, pulse, shell, shuffle} from '../_dom-c/kit';

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


type Geo = {W: number; H: number; n: number; cw: number; chh: number; spacing: number; px: number[]; pileY: number; deckX: number; deckBase: number; labelTop: number; step: number; dstep: number};
/** Layout shared by the view and textRect (all in box coordinates). */
export const geo = (props: Props, W: number, H: number): Geo => {
  const n = props.splits.length;
  const spacing = Math.min((W * 0.92) / n, 440);
  const cw = Math.min(190, spacing * 0.42);
  const chh = cw * 1.38;
  const px = props.splits.map((_, i) => W / 2 + ((n - 1) / 2 - i) * spacing);
  const pileY = H * 0.6;
  const maxC = Math.max(1, ...dealPlan(props).counts);
  return {W, H, n, cw, chh, spacing, px, pileY, deckX: W / 2, deckBase: H * 0.2, labelTop: pileY + chh / 2 + 28, step: Math.min(6.5, (chh * 0.6) / maxC), dstep: 1.5};
};

/** A card (face-down grey back, or face-up in the pile colour), `flip` 0..1 turns it over (scaleX through 0 at 0.5). */
const Card: React.FC<{x: number; y: number; cw: number; ch: number; rot: number; tint: string | null; fx: Fx; flip?: number; a?: number}> = ({x, y, cw, ch, rot, tint, fx, flip = 1, a = 1}) => {
  const sx = Math.max(0.06, Math.abs(Math.cos(Math.PI * (1 - flip)))); // the turn changes the box width (layout), never a scaleX transform: a near-flat transformed layer rasterised non-deterministically
  const up = tint !== null && flip >= 0.5;
  const col = up ? tint : null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - (cw * sx) / 2,
        top: y - ch / 2,
        width: cw * sx,
        height: ch,
        borderRadius: 11,
        // specular top edge + lit right edge are gradient layers, never `box-shadow: inset` (tile-seam determinism flake, see code-media.md)
        background: `linear-gradient(180deg, ${C.ink}${hex(0.22)} 0 2px, transparent 2px), linear-gradient(270deg, ${C.ink}${hex(0.08)} 0 2px, transparent 2px), ${col ? `linear-gradient(205deg, ${mix(col, C.panel, 0.62)} 0%, ${mix(col, C.ground, 0.8)} 100%)` : `linear-gradient(205deg, ${C.panel} 0%, ${C.ground} 100%)`}`,
        border: `2.5px solid ${col ?? C.ink3}`,
        // key light upper right: specular top edge, lit right edge, soft contact shadow
        boxShadow: `${col ? `0 0 ${fx.glowInner}px ${col}${hex(0.4)}, ` : ''}0 12px 14px -8px ${C.void}`,
        transform: `rotate(${rot.toFixed(2)}deg)`,
        opacity: a,
      }}
    >
      {sx < 0.5 ? null : col ? (
        <>
          <div style={{position: 'absolute', left: '14%', right: '14%', top: '12%', bottom: '12%', border: `2px solid ${col}${hex(0.55)}`, borderRadius: 7}} />
          <div style={{position: 'absolute', left: '50%', top: '50%', width: cw * 0.2, height: cw * 0.2, marginLeft: -cw * 0.1, marginTop: -cw * 0.1, background: col, transform: 'rotate(45deg)', borderRadius: 4, opacity: 0.85}} />
        </>
      ) : (
        <div style={{position: 'absolute', left: '20%', right: '20%', top: '26%', bottom: '26%', border: `2px solid ${C.grid}`, borderRadius: 7, background: `repeating-linear-gradient(45deg, ${C.grid}88 0 3px, transparent 3px 11px)`}} />
      )}
    </div>
  );
};

/** An extruded stack of `count` cards: edge lines (one per card) under the top card, which sits at baseY - (count - 1) x step. */
const Stack: React.FC<{x: number; baseY: number; count: number; step: number; cw: number; ch: number; tint: string | null; fx: Fx; top: React.ReactNode; a?: number}> = ({x, baseY, count, step, cw, ch, tint, fx, top, a = 1}) => {
  if (count <= 0) return null;
  const h = (count - 1) * step;
  const col = tint ?? C.ink3;
  return (
    <div style={{opacity: a}}>
      <div style={{position: 'absolute', left: x - cw * 0.62, width: cw * 1.24, top: baseY + ch / 2 - ch * 0.06, height: ch * 0.2, background: `radial-gradient(ellipse at 50% 40%, ${C.void}EE 0%, transparent 70%)`}} />
      {tint ? <div style={{position: 'absolute', left: x - cw * 0.9, width: cw * 1.8, top: baseY + ch / 2 - ch * 0.12, height: ch * 0.3, background: `radial-gradient(ellipse at 50% 40%, ${tint}${hex(0.22)} 0%, transparent 70%)`}} /> : null}
      {h > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: x - cw / 2 + 2,
            width: cw - 4,
            top: baseY - h + ch / 2 - 8,
            height: h + 8,
            borderRadius: '0 0 9px 9px',
            background: `linear-gradient(270deg, ${C.ink}${hex(0.1)} 0 3px, transparent 3px), repeating-linear-gradient(180deg, ${mix(col, C.ground, 0.55)} 0 ${Math.max(1, step - 1.5).toFixed(1)}px, ${C.void} ${Math.max(1, step - 1.5).toFixed(1)}px ${step.toFixed(1)}px)`,
            borderBottom: `2.5px solid ${col}`,
            boxShadow: `0 0 ${fx.glowInner}px ${col}${hex(tint ? 0.3 : 0.1)}`,
          }}
        />
      ) : null}
      {top}
    </div>
  );
};

export const SplitDeckView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const g = geo(props, ctx.box.w, ctx.box.h);
  const {W, H, n, cw, chh, spacing, px, pileY, deckX, deckBase, step, dstep} = g;
  const plan = dealPlan(props);
  const deal = acts(ctx, 'deal')[0];
  const stride = Math.max(1, Math.round(ctx.fps / 24));
  const flight = f24(ctx, 10);
  const ent = prog(ctx, ctx.at, P.arrive);
  // landing index inside each pile
  const slot: number[] = [];
  const seen = Array(n).fill(0);
  plan.seq.forEach((p, i) => {
    slot[i] = seen[p]++;
  });
  const launchOf = (i: number) => (deal ? deal.at + i * stride : Infinity);
  const flightQ = (i: number) => prog(ctx, launchOf(i), flight, ease.arrive);
  const dealt = plan.seq.filter((_, i) => t >= launchOf(i)).length;
  const landed = Array(n).fill(0);
  const lastLanded: number[] = Array(n).fill(-1);
  plan.seq.forEach((p, i) => {
    if (t >= launchOf(i) && flightQ(i) >= 1) {
      landed[p]++;
      lastLanded[p] = i;
    }
  });
  const jit = (i: number) => ({
    dx: (random(`sd:${props.seed}:${i}:x`) - 0.5) * 10,
    rot: (random(`sd:${props.seed}:${i}:r`) - 0.5) * 7,
  });
  const dealPulse = deal ? pulse(t, deal.at, f24(ctx, 8)) : 0;
  const els: React.ReactNode[] = [];
  // pile slots (dashed landing zones) appear with their label
  props.splits.forEach((_, i) => {
    const b = born(ctx, i);
    if (t < b) return;
    const e = prog(ctx, b, P.label);
    els.push(<div key={`slot${i}`} style={{position: 'absolute', left: px[i] - cw / 2 - 10, top: pileY - chh / 2 - 10, width: cw + 20, height: chh + 20, borderRadius: 18, border: `2px dashed ${C.grid}`, opacity: e * (landed[i] > 0 ? 0.35 : 1)}} />);
  });
  // piles
  props.splits.forEach((_, i) => {
    const c = landed[i];
    if (c <= 0) return;
    const j = jit(lastLanded[i]);
    const col = PILE_COLORS[i % PILE_COLORS.length];
    const topY = pileY - (c - 1) * step;
    els.push(<Stack key={`pile${i}`} x={px[i] + j.dx * 0.5} baseY={pileY} count={c} step={step} cw={cw} ch={chh} tint={col} fx={ctx.fx} top={<Card x={px[i] + j.dx} y={topY} cw={cw} ch={chh} rot={j.rot} tint={col} fx={ctx.fx} />} />);
  });
  // deck (the undealt remainder)
  const inDeck = CARDS - dealt;
  const dtop = deckBase - (inDeck - 1) * dstep;
  els.push(
    <Stack key="deck" x={deckX} baseY={deckBase} count={Math.max(inDeck, 0)} step={dstep} cw={cw} ch={chh} tint={null} fx={ctx.fx} a={ent} top={<Card x={deckX} y={dtop} cw={cw} ch={chh} rot={0} tint={null} fx={ctx.fx} a={1} />} />,
  );
  // cards in flight
  plan.seq.forEach((p, i) => {
    if (t < launchOf(i)) return;
    const q = flightQ(i);
    if (q >= 1) return;
    const j = jit(i);
    const x0 = deckX;
    const y0 = deckBase - (CARDS - i - 1) * dstep;
    const x1 = px[p] + j.dx;
    const y1 = pileY - slot[i] * step;
    const arc = Math.sin(q * Math.PI) * chh * 0.35;
    const col = PILE_COLORS[p % PILE_COLORS.length];
    const fl = clamp01((q - 0.25) / 0.45);
    els.push(<Card key={`c${i}`} x={x0 + (x1 - x0) * q} y={y0 + (y1 - y0) * q - arc} cw={cw} ch={chh} rot={j.rot * q} tint={col} fx={ctx.fx} flip={fl} />);
  });
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`sd-${ctx.id}`} w={W} h={H} y={pileY - chh * 0.05} color={C.violet} pool={0.1} opacity={ent} />
      {dealPulse > 0 ? <div style={{position: 'absolute', left: deckX - cw, top: deckBase - chh, width: cw * 2, height: chh * 2, background: `radial-gradient(ellipse at 50% 50%, ${C.signal}${hex(0.16 * dealPulse)} 0%, transparent 70%)`}} /> : null}
      {els}
      {props.splits.map((s, i) => {
        const tb = deal ? born(ctx, i, 4, deal.at) : Infinity;
        const bornL = born(ctx, i);
        if (deal ? t < tb : t < bornL) return null; // a split's label + share appear on the deal word, 4 film frames apart (no deal: with its slot)
        const e = prog(ctx, deal ? tb : bornL, P.label);
        return (
          <div key={`l${i}`} style={{position: 'absolute', left: px[i] - spacing / 2, width: spacing, top: g.labelTop, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: e, transform: `translateY(${((1 - e) * 6).toFixed(2)}px)`}}>
            <Lbl id={`${ctx.id}:sp${i}`} text={s.label} maxW={spacing - 50} maxH={SIZE.body * 1.8} size={SIZE.body} fps={ctx.fps} color={PILE_COLORS[i % PILE_COLORS.length]} weight={FONT.label.strong} />
            <NumText id={`${ctx.id}:sh${i}`} value={s.share.value} target={s.share.value} decimals={s.share.decimals} unit={s.share.unit ?? '%'} maxW={spacing - 50} size={SIZE.sub} />
          </div>
        );
      })}
    </div>
  );
};
const textRect = (p: Props, b: {x: number; y: number; w: number; h: number}) => {
  const g = geo(p, b.w, b.h);
  return {x: b.x, y: b.y + g.labelTop - 8, w: b.w, h: Math.min(b.h - g.labelTop + 8, SIZE.body * 1.8 + SIZE.sub * 1.4 + 40)};
};
export const SplitDeck: DcComponent<Props> = {name: 'SplitDeck', Component: SplitDeckView, text: true, slot: 'full', textRect};
