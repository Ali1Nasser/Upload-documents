// ContextTunnel (catalog: Space & 3D). 04 section 6 "Embeddings, RAG, agents": the context tunnel with a limit. Seen side-on, the
// window is a corridor that narrows into depth; the flow runs right -> left (RTL frame): new items enter at the near end (right),
// every newer item pushes the older ones deeper, and at the far end sits the window gate in `ember` (the frame a function can see,
// 04 section 1.1). An item that passes the gate is evicted: it flashes `crit` and dissolves. The gate carries the window size.
// Items: system violet (scope boundary), user signal (the thing being explained), doc neutral, tool ok, answer ink: the kind is the
//   chip's edge colour (no extra copy is invented; labels are the props strings only).
// Timeline (a pure simulation, RV1): the initial items arrive from the layer anchor (one per 3 film frames); push {label, kind} adds an
//   item on ITS word; evict {count} removes the oldest `count` on its word; when more than CAP (5) items are alive, the oldest are
//   evicted automatically (overflow: a window is finite). Positions animate over the move length from each event (camera ease).
// Eviction is by slot count (CR-015 asks for per-item token sizes). Window: `window` is a Num {value, ref, unit}: the figure is printed at the gate (Western digits, mono, unit after the number).
// Text size: chip text scales with depth from 32 px to 28 px (SIZE.labelMin) so the far items stay legible; a label too wide for its
// slot shrinks to the floor, below it an overflow is reported. Tiers: lite flat frames; standard + ember glow at the gate; hero + bloom.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {halo} from '../../fx/look';
import {westernDigits} from '../../type/words';
import {lineHeightFor} from '../../type/arabic';
import {MixedText} from '../../type/Text';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {
  Measure, MLabel, SpaceCanvas, blit, bloomOf, enterK, exitK, ff, fmtNum, labelStyle, lerp, mix, moveK, rgba, sprite, useMeasure, useOverflow,
} from '../_space3d/kit';
import {clamp} from '../_space3d/kit';
import {interpolate, random} from 'remotion';

const BASE = SIZE.label;
export const CAP = 5; // slots in the window (illustration constant; the figure on the gate is the author's `window`)
const CARD_PAD = 14; // horizontal padding inside a card (layout constant)
const GATE_W = 150; // room behind the gate for the evicted item to dissolve inside the slot
type Kind = Props['items'][number]['kind'];
export type Item = {i: number; label: string; kind: Kind; born: number; died: number | null; auto: boolean};

const kindColor = (k: Kind): string => (k === 'system' ? C.violet : k === 'user' ? C.signal : k === 'doc' ? C.ink3 : k === 'tool' ? C.ok : C.ink);

/** Pure simulation of the window: every item with its birth and (if any) eviction frame. */
export const simulate = (props: Props, ctx: Pick<LayerCtx, 'at' | 'fps' | 'actions'>): Item[] => {
  const items: Item[] = [];
  type Ev = {t: number; li: number; kind: 'push' | 'evict'; item?: Item; count?: number};
  const evs: Ev[] = [];
  props.items.forEach((it, idx) => {
    const item: Item = {i: items.length, label: westernDigits(it.label), kind: it.kind, born: ctx.at + idx * ff(3, ctx.fps), died: null, auto: false};
    items.push(item);
    evs.push({t: item.born, li: -1000 + idx, kind: 'push', item});
  });
  for (const a of [...ctx.actions].sort((x, y) => x.at - y.at || x.li - y.li)) {
    if (a.name === 'push') {
      const p = a.props as {label: string; kind: Kind};
      const item: Item = {i: items.length, label: westernDigits(p.label), kind: p.kind, born: a.at, died: null, auto: false};
      items.push(item);
      evs.push({t: a.at, li: a.li, kind: 'push', item});
    } else if (a.name === 'evict') evs.push({t: a.at, li: a.li, kind: 'evict', count: (a.props as {count: number}).count});
  }
  evs.sort((x, y) => x.t - y.t || x.li - y.li);
  const live: Item[] = [];
  for (const e of evs) {
    if (e.kind === 'push' && e.item) {
      live.push(e.item);
      while (live.length > CAP) {
        const old = live.shift()!;
        old.died = e.t;
        old.auto = true;
      }
    } else for (let c = 0; c < (e.count ?? 0) && live.length; c++) live.shift()!.died = e.t;
  }
  return items;
};

