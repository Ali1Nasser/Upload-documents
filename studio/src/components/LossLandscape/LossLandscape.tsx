// LossLandscape (catalog: Space & 3D). 04 section 6 "Neural networks": the loss landscape with an optimiser path. A shaded height
// surface (cells painted far -> near, lit from the upper right, 1 px `grid` wires) orbits slowly; the optimiser is a `signal` ball that
// really runs gradient descent on that surface (seeded start; x <- x - lr * grad f), leaving a trail with one dot per step. The
// minimum is ringed `ok`. kind: convex (a bowl; curvature 2 / 0.35 so the stability limit is lr = 0.35, d:6.16:2), nonconvex (seeded
// ripples on a bowl: several minima) or saddle (a pass: the path drifts along the ridge, then falls off one side).
// Timing (RV1): step {n} walks n more steps over ITS word (from the word onset to the word end, camera ease); overshoot raises the
// learning rate to 1.35 x the stability limit on ITS word: the next steps bounce outward, the trail turns `crit` and leaves the bowl.
// With no step action the whole `steps` path plays from the layer anchor (2 film frames per step). `lr` {value, ref}: printed as
// "lr = value" in a mono chip (Western digits); the dynamics use that value (default 0.12, an illustration, not printed).
// Tiers: lite = coarse mesh (18 x 18) at half resolution; standard = full mesh (28 x 28) + ball halo; hero = + bloom. 3D is
// projected on a 2D canvas (no WebGL), so the standard tier is the full fallback and the ADR-002 RT5 hero share is not consumed.
import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C, CAMERA, H, SIZE} from '../../tokens';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {Chip, SpaceCanvas, actionsOf, blit, bloomOf, chipW, enterK, exitK, ff, fmtNum, lerp, mix, project, rgba, secs, sprite, type Cam3, type V3} from '../_space3d/kit';
import {ease, revealProgress} from '../../type/reveal';
import {useMeasure, Measure, MLabel, useOverflow, fitTo} from '../_space3d/kit';

const DOM = 1.6; // surface domain: x, y in [-DOM, DOM]
const HMAX = 2.1; // world height of the highest point
const LR_CRIT = 0.35; // stability limit of the convex bowl (d:6.16:2)
const L_CONVEX = 2 / LR_CRIT;
const OVER_MULT = 1.35;
const OVER_STEPS = 6;
const BASE = SIZE.labelMin;

type Fn = (x: number, y: number) => number;
const surfaceOf = (kind: Props['kind'], seed: number): Fn => {
  const s = `ll${kind}${seed}`;
  if (kind === 'convex') return (x, y) => 0.5 * L_CONVEX * x * x + 0.5 * y * y;
  if (kind === 'saddle') return (x, y) => 1.4 * x * x - 1.4 * y * y + 0.9 * y ** 4;
  const [p1, p2, p3] = [random(`${s}a`) * 6.28, random(`${s}b`) * 6.28, random(`${s}c`) * 6.28];
  return (x, y) => 0.5 * (x * x + y * y) + 0.55 * Math.sin(2.6 * x + p1) * Math.cos(2.4 * y + p2) + 0.25 * Math.sin(4.1 * (x + y) + p3);
};
const grad = (f: Fn, x: number, y: number): [number, number] => {
  const e = 1e-3;
  return [(f(x + e, y) - f(x - e, y)) / (2 * e), (f(x, y + e) - f(x, y - e)) / (2 * e)];
};
const clampD = (v: number) => Math.max(-DOM * 1.02, Math.min(DOM * 1.02, v));

type Seg = {t0: number; t1: number; from: number; to: number};
type Plan = {pts: [number, number][]; over: boolean[]; segs: Seg[]};
/** The optimiser plan: every visited point (real gradient descent) and the time segments that walk them. */
export const planOf = (props: Props, ctx: Pick<LayerCtx, 'at' | 'fps' | 'actions'>, f: Fn): Plan => {
  const lr = props.lr?.value ?? 0.12;
  const a0 = random(`ll${props.seed}start`) * Math.PI * 2;
  let p: [number, number] =
    props.kind === 'saddle' ? [0.95 * (random(`ll${props.seed}sx`) < 0.5 ? -1 : 1), 0.04 + 0.04 * random(`ll${props.seed}sy`)] : [1.15 * Math.cos(a0), 1.15 * Math.sin(a0)];
  const pts: [number, number][] = [p];
  const over: boolean[] = [false];
  const segs: Seg[] = [];
  let mult = 1;
  const walk = (n: number) => {
    for (let i = 0; i < n; i++) {
      const [gx, gy] = grad(f, p[0], p[1]);
      p = [clampD(p[0] - lr * mult * gx), clampD(p[1] - lr * mult * gy)];
      pts.push(p);
      over.push(mult > 1);
    }
  };
  const evs = actionsOf(ctx as LayerCtx, 'step').concat(actionsOf(ctx as LayerCtx, 'overshoot')).sort((a, b) => a.at - b.at || a.li - b.li);
  if (!evs.length) {
    walk(props.steps);
    segs.push({t0: ctx.at + ff(6, ctx.fps), t1: ctx.at + ff(6, ctx.fps) + props.steps * ff(2, ctx.fps), from: 0, to: props.steps});
    return {pts, over, segs};
  }
  let taken = 0;
  for (const a of evs) {
    const t1 = Math.max(a.at + ff(6, ctx.fps), a.end);
    const from = pts.length - 1;
    if (a.name === 'overshoot') {
      mult = (OVER_MULT * 2) / (L_CONVEX * lr);
      walk(OVER_STEPS);
    } else {
      const n = Math.min((a.props as {n: number}).n, Math.max(0, props.steps - taken));
      taken += n;
      if (!n) continue;
      walk(n);
    }
    segs.push({t0: a.at, t1, from, to: pts.length - 1});
  }
  return {pts, over, segs};
};

