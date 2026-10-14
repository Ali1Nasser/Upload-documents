// EquationLine (catalog: Type & UI). A formula laid out left -> right in ONE LTR isolate (04 §3.4: `4 / 6 = 66.67 %` sits in one
// isolate). Each term is a whole element tagged `data-dc-part="t<i>"` (targets for CalloutArrow / Spotlight). Operands are mono
// tabular ink, operators ink-3 with U+2212 minus (minus()), the result is the brightest mark: signal, 1.25x, `impact` preset with
// the 80 ms glow flash, CA on its numerals only, and an emissive underline drawn from the left on arrival.
// Timing: a term with `at` arrives on its own anchor (RV1: ink on the anchor frame). A term without `at` arrives with the next
// anchored term (an operator leads its right operand), else with the previous one, else with the layer anchor. Hidden terms keep
// their layout, so the line never shifts. Arabic operands are whole strings through MixedText (never split).
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {caShadow, glow, halo, hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {isArabic, MINUS, minus, visLen} from '../../type/arabic';
import {presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {Mx, exitT} from '../_typeui/kit';
import type {Props} from './schema';

const RESULT_K = 1.25;

/** Arrival frame of every term (shot-local), per the inheritance rule above. */
export const termFrames = (p: Props, ctx: DcProps<Props>['ctx']): number[] => {
  const own = p.terms.map((t) => (t.at ? ctx.frameOf(t.at) : undefined));
  return own.map((f, i) => {
    if (f !== undefined) return f;
    for (let j = i + 1; j < own.length; j++) if (own[j] !== undefined) return own[j] as number;
    for (let j = i - 1; j >= 0; j--) if (own[j] !== undefined) return own[j] as number;
    return ctx.at;
  });
};

const hasDigit = (s: string) => /\d/.test(s);

export const EquationLineView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE[props.size];
  const fit = useAutoFit(ref, {id: ctx.id, size, min: Math.max(SIZE.labelMin, Math.round(size * 0.6)), maxW: ctx.box.w, maxH: ctx.box.h, key: props.terms.map((t) => t.text).join(' ')});
  const fs = fit.size;
  const frames = termFrames(props, ctx);
  const ex = exitT(ctx);
  const t = ctx.frame;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <bdi
        ref={ref as React.RefObject<HTMLElement>}
        dir="ltr"
        data-overflow={fit.overflow ? 1 : undefined}
        style={{display: 'flex', alignItems: 'baseline', columnGap: '0.32em', width: 'max-content', whiteSpace: 'nowrap', fontSize: fs, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}
      >
        {props.terms.map((term, i) => {
          const at = frames[i];
          const res = term.kind === 'result';
          const op = term.kind === 'operator';
          const text = op && term.text.trim() === '-' ? MINUS : minus(term.text); // a lone operator hyphen is the U+2212 minus (rule N1)
          const ar = isArabic(text);
          const r = revealStyle(t - at, ctx.fps, res ? 'impact' : 'arrive', ar ? 'rtl' : 'ltr', ex);
          const color = res ? C.signal : op ? C.ink3 : C.ink;
          const k = res ? 0.8 + 1.4 * r.flash + ctx.mod.glow : 0.35;
          const base = `${halo}, ${glow(res ? C.signal : C.ink, ctx.fx, k)}`;
          const ca = res && hasDigit(text) ? caShadow(ctx.fx) : '';
          const line = res ? revealProgress(t - at, presetFrames('arrive', ctx.fps)) : 0;
          const tfs = res ? Math.round(fs * RESULT_K) : fs;
          return (
            <div key={i} data-dc-part={`t${i}`} style={{position: 'relative', display: 'inline-block', color, textShadow: base, fontSize: tfs, lineHeight: 1.3, transformOrigin: 'left center', ...r.style}}>
              <Mx id={`${ctx.id}:t${i}`} text={text} size={tfs} role={ar ? 'sentence' : 'data'} weight={ar ? undefined : FONT.mono.weight} caLatin={ca ? base + ca : undefined} />
              {res ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: Math.round(-tfs * 0.06),
                    height: Math.max(2, Math.round(tfs * 0.04)),
                    width: '100%',
                    transform: `scaleX(${line.toFixed(4)})`,
                    transformOrigin: 'left center',
                    background: `linear-gradient(90deg, ${C.signal}, ${C.signal}${hex(0.2)})`,
                    boxShadow: glow(C.signal, ctx.fx, 0.4),
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </bdi>
    </div>
  );
};

const textRect = (p: Props, box: Rect): Rect => {
  const size = SIZE[p.size ?? 'sub'];
  const n = p.terms.reduce((a, t) => a + visLen(t.text) * (t.kind === 'result' ? RESULT_K : 1) + 0.6, 0);
  const w = Math.min(box.w, size * 0.62 * n + size * 0.6);
  const h = Math.min(box.h, size * RESULT_K * 1.5);
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const EquationLine: DcComponent<Props> = {name: 'EquationLine', Component: EquationLineView, text: true, slot: 'center', textRect};
