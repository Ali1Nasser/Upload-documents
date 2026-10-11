// ParticleField (catalog: Space & 3D). Seeded ambient particles on a depth continuum (far: small + dim; near: brighter; the
// nearest few become soft bokeh discs where the tier has bokeh), drifting right -> left (the RTL frame's flow direction).
// Kinds (04 section 1.2 "point sprites for data", section 2 "no linear motion except marching flows"):
//   dust:   slow drift + twinkle, mostly neutral ink (decoration stays low-saturation, 04 section 1.1), a share in `color`;
//   data:   marching streaks on quantised lanes (a flow, so linear motion is allowed);
//   sparks: rising embers with a flicker life cycle;
//   snow:   slow fall with sway, neutral ink.
// Count = min(count, FX[tier].particles) (lite 300, standard / hero 1,500 on swiftshader, ADR-002). Text-safe (ADR-002): every
// visible copy box on screen (+ tier padding) is cut out of the field on the settled frame (_space3d useTextSafe).
// Tiers: lite = flat dots at half resolution; standard = + halos on the nearer half; hero = + brighter bloom sprites.
// Enter: unanchored -> present from the shot start; anchored -> arrive fade from the anchor frame (RV1). Exit after `until`.
import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FULL, SpaceCanvas, blit, bloomOf, enterK, exitK, gauss, secs, sprite, wrap} from '../_space3d/kit';

type P = {x: number; y: number; z: number; ph: number; sp: number; tint: boolean; br: number};
const field = (n: number, seed: number): P[] =>
  Array.from({length: n}, (_, i) => {
    const s = `pf${seed}:${i}`;
    return {
      x: random(`${s}x`) * FULL.w,
      y: random(`${s}y`) * FULL.h,
      z: Math.pow(random(`${s}z`), 1.6), // more far particles than near ones
      ph: random(`${s}p`) * Math.PI * 2,
      sp: 0.5 + random(`${s}s`),
      tint: random(`${s}t`) < 0.32,
      br: Math.min(1.6, 0.6 + Math.abs(gauss(`${s}b`)) * 0.4),
    };
  });

export const ParticleFieldView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = Math.min(props.count, ctx.fx.particles);
  const pts = useMemo(() => field(n, props.seed), [n, props.seed]);
  const col = C[props.color];
  const k = enterK(ctx) * exitK(ctx);
  const t = secs(ctx);
  const glow = bloomOf(ctx.fx);
  const bokehMax = ctx.fx.bokeh; // near discs only where the tier has bokeh
  const boost = 1 + 0.8 * ctx.mod.particles + 0.4 * ctx.mod.glow;
  const draw = (g: CanvasRenderingContext2D) => {
    if (k <= 0) return;
    g.globalCompositeOperation = 'lighter';
    let near = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const c = props.kind === 'snow' ? C.ink : props.kind === 'dust' && !p.tint ? (p.z > 0.5 ? C.ink2 : C.ink3) : col;
      let x = p.x;
      let y = p.y;
      let a = 0.25 + 0.55 * p.z;
      const r = 0.9 + 2.6 * p.z * p.z;
      if (props.kind === 'dust') {
        x = wrap(p.x - t * (5 + 14 * p.z) * p.sp, FULL.w);
        y = wrap(p.y + Math.sin(t * 0.6 * p.sp + p.ph) * 7, FULL.h);
        a *= 0.55 + 0.45 * Math.sin(t * 1.3 * p.sp + p.ph * 3) ** 2;
      } else if (props.kind === 'data') {
        const lane = Math.round(p.y / 22) * 22;
        x = wrap(p.x - t * (60 + 200 * p.z) * p.sp, FULL.w);
        y = lane;
        const len = 6 + 40 * p.z * p.sp;
        g.globalAlpha = Math.min(1, a * 0.7 * k * boost);
        g.strokeStyle = c;
        g.lineWidth = 0.8 + 1.6 * p.z;
        g.beginPath();
        g.moveTo(FULL.x + x, FULL.y + y);
        g.lineTo(FULL.x + x + len, FULL.y + y);
        g.stroke();
      } else if (props.kind === 'sparks') {
        const life = 2.2 + 2.4 * p.sp;
        const u = wrap(t / life + p.ph / (Math.PI * 2), 1); // 0..1 through the spark's life
        y = wrap(p.y - t * (30 + 70 * p.z) * p.sp, FULL.h);
        x = wrap(p.x + Math.sin(t * 1.7 + p.ph) * 10 - t * 6, FULL.w);
        a *= Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(t * 19 * p.sp + p.ph));
      } else {
        y = wrap(p.y + t * (14 + 30 * p.z) * p.sp, FULL.h);
        x = wrap(p.x + Math.sin(t * 0.8 * p.sp + p.ph) * 14 - t * 3, FULL.w);
        a *= 0.8;
      }
      const X = FULL.x + x;
      const Y = FULL.y + y;
      const A = a * k * boost;
      if (p.z > 0.86 && near < bokehMax) {
        near++;
        blit(g, sprite(c, 'bokeh'), X, Y, 10 + 154 * (p.z - 0.86) * p.br, A * 0.16);
        continue;
      }
      blit(g, sprite(c, 'dot'), X, Y, r * 1.6, A);
      if (glow && p.z > 0.55) blit(g, sprite(c, 'glow'), X, Y, r * 5, A * 0.35 * glow);
    }
  };
  return <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={draw} deps={[ctx.frame, k, n, props.kind, props.color, ctx.fx.id, boost]} textSafe />;
};

export const ParticleField: DcComponent<Props> = {name: 'ParticleField', Component: ParticleFieldView, slot: 'full'};
