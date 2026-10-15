// EquationLine (catalog: Type & UI). A formula laid out left -> right in ONE LTR isolate (04 §3.4: `4 / 6 = 66.67 %` sits in one
// isolate). Each term is a whole element tagged `data-dc-part="t<i>"` (targets for CalloutArrow / Spotlight). Operands are mono
// tabular ink, operators ink-3 with U+2212 minus (minus()), the result is the brightest mark: signal, 1.25x, `impact` preset with
// the 80 ms glow flash, CA on its numerals only, and an emissive underline drawn from the left on arrival.
// Timing: a term with `at` arrives on its own anchor (RV1: ink on the anchor frame). A term without `at` arrives with the next
// anchored term (an operator leads its right operand), else with the previous one, else with the layer anchor. Hidden terms keep
// their layout, so the line never shifts. Arabic operands are whole strings through MixedText (never split).
// Light (ADR-003 LK-F, 04 §1.2): the line sits on a dark glass slab lit by a key rim from the upper right (gradient border that fades
// to the lower left) with a soft drop shadow, and floats +-1.5 px (frame-driven). The rim leads the first term; when the result
// lands the slab warms (signal pool under the line + a one-shot flash), so the answer is the lit object. 2D only (no WebGL),
// so hero = standard; lite drops the pool through the tier glow radii.
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
const PAD = {x: 0.55, y: 0.34}; // slab padding in em of the operand size

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
  const padX = Math.round(size * PAD.x);
  const fit = useAutoFit(ref, {id: ctx.id, size, min: Math.max(SIZE.labelMin, Math.round(size * 0.6)), maxW: ctx.box.w - 2 * padX, maxH: ctx.box.h, key: props.terms.map((t) => t.text).join(' ')});
  const fs = fit.size;
  const frames = termFrames(props, ctx);
  const ex = exitT(ctx);
  const t = ctx.frame;
  const first = Math.min(...frames);
  const rFrame = frames[props.terms.reduce((a, x, i) => (x.kind === 'result' ? i : a), -1)];
  const rim = revealProgress(t - first, presetFrames('label', ctx.fps));
  const warm = rFrame === undefined ? 0 : revealProgress(t - rFrame, presetFrames('arrive', ctx.fps) * 2);
  const settled = revealProgress(t - first - presetFrames('arrive', ctx.fps), presetFrames('label', ctx.fps));
  const bob = Math.round(1.5 * Math.sin((2 * Math.PI * (t - first)) / (ctx.fps * 4)) * settled); // whole px, a pure function of the frame (a fractional offset broke determinism, see TermChip)
  const fade = ex === undefined || ex < 0 ? 1 : 1 - revealProgress(ex, presetFrames('exit', ctx.fps));
  const slab = `linear-gradient(180deg, ${C.panel}${hex(0.78)}, ${C.ground}${hex(0.7)})`;
  const rimLight = `linear-gradient(to bottom left, ${C.signal}${hex(0.85 * rim)} 0%, ${C.signal}${hex(0.22 * rim)} 36%, ${C.ink}${hex(0.06 + 0.06 * rim)} 100%)`;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{position: 'relative', top: bob + 'px'}}>
      <div
        aria-hidden
        style={{position: 'absolute', left: '-6%', right: '-6%', top: '22%', bottom: '-34%', background: `radial-gradient(ellipse closest-side at 50% 50%, ${C.void}${hex(0.6 * rim)} 0%, ${C.void}${hex(0.3 * rim)} 60%, ${C.void}00 100%)`, pointerEvents: 'none'}}
      />
      <div
        data-dc-part="slab"
        style={{
          position: 'relative',
          padding: `${Math.round(size * PAD.y)}px ${padX}px`,
          borderRadius: Math.round(size * 0.28),
          background: `${slab} padding-box, ${rimLight} border-box`,
          border: '1.5px solid transparent',
          boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.08 * rim)}`,
          opacity: fade < 1 ? fade : undefined,
        }}
      >
        <div
          aria-hidden
          style={{position: 'absolute', left: '-8%', right: '-8%', bottom: '-55%', height: '120%', background: `radial-gradient(ellipse closest-side at 62% 50%, ${C.signal}${hex(0.1 + 0.2 * warm)} 0%, ${C.signal}${hex(0.05 + 0.05 * warm)} 55%, ${C.signal}00 100%)`, pointerEvents: 'none'}}
        />
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
      </div>
    </div>
  );
};

const textRect = (p: Props, box: Rect): Rect => {
  const size = SIZE[p.size ?? 'sub'];
  // mono advance ~0.62 em per glyph, 0.32 em between terms, the result is RESULT_K larger; plus the slab padding
  const em = p.terms.reduce((a, t) => a + visLen(t.text) * (t.kind === 'result' ? RESULT_K : 1) * 0.62, 0) + 0.32 * (p.terms.length - 1) + 2 * PAD.x;
  const w = Math.min(box.w, size * em);
  const h = Math.min(box.h, size * (RESULT_K * 1.3 + 2 * PAD.y));
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const EquationLine: DcComponent<Props> = {name: 'EquationLine', Component: EquationLineView, text: true, slot: 'center', textRect};
