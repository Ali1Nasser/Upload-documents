// ManimInsert (catalog: Media). A Manim alpha-video insert (data/derived/manim/<clip>.webm, VP9 with alpha, + <clip>.json sidecar
// {fps, frames, width, height, alpha}) placed in its slot, played once from the layer anchor and held on its last frame.
//  - the clip frame is a pure function of ctx.frame: idx = floor((frame - at) * clipFps / fps) clamped to the last frame. At the anchor
//    frame the clip shows its first frame (RV1: a clip whose frame 0 is not empty has ink on the anchor frame);
//  - alpha (default true): the clip is decoded as transparent PNG frames (Remotion OffthreadVideo `transparent`) and drawn straight on
//    the scene; alpha false: an opaque clip (<clip>.mp4) on a rounded glass card;
//  - fit contain | cover inside ctx.box (the slot inside title-safe, already shrunk by the camera envelope);
//  - exit: fades out over the exit preset at `until`;
//  - the clip is a picture: text inside a Manim clip is Latin / maths only (Arabic is always typeset by the type engine on top);
//  - a missing clip is a marked placeholder in previews and a hard failure in a final.
import React from 'react';
import {C} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {ease, presetFrames, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {ClipFrame, mediaUrl, missingMedia, useSidecar, type Sidecar} from '../_code-media/media';
import type {Props} from './schema';

/** Clip frame at shot frame `t` (pure; also used by the unit check). */
export const insertIndex = (t: number, at: number, clipFps: number, fps: number, frames: number): number =>
  Math.min(frames - 1, Math.max(0, Math.floor(((Math.max(0, t - at) * clipFps) / fps) + 1e-9)));

export const ManimInsertView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ext = props.alpha ? 'webm' : 'mp4';
  const side = useSidecar<Sidecar>(mediaUrl('manim', `${props.clip}.json`));
  if (side === undefined) return null;
  if (side === null) return missingMedia(`manim ${props.clip}`, ctx.preview);
  const t = ctx.frame;
  if (t < ctx.at) return null;
  const out = ctx.until !== undefined && t >= ctx.until ? 1 - revealProgress(t - ctx.until, presetFrames('exit', ctx.fps), ease.camera) : 1;
  const idx = insertIndex(t, ctx.at, side.fps, ctx.fps, side.frames);
  const video = <ClipFrame src={mediaUrl('manim', `${props.clip}.${ext}`)} idx={idx} clipFps={side.fps} fps={ctx.fps} transparent={props.alpha} style={{width: '100%', height: '100%', objectFit: props.fit}} />;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, opacity: out}} data-dc-manim={props.clip}>
      {props.alpha ? video : <Glass style={{width: '100%', height: '100%', overflow: 'hidden', background: C.void}}>{video}</Glass>}
    </div>
  );
};

export const ManimInsert: DcComponent<Props> = {name: 'ManimInsert', Component: ManimInsertView, slot: 'center'};
