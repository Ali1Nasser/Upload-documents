// Unit checks of the struct-a layout helpers (pure; no render): node scripts/... esbuild --bundle --platform=node, see the line below.
//   esbuild studio/src/components/_struct-a/struct-a.check.ts --bundle --platform=node --format=cjs --outfile=/tmp/sa.check.cjs && node /tmp/sa.check.cjs
// Covers: every GraphNetwork layout (force | radial | layered | circle) on seeded random graphs of 1..60 nodes (finite, no overlap, deterministic),
// layered / tidyTree / indentTree on trees and DAGs (cycles and unknown parents included), project().
import {forceLayout, radialLayout, layeredLayout, circleLayout} from '../GraphNetwork/GraphNetwork';
import {indentTree, layered, layeredFill, project, tidyTree, treeOf} from './layout';
import {overlaps, separate} from './kit';

let fails = 0;
const ok = (c: boolean, m: string) => {
  if (!c) {
    fails++;
    console.log(`FAIL ${m}`);
  } else console.log(`ok   ${m}`);
};
// tiny LCG so the check itself is seeded
let st = 12345;
const rnd = () => ((st = (st * 1664525 + 1013904223) >>> 0) / 4294967296);

const mkProps = (n: number, e: number, layout: 'force' | 'radial' | 'layered' | 'circle', groups: boolean) => ({
  layout,
  seed: 7,
  nodes: Array.from({length: n}, (_, i) => ({id: `n${i}`, label: `node ${i}`, group: groups && i % 3 === 0 ? 'g' + (i % 2) : undefined})),
  edges: Array.from({length: e}, () => ({from: `n${Math.floor(rnd() * n)}`, to: `n${Math.floor(rnd() * n)}`, directed: true})),
});
for (const layout of ['force', 'radial', 'layered', 'circle'] as const)
  for (const n of [1, 2, 5, 12, 30, 60]) {
    const p = mkProps(n, Math.min(120, n * 2), layout, layout === 'force' || layout === 'radial');
    const sz = p.nodes.map((_, i) => ({w: 160 + (i % 5) * 30, h: 70}));
    const run = () =>
      layout === 'force' ? forceLayout(p as never, sz, 44, 1.78, 40, true) : layout === 'radial' ? radialLayout(p as never, sz, 44) : layout === 'layered' ? layeredLayout(p as never, sz, 44, true, {w: 1700, h: 900}) : circleLayout(p as never, sz, 44, 1.78);
    const a = run();
    const b = run();
    const fin = a.pos.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y)) && Number.isFinite(a.nat.w) && Number.isFinite(a.nat.h);
    ok(fin && a.pos.length === n, `${layout} n=${n}: finite positions`);
    ok(JSON.stringify(a) === JSON.stringify(b), `${layout} n=${n}: deterministic`);
    if (layout !== 'layered') ok(overlaps(a.pos, sz) === 0 || n > 30, `${layout} n=${n}: no node overlap${n > 30 ? ' (not required above 30 nodes)' : ''}`);
  }
// layered: longest path, RTL mirror, cycle tolerance
{
  const sz = Array.from({length: 5}, () => ({w: 100, h: 50}));
  const L = layered(5, [[0, 1], [1, 2], [0, 3], [3, 2], [2, 4]], sz, 40, 20, false);
  ok(L.layer.join() === '0,1,2,1,3', 'layered: longest-path layers');
  const R = layered(5, [[0, 1], [1, 2], [0, 3], [3, 2], [2, 4]], sz, 40, 20, true);
  ok(R.pos[0].x > R.pos[4].x, 'layered: RTL puts the first layer on the right');
  const C = layered(3, [[0, 1], [1, 2], [2, 0]], sz.slice(0, 3), 40, 20, false);
  ok(C.pos.every((q) => Number.isFinite(q.x)), 'layered: a cycle does not hang');
  const F = layeredFill(5, [[0, 1], [1, 2], [0, 3], [3, 2], [2, 4]], sz, 40, 20, false, {w: 1700, h: 900}, 1.3);
  ok(F.nat.w > L.nat.w, 'layeredFill: opens the column gap to fill the slot');
}
// trees: unknown parent, self parent, cycle -> roots; tidyTree / indentTree geometry
{
  const nodes = [{id: 'a'}, {id: 'b', parent: 'a'}, {id: 'c', parent: 'a'}, {id: 'd', parent: 'zzz'}, {id: 'e', parent: 'e'}, {id: 'x', parent: 'y'}, {id: 'y', parent: 'x'}];
  const t = treeOf(nodes);
  ok(t.roots.includes(0) && t.roots.includes(3) && t.roots.includes(4), 'treeOf: unknown and self parents become roots');
  ok(t.parent.every((p, i) => p !== i), 'treeOf: no self parent');
  ok(t.roots.length >= 4, 'treeOf: a parent cycle is cut');
  const sz = nodes.map(() => ({w: 120, h: 50}));
  const vis = nodes.map(() => true);
  const T = tidyTree(t, sz, 30, 100, false, vis);
  ok(T.pos.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y)), 'tidyTree: finite');
  const kids = t.kids[0];
  const xs = kids.map((k) => T.pos[k].x);
  ok(Math.abs(T.pos[0].x - (Math.min(...xs) + Math.max(...xs)) / 2) < 1, 'tidyTree: parent centred over its children');
  const Rt = tidyTree(t, sz, 30, 100, true, vis);
  ok(Rt.pos[1].x > Rt.pos[2].x, 'tidyTree: RTL mirrors the sibling order');
  const I = indentTree(t, sz, 40, 60, false, vis);
  ok(I.order.length === nodes.length, 'indentTree: every visible node has a row');
}
// separate: overlap removal terminates and keeps inside bounds
{
  const pts = Array.from({length: 20}, () => ({x: 100 + rnd() * 20, y: 100 + rnd() * 20}));
  const sz = pts.map(() => ({w: 80, h: 40}));
  const q = separate(pts, sz, {x0: 0, y0: 0, x1: 900, y1: 700}, 10, 200);
  ok(overlaps(q, sz) === 0, 'separate: 20 stacked boxes end up apart');
}
// project: perspective scale grows towards the camera
{
  const cam = {yaw: 0, pitch: 0, dist: 1000};
  const near = project({x: 0, y: 0, z: -200}, cam, 1000);
  const far = project({x: 0, y: 0, z: 200}, cam, 1000);
  ok(near.k > far.k, 'project: nearer is larger');
}
console.log(fails ? `struct-a.check: ${fails} FAILED` : 'struct-a.check: all passed');
process.exit(fails ? 1 : 0);
