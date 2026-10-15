// CodeTrace (catalog: Code). A code block (<= 30 lines) on a glass plate with an execution cursor of light stepped on word anchors
// (04 section 6, Execution: "line highlight on each spoken step").
//  - the block is an LTR mono block (04 section 3.4) with a line-number gutter; <= 12 rows are visible (04 section 3.2), the window
//    follows the cursor when the block is longer (camera ease);
//  - cursor events = every `highlights[]` entry (`lines` [a, b] at its anchor, optional `note_ar`) plus every `step` action (one
//    line, anchored to the word that names it). The band travels from the previous lines to the new ones in morph timing; the lines
//    inside the band are bright, the rest dim (state change, never decoration); a signal edge bar + chevron mark the cursor;
//  - light (ADR-003 LK-F): key rim light from the upper right, an emissive pool under the plate, and a light head on the band edge
//    that leads the travel; a row of progress pips (one per cursor event) in the window chrome shows how far the trace has run;
//  - `note_ar` is one whole Arabic phrase in a reserved footer of the plate (label preset, RTL wipe), replaced on the next event;
//  - Arabic inside code (comments, strings) is set as whole-word RTL isolates by the type engine (kit.tsx); Latin is mono.
// All motion uses revealProgress: the first visible step lands ON the anchor frame (ADR-011 RV1).
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Rect} from '../../type/safe';
import {centred, Chrome, CodeRow, codeLayout, detab, tokenizeBlock} from '../_code-media/kit';
import type {Props} from './schema';

type Ctx = DcProps<Props>['ctx'];
export const MAX_LINES = 30;
/** Footer reserved for the Arabic note (only when some highlight carries one). */
const NOTE_H = Math.round(SIZE.body * 1.9);

export const traceLines = (code: string): string[] => {
  const l = detab(code).replace(/\r/g, '').split('\n');
  while (l.length > 1 && !l[l.length - 1].trim()) l.pop();
  return l.slice(0, MAX_LINES);
};

export type CursorEv = {t: number; a: number; b: number; note?: string; li: number}; // lines 1-based, inclusive
/** Cursor events sorted by time (ties keep spec order). Lines are clamped to the block. */
export const cursorEvents = (p: Props, ctx: Ctx, n: number): CursorEv[] => {
  const clamp = (x: number) => Math.min(n, Math.max(1, x));
  const evs: CursorEv[] = [];
  (p.highlights ?? []).forEach((h, i) => {
    const t = ctx.frameOf(h.at);
    if (t === undefined) return; // an unresolved anchor is reported by the compiler
    const a = clamp(Math.min(h.lines[0], h.lines[1]));
    const b = clamp(Math.max(h.lines[0], h.lines[1]));
    evs.push({t, a, b, note: h.note_ar, li: i});
  });
  for (const act of ctx.actions) if (act.name === 'step') evs.push({t: act.at, a: clamp(act.props.line as number), b: clamp(act.props.line as number), li: 1000 + act.li});
  return evs.sort((x, y) => x.t - y.t || x.li - y.li);
};

export const traceLayout = (p: Props, box: Rect) => {
  const lines = traceLines(p.code);
  const notes = (p.highlights ?? []).some((h) => h.note_ar);
  const gutterCols = String(lines.length).length;
  const L = codeLayout(lines, box.w, box.h - (notes ? NOTE_H : 0), gutterCols, 0);
  return {lines, notes, L};
};

