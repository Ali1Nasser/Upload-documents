// AppliedSteps (catalog: Domain specials; 04 section 6 "Applied steps & dirty data": the step list as a film strip, each
// step transforms the table; glitchy cells clean up step by step). Two glass plates:
//   - the STRIP: the Power Query applied-steps list as a strip of film frames (sprocket rails that advance with the
//     selection). Each frame = a glyph per `kind` (trim, case, type, dedupe, filter, group, sort, join, step), the
//     whole-word step label (RTL for Arabic) and the Latin kind chip (one LTR isolate);
//   - the TABLE: a miniature of the table at the selected step. It starts dirty (warn cells that are ragged and out of
//     line, a duplicated row and a stray row tinted crit) and each step cleans what it owns: a column step straightens
//     one column, a dedupe / filter step collapses its rows. A projector beam links the lit frame to the table.
// `select {index}` (anchored to the word that names the step): the lit window travels to that frame (camera ease, RV1
// onset on the anchor frame) and the table cleans in lock step with it, so the table always shows the data "as of"
// the selected step. Steps up to the selection read as applied (glyph ok), later steps dim. Without a `select` action the
// strip shows the finished pipeline (all applied, table clean). Narrow slots (< 1.4 : 1) drop the table and keep the strip.
// No numbers are drawn here: row counts are spoken and shown by NumberCounter with their refs (d:6.1:2, d:6.2:1).
// DOM + SVG only (no WebGL): every FX tier renders it; the tier changes only the glow radii (tokens).
import React, {useRef} from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic, lineHeightFor} from '../../type/arabic';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, Stage, Svg, actsOf, clamp01, glowBox, lerp, prog, progN, rim, stag} from '../_dom-b/kit';

type Kind = 'trim' | 'case' | 'type' | 'dedupe' | 'filter' | 'group' | 'sort' | 'join' | 'step';
/** Free-form `kind` text to a glyph family (never throws; unknown kinds use the generic step arrow). */
export const kindOf = (k?: string): Kind => {
  const s = (k ?? '').toLowerCase();
  if (/trim|space|strip|clean/.test(s)) return 'trim';
  if (/proper|case|upper|lower|title/.test(s)) return 'case';
  if (/type|cast|convert|parse/.test(s)) return 'type';
  if (/dedup|distinct|unique/.test(s)) return 'dedupe';
  if (/filter|where|keep|remove|drop|null|skip/.test(s)) return 'filter';
  if (/group|agg|sum|summar|count/.test(s)) return 'group';
  if (/sort|order|rank/.test(s)) return 'sort';
  if (/join|merge|append|lookup/.test(s)) return 'join';
  return 'step';
};
const removes = (k: Kind) => k === 'dedupe' || k === 'filter';

const Glyph: React.FC<{kind: Kind; size: number; color: string}> = ({kind, size, color}) => {
  const p = {fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{flex: 'none', overflow: 'visible'}}>
      {kind === 'trim' ? <path d="M3 12 H8 M21 12 H16 M8 6 V18 M16 6 V18" {...p} /> : null}
      {kind === 'case' ? (
        <g {...p}>
          <path d="M2.5 18 L7.5 6 L12.5 18 M4.5 14 H10.5" />
          <circle cx={18} cy={15} r={3} />
          <path d="M21 12 V18" />
        </g>
      ) : null}
      {kind === 'type' ? <path d="M4 8 H19 L16 5 M20 16 H5 L8 19" {...p} /> : null}
      {kind === 'dedupe' ? (
        <g {...p}>
          <rect x={3} y={4} width={13} height={8} rx={2} />
          <rect x={8} y={12} width={13} height={8} rx={2} />
        </g>
      ) : null}
      {kind === 'filter' ? <path d="M3 5 H21 L14 13 V19 L10 21 V13 Z" {...p} /> : null}
      {kind === 'group' ? <path d="M18 5 H6 L12 12 L6 19 H18" {...p} /> : null}
      {kind === 'sort' ? <path d="M7 4 V20 L4 17 M7 20 L10 17 M17 20 V4 L14 7 M17 4 L20 7" {...p} /> : null}
      {kind === 'join' ? (
        <g {...p}>
          <circle cx={9} cy={12} r={6} />
          <circle cx={15} cy={12} r={6} />
        </g>
      ) : null}
      {kind === 'step' ? <path d="M4 12 H19 M13 6 L19 12 L13 18" {...p} /> : null}
    </svg>
  );
};

