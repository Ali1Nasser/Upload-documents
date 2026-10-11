// Spotlight (catalog: Type & UI). Dims everything except a target layer of the same shot, or a named part of it
// (`to: 'layer.part'`, measured on the settled frame by ../_typeui/target.ts, so the hole follows the camera push and parallax).
// Iris-in on the anchor (RV1: the dim is already > 0 on the anchor frame): the hole starts 1.6x wider and tightens onto the target
// with the `arrive` ease while the surround darkens to `dim` (void, never a semantic colour); a thin rim light (signal, low) traces
// the hole edge. `rect` = rounded rectangle hole, `circle` = an ellipse around the target. Exit (until / exit preset): the dim
// lifts. The hole is a cut-out shadow (one box-shadow; no per-frame blur over the frame), so it is cheap at every tier.
// No copy: text = false. If the target is missing, nothing is dimmed and a DC_TARGET warning is logged.
import React from 'react';
import {interpolate} from 'remotion';
import {C, H, W} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {clamp, exitT} from '../_typeui/kit';
import {useTargetRect} from '../_typeui/target';
import type {Props} from './schema';

const PAD = 18; // clearance around the target (layer px)
const FEATHER = 28; // soft inner edge of the dim (layer px)

export const SpotlightView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const ex = exitT(ctx);
  const nX = presetFrames('exit', ctx.fps, true);
  const active = t >= -1 && (ex === undefined || ex <= nX);
  const {ref, m} = useTargetRect(props.to, ctx.frame, active);
  const nA = presetFrames('arrive', ctx.fps);
  const p = revealProgress(t, nA * 2, ease.arrive); // iris + dim over 2 arrive spans
  const lift = ex !== undefined && ex >= 0 ? interpolate(ex, [0, presetFrames('exit', ctx.fps)], [1, 0], {...clamp, easing: ease.camera}) : 1;
  const dim = props.dim * p * lift;
  let hole: React.ReactNode = null;
  if (m && dim > 0.001) {
    const r = m.rect;
    const circle = props.shape === 'circle';
    const grow = 1 + 0.6 * (1 - p);
    // a circle hole circumscribes the target box (ellipse with the box aspect, x sqrt 2)
    const w = (circle ? r.w * Math.SQRT2 : r.w) + 2 * PAD;
    const h = (circle ? r.h * Math.SQRT2 : r.h) + 2 * PAD;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const hw = w * grow;
    const hh = h * grow;
    const shade = `${C.void}${hex(dim)}`;
    hole = (
      <div
        style={{
          position: 'absolute',
          left: cx - hw / 2,
          top: cy - hh / 2,
          width: hw,
          height: hh,
          borderRadius: circle ? '50%' : Math.min(24, Math.min(hw, hh) / 4),
          // outer: the dim over the whole frame; inner: a soft feather just inside the edge; rim: a thin low signal line
          boxShadow: `0 0 0 ${Math.max(W, H) * 2}px ${shade}, inset 0 0 ${FEATHER}px ${Math.round(FEATHER / 3)}px ${shade}, 0 0 0 1px ${C.signal}${hex(0.35 * p * lift)}`,
        }}
      />
    );
  }
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {hole}
    </div>
  );
};

export const Spotlight: DcComponent<Props> = {name: 'Spotlight', Component: SpotlightView, text: false, slot: 'full'};
