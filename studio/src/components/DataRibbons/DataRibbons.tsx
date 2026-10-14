// DataRibbons (catalog: Space & 3D). Flowing ribbons that converge, diverge or run parallel (04 section 6; "streams" in Spark / Kafka /
// pipelines). Each ribbon is a twisting band (apparent width = |cos| of its twist, so it reads as a 3D strip) drawn additively in its
// token colour with emissive edge wires; bright packets march along it. The flow runs right -> left (RTL frame):
//   converge  spread at the right, one bundle at the left;   diverge  one bundle at the right, spread at the left;
//   parallel  the same spread end to end (a little depth stagger).
// Labels sit in a gutter at the SPREAD end, one chip per ribbon, level with its ribbon, 14 px apart at least (declutter); a ribbon
// without a label simply has no chip. Ribbons grow along the flow from the layer anchor, one every 2 film frames (RV1).
// Seeded (props.seed): wobble phases, twist rates, depth order, packet offsets. Deterministic: ambient drift uses ctx.frame only.
// Tiers: lite flat bands; standard + glow underlay and packet halos; hero + bloom. Glow / packets are masked out of copy (text-safe).
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {westernDigits} from '../../type/words';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, Measure, MLabel, SpaceCanvas, blit, bloomOf, chipH, chipW, clampInto, enterK, exitK, ff, fitTo, lerp, moveK, rgba, secs, sprite, useMeasure, useOverflow} from '../_space3d/kit';
import {ease} from '../../type/reveal';

const BASE = SIZE.label;
const N_SEG = 72;
const TIGHT = 9; // spacing of the bundled end (px)

