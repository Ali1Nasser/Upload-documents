// TermChip (catalog: Type & UI). A technical term on an emissive glass pill: the term is mono Latin in an LTR isolate (Arabic
// terms such as `الـoffset` go through MixedText with the ADR-010 join gap), with an optional Arabic gloss under it. The pill
// arrives on the anchor with an LTR `arrive` wipe (rim light first, then the term), the gloss follows 2 film frames later on
// the `label` preset (RTL fade + rise). Floor: 28 px when spoken (SIZE.labelMin), 18 px otherwise (SIZE.secondaryMin).
// Kinds: `term` = leading emissive dot; `acronym` = tracked caps; `code` = darker code stock + brackets rim; `metric` = tabular.
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor, stackGap, visLen} from '../../type/arabic';
import {presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {dirOf, exitT, filmF, justifyFor} from '../_typeui/kit';
import type {Props} from './schema';

const PAD = {x: 0.62, y: 0.26}; // pill padding in em of the term size
const GLOSS_K = SIZE.labelMin / SIZE.label; // gloss sits one step below the term (28 / 32)

export const TermChipView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE.label;
  const min = props.spoken ? SIZE.labelMin : SIZE.secondaryMin;
  const fit = useAutoFit(ref, {id: ctx.id, size, min, maxW: ctx.box.w, maxH: ctx.box.h, key: `${props.term}|${props.gloss_ar ?? ''}|${props.kind}`});
  const fs = fit.size;
  const gs = Math.max(min, Math.round(fs * GLOSS_K));
  const color = C[props.color];
  const t = ctx.frame;
  const ex = exitT(ctx);
  const pill = revealStyle(t - ctx.at, ctx.fps, 'arrive', dirOf(props.term), ex);
  const rim = revealProgress(t - ctx.at, presetFrames('label', ctx.fps)); // the rim light leads the wipe
  const gloss = props.gloss_ar ? revealStyle(t - ctx.at - filmF(2, ctx.fps), ctx.fps, 'label', 'rtl', ex) : null;
  const code = props.kind === 'code';
  const k = 0.5 + 0.5 * rim + ctx.mod.glow;
  const termAr = isArabic(props.term);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: justifyFor(props.slot)}}>
      <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'max-content', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
        <div
          data-dc-part="chip"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: Math.round(fs * 0.4),
            padding: `${(PAD.y * fs).toFixed(1)}px ${(PAD.x * fs).toFixed(1)}px`,
            borderRadius: code ? Math.round(fs * 0.3) : fs,
            background: code ? `linear-gradient(180deg, ${C.void}${hex(0.92)}, ${C.ground}${hex(0.92)})` : `linear-gradient(180deg, ${C.panel}${hex(0.9)}, ${C.ground}${hex(0.85)})`,
            border: `1px solid ${color}${hex(0.25 + 0.45 * rim)}`,
            boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.1)}, 0 0 ${Math.round(ctx.fx.glowInner * 1.6 * k)}px ${color}${hex(0.28 * rim)}`,
            whiteSpace: 'nowrap',
            ...pill.style,
          }}
        >
          {props.kind === 'term' ? <span style={{width: Math.round(fs * 0.28), height: Math.round(fs * 0.28), borderRadius: '50%', background: color, boxShadow: glow(color, ctx.fx, 0.5), flex: 'none'}} /> : null}
          <div
            style={{
              fontSize: fs,
              lineHeight: termAr ? lineHeightFor(props.term) : 1.25,
              color: code ? C.ink : color,
              letterSpacing: props.kind === 'acronym' ? '0.06em' : undefined,
              textShadow: `${halo}, ${glow(color, ctx.fx, 0.35 * k)}`,
            }}
          >
            <MixedText id={`${ctx.id}:term`} text={props.term} size={fs} role={termAr ? 'sentence' : props.kind === 'code' ? 'code' : 'chip'} weight={termAr ? undefined : FONT.mono.weight} latColor={color} />
          </div>
        </div>
        {props.gloss_ar && gloss ? (
          <div style={{marginTop: Math.round(fs * 0.3) + stackGap({text: props.term, size: fs}, {text: props.gloss_ar, size: gs}), fontSize: gs, lineHeight: lineHeightFor(props.gloss_ar), color: C.ink2, textShadow: halo, whiteSpace: 'nowrap', ...gloss.style}}>
            <MixedText id={`${ctx.id}:gloss`} text={props.gloss_ar} size={gs} weight={FONT.label.weight} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Text-safe rect: the pill (+ gloss) estimate at its slot position. */
const textRect = (p: Props, box: Rect): Rect => {
  const fs = SIZE.label;
  const w = Math.min(box.w, Math.max(fs * 0.62 * (visLen(p.term) + 3), p.gloss_ar ? SIZE.labelMin * 0.55 * visLen(p.gloss_ar) : 0));
  const h = Math.min(box.h, fs * 1.9 + (p.gloss_ar ? SIZE.labelMin * 2 : 0));
  const x = p.slot === 'start' ? box.x + box.w - w : p.slot === 'end' ? box.x : box.x + (box.w - w) / 2;
  return {x, y: box.y + (box.h - h) / 2, w, h};
};

export const TermChip: DcComponent<Props> = {name: 'TermChip', Component: TermChipView, text: true, slot: 'center', textRect};
