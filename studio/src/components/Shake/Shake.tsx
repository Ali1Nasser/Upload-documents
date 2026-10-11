// Shake (catalog: State & FX). The failure shake: the only hard (un-eased) motion in the film (04 §3.5 exit, §6 failure beats).
// The target layer (`to`), or every other layer of the shot when `to` is absent (whole-frame shake), jumps to a new seeded offset
// on every film frame for one settle length (exit upper bound, 400 ms), with a linear decay from `amplitude_px` (<= 12 px, schema).
// Mostly horizontal (y = 35 % of x). The first offset lands ON the anchor frame at full amplitude (RV1). Offsets are clamped so the
// target's copy never leaves title-safe (the post-layout check reads the shaken position). Draws nothing itself.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, clampToRoom, useFxTarget} from '../_fx-a/drive';
import {filmIx, rnd, settleLen} from '../_fx-a/kit';
import type {Props} from './schema';

const Y_SHARE = 0.35;

/** Shake offset `t` frames after the anchor (px at 1080p), before the title-safe clamp; null outside the window. */
export const shakeAt = (t: number, fps: number, amp: number, seed: string): [number, number] | null => {
  const n = settleLen(fps);
  if (t < 0 || t >= n) return null;
  const decay = 1 - t / n;
  const i = filmIx(t, fps);
  const sgn = i % 2 === 0 ? 1 : -1; // alternate sides so every step reads as a jolt, never a drift
  const x = sgn * amp * decay * (0.65 + 0.35 * rnd(seed, 'x', i));
  const y = amp * decay * Y_SHARE * (rnd(seed, 'y', i) * 2 - 1);
  return [x, y];
};

export const ShakeView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const off = shakeAt(ctx.frame - ctx.at, ctx.fps, props.amplitude_px, `shake:${ctx.id}`);
  const {ref} = useFxTarget(props.to ?? '*', ctx.frame, `shake:${ctx.id}`, (m) => {
    if (!off) return null;
    const [tx, ty] = clampToRoom(off[0], off[1], m.room);
    return {...IDENTITY, tx, ty};
  });
  return <div ref={ref} style={{position: 'absolute', width: 0, height: 0}} />;
};

export const Shake: DcComponent<Props> = {name: 'Shake', Component: ShakeView, slot: 'full'};
