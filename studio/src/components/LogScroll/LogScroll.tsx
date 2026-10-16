// LogScroll (catalog: Domain specials). 04 §6 "Linux ops": logs as a scrolling ledger with a grep spotlight.
// A rim-lit acrylic ledger panel on a holographic floor: a header strip (live dot + `tail -f`, which becomes `grep LEVEL` when
// the spotlight lands), the ledger window, and a severity rail on the right that maps every line (born lines in their level
// tone, the viewport bracketed, the grep hit glowing). Each ledger row = a level gutter bar + a level tag + the line text in a
// mono LTR isolate (Latin / code copy; an Arabic run inside a line still goes through MixedText, whole words). Levels read
// without narration: error rows carry a standing crit wash, warn rows an amber one, debug is ink3; a newly appended line
// blooms in its tone, then settles.
// Lines are appended at the bottom from the layer anchor (RV1: the first line has ink on the anchor frame), one per 12 / 6 / 3
// film frames (speed slow / normal / fast), and the ledger scrolls up once the window is full (at most 9 rows). Rows near the
// top of the window recede (mild dim; no transforms: scaled text layers rasterised non-deterministically) so the ledger reads as a roll receding into depth.
// `highlight {index}` (anchored to the word that names it) = the grep spotlight: appending stops (every line up to the hit is
// shown), the window eases so the hit sits in view, a level-tone band + left rule + chevron light it, a light sweep crosses the
// row, the panel rim / back glow / floor pool take the hit's tone, every other row dims to 30 %.
// Light (ADR-003 LK-F): key from the upper right (acrylic), back glow, floor pool, grid floor. DOM + SVG only (no filters,
// no CSS 3D), so lite = standard = hero code; no per-tier cost beyond the token glow radii.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex, halo} from '../../fx/look';
import {MixedText} from '../../type/Text';
import {isArabic, visLen} from '../../type/arabic';
import {latinFeatures} from '../../type/words';
import {ease, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Rect} from '../../type/safe';
import type {Props} from './schema';
import {Floor, Tag, acrylic, actsOf, emit, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

const LEVEL_TONE = {debug: C.ink3, info: C.signal, warn: C.warn, error: C.crit} as const;
const WASH = {debug: 0, info: 0, warn: 0.06, error: 0.12} as const; // standing row wash by level
const BLOOM = {debug: 0.06, info: 0.14, warn: 0.22, error: 0.32} as const; // arrival bloom by level
const STEP = {slow: 12, normal: 6, fast: 3} as const;
const VISIBLE = 9;
const PAD = 34;
const RAIL = 12;
const GAP = 20;

type Lay = {fs: number; lineH: number; vis: number; hdrH: number; padY: number; panelH: number; panelY: number; tagW: number};

/** Ledger geometry from the props and the slot box (shared by the view and textRect). One mono size for the whole ledger. */
const layout = (props: Props, box: Rect): Lay => {
  const n = props.lines.length;
  const maxText = Math.max(...props.lines.map((l) => visLen(l.text)));
  // tag column = 5 mono cells + 24; text width = box.w - 2 PAD - rail - 2 GAP - tag column - bar; mono advance ~0.6 em
  const fitFs = Math.floor((box.w - 2 * PAD - RAIL - 2 * GAP - 40) / (0.6 * maxText + 3.1));
  const fs = Math.max(SIZE.secondaryMin, Math.min(SIZE.body, fitFs));
  const lineH = Math.round(fs * 1.7);
  const hdrH = Math.round(SIZE.labelMin * 2);
  const padY = 22;
  const vis = Math.max(1, Math.min(VISIBLE, n, Math.floor((box.h * 0.84 - hdrH - 2 * padY) / lineH)));
  const panelH = hdrH + vis * lineH + 2 * padY;
  const panelY = Math.round(box.y + (box.h - panelH) / 2 - Math.min(40, box.h * 0.04));
  return {fs, lineH, vis, hdrH, padY, panelH, panelY, tagW: Math.round(fs * 0.62 * 5 + 24)};
};

export const LogScrollView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const n = props.lines.length;
  const step = ff(STEP[props.speed], ctx.fps);
  const {fs, lineH, vis, hdrH, padY, panelH, panelY, tagW} = layout(props, box);
  const hl = actsOf(ctx, 'highlight').filter((a) => a.at <= t).pop();
  const hlIdx = hl ? Math.min(n - 1, hl.props.index as number) : -1;
  const hlTone = hl ? LEVEL_TONE[props.lines[hlIdx].level] : C.signal;
  const bornOf = (i: number) => ctx.at + i * step;
  // appended lines: all born so far; a highlight freezes the feed but always shows its line
  let count = 0;
  for (let i = 0; i < n; i++) if (bornOf(i) <= t) count = i + 1;
  const frozenAt = (a: number) => Math.max(0, Math.min(n, Math.floor((a - ctx.at) / step) + 1));
  if (hl) count = Math.max(frozenAt(hl.at), hlIdx + 1);
  const scrollFor = (c: number) => Math.max(0, c - vis);
  let scroll = scrollFor(count);
  if (hl) {
    const before = scrollFor(frozenAt(hl.at));
    const want = Math.max(0, Math.min(Math.max(0, count - vis), hlIdx - Math.floor(vis / 2)));
    const target = hlIdx >= before && hlIdx < before + vis ? before : want;
    scroll = before + (target - before) * prog(ctx, hl.at, 'morph', ease.camera, true);
  } else if (count > vis) {
    scroll = scrollFor(count) - 1 + prog(ctx, bornOf(count - 1), 'label'); // the newest line rises into the bottom slot
  }
  const hq = hl ? prog(ctx, hl.at, 'arrive') : 0;
  const sweep = hl ? prog(ctx, hl.at, 'morph', ease.camera, true) : 1;
  const hf = hl ? flashAt(ctx, hl.at) : 0;
  const accent = mix(C.signal, hlTone, hq);
  const winH = vis * lineH;
  const winTop = hdrH + padY;
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * (t - ctx.at)) / ff(48, ctx.fps));
  const panelBot = panelY + panelH;
  const floorH = Math.min(240, Math.max(0, box.y + box.h - panelBot - 4));
  const railTop = winTop;
  const tickH = winH / n;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', ...layerStyle(ctx, false)}}>
      {/* back glow behind the panel and a floor pool under it, both in the spotlight tone */}
      <div style={{position: 'absolute', left: box.x - 80, top: panelY - 60, width: box.w + 160, height: panelH + 120, background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${accent}${hex(0.1 + 0.1 * hq + 0.06 * hf)} 0%, transparent 100%)`}} />
      {floorH > 40 ? <Floor w={box.w * 1.1} h={floorH} x={box.x - box.w * 0.05} y={panelBot + 6} opacity={0.55} /> : null}
      <div style={{position: 'absolute', left: box.x + box.w * 0.08, top: panelBot - 8, width: box.w * 0.84, height: Math.round(Math.min(90, panelH * 0.22)), background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${accent}${hex(0.2 + 0.18 * hq)} 0%, transparent 100%)`}} />
      {/* acrylic ledger plate: rim in the spotlight tone */}
      <div style={{position: 'absolute', left: box.x, top: panelY, width: box.w, height: panelH, boxSizing: 'border-box', overflow: 'hidden', ...acrylic(accent, ctx.fx, 0.16 + 0.5 * hq + 0.25 * hf + 0.2 * ctx.mod.glow, 20)}}>
        {/* header strip: live dot + tail -f, which becomes grep LEVEL when the spotlight lands */}
        <div dir="ltr" style={{position: 'absolute', left: PAD, top: 0, height: hdrH, display: 'flex', alignItems: 'center', gap: 16}}>
          <div style={{width: 14, height: 14, borderRadius: 7, flex: 'none', background: accent, boxShadow: emit(accent, ctx.fx, 0.35 + 0.45 * pulse), opacity: 0.55 + 0.45 * pulse}} />
          <div style={{display: 'grid'}}>
            <div style={{gridArea: '1 / 1', opacity: 1 - hq}}>
              <Tag id={`${ctx.id}:hd`} text="tail -f" color={C.signal} size={SIZE.secondaryMin + 4} fx={ctx.fx} on={0.4} />
            </div>
            {hl ? (
              <div style={{gridArea: '1 / 1', opacity: hq}}>
                <Tag id={`${ctx.id}:gr`} text={`grep ${props.lines[hlIdx].level.toUpperCase()}`} color={hlTone} size={SIZE.secondaryMin + 4} fx={ctx.fx} on={hq} />
              </div>
            ) : null}
          </div>
        </div>
        <div style={{position: 'absolute', left: PAD, right: PAD, top: hdrH - 2, height: 2, background: `linear-gradient(90deg, ${accent}${hex(0.5)}, ${C.grid}00)`, opacity: 0.6}} />
        {/* ledger window */}
        <div style={{position: 'absolute', left: PAD, right: PAD + RAIL + GAP, top: winTop, height: winH, overflow: 'hidden'}}>
          {props.lines.slice(0, count).map((ln, i) => {
            const y = (i - scroll) * lineH;
            if (y < -lineH || y > winH) return null;
            const born = bornOf(i);
            const rv = revealStyle(t - born, ctx.fps, 'label', 'ltr');
            const wp = revealStyle(t - born, ctx.fps, 'wipe', isArabic(ln.text) ? 'rtl' : 'ltr');
            const wipe = wp.p < 1 ? wp.style : undefined; // a settled row carries no clip-path (a full-extent clip rasterised non-deterministically)
            const isH = i === hlIdx;
            const tone = LEVEL_TONE[ln.level];
            const u = Math.max(0, Math.min(1, (y + lineH / 2) / winH)); // 0 = top of the window (far), 1 = bottom (near)
            const depth = isH ? 1 : 0.72 + 0.28 * Math.min(1, u * 3);
            const dim = hl ? (isH ? 1 : 1 - 0.7 * hq) : 1;
            const bloom = flashAt(ctx, born) * BLOOM[ln.level];
            const wash = WASH[ln.level] * (hl && !isH ? 1 - hq : 1);
            const bg = isH
              ? `linear-gradient(90deg, ${tone}${hex(0.3 * hq)}, ${tone}${hex(0.06 * hq)})`
              : wash + bloom > 0.004
                ? `linear-gradient(90deg, ${tone}${hex(Math.min(1, wash + bloom))}, ${tone}${hex(Math.min(1, (wash + bloom) * 0.2))})`
                : undefined;
            const sw = Math.max(0, Math.min(1, sweep));
            return (
              <div
                key={i}
                dir="ltr"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: y,
                  height: lineH,
                  display: 'flex',
                  alignItems: 'center',
                  gap: GAP,
                  paddingLeft: 18,
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  opacity: (rv.visible ? rv.p : 0) * depth * dim,
                  background: bg,
                  boxShadow: isH ? `inset 5px 0 0 ${tone}, inset 0 1px 0 ${tone}${hex(0.45 * hq)}, inset 0 -1px 0 ${tone}${hex(0.45 * hq)}` : `inset 4px 0 0 ${tone}${hex(ln.level === 'debug' ? 0.35 : 0.8)}`,
                }}
              >
                <bdi
                  dir="ltr"
                  data-dc-text={`${ctx.id}:lv${i}`}
                  style={{
                    width: tagW,
                    flex: 'none',
                    textAlign: 'center',
                    fontFamily: `'${FONT.mono.family}'`,
                    fontWeight: FONT.mono.weight,
                    fontSize: Math.round(fs * 0.82),
                    color: tone,
                    textShadow: halo,
                    letterSpacing: '0.02em',
                    fontFeatureSettings: latinFeatures(ln.level.toUpperCase()) ?? '"tnum" 1',
                  }}
                >
                  {ln.level.toUpperCase()}
                </bdi>
                <span style={{position: 'relative', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: fs, lineHeight: 1.3, color: isH ? C.ink : C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip', textShadow: halo, ...wipe}}>
                  {isArabic(ln.text) ? <MixedText id={`${ctx.id}:l${i}`} text={ln.text} size={fs} role="code" /> : <bdi dir="ltr" data-dc-text={`${ctx.id}:l${i}`}>{ln.text}</bdi>}
                </span>
                {isH && sw < 1 ? <div style={{position: 'absolute', top: 0, bottom: 0, left: `${(-12 + 112 * sw).toFixed(2)}%`, width: '12%', background: `linear-gradient(90deg, transparent, ${C.white}${hex(0.22 * (1 - sw * 0.5))}, transparent)`}} /> : null}
              </div>
            );
          })}
          {/* grep chevron on the hit row (decorative SVG) */}
          {hl && hq > 0.02
            ? (() => {
                const y = (hlIdx - scroll) * lineH;
                if (y < -lineH || y > winH) return null;
                return (
                  <svg width={22} height={28} viewBox="0 0 18 22" style={{position: 'absolute', left: 1, top: y + lineH / 2 - 14, opacity: hq, overflow: 'visible'}}>
                    <path d="M 3 2 L 15 11 L 3 20 Z" fill={hlTone} stroke={hlTone} strokeOpacity={0.35} strokeWidth={6} strokeLinejoin="round" />
                  </svg>
                );
              })()
            : null}
        </div>
        {/* severity rail: every line as a tick in its level tone, the viewport bracketed, the grep hit glowing */}
        <svg width={RAIL} height={winH} style={{position: 'absolute', right: PAD, top: railTop, overflow: 'visible'}}>
          <rect x={0} y={0} width={RAIL} height={winH} rx={RAIL / 2} fill={C.void} fillOpacity={0.5} />
          {props.lines.map((ln, i) => {
            const tone = LEVEL_TONE[ln.level];
            const on = i < count ? 1 : 0;
            const isH = i === hlIdx;
            const h = Math.max(3, tickH - 3);
            return <rect key={i} x={isH ? -3 : 2} y={i * tickH + (tickH - h) / 2} width={isH ? RAIL + 6 : RAIL - 4} height={isH ? h + 2 : h} rx={2} fill={on ? tone : C.ink3} fillOpacity={on ? (hl && !isH ? 0.5 : 0.9) : 0.22} />;
          })}
          <rect x={-3} y={Math.max(0, Math.min(n - vis, scroll)) * tickH} width={RAIL + 6} height={Math.min(vis, n) * tickH} rx={4} fill="none" stroke={accent} strokeOpacity={0.7} strokeWidth={2} />
        </svg>
      </div>
    </div>
  );
};

export const LogScroll: DcComponent<Props> = {
  name: 'LogScroll',
  Component: LogScrollView,
  text: true,
  slot: 'full',
  textRect: (props, box) => {
    const l = layout(props, box);
    return {x: box.x, y: l.panelY, w: box.w, h: l.panelH};
  },
};
