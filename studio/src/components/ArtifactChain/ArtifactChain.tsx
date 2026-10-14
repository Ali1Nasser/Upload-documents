// ArtifactChain (catalog: Domain specials; 04 section 6 "Evidence, portfolio, branches": each chapter's artifact is a card joining a
// chain; "chain grows card by card"). 2-8 artefact cards in one row (card 1 on the right, RTL), each with a line-art glyph of its kind
// (code / data / model / report / image / config) and its label. The chain grows from the layer anchor, one card every 6 film frames,
// each new card joined to the previous one by a dim wire (the structure of the chain).
//   link {from, to} -> the data flows: a signal pulse draws along the wire from card `from` to card `to` (adjacent cards: straight
//                      wire; others: an arc over the row) and both cards settle ok when it lands (morph timing); lit links stay lit.
// DOM + SVG only (standard tier). Labels are whole elements, auto-fitted (28 px floor).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Glyph, Lbl, Wire, acrylic, acts, boxStyle, clamp01, f24, mix, pf, prog, pulse, shell, type GlyphKind} from '../_dom-c/kit';

type Kind = Props['artifacts'][number]['kind'];
const KIND_COLOR: Record<Kind, string> = {code: C.signal, data: C.violet, model: C.ember, report: C.ink, image: C.ink2, config: C.ink3};

export const ArtifactChainView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.artifacts.length;
  const W = ctx.box.w;
  const H = ctx.box.h;
  const cellW = W / n;
  const cardW = Math.round(Math.min(cellW * 0.8, 320));
  const cardH = Math.round(Math.min(H * 0.42, 340));
  const cy = H * 0.52;
  const cx = (k: number) => W - (k + 0.5) * cellW;
  const born = (k: number) => ctx.at + Math.round((6 * k * ctx.fps) / 24);
  const links = acts(ctx, 'link').map((a) => ({from: Math.min(n - 1, a.props.from as number), to: Math.min(n - 1, a.props.to as number), at: a.at}));
  const dur = P.morphLong;
  const litAt: (number | null)[] = props.artifacts.map(() => null);
  for (const l of links) {
    litAt[l.to] = litAt[l.to] === null ? l.at + dur : Math.min(litAt[l.to] as number, l.at + dur);
    litAt[l.from] = litAt[l.from] === null ? l.at : Math.min(litAt[l.from] as number, l.at);
  }
  const wires: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  for (let k = 0; k < n - 1; k++) {
    const e = prog(ctx, born(k + 1), P.arrive);
    wires.push(<Wire key={`b${k}`} d={`M ${cx(k) - cardW / 2} ${cy} L ${cx(k + 1) + cardW / 2} ${cy}`} color={C.grid} w={3} draw={e} len={cellW} />);
  }
  links.forEach((l, i) => {
    if (l.from === l.to) return;
    const q = prog(ctx, l.at, dur);
    if (q <= 0) return;
    const dirx = l.to < l.from ? -1 : 1; // card index grows leftwards: to > from means moving left
    const adj = Math.abs(l.to - l.from) === 1;
    const xa = cx(l.from) + (l.to > l.from ? -cardW / 2 : cardW / 2);
    const xb = cx(l.to) + (l.to > l.from ? cardW / 2 : -cardW / 2);
    let d: string;
    let pos: [number, number];
    let len: number;
    if (adj) {
      d = `M ${xa} ${cy} L ${xb} ${cy}`;
      pos = [xa + (xb - xa) * q, cy];
      len = Math.abs(xb - xa) + 4;
    } else {
      const ya = cy - cardH / 2;
      const top = cy - cardH / 2 - Math.min(150, 40 + 22 * Math.abs(l.to - l.from));
      const x0 = cx(l.from);
      const x1 = cx(l.to);
      d = `M ${x0} ${ya} C ${x0} ${top} ${x1} ${top} ${x1} ${ya}`;
      const u = 1 - q;
      pos = [u * u * u * x0 + 3 * u * u * q * x0 + 3 * u * q * q * x1 + q * q * q * x1, u * u * u * ya + 3 * u * u * q * top + 3 * u * q * q * top + q * q * q * ya];
      len = Math.abs(x1 - x0) * 1.5 + 2 * (ya - top) + 40;
    }
    void dirx;
    wires.push(<Wire key={`l${i}`} d={d} color={q >= 0.999 ? C.ok : C.signal} w={4} draw={q} len={len} />);
    if (q < 0.999) dots.push(<Dot key={`ld${i}`} x={pos[0]} y={pos[1]} r={10} color={C.signal} k={1.2} />);
  });
  const cards = props.artifacts.map((a, k) => {
    const b = born(k);
    const e = prog(ctx, b, P.arrive);
    const lit = litAt[k] !== null && t >= (litAt[k] as number);
    const isTo = links.some((l) => l.to === k && t >= l.at + dur);
    const land = isTo ? pulse(t, Math.min(...links.filter((l) => l.to === k).map((l) => l.at + dur)), f24(ctx, 6)) : 0;
    const kc = KIND_COLOR[a.kind];
    const col = isTo ? mix(kc, C.ok, 0.7) : lit ? C.signal : kc;
    return (
      <div
        key={`c${k}`}
        style={{
          position: 'absolute',
          left: cx(k) - cardW / 2,
          top: cy - cardH / 2,
          width: cardW,
          height: cardH,
          borderRadius: 24,
          ...acrylic(col, ctx.fx, 0.3 + 0.6 * land + (lit ? 0.4 : 0) + ctx.mod.glow, !lit && !isTo),
          opacity: e,
          transform: `translateY(${((1 - e) * 12).toFixed(2)}px)`,
          visibility: t < b ? 'hidden' : undefined,
        }}
      >
        <div style={{position: 'absolute', left: 14, right: 14, bottom: 14, height: cardH * 0.34, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Lbl id={`${ctx.id}:a${k}`} text={a.label} maxW={cardW - 36} maxH={cardH * 0.34} size={n <= 4 ? SIZE.body : SIZE.label} wrap fps={ctx.fps} color={C.ink} weight={FONT.label.strong} />
        </div>
      </div>
    );
  });
  const glyphs = props.artifacts.map((a, k) => {
    const e = prog(ctx, born(k), P.arrive);
    if (t < born(k)) return null;
    const lit = litAt[k] !== null && t >= (litAt[k] as number);
    const isTo = links.some((l) => l.to === k && t >= l.at + dur);
    const kc = KIND_COLOR[a.kind];
    return <Glyph key={`g${k}`} kind={a.kind as GlyphKind} x={cx(k)} y={cy - cardH * 0.17} s={Math.min(cardW * 0.5, 140)} color={isTo ? mix(kc, C.ok, 0.7) : lit ? C.signal : kc} w={4} opacity={e} />;
  });
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{wires}</svg>
      {cards}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {glyphs}
        {dots}
      </svg>
    </div>
  );
};
void clamp01;
void f24;
export const ArtifactChain: DcComponent<Props> = {name: 'ArtifactChain', Component: ArtifactChainView, text: true, slot: 'full'};