/** Rank of an item (0 = newest alive) at frame t, or null when it is not alive. */
const rankAt = (items: Item[], it: Item, t: number): number | null => {
  if (t < it.born || (it.died !== null && t >= it.died)) return null;
  return items.filter((o) => o !== it && o.born <= t && (o.died === null || o.died > t) && (o.born > it.born || (o.born === it.born && o.i > it.i))).length;
};

export const ContextTunnelView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const items = simulate(props, ctx);
  const labels = Array.from(new Set(items.map((x) => x.label)));
  const [mref, m] = useMeasure(ctx.id, labels.join('|'));
  const box = ctx.box;
  const k = enterK(ctx, 'label') * exitK(ctx);
  const bloom = bloomOf(ctx.fx);
  const pitch = (box.w - GATE_W) / CAP;
  const xR = box.x + box.w;
  const cy = box.y + box.h * 0.5;
  const H0 = Math.min(box.h * 0.4, 250);
  const H1 = H0 * 0.42;
  const halfAt = (u: number) => lerp(H0, H1, u); // u: 0 near end .. 1 gate
  const xOf = (r: number) => xR - (r + 0.5) * pitch;
  // text size shared by every chip: widest label must fit the slot at the depth-scaled size
  const widest = m ? Math.max(...m.w) : 0;
  const cardW = pitch * 0.84;
  const availText = cardW - 2 * CARD_PAD; // a card is tall, so a label may wrap onto a second line (whole words only)
  let size = BASE;
  let overflow = false;
  if (m) {
    for (; size >= SIZE.labelMin; size -= 2) if ((widest * size) / BASE <= availText * 1.7) break;
    if (size < SIZE.labelMin) {
      size = SIZE.labelMin;
      overflow = true;
    }
  }
  useOverflow(ctx.id, overflow, {widest: Math.round(widest), pitch: Math.round(pitch)});
  const depthSize = (r: number) => Math.max(SIZE.labelMin, Math.round(size * lerp(1, 0.875, Math.min(1, Math.max(0, r) / (CAP - 1)))));
  const evTimes = Array.from(new Set(items.flatMap((x) => [x.born, ...(x.died === null ? [] : [x.died])]))).sort((a, b) => a - b);
  const eLast = [...evTimes].filter((t) => t <= ctx.frame).pop();
  const deaths = items.filter((x) => x.died !== null && x.died <= ctx.frame);
  const flash = deaths.length ? Math.max(...deaths.map((x) => interpolate(ctx.frame - (x.died as number), [0, 3, ff(14, ctx.fps)], [1, 1, 0], clamp))) : 0;

  type Draw = {it: Item; x: number; r: number; a: number; dying: number; q: number};
  const draws: Draw[] = [];
  const gateX = xR - CAP * pitch;
  for (const it of items) {
    if (ctx.frame < it.born) continue;
    const cur = rankAt(items, it, ctx.frame);
    const e = eLast ?? ctx.frame;
    if (cur === null) {
      if (it.died === null) continue;
      const q = moveK(ctx, it.died, 10);
      if (ctx.frame - it.died > ff(14, ctx.fps)) continue;
      const rb = rankAt(items, it, it.died - 1) ?? 0;
      const w = cardW;
      const xEnd = Math.max(gateX - 0.55 * pitch, box.x + w / 2);
      draws.push({it, x: lerp(xOf(rb), xEnd, q), r: rb, a: 1 - q * q, dying: Math.max(q, 0.01), q});
    } else {
      const before = rankAt(items, it, e - 1);
      const p = moveK(ctx, e, 8);
      const born = it.born === e || before === null;
      const r = born ? cur : lerp(before, cur, p);
      draws.push({it, x: xOf(r), r, a: born ? p * p : 1, dying: 0, q: 0});
    }
  }

  const rich = ctx.fx.id !== 'lite';
  const drawFrames = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.lineCap = 'round';
    const xG = xR - CAP * pitch;
    // glass floor: a ledge under the bottom rail that narrows with the corridor (04 section 1.2: contact light on a surface)
    if (rich) {
      const ledge = g.createLinearGradient(0, cy + H1, 0, cy + H0 + 0.22 * H0);
      ledge.addColorStop(0, rgba(C.grid, 0.0));
      ledge.addColorStop(1, rgba(C.grid, 0.34 * k));
      g.fillStyle = ledge;
      g.beginPath();
      g.moveTo(xR, cy + H0);
      g.lineTo(xG, cy + H1);
      g.lineTo(xG, cy + H1 + 0.09 * H0);
      g.lineTo(xR, cy + H0 + 0.22 * H0);
      g.closePath();
      g.fill();
    }
    // rails: cool grid at the near end, warming toward the gate
    // (gradient fills are standard / hero only: the lite tier stays flat, which also keeps its raster bit-exact)
    if (rich) {
      const railG = g.createLinearGradient(xR, 0, xG, 0);
      railG.addColorStop(0, rgba(C.grid, 0.55 * k));
      railG.addColorStop(0.7, rgba(C.ink3, 0.7 * k));
      railG.addColorStop(1, rgba(C.ember, 0.9 * k));
      g.strokeStyle = railG;
    } else g.strokeStyle = rgba(C.grid, 0.9 * k);
    g.lineWidth = 3;
    for (const sign of [-1, 1]) {
      g.beginPath();
      g.moveTo(xR, cy + sign * H0);
      g.lineTo(xG, cy + sign * H1);
      g.stroke();
    }
    // depth frames (slot boundaries)
    for (let j = 0; j < CAP; j++) {
      const x = xR - j * pitch;
      const h = halfAt(j / CAP);
      g.strokeStyle = rgba(C.grid, (0.3 + 0.5 * (1 - j / CAP)) * k);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, cy - h);
      g.lineTo(x, cy + h);
      g.stroke();
    }
    // the gate: an ember frame, hot on the inside edge; flashes crit when something is evicted
    g.strokeStyle = rgba(C.ember, 0.95 * k);
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(xG, cy - H1);
    g.lineTo(xG, cy + H1);
    g.stroke();
    g.strokeStyle = rgba(C.white, 0.5 * k);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(xG + 3, cy - H1 + 6);
    g.lineTo(xG + 3, cy + H1 - 6);
    g.stroke();
    if (flash > 0) {
      g.strokeStyle = rgba(mix(C.ember, C.crit, 0.7), flash * k);
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(xG, cy - H1);
      g.lineTo(xG, cy + H1);
      g.stroke();
    }
  };
  // each item is a glass card whose height follows the corridor (a trapezoid: the near edge is taller than the far edge)
  const drawCards = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.lineJoin = 'round';
    for (const {it, x, r, a, dying, q} of [...draws].sort((p, o) => o.r - p.r)) {
      const w = cardW;
      const hOf = (xx: number) => 0.8 * halfAt(Math.min(1, Math.max(0, (xR - xx) / (CAP * pitch))));
      const hr = hOf(x + w / 2);
      const hl = hOf(x - w / 2);
      const col = dying ? C.crit : kindColor(it.kind);
      const fog = 1 - 0.22 * Math.min(1, Math.max(0, r) / (CAP - 1)); // far cards recede a little (text stays full strength)
      const quad = () => {
        g.beginPath();
        g.moveTo(x + w / 2, cy - hr);
        g.lineTo(x - w / 2, cy - hl);
        g.lineTo(x - w / 2, cy + hl);
        g.lineTo(x + w / 2, cy + hr);
        g.closePath();
      };
      const al = a * k * fog;
      g.globalAlpha = 1;
      if (rich) {
        // contact shadow on the floor ledge, then a short reflection of the card (glass floor)
        const yb = cy + Math.max(hr, hl);
        const sh = g.createLinearGradient(0, cy + Math.min(hr, hl), 0, cy + Math.max(hr, hl) + 0.2 * H0);
        sh.addColorStop(0, rgba(col, 0.26 * al));
        sh.addColorStop(1, rgba(col, 0));
        g.fillStyle = sh;
        g.beginPath();
        g.moveTo(x + w / 2, cy + hr);
        g.lineTo(x - w / 2, cy + hl);
        g.lineTo(x - w / 2 + 6, cy + hl + 0.2 * H0);
        g.lineTo(x + w / 2 - 6, cy + hr + 0.2 * H0);
        g.closePath();
        g.fill();
      }
      quad();
      if (rich) {
        const body = g.createLinearGradient(0, cy - hr, 0, cy + hr);
        body.addColorStop(0, rgba(mix(C.panel, col, 0.2), 0.94 * al));
        body.addColorStop(0.5, rgba(mix(C.panel, col, 0.09), 0.9 * al));
        body.addColorStop(1, rgba(mix(C.panel, col, 0.05), 0.92 * al));
        g.fillStyle = body;
      } else g.fillStyle = rgba(mix(C.panel, col, 0.1), 0.9 * al);
      g.fill();
      g.strokeStyle = rgba(col, 0.92 * al);
      g.lineWidth = 3;
      g.stroke();
      // rim light: key from the upper right (04 section 1.2), a bright top edge and near edge
      g.strokeStyle = rgba(C.ink, 0.42 * al);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - w / 2 + 4, cy - hl);
      g.lineTo(x + w / 2, cy - hr);
      g.lineTo(x + w / 2, cy + hr);
      g.stroke();
      if (dying && rich) {
        // the evicted card breaks into seeded shards that drift beyond the gate and fade (a card, never the letters)
        for (let j = 0; j < 14; j++) {
          const rx = random(`${ctx.id}:sh${it.i}:${j}:x`);
          const ry = random(`${ctx.id}:sh${it.i}:${j}:y`);
          const rs = random(`${ctx.id}:sh${it.i}:${j}:s`);
          const sx = x - w / 2 + rx * w * 0.55 - q * (30 + 120 * rs);
          const sy = cy + (ry - 0.5) * 2 * hl * 0.9 + (ry - 0.5) * q * 70;
          const sz = 8 + 16 * rs;
          g.fillStyle = rgba(C.crit, 0.7 * (1 - q) * k);
          g.fillRect(sx - sz / 2, sy - sz / 4, sz, sz / 2);
        }
      }
    }
  };
  const drawGlow = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.globalCompositeOperation = 'lighter';
    blit(g, sprite(C.ember, 'glow'), xR - CAP * pitch, cy, H1 * 1.7, (0.45 + 0.5 * flash) * k * (0.5 + 0.5 * bloom));
    const newest = draws.filter((d) => !d.dying).sort((p, q) => p.r - q.r)[0];
    if (newest) blit(g, sprite(kindColor(newest.it.kind), 'glow'), newest.x, cy, pitch * 0.9, 0.3 * newest.a * k * (0.5 + 0.5 * bloom));
    if (flash > 0) blit(g, sprite(C.crit, 'glow'), xR - CAP * pitch, cy, H1 * 2, 0.5 * flash * k);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  };
  // one canvas for the whole set (a canvas per layer cost 0.02 s/frame at 1080p): light behind the glass first, then frames, then cards.
  // The glow lies BEHIND the cards and the figure, so it never veils copy (no text-safe cut needed).
  const drawAll = (g: CanvasRenderingContext2D) => {
    if (rich) drawGlow(g);
    drawFrames(g);
    drawCards(g);
  };

  const rect = {x: box.x - 60, y: box.y - 40, w: box.w + 120, h: box.h + 80};
  const gx = gateX;
  const win = props.window;
  const figPx = SIZE.sub;
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawAll} deps={[ctx.frame, k, flash, ctx.fx.id, pitch, draws.length]} rect={rect} />
      <Measure mref={mref} size={BASE}>
        {labels.map((t, i) => <MLabel key={i} text={t} size={BASE} />)}
      </Measure>
      <div style={{position: 'absolute', left: gx - 20, top: cy - H1 - figPx * 1.5 - 20, display: 'flex', alignItems: 'baseline', gap: 12, whiteSpace: 'nowrap', ...labelStyle(ctx, ctx.at), opacity: k}}>
        <bdi dir="ltr" data-dc-text={`${ctx.id}:win`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: figPx, lineHeight: 1.1, color: C.ember, fontFeatureSettings: '"tnum" 1', textShadow: halo}}>
          {fmtNum(win.value, win.decimals ?? 0)}
          {win.unit ? <span style={{fontSize: '0.5em', color: C.ink2, marginLeft: '0.4em'}}>{win.unit}</span> : null}
        </bdi>
      </div>
      {m
        ? draws.map(({it, x, r, a, dying}) => {
            const sz = depthSize(r);
            const st = labelStyle(ctx, it.born);
            return (
              <div
                key={it.i}
                style={{
                  position: 'absolute',
                  left: x - cardW / 2,
                  top: cy - H0,
                  width: cardW,
                  height: 2 * H0,
                  padding: `0 ${CARD_PAD}px`,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: sz,
                  lineHeight: lineHeightFor(it.label),
                  color: dying ? C.crit : C.ink,
                  textShadow: halo,
                  ...st,
                  opacity: (typeof st.opacity === 'number' ? st.opacity : 1) * a * k,
                  outline: overflow ? `2px dashed ${C.crit}` : undefined,
                }}
              >
                <MixedText id={`${ctx.id}:i${it.i}`} text={it.label} size={sz} weight={FONT.label.weight} />
              </div>
            );
          })
        : null}
    </>
  );
};
export const ContextTunnel: DcComponent<Props> = {name: 'ContextTunnel', Component: ContextTunnelView, text: true, slot: 'full'};
