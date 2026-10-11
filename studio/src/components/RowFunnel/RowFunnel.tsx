// RowFunnel (catalog: Data; 04 section 6 "Query pipeline & grain": a row-count funnel with the 6.3 numbers, a counter at each
// stage; look-dev r3 F2). Stage columns run in reading order (LTR for SQL clauses, RTL when the stage labels are Arabic). Each
// reached column holds one dot per surviving row (<= 30 rows; larger counts draw a proportional bar), joined to the next column
// by a funnel band. Advancing to a stage (action `advance`, anchored on the word that names it) lights the column in signal,
// turns the rows the stage dropped crit in the previous column, and rolls the big counter from the previous count to the new
// one (count preset: first step on the anchor frame, lands on the anchor word end). Without `advance` actions the whole funnel
// builds on the layer anchor, one stage every 4 film frames. Future counts are never shown before their stage is reached.
// Every number is the stage's Num (value + ref). Chips and counts auto-fit (28 px floor; AT-4 >= 40 px between chips).
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, Chip, FONT, GAP, Lbl, NumText, SIZE, Shell, acts, ease, flashAt, fmtNum, halo, presetFrames, probeLabels, probeNums, revealProgress, revealStyle, roll, rtlOf, stag, tint, useFitProbe} from '../_data/kit';

const DOT_MAX = 30;

/** Reached time of every stage: from `advance` actions, else the auto build (stage k at anchor + k x 4 film frames). */
const reachTimes = (p: Props, ctx: DcProps<Props>['ctx']): {t: number; end: number}[] => {
  const n = p.stages.length;
  const adv = acts(ctx, 'advance');
  const out: {t: number; end: number}[] = Array.from({length: n}, () => ({t: Infinity, end: Infinity}));
  if (!adv.length) {
    for (let k = 0; k < n; k++) out[k] = {t: ctx.at + stag(ctx, k, 4), end: ctx.at + stag(ctx, k, 4) + presetFrames('morph', ctx.fps)};
    return out;
  }
  out[0] = {t: ctx.at, end: ctx.at};
  for (const a of adv) {
    const s = Math.min(n - 1, a.props.stage as number);
    // advancing to stage s reaches every stage up to s that is not reached yet (a skipped stage lights with it)
    for (let k = 1; k <= s; k++) if (out[k].t === Infinity) out[k] = {t: a.at, end: Math.max(a.at + presetFrames('morph', ctx.fps), a.end)};
  }
  return out;
};

