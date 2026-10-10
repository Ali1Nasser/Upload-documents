// Shared look helpers (P7). Thin functions over the FROZEN tokens: no colour or FX number lives here.
import {C, type Fx} from '../tokens';

export const hex = (a: number): string =>
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
/** Emissive glow text-shadow at the tier's radii, scaled by k. */
export const glow = (color: string, fx: Fx, k = 1): string => `0 0 ${(fx.glowInner * k).toFixed(1)}px ${color}, 0 0 ${(fx.glowPx * k).toFixed(1)}px ${color}80`;
/** 2-4 px dark halo (04 §3.4: every string over a busy background has a plate or a halo). */
export const halo = `0 0 3px ${C.void}, 0 0 6px ${C.void}`;
/** Chromatic aberration shadow: Latin and numeral impact runs ONLY (ADR-002 FX2); never pass it to an Arabic run. */
export const caShadow = (fx: Fx): string => (fx.caPx ? `, ${fx.caPx}px 0 0 ${C.crit}8C, ${-fx.caPx}px 0 0 ${C.signal}8C` : '');
