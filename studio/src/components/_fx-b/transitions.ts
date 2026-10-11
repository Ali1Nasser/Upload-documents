// Group fx-b: props-aware shot transitions for LightStreakTransition, WhipPan and MatchCut (04 section 2 camera language,
// section 1.3 FX tiers). Pure math over the FROZEN tokens; no React, no randomness.
//
// Why this file exists: the scene compiler consumes the three transition layers at shot level (resolve.ts keeps only
// {type, frames}; rig.ts transitionState / streakAt and SpecPlayer draw them). The frozen props (`direction`, `color`,
// `motion_blur`, MatchCut `from` / `to` / `kind`) are not carried. They are also not honoured, and three behaviours differ from 04:
//   - a CSS blur on the whole frame at every tier, where 04 section 1.3 allows motion blur on hero whips only (CameraMotionBlur);
//   - the streak is drawn only in the outgoing shot, so it vanishes at its peak on the cut;
//   - MatchCut is a dissolve with a 1.04 scale, with no geometric match between the `from` and `to` layers.
// The functions below are the drop-in replacement that CR-003 asks the engine owner to wire. The return shape is the same as
// rig.ts TransitionState, plus `motionBlur` and a streak overlay that is drawn on both sides of the cut. Checked by
// _fx-b/shot_level.check.ts.
import {interpolate} from 'remotion';
import type React from 'react';
import {hex} from '../../fx/look';
import type {TransitionState} from '../../spec/rig';
import {C, H, W, type ColorToken, type Fx} from '../../tokens';
import {ease} from '../../type/reveal';
import type {Rect} from '../../type/safe';

export type Dir = 'rtl' | 'ltr' | 'up' | 'down';
export type MatchKind = 'shape' | 'position' | 'color';
/** A resolved transition plus the props of the transition layer (schema defaults applied). Boxes are the layer boxes of
 * MatchCut `from` (this shot) and `to` (next shot), filled by the compiler. */
