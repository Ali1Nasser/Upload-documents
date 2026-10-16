// Pulse (catalog: State & FX). Pulses a target layer 1-4 times (04 §6: "each light pulses as the narrator names it").
// The target breathes (scale 1 -> 1.05 -> 1 about its own centre, capped by the room its copy has inside title-safe) while its
// plate lights up as a lit object: an outer light swell (box-shadow, outside the outline only, never a fill over the copy), a rim
// with a specular key-light edge on its top (ADR-003 LK-F), and emissive rings in the chosen token colour that expand from the
// outline and fade. Standard / hero add a trailing second ring, a floor pool under the target and seeded sparks that leave the
// ring (<= 20 small dots, far below FX[tier].particles); hero adds a third ring and a wider swell. No WebGL: identical at every
// tier except ring / spark count and glow radius, so no separate fallback is needed. Lite = one ring + swell + rim.
// One pulse per beat (morph upper bound, 500 ms) = 2 per second, under the WCAG 2.3.1 limit of 3 flashes per second.
// The first pulse starts ON the anchor frame (RV1 via revealProgress). The target is driven through _fx-a/drive.ts (no copy of
// its own: nothing here is text; remotion `random` only).
import React from 'react';
import {hex} from '../../fx/look';
import {C} from '../../tokens';
import {ease, revealProgress} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import {IDENTITY, useFxTarget} from '../_fx-a/drive';
import {abs, beat, boxGlow, exitK, pad, rnd} from '../_fx-a/kit';
import type {Props} from './schema';

const SCALE_PEAK = 0.05;
const RING_GROW_PX = 46;
const RIM_PAD = 10; // rim and rings sit this far outside the target's drawn leaves
const LAG = 0.28; // trailing ring starts this fraction of a beat later
const SPARK_TRAVEL = 52; // px a spark leaves the ring (kept short: clear of neighbouring copy)

/** Pulse state `t` frames after the anchor: index of the running pulse, its eased progress p (0..1), the linear phase u and the breath. */
export const pulseAt = (t: number, fps: number, times: number): {k: number; p: number; u: number; tk: number; bump: number} | null => {
  const P = beat(fps);
  if (t < 0 || t >= P * times) return null;
  const k = Math.floor(t / P);
  const tk = t - k * P;
  const u = revealProgress(tk, P, (x) => x); // RV1 phase: > 0 on the pulse's first frame
  return {k, p: revealProgress(tk, P, ease.arrive), u, tk, bump: Math.sin(Math.PI * u)};
};

/** Largest breath scale that keeps the target's copy inside title-safe (room is per side, px; Infinity = no copy). */
const peakScale = (r: Rect, room: {l: number; r: number; t: number; b: number}): number => {
  const sx = (2 * Math.min(room.l, room.r)) / Math.max(1, r.w);
  const sy = (2 * Math.min(room.t, room.b)) / Math.max(1, r.h);
  return Math.max(0, Math.min(SCALE_PEAK, sx, sy));
};

/** Distance from the centre of `r` to its outline along unit direction (dx, dy). */
const edge = (r: Rect, dx: number, dy: number): number => Math.min((r.w / 2) / Math.max(0.001, Math.abs(dx)), (r.h / 2) / Math.max(0.001, Math.abs(dy)));

type Tier = LayerCtx['fx'];
const sparkCount = (fx: Tier): number => (fx.id === 'lite' ? 0 : Math.min(fx.id === 'hero' ? 20 : 12, Math.floor(fx.particles / 70)));

/** One expanding emissive ring (outline only). `q` = ring progress 0..1 (eased), `a` = overall strength. */
const Ring: React.FC<{r: Rect; q: number; a: number; col: string; fx: Tier; grow: number}> = ({r, q, a, col, fx, grow}) => {
  if (q <= 0 || q >= 1 || a <= 0.01) return null;
  const R = pad(r, RIM_PAD + grow * RING_GROW_PX * q);
  const op = Math.min(1, (1 - q) * 0.95 * a);
  return (
    <div
      style={{
        ...abs(R),
        borderRadius: 14 + grow * RING_GROW_PX * q * 0.5,
        border: `${((3 * (1 - q) + 1) * Math.max(0.6, grow)).toFixed(2)}px solid ${col}`,
        borderTopColor: `color-mix(in srgb, ${col} 55%, ${C.ink})`, // specular edge on the key-lit side
        opacity: op,
        boxShadow: fx.id === 'lite' ? undefined : boxGlow(col, fx, 0.8 * grow),
      }}
    />
  );
};