export const RowFunnelView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const st = props.stages;
  const n = st.length;
  const rtl = rtlOf(...st.map((s) => s.label));
  const {w: W, h: H} = ctx.box;
  const reach = reachTimes(props, ctx);
  let active = 0;
  for (let k = 0; k < n; k++) if (reach[k].t <= t) active = k;
  const vals = st.map((s) => s.rows.value);
  const vmax = Math.max(1e-9, ...vals.map((v) => Math.abs(v)));
  const dots = vals.every((v) => Number.isInteger(v) && v >= 0 && v <= DOT_MAX);

  // ---- layout ----
  const pitch = W / n;
  const headH = Math.round(Math.min(H * 0.3, SIZE.numberBig * 1.3));
  const footH = Math.round(Math.min(H * 0.26, SIZE.label * 4.4));
  const chartH = H - headH - footH;
  const colX = (k: number) => (rtl ? W - (k + 0.5) * pitch : (k + 0.5) * pitch);
  const cy = headH + chartH / 2;

  // ---- fits (all hooks unconditional) ----
  const labels = st.map((s) => s.label);
  const chipW = pitch - GAP - 0.84 * SIZE.label;
  const fChips = useFitProbe(`${ctx.id}:chips`, SIZE.label, chipW, (fs) => probeLabels(labels, fs, FONT.mono.weight), labels.join('|'), {maxH: footH * 0.5 * n});
  const nums = st.map((s) => fmtNum(s.rows) + (s.rows.unit ? ` ${s.rows.unit}` : ''));
  const fNums = useFitProbe(`${ctx.id}:nums`, SIZE.label, pitch - GAP, (fs) => probeNums(nums, fs), nums.join('|'));
  const bigTxt = st.map((s) => fmtNum(s.rows));
  const unitAr = props.unit_ar;
  const fBig = useFitProbe(
    `${ctx.id}:big`,
    SIZE.numberBig,
    W * 0.6,
    (fs) => (
      <div style={{display: 'flex', alignItems: 'baseline', gap: Math.round(fs * 0.2)}}>
        {probeNums([bigTxt.reduce((a, b) => (b.length > a.length ? b : a), '')], fs)}
        {probeNums(['00 →'], Math.round(fs * 0.42))}
        {unitAr ? probeLabels([unitAr], Math.max(SIZE.labelMin, Math.round(fs * 0.36))) : null}
      </div>
    ),
    `${bigTxt.join('|')}|${unitAr ?? ''}`,
    {min: Math.round(SIZE.numberBig * 0.5), maxH: headH},
  );

  // ---- dots / bars ----
  const maxDots = dots ? Math.max(1, ...vals) : 0;
  const d = dots ? Math.max(6, Math.min(pitch * 0.2, (chartH * 0.86) / (maxDots * 1.45))) : 0;
  const hOf = (k: number) => (dots ? vals[k] * d * 1.45 : Math.max(4, (Math.abs(vals[k]) / vmax) * chartH * 0.86));
  const colW = dots ? d * 1.6 : Math.min(pitch * 0.26, SIZE.body * 1.4);
  const morph = presetFrames('morph', ctx.fps);
  const litQ = (k: number) => (reach[k].t === Infinity ? 0 : revealProgress(t - reach[k].t, morph, ease.camera));
  const head = revealStyle(t - ctx.at, ctx.fps, 'label', rtl ? 'rtl' : 'ltr');

  // ---- counter: rolls over the advance word, lands on its end ----
  const prevK = Math.max(0, active - 1);
  const cv = active === 0 ? vals[0] : roll(t, reach[active].t, reach[active].end, vals[prevK], vals[active]);
  const landed = active > 0 && t >= reach[active].end ? reach[active].end : active === 0 ? ctx.at + presetFrames('label', ctx.fps) : null;
  const fl = flashAt(ctx, landed);
  const bigFs = fBig.size;
  const smallFs = Math.round(bigFs * 0.42);
  const unitFs = Math.max(SIZE.labelMin, Math.round(bigFs * 0.36));

  const band = (k: number) => {
    // funnel band from column k to k+1, drawn in reading direction as stage k+1 is reached
    const q = litQ(k + 1);
    if (q <= 0) return null;
    const x0 = colX(k) + (rtl ? -colW / 2 : colW / 2);
    const x1full = colX(k + 1) + (rtl ? colW / 2 : -colW / 2);
    const x1 = x0 + (x1full - x0) * q;
    const h0 = hOf(k);
    const h1 = h0 + (hOf(k + 1) - h0) * q;
    const pts = `${x0},${cy - h0 / 2} ${x1},${cy - h1 / 2} ${x1},${cy + h1 / 2} ${x0},${cy + h0 / 2}`;
    const isCur = k + 1 === active;
    return (
      <g key={`b${k}`}>
        <polygon points={pts} fill={tint(C.signal, isCur ? 0.16 : 0.07)} />
        <polyline points={`${x0},${cy - h0 / 2} ${x1},${cy - h1 / 2}`} stroke={tint(C.signal, isCur ? 0.8 : 0.35)} strokeWidth={2} fill="none" />
        <polyline points={`${x0},${cy + h0 / 2} ${x1},${cy + h1 / 2}`} stroke={tint(C.signal, isCur ? 0.8 : 0.35)} strokeWidth={2} fill="none" />
      </g>
    );
  };

  const column = (k: number) => {
    const q = litQ(k);
    if (q <= 0) return null;
    const isAct = k === active;
    const col = isAct ? C.signal : C.ink2;
    const x = colX(k);
    const next = k < active ? vals[k + 1] : null; // rows the next stage kept (the rest were dropped here)
    const dropQ = k < active ? litQ(k + 1) : 0;
    if (!dots) {
      const h = hOf(k) * q;
      return <rect key={`c${k}`} x={x - colW / 2} y={cy - h / 2} width={colW} height={h} rx={6} fill={tint(col, isAct ? 0.85 : 0.45)} />;
    }
    const v = vals[k];
    const top = cy - (v * d * 1.45) / 2;
    // the stage squeezes the dropped rows out at BOTH edges (outermost dots first), so survivors stay centred on the band
    const outer = Array.from({length: v}, (_, i) => i).sort((a, b) => Math.abs(b - (v - 1) / 2) - Math.abs(a - (v - 1) / 2) || a - b);
    const droppedSet = new Set(next !== null && next < v ? outer.slice(0, v - next) : []);
    return (
      <g key={`c${k}`}>
        {Array.from({length: v}, (_, i) => {
          const dq = Math.min(1, Math.max(0, q * 1.6 - (i / Math.max(1, v)) * 0.6));
          const dropped = droppedSet.has(i);
          const c = dropped ? C.crit : col;
          const op = dropped ? 1 - 0.5 * dropQ : 1;
          const r = (d / 2) * (0.4 + 0.6 * dq);
          const yy = top + (i + 0.5) * d * 1.45 + (dropped ? Math.sign(i - (v - 1) / 2) * dropQ * d * 0.5 : 0);
          return <circle key={i} cx={x} cy={yy} r={r} fill={dropped && dropQ > 0 ? tint(C.crit, 0.25 + 0.55 * dropQ) : c} opacity={dq * op} stroke={dropped && dropQ > 0 ? c : 'none'} strokeWidth={dropped ? 1.5 : 0} />;
        })}
      </g>
    );
  };

  return (
    <Shell ctx={ctx}>
      {fChips.probe}
      {fNums.probe}
      {fBig.probe}
      {/* header: previous count -> current count (big, signal), unit after it */}
      <div style={{position: 'absolute', top: 0, height: headH, [rtl ? 'left' : 'right']: 0, display: 'flex', alignItems: 'center', direction: 'ltr', gap: Math.round(bigFs * 0.2), ...head.style}}>
        {active > 0 ? <NumText id={`${ctx.id}:prev`} text={`${bigTxt[prevK]} →`} size={smallFs} color={C.ink3} /> : null}
        <NumText id={`${ctx.id}:big`} text={fmtNum(st[active].rows, cv)} minCh={Math.max(...bigTxt.map((s) => s.length))} size={bigFs} color={C.signal} fx={ctx.fx} glowK={0.6 + 1.2 * fl + ctx.mod.glow} ca />
        {unitAr ? <Lbl id={`${ctx.id}:unit`} text={unitAr} size={unitFs} color={C.ink2} /> : null}
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <line x1={0} x2={W} y1={cy} y2={cy} stroke={tint(C.grid, 0.8)} strokeWidth={1} opacity={head.p} />
        {Array.from({length: n - 1}, (_, k) => band(k))}
        {/* active column halo (cheap: one translucent wide rect, no filter) */}
        {litQ(active) > 0 ? <rect x={colX(active) - colW} y={cy - hOf(active) / 2 - d} width={colW * 2} height={hOf(active) + 2 * d} rx={colW} fill={tint(C.signal, 0.08 * litQ(active))} /> : null}
        {Array.from({length: n}, (_, k) => column(k))}
      </svg>
      {/* footer: stage chips + counts, one per column (AT-4: pitch - chip >= 40 px) */}
      {st.map((s, k) => {
        const reached = reach[k].t <= t;
        const isAct = k === active;
        const q = reached ? revealProgress(t - reach[k].t, presetFrames('label', ctx.fps)) : 0;
        const chipIn = revealStyle(t - ctx.at - stag(ctx, k, 1), ctx.fps, 'label', rtl ? 'rtl' : 'ltr');
        return (
          <div key={k} style={{position: 'absolute', top: headH + chartH + Math.round(footH * 0.12), left: colX(k) - pitch / 2, width: pitch, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(fChips.size * 0.3), ...chipIn.style}}>
            <Chip id={`${ctx.id}:s${k}`} text={s.label} size={fChips.size} color={isAct ? C.signal : reached ? C.ink2 : C.ink3} fill={isAct ? litQ(k) : 0} fx={ctx.fx} style={{outline: fChips.overflow ? `2px dashed ${C.crit}` : undefined}} />
            <div style={{opacity: q, textShadow: halo}}>
              <NumText id={`${ctx.id}:n${k}`} text={fmtNum(s.rows)} unit={s.rows.unit} size={fNums.size} color={isAct ? C.signal : C.ink2} fx={ctx.fx} glowK={isAct ? 0.4 : 0} />
            </div>
          </div>
        );
      })}
    </Shell>
  );
};

export const RowFunnel: DcComponent<Props> = {name: 'RowFunnel', Component: RowFunnelView, text: true, slot: 'full'};
