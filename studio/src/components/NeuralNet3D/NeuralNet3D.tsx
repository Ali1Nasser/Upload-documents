// NeuralNet3D (catalog: Space & 3D). 04 section 6 "Neural networks": layers light forward, gradients flow back as waves, weights
// glow by magnitude. Layers (<= 8, <= 32 neurons each) stand in depth along the RTL flow: the input layer on the right, the output
// on the left. A layer of <= 8 neurons is a column; a wider one becomes a y-z grid, so the 3D set reads as volume when it orbits.
// Connections: every pair between adjacent layers, or a seeded subset of 160 per gap when the full set is denser (legibility and
// cost; documented in docs/p7/catalog_status/space3d.md). Seeded weight magnitudes drive line brightness only (never a number).
// Actions (each on its own word, RV1 through revealProgress):
//   forward       a `signal` wave crosses gap by gap (7 film frames per gap); each layer flashes as the wave reaches it;
//   backprop      a `warn` wave (the error signal) crosses back from the output to the input;
//   highlightLayer {index}   that layer takes a signal ring and its label; the other layers dim (latest highlight wins).
// Labels (optional, one per layer) sit on one baseline under the set, >= 40 px apart (AT-4), auto-fit to the layer pitch with the
// SIZE.labelMin floor (an overflow is reported). Tiers: lite flat; standard + halos; hero + bloom sprites (no WebGL needed).
// Depth and light (ADR-003 LK-F, 04 section 1.2): each layer is a glass pane in its plane with a rim-lit upper-right edge; neurons are
// rim-lit discs painted far to near with distance falloff; a signal pool on the floor and a back glow sit under the set; the wave
// lights the pane and its neurons. Text-safe (ADR-002): the field is cut out of every copy box inside the canvas (_space3d/knockout).
import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C, CAMERA, H, SIZE} from '../../tokens';
import {LABEL_GAP_MIN_PX} from '../../type/safe';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {
  CHIP_PAD, Chip, Measure, MLabel, SpaceCanvas, actionsOf, blit, bloomOf, chipH, chipW, clampInto, exitK, ff, fitTo, lerp, mix,
  moveK, fitCam, project, rgba, secs, sprite, useMeasure, useOverflow, type Cam3, type V3,
} from '../_space3d/kit';
import {Origin, knockOut, useForeignText} from '../_space3d/knockout';

const BASE = SIZE.label;
const MAX_LINKS = 160; // per gap
const GAP_F24 = 7; // film frames for the wave to cross one gap

type Net = {pos: V3[][]; act: number[][]; links: {g: number; a: number; b: number; w: number}[][]};
const buildNet = (layers: number[]): Net => {
  const L = layers.length;
  const span = Math.min(12, 4.6 * (L - 1));
  const pos = layers.map((n, l) => {
    const x = span / 2 - (span * l) / Math.max(1, L - 1);
    const cols = Math.ceil(n / 8);
    const rows = Math.ceil(n / cols);
    return Array.from({length: n}, (_, i): V3 => {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const inCol = c === cols - 1 ? n - c * rows : rows;
      return [x, ((inCol - 1) / 2 - r) * 0.62, (c - (cols - 1) / 2) * 0.95];
    });
  });
  const links = layers.slice(0, -1).map((na, g) => {
    const nb = layers[g + 1];
    const all: {g: number; a: number; b: number; w: number; r: number}[] = [];
    for (let a = 0; a < na; a++) for (let b = 0; b < nb; b++) all.push({g, a, b, w: random(`nn${g}:${a}:${b}w`), r: random(`nn${g}:${a}:${b}r`)});
    return (all.length > MAX_LINKS ? [...all].sort((x, y) => x.r - y.r).slice(0, MAX_LINKS) : all).map(({g: gg, a, b, w}) => ({g: gg, a, b, w}));
  });
  const act = layers.map((n, l) => Array.from({length: n}, (_, i) => random(`nn${l}:${i}act`)));
  return {pos, act, links};
};

