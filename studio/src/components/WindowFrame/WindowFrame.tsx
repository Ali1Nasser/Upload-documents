// WindowFrame (catalog: Data; 04 section 6 "Joins, windows, CTEs, NULL": window = ember frame sliding inside violet partitions).
// The ordered rows of ONE partition are a strip of value cells (math / sequence order: left -> right, always LTR). A violet outline
// is the partition (PARTITION BY chip above), an ember frame covers the rows of the window frame of the current row, and a signal
// marker sits under the current row. The frame is computed from `frame_kind` and `bounds` (UNBOUNDED PRECEDING / n PRECEDING /
// CURRENT ROW / n FOLLOWING / UNBOUNDED FOLLOWING):  rows = by row offset; groups = by peer group (equal values) offset; range =
// by value offset on the (ascending) values; strings fall back to rows. The frame appears at the layer anchor on the first row
// and `slide` (state change on its word) moves the current row to `to`: frame edges and marker travel over the word (first step on
// the anchor frame, landing on the word end; at least the morph preset). The readout is the frame SUM of the numeric values,
// rolling with the frame: arithmetic over the listed values (the schema ref covers them), shown only when every value is numeric.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, Chip, Lbl, NumText, Plate, SIZE, Shell, acts, ease, flashAt, fmt, landOf, probeNums, prog, roll, srcDecimals, tint, useFitProbe} from '../_data/kit';

type Bound = {unb: boolean; off: number};
const parseBound = (s: string): Bound => {
  const u = s.toUpperCase();
  if (/CURRENT/.test(u)) return {unb: false, off: 0};
  const unb = /UNBOUNDED/.test(u);
  const m = u.match(/(\d+(?:\.\d+)?)/);
  const n = m ? parseFloat(m[1]) : 0;
  return {unb, off: /FOLLOWING/.test(u) ? n : -n};
};

/** Inclusive [lo, hi] row indices of the frame of row c. */
export const frameOf = (p: Props, c: number): [number, number] => {
  const n = p.values.length;
  const [bl, bh] = [parseBound(p.bounds[0]), parseBound(p.bounds[1])];
  const clamp = (x: number) => Math.max(0, Math.min(n - 1, x));
  if (p.frame_kind === 'range' && p.values.every((v) => typeof v === 'number')) {
    const v = p.values as number[];
    const lo = bl.unb ? -Infinity : v[c] + bl.off;
    const hi = bh.unb ? Infinity : v[c] + bh.off;
    const idx = v.map((x, i) => (x >= lo && x <= hi ? i : -1)).filter((i) => i >= 0);
    return idx.length ? [idx[0], idx[idx.length - 1]] : [c, c];
  }
  if (p.frame_kind === 'groups') {
    const g: number[] = [];
    p.values.forEach((x, i) => g.push(i > 0 && x === p.values[i - 1] ? g[i - 1] : (g[i - 1] ?? -1) + 1));
    const gc = g[c];
    const gl = bl.unb ? -Infinity : gc + bl.off;
    const gh = bh.unb ? Infinity : gc + bh.off;
    const idx = g.map((x, i) => (x >= gl && x <= gh ? i : -1)).filter((i) => i >= 0);
    return idx.length ? [idx[0], idx[idx.length - 1]] : [c, c];
  }
  return [bl.unb ? 0 : clamp(c + bl.off), bh.unb ? n - 1 : clamp(c + bh.off)];
};

