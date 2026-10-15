// OlapCube (catalog: Structure & flow). A 3-axis cube supporting slice, dice, roll-up and drill-down (04 section 6, "Warehouse, OLAP,
// SCD": a rotating cube with slice / dice / roll-up). Three glass-lattice faces are visible (front, right, top, key light from the
// upper right, 04 section 1.2): the cells are acrylic blocks tinted by a deterministic heat (a seeded hash of the member names, so the
// cube shows no invented numbers), the three axes carry their title and member ticks as upright billboards (never rotated, whole
// words) along the front-bottom edge (axis 0), the front-left edge (axis 1) and the receding right-bottom edge (axis 2). In an
// RTL (Arabic) cube the first member of axis 0 is on the right.
// Entrance (label preset, a diagonal wave from the front corner); a slow yaw drift (+-3 deg) keeps the cube alive.
// Actions (on the word that names them, 04 section 4 lead -2 f; RV1 = first visible step on the anchor frame):
//   slice(axis, member) -> every other cell ghosts to an outline; the member's layer lights signal and lifts out of the cube;
//   dice(members)       -> the sub-cube of the named members lights in signal, everything else ghosts (no pull);
//   rollup(axis)        -> the axis collapses: its layers slide onto the first one and fade while the cell heat becomes the layer
//                          mean; the member ticks give way to a sigma sign (an aggregate level);
//   drill(axis)         -> the reverse of a roll-up on that axis; on an axis that is not rolled up, every cell splits into two finer
//                          cells along it (the finer grain appears, the ticks stay on the parent members).
// 3D with a standard-tier fallback: projected SVG polygons + DOM labels (no WebGL), identical at every tier; the tier only changes
// the glow radii. The whole diagram auto-fits ctx.box as ONE unit: labels never below 28 px (SIZE.labelMin), else DC_QA overflow.
import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {MixedText} from '../../type/Text';
import {lineHeightFor} from '../../type/arabic';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {halo} from '../../fx/look';
import {reportQa} from '../../type/qa';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {acts, dirOf, exitStyle, fitScale, mix, roleOf, useMeasure} from '../_struct-a/kit';
import {project, type Cam3, type P3} from '../_struct-a/layout';

type Ctx = DcProps<Props>['ctx'];
const nfc = (s: string) => s.normalize('NFC').trim();

const L = 460; // nominal base edge (px) before the fit scale; an axis grows (up to CAP x) until its tick labels fit
const YAW0 = -0.55;
const PITCH = -0.42; // negative: seen from above (the top face is visible)
const DIST = 3.4 * L;
const PULL = 0.22; // slice lift along the layer's normal (x: right, y: up, z: toward the viewer), fraction of the axis length; small, so the slab never covers a tick or a title
const CAP = [1.5, 1.7, 1.9]; // longest an axis may grow with 1, 2, 3 tick rows
const GHOST = 0.13;
const DRIFT = 0.05; // rad, idle yaw drift amplitude
const TAU = Math.PI * 2;

type Rolls = number[]; // 0..1 per axis
type Sel = {t: number; kind: 'slice' | 'dice'; axis: number; member: number; members: Set<string>[]};

