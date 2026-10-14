// LowerThird (catalog: Type & UI). A caption plate for a source, term, speaker or location, anchored at the reading-start edge
// (right in the RTL frame) of the lower-third slot. Light per ADR-003 LK-F: a glass plate (panel @ 85 %) with a key rim light on
// its upper-right edge and an emissive accent bar on the start side. The bar grows on the anchor frame (RV1), the plate wipes
// open right -> left behind it, the title arrives with the `arrive` preset (RTL wipe for Arabic, LTR for a Latin-only title) and
// the subtitle follows 2 film frames later on the `label` preset. Kind sets the accent and a small drawn glyph (no copy):
// term = signal (the thing being explained), source / speaker / location = neutral ink (semantic colours are never decorative).
// Whole strings only (MixedText); title and subtitle are auto-fitted together (floor 28 px, SIZE.labelMin).
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {lineHeightFor, stackGap, visLen} from '../../type/arabic';
import {ease, presetFrames, revealProgress, revealStyle, wipeClip} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {Mx, dirOf, exitFade, exitT, filmF} from '../_typeui/kit';
import type {Props} from './schema';

const SUB_K = SIZE.label / SIZE.body; // subtitle one step below the title (32 / 40)
const PAD = {x: 0.7, y: 0.42}; // plate padding in em of the title size
const MAX_W = 0.66; // plate never wider than 2/3 of the slot (it is a caption, not a banner)

const accentOf = (k: Props['kind']): string => (k === 'term' ? C.signal : C.ink2);

/** Small drawn kind glyph (SVG, no text), in em of the title size. */
const Glyph: React.FC<{kind: Props['kind']; color: string; s: number}> = ({kind, color, s}) => {
  const st = {fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" style={{flex: 'none', filter: `drop-shadow(0 0 4px ${color}${hex(0.6)})`}}>
      {kind === 'source' ? (
        <g {...st}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4M9 12h6M9 16h6" />
        </g>
      ) : kind === 'speaker' ? (
        <g {...st}>
          <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
        </g>
      ) : kind === 'location' ? (
        <g {...st}>
          <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </g>
      ) : (
        <g {...st}>
          <rect x="3" y="7" width="18" height="10" rx="5" />
          <circle cx="8" cy="12" r="1.6" fill={color} />
        </g>
      )}
    </svg>
  );
};

export const LowerThirdView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE.body;
  const fit = useAutoFit(ref, {id: ctx.id, size, min: SIZE.labelMin, maxW: ctx.box.w * MAX_W, maxH: ctx.box.h, key: `${props.title}|${props.subtitle ?? ''}|${props.kind}`});
  const fs = fit.size;
  const ss = Math.max(SIZE.labelMin, Math.round(fs * SUB_K));
  const accent = accentOf(props.kind);
  const t = ctx.frame - ctx.at;
  const ex = exitT(ctx);
  const nA = presetFrames('arrive', ctx.fps);
  const bar = revealProgress(t, nA); // accent bar grows first (ink on the anchor frame)
  const plate = revealProgress(t, nA + filmF(2, ctx.fps), ease.arrive); // plate opens right -> left a touch slower
  const title = revealStyle(t, ctx.fps, 'arrive', dirOf(props.title), ex);
  const sub = props.subtitle ? revealStyle(t - filmF(2, ctx.fps), ctx.fps, 'label', 'rtl', ex) : null;
  const out = exitFade(ctx);
  const k = 0.55 + 0.45 * bar + ctx.mod.glow;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', opacity: out}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'stretch', flexDirection: 'row-reverse', transform: `translateX(${((1 - out) * fs * 0.6).toFixed(2)}px)`}}>
        {/* accent bar on the start (right) edge */}
        <div style={{width: Math.max(3, Math.round(fs * 0.11)), borderRadius: fs, background: accent, boxShadow: glow(accent, ctx.fx, 0.5 * k), transform: `scaleY(${bar.toFixed(4)})`, transformOrigin: 'center bottom', flex: 'none'}} />
        <div
          style={{
            position: 'relative',
            marginRight: Math.round(fs * 0.22),
            padding: `${(PAD.y * fs).toFixed(1)}px ${(PAD.x * fs).toFixed(1)}px`,
            borderRadius: Math.round(fs * 0.22),
            background: `linear-gradient(200deg, ${C.panel}${hex(0.92)}, ${C.ground}${hex(0.85)})`,
            boxShadow: `inset -1px 1px 0 ${C.ink}${hex(0.16)}, 0 ${Math.round(fs * 0.3)}px ${Math.round(fs * 0.9)}px ${C.void}${hex(0.6)}`,
            border: `1px solid ${accent}${hex(0.18)}`,
            clipPath: wipeClip(plate, 'rtl'),
          }}
        >
          <div
            ref={ref}
            data-overflow={fit.overflow ? 1 : undefined}
            dir="rtl"
            style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'max-content', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: Math.round(fs * 0.35)}}>
              <div style={{opacity: bar}}>
                <Glyph kind={props.kind} color={accent} s={Math.round(fs * 0.8)} />
              </div>
              <div style={{fontSize: fs, lineHeight: lineHeightFor(props.title), color: C.ink, textShadow: `${halo}, ${glow(accent, ctx.fx, 0.3 * k)}`, whiteSpace: 'nowrap', transformOrigin: 'right center', ...title.style}}>
                <Mx id={`${ctx.id}:title`} text={props.title} size={fs} weight={FONT.label.strong} />
              </div>
            </div>
            {props.subtitle && sub ? (
              <div
                style={{
                  marginTop: stackGap({text: props.title, size: fs}, {text: props.subtitle, size: ss}, 'title-sub'),
                  fontSize: ss,
                  lineHeight: lineHeightFor(props.subtitle),
                  color: C.ink2,
                  textShadow: halo,
                  whiteSpace: 'nowrap',
                  ...sub.style,
                }}
              >
                <Mx id={`${ctx.id}:sub`} text={props.subtitle} size={ss} weight={FONT.label.weight} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Text-safe rect: the plate estimate at the bottom-right of the slot. */
const textRect = (p: Props, box: Rect): Rect => {
  const fs = SIZE.body;
  const chars = Math.max(visLen(p.title) + 3, p.subtitle ? visLen(p.subtitle) * SUB_K : 0);
  const w = Math.min(box.w * MAX_W + fs, fs * 0.6 * chars + fs * 2.2);
  const h = Math.min(box.h, fs * 2.4 + (p.subtitle ? SIZE.label * 2 : 0));
  return {x: box.x + box.w - w, y: box.y + box.h - h, w, h};
};

export const LowerThird: DcComponent<Props> = {name: 'LowerThird', Component: LowerThirdView, text: true, slot: 'lower-third', textRect};
