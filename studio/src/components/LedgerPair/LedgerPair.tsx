// LedgerPair (catalog: Data; 04 section 6 "Reconciliation": two ledgers align; mismatch classes highlighted; net totals lie).
// Two glass ledgers side by side, source first (the reading start: right in Arabic). Entries pair up by label (the first unused
// entry of the other ledger with the same label); entries without a partner get a hollow dashed ghost on the other side (an orphan).
// Rows arrive staggered (label preset) from the layer anchor. `reconcile` (state change on its word) sweeps the link column row by
// row (2 film frames each): an ok check where the amounts agree, a crit cross for an amount difference or an orphan, then the totals
// of both ledgers (sum of the listed amounts: arithmetic over the entries, which carry the refs) roll up and the sign between them
// is = (ok) or an unequal sign (crit). `mismatch` (state change on its word) marks row `index` (row slots: the source entries in
// order, then the target-only entries) in crit on both sides. A mismatch never needs the reconcile sweep to show.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, Lbl, NumText, Plate, SIZE, Shell, acts, ease, flashAt, fmt, fmtNum, landOf, presetFrames, probeLabels, probeNums, prog, revealProgress, roll, rtlOf, srcDecimals, stag, tint, useFitProbe} from '../_data/kit';

type E = Props['left']['entries'][number];
type Row = {l: E | null; r: E | null; state: 'match' | 'diff' | 'orphan'};

export const pairRows = (p: Props): Row[] => {
  const used = new Set<number>();
  const rows: Row[] = p.left.entries.map((l) => {
    const j = p.right.entries.findIndex((r, i) => !used.has(i) && r.label === l.label);
    if (j < 0) return {l, r: null, state: 'orphan'};
    used.add(j);
    const r = p.right.entries[j];
    return {l, r, state: r.amount.value === l.amount.value ? 'match' : 'diff'};
  });
  p.right.entries.forEach((r, i) => {
    if (!used.has(i)) rows.push({l: null, r, state: 'orphan'});
  });
  return rows;
};