export const CodeTraceView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const {lines, notes, L} = traceLayout(props, ctx.box);
  const toks = React.useMemo(() => tokenizeBlock(lines, props.lang), [lines.join('\n'), props.lang]);
  const fit = useAutoFit(ref, {id: ctx.id, size: L.size, min: SIZE.labelMin, maxW: ctx.box.w - 2 * L.pad - L.gutter, key: `${props.lang}|${lines.join('\n')}`});
  const fs = fit.size;
  const rowH = Math.round((L.rowH * fs) / L.size);
  const gutterW = Math.round((L.gutter * fs) / L.size);
  const t = ctx.frame;
  const evs = cursorEvents(props, ctx, lines.length);
  const allNotes = (props.highlights ?? []).flatMap((h, li) => (h.note_ar ? [{li, text: h.note_ar}] : []));
  const longest = allNotes.map((x) => x.text).join('|');
  const nfit = useAutoFit(noteRef, {id: `${ctx.id}:note`, size: SIZE.body, min: SIZE.labelMin, maxW: L.panelW - 2 * L.pad, key: longest});
  const panel = revealStyle(t - ctx.at, ctx.fps, 'label', 'ltr', ctx.until !== undefined ? t - ctx.until : undefined);

  // visual rows of every line
  const first: number[] = [];
  const last: number[] = [];
  L.rows.forEach((r, k) => {
    if (first[r.line] === undefined) first[r.line] = k;
    last[r.line] = k;
  });
  const nRows = L.rows.length;
  const vis = Math.min(L.visRows, nRows);
  // band of an event in (fractional) row units: [top, bottom)
  const band = (e: CursorEv | undefined): [number, number] | null => (e ? [first[e.a - 1], last[e.b - 1] + 1] : null);
  let k = -1;
  for (let j = 0; j < evs.length; j++) if (evs[j].t <= t) k = j;
  const cur = k >= 0 ? evs[k] : undefined;
  const prev = k > 0 ? evs[k - 1] : undefined;
  const q = cur ? revealProgress(t - cur.t, presetFrames('morph', ctx.fps), ease.camera) : 1;
  const bc = band(cur);
  const bp = band(prev) ?? bc;
  const top = bc && bp ? bp[0] + (bc[0] - bp[0]) * q : 0;
  const bot = bc && bp ? bp[1] + (bc[1] - bp[1]) * q : 0;
  // scroll window follows the band centre, clamped to the block, in whole rows (a settled window never cuts a row in half)
  const scrollOf = (b: [number, number] | null) => (b ? Math.min(Math.max(0, nRows - vis), Math.max(0, Math.round((b[0] + b[1]) / 2 - vis / 2))) : 0);
  const sc0 = scrollOf(bp);
  const scroll = bc ? sc0 + (scrollOf(bc) - sc0) * q : 0;
  // rows that run off the window while it travels fade out over 0.45 row instead of being cut by the hard edge (text-safe mask)
  const fadePx = rowH * 0.45;
  const fTop = fadePx * Math.min(1, scroll);
  const fBot = fadePx * Math.min(1, nRows - vis - scroll);
  const winH = vis * rowH;
  const edgeMask = fTop > 0.5 || fBot > 0.5 ? `linear-gradient(180deg, transparent 0px, #000 ${fTop.toFixed(1)}px, #000 ${(winH - fBot).toFixed(1)}px, transparent ${winH}px)` : undefined;
  // brightness of row r: the weight of being inside the current / previous band
  const inside = (b: [number, number] | null, r: number) => (b && r >= b[0] && r < b[1] ? 1 : 0);
  const weight = (r: number) => (cur ? inside(bp, r) * (1 - q) + inside(bc, r) * q : 1);
  // the note of the latest event that has one is shown from its anchor; a later event without a note clears it
  const noteEv = cur;
  const note = noteEv?.note;
  const nrev = noteEv ? revealStyle(t - noteEv.t, ctx.fps, 'label', 'rtl') : null;
  const pw = L.panelW;
  // light: the rim and the pool follow the plate's own arrive (the rim leads the wipe)
  const rim = revealProgress(t - ctx.at, presetFrames('label', ctx.fps));
  const gk = 0.5 + 0.5 * rim + ctx.mod.glow;
  const rimLight = `linear-gradient(to bottom left, ${C.signal}${hex(0.7 * rim)} 0%, ${C.signal}${hex(0.18 * rim)} 36%, ${C.grid}${hex(0.9)} 100%)`;
  const stock = `linear-gradient(180deg, ${C.panel}E6 0%, ${C.ground}D9 100%)`;
  const pips = Math.min(evs.length, 12);
  const pipD = Math.max(8, Math.round(fs * 0.26));
  // the light head leads the band edge in its direction of travel and fades as it lands
  const goingDown = bc && bp ? bc[0] >= bp[0] : true;
  const headY = (goingDown ? bot : top) * rowH;
  const headA = cur && prev ? (1 - q) * 0.9 + 0.1 : 0;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...panel.style}}>
      <div style={{position: 'relative', width: pw}}>
        <div aria-hidden style={{position: 'absolute', left: '-14%', right: '-14%', bottom: -Math.round(fs * 2.2), height: Math.round(fs * 4.6), background: `radial-gradient(ellipse at 50% 38%, ${C.signal}${hex(0.17 * rim * gk)} 0%, ${C.signal}${hex(0.05 * rim)} 46%, transparent 72%)`, pointerEvents: 'none'}} />
      <Glass style={{width: pw, overflow: 'hidden', position: 'relative', border: '1px solid transparent', background: `${stock} padding-box, ${rimLight} border-box`}}>
        <Chrome label={props.lang} size={fs} h={L.chromeH} />
        {pips > 1 ? (
          <div aria-hidden style={{position: 'absolute', left: 0, right: 0, top: 0, height: L.chromeH, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Math.round(pipD * 0.9)}}>
            {Array.from({length: pips}, (_, i) => {
              const on = i <= k;
              const born = on ? revealProgress(t - evs[i].t, presetFrames('label', ctx.fps)) : 0;
              return <div key={i} style={{width: pipD, height: pipD, borderRadius: '50%', background: on ? `${C.signal}${hex(0.35 + 0.65 * born)}` : `${C.ink3}${hex(0.35)}`, boxShadow: on && i === k ? `0 0 ${Math.round(ctx.fx.glowInner * 0.8)}px ${C.signal}${hex(0.8)}` : undefined}} />;
            })}
          </div>
        ) : null}
        <div style={{height: vis * rowH, margin: `${L.pad}px 0`, overflow: 'hidden', position: 'relative', ...(edgeMask ? {WebkitMaskImage: edgeMask, maskImage: edgeMask} : {})}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${(-scroll * rowH).toFixed(2)}px)`}}>
            {bc ? (
              <>
                {/* the band: a wash, a 4 px edge bar and two hairlines as background layers (never an inset shadow: it flakes the
                    determinism of the 50 % still) + an outer light spill */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: top * rowH,
                    height: Math.max(0, (bot - top) * rowH),
                    backgroundImage: `linear-gradient(90deg, ${C.signal} 0 4px, transparent 4px), linear-gradient(180deg, ${C.signal}${hex(0.55)} 0 1px, transparent 1px), linear-gradient(0deg, ${C.signal}${hex(0.35)} 0 1px, transparent 1px), linear-gradient(90deg, ${C.signal}${hex(0.28)}, ${C.signal}${hex(0.08)})`,
                    boxShadow: `0 0 ${Math.round(ctx.fx.glowInner * 1.6)}px ${C.signal}${hex(0.3 * gk)}`,
                    opacity: Math.min(1, 0.4 + 0.6 * revealProgress(t - cur!.t, presetFrames('label', ctx.fps))),
                  }}
                />
                {headA > 0.02 ? <div aria-hidden style={{position: 'absolute', left: 0, right: 0, top: headY - 2, height: 4, background: `linear-gradient(90deg, ${C.signal}, ${C.signal}${hex(0.1)})`, boxShadow: `0 0 ${ctx.fx.glowInner}px ${C.signal}, 0 0 ${Math.round(ctx.fx.glowPx * 0.5)}px ${C.signal}80`, opacity: headA}} /> : null}
              </>
            ) : null}
            <div style={{position: 'relative', display: 'flex'}}>
              <div dir="ltr" style={{width: gutterW, paddingRight: Math.round(fs * 0.6), textAlign: 'right', flex: 'none', color: C.ink3, fontSize: fs, lineHeight: `${rowH}px`, fontFamily: `'${FONT.mono.family}'`, fontFeatureSettings: '"tnum" 1'}}>
                {L.rows.map((r, i) => (
                  <div key={i} style={{height: rowH, opacity: 0.45 + 0.55 * weight(i), color: weight(i) > 0.5 && cur ? C.signal : C.ink3}}>
                    {first[r.line] === i ? <bdi dir="ltr" data-dc-text={`${ctx.id}:n${r.line}`}>{r.line + 1}</bdi> : null}
                  </div>
                ))}
              </div>
              <div ref={ref} dir="ltr" data-overflow={fit.overflow ? 1 : undefined} style={{width: 'max-content', fontSize: fs, lineHeight: `${rowH}px`, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}>
                {L.rows.map((r, i) => (
                  <div key={i} style={{height: rowH, whiteSpace: 'pre', opacity: 0.5 + 0.5 * weight(i)}}>
                    <CodeRow id={`${ctx.id}:r${i}`} toks={toks[r.line]} s={r.s} e={r.e} size={fs} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {notes ? (
          <div dir="rtl" style={{position: 'relative', height: NOTE_H, borderTop: `1px solid ${C.grid}`, padding: `0 ${L.pad}px`, display: 'flex', alignItems: 'center', justifyContent: 'flex-start'}}>
            {/* every note sits in one grid cell: the cell is as wide as the longest note, so one useAutoFit fits them all (M8 settle);
                only the current note is visible, the others keep their layout (visibility: hidden) */}
            <div ref={noteRef} data-overflow={nfit.overflow ? 1 : undefined} style={{display: 'grid', width: 'max-content', whiteSpace: 'nowrap', fontSize: nfit.size, color: C.ink, outline: nfit.overflow ? `2px dashed ${C.crit}` : undefined}}>
              {allNotes.map(({li, text}) => {
                const on = !!noteEv && noteEv.li === li && !!note;
                return (
                  <div key={li} style={{gridArea: '1 / 1', ...(on && nrev ? nrev.style : {visibility: 'hidden'})}}>
                    <MixedText id={`${ctx.id}:note${li}`} text={text} size={nfit.size} weight={FONT.label.strong} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Glass>
      </div>
    </div>
  );
};

export const CodeTrace: DcComponent<Props> = {
  name: 'CodeTrace',
  Component: CodeTraceView,
  text: true,
  slot: 'center',
  textRect: (p, box) => {
    const {L, notes} = traceLayout(p, box);
    return centred(box, L.panelW, L.panelH + (notes ? NOTE_H : 0));
  },
};
