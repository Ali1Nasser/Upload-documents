// VectorGalaxy (catalog: Space & 3D). 04 section 6 "Embeddings, RAG": meaning as position. Seeded clusters of points (<= 1,500,
// capped by the tier: lite 300, standard / hero 1,500) float in a 3D field that orbits at CAMERA.orbitDegPerS. Clusters are groups,
// so their points carry `violet` (04 section 1.1: partition / group) over neutral ink; the thing being explained (the query probe,
// its nearest neighbours and their beams) is `signal`, the brightest mark on screen (04 section 1.2).
// Actions (each anchored to its own word, RV1 through revealProgress):
//   probe {query}               the probe flies in beside clusters[0] (authors list the matching cluster first) + its query chip;
//   highlightNeighbors {k}      the k nearest points to the probe ignite in rank order, beams draw from the probe (cosine = angle,
//                               drawn as proximity); `query` on the action also places the probe;
//   zoomCluster {cluster}       the camera dollies to that cluster's centre (camera ease, the morph preset length).
// Scores are not drawn here: the action carries `scores_ref` but no values (CR filed); a NumberCounter / CalloutArrow shows them.
// Tiers: lite = flat dots at half resolution; standard = + cluster nebulae and halos; hero = + bloom sprites (no WebGL needed, so
// the ADR-002 RT5 hero share is not consumed; standard is the full fallback). Text-safe: every copy box is cut out of the field.
import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C, CAMERA, H, SIZE, W} from '../../tokens';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {
  Chip, Measure, MLabel, SpaceCanvas, actionsOf, blit, bloomOf, chipH, chipW, clampInto, enterK, exitK, ff, fitTo, gauss, lerp, moveK,
  project, rgba, secs, sprite, useMeasure, useOverflow, type Cam3, type V3,
} from '../_space3d/kit';

const BASE = SIZE.label; // chip copy (32 px), floor SIZE.labelMin
type Field = {centres: V3[]; pts: {p: V3; cl: number; tint: boolean; br: number}[]; q: V3; order: number[]};

const buildField = (nClusters: number, n: number, seed: number): Field => {
  const s = `vg${seed}`;
  const a0 = random(`${s}a0`) * Math.PI * 2;
  const centres: V3[] = Array.from({length: nClusters}, (_, c) => {
    const a = a0 + (c / nClusters) * Math.PI * 2 + (random(`${s}ca${c}`) - 0.5) * 0.5;
    const r = nClusters === 1 ? 0 : 2.7 + random(`${s}cr${c}`) * 0.9;
    return [Math.cos(a) * r, (random(`${s}cy${c}`) - 0.5) * 2.0, Math.sin(a) * r * 0.85];
  });
  const pts = Array.from({length: n}, (_, i) => {
    const k = `${s}:${i}`;
    const uniform = random(`${k}u`) < 0.14;
    const cl = i % nClusters;
    const c = centres[cl];
    const sp = 0.45 + random(`${k}s`) * 0.35;
    const p: V3 = uniform
      ? [(random(`${k}x`) - 0.5) * 13, (random(`${k}y`) - 0.5) * 7, (random(`${k}z`) - 0.5) * 10]
      : [c[0] + gauss(`${k}x`) * sp, c[1] + gauss(`${k}y`) * sp * 0.75, c[2] + gauss(`${k}z`) * sp];
    return {p, cl: uniform ? -1 : cl, tint: random(`${k}t`) < 0.4, br: 0.45 + random(`${k}b`) * 0.55};
  });
  // the probe sits just outside clusters[0], on the side facing the field centre
  const c0 = centres[0];
  const len = Math.hypot(c0[0], c0[1], c0[2]) || 1;
  const q: V3 = nClusters === 1 ? [0.9, 0.4, 0.6] : [c0[0] - (c0[0] / len) * 1.7, c0[1] + 0.7, c0[2] - (c0[2] / len) * 1.7];
  const d2 = (p: V3) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  const order = pts.map((_, i) => i).filter((i) => pts[i].cl === 0).sort((a, b) => d2(pts[a].p) - d2(pts[b].p) || a - b).slice(0, 10);
  return {centres, pts, q, order};
};

/** Camera: slow orbit; zoomCluster dollies the target to a cluster centre. */
const cameraAt = (ctx: LayerCtx, props: Props, f: Field): Cam3 => {
  const yaw0 = random(`vg${props.seed}yaw`) * Math.PI * 2;
  let target: V3 = [0, 0, 0];
  let dist = 9.5;
  for (const a of actionsOf(ctx, 'zoomCluster')) {
    const ci = props.clusters.indexOf((a.props as {cluster: string}).cluster);
    if (ci < 0) continue;
    const k = moveK(ctx, a.at, 12);
    const c = f.centres[ci];
    target = [lerp(target[0], c[0], k), lerp(target[1], c[1], k), lerp(target[2], c[2], k)];
    dist = lerp(dist, 5.4, k);
  }
  const yaw = yaw0 + ((CAMERA.orbitDegPerS * Math.PI) / 180) * secs(ctx) * 4; // 4 x the floor rate: a set, not a hold
  return {yaw, pitch: 0.34, dist, fovDeg: 42, cx: W / 2, cy: H / 2, viewH: H, target};
};

