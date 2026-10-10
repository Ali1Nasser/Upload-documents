// NumberCounter (catalog: Type & UI). Preset `count` (04 section 3.5): rolls from the previous value to the target over the
// spoken number (anchor = the number word's onset; lands on that word's end, or on `land`), then a 2-frame glow flash.
// Western digits, mono tabular figures, unit after the number in the same LTR isolate (arabic.ts rule U1), optional label
// below on the label preset. Every shown value carries `to.ref` (a data-contract id or the sentence that speaks it).
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, LABEL_RISE_PX, SIZE} from '../../tokens';
import {caShadow, glow, halo} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {minus} from '../../type/arabic';
import {ease, flashFrames, presetFrames, REVEAL_ONSET_F, revealStyle} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const NNBSP = ' '; // narrow no-break space: thousands grouping (data contract writes `3 948.50`)

/** Format a value; ids and years (< 10 000) are never grouped. */
export const formatValue = (v: number, format: Props['format'], decimals?: number): string => {
  const d = decimals ?? (format === 'percent' || format === 'currency' || format === 'decimal' || format === 'ratio' ? 2 : 0);
  const s = Math.abs(v).toFixed(d);
  const [i, f] = s.split('.');
  const grouped = Math.abs(v) >= 10000 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP) : i;
  return minus(`${v < 0 ? '-' : ''}${grouped}${f ? `.${f}` : ''}`);
};
const unitOf = (p: Props): string => p.to.unit ?? (p.format === 'percent' ? '%' : '');

type Seg = {t0: number; t1: number; a: number; b: number};
/** Value timeline: initial roll, then one roll per `set` action (each over its own anchor word). */
export const segments = (p: Props, ctx: DcProps<Props>['ctx']): Seg[] => {
  const land = ctx.frameOf(p.land) ?? ctx.atEnd;
  const segs: Seg[] = [{t0: ctx.at, t1: Math.max(ctx.at + 1, land), a: p.from ?? 0, b: p.to.value}];
  for (const a of [...ctx.actions].filter((x) => x.name === 'set').sort((x, y) => x.at - y.at)) {
    const to = (a.props.to as Props['to']).value;
    segs.push({t0: a.at, t1: Math.max(a.at + 1, a.end), a: segs[segs.length - 1].b, b: to});
  }
  return segs;
};
export const valueAt = (segs: Seg[], t: number): {v: number; landedAt: number | null} => {
  let v = segs[0].a;
  let landedAt: number | null = null;
  for (const s of segs) {
    if (t < s.t0) break;
    // RV1 (ADR-011): the roll's first visible step is on its anchor frame t0; it still lands exactly on t1 (the word end)
    v = interpolate(t, [s.t0 - REVEAL_ONSET_F, s.t1], [s.a, s.b], {...clamp, easing: ease.arrive});
    landedAt = t >= s.t1 ? s.t1 : null;
  }
  return {v, landedAt};
};

export const NumberCounterView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE[props.size];
  const color = C[props.color];
  const segs = segments(props, ctx);
  const {v, landedAt} = valueAt(segs, ctx.frame);
  const dec = props.to.decimals;
  const unit = unitOf(props);
  const widest = Math.max(...segs.flatMap((s) => [formatValue(s.a, props.format, dec).length, formatValue(s.b, props.format, dec).length]));
  const fit = useAutoFit(ref, {id: ctx.id, size, min: Math.max(SIZE.labelMin, Math.round(size * 0.5)), maxW: ctx.box.w, maxH: ctx.box.h, key: `${widest}${unit}${props.label ?? ''}`});
  const r = revealStyle(ctx.frame - ctx.at, ctx.fps, 'label', 'ltr', ctx.until !== undefined ? ctx.frame - ctx.until : undefined);
  const ff = flashFrames(ctx.fps);
  const flash = landedAt === null ? 0 : interpolate(ctx.frame - landedAt, [0, ff, ff * 3], [1, 1, 0], clamp);
  const k = 0.5 + 1.2 * flash + ctx.mod.glow;
  const shadow = `${halo}, ${glow(C.signal, ctx.fx, k)}${caShadow(ctx.fx)}`; // CA allowed on numerals (ADR-002), never on Arabic
  const labelT = ctx.frame - ctx.at - Math.round(presetFrames('label', ctx.fps) / 2);
  const lp = interpolate(labelT, [0, presetFrames('label', ctx.fps)], [0, 1], {...clamp, easing: ease.arrive});
  const fs = fit.size;
  const labelPx = Math.max(SIZE.labelMin, Math.round(SIZE.label * (fs / size))); // the face / join-gap band follow the rendered px (m3)
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'max-content', ...r.style}}>
        <bdi dir="ltr" data-dc-text={ctx.id} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: fs, lineHeight: 1.05, color, fontFeatureSettings: '"tnum" 1, "zero" 0', textShadow: shadow, whiteSpace: 'nowrap', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
          <span style={{display: 'inline-block', minWidth: `${widest}ch`, textAlign: 'center'}}>{formatValue(v, props.format, dec)}</span>
          {unit ? <span style={{fontSize: '0.42em', color: C.ink2, marginLeft: '0.35em', textShadow: halo}}>{unit}</span> : null}
        </bdi>
        {props.label ? (
          <div style={{marginTop: Math.round(fs * 0.12), fontSize: labelPx, color: C.ink2, opacity: lp, transform: `translateY(${((1 - lp) * LABEL_RISE_PX).toFixed(2)}px)`, textShadow: halo, whiteSpace: 'nowrap'}}>
            <MixedText id={`${ctx.id}:label`} text={props.label} size={labelPx} weight={FONT.label.weight} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const textRect = (p: Props, box: Rect): Rect => {
  const size = SIZE[p.size ?? 'numberBig'];
  const w = Math.min(box.w, size * 0.62 * (formatValue(p.to.value, p.format, p.to.decimals).length + 2));
  const h = Math.min(box.h, size * 1.2 + (p.label ? SIZE.label * 1.8 : 0));
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const NumberCounter: DcComponent<Props> = {name: 'NumberCounter', Component: NumberCounterView, text: true, slot: 'center', textRect};
