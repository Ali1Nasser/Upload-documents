// JoinFusion (catalog: Data; 04 section 6 "Joins, windows, CTEs, NULL": tables slide together and matching rows fuse; fan-out
// multiplies rows; NULL = hollow ghost cells). Two tables (name, key chips; the key named by `on` is lit) stand on the physical
// left / right (SQL order, like code: always LTR) with an `ON ...` chip between them. The schema carries no row data, so each table
// shows five abstract rows (a coloured key swatch + two ghost text bars: no digits, no invented values): left keys K1..K5, right
// keys K2 K3 K3 K5 K6, i.e. K2 and K5 match 1:1, K3 matches twice (fan-out), K1 / K4 / K6 are unmatched. `fuse` (state change on
// the word that names it) slides the cells to the centre and fuses them into the result of `kind`: inner (matches), left / right /
// full (+ unmatched rows with hollow dashed NULL cells), semi (left rows with a match, once each), anti (left rows without), cross
// (every pair). Dropped rows fade crit; rows multiplied by fan-out carry a warn edge; the move lands on the action word end.
// `showUnmatched` (state change) rings the unmatched rows of a side in crit. `result_rows` (a Num with ref) rolls up at the fuse;
// the component never prints a count of its own abstract rows. An Arabic unit sits on the reading-start side of the number (critic round 1, fix 3).
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {ColorToken} from '../../tokens';
import type {Props} from './schema';
import {C, Chip, Lbl, isArabic, NumText, Plate, SIZE, Shell, acts, ease, flashAt, fmtNum, landOf, lastAct, probeLabels, prog, revealProgress, presetFrames, roll, stag, tint, useFitProbe} from '../_data/kit';

// key swatches are decorative: warn / crit / ok keep their semantic meaning (fan-out edge, dropped rows, seam)
const KEYC: ColorToken[] = ['signal', 'violet', 'ok', 'ink2', 'paper', 'paperShade'];
const LEFT = [0, 1, 2, 3, 4]; // key index of each left row
const RIGHT = [1, 2, 2, 4, 5]; // key index of each right row

type Res = {l: number | null; r: number | null; fan: boolean};
/** Result rows of a join kind over the abstract rows (left-major order). */
export const resultRows = (kind: Props['kind']): Res[] => {
  const pairs: Res[] = [];
  const cnt = (k: number) => RIGHT.filter((x) => x === k).length;
  LEFT.forEach((lk, l) => {
    const rs = RIGHT.map((rk, r) => (rk === lk ? r : -1)).filter((r) => r >= 0);
    if (kind === 'cross') RIGHT.forEach((_, r) => pairs.push({l, r, fan: true}));
    else if (kind === 'semi') {
      if (rs.length) pairs.push({l, r: null, fan: false});
    } else if (kind === 'anti') {
      if (!rs.length) pairs.push({l, r: null, fan: false});
    } else if (rs.length) rs.forEach((r) => pairs.push({l, r, fan: cnt(lk) > 1}));
    else if (kind === 'left' || kind === 'full') pairs.push({l, r: null, fan: false});
  });
  if (kind === 'right' || kind === 'full') {
    RIGHT.forEach((rk, r) => {
      if (!LEFT.includes(rk)) pairs.push({l: null, r, fan: false});
    });
  }
  if (kind === 'right') {
    // right join keeps the right table's order
    pairs.sort((a, b) => (a.r ?? 99) - (b.r ?? 99) || (a.l ?? 99) - (b.l ?? 99));
  }
  return pairs;
};

