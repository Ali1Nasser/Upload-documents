// ArtifactChain (catalog: Domain specials; 04 section 6 "Evidence, portfolio, branches": each chapter's artifact is a card joining a
// chain; "chain grows card by card"). 2-8 artefact cards joined into ONE lineage (artefact 1 on the right, RTL). Each card is an
// acrylic plate (ADR-003 LK-F: specular top edge, lit right edge, extruded side, contact shadow) with a line-art glyph of its kind
// (code / data / model / report / image / config) in a lit well and its label (one whole element, auto-fitted, 28 px floor).
// Layout: up to 5 cards sit on one row; 6-8 cards snake over two rows (row 1 right -> left, a drop wire at the left end, row 2
// left -> right), so a long lineage stays legible inside title-safe.
// The chain grows from the layer anchor, one card every 6 film frames, each card joined to the previous one by a dim wire.
//   link {from, to} -> a change propagates ALONG the lineage from card `from` to card `to` (either direction): a signal token runs
//                      wire by wire (one hop every 6 film frames, first visible step on the anchor frame, RV1), every card it
//                      reaches flashes and settles `ok` with a check badge, and the wires it ran stay lit `ok`. Several links add up.
// No digits are shown (the chain is structural; no ref needed). DOM + SVG only, no filter and no WebGL, so hero = standard.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Floor, Glyph, Lbl, Wire, acrylic, acts, born, boxStyle, f24, mix, pf, prog, pulse, shell, type GlyphKind} from '../_dom-c/kit';

const CARD_F24 = 6; // growth rhythm: one card every 6 film frames (250 ms)
const HOP_F24 = 6; // propagation rhythm: one wire every 6 film frames

type Kind = Props['artifacts'][number]['kind'];
const KIND_COLOR: Record<Kind, string> = {code: C.signal, data: C.violet, model: C.ember, report: C.ink, image: C.ink2, config: C.ink3};

type Pt = [number, number];
export type ChainLayout = {cardW: number; cardH: number; rows: number; per: number; pos: Pt[]; floorY: number};
/** Card centres (RTL; two snaking rows above 5 cards). Pure. */
export const chainLayout = (n: number, W: number, H: number): ChainLayout => {
  const rows = n <= 5 ? 1 : 2;
  const per = Math.ceil(n / rows);
  const cellW = W / per;
  const cardW = Math.round(Math.min(cellW * 0.8, 320));
  const cardH = Math.round(rows === 1 ? Math.min(H * 0.4, 330) : Math.min(H * 0.34, 260));
  const ys = rows === 1 ? [H * 0.46] : [H * 0.25, H * 0.7];
  const colX = (c: number) => W - (c + 0.5) * cellW; // column 0 on the right
  const pos: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const r = Math.floor(k / per);
    const j = k - r * per;
    const col = r === 0 ? j : per - 1 - j; // row 2 runs back left -> right (serpentine)
    pos.push([colX(col), ys[r]]);
  }
  return {cardW, cardH, rows, per, pos, floorY: ys[rows - 1] + cardH * 0.22};
};

/** Wire from card k to card k + 1: leaves the side (or the bottom, at the row turn) of card k, enters card k + 1. */
const hopEnds = (L: ChainLayout, k: number): [Pt, Pt] => {
  const [x0, y0] = L.pos[k];
  const [x1, y1] = L.pos[k + 1];
  if (Math.abs(y1 - y0) > 1) return [[x0, y0 + L.cardH / 2], [x1, y1 - L.cardH / 2]];
  const s = x1 < x0 ? -1 : 1;
  return [[x0 + (s * L.cardW) / 2, y0], [x1 - (s * L.cardW) / 2, y1]];
};

export type Hop = {k: number; rev: boolean; start: number};
export type Prop = {hops: Hop[]; reach: number[]};
/** Propagation timeline: every link runs hop by hop from `from` to `to`; reach[c] = first frame card c is reached (Infinity = never). */
export const propagation = (n: number, ctx: LayerCtx): Prop => {
  const hopF = f24(ctx, HOP_F24);
  const hops: Hop[] = [];
  const reach = Array.from({length: n}, () => Infinity);
  for (const a of acts(ctx, 'link')) {
    const from = Math.min(n - 1, a.props.from as number);
    const to = Math.min(n - 1, a.props.to as number);
    reach[from] = Math.min(reach[from], a.at);
    const step = to >= from ? 1 : -1;
    for (let i = 0, c = from; c !== to; i++, c += step) {
      const start = a.at + i * hopF;
      hops.push({k: step > 0 ? c : c - 1, rev: step < 0, start});
      reach[c + step] = Math.min(reach[c + step], start + hopF - 1);
    }
  }
  return {hops, reach};
};

