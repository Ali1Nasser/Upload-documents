// DeepDiveCard (catalog: Type & UI). Deep-Dive entry card (04 §7 Deep-Dive mode identity): a violet accent frame, the `DEEP DIVE · Pxx`
// tag, the Arabic title in the display face, an optional English subtitle and the prerequisite concepts as mono chips (graph
// label_en, Latin only: the whole-word lexicon guard forbids Arabic copy that is not in the props).
// Metaphor (04 §6, 04 §7 "same layout grammar as the trunk"): the film is a rail. The parent trunk chapter is a lit node on a ticked
// trunk rail (time reads right -> left); the deep dive LEAVES the trunk at that node, a branch curves down and merges into the card's
// rim, and a dim dashed return arc rises from the card's end side back onto the rail ("the deep dive leaves the trunk and returns to
// it"). Violet is the Deep-Dive accent (04 §1.1). Light per ADR-003 LK-F: key rim from the upper right (gradient border, bright at the
// upper right, falling to the lower left), warm-violet haze, a floor pool under the slab, a far-plane ghost `Pxx` numeral inside the
// slab, two ripple rings leaving the node. 2D only (the catalog implies no 3D), so hero = standard: tiers differ by FX tokens alone.
// Timing (RV1, ink on the anchor frame): the frame, the rail, the tag and the title are visible ON the anchor; the branch follows
// 2 film frames later over the morph span, the subtitle +3 f, the chips 2 film frames apart from +5 f (`label` preset), the return arc
// after the last chip. The SFX map pairs the card with riser + sting (04 §9); the spec's `until` ends it with the exit preset.
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
const NODE_R = 10;

/** `DD-P14` -> `P14`, `DD-P19-2` -> `P19 · 2`. */
export const ddTag = (id: string): string => {
  const m = id.match(/^DD-(P\d{2})(?:-(\d+))?$/);
  return m ? `DEEP DIVE · ${m[1]}${m[2] ? ` · ${m[2]}` : ''}` : `DEEP DIVE · ${id}`;
};
/** `DD-P23` -> `P23` (ghost numeral). */
const ddPart = (id: string): string => id.match(/^DD-(P\d{2}(?:-\d+)?)$/)?.[1] ?? id;

