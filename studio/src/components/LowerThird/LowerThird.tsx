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

const SUB_K = SIZE.body / SIZE.sub; // subtitle one step below the title (40 / 56)
const PAD = {x: 0.62, y: 0.4}; // plate padding in em of the title size
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
  const size = SIZE.sub;
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
  const sweep = revealProgress(t - filmF(2, ctx.fps), presetFrames('label', ctx.fps) + nA, ease.arrive); // foot light runs after the plate opens
  const sweepDone = revealProgress(t - nA * 2 - presetFrames('label', ctx.fps), presetFrames('label', ctx.fps));
  const rimLight = `linear-gradient(to bottom left, ${accent}${hex(0.9 * bar)} 0%, ${accent}${hex(0.28 * bar)} 40%, ${accent}${hex(0.1 + 0.08 * bar)} 100%)`;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', opacity: out}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'stretch', flexDirection: 'row-reverse', transform: `translateX(${((1 - out) * fs * 0.6).toFixed(2)}px)`}}>
        {/* soft light pool the plate casts on the floor of the frame (depth cue, ADR-003 LK-F) */}
        <div aria-hidden style={{position: 'absolute', left: '-6%', right: '-12%', bottom: -Math.round(fs * 0.55), height: Math.round(fs * 0.9), background: `radial-gradient(closest-side ellipse at 60% 40%, ${accent}${hex(0.16 * plate)} 0%, ${accent}${hex(0.05 * plate)} 60%, ${accent}00 100%)`, pointerEvents: 'none'}} />
        {/* accent bar on the start (right) edge */}
        <div style={{width: Math.max(3, Math.round(fs * 0.11)), borderRadius: fs, background: accent, boxShadow: glow(accent, ctx.fx, 0.5 * k), transform: `scaleY(${bar.toFixed(4)})`, transformOrigin: 'center bottom', flex: 'none'}} />
        <div
          style={{
            position: 'relative',
            marginRight: Math.round(fs * 0.22),
            padding: `${(PAD.y * fs).toFixed(1)}px ${(PAD.x * fs).toFixed(1)}px`,
            borderRadius: Math.round(fs * 0.22),
            background: `linear-gradient(200deg, ${C.panel}${hex(0.92)}, ${C.ground}${hex(0.88)}) padding-box, ${rimLight} border-box`,
            border: '1.5px solid transparent',
            boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.12)}, 0 ${Math.round(fs * 0.3)}px ${Math.round(fs * 0.9)}px ${C.void}${hex(0.6)}, 0 0 ${Math.round(ctx.fx.glowInner * 2.4 * k)}px ${accent}${hex(0.16 * plate)}`,
            clipPath: wipeClip(plate, 'rtl'),
          }}
        >
          {/* emissive underline sweeping start -> end along the plate foot */}
          <div aria-hidden style={{position: 'absolute', right: '4%', left: `${(96 - 92 * sweep).toFixed(2)}%`, bottom: 0, height: 2, borderRadius: 1, background: `linear-gradient(270deg, ${accent}${hex(0.9)}, ${accent}00)`, opacity: 1 - 0.55 * sweepDone}} />
          <div
            ref={ref}
            data-overflow={fit.overflow ? 1 : undefined}
            dir="rtl"
            style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'max-content', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: Math.round(fs * 0.35)}}>
              <div style={{opacity: bar, display: 'flex', alignItems: 'center', justifyContent: 'center', width: Math.round(fs * 1.05), height: Math.round(fs * 1.05), borderRadius: '50%', border: `1.5px solid ${accent}${hex(0.45)}`, background: `radial-gradient(closest-side, ${accent}${hex(0.16)}, ${accent}00)`}}>
                <Glyph kind={props.kind} color={accent} s={Math.round(fs * 0.6)} />
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
  const fs = SIZE.sub;
  const chars = Math.max(visLen(p.title) + 3, p.subtitle ? visLen(p.subtitle) * SUB_K : 0);
  const w = Math.min(box.w * MAX_W + fs, fs * 0.6 * chars + fs * 2.2);
  const h = Math.min(box.h, fs * 1.9 + (p.subtitle ? SIZE.body * 1.9 : 0));
  return {x: box.x + box.w - w, y: box.y + box.h - h, w, h};
};

export const LowerThird: DcComponent<Props> = {name: 'LowerThird', Component: LowerThirdView, text: true, slot: 'lower-third', textRect};