export const PulseView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const st = pulseAt(ctx.frame - ctx.at, ctx.fps, props.times);
  const bump = st ? st.bump : 0; // breath: a half sine over the beat (no pop on the anchor frame)
  const {ref, m} = useFxTarget(props.to, ctx.frame, `pulse:${ctx.id}`, (mm) => {
    if (!st) return null;
    const s = 1 + peakScale(mm.rect, mm.room) * bump;
    return {...IDENTITY, sx: s, sy: s};
  });
  const col = C[props.color];
  const fx = ctx.fx;
  const lite = fx.id === 'lite';
  const hero = fx.id === 'hero';
  const r = m?.rect;
  const k = exitK(ctx);
  const rings: React.ReactNode[] = [];
  const sparks: React.ReactNode[] = [];
  if (st && r) {
    const P = beat(ctx.fps);
    const lag = LAG * P;
    rings.push(<Ring key="r1" r={r} q={revealProgress(st.tk, P, ease.camera)} a={1} col={col} fx={fx} grow={1} />);
    if (!lite && st.tk >= lag) rings.push(<Ring key="r2" r={r} q={revealProgress(st.tk - lag, P - lag, ease.camera)} a={0.7} col={col} fx={fx} grow={0.7} />);
    if (hero && st.tk >= 2 * lag) rings.push(<Ring key="r3" r={r} q={revealProgress(st.tk - 2 * lag, P - 2 * lag, ease.camera)} a={0.45} col={col} fx={fx} grow={0.45} />);
    // seeded sparks that leave the outline along random directions, fading as they travel
    const n = sparkCount(fx);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    for (let i = 0; i < n; i++) {
      const ang = rnd(ctx.id, 'a', st.k, i) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const d = edge(r, dx, dy) + RIM_PAD + 4 + SPARK_TRAVEL * (0.4 + 0.6 * rnd(ctx.id, 'd', st.k, i)) * st.p;
      const sz = 4 + rnd(ctx.id, 's', st.k, i) * 4;
      const life = Math.sin(Math.PI * Math.min(1, st.u * 1.05)) * 0.9;
      sparks.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cx + dx * d - sz / 2,
            top: cy + dy * d - sz / 2,
            width: sz,
            height: sz,
            borderRadius: sz,
            background: i % 3 ? col : C.ink,
            boxShadow: `0 0 ${sz * 1.6}px ${col}`,
            opacity: life,
          }}
        />,
      );
    }
  }
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: k}}>
      {st && r ? (
        <>
          {/* floor pool: a flat light ellipse on the plane under the target (depth cue; below the outline, clear of the copy) */}
          {lite ? null : (
            <div
              style={{
                position: 'absolute',
                left: r.x - r.w * 0.1,
                width: r.w * 1.2,
                top: r.y + r.h + RIM_PAD + 6,
                height: Math.min(64, r.h * 0.35),
                borderRadius: '50%',
                background: `radial-gradient(ellipse at 50% 30%, ${col}${hex(0.5 * st.bump)} 0%, ${col}${hex(0.15 * st.bump)} 45%, transparent 72%)`,
              }}
            />
          )}
          {/* outer light swell: transparent box, so the glow is drawn outside the outline only (never over the copy) */}
          <div style={{...abs(pad(r, RIM_PAD)), borderRadius: 14, boxShadow: `0 0 ${(fx.glowPx * (hero ? 1.5 : 1) * (0.4 + 1.1 * bump)).toFixed(1)}px ${col}${hex(0.55 * bump)}`}} />
          {/* rim that follows the breath: hairline plate edge, brighter on the key-lit top edge */}
          <div
            style={{
              ...abs(pad(r, RIM_PAD)),
              borderRadius: 14,
              border: `2px solid ${col}${hex(0.35 + 0.5 * bump)}`,
              borderTopColor: `color-mix(in srgb, ${col} 55%, ${C.ink})`,
              boxShadow: `inset 0 0 ${(fx.glowPx * bump).toFixed(1)}px ${col}${hex(0.22 * bump)}`,
            }}
          />
          {rings}
          {sparks}
        </>
      ) : null}
    </div>
  );
};

export const Pulse: DcComponent<Props> = {name: 'Pulse', Component: PulseView, slot: 'full'};
