// ChapterCard (catalog: Type & UI). Trunk chapter title card (04 §7): `CH-xx` in mono, the Arabic title in the display face, an optional
// English subtitle (small, Inter Tight) and the act colour bar, on a dark stage lit by a key rim light from the upper right (ADR-003
// LK-F). Metaphor (04 §6): the film is a rail of acts. The "act colour bar" is that rail, one segment per act of the master EDL; the
// current act's segment is lit (taller, emissive), earlier acts are dimmed signal, later acts stay grid, and the act label hangs under
// the lit segment. Depth: a ghost index numeral far behind on the end side (outlined, dim, slow drift), a floor pool under the rail, the
// title plane sharp in front. 2D only (the catalog implies no 3D), so lite / standard / hero differ by FX tokens alone.
// Timing (RV1, ink on the anchor frame): the `CH-xx` tag, the title (`arrive`, RTL wipe, whole string) and the first rail segment ARE
// visible on the anchor frame; the rail fills right -> left over the morph span, the English subtitle follows 3 film frames later and the
// act label 5 film frames later (`label` preset). The SFX map pairs the card with riser + sting (04 §9); the spec's `until` (or the shot
// cut) ends it with the exit preset (slide back into depth). No Arabic copy is set outside the props (whole-word lexicon guard).
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
/** The acts of the trunk in film order (corpus/edl/master_edl.v1.json chapters[].act, kind trunk). Layout data for the rail only: an act
 * the list does not know leaves every segment unlit, the card still reads (the label carries the act). */
