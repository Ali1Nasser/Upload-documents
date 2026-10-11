// HoloGrid (catalog: Space & 3D). A holographic grid floor or back wall (04 section 1.1 `--grid` 1 px lines; section 1.2 "background
// grid and haze (blurred, dim)"). A real perspective grid (the _space3d camera), not a 2D fake: lines recede to a horizon, fade
// with distance, and the floor drifts toward the camera (a marching flow, so linear drift is allowed; the RTL frame truck goes
// right -> left on the wall). Near lines pick up a faint emissive sheen (token mix toward `signal`); a haze band sits on the horizon.
// `pulse`: an emissive ring expands across the floor (or a scan band climbs the wall) every PULSE_S seconds, first on the
// layer anchor (RV1) or at the shot start when unanchored. No copy, so no text-safe hole is needed (it is not haze / particles).
// Tiers: lite = lines only at half resolution; standard = + sheen and horizon haze; hero = + bloom on the pulse.
import React from 'react';
import {C, type Fx} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FULL, SpaceCanvas, bloomOf, enterK, exitK, mix, project, rgba, secs, wrap, type Cam3, type V3} from '../_space3d/kit';
import {H, W} from '../../tokens';

const CELL = 1; // world units per grid cell
const PULSE_S = 4; // seconds between pulses (ambient rhythm, never an anchor)
const camFor = (surface: Props['surface'], t: number): Cam3 =>
  surface === 'floor'
    ? {yaw: 0.05 * Math.sin(t * 0.07), pitch: 0.2, dist: 7, fovDeg: 50, cx: W / 2, cy: H * 0.3, viewH: H, target: [0, 0, 0]}
    : {yaw: 0.18 + 0.03 * Math.sin(t * 0.06), pitch: 0.02, dist: 9, fovDeg: 50, cx: W / 2, cy: H / 2, viewH: H, target: [0, 0, 0]};

const line = (g: CanvasRenderingContext2D, c: Cam3, a: V3, b: V3, segs: number, style: (d: number) => [string, number] | null) => {
  // split long lines so the distance fade follows depth
  for (let i = 0; i < segs; i++) {
    const p = (k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    const p0 = project(c, p(i / segs));
    const p1 = project(c, p((i + 1) / segs));
    if (!p0.ok || !p1.ok) continue;
    const s = style((p0.d + p1.d) / 2);
    if (!s) continue;
    g.strokeStyle = s[0];
    g.lineWidth = s[1];
    g.beginPath();
    g.moveTo(p0.x, p0.y);
    g.lineTo(p1.x, p1.y);
    g.stroke();
  }
};

const drawGrid = (g: CanvasRenderingContext2D, p: Props, fx: Fx, t: number, k: number, pulseT: number | null, glowMod: number) => {
  const col = C[p.color];
  const sheen = fx.id === 'lite' ? 0 : 1;
  const accent = p.color === 'grid' ? C.signal : col;
  const c = camFor(p.surface, t);
  const fade = (d: number, near: number, far: number): number => Math.max(0, Math.min(1, (far - d) / (far - near)));
  const style = (d: number): [string, number] | null => {
    const f = fade(d, 3, p.surface === 'floor' ? 30 : 26);
    if (f <= 0.01) return null;
    const hot = sheen * Math.max(0, Math.min(1, (10 - d) / 7)) * 0.4;
    return [rgba(mix(col, accent, hot), Math.min(1, (0.55 + 0.45 * f) * f * k)), 1 + 1.2 * f];
  };
  g.lineCap = 'round';
  if (p.surface === 'floor') {
    const y = -1.4;
    const off = wrap(t * 0.35, CELL); // drift toward the camera
    for (let i = -22; i <= 22; i++) line(g, c, [i * CELL, y, 6], [i * CELL, y, -28], 10, style);
    for (let j = -28; j <= 6; j++) {
      const z = j * CELL + off;
      line(g, c, [-22, y, z], [22, y, z], 6, style);
    }
    if (sheen) {
      const hz = project(c, [0, y, -28]);
      const band = g.createLinearGradient(0, hz.y - 90, 0, hz.y + 90);
      band.addColorStop(0, rgba(accent, 0));
      band.addColorStop(0.5, rgba(accent, fx.haze * 1.4 * k * (1 + glowMod)));
      band.addColorStop(1, rgba(accent, 0));
      g.fillStyle = band;
      g.fillRect(FULL.x, hz.y - 90, FULL.w, 180);
    }
    if (pulseT !== null) {
      const u = wrap(pulseT, PULSE_S) / PULSE_S; // 0..1 through one pulse
      const R = 0.5 + u * 18;
      const a = (1 - u) * k;
      const pts: {x: number; y: number}[] = [];
      for (let s = 0; s <= 96; s++) {
        const q = project(c, [Math.cos((s / 96) * 2 * Math.PI) * R, y, Math.sin((s / 96) * 2 * Math.PI) * R - 2]);
        if (q.ok) pts.push(q);
      }
      const ring = (w: number, al: number) => {
        g.strokeStyle = rgba(accent, al);
        g.lineWidth = w;
        g.beginPath();
        pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
        g.stroke();
      };
      const b = bloomOf(fx);
      if (b) ring(fx.glowInner * 1.6, 0.12 * a * b);
      ring(2.2, 0.7 * a);
    }
  } else {
    const z = 0;
    const off = wrap(t * 0.25, CELL); // slow truck right -> left
    for (let i = -24; i <= 24; i++) {
      const x = i * CELL - off;
      line(g, c, [x, -10, z], [x, 10, z], 8, style);
    }
    for (let j = -10; j <= 10; j++) line(g, c, [-24, j * CELL, z], [24, j * CELL, z], 12, style);
    if (pulseT !== null) {
      const u = wrap(pulseT, PULSE_S) / PULSE_S;
      const yy = -6 + u * 12;
      const a = Math.sin(Math.PI * u) * k;
      const q0 = project(c, [-24, yy, z]);
      const q1 = project(c, [24, yy, z]);
      const b = bloomOf(fx);
      const band = (w: number, al: number) => {
        g.strokeStyle = rgba(accent, al);
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(q0.x, q0.y);
        g.lineTo(q1.x, q1.y);
        g.stroke();
      };
      if (b) band(fx.glowPx, 0.1 * a * b);
      band(2, 0.6 * a);
    }
  }
};

export const HoloGridView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const k = enterK(ctx) * exitK(ctx);
  const t = secs(ctx);
  const pulseT = props.pulse && ctx.frame >= ctx.at ? (ctx.frame - ctx.at) / ctx.fps : null;
  return (
    <SpaceCanvas
      fx={ctx.fx}
      frame={ctx.frame}
      draw={(g) => k > 0 && drawGrid(g, props, ctx.fx, t, k, pulseT, ctx.mod.glow)}
      deps={[ctx.frame, k, props.surface, props.color, props.pulse, ctx.fx.id, ctx.mod.glow]}
    />
  );
};

export const HoloGrid: DcComponent<Props> = {name: 'HoloGrid', Component: HoloGridView, slot: 'full'};
