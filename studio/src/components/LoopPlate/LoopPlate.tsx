// LoopPlate (catalog: Media). A pre-rendered seamless 10 s loop (data/derived/plates/<plate>.mp4 + <plate>.json sidecar written by
// `dc render plate <name>`) played full-bleed behind the diagram layers: the cheap way to a heavy atmosphere (ADR-002: real-time
// WebGL only on the hero tier, so heavy backgrounds are plates).
//  - the clip frame is a pure function of ctx.frame: idx = floor((frame - at) * speed * clipFps / fps) mod frames (a seamless loop
//    wraps without a seam; speed 0.5..2). Never the wall clock, never useCurrentFrame;
//  - the plate fades in over the morph preset from its anchor (not a text layer: no reveal wipe) and out over the exit preset at `until`;
//  - `opacity` scales the plate; `blend` normal | screen | add (CSS screen / plus-lighter). SpecPlayer mounts every layer in its own
//    isolated group (the camera transform), so a mix-blend-mode set inside the layer would blend against an empty group and do
//    nothing. The blend is therefore set on the layer's host element ([data-dc-layer], a layout effect, removed on unmount); React
//    never writes that property, so it persists across frames. Deterministic and frame-pure;
//  - overscan 3 % per side so the camera push / truck on the far plane never shows the frame edge;
//  - a missing plate is a marked placeholder in previews and a hard failure in a final (never ships silently).
import React from 'react';
import {ease, presetFrames, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {ClipFrame, mediaUrl, missingMedia, useSidecar, type Sidecar} from '../_code-media/media';
import type {Props} from './schema';

/** Clip frame index at shot frame `t` (pure; also used by the unit check). */
export const loopIndex = (t: number, at: number, speed: number, clipFps: number, fps: number, frames: number): number => {
  const k = Math.floor(((Math.max(0, t - at) * speed * clipFps) / fps) + 1e-9);
  return ((k % frames) + frames) % frames;
};

const CSS_BLEND = {normal: '', screen: 'screen', add: 'plus-lighter'} as const;

export const LoopPlateView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const url = mediaUrl('plates', `${props.plate}.mp4`);
  const root = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const host = root.current?.closest<HTMLElement>('[data-dc-layer]');
    if (!host) return;
    host.style.mixBlendMode = CSS_BLEND[props.blend];
    return () => {
      host.style.mixBlendMode = '';
    };
  }, [props.blend]);
  const side = useSidecar<Sidecar>(mediaUrl('plates', `${props.plate}.json`));
  if (side === undefined) return <div ref={root} />; // loading (the render is held by delayRender)
  if (side === null) return <div ref={root}>{missingMedia(`plate ${props.plate}`, ctx.preview)}</div>;
  const t = ctx.frame;
  const fadeIn = revealProgress(t - ctx.at, presetFrames('morph', ctx.fps), ease.camera);
  const fadeOut = ctx.until !== undefined && t >= ctx.until ? 1 - revealProgress(t - ctx.until, presetFrames('exit', ctx.fps), ease.camera) : 1;
  const op = props.opacity * fadeIn * fadeOut;
  const idx = loopIndex(t, ctx.at, props.speed, side.fps, ctx.fps, side.frames);
  return (
    <div ref={root} style={{position: 'absolute', inset: 0, overflow: 'hidden'}} data-dc-plate={props.plate}>
      <div style={{position: 'absolute', inset: '-3%', opacity: op}}>
        <ClipFrame src={url} idx={idx} clipFps={side.fps} fps={ctx.fps} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>
    </div>
  );
};

export const LoopPlate: DcComponent<Props> = {name: 'LoopPlate', Component: LoopPlateView, slot: 'full'};
