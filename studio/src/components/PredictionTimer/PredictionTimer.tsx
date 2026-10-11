// PredictionTimer (catalog: Type & UI). The prediction beat (04 §4 "Prediction pause": countdown ring or think pulse, <= 6 s):
// the question arrives ON the layer anchor (whole lines, RTL `arrive` wipe; at most 2 lines of <= 32 visible chars, broken at word
// boundaries only), the options land as glass cards on one baseline (>= 40 px apart, AT-4) 2 film frames apart, and a think ring
// drains from full to empty between the question and the `reveal` anchor while a soft scan pulse walks the options (the viewer is
// invited to choose). The ring is a clock, so it drains linearly (the one allowed linear motion: a marching flow). On the reveal
// frame the ring bursts with the 80 ms impact flash and the question and options recede into depth (opacity + scale), handing the
// frame to the answer layer of the shot. No digits are drawn (a countdown number would be a number without a data ref).
// The schema has no `answer` field, so the timer cannot mark the right option itself (CR filed: corpus/specs/_component_requests.jsonl).
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, LEAD_FRAMES, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {breakCaption, isArabic, lineHeightFor, stackGap, visLen} from '../../type/arabic';
import {LABEL_GAP_MIN_PX, type Rect} from '../../type/safe';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {clamp, exitFade, exitT, filmF} from '../_typeui/kit';
import type {Props} from './schema';

const OPT_K = SIZE.body / SIZE.sub;

/** Question lines: <= 2 lines of <= 32 visible chars (caption rule); longer questions get a 3rd line (auto-fit shrinks). */
export const questionLines = (q: string): string[] => {
  const b = breakCaption(q);
  return b.overflow ? breakCaption(q, 32, 3).lines : b.lines;
};

