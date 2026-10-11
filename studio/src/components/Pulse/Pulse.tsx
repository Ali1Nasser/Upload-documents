// Pulse (catalog: State & FX). Pulses a target layer 1-4 times: the target breathes (scale 1 -> 1.05 -> 1 about its own centre)
// while an emissive ring in the chosen token colour expands from its outline and fades (04 §6: "each light pulses as the narrator
// names it"). One pulse per beat (morph upper bound, 500 ms) = 2 per second, under the WCAG 2.3.1 limit of 3 flashes per second.
// The first pulse starts ON the anchor frame (RV1 via revealProgress). The target is driven through _fx-a/drive.ts (no copy of
// its own: nothing here is text).
import React from 'react';
import {hex} from '../../fx/look';
import {C} from '../../tokens';
import {ease, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, useFxTarget} from '../_fx-a/drive';
import {abs, beat, boxGlow, exitK, pad} from '../_fx-a/kit';
import type {Props} from './schema';

const SCALE_PEAK = 0.05;
const RING_GROW_PX = 46;

/** Pulse state `t` frames after the anchor: index of the running pulse and its progress p (0..1), or null. */
export const pulseAt = (t: number, fps: number, times: number): {k: number; p: number; bump: number} | null => {
  const P = beat(fps);
  if (t < 0 || t >= P * times) return null;
  const k = Math.floor(t / P);
  const u = revealProgress(t - k * P, P, (x) => x); // RV1 phase: > 0 on the pulse's first frame
  return {k, p: revealProgress(t - k * P, P, ease.arrive), bump: Math.sin(Math.PI * u)};
};

export const PulseView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const st = pulseAt(ctx.frame - ctx.at, ctx.fps, props.times);
  const bump = st ? st.bump : 0; // breath: a half sine over the beat (no pop on the anchor frame)
  const {ref, m} = useFxTarget(props.to, ctx.frame, `pulse:${ctx.id}`, () => (st ? {...IDENTITY, sx: 1 + SCALE_PEAK * bump, sy: 1 + SCALE_PEAK * bump} : null));
  const col = C[props.color];
  const r = m?.rect ?? ctx.box;
  const k = exitK(ctx);
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: k}}>
      {st && m ? (
        <>
          {/* expanding ring (outline only, never a fill over the target's copy) */}
          <div
            style={{
              ...abs(pad(r, 10 + RING_GROW_PX * st.p)),
              borderRadius: 14 + RING_GROW_PX * st.p * 0.5,
              border: `${(3 * (1 - st.p) + 1).toFixed(2)}px solid ${col}`,
              opacity: (1 - st.p) * 0.95,
              boxShadow: ctx.fx.id === 'lite' ? undefined : boxGlow(col, ctx.fx, 0.8),
            }}
          />
          {/* inner rim light that follows the breath */}
          <div style={{...abs(pad(r, 8)), borderRadius: 12, border: `2px solid ${col}${hex(0.55 * bump)}`, boxShadow: `inset 0 0 ${(ctx.fx.glowPx * bump).toFixed(1)}px ${col}${hex(0.25 * bump)}`}} />
        </>
      ) : null}
    </div>
  );
};

export const Pulse: DcComponent<Props> = {name: 'Pulse', Component: PulseView, slot: 'full'};