type Probe = {label: string | null; at: number; labelAt: number};
const probeOf = (ctx: LayerCtx, props: Props): Probe | null => {
  const ev: Probe[] = [];
  if (props.query) ev.push({label: props.query, at: -1e9, labelAt: ctx.at + ff(4, ctx.fps)});
  for (const a of actionsOf(ctx, 'probe')) ev.push({label: (a.props as {query: string}).query, at: a.at, labelAt: a.at});
  for (const a of actionsOf(ctx, 'highlightNeighbors')) {
    const q = (a.props as {query?: string}).query;
    if (q) ev.push({label: q, at: a.at, labelAt: a.at});
  }
  const live = ev.filter((e) => e.at <= ctx.frame).sort((a, b) => a.at - b.at);
  return live.length ? live[live.length - 1] : null;
};
const firstProbeAt = (ctx: LayerCtx, props: Props): number | null => {
  const ats = [props.query ? -1e9 : Infinity, ...actionsOf(ctx, 'probe').map((a) => a.at), ...actionsOf(ctx, 'highlightNeighbors').filter((a) => (a.props as {query?: string}).query).map((a) => a.at)];
  const m = Math.min(...ats);
  return Number.isFinite(m) ? m : null;
};

export const VectorGalaxyView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = Math.min(props.points, ctx.fx.particles);
  const f = useMemo(() => buildField(props.clusters.length, n, props.seed), [props.clusters.length, n, props.seed]);
  const queries = useMemo(() => {
    const out = props.query ? [props.query] : [];
    for (const a of ctx.actions) {
      const q = (a.props as {query?: string}).query;
      if (q && !out.includes(q)) out.push(q);
    }
    return out;
  }, [props.query, ctx.actions]);
  const all = [...props.clusters, ...queries];
  const [mref, m] = useMeasure(ctx.id, all.join('|'));
  const enter = enterK(ctx, 'morph');
  const k = enter * exitK(ctx);
  const cam = cameraAt(ctx, props, f);
  const glow = bloomOf(ctx.fx);
  const p0 = firstProbeAt(ctx, props);
  const fly = p0 === null ? 0 : p0 < -1e8 ? enter : moveK(ctx, p0, 8);
  const qFrom: V3 = [f.q[0], f.q[1] + 2.6, f.q[2] + 3.2];
  const qPos: V3 = [lerp(qFrom[0], f.q[0], fly), lerp(qFrom[1], f.q[1], fly), lerp(qFrom[2], f.q[2], fly)];
  // neighbour ignition (rank-staggered) per highlightNeighbors action; the latest action wins
  const hn = actionsOf(ctx, 'highlightNeighbors').filter((a) => a.at <= ctx.frame).pop();
  const nk = hn ? Math.min(10, (hn.props as {k: number}).k) : 0;
  const ign = (r: number) => (hn ? moveK(ctx, hn.at + r * ff(2, ctx.fps), 6) : 0);
  const boost = 1 + 0.6 * ctx.mod.particles + 0.4 * ctx.mod.glow;

  const draw = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.globalCompositeOperation = 'lighter';
    if (glow)
      f.centres.forEach((c) => {
        const p = project(cam, c);
        if (p.ok) blit(g, sprite(C.violet, 'glow'), p.x, p.y, Math.min(420, p.s * 2.2), 0.22 * glow * k);
      });
    const lit = new Set(f.order.slice(0, nk));
    for (let i = 0; i < f.pts.length; i++) {
      if (lit.has(i)) continue;
      const pt = f.pts[i];
      const p = project(cam, pt.p);
      if (!p.ok) continue;
      const depth = Math.max(0, Math.min(1, (16 - p.d) / 10)); // 1 = near
      const col = pt.cl < 0 ? C.ink3 : pt.tint ? C.violet : C.ink2;
      const r = Math.max(1.2, 0.042 * p.s * (0.7 + 0.5 * pt.br));
      const a = (0.4 + 0.6 * depth) * (0.5 + 0.5 * pt.br) * k * boost * (hn ? 0.75 : 1);
      blit(g, sprite(col, 'dot'), p.x, p.y, r, a);
      if (glow && depth > 0.55) blit(g, sprite(col, 'glow'), p.x, p.y, r * 4.5, a * 0.3 * glow);
    }
    const q = project(cam, qPos);
    if (hn && q.ok)
      f.order.slice(0, nk).forEach((pi, r) => {
        const u = ign(r);
        if (u <= 0) return;
        const p = project(cam, f.pts[pi].p);
        if (!p.ok) return;
        g.globalCompositeOperation = 'lighter';
        if (glow) {
          g.strokeStyle = rgba(C.signal, 0.16 * u * k * glow);
          g.lineWidth = ctx.fx.glowInner;
          g.beginPath();
          g.moveTo(q.x, q.y);
          g.lineTo(lerp(q.x, p.x, u), lerp(q.y, p.y, u));
          g.stroke();
        }
        g.globalAlpha = 1;
        g.strokeStyle = rgba(C.signal, 0.9 * u * k);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(q.x, q.y);
        g.lineTo(lerp(q.x, p.x, u), lerp(q.y, p.y, u));
        g.stroke();
        const rr = Math.max(6, 0.09 * p.s);
        blit(g, sprite(C.signal, 'core'), p.x, p.y, rr * (1 + 0.6 * (1 - u)), u * k);
        if (glow) blit(g, sprite(C.signal, 'glow'), p.x, p.y, rr * 5, 0.5 * u * k * glow);
      });
    if (p0 !== null && fly > 0 && q.ok) {
      const pulse = 0.5 + 0.5 * Math.sin(secs(ctx) * Math.PI * 1.5);
      blit(g, sprite(C.signal, 'glow'), q.x, q.y, 70 + 20 * pulse, 0.55 * fly * k * (glow || 0.5));
      blit(g, sprite(C.signal, 'core'), q.x, q.y, 24, fly * k);
      g.globalAlpha = 0.7 * fly * k;
      g.strokeStyle = C.signal;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(q.x, q.y, 26 + 10 * pulse, 0, Math.PI * 2);
      g.stroke();
    }
  };

  // ---------- copy: cluster chips at projected centres (decluttered), the query chip beside the probe ----------
  const box = ctx.box;
  const sizeOf = (i: number) => (m ? fitTo(BASE, m.w[i], box.w * 0.4, SIZE.labelMin) : {size: BASE, overflow: false});
  const chips: {id: string; text: string; size: number; x: number; y: number; w: number; h: number; t0: number; accent: string; overflow: boolean; alpha: number}[] = [];
  if (m) {
    props.clusters.forEach((text, i) => {
      const p = project(cam, f.centres[i]);
      const fit = sizeOf(i);
      const w = chipW(m.w[i], BASE, fit.size);
      const h = chipH(text, fit.size);
      const zoomed = actionsOf(ctx, 'zoomCluster').filter((a) => a.at <= ctx.frame).pop();
      const focus = zoomed ? (zoomed.props as {cluster: string}).cluster === text : true;
      chips.push({id: `${ctx.id}:cl${i}`, text, size: fit.size, x: p.x - w / 2, y: p.y - p.s * 0.95 - h, w, h, t0: ctx.at + ff(4 + 2 * i, ctx.fps), accent: C.violet, overflow: fit.overflow, alpha: focus ? 1 : 0.55});
    });
    const pr = probeOf(ctx, props);
    if (pr && pr.label) {
      const qi = props.clusters.length + queries.indexOf(pr.label);
      const q = project(cam, qPos);
      const fit = sizeOf(qi);
      const w = chipW(m.w[qi], BASE, fit.size);
      const h = chipH(pr.label, fit.size);
      chips.push({id: `${ctx.id}:q${qi}`, text: pr.label, size: fit.size, x: q.x - w - 48, y: q.y + 28, w, h, t0: pr.labelAt, accent: C.signal, overflow: fit.overflow, alpha: 1});
    }
    // declutter: later chips step down past earlier ones (12 px gap), then clamp into the slot (title-safe at the camera peak)
    const placed: {x: number; y: number; w: number; h: number}[] = [];
    for (const c of chips) {
      let pos = clampInto(box, c.x, c.y, c.w, c.h);
      for (let guard = 0; guard < 12; guard++) {
        const hit = placed.find((o) => pos.x < o.x + o.w + 12 && o.x < pos.x + c.w + 12 && pos.y < o.y + o.h + 12 && o.y < pos.y + c.h + 12);
        if (!hit) break;
        pos = clampInto(box, pos.x, hit.y + hit.h + 12, c.w, c.h);
        if (pos.y + c.h >= box.y + box.h) pos = clampInto(box, pos.x, hit.y - c.h - 12, c.w, c.h);
      }
      c.x = pos.x;
      c.y = pos.y;
      placed.push({x: c.x, y: c.y, w: c.w, h: c.h});
    }
  }
  useOverflow(ctx.id, chips.some((c) => c.overflow), {chips: chips.filter((c) => c.overflow).map((c) => c.text)});
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={draw} deps={[ctx.frame, k, n, props.seed, ctx.fx.id, boost, nk]} textSafe />
      <Measure mref={mref} size={BASE}>
        {all.map((t, i) => <MLabel key={i} text={t} size={BASE} />)}
      </Measure>
      {chips.map((c) => (
        <Chip key={c.id} ctx={ctx} id={c.id} text={c.text} size={c.size} x={c.x} y={c.y} t0={c.t0} accent={c.accent} overflow={c.overflow} alpha={c.alpha * k} />
      ))}
    </>
  );
};

export const VectorGalaxy: DcComponent<Props> = {name: 'VectorGalaxy', Component: VectorGalaxyView, text: true, slot: 'full'};