/** The set's bounding corners (3D), so the camera can fit it to the slot at any orbit angle. */
const hullOf = (net: Net): V3[] =>
  net.pos.flatMap((ly) => {
    const xs = ly[0][0];
    const ys = ly.map((p) => p[1]);
    const zs = ly.map((p) => p[2]);
    const [y0, y1, z0, z1] = [Math.min(...ys) - 0.2, Math.max(...ys) + 0.2, Math.min(...zs) - 0.2, Math.max(...zs) + 0.2];
    return [y0, y1].flatMap((y) => [z0, z1].map((z): V3 => [xs, y, z]));
  });
const LABEL_BAND = 0.15; // share of the slot height kept for the layer labels

const camOf = (ctx: LayerCtx, hull: V3[]): Cam3 =>
  fitCam(
    {yaw: 0.5 + ((CAMERA.orbitDegPerS * Math.PI) / 180) * secs(ctx) * 4, pitch: 0.2, dist: 18, fovDeg: 30, cx: 0, cy: 0, viewH: H, target: [0, 0, 0]},
    hull,
    {w: ctx.box.w * 0.96, h: ctx.box.h * (1 - LABEL_BAND), cx: ctx.box.x + ctx.box.w / 2, cy: ctx.box.y + (ctx.box.h * (1 - LABEL_BAND)) / 2},
  );

/** Wave state of one action at layer l: 0..1 bell around the arrival of the wave at that layer. */
const waveAt = (ctx: LayerCtx, t0: number, l: number, L: number, back: boolean): number => {
  const G = ff(GAP_F24, ctx.fps);
  const step = back ? L - 1 - l : l;
  const dt = ctx.frame - (t0 + step * G);
  if (dt < 0) return 0;
  const decay = ff(10, ctx.fps);
  return dt <= 1 ? 1 : Math.max(0, 1 - (dt - 1) / decay);
};
/** Progress of the wave across gap g (between layer g and g + 1). */
const gapK = (ctx: LayerCtx, t0: number, g: number, L: number, back: boolean): number => {
  const G = ff(GAP_F24, ctx.fps);
  const step = back ? L - 2 - g : g;
  const u = (ctx.frame - (t0 + step * G) + 1) / G; // RV1: first visible step on the anchor frame
  return u <= 0 || u > 1.6 ? -1 : Math.min(1, u);
};

type Pane = {y0: number; y1: number; z0: number; z1: number; x: number};
const panesOf = (net: Net): Pane[] =>
  net.pos.map((ly) => {
    const ys = ly.map((p) => p[1]);
    const zs = ly.map((p) => p[2]);
    return {x: ly[0][0], y0: Math.min(...ys) - 0.3, y1: Math.max(...ys) + 0.3, z0: Math.min(...zs) - 0.4, z1: Math.max(...zs) + 0.4};
  });

