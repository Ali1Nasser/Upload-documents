// ChapterCard (catalog: Type & UI). Trunk chapter title card (04 §7): `CH-xx` in mono, the Arabic title in the display face,
// an optional English subtitle (small, Inter Tight) and the act colour bar, on a dark glass stage with a key rim light from the
// upper right (ADR-003 LK-F). Depth: a ghost index numeral far behind (outlined, dim, slow scale), the title plane sharp in front.
// Timing (RV1, ink on the anchor frame): the act bar starts drawing right -> left and the `CH-xx` tag and the title arrive ON the
// anchor (title = `arrive`, RTL wipe, whole string); the English subtitle follows 3 film frames later and the act label 5 film
// frames later (`label` preset). The SFX map pairs the card with riser + sting (04 §9); the spec's `until` (or the shot cut) ends it
// with the exit preset. No Arabic copy is set outside the props (whole-word lexicon guard).
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {lineHeightFor, stackGap} from '../../type/arabic';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {Mx, clamp, exitFade, exitT, filmF} from '../_typeui/kit';
import type {Props} from './schema';

const EN_K = SIZE.label / SIZE.title; // English subtitle size relative to the title (32 / 104)
const TAG_K = SIZE.label / SIZE.title;

export const ChapterCardView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE.title;
  const fit = useAutoFit(ref, {
    id: ctx.id,
    size,
    min: Math.max(FONT.arDisplay.minPx, Math.round(size * 0.6)),
    maxW: ctx.box.w * 0.86,
    maxH: ctx.box.h * 0.8,
    key: `${props.title_ar}|${props.title_en ?? ''}|${props.act ?? ''}|${props.chapter}`,
  });
  const fs = fit.size;
  const es = Math.max(SIZE.labelMin, Math.round(fs * EN_K));
  const ts = Math.max(SIZE.labelMin, Math.round(fs * TAG_K));
  const t = ctx.frame - ctx.at;
  const ex = exitT(ctx);
  const out = exitFade(ctx);
  const f = (n: number) => filmF(n, ctx.fps);
  const nA = presetFrames('arrive', ctx.fps);
  const nM = presetFrames('morph', ctx.fps, true);
  const bar = revealProgress(t, nM, ease.camera); // act bar draws right -> left over the long morph span
  const tag = revealStyle(t, ctx.fps, 'label', 'ltr', ex);
  const title = revealStyle(t, ctx.fps, 'arrive', 'rtl', ex);
  const en = props.title_en ? revealStyle(t - f(3), ctx.fps, 'label', 'ltr', ex) : null;
  const act = props.act ? revealStyle(t - f(5), ctx.fps, 'label', 'ltr', ex) : null;
  const ghostIn = revealProgress(t, nM * 2, ease.camera);
  const ghostScale = 1.06 - 0.06 * ghostIn + 0.02 * interpolate(ctx.frame, [ctx.at, ctx.at + ctx.fps * 3], [0, 1], clamp); // slow drift into depth
  const flash = t >= nA - 1 ? interpolate(t - (nA - 1), [0, f(2), f(6)], [1, 1, 0], clamp) : 0; // title settles -> brief rim flash
  const k = 0.6 + 0.8 * flash + ctx.mod.glow;
  const idx = String(props.index).padStart(2, '0');
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, opacity: out}}>
      {/* far plane: ghost index numeral (outlined, dim) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: `'${FONT.mono.family}'`,
          fontWeight: FONT.mono.weight,
          fontSize: Math.min(ctx.box.h * 0.95, SIZE.numberHero * 3),
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `2px ${C.grid}`,
          opacity: 0.85 * ghostIn,
          transform: `scale(${ghostScale.toFixed(4)})`,
          fontFeatureSettings: '"tnum" 1',
          whiteSpace: 'nowrap',
        }}
      >
        {idx}
      </div>
      {/* key light: soft signal haze from the upper right */}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(60% 70% at 78% 18%, ${C.signal}${hex(0.07 * ghostIn)}, transparent 70%)`}} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} dir="rtl" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'max-content', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
          <div style={{display: 'flex', alignItems: 'center', gap: Math.round(ts * 0.8), ...tag.style}}>
            <bdi dir="ltr" data-dc-text={`${ctx.id}:ch`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: ts, letterSpacing: '0.18em', color: C.signal, textShadow: `${halo}, ${glow(C.signal, ctx.fx, 0.35)}`, whiteSpace: 'nowrap'}}>
              {props.chapter}
            </bdi>
          </div>
          <div style={{marginTop: Math.round(fs * 0.12), fontSize: fs, lineHeight: lineHeightFor(props.title_ar), color: C.ink, textShadow: `${halo}, ${glow(C.signal, ctx.fx, 0.5 * k)}`, whiteSpace: 'nowrap', transformOrigin: 'right center', ...title.style}}>
            <Mx id={`${ctx.id}:title`} text={props.title_ar} size={fs} />
          </div>
          {/* act colour bar: draws from the reading start (right) */}
          <div style={{alignSelf: 'stretch', marginTop: Math.round(fs * 0.18), height: Math.max(3, Math.round(fs * 0.05)), borderRadius: fs, background: `linear-gradient(270deg, ${C.signal}, ${C.signal}${hex(0.15)})`, boxShadow: glow(C.signal, ctx.fx, 0.35 * k), transform: `scaleX(${bar.toFixed(4)})`, transformOrigin: 'right center'}} />
          {props.title_en || props.act ? (
            <div
              style={{
                alignSelf: 'stretch',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: Math.round(es * 1.5),
                marginTop: Math.round(fs * 0.16) + stackGap({text: props.title_ar, size: fs}, {text: props.title_en ?? props.act ?? '', size: es}, 'title-sub'),
              }}
            >
              {props.title_en && en ? (
                <div style={{fontSize: es, color: C.ink2, textShadow: halo, whiteSpace: 'nowrap', ...en.style}}>
                  <Mx id={`${ctx.id}:en`} text={props.title_en} size={es} />
                </div>
              ) : (
                <span />
              )}
              {props.act && act ? (
                <div style={{fontSize: ts, color: C.ink3, letterSpacing: '0.08em', textShadow: halo, whiteSpace: 'nowrap', ...act.style}}>
                  <Mx id={`${ctx.id}:act`} text={props.act} size={ts} role="chip" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/** Text-safe rect: the centred title block (the ghost numeral is decoration and may sit under haze). */
const textRect = (p: Props, box: Rect): Rect => {
  const w = Math.min(box.w, box.w * 0.86 + SIZE.title * 0.4);
  const h = Math.min(box.h, SIZE.title * 1.6 + SIZE.label * 3.4);
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const ChapterCard: DcComponent<Props> = {name: 'ChapterCard', Component: ChapterCardView, text: true, slot: 'full', textRect};
