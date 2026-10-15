// Layout helpers of the P7 group "struct-a" (pure, deterministic; no DOM). Group-owned folder, never a shared file.
//  - layered: longest-path layers along a flow (DAGs, layered graphs), barycentre ordering, RTL = first layer on the right.
//  - tidyTree: a top-down tree (B-tree, plan, decision) with leaf slots; children centred under the parent.
//  - indentTree: an outline (file system) with one row per node, indented from the reading-start side.
//  - project / orbit: a small perspective camera for the 3D members (StarSchema3D, OlapCube); billboard copy stays upright.
import type {Pt, Sz} from './kit';

export type Lay = {pos: Pt[]; nat: Sz};

/** Longest-path layering of a DAG given as index pairs (cycles are cut at n iterations). */
export const layersOf = (n: number, E: [number, number][]): number[] => {
  const layer = new Array(n).fill(0);
  for (let it = 0; it < n; it++) {
    let ch = false;
    for (const [a, b] of E)
      if (layer[b] < layer[a] + 1 && layer[a] + 1 < n) {
        layer[b] = layer[a] + 1;
        ch = true;
      }
    if (!ch) break;
  }
  return layer;
};

/** Layered flow layout: columns along the flow, rows by barycentre of the predecessors. */
export const layered = (n: number, E: [number, number][], sz: Sz[], colGap: number, rowGap: number, rtl: boolean): Lay & {layer: number[]; cols: number[][]} => {
  const raw = layersOf(n, E);
  // a cycle can leave a layer index without any node: renumber to consecutive layers
  const used = [...new Set(raw)].sort((x, y) => x - y);
  const layer = raw.map((v) => used.indexOf(v));
  const L = Math.max(...layer) + 1;
  const cols: number[][] = Array.from({length: L}, () => []);
  for (let i = 0; i < n; i++) cols[layer[i]].push(i);
  const row = new Array(n).fill(0);
  cols[0].forEach((i, k) => (row[i] = k));
  for (let l = 1; l < L; l++) {
    const bc = (i: number) => {
      const pr = E.filter(([, b]) => b === i).map(([a]) => row[a]);
      return pr.length ? pr.reduce((a, b) => a + b, 0) / pr.length : 1e3 + i;
    };
    cols[l].sort((a, b) => bc(a) - bc(b) || a - b).forEach((i, k) => (row[i] = k));
  }
  const colW = cols.map((c) => Math.max(...c.map((i) => sz[i].w)));
  const W0 = colW.reduce((a, b) => a + b, 0) + colGap * (L - 1);
  const colH = cols.map((c) => c.reduce((a, i) => a + sz[i].h, 0) + rowGap * Math.max(0, c.length - 1));
  const H0 = Math.max(...colH);
  const pos: Pt[] = new Array(n).fill(0).map(() => ({x: 0, y: 0}));
  let x = 0;
  for (let l = 0; l < L; l++) {
    const cx = x + colW[l] / 2;
    let y = (H0 - colH[l]) / 2;
    for (const i of [...cols[l]].sort((a, b) => row[a] - row[b])) {
      pos[i] = {x: rtl ? W0 - cx : cx, y: y + sz[i].h / 2};
      y += sz[i].h + rowGap;
    }
    x += colW[l] + colGap;
  }
  return {pos, nat: {w: W0, h: H0}, layer, cols};
};

/**
 * Layered layout that uses the slot: after a first pass at the base gaps, the column and row gaps open up (never beyond
 * `spread` x the base gap) so the diagram fills `box` instead of huddling in the middle. `maxUp` = the largest zoom the caller allows.
 */
export const layeredFill = (n: number, E: [number, number][], sz: Sz[], colGap: number, rowGap: number, rtl: boolean, box: Sz, maxUp: number, extra: Sz = {w: 0, h: 0}, spread = 2.2) => {
  const a = layered(n, E, sz, colGap, rowGap, rtl);
  const s0 = Math.min(maxUp, box.w / (a.nat.w + extra.w), box.h / (a.nat.h + extra.h));
  const L = Math.max(...a.layer) + 1;
  const rows = Math.max(...a.cols.map((c) => c.length));
  const dw = Math.max(0, box.w / s0 - (a.nat.w + extra.w)) * 0.9;
  const dh = Math.max(0, box.h / s0 - (a.nat.h + extra.h)) * 0.9;
  const cg = L > 1 ? Math.min(colGap * spread, colGap + dw / (L - 1)) : colGap;
  const rg = rows > 1 ? Math.min(rowGap * spread, rowGap + dh / (rows - 1)) : rowGap;
  return cg === colGap && rg === rowGap ? a : layered(n, E, sz, cg, rg, rtl);
};

