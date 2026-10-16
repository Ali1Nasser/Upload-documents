// Seeded shard plan for ShatterToBlocks (group fx-a). Pure: (rect, blocks, seed) -> cells; (cell, t) -> motion. No DOM, no clock.
import {random} from 'remotion';
import {ease, revealProgress} from '../../type/reveal';
import type {Rect} from '../../type/safe';

export type Cell = {
  i: number;
  r: Rect; // cell rect (layer px)
  cx: number;
  cy: number;
  rx: number; // rest offset (px) from the impact point, outward
  ry: number;
  rot: number; // rest rotation (deg)
  delay: number; // 0..1 share of the stagger window (0 = nearest to the impact)
};

const SPREAD = 0.16; // rest expansion about the impact point (share of the distance to it)
const SPREAD_JITTER = 0.025;
const rn = (...k: (string | number)[]) => random(k.join(':'));
const SNAP_REACH = 0.4; // a cut line may move at most this share of its row height / cell width to find a gap between the target's words
const SNAP_MARGIN = 3; // px of air between a snapped cut and the nearest word box

/** Seeded impact point (layer px) of a shatter on `rect`: near the centre, the origin of the radial burst and of the flash. */
export const impactOf = (rect: Rect, seed: number): {x: number; y: number} => ({
  x: rect.x + rect.w * (0.5 + (rn(seed, 'ix') * 2 - 1) * 0.12),
  y: rect.y + rect.h * (0.5 + (rn(seed, 'iy') * 2 - 1) * 0.12),
});

/**
 * Move the cut `v` (within [lo, hi]) to the nearest position that no span [a, b] crosses (a cut through the middle of a word would
 * leave half a word on two pieces). A cut that cannot find a gap keeps its seeded position.
 */
export const snapCut = (v: number, lo: number, hi: number, spans: [number, number][]): number => {
  const inside = (x: number) => spans.some(([a, b]) => x > a && x < b);
  if (!inside(v)) return v;
  let best = v;
  let bd = Infinity;
  for (const [a, b] of spans)
    for (const x of [a - SNAP_MARGIN, b + SNAP_MARGIN]) {
      if (x < lo || x > hi || inside(x)) continue;
      const d = Math.abs(x - v);
      if (d < bd) {
        bd = d;
        best = x;
      }
    }
  return best;
};

/**
 * `blocks` cells (exactly), brick layout: rows of near-equal cell counts, seeded jitter of every cut line (<= 18 % of a row height,
 * <= 22 % of a cell width), so the pieces differ but tile the rect without gaps or overlap. Rest offsets expand the cells radially about a
 * seeded impact point near the rect centre (16 % of the distance to it), with a seeded rest tilt (<= 5 deg).
 */
