// Camera rig, depth parallax and shot transitions (P7.3). Pure math over the FROZEN tokens (04 section 2 camera language,
// CAMERA / IMPACT / EASE). Never dead-static: every move carries at least the ambient drift.
import type React from 'react';
import {interpolate} from 'remotion';
import {CAMERA, H, IMPACT, W, type Fx} from '../tokens';
import type {Rect} from '../type/safe';
import {ease} from '../type/reveal';
import type {ResolvedShot} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export type Cam = {s: number; x: number; y: number; rz: number};

const easeOf = (e: string) => (e === 'linear' ? (p: number) => p : e === 'outExpo' ? ease.arrive : ease.camera);

/** 04 section 2 lower bound of the ambient push (1.5 % per 5 s): a long shot never drifts slower than this. */
export const PUSH_FLOOR_PER5S = 0.015;
/** Total ambient push over one shot is capped here (P7 review B3), unless the 04 floor rate over a long shot needs more. */
export const PUSH_TOTAL_CAP = 0.06;

/** Total ambient push over a shot of `dur` frames: the 04 rate (1.5-3 % per 5 s by intensity), capped at PUSH_TOTAL_CAP but
 * never below the 04 floor rate. Layer boxes are shrunk by the resulting envelope (cameraSafeBox) so copy stays title-safe. */
export const pushTotal = (intensity: number, dur: number, fps: number): number => {
  const per5s = Math.min(0.03, 0.015 + (CAMERA.driftPctPer5s - 0.005) * intensity); // 1.5 % .. 3.0 % per 5 s
  const n5 = dur / (5 * fps);
  return Math.min(per5s * n5, Math.max(PUSH_TOTAL_CAP, PUSH_FLOOR_PER5S * n5));
};

/**
 * Camera state at shot-local frame t. Ambient drift (04 section 2: 1.5-3 % push per 5 s) scales with intensity;
 * explicit moves add their own displacement. Nudges (impact, <= 4 px, ONE frame) are applied on their exact frame.
 * A hold (`static`) keeps only particle drift (04 section 2): no camera push.
 */
export const cameraAt = (cam: ResolvedShot['camera'], t: number, dur: number, fps: number): Cam => {
  const p = easeOf(cam.ease)(Math.min(1, Math.max(0, t / Math.max(1, dur))));
  const drift = pushTotal(cam.intensity, dur, fps);
  const k = cam.intensity;
  let s = 1 + drift * p;
  let x = 0;
  let y = 0;
  let rz = 0;
  switch (cam.move) {
    case 'pull_out':
      s = 1 + drift * (1 - p) + 0.02 * k * (1 - p);
      break;
    case 'truck':
    case 'follow':
      x = -80 * k * (p - 0.5) * 2;
      break;
    case 'pedestal':
    case 'crane':
      y = -50 * k * (p - 0.5) * 2;
      if (cam.move === 'crane') s += 0.02 * k * p;
      break;
    case 'orbit':
    case 'yaw':
      x = -60 * k * Math.sin(p * Math.PI * 0.5);
      rz = (CAMERA.orbitDegPerS * k * t) / fps / 10; // a hint of roll; true orbit lives in 3D components
      break;
    case 'dolly_zoom':
      s = 1 + 0.12 * k * p;
      break;
    case 'static':
      s = 1;
      break;
    default: // push_in
      s = 1 + (drift + 0.02 * k) * p;
  }
  if (cam.nudges.includes(Math.round(t))) x += IMPACT.nudgePxMax;
  return {s, x, y, rz};
};

/**
 * Camera envelope (P7 review B3). The largest box whose on-screen image stays inside `target` for every frame of the shot
 * (0 .. dur + tail) on a plane with this parallax: translate(x*par) scale(1+(s-1)*par) rotate(rz*par) about the frame centre
 * (planeStyle), plus the one-frame impact nudge and a roll margin. Layout (auto-fit maxW / maxH) uses this box, so copy that
 * fills its slot is still title-safe at the peak of the push.
 */
export const cameraSafeBox = (cam: ResolvedShot['camera'], dur: number, tail: number, fps: number, parallax: number, target: Rect): Rect => {
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.hypot(Math.max(Math.abs(target.x - cx), Math.abs(target.x + target.w - cx)), Math.max(Math.abs(target.y - cy), Math.abs(target.y + target.h - cy)));
  let l = -Infinity;
  let r = Infinity;
  let t = -Infinity;
  let b = Infinity;
  const nudge = IMPACT.nudgePxMax * parallax;
  for (let f = 0; f <= dur + tail; f++) {
    const c = cameraAt({...cam, nudges: []}, f, dur, fps);
    const S = 1 + (c.s - 1) * parallax;
    const X = c.x * parallax;
    const Y = c.y * parallax;
    const m = S * Math.abs((c.rz * parallax * Math.PI) / 180) * R; // roll moves a point by at most |theta| x radius
    l = Math.max(l, (target.x - cx - X + m) / S);
    r = Math.min(r, (target.x + target.w - cx - X - m - nudge) / S); // the impact nudge pushes right (+x)
    t = Math.max(t, (target.y - cy - Y + m) / S);
    b = Math.min(b, (target.y + target.h - cy - Y - m) / S);
  }
  const x0 = Math.ceil(cx + l);
  const y0 = Math.ceil(cy + t);
  return {x: x0, y: y0, w: Math.max(0, Math.floor(cx + r) - x0), h: Math.max(0, Math.floor(cy + b) - y0)};
};

