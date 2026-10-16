// PredictionTimer (catalog: Type & UI). The prediction beat (04 §4 "Prediction pause": countdown ring or think pulse, <= 6 s).
// Metaphor (04 §6): a lit glass DIAL on a dark floor. The question arrives ON the layer anchor (whole lines, RTL `arrive` wipe; <= 2
// lines of <= 32 visible chars, broken at word boundaries only) under a mono `PREDICT` tag; a 60-tick dial sweeps in under it and
// the options land as raised glass cards on one baseline (>= 40 px apart, AT-4), 2 film frames apart. Then the clock runs: the
// signal arc and the tick ring drain clockwise from the top (a clock is the one allowed linear motion), a comet head rides the arc
// end, a faint sector shows the time left, a far-plane dashed orbit turns slowly, a `?` breathes in the hub, and a scan pulse
// lifts one option card at a time (the viewer is invited to choose). The last quarter of the clock warms from signal to warn.
// On the `reveal` frame the dial bursts (80 ms impact flash + shockwave) and the question and options recede into depth (opacity,
// scale, light blur), handing the frame to the answer layer. No digits are drawn: a countdown number would be a number without a
// data ref. Light per ADR-003 LK-F: key haze from the upper right, rim-lit card borders (bright upper right), floor pool and
// hairline under the options. 2D only (the catalog implies no 3D), so hero = standard: tiers differ by FX tokens alone.
// The schema has no `answer` field, so the timer never marks the right option: the answer layer of the shot does, by pointing a
// Spotlight / CalloutArrow at the option part (`to: '<layer>.opt<i>'`; every option carries data-dc-part="opt<i>").
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, LEAD_FRAMES, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {breakCaption, isArabic, lineHeightFor, stackGap, visLen} from '../../type/arabic';
import {LABEL_GAP_MIN_PX, type Rect} from '../../type/safe';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {Mx, clamp, exitFade, exitT, filmF} from '../_typeui/kit';
import type {Props} from './schema';

const OPT_K = SIZE.body / SIZE.sub;

/** Question lines: <= 2 lines of <= 32 visible chars (caption rule); longer questions get a 3rd line (auto-fit shrinks). */
export const questionLines = (q: string): string[] => {
  const b = breakCaption(q);
  return b.overflow ? breakCaption(q, 32, 3).lines : b.lines;
};

const TICKS = 60;
const DEG = Math.PI / 180;

