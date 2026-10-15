// InferenceCore (catalog: Space & 3D). The model core (04 section 6; also the CPU in "What a computer does"): a faux-3D sphere with a
// rim light from the upper right (04 section 1.2), meridian wires that turn, a segmented load ring around it and, per state:
//   idle       slow breathing, ink-grey wires, the ring dim;
//   thinking   `signal`: three orbit arcs spin up around the core, the meridians turn faster, the core pulses;
//   streaming  `signal`, brightest: tokens leave the core as marching bars along a lane toward the reading end (left for the RTL frame);
//   error      `crit`: the core cracks (jagged radial lines), the ring breaks into gaps and the whole core shakes 2-3 px (a failure
//              shake is the one allowed hard motion, 04 section 2; amplitude <= IMPACT.nudgePxMax).
// `load` (0..1) lights that fraction of the 48-segment ring; no figure is printed (a number would need a ref).
// setState {state}: on its word (RV1) the core crossfades from the current state to the new one over the morph length; every
//   angle is blended from per-state integrals so a change never jumps. `label` is one chip under the ring (whole string).
// Tiers: lite flat; standard + glow halos; hero + bloom. Glow is masked out of the label (text-safe). AudioReactive: mod.glow / mod.scale.
import React from 'react';
import {random} from 'remotion';
import {C, IMPACT, SIZE} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, Measure, MLabel, SpaceCanvas, actionsOf, blit, bloomOf, chipH, chipW, enterK, exitK, ff, fitTo, lerp, mix, moveK, rgba, secs, sprite, useMeasure, useOverflow} from '../_space3d/kit';

type St = Props['state'];
type Look = {col: string; spin: number; breathe: number; ring: number; orbit: number; stream: number; crack: number; bright: number};
const LOOK: Record<St, Look> = {
  idle: {col: C.ink2, spin: 0.25, breathe: 0.05, ring: 0.45, orbit: 0, stream: 0, crack: 0, bright: 0.55},
  thinking: {col: C.signal, spin: 1.1, breathe: 0.09, ring: 1, orbit: 1, stream: 0, crack: 0, bright: 1},
  streaming: {col: C.signal, spin: 0.7, breathe: 0.05, ring: 1, orbit: 0.4, stream: 1, crack: 0, bright: 1.25},
  error: {col: C.crit, spin: 0.05, breathe: 0.02, ring: 0.7, orbit: 0, stream: 0, crack: 1, bright: 0.9},
};
const SEG = 48;

/** State timeline: the initial state from the anchor, then each setState on its word. */
export const stateTrack = (props: Props, ctx: DcProps<Props>['ctx']): {s: St; t: number}[] => [
  {s: props.state, t: -1e9},
  ...actionsOf(ctx, 'setState').map((a) => ({s: (a.props as {state: St}).state, t: a.at})),
];