export const PredictionTimerView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE.sub;
  const lines = questionLines(props.question_ar);
  const opts = props.options ?? [];
  const fit = useAutoFit(ref, {id: ctx.id, size, min: Math.max(SIZE.labelMin, Math.round(size * 0.6)), maxW: ctx.box.w, maxH: ctx.box.h, key: `${lines.join('|')}#${opts.join('|')}`});
  const fs = fit.size;
  const os = Math.max(SIZE.labelMin, Math.round(fs * OPT_K));
  const f = (n: number) => filmF(n, ctx.fps);
  const t = ctx.frame - ctx.at;
  const ex = exitT(ctx);
  const out = exitFade(ctx);
  const revealF = ctx.frameOf(props.reveal) ?? ctx.at + Math.round((LEAD_FRAMES.predictionPauseMax * ctx.fps) / 24);
  const tr = ctx.frame - revealF; // frames since the reveal
  const optAt = (i: number) => f(4 + 2 * i) + Math.max(0, lines.length - 1) * f(2);
  const ringStart = optAt(Math.max(0, opts.length - 1)) + presetFrames('label', ctx.fps); // the clock starts once the choices are on screen
  const span = Math.max(1, revealF - ctx.at - ringStart);
  const drain = tr >= 0 ? 0 : 1 - interpolate(t - ringStart, [0, span], [0, 1], clamp); // linear clock
  const ringIn = revealProgress(t - ringStart + presetFrames('arrive', ctx.fps), presetFrames('arrive', ctx.fps));
  const ff = flashFrames(ctx.fps);
  const burst = tr >= 0 ? interpolate(tr, [0, ff, ff * 4], [1, 1, 0], clamp) : 0;
  const burstScale = tr >= 0 ? 1 + 0.5 * revealProgress(tr, presetFrames('arrive', ctx.fps)) : 1;
  const ringOp = tr >= 0 ? interpolate(tr, [0, presetFrames('exit', ctx.fps)], [1, 0], {...clamp, easing: ease.camera}) : ringIn;
  const recede = tr >= 0 ? revealProgress(tr, presetFrames('exit', ctx.fps, true), ease.camera) : 0;
  const thinking = tr < 0 && t >= ringStart;
  // the scan pulse walks the options once per ~1 s while the clock runs (deterministic, from the frame)
  const scanI = thinking && opts.length ? Math.floor(((t - ringStart) / ctx.fps) % opts.length) : -1;
  const scanP = thinking ? 0.5 - 0.5 * Math.cos(2 * Math.PI * (((t - ringStart) / ctx.fps) % 1)) : 0;
  const R = Math.round(fs * 0.95);
  const SW = Math.max(3, Math.round(fs * 0.09));
  const L = 2 * Math.PI * R;
  const breath = thinking ? 0.5 + 0.5 * Math.sin((2 * Math.PI * (t - ringStart)) / ctx.fps) : 0;
  const k = 0.6 + 0.5 * breath + 1.4 * burst + ctx.mod.glow;
  const rtl = isArabic(props.question_ar);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, opacity: out, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <div
        ref={ref}
        data-overflow={fit.overflow ? 1 : undefined}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 'max-content',
          opacity: 1 - 0.65 * recede,
          transform: `scale(${(1 - 0.06 * recede).toFixed(4)})`,
          filter: recede > 0.02 ? `blur(${(2.5 * recede).toFixed(2)}px)` : undefined,
          outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
        }}
      >
        <div dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {lines.map((l, i) => {
            const r = revealStyle(t - i * f(2), ctx.fps, 'arrive', rtl ? 'rtl' : 'ltr', ex);
            const mt = i ? stackGap({text: lines[i - 1], size: fs}, {text: l, size: fs}) : 0;
            return (
              <div key={i} style={{marginTop: mt, fontSize: fs, lineHeight: lineHeightFor(l), color: C.ink, textShadow: `${halo}, ${glow(C.signal, ctx.fx, 0.45)}`, whiteSpace: 'nowrap', transformOrigin: rtl ? 'right center' : 'left center', ...r.style}}>
                <MixedText id={`${ctx.id}:q${i}`} text={l} size={fs} />
              </div>
            );
          })}
        </div>
        {/* think ring: drains clockwise from the top; bursts on the reveal */}
        <div style={{position: 'relative', width: 2 * (R + SW * 3), height: 2 * (R + SW * 3), marginTop: Math.round(fs * 0.45), opacity: ringOp, transform: `scale(${burstScale.toFixed(4)})`}}>
          <svg width="100%" height="100%" viewBox={`0 0 ${2 * (R + SW * 3)} ${2 * (R + SW * 3)}`} style={{overflow: 'visible'}}>
            <g transform={`translate(${R + SW * 3} ${R + SW * 3})`}>
              <circle r={R} fill={`${C.panel}${hex(0.7)}`} stroke={C.grid} strokeWidth={SW} />
              <circle
                r={R}
                fill="none"
                stroke={C.signal}
                strokeWidth={SW}
                strokeLinecap="round"
                strokeDasharray={`${(L * drain).toFixed(2)} ${L.toFixed(2)}`}
                transform="rotate(-90)"
                style={{filter: `drop-shadow(0 0 ${(ctx.fx.glowInner * k).toFixed(1)}px ${C.signal})`}}
              />
              <circle r={R * (0.18 + 0.06 * breath)} fill={C.signal} opacity={0.25 + 0.5 * breath + 0.25 * burst} />
              {burst > 0 ? <circle r={R * (1 + 0.6 * (1 - burst))} fill="none" stroke={C.white} strokeOpacity={0.8 * burst} strokeWidth={SW} /> : null}
            </g>
          </svg>
        </div>
        {opts.length ? (
          <div dir="rtl" style={{display: 'flex', alignItems: 'baseline', columnGap: Math.max(LABEL_GAP_MIN_PX, Math.round(os * 1.2)), marginTop: Math.round(fs * 0.45), whiteSpace: 'nowrap'}}>
            {opts.map((o, i) => {
              const r = revealStyle(t - optAt(i), ctx.fps, 'label', 'rtl', ex);
              const lit = i === scanI ? scanP : 0;
              return (
                <div
                  key={i}
                  data-dc-part={`opt${i}`}
                  style={{
                    padding: `${(os * 0.35).toFixed(1)}px ${(os * 0.8).toFixed(1)}px`,
                    borderRadius: Math.round(os * 0.35),
                    background: `linear-gradient(200deg, ${C.panel}${hex(0.9)}, ${C.ground}${hex(0.85)})`,
                    border: `1px solid ${C.signal}${hex(0.18 + 0.5 * lit)}`,
                    boxShadow: `inset -1px 1px 0 ${C.ink}${hex(0.12)}, 0 0 ${Math.round(ctx.fx.glowInner * 2 * lit)}px ${C.signal}${hex(0.35 * lit)}`,
                    fontSize: os,
                    lineHeight: lineHeightFor(o),
                    color: C.ink,
                    textShadow: halo,
                    ...r.style,
                  }}
                >
                  <MixedText id={`${ctx.id}:o${i}`} text={o} size={os} weight={FONT.label.strong} />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Text-safe rect: question + ring + options block, centred. */
const textRect = (p: Props, box: Rect): Rect => {
  const fs = SIZE.sub;
  const lines = questionLines(p.question_ar);
  const longest = Math.max(...lines.map(visLen), ...(p.options ?? []).map((o) => visLen(o) * OPT_K * 1.6));
  const w = Math.min(box.w, fs * 0.6 * longest + fs * 1.6);
  const h = Math.min(box.h, fs * 1.6 * lines.length + fs * 2.6 + (p.options ? SIZE.body * 2.4 : 0));
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const PredictionTimer: DcComponent<Props> = {name: 'PredictionTimer', Component: PredictionTimerView, text: true, slot: 'center', textRect};
