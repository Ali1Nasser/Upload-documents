// ContextTunnel (catalog: Space & 3D). 04 section 6 "Embeddings, RAG, agents": the context tunnel with a limit. Seen side-on, the
// window is a corridor that narrows into depth; the flow runs right -> left (RTL frame): new items enter at the near end (right),
// every newer item pushes the older ones deeper, and at the far end sits the window gate in `ember` (the frame a function can see,
// 04 section 1.1). An item that passes the gate is evicted: it flashes `crit` and dissolves. The gate carries the window size.
// Items: system violet (scope boundary), user signal (the thing being explained), doc neutral, tool ok, answer ink: the kind is the
//   chip's edge colour (no extra copy is invented; labels are the props strings only).
// Timeline (a pure simulation, RV1): the initial items arrive from the layer anchor (one per 3 film frames); push {label, kind} adds an
//   item on ITS word; evict {count} removes the oldest `count` on its word; when more than CAP (5) items are alive, the oldest are
//   evicted automatically (overflow: a window is finite). Positions animate over the move length from each event (camera ease).
// Window: `window` is a Num {value, ref, unit}: the figure is printed at the gate (Western digits, mono, unit after the number).
// Text size: chip text scales with depth from 32 px to 28 px (SIZE.labelMin) so the far items stay legible; a label too wide for its
// slot shrinks to the floor, below it an overflow is reported. Tiers: lite flat frames; standard + ember glow at the gate; hero + bloom.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {halo} from '../../fx/look';
import {westernDigits} from '../../type/words';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {
  Chip, Measure, MLabel, SpaceCanvas, blit, bloomOf, chipH, chipW, enterK, exitK, ff, fmtNum, labelStyle, lerp, mix, moveK, rgba, sprite, useMeasure, useOverflow,
} from '../_space3d/kit';
import {clamp} from '../_space3d/kit';
import {interpolate} from 'remotion';

const BASE = SIZE.label;
export const CAP = 5; // slots in the window (illustration constant; the figure on the gate is the author's `window`)
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
  const cy = box.y + box.h * 0.56;
  const H0 = Math.min(box.h * 0.4, 180);
  const H1 = H0 * 0.6;
  const halfAt = (u: number) => lerp(H0, H1, u); // u: 0 near end .. 1 gate
  const xOf = (r: number) => xR - (r + 0.5) * pitch;
  // text size shared by every chip: widest label must fit the slot at the depth-scaled size
  const widest = m ? Math.max(...m.w) : 0;
  const availChip = pitch - 16;
  let size = BASE;
  let overflow = false;
  if (m) {
    for (; size >= SIZE.labelMin; size -= 2) if (chipW(widest, BASE, size) <= availChip) break;
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

  type Draw = {it: Item; x: number; r: number; a: number; dying: number};
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
      const w = m ? chipW(m.w[labels.indexOf(it.label)], BASE, depthSize(rb)) : 0;
      const xEnd = Math.max(gateX - 0.55 * pitch, box.x + w / 2);
      draws.push({it, x: lerp(xOf(rb), xEnd, q), r: rb, a: 1 - q * q, dying: Math.max(q, 0.01)});
    } else {
      const before = rankAt(items, it, e - 1);
      const p = moveK(ctx, e, 8);
      const born = it.born === e || before === null;
      const r = born ? cur : lerp(before, cur, p);
      draws.push({it, x: xOf(r), r, a: born ? p * p : 1, dying: 0});
    }
  }

  const drawFrames = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.lineCap = 'round';
    // rails
    const rail = (sign: number) => {
      g.beginPath();
      g.moveTo(xR, cy + sign * H0);
      g.lineTo(xR - CAP * pitch, cy + sign * H1);
      g.stroke();
    };
    g.strokeStyle = rgba(C.grid, k);
    g.lineWidth = 3;
    rail(-1);
    rail(1);
    // depth frames (slot boundaries)
    for (let j = 0; j <= CAP; j++) {
      const x = xR - j * pitch;
      const h = halfAt(j / CAP);
      g.strokeStyle = rgba(j === CAP ? C.ember : C.grid, (j === CAP ? 0.95 : 0.4 + 0.5 * (1 - j / CAP)) * k);
      g.lineWidth = j === CAP ? 5 : 2;
      g.beginPath();
      g.moveTo(x, cy - h);
      g.lineTo(x, cy + h);
      g.stroke();
    }
    // the gate: ember frame, flashes crit when something is evicted
    if (flash > 0) {
      g.strokeStyle = rgba(mix(C.ember, C.crit, 0.7), flash * k);
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(xR - CAP * pitch, cy - H1);
      g.lineTo(xR - CAP * pitch, cy + H1);
      g.stroke();
    }
  };
  const drawGlow = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.globalCompositeOperation = 'lighter';
    blit(g, sprite(C.ember, 'glow'), xR - CAP * pitch, cy, H1 * 2.2, (0.45 + 0.5 * flash) * k * (0.5 + 0.5 * bloom));
    if (flash > 0) blit(g, sprite(C.crit, 'glow'), xR - CAP * pitch, cy, H1 * 2.6, 0.5 * flash * k);
  };

  const rect = {x: box.x - 60, y: box.y - 40, w: box.w + 120, h: box.h + 80};
  const gx = gateX;
  const win = props.window;
  const figPx = SIZE.sub;
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawFrames} deps={[ctx.frame, k, flash, ctx.fx.id, pitch]} rect={rect} />
      {ctx.fx.id !== 'lite' ? <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawGlow} deps={[ctx.frame, k, flash, ctx.fx.id]} rect={rect} textSafe /> : null}
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
            const w = chipW(m.w[labels.indexOf(it.label)], BASE, sz);
            const h = chipH(it.label, sz);
            return (
              <Chip key={it.i} ctx={ctx} id={`${ctx.id}:i${it.i}`} text={it.label} size={sz} x={x - w / 2} y={cy - h / 2} t0={it.born} accent={dying ? C.crit : kindColor(it.kind)} color={dying ? C.crit : C.ink} alpha={a * k} overflow={overflow} />
            );
          })
        : null}
    </>
  );
};
export const ContextTunnel: DcComponent<Props> = {name: 'ContextTunnel', Component: ContextTunnelView, text: true, slot: 'full'};