export const planShards = (rect: Rect, blocks: number, seed: number, avoid: Rect[] = []): Cell[] => {
  const aspect = rect.w / Math.max(1, rect.h);
  const cols0 = Math.max(1, Math.min(blocks, Math.round(Math.sqrt(blocks * aspect))));
  const rows = Math.max(1, Math.ceil(blocks / cols0));
  const base = Math.floor(blocks / rows);
  const extra = blocks - base * rows;
  // absolute cut lines: seeded jitter, then snapped into the gaps between the target's word boxes (`avoid`)
  const rowH = rect.h / rows;
  const ys = [rect.y];
  for (let r = 1; r < rows; r++) {
    const v = rect.y + rect.h * (r / rows) + (rn(seed, 'y', r) * 2 - 1) * 0.18 * rowH;
    const lo = Math.max(ys[r - 1] + 0.3 * rowH, v - SNAP_REACH * rowH);
    ys.push(snapCut(v, lo, Math.min(rect.y + rect.h - 0.3 * rowH, v + SNAP_REACH * rowH), avoid.map((a): [number, number] => [a.y, a.y + a.h])));
  }
  ys.push(rect.y + rect.h);
  const {x: ix, y: iy} = impactOf(rect, seed);
  const side = (rect.w + rect.h) / 2;
  const cells: Cell[] = [];
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const m = base + (r < extra ? 1 : 0);
    const y0 = ys[r];
    const y1 = ys[r + 1];
    const band = avoid.filter((a) => a.y < y1 && a.y + a.h > y0).map((a): [number, number] => [a.x, a.x + a.w]);
    const cw = rect.w / m;
    const xs = [rect.x];
    for (let c = 1; c < m; c++) {
      const v = rect.x + rect.w * (c / m) + (rn(seed, 'x', r, c) * 2 - 1) * 0.22 * cw;
      xs.push(snapCut(v, Math.max(xs[c - 1] + 0.3 * cw, v - SNAP_REACH * cw), Math.min(rect.x + rect.w - 0.3 * cw, v + SNAP_REACH * cw), band));
    }
    xs.push(rect.x + rect.w);
    for (let c = 0; c < m; c++) {
      const x0 = xs[c];
      const x1 = xs[c + 1];
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      let dx = cx - ix;
      let dy = cy - iy;
      const d = Math.hypot(dx, dy);
      if (d < 1e-3) {
        const a = rn(seed, 'a', k) * Math.PI * 2;
        dx = Math.cos(a);
        dy = Math.sin(a);
      } else {
        dx /= d;
        dy /= d;
      }
      // radial expansion about the impact point (a uniform scale-up with a small seeded spread, so neighbours never slide over each
      // other), at least a few px so the cell on the impact point still opens a visible seam
      const mag = Math.max(0.03 * side, d * (SPREAD + (rn(seed, 'm', k) * 2 - 1) * SPREAD_JITTER));
      cells.push({i: k, r: {x: x0, y: y0, w: x1 - x0, h: y1 - y0}, cx, cy, rx: dx * mag, ry: dy * mag, rot: (rn(seed, 'r', k) * 2 - 1) * 5, delay: d});
      k++;
    }
  }
  const dmin = Math.min(...cells.map((c) => c.delay));
  const dmax = Math.max(...cells.map((c) => c.delay));
  for (const c of cells) c.delay = dmax > dmin ? (c.delay - dmin) / (dmax - dmin) : 0;
  return cells;
};

export type ShardMotion = {dx: number; dy: number; rot: number; edge: number; p: number};
/**
 * Motion of one cell `t` frames after the anchor. The burst runs `n` frames (the morph upper bound) on the impact curve (outBack:
 * overshoots the rest position, then settles), staggered up to 30 % of n from the nearest cell (delay 0 starts ON the anchor frame,
 * RV1). `edge` = the fracture-line flash, 1 on the anchor frame decaying to 0 over the burst.
 */
export const shardAt = (c: Cell, t: number, n: number): ShardMotion => {
  const d = Math.round(c.delay * 0.3 * n);
  const p = revealProgress(t - d, Math.max(1, n - d), ease.impact);
  return {dx: c.rx * p, dy: c.ry * p, rot: c.rot * p, p, edge: Math.max(0, 1 - Math.max(0, t) / n)};
};

/** Shift a cell's offset so its rect (moved by dx, dy) stays inside `safe`. Rotation is small (<= 5 deg) and ignored. */
export const clampCell = (c: Cell, dx: number, dy: number, safe: Rect): [number, number] => {
  const x0 = c.r.x + dx;
  const y0 = c.r.y + dy;
  // a cell that already starts outside safe may stay where it is, but never moves further out
  const nx = Math.max(Math.min(safe.x, c.r.x), Math.min(Math.max(safe.x + safe.w - c.r.w, c.r.x), x0));
  const ny = Math.max(Math.min(safe.y, c.r.y), Math.min(Math.max(safe.y + safe.h - c.r.h, c.r.y), y0));
  return [dx + (nx - x0), dy + (ny - y0)];
};
