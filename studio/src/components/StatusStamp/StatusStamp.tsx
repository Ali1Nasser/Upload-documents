// StatusStamp (catalog: Domain specials; 04 section 6 "status codes as coloured stamps"). A rubber stamp slams onto its
// slot on the layer anchor: impact preset (scale 1.08 -> 1 outBack, 80 ms glow flash) plus a press shadow that collapses
// as the stamp lands; worn-ink speckle is seeded (random(seed)), never Math.random.
// Colour is semantic (04 1.1): ok / approved -> ok, fail / rejected -> crit, pending / retry -> warn.
// The status word is Latin caps (cv08 serifed I via MixedText, e.g. PENDING); `label_ar` is set whole by the type engine.
// `to` (target layer): LayerCtx exposes only this layer's own box (engine request CR-011), so
// the stamp lands in its own slot; scene-directors place it on the target's slot. No digits are shown.
import React, {useRef} from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, IMPACT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {lineHeightFor, stackGap} from '../../type/arabic';
import {ease, flashFrames, presetFrames, revealProgress} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Stage, rim} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const WORD: Record<Props['status'], string> = {ok: 'OK', fail: 'FAIL', pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED', retry: 'RETRY'};
export const stampTone = (s: Props['status']): string => (s === 'ok' || s === 'approved' ? C.ok : s === 'fail' || s === 'rejected' ? C.crit : C.warn);
const TILT_DEG = -6;

export const StatusStampView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const tone = stampTone(props.status);
  const word = WORD[props.status];
  const size = SIZE.title;
  const fit = useAutoFit(ref, {id: ctx.id, size, min: Math.round(size * 0.6), maxW: ctx.box.w * 0.82, maxH: ctx.box.h * 0.8, key: `${word}|${props.label_ar ?? ''}`});
  const fs = fit.size;
  const t = ctx.frame - ctx.at;
  const n = presetFrames('impact', ctx.fps, true);
  const p = revealProgress(t, n); // RV1: ink on the anchor frame
  const sc = IMPACT.scaleFrom + (1 - IMPACT.scaleFrom) * revealProgress(t, n, ease.impact);
  const ff = flashFrames(ctx.fps);
  const flash = t < 0 ? 0 : interpolate(t, [0, ff, ff * 3], [1, 1, 0], clamp);
  const press = 1 - p; // press shadow collapses as the stamp lands
  const k = 0.55 + 1.1 * flash + ctx.mod.glow;
  const labelPx = Math.max(SIZE.labelMin, Math.round(SIZE.sub * (fs / size)));
  const gap = props.label_ar ? stackGap({text: word, size: fs, lineHeight: 1.05}, {text: props.label_ar, size: labelPx}, 'title-sub') : 0;
  const specks = Array.from({length: 46}, (_, i) => ({
    x: random(`stamp:${ctx.id}:${i}:x`) * 100,
    y: random(`stamp:${ctx.id}:${i}:y`) * 100,
    r: 0.25 + random(`stamp:${ctx.id}:${i}:r`) * 0.9,
  }));
  return (
    <Stage ctx={ctx} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          transform: `rotate(${TILT_DEG}deg) scale(${sc.toFixed(4)})`,
          opacity: t < 0 ? 0 : interpolate(p, [0, 0.3], [0, 1], clamp),
        }}
      >
        <div
          ref={ref}
          data-overflow={fit.overflow ? 1 : undefined}
          style={{
            position: 'relative',
            width: 'max-content',
            padding: `${Math.round(fs * 0.22)}px ${Math.round(fs * 0.42)}px`,
            border: `${Math.max(4, Math.round(fs * 0.07))}px solid ${tone}`,
            outline: fit.overflow ? `2px dashed ${C.crit}` : `${Math.max(2, Math.round(fs * 0.025))}px solid ${tone}${hex(0.55)}`,
            outlineOffset: Math.round(fs * 0.08),
            borderRadius: Math.round(fs * 0.16),
            background: `linear-gradient(160deg, ${tone}${hex(0.16)} 0%, ${C.void}${hex(0.6)} 100%)`,
            boxShadow: `${rim(0.2)}, 0 0 ${(ctx.fx.glowPx * k).toFixed(1)}px ${tone}${hex(0.35)}, ${(press * fs * 0.18).toFixed(1)}px ${(press * fs * 0.3).toFixed(1)}px ${(4 + press * fs * 0.4).toFixed(1)}px ${C.void}${hex(0.7)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{fontSize: fs, lineHeight: 1.05, letterSpacing: '0.06em', color: tone, textShadow: `${halo}, ${glow(tone, ctx.fx, k)}`, whiteSpace: 'nowrap'}}>
            <MixedText id={`${ctx.id}:word`} text={word} size={fs} weight={FONT.lat.weight} />
          </div>
          {props.label_ar ? (
            <div style={{marginTop: gap, fontSize: labelPx, lineHeight: lineHeightFor(props.label_ar), color: C.ink, textShadow: `${halo}, ${glow(tone, ctx.fx, 0.35)}`, whiteSpace: 'nowrap'}}>
              <MixedText id={`${ctx.id}:label`} text={props.label_ar} size={labelPx} weight={FONT.label.strong} />
            </div>
          ) : null}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
            {specks.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.7} fill={C.void} fillOpacity={0.55} />
            ))}
          </svg>
        </div>
      </div>
    </Stage>
  );
};

/** Text-safe rect: the stamp's central area. */
const textRect = (p: Props, box: Rect): Rect => {
  const w = Math.min(box.w, SIZE.title * 0.75 * (WORD[p.status].length + 1.5));
  const h = Math.min(box.h, SIZE.title * (p.label_ar ? 2.4 : 1.6));
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const StatusStamp: DcComponent<Props> = {name: 'StatusStamp', Component: StatusStampView, text: true, slot: 'center', textRect};