const h2 = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** Token colour blend a -> b at q (both from the palette). */
const mix = (a: string, b: string, q: number, alpha = 1) => {
  const [r1, g1, b1] = h2(a);
  const [r2, g2, b2] = h2(b);
  return `rgba(${Math.round(lerp(r1, r2, q))},${Math.round(lerp(g1, g2, q))},${Math.round(lerp(b1, b2, q))},${alpha})`;
};

const COLS = 5;
const PAD_Y = 24;
const HEAD_H = 48;

export const AppliedStepsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const n = props.steps.length;
  const rtl = props.steps.some((s) => isArabic(s.label));
  const wide = box.w >= 1000 && box.w / box.h >= 1.4;
  const stripW = wide ? Math.round(box.w * 0.54) : box.w;
  const gap = wide ? Math.round(box.w * 0.1) : 0;
  const prevW = wide ? box.w - stripW - gap : 0;
  const size = n <= 5 ? SIZE.sub : n <= 8 ? SIZE.body : SIZE.label;
  const k = n <= 7 ? 1.9 : n <= 9 ? 1.65 : 1.45; // row pitch / font size (proportional, so the fit is exact)
  const rail = 52;
  const padX = 22;
  const key = props.steps.map((s) => `${s.kind ?? ''}:${s.label}`).join('|');
  const fit = useAutoFit(ref, {id: ctx.id, size, min: SIZE.labelMin, maxW: stripW - 2 * padX - 2 * rail - 8, maxH: box.h - 2 * PAD_Y - HEAD_H - 8, key});
  const fs = fit.size;
  const rowH = fs * k;
  const listH = n * rowH;
  const plateH = Math.min(box.h, listH + 2 * PAD_Y + HEAD_H + 8);
  const top = (box.h - plateH) / 2;
  const kinds = props.steps.map((s) => kindOf(s.kind));

  // ---------- selection timeline ----------
  const sels = actsOf(ctx, 'select');
  const morph = presetFrames('morph', fps, true);
  let selY = sels.length ? -1 : n - 1; // -1 = before the first step (the source table)
  let selQ = 0;
  let prevIdx = -1;
  for (const a of sels) {
    if (t < a.at) break;
    const idx = Math.min(n - 1, a.props.index as number);
    selY = lerp(prevIdx, idx, progN(ctx, a.at, morph, ease.camera));
    selQ = prevIdx < 0 ? prog(ctx, a.at, 'label') : 1;
    prevIdx = idx;
  }
  const started = sels.length > 0 && selQ > 0;
  const stepQ = (i: number) => (sels.length === 0 ? 1 : clamp01(selY - i + 1)); // how far step i has cleaned the table
  const near = (i: number) => clamp01(1 - Math.abs(selY - i));
  const nearest = Math.round(clamp01((selY + 0.0001) / Math.max(1, n - 1)) * (n - 1));

  // ---------- the table miniature ----------
  const innerPad = 22;
  const tblW = prevW - 2 * innerPad;
  const tblTop = PAD_Y + HEAD_H;
  const tblH = plateH - tblTop - PAD_Y;
  const R = Math.max(4, Math.min(8, Math.floor(tblH / 40)));
  const colW = tblW / COLS;
  const hdrH = Math.min(36, tblH * 0.12);
  const rh = (tblH - hdrH) / R;
  // owners: a column step owns one column; a removal step owns up to two rows (a dedupe row is a copy of its neighbour)
  const colOwner = new Map<number, number>();
  const rowOwner = new Map<number, number>();
  let ci = 0;
  kinds.forEach((kd, i) => {
    if (removes(kd)) {
      for (let j = 0; j < (kd === 'dedupe' ? 1 : 2); j++) {
        let r = 1 + Math.floor(random(`as:rm:${i}:${j}`) * (R - 1));
        for (let g = 0; g < R && rowOwner.has(r); g++) r = 1 + (r % (R - 1));
        if (!rowOwner.has(r)) rowOwner.set(r, i);
      }
    } else {
      colOwner.set(ci % COLS, i);
      ci++;
    }
  });
  const rowF: number[] = []; // height factor per row (collapses when its step is applied)
  for (let r = 0; r < R; r++) {
    const o = rowOwner.get(r);
    rowF.push(o === undefined ? 1 : 1 - ease.camera(stepQ(o)));
  }
  const rowY: number[] = [];
  let acc = hdrH;
  for (let r = 0; r < R; r++) {
    rowY.push(acc);
    acc += rh * rowF[r];
  }
  const allQ = sels.length === 0 ? 1 : Math.min(...props.steps.map((_, i) => stepQ(i)));
  const cleanTone = clamp01((allQ - 0.0) * 1) * (started || sels.length === 0 ? 1 : 0);
  const pvKind = !started ? 'SOURCE' : props.steps[nearest].kind ?? 'STEP';
  const cell = (c: number, r: number, rowSrc: number) => {
    const w = 0.42 + 0.46 * random(`as:w:${c}:${rowSrc}`);
    const dirty = random(`as:d:${c}:${r}`) < 0.78;
    const jit = (random(`as:j:${c}:${r}`) - 0.5) * 16;
    return {w, dirty, jit};
  };

  const rows = props.steps.map((s, i) => {
    const ent = prog(ctx, ctx.at + stag(i, fps, 3), 'label');
    const q = started ? stepQ(i) : 0;
    const w = started ? near(i) : 0;
    return {s, i, ent, q, w};
  });

  // ---------- geometry of the two plates (box-local) ----------
  const stripX = rtl ? box.w - stripW : 0;
  const prevX = rtl ? 0 : box.w - prevW;
  const barTop = top + 1 + PAD_Y + HEAD_H + 4 + selY * rowH; // list container starts at +4 (the fit wrapper is nudged by 4)
  const edgeS = rtl ? stripX : stripX + stripW; // strip edge facing the table
  const edgeP = rtl ? prevX + prevW : prevX; // table edge facing the strip
  const dirSign = rtl ? -1 : 1;
  const keyShadow = `${rim(0.22)}, -12px 20px 46px ${C.void}${hex(0.75)}`;

  return (
    <Stage ctx={ctx}>
      {/* projector beam from the lit frame to the table (behind both plates) */}
      {wide && started ? (
        <Svg w={box.w} h={box.h}>
          <defs>
            <linearGradient id={`${ctx.id}-beam`} gradientUnits="userSpaceOnUse" x1={edgeS} y1={0} x2={edgeP} y2={0}>
              <stop offset="0" stopColor={C.signal} stopOpacity={0.34} />
              <stop offset="1" stopColor={C.signal} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <polygon
            points={`${edgeS + dirSign * 6},${barTop + 6} ${edgeS + dirSign * 6},${barTop + rowH - 6} ${edgeP - dirSign * 6},${top + plateH - 10} ${edgeP - dirSign * 6},${top + 10}`}
            fill={`url(#${ctx.id}-beam)`}
            opacity={selQ}
          />
          <line x1={edgeS} y1={barTop + rowH / 2} x2={edgeP} y2={top + plateH / 2} stroke={C.signal} strokeOpacity={0.5 * selQ} strokeWidth={1.5} />
        </Svg>
      ) : null}

      {/* ---------- the strip ---------- */}
      <Glass style={{position: 'absolute', left: stripX, top, width: stripW, height: plateH, boxSizing: 'border-box', padding: `${PAD_Y}px ${padX + rail}px`, boxShadow: keyShadow}}>
        {[0, 1].map((side) => {
          const pitch = rowH / 2;
          const holes = Math.ceil(plateH / pitch) + 2;
          const off = (((selY + 1) * rowH) % pitch) + 0;
          return (
            <div key={side} style={{position: 'absolute', top: 0, bottom: 0, [side ? 'right' : 'left']: 0, width: rail + padX * 0.5, overflow: 'hidden', background: `linear-gradient(${side ? 270 : 90}deg, ${C.void}${hex(0.55)}, ${C.void}${hex(0)})`, borderRight: side ? undefined : `1px solid ${C.grid}`, borderLeft: side ? `1px solid ${C.grid}` : undefined, borderRadius: side ? '0 18px 18px 0' : '18px 0 0 18px'}}>
              {Array.from({length: holes}, (_, h) => (
                <div key={h} style={{position: 'absolute', left: (rail * 0.5 + padX * 0.5) / 2 - 8, top: h * pitch - off - pitch, width: 16, height: Math.min(22, pitch * 0.55), borderRadius: 4, background: C.void, boxShadow: `inset 0 1px 2px ${C.void}, 0 1px 0 ${C.ink}${hex(0.1)}`, border: `1px solid ${C.grid}`}} />
              ))}
            </div>
          );
        })}
        <div dir={rtl ? 'rtl' : 'ltr'} style={{height: HEAD_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <Chip id={`${ctx.id}:head`} text="APPLIED STEPS" color={C.signal} size={SIZE.labelMin} />
        </div>
        <div style={{position: 'relative', marginTop: 4}}>
          {started ? (
            <div
              style={{
                position: 'absolute',
                left: -8,
                right: -8,
                top: selY * rowH,
                height: rowH,
                borderRadius: 12,
                opacity: selQ,
                background: `linear-gradient(${rtl ? 270 : 90}deg, ${C.signal}${hex(0.28)}, ${C.signal}${hex(0.1)})`,
                border: `1px solid ${C.signal}${hex(0.8)}`,
                boxShadow: `${glowBox(C.signal, fx, 0.55 + ctx.mod.glow)}, ${rim(0.3)}, inset ${rtl ? '' : '-'}5px 0 0 ${C.signal}`,
              }}
            />
          ) : null}
          <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flex', flexDirection: 'column', width: 'max-content', fontSize: fs, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined, position: 'relative'}}>
            {rows.map(({s, i, ent, q, w}) => {
              const glyphColor = !started ? C.ink2 : w > 0.5 ? C.signal : q >= 1 ? C.ok : mix(C.ink3, C.ok, q);
              const txt = !started || q > 0.5 || w > 0.5 ? C.ink : C.ink3;
              return (
                <div
                  key={i}
                  style={{
                    height: rowH,
                    boxSizing: 'border-box',
                    alignSelf: 'stretch',
                    display: 'flex',
                    alignItems: 'center',
                    gap: fs * 0.5,
                    padding: `0 ${fs * 0.45}px`,
                    opacity: ent * (started ? lerp(0.5, 1, Math.max(q, w)) : 1),
                    transform: `translateY(${((1 - ent) * 6).toFixed(2)}px)`,
                    borderBottom: i < n - 1 ? `1px dashed ${C.grid}` : undefined,
                  }}
                >
                  <div style={{flex: 'none', width: fs * 1.1, height: fs * 1.1, borderRadius: fs * 0.28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.void}${hex(0.6)}`, border: `1px solid ${w > 0.5 ? `${C.signal}${hex(0.7)}` : C.grid}`, boxShadow: rim(0.12)}}>
                    <Glyph kind={kinds[i]} size={fs * 0.72} color={glyphColor} />
                  </div>
                  <div style={{whiteSpace: 'nowrap', flex: 1, lineHeight: lineHeightFor(s.label), color: txt, textShadow: halo}}>
                    <MixedText id={`${ctx.id}:s${i}`} text={s.label} size={fs} weight={w > 0.5 ? FONT.label.strong : FONT.label.weight} />
                  </div>
                  {s.kind ? <Chip id={`${ctx.id}:k${i}`} text={s.kind} color={w > 0.5 ? C.signal : C.ink2} size={fs * 0.72} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </Glass>

      {/* ---------- the table at the selected step ---------- */}
      {wide ? (
        <Glass
          style={{
            position: 'absolute',
            left: prevX,
            top,
            width: prevW,
            height: plateH,
            boxSizing: 'border-box',
            overflow: 'hidden',
            opacity: prog(ctx, ctx.at + stag(2, fps, 3), 'label'),
            boxShadow: `${rim(0.22)}, -12px 20px 46px ${C.void}${hex(0.75)}${cleanTone > 0.01 ? `, 0 0 ${(fx.glowPx * 0.7).toFixed(1)}px ${C.ok}${hex(0.3 * cleanTone)}` : ''}`,
            borderColor: cleanTone > 0.01 ? mix(C.grid, C.ok, 0.6 * cleanTone) : undefined,
          }}
        >
          <div dir="ltr" style={{position: 'absolute', left: innerPad, right: innerPad, top: PAD_Y, height: HEAD_H, display: 'flex', alignItems: 'center', justifyContent: rtl ? 'flex-end' : 'flex-start'}}>
            <Chip id={`${ctx.id}:pv`} text={pvKind} color={cleanTone > 0.5 ? C.ok : started ? C.signal : C.warn} size={SIZE.labelMin} />
          </div>
          <div dir="ltr" style={{position: 'absolute', left: innerPad, top: tblTop, width: tblW, height: tblH}}>
            {/* column step highlights */}
            {Array.from(colOwner.entries()).map(([c, i]) => {
              const a = started ? near(i) : 0;
              if (a <= 0.01) return null;
              const x = (rtl ? COLS - 1 - c : c) * colW;
              return <div key={`h${c}`} style={{position: 'absolute', left: x + 3, top: 0, width: colW - 6, height: Math.max(hdrH, acc), borderRadius: 8, background: `${C.signal}${hex(0.1 * a)}`, border: `1px solid ${C.signal}${hex(0.55 * a)}`}} />;
            })}
            {/* header cells */}
            {Array.from({length: COLS}, (_, c) => (
              <div key={`hd${c}`} style={{position: 'absolute', left: (rtl ? COLS - 1 - c : c) * colW + 8, top: hdrH * 0.3, width: colW - 16, height: hdrH * 0.4, borderRadius: 4, background: `${C.ink}${hex(0.5)}`, boxShadow: `0 1px 0 ${C.ink}${hex(0.15)}`}} />
            ))}
            <div style={{position: 'absolute', left: 0, right: 0, top: hdrH - 1, height: 1, background: C.grid}} />
            {/* rows */}
            {Array.from({length: R}, (_, r) => {
              const o = rowOwner.get(r);
              const f = rowF[r];
              if (f <= 0.02) return null;
              const q = o === undefined ? 1 : stepQ(o);
              const dup = o !== undefined && kinds[o] === 'dedupe';
              const src = dup ? Math.max(0, r - 1) : r;
              const stray = o !== undefined;
              const shown = started ? 1 : 1;
              return (
                <div key={`r${r}`} style={{position: 'absolute', left: 0, width: tblW, top: rowY[r], height: rh * f, overflow: 'hidden', opacity: shown * (stray ? 1 - 0.5 * q : 1)}}>
                  {stray ? <div style={{position: 'absolute', inset: '2px 0', borderRadius: 6, background: `${C.crit}${hex(0.16 * (1 - q))}`, borderLeft: `3px solid ${C.crit}${hex(0.9 * (1 - q))}`}} /> : null}
                  {Array.from({length: COLS}, (_, c) => {
                    const cd = cell(c, r, src);
                    const co = colOwner.get(c);
                    const cq = co === undefined ? 1 : stepQ(co);
                    // a cell in a column owned by a step is dirty until that step has cleaned the column
                    const d = (co !== undefined && cd.dirty ? 1 - cq : 0) + (stray ? 1 - q : 0);
                    const dd = clamp01(d);
                    const bh = Math.min(rh * 0.3, 16);
                    const bw = (colW - 24) * lerp(cd.w, Math.min(0.84, cd.w), 1 - dd) * lerp(1, 1.18, dd * (co !== undefined ? 1 : 0));
                    const x = (rtl ? COLS - 1 - c : c) * colW + 12 + cd.jit * dd * (co !== undefined ? 1 : 0);
                    const col = stray ? mix(C.ink2, C.crit, dd, 0.9) : mix(C.ink2, C.warn, dd, lerp(0.55, 0.95, dd));
                    return <div key={c} style={{position: 'absolute', left: x, top: (rh * f - bh) / 2, width: bw, height: bh, borderRadius: bh / 2, background: col, boxShadow: dd > 0.2 ? `0 0 ${(fx.glowInner * 0.6).toFixed(1)}px ${stray ? C.crit : C.warn}${hex(0.4 * dd)}` : undefined}} />;
                  })}
                  <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: `${C.grid}${hex(0.8)}`}} />
                </div>
              );
            })}
          </div>
        </Glass>
      ) : null}
    </Stage>
  );
};

const textRect = (p: Props, box: {x: number; y: number; w: number; h: number}) => {
  const rtl = p.steps.some((s) => isArabic(s.label));
  const w = box.w >= 1000 && box.w / box.h >= 1.4 ? Math.round(box.w * 0.54) : box.w;
  return {x: rtl ? box.x + box.w - w : box.x, y: box.y, w, h: box.h};
};

export const AppliedSteps: DcComponent<Props> = {name: 'AppliedSteps', Component: AppliedStepsView, text: true, slot: 'center', textRect};