export const NeuralNet3DView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const L = props.layers.length;
  const net = useMemo(() => buildNet(props.layers), [props.layers]);
  const panes = useMemo(() => panesOf(net), [net]);
  const labels = (props.labels ?? []).slice(0, L);
  const [mref, m] = useMeasure(ctx.id, labels.join('|'));
  const [oref, foreign] = useForeignText(`${ctx.id}:`, ctx.fx, ctx.frame);
  const k = exitK(ctx);
  const cam = camOf(ctx, hullOf(net));
  const glow = bloomOf(ctx.fx);
  const enterL = (l: number) => (ctx.at <= 0 ? 1 : moveK(ctx, ctx.at + l * ff(2, ctx.fps), 6));
  const fw = actionsOf(ctx, 'forward').filter((a) => a.at <= ctx.frame);
  const bp = actionsOf(ctx, 'backprop').filter((a) => a.at <= ctx.frame);
  const hl = actionsOf(ctx, 'highlightLayer').filter((a) => a.at <= ctx.frame).pop();
  const hlIdx = hl ? (hl.props as {index: number}).index : -1;
  const hlK = hl ? moveK(ctx, hl.at, 6) : 0;
  const dimOf = (l: number) => (hlIdx < 0 || hlIdx >= L ? 1 : l === hlIdx ? 1 : 1 - 0.55 * hlK);
  const act = (l: number): {f: number; b: number} => ({
    f: Math.max(0, ...fw.map((a) => waveAt(ctx, a.at, l, L, false))),
    b: Math.max(0, ...bp.map((a) => waveAt(ctx, a.at, l, L, true))),
  });
  const boost = 1 + 0.5 * ctx.mod.glow;

  // ---------- layout shared by the canvas and the labels ----------
  const box = ctx.box;
  const P = net.pos.map((ly) => ly.map((p) => project(cam, p)));
  const xs = net.pos.map((ly) => project(cam, ly[0]).x);
  const bottoms = P.map((ly) => Math.max(...ly.map((q) => q.y + Math.max(5, 0.16 * q.s))));
  const pitch = L > 1 ? Math.min(...xs.slice(1).map((x, i) => Math.abs(xs[i] - x))) : box.w;
  const avail = pitch - LABEL_GAP_MIN_PX - 2 * CHIP_PAD.x;
  const fits = labels.map((_, i) => (m ? fitTo(BASE, m.w[i], avail, SIZE.labelMin) : {size: BASE, overflow: false}));
  const size = fits.length ? Math.min(...fits.map((f) => f.size)) : BASE;
  const overflow = fits.some((f) => f.overflow);
  useOverflow(ctx.id, overflow, {pitch: Math.round(pitch), labels});
  const baseY = Math.max(...bottoms) + 16;
  const chips = m
    ? labels.map((t, i) => {
        const w = chipW(m.w[i], BASE, size);
        const h = chipH(t, size);
        return {text: t, w, h, ...clampInto(box, xs[i] - w / 2, baseY, w, h), t0: ctx.at + ff(2 + 2 * i, ctx.fps)};
      })
    : [];

  const draw = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    // depth: 0 near .. 1 far, over the layer centres
    const dl = P.map((ly) => ly.reduce((a, q) => a + q.d, 0) / ly.length);
    const [d0, d1] = [Math.min(...dl), Math.max(...dl)];
    const far = (d: number) => (d1 - d0 < 1e-6 ? 0 : (d - d0) / (d1 - d0));
    const fall = (d: number) => 1 - 0.38 * far(d); // distance falloff of light
    const allPts = P.flat().filter((q) => q.ok);
    const cxs = allPts.reduce((a, q) => a + q.x, 0) / Math.max(1, allPts.length);
    const cys = allPts.reduce((a, q) => a + q.y, 0) / Math.max(1, allPts.length);
    const rx = (Math.max(...allPts.map((q) => q.x)) - Math.min(...allPts.map((q) => q.x))) / 2;
    const e0 = enterL(0) * k;
    // back glow + floor pool (the emissive set lights the floor under it)
    g.globalCompositeOperation = 'lighter';
    blit(g, sprite(C.signal, 'glow'), cxs, cys, rx * 0.95, (0.1 + 0.1 * glow) * e0 * boost);
    const floorY = Math.max(...bottoms) + 6;
    g.save();
    g.translate(cxs, floorY);
    g.scale(1, 0.2);
    blit(g, sprite(C.signal, 'glow'), 0, 0, rx * 1.05, (0.34 + 0.26 * glow) * e0 * boost);
    g.restore();
    // glass panes, one per layer plane
    const vis: Record<number, number> = {};
    panes.forEach((pn, l) => {
      const e = enterL(l) * k * dimOf(l);
      vis[l] = e;
      if (e <= 0) return;
      const q = ([[pn.y0, pn.z0], [pn.y0, pn.z1], [pn.y1, pn.z1], [pn.y1, pn.z0]] as [number, number][]).map(([y, z]) => project(cam, [pn.x, y, z]));
      if (q.some((c) => !c.ok)) return;
      const {f, b} = act(l);
      const heat = Math.max(f, b);
      const hc = b > f ? C.warn : C.signal;
      const isHl = l === hlIdx;
      const fa = fall(dl[l]);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.beginPath();
      q.forEach((c, i) => (i ? g.lineTo(c.x, c.y) : g.moveTo(c.x, c.y)));
      g.closePath();
      g.fillStyle = rgba(C.panel, 0.52 * e * fa);
      g.fill();
      if (heat > 0 || isHl) {
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = rgba(isHl && heat <= 0 ? C.signal : hc, (0.24 * heat + (isHl ? 0.08 * hlK : 0)) * e);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }
      g.lineWidth = 1.5;
      g.strokeStyle = rgba(C.ink3, 0.75 * e * fa);
      g.stroke();
      // rim light (04 section 1.2): the top edge and the right-most vertical edge of the pane catch the key light
      const edges = q.map((c, i) => [c, q[(i + 1) % 4]] as const);
      const top = edges.reduce((a, c) => ((a[0].y + a[1].y) / 2 < (c[0].y + c[1].y) / 2 ? a : c));
      const right = edges.filter((c) => c !== top).reduce((a, c) => ((a[0].x + a[1].x) / 2 > (c[0].x + c[1].x) / 2 ? a : c));
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.strokeStyle = rgba(isHl ? C.signal : C.ink2, (isHl ? 0.9 * hlK + 0.2 : 0.85) * e * fa);
      for (const ed of [top, right]) {
        g.beginPath();
        g.moveTo(ed[0].x, ed[0].y);
        g.lineTo(ed[1].x, ed[1].y);
        g.stroke();
      }
      if (isHl) {
        g.lineWidth = 3;
        g.strokeStyle = rgba(C.signal, 0.75 * hlK * e);
        g.beginPath();
        q.forEach((c, i) => (i ? g.lineTo(c.x, c.y) : g.moveTo(c.x, c.y)));
        g.closePath();
        g.stroke();
      }
    });
    // links (weights glow by magnitude)
    g.lineCap = 'round';
    net.links.forEach((gap, gi) => {
      const e = Math.min(enterL(gi), enterL(gi + 1)) * k * Math.min(dimOf(gi), dimOf(gi + 1));
      if (e <= 0) return;
      const fa = fall((dl[gi] + dl[gi + 1]) / 2);
      const fK = fw.map((a) => gapK(ctx, a.at, gi, L, false)).filter((u) => u >= 0);
      const bK = bp.map((a) => gapK(ctx, a.at, gi, L, true)).filter((u) => u >= 0);
      const hot = fK.length ? C.signal : bK.length ? C.warn : null;
      g.globalCompositeOperation = 'lighter';
      for (const ln of gap) {
        const a = P[gi][ln.a];
        const b = P[gi + 1][ln.b];
        if (!a.ok || !b.ok) continue;
        g.globalAlpha = 1;
        g.strokeStyle = rgba(hot ? mix(C.ink3, hot, 0.7) : mix(C.ink3, C.signal, ln.w * 0.85), (0.025 + 0.3 * ln.w * ln.w * ln.w) * e * fa * (hot ? (ln.w > 0.5 ? 2.4 : 1.4) : 1) * boost);
        g.lineWidth = 0.8 + 1.8 * ln.w * ln.w * ln.w;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      // travelling sparks along the strongest links
      const sparks = [...fK.map((u) => ({u, c: C.signal, back: false})), ...bK.map((u) => ({u, c: C.warn, back: true}))];
      for (const s of sparks) {
        if (s.u >= 1) continue;
        const strong = gap.filter((ln) => ln.w > 0.55).slice(0, 48);
        for (const ln of strong) {
          const a = P[gi][ln.a];
          const b = P[gi + 1][ln.b];
          const u = s.back ? 1 - s.u : s.u;
          const x = lerp(a.x, b.x, u);
          const y = lerp(a.y, b.y, u);
          blit(g, sprite(C.ink, 'core'), x, y, 5 + 3 * ln.w, 0.95 * e);
          blit(g, sprite(s.c, 'core'), x, y, 9 + 6 * ln.w, 0.95 * e);
          if (glow) blit(g, sprite(s.c, 'glow'), x, y, 26, 0.35 * e * glow);
        }
      }
    });
    // neurons, painted far to near; rim-lit discs (upper-right key light)
    const order = P.flatMap((ly, l) => ly.map((p, i) => ({l, i, p}))).sort((a, b) => b.p.d - a.p.d || a.l - b.l || a.i - b.i);
    for (const {l, i, p} of order) {
      const av = net.act[l][i]; // seeded resting activation: brighter cores read as stronger units (never a printed number)
      const e = enterL(l) * k * dimOf(l);
      if (e <= 0 || !p.ok) continue;
      const {f, b} = act(l);
      const c = b > f ? C.warn : C.signal;
      const heat = Math.max(f, b);
      const isHl = l === hlIdx;
      const fa = fall(p.d);
      const r = Math.max(5, 0.16 * p.s);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = e;
      g.fillStyle = C.panel;
      g.beginPath();
      g.arc(p.x, p.y, r, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = isHl ? 3 : 2;
      g.strokeStyle = isHl ? rgba(C.signal, hlK * 0.95 + 0.05) : rgba(mix(C.ink3, c, heat), 0.9 * fa);
      g.stroke();
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.strokeStyle = rgba(heat > 0 || isHl ? mix(C.ink, c, 0.45) : C.ink2, (0.85 * fa) * e);
      g.globalAlpha = 1;
      g.beginPath();
      g.arc(p.x, p.y, r, -1.35, -0.15); // the rim on the upper-right
      g.stroke();
      g.globalCompositeOperation = 'lighter';
      blit(g, sprite(heat > 0 ? c : av > 0.5 ? C.signal : C.ink2, 'dot'), p.x, p.y, r * 0.75, e * ((0.2 + 0.5 * av) * fa + 0.5 * heat));
      if (glow && heat <= 0 && av > 0.7) blit(g, sprite(C.signal, 'glow'), p.x, p.y, r * 2.6, e * fa * glow * 0.35 * av);
      if (glow && (heat > 0 || isHl)) blit(g, sprite(heat > 0 ? c : C.signal, 'glow'), p.x, p.y, r * 4, e * glow * Math.max(heat, isHl ? 0.5 * hlK : 0));
    }
    // text-safe (ADR-002): the set is cut out of every copy box, ours (analytic) and other layers' (settled)
    knockOut(g, [...chips.filter((c) => ctx.frame >= c.t0).map((c) => ({x: c.x, y: c.y, w: c.w, h: c.h})), ...foreign], ctx.fx);
  };

  return (
    <>
      <Origin oref={oref} />
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={draw} deps={[ctx.frame, k, props.layers.join(','), ctx.fx.id, boost, !!m, foreign]} />
      <Measure mref={mref} size={BASE}>
        {labels.map((t, i) => <MLabel key={i} text={t} size={BASE} />)}
      </Measure>
      {chips.map((c, i) => (
        <Chip key={i} ctx={ctx} id={`${ctx.id}:l${i}`} text={c.text} size={size} x={c.x} y={c.y} t0={c.t0} accent={i === hlIdx ? C.signal : undefined} color={i === hlIdx || hlIdx < 0 ? C.ink : C.ink2} overflow={fits[i].overflow} alpha={k} />
      ))}
    </>
  );
};

export const NeuralNet3D: DcComponent<Props> = {name: 'NeuralNet3D', Component: NeuralNet3DView, text: true, slot: 'full'};