/** Parent index per node (-1 = root); unknown or self parents become roots. Children in declaration order. */
export const treeOf = (nodes: {id: string; parent?: string}[]): {parent: number[]; kids: number[][]; roots: number[]; depth: number[]} => {
  const idx = new Map(nodes.map((q, i) => [q.id, i]));
  const parent = nodes.map((q, i) => {
    const p = q.parent !== undefined ? idx.get(q.parent) : undefined;
    return p === undefined || p === i ? -1 : p;
  });
  // break cycles: walk up at most n steps; a node that never reaches a root becomes one
  parent.forEach((_, i) => {
    let a = i;
    for (let k = 0; k <= nodes.length && a >= 0; k++) a = parent[a];
    if (a >= 0) parent[i] = -1;
  });
  const kids: number[][] = nodes.map(() => []);
  parent.forEach((p, i) => p >= 0 && kids[p].push(i));
  const roots = parent.map((p, i) => (p < 0 ? i : -1)).filter((i) => i >= 0);
  const depth = nodes.map(() => 0);
  const walk = (i: number, d: number) => {
    depth[i] = d;
    kids[i].forEach((c) => walk(c, d + 1));
  };
  roots.forEach((r) => walk(r, 0));
  return {parent, kids, roots, depth};
};

/** Top-down tidy tree: leaves take consecutive slots (width of the widest chip + gap), parents centre over their children. */
export const tidyTree = (t: ReturnType<typeof treeOf>, sz: Sz[], gapX: number, levelH: number, rtl: boolean, visible: boolean[]): Lay => {
  const n = sz.length;
  const x = new Array(n).fill(0);
  let cursor = 0;
  const place = (i: number): void => {
    const ks = t.kids[i].filter((k) => visible[k]);
    if (!ks.length) {
      x[i] = cursor + sz[i].w / 2;
      cursor += sz[i].w + gapX;
      return;
    }
    const start = cursor;
    ks.forEach(place);
    const mid = (x[ks[0]] + x[ks[ks.length - 1]]) / 2;
    x[i] = Math.max(mid, start + sz[i].w / 2);
    cursor = Math.max(cursor, x[i] + sz[i].w / 2 + gapX);
  };
  t.roots.filter((r) => visible[r]).forEach(place);
  const W0 = Math.max(1, cursor - gapX);
  const maxD = Math.max(0, ...t.depth.filter((_, i) => visible[i]));
  const rowH = Math.max(...sz.map((s) => s.h));
  const H0 = rowH + maxD * levelH;
  const pos = x.map((v, i) => ({x: rtl ? W0 - v : v, y: rowH / 2 + t.depth[i] * levelH}));
  return {pos, nat: {w: W0, h: H0}};
};

/** Outline rows (depth-first order); indentation grows from the reading-start side. Returns the row order too. */
export const indentTree = (t: ReturnType<typeof treeOf>, sz: Sz[], indent: number, rowH: number, rtl: boolean, visible: boolean[]): Lay & {order: number[]} => {
  const order: number[] = [];
  const walk = (i: number) => {
    if (!visible[i]) return;
    order.push(i);
    t.kids[i].forEach(walk);
  };
  t.roots.forEach(walk);
  const W0 = Math.max(1, ...order.map((i) => t.depth[i] * indent + sz[i].w));
  const pos: Pt[] = sz.map(() => ({x: 0, y: 0}));
  order.forEach((i, r) => {
    const x0 = t.depth[i] * indent + sz[i].w / 2;
    pos[i] = {x: rtl ? W0 - x0 : x0, y: r * rowH + rowH / 2};
  });
  // hidden nodes sit on their parent (they grow out of it when expanded)
  sz.forEach((_, i) => {
    if (visible[i]) return;
    let a = t.parent[i];
    while (a >= 0 && !visible[a]) a = t.parent[a];
    if (a >= 0) pos[i] = {...pos[a]};
  });
  return {pos, nat: {w: W0, h: Math.max(1, order.length) * rowH}, order};
};

// ---------- 3D ----------
export type P3 = {x: number; y: number; z: number};
export type Cam3 = {yaw: number; pitch: number; dist: number}; // radians; dist in scene units from the origin
/** Perspective projection (camera on a sphere around the origin, y up). Returns screen x/y (y down) and depth scale k. */
export const project = (p: P3, c: Cam3, focal: number): {x: number; y: number; k: number; z: number} => {
  const cy = Math.cos(c.yaw);
  const sy = Math.sin(c.yaw);
  const x1 = p.x * cy - p.z * sy;
  const z1 = p.x * sy + p.z * cy;
  const cp = Math.cos(c.pitch);
  const sp = Math.sin(c.pitch);
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const d = c.dist + z2; // larger = farther
  const k = focal / Math.max(1e-3, d);
  return {x: x1 * k, y: -y2 * k, k, z: d};
};
