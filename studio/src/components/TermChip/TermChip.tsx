// TermChip (catalog: Type & UI). A technical term on an emissive glass pill: the term is mono Latin in an LTR isolate (Arabic
// terms such as `الـoffset` go through MixedText with the ADR-010 join gap), with an optional Arabic gloss under it. The pill
// arrives on the anchor with an LTR `arrive` wipe (rim light first, then the term), the gloss follows 2 film frames later on
// the `label` preset (RTL fade + rise). Floor: 28 px when spoken (SIZE.labelMin), 18 px otherwise (SIZE.secondaryMin).
// Light (ADR-003 LK-F, 04 §1.2): the key rim light comes from the upper right (a gradient border that fades to the lower left), the
// pill is glass (12 px backdrop blur from the standard tier up), sits in a soft emissive pool and breathes by +-4 px (deterministic,
// frame-driven) so it reads as a floating plate in depth, not a sticker.
// Kinds: `term` = leading emissive dot; `acronym` = tracked caps; `code` = darker code stock, square-ish corners, ink text; `metric` = accent underline.
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor, stackGap, visLen} from '../../type/arabic';
import {presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {Mx, dirOf, exitFade, exitT, filmF, justifyFor} from '../_typeui/kit';
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
  const land = revealProgress(t - ctx.at, presetFrames('arrive', ctx.fps)) * exitFade(ctx); // the pool lands with the term (review issue 5)
  const gloss = props.gloss_ar ? revealStyle(t - ctx.at - filmF(2, ctx.fps), ctx.fps, 'label', 'rtl', ex) : null;
  const code = props.kind === 'code';
  const k = 0.5 + 0.5 * rim + ctx.mod.glow;
  const settled = revealProgress(t - ctx.at - presetFrames('arrive', ctx.fps), presetFrames('label', ctx.fps));
  const bob = 4 * Math.sin((2 * Math.PI * (t - ctx.at)) / (ctx.fps * 4)) * settled; // px, whole pixels (a fractional offset re-rasterises text differently per render), pure function of the frame
  const stock = code ? `linear-gradient(180deg, ${C.void}${hex(0.92)}, ${C.ground}${hex(0.92)})` : `linear-gradient(180deg, ${C.panel}${hex(0.9)}, ${C.ground}${hex(0.85)})`;
  const rimLight = `linear-gradient(to bottom left, ${color}${hex(0.95 * rim)} 0%, ${color}${hex(0.3 * rim)} 38%, ${color}${hex(0.12 + 0.1 * rim)} 100%)`;
  const termAr = isArabic(props.term);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: justifyFor(props.slot)}}>
      <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} style={{position: 'relative', top: Math.round(bob) + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'max-content', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
        <div style={{position: 'relative', display: 'flex'}}>
        <div aria-hidden style={{position: 'absolute', left: '-45%', right: '-45%', top: '-110%', bottom: '-110%', background: `radial-gradient(closest-side ellipse at 50% 50%, ${color}${hex(0.2 * land)} 0%, ${color}${hex(0.1 * land)} 35%, ${color}${hex(0.03 * land)} 70%, ${color}00 100%)`, pointerEvents: 'none'}} />
        <div
          data-dc-part="chip"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: Math.round(fs * 0.4),
            padding: `${(PAD.y * fs).toFixed(1)}px ${(PAD.x * fs).toFixed(1)}px`,
            borderRadius: code ? Math.round(fs * 0.3) : fs,
            position: 'relative',
            background: `${stock} padding-box, ${rimLight} border-box`,
            border: '1.5px solid transparent',
            boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.1)}, 0 0 ${Math.round(ctx.fx.glowInner * 1.6 * k)}px ${color}${hex(0.28 * rim)}, 0 ${Math.round(fs * 0.3)}px ${Math.round(fs * 0.7)}px ${C.void}${hex(0.55)}`,
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
            <Mx id={`${ctx.id}:term`} text={props.term} size={fs} role={termAr ? 'sentence' : props.kind === 'code' ? 'code' : 'chip'} weight={termAr ? undefined : FONT.mono.weight} latColor={color} />
          </div>
          {props.kind === 'metric' ? <span aria-hidden style={{position: 'absolute', left: '12%', right: '12%', bottom: Math.round(fs * 0.1), height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${color}${hex(0.9 * rim)}, ${color}00)`}} /> : null}
        </div>
        </div>
        {props.gloss_ar && gloss ? (
          <div style={{marginTop: Math.round(fs * 0.3) + stackGap({text: props.term, size: fs}, {text: props.gloss_ar, size: gs}), fontSize: gs, lineHeight: lineHeightFor(props.gloss_ar), color: `${C.ink}${hex(0.85)}`, textShadow: halo, whiteSpace: 'nowrap', ...gloss.style}}>
            <Mx id={`${ctx.id}:gloss`} text={props.gloss_ar} size={gs} weight={FONT.label.weight} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Text-safe rect: the pill (+ gloss) estimate at its slot position. */
const textRect = (p: Props, box: Rect): Rect => {
  // tight estimate (measured: mono term ~0.6 em/char, Arabic gloss ~0.45 em/char) so the haze knockout stays close to the pill
  const fs = SIZE.label;
  const pillW = fs * (0.6 * visLen(p.term) + 1.6 + (p.kind === 'term' ? 0.7 : 0));
  const w = Math.min(box.w, Math.max(pillW, p.gloss_ar ? SIZE.labelMin * 0.45 * visLen(p.gloss_ar) : 0));
  const h = Math.min(box.h, fs * 1.8 + (p.gloss_ar ? SIZE.labelMin * 1.9 : 0));
  const x = p.slot === 'start' ? box.x + box.w - w : p.slot === 'end' ? box.x : box.x + (box.w - w) / 2;
  return {x, y: box.y + (box.h - h) / 2, w, h};
};

export const TermChip: DcComponent<Props> = {name: 'TermChip', Component: TermChipView, text: true, slot: 'center', textRect};