export const ArtifactChainView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.artifacts.length;
  const W = ctx.box.w;
  const H = ctx.box.h;
  const L = chainLayout(n, W, H);
  const {cardW, cardH} = L;
  const hopF = f24(ctx, HOP_F24);
  const bornAt = (k: number) => born(ctx, k, CARD_F24);
  const pr = propagation(n, ctx);
  const labelSize = n <= 4 ? SIZE.body : SIZE.label;
  const wellR = Math.min(cardW * 0.2, cardH * 0.2, 52);

  // structure wires (dim), drawn as the next card arrives
  const wires: React.ReactNode[] = [];
  for (let k = 0; k < n - 1; k++) {
    const [a, b] = hopEnds(L, k);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + 2;
    wires.push(<Wire key={`s${k}`} d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} color={C.grid} w={3} draw={prog(ctx, bornAt(k + 1), P.arrive)} len={len} />);
  }
  // propagation: lit wires, arrow heads, travelling tokens
  const tokens: React.ReactNode[] = [];
  pr.hops.forEach((h, i) => {
    const q = prog(ctx, h.start, hopF, (x) => x);
    if (q <= 0) return;
    const [a, b] = hopEnds(L, h.k);
    const [p0, p1] = h.rev ? [b, a] : [a, b];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 2;
    const done = q >= 0.999;
    const col = done ? C.ok : C.signal;
    wires.push(<Wire key={`p${i}`} d={`M ${p0[0]} ${p0[1]} L ${p1[0]} ${p1[1]}`} color={col} w={4} draw={q} len={len} />);
    const ux = (p1[0] - p0[0]) / (len - 2 || 1);
    const uy = (p1[1] - p0[1]) / (len - 2 || 1);
    const ax = p1[0] - ux * 2;
    const ay = p1[1] - uy * 2;
    if (done)
      wires.push(
        <path key={`ah${i}`} d={`M ${ax - ux * 14 - uy * 8} ${ay - uy * 14 + ux * 8} L ${ax} ${ay} L ${ax - ux * 14 + uy * 8} ${ay - uy * 14 - ux * 8}`} fill="none" stroke={C.ok} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />,
      );
    else tokens.push(<Dot key={`tk${i}`} x={p0[0] + (p1[0] - p0[0]) * q} y={p0[1] + (p1[1] - p0[1]) * q} r={9} color={C.signal} k={1.2} />);
  });

  const cards = props.artifacts.map((a, k) => {
    const b = bornAt(k);
    const e = prog(ctx, b, P.arrive);
    const r = pr.reach[k];
    const reached = t >= r;
    const qOk = reached ? prog(ctx, r, P.label) : 0;
    const flash = reached ? pulse(t, r, f24(ctx, 8)) : 0;
    const kc = KIND_COLOR[a.kind];
    const col = reached ? mix(C.signal, C.ok, qOk) : kc;
    const [x, y] = L.pos[k];
    return (
      <div
        key={`c${k}`}
        style={{
          position: 'absolute',
          left: x - cardW / 2,
          top: y - cardH / 2,
          width: cardW,
          height: cardH,
          borderRadius: 22,
          ...acrylic(col, ctx.fx, 0.3 + 0.9 * flash + (reached ? 0.35 : 0) + ctx.mod.glow),
          opacity: e,
          transform: `translateY(${((1 - e) * 12).toFixed(2)}px)`,
          visibility: t < b ? 'hidden' : undefined,
        }}
      >
        <div style={{position: 'absolute', left: 12, right: 12, bottom: 10, height: cardH * 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Lbl id={`${ctx.id}:a${k}`} text={a.label} maxW={cardW - 28} maxH={cardH * 0.4} size={labelSize} wrap fps={ctx.fps} color={C.ink} weight={FONT.label.strong} />
        </div>
      </div>
    );
  });

  // glyph wells + glyphs + check badges (one SVG over the cards)
  const marks: React.ReactNode[] = [];
  props.artifacts.forEach((a, k) => {
    const b = bornAt(k);
    if (t < b) return;
    const e = prog(ctx, b, P.arrive);
    const r = pr.reach[k];
    const reached = t >= r;
    const kc = KIND_COLOR[a.kind];
    const gc = reached ? mix(kc, C.ok, 0.75 * prog(ctx, r, P.label)) : kc;
    const [x, y] = L.pos[k];
    const gy = y - cardH / 2 + cardH * 0.31 + (1 - e) * 12;
    marks.push(
      <g key={`g${k}`} opacity={e}>
        <circle cx={x} cy={gy} r={wellR * 1.25} fill={gc} fillOpacity={0.07} />
        <circle cx={x} cy={gy} r={wellR} fill={C.void} fillOpacity={0.55} stroke={gc} strokeOpacity={0.35} strokeWidth={2} />
        <Glyph kind={a.kind as GlyphKind} x={x} y={gy} s={wellR * 1.25} color={gc} w={3.5} />
      </g>,
    );
    if (reached) {
      const q = prog(ctx, r, P.label);
      const bx = x + cardW / 2 - 4;
      const by = y - cardH / 2 - 2;
      marks.push(
        <g key={`m${k}`} opacity={q} transform={`translate(${bx} ${by}) scale(${(0.7 + 0.3 * q).toFixed(3)})`}>
          <circle r={30} fill={C.void} fillOpacity={0.9} />
          <circle r={26} fill={C.ok} fillOpacity={0.18} stroke={C.ok} strokeWidth={4} />
          <path d="M -11 1 L -3 9 L 12 -9" fill="none" stroke={C.ok} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </g>,
      );
    }
  });

  const anyReached = pr.reach.some((r) => t >= r);
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`ac-${ctx.id}`} w={W} h={H} y={L.floorY} color={anyReached ? C.ok : C.signal} pool={0.09} opacity={prog(ctx, ctx.at, P.arrive)} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {wires}
      </svg>
      {cards}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {marks}
        {tokens}
      </svg>
    </div>
  );
};

export const ArtifactChain: DcComponent<Props> = {name: 'ArtifactChain', Component: ArtifactChainView, text: true, slot: 'full'};
