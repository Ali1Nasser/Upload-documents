// LogScroll (catalog: Domain specials). 04 §6 "Linux ops": logs as a scrolling ledger with a grep spotlight. A glass ledger
// panel; each line = a level tag (debug ink3, info signal, warn warn, error crit) + the line text in a mono LTR isolate
// (Latin / code copy; an Arabic run inside a line still goes through MixedText, whole words). Lines are appended at the
// bottom from the layer anchor (RV1: the first line has ink on the anchor frame), one per 12 / 6 / 3 f@24 (speed slow /
// normal / fast), and the ledger scrolls up once the window is full (at most 9 lines visible).
// `highlight {index}` (anchored to the word that names it) -> the grep spotlight: appending stops (every line up to the
// highlighted one is shown), the window eases so that line sits in view, a signal band + left rule light it in its level
// tone and the other lines dim to 35 %. DOM only; same code at every tier.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {halo, hex} from '../../fx/look';
import {MixedText} from '../../type/Text';
import {isArabic, visLen} from '../../type/arabic';
import {latinFeatures} from '../../type/words';
import {ease} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {actsOf, ff, layerStyle, prog} from '../_dom-a/kit';

const LEVEL_TONE = {debug: C.ink3, info: C.signal, warn: C.warn, error: C.crit} as const;
const STEP = {slow: 12, normal: 6, fast: 3} as const;
const VISIBLE = 9;

export const LogScrollView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const n = props.lines.length;
  const step = ff(STEP[props.speed], ctx.fps);
  const hl = actsOf(ctx, 'highlight').filter((a) => a.at <= t).pop();
  const hlIdx = hl ? Math.min(n - 1, hl.props.index as number) : -1;
  const bornOf = (i: number) => ctx.at + i * step;
  // appended lines: all born so far; a highlight freezes the feed but always shows its line
  let count = 0;
  for (let i = 0; i < n; i++) if (bornOf(i) <= t) count = i + 1;
  if (hl) {
    const frozen = Math.max(0, Math.min(n, Math.floor((hl.at - ctx.at) / step) + 1));
    count = Math.max(frozen, hlIdx + 1);
  }
  const pad = 30;
  // one size for the whole ledger: the longest line fits the panel (mono advance ~0.6 em) between the 18 px non-spoken floor
  // and the 32 px label size; a line still longer at the floor is clipped at the panel edge like a terminal (never wrapped)
  const maxLen = Math.max(...props.lines.map((l) => visLen(l.text) + 7));
  const fs = Math.max(SIZE.secondaryMin, Math.min(SIZE.label, Math.floor((box.w - 2 * pad - 20) / (0.6 * maxLen))));
  const lineH = Math.round(fs * 1.75);
  const vis = Math.min(VISIBLE, n, Math.floor((box.h - 2 * pad) / lineH));
  const panelH = vis * lineH + 2 * pad;
  // scroll target: keep the newest line at the bottom; a highlight centres its line when it would be outside the window
  const scrollFor = (c: number) => Math.max(0, c - vis);
  let scroll = scrollFor(count);
  if (hl) {
    const before = scrollFor(Math.max(0, Math.min(n, Math.floor((hl.at - ctx.at) / step) + 1)));
    const want = Math.max(0, Math.min(Math.max(0, count - vis), hlIdx - Math.floor(vis / 2)));
    const target = hlIdx >= before && hlIdx < before + vis ? before : want;
    scroll = before + (target - before) * prog(ctx, hl.at, 'morph', ease.camera, true);
  } else {
    // smooth step for each appended line (the newest line rises into the bottom slot)
    const last = bornOf(count - 1);
    if (count > vis) scroll = scrollFor(count) - 1 + prog(ctx, last, 'label');
  }
  const hq = hl ? prog(ctx, hl.at, 'arrive') : 0;
  const tagW = Math.round(fs * 0.62 * 5 + 24);
  return (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...layerStyle(ctx, false)}}>
      <Glass style={{position: 'relative', width: box.w, height: panelH, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: pad, right: pad, top: pad, height: vis * lineH, overflow: 'hidden'}}>
          {props.lines.slice(0, count).map((ln, i) => {
            const y = (i - scroll) * lineH;
            if (y < -lineH || y > vis * lineH) return null;
            const ent = prog(ctx, bornOf(i), 'label');
            const isH = i === hlIdx;
            const tone = LEVEL_TONE[ln.level];
            const dim = hl ? (isH ? 1 : 1 - 0.65 * hq) : 1;
            return (
              <div key={i} dir="ltr" style={{position: 'absolute', left: 0, right: 0, top: y, height: lineH, display: 'flex', alignItems: 'center', gap: 20, opacity: (hl ? Math.max(ent, hq) : ent) * dim, background: isH ? `linear-gradient(90deg, ${tone}${hex(0.28 * hq)}, ${tone}${hex(0.06 * hq)})` : undefined, boxShadow: isH ? `inset 4px 0 0 ${tone}` : undefined, borderRadius: 6}}>
                <bdi dir="ltr" data-dc-text={`${ctx.id}:lv${i}`} style={{width: tagW, flex: 'none', textAlign: 'center', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: fs, color: tone, textShadow: halo, letterSpacing: '0.02em', fontFeatureSettings: latinFeatures(ln.level.toUpperCase()) ?? '"tnum" 1'}}>
                  {ln.level.toUpperCase()}
                </bdi>
                <span style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: fs, color: isH ? C.ink : C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip', textShadow: halo}}>
                  {isArabic(ln.text) ? <MixedText id={`${ctx.id}:l${i}`} text={ln.text} size={fs} role="code" /> : <bdi dir="ltr" data-dc-text={`${ctx.id}:l${i}`}>{ln.text}</bdi>}
                </span>
              </div>
            );
          })}
        </div>
      </Glass>
    </div>
  );
};

export const LogScroll: DcComponent<Props> = {name: 'LogScroll', Component: LogScrollView, text: true, slot: 'full'};
