// Shared helpers of group "typeui" (Type & UI family). Thin wrappers over the type engine and the frozen tokens: no colour, size
// or FX number lives here. Arabic is never split: the smallest unit any helper animates is one whole string (a word, a tatweel
// compound such as `الـKafka`, or a Latin isolate), set through MixedText.
import React from 'react';
import {interpolate} from 'remotion';
import {C, LINE, type Fx, type PresetId} from '../../tokens';
import {caShadow, glow, halo} from '../../fx/look';
import {MixedText} from '../../type/Text';
import {isArabic, lineHeightFor} from '../../type/arabic';
import {ease, presetFrames, revealStyle, type RevealDir} from '../../type/reveal';
import type {LayerCtx} from '../../spec/types';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Reading direction of one string: Arabic copy reveals right -> left, Latin / numerals left -> right. */
export const dirOf = (s: string): RevealDir => (isArabic(s) ? 'rtl' : 'ltr');
/** Frames since the layer's exit started (undefined = no exit anchor or not yet). */
export const exitT = (ctx: LayerCtx): number | undefined => (ctx.until !== undefined ? ctx.frame - ctx.until : undefined);
/** 1 -> 0 over the exit preset (camera ease) once the exit has started. */
export const exitFade = (ctx: LayerCtx): number => {
  const e = exitT(ctx);
  return e === undefined || e < 0 ? 1 : interpolate(e, [0, presetFrames('exit', ctx.fps)], [1, 0], {...clamp, easing: ease.camera});
};
/** `n` film frames (24 fps) at the composition fps, never below 1 (a stagger of 2 film frames is 1 frame at 12 fps). */
export const filmF = (n: number, fps: number): number => Math.max(1, Math.round((n * fps) / 24));
/** Presets that are component-owned motions (count roll, particle morph) reveal type with `arrive`. */
export const textPreset = (p: PresetId | 'wipe' | undefined): PresetId | 'wipe' => (p === 'count' || p === 'morph' || !p ? 'arrive' : p);
/** Common line height for a row of strings (tashkeel rule: any string with marks lifts the row to LINE.tashkeel). */
export const rowLineHeight = (texts: string[]): number => Math.max(LINE.base, ...texts.map((t) => lineHeightFor(t)));

export type Emphasis = 'none' | 'stressed' | 'number' | 'term';
/**
 * One whole kinetic unit (word / compound / isolate) with its own preset reveal, at a size fitted by the caller. Hidden units keep
 * their layout (visibility hidden), so later words never shift when an earlier one arrives. Glow / CA follow KText exactly: CA is
 * passed to Latin and numeral isolates only, never to an Arabic run.
 */
export const Unit: React.FC<{
  id: string;
  text: string;
  size: number;
  fx: Fx;
  t: number; // frames since this unit's anchor (RV1: ink on t = 0)
  fps: number;
  preset?: PresetId | 'wipe';
  exit?: number;
  color?: string;
  emphasis?: Emphasis;
  modGlow?: number;
  lh?: number;
  weight?: number;
  part?: string;
}> = ({id, text, size, fx, t, fps, preset, exit, color = C.ink, emphasis = 'none', modGlow = 0, lh, weight, part}) => {
  const ar = isArabic(text);
  const pr = textPreset(preset);
  const r = revealStyle(t, fps, pr, ar ? 'rtl' : 'ltr', exit);
  const g = color === C.ink ? C.signal : color;
  const k = 0.6 + r.flash * 1.2 + (emphasis === 'stressed' ? 0.3 : 0) + modGlow;
  const base = `${halo}, ${glow(g, fx, k)}`;
  const ca = pr === 'impact' || emphasis === 'number' ? caShadow(fx) : '';
  return (
    <div
      data-dc-part={part}
      style={{
        display: 'inline-block',
        width: 'max-content',
        whiteSpace: 'nowrap',
        lineHeight: lh ?? (ar ? lineHeightFor(text) : LINE.base),
        color,
        textShadow: base,
        transformOrigin: ar ? 'right center' : 'left center',
        ...r.style,
      }}
    >
      <MixedText id={id} text={text} size={size} weight={weight} role={emphasis === 'number' ? 'data' : 'sentence'} caLatin={ca ? base + ca : undefined} />
    </div>
  );
};

/** Absolute box filling the layer slot (ctx.box), flex-centred by default. */
export const SlotBox: React.FC<{ctx: LayerCtx; justify?: React.CSSProperties['justifyContent']; align?: React.CSSProperties['alignItems']; style?: React.CSSProperties; children?: React.ReactNode}> = ({
  ctx,
  justify = 'center',
  align = 'center',
  style,
  children,
}) => (
  <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: align, justifyContent: justify, ...style}}>{children}</div>
);

/** RTL frame: `start` = right edge, `end` = left edge (flex-end / flex-start inside a LTR-laid box). */
export const justifyFor = (slot: string | undefined, fallback: 'start' | 'center' | 'end' = 'center'): React.CSSProperties['justifyContent'] => {
  const s = slot === 'start' || slot === 'end' ? slot : fallback;
  return s === 'start' ? 'flex-end' : s === 'end' ? 'flex-start' : 'center';
};