export const WindowFrameView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const n = props.values.length;
  const numeric = props.values.every((v) => typeof v === 'number');
  const dec = Math.max(0, ...props.values.map((v) => (typeof v === 'number' ? srcDecimals(v) : 0)));
  const pad = 36;
  const cw = Math.min(Math.floor((W - 2 * pad - 24) / n), SIZE.numberBig);
  const stripW = cw * n;
  const x0 = (W - stripW) / 2;
  const cellH = Math.round(Math.min(cw * 1.15, H * 0.26));
  const chipFs = SIZE.labelMin;
  const stripY = Math.round(H * 0.42);

  // ---- current-row timeline ----
  const slides = acts(ctx, 'slide');
  let seg = {a: 0, b: 0, q: 1, landed: null as number | null};
  let cur = 0;
  for (const s of slides) {
    if (s.at > t) break;
    const to = Math.min(n - 1, s.props.to as number);
    seg = {a: cur, b: to, q: roll(t, s.at, landOf(ctx, s), 0, 1, ease.camera), landed: t >= landOf(ctx, s) ? landOf(ctx, s) : null};
    cur = to;
  }
  const fa0 = frameOf(props, seg.a);
  const fb0 = frameOf(props, seg.b);
  const lerp = (a: number, b: number) => a + (b - a) * seg.q;
  const fa = lerp(fa0[0], fb0[0]);
  const fb = lerp(fa0[1], fb0[1]);
  const cf = lerp(seg.a, seg.b);
  const sumOf = (r: [number, number]) => (props.values as number[]).slice(r[0], r[1] + 1).reduce((x, y) => x + y, 0);
  const sum = numeric ? lerp(sumOf(fa0), sumOf(fb0)) : 0;
  const fl = flashAt(ctx, seg.landed);

  const texts = props.values.map((v) => (typeof v === 'number' ? fmt(v, dec) : v));
  const fCell = useFitProbe(`${ctx.id}:cells`, SIZE.body, cw - 14, (fs) => probeNums(texts, fs), texts.join('|'), {min: SIZE.labelMin});
  const sumTxt = numeric ? fmt(sumOf(fb0), dec) : '';
  const fSum = useFitProbe(`${ctx.id}:sum`, SIZE.body, W * 0.3, (fs) => probeNums([sumTxt || '0'], fs), sumTxt);
  const head = prog(ctx, ctx.at, 'label');
  const fq = prog(ctx, ctx.at, 'arrive');
  const frameX = x0 + fa * cw;
  const frameW = (fb - fa + 1) * cw;
  const overlap = (i: number) => Math.max(0, Math.min(1, Math.min(i + 1, fb + 1) - Math.max(i, fa)));
  const kindTxt = `${props.frame_kind.toUpperCase()} BETWEEN ${props.bounds[0]} AND ${props.bounds[1]}`;
  const fKind = useFitProbe(`${ctx.id}:kind`, SIZE.labelMin, W - 2 * pad - (numeric ? W * 0.3 : 0), (fs) => probeNums([kindTxt], fs), kindTxt);
  return (
    <Shell ctx={ctx}>
      {fCell.probe}
      {fSum.probe}
      {fKind.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: head}} />
      <div style={{position: 'absolute', left: pad, top: pad, display: 'flex', gap: 24, direction: 'ltr', opacity: head}}>
        {props.partition_by ? <Chip id={`${ctx.id}:part`} text={`PARTITION BY ${props.partition_by}`} size={chipFs} color={C.violet} fill={0.35} fx={ctx.fx} /> : null}
        <Chip id={`${ctx.id}:order`} text={`ORDER BY ${props.order_by}`} size={chipFs} color={C.ink2} fx={ctx.fx} />
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {/* partition: violet outline around the ordered rows */}
        <rect x={x0 - 14} y={stripY - 14} width={stripW + 28} height={cellH + 28} rx={20} fill={tint(C.violet, 0.07 * head)} stroke={tint(C.violet, 0.8 * head)} strokeWidth={3} />
        {/* frame: ember (glow = translucent halo behind, no filter) */}
        <g opacity={fq}>
          <rect x={frameX - 10} y={stripY - 22} width={frameW + 20} height={cellH + 44} rx={20} fill={tint(C.ember, 0.1 + 0.1 * fl)} />
          <rect x={frameX} y={stripY - 10} width={frameW} height={cellH + 20} rx={14} fill="none" stroke={C.ember} strokeWidth={5} />
          {/* current row marker */}
          <polygon points={`${x0 + (cf + 0.5) * cw - 16},${stripY + cellH + 34} ${x0 + (cf + 0.5) * cw + 16},${stripY + cellH + 34} ${x0 + (cf + 0.5) * cw},${stripY + cellH + 12}`} fill={C.signal} />
        </g>
      </svg>
      {props.values.map((v, i) => {
        const o = overlap(i);
        const q = prog(ctx, ctx.at + Math.round((i * 2 * ctx.fps) / 24), 'label');
        return (
          <div key={i} style={{position: 'absolute', left: x0 + i * cw + 4, top: stripY, width: cw - 8, height: cellH, borderRadius: 10, background: tint(C.ember, 0.04 + 0.22 * o), border: `1.5px solid ${tint(C.ink3, 0.5 - 0.2 * o)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: q * (0.55 + 0.45 * Math.max(o, i === Math.round(cf) ? 1 : 0)), transform: `translateY(${((1 - q) * 6).toFixed(2)}px)`}}>
            {typeof v === 'number' ? <NumText id={`${ctx.id}:v${i}`} text={fmt(v, dec)} size={fCell.size} color={o > 0.5 ? C.ink : C.ink2} /> : <Lbl id={`${ctx.id}:v${i}`} text={v} size={fCell.size} color={o > 0.5 ? C.ink : C.ink2} overflow={fCell.overflow} />}
          </div>
        );
      })}
      {/* frame clause + the frame aggregate */}
      <div style={{position: 'absolute', left: pad, right: pad, bottom: pad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', direction: 'ltr', opacity: head}}>
        <Chip id={`${ctx.id}:kind`} text={kindTxt} size={fKind.size} color={C.ember} fill={0.3} fx={ctx.fx} />
        {numeric ? (
          <div style={{display: 'flex', alignItems: 'center', gap: 16, opacity: fq}}>
            <Chip id={`${ctx.id}:sigma`} text="SUM" size={chipFs} color={C.ink2} fx={ctx.fx} />
            <NumText id={`${ctx.id}:sum`} text={fmt(sum, dec)} size={fSum.size} color={C.ember} fx={ctx.fx} glowK={0.4 + 1.1 * fl + ctx.mod.glow} ca />
          </div>
        ) : null}
      </div>
    </Shell>
  );
};

export const WindowFrame: DcComponent<Props> = {name: 'WindowFrame', Component: WindowFrameView, text: true, slot: 'center'};