export type FxbTransition = {
  type: string; // cut | dissolve | whip | streak | match (resolve.ts TransitionKind)
  frames: number;
  direction?: Dir;
  color?: ColorToken;
  motion_blur?: boolean;
  match?: {kind: MatchKind; fromBox?: Rect; toBox?: Rect};
};
export type FxbState = TransitionState & {
  /** CameraMotionBlur settings for the shot wrapper; non-null only on a hero-tier whip with motion_blur (04 section 1.3). */
  motionBlur: {shutterAngle: number; samples: number} | null;
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** Direction the content travels (RTL film default: content leaves to the left, the next shot enters from the right). */
export const VEC: Readonly<Record<Dir, readonly [number, number]>> = {rtl: [-1, 0], ltr: [1, 0], up: [0, -1], down: [0, 1]};
/** Travel as a fraction of the frame. These are layout ratios: whip = half a frame, streak = a quarter. */
const TRAVEL = {whip: 0.5, streak: 0.25} as const;
/** Hero-tier whip motion blur (layout constants of @remotion/motion-blur CameraMotionBlur, not FX numbers). */
export const WHIP_BLUR = {shutterAngle: 180, samples: 6} as const;
/** A whip carries a light streak (04 section 2: "whip-pan with a light streak") at this fraction of a streak transition. */
const WHIP_STREAK = 0.6;
/** MatchCut `shape`: the scale that maps the incoming box onto the outgoing one is limited to this range. */
const MATCH_SCALE = [0.5, 2] as const;

/** Schema defaults of the transition layer props (the frozen schemas: direction rtl, color signal, motion_blur false, kind shape). */
export const fxbTransitionOf = (base: {type: string; frames: number}, props: Record<string, unknown> | undefined): FxbTransition => {
  const p = props ?? {};
  const out: FxbTransition = {...base, direction: (p.direction as Dir) ?? 'rtl'};
  if (base.type === 'streak') out.color = (p.color as ColorToken) ?? 'signal';
  if (base.type === 'whip') out.motion_blur = (p.motion_blur as boolean) ?? false;
  if (base.type === 'match') out.match = {kind: (p.kind as MatchKind) ?? 'shape'};
  return out;
};

const half = (T: number) => Math.max(1, Math.round(T / 2));
const centre = (r: Rect) => ({x: r.x + r.w / 2, y: r.y + r.h / 2});

/** Wrapper transform of the incoming shot of a match cut at local frame t: at t = 0 the `to` box sits on the `from` box (centre
 * for `position`, centre + size for `shape`). It eases to identity over T. `color` has no geometry (a dissolve). */
export const matchWrap = (t: number, T: number, m: NonNullable<FxbTransition['match']>): React.CSSProperties => {
  const q = interpolate(t, [0, Math.max(1, T)], [1, 0], {...clamp, easing: ease.camera});
  if (q <= 0) return {};
  if (m.kind === 'color' || !m.fromBox || !m.toBox) return m.kind === 'color' ? {} : {transform: `scale(${(1 + 0.04 * q).toFixed(4)})`};
  const a = centre(m.fromBox);
  const b = centre(m.toBox);
  const s0 = m.kind === 'shape' ? Math.min(MATCH_SCALE[1], Math.max(MATCH_SCALE[0], Math.sqrt((m.fromBox.w * m.fromBox.h) / Math.max(1, m.toBox.w * m.toBox.h)))) : 1;
  const s = 1 + (s0 - 1) * q;
  return {transform: `translate(${((a.x - b.x) * q).toFixed(1)}px, ${((a.y - b.y) * q).toFixed(1)}px) scale(${s.toFixed(4)})`, transformOrigin: `${b.x.toFixed(1)}px ${b.y.toFixed(1)}px`};
};

/**
 * Transition state of a shot at local frame t (same contract as rig.ts transitionState). `tin` is the previous shot's
 * transition and `tout` is this shot's own transition. whip and streak travel along `direction`: out over the last T/2 frames,
 * in over the first T/2 frames. They use no whole-frame blur. A hero whip with motion_blur returns CameraMotionBlur settings
 * instead. dissolve and match fade in the backdrop and non-text layers, never the copy (P7 review M5). The outgoing copy fades
 * over the tail.
 */
export const fxbTransitionState = (t: number, dur: number, tin: FxbTransition | null, tout: FxbTransition, fx: Fx): FxbState => {
  let fadeIn = 1;
  let textOut = 1;
  let x = 0;
  let y = 0;
  let wrap: React.CSSProperties = {};
  let transit = false;
  let motionBlur: FxbState['motionBlur'] = null;
  const travel = (tr: FxbTransition, q: number, sign: number) => {
    const [vx, vy] = VEC[tr.direction ?? 'rtl'];
    const k = TRAVEL[tr.type as keyof typeof TRAVEL] ?? 0;
    x += sign * q * k * W * vx;
    y += sign * q * k * H * vy;
    if (tr.type === 'whip' && tr.motion_blur && fx.id === 'hero') motionBlur = WHIP_BLUR;
  };
  if (tin && tin.frames > 0) {
    const T = tin.frames;
    if (tin.type === 'dissolve' || tin.type === 'match') {
      fadeIn = interpolate(t, [0, T], [0, 1], {...clamp, easing: ease.camera});
      if (tin.type === 'match' && tin.match) wrap = matchWrap(t, T, tin.match);
      if (t < T) transit = true;
    } else if (tin.type === 'whip' || tin.type === 'streak') {
      const h = half(T);
      if (t < h) {
        travel(tin, interpolate(t, [0, h], [1, 0], {...clamp, easing: ease.camera}), -1); // enters from the opposite side
        transit = true;
      }
    }
  }
  if (tout.frames > 0 && (tout.type === 'whip' || tout.type === 'streak')) {
    const h = half(tout.frames);
    if (t > dur - h) {
      travel(tout, interpolate(t, [dur - h, dur], [0, 1], {...clamp, easing: ease.camera}), 1);
      transit = true;
    }
  }
  if (tout.frames > 0 && (tout.type === 'dissolve' || tout.type === 'match') && t >= dur) {
    textOut = interpolate(t, [dur, dur + tout.frames], [1, 0], {...clamp, easing: ease.camera});
    transit = true;
  }
  const tr = x || y ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` : '';
  if (tr) wrap = {...wrap, transform: `${tr}${wrap.transform ? ` ${wrap.transform}` : ''}`};
  return {wrap: {transform: wrap.transform, transformOrigin: wrap.transformOrigin}, fadeIn, textOut, transit, motionBlur};
};

/** Streak sweep progress 0..1 across the cut: the outgoing tail runs 0 -> 0.5 and the incoming head runs 0.5 -> 1. The
 * overlay never vanishes at its peak. null = no streak on this frame. */
export const fxbStreakP = (t: number, dur: number, tin: FxbTransition | null, tout: FxbTransition): {p: number; tr: FxbTransition} | null => {
  const has = (tr: FxbTransition | null): tr is FxbTransition => !!tr && tr.frames > 0 && (tr.type === 'streak' || tr.type === 'whip');
  if (has(tout)) {
    const h = half(tout.frames);
    if (t >= dur - h && t < dur) return {p: (t - (dur - h)) / (2 * h), tr: tout};
  }
  if (has(tin)) {
    const h = half(tin.frames);
    if (t < h) return {p: 0.5 + t / (2 * h), tr: tin};
  }
  return null;
};

/** Style of the light-streak band: it moves along `direction`, in the `color` token with a white core, screen-blended, and
 * glows at the tier radius. A whip's streak is fixed at signal colour and WHIP_STREAK strength. Lite runs at 0.8. */
export const streakBand = (p: number, tr: FxbTransition, fx: Fx): React.CSSProperties => {
  const dir = tr.direction ?? 'rtl';
  const col = C[tr.type === 'streak' ? tr.color ?? 'signal' : 'signal'];
  const k = (tr.type === 'whip' ? WHIP_STREAK : 1) * (fx.id === 'lite' ? 0.8 : 1);
  const horiz = dir === 'rtl' || dir === 'ltr';
  const pos = (dir === 'rtl' || dir === 'up' ? 1.1 - 1.7 * p : -0.7 + 1.7 * p) * (horiz ? W : H);
  const grad = `linear-gradient(${horiz ? 90 : 180}deg, transparent, ${col}${hex(0.55)}, ${C.white}${hex(0.8)}, ${col}${hex(0.55)}, transparent)`;
  const box: React.CSSProperties = horiz ? {top: H * 0.35, height: H * 0.3, width: W * 0.6, left: pos} : {left: W * 0.35, width: W * 0.3, height: H * 0.6, top: pos};
  return {position: 'absolute', ...box, background: grad, filter: `blur(${fx.glowPx}px)`, opacity: +(k * Math.sin(Math.PI * Math.min(1, Math.max(0, p)))).toFixed(4), mixBlendMode: 'screen', pointerEvents: 'none'};
};
