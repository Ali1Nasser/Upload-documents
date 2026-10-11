// FixSettle (catalog: State & FX). The fix beat of the scene contract (04 §4: "fix (ok settle)").
// On the anchor frame (RV1) the target (`to`) settles into place: it drops the last few px into its seat with an outBack settle
// (impact ease: 1.03 -> 1 scale, -10 -> 0 px) over one settle length (exit upper bound, 400 ms), while ok corner brackets close in
// from 36 px out onto its outline, a soft ok light sweeps across it right -> left (the reading direction), and an ok rim holds.
// The Arabic label chip (ok edge, check mark drawn on the anchor) sits in the layer's slot (default lower third).
// Without `to` the brackets and sweep frame the layer's own slot box.
import React from 'react';
import {hex} from '../../fx/look';
import {C} from '../../tokens';
import {ease, presetFrames, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, clampToRoom, useFxTarget} from '../_fx-a/drive';
import {Brackets, Chip, IconCheck, abs, beat, boxGlow, chipRect, exitK, pad, settleLen} from '../_fx-a/kit';
import type {Props} from './schema';

const DROP_PX = 10;
const SCALE_FROM = 1.03;
const CLOSE_PX = 36;

export const settleAt = (t: number, fps: number): {p: number; q: number; on: boolean} => {
  const n = settleLen(fps);
  return {p: revealProgress(t, n, ease.impact), q: revealProgress(t, n, ease.arrive), on: t >= 0 && t < n};
};

export const FixSettleView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const st = settleAt(t, ctx.fps);
  const seed = `fix:${ctx.id}`;
  const {ref, m} = useFxTarget(props.to, ctx.frame, seed, (mm) => {
    if (!st.on) return null;
    const sc = SCALE_FROM + (1 - SCALE_FROM) * st.p;
    const [, ty] = clampToRoom(0, -DROP_PX * (1 - st.p), mm.room);
    return {...IDENTITY, ty, sx: sc, sy: sc};
  });
  const r = props.to ? m?.rect : ctx.box;
  const sweepN = beat(ctx.fps);
  const sw = revealProgress(t, sweepN, ease.camera);
  const sweepOn = t >= 0 && t < sweepN;
  const k = exitK(ctx);
  const lite = ctx.fx.id === 'lite';
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: k}}>
      {r && t >= 0 ? (
        <>
          <div style={{...abs(pad(r, 12)), borderRadius: 10, boxShadow: lite ? `0 0 0 1px ${C.ok}${hex(0.5 * st.q)}` : `0 0 0 1px ${C.ok}${hex(0.5 * st.q)}, ${boxGlow(C.ok, ctx.fx, 0.5 * st.q)}`}} />
          <Brackets r={r} color={C.ok} fx={ctx.fx} opacity={Math.min(1, 0.4 + st.q)} spread={18 + CLOSE_PX * (1 - st.q)} />
          {sweepOn ? (
            <div style={{...abs(pad(r, 12)), overflow: 'hidden', borderRadius: 10}}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '35%',
                  right: `${(-35 + 135 * sw).toFixed(2)}%`,
                  background: `linear-gradient(90deg, transparent, ${C.ok}${hex(0.22 * (1 - sw * 0.6))}, transparent)`,
                  mixBlendMode: lite ? undefined : 'screen',
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}
      {props.label_ar ? <Chip id={`${ctx.id}:label`} text={props.label_ar} tone="ok" ctx={ctx} slot={props.slot} at={ctx.at} icon={<IconCheck color={C.ok} size={26} p={revealProgress(t, presetFrames('arrive', ctx.fps) + 2, ease.camera)} />} /> : null}
    </div>
  );
};

export const FixSettle: DcComponent<Props> = {
  name: 'FixSettle',
  Component: FixSettleView,
  text: true,
  slot: 'lower-third',
  textRect: (p, box) => chipRect(p.label_ar, p.slot, box),
};