export const DataRibbonsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.ribbons.length;
  const labels = props.ribbons.map((r) => (r.label ? westernDigits(r.label) : ''));
  const [mref, m] = useMeasure(ctx.id, labels.join('|'));
  const box = ctx.box;
  const k = enterK(ctx, 'label') * exitK(ctx);
  const bloom = bloomOf(ctx.fx);
  const t = secs(ctx);
  const hasLabels = labels.some(Boolean);
  const gutterAvail = box.w * 0.3;
  const fit = (i: number) => (m && labels[i] ? fitTo(BASE, m.w[i], gutterAvail - 24, SIZE.labelMin) : {size: BASE, overflow: false});
  const size = m ? Math.min(BASE, ...labels.map((_, i) => (labels[i] ? fit(i).size : BASE))) : BASE;
  useOverflow(ctx.id, labels.some((_, i) => labels[i] && fit(i).overflow), {labels});
  const lw = m && hasLabels ? Math.max(...labels.map((l, i) => (l ? chipW(m.w[i], BASE, size) : 0))) : 0;
  const gutter = hasLabels ? lw + 56 : 0;
  const rightSpread = props.flow !== 'diverge'; // spread end on the right (the flow start) for converge / parallel
  const x0 = rightSpread ? box.x + box.w - gutter : box.x + box.w; // flow start (right)
  const x1 = rightSpread ? box.x : box.x + gutter; // flow end (left)
  const cy = box.y + box.h / 2;
  const chH = hasLabels ? Math.max(...labels.map((l) => (l ? chipH(l, size) : 0))) : 0;
  const spacing = Math.min(86, Math.max(hasLabels ? chH + 14 : 0, 48), (box.h * 0.82) / Math.max(1, n));
  const spread = (i: number) => cy + (i - (n - 1) / 2) * spacing;
  const tight = (i: number) => cy + (i - (n - 1) / 2) * TIGHT;
  const seedS = `dr${props.seed}`;
  const rib = props.ribbons.map((r, i) => ({
    i,
    col: C[r.color],
    ph: random(`${seedS}p${i}`) * Math.PI * 2,
    fr: 0.8 + random(`${seedS}f${i}`) * 1.1,
    tw: 1.2 + random(`${seedS}t${i}`) * 1.6,
    z: random(`${seedS}z${i}`),
    off: random(`${seedS}o${i}`),
  }));
  const order = [...rib].sort((a, b) => a.z - b.z);
  const w0 = Math.min(34, spacing * 0.55);

  const yAt = (r: (typeof rib)[number], u: number): number => {
    const sp = props.flow === 'converge' ? 1 - ease.camera(u) : props.flow === 'diverge' ? ease.camera(u) : 1;
    const base = lerp(tight(r.i), spread(r.i), sp);
    const wob = (14 + 16 * r.z) * Math.sin(Math.PI * 2 * (u * r.fr + r.ph) + t * 0.5) * (props.flow === 'parallel' ? 0.6 : 0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, Math.max(0, u))));
    return base + wob * (props.flow === 'parallel' ? 1 : 1);
  };
  const widthAt = (r: (typeof rib)[number], u: number): number => w0 * (0.3 + 0.7 * Math.abs(Math.cos(Math.PI * 2 * (u * r.tw + r.ph) + t * 0.6))) * (0.75 + 0.25 * r.z);

  const draw = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const r of order) {
      const grow = moveK(ctx, ctx.at + r.i * ff(2, ctx.fps), 14, ease.camera) * k;
      if (grow <= 0.002) continue;
      const nSeg = Math.max(2, Math.round(N_SEG * grow));
      const top: {x: number; y: number}[] = [];
      const bot: {x: number; y: number}[] = [];
      const mid: {x: number; y: number}[] = [];
      for (let s = 0; s <= nSeg; s++) {
        const u = (s / N_SEG) ;
        const x = lerp(x0, x1, u);
        const y = yAt(r, u);
        const hw = widthAt(r, u) / 2;
        top.push({x, y: y - hw});
        bot.push({x, y: y + hw});
        mid.push({x, y});
      }
      const poly = (a: number, col: string, inflate = 0) => {
        g.globalAlpha = 1;
        g.fillStyle = rgba(col, a);
        g.beginPath();
        top.forEach((q, i) => (i ? g.lineTo(q.x, q.y - inflate) : g.moveTo(q.x, q.y - inflate)));
        for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i].x, bot[i].y + inflate);
        g.closePath();
        g.fill();
      };
      g.globalCompositeOperation = 'lighter';
      if (bloom) poly(0.1 * bloom, r.col, ctx.fx.glowInner * 1.2);
      poly(0.2 + 0.18 * r.z, r.col);
      g.strokeStyle = rgba(r.col, 0.85 * (0.7 + 0.3 * r.z));
      g.lineWidth = 2;
      for (const edge of [top, bot]) {
        g.beginPath();
        edge.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
        g.stroke();
      }
      // packets marching along the flow
      const np = ctx.fx.id === 'lite' ? 3 : 6;
      for (let j = 0; j < np; j++) {
        const u = (((t * (0.16 + 0.1 * r.z) + r.off + j / np) % 1) + 1) % 1;
        if (u > grow) continue;
        const x = lerp(x0, x1, u);
        const y = yAt(r, u);
        blit(g, sprite(r.col, 'core'), x, y, 9 + 5 * r.z, 0.95);
        if (ctx.fx.id !== 'lite') blit(g, sprite(r.col, 'glow'), x, y, 34 + 14 * r.z, 0.5 * Math.max(0.5, bloom));
      }
    }
  };

  const rect = {x: box.x - 40, y: box.y - 60, w: box.w + 80, h: box.h + 120};
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={draw} deps={[ctx.frame, k, n, props.flow, props.seed, ctx.fx.id, props.ribbons, spacing, gutter]} rect={rect} textSafe />
      <Measure mref={mref} size={BASE}>
        {labels.map((l, i) => <MLabel key={i} text={l || '-'} size={BASE} />)}
      </Measure>
      {m
        ? labels.map((l, i) => {
            if (!l) return null;
            const w = chipW(m.w[i], BASE, size);
            const h = chipH(l, size);
            const xs = rightSpread ? box.x + box.w - w : box.x;
            const pos = clampInto(box, xs, spread(i) - h / 2, w, h);
            return <Chip key={i} ctx={ctx} id={`${ctx.id}:l${i}`} text={l} size={size} x={pos.x} y={pos.y} t0={ctx.at + ff(2 * i, ctx.fps)} accent={C[props.ribbons[i].color]} overflow={fit(i).overflow} alpha={k} />;
          })
        : null}
    </>
  );
};

export const DataRibbons: DcComponent<Props> = {name: 'DataRibbons', Component: DataRibbonsView, text: true, slot: 'full'};
