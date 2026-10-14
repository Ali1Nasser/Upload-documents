// DeepDiveCard (catalog: Type & UI). Deep-Dive entry card (04 §7 Deep-Dive mode identity): a violet accent frame, the
// `DEEP DIVE · Pxx` tag, the parent trunk chapter as a node on the trunk rail with a branch that curves down into the card (the
// deep dive leaves the trunk and returns to it), the Arabic title in the display face, an optional English subtitle and the
// prerequisite concepts as mono chips (graph label_en, Latin only: the whole-word lexicon guard forbids Arabic copy that is not in
// the props). Violet is the Deep-Dive accent (04 §1.1). Light per ADR-003 LK-F: key rim from the upper right, warm-violet haze.
// Timing (RV1): the frame and the trunk rail start drawing, the tag and the title arrive ON the anchor; the branch follows over
// the morph span, the subtitle 3 film frames later and the chips 2 film frames apart after that (`label` preset). The SFX map
// pairs it with riser + sting (04 §9).
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {glow, halo, hex} from '../../fx/look';
import {useAutoFit} from '../../type/Text';
import {lineHeightFor, stackGap} from '../../type/arabic';
import {LABEL_GAP_MIN_PX, type Rect} from '../../type/safe';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import {conceptLabel} from '../_typeui/concepts';
import {Mx, clamp, exitFade, exitT, filmF} from '../_typeui/kit';
import type {Props} from './schema';

const EN_K = SIZE.label / SIZE.sub;
const ACC = C.violet;

/** `DD-P14` -> `P14`, `DD-P19-2` -> `P19 · 2`. */
export const ddTag = (id: string): string => {
  const m = id.match(/^DD-(P\d{2})(?:-(\d+))?$/);
  return m ? `DEEP DIVE · ${m[1]}${m[2] ? ` · ${m[2]}` : ''}` : `DEEP DIVE · ${id}`;
};

