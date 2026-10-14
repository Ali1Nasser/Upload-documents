// Object library + point sampling for MorphTextToObject (group fx-a). Pure: no DOM, no clock, no Math.random.
// An object is a set of polylines in the unit box [-1, 1]^2 (y down). Particles are sampled along the outline by arc length, so
// the form reads at 300 particles (lite cap) as well as at 1,500. Names are the catalog `object` strings; an unknown name falls
// back to `orb` (the caller logs a DC_OBJECT warning).
import {random} from 'remotion';

export type Pt = [number, number];
export type Poly = Pt[];

const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): Poly =>
  Array.from({length: n + 1}, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Pt;
  });
const circle = (cx: number, cy: number, r: number, n = 36): Poly => arc(cx, cy, r, r, 0, 360, n);
const rect = (x0: number, y0: number, x1: number, y1: number): Poly => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number): Poly => [
  ...arc(x1 - r, y0 + r, r, r, -90, 0, 6),
  ...arc(x1 - r, y1 - r, r, r, 0, 90, 6),
  ...arc(x0 + r, y1 - r, r, r, 90, 180, 6),
  ...arc(x0 + r, y0 + r, r, r, 180, 270, 6),
  [x1 - r, y0],
];

const gear = (): Poly => {
  const out: Poly = [];
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * 360;
    const w = 360 / teeth;
    const at = (deg: number, r: number): Pt => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
    out.push(at(a - w * 0.22, 0.72), at(a - w * 0.14, 0.98), at(a + w * 0.14, 0.98), at(a + w * 0.22, 0.72));
  }
  out.push(out[0]);
  return out;
};

export const OBJECTS: Record<string, Poly[]> = {
  shield: [
    [[0, -0.98], [0.78, -0.72], [0.78, -0.1], ...arc(0, -0.1, 0.78, 1.0, 0, 90, 14), ...arc(0, -0.1, 0.78, 1.0, 90, 180, 14), [-0.78, -0.1], [-0.78, -0.72], [0, -0.98]],
    [[-0.36, 0.0], [-0.1, 0.28], [0.38, -0.3]],
  ],
  lock: [rrect(-0.7, -0.08, 0.7, 0.92, 0.12), arc(0, -0.08, 0.44, 0.62, 180, 360, 20), circle(0, 0.34, 0.12, 14), [[0, 0.46], [0, 0.7]]],
  key: [circle(-0.5, 0, 0.36), circle(-0.5, 0, 0.14, 14), [[-0.14, 0], [0.92, 0]], [[0.62, 0], [0.62, 0.3]], [[0.9, 0], [0.9, 0.24]]],
  database: [
    arc(0, -0.62, 0.78, 0.26, 0, 360, 36),
    [[-0.78, -0.62], [-0.78, 0.62]],
    [[0.78, -0.62], [0.78, 0.62]],
    arc(0, 0.62, 0.78, 0.26, 0, 180, 20),
    arc(0, 0, 0.78, 0.26, 0, 180, 20),
  ],
  document: [[[-0.58, -0.92], [0.18, -0.92], [0.58, -0.52], [0.58, 0.92], [-0.58, 0.92], [-0.58, -0.92]], [[0.18, -0.92], [0.18, -0.52], [0.58, -0.52]], [[-0.34, -0.1], [0.34, -0.1]], [[-0.34, 0.2], [0.34, 0.2]], [[-0.34, 0.5], [0.1, 0.5]]],
  server: [rrect(-0.85, -0.9, 0.85, -0.38, 0.06), rrect(-0.85, -0.26, 0.85, 0.26, 0.06), rrect(-0.85, 0.38, 0.85, 0.9, 0.06), circle(-0.6, -0.64, 0.06, 8), circle(-0.6, 0, 0.06, 8), circle(-0.6, 0.64, 0.06, 8), [[0.2, -0.64], [0.66, -0.64]], [[0.2, 0], [0.66, 0]], [[0.2, 0.64], [0.66, 0.64]]],
  coin: [circle(0, 0, 0.92, 48), circle(0, 0, 0.7, 40), [[-0.22, -0.34], [-0.22, 0.34]], [[0.22, -0.34], [0.22, 0.34]], [[-0.22, 0], [0.22, 0]]],
  cloud: [[...arc(-0.42, 0.18, 0.42, 0.42, 90, 270, 12), ...arc(-0.1, -0.24, 0.42, 0.42, 180, 360, 12), ...arc(0.42, 0.0, 0.4, 0.4, 270, 450, 12), [0.42, 0.4], [-0.42, 0.6]]],
  gear: [gear(), circle(0, 0, 0.3, 24)],
  chart: [[[-0.9, -0.8], [-0.9, 0.8], [0.9, 0.8]], rect(-0.6, 0.1, -0.34, 0.8), rect(-0.18, -0.3, 0.08, 0.8), rect(0.24, -0.7, 0.5, 0.8)],
  bolt: [[[0.2, -0.98], [-0.54, 0.1], [-0.04, 0.1], [-0.2, 0.98], [0.56, -0.2], [0.06, -0.2], [0.2, -0.98]]],
  check: [circle(0, 0, 0.92, 48), [[-0.42, 0.02], [-0.12, 0.34], [0.46, -0.3]]],
  card: [rrect(-0.95, -0.6, 0.95, 0.6, 0.12), [[-0.95, -0.28], [0.95, -0.28]], rect(-0.74, 0.1, -0.4, 0.34), [[0.1, 0.22], [0.74, 0.22]]],
  phone: [rrect(-0.46, -0.96, 0.46, 0.96, 0.12), [[-0.3, -0.7], [0.3, -0.7]], [[-0.3, 0.7], [0.3, 0.7]], circle(0, 0.82, 0.05, 8)],
  orb: [circle(0, 0, 0.9, 48), arc(0, 0, 0.9, 0.3, 0, 360, 36), arc(0, 0, 0.3, 0.9, 0, 360, 36)],
};
export const OBJECT_NAMES = Object.keys(OBJECTS);

