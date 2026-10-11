// Spin (catalog: State & FX). Spins a target layer about its own centre.
//  - axis z: a flat rotation by 360 x turns degrees;
//  - axis y / x: a card turn about the vertical / horizontal axis, drawn as the projected width / height |cos theta| (orthographic,
//    CSS only, every tier). The face never mirrors (|cos|), so Arabic copy is never shown reversed; a specular glint sweeps the
//    target and a thin edge line lights up when it passes edge-on. A fractional turn on x / y that ends edge-on (0.25, 0.75 ...)
//    leaves the target edge-on (hidden): use multiples of 0.5 to bring it back face-on.
// Length = max(anchor word, turns x 2 beats), camera ease (inOutCubic), RV1 via revealProgress; the glint is on screen from the
// anchor frame. Holds the final angle afterwards.
import React from 'react';
import {hex} from '../../fx/look';
import {C} from '../../tokens';
import {ease, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, useFxTarget, type Drive} from '../_fx-a/drive';
import {abs, beat, exitK} from '../_fx-a/kit';
import type {Props} from './schema';

const EDGE_MIN = 0.02; // projected size floor at edge-on (a hairline, never a degenerate 0 scale)

export const spinLen = (fps: number, turns: number, word: number) => Math.max(word, Math.round(beat(fps) * 2 * turns), beat(fps));
export const spinAngle = (t: number, n: number, turns: number): number => 360 * turns * revealProgress(t, n, ease.camera);

const driveOf = (deg: number, axis: Props['axis']): Drive => {
  if (axis === 'z') return {...IDENTITY, rz: deg};
  const c = Math.max(EDGE_MIN, Math.abs(Math.cos((deg * Math.PI) / 180)));
  return axis === 'y' ? {...IDENTITY, sx: c} : {...IDENTITY, sy: c};
};

export const SpinView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const n = spinLen(ctx.fps, props.turns, Math.max(0, ctx.atEnd - ctx.at));
  const deg = t < 0 ? 0 : spinAngle(t, n, props.turns);
  const spinning = t >= 0 && t < n;
  const {ref, m} = useFxTarget(props.to, ctx.frame, `spin:${ctx.id}`, () => (t >= 0 && deg !== 0 ? driveOf(deg, props.axis) : null));
  const r = m?.rect;
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const edge = props.axis === 'z' ? 0 : Math.max(0, 1 - c * 4); // edge-on light
  const glint = spinning ? 0.35 + 0.4 * Math.abs(Math.sin(rad)) : 0;
  let overlay: React.ReactNode = null;
  if (r && spinning) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (props.axis === 'z') {
      overlay = (
        <div style={{...abs({x: cx - r.w / 2, y: cy - r.h / 2, w: r.w, h: r.h}), transform: `rotate(${deg.toFixed(3)}deg)`, borderRadius: 10, border: `1px solid ${C.signal}${hex(0.5 * glint)}`, boxShadow: `0 0 ${ctx.fx.glowPx}px ${C.signal}${hex(0.18 * glint)}`}} />
      );
    } else {
      const yAx = props.axis === 'y';
      const w = yAx ? Math.max(2, r.w * c) : r.w;
      const h = yAx ? r.h : Math.max(2, r.h * c);
      const s = Math.sin(rad);
      overlay = (
        <div style={{...abs({x: cx - w / 2, y: cy - h / 2, w, h}), overflow: 'hidden', borderRadius: 8}}>
          {/* specular glint: a soft light band crossing the face as it turns */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(${yAx ? 90 : 180}deg, transparent ${(50 + 40 * s - 18).toFixed(1)}%, ${C.white}${hex(0.16 * glint)} ${(50 + 40 * s).toFixed(1)}%, transparent ${(50 + 40 * s + 18).toFixed(1)}%)`,
              mixBlendMode: ctx.fx.id === 'lite' ? undefined : 'screen',
            }}
          />
          <div style={{position: 'absolute', inset: 0, border: `${(1 + 2 * edge).toFixed(2)}px solid ${C.signal}${hex(0.25 + 0.7 * edge)}`, borderRadius: 8, boxShadow: ctx.fx.id === 'lite' ? undefined : `0 0 ${(ctx.fx.glowPx * (0.3 + edge)).toFixed(1)}px ${C.signal}${hex(0.3 + 0.4 * edge)}`}} />
        </div>
      );
    }
  }
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: exitK(ctx)}}>
      {overlay}
    </div>
  );
};

export const Spin: DcComponent<Props> = {name: 'Spin', Component: SpinView, slot: 'full'};