export const LedgerPairView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const rows = pairRows(props);
  const rtl = rtlOf(props.left.label, props.right.label, ...props.left.entries.map((e) => e.label), ...props.right.entries.map((e) => e.label));
  const pad = 28;
  const linkW = 120;
  const plateW = Math.floor((W - linkW) / 2);
  const rec = acts(ctx, 'reconcile')[0];
  const mm = acts(ctx, 'mismatch');
  const sumL = props.left.entries.reduce((a, e) => a + e.amount.value, 0);
  const sumR = props.right.entries.reduce((a, e) => a + e.amount.value, 0);
  const unit = props.left.entries[0].amount.unit ?? props.right.entries[0].amount.unit;
  const dec = Math.max(0, ...[...props.left.entries, ...props.right.entries].map((e) => e.amount.decimals ?? srcDecimals(e.amount.value)));
  const equal = Math.abs(sumL - sumR) < 1e-9;

  const nRows = rows.length;
  const headH = Math.round(SIZE.body * 1.9);
  const totH = Math.round(SIZE.body * 2);
  const rowH = Math.floor(Math.min(SIZE.body * 2, (H - 2 * pad - headH - totH - 20) / nRows));
  const fs = Math.max(SIZE.labelMin, Math.min(SIZE.body, Math.floor(rowH * 0.58)));
  const labels = [...props.left.entries, ...props.right.entries].map((e) => e.label);
  const fLab = useFitProbe(`${ctx.id}:labels`, fs, plateW * 0.46, (s) => probeLabels(labels, s), labels.join('|'));
  const amtTxt = [...props.left.entries, ...props.right.entries].map((e) => fmtNum(e.amount) + (e.amount.unit ? ` ${e.amount.unit}` : ''));
  const totTxt = [fmt(sumL, dec) + (unit ? ` ${unit}` : ''), fmt(sumR, dec) + (unit ? ` ${unit}` : '')];
  const fAmt = useFitProbe(`${ctx.id}:amts`, fs, plateW * 0.44, (s) => probeNums([...amtTxt, ...totTxt], s), amtTxt.join('|') + totTxt.join('|'));
  const names = [props.left.label, props.right.label];
  const fName = useFitProbe(`${ctx.id}:names`, SIZE.body, plateW - 2 * pad, (s) => probeLabels(names, s, 600), names.join('|'));
  const sz = Math.min(fLab.size, fAmt.size);
  const head = prog(ctx, ctx.at, 'label');
  const sweepDur = Math.max(1, rec ? landOf(ctx, rec) - rec.at : 1);
  const per = Math.max(1, Math.round((2 * ctx.fps) / 24));
  const markAt = (i: number) => (rec ? rec.at + Math.min(i * per, Math.max(0, sweepDur - presetFrames('label', ctx.fps))) : Infinity);
  const afterSweep = rec ? rec.at + Math.max(sweepDur, nRows * per) : Infinity;
  const mmFor = (i: number) => mm.find((a) => (a.props.index as number) === i);
  const totQ = rec && t >= afterSweep - per ? prog(ctx, afterSweep - per, 'arrive') : 0;
  const fl = flashAt(ctx, totQ > 0 ? afterSweep - per : null);
  const rowY = (i: number) => pad + headH + i * rowH;
  const plateX = (side: 'l' | 'r') => ((side === 'l') !== rtl ? 0 : plateW + linkW);
  const totY = pad + headH + nRows * rowH + 14;
  const plateH = pad + headH + nRows * rowH + totH + 14 + 6;
  const plateTop = Math.max(0, Math.round((H - plateH) / 2));

  const cells = (side: 'l' | 'r') => {
    const ledger = side === 'l' ? props.left : props.right;
    return (
      <div style={{position: 'absolute', left: plateX(side), top: plateTop, width: plateW, height: plateH}}>
        <Plate style={{position: 'absolute', inset: 0, opacity: head, borderRadius: 18}} />
        <div style={{position: 'absolute', left: pad, right: pad, top: pad * 0.6, height: headH, display: 'flex', alignItems: 'center', opacity: head}}>
          <Lbl id={`${ctx.id}:n${side}`} text={ledger.label} size={fName.size} color={C.ink} weight={600} overflow={fName.overflow} />
        </div>
        {rows.map((rw, i) => {
          const e = side === 'l' ? rw.l : rw.r;
          const q = prog(ctx, ctx.at + stag(ctx, i, 2), 'label');
          const m = mmFor(i);
          const mq = m ? revealProgress(t - m.at, presetFrames('impact', ctx.fps, true)) : 0;
          const bad = mq > 0;
          const recBad = rec && t >= markAt(i) && rw.state !== 'match';
          const y = rowY(i); // plate-relative
          if (!e)
            return <div key={i} style={{position: 'absolute', left: pad, right: pad, top: y, height: rowH - 8, borderRadius: 10, border: `2px dashed ${tint(bad || recBad ? C.crit : C.ink3, 0.7)}`, opacity: q}} />;
          return (
            <div
              key={i}
              dir={rtl ? 'rtl' : 'ltr'}
              style={{position: 'absolute', left: pad, right: pad, top: y, height: rowH - 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderRadius: 10, opacity: q, background: bad ? tint(C.crit, 0.12 + 0.14 * mq) : i % 2 ? tint(C.ink, 0.03) : 'transparent', border: bad ? `2px solid ${tint(C.crit, 0.9)}` : '2px solid transparent', boxShadow: bad ? `0 0 ${(ctx.fx.glowPx * 0.5 * mq).toFixed(1)}px ${tint(C.crit, 0.5)}` : undefined}}
            >
              <Lbl id={`${ctx.id}:e${side}${i}`} text={e.label} size={sz} color={bad ? C.ink : C.ink2} overflow={fLab.overflow} />
              <NumText id={`${ctx.id}:a${side}${i}`} text={fmtNum(e.amount)} unit={e.amount.unit} size={sz} color={bad || recBad ? C.crit : C.ink} fx={ctx.fx} glowK={bad ? 0.5 * mq : 0} style={fAmt.overflow ? {outline: `2px dashed ${C.crit}`} : undefined} />
            </div>
          );
        })}
        {/* total row */}
        <div style={{position: 'absolute', left: pad, right: pad, top: totY, height: 2, background: tint(C.ink3, 0.6), opacity: totQ}} />
        <div dir="ltr" style={{position: 'absolute', left: pad, right: pad, top: totY + 8, height: totH - 12, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: totQ}}>
          <NumText id={`${ctx.id}:t${side}`} text={fmt(roll(t, afterSweep - per, afterSweep + per * 3, 0, side === 'l' ? sumL : sumR), dec)} unit={unit} size={sz} color={equal ? C.ok : C.ink} fx={ctx.fx} glowK={0.3 + fl} ca />
        </div>
      </div>
    );
  };
  const midX = plateW + linkW / 2;
  return (
    <Shell ctx={ctx}>
      {fLab.probe}
      {fAmt.probe}
      {fName.probe}
      {cells('l')}
      {cells('r')}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {rows.map((rw, i) => {
          const y = plateTop + rowY(i) + (rowH - 8) / 2;
          const k = rec ? revealProgress(t - markAt(i), presetFrames('label', ctx.fps), ease.arrive) : 0;
          if (k <= 0) return null;
          const ok = rw.state === 'match';
          const col = ok ? C.ok : C.crit;
          return (
            <g key={i} opacity={k}>
              <line x1={midX - 38} x2={midX + 38} y1={y} y2={y} stroke={tint(col, 0.5)} strokeWidth={3} strokeDasharray={ok ? undefined : '6 8'} />
              <circle cx={midX} cy={y} r={20} fill={C.ground} stroke={col} strokeWidth={3.5} />
              {ok ? <polyline points={`${midX - 9},${y} ${midX - 2},${y + 8} ${midX + 10},${y - 8}`} fill="none" stroke={col} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : <path d={`M${midX - 8} ${y - 8} L${midX + 8} ${y + 8} M${midX + 8} ${y - 8} L${midX - 8} ${y + 8}`} stroke={col} strokeWidth={4} strokeLinecap="round" />}
            </g>
          );
        })}
        {totQ > 0 ? (
          <g opacity={totQ}>
            <circle cx={midX} cy={plateTop + totY + totH / 2 - 2} r={24} fill={C.ground} stroke={equal ? C.ok : C.crit} strokeWidth={3.5} />
            <path d={`M${midX - 11} ${plateTop + totY + totH / 2 - 8} H${midX + 11} M${midX - 11} ${plateTop + totY + totH / 2 + 4} H${midX + 11}${equal ? '' : ` M${midX + 8} ${plateTop + totY + totH / 2 - 16} L${midX - 8} ${plateTop + totY + totH / 2 + 12}`}`} stroke={equal ? C.ok : C.crit} strokeWidth={4} strokeLinecap="round" fill="none" />
          </g>
        ) : null}
      </svg>
    </Shell>
  );
};

export const LedgerPair: DcComponent<Props> = {name: 'LedgerPair', Component: LedgerPairView, text: true, slot: 'full'};
