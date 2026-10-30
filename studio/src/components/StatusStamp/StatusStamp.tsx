// StatusStamp (catalog: Domain specials; 04 section 6 "status codes as coloured stamps"). A rubber stamp slams onto its
// target on the layer anchor: impact preset (scale 1.08 -> 1 outBack, RV1 ink on the anchor frame, 80 ms glow flash), a
// press shadow that collapses as the stamp lands, and an ink ring that spreads out from the impression; worn-ink speckle is
// seeded (random(seed)), never Math.random. Colour is semantic (04 1.1): ok / approved -> ok, fail / rejected -> crit,
// pending / retry -> warn. The status word is Latin caps (cv08 serifed I via MixedText, e.g. PENDING); `label_ar` is set
// whole by the type engine. No digits other than ids inside `label_ar`.
// `to` (target layer, CR-011): when the engine exposes `ctx.rectOf(layerId)` the stamp lands centred on the target's rect and
// fits its width; when it does not (or the id is unknown) the stamp lands in its own box, so the scene-director places it on
// the target's slot. Determinism (r8): the tilted impression carries no box-shadow; bloom, press shadow and ink ring are drawn
// unrotated in one SVG.
import React, {useRef} from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, IMPACT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {lineHeightFor, stackGap} from '../../type/arabic';
import {ease, flashFrames, presetFrames, revealProgress} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {f24} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const WORD: Record<Props['status'], string> = {ok: 'OK', fail: 'FAIL', pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED', retry: 'RETRY'};
export const stampTone = (s: Props['status']): string => (s === 'ok' || s === 'approved' ? C.ok : s === 'fail' || s === 'rejected' ? C.crit : C.warn);
const TILT_DEG = -6;

/** The rect the stamp lands on (box-local): the target layer's rect when the engine can resolve it (CR-011), else the own box. */
export const landRect = (ctx: LayerCtx, to?: string): Rect => {
  const r = to ? ctx.rectOf?.(to) : undefined;
  if (!r || !(r.w > 0 && r.h > 0)) return {x: 0, y: 0, w: ctx.box.w, h: ctx.box.h};
  return {x: r.x - ctx.box.x, y: r.y - ctx.box.y, w: r.w, h: r.h};
};

export const StatusStampView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const tone = stampTone(props.status);
  const word = WORD[props.status];
  const land = landRect(ctx, props.to);
  const size = SIZE.title;
  const fit = useAutoFit(ref, {id: ctx.id, size, min: Math.round(size * 0.6), maxW: land.w * 0.8, maxH: land.h * 0.8, key: `${word}|${props.label_ar ?? ''}|${Math.round(land.w)}`});
  const fs = fit.size;
  const t = ctx.frame - ctx.at;
  const n = presetFrames('impact', ctx.fps, true);
  const p = revealProgress(t, n); // RV1: ink on the anchor frame
  const sc = IMPACT.scaleFrom + (1 - IMPACT.scaleFrom) * revealProgress(t, n, ease.impact);
  const ff = flashFrames(ctx.fps);
  const flash = t < 0 ? 0 : interpolate(t, [0, ff, ff * 3], [1, 1, 0], clamp);
  const press = 1 - p; // the press shadow collapses as the stamp lands
  const k = 0.55 + 1.1 * flash + ctx.mod.glow;
  const labelPx = Math.max(SIZE.labelMin, Math.round(SIZE.sub * (fs / size)));
  const gap = props.label_ar ? stackGap({text: word, size: fs, lineHeight: 1.05}, {text: props.label_ar, size: labelPx}, 'title-sub') : 0;
  const seen = t >= 0;
  // decorative extents of the impression (bloom / shadow / ring only; the copy itself is measured by useAutoFit)
  const estW = Math.min(land.w * 0.85, Math.max(word.length * fs * 0.7, (props.label_ar?.length ?? 0) * labelPx * 0.48) + fs * 0.9);
  const estH = fs * 1.5 + (props.label_ar ? labelPx * 1.7 + gap : 0);
  const cx = land.x + land.w / 2;
  const cy = land.y + land.h / 2;
  const ringN = f24(10, ctx.fps);
  const ringQ = seen ? revealProgress(t, ringN, ease.arrive) : 0;
  const ringA = seen ? interpolate(t, [0, ringN], [0.75, 0], clamp) : 0;
  const specks = Array.from({length: 46}, (_, i) => ({
    x: random(`stamp:${ctx.id}:${i}:x`) * 100,
    y: random(`stamp:${ctx.id}:${i}:y`) * 100,
    r: 0.25 + random(`stamp:${ctx.id}:${i}:r`) * 0.9,
  }));
  const splats = Array.from({length: 9}, (_, i) => {
    const a = random(`stamp:${ctx.id}:sp${i}:a`) * Math.PI * 2;
    const d = 0.56 + 0.16 * random(`stamp:${ctx.id}:sp${i}:d`);
    return {x: cx + Math.cos(a) * estW * d, y: cy + Math.sin(a) * estH * d * 0.9, r: 2 + 4 * random(`stamp:${ctx.id}:sp${i}:r`)};
  });
  const bw = Math.max(4, Math.round(fs * 0.07));
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, opacity: ctx.until !== undefined && ctx.frame >= ctx.until ? interpolate(ctx.frame - ctx.until, [0, presetFrames('exit', ctx.fps)], [1, 0], clamp) : 1}}>
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <radialGradient id={`${ctx.id}-bloom`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={tone} stopOpacity={0.3} />
            <stop offset="1" stopColor={tone} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${ctx.id}-shadow`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={C.void} stopOpacity={0.85} />
            <stop offset="1" stopColor={C.void} stopOpacity={0} />
          </radialGradient>
        </defs>
        {seen ? (
          <>
            {/* lit bloom behind the impression; brighter on the flash */}
            <ellipse cx={cx} cy={cy} rx={estW * 0.95} ry={estH * 1.05} fill={`url(#${ctx.id}-bloom)`} opacity={(0.55 + 0.45 * flash + ctx.mod.glow * 0.3).toFixed(3)} />
            {/* press shadow: offset and wide while the stamp is still in the air, gone when it lands */}
            {press > 0.01 ? <ellipse cx={cx + press * fs * 0.25} cy={cy + press * fs * 0.4} rx={estW * (0.5 + 0.2 * press)} ry={estH * (0.5 + 0.2 * press)} fill={`url(#${ctx.id}-shadow)`} opacity={press.toFixed(3)} /> : null}
            {/* ink ring spreading from the impression, and a few seeded ink splats */}
            {ringA > 0.01 ? <ellipse cx={cx} cy={cy} rx={estW * (0.52 + 0.3 * ringQ)} ry={estH * (0.55 + 0.35 * ringQ)} fill="none" stroke={tone} strokeOpacity={ringA} strokeWidth={Math.max(2, bw * 0.6)} /> : null}
            {splats.map((s, i) => (
              <circle key={i} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={s.r.toFixed(1)} fill={tone} opacity={(0.55 * p).toFixed(3)} />
            ))}
          </>
        ) : null}
      </svg>
      <div style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) rotate(${TILT_DEG}deg) scale(${sc.toFixed(4)})`, opacity: seen ? interpolate(p, [0, 0.3], [0, 1], clamp) : 0}}>
        <div
          ref={ref}
          data-overflow={fit.overflow ? 1 : undefined}
          style={{
            position: 'relative',
            width: 'max-content',
            padding: `${Math.round(fs * 0.22)}px ${Math.round(fs * 0.42)}px`,
            border: `${bw}px solid ${tone}`,
            outline: fit.overflow ? `2px dashed ${C.crit}` : `${Math.max(2, Math.round(fs * 0.025))}px solid ${tone}${hex(0.55)}`,
            outlineOffset: Math.round(fs * 0.08),
            borderRadius: Math.round(fs * 0.16),
            background: `linear-gradient(160deg, ${tone}${hex(0.18 + 0.12 * flash)} 0%, ${C.void}${hex(0.7)} 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* key rim light on the upper edge (a plain line, no shadow on the tilted box) */}
          <div style={{position: 'absolute', left: '6%', right: '6%', top: 2, height: 2, background: `${C.ink}${hex(0.22)}`, borderRadius: 1}} />
          <div style={{fontSize: fs, lineHeight: 1.05, letterSpacing: '0.06em', color: tone, textShadow: `${halo}, ${glow(tone, ctx.fx, k)}`, whiteSpace: 'nowrap'}}>
            <MixedText id={`${ctx.id}:word`} text={word} size={fs} weight={FONT.lat.weight} />
          </div>
          {props.label_ar ? (
            <div style={{marginTop: gap, fontSize: labelPx, lineHeight: lineHeightFor(props.label_ar), color: C.ink, textShadow: `${halo}, ${glow(tone, ctx.fx, 0.35)}`, whiteSpace: 'nowrap'}}>
              <MixedText id={`${ctx.id}:label`} text={props.label_ar} size={labelPx} weight={FONT.label.strong} />
            </div>
          ) : null}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
            {specks.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.7} fill={C.void} fillOpacity={0.55} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

/** Text-safe rect: the stamp's central area in its own box (the target rect is not known here; see CR-011). */
const textRect = (p: Props, box: Rect): Rect => {
  const w = Math.min(box.w, SIZE.title * 0.75 * (WORD[p.status].length + 1.5));
  const h = Math.min(box.h, SIZE.title * (p.label_ar ? 2.4 : 1.6));
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const StatusStamp: DcComponent<Props> = {name: 'StatusStamp', Component: StatusStampView, text: true, slot: 'center', textRect};
