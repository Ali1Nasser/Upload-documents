// Shake (catalog: State & FX). The failure shake: the only hard (un-eased) motion in the film (04 §3.5 exit, §6 failure beats).
// The target layer (`to`), or every other layer of the shot when `to` is absent (whole-frame shake), jumps to a new seeded offset
// on every film frame for one settle length (exit upper bound, 400 ms), with a linear decay from `amplitude_px` (<= 12 px, schema).
// Mostly horizontal (y = 35 % of x). The first offset lands ON the anchor frame at full amplitude (RV1). Offsets are clamped so the
// target's copy never leaves title-safe (the post-layout check reads the shaken position). With a `to` target it also leaves the
// light of the jolt behind (ADR-003 LK-F): the target's REST position stays as a crit hairline outline (rim, key-lit top edge) with a
// decaying outer swell, plus (standard / hero) a floor pool under the rest box, so a still taken mid-shake shows how far the layer
// was thrown. One decaying flash per shake (WCAG 2.3.1). No copy, no WebGL (identical at every tier except swell / pool), remotion
// `random` only.
import React, {useRef, useState} from 'react';
// @ts-ignore -- react-dom ships no type declarations in this tree (no @types/react-dom); flushSync is the stable React 18 API
import {flushSync} from 'react-dom';
import {hex} from '../../fx/look';
import {C} from '../../tokens';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, clampToRoom, paintedRect, useFxTarget} from '../_fx-a/drive';
import {abs, exitK, filmIx, pad, rnd, settleLen} from '../_fx-a/kit';
import type {Props} from './schema';

const Y_SHARE = 0.35;
const RIM_PAD = 4; // rest outline sits this far outside the target's painted extent (its plate), clear of its copy

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
  const t = ctx.frame - ctx.at;
  const off = shakeAt(t, ctx.fps, props.amplitude_px, `shake:${ctx.id}`);
  const applied = useRef<[number, number]>([0, 0]); // the clamped offset written to the target this frame
  const [box, setBox] = useState<Rect | null>(null); // the target's REST extent incl. its plate (painted containers), layer px
  const {ref} = useFxTarget(
    props.to ?? '*',
    ctx.frame,
    `shake:${ctx.id}`,
    (mm) => {
      if (!off) return (applied.current = [0, 0]), null;
      const [tx, ty] = clampToRoom(off[0], off[1], mm.room);
      applied.current = [tx, ty];
      return {...IDENTITY, tx, ty};
    },
    (i) => {
      // after the drive is applied: the painted extent reads the SHAKEN target, so take the applied offset back out
      const p = props.to && off ? paintedRect(i) : null;
      const rest = p ? {x: p.x - applied.current[0], y: p.y - applied.current[1], w: p.w, h: p.h} : null;
      const same = (!rest && !box) || (!!rest && !!box && (['x', 'y', 'w', 'h'] as const).every((k) => Math.abs(rest[k] - box[k]) < 0.05));
      if (!same) flushSync(() => setBox(rest));
    },
  );
  const fx = ctx.fx;
  const n = settleLen(ctx.fps);
  const r = props.to ? box : null; // whole-frame shake (no `to`) has no single box to mark
  const decay = off ? 1 - t / n : 0; // linear, 1 on the anchor frame (RV1)
  const col = C.crit;
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: exitK(ctx)}}>
      {off && r ? (
        <>
          {fx.id === 'lite' ? null : (
            <div
              style={{
                position: 'absolute',
                left: r.x - r.w * 0.08,
                width: r.w * 1.16,
                top: r.y + r.h + RIM_PAD + 6,
                height: Math.min(56, r.h * 0.3),
                borderRadius: '50%',
                background: `radial-gradient(ellipse at 50% 30%, ${col}${hex(0.42 * decay)} 0%, ${col}${hex(0.12 * decay)} 45%, transparent 72%)`,
              }}
            />
          )}
          {/* outer swell: transparent box, so the light falls outside the rest outline only (never over the copy) */}
          <div style={{...abs(pad(r, RIM_PAD)), borderRadius: 14, boxShadow: `0 0 ${(fx.glowPx * (fx.id === 'hero' ? 1.4 : 1) * (0.3 + 0.9 * decay)).toFixed(1)}px ${col}${hex(0.5 * decay)}`}} />
          {/* rest-position rim: hairline, brighter on the key-lit top edge */}
          <div
            style={{
              ...abs(pad(r, RIM_PAD)),
              borderRadius: 14,
              border: `2px solid ${col}${hex(0.3 + 0.55 * decay)}`,
              borderTopColor: `color-mix(in srgb, ${col} 55%, ${C.ink})`,
            }}
          />
        </>
      ) : null}
    </div>
  );
};

export const Shake: DcComponent<Props> = {name: 'Shake', Component: ShakeView, slot: 'full'};
