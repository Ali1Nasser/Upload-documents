// P6 look-dev candidates. Not frozen: ADR-003 picks one TYPO candidate and freezes FX numbers into src/tokens.ts.
import {Easing} from 'remotion';
import {C} from '../tokens';

export type TypoId = 'A' | 'B' | 'C';
export type FxId = 'standard' | 'hero';

export type Typo = {id: TypoId; label: string; ar: string; arWeight: number; lat: string; latWeight: number; mono: string; body: string};

// Arabic display candidates (04 §3.1). Body labels stay IBM Plex Sans Arabic in all three (04 §3.1 "Arabic body labels").
export const TYPO: Record<TypoId, Typo> = {
  A: {id: 'A', label: 'Alexandria / Inter Tight / JetBrains Mono', ar: 'LD-Alexandria', arWeight: 700, lat: 'LD-InterTight', latWeight: 700, mono: 'LD-JBMono', body: 'LD-PlexArabic'},
  B: {id: 'B', label: 'Readex Pro / Space Grotesk / JetBrains Mono', ar: 'LD-Readex', arWeight: 700, lat: 'LD-SpaceGrotesk', latWeight: 700, mono: 'LD-JBMono', body: 'LD-PlexArabic'},
  C: {id: 'C', label: 'IBM Plex Sans Arabic / Inter Tight / JetBrains Mono', ar: 'LD-PlexArabic', arWeight: 700, lat: 'LD-InterTight', latWeight: 700, mono: 'LD-JBMono', body: 'LD-PlexArabic'},
};

/** FX intensity candidates (04 §1.3). Numbers here are the proposals the critic scores; ADR-003 freezes them. */
export type Fx = {
  id: FxId;
  glowPx: number; // outer glow radius for emissive marks / impact type
  glowInner: number;
  grain: number; // luma amplitude (0..1)
  vignette: number; // edge darkening (0..1)
  caPx: number; // chromatic aberration offset on impact edges
  haze: number; // signal haze opacity
  dofBlurPx: number; // fake DOF blur for far layers
  bokeh: number; // foreground bokeh discs
  particles: number; // galaxy / swarm budget
  bloomGL: number; // postprocessing bloom intensity (hero WebGL only; 0 = CSS glow)
};

export const FX: Record<FxId, Fx> = {
  standard: {id: 'standard', glowPx: 18, glowInner: 6, grain: 0.012, vignette: 0.12, caPx: 0, haze: 0.05, dofBlurPx: 2, bokeh: 8, particles: 1500, bloomGL: 0},
  hero: {id: 'hero', glowPx: 32, glowInner: 10, grain: 0.015, vignette: 0.15, caPx: 0.6, haze: 0.08, dofBlurPx: 4, bokeh: 14, particles: 4000, bloomGL: 1.0},
};

// 04 §2 easing law.
export const EASE = {
  camera: Easing.inOut(Easing.cubic),
  impact: Easing.out(Easing.back(1.7)),
  arrive: Easing.out(Easing.exp),
};

// 04 §3.5 preset timings in ms (resolved to frames with the composition fps).
export const PRESET_MS = {arrive: 240, impact: 160, impactFlash: 80, label: 160, exitMin: 200} as const;

export const msToFrames = (ms: number, fps: number) => Math.round((ms * fps) / 1000);

export const glow = (color: string, fx: Fx, k = 1) =>
  `0 0 ${fx.glowInner * k}px ${color}, 0 0 ${fx.glowPx * k}px ${color}80`;

export const halo = `0 0 3px ${C.void}, 0 0 6px ${C.void}`;

export {C};