export const InferenceCoreView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const [mref, m] = useMeasure(ctx.id, props.label ?? '');
  const box = ctx.box;
  const k = enterK(ctx, 'morph') * exitK(ctx);
  const bloom = bloomOf(ctx.fx);
  const track = stateTrack(props, ctx).filter((x) => x.t <= ctx.frame);
  const cur = track[track.length - 1];
  const prev = track.length > 1 ? track[track.length - 2] : cur;
  const p = track.length > 1 ? moveK(ctx, cur.t, 7) : 1;
  const A = LOOK[prev.s];
  const B = LOOK[cur.s];
  const bl = (f: (l: Look) => number) => lerp(f(A), f(B), p);
  const t = secs(ctx);
  const col = mix(A.col, B.col, p);
  const labelH = props.label ? chipH(props.label, SIZE.label) + 24 : 0;
  const R = Math.min(230, Math.min(box.w / 1.6, box.h - labelH) / 2 / 1.62);
  const cx = box.x + box.w / 2;
  const cy = box.y + (box.h - labelH) / 2;
  const mod = ctx.mod;
  const shakeAmp = bl((l) => l.crack) * IMPACT.nudgePxMax * 0.75;
  const sx = shakeAmp * (random(`ic${ctx.frame}x`) - 0.5) * 2;
  const sy = shakeAmp * (random(`ic${ctx.frame}y`) - 0.5) * 2;
  const fit = m && props.label ? fitTo(SIZE.label, m.w[0], box.w * 0.7, SIZE.labelMin) : {size: SIZE.label, overflow: false};
  useOverflow(ctx.id, fit.overflow, {label: props.label});

  const draw = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    const x0 = cx + sx;
    const y0 = cy + sy;
    const pulse = 1 + bl((l) => l.breathe) * Math.sin(t * Math.PI * 2 * (0.5 + 0.8 * bl((l) => l.orbit))) + 0.06 * mod.scale;
    const r = R * pulse * k;
    const bright = bl((l) => l.bright) * (1 + 0.5 * mod.glow);
    const spin = lerp(secs(ctx) * A.spin, secs(ctx) * B.spin, p) * Math.PI;
    g.lineCap = 'round';
    // outer glow
    g.globalCompositeOperation = 'lighter';
    if (bloom) blit(g, sprite(col, 'glow'), x0, y0, r * 3.2, 0.5 * bright * k * bloom);
    else if (ctx.fx.id !== 'lite') blit(g, sprite(col, 'glow'), x0, y0, r * 2.4, 0.35 * bright * k);
    g.globalCompositeOperation = 'source-over';
    // load ring: 48 segments, lit fraction = load; error leaves gaps
    const lit = Math.round(props.load * SEG);
    const rr = r * 1.55;
    for (let i = 0; i < SEG; i++) {
      const a0 = -Math.PI / 2 - (i / SEG) * Math.PI * 2; // clockwise reads against the RTL frame: fills counter-clockwise from the top
      const broken = bl((l) => l.crack) > 0.5 && random(`ic${i}gap`) < 0.3;
      const on = i < lit && !broken;
      g.strokeStyle = on ? rgba(col, (0.35 + 0.6 * bl((l) => l.ring)) * k) : rgba(C.grid, 0.9 * k);
      g.lineWidth = on ? 9 : 5;
      g.beginPath();
      g.arc(x0, y0, rr, a0 - 0.035, a0 - (Math.PI * 2) / SEG + 0.035, true);
      g.stroke();
    }
    // orbit arcs (thinking)
    const orb = bl((l) => l.orbit);
    if (orb > 0.02)
      for (let j = 0; j < 3; j++) {
        const ro = r * (1.2 + 0.12 * j);
        const a = spin * (1.4 + 0.5 * j) * (j % 2 ? -1 : 1) + j * 2.1;
        g.strokeStyle = rgba(col, (0.85 - 0.2 * j) * orb * k);
        g.lineWidth = 4 - j;
        g.beginPath();
        g.arc(x0, y0, ro, a, a + 1.1 + 0.3 * j);
        g.stroke();
      }
    // the sphere: dark body with a rim light from the upper right, then the glowing core
    const body = g.createRadialGradient(x0 + r * 0.38, y0 - r * 0.38, r * 0.05, x0, y0, r);
    body.addColorStop(0, rgba(mix(C.panel, col, 0.55 * Math.min(1, bright)), 1));
    body.addColorStop(0.55, rgba(mix(C.ground, col, 0.18 * bright), 1));
    body.addColorStop(1, rgba(C.void, 1));
    g.fillStyle = body;
    g.beginPath();
    g.arc(x0, y0, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba(col, (0.5 + 0.4 * Math.min(1, bright)) * k);
    g.lineWidth = 3;
    g.stroke();
    // turning meridians (wireframe sphere)
    g.lineWidth = 2;
    for (let j = 0; j < 4; j++) {
      const ph = spin + (j * Math.PI) / 4;
      g.strokeStyle = rgba(mix(col, C.ink, 0.25), (0.18 + 0.22 * Math.abs(Math.cos(ph))) * k * Math.min(1, bright + 0.3));
      g.beginPath();
      g.ellipse(x0, y0, Math.max(1, r * Math.abs(Math.cos(ph))), r, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.ellipse(x0, y0, r, r * 0.28, 0, 0, Math.PI * 2);
    g.stroke();
    g.globalCompositeOperation = 'lighter';
    blit(g, sprite(col, 'core'), x0 + r * 0.12, y0 - r * 0.12, r * 0.7, Math.min(1, 0.55 * bright) * k);
    g.globalCompositeOperation = 'source-over';
    // error: jagged cracks
    const cr = bl((l) => l.crack);
    if (cr > 0.02) {
      g.strokeStyle = rgba(C.crit, cr * k);
      g.lineWidth = 3;
      for (let j = 0; j < 7; j++) {
        let a = (j / 7) * Math.PI * 2 + random('iccr') * 0.5;
        let x = x0;
        let y = y0;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
          a += (random(`iccr${j}:${s}`) - 0.5) * 1.1;
          const len = (r * (0.22 + 0.1 * random(`iccl${j}:${s}`))) * cr;
          x += Math.cos(a) * len;
          y += Math.sin(a) * len;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    // streaming: bars leave the core along the reading direction (left); marching flow, linear drift allowed
    const st = bl((l) => l.stream);
    if (st > 0.02) {
      const n = Math.min(ctx.fx.particles, 36);
      for (let i = 0; i < n; i++) {
        const sp = 0.6 + random(`icst${i}s`);
        const u = (((t * 0.55 * sp + random(`icst${i}o`)) % 1) + 1) % 1;
        const lane = (Math.floor(random(`icst${i}l`) * 5) - 2) * 18;
        const x = x0 - r * 0.9 - u * (cx - box.x - r * 0.9);
        const a = Math.sin(Math.PI * Math.min(1, u * 1.15)) * st * k;
        g.fillStyle = rgba(i % 5 === 0 ? C.ink : col, 0.9 * a);
        g.fillRect(x - 10 - 12 * sp, y0 + lane - 3, 14 + 18 * sp, 6);
        if (bloom && i % 3 === 0) blit(g, sprite(col, 'glow'), x, y0 + lane, 22, 0.3 * a * bloom);
      }
    }
  };
  const w = props.label && m ? chipW(m.w[0], SIZE.label, fit.size) : 0;
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={draw} deps={[ctx.frame, k, props.load, props.state, ctx.fx.id, mod.glow, mod.scale, R]} textSafe />
      <Measure mref={mref} size={SIZE.label}>
        <MLabel text={props.label ?? '-'} size={SIZE.label} />
      </Measure>
      {props.label && m ? (
        <Chip ctx={ctx} id={`${ctx.id}:label`} text={props.label} size={fit.size} x={cx - w / 2} y={cy + R * 1.55 + 40} t0={ctx.at + ff(3, ctx.fps)} accent={col} overflow={fit.overflow} alpha={k} />
      ) : null}
    </>
  );
};

export const InferenceCore: DcComponent<Props> = {name: 'InferenceCore', Component: InferenceCoreView, text: true, slot: 'center'};
