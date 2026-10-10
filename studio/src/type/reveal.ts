// Whole-element reveal / exit styles for the motion presets (04 §3.5, tokens PRESETS). Pure: (frame offset, fps) -> CSS.
// Arabic is revealed by a clip-path wipe running RIGHT -> LEFT over the whole word box (never per letter); Latin-only and
// numeric runs wipe left -> right. Clip bounds overshoot the box vertically (-60 %/160 %) so tashkeel and glow are never cut.
import type React from 'react';
import {interpolate} from 'remotion';
import {EASE, IMPACT, LABEL_RISE_PX, PRESETS, msToFrames, type PresetId} from '../tokens';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export type RevealDir = 'rtl' | 'ltr';

/** The frozen easings, snapped to exactly 1 at the end: Easing.out(Easing.exp)(1) = 1 - 2^-10 = 0.999, which would leave a
 * counter at 66.60 instead of 66.67 and a 0.1 % clip on a settled word. P7 code eases through these, never EASE directly. */
const snap = (f: (x: number) => number) => (x: number) => (x >= 1 ? 1 : x <= 0 ? 0 : f(x));
export const ease = {arrive: snap(EASE.arrive), impact: snap(EASE.impact), camera: snap(EASE.camera)} as const;

/** Preset length in frames at `fps` (ms is the truth; f24 equals msToFrames(ms, 24) by the freeze check). `long` = upper bound. */
export const presetFrames = (p: PresetId, fps: number, long = false): number => Math.max(1, msToFrames(PRESETS[p].ms[long ? 1 : 0], fps));
export const flashFrames = (fps: number): number => Math.max(1, msToFrames(IMPACT.flashMs, fps));

/** clip-path polygon showing the leading `p` (0..1) of the box in reading direction. */
export const wipeClip = (p: number, dir: RevealDir): string | undefined => {
  if (p >= 1) return undefined;
  const e = (1 - Math.max(0, p)) * 100;
  return dir === 'rtl'
    ? `polygon(${e.toFixed(2)}% -60%, 160% -60%, 160% 160%, ${e.toFixed(2)}% 160%)`
    : `polygon(-60% -60%, ${(100 - e).toFixed(2)}% -60%, ${(100 - e).toFixed(2)}% 160%, -60% 160%)`;
};

export type RevealOut = {style: React.CSSProperties; p: number; flash: number; visible: boolean};
/**
 * Style of one whole text element `t` frames after its anchor frame (t < 0: hidden but laid out, so later words never shift).
 *  - arrive: masked wipe + scale 0.92 -> 1 + blur 6 -> 0 px + opacity, outExpo, 240 ms;
 *  - impact: arrive wipe at impact speed + scale 1.08 -> 1 outBack + 80 ms glow flash (flash returned, applied by caller);
 *  - label:  160 ms fade + 6 px rise;
 *  - wipe:   mask only (AT-11 'MD wipe'), arrive timing;
 *  - count / morph: arrive (the counter roll and particle morph are component-owned).
 * `exitT` = frames since the exit started (undefined = no exit yet); exit = 200 ms fade + recede into depth.
 */
export const revealStyle = (t: number, fps: number, preset: PresetId | 'wipe', dir: RevealDir, exitT?: number): RevealOut => {
  if (t < 0) return {style: {visibility: 'hidden'}, p: 0, flash: 0, visible: false};
  let style: React.CSSProperties = {};
  let p = 1;
  let flash = 0;
  if (preset === 'label') {
    const n = presetFrames('label', fps);
    p = interpolate(t, [0, n], [0, 1], {...clamp, easing: ease.arrive});
    style = {opacity: p, transform: `translateY(${((1 - p) * LABEL_RISE_PX).toFixed(2)}px)`};
  } else if (preset === 'wipe') {
    const n = presetFrames('arrive', fps);
    p = interpolate(t, [0, n], [0, 1], {...clamp, easing: ease.arrive});
    style = {clipPath: wipeClip(p, dir)};
  } else if (preset === 'impact') {
    const n = presetFrames('impact', fps, true);
    p = interpolate(t, [0, n], [0, 1], {...clamp, easing: ease.arrive});
    const sc = interpolate(t, [0, n], [IMPACT.scaleFrom, 1], {...clamp, easing: ease.impact});
    const ff = flashFrames(fps);
    flash = interpolate(t, [0, ff, ff * 3], [1, 1, 0], clamp);
    style = {clipPath: wipeClip(p, dir), transform: `scale(${sc.toFixed(4)})`, opacity: interpolate(p, [0, 0.3], [0, 1], clamp)};
  } else {
    const n = presetFrames('arrive', fps);
    p = interpolate(t, [0, n], [0, 1], {...clamp, easing: ease.arrive});
    const blur = 6 * (1 - p);
    style = {
      clipPath: wipeClip(p, dir),
      transform: `scale(${(0.92 + 0.08 * p).toFixed(4)})`,
      filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
    };
  }
  if (exitT !== undefined && exitT >= 0) {
    const n = presetFrames('exit', fps);
    const e = interpolate(exitT, [0, n], [0, 1], {...clamp, easing: ease.camera});
    const op = (typeof style.opacity === 'number' ? style.opacity : 1) * (1 - e);
    const prev = style.transform ?? '';
    style = {...style, opacity: op, transform: `${prev} scale(${(1 - 0.04 * e).toFixed(4)})`.trim(), filter: e > 0.01 ? `blur(${(6 * e).toFixed(2)}px)` : style.filter};
    if (e >= 1) return {style: {...style, visibility: 'hidden'}, p, flash: 0, visible: false};
  }
  return {style, p, flash, visible: true};
};