/** Float index into the plan's points at frame t. */
export const headAt = (plan: Plan, t: number): number => {
  let idx = 0;
  for (const s of plan.segs) {
    if (t < s.t0) break;
    idx = lerp(s.from, s.to, revealProgress(t - s.t0, Math.max(1, s.t1 - s.t0), ease.camera));
  }
  return idx;
};

type Grid = {n: number; h: number[]; hn: Fn; fmin: number; fmax: number; min: [number, number]};
const gridOf = (f: Fn, n: number): Grid => {
  const h: number[] = [];
  let fmin = Infinity;
  let fmax = -Infinity;
  let min: [number, number] = [0, 0];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const x = -DOM + (2 * DOM * i) / n;
      const y = -DOM + (2 * DOM * j) / n;
      const v = f(x, y);
      h.push(v);
      if (v < fmin) {
        fmin = v;
        min = [x, y];
      }
      fmax = Math.max(fmax, v);
    }
  // clip the very high rim so the bowl does not dwarf its floor (percentile-free: cap at fmin + 0.8 * range)
  const cap = fmin + 0.8 * (fmax - fmin);
  return {n, h: h.map((v) => Math.min(cap, v)), hn: (x, y) => Math.min(1, Math.max(0, (f(x, y) - fmin) / (cap - fmin))), fmin, fmax: cap, min};
};