export const DeepDiveCardView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = SIZE.sub;
  const pre = props.prerequisites ?? [];
  const bx = ctx.box;
  const padH = Math.round(size * 1.0);
  const fit = useAutoFit(ref, {
    id: ctx.id,
    size,
    min: Math.max(SIZE.labelMin, Math.round(size * 0.6)),
    maxW: bx.w - 2 * padH - bx.w * 0.06,
    maxH: bx.h * 0.5,
    key: `${props.title_ar}|${props.title_en ?? ''}|${pre.join(',')}`,
  });
  const fs = fit.size;
  const es = Math.max(SIZE.labelMin, Math.round(fs * EN_K));
  const cs = Math.max(SIZE.labelMin, Math.round(fs * EN_K));
  const t = ctx.frame - ctx.at;
  const ex = exitT(ctx);
  const out = exitFade(ctx);
  const out01 = 1 - out;
  const f = (n: number) => filmF(n, ctx.fps);
  const nM = presetFrames('morph', ctx.fps, true);
  const frameP = revealProgress(t, nM, ease.camera);
  const branch = revealProgress(t - f(2), nM, ease.camera);
  const lastChip = f(5 + 2 * Math.max(0, pre.length - 1));
  const ret = revealProgress(t - lastChip - f(4), nM, ease.camera);
  const tag = revealStyle(t, ctx.fps, 'label', 'ltr', ex);
  const title = revealStyle(t, ctx.fps, 'arrive', 'rtl', ex);
  const en = props.title_en ? revealStyle(t - f(3), ctx.fps, 'label', 'ltr', ex) : null;
  const glowIn = revealProgress(t, nM * 2, ease.camera);
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * Math.max(0, ctx.frame - ctx.at)) / (ctx.fps * 2.5)); // slow node breath
  const k = 0.6 + ctx.mod.glow;
  const gapUp = Math.round(bx.h * 0.15); // rail -> card top
  const bw = Math.round(bx.w * 0.075); // branch / return arc horizontal run
  const nodeFromRight = 0.09; // node x as a share of the card width, from the reading-start (right) edge
  const retFromLeft = 0.07;
  const drift = interpolate(ctx.frame, [ctx.at, ctx.at + ctx.fps * 3], [0, 1], clamp);
  const ripple = (n: number) => {
    const p = revealProgress(t - f(n), nM * 3, ease.camera);
    return {r: NODE_R + p * bx.w * 0.05, o: t - f(n) < 0 ? 0 : 0.5 * (1 - p)};
  };
  const rings = [ripple(1), ripple(7)];
  const rimId = `dd-rim-${ctx.id}`;
  return (
    <div style={{position: 'absolute', left: bx.x, top: bx.y, width: bx.w, height: bx.h, opacity: out}}>
      {/* key light: warm-violet haze from the upper right, plus a floor pool under the slab */}
      <div aria-hidden style={{position: 'absolute', inset: '-20% -10%', background: `radial-gradient(closest-side at 74% 28%, ${ACC}${hex(0.13 * glowIn)}, ${ACC}00)`}} />
      <div aria-hidden style={{position: 'absolute', inset: '-10% -10%', background: `radial-gradient(34% 12% at 50% 80%, ${ACC}${hex(0.09 * glowIn)}, ${ACC}00)`}} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: gapUp}}>
        <div style={{position: 'relative', transform: `scale(${(1 - out01 * 0.04).toFixed(4)})`, transformOrigin: 'center center'}}>
          {/* trunk rail: ticks (far plane), the rail itself, drawn right -> left */}
          <div aria-hidden style={{position: 'absolute', top: -gapUp - 8, left: '50%', width: bx.w, height: 16, transform: 'translateX(-50%)', backgroundImage: `repeating-linear-gradient(270deg, ${C.ink3} 0 2px, transparent 2px ${Math.round(bx.w / 24)}px)`, opacity: 0.32 * frameP, clipPath: `inset(0 0 0 ${((1 - frameP) * 100).toFixed(2)}%)`}} />
          <div aria-hidden style={{position: 'absolute', top: -gapUp - 1, left: '50%', width: bx.w, height: 2, transform: 'translateX(-50%)', background: `linear-gradient(270deg, ${C.ink3}, ${C.ink3}${hex(0.35)})`, opacity: 0.8, clipPath: `inset(0 0 0 ${((1 - frameP) * 100).toFixed(2)}%)`}} />
          {/* parent node + ripple rings */}
          {rings.map((g, i) => (
            <div key={i} aria-hidden style={{position: 'absolute', top: -gapUp - g.r, right: `calc(${nodeFromRight * 100}% - ${g.r}px)`, width: 2 * g.r, height: 2 * g.r, borderRadius: '50%', border: `2px solid ${ACC}`, opacity: g.o}} />
          ))}
          <div aria-hidden style={{position: 'absolute', top: -gapUp - NODE_R - 3 * pulse * glowIn, right: `calc(${nodeFromRight * 100}% - ${NODE_R + 3 * pulse * glowIn}px)`, width: 2 * (NODE_R + 3 * pulse * glowIn), height: 2 * (NODE_R + 3 * pulse * glowIn), borderRadius: '50%', background: C.ground, border: `3px solid ${ACC}`, boxShadow: glow(ACC, ctx.fx, 0.5 * k), opacity: frameP > 0 ? 1 : 0}} />
          <div style={{position: 'absolute', top: -gapUp - cs * 0.85, right: `calc(${nodeFromRight * 100}% + ${NODE_R + 24}px)`, ...tag.style}}>
            <bdi dir="ltr" data-dc-text={`${ctx.id}:parent`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: cs, color: C.ink2, textShadow: halo, whiteSpace: 'nowrap'}}>
              {props.parent}
            </bdi>
          </div>
          {/* branch: leaves the trunk at the node, merges tangentially into the card rim */}
          <svg aria-hidden width={bw} height={gapUp} viewBox={`0 0 ${bw} ${gapUp}`} style={{position: 'absolute', bottom: '100%', right: `${nodeFromRight * 100}%`, overflow: 'visible'}}>
            <path d={`M ${bw} 0 C ${bw} ${gapUp * 0.62}, ${bw * 0.55} ${gapUp}, 0 ${gapUp}`} fill="none" stroke={ACC} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={`${branch} 1`} opacity={branch > 0 ? 1 : 0} style={{filter: `drop-shadow(0 0 ${(ctx.fx.glowInner * k).toFixed(1)}px ${ACC})`}} />
          </svg>
          {/* return arc: dim, dashed, from the end (left) side of the card back up onto the rail */}
          <svg aria-hidden width={bw} height={gapUp + 12} viewBox={`0 0 ${bw} ${gapUp + 12}`} style={{position: 'absolute', bottom: '100%', left: `${retFromLeft * 100}%`, overflow: 'visible', opacity: ret * 0.75, transform: `translateY(${((1 - ret) * 10).toFixed(2)}px)`}}>
            <path d={`M ${bw} ${gapUp + 12} C ${bw * 0.45} ${gapUp + 12}, 0 ${gapUp * 0.45}, 0 12`} fill="none" stroke={C.ink3} strokeWidth={2} strokeDasharray="7 9" strokeLinecap="round" />
            <path d="M -8 20 L 0 10 L 8 20" fill="none" stroke={C.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div aria-hidden style={{position: 'absolute', top: -gapUp - 6, left: `${retFromLeft * 100}%`, width: 12, height: 12, borderRadius: '50%', border: `2px solid ${C.ink3}`, background: C.ground, opacity: ret * 0.9, marginLeft: -6}} />
          {/* the slab: glass fill, rim-lit gradient frame (key from the upper right), far-plane ghost numeral */}
          <div style={{position: 'relative', padding: `${Math.round(fs * 0.7)}px ${padH}px`, borderRadius: 20, boxShadow: `0 ${Math.round(fs * 0.7)}px ${Math.round(fs * 1.4)}px -${Math.round(fs * 0.5)}px ${C.void}${hex(frameP)}, 0 0 ${Math.round(ctx.fx.glowPx * 1.6)}px ${ACC}${hex(0.12 * frameP)}`}}>
            <div aria-hidden style={{position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', opacity: frameP}}>
              <div style={{position: 'absolute', inset: 0, background: `linear-gradient(200deg, ${C.panel}F0, ${C.ground}E6)`}} />
              <div style={{position: 'absolute', inset: 0, background: `radial-gradient(70% 90% at 85% 0%, ${ACC}${hex(0.22)}, ${ACC}00)`}} />
              <div
                style={{
                  position: 'absolute',
                  left: '2%',
                  top: '50%',
                  fontFamily: `'${FONT.mono.family}'`,
                  fontWeight: FONT.mono.weight,
                  fontSize: Math.round(fs * 4.4),
                  lineHeight: 1,
                  color: 'transparent',
                  WebkitTextStroke: `2px ${C.ink3}`,
                  opacity: 0.12,
                  transform: `translate(${(-drift * 14).toFixed(2)}px, -50%)`,
                  whiteSpace: 'nowrap',
                }}
              >
                {ddPart(props.chapter)}
              </div>
              <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: `linear-gradient(270deg, ${C.white}${hex(0.35)}, ${C.white}00 60%)`}} />
            </div>
            <svg aria-hidden width="100%" height="100%" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              <defs>
                <linearGradient id={rimId} x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={ACC} stopOpacity={1} />
                  <stop offset="0.55" stopColor={ACC} stopOpacity={0.45} />
                  <stop offset="1" stopColor={ACC} stopOpacity={0.22} />
                </linearGradient>
              </defs>
              <rect x={0} y={0} width="100%" height="100%" rx={20} fill="none" stroke={`url(#${rimId})`} strokeWidth={2.5} pathLength={1} strokeDasharray={`${frameP} 1`} opacity={frameP > 0 ? 1 : 0} />
            </svg>
            <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} dir="rtl" style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'max-content', outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
              <div style={{...tag.style}}>
                <bdi dir="ltr" data-dc-text={`${ctx.id}:tag`} style={{display: 'inline-block', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: cs, letterSpacing: '0.16em', color: ACC, padding: `${(cs * 0.18).toFixed(1)}px ${(cs * 0.5).toFixed(1)}px`, border: `1px solid ${ACC}${hex(0.6)}`, borderRadius: cs, background: `${ACC}${hex(0.1)}`, textShadow: `${halo}, ${glow(ACC, ctx.fx, 0.3)}`, whiteSpace: 'nowrap'}}>
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
                <div style={{marginTop: Math.round(fs * 0.55), alignSelf: 'stretch', display: 'flex', alignItems: 'baseline', columnGap: Math.max(LABEL_GAP_MIN_PX, Math.round(cs * 1.2)), whiteSpace: 'nowrap'}}>
                  <div aria-hidden style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: Math.round(cs * 0.72), letterSpacing: '0.18em', color: C.ink3, ...revealStyle(t - f(4), ctx.fps, 'label', 'ltr', ex).style}}>PREREQ</div>
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
      </div>
    </div>
  );
};

/** Text-safe rect: the slab (centred, content-sized) plus the parent label on the rail above it. Conservative: the slab is
 * content-sized, so this is its upper bound from the box and the type scale. */
const textRect = (p: Props, box: Rect): Rect => {
  const h = Math.min(box.h, SIZE.sub * 4.6 + SIZE.label * 4 + box.h * 0.15);
  const w = box.w * 0.9;
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2 + box.h * 0.04, w, h};
};

export const DeepDiveCard: DcComponent<Props> = {name: 'DeepDiveCard', Component: DeepDiveCardView, text: true, slot: 'full', textRect};
