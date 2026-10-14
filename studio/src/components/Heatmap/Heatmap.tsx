// Heatmap (catalog: Data; 04 section 6 "NLP, attention": heatmap matrix; "Reconciliation": mismatch classes). A labelled matrix on a
// glass plate. `sequential`: ground -> signal by value; `diverging`: ember <- panel -> signal around zero (symmetric range). Cell
// colours are mixes of two tokens only. Column labels along the top, row labels at the reading start (right in Arabic, and then
// the first column is on the right too). Missing cells (a short row) are hollow dashed ghosts, never zeros. The matrix sweeps in
// along its diagonal (label preset per cell, <= 16 film frames in total) from the layer anchor. Values are printed in the cells
// (mono tabular, source decimals) when they fit at the 28 px floor, else only on the highlighted cell. `highlightCell` (state
// change on its word) outlines one cell (ember), lights its row and column bands and the two labels, and shows a value chip.
// The single `ref` of the frozen schema covers every value; no derived number is shown.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, FONT, GAP, LABEL_MIN, Lbl, NumText, Plate, SIZE, Shell, flashAt, fmt, lastAct, mix, monoW, probeLabels, prog, rtlOf, srcDecimals, tint, useFitProbe, revealProgress, presetFrames} from '../_data/kit';

export const HeatmapView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const nx = props.x.length;
  const ny = props.y.length;
  const rtl = rtlOf(...props.x, ...props.y);
  const flat = props.values.flat();
  const dec = Math.max(0, ...flat.map(srcDecimals));
  const vmin = Math.min(...flat, 0);
  const vmax = Math.max(...flat, 1e-9);
  const sym = Math.max(Math.abs(vmin), Math.abs(vmax), 1e-9);
  const norm = (v: number): number => (props.scale === 'diverging' ? v / sym : (v - Math.min(...flat)) / Math.max(1e-9, vmax - Math.min(...flat)));
  const colorOf = (v: number): string => {
    const k = norm(v);
    if (props.scale === 'diverging') return k >= 0 ? mix(C.panel, C.signal, k) : mix(C.panel, C.ember, -k);
    return mix(C.grid, C.signal, k);
  };
  const brightness = (v: number): number => (props.scale === 'diverging' ? Math.abs(norm(v)) : norm(v));
  const pad = 30;
  const hl = lastAct(ctx, 'highlightCell');
  const hx = hl ? Math.min(nx - 1, hl.props.x as number) : -1;
  const hy = hl ? Math.min(ny - 1, hl.props.y as number) : -1;
  const hq = hl ? revealProgress(t - hl.at, presetFrames('impact', ctx.fps, true)) : 0;
  const fl = flashAt(ctx, hl ? hl.at : null);

  // ---- fits ----
  const fY = useFitProbe(`${ctx.id}:y`, SIZE.label, W * 0.24, (fs) => probeLabels(props.y, fs), props.y.join('|'), {maxH: H * 0.8});
  const yW = Math.min(W * 0.26, Math.max(...props.y.map((s) => monoW(s, fY.size) * 0.7)) + GAP * 0.5);
  const gridW = W - 2 * pad - yW - 16;
  const cellW = gridW / nx;
  const fX = useFitProbe(`${ctx.id}:x`, SIZE.label, Math.max(40, cellW - 12), (fs) => probeLabels(props.x, fs), props.x.join('|'));
  const headH = Math.round(fX.size * 1.8);
  const gridH = H - 2 * pad - headH - 8;
  const cellH = Math.min(gridH / ny, cellW * 1.2);
  const gh = cellH * ny;
  const gx = rtl ? pad : pad + yW + 16; // grid left edge
  const gy = pad + headH + 8 + (gridH - gh) / 2;
  const colX = (j: number) => gx + (rtl ? nx - 1 - j : j) * cellW;
  const cellFs = Math.max(LABEL_MIN, Math.min(SIZE.label, Math.floor(cellH * 0.5)));
  const widest = Math.max(...flat.map((v) => fmt(v, dec).length));
  const showVals = cellW - 8 >= monoW('0'.repeat(widest), cellFs) && cellH >= cellFs * 1.4;
  const head = prog(ctx, ctx.at, 'label');
  const diag = Math.max(1, nx + ny - 2);
  const sweep = Math.round((16 * ctx.fps) / 24);
  const gap = 3;
  const hv = hl ? props.values[hy]?.[hx] : undefined;

  return (
    <Shell ctx={ctx}>
      {fY.probe}
      {fX.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: head}} />
      {props.x.map((l, j) => (
        <div key={`x${j}`} style={{position: 'absolute', left: colX(j), width: cellW, top: pad, display: 'flex', justifyContent: 'center', opacity: prog(ctx, ctx.at + Math.round((j * sweep) / diag), 'label')}}>
          <Lbl id={`${ctx.id}:x${j}`} text={l} size={fX.size} color={j === hx ? C.ink : C.ink2} weight={j === hx ? FONT.label.strong : undefined} overflow={fX.overflow} />
        </div>
      ))}
      {props.y.map((l, i) => (
        <div key={`y${i}`} style={{position: 'absolute', [rtl ? 'right' : 'left']: pad, width: yW, top: gy + i * cellH, height: cellH, display: 'flex', alignItems: 'center', justifyContent: rtl ? 'flex-start' : 'flex-end', opacity: prog(ctx, ctx.at + Math.round((i * sweep) / diag), 'label')}}>
          <Lbl id={`${ctx.id}:y${i}`} text={l} size={fY.size} color={i === hy ? C.ink : C.ink2} weight={i === hy ? FONT.label.strong : undefined} overflow={fY.overflow} />
        </div>
      ))}
      {/* row / column bands of the highlighted cell */}
      {hl ? (
        <>
          <div style={{position: 'absolute', left: gx, width: gridW, top: gy + hy * cellH, height: cellH, background: tint(C.ember, 0.1 * hq), borderTop: `1px solid ${tint(C.ember, 0.35 * hq)}`, borderBottom: `1px solid ${tint(C.ember, 0.35 * hq)}`}} />
          <div style={{position: 'absolute', left: colX(hx), width: cellW, top: gy, height: gh, background: tint(C.ember, 0.1 * hq), borderLeft: `1px solid ${tint(C.ember, 0.35 * hq)}`, borderRight: `1px solid ${tint(C.ember, 0.35 * hq)}`}} />
        </>
      ) : null}
      {props.y.map((_, i) =>
        props.x.map((__, j) => {
          const v = props.values[i]?.[j];
          const q = prog(ctx, ctx.at + Math.round(((i + j) * sweep) / diag), 'label');
          const isH = i === hy && j === hx;
          const style: React.CSSProperties = {position: 'absolute', left: colX(j) + gap / 2, top: gy + i * cellH + gap / 2, width: cellW - gap, height: cellH - gap, borderRadius: Math.min(10, cellH * 0.18), opacity: q, transform: `scale(${(0.88 + 0.12 * q).toFixed(3)})`};
          if (v === undefined) return <div key={`${i}.${j}`} style={{...style, border: `2px dashed ${tint(C.ink3, 0.5)}`}} />;
          const c = colorOf(v);
          return (
            <div key={`${i}.${j}`} style={{...style, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isH ? `0 0 0 3px ${C.ember}, 0 0 ${(ctx.fx.glowPx * (0.5 + fl)).toFixed(1)}px ${tint(C.ember, 0.8)}` : undefined, zIndex: isH ? 2 : undefined}}>
              {showVals ? <NumText id={`${ctx.id}:c${i}.${j}`} text={fmt(v, dec)} size={cellFs} color={brightness(v) > 0.55 ? C.void : C.ink} style={{textShadow: 'none'}} /> : null}
            </div>
          );
        }),
      )}
      {hl && hv !== undefined ? (
        <div style={{position: 'absolute', left: Math.max(pad, Math.min(W - pad - 140, colX(hx) + cellW / 2 - 70)), top: Math.max(4, gy + hy * cellH - Math.round(SIZE.body * 1.7)), opacity: hq, zIndex: 3, padding: '2px 16px', borderRadius: 12, background: tint(C.void, 0.92), border: `2px solid ${C.ember}`}}>
          <NumText id={`${ctx.id}:hv`} text={fmt(hv, dec)} size={SIZE.body} color={C.ink} fx={ctx.fx} glowK={0.4 + fl} ca />
        </div>
      ) : null}
    </Shell>
  );
};

export const Heatmap: DcComponent<Props> = {name: 'Heatmap', Component: HeatmapView, text: true, slot: 'center'};
