// GraphNetwork (catalog: Structure & flow). Nodes and edges with a seeded, deterministic layout (force | radial | layered | circle).
// 04 §6: BFS waves (DSA), NameNode/DataNode maps (HDFS), any "who talks to whom" network. Labels are whole words on glass chips
// (MixedText); emissive wires carry marching pulses along directed edges; groups (force / radial) sit inside violet scope hulls.
// Entrance: nodes stagger in from the layer anchor (label preset), each wire draws once both ends exist.
// Actions (state changes on the word that names them, 04 §4 lead -2 f; RV1 = first visible step on the anchor frame):
//   highlightPath -> the route lights hop by hop in signal (a pulse rides each hop), the previous route fades;
//   pulseNode     -> impact flash + one expanding ring, the node stays lit (it is now the subject);
//   addEdge       -> a new wire draws from `from` to `to` in signal.
// The whole diagram auto-fits ctx.box as one unit; labels never go below 28 px (SIZE.labelMin), else DC_QA overflow (snap fails).
import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {MixedText} from '../../type/Text';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {reportQa} from '../../type/qa';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, Wire, acts, bornAt, dirOf, exitStyle, fitScale, hS, line, march, mix, overlaps, rectExit, separate, useMeasure, type Cubic, type Pt, type Sz} from '../_struct-a/kit';
import {layered, type Lay} from '../_struct-a/layout';

/**
 * Seeded force-directed layout on UNITS: every ungrouped node is a unit, every group (>= 2 members) is one unit holding its
 * members packed in a column / grid inside the scope hull (with the hull padding and the group label row). Fruchterman-Reingold
 * on the units, then rect separation, so hulls never overlap each other or a foreign node.
 */
