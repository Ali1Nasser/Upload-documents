// Camera rig, depth parallax and shot transitions (P7.3). Pure math over the FROZEN tokens (04 section 2 camera language,
// CAMERA / IMPACT / EASE). Never dead-static: every move carries at least the ambient drift.
import type React from 'react';
import {interpolate} from 'remotion';
import {CAMERA, IMPACT, W, type Fx} from '../tokens';
import {ease} from '../type/reveal';
import type {ResolvedShot} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export type Cam = {s: number; x: number; y: number; rz: number};

const easeOf = (e: string) => (e === 'linear' ? (p: number) => p : e === 'outExpo' ? ease.arrive : ease.camera);

/**
 * Camera state at shot-local frame t. Ambient drift (04 section 2: 1.5-3 % push per 5 s) scales with intensity;
 * explicit moves add their own displacement. Nudges (impact, <= 4 px, ONE frame) are applied on their exact frame.
 */
export const cameraAt = (cam: ResolvedShot['camera'], t: number, dur: number, fps: number): Cam => {
  const p = easeOf(cam.ease)(Math.min(1, Math.max(0, t / Math.max(1, dur))));
  const per5s = 0.015 + (CAMERA.driftPctPer5s - 0.005) * cam.intensity; // 1.5 % .. 3.5 % at intensity 1 (capped below)
  const drift = Math.min(0.03, per5s) * (dur / (5 * fps)); // total push over the shot
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
      s = 1 + Math.min(0.015, drift) * p; // a hold keeps only the minimum drift
      break;
    default: // push_in
      s = 1 + (drift + 0.02 * k) * p;
  }
  if (cam.nudges.includes(Math.round(t))) x += IMPACT.nudgePxMax;
  return {s, x, y, rz};
};

/** Transform of one depth plane: translation x parallax, scale growth x parallax (far planes move less). */
export const planeStyle = (c: Cam, parallax: number, blurPx: number): React.CSSProperties => ({
  transform: `translate(${(c.x * parallax).toFixed(2)}px, ${(c.y * parallax).toFixed(2)}px) scale(${(1 + (c.s - 1) * parallax).toFixed(5)}) rotate(${(c.rz * parallax).toFixed(4)}deg)`,
  transformOrigin: '50% 50%',
  filter: blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : undefined,
});

/** dolly-zoom counter-scale on the far plane (background holds while the subject grows). */
export const dollyCounter = (cam: ResolvedShot['camera'], c: Cam): number => (cam.move === 'dolly_zoom' ? 1 / c.s : 1);

/**
 * Transition styles of a shot at local frame t. `tin` = the previous shot's transition (how this shot enters), `tout` = this
 * shot's own transition_out (how it leaves). dissolve / match: the incoming shot fades over T while the outgoing one keeps
 * rendering underneath (the outgoing Sequence is extended by T). whip / streak: out over the last T/2 frames, in over the first T/2.
 */
export const transitionStyle = (t: number, dur: number, tin: ResolvedShot['transition'] | null, tout: ResolvedShot['transition']): React.CSSProperties => {
  let op = 1;
  let x = 0;
  let blur = 0;
  let sc = 1;
  if (tin && tin.frames > 0) {
    const T = tin.frames;
    if (tin.type === 'dissolve' || tin.type === 'match') {
      op = interpolate(t, [0, T], [0, 1], {...clamp, easing: ease.camera});
      if (tin.type === 'match') sc = interpolate(t, [0, T], [1.04, 1], {...clamp, easing: ease.camera});
    } else if (tin.type === 'whip' || tin.type === 'streak') {
      const h = Math.max(1, Math.round(T / 2));
      const q = interpolate(t, [0, h], [1, 0], {...clamp, easing: ease.camera});
      x += q * W * (tin.type === 'whip' ? 0.5 : 0.25);
      blur += q * (tin.type === 'whip' ? 24 : 12);
    }
  }
  if (tout.frames > 0 && (tout.type === 'whip' || tout.type === 'streak')) {
    const h = Math.max(1, Math.round(tout.frames / 2));
    const q = interpolate(t, [dur - h, dur], [0, 1], {...clamp, easing: ease.camera});
    x -= q * W * (tout.type === 'whip' ? 0.5 : 0.25); // RTL film: content leaves to the left, the next shot enters from the right
    blur += q * (tout.type === 'whip' ? 24 : 12);
  }
  return {
    opacity: op,
    transform: x || sc !== 1 ? `translateX(${x.toFixed(1)}px) scale(${sc.toFixed(4)})` : undefined,
    filter: blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : undefined,
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
