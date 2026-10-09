// FROZEN design tokens (ADR-002 render stack, ADR-003 look/typography; Visual Bible 04 §1-§5).
// Components never hard-code a colour, size, font or FX number: they import from here.
// A change here is a token swap (ADR-002 R5, ADR-003 LK-F -> LK-H) and needs a Council ADR.
import {Easing} from 'remotion';

const deepFreeze = <T,>(o: T): T => {
  Object.values(o as object).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(o);
};

// ---------- palette (04 §1.1, frozen by ADR-003 LK-F) ----------
export const C = deepFreeze({
  void: '#05070B',
  ground: '#0D1117',
  panel: '#161B22',
  grid: '#1B2430',
  ink: '#E6EDF3',
  ink2: '#9FB0BD',
  ink3: '#7D8C99',
  signal: '#37D8FF',
  ok: '#3FD98A',
  warn: '#FFB84D',
  crit: '#FF6B63',
  violet: '#A88CFF',
  ember: '#FF7A59',
  paper: '#EEF2F6', // receipt stock (decorative neutral)
  paperShade: '#C9D2DB',
  paperInk: '#0B0E13',
  paperOk: '#0E7A45',
  paperCrit: '#B3261E',
  white: '#FFFFFF',
} as const);
export type ColorToken = keyof typeof C;

// ---------- render stack (ADR-002) ----------
export const FPS = 24; // ADR-002 Q2.1 F24
export const W = 1920;
export const H = 1080;
export const GL = 'swiftshader' as const; // ADR-002 Q2.2: never mixed within a shot, chunk set or chapter
export const PREVIEW = deepFreeze({width: 960, height: 540, fps: 15, tier: 'lite' as const});
export const HERO_SHARE_MAX = 0.05; // ADR-002 Q2.3 RT5 (film runtime share of real-time WebGL)

/** 04 §4 timing table re-specified at 24 fps, milliseconds preserved (ADR-002 Q2.1). */
export const LEAD_FRAMES = deepFreeze({
  kinetic: 2, // 83 ms
  stateChange: 2,
  cutMin: 3,
  cutMax: 5,
  sfx: 3,
  resultHoldMin: 29,
  predictionPauseMax: 144,
});

// ---------- typography (ADR-003 T-A) ----------
// Family names are registered by the font loader (src/lookdev/fonts.ts; P7 src/type/fonts.ts).
export const FONT = deepFreeze({
  arDisplay: {family: 'DC-Alexandria', weight: 700, minPx: 56}, // Alexandria 700 at >= 56 px only
  arText: {family: 'DC-PlexArabic', weight: 600, wordSpacing: '0.08em'}, // Arabic below 56 px
  label: {family: 'DC-PlexArabic', weight: 500, strong: 600},
  lat: {family: 'DC-InterTight', weight: 700},
  mono: {family: 'DC-JBMono', weight: 600},
});

/** Type scale in px at 1080p (04 §3.2). Labels: 28 px spoken/object floor, 18 px non-spoken floor (ADR-003). */
export const SIZE = deepFreeze({
  hero: 176,
  impact: 120,
  title: 104,
  kinetic: 92,
  sub: 56,
  body: 40,
  label: 32,
  labelMin: 28, // object labels and any label tied to a spoken term or number
  secondaryMin: 18, // non-spoken secondary microcopy (dc spec lint hard floor)
  numberHero: 200,
  numberBig: 140,
});

/** Line metrics. The tashkeel rule lives in src/type/arabic.ts and reads these. */
export const LINE = deepFreeze({
  base: 1.3,
  tashkeel: 1.6, // any Arabic line carrying diacritics (ADR-003)
  titleSubGapEm: 0.3, // title -> subtitle minimum extra gap (ADR-003; F5 ثوانٍ fix)
  lowerMarkEm: 0.22, // extra clearance below a line with lower marks (kasra, kasratan, hamza below)
  upperMarkEm: 0.18, // extra clearance above a line with upper marks (fatha, damma, shadda, sukun, tanween)
  arWordSpacing: '0.08em', // ر / ي tail crowding (look-dev finding 4)
});

// ---------- FX tiers (ADR-002 Q2.4 FX2) ----------
export type FxId = 'lite' | 'standard' | 'hero';
export type Fx = {
  id: FxId;
  glowPx: number; // outer glow radius for emissive marks / impact type
  glowInner: number;
  grain: number; // luma amplitude (0..1)
  vignette: number; // edge darkening (0..1)
  caPx: number; // chromatic aberration; Latin and numeral impact runs ONLY, never Arabic (ADR-002)
  haze: number; // signal haze opacity
  dofBlurPx: number; // fake DOF blur for far layers
  bokeh: number; // foreground bokeh discs
  particles: number; // particle cap (hero cap 1,500, ADR-002)
  bloomGL: number; // postprocessing bloom intensity (hero WebGL only; 0 = CSS glow)
  webgl: boolean; // real-time R3F allowed
  textSafe: boolean; // particles, haze and bloom masked out of text boxes + padding (ADR-002)
  textSafePadPx: number;
};

export const FX: Readonly<Record<FxId, Fx>> = deepFreeze({
  lite: {id: 'lite', glowPx: 10, glowInner: 4, grain: 0, vignette: 0.1, caPx: 0, haze: 0.05, dofBlurPx: 0, bokeh: 0, particles: 300, bloomGL: 0, webgl: false, textSafe: true, textSafePadPx: 24},
  standard: {id: 'standard', glowPx: 32, glowInner: 10, grain: 0.015, vignette: 0.15, caPx: 0.6, haze: 0.08, dofBlurPx: 4, bokeh: 14, particles: 1500, bloomGL: 0, webgl: false, textSafe: true, textSafePadPx: 36},
  hero: {id: 'hero', glowPx: 32, glowInner: 10, grain: 0.015, vignette: 0.15, caPx: 0.6, haze: 0.08, dofBlurPx: 4, bokeh: 14, particles: 1500, bloomGL: 1.0, webgl: true, textSafe: true, textSafePadPx: 36},
} as Record<FxId, Fx>);

// ---------- motion presets (04 §2 easing law, §3.5 presets) ----------
export const EASE = {
  camera: Easing.inOut(Easing.cubic),
  impact: Easing.out(Easing.back(1.7)),
  arrive: Easing.out(Easing.exp),
};
export const PRESET_MS = deepFreeze({arrive: 240, impact: 160, impactFlash: 80, label: 160, exitMin: 200, whipTotal: 520});
export const CAMERA = deepFreeze({driftPctPer5s: 0.02, nudgePxMax: 4, orbitDegPerS: 0.3});

export const msToFrames = (ms: number, fps: number) => Math.round((ms * fps) / 1000);
