// Shared look + timing kit for group "fx-a" (State & FX). Tokens only: colours from C, sizes from SIZE, FX numbers from the tier,
// durations from the frozen PRESETS (ms truth, via presetFrames). Component-owned motion that starts on an anchor goes through
// revealProgress (RV1, ADR-011 Q2): its first visible step lands ON the anchor frame.
import React from 'react';
import {interpolate, random} from 'remotion';
import {hex} from '../../fx/look';
import {C, SIZE, type ColorToken, type Fx} from '../../tokens';
import {visLen} from '../../type/arabic';
import {presetFrames, revealProgress} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import {KText} from '../../type/Text';
import type {LayerCtx} from '../../spec/types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** FX beat lengths at `fps`, all from frozen presets: `beat` = morph upper bound (500 ms: one pulse, one glitch burst, the morph),
 * `settle` = exit upper bound (400 ms: settle, shake), `step` = impact upper bound (180 ms). */
export const beat = (fps: number) => presetFrames('morph', fps, true);
export const settleLen = (fps: number) => presetFrames('exit', fps, true);
export const stepLen = (fps: number) => presetFrames('impact', fps, true);

/** Film-frame index of a shot-local frame (24-fps grid), so seeded steps change at the same film times at 12 / 24 fps. */
export const filmIx = (t: number, fps: number) => Math.floor((t * 24) / fps + 1e-6);

/** Layer opacity: 1 until `until`, then the exit preset (200 ms, camera ease). */
export const exitK = (ctx: LayerCtx): number =>
  ctx.until === undefined || ctx.frame < ctx.until ? 1 : interpolate(ctx.frame - ctx.until, [0, presetFrames('exit', ctx.fps)], [1, 0], clamp);

/** Emissive box glow at the tier radii (box-shadow, cheap; no per-frame filter blur). */
export const boxGlow = (color: string, fx: Fx, k = 1): string => `0 0 ${(fx.glowInner * k).toFixed(1)}px ${color}${hex(0.75)}, 0 0 ${(fx.glowPx * k).toFixed(1)}px ${color}${hex(0.35)}`;

/** Seeded value in [0, 1) (remotion random: deterministic). */
export const rnd = (...k: (string | number)[]) => random(k.join(':'));

export const pad = (r: Rect, p: number): Rect => ({x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p});
export const abs = (r: Rect): React.CSSProperties => ({position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h});

/** Four corner brackets around `r` (status frame of a failure / fix beat). `inset` > 0 starts them further out (they close in). */
export const Brackets: React.FC<{r: Rect; color: string; fx: Fx; opacity: number; arm?: number; spread?: number; width?: number}> = ({r, color, fx, opacity, arm = 22, spread = 0, width = 3}) => {
  if (opacity <= 0.001) return null;
  const R = pad(r, spread);
  const a = Math.min(arm, R.w / 3, R.h / 3);
  const b = `${width}px solid ${color}`;
  const corner = (k: number): React.CSSProperties => ({
    position: 'absolute',
    width: a,
    height: a,
    left: k % 2 ? R.x + R.w - a : R.x,
    top: k > 1 ? R.y + R.h - a : R.y,
    borderTop: k < 2 ? b : undefined,
    borderBottom: k > 1 ? b : undefined,
    borderLeft: k % 2 ? undefined : b,
    borderRight: k % 2 ? b : undefined,
    boxShadow: fx.id === 'lite' ? undefined : boxGlow(color, fx, 0.5),
  });
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={corner(k)} />
      ))}
    </div>
  );
};

const justify = (slot?: string) => (slot === 'start' ? 'flex-end' : slot === 'end' ? 'flex-start' : 'center');
const CHIP_PAD_X = 0.75; // em
const CHIP_PAD_Y = 0.32; // em

/**
 * Status chip: the beat's Arabic label on a glass plate with a semantic edge (crit = failure, ok = fix), revealed with the frozen
 * `label` preset on the anchor (RV1). The chip lives in the layer's slot box (aligned start / end / centre like KineticWord), so the
 * text-safe rect is known statically (chipRect). Copy goes through KText (whole words, auto-fit, overflow detector).
 */
export const Chip: React.FC<{id: string; text: string; tone: ColorToken; ctx: LayerCtx; slot?: string; at: number; icon?: React.ReactNode}> = ({id, text, tone, ctx, slot, at, icon}) => {
  const p = revealProgress(ctx.frame - at, presetFrames('label', ctx.fps));
  const col = C[tone];
  const size = SIZE.label;
  return (
    <div style={{...abs(ctx.box), display: 'flex', alignItems: 'center', justifyContent: justify(slot), pointerEvents: 'none'}}>
      <div
        dir="rtl"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: size * 0.4,
          padding: `${CHIP_PAD_Y}em ${CHIP_PAD_X}em`,
          fontSize: size,
          background: `${C.panel}${hex(0.85)}`,
          borderRight: `4px solid ${col}`,
          borderRadius: 6,
          boxShadow: `0 0 0 1px ${col}${hex(0.35)}${ctx.fx.id === 'lite' ? '' : `, ${boxGlow(col, ctx.fx, 0.35)}`}`,
          opacity: p,
          visibility: ctx.frame < at ? 'hidden' : undefined,
        }}
      >
        <KText id={id} text={text} size={size} min={SIZE.labelMin} maxW={Math.max(SIZE.labelMin * 4, ctx.box.w - size * 3.5)} maxH={ctx.box.h} fx={ctx.fx} at={at} exitAt={ctx.until} fps={ctx.fps} frame={ctx.frame} preset="label" color={C.ink} glowColor={col} />
        {icon}
      </div>
    </div>
  );
};
/** Static estimate of the chip box inside `box` (text-safe mask; ADR-002). */
export const chipRect = (text: string | undefined, slot: string | undefined, box: Rect): Rect => {
  if (!text) return {x: box.x + box.w / 2, y: box.y + box.h / 2, w: 0, h: 0};
  const size = SIZE.label;
  const w = Math.min(box.w, size * 0.62 * visLen(text) + size * (2 * CHIP_PAD_X + 1.6));
  const h = Math.min(box.h, size * (1.6 + 2 * CHIP_PAD_Y));
  const x = slot === 'start' ? box.x + box.w - w : slot === 'end' ? box.x : box.x + (box.w - w) / 2;
  return {x, y: box.y + (box.h - h) / 2, w, h};
};

/** Small SVG icons for the chips (drawn, never text): a cross for failure, a check (stroke-drawn on the anchor) for a fix. */
export const IconCross: React.FC<{color: string; size: number; p: number}> = ({color, size, p}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{flex: 'none', opacity: p}}>
    <path d="M6 6 L18 18 M18 6 L6 18" stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />
  </svg>
);
export const IconCheck: React.FC<{color: string; size: number; p: number}> = ({color, size, p}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{flex: 'none'}}>
    <path d="M4.5 12.5 L10 18 L19.5 6.5" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
