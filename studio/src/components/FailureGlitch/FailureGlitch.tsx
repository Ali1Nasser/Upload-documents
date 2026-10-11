// FailureGlitch (catalog: State & FX). The failure beat of the scene contract (04 §4: "failure (crit glitch)"; master §4).
// On the anchor frame (RV1) the target (`to`, else the whole title-safe frame) glitches for one beat (morph upper bound, 500 ms):
//  - the target jumps sideways on seeded film-frame steps (<= 4 + 8 x intensity px, the Shake cap of 12 px), title-safe clamped;
//  - crit / signal scan slices and block noise flicker over its box (screen blend at standard; never a copy of the target's text,
//    so no chromatic aberration ever touches Arabic, ADR-002);
//  - ONE crit flash at the onset (2 film frames). One burst per anchor = at most 2 flashes per second (WCAG 2.3.1: <= 3/s).
// It then HOLDS the failed state until `until` / shot end: crit corner brackets on the target and the Arabic label chip (crit edge,
// cross icon) in the layer's slot (default lower third), revealed with the `label` preset on the anchor.
import React from 'react';
import {hex} from '../../fx/look';
import {C} from '../../tokens';
import {presetFrames, revealProgress} from '../../type/reveal';
import {safeRect, type Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, clampToRoom, useFxTarget} from '../_fx-a/drive';
import {Brackets, Chip, IconCross, abs, beat, boxGlow, chipRect, exitK, filmIx, pad, rnd, stepLen} from '../_fx-a/kit';
import type {Props} from './schema';

const FLASH_F24 = 2; // film frames of the single onset flash

export type GlitchState = {on: boolean; u: number; step: number; amp: number};
export const glitchAt = (t: number, fps: number, intensity: number): GlitchState => {
  const n = beat(fps);
  if (t < 0 || t >= n) return {on: false, u: 0, step: 0, amp: 0};
  const u = t / n;
  // two bursts inside the beat (strong, then a weaker after-shock), so it reads as a glitch and not a shake
  const env = u < 0.55 ? 1 : 0.45;
  return {on: true, u, step: Math.floor(filmIx(t, fps) / 2), amp: (4 + 8 * intensity) * env};
};

const Slices: React.FC<{r: Rect; g: GlitchState; seed: string; intensity: number; blend: boolean; flash: number}> = ({r, g, seed, intensity, blend, flash}) => {
  const nSl = 3 + Math.round(5 * intensity);
  const nBl = 6 + Math.round(8 * intensity);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < nSl; i++) {
    const y = rnd(seed, 's', g.step, i) * r.h;
    const h = 2 + rnd(seed, 'h', g.step, i) * r.h * 0.07;
    const dx = (rnd(seed, 'd', g.step, i) * 2 - 1) * g.amp * 3;
    const col = i % 3 === 0 ? C.signal : C.crit;
    out.push(<div key={`s${i}`} style={{position: 'absolute', left: dx, top: y, width: r.w, height: h, background: `${col}${hex(0.22 + 0.25 * intensity)}`}} />);
  }
  for (let i = 0; i < nBl; i++) {
    const s = 6 + rnd(seed, 'bs', g.step, i) * 18;
    out.push(
      <div
        key={`b${i}`}
        style={{position: 'absolute', left: rnd(seed, 'bx', g.step, i) * (r.w - s), top: rnd(seed, 'by', g.step, i) * (r.h - s), width: s * (1 + rnd(seed, 'bw', i) * 2), height: s, background: `${i % 2 ? C.crit : C.ink3}${hex(0.35)}`}}
      />,
    );
  }
  return (
    <div style={{...abs(r), overflow: 'hidden', mixBlendMode: blend ? 'screen' : undefined}}>
      {flash > 0 ? <div style={{position: 'absolute', inset: 0, background: `${C.crit}${hex(0.3 * flash)}`}} /> : null}
      {out}
    </div>
  );
};

export const FailureGlitchView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const g = glitchAt(t, ctx.fps, props.intensity);
  const seed = `glitch:${ctx.id}`;
  const jx = g.on ? (rnd(seed, 'jx', g.step) * 2 - 1) * g.amp : 0;
  const {ref, m} = useFxTarget(props.to, ctx.frame, seed, (mm) => {
    if (!g.on) return null;
    const [tx] = clampToRoom(jx, 0, mm.room);
    return {...IDENTITY, tx};
  });
  const s = safeRect('title');
  const r = props.to ? m?.rect : s;
  const flashN = Math.max(1, Math.round((FLASH_F24 * ctx.fps) / 24));
  const flash = g.on && t < flashN ? 1 : 0;
  const hold = revealProgress(t - stepLen(ctx.fps), presetFrames('label', ctx.fps)); // brackets settle in after the first jolt
  const k = exitK(ctx);
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: k}}>
      {r && g.on ? <Slices r={pad(r, 6)} g={g} seed={seed} intensity={props.intensity} blend={ctx.fx.id !== 'lite'} flash={flash} /> : null}
      {r && g.on && ctx.fx.id !== 'lite' ? (
        // RGB split on the box EDGES only (never on copy)
        <>
          <div style={{...abs(pad(r, 8)), transform: `translateX(${(g.amp * 0.5).toFixed(2)}px)`, border: `1px solid ${C.crit}${hex(0.6)}`, borderRadius: 8}} />
          <div style={{...abs(pad(r, 8)), transform: `translateX(${(-g.amp * 0.5).toFixed(2)}px)`, border: `1px solid ${C.signal}${hex(0.5)}`, borderRadius: 8}} />
        </>
      ) : null}
      {r && props.to && t >= 0 ? (
        <>
          <div style={{...abs(pad(r, 12)), borderRadius: 10, boxShadow: ctx.fx.id === 'lite' ? `0 0 0 1px ${C.crit}${hex(0.45 * hold)}` : `0 0 0 1px ${C.crit}${hex(0.45 * hold)}, ${boxGlow(C.crit, ctx.fx, 0.6 * hold)}`}} />
          <Brackets r={r} color={C.crit} fx={ctx.fx} opacity={hold} spread={18} />
        </>
      ) : null}
      {props.label_ar ? <Chip id={`${ctx.id}:label`} text={props.label_ar} tone="crit" ctx={ctx} slot={props.slot} at={ctx.at} icon={<IconCross color={C.crit} size={26} p={revealProgress(t, presetFrames('label', ctx.fps))} />} /> : null}
    </div>
  );
};

export const FailureGlitch: DcComponent<Props> = {
  name: 'FailureGlitch',
  Component: FailureGlitchView,
  text: true,
  slot: 'lower-third',
  textRect: (p, box) => chipRect(p.label_ar, p.slot, box),
};
