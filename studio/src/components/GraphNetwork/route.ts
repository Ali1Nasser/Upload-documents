// GraphNetwork wire router (pure, deterministic, no DOM). Every wire is a cubic that leaves a chip through the middle of a side (or
// straight from the centre line), and the router picks, per wire, the cheapest of ~150 candidates:
//   - a wire never crosses a foreign chip (own chip only at its ends), a hull label chip or an edge label;
//   - a wire avoids foreign scope hulls (the hulls of groups it does not touch), crossings with wires already placed, and anchors
//     already used by another wire; an edge label (drawn at the wire middle) must not sit on a chip or another label.
// Wires are placed in a fixed order (labelled first, then by index) so the result is identical on every frame and every machine.
import type {Cubic, Pt, Sz} from '../_struct-a/kit';
import {bez} from '../_struct-a/kit';

export type Rect = {x0: number; y0: number; x1: number; y1: number};
export type World = {
  pos: Pt[];
  sz: Sz[];
  /** hull label chips and the labels of wires already routed */
  labels: Rect[];
  hulls: {rect: Rect; members: number[]}[];
  placed: Pt[][];
  used: Pt[];
};

const N = 28; // samples per candidate
const NX = 16; // samples used for crossings
const inRect = (p: Pt, r: Rect, m = 0) => p.x > r.x0 - m && p.x < r.x1 + m && p.y > r.y0 - m && p.y < r.y1 + m;
const chipRect = (w: World, i: number): Rect => ({x0: w.pos[i].x - w.sz[i].w / 2, y0: w.pos[i].y - w.sz[i].h / 2, x1: w.pos[i].x + w.sz[i].w / 2, y1: w.pos[i].y + w.sz[i].h / 2});
const hit = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const ccw = (a: Pt, b: Pt, c: Pt) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
const cross = (a: Pt, b: Pt, c: Pt, d: Pt) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);

/** The 12 anchors of a chip: 3 per side (-25 %, centre, +25 %), each with its outward normal. */
const anchors = (c: Pt, s: Sz, pad: number): {p: Pt; n: Pt}[] => {
  const out: {p: Pt; n: Pt}[] = [];
  for (const k of [0, -0.25, 0.25]) {
    out.push({p: {x: c.x + s.w * k, y: c.y - s.h / 2 - pad}, n: {x: 0, y: -1}});
    out.push({p: {x: c.x + s.w * k, y: c.y + s.h / 2 + pad}, n: {x: 0, y: 1}});
    out.push({p: {x: c.x - s.w / 2 - pad, y: c.y + s.h * k}, n: {x: -1, y: 0}});
    out.push({p: {x: c.x + s.w / 2 + pad, y: c.y + s.h * k}, n: {x: 1, y: 0}});
  }
  return out;
};

const centreExit = (c: Pt, s: Sz, to: Pt, pad: number): Pt => {
  const dx = to.x - c.x;
  const dy = to.y - c.y;
  const hw = s.w / 2 + pad;
  const hh = s.h / 2 + pad;
  const t = Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity);
  return Number.isFinite(t) ? {x: c.x + dx * t, y: c.y + dy * t} : c;
};

type Cand = {c: Cubic; poly: Pt[]; cost: number; straight: boolean; a0: Pt; a3: Pt};

export type Routed = {c: Cubic; poly: Pt[]; mid: Pt};

/**
 * Route wire a -> b. `label` is the size of the edge label chip drawn at the wire middle (0 for none). `commit` records the wire,
 * its anchors and its label in the world so later wires avoid them.
 */
