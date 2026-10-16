// Heatmap (catalog: Data; 04 section 6 "NLP, attention": heatmap matrix; "Reconciliation": mismatch classes). A labelled matrix of
// raised glass tiles on a rim-lit slab. `sequential`: grid -> signal -> ink by value (hot tiles glow); `diverging`: ember <- panel ->
// signal around zero (symmetric range). Cell colours are mixes of tokens only. A colour legend (the listed minimum and maximum, or
// -max / 0 / +max) sits under the slab. Column labels along the top, row labels at the reading start (right in Arabic, and then
// the first column is on the right too; numbers always read left -> right). Missing cells (a short row) are hollow dashed ghosts,
// never zeros. The matrix sweeps in along its diagonal (label preset per tile, <= 16 film frames in total) with a lit wave front.
// Values are printed in the tiles (mono tabular, source decimals) when they fit at the 28 px floor, else only on the highlighted
// cell (a value chip above it). `highlightCell` (state change on its word) dims the rest, outlines the cell in an ember glass lens
// (rim light from the upper right), lights its row and column shafts and the two labels. The single `ref` of the frozen schema
// covers every value; no derived number is shown. 2.5D CSS + SVG, no WebGL, no filter blur: the same render at every FX tier
// (tiers change glow radius, grain and CA only).
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, FONT, GAP, LABEL_MIN, Lbl, NumText, Plate, SIZE, Shell, flashAt, fmt, lastAct, mix, monoW, probeLabels, probeNums, prog, rtlOf, srcDecimals, tint, useFitProbe, revealProgress, presetFrames} from '../_data/kit';