const ACTS = ['Orientation', 'Ground Zero', 'Python', 'SQL', 'Analytics', 'Craft', 'Systems', 'Platform', 'Big data', 'Domain', 'AI', 'Ship', 'Close'] as const;

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
  const line = revealProgress(t, nM, ease.camera); // hairline beside the tag draws right -> left
  const tag = revealStyle(t, ctx.fps, 'label', 'ltr', ex);
  const title = revealStyle(t, ctx.fps, 'arrive', 'rtl', ex);
  const en = props.title_en ? revealStyle(t - f(3), ctx.fps, 'label', 'ltr', ex) : null;
  const act = props.act ? revealStyle(t - f(5), ctx.fps, 'label', 'ltr', ex) : null;
  const ghostIn = revealProgress(t, nM * 2, ease.camera);
  const drift = interpolate(ctx.frame, [ctx.at, ctx.at + ctx.fps * 3], [0, 1], clamp);
  const ghostScale = 1.06 - 0.06 * ghostIn + 0.02 * drift; // slow drift into depth
  const flash = t >= nA - 1 ? interpolate(t - (nA - 1), [0, f(2), f(6)], [1, 1, 0], clamp) : 0; // title settles -> brief rim flash
  const k = 0.6 + 0.8 * flash + ctx.mod.glow;
  const idx = String(props.index).padStart(2, '0');
  const cur = props.act ? ACTS.findIndex((a) => a.toLowerCase() === props.act!.toLowerCase()) : -1;
  const nAct = ACTS.length;
  const segH = Math.max(4, Math.round(fs * 0.045));
  const railH = Math.round(segH * 2.4);
  const out01 = 1 - out; // 0 -> 1 across the exit
  const labelRight = cur < 0 || cur + 0.5 < nAct / 2; // label hangs from the start edge for early acts, the end edge for late ones
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, opacity: out}}>
      {/* far plane: ghost index numeral on the end (left) side, outlined and dim */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: ctx.box.w * 0.02,
          fontFamily: `'${FONT.mono.family}'`,
          fontWeight: FONT.mono.weight,
          fontSize: Math.min(ctx.box.h * 1.05, SIZE.numberHero * 3.2),
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `2px ${C.ink3}`,
          opacity: 0.13 * ghostIn,
          transform: `translateX(${(-drift * ctx.box.w * 0.012).toFixed(2)}px) scale(${ghostScale.toFixed(4)})`,
          transformOrigin: 'left center',
          fontFeatureSettings: '"tnum" 1',
          whiteSpace: 'nowrap',
        }}
      >
        {idx}
      </div>
      {/* key light: soft signal haze from the upper right, plus a floor pool under the rail */}
      <div aria-hidden style={{position: 'absolute', inset: '-30% -20%', background: `radial-gradient(closest-side at 72% 34%, ${C.signal}${hex(0.11 * ghostIn)}, ${C.signal}00)`}} />
      <div aria-hidden style={{position: 'absolute', inset: '-20% -10%', background: `radial-gradient(40% 14% at 50% 70%, ${C.signal}${hex(0.07 * ghostIn)}, ${C.signal}00)`}} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div
          ref={ref}
          data-overflow={fit.overflow ? 1 : undefined}
          dir="rtl"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: 'max-content',
            outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
            transform: `scale(${(1 - out01 * 0.04).toFixed(4)})`,
            transformOrigin: 'center center',
          }}
        >
          <div style={{alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: Math.round(ts * 0.7)}}>
            <div style={tag.style}>
              <bdi dir="ltr" data-dc-text={`${ctx.id}:ch`} style={{display: 'inline-block', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: ts, letterSpacing: '0.18em', color: C.signal, textShadow: `${halo}, ${glow(C.signal, ctx.fx, 0.35)}`, whiteSpace: 'nowrap'}}>
                {props.chapter}
              </bdi>
            </div>
            <div aria-hidden style={{flex: 1, height: 2, borderRadius: 1, background: `linear-gradient(270deg, ${C.signal}${hex(0.7)}, ${C.signal}00)`, transform: `scaleX(${line.toFixed(4)})`, transformOrigin: 'right center'}} />
          </div>
          <div style={{marginTop: Math.round(fs * 0.12), fontSize: fs, lineHeight: lineHeightFor(props.title_ar), color: C.ink, textShadow: `${halo}, ${glow(C.signal, ctx.fx, 0.5 * k)}`, whiteSpace: 'nowrap', transformOrigin: 'right center', ...title.style}}>
            <Mx id={`${ctx.id}:title`} text={props.title_ar} size={fs} />
          </div>
          {props.title_en && en ? (
            <div style={{marginTop: stackGap({text: props.title_ar, size: fs}, {text: props.title_en, size: es}, 'title-sub'), fontSize: es, color: C.ink2, textShadow: halo, whiteSpace: 'nowrap', ...en.style}}>
              <Mx id={`${ctx.id}:en`} text={props.title_en} size={es} />
            </div>
          ) : null}
          {/* act rail: one segment per act, filling from the reading start (right); the current act is lit */}
          <div style={{alignSelf: 'stretch', position: 'relative', marginTop: Math.round(fs * 0.3), height: railH}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: railH, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: Math.max(4, Math.round(fs * 0.05))}}>
              {ACTS.map((a, i) => {
                const p = revealProgress(t - Math.floor((i * nM) / nAct), nA, ease.camera);
                const lit = i === cur;
                const past = cur >= 0 && i < cur;
                const col = lit ? C.signal : past ? `${C.signal}${hex(0.4)}` : C.grid;
                return (
                  <div
                    key={a}
                    style={{
                      flex: 1,
                      height: lit ? railH : segH,
                      borderRadius: railH,
                      background: lit ? `linear-gradient(270deg, ${C.signal}, ${C.signal}${hex(0.55)})` : col,
                      boxShadow: lit ? `${glow(C.signal, ctx.fx, 0.5 * k)}, inset 0 1px 0 ${C.white}${hex(0.5)}` : undefined,
                      opacity: p,
                      transform: `scaleX(${p.toFixed(4)})`,
                      transformOrigin: 'right center',
                    }}
                  />
                );
              })}
            </div>
            {props.act && act ? (
              <div
                style={{
                  position: 'absolute',
                  top: railH + Math.round(ts * 0.35),
                  ...(labelRight ? {right: `${((Math.max(cur, 0) / nAct) * 100).toFixed(3)}%`} : {left: `${((1 - (cur + 1) / nAct) * 100).toFixed(3)}%`}),
                  fontSize: ts,
                  color: C.ink2,
                  letterSpacing: '0.08em',
                  textShadow: halo,
                  whiteSpace: 'nowrap',
                  ...act.style,
                }}
              >
                <Mx id={`${ctx.id}:act`} text={props.act} size={ts} role="chip" />
              </div>
            ) : null}
          </div>
          {props.act ? <div style={{height: Math.round(ts * 1.9)}} /> : null}
        </div>
      </div>
    </div>
  );
};

/** Text-safe rect: the centred title block (the ghost numeral is decoration and may sit under haze). */
const textRect = (p: Props, box: Rect): Rect => {
  const w = Math.min(box.w, box.w * 0.86 + SIZE.title * 0.4);
  const h = Math.min(box.h, SIZE.title * 1.6 + SIZE.label * 4.6);
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const ChapterCard: DcComponent<Props> = {name: 'ChapterCard', Component: ChapterCardView, text: true, slot: 'full', textRect};