export const LossLandscapeView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const f = useMemo(() => surfaceOf(props.kind, props.seed), [props.kind, props.seed]);
  const N = ctx.fx.id === 'lite' ? 18 : 28;
  const grid = useMemo(() => gridOf(f, N), [f, N]);
  const plan = planOf(props, ctx, f);
  const head = headAt(plan, ctx.frame);
  const k = enterK(ctx, 'morph') * exitK(ctx);
  const bloom = bloomOf(ctx.fx);
  const lrText = props.lr ? `lr = ${fmtNum(props.lr.value, props.lr.decimals ?? 2)}${props.lr.unit ? ` ${props.lr.unit}` : ''}` : '';
  const [mref, m] = useMeasure(ctx.id, lrText);
  const box = ctx.box;
  const fit = m && lrText ? fitTo(BASE, m.w[0], box.w * 0.5, 18) : {size: BASE, overflow: false};
  useOverflow(ctx.id, fit.overflow, {lr: lrText});
  const cam: Cam3 = {yaw: 0.62 + ((CAMERA.orbitDegPerS * Math.PI) / 180) * secs(ctx) * 5, pitch: 0.5, dist: 10.5, fovDeg: 40, cx: box.x + box.w / 2, cy: box.y + box.h * 0.56, viewH: H * 0.95, target: [0, 0.7, 0]};
  const world = (x: number, y: number): V3 => [x, grid.hn(x, y) * HMAX, y];
  const lift = 0.07;

  const draw = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    const n = grid.n;
    const P: ReturnType<typeof project>[] = [];
    const Y: number[] = [];
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const hn = Math.min(1, Math.max(0, (grid.h[j * (n + 1) + i] - grid.fmin) / (grid.fmax - grid.fmin)));
        const x = -DOM + (2 * DOM * i) / n;
        const y = -DOM + (2 * DOM * j) / n;
        P.push(project(cam, [x, hn * HMAX, y]));
        Y.push(hn);
      }
    const cells: {i: number; j: number; d: number}[] = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) cells.push({i, j, d: (P[j * (n + 1) + i].d + P[(j + 1) * (n + 1) + i + 1].d) / 2});
    cells.sort((a, b) => b.d - a.d);
    g.lineJoin = 'round';
    const reveal = k;
    for (const c of cells) {
      const a = P[c.j * (n + 1) + c.i];
      const b = P[c.j * (n + 1) + c.i + 1];
      const d = P[(c.j + 1) * (n + 1) + c.i + 1];
      const e = P[(c.j + 1) * (n + 1) + c.i];
      if (!a.ok || !b.ok || !d.ok || !e.ok) continue;
      const hn = (Y[c.j * (n + 1) + c.i] + Y[(c.j + 1) * (n + 1) + c.i + 1]) / 2;
      const slope = (Y[c.j * (n + 1) + c.i] - Y[c.j * (n + 1) + c.i + 1]) * 0.9 + (Y[(c.j + 1) * (n + 1) + c.i] - Y[c.j * (n + 1) + c.i]) * -0.35; // key light from the upper right
      const shade = Math.max(0, Math.min(1, 0.42 + 1.2 * slope + 0.25 * hn));
      const tint = ctx.fx.id === 'lite' ? 0 : 0.14 * (1 - hn);
      g.globalAlpha = reveal;
      g.fillStyle = mix(mix(C.void, C.panel, shade), C.signal, tint);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.lineTo(d.x, d.y);
      g.lineTo(e.x, e.y);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba(mix(C.grid, C.ink3, 0.35 + 0.4 * hn), 0.85);
      g.lineWidth = 1.2;
      g.stroke();
    }
    g.globalAlpha = 1;
    const to2 = (x: number, y: number) => project(cam, [x, grid.hn(x, y) * HMAX + lift, y]);
    // the minimum (ok ring)
    const mn = to2(grid.min[0], grid.min[1]);
    if (mn.ok) {
      g.strokeStyle = rgba(C.ok, 0.9 * reveal);
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(mn.x, mn.y, 26, 11, 0, 0, Math.PI * 2);
      g.stroke();
    }
    // trail up to the head, one dot per step
    const last = Math.floor(head);
    const pts2 = plan.pts.slice(0, last + 1).map((q) => to2(q[0], q[1]));
    const hp = plan.pts[Math.min(plan.pts.length - 1, last)];
    const np = plan.pts[Math.min(plan.pts.length - 1, last + 1)];
    const fr = head - last;
    const hx = lerp(hp[0], np[0], fr);
    const hy = lerp(hp[1], np[1], fr);
    const hd = to2(hx, hy);
    const segCol = (i: number) => (plan.over[i] ? C.crit : C.signal);
    g.lineCap = 'round';
    for (let i = 1; i < pts2.length; i++) {
      g.strokeStyle = rgba(segCol(i), 0.95 * reveal);
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(pts2[i - 1].x, pts2[i - 1].y);
      g.lineTo(pts2[i].x, pts2[i].y);
      g.stroke();
    }
    if (pts2.length) {
      g.strokeStyle = rgba(segCol(Math.min(plan.pts.length - 1, last + 1)), 0.95 * reveal);
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(pts2[pts2.length - 1].x, pts2[pts2.length - 1].y);
      g.lineTo(hd.x, hd.y);
      g.stroke();
    }
    pts2.forEach((q, i) => {
      g.fillStyle = rgba(i === 0 ? C.ink : segCol(i), reveal);
      g.beginPath();
      g.arc(q.x, q.y, 5, 0, Math.PI * 2);
      g.fill();
    });
    if (hd.ok) {
      const bc = plan.over[Math.min(plan.pts.length - 1, last + 1)] ? C.crit : C.signal;
      g.globalCompositeOperation = 'lighter';
      if (ctx.fx.id !== 'lite') blit(g, sprite(bc, 'glow'), hd.x, hd.y, 60, 0.55 * Math.max(0.5, bloom) * reveal);
      blit(g, sprite(bc, 'core'), hd.x, hd.y, 20, reveal);
      g.globalCompositeOperation = 'source-over';
    }
  };

  const w = m && lrText ? chipW(m.w[0], BASE, fit.size) : 0;
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={draw} deps={[ctx.frame, k, N, props.kind, props.seed, props.steps, props.lr?.value, ctx.fx.id, plan.pts.length, ctx.actions.length]} textSafe={false} />
      <Measure mref={mref} size={BASE}>
        <MLabel text={lrText || '-'} size={BASE} mono />
      </Measure>
      {m && lrText ? <Chip ctx={ctx} id={`${ctx.id}:lr`} text={lrText} size={fit.size} x={box.x + box.w - w} y={box.y} t0={ctx.at + ff(4, ctx.fps)} accent={C.signal} mono alpha={k} overflow={fit.overflow} /> : null}
    </>
  );
};

export const LossLandscape: DcComponent<Props> = {name: 'LossLandscape', Component: LossLandscapeView, text: true, slot: 'full'};