const forceLayout = (p: Props, sz: Sz[], gap: number, aspect: number, fs: number, rtl: boolean): Lay => {
  const n = p.nodes.length;
  const gm = new Map<string, number[]>();
  p.nodes.forEach((q, i) => q.group && gm.set(q.group, [...(gm.get(q.group) ?? []), i]));
  const unitOf = new Array<number>(n).fill(-1);
  type Unit = {members: number[]; off: Pt[]; w: number; h: number};
  const units: Unit[] = [];
  const pad = fs * 0.6;
  const labelRow = fs * 1.6;
  for (let i = 0; i < n; i++) {
    if (unitOf[i] >= 0) continue;
    const g = p.nodes[i].group;
    const mem = g && (gm.get(g)?.length ?? 0) >= 2 ? (gm.get(g) as number[]) : [i];
    const u = units.length;
    mem.forEach((m) => (unitOf[m] = u));
    if (mem.length === 1) {
      units.push({members: mem, off: [{x: 0, y: 0}], w: sz[i].w, h: sz[i].h});
      continue;
    }
    const cols = mem.length <= 3 ? 1 : Math.ceil(Math.sqrt(mem.length));
    const rows = Math.ceil(mem.length / cols);
    const cw = Math.max(...mem.map((m) => sz[m].w));
    const ch = Math.max(...mem.map((m) => sz[m].h));
    const gx = gap * 0.6;
    const gy = ch * 0.45;
    const off = mem.map((_, k) => {
      const c = k % cols;
      const r = Math.floor(k / cols);
      const cx = (c - (cols - 1) / 2) * (cw + gx);
      return {x: rtl ? -cx : cx, y: (r - (rows - 1) / 2) * (ch + gy) + labelRow / 2};
    });
    units.push({members: mem, off, w: cols * cw + (cols - 1) * gx + 2 * pad, h: rows * ch + (rows - 1) * gy + 2 * pad + labelRow});
  }
  const U = units.length;
  const uE = new Set<string>();
  for (const e of p.edges) {
    const a = p.nodes.findIndex((q) => q.id === e.from);
    const b = p.nodes.findIndex((q) => q.id === e.to);
    if (a < 0 || b < 0 || unitOf[a] === unitOf[b]) continue;
    uE.add(`${Math.min(unitOf[a], unitOf[b])}:${Math.max(unitOf[a], unitOf[b])}`);
  }
  const E = [...uE].map((k) => k.split(':').map(Number) as [number, number]);
  const area = units.reduce((a, u) => a + (u.w + gap) * (u.h + gap), 0) * 2.2;
  const W0 = Math.max(Math.sqrt(area * aspect), Math.max(...units.map((u) => u.w)) + gap);
  const H0 = Math.max(area / W0, Math.max(...units.map((u) => u.h)) + gap);
  const k = Math.sqrt((W0 * H0) / Math.max(1, U)) * 0.8;
  const P = units.map((u, i) => ({x: random(`${p.seed}:x:${p.nodes[u.members[0]].id}`) * W0, y: random(`${p.seed}:y:${p.nodes[u.members[0]].id}:${i}`) * H0}));
  const IT = 220;
  for (let it = 0; it < IT && U > 1; it++) {
    const temp = (Math.max(W0, H0) / 6) * (1 - it / IT) + 0.5;
    const D = P.map(() => ({x: 0, y: 0}));
    for (let i = 0; i < U; i++)
      for (let j = i + 1; j < U; j++) {
        let dx = P[i].x - P[j].x;
        let dy = P[i].y - P[j].y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          dx = random(`${p.seed}:j:${i}:${j}`) - 0.5;
          dy = 0.5 - random(`${p.seed}:k:${i}:${j}`);
          d = Math.hypot(dx, dy);
        }
        const f = (k * k) / d;
        D[i].x += (dx / d) * f;
        D[i].y += (dy / d) * f;
        D[j].x -= (dx / d) * f;
        D[j].y -= (dy / d) * f;
      }
    for (const [a, b] of E) {
      const dx = P[a].x - P[b].x;
      const dy = P[a].y - P[b].y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const f = (d * d) / k;
      D[a].x -= (dx / d) * f;
      D[a].y -= (dy / d) * f;
      D[b].x += (dx / d) * f;
      D[b].y += (dy / d) * f;
    }
    for (let i = 0; i < U; i++) {
      const d = Math.max(0.01, Math.hypot(D[i].x, D[i].y));
      P[i].x = Math.min(W0, Math.max(0, P[i].x + (D[i].x / d) * Math.min(d, temp)));
      P[i].y = Math.min(H0, Math.max(0, P[i].y + (D[i].y / d) * Math.min(d, temp)));
    }
  }
  const usz = units.map((u) => ({w: u.w, h: u.h}));
  const big = Math.max(W0, H0) * 3;
  const Q = separate(P, usz, {x0: -big, y0: -big, x1: big, y1: big}, gap, 200);
  const x0 = Math.min(...Q.map((q, i) => q.x - usz[i].w / 2));
  const y0 = Math.min(...Q.map((q, i) => q.y - usz[i].h / 2));
  const x1 = Math.max(...Q.map((q, i) => q.x + usz[i].w / 2));
  const y1 = Math.max(...Q.map((q, i) => q.y + usz[i].h / 2));
  const pos: Pt[] = new Array(n).fill(0).map(() => ({x: 0, y: 0}));
  units.forEach((u, ui) => u.members.forEach((m, k2) => (pos[m] = {x: Q[ui].x - x0 + u.off[k2].x, y: Q[ui].y - y0 + u.off[k2].y})));
  return {pos, nat: {w: x1 - x0, h: y1 - y0}};
};

