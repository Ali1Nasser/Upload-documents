// KineticPhrase (catalog: Type & UI). Up to 6 kinetic words on at most 2 lines; each word arrives on ITS OWN spoken word anchor
// with the frozen preset (RTL clip-path wipe for Arabic words, LTR for Latin / numerals; whole words only, never per letter).
// The whole phrase is laid out once (hidden words keep their place), auto-fitted to ctx.box as ONE block, so later words never
// shift the line. Two lines are stacked with the tashkeel clearance rule (ArStack / stackGap). Emphasis follows KineticWord:
// `term` = signal colour, `stressed` = glow boost, `number` = mono tabular data face (+ CA on the isolate only).
import React, {useRef} from 'react';
import {C, SIZE} from '../../tokens';
import {useAutoFit} from '../../type/Text';
import {ArStack} from '../../type/ArStack';
import {isArabic, visLen} from '../../type/arabic';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {exitT, rowLineHeight, Unit} from '../_typeui/kit';
import type {Props} from './schema';

/** Split word indices into `lines` rows (whole words only), balancing the visible length; reading order is kept. */
export const breakWords = (texts: string[], lines: number): number[][] => {
  const idx = texts.map((_, i) => i);
  if (lines < 2 || texts.length < 2) return [idx];
  const len = texts.map((t) => visLen(t) + 1);
  const total = len.reduce((a, b) => a + b, 0);
  let best = 1;
  let bestD = Infinity;
  let acc = 0;
  for (let k = 1; k < texts.length; k++) {
    acc += len[k - 1];
    const d = Math.abs(total - 2 * acc);
    if (d < bestD) (bestD = d), (best = k);
  }
  return [idx.slice(0, best), idx.slice(best)];
};

export const KineticPhraseView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const texts = props.words.map((w) => w.text);
  const rtl = texts.some((t) => isArabic(t));
  const size = SIZE[props.size];
  const rows = breakWords(texts, props.lines);
  const fit = useAutoFit(ref, {id: ctx.id, size, min: Math.max(SIZE.labelMin, Math.round(size * 0.6)), maxW: ctx.box.w, maxH: ctx.box.h, key: `${texts.join('|')}#${props.lines}`});
  const fs = fit.size;
  const lh = rowLineHeight(texts);
  const ex = exitT(ctx);
  const m = ctx.mod;
  const unit = (i: number) => {
    const w = props.words[i];
    const at = ctx.frameOf(w.at) ?? ctx.at;
    const color = C[w.color ?? (w.emphasis === 'term' ? 'signal' : 'ink')];
    return (
      <Unit
        key={i}
        id={`${ctx.id}:w${i}`}
        part={`w${i}`}
        text={w.text}
        size={fs}
        fx={ctx.fx}
        t={ctx.frame - at}
        fps={ctx.fps}
        preset={props.preset}
        exit={ex}
        color={color}
        emphasis={w.emphasis}
        modGlow={m.glow}
        lh={lh}
      />
    );
  };
  const line = (ix: number[]) => (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flex', alignItems: 'baseline', columnGap: '0.28em', width: 'max-content', whiteSpace: 'nowrap'}}>
      {ix.map(unit)}
    </div>
  );
  const lineText = (ix: number[]) => ix.map((i) => texts[i]).join(' ');
  // start = the reading-start edge: right for an Arabic phrase (RTL frame), left for a Latin one
  const justify = props.align === 'center' ? 'center' : rtl ? 'flex-end' : 'flex-start';
  return (
    <div
      style={{
        position: 'absolute',
        left: ctx.box.x,
        top: ctx.box.y,
        width: ctx.box.w,
        height: ctx.box.h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify,
        opacity: Math.max(0, 1 - m.opacity),
        transform: m.scale ? `scale(${(1 + 0.06 * m.scale).toFixed(4)})` : undefined,
      }}
    >
      <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} style={{width: 'max-content', fontSize: fs, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
        {rows.length === 1 ? (
          line(rows[0])
        ) : (
          <ArStack
            align={props.align === 'center' ? 'right' : rtl ? 'right' : 'left'}
            style={props.align === 'center' ? {alignItems: 'center'} : undefined}
            lines={rows.map((ix) => ({text: lineText(ix), size: fs, node: line(ix), role: 'lines' as const}))}
          />
        )}
      </div>
    </div>
  );
};

/** Text-safe rect: an estimate of the phrase block inside the slot (haze / bokeh are masked here plus the tier padding). */
const textRect = (p: Props, box: Rect): Rect => {
  const size = SIZE[p.size ?? 'kinetic'];
  const texts = p.words.map((w) => w.text);
  const rows = breakWords(texts, p.lines ?? 1);
  const longest = Math.max(...rows.map((ix) => ix.reduce((a, i) => a + visLen(texts[i]) + 1, 0)));
  const w = Math.min(box.w, size * 0.6 * longest + size * 0.4);
  const h = Math.min(box.h, size * 1.6 * rows.length);
  const rtl = texts.some((t) => isArabic(t));
  const x = p.align === 'center' ? box.x + (box.w - w) / 2 : rtl ? box.x + box.w - w : box.x;
  return {x, y: box.y + (box.h - h) / 2, w, h};
};

export const KineticPhrase: DcComponent<Props> = {name: 'KineticPhrase', Component: KineticPhraseView, text: true, slot: 'upper-third', textRect};