export const JoinFusionView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const pad = 20;
  const tableW = Math.round(W * 0.32);
  const res = resultRows(props.kind);
  const nRes = Math.max(1, res.length);
  const fu = acts(ctx, 'fuse')[0];
  const q = fu ? roll(t, fu.at, landOf(ctx, fu), 0, 1, ease.camera) : 0;
  const un = lastAct(ctx, 'showUnmatched');
  const unQ = un ? revealProgress(t - un.at, presetFrames('label', ctx.fps)) : 0;
  const unSide = un ? (un.props.side as 'left' | 'right' | 'both') : 'both';

  // ---- header: names + key chips ----
  const names = [props.left.name, props.right.name];
  const fName = useFitProbe(`${ctx.id}:names`, SIZE.body, tableW, (fs) => probeLabels(names, fs, 600), names.join('|'));
  const chipFs = SIZE.labelMin;
  const chipW = (s: string) => Math.round(s.length * chipFs * 0.62 * 0.92 + chipFs * 0.84 + 16);
  const lines = (keys: string[]) => {
    let ln = 1;
    let w = 0;
    for (const k of keys) {
      const cw = chipW(k);
      if (w + cw > tableW && w > 0) {
        ln++;
        w = 0;
      }
      w += cw + 12;
    }
    return ln;
  };
  const kLines = Math.min(3, Math.max(lines(props.left.keys), lines(props.right.keys)));
  const nameH = Math.round(fName.size * 1.6);
  const headH = nameH + kLines * Math.round(chipFs * 1.9) + 12;
  const rowsTop = pad + headH + 16;
  const cntFs = Math.round(SIZE.body * 1.4);
  const rowsH = H - rowsTop - pad - (props.result_rows ? Math.round(cntFs * 1.7) : 0);
  const pre = rowsH / 5;
  const useH = props.result_rows ? rowsH * 0.84 : rowsH; // the rest holds the 'more rows' stack under the result
  const post = useH / Math.max(5, nRes);
  const cw = Math.min(Math.round(tableW * 0.8), Math.round(W * 0.2));
  const xLpre = pad + tableW / 2;
  const xRpre = W - pad - tableW / 2;
  const xLpost = W / 2 - cw / 2;
  const xRpost = W / 2 + cw / 2;
  const e = q;
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const cellH = (k: number) => Math.round(lerp(pre, post, k) * 0.78);
  const yPre = (i: number) => rowsTop + (i + 0.5) * pre;
  const yPost = (j: number) => rowsTop + (j + 0.5) * post;
  const onKeys = (keys: string[]) => keys.map((k) => props.on.includes(k));
  const head = prog(ctx, ctx.at, 'label');

  const ghost = (key: string, x: number, y: number, a: number) => (
    <div key={key} style={{position: 'absolute', left: x - cw / 2, top: y - cellH(1) / 2, width: cw, height: cellH(1), borderRadius: 10, border: `2px dashed ${tint(C.ink3, 0.7)}`, opacity: a}} />
  );
  const cell = (key: string, keyIdx: number, x: number, y: number, a: number, hlOutline: string | null, fanEdge: boolean, rnd: 'l' | 'r', preFan = 0) => {
    const col = C[KEYC[keyIdx % KEYC.length]];
    const h = cellH(e);
    return (
      <div
        key={key}
        style={{
          position: 'absolute',
          left: x - cw / 2,
          top: y - h / 2,
          width: cw,
          height: h,
          opacity: a,
          borderRadius: rnd === 'l' ? '10px 4px 4px 10px' : '4px 10px 10px 4px',
          background: `linear-gradient(90deg, ${tint(C.panel, 0.96)}, ${tint(C.grid, 0.9)})`,
          border: `2px solid ${hlOutline ?? (fanEdge ? tint(C.warn, 0.85) : preFan > 0.02 ? tint(C.warn, 0.35 + 0.6 * preFan) : tint(C.ink3, 0.55))}`,
          boxShadow: hlOutline ? `0 0 ${ctx.fx.glowInner}px ${tint(C.crit, 0.6)}` : undefined,
          display: 'flex',
          alignItems: 'center',
          gap: Math.round(h * 0.25),
          padding: `0 ${Math.round(h * 0.25)}px`,
        }}
      >
        <div style={{width: Math.max(8, Math.round(h * 0.36)), height: Math.max(8, Math.round(h * 0.36)), borderRadius: 4, background: col, boxShadow: `0 0 ${ctx.fx.glowInner * 0.6}px ${tint(col, 0.7)}`, flex: 'none'}} />
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: Math.max(2, Math.round(h * 0.14))}}>
          <div style={{height: Math.max(3, Math.round(h * 0.12)), width: '86%', borderRadius: 4, background: tint(C.ink2, 0.45)}} />
          <div style={{height: Math.max(3, Math.round(h * 0.12)), width: '54%', borderRadius: 4, background: tint(C.ink3, 0.4)}} />
        </div>
      </div>
    );
  };

  // fan-out key (before the fuse): the rows of a key that matches more than once pulse warn with the spark of the second beam
  const cntR = (k: number) => RIGHT.filter((x) => x === k).length;
  const pulseK = 0.5 + 0.5 * Math.cos((2 * Math.PI * (t - ctx.at)) / (1.6 * ctx.fps));
  const preFanQ = prog(ctx, ctx.at + stag(ctx, 5, 2), 'morph') * Math.max(0, 1 - e * 3) * pulseK;
  const fanL = (l: number) => (cntR(LEFT[l]) > 1 ? preFanQ : 0);
  const fanR = (r: number) => (cntR(RIGHT[r]) > 1 && LEFT.includes(RIGHT[r]) ? preFanQ : 0);
  // ---- cell instances ----
  const used: Record<string, number> = {};
  const lCells: React.ReactNode[] = [];
  const rCells: React.ReactNode[] = [];
  const ghosts: React.ReactNode[] = [];
  const unL = (l: number) => !RIGHT.includes(LEFT[l]);
  const unR = (r: number) => !LEFT.includes(RIGHT[r]);
  const showL = un && (unSide === 'left' || unSide === 'both');
  const showR = un && (unSide === 'right' || unSide === 'both');
  const dropA = (k: number) => 1 - Math.min(1, k / 0.55);
  const inA = (r: number) => prog(ctx, ctx.at + stag(ctx, r, 2), 'label');
  res.forEach((rw, j) => {
    if (rw.l !== null) {
      const c = used[`l${rw.l}`] ?? 0;
      used[`l${rw.l}`] = c + 1;
      const x = lerp(xLpre, xLpost, e);
      const y = lerp(yPre(rw.l), yPost(j), e);
      const a = c === 0 ? inA(rw.l) : inA(rw.l) * Math.min(1, e / 0.45);
      lCells.push(cell(`L${rw.l}.${c}`, LEFT[rw.l], x, y, a, showL && unL(rw.l) ? tint(C.crit, 0.55 + 0.45 * unQ) : null, e > 0.5 && rw.fan, 'l', fanL(rw.l)));
    }
    if (rw.r !== null) {
      const c = used[`r${rw.r}`] ?? 0;
      used[`r${rw.r}`] = c + 1;
      const x = lerp(xRpre, xRpost, e);
      const y = lerp(yPre(rw.r), yPost(j), e);
      const a = c === 0 ? inA(rw.r) : inA(rw.r) * Math.min(1, e / 0.45);
      rCells.push(cell(`R${rw.r}.${c}`, RIGHT[rw.r], x, y, a, showR && unR(rw.r) ? tint(C.crit, 0.55 + 0.45 * unQ) : null, e > 0.5 && rw.fan, 'r', fanR(rw.r)));
    }
    if (rw.l === null) ghosts.push(ghost(`gl${j}`, xLpost, yPost(j), Math.max(0, (e - 0.6) / 0.4)));
    if (rw.r === null && !(props.kind === 'semi' || props.kind === 'anti')) ghosts.push(ghost(`gr${j}`, xRpost, yPost(j), Math.max(0, (e - 0.6) / 0.4)));
  });
  // rows that do not survive: they fade (crit tint) while the others slide in
  LEFT.forEach((lk, l) => {
    if (res.some((r) => r.l === l)) return;
    const x = lerp(xLpre, xLpost, e * 0.6);
    lCells.push(cell(`Ld${l}`, lk, x, yPre(l), inA(l) * dropA(e), tint(C.crit, 0.6 + 0.4 * Math.min(1, e * 3)), false, 'l'));
  });
  RIGHT.forEach((rk, r) => {
    if (res.some((x) => x.r === r)) return;
    const x = lerp(xRpre, xRpost, e * 0.6);
    rCells.push(cell(`Rd${r}`, rk, x, yPre(r), inA(r) * dropA(e), props.kind === 'semi' || props.kind === 'anti' ? null : tint(C.crit, 0.6 + 0.4 * Math.min(1, e * 3)), false, 'r'));
  });
  // seams of fused rows: an ok bar where both sides are present
  const seams = res.map((rw, j) => (rw.l !== null && rw.r !== null && e > 0.5 ? <div key={`s${j}`} style={{position: 'absolute', left: W / 2 - 3, top: yPost(j) - cellH(1) / 2, width: 6, height: cellH(1), background: tint(C.ok, 0.9 * Math.min(1, (e - 0.5) / 0.5)), borderRadius: 3, boxShadow: `0 0 ${ctx.fx.glowInner}px ${tint(C.ok, 0.6)}`}} /> : null));
  // depth + light (ADR-003 LK-F): each table stands on a slab with a rim-lit top edge, the matching keys are joined by beams
  // (PK -> FK) with a travelling spark (deterministic phase), and the fused result is lit by a seam shaft and a floor pool.
  const slabIn = Math.max(0, 1 - Math.min(1, e * 1.4));
  const slabTop = pad + headH + 4;
  const slabH = H - slabTop - pad - (props.result_rows ? Math.round(cntFs * 1.7) : 0) + 8;
  const slab = (side: 'l' | 'r') => {
    const x0 = side === 'l' ? pad - 10 : W - pad - tableW - 10;
    return (
      <div key={`slab${side}`} style={{position: 'absolute', left: x0, top: slabTop, width: tableW + 20, height: slabH, opacity: head * slabIn, borderRadius: 16, background: `linear-gradient(180deg, ${tint(C.signal, 0.1)} 0%, ${tint(C.panel, 0.55)} 14%, ${tint(C.panel, 0.2)} 100%)`, borderTop: `2px solid ${tint(C.signal, 0.55)}`, boxShadow: `0 -${Math.round(ctx.fx.glowInner * 0.5)}px ${Math.round(ctx.fx.glowInner * 1.6)}px ${tint(C.signal, 0.12)}`}} />
    );
  };
  const bx0 = Math.round(xLpre + cw / 2 - 26); // the beam layer covers only the gap between the tables (a full-frame SVG layer made raster tiles non-deterministic)
  const bw = Math.round(xRpre - cw / 2 + 26 - bx0);
  const beamsQ = prog(ctx, ctx.at + stag(ctx, 5, 2), 'morph') * Math.max(0, 1 - e * 2.2);
  const beams: React.ReactNode[] = [];
  if (beamsQ > 0.01) {
    const x0 = xLpre + cw / 2;
    const x1 = xRpre - cw / 2;
    LEFT.forEach((lk, l) =>
      RIGHT.forEach((rk, r) => {
        if (rk !== lk) return;
        const col = C[KEYC[lk % KEYC.length]];
        const y0 = yPre(l);
        const y1 = yPre(r);
        const mx = (x0 + x1) / 2;
        const ph = (((t - ctx.at) / (1.6 * ctx.fps) + (l * 5 + r) * 0.13) % 1 + 1) % 1;
        const u = 1 - ph;
        const bx = u * u * u * x0 + 3 * u * u * ph * mx + 3 * u * ph * ph * mx + ph * ph * ph * x1;
        const by = u * u * u * y0 + 3 * u * u * ph * y0 + 3 * u * ph * ph * y1 + ph * ph * ph * y1;
        const fan = cntR(lk) > 1;
        const bc = fan ? C.warn : col;
        const d = `M${x0} ${y0} C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
        const trail = [1, 2, 3, 4].map((k) => {
          const pk = Math.max(0, ph - k * 0.025);
          const uk = 1 - pk;
          return {
            x: uk * uk * uk * x0 + 3 * uk * uk * pk * mx + 3 * uk * pk * pk * mx + pk * pk * pk * x1,
            y: uk * uk * uk * y0 + 3 * uk * uk * pk * y0 + 3 * uk * pk * pk * y1 + pk * pk * pk * y1,
            k,
          };
        });
        beams.push(
          <g key={`bm${l}.${r}`}>
            <path d={d} stroke={tint(bc, 0.16 * beamsQ)} strokeWidth={12} fill="none" strokeLinecap="round" />
            <path d={d} stroke={tint(bc, 0.7 * beamsQ)} strokeWidth={4} fill="none" strokeLinecap="round" />
            {trail.map((p) => (
              <circle key={p.k} cx={p.x} cy={p.y} r={11 - p.k * 1.8} fill={tint(bc, (0.5 - p.k * 0.1) * beamsQ)} />
            ))}
            <circle cx={bx} cy={by} r={22} fill={tint(bc, 0.18 * beamsQ)} />
            <circle cx={bx} cy={by} r={11} fill={tint(bc, 0.95 * beamsQ)} />
          </g>,
        );
      }),
    );
  }
  const shaftQ = Math.min(1, e * 1.6);
  const stackQ = Math.max(0, (e - 0.55) / 0.45);
  const stack = [0, 1, 2].map((k) => (
    <div key={`st${k}`} style={{position: 'absolute', left: W / 2 - cw + 8 + k * 6, width: 2 * cw - 16 - k * 12, top: rowsTop + useH + 4 + k * Math.round(cellH(1) * 0.42), height: Math.round(cellH(1) * 0.36), opacity: stackQ * (0.75 - k * 0.2), borderRadius: 8, border: `2px solid ${tint(C.warn, 0.75)}`, background: tint(C.panel, 0.8)}} />
  ));
  // second plane (depth): a faint perspective floor grid that fills the margins and sells the slabs standing on it
  const gy = slabTop + slabH;
  const floor = (
    <svg key="floor" width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={`fh${i}`} x1={0} x2={W} y1={gy + 2 + i * i * 4} y2={gy + 2 + i * i * 4} stroke={tint(C.signal, (0.1 - i * 0.012) * head * 0.5)} strokeWidth={1.5} />
      ))}
      {[-6, -4, -2, 0, 2, 4, 6].map((i) => (
        <line key={`fv${i}`} x1={W / 2 + i * W * 0.04} x2={W / 2 + i * W * 0.11} y1={gy} y2={H} stroke={tint(C.signal, 0.08 * head * 0.5)} strokeWidth={1.5} />
      ))}
    </svg>
  );
  const rr = props.result_rows;
  const fl = flashAt(ctx, fu && t >= landOf(ctx, fu) ? landOf(ctx, fu) : null);
  const tableHead = (side: 'l' | 'r') => {
    const tb = side === 'l' ? props.left : props.right;
    const xs = side === 'l' ? pad : W - pad - tableW;
    const ons = onKeys(tb.keys);
    return (
      <div key={side} style={{position: 'absolute', left: xs, top: pad, width: tableW, opacity: head * (1 - 0.45 * Math.min(1, e * 1.6)), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        <Lbl id={`${ctx.id}:n${side}`} text={tb.name} size={fName.size} color={C.ink} weight={600} overflow={fName.overflow} />
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxHeight: kLines * Math.round(chipFs * 1.9), overflow: 'hidden'}}>
          {tb.keys.map((k, i) => (
            <Chip key={i} id={`${ctx.id}:k${side}${i}`} text={k} size={chipFs} color={ons[i] ? C.signal : C.ink2} fill={ons[i] ? 0.4 : 0} fx={ctx.fx} />
          ))}
        </div>
      </div>
    );
  };
  return (
    <Shell ctx={ctx}>
      {fName.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: head}} />
      {slab('l')}
      {slab('r')}
      {beams.length ? (
        <svg width={bw} height={H} viewBox={`${bx0} 0 ${bw} ${H}`} style={{position: 'absolute', left: bx0, top: 0}}>
          {beams}
        </svg>
      ) : null}
      {floor}
      {shaftQ > 0 ? (
        <>
          <div style={{position: 'absolute', left: W / 2 - cw * 0.9, width: cw * 1.8, top: rowsTop - 10, height: rowsH + 20, opacity: shaftQ * (0.7 + 0.3 * fl), background: `radial-gradient(ellipse at 50% 50%, ${tint(C.ok, 0.26)} 0%, ${tint(C.ok, 0)} 70%)`}} />
          <div style={{position: 'absolute', left: W / 2 - cw * 1.4, width: cw * 2.8, top: rowsTop + rowsH - 8, height: Math.max(24, rowsH * 0.1), opacity: shaftQ, background: `radial-gradient(ellipse at 50% 40%, ${tint(C.ok, 0.5)} 0%, ${tint(C.ok, 0)} 70%)`}} />
          {/* fan-out / extra rows behind the result: more rows than the front stack shows */}
          {rr ? stack : null}
        </>
      ) : null}
      {tableHead('l')}
      {tableHead('r')}
      {/* the join condition between the tables, then the kind once fused */}
      <div style={{position: 'absolute', left: 0, width: W, top: pad + 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: head}}>
        <Chip id={`${ctx.id}:on`} text={`ON ${props.on}`} size={chipFs} color={C.signal} fill={0.2 + 0.4 * e} fx={ctx.fx} />
        <div style={{opacity: e}}>
          <Chip id={`${ctx.id}:kind`} text={`${props.kind.toUpperCase()} JOIN`} size={chipFs} color={C.ok} fill={0.5} fx={ctx.fx} />
        </div>
      </div>
      {lCells}
      {rCells}
      {ghosts}
      {seams}
      {rr ? (
        <div style={{position: 'absolute', left: 0, width: W, bottom: pad, display: 'flex', justifyContent: 'center', alignItems: 'baseline', flexDirection: rr.unit && isArabic(rr.unit) ? 'row-reverse' : 'row', opacity: e > 0 ? 1 : 0}}>
          <NumText id={`${ctx.id}:rows`} text={fmtNum(rr, roll(t, fu ? fu.at : ctx.at, fu ? landOf(ctx, fu) : ctx.at, 0, rr.value))} size={cntFs} color={C.ok} fx={ctx.fx} glowK={0.4 + fl} ca />
          {rr.unit ? (
            <div style={{[rr.unit && isArabic(rr.unit) ? 'marginRight' : 'marginLeft']: 14, alignSelf: 'flex-end'}}>
              <Lbl id={`${ctx.id}:unit`} text={rr.unit} size={Math.max(SIZE.labelMin, Math.round(cntFs * 0.55))} color={C.ink2} />
            </div>
          ) : null}
        </div>
      ) : null}
    </Shell>
  );
};

export const JoinFusion: DcComponent<Props> = {name: 'JoinFusion', Component: JoinFusionView, text: true, slot: 'full'};