export const DeepDiveCardView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE.sub;
  const pre = props.prerequisites ?? [];
  const fit = useAutoFit(ref, {
    id: ctx.id,
    size,
    min: Math.max(SIZE.labelMin, Math.round(size * 0.6)),
    maxW: ctx.box.w * 0.82,
    maxH: ctx.box.h * 0.62,
    key: `${props.title_ar}|${props.title_en ?? ''}|${pre.join(',')}`,
  });
  const fs = fit.size;
  const es = Math.max(SIZE.labelMin, Math.round(fs * EN_K));
  const cs = Math.max(SIZE.labelMin, Math.round(fs * EN_K));
  const t = ctx.frame - ctx.at;
  const ex = exitT(ctx);
  const out = exitFade(ctx);
  const f = (n: number) => filmF(n, ctx.fps);
  const nM = presetFrames('morph', ctx.fps, true);
  const frameP = revealProgress(t, nM, ease.camera);
  const branch = revealProgress(t - f(2), nM, ease.camera);
  const tag = revealStyle(t, ctx.fps, 'label', 'ltr', ex);
  const title = revealStyle(t, ctx.fps, 'arrive', 'rtl', ex);
  const en = props.title_en ? revealStyle(t - f(3), ctx.fps, 'label', 'ltr', ex) : null;
  const glowIn = revealProgress(t, nM * 2, ease.camera);
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * Math.max(0, ctx.frame - ctx.at)) / (ctx.fps * 2.5)); // slow node breath
  const k = 0.6 + ctx.mod.glow;
  const bx = ctx.box;
  // the trunk rail sits along the top of the box; the parent node at the right (reading start); the branch curves down-left
  const railY = Math.round(bx.h * 0.12);
  const nodeX = Math.round(bx.w * 0.86);
  const cardTop = Math.round(bx.h * 0.24);
  const perim = 2 * (bx.w + bx.h);
  return (
    <div style={{position: 'absolute', left: bx.x, top: bx.y, width: bx.w, height: bx.h, opacity: out}}>
      {/* warm-violet haze from the upper right (key) */}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(55% 65% at 80% 22%, ${ACC}${hex(0.1 * glowIn)}, transparent 72%)`}} />
      <svg width={bx.w} height={bx.h} viewBox={`0 0 ${bx.w} ${bx.h}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* trunk rail (neutral), drawn from the right */}
        <line x1={bx.w} y1={railY} x2={0} y2={railY} stroke={C.ink3} strokeOpacity={0.5} strokeWidth={2} pathLength={1} strokeDasharray={`${frameP} 1`} />
        {/* branch from the parent node into the card */}
        <path
          d={`M ${nodeX} ${railY} C ${nodeX} ${(railY + cardTop) / 2}, ${nodeX - bx.w * 0.06} ${cardTop}, ${nodeX - bx.w * 0.12} ${cardTop}`}
          fill="none"
          stroke={ACC}
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${branch} 1`}
          style={{filter: `drop-shadow(0 0 6px ${ACC})`}}
        />
        {/* violet accent frame around the card area */}
        <rect
          x={bx.w * 0.04}
          y={cardTop}
          width={bx.w * 0.92}
          height={bx.h - cardTop - 2}
          rx={18}
          fill={`${C.panel}${hex(0.55 * frameP)}`}
          stroke={ACC}
          strokeOpacity={0.75}
          strokeWidth={2}
          pathLength={1}
          strokeDasharray={`${frameP} 1`}
          style={{filter: `drop-shadow(0 0 ${(ctx.fx.glowInner * k).toFixed(1)}px ${ACC}${hex(0.7)})`}}
        />
        <circle cx={nodeX} cy={railY} r={9 + 3 * pulse * glowIn} fill={C.ground} stroke={ACC} strokeWidth={3} opacity={frameP > 0 ? 1 : 0} />
      </svg>
      {/* parent chapter on the rail (left of its node) */}
      <div style={{position: 'absolute', right: bx.w - nodeX + 24, top: railY - cs * 0.85, ...tag.style}}>
        <bdi dir="ltr" data-dc-text={`${ctx.id}:parent`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: cs, color: C.ink2, textShadow: halo, whiteSpace: 'nowrap'}}>
          {props.parent}
        </bdi>
      </div>
      <div style={{position: 'absolute', left: bx.w * 0.04, top: cardTop, width: bx.w * 0.92, height: bx.h - cardTop, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} dir="rtl" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'max-content', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
          <div style={{...tag.style}}>
            <bdi dir="ltr" data-dc-text={`${ctx.id}:tag`} style={{display: 'inline-block', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: cs, letterSpacing: '0.16em', color: ACC, padding: `${(cs * 0.18).toFixed(1)}px ${(cs * 0.5).toFixed(1)}px`, border: `1px solid ${ACC}${hex(0.6)}`, borderRadius: cs, textShadow: `${halo}, ${glow(ACC, ctx.fx, 0.3)}`, whiteSpace: 'nowrap'}}>
              {ddTag(props.chapter)}
            </bdi>
          </div>
          <div style={{marginTop: Math.round(fs * 0.3), fontSize: fs, lineHeight: lineHeightFor(props.title_ar), color: C.ink, textShadow: `${halo}, ${glow(ACC, ctx.fx, 0.45 * k)}`, whiteSpace: 'nowrap', transformOrigin: 'right center', ...title.style}}>
            <Mx id={`${ctx.id}:title`} text={props.title_ar} size={fs} />
          </div>
          {props.title_en && en ? (
            <div style={{marginTop: stackGap({text: props.title_ar, size: fs}, {text: props.title_en, size: es}, 'title-sub'), fontSize: es, color: C.ink2, textShadow: halo, whiteSpace: 'nowrap', ...en.style}}>
              <Mx id={`${ctx.id}:en`} text={props.title_en} size={es} />
            </div>
          ) : null}
          {pre.length ? (
            <div style={{marginTop: Math.round(fs * 0.5), display: 'flex', alignItems: 'baseline', columnGap: Math.max(LABEL_GAP_MIN_PX, Math.round(cs * 1.2)), whiteSpace: 'nowrap'}}>
              {pre.map((c, i) => {
                const r = revealStyle(t - f(5 + 2 * i), ctx.fps, 'label', 'ltr', ex);
                const lit = interpolate(t - f(5 + 2 * i), [0, f(4)], [1, 0.35], clamp);
                return (
                  <div key={c} data-dc-part={`p${i}`} style={{display: 'inline-flex', alignItems: 'center', gap: Math.round(cs * 0.4), padding: `${(cs * 0.2).toFixed(1)}px ${(cs * 0.55).toFixed(1)}px`, borderRadius: cs, background: `${C.ground}${hex(0.85)}`, border: `1px solid ${ACC}${hex(0.25 + 0.35 * lit)}`, ...r.style}}>
                    <span style={{width: Math.round(cs * 0.28), height: Math.round(cs * 0.28), borderRadius: '50%', background: ACC, boxShadow: glow(ACC, ctx.fx, 0.3 + 0.5 * lit), flex: 'none'}} />
                    <bdi dir="ltr" data-dc-text={`${ctx.id}:p${i}`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: cs, color: C.ink, textShadow: halo}}>
                      {conceptLabel(c)}
                    </bdi>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/** Text-safe rect: the card area below the trunk rail (the rail label sits above it, on its own halo). */
const textRect = (p: Props, box: Rect): Rect => {
  const top = Math.round(box.h * 0.24);
  return {x: box.x + box.w * 0.04, y: box.y + top, w: box.w * 0.92, h: box.h - top};
};

export const DeepDiveCard: DcComponent<Props> = {name: 'DeepDiveCard', Component: DeepDiveCardView, text: true, slot: 'full', textRect};
