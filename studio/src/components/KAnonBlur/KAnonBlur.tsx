// KAnonBlur (catalog: Domain specials; 04 section 6 "Reconciliation, governance, DR": k-anonymity blur groups; CH-28: masking every
// direct identifier leaves k = 1 and nine unique rows, d:6.9:1/3; only generalisation / suppression reaches k >= 2, d:6.9:2).
// A table of `rows` rows: the first column is the masked direct identifier (dots), then one column per quasi-identifier (label
// from props). Every quasi cell starts as a SHARP, unique mark (warn: this row can be singled out). `generalize` blurs the columns
// one after another (3 film frames apart; with m actions the columns are shared among the actions): the sharp mark dissolves into a
// wide soft band, and when the last column is generalised the rows slide together into groups of at least k identical rows (floor
// (rows / k) groups, sizes differ by at most one), each closed by an ok bracket on the end side. Cells carry no copy and no digits:
// k and rows are structural props with no ref, so the narration's k is shown by a NumberCounter / TermChip layer.
// DOM + SVG only (standard tier); no CSS blur or SVG filter (perf): the blur is a crossfade to a soft gradient band.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
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

export const KAnonBlurView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const q = props.quasi_ids.length;
  const seedKey = `kanon-${props.rows}-${props.k}-${q}`;
  const gr = groupRows(props.rows, props.k, seedKey);
  const W = ctx.box.w;
  const H = ctx.box.h;
  const gens = acts(ctx, 'generalize');
  const tableX = W * 0.16;
  const tableW = W * 0.8;
  const cols = q + 1;
  const colW = tableW / cols;
  const headH = Math.round(H * 0.13);
  const regionY = headH + 10;
  const regionH = H - regionH0(H, headH);
  const rowH = Math.min(78, regionH / (props.rows + 0.45 * (gr.groups - 1)));
  const gap = rowH * 0.45;
  const cx = (c: number) => tableX + tableW - (c + 0.5) * colW; // RTL: column 0 (identifier) on the right
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
    return y0 + (y1 - y0) * slideP;
  };
  const rowEls: React.ReactNode[] = [];
  for (let i = 0; i < props.rows; i++) {
    const b = ctx.at + Math.round((1.5 * i * ctx.fps) / 24);
    const e = prog(ctx, b, P.label);
    if (t < b) continue;
    const y = yAt(i);
    const cells: React.ReactNode[] = [];
    // masked identifier: four dots
    for (let d = 0; d < 4; d++) cells.push(<circle key={`m${d}`} cx={cx(0) + (d - 1.5) * 22} cy={y + rowH / 2} r={5} fill={C.ink3} fillOpacity={0.7} />);
    for (let c = 0; c < q; c++) {
      const tg = gTime(c);
      const gp = tg === null ? 0 : prog(ctx, tg, P.morph);
      const xc = cx(c + 1);
      const sharpW = colW * (0.18 + 0.42 * random(`${seedKey}:w:${i}:${c}`));
      const sharpX = xc + (random(`${seedKey}:x:${i}:${c}`) - 0.5) * colW * 0.34;
      const g = gr.group[i];
      const bandW = colW * (0.72 + 0.14 * random(`${seedKey}:bw:${g}:${c}`));
      const bandX = xc + (random(`${seedKey}:bx:${g}:${c}`) - 0.5) * colW * 0.08;
      const hh = Math.min(rowH * 0.46, 30);
      const col = mix(C.warn, C.ok, gp);
      cells.push(
        <g key={`c${c}`}>
          {gp < 1 ? <rect x={sharpX - sharpW / 2} y={y + rowH / 2 - hh / 2} width={sharpW} height={hh} rx={hh / 2} fill={col} fillOpacity={1 - gp} /> : null}
          {gp > 0 ? (
            <>
              <rect x={bandX - bandW / 2 - 8} y={y + rowH / 2 - hh * 0.95} width={bandW + 16} height={hh * 1.9} rx={hh} fill={C.ok} fillOpacity={0.1 * gp} />
              <rect x={bandX - bandW / 2} y={y + rowH / 2 - hh / 2} width={bandW} height={hh} rx={hh / 2} fill={C.ok} fillOpacity={0.55 * gp} />
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
  // group brackets (end side = left of the table)
  const brackets: React.ReactNode[] = [];
  if (bracketP > 0)
    for (let g = 0; g < gr.groups; g++) {
      const members = finalIdx.filter((pos) => gr.group[gr.order[pos]] === g);
      const yA = regionY + members[0] * rowH + g * gap + 5;
      const yB = regionY + (members[members.length - 1] + 1) * rowH + g * gap - 5;
      const bx = tableX - 26;
      brackets.push(
        <g key={`g${g}`} opacity={bracketP}>
          <path d={`M ${bx + 14} ${yA} L ${bx} ${yA} L ${bx} ${yB} L ${bx + 14} ${yB}`} fill="none" stroke={C.ok} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M ${bx + 14} ${yA} L ${bx} ${yA} L ${bx} ${yB} L ${bx + 14} ${yB}`} fill="none" stroke={C.ok} strokeOpacity={0.2} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        </g>,
      );
    }
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <div style={{position: 'absolute', left: tableX - 12, top: regionY - 10, width: tableW + 24, height: props.rows * rowH + (gr.groups - 1) * gap + 20, borderRadius: 26, ...acrylic(bracketP > 0 ? C.ok : C.ink3, ctx.fx, 0.2 + 0.5 * bracketP + ctx.mod.glow, bracketP === 0), opacity: ent}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: ent}}>
        {rowEls}
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