/** BFS rings around nodes[0] (unreached nodes go to the outer ring); ellipse rings wide enough for the chips. */
const radialLayout = (p: Props, sz: Sz[], gap: number): Lay => {
  const n = p.nodes.length;
  const idx = new Map(p.nodes.map((q, i) => [q.id, i]));
  const adj: number[][] = p.nodes.map(() => []);
  for (const e of p.edges) {
    const a = idx.get(e.from);
    const b = idx.get(e.to);
    if (a === undefined || b === undefined) continue;
    adj[a].push(b);
    adj[b].push(a);
  }
  const depth = new Array(n).fill(-1);
  const parent = new Array(n).fill(-1);
  depth[0] = 0;
  const q = [0];
  while (q.length) {
    const a = q.shift() as number;
    for (const b of adj[a]) if (depth[b] < 0) ((depth[b] = depth[a] + 1), (parent[b] = a), q.push(b));
  }
  const maxD = Math.max(1, ...depth);
  for (let i = 0; i < n; i++) if (depth[i] < 0) depth[i] = maxD + 1;
  const rings = Math.max(...depth);
  const h0 = sz[0].h;
  const pos: Pt[] = new Array(n).fill(0).map(() => ({x: 0, y: 0}));
  const ang = new Array(n).fill(-Math.PI / 2);
  let ry = 0;
  let rx = 0;
  for (let d = 1; d <= rings; d++) {
    const m = [...Array(n).keys()].filter((i) => depth[i] === d).sort((a, b) => (parent[a] >= 0 ? ang[parent[a]] : 9) - (parent[b] >= 0 ? ang[parent[b]] : 9) || a - b);
    if (!m.length) continue;
    const need = m.reduce((a, i) => a + sz[i].w + gap, 0) * 0.85;
    ry = Math.max(ry + h0 * 2.4, d * h0 * 2.4);
    rx = Math.max(rx + (sz[0].w + gap) * 0.8, ry * 1.6, need / (2 * Math.PI) * 1.25);
    m.forEach((i, k) => {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / m.length + (d % 2 ? 0 : Math.PI / m.length);
      ang[i] = a;
      pos[i] = {x: Math.cos(a) * rx, y: Math.sin(a) * ry};
    });
  }
  const maxW = Math.max(...sz.map((s) => s.w));
  const W0 = 2 * rx + maxW + gap;
  const H0 = 2 * ry + h0 + gap;
  const out = separate(
    pos.map((v) => ({x: v.x + W0 / 2, y: v.y + H0 / 2})),
    sz,
    {x0: 0, y0: 0, x1: W0, y1: H0},
    gap,
  );
  return {pos: out, nat: {w: W0, h: H0}};
};

/** Longest-path layers along the flow (RTL when the copy is Arabic: the first layer on the right), barycentre row order. */
const layeredLayout = (p: Props, sz: Sz[], gap: number, rtl: boolean): Lay => {
  const idx = new Map(p.nodes.map((q, i) => [q.id, i]));
  const E = p.edges.map((e) => [idx.get(e.from), idx.get(e.to)]).filter((e): e is [number, number] => e[0] !== undefined && e[1] !== undefined && e[0] !== e[1]);
  return layered(p.nodes.length, E, sz, Math.max(gap * 2.2, sz[0].h * 1.6), sz[0].h * 0.9, rtl);
};

/** Evenly on an ellipse (box aspect), first node at the top, clockwise. */
const circleLayout = (p: Props, sz: Sz[], gap: number, aspect: number): Lay => {
  const n = p.nodes.length;
  const need = sz.reduce((a, s) => a + s.w * 0.7 + s.h * 0.6 + gap, 0);
  const r = Math.max(need / (2 * Math.PI), sz[0].h * 1.5);
  const rx = r * Math.sqrt(aspect);
  const ry = r / Math.sqrt(aspect);
  const pos = p.nodes.map((_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return {x: Math.cos(a) * rx, y: Math.sin(a) * ry};
  });
  const maxW = Math.max(...sz.map((s) => s.w));
  const W0 = 2 * rx + maxW + gap;
  const H0 = 2 * ry + sz[0].h + gap;
  return {pos: separate(pos.map((v) => ({x: v.x + W0 / 2, y: v.y + H0 / 2})), sz, {x0: 0, y0: 0, x1: W0, y1: H0}, gap), nat: {w: W0, h: H0}};
};

