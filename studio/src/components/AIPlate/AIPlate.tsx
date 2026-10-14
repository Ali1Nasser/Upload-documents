// AIPlate (catalog: Media). A generated, text-free plate (04 section 10; usable only if ADR-006 enables generated plates) with 2.5D
// parallax from its depth map: plate + depth_map are PNGs in data/derived/plates/<slug>.png (depth 0 = far, 255 = near).
//  - DOM only, at every tier (no WebGL: the parallax is a handful of translated layers, so there is nothing to gate behind the hero
//    tier). The plate is cut once into N slices by depth (lite 3, standard 5, hero 7; see media.tsx buildSlices): slice k keeps the
//    pixels with depth >= k / N, so with no motion the stack composites back to the plate exactly, and the pixels a nearer slice hides
//    are filled from the blurred farther colours (no ghosting when a slice shifts);
//  - motion: one slow lateral drift over the layer's life (anchor -> `until`, or the shot end), eased with the camera curve; each
//    slice moves by parallax x 72 px x (slice depth - 0.45) (the mid plane is the pivot) and pushes in by up to 3 % x parallax for
//    the near slices. Pure function of ctx.frame;
//  - overscan 6 % per side so the shifts never show the frame edge; fade in over the morph preset from the anchor, out at `until`;
//  - the plate is a backplate: all meaning is drawn by components on top; it carries no text of its own;
//  - a missing plate / depth map is a marked placeholder in previews and a hard failure in a final.
import React from 'react';

import {ease, presetFrames, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {mediaUrl, missingMedia, useDepthSlices} from '../_code-media/media';
import type {Props} from './schema';

export const SLICES = {lite: 3, standard: 5, hero: 7} as const;
const DRIFT_PX = 72;
const PIVOT = 0.45;
const WORK = {lite: [640, 360], standard: [960, 540], hero: [1280, 720]} as const;

/** Per-slice transform at shot frame t (pure; also used by the unit check). */
export const sliceMotion = (depth: number, u: number, parallax: number): {x: number; s: number} => ({
  x: -(2 * u - 1) * parallax * DRIFT_PX * (depth - PIVOT),
  s: 1 + 0.03 * parallax * depth * u,
});

const SliceCanvas: React.FC<{data: ImageData; style: React.CSSProperties}> = ({data, style}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    ref.current?.getContext('2d')?.putImageData(data, 0, 0);
  }, [data]);
  return <canvas ref={ref} width={data.width} height={data.height} style={style} />;
};

export const AIPlateView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = SLICES[ctx.fx.id];
  const [w, h] = WORK[ctx.fx.id];
  const slices = useDepthSlices(mediaUrl('plates', `${props.plate}.png`), mediaUrl('plates', `${props.depth_map}.png`), n, w, h);
  if (slices === undefined) return null;
  if (slices === null) return missingMedia(`plate ${props.plate} / depth ${props.depth_map}`, ctx.preview);
  const t = ctx.frame;
  const end = ctx.until ?? ctx.shotDur;
  const u = ease.camera(Math.min(1, Math.max(0, (t - ctx.at) / Math.max(1, end - ctx.at))));
  const fadeIn = revealProgress(t - ctx.at, presetFrames('morph', ctx.fps), ease.camera);
  const fadeOut = ctx.until !== undefined && t >= ctx.until ? 1 - revealProgress(t - ctx.until, presetFrames('exit', ctx.fps), ease.camera) : 1;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}} data-dc-plate={props.plate}>
      <div style={{position: 'absolute', inset: '-6%', opacity: fadeIn * fadeOut}}>
        {slices.map((s, i) => {
          const m = sliceMotion(s.depth, u, props.parallax);
          return <SliceCanvas key={i} data={s.data} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', transform: `translate3d(${m.x.toFixed(2)}px, 0, 0) scale(${m.s.toFixed(5)})`}} />;
        })}
      </div>
    </div>
  );
};

export const AIPlate: DcComponent<Props> = {name: 'AIPlate', Component: AIPlateView, slot: 'full'};
