// ManimInsert (catalog: Media). A Manim alpha-video insert (data/derived/manim/<clip>.webm, VP9 with alpha, + <clip>.json sidecar
// {fps, frames, width, height, alpha}) placed in its slot, played once from the layer anchor and held on its last frame.
//  - the clip frame is a pure function of ctx.frame: idx = floor((frame - at) * clipFps / fps) clamped to the last frame. At the anchor
//    frame the clip shows its first frame (RV1: a clip whose frame 0 is not empty has ink on the anchor frame);
//  - alpha (default true): the clip is decoded as transparent PNG frames (Remotion OffthreadVideo `transparent`) and drawn straight on
//    the scene; alpha false: an opaque clip (<clip>.mp4) on a rounded glass card;
//  - fit contain | cover inside ctx.box (the slot inside title-safe, already shrunk by the camera envelope);
//  - stage light (ADR-003 LK-F, 04 section 1.2): a Manim clip is a flat drawing, so the insert carries its own light. A signal pool sits
//    under the drawn area (a static radial gradient, no per-frame filter) and warms with the clip's progress, so the picture reads as
//    lit rather than pasted (standard / hero add a tighter key light over the drawing; ctx.mod.glow rides the pool); alpha false puts the clip on a glass card lit by the same pool. Light and clip fade in over the morph
//    preset from the anchor (RV1: the anchor frame has ink even when the clip's own frame 0 is empty);
//  - exit: fades out over the exit preset at `until`;
//  - the clip is a picture: text inside a Manim clip is Latin / maths only (Arabic is always typeset by the type engine on top);
//  - a missing clip is a marked placeholder in previews and a hard failure in a final.
import React from 'react';
import {C} from '../../tokens';
import {hex} from '../../fx/look';
import {Glass} from '../../fx/Atmos';
import {ease, presetFrames, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {ClipFrame, mediaUrl, missingMedia, useSidecar, type Sidecar} from '../_code-media/media';
import type {Props} from './schema';

/** Clip frame at shot frame `t` (pure; also used by the unit check). */
export const insertIndex = (t: number, at: number, clipFps: number, fps: number, frames: number): number =>
  Math.min(frames - 1, Math.max(0, Math.floor(((Math.max(0, t - at) * clipFps) / fps) + 1e-9)));

/** Rect the clip occupies inside the slot (contain letterboxes, cover fills); pure, shared with the unit check. */
export const fitRect = (box: {w: number; h: number}, cw: number, ch: number, fit: 'contain' | 'cover'): {x: number; y: number; w: number; h: number} => {
  const k = (fit === 'contain' ? Math.min : Math.max)(box.w / cw, box.h / ch);
  const w = cw * k;
  const h = ch * k;
  return {x: (box.w - w) / 2, y: (box.h - h) / 2, w, h};
};

export const ManimInsertView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ext = props.alpha ? 'webm' : 'mp4';
  const side = useSidecar<Sidecar>(mediaUrl('manim', `${props.clip}.json`));
  if (side === undefined) return null;
  if (side === null) return missingMedia(`manim ${props.clip}`, ctx.preview);
  const t = ctx.frame;
  if (t < ctx.at) return null;
  const out = ctx.until !== undefined && t >= ctx.until ? 1 - revealProgress(t - ctx.until, presetFrames('exit', ctx.fps), ease.camera) : 1;
  const inn = revealProgress(t - ctx.at, presetFrames('morph', ctx.fps), ease.camera);
  const idx = insertIndex(t, ctx.at, side.fps, ctx.fps, side.frames);
  const prog = side.frames > 1 ? idx / (side.frames - 1) : 1;
  const r = fitRect(ctx.box, side.width, side.height, props.fit);
  const video = <ClipFrame src={mediaUrl('manim', `${props.clip}.${ext}`)} idx={idx} clipFps={side.fps} fps={ctx.fps} transparent={props.alpha} style={{width: '100%', height: '100%', objectFit: props.fit}} />;
  // light pool: ellipse under the drawn area, slightly wider than it; warms from 0.55 to 1 over the clip
  const pool = Math.min(1.4, 0.55 + 0.45 * prog + ctx.mod.glow) * inn;
  // standard and hero add a tighter key light over the drawn area (static gradient, no filter: FX2 / RT5); hero's is hotter (bloomGL)
  const key = ctx.fx.id === 'lite' ? 0 : (0.09 + 0.05 * ctx.fx.bloomGL) * pool;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, opacity: out}} data-dc-manim={props.clip}>
      <div
        data-dc-light="manim-pool"
        style={{
          position: 'absolute',
          left: r.x - r.w * 0.12,
          top: r.y + r.h * 0.18,
          width: r.w * 1.24,
          height: r.h * 0.95,
          background: `radial-gradient(ellipse 50% 50% at 50% 55%, ${C.signal}${hex(0.2 * pool)} 0%, ${C.signal}${hex(0.07 * pool)} 48%, ${C.signal}00 100%)`,
        }}
      />
      {key > 0 && (
        <div
          data-dc-light="manim-key"
          style={{
            position: 'absolute',
            left: r.x + r.w * 0.2,
            top: r.y + r.h * 0.12,
            width: r.w * 0.6,
            height: r.h * 0.7,
            background: `radial-gradient(ellipse 50% 50% at 50% 55%, ${C.signal}${hex(key)} 0%, ${C.signal}00 100%)`,
          }}
        />
      )}
      <div style={{position: 'absolute', inset: 0, opacity: inn}}>
        {props.alpha ? video : <Glass accent={C.signal} style={{width: '100%', height: '100%', overflow: 'hidden', background: C.void}}>{video}</Glass>}
      </div>
    </div>
  );
};

export const ManimInsert: DcComponent<Props> = {name: 'ManimInsert', Component: ManimInsertView, slot: 'center'};