export const GraphNetworkView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.nodes.length;
  const fs0 = n <= 12 ? SIZE.body : SIZE.label;
  const fe0 = Math.round(fs0 * 0.85);
  const edgeLabels = props.edges.map((e) => e.label ?? '');
  const items = [...props.nodes.map((q) => ({text: q.label, size: fs0})), ...edgeLabels.filter(Boolean).map((t) => ({text: t, size: fe0, weight: 500}))];
  const m = useMeasure(ctx.id, items);
  const dir = dirOf(props.nodes.map((q) => q.label));
  const rtl = dir === 'rtl';
  const idx = useMemo(() => new Map(props.nodes.map((q, i) => [q.id, i])), [props.nodes]);
  const geo = useMemo(() => {
    if (!m.w) return null;
    const padX = fs0 * 0.7;
    const h = Math.round(fs0 * 1.9);
    const sz = props.nodes.map((_, i) => ({w: (m.w as number[])[i] + 2 * padX, h}));
    const gap = fs0 * 1.1;
    const aspect = ctx.box.w / ctx.box.h;
    const lay =
      props.layout === 'radial' ? radialLayout(props, sz, gap) : props.layout === 'layered' ? layeredLayout(props, sz, gap, rtl) : props.layout === 'circle' ? circleLayout(props, sz, gap, aspect) : forceLayout(props, sz, gap, aspect, fs0, rtl);
    // scope hulls (force / radial with groups) need a margin: hull padding on every side + the group label row on top
    const grouped = props.layout === 'radial' && props.nodes.some((q) => q.group); // force: hull + label row live inside the group unit
    const mx = grouped ? fs0 * 0.8 : 0;
    const mt = grouped ? fs0 * 2.4 : 0;
    const nat = {w: lay.nat.w + 2 * mx, h: lay.nat.h + mt + mx};
    const fit = fitScale(ctx.id, nat, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin, 1.25);
    const s = fit.s;
    const ox = (ctx.box.w - nat.w * s) / 2 + mx * s;
    const oy = (ctx.box.h - nat.h * s) / 2 + mt * s;
    const ssz = sz.map((q) => ({w: q.w * s, h: q.h * s}));
    let pos = lay.pos.map((q) => ({x: ox + q.x * s, y: oy + q.y * s}));
    pos = separate(pos, ssz, {x0: mx * s, y0: mt * s, x1: ctx.box.w - mx * s, y1: ctx.box.h - mx * s}, gap * s * 0.5, 40);
    const ov = overlaps(pos, ssz);
    if (ov) reportQa('overflow', `${ctx.id}:overlap`, {pairs: ov});
    const ew: number[] = [];
    let k = n;
    for (const t of edgeLabels) ew.push(t ? (m.w as number[])[k++] : 0);
    return {pos, sz: ssz, fs: fit.fs, s, overflow: fit.overflow || ov > 0, ew, layered: props.layout === 'layered'};
  }, [m.w, props, ctx.box.w, ctx.box.h, ctx.id, rtl]);

  if (!geo) return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y}}>{m.node}</div>;

  const t = ctx.frame;
  const fps = ctx.fps;
  const lab = presetFrames('label', fps);
  const arr = presetFrames('arrive', fps);
  const born = props.nodes.map((_, i) => bornAt(ctx, i, n));
  const edgeCubic = (a: number, b: number, bend = 0): Cubic => {
    const A = geo.pos[a];
    const B = geo.pos[b];
    if (geo.layered && Math.abs(A.x - B.x) > (geo.sz[a].w + geo.sz[b].w) / 2) {
      const sgn = B.x > A.x ? 1 : -1;
      return hS({x: A.x + (sgn * geo.sz[a].w) / 2 + sgn * 4, y: A.y}, {x: B.x - (sgn * geo.sz[b].w) / 2 - sgn * 6, y: B.y});
    }
    const s = rectExit(A, geo.sz[a], B);
    const e = rectExit(B, geo.sz[b], A, 8);
    if (!bend) return line(s, e);
    const nx = -(e.y - s.y);
    const ny = e.x - s.x;
    const L = Math.max(1, Math.hypot(nx, ny));
    const c = line(s, e);
    const o = bend * Math.min(60, L * 0.12);
    return [c[0], {x: c[1].x + (nx / L) * o, y: c[1].y + (ny / L) * o}, {x: c[2].x + (nx / L) * o, y: c[2].y + (ny / L) * o}, c[3]];
  };
  const pairKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  const pairs = new Map<string, number>();
  props.edges.forEach((e) => {
    const a = idx.get(e.from);
    const b = idx.get(e.to);
    if (a !== undefined && b !== undefined) pairs.set(pairKey(a, b), (pairs.get(pairKey(a, b)) ?? 0) + 1);
  });

  // ---- action state ----
  const paths = acts(ctx, 'highlightPath');
  const lit = new Array(n).fill(0); // 0..1 signal level per node
  const pathWires: {c: Cubic; p: number; op: number; pulse: number | null}[] = [];
  paths.forEach((a, pi) => {
    if (t < a.at) return;
    const next = paths[pi + 1];
    const fade = next && t >= next.at ? 1 - revealProgress(t - next.at, lab) : 1;
    if (fade <= 0) return;
    const ids = (a.props.nodes as string[]).map((id) => idx.get(id)).filter((i): i is number => i !== undefined);
    ids.forEach((i, k) => {
      const q = revealProgress(t - (a.at + k * arr), lab);
      lit[i] = Math.max(lit[i], q * fade);
      if (k + 1 < ids.length) {
        const pq = revealProgress(t - (a.at + k * arr), arr, ease.camera);
        if (pq > 0) pathWires.push({c: edgeCubic(i, ids[k + 1]), p: pq, op: fade, pulse: pq < 1 ? pq : null});
      }
    });
  });
  const pulses = acts(ctx, 'pulseNode');
  const rings: {i: number; q: number}[] = [];
  const flash = new Array(n).fill(0);
  for (const a of pulses) {
    const i = idx.get(a.props.node as string);
    if (i === undefined || t < a.at) continue;
    lit[i] = Math.max(lit[i], revealProgress(t - a.at, lab));
    const ff = flashFrames(fps);
    flash[i] = Math.max(flash[i], t - a.at < ff ? 1 : Math.max(0, 1 - (t - a.at - ff) / (2 * ff)));
    const rq = revealProgress(t - a.at, presetFrames('morph', fps, true), ease.arrive);
    if (rq < 1) rings.push({i, q: rq});
  }
  const added = acts(ctx, 'addEdge')
    .map((a) => ({a, f: idx.get(a.props.from as string), to: idx.get(a.props.to as string)}))
    .filter((x): x is {a: (typeof x)['a']; f: number; to: number} => x.f !== undefined && x.to !== undefined && t >= x.a.at);

  // ---- groups (scope hulls, force / radial only) ----
  const hulls: {g: string; x0: number; y0: number; x1: number; y1: number; born: number}[] = [];
  if (props.layout === 'force' || props.layout === 'radial') {
    const gm = new Map<string, number[]>();
    props.nodes.forEach((q, i) => q.group && gm.set(q.group, [...(gm.get(q.group) ?? []), i]));
    for (const [g, mem] of gm) {
      if (mem.length < 2) continue;
      const pad = geo.fs * 0.6;
      const x0 = Math.min(...mem.map((i) => geo.pos[i].x - geo.sz[i].w / 2)) - pad;
      const x1 = Math.max(...mem.map((i) => geo.pos[i].x + geo.sz[i].w / 2)) + pad;
      const y0 = Math.min(...mem.map((i) => geo.pos[i].y - geo.sz[i].h / 2)) - pad;
      const y1 = Math.max(...mem.map((i) => geo.pos[i].y + geo.sz[i].h / 2)) + pad;
      const intruder = props.nodes.some((q, i) => q.group !== g && geo.pos[i].x > x0 && geo.pos[i].x < x1 && geo.pos[i].y > y0 && geo.pos[i].y < y1);
      if (!intruder) hulls.push({g, x0, y0, x1, y1, born: Math.min(...mem.map((i) => born[i]))});
    }
  }

  const fe = Math.max(SIZE.labelMin, geo.fs * 0.85);
  const period = Math.round(2 * fps);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {hulls.map((hl) => {
          const q = revealProgress(t - hl.born, arr);
          return q > 0 ? (
            <rect key={hl.g} x={hl.x0} y={hl.y0} width={hl.x1 - hl.x0} height={hl.y1 - hl.y0} rx={geo.fs * 0.8} fill={C.violet} fillOpacity={0.05 * q} stroke={C.violet} strokeOpacity={0.55 * q} strokeWidth={1.5} strokeDasharray="9 7" />
          ) : null;
        })}
        {props.edges.map((e, k) => {
          const a = idx.get(e.from);
          const b = idx.get(e.to);
          if (a === undefined || b === undefined || a === b) return null;
          const st = Math.max(born[a], born[b]) + lab;
          const p = revealProgress(t - st, arr, ease.camera);
          const dup = (pairs.get(pairKey(a, b)) ?? 0) > 1;
          const c = edgeCubic(a, b, dup ? 1 : 0);
          const hot = Math.min(lit[a], lit[b]);
          return (
            <Wire
              key={k}
              c={c}
              p={p}
              color={mix(C.ink3, C.ink2, hot)}
              width={2.5}
              opacity={0.9}
              arrow={e.directed}
              pulses={e.directed && p >= 1 ? march(t, period, 1, random(`${props.seed}:e${k}`)) : undefined}
              pulseR={3}
            />
          );
        })}
        {added.map(({a, f, to}, k) => (
          <Wire key={`add${k}`} c={edgeCubic(f, to, 1)} p={revealProgress(t - a.at, arr, ease.camera)} color={C.signal} width={3} glowPx={ctx.fx.glowInner} arrow pulses={march(t, period, 2)} pulseR={4} />
        ))}
        {pathWires.map((w, k) => (
          <Wire key={`hp${k}`} c={w.c} p={w.p} color={C.signal} width={3.5} glowPx={ctx.fx.glowInner} opacity={w.op} arrow pulses={w.pulse !== null ? [w.pulse] : march(t, period, 2)} pulseR={5} />
        ))}
        {rings.map((r, k) => {
          const P = geo.pos[r.i];
          const S = geo.sz[r.i];
          const grow = 1 + r.q * 0.9;
          return <rect key={`r${k}`} x={P.x - (S.w * grow) / 2} y={P.y - (S.h * grow) / 2} width={S.w * grow} height={S.h * grow} rx={S.h * 0.3 * grow} fill="none" stroke={C.signal} strokeWidth={3} opacity={1 - r.q} />;
        })}
      </svg>
      {hulls.map((hl) => {
        const rv = revealStyle(t - hl.born, fps, 'label', dirOf([hl.g]));
        const gs = Math.max(SIZE.labelMin, Math.round(geo.fs * 0.75));
        return (
          <div key={`g${hl.g}`} style={{position: 'absolute', top: hl.y0 - gs * 1.45, ...(rtl ? {right: ctx.box.w - hl.x1} : {left: hl.x0}), fontSize: gs, color: C.violet, whiteSpace: 'nowrap', padding: `0 ${Math.round(gs * 0.4)}px`, background: `${C.void}D9`, borderRadius: Math.round(gs * 0.3), ...rv.style}}>
            <MixedText id={`${ctx.id}:grp:${hl.g}`} text={hl.g} size={gs} weight={500} role="data" />
          </div>
        );
      })}
      {props.edges.map((e, k) => {
        if (!e.label) return null;
        const a = idx.get(e.from);
        const b = idx.get(e.to);
        if (a === undefined || b === undefined) return null;
        const c = edgeCubic(a, b, (pairs.get(pairKey(a, b)) ?? 0) > 1 ? 1 : 0);
        const mid = {x: (c[0].x + 3 * c[1].x + 3 * c[2].x + c[3].x) / 8, y: (c[0].y + 3 * c[1].y + 3 * c[2].y + c[3].y) / 8};
        const st = Math.max(born[a], born[b]) + lab + arr;
        const w = (geo.ew[k] * fe) / fe0 + fe;
        return (
          <Chip
            key={`el${k}`}
            id={`${ctx.id}:e${k}`}
            text={e.label}
            x={mid.x}
            y={mid.y}
            w={w}
            h={fe * 1.6}
            fs={fe}
            color={C.grid}
            fx={ctx.fx}
            weight={500}
            textColor={C.ink2}
            reveal={revealStyle(t - st, fps, 'label', dirOf([e.label])).style}
          />
        );
      })}
      {props.nodes.map((q, i) => {
        const L = lit[i];
        const col = mix(C.ink3, C.signal, L);
        return (
          <Chip
            key={q.id}
            id={`${ctx.id}:${q.id}`}
            text={q.label}
            x={geo.pos[i].x}
            y={geo.pos[i].y}
            w={geo.sz[i].w}
            h={geo.sz[i].h}
            fs={geo.fs}
            color={col}
            glowK={L * 0.7 + flash[i] * 1.2}
            fill={0.14 * L}
            fx={ctx.fx}
            overflow={geo.overflow}
            reveal={revealStyle(t - born[i], fps, 'label', dirOf([q.label])).style}
          />
        );
      })}
    </div>
  );
};

export const GraphNetwork: DcComponent<Props> = {name: 'GraphNetwork', Component: GraphNetworkView, text: true, slot: 'full'};
