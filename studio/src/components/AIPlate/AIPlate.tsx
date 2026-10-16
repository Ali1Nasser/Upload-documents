// AIPlate (catalog: Media). A generated, text-free plate (04 section 10; usable only if ADR-006 enables generated plates) with 2.5D
// parallax from its depth map: plate + depth_map are PNGs in data/derived/plates/<slug>.png (depth 0 = far, 255 = near).
//  - 2D canvas only, at every tier (no WebGL: the parallax is a handful of shifted slices composited into ONE canvas, so there is
//    nothing to gate behind the hero tier and only one compositor layer to pay for). The plate is cut once into N slices by depth (lite 3, standard 5, hero 7; see media.tsx buildSlices): slice k keeps the
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
const OVERSCAN = 0.06;
const WORK = {lite: [640, 360], standard: [960, 540], hero: [1280, 720]} as const;

/** Per-slice transform at shot frame t (pure; also used by the unit check). */
export const sliceMotion = (depth: number, u: number, parallax: number): {x: number; s: number} => ({
  x: -(2 * u - 1) * parallax * DRIFT_PX * (depth - PIVOT),
  s: 1 + 0.03 * parallax * depth * u,
});

/** Slices are pasted once into offscreen canvases (one per slice) and composited per frame into ONE visible canvas: a single
 * compositor layer instead of N full-screen transformed layers (the N-layer DOM version cost 0.30-0.38 box s/frame at 1080p).
 * `blur` (canvas px) is the far-plane DOF (04 section 1.2) baked ONCE into every slice: a CSS blur on the full-bleed layer host is
 * re-rasterised every frame (+0.12 box s/frame at standard, measured), the baked one costs nothing per frame. */
const toCanvases = (slices: {data: ImageData; depth: number}[], blur: number) =>
  slices.map((s) => {
    const src = document.createElement('canvas');
    src.width = s.data.width;
    src.height = s.data.height;
    src.getContext('2d')!.putImageData(s.data, 0, 0);
    if (blur < 0.05) return {c: src, depth: s.depth};
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d')!;
    g.filter = `blur(${blur.toFixed(2)}px)`;
    g.drawImage(src, 0, 0);
    return {c, depth: s.depth};
  });

/** The plane's DOF blur (stage px) that SpecPlayer put on the layer host; it is taken over by the baked blur (host filter cleared). */
const takeHostBlur = (el: HTMLElement | null): number => {
  const host = el?.closest<HTMLElement>('[data-dc-layer]');
  if (!host) return 0;
  const m = /blur\(([\d.]+)px\)/.exec(host.style.filter);
  if (m) host.dataset.dcBlur = m[1];
  host.style.filter = '';
  return host.dataset.dcBlur ? parseFloat(host.dataset.dcBlur) : 0;
};

export const AIPlateView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = SLICES[ctx.fx.id];
  const [w, h] = WORK[ctx.fx.id];
  const slices = useDepthSlices(mediaUrl('plates', `${props.plate}.png`), mediaUrl('plates', `${props.depth_map}.png`), n, w, h);
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [blurStage, setBlurStage] = React.useState(0);
  const k = w / (1920 * (1 + 2 * OVERSCAN));
  const layers = React.useMemo(() => (slices ? toCanvases(slices, blurStage * k) : null), [slices, blurStage, k]);
  const t = ctx.frame;
  const end = ctx.until ?? ctx.shotDur;
  const u = ease.camera(Math.min(1, Math.max(0, (t - ctx.at) / Math.max(1, end - ctx.at))));
  React.useLayoutEffect(() => {
    const b = Math.round(takeHostBlur(ref.current) * 10) / 10;
    if (b !== blurStage) setBlurStage(b);
  });
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g || !layers) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.imageSmoothingEnabled = true;
    // stage px -> canvas px: the canvas spans the overscanned box (1 + 2 x OVERSCAN of the 1920-wide stage)
    for (const l of layers) {
      const m = sliceMotion(l.depth, u, props.parallax);
      g.setTransform(m.s, 0, 0, m.s, (w / 2) * (1 - m.s) + m.x * k, (h / 2) * (1 - m.s));
      g.drawImage(l.c, 0, 0);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  });
  if (slices === undefined) return null;
  if (slices === null) return missingMedia(`plate ${props.plate} / depth ${props.depth_map}`, ctx.preview);
  const fadeIn = revealProgress(t - ctx.at, presetFrames('morph', ctx.fps), ease.camera);
  const fadeOut = ctx.until !== undefined && t >= ctx.until ? 1 - revealProgress(t - ctx.until, presetFrames('exit', ctx.fps), ease.camera) : 1;
  const big = `${(1 + 2 * OVERSCAN) * 100}%`;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}} data-dc-plate={props.plate}>
      <canvas ref={ref} width={w} height={h} style={{position: 'absolute', left: `-${OVERSCAN * 100}%`, top: `-${OVERSCAN * 100}%`, width: big, height: big, opacity: fadeIn * fadeOut}} />
    </div>
  );
};

export const AIPlate: DcComponent<Props> = {name: 'AIPlate', Component: AIPlateView, slot: 'full'};
