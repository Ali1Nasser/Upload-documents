// WindowFrame (catalog: Data; 04 section 6 "Joins, windows, CTEs, NULL": window = ember frame sliding inside violet partitions).
// The ordered rows of ONE partition are a strip of value cells (math / sequence order: left -> right, always LTR). A violet outline
// is the partition (PARTITION BY chip above), an ember frame covers the rows of the window frame of the current row, and a signal
// marker sits under the current row. The frame is computed from `frame_kind` and `bounds` (UNBOUNDED PRECEDING / n PRECEDING /
// CURRENT ROW / n FOLLOWING / UNBOUNDED FOLLOWING):  rows = by row offset; groups = by peer group (equal values) offset; range =
// by value offset on the (ascending) values; strings fall back to rows. The frame appears at the layer anchor on the first row
// and `slide` (state change on its word) moves the current row to `to`: frame edges and marker travel over the word (first step on
// the anchor frame, landing on the word end; at least the morph preset). The readout is the frame SUM of the numeric values,
// rolling with the frame: arithmetic over the listed values (the schema ref covers them), shown only when every value is numeric.
// Depth + light (ADR-003 LK-F, 04 section 1.2): the partition is a violet slab with a rim-lit top edge and a floor reflection; the
// frame is an ember glass lens (rim light from the upper right, inner glow) that casts a light shaft and a pool onto the floor and
// leaves a fading ghost where it came from; each numeric cell carries a column proportional to |value| so the frame SUM is seen, not
// only read. No filter blur, no WebGL: the same render at every tier (the tiers only change glow radius and grain). Plain CSS 2.5D.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, Chip, Lbl, NumText, Plate, SIZE, Shell, acts, ease, flashAt, fmt, landOf, mix, probeNums, prog, roll, srcDecimals, tint, useFitProbe} from '../_data/kit';

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
  const nums = props.values.map((v) => (typeof v === 'number' ? v : 0));
  const maxAbs = Math.max(1e-9, ...nums.map(Math.abs));
  const dec = Math.max(0, ...props.values.map((v) => (typeof v === 'number' ? srcDecimals(v) : 0)));
  const pad = 36;
  const cw = Math.min(Math.floor((W - 2 * pad - 32) / n), SIZE.numberBig);
  const stripW = cw * n;
  const x0 = (W - stripW) / 2;
  const cellH = Math.round(Math.min(cw * 1.15, H * 0.3));
  const chipFs = SIZE.labelMin;
  const stripY = Math.round(H * 0.34);
  const floorY = stripY + cellH + 40;
  const gid = `wf${String(ctx.id).replace(/[^a-zA-Z0-9]/g, '')}`;

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
  const sumOf = (r: [number, number]) => nums.slice(r[0], r[1] + 1).reduce((x, y) => x + y, 0);
  const sum = numeric ? lerp(sumOf(fa0), sumOf(fb0)) : 0;
  const fl = flashAt(ctx, seg.landed);

  const texts = props.values.map((v) => (typeof v === 'number' ? fmt(v, dec) : v));
  const fCell = useFitProbe(`${ctx.id}:cells`, SIZE.body, cw - 14, (fs) => probeNums(texts, fs), texts.join('|'), {min: SIZE.labelMin});
  const sumTxt = numeric ? fmt(sumOf(fb0), dec) : '';
  const sumFs = Math.min(SIZE.title, Math.floor(H * 0.15));
  const fSum = useFitProbe(`${ctx.id}:sum`, sumFs, W * 0.3, (fs) => probeNums([sumTxt || '0'], fs), sumTxt);
  const head = prog(ctx, ctx.at, 'label');
  const fq = prog(ctx, ctx.at, 'arrive');
  const frameX = x0 + fa * cw;
  const frameW = (fb - fa + 1) * cw;
  const frameCx = frameX + frameW / 2;
  const overlap = (i: number) => Math.max(0, Math.min(1, Math.min(i + 1, fb + 1) - Math.max(i, fa)));
  const kindTxt = `${props.frame_kind.toUpperCase()} BETWEEN ${props.bounds[0]} AND ${props.bounds[1]}`;
  const fKind = useFitProbe(`${ctx.id}:kind`, SIZE.labelMin, W - 2 * pad - (numeric ? W * 0.3 : 0), (fs) => probeNums([kindTxt], fs), kindTxt);
  const gl = ctx.fx.glowInner;
  const moving = seg.q < 1 && seg.a !== seg.b;
  const ghostX = x0 + fa0[0] * cw - 8; // where the frame came from (start of this move)
  const ghostW = (fa0[1] - fa0[0] + 1) * cw;
  const markX = x0 + (cf + 0.5) * cw;
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
      {/* light on the floor: violet reflection of the partition slab, ember pool and shaft under the frame */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id={`${gid}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.ember} stopOpacity={0.34} />
            <stop offset="1" stopColor={C.ember} stopOpacity={0} />
          </linearGradient>
          <radialGradient id={`${gid}p`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={C.ember} stopOpacity={0.5} />
            <stop offset="1" stopColor={C.ember} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${gid}re`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.ember} stopOpacity={1} />
            <stop offset="0.4" stopColor={C.ember} stopOpacity={0.4} />
            <stop offset="1" stopColor={C.ember} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id={`${gid}rv`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.violet} stopOpacity={0.95} />
            <stop offset="0.4" stopColor={C.violet} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.violet} stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id={`${gid}vf`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.violet} stopOpacity={0.2} />
            <stop offset="0.35" stopColor={C.violet} stopOpacity={0.07} />
            <stop offset="1" stopColor={C.violet} stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id={`${gid}ef`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.ember} stopOpacity={0.14 + 0.1 * fl} />
            <stop offset="0.45" stopColor={C.ember} stopOpacity={0.03 + 0.04 * fl} />
            <stop offset="1" stopColor={C.ember} stopOpacity={0.08 + 0.08 * fl} />
          </linearGradient>
          <radialGradient id={`${gid}v`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={C.violet} stopOpacity={0.38} />
            <stop offset="1" stopColor={C.violet} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={W / 2} cy={stripY + cellH + 22} rx={stripW * 0.56} ry={26} fill={`url(#${gid}v)`} opacity={head} />
        <g opacity={fq * (0.75 + 0.25 * fl)}>
          <polygon points={`${frameX},${stripY + cellH + 6} ${frameX + frameW},${stripY + cellH + 6} ${frameCx + frameW * 0.75},${floorY} ${frameCx - frameW * 0.75},${floorY}`} fill={`url(#${gid}s)`} />
          <ellipse cx={frameCx} cy={floorY} rx={frameW * 0.8 + 30} ry={22} fill={`url(#${gid}p)`} />
        </g>
        {/* partition: violet slab, rim-lit from the upper right, halo of two translucent strokes (no blur filter) */}
        <g opacity={head}>
          <rect x={x0 - 14} y={stripY - 14} width={stripW + 28} height={cellH + 28} rx={20} fill="none" stroke={tint(C.violet, 0.07)} strokeWidth={gl * 3.2} />
          <rect x={x0 - 14} y={stripY - 14} width={stripW + 28} height={cellH + 28} rx={20} fill="none" stroke={tint(C.violet, 0.12)} strokeWidth={gl * 1.6} />
          <rect x={x0 - 14} y={stripY - 14} width={stripW + 28} height={cellH + 28} rx={20} fill={`url(#${gid}vf)`} stroke={`url(#${gid}rv)`} strokeWidth={3} />
        </g>
      </svg>
      {/* cells: raised slabs, a column in each shows |value| */}
      {props.values.map((v, i) => {
        const o = overlap(i);
        const q = prog(ctx, ctx.at + Math.round((i * 2 * ctx.fps) / 24), 'label');
        const colH = numeric ? Math.max(4, Math.round((Math.abs(nums[i]) / maxAbs) * (cellH - 22))) : 0;
        return (
          <div key={i} style={{position: 'absolute', left: x0 + i * cw + 4, top: stripY + (1 - q) * 6, width: cw - 8, height: cellH, borderRadius: 10, overflow: 'hidden', opacity: q * (0.62 + 0.38 * Math.max(o, i === Math.round(cf) ? 1 : 0)), background: `linear-gradient(180deg, ${tint(C.panel, 0.95)} 0%, ${tint(C.grid, 0.8)} 100%)`, borderTop: `2px solid ${tint(mix(C.ink3, C.ember, o), 0.5 + 0.4 * o)}`, borderRight: `1.5px solid ${tint(C.ink3, 0.35)}`, borderBottom: `1.5px solid ${tint(C.ink3, 0.25)}`, borderLeft: `1.5px solid ${tint(C.ink3, 0.2)}`}}>
            {numeric ? <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: colH, background: `linear-gradient(180deg, ${tint(mix(C.ink3, C.ember, o), 0.22 + 0.16 * o)} 0%, ${tint(mix(C.ink3, C.ember, o), 0.1)} 100%)`}} /> : null}
          </div>
        );
      })}
      {/* ghost of the frame where it came from (a slide leaves a trail) */}
      {moving ? <div style={{position: 'absolute', left: ghostX, top: stripY - 10, width: ghostW, height: cellH + 20, borderRadius: 14, border: `3px solid ${tint(C.ember, 0.5 * (1 - seg.q))}`, background: tint(C.ember, 0.06 * (1 - seg.q))}} /> : null}
      {/* frame: ember glass lens, rim light from the upper right */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: fq}}>
        <rect x={frameX - 8} y={stripY - 20} width={frameW + 16} height={cellH + 40} rx={18} fill="none" stroke={tint(C.ember, 0.07 + 0.06 * fl)} strokeWidth={gl * (3.2 + 3 * fl + 2 * ctx.mod.glow)} />
        <rect x={frameX - 8} y={stripY - 20} width={frameW + 16} height={cellH + 40} rx={18} fill="none" stroke={tint(C.ember, 0.14 + 0.1 * fl)} strokeWidth={gl * 1.5} />
        <rect x={frameX - 8} y={stripY - 20} width={frameW + 16} height={cellH + 40} rx={18} fill={`url(#${gid}ef)`} stroke={`url(#${gid}re)`} strokeWidth={5} />
        <line x1={frameX + 14} y1={stripY - 14} x2={frameX + frameW - 14} y2={stripY - 14} stroke={tint(C.ink, 0.22)} strokeWidth={1.5} />
      </svg>
      {/* numbers on top of the glass */}
      {props.values.map((v, i) => {
        const o = overlap(i);
        const q = prog(ctx, ctx.at + Math.round((i * 2 * ctx.fps) / 24), 'label');
        return (
          <div key={i} style={{position: 'absolute', left: x0 + i * cw + 4, top: stripY + (1 - q) * 6, width: cw - 8, height: cellH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: q * (0.62 + 0.38 * Math.max(o, i === Math.round(cf) ? 1 : 0))}}>
            {typeof v === 'number' ? <NumText id={`${ctx.id}:v${i}`} text={fmt(v, dec)} size={fCell.size} color={o > 0.5 ? C.ink : C.ink2} fx={ctx.fx} glowK={0.35 * o} /> : <Lbl id={`${ctx.id}:v${i}`} text={v} size={fCell.size} color={o > 0.5 ? C.ink : C.ink2} overflow={fCell.overflow} />}
          </div>
        );
      })}
      {/* current row marker */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: fq}}>
        <circle cx={markX} cy={stripY + cellH + 26} r={22} fill={tint(C.signal, 0.16)} />
        <polygon points={`${markX - 16},${stripY + cellH + 40} ${markX + 16},${stripY + cellH + 40} ${markX},${stripY + cellH + 14}`} fill={C.signal} />
      </svg>
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
