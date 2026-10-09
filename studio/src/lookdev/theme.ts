// Look-dev theme: a thin view over the FROZEN tokens (src/tokens.ts, ADR-002/003). No numbers live here.
import {C, EASE, FONT, FX, Fx, FxId, PRESET_MS, msToFrames} from '../tokens';

export type TypoId = 'A';
/** ADR-003 T-A. `ar` is the display face (>= 56 px); `body` is Plex Sans Arabic for text below 56 px and labels. */
export type Typo = {id: TypoId; label: string; ar: string; arWeight: number; lat: string; latWeight: number; mono: string; body: string; bodyWeight: number};

export const TYPO: Record<TypoId, Typo> = {
  A: {
    id: 'A',
    label: 'T-A: Alexandria 700 / Plex Sans Arabic 600 / Inter Tight 700 / JetBrains Mono',
    ar: FONT.arDisplay.family,
    arWeight: FONT.arDisplay.weight,
    lat: FONT.lat.family,
    latWeight: FONT.lat.weight,
    mono: FONT.mono.family,
    body: FONT.label.family,
    bodyWeight: FONT.arText.weight,
  },
};

export {FX};
export type {Fx, FxId};

export const glow = (color: string, fx: Fx, k = 1) => `0 0 ${fx.glowInner * k}px ${color}, 0 0 ${fx.glowPx * k}px ${color}80`;
/** Chromatic aberration text-shadow for Latin / numeral impact runs only (ADR-002 FX2). Never call on Arabic runs. */
export const caShadow = (fx: Fx) => (fx.caPx ? `, ${fx.caPx}px 0 0 ${C.crit}8C, ${-fx.caPx}px 0 0 ${C.signal}8C` : '');
export const halo = `0 0 3px ${C.void}, 0 0 6px ${C.void}`;

export {C, EASE, PRESET_MS, msToFrames};
