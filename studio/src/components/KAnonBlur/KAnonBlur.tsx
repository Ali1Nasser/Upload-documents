// KAnonBlur (catalog: Domain specials; 04 section 6 "Reconciliation, governance, DR": k-anonymity blur groups; CH-28: masking every
// direct identifier leaves k = 1 and nine unique rows, d:6.9:1/3; only generalisation / suppression reaches k >= 2, d:6.9:2).
// A table of `rows` rows: the first column is the masked direct identifier (dots), then one column per quasi-identifier (label
// from props). Every quasi cell starts as a SHARP, unique mark (warn: this row can be singled out). `generalize` blurs the columns
// one after another (3 film frames apart; with m actions the columns are shared among the actions): the sharp mark dissolves into a
// wide soft band, and when the last column is generalised the rows slide together into groups of at least k identical rows (floor
// (rows / k) groups, sizes differ by at most one), each closed by an ok bracket on the end side. Cells carry no copy and no digits:
// k and rows are structural props with no ref, so the narration's k is shown by a NumberCounter / TermChip layer.
// Before the first generalisation a warn linkage reticle hops from row to row (a lone row is a lone person: it can be re-identified
// by joining the quasi-identifiers with an outside list). Light per ADR-003 LK-F: perspective floor + coloured pool, acrylic plate.
// DOM + SVG only (standard tier; hero = standard); no CSS blur or SVG filter (perf): the blur is the SAME mark widening into a
// feathered (gradient-edged) band shared by its whole group, so the unique value is no longer readable.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Lbl, acrylic, acts, apportion, boxStyle, f24, mix, pf, prog, shell, shuffle} from '../_dom-c/kit';

/** Group of every row (k-anonymous: each group >= k members), and the final row order. */
export const groupRows = (rows: number, k: number, seed: string): {group: number[]; order: number[]; groups: number} => {
  const g = Math.max(1, Math.min(Math.floor(rows / Math.max(1, k)), rows));
  const sizes = apportion(Array.from({length: g}, () => 1), rows);
  const slotGroup = sizes.flatMap((s, gi) => Array.from({length: s}, () => gi));
  const perm = shuffle(rows, seed);
  const group = Array.from({length: rows}, (_, i) => slotGroup[perm[i]]);
  const order = Array.from({length: rows}, (_, i) => i).sort((a, b) => group[a] - group[b] || a - b);
  return {group, order, groups: g};
};

