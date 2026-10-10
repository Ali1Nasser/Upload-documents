// TableGrid (catalog: Data). A data table on a glass plate (<= 8 columns, <= 12 visible rows); numbers come from `ref`.
// RTL when the copy is Arabic (first column on the right). Rows arrive staggered on the label preset from the layer anchor;
// actions are state changes anchored to the word that names them (04 section 4, lead -2 f):
//   highlightRows -> rows fill with a token colour; filterRows -> other rows fade out and the kept rows close up;
//   sortBy -> rows travel to their sorted slots (morph timing); addRow -> a new row arrives at the bottom.
// Auto-fit to the slot with a 28 px floor (SIZE.labelMin); an overflow is reported and FAILS snapshot tests.
import React, {useRef} from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE, type ColorToken} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic} from '../../type/arabic';
import {ease, presetFrames, revealStyle} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type Cell = string | number | boolean | null;
type Row = Record<string, Cell>;
type Ctx = DcProps<Props>['ctx'];

/** Structural timeline: rows (base + added), and the slot of each row after every structural event. */
export const tableTimeline = (p: Props, ctx: Ctx) => {
  const rows: {row: Row; born: number}[] = p.rows.map((row, i) => ({row: row as Row, born: ctx.at + Math.round((2 * i * ctx.fps) / 24)}));
  const acts = [...ctx.actions].sort((a, b) => a.at - b.at || a.li - b.li);
  type Ev = {t: number; dur: number; order: number[]; alive: Set<number>};
  let order = rows.map((_, i) => i);
  let alive = new Set(order);
  const evs: Ev[] = [{t: -1e9, dur: 1, order: [...order], alive: new Set(alive)}];
  const highlights: {t: number; rows: number[]; color: ColorToken}[] = [];
  const morph = presetFrames('morph', ctx.fps);
  const arrive = presetFrames('arrive', ctx.fps);
  for (const a of acts) {
    if (a.name === 'highlightRows') highlights.push({t: a.at, rows: a.props.rows as number[], color: (a.props.color as ColorToken) ?? 'signal'});
    else if (a.name === 'filterRows') {
      const keep = new Set(a.props.keep as number[]);
      alive = new Set([...alive].filter((i) => keep.has(i) || i >= p.rows.length)); // added rows are addressed after they exist
      order = order.filter((i) => alive.has(i));
      evs.push({t: a.at, dur: arrive, order: [...order], alive: new Set(alive)});
    } else if (a.name === 'sortBy') {
      const key = a.props.key as string;
      const dir = a.props.dir === 'desc' ? -1 : 1;
      const val = (i: number) => rows[i].row[key];
      order = [...order].sort((x, y) => {
        const u = val(x);
        const v = val(y);
        if (u === v) return x - y;
        if (u === null || u === undefined) return 1;
        if (v === null || v === undefined) return -1;
        return (typeof u === 'number' && typeof v === 'number' ? u - v : String(u).localeCompare(String(v))) * dir;
      });
      evs.push({t: a.at, dur: morph, order: [...order], alive: new Set(alive)});
    } else if (a.name === 'addRow') {
      const idx = rows.length;
      rows.push({row: a.props.row as Row, born: a.at});
      order = [...order, idx];
      alive = new Set([...alive, idx]);
      evs.push({t: a.at, dur: arrive, order: [...order], alive: new Set(alive)});
    }
  }
  return {rows, evs, highlights};
};

/** Slot (fractional, for travel) and alpha of row i at frame t. */
const rowState = (i: number, t: number, tl: ReturnType<typeof tableTimeline>) => {
  let k = 0;
  for (let j = 0; j < tl.evs.length; j++) if (tl.evs[j].t <= t) k = j;
  const cur = tl.evs[k];
  const prev = tl.evs[Math.max(0, k - 1)];
  const q = k === 0 ? 1 : interpolate(t, [cur.t, cur.t + cur.dur], [0, 1], {...clamp, easing: ease.camera});
  const slotIn = (e: typeof cur) => (e.order.indexOf(i) >= 0 ? e.order.indexOf(i) : null);
  const s1 = slotIn(cur);
  const s0 = slotIn(prev) ?? s1;
  const wasAlive = prev.alive.has(i) || k === 0;
  const isAlive = cur.alive.has(i);
  const slot = s1 === null ? (s0 ?? 0) : s0 === null ? s1 : s0 + (s1 - s0) * q;
  const alpha = isAlive ? (wasAlive ? 1 : q) : wasAlive ? 1 - q : 0;
  return {slot, alpha};
};

const fmtCell = (v: Cell): string => (v === null ? '—' : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));