/** SVG sector path (clockwise from the top) covering `frac` of the circle. */
const sector = (r: number, frac: number): string => {
  if (frac <= 0.0005) return '';
  if (frac >= 0.9995) return `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 Z`;
  const a = (-90 + 360 * frac) * DEG;
  return `M 0 0 L 0 ${-r} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)} Z`;
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
  const nM = presetFrames('morph', ctx.fps, true);
  const optAt = (i: number) => f(6 + 2 * i) + Math.max(0, lines.length - 1) * f(2);
  const ringStart = optAt(Math.max(0, opts.length - 1)) + presetFrames('label', ctx.fps); // the clock starts once the choices are on screen
  const span = Math.max(1, revealF - ctx.at - ringStart);
  const drain = tr >= 0 ? 0 : 1 - interpolate(t - ringStart, [0, span], [0, 1], clamp); // linear clock
  const sweep = revealProgress(t - f(3), nM * 2, ease.camera); // dial sweeps in, clockwise
  const ff = flashFrames(ctx.fps);
  const burst = tr >= 0 ? interpolate(tr, [0, ff, ff * 4], [1, 1, 0], clamp) : 0;
  const shock = tr >= 0 ? revealProgress(tr, presetFrames('morph', ctx.fps, true) * 2, ease.camera) : 0;
  const burstScale = tr >= 0 ? 1 + 0.18 * revealProgress(tr, presetFrames('arrive', ctx.fps), ease.camera) : 1;
  const dialOp = tr >= 0 ? interpolate(tr, [0, presetFrames('exit', ctx.fps)], [1, 0], {...clamp, easing: ease.camera}) : 1;
  const recede = tr >= 0 ? revealProgress(tr, presetFrames('exit', ctx.fps, true), ease.camera) : 0;
  const thinking = tr < 0 && t >= ringStart;
  const clk = Math.max(0, t - ringStart) / ctx.fps; // seconds of thinking, for the loops only (never timing)
  // the scan pulse walks the options once per ~1 s while the clock runs (deterministic, from the frame)
  const scanI = thinking && opts.length ? Math.floor(clk % opts.length) : -1;
  const scanP = thinking ? 0.5 - 0.5 * Math.cos(2 * Math.PI * (clk % 1)) : 0;
  const breath = thinking ? 0.5 + 0.5 * Math.sin(2 * Math.PI * clk) : 0.35;
  const warm = tr < 0 && thinking ? 1 - interpolate(drain, [0.16, 0.28], [0, 1], clamp) : 0; // last quarter: signal -> warn
  const R = Math.round(fs * 2.0);
  const SW = Math.max(3, Math.round(fs * 0.085));
  const Rt = R + Math.round(SW * 3.4); // outer edge of the tick ring
  const D = 2 * Rt;
  const L = 2 * Math.PI * R;
  const k = 0.6 + 0.5 * breath + 1.4 * burst + ctx.mod.glow;
  const headA = (-90 + 360 * drain) * DEG;
  const rtl = isArabic(props.question_ar);
  const tagS = revealStyle(t, ctx.fps, 'label', 'ltr', ex);
  const ts = Math.max(SIZE.labelMin, Math.round(fs * (SIZE.label / SIZE.sub)));
  const arcAt = (c: string, o: number) =>
    o > 0.01 ? (
      <circle r={R} fill="none" stroke={c} strokeOpacity={o} strokeWidth={SW} strokeLinecap="round" strokeDasharray={`${(L * drain).toFixed(2)} ${L.toFixed(2)}`} transform="rotate(-90)" style={{filter: `drop-shadow(0 0 ${(ctx.fx.glowInner * k).toFixed(1)}px ${c})`}} />
    ) : null;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, opacity: out, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      {/* key light (LK-F): a cool haze from the upper right, lifting a touch while the clock runs */}
      <div aria-hidden style={{position: 'absolute', inset: '-15% -10%', background: `radial-gradient(closest-side at 70% 30%, ${C.signal}${hex(0.1 * sweep * (1 - recede))}, ${C.signal}00)`}} />
      <div
        ref={ref}
        data-overflow={fit.overflow ? 1 : undefined}
        style={{
          position: 'relative',
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
        <div style={{...tagS.style, display: 'flex', alignItems: 'center', columnGap: Math.round(ts * 0.5), marginBottom: Math.round(fs * 0.3)}}>
          <span aria-hidden style={{width: Math.round(ts * 0.3), height: Math.round(ts * 0.3), borderRadius: '50%', background: C.signal, boxShadow: glow(C.signal, ctx.fx, 0.3 + 0.7 * breath), flex: 'none'}} />
          <bdi dir="ltr" data-dc-text={`${ctx.id}:tag`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: ts, letterSpacing: '0.22em', color: C.signal, textShadow: `${halo}, ${glow(C.signal, ctx.fx, 0.25)}`, whiteSpace: 'nowrap'}}>
            PREDICT
          </bdi>
        </div>
        <div dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {lines.map((l, i) => {
            const r = revealStyle(t - i * f(2), ctx.fps, 'arrive', rtl ? 'rtl' : 'ltr', ex);
            const mt = i ? stackGap({text: lines[i - 1], size: fs}, {text: l, size: fs}) : 0;
            return (
              <div key={i} style={{marginTop: mt, fontSize: fs, lineHeight: lineHeightFor(l), color: C.ink, textShadow: `${halo}, ${glow(C.signal, ctx.fx, 0.45)}`, whiteSpace: 'nowrap', transformOrigin: rtl ? 'right center' : 'left center', ...r.style}}>
                <Mx id={`${ctx.id}:q${i}`} text={l} size={fs} />
              </div>
            );
          })}
        </div>
        {/* the dial: tick ring, sector of time left, draining arc with a comet head, far-plane orbit, breathing hub */}
        <div style={{position: 'relative', width: D, height: D, marginTop: Math.round(fs * 0.3), opacity: dialOp * (sweep > 0 ? 1 : 0), transform: `scale(${burstScale.toFixed(4)})`}}>
          <svg width={D} height={D} viewBox={`0 0 ${D} ${D}`} style={{overflow: 'visible'}}>
            <g transform={`translate(${Rt} ${Rt})`}>
              <circle r={Rt * 1.22} fill="none" stroke={C.ink3} strokeOpacity={0.22} strokeWidth={2} strokeDasharray="3 15" transform={`rotate(${(clk * 9).toFixed(2)})`} />
              <circle r={R} fill={`${C.panel}${hex(0.72)}`} stroke={C.grid} strokeWidth={SW} />
              <path d={sector(R - SW, drain)} fill={C.signal} fillOpacity={0.07} transform="rotate(0)" />
              {Array.from({length: TICKS}, (_, i) => {
                const a = (-90 + (360 * i) / TICKS) * DEG;
                const major = i % 5 === 0;
                const r0 = R + SW * 1.3;
                const r1 = r0 + SW * (major ? 1.9 : 1.1);
                const shown = i / TICKS <= sweep + 1e-6;
                const lit = (i + 0.5) / TICKS <= drain;
                const col = lit ? (warm > 0.5 ? C.warn : C.signal) : C.ink3;
                const op = !shown ? 0 : lit ? (major ? 0.95 : 0.7) : 0.28;
                return <line key={i} x1={(r0 * Math.cos(a)).toFixed(2)} y1={(r0 * Math.sin(a)).toFixed(2)} x2={(r1 * Math.cos(a)).toFixed(2)} y2={(r1 * Math.sin(a)).toFixed(2)} stroke={col} strokeOpacity={op} strokeWidth={major ? 3 : 2} strokeLinecap="round" />;
              })}
              {arcAt(C.signal, 1 - warm)}
              {arcAt(C.warn, warm)}
              {drain > 0.004 && drain < 0.996 ? <circle cx={(R * Math.cos(headA)).toFixed(2)} cy={(R * Math.sin(headA)).toFixed(2)} r={SW * 1.1} fill={C.white} style={{filter: `drop-shadow(0 0 ${(ctx.fx.glowInner * k).toFixed(1)}px ${warm > 0.5 ? C.warn : C.signal})`}} /> : null}
              <text textAnchor="middle" dominantBaseline="central" y={R * 0.04} fontFamily={`'${FONT.mono.family}'`} fontWeight={FONT.mono.weight} fontSize={Math.round(R * 0.8)} fill={C.ink} fillOpacity={0.3 + 0.45 * breath + 0.25 * burst} style={{filter: `drop-shadow(0 0 ${(ctx.fx.glowInner * (0.4 + breath)).toFixed(1)}px ${C.signal})`}}>
                ?
              </text>
              {burst > 0 ? <circle r={R * (1 + 0.5 * (1 - burst))} fill="none" stroke={C.white} strokeOpacity={0.8 * burst} strokeWidth={SW} /> : null}
              {tr >= 0 ? <circle r={R * (1 + 2.2 * shock)} fill="none" stroke={C.signal} strokeOpacity={0.55 * (1 - shock)} strokeWidth={SW * (1 - 0.6 * shock)} /> : null}
            </g>
          </svg>
        </div>
        {opts.length ? (
          <div style={{position: 'relative', marginTop: Math.round(fs * 0.5)}}>
            {/* floor pool + hairline under the cards (LK-F) */}
            <div aria-hidden style={{position: 'absolute', left: '-6%', right: '-6%', top: '55%', height: Math.round(os * 3.4), background: `radial-gradient(closest-side, ${C.signal}${hex(0.11 * sweep)}, ${C.signal}00)`}} />
            <div aria-hidden style={{position: 'absolute', left: '-4%', right: '-4%', bottom: -Math.round(os * 0.55), height: 2, background: `linear-gradient(90deg, ${C.signal}00, ${C.ink3}${hex(0.5 * sweep)}, ${C.signal}00)`}} />
            <div dir="rtl" style={{position: 'relative', display: 'flex', alignItems: 'baseline', columnGap: Math.max(LABEL_GAP_MIN_PX, Math.round(os * 1.2)), whiteSpace: 'nowrap'}}>
              {opts.map((o, i) => {
                const r = revealStyle(t - optAt(i), ctx.fps, 'label', 'rtl', ex);
                const lit = i === scanI ? scanP : 0;
                return (
                  <div
                    key={i}
                    data-dc-part={`opt${i}`}
                    style={{
                      position: 'relative',
                      padding: `${(os * 0.38).toFixed(1)}px ${(os * 0.85).toFixed(1)}px`,
                      borderRadius: Math.round(os * 0.4),
                      background: `radial-gradient(90% 140% at 85% 0%, ${C.signal}${hex(0.1 + 0.16 * lit)}, ${C.signal}00), linear-gradient(200deg, ${C.panel}${hex(0.92)}, ${C.ground}${hex(0.88)})`,
                      border: `1px solid ${C.signal}${hex(0.2 + 0.55 * lit)}`,
                      borderTopColor: `${C.white}${hex(0.22 + 0.3 * lit)}`,
                      boxShadow: `inset -1px 1px 0 ${C.ink}${hex(0.12)}, 0 ${Math.round(os * 0.35)}px ${Math.round(os * 0.7)}px -${Math.round(os * 0.3)}px ${C.void}, 0 0 ${Math.round(ctx.fx.glowInner * 2.4 * lit)}px ${C.signal}${hex(0.4 * lit)}`,
                      fontSize: os,
                      lineHeight: lineHeightFor(o),
                      color: C.ink,
                      textShadow: halo,
                      ...r.style,
                      transform: `${r.style.transform ?? ''} translateY(${(-os * 0.12 * lit).toFixed(2)}px)`.trim(),
                    }}
                  >
                    <Mx id={`${ctx.id}:o${i}`} text={o} size={os} weight={FONT.label.strong} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Text-safe rect: tag + question + dial + options block, centred. */
const textRect = (p: Props, box: Rect): Rect => {
  const fs = SIZE.sub;
  const lines = questionLines(p.question_ar);
  const longest = Math.max(...lines.map(visLen), ...(p.options ?? []).map((o) => visLen(o) * OPT_K * 1.6));
  const w = Math.min(box.w, fs * 0.6 * longest + fs * 1.6);
  const h = Math.min(box.h, fs * 1.6 * lines.length + fs * 6.2 + SIZE.label * 1.6 + (p.options ? SIZE.body * 2.6 : 0));
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const PredictionTimer: DcComponent<Props> = {name: 'PredictionTimer', Component: PredictionTimerView, text: true, slot: 'center', textRect};