const R = Math.round;
export const KAnonBlurView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const q = props.quasi_ids.length;
  const seedKey = `kanon-${props.rows}-${props.k}-${q}`;
  const gr = groupRows(props.rows, props.k, seedKey);
  const W = ctx.box.w;
  const H = ctx.box.h;
  const gens = acts(ctx, 'generalize');
  const tableX = Math.round(W * 0.16);
  const tableW = Math.round(W * 0.8);
  const cols = q + 1;
  const colW = Math.round(tableW / cols);
  const headH = Math.round(H * 0.13);
  const regionY = headH + 10;
  const regionH = H - regionH0(H, headH);
  const rowH = Math.floor(Math.min(78, regionH / (props.rows + 0.45 * (gr.groups - 1))) / 2) * 2;
  const gap = Math.round(rowH * 0.45);
  const cx = (c: number) => Math.round(tableX + tableW - (c + 0.5) * colW); // RTL: column 0 (identifier) on the right
  // generalisation time of quasi column c (0-based among the quasi columns)
  const gTime = (c: number): number | null => {
    if (gens.length === 0) return null;
    const a = Math.min(gens.length - 1, Math.floor((c * gens.length) / q));
    const inAct = Array.from({length: q}, (_, cc) => cc).filter((cc) => Math.min(gens.length - 1, Math.floor((cc * gens.length) / q)) === a);
    return gens[a].at + inAct.indexOf(c) * f24(ctx, 3);
  };
  const gDone = gens.length ? Math.max(...Array.from({length: q}, (_, c) => (gTime(c) as number) + P.morph)) : null;
  const slideP = gDone === null ? 0 : prog(ctx, gDone, P.morphLong);
  const bracketP = gDone === null ? 0 : prog(ctx, gDone + P.morphLong, P.label);
  const ent = prog(ctx, ctx.at, P.arrive);
  const finalIdx = gr.order.map((_, pos) => pos);
  const posOf = (i: number) => gr.order.indexOf(i);
  const yAt = (i: number) => {
    const y0 = regionY + i * rowH;
    const pos = posOf(i);
    const y1 = regionY + pos * rowH + gr.group[i] * gap;
    return Math.round(y0 + (y1 - y0) * slideP);
  };
  const gid = `ka-${ctx.id}`;
  const nVis = Array.from({length: props.rows}, (_, i) => i).filter((i) => t >= ctx.at + Math.round((1.5 * i * ctx.fps) / 24)).length;
  const rowEls: React.ReactNode[] = [];
  for (let i = 0; i < props.rows; i++) {
    const b = ctx.at + Math.round((1.5 * i * ctx.fps) / 24);
    const e = prog(ctx, b, P.label);
    if (t < b) continue;
    const y = yAt(i);
    const cells: React.ReactNode[] = [];
    // masked identifier: four dots
    cells.push(<rect key="mchip" x={cx(0) - 62} y={y + rowH / 2 - 17} width={124} height={34} rx={17} fill={C.ink3} fillOpacity={0.14} stroke={C.ink3} strokeOpacity={0.35} strokeWidth={2} />);
    for (let d = 0; d < 4; d++) cells.push(<circle key={`m${d}`} cx={cx(0) + (d - 1.5) * 24} cy={y + rowH / 2} r={8} fill={C.ink3} fillOpacity={0.85} />);
    for (let c = 0; c < q; c++) {
      const tg = gTime(c);
      const gp = tg === null ? 0 : prog(ctx, tg, P.morph);
      const xc = cx(c + 1);
      const sharpW = Math.round(colW * (0.18 + 0.42 * random(`${seedKey}:w:${i}:${c}`)));
      const sharpX = Math.round(xc + (random(`${seedKey}:x:${i}:${c}`) - 0.5) * colW * 0.34);
      const g = gr.group[i];
      const bandW = Math.round(colW * (0.72 + 0.14 * random(`${seedKey}:bw:${g}:${c}`)));
      const bandX = Math.round(xc + (random(`${seedKey}:bx:${g}:${c}`) - 0.5) * colW * 0.08);
      const hh = 2 * Math.round(Math.min(rowH * 0.46, 30) / 2);
      const col = mix(C.warn, C.ok, gp);
      // the sharp mark widens toward the shared band (defocus) while the feathered band fades in over it
      const mx = Math.round(sharpX + (bandX - sharpX) * gp);
      const mw = 2 * Math.round((sharpW + (bandW - sharpW) * gp) / 2);
      cells.push(
        <g key={`c${c}`}>
          <rect x={mx - mw / 2} y={y + rowH / 2 - hh / 2} width={mw} height={hh} rx={hh / 2} fill={col} fillOpacity={1 - 0.45 * gp} />
          {gp > 0 ? (
            <>
              <rect x={bandX - bandW / 2 - 30} y={y + rowH / 2 - R(hh * 1.3)} width={bandW + 60} height={2 * R(hh * 1.3)} rx={R(hh * 1.3)} fill={C.ok} fillOpacity={0.04 * gp} />
              <rect x={bandX - bandW / 2 - 16} y={y + rowH / 2 - R(hh * 1.05)} width={bandW + 32} height={2 * R(hh * 1.05)} rx={R(hh * 1.05)} fill={C.ok} fillOpacity={0.07 * gp} />
              <rect x={bandX - bandW / 2 - 8} y={y + rowH / 2 - R(hh * 0.8)} width={bandW + 16} height={2 * R(hh * 0.8)} rx={R(hh * 0.8)} fill={C.ok} fillOpacity={0.12 * gp} />
              <rect x={bandX - bandW / 2 + 6} y={y + rowH / 2 - R(hh * 0.2)} width={bandW - 12} height={2 * R(hh * 0.2)} rx={R(hh * 0.2)} fill={C.ink} fillOpacity={0.14 * gp} />
            </>
          ) : null}
        </g>,
      );
    }
    rowEls.push(
      <g key={`r${i}`} opacity={e}>
        <rect x={tableX + 4} y={y + 3} width={tableW - 8} height={rowH - 6} rx={10} fill={`${C.panel}B8`} stroke={C.grid} strokeWidth={2} />
        {cells}
      </g>,
    );
  }
  // linkage reticle: hops to a new row every 14 film frames until the first column is generalised
  const hopN = f24(ctx, 14);
  const born0 = (i: number) => ctx.at + Math.round((1.5 * i * ctx.fps) / 24);
  const firstG = gens.length ? Math.min(...Array.from({length: q}, (_, c) => gTime(c) as number)) : null;
  const retFade = 1 - (firstG === null ? 0 : prog(ctx, firstG, P.morph));
  let reticle: React.ReactNode = null;
  if (t >= ctx.at + hopN && retFade > 0) {
    const hop = Math.floor((t - ctx.at - hopN) / hopN);
    const live = Math.max(1, Math.min(props.rows, Math.floor(((t - ctx.at) * 24) / (ctx.fps * 1.5)) + 1));
    const ri = Math.floor(random(`${seedKey}:ret:${hop}`) * live);
    if (t >= born0(ri)) {
      const ry = yAt(ri);
      const x0 = tableX - 2;
      const x1 = tableX + tableW + 2;
      const y0 = ry + 1;
      const y1 = ry + rowH - 1;
      const L = 16;
      const d = `M ${x0} ${y0 + L} L ${x0} ${y0} L ${x0 + L} ${y0} M ${x1 - L} ${y0} L ${x1} ${y0} L ${x1} ${y0 + L} M ${x1} ${y1 - L} L ${x1} ${y1} L ${x1 - L} ${y1} M ${x0 + L} ${y1} L ${x0} ${y1} L ${x0} ${y1 - L}`;
      const rp = prog(ctx, ctx.at + hopN + hop * hopN, P.label);
      reticle = (
        <g opacity={retFade * rp}>
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={12} fill={C.warn} fillOpacity={0.07} />
          <path d={d} fill="none" stroke={C.warn} strokeOpacity={0.25} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={C.warn} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }
  }
  // group brackets (end side = left of the table)
  const brackets: React.ReactNode[] = [];
  if (bracketP > 0)
    for (let g = 0; g < gr.groups; g++) {
      const members = finalIdx.filter((pos) => gr.group[gr.order[pos]] === g);
      const yA = regionY + members[0] * rowH + g * gap + 5;
      const yB = regionY + (members[members.length - 1] + 1) * rowH + g * gap - 5;
      const bx = tableX - 48;
      brackets.push(
        <g key={`g${g}`} opacity={bracketP}>
          <path d={`M ${bx + 16} ${yA} L ${bx} ${yA} L ${bx} ${yB} L ${bx + 16} ${yB}`} fill="none" stroke={C.ok} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M ${bx + 16} ${yA} L ${bx} ${yA} L ${bx} ${yB} L ${bx + 16} ${yB}`} fill="none" stroke={C.ok} strokeOpacity={0.28} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        </g>,
      );
    }
  // ADR-003 LK-F floor: receding lines (solid strokes at whole pixels: gradient strokes and fractional coordinates are not
  // bit-stable across raster tiles) plus a stacked-ellipse light pool under the plate in the state colour.
  const fy = Math.round(H * 0.8);
  const floorCol = mix(C.warn, C.ok, bracketP);
  const floor: React.ReactNode[] = [];
  for (let i = 1; i <= 6; i++) {
    const yy = Math.round(fy + (H - fy) * Math.pow(i / 6, 1.6));
    floor.push(<path key={`fh${i}`} d={`M ${Math.round(W * 0.02)} ${yy} L ${Math.round(W * 0.98)} ${yy}`} stroke={C.grid} strokeWidth={2} strokeOpacity={0.15 + 0.55 * (i / 6)} />);
  }
  for (let j = -7; j <= 7; j++) {
    const mid = Math.round(tableX + tableW / 2);
    floor.push(<path key={`fv${j}`} d={`M ${mid + Math.round(j * W * 0.03)} ${fy} L ${mid + Math.round(j * W * 0.11)} ${Math.round(H)}`} stroke={C.grid} strokeWidth={2} strokeOpacity={0.5 * (1 - Math.abs(j) / 9)} />);
  }
  for (let e = 0; e < 4; e++)
    floor.push(<ellipse key={`fe${e}`} cx={Math.round(tableX + tableW / 2)} cy={Math.round(H * 0.9)} rx={Math.round(tableW * (0.5 - 0.09 * e))} ry={Math.round(H * (0.12 - 0.02 * e))} fill={floorCol} fillOpacity={(0.04 + 0.03 * bracketP) * (1 + e * 0.3)} />);
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: ent, pointerEvents: 'none'}}>{floor}</svg>
      <div style={{position: 'absolute', left: tableX - 12, top: regionY - 10, width: tableW + 24, height: Math.max(1, nVis) * rowH + Math.round((gr.groups - 1) * gap * slideP) + 20, borderRadius: 26, ...acrylic(bracketP > 0 ? C.ok : C.ink3, ctx.fx, 0.2 + (bracketP > 0 ? 0.5 : 0) + ctx.mod.glow, bracketP === 0), opacity: ent}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: ent}}>
        {rowEls}
        {reticle}
        {brackets}
      </svg>
      {props.quasi_ids.map((lab, c) => (
        <div key={c} style={{position: 'absolute', left: cx(c + 1) - colW / 2, width: colW, top: 0, height: headH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ent}}>
          <Lbl id={`${ctx.id}:q${c}`} text={lab} maxW={colW - 24} maxH={headH} size={SIZE.label} wrap fps={ctx.fps} color={mix(C.warn, C.ok, (() => { const tg = gTime(c); return tg === null ? 0 : prog(ctx, tg, P.morph); })())} weight={FONT.label.strong} />
        </div>
      ))}
    </div>
  );
};
const regionH0 = (H: number, headH: number): number => headH + 10 + H * 0.02;
export const KAnonBlur: DcComponent<Props> = {name: 'KAnonBlur', Component: KAnonBlurView, text: true, slot: 'full'};