export const TableGridView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const tl = tableTimeline(props, ctx);
  const rtl = props.columns.some((c) => isArabic(c.label)) || (!!props.title && isArabic(props.title));
  const size = tl.rows.length <= 6 ? SIZE.body : SIZE.label; // 40 px for short tables, 32 px otherwise; auto-fit floor 28 px
  const titleH = props.title ? Math.round(size * 1.9) : 0;
  const pad = 28;
  const key = `${props.columns.map((c) => c.key).join(',')}|${tl.rows.length}|${props.title ?? ''}`;
  const fit = useAutoFit(ref, {id: ctx.id, size, min: SIZE.labelMin, maxW: ctx.box.w - 2 * pad, maxH: ctx.box.h - 2 * pad - titleH, key});
  const fs = fit.size;
  const rowH = Math.round(fs * 1.9);
  const t = ctx.frame;
  const head = revealStyle(t - ctx.at, ctx.fps, 'label', rtl ? 'rtl' : 'ltr', ctx.until !== undefined ? t - ctx.until : undefined);
  const hl = (i: number): {color: string; q: number} | null => {
    let h: {color: string; q: number} | null = null;
    for (const x of tl.highlights)
      if (x.t <= t && x.rows.includes(i)) h = {color: C[x.color], q: interpolate(t, [x.t, x.t + presetFrames('label', ctx.fps)], [0, 1], {...clamp, easing: ease.arrive})};
    return h;
  };
  const nCols = props.columns.length;
  const slots = (() => {
    let k = 0;
    for (let j = 0; j < tl.evs.length; j++) if (tl.evs[j].t <= t) k = j;
    const born = (e: (typeof tl.evs)[number]) => e.order.filter((i) => tl.rows[i].born <= t || i < props.rows.length).length;
    const a = born(tl.evs[Math.max(0, k - 1)]);
    const b = born(tl.evs[k]);
    return k === 0 ? b : interpolate(t, [tl.evs[k].t, tl.evs[k].t + tl.evs[k].dur], [a, b], {...clamp, easing: ease.camera});
  })();
  const cellStyle = (kind?: string): React.CSSProperties => ({
    height: rowH,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${Math.round(fs * 0.7)}px`,
    whiteSpace: 'nowrap',
    fontFamily: kind && kind !== 'text' ? `'${FONT.mono.family}'` : undefined,
  });
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...head.style}}>
      <Glass style={{padding: pad}}>
        {props.title ? (
          <div dir={rtl ? 'rtl' : 'ltr'} style={{height: titleH, display: 'flex', alignItems: 'center', fontSize: fs, color: C.ink, textShadow: halo}}>
            <MixedText id={`${ctx.id}:title`} text={props.title} size={fs} weight={FONT.label.strong} />
          </div>
        ) : null}
        <div style={{height: Math.round((1 + slots) * rowH), overflow: 'hidden'}}>
        <div
          ref={ref}
          dir={rtl ? 'rtl' : 'ltr'}
          data-overflow={fit.overflow ? 1 : undefined}
          style={{display: 'grid', gridTemplateColumns: `repeat(${nCols}, max-content)`, gridAutoRows: rowH, width: 'max-content', fontSize: fs, color: C.ink, fontFamily: `'${FONT.mono.family}'`, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined}}
        >
          {props.columns.map((c, j) => (
            <div key={`h${j}`} style={{...cellStyle(), color: C.ink2, fontWeight: FONT.label.strong, borderBottom: `1px solid ${C.grid}`, fontSize: Math.max(SIZE.labelMin, Math.round(fs * 0.9))}}>
              <MixedText id={`${ctx.id}:h${j}`} text={c.label} size={fs} weight={FONT.label.strong} />
            </div>
          ))}
          {tl.rows.map(({row, born}, i) => {
            const st = rowState(i, t, tl);
            const bornT = t - born;
            if (bornT < 0) return props.columns.map((c, j) => <div key={`r${i}c${j}`} style={{...cellStyle(), visibility: 'hidden'}} />);
            const ent = interpolate(bornT, [0, presetFrames('label', ctx.fps)], [0, 1], {...clamp, easing: ease.arrive});
            const dy = (st.slot - i) * rowH + (1 - ent) * 6;
            const h = hl(i);
            const bg = h ? `${h.color}${hex(0.22 * h.q)}` : Math.round(st.slot) % 2 ? `${C.ink}${hex(0.03)}` : 'transparent';
            return props.columns.map((c, j) => {
              const v = row[c.key] ?? null;
              const s = fmtCell(v);
              const ar = typeof v === 'string' && isArabic(v);
              return (
                <div
                  key={`r${i}c${j}`}
                  style={{
                    ...cellStyle(typeof v === 'number' ? 'number' : ar ? 'text' : c.kind ?? 'id'),
                    transform: `translateY(${dy.toFixed(2)}px)`,
                    opacity: ent * st.alpha,
                    background: bg,
                    color: v === null ? C.ink3 : C.ink,
                    boxShadow: h && j === 0 ? `inset ${rtl ? '-' : ''}4px 0 0 ${h.color}` : undefined,
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {ar ? <MixedText id={`${ctx.id}:r${i}c${j}`} text={s} size={fs} weight={FONT.label.weight} /> : <bdi dir="ltr" data-dc-text={`${ctx.id}:r${i}c${j}`}>{s}</bdi>}
                </div>
              );
            });
          })}
        </div>
        </div>
      </Glass>
    </div>
  );
};

export const TableGrid: DcComponent<Props> = {name: 'TableGrid', Component: TableGridView, text: true, slot: 'center'};