const chan = (h: string, i: number) => {
  const v = parseInt(h.slice(i, i + 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const lum = (h: string) => 0.2126 * chan(h, 1) + 0.7152 * chan(h, 3) + 0.0722 * chan(h, 5);
/** Readable tile text: ink on dark tiles, void on bright ones (whichever has the higher contrast). */
const textOn = (bg: string): string => ((lum(bg) + 0.05) / (lum(C.void) + 0.05) > (lum(C.ink) + 0.05) / (lum(bg) + 0.05) ? C.void : C.ink);

export const HeatmapView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const nx = props.x.length;
  const ny = props.y.length;
  const rtl = rtlOf(...props.x, ...props.y);
  const diverging = props.scale === 'diverging';
  const flat = props.values.slice(0, ny).flatMap((r) => r.slice(0, nx));
  const dec = Math.max(0, ...flat.map(srcDecimals));
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const sym = Math.max(Math.abs(lo), Math.abs(hi), 1e-9);
  const span = Math.max(1e-9, hi - lo);
  const norm = (v: number): number => (diverging ? v / sym : (v - lo) / span);
  const colorOf = (v: number): string => {
    const k = norm(v);
    if (diverging) return k >= 0 ? mix(C.panel, C.signal, k) : mix(C.panel, C.ember, -k);
    return k < 0.75 ? mix(C.grid, C.signal, k / 0.75) : mix(C.signal, C.ink, ((k - 0.75) / 0.25) * 0.45);
  };
  const heat = (v: number): number => (diverging ? Math.abs(norm(v)) : norm(v));
  const pad = 30;
  const hl = lastAct(ctx, 'highlightCell');
  const hx = hl ? Math.min(nx - 1, hl.props.x as number) : -1;
  const hy = hl ? Math.min(ny - 1, hl.props.y as number) : -1;
  const hq = hl ? revealProgress(t - hl.at, presetFrames('impact', ctx.fps, true)) : 0;
  const fl = flashAt(ctx, hl ? hl.at : null);
  const gid = `hm${String(ctx.id).replace(/[^a-zA-Z0-9]/g, '')}`;

  // ---- fits ----
  const legH = Math.round(SIZE.label * 1.5 + 30);
  const fY = useFitProbe(`${ctx.id}:y`, SIZE.label, W * 0.24, (fs) => probeLabels(props.y, fs), props.y.join('|'), {maxH: H * 0.8});
  const yW = Math.min(W * 0.26, Math.max(...props.y.map((s) => monoW(s, fY.size) * 0.7)) + GAP * 0.5);
  const gridW = W - 2 * pad - yW - 32;
  const cellW = gridW / nx;
  const fX = useFitProbe(`${ctx.id}:x`, SIZE.label, Math.max(40, cellW - 12), (fs) => probeLabels(props.x, fs), props.x.join('|'));
  const headH = Math.round(fX.size * 1.8);
  const gridH = H - 2 * pad - headH - 8 - legH;
  const cellH = Math.min(gridH / ny, cellW * 1.5);
  const gh = cellH * ny;
  const gx = rtl ? pad : pad + yW + 32; // grid left edge (20 px air between rim and row label)
  const gy = pad + headH + 8 + (gridH - gh) / 2;
  const colX = (j: number) => gx + (rtl ? nx - 1 - j : j) * cellW;
  const cellFs = Math.max(LABEL_MIN, Math.min(SIZE.label, Math.floor(cellH * 0.5)));
  const widest = Math.max(...flat.map((v) => fmt(v, dec).length));
  const showVals = cellW - 8 >= monoW('0'.repeat(widest), cellFs) && cellH >= cellFs * 1.4;
  const head = prog(ctx, ctx.at, 'label');
  const diag = Math.max(1, nx + ny - 2);
  const sweep = Math.round((16 * ctx.fps) / 24);
  const waveLen = presetFrames('label', ctx.fps) * 2;
  const gap = 3;
  const hv = hl ? props.values[hy]?.[hx] : undefined;
  const dim = 1 - 0.5 * hq; // tiles off the highlighted row / column step back
  const dimL = 1 - 0.35 * hq; // labels step back less (contrast floor)
  const legW = Math.min(W * 0.42, 460);
  const legTexts = diverging ? [fmt(-sym, dec), '0', fmt(sym, dec)] : [fmt(lo, dec), fmt(hi, dec)];
  const fLeg = useFitProbe(`${ctx.id}:leg`, SIZE.label, W * 0.2, (fs) => probeNums(legTexts, fs), legTexts.join('|'));
  const legY = gy + gh + 28;
  const slab = {x: gx - 12, y: gy - 12, w: gridW + 24, h: gh + 24};
  const lensR = Math.min(12, cellH * 0.2);

  return (
    <Shell ctx={ctx}>
      {fY.probe}
      {fX.probe}
      {fLeg.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: head}} />
      {/* slab: rim light from the upper right, floor reflection under it */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id={`${gid}r`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.9} />
            <stop offset="0.4" stopColor={C.signal} stopOpacity={0.25} />
            <stop offset="1" stopColor={C.ink3} stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id={`${gid}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.1} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0.02} />
          </linearGradient>
          <radialGradient id={`${gid}p`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={hl ? C.ember : C.signal} stopOpacity={0.34 + 0.2 * hq} />
            <stop offset="1" stopColor={hl ? C.ember : C.signal} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${gid}lg`} x1="0" y1="0" x2="1" y2="0">
            {diverging ? (
              <>
                <stop offset="0" stopColor={colorOf(-sym)} />
                <stop offset="0.5" stopColor={colorOf(0)} />
                <stop offset="1" stopColor={colorOf(sym)} />
              </>
            ) : (
              [0, 0.25, 0.5, 0.75, 1].map((k) => <stop key={k} offset={k} stopColor={colorOf(lo + k * span)} />)
            )}
          </linearGradient>
        </defs>
        <ellipse cx={gx + gridW / 2} cy={slab.y + slab.h + 8} rx={gridW * 0.52} ry={22} fill={`url(#${gid}p)`} opacity={head} />
        <g opacity={head}>
          <rect x={slab.x} y={slab.y} width={slab.w} height={slab.h} rx={18} fill="none" stroke={tint(C.signal, 0.07)} strokeWidth={ctx.fx.glowInner * 3.2} />
          <rect x={slab.x} y={slab.y} width={slab.w} height={slab.h} rx={18} fill={`url(#${gid}f)`} stroke={`url(#${gid}r)`} strokeWidth={2.5} />
          <line x1={slab.x + 22} y1={slab.y + 1.5} x2={slab.x + slab.w - 22} y2={slab.y + 1.5} stroke={tint(C.ink, 0.2)} strokeWidth={1.5} />
        </g>
        {/* legend bar: value -> colour */}
        <g opacity={head}>
          <rect x={gx + gridW / 2 - legW / 2} y={legY + 4} width={legW} height={14} rx={7} fill={`url(#${gid}lg)`} stroke={tint(C.ink, 0.25)} strokeWidth={1} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: gx + gridW / 2 - legW / 2 - 16, top: legY - 2, transform: 'translateX(-100%)', direction: 'ltr', opacity: head}}>
        <NumText id={`${ctx.id}:lmin`} text={legTexts[0]} size={fLeg.size} color={C.ink2} />
      </div>
      <div style={{position: 'absolute', left: gx + gridW / 2 + legW / 2 + 16, top: legY - 2, direction: 'ltr', opacity: head}}>
        <NumText id={`${ctx.id}:lmax`} text={legTexts[legTexts.length - 1]} size={fLeg.size} color={C.ink2} />
      </div>
      {props.x.map((l, j) => (
        <div key={`x${j}`} style={{position: 'absolute', left: colX(j), width: cellW, top: pad, display: 'flex', justifyContent: 'center', opacity: prog(ctx, ctx.at + Math.round((j * sweep) / diag), 'label') * (j === hx ? 1 : dimL)}}>
          <Lbl id={`${ctx.id}:x${j}`} text={l} size={fX.size} color={j === hx ? C.ink : C.ink2} weight={j === hx ? FONT.label.strong : undefined} overflow={fX.overflow} glowK={j === hx ? 0.5 + fl : 0} fx={ctx.fx} />
        </div>
      ))}
      {props.y.map((l, i) => (
        <div key={`y${i}`} style={{position: 'absolute', [rtl ? 'right' : 'left']: pad, width: yW, top: gy + i * cellH, height: cellH, display: 'flex', alignItems: 'center', justifyContent: rtl ? 'flex-start' : 'flex-end', opacity: prog(ctx, ctx.at + Math.round((i * sweep) / diag), 'label') * (i === hy ? 1 : dimL)}}>
          <Lbl id={`${ctx.id}:y${i}`} text={l} size={fY.size} color={i === hy ? C.ink : C.ink2} weight={i === hy ? FONT.label.strong : undefined} overflow={fY.overflow} glowK={i === hy ? 0.5 + fl : 0} fx={ctx.fx} />
        </div>
      ))}
      {/* row / column light shafts of the highlighted cell */}
      {hl ? (
        <>
          <div style={{position: 'absolute', left: gx, width: gridW, top: gy + hy * cellH, height: cellH, background: `linear-gradient(${rtl ? 270 : 90}deg, ${tint(C.ember, 0.26 * hq)} 0%, ${tint(C.ember, 0.08 * hq)} 100%)`, borderTop: `1px solid ${tint(C.ember, 0.4 * hq)}`, borderBottom: `1px solid ${tint(C.ember, 0.4 * hq)}`}} />
          <div style={{position: 'absolute', left: colX(hx), width: cellW, top: pad - 4, height: gh + (gy - pad + 4), background: `linear-gradient(180deg, ${tint(C.ember, 0.26 * hq)} 0%, ${tint(C.ember, 0.08 * hq)} 100%)`, borderLeft: `1px solid ${tint(C.ember, 0.4 * hq)}`, borderRight: `1px solid ${tint(C.ember, 0.4 * hq)}`}} />
        </>
      ) : null}
      {props.y.map((_, i) =>
        props.x.map((__, j) => {
          const v = props.values[i]?.[j];
          const start = ctx.at + Math.round(((i + j) * sweep) / diag);
          const q = prog(ctx, start, 'label');
          const front = ctx.frame < start ? 0 : Math.max(0, 1 - (ctx.frame - start) / waveLen); // lit wave front
          const isH = i === hy && j === hx;
          const inLine = i === hy || j === hx;
          const style: React.CSSProperties = {position: 'absolute', left: colX(j) + gap / 2, top: gy + i * cellH + gap / 2 + (1 - q) * 6, width: cellW - gap, height: cellH - gap, borderRadius: Math.min(10, cellH * 0.18), opacity: q * (hl && !inLine ? dim + 0.1 : 1), transform: `scale(${(0.9 + 0.1 * q).toFixed(3)})`};
          if (v === undefined) return <div key={`${i}.${j}`} style={{...style, border: `2px dashed ${tint(C.ink3, 0.5)}`}} />;
          const c = colorOf(v);
          const k = heat(v);
          const lit = mix(c, C.ink, 0.16 + 0.34 * front);
          return (
            <div
              key={`${i}.${j}`}
              style={{
                ...style,
                background: `linear-gradient(180deg, ${lit} 0%, ${c} 62%, ${mix(c, C.void, 0.3)} 100%)`,
                borderTop: `1.5px solid ${tint(C.ink, 0.22 + 0.3 * front)}`,
                borderRight: `1.5px solid ${tint(C.ink, 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isH ? `0 0 0 3px ${C.ember}, 0 0 ${(ctx.fx.glowPx * (0.5 + fl)).toFixed(1)}px ${tint(C.ember, 0.8)}` : k > 0.6 ? `0 0 ${(ctx.fx.glowInner * 2.2 * k).toFixed(1)}px ${tint(C.signal, 0.38 * k)}` : undefined,
                zIndex: isH ? 2 : undefined,
              }}
            >
              {showVals ? <NumText id={`${ctx.id}:c${i}.${j}`} text={fmt(v, dec)} size={cellFs} color={textOn(c)} style={{textShadow: 'none', opacity: k < 0.05 && !diverging ? 0.62 : 1}} /> : null}
            </div>
          );
        }),
      )}
      {/* ember glass lens around the highlighted cell (rim light from the upper right) */}
      {hl ? (
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: hq, zIndex: 2}}>
          <defs>
            <linearGradient id={`${gid}e`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.ember} stopOpacity={1} />
              <stop offset="0.45" stopColor={C.ember} stopOpacity={0.45} />
              <stop offset="1" stopColor={C.ember} stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <rect x={colX(hx) - 4} y={gy + hy * cellH - 4} width={cellW + 8} height={cellH + 8} rx={lensR + 4} fill="none" stroke={tint(C.ember, 0.08 + 0.06 * fl)} strokeWidth={ctx.fx.glowInner * (3 + 2 * fl)} />
          <rect x={colX(hx) - 2} y={gy + hy * cellH - 2} width={cellW + 4} height={cellH + 4} rx={lensR + 2} fill="none" stroke={`url(#${gid}e)`} strokeWidth={3} />
        </svg>
      ) : null}
      {hl && hv !== undefined && !showVals ? (
        <div style={{position: 'absolute', left: Math.max(pad, Math.min(W - pad - 140, colX(hx) + cellW / 2 - 70)), top: Math.max(4, gy + hy * cellH - Math.round(SIZE.body * 1.7)), opacity: hq, zIndex: 3, padding: '2px 16px', borderRadius: 12, background: tint(C.void, 0.92), border: `2px solid ${C.ember}`}}>
          <NumText id={`${ctx.id}:hv`} text={fmt(hv, dec)} size={SIZE.body} color={C.ink} fx={ctx.fx} glowK={0.4 + fl} ca />
        </div>
      ) : null}
    </Shell>
  );
};

export const Heatmap: DcComponent<Props> = {name: 'Heatmap', Component: HeatmapView, text: true, slot: 'center'};