/** Transform of one depth plane: translation x parallax, scale growth x parallax (far planes move less). */
export const planeStyle = (c: Cam, parallax: number, blurPx: number): React.CSSProperties => ({
  transform: `translate(${(c.x * parallax).toFixed(2)}px, ${(c.y * parallax).toFixed(2)}px) scale(${(1 + (c.s - 1) * parallax).toFixed(5)}) rotate(${(c.rz * parallax).toFixed(4)}deg)`,
  transformOrigin: '50% 50%',
  filter: blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : undefined,
});

/** dolly-zoom counter-scale on the far plane (background holds while the subject grows). */
export const dollyCounter = (cam: ResolvedShot['camera'], c: Cam): number => (cam.move === 'dolly_zoom' ? 1 / c.s : 1);

export type TransitionState = {
  wrap: React.CSSProperties; // whole shot: whip / streak travel + blur, match scale
  fadeIn: number; // opacity of the backdrop, non-text layers and post while a dissolve / match brings the shot in
  textOut: number; // opacity of text layers in the outgoing tail of a dissolve / match (0 at the end of the tail)
  transit: boolean; // inside a transition: the title-safe check skips this shot's copy (whips move it off frame on purpose)
};

/**
 * Transition state of a shot at local frame t. `tin` = the previous shot's transition (how this shot enters), `tout` = this
 * shot's own transition_out (how it leaves). dissolve / match: the incoming backdrop and non-text layers fade in over T while
 * the outgoing shot keeps rendering underneath (its Sequence is extended by T). Text layers are NOT faded in: copy appears
 * only through its own anchored reveal, so the first word after a dissolve is fully visible on its frame (P7 review M5);
 * the outgoing shot's copy fades out over the tail instead, so two captions never overlap. whip / streak: out over the last
 * T/2 frames, in over the first T/2.
 */
export const transitionState = (t: number, dur: number, tin: ResolvedShot['transition'] | null, tout: ResolvedShot['transition']): TransitionState => {
  let fadeIn = 1;
  let textOut = 1;
  let x = 0;
  let blur = 0;
  let sc = 1;
  let transit = false;
  if (tin && tin.frames > 0) {
    const T = tin.frames;
    if (tin.type === 'dissolve' || tin.type === 'match') {
      fadeIn = interpolate(t, [0, T], [0, 1], {...clamp, easing: ease.camera});
      if (tin.type === 'match') sc = interpolate(t, [0, T], [1.04, 1], {...clamp, easing: ease.camera});
      if (t < T) transit = true;
    } else if (tin.type === 'whip' || tin.type === 'streak') {
      const h = Math.max(1, Math.round(T / 2));
      const q = interpolate(t, [0, h], [1, 0], {...clamp, easing: ease.camera});
      x += q * W * (tin.type === 'whip' ? 0.5 : 0.25);
      blur += q * (tin.type === 'whip' ? 24 : 12);
      if (t < h) transit = true;
    }
  }
  if (tout.frames > 0 && (tout.type === 'whip' || tout.type === 'streak')) {
    const h = Math.max(1, Math.round(tout.frames / 2));
    const q = interpolate(t, [dur - h, dur], [0, 1], {...clamp, easing: ease.camera});
    x -= q * W * (tout.type === 'whip' ? 0.5 : 0.25); // RTL film: content leaves to the left, the next shot enters from the right
    blur += q * (tout.type === 'whip' ? 24 : 12);
    if (t > dur - h) transit = true;
  }
  if (tout.frames > 0 && (tout.type === 'dissolve' || tout.type === 'match') && t >= dur) {
    textOut = interpolate(t, [dur, dur + tout.frames], [1, 0], {...clamp, easing: ease.camera});
    transit = true;
  }
  return {
    wrap: {
      transform: x || sc !== 1 ? `translateX(${x.toFixed(1)}px) scale(${sc.toFixed(4)})` : undefined,
      filter: blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : undefined,
    },
    fadeIn,
    textOut,
    transit,
  };
};

/** Extra frames an outgoing shot keeps rendering under the incoming one. */
export const tailFrames = (tout: ResolvedShot['transition']): number => (tout.type === 'dissolve' || tout.type === 'match' ? tout.frames : 0);

/** Light-streak overlay progress (0..1) around the cut, or null. */
export const streakAt = (t: number, dur: number, tout: ResolvedShot['transition'], fx: Fx): number | null => {
  if (tout.type !== 'streak' || tout.frames <= 0) return null;
  const h = Math.max(1, Math.round(tout.frames / 2));
  if (t < dur - h) return null;
  return Math.min(1, (t - (dur - h)) / (2 * h)) * (fx.id === 'lite' ? 0.8 : 1);
};