export const routeEdge = (w: World, a: number, b: number, label: Sz | null, commit: boolean): Routed => {
  const A = w.pos[a];
  const B = w.pos[b];
  const ra = chipRect(w, a);
  const rb = chipRect(w, b);
  const chips = w.pos.map((_, i) => chipRect(w, i));
  const cands: Cand[] = [];
  const poly = (c: Cubic) => Array.from({length: N + 1}, (_, i) => bez(c, i / N));
  const push = (c: Cubic, straight: boolean) => {
    const P = poly(c);
    const m = P[N / 2];
    let cost = 0;
    let len = 0;
    for (let i = 1; i <= N; i++) len += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
    cost += straight ? len : len * 1.1 + 30;
    for (let i = 0; i <= N; i++) {
      const p = P[i];
      for (let k = 0; k < chips.length; k++) {
        if (k === a || k === b) {
          if (i > 2 && i < N - 2 && inRect(p, chips[k], 2)) cost += 1000;
        } else if (i > 0 && i < N && inRect(p, chips[k], 9)) cost += 1000;
      }
      for (const l of w.labels) if (inRect(p, l, 4)) cost += 300;
      for (const h of w.hulls) if (!h.members.includes(a) && !h.members.includes(b) && inRect(p, h.rect, 0)) cost += 22;
    }
    // the first / last samples must clear the own chip on the outside (a wire that doubles back over its own chip)
    if (inRect(P[1], ra, 0) || inRect(P[N - 1], rb, 0)) cost += 800;
    if (label) {
      const lr: Rect = {x0: m.x - label.w / 2 - 4, y0: m.y - label.h / 2 - 4, x1: m.x + label.w / 2 + 4, y1: m.y + label.h / 2 + 4};
      for (let k = 0; k < chips.length; k++) if (hit(lr, chips[k])) cost += 900;
      for (const l of w.labels) if (hit(lr, l)) cost += 500;
      for (const h of w.hulls) if (!h.members.includes(a) && !h.members.includes(b) && hit(lr, h.rect)) cost += 60;
    }
    for (const u of w.used) {
      if (Math.hypot(u.x - c[0].x, u.y - c[0].y) < 7) cost += 90;
      if (Math.hypot(u.x - c[3].x, u.y - c[3].y) < 7) cost += 90;
    }
    cands.push({c, poly: P, cost, straight, a0: c[0], a3: c[3]});
  };
  // straight line between the chip edges on the centre line
  const s0 = centreExit(A, w.sz[a], B, 6);
  const e0 = centreExit(B, w.sz[b], A, 8);
  push([s0, {x: s0.x + (e0.x - s0.x) / 3, y: s0.y + (e0.y - s0.y) / 3}, {x: s0.x + (2 * (e0.x - s0.x)) / 3, y: s0.y + (2 * (e0.y - s0.y)) / 3}, e0], true);
  const aa = anchors(A, w.sz[a], 6);
  const bb = anchors(B, w.sz[b], 8);
  for (const p of aa)
    for (const q of bb) {
      const d = Math.hypot(q.p.x - p.p.x, q.p.y - p.p.y);
      const k = Math.min(170, Math.max(34, d * 0.4));
      push([p.p, {x: p.p.x + p.n.x * k, y: p.p.y + p.n.y * k}, {x: q.p.x + q.n.x * k, y: q.p.y + q.n.y * k}, q.p], false);
    }
  cands.sort((x, y) => x.cost - y.cost);
  // crossings only for the best few (cost of a crossing check grows with the wires already placed)
  let best = cands[0];
  let bestCost = Infinity;
  for (const cd of cands.slice(0, 8)) {
    let cost = cd.cost;
    const P = Array.from({length: NX + 1}, (_, i) => cd.poly[Math.round((i * N) / NX)]);
    for (const Q of w.placed) {
      const QQ = Array.from({length: NX + 1}, (_, i) => Q[Math.round((i * N) / NX)]);
      for (let i = 0; i < NX; i++) for (let j = 0; j < NX; j++) if (cross(P[i], P[i + 1], QQ[j], QQ[j + 1])) cost += 140;
    }
    if (cost < bestCost) ((best = cd), (bestCost = cost));
  }
  const mid = best.poly[N / 2];
  if (commit) {
    w.placed.push(best.poly);
    w.used.push(best.a0, best.a3);
    if (label) w.labels.push({x0: mid.x - label.w / 2, y0: mid.y - label.h / 2, x1: mid.x + label.w / 2, y1: mid.y + label.h / 2});
  }
  return {c: best.c, poly: best.poly, mid};
};