/** Library name of a catalog `object` string (case / separators ignored); unknown -> orb. */
export const objectKey = (name: string): {key: string; known: boolean} => {
  const k = name.trim().toLowerCase().replace(/[^a-z]/g, '');
  const alias: Record<string, string> = {db: 'database', doc: 'document', file: 'document', padlock: 'lock', money: 'coin', wallet: 'card', payment: 'card', mobile: 'phone', graph: 'chart', lightning: 'bolt', tick: 'check', cog: 'gear', sphere: 'orb', ball: 'orb'};
  const key = OBJECTS[k] ? k : alias[k];
  return key ? {key, known: true} : {key: 'orb', known: false};
};

/** `n` points evenly along the outline polylines (arc length), in order; polylines are visited in sequence. */
export const sampleOutline = (polys: Poly[], n: number): Pt[] => {
  const segs: {a: Pt; b: Pt; len: number}[] = [];
  let total = 0;
  for (const p of polys)
    for (let i = 1; i < p.length; i++) {
      const len = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (len > 1e-9) {
        segs.push({a: p[i - 1], b: p[i], len});
        total += len;
      }
    }
  const out: Pt[] = [];
  if (!segs.length || n <= 0) return out;
  let k = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = ((i + 0.5) / n) * total;
    while (k < segs.length - 1 && acc + segs[k].len < d) acc += segs[k++].len;
    const s = segs[k];
    const u = Math.max(0, Math.min(1, (d - acc) / s.len));
    out.push([s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u]);
  }
  return out;
};

/** Seeded permutation of 0..n-1 (Fisher-Yates over remotion random). */
export const seededOrder = (n: number, seed: string): number[] => {
  const a = Array.from({length: n}, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random(`${seed}:${i}`) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Pick exactly `n` points from `cand` (seeded); fewer candidates than n are reused with a sub-pixel seeded jitter. */
export const pickPoints = (cand: Pt[], n: number, seed: string): Pt[] => {
  if (!cand.length || n <= 0) return [];
  const order = seededOrder(cand.length, seed);
  return Array.from({length: n}, (_, i) => {
    const p = cand[order[i % cand.length]];
    if (i < cand.length) return p;
    return [p[0] + (random(`${seed}:jx:${i}`) - 0.5) * 2, p[1] + (random(`${seed}:jy:${i}`) - 0.5) * 2] as Pt;
  });
};