/** Structural timeline: per-axis roll-up and refine (drill) transitions, and the selection history. */
const timeline = (p: Props, ctx: Ctx) => {
  const evs = ['slice', 'dice', 'rollup', 'drill'].flatMap((n) => acts(ctx, n)).sort((a, b) => a.at - b.at || a.li - b.li);
  const roll = [0, 1, 2].map(() => [{t: -1e9, v: 0}]);
  const refine = [0, 1, 2].map(() => [{t: -1e9, v: 0}]);
  const sels: Sel[] = [];
  for (const a of evs) {
    if (a.name === 'rollup' || a.name === 'drill') {
      const ax = a.props.axis as number;
      const last = (arr: {t: number; v: number}[]) => arr[arr.length - 1].v;
      if (a.name === 'rollup') {
        if (last(roll[ax]) < 1) roll[ax].push({t: a.at, v: 1});
      } else if (last(roll[ax]) > 0) roll[ax].push({t: a.at, v: 0});
      else if (last(refine[ax]) < 1) refine[ax].push({t: a.at, v: 1});
    } else if (a.name === 'slice') {
      const ax = a.props.axis as number;
      const mi = p.axes[ax].members.findIndex((m) => nfc(m) === nfc(a.props.member as string));
      if (mi >= 0) sels.push({t: a.at, kind: 'slice', axis: ax, member: mi, members: []});
    } else {
      const want = new Set((a.props.members as string[]).map(nfc));
      const members = p.axes.map((ax) => new Set(ax.members.filter((m) => want.has(nfc(m))).map(nfc)));
      if (members.some((s) => s.size)) sels.push({t: a.at, kind: 'dice', axis: -1, member: -1, members});
    }
  }
  return {roll, refine, sels};
};
const valueAt = (arr: {t: number; v: number}[], t: number, n: number, easing = ease.camera): number => {
  let k = 0;
  for (let j = 0; j < arr.length; j++) if (arr[j].t <= t) k = j;
  if (k === 0) return arr[0].v;
  return arr[k - 1].v + (arr[k].v - arr[k - 1].v) * revealProgress(t - arr[k].t, n, easing);
};
/** Is member index `i` of axis `ax` part of selection `s`? */
const inSel = (p: Props, s: Sel, idx: [number, number, number]): boolean => {
  if (s.kind === 'slice') return idx[s.axis] === s.member;
  return [0, 1, 2].every((a) => !s.members[a].size || s.members[a].has(nfc(p.axes[a].members[idx[a]])));
};

type Box = {x0: number; y0: number; x1: number; y1: number};
/** Slice lift vector along the layer's normal, weight w (axis 0: right; axis 1: up; axis 2: toward the viewer). */
const pullVec = (axis: number, Lv: number[], w: number): P3 =>
  axis === 0 ? {x: PULL * Lv[0] * w, y: 0, z: 0} : axis === 1 ? {x: 0, y: PULL * Lv[1] * w, z: 0} : {x: 0, y: 0, z: -PULL * Lv[2] * w};
/** Box of tick label i of axis a (a: below the front-bottom edge, rows stacked down; b: left of the front-left edge, rows stepped left;
 * c: right of the receding right-bottom edge, rows stepped right). Same maths at nominal and at screen scale. */
const tickBox = (a: number, p: {x: number; y: number}, w: number, row: number, hL: number, off: number, maxW: number, gap: number): Box =>
  a === 0
    ? {x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y + off + row * hL, y1: p.y + off + (row + 1) * hL}
    : a === 1
      ? {x0: p.x - off - w - row * (maxW + gap), x1: p.x - off - row * (maxW + gap), y0: p.y - hL / 2, y1: p.y + hL / 2}
      : {x0: p.x + off + row * (maxW + gap), x1: p.x + off + row * (maxW + gap) + w, y0: p.y - hL / 2, y1: p.y + hL / 2};
/** Axis title boxes: x under its tick rows, y above its edge, z beyond its far end (same maths at nominal and at screen scale). */
const titleBoxes = (P: (p: P3) => {x: number; y: number}, Lv: number[], xTicks: Box[], tw: number[], hT: number): Box[] => {
  const xMid = P({x: 0, y: -Lv[1] / 2, z: -Lv[2] / 2});
  const xBottom = Math.max(xMid.y, ...xTicks.map((b) => b.y1));
  const yTop = P({x: -Lv[0] / 2, y: Lv[1] / 2, z: -Lv[2] / 2});
  const zFar = P({x: Lv[0] / 2, y: -Lv[1] / 2, z: Lv[2] / 2});
  const g = 10 * (hT / 54);
  return [
    {x0: xMid.x - tw[0] / 2, x1: xMid.x + tw[0] / 2, y0: xBottom + g, y1: xBottom + g + hT},
    {x0: yTop.x - tw[1] / 2 - g, x1: yTop.x + tw[1] / 2 - g, y0: yTop.y - 2.4 * g - hT, y1: yTop.y - 2.4 * g},
    {x0: zFar.x + 2.8 * g, x1: zFar.x + 2.8 * g + tw[2], y0: zFar.y - hT / 2 - 0.6 * g, y1: zFar.y + hT / 2 - 0.6 * g},
  ];
};

export const OlapCubeView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ax = props.axes;
  const dir = dirOf([...ax.map((a) => a.label), ...ax.flatMap((a) => a.members)]);
  const rtl = dir === 'rtl';
  const fs0 = SIZE.body - 4; // 36: member ticks (rendered below 56 px, so the face band never changes between measure and render)
  const ft0 = SIZE.body; // axis titles
  const n = ax.map((a) => a.members.length) as [number, number, number];
  const items = [...ax.map((a) => ({text: a.label, size: ft0})), ...ax.flatMap((a) => a.members.map((m) => ({text: m, size: fs0, weight: 500})))];
  const m = useMeasure(ctx.id, items);
  const tl = useMemo(() => timeline(props, ctx), [props, ctx.actions, ctx.fps]); // eslint-disable-line react-hooks/exhaustive-deps
  const slicedAxes = new Set(tl.sels.filter((s) => s.kind === 'slice').map((s) => s.axis));
  const sKey = [...slicedAxes].join(',');

  const geo = useMemo(() => {
    if (!m.w) return null;
    const w = m.w as number[];
    const tw = w.slice(0, 3);
    let k = 3;
    const mw = ax.map((a) => a.members.map(() => w[k++]));
    const hL = Math.round(fs0 * 1.5);
    const hT = Math.round(ft0 * 1.5);
    const gapMin = 40; // AT-4: labels on one baseline are >= 40 px apart
    const off = 24;
    const maxW = mw.map((r) => Math.max(...r));
    const P = (p: P3, yaw = YAW0) => project(p, {yaw, pitch: PITCH, dist: DIST}, DIST);
    const tickPts = (a: number, Lv: number[]) =>
      Array.from({length: n[a]}, (_, i) => {
        const l = a === 0 && rtl ? n[a] - 1 - i : i;
        const c = -Lv[a] / 2 + ((l + 0.5) * Lv[a]) / n[a];
        return a === 0 ? P({x: c, y: -Lv[1] / 2, z: -Lv[2] / 2}) : a === 1 ? P({x: -Lv[0] / 2, y: c, z: -Lv[2] / 2}) : P({x: Lv[0] / 2, y: -Lv[1] / 2, z: c});
      });
    const boxes = (a: number, pts: {x: number; y: number}[], rows: number) => pts.map((p, i) => tickBox(a, p, mw[a][i], i % rows, hL, off, maxW[a], gapMin));
    const hit = (A: Box, B: Box) => A.x0 < B.x1 + gapMin && B.x0 < A.x1 + gapMin && A.y0 < B.y1 + 6 && B.y0 < A.y1 + 6;
    const clashes = (R: Box[]) => R.some((A, i) => R.some((B, j) => j > i && hit(A, B)));
    const Lv = [L, L, L];
    const rows = [1, 1, 1];
    let tickFail = false;
    for (let a = 0; a < 3; a++) {
      let ok = false;
      for (let r = 1; r <= 3 && !ok; r++) {
        for (let La = L; La <= CAP[r - 1] * L + 0.01; La *= 1.08) {
          const t = Lv.slice();
          t[a] = La;
          if (!clashes(boxes(a, tickPts(a, t), r))) {
            Lv[a] = La;
            rows[a] = r;
            ok = true;
            break;
          }
        }
      }
      if (!ok) {
        Lv[a] = CAP[2] * L;
        rows[a] = 3;
        tickFail = true;
      }
    }
    // bounding box: cube corners (three yaw samples), slice pulls, tick boxes, axis titles
    const R: Box[] = [];
    const addPts = (ps: {x: number; y: number}[]) => R.push({x0: Math.min(...ps.map((q) => q.x)), x1: Math.max(...ps.map((q) => q.x)), y0: Math.min(...ps.map((q) => q.y)), y1: Math.max(...ps.map((q) => q.y))});
    const corners = (yaw: number, o: P3) => {
      const out: {x: number; y: number}[] = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out.push(P({x: (sx * Lv[0]) / 2 + o.x, y: (sy * Lv[1]) / 2 + o.y, z: (sz * Lv[2]) / 2 + o.z}, yaw));
      return out;
    };
    for (const yaw of [YAW0 - DRIFT, YAW0, YAW0 + DRIFT]) addPts(corners(yaw, {x: 0, y: 0, z: 0}));
    for (const a of slicedAxes) addPts(corners(YAW0, pullVec(a, Lv, 1)));
    const ticks = [0, 1, 2].map((a) => boxes(a, tickPts(a, Lv), rows[a]));
    ticks.flat().forEach((b) => R.push(b));
    const titles = titleBoxes(P, Lv, ticks[0], tw, hT);
    R.push(...titles);
    const b = {x0: Math.min(...R.map((r) => r.x0)), x1: Math.max(...R.map((r) => r.x1)), y0: Math.min(...R.map((r) => r.y0)), y1: Math.max(...R.map((r) => r.y1))};
    const fit = fitScale(ctx.id, {w: b.x1 - b.x0, h: b.y1 - b.y0}, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin, 1.25);
    if (tickFail) reportQa('overflow', `${ctx.id}:ticks`, {rows, note: 'member labels do not fit their edge in 3 rows'});
    const s = fit.s;
    const cx = ctx.box.w / 2 - ((b.x0 + b.x1) / 2) * s;
    const cy = ctx.box.h / 2 - ((b.y0 + b.y1) / 2) * s;
    return {s, fs: fit.fs, overflow: fit.overflow || tickFail, cx, cy, Lv, rows, hL, hT, off, mw, tw, gapMin, maxW};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.w, props.axes, ctx.box.w, ctx.box.h, ctx.id, rtl, sKey]);

  if (!geo) return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y}}>{m.node}</div>;

  const t = ctx.frame;
  const fps = ctx.fps;
  const lab = presetFrames('label', fps);
  const morph = presetFrames('morph', fps, true);
  const s = geo.s;
  const Lv = geo.Lv;
  const yaw = YAW0 + DRIFT * Math.sin((TAU * t) / (9 * fps));
  const cam: Cam3 = {yaw, pitch: PITCH, dist: DIST};
  const P = (p: P3) => {
    const q = project(p, cam, DIST);
    return {x: geo.cx + q.x * s, y: geo.cy + q.y * s, z: q.z};
  };

  // ---- structural state at t ----
  const roll = tl.roll.map((a) => valueAt(a, t, morph));
  const refine = tl.refine.map((a) => valueAt(a, t, morph));
  const subdiv = refine.map((q) => (q > 0 ? 2 : 1));
  const N = n.map((v, a) => v * subdiv[a]);
  const thick = N.map((v, a) => Lv[a] / v);
  const extent = N.map((v, a) => (v - 1) * thick[a] * (1 - roll[a]) + thick[a]);
  const startOf = (a: number, l: number) => -extent[a] / 2 + l * thick[a] * (1 - roll[a]);
  const sels = tl.sels;
  let kSel = -1;
  for (let j = 0; j < sels.length; j++) if (sels[j].t <= t) kSel = j;
  const cur = kSel >= 0 ? sels[kSel] : null;
  const prev = kSel >= 1 ? sels[kSel - 1] : null;
  const pc = cur ? revealProgress(t - cur.t, morph, ease.camera) : 1;
  const ghostAmt = cur ? pc + (prev ? 1 - pc : 0) : 0;

  // ---- cells ----
  const ntot = n[0] + n[1] + n[2] - 3;
  const hs = (a: number, b: number, c: number) => random(`olap:${ax[0].label}:${ax[1].label}:${ax[2].label}:${ax[0].members[a]}:${ax[1].members[b]}:${ax[2].members[c]}`);
  const baseHeat = (a: number, b: number, c: number) => 0.18 + 0.72 * hs(a, b, c);
  const meanHeat = (a: number, b: number, c: number): number => {
    const ra = roll[0] > 0;
    const rb = roll[1] > 0;
    const rc = roll[2] > 0;
    let sum = 0;
    let cnt = 0;
    for (let i = ra ? 0 : a; i <= (ra ? n[0] - 1 : a); i++)
      for (let j = rb ? 0 : b; j <= (rb ? n[1] - 1 : b); j++)
        for (let k = rc ? 0 : c; k <= (rc ? n[2] - 1 : c); k++) {
          sum += baseHeat(i, j, k);
          cnt++;
        }
    return sum / cnt;
  };
  type Cell = {key: string; d: number; faces: {pts: string; fill: string; stroke: string; so: number; fo: number; sw: number; halo: boolean}[]};
  const cells: Cell[] = [];
  const sOf = (sel: Sel | null, idx: [number, number, number]) => (sel && inSel(props, sel, idx) ? 1 : 0);
  const maxRefine = Math.max(...refine);
  // visible faces (normals facing the camera): +x, +y, -z for this camera; checked numerically
  const faceVis = (nx: number, ny: number, nz: number) => {
    const z1 = nx * Math.sin(cam.yaw) + nz * Math.cos(cam.yaw);
    const z2 = ny * Math.sin(cam.pitch) + z1 * Math.cos(cam.pitch);
    return z2 < 0;
  };
  const visF = [faceVis(1, 0, 0), faceVis(-1, 0, 0), faceVis(0, 1, 0), faceVis(0, -1, 0), faceVis(0, 0, 1), faceVis(0, 0, -1)];
  for (let la = 0; la < N[0]; la++)
    for (let lb = 0; lb < N[1]; lb++)
      for (let lc = 0; lc < N[2]; lc++) {
        const layer = [la, lb, lc]; // physical layer along each axis
        const mi = layer.map((l, a) => Math.floor(l / subdiv[a])) as [number, number, number];
        const mem: [number, number, number] = rtl ? [n[0] - 1 - mi[0], mi[1], mi[2]] : mi; // member index as stored in props (axis 0 is mirrored)
        const wave = (mi[0] + mi[1] + mi[2]) / Math.max(1, ntot);
        const born = ctx.at + Math.round(wave * 14 * (fps / 24));
        const qa = revealProgress(t - born, lab);
        if (qa <= 0) continue;
        const wC = sOf(cur, mem);
        const wP = sOf(prev, mem);
        const sel = (cur ? pc * wC : 0) + (prev ? (1 - pc) * wP : 0);
        const ghost = ghostAmt * (1 - Math.min(1, sel));
        const interior = !layer.some((l, a) => l === 0 || l === N[a] - 1);
        if (interior && sel < 0.02) continue; // hidden inside the lattice (ghosted or not): only selected cells are drawn there
        // roll-up: layers above 0 slide onto layer 0 and fade
        let a3 = qa;
        let heat = baseHeat(mem[0], mem[1], mem[2]);
        for (let a = 0; a < 3; a++) if (roll[a] > 0 && layer[a] > 0) a3 *= 1 - roll[a];
        if (roll.some((r) => r > 0)) {
          const hm = meanHeat(mem[0], mem[1], mem[2]);
          const rr = Math.max(...roll.map((r, a) => (layer[a] === 0 ? r : 0)));
          heat = heat + (hm - heat) * rr;
        }
        if (maxRefine > 0) heat = Math.min(0.95, Math.max(0.12, heat + (random(`${hs(mem[0], mem[1], mem[2])}:${la}:${lb}:${lc}`) - 0.5) * 0.5 * maxRefine));
        if (a3 < 0.02) continue;
        const alphaCell = (1 - ghost * (1 - GHOST)) * a3;
        const lo = [0, 1, 2].map((a) => startOf(a, layer[a]));
        let off: P3 = {x: 0, y: 0, z: 0};
        for (const [sl, wgt] of [[cur, cur ? pc * wC : 0], [prev, prev ? (1 - pc) * wP : 0]] as [Sel | null, number][]) {
          if (!sl || sl.kind !== 'slice' || wgt <= 0) continue;
          const d = pullVec(sl.axis, Lv, wgt);
          off = {x: off.x + d.x, y: off.y + d.y, z: off.z + d.z};
        }
        const x0 = lo[0] + off.x;
        const y0 = lo[1] + off.y;
        const z0 = lo[2] + off.z;
        const x1 = x0 + thick[0];
        const y1 = y0 + thick[1];
        const z1 = z0 + thick[2];
        const cc = P({x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2});
        const base = mix(mix(C.ground, C.violet, 0.14 + 0.5 * heat), C.signal, Math.min(1, sel) * 0.85);
        const corner = (x: number, y: number, z: number) => {
          const q = P({x, y, z});
          return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
        };
        // key light from the upper right: top lightest, right face lit, front face in shade
        const defs: {vi: number; pts: [number, number, number][]; shade: number}[] = [
          {vi: 0, pts: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], shade: 0.22},
          {vi: 1, pts: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], shade: 0.38},
          {vi: 2, pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], shade: -0.12},
          {vi: 3, pts: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], shade: 0.5},
          {vi: 4, pts: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], shade: 0.2},
          {vi: 5, pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], shade: 0.4},
        ];
        const faces = defs
          .filter((f) => visF[f.vi])
          .map((f) => {
            const fill = f.shade < 0 ? mix(base, C.white, -f.shade) : mix(base, C.void, f.shade);
            const hot = Math.min(1, sel);
            return {
              pts: f.pts.map((p) => corner(p[0], p[1], p[2])).join(' '),
              fill,
              stroke: mix(mix(C.ink3, C.violet, 0.3), C.signal, hot),
              so: Math.max(alphaCell, ghost > 0 ? GHOST * 1.9 * a3 : 0) * (0.55 + 0.45 * hot),
              fo: alphaCell * 0.93,
              sw: (1.4 + 1.6 * hot) * s,
              halo: hot > 0.3,
            };
          });
        if (faces.length) cells.push({key: `${la}:${lb}:${lc}`, d: cc.z, faces});
      }
  cells.sort((a, b) => b.d - a.d || (a.key < b.key ? -1 : 1));

  // ---- labels (the same boxes the layout checked, scaled) ----
  const fsT = geo.fs;
  const fsA = geo.fs * (ft0 / fs0);
  const tickAnchor = (a: number, i: number) => {
    const na = n[a];
    const l = a === 0 && rtl ? na - 1 - i : i;
    // while a roll-up collapses the axis the ticks keep their original lattice (they fade), so they never jump
    const c0 = -Lv[a] / 2 + ((l + 0.5) * Lv[a]) / na;
    return a === 0 ? P({x: c0, y: -Lv[1] / 2, z: -Lv[2] / 2}) : a === 1 ? P({x: -Lv[0] / 2, y: c0, z: -Lv[2] / 2}) : P({x: Lv[0] / 2, y: -Lv[1] / 2, z: c0});
  };
  const selTick = (a: number, i: number): number => {
    const mem = ax[a].members[i];
    let v = 0;
    for (const [sl, wgt] of [[cur, cur ? pc : 0], [prev, prev ? 1 - pc : 0]] as [Sel | null, number][]) {
      if (!sl || wgt <= 0) continue;
      const hit = sl.kind === 'slice' ? sl.axis === a && sl.member === i : sl.members[a].has(nfc(mem));
      if (hit) v += wgt;
    }
    return Math.min(1, v);
  };
  const bornLab = ctx.at + Math.round(14 * (fps / 24)) + presetFrames('label', fps);
  const hLs = geo.hL * s;
  const tickBoxes = [0, 1, 2].map((a) => ax[a].members.map((_, i) => tickBox(a, tickAnchor(a, i), geo.mw[a][i] * s, i % geo.rows[a], hLs, geo.off * s, geo.maxW[a] * s, geo.gapMin * s)));
  const titleB = titleBoxes((p3) => P(p3), Lv, tickBoxes[0], geo.tw.map((v) => v * s), geo.hT * s);
  const sigma = (cx: number, cy: number, r: number, q: number) => (
    <path
      d={`M${cx + r * 0.55},${cy - r} H${cx - r * 0.55} L${cx + r * 0.1},${cy} L${cx - r * 0.55},${cy + r} H${cx + r * 0.6}`}
      fill="none"
      stroke={C.signal}
      strokeWidth={Math.max(2.5, r * 0.22)}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity={q}
    />
  );

  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {cells.map((c) => (
          <g key={c.key}>
            {c.faces.map((f, i) => (
              <React.Fragment key={i}>
                {f.halo ? <polygon points={f.pts} fill="none" stroke={C.signal} strokeOpacity={0.22 * f.so} strokeWidth={f.sw * 4} strokeLinejoin="round" /> : null}
                <polygon points={f.pts} fill={f.fill} fillOpacity={f.fo} stroke={f.stroke} strokeOpacity={f.so} strokeWidth={f.sw} strokeLinejoin="round" />
              </React.Fragment>
            ))}
          </g>
        ))}
        {[0, 1, 2].map((a) =>
          roll[a] > 0.05 ? (
            <g key={`sg${a}`}>{sigma(titleB[a].x1 + 26 * s, (titleB[a].y0 + titleB[a].y1) / 2, 16 * s, roll[a])}</g>
          ) : null,
        )}
      </svg>
      {[0, 1, 2].flatMap((a) =>
        ax[a].members.map((mm, i) => {
          const B = tickBoxes[a][i];
          const hot = selTick(a, i);
          const rv = revealStyle(t - bornLab - Math.round((i * 2 * fps) / 24), fps, 'label', dirOf([mm]));
          const vis = (1 - roll[a]) * (typeof rv.style.opacity === 'number' ? rv.style.opacity : 1);
          return (
            <div key={`t${a}:${i}`} style={{position: 'absolute', left: B.x0, top: B.y0, height: B.y1 - B.y0, display: 'flex', alignItems: 'center', fontSize: fsT, color: mix(C.ink2, C.signal, hot), lineHeight: lineHeightFor(mm), whiteSpace: 'nowrap', textShadow: halo, ...rv.style, opacity: vis}}>
              <MixedText id={`${ctx.id}:a${a}m${i}`} text={mm} size={fsT} weight={hot > 0.5 ? FONT.label.strong : 500} role={roleOf(mm)} />
            </div>
          );
        }),
      )}
      {[0, 1, 2].map((a) => {
        const B = titleB[a];
        const rv = revealStyle(t - bornLab, fps, 'label', dirOf([ax[a].label]));
        return (
          <div key={`title${a}`} style={{position: 'absolute', left: B.x0, top: B.y0, height: B.y1 - B.y0, display: 'flex', alignItems: 'center', fontSize: fsA, color: C.ink, lineHeight: lineHeightFor(ax[a].label), whiteSpace: 'nowrap', textShadow: halo, outline: geo.overflow ? `2px dashed ${C.crit}` : undefined, ...rv.style}}>
            <MixedText id={`${ctx.id}:title${a}`} text={ax[a].label} size={fsA} weight={FONT.label.strong} role={roleOf(ax[a].label)} />
          </div>
        );
      })}
    </div>
  );
};

export const OlapCube: DcComponent<Props> = {name: 'OlapCube', Component: OlapCubeView, text: true, slot: 'full'};
