// BarStack (catalog: Data; 04 section 6 "baseline vs model bars", "next-token probability bars", "bars reshape with the dial").
// Single bars (orientation h | v) or one stacked bar with a legend, on token colours; every value is a Num with its ref.
// RTL when a label is Arabic: the label column sits on the right and horizontal bars grow right -> left (TableGrid rule).
// Motion: bars grow from zero, staggered 2 film frames, on the first `grow` action (else on the layer anchor) and LAND on that
// anchor word's end (at least 2 x arrive); the value rolls with its bar (count preset, RV1 first step on the anchor frame).
// `highlight` (state change, 04 section 4) lights one bar in a token colour with an emissive edge and dims the others.
// `sort` changes the display order only. Labels and values auto-fit as sets (28 px floor; overflow = DC_QA, crit outline).
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {ColorToken} from '../../tokens';
import type {Props} from './schema';
import {C, FONT, GAP, LABEL_MIN, Lbl, NumText, Plate, SIZE, Shell, acts, fmtNum, landLayer, landOf, lastAct, monoW, presetFrames, probeLabels, probeNums, prog, revealProgress, roll, rtlOf, stag, tint, useFitProbe} from '../_data/kit';

type S = Props['series'][number];

/** Display order (sort is layout only). Numeric order with index tie-break: never depends on the host locale. */
const ordered = (p: Props): {s: S; i: number}[] => {
  const xs = p.series.map((s, i) => ({s, i}));
  if (p.sort === 'none') return xs;
  const d = p.sort === 'asc' ? 1 : -1;
  return [...xs].sort((a, b) => (a.s.value.value - b.s.value.value) * d || a.i - b.i);
};

export const BarStackView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const rows = ordered(props);
  const n = rows.length;
  const rtl = rtlOf(...props.series.map((s) => s.label));
  const {w: W, h: H} = ctx.box;
  const pad = 32;
  const iw = W - 2 * pad;
  const ih = H - 2 * pad;
  const vals = props.series.map((s) => s.value.value);
  const total = vals.reduce((a, b) => a + Math.max(0, b), 0);
  const vmax = props.stacked ? Math.max(1e-9, total) : Math.max(1e-9, ...vals.map((v) => Math.abs(v)));
  const horiz = props.orientation === 'h';

  // ---- growth timing ----
  const g = acts(ctx, 'grow')[0];
  const g0 = g ? g.at : ctx.at;
  const g1 = g ? landOf(ctx, g) : landLayer(ctx);
  const grownAt = (k: number) => (t < g0 + stag(ctx, k) ? 0 : roll(t, g0 + stag(ctx, k), g1 + stag(ctx, k), 0, 1));
  const valueAt = (s: S, k: number) => roll(t, g0 + stag(ctx, k), g1 + stag(ctx, k), 0, s.value.value);

  // ---- highlight state ----
  const hl = lastAct(ctx, 'highlight');
  const hlIdx = hl ? (hl.props.index as number) : -1;
  const hlQ = hl ? revealProgress(t - hl.at, presetFrames('label', ctx.fps)) : 0;
  const colorOf = (s: S, i: number): string => (i === hlIdx ? C[((hl?.props.color as ColorToken) ?? 'signal') as ColorToken] : C[s.color ?? 'signal']);
  const dim = (i: number) => (hlIdx >= 0 && i !== hlIdx ? 1 - 0.55 * hlQ : 1);
  const lit = (i: number) => (i === hlIdx ? hlQ : 0);

  // ---- fits (hooks unconditional) ----
  const labels = props.series.map((s) => s.label);
  const nums = props.series.map((s) => fmtNum(s.value) + (s.value.unit ? ` ${s.value.unit}` : ''));
  const rowH = Math.min(Math.floor(ih / n), Math.round(SIZE.body * 2.8));
  const pitchV = (iw + GAP) / n;
  const labMaxW = props.stacked ? iw * 0.42 : horiz ? iw * 0.34 : pitchV - GAP;
  const labMaxH = props.stacked ? ih * 0.6 : horiz ? rowH * n * 0.62 : undefined;
  const fLab = useFitProbe(`${ctx.id}:labels`, SIZE.body, labMaxW, (fs) => probeLabels(labels, fs), labels.join('|'), {maxH: labMaxH});
  const numMaxW = props.stacked ? iw * 0.3 : horiz ? iw * 0.24 : pitchV - GAP;
  const fNum = useFitProbe(`${ctx.id}:values`, Math.round(SIZE.body * 1.1), numMaxW, (fs) => probeNums(nums, fs), nums.join('|'));
  const fs = fLab.size;
  const nfs = fNum.size;
  const probes = (
    <>
      {fLab.probe}
      {fNum.probe}
    </>
  );
  const ovl = (o: boolean): React.CSSProperties => (o ? {outline: `2px dashed ${C.crit}`} : {});
  const baseIn = prog(ctx, ctx.at, 'label');
  const edge = (col: string, k: number) => `inset 0 1px 0 ${tint(C.white, 0.3)}${k > 0 ? `, 0 0 ${(ctx.fx.glowPx * 0.8 * k + ctx.fx.glowInner * ctx.mod.glow).toFixed(1)}px ${tint(col, 0.9)}` : ''}`;

  if (props.stacked) {
    const barT = Math.round(Math.min(horiz ? ih * 0.2 : iw * 0.16, SIZE.body * 2.4));
    let acc = 0;
    const segs = rows.map(({s, i}, k) => {
      const f = Math.max(0, s.value.value) / vmax;
      const seg = {s, i, k, off: acc, f};
      acc += f;
      return seg;
    });
    const gq = grownAt(0);
    return (
      <Shell ctx={ctx} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {probes}
        <Plate style={{padding: pad, display: 'flex', flexDirection: horiz ? 'column' : rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: GAP, width: horiz ? iw : undefined, height: horiz ? undefined : ih}}>
          <div style={{position: 'relative', width: horiz ? '100%' : barT, height: horiz ? barT : '100%', background: tint(C.grid, 0.6 * baseIn), borderRadius: 10, overflow: 'hidden'}}>
            {segs.map(({s, i, off, f}) => {
              const shown = Math.max(0, Math.min(f, gq - off)); // segments fill in order as the bar grows
              const col = colorOf(s, i);
              const pos = `${(off * 100).toFixed(3)}%`;
              const len = `${(shown * 100).toFixed(3)}%`;
              const geo: React.CSSProperties = horiz ? {top: 0, bottom: 0, [rtl ? 'right' : 'left']: pos, width: len} : {left: 0, right: 0, bottom: pos, height: len};
              return <div key={i} style={{position: 'absolute', ...geo, background: `linear-gradient(${horiz ? 180 : 90}deg, ${col}, ${tint(col, 0.7)})`, opacity: dim(i), borderInlineEnd: `2px solid ${C.void}`, boxShadow: edge(col, lit(i))}} />;
            })}
          </div>
          <div dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: GAP, rowGap: Math.round(fs * 0.4), maxWidth: iw}}>
            {segs.map(({s, i, k}) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: Math.round(fs * 0.4), opacity: prog(ctx, g0 + stag(ctx, k), 'label') * dim(i)}}>
                <div style={{width: Math.round(fs * 0.55), height: Math.round(fs * 0.55), borderRadius: 4, background: colorOf(s, i)}} />
                <Lbl id={`${ctx.id}:l${i}`} text={s.label} size={fs} color={lit(i) ? colorOf(s, i) : C.ink2} style={ovl(fLab.overflow)} />
                <NumText id={`${ctx.id}:v${i}`} text={fmtNum(s.value)} unit={s.value.unit} size={nfs} color={C.ink} style={ovl(fNum.overflow)} />
              </div>
            ))}
          </div>
        </Plate>
      </Shell>
    );
  }

  if (!horiz) {
    // vertical columns: value on top, label underneath; reading order follows the labels
    const valH = Math.round(nfs * 1.5);
    const labH = Math.round(fs * 1.9);
    const chartH = ih - valH - labH - 12;
    const colW = Math.max(8, Math.min(pitchV - GAP, fs * 3.2));
    return (
      <Shell ctx={ctx}>
        {probes}
        <Plate style={{position: 'absolute', inset: 0, padding: pad}}>
          <div dir={rtl ? 'rtl' : 'ltr'} style={{position: 'absolute', left: pad, top: pad, width: iw, height: valH + chartH, display: 'flex', columnGap: GAP, alignItems: 'flex-end'}}>
            {rows.map(({s, i}, k) => {
              const q = grownAt(k);
              const col = colorOf(s, i);
              const h = Math.max(0, (Math.abs(s.value.value) / vmax) * chartH * q);
              return (
                <div key={i} style={{width: pitchV - GAP, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', opacity: dim(i)}}>
                  <div style={{opacity: q > 0 ? 1 : 0, height: valH, display: 'flex', alignItems: 'center'}}>
                    <NumText id={`${ctx.id}:v${i}`} text={fmtNum(s.value, valueAt(s, k))} unit={s.value.unit} size={nfs} color={lit(i) ? col : C.ink} fx={ctx.fx} glowK={0.5 * lit(i)} style={ovl(fNum.overflow)} />
                  </div>
                  <div style={{width: colW, height: h, borderRadius: '8px 8px 2px 2px', background: `linear-gradient(0deg, ${tint(col, 0.45)}, ${col})`, boxShadow: edge(col, lit(i))}} />
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', left: pad, top: pad + valH + chartH, width: iw, height: 2, background: C.grid, opacity: baseIn}} />
          <div dir={rtl ? 'rtl' : 'ltr'} style={{position: 'absolute', left: pad, top: pad + valH + chartH + 12, width: iw, display: 'flex', columnGap: GAP, opacity: baseIn}}>
            {rows.map(({s, i}) => (
              <div key={i} style={{width: pitchV - GAP, display: 'flex', justifyContent: 'center', opacity: dim(i)}}>
                <Lbl id={`${ctx.id}:l${i}`} text={s.label} size={fs} color={lit(i) ? colorOf(s, i) : C.ink2} weight={lit(i) ? FONT.label.strong : undefined} style={ovl(fLab.overflow)} />
              </div>
            ))}
          </div>
        </Plate>
      </Shell>
    );
  }

  // horizontal bars: label column at the reading start, bars grow away from it, the value rides the bar end
  const fsRow = Math.max(LABEL_MIN, Math.min(fs, Math.floor(rowH / 1.6)));
  const widest = Math.max(...nums.map((s) => s.length));
  const valW = monoW('0'.repeat(widest), nfs) + 24;
  const barH = Math.max(10, Math.round(rowH * 0.42));
  return (
    <Shell ctx={ctx} style={{display: 'flex', alignItems: 'center'}}>
      {probes}
      <Plate style={{padding: pad, width: iw}}>
        <div dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flex', width: '100%', columnGap: 28, alignItems: 'center'}}>
          <div style={{display: 'flex', flexDirection: 'column', width: 'max-content'}}>
            {rows.map(({s, i}, k) => (
              <div key={i} style={{height: rowH, display: 'flex', alignItems: 'center', opacity: prog(ctx, ctx.at + stag(ctx, k), 'label') * dim(i)}}>
                <Lbl id={`${ctx.id}:l${i}`} text={s.label} size={fsRow} color={lit(i) ? colorOf(s, i) : C.ink2} weight={lit(i) ? FONT.label.strong : undefined} style={ovl(fLab.overflow)} />
              </div>
            ))}
          </div>
          <div style={{flex: 1, position: 'relative', borderInlineStart: `2px solid ${C.grid}`, opacity: baseIn}}>
            {rows.map(({s, i}, k) => {
              const q = grownAt(k);
              const col = colorOf(s, i);
              const frac = (Math.abs(s.value.value) / vmax) * q;
              return (
                <div key={i} style={{height: rowH, display: 'flex', alignItems: 'center', columnGap: 16, opacity: dim(i)}}>
                  <div style={{position: 'relative', width: `calc((100% - ${valW}px) * ${frac.toFixed(5)})`, height: barH, borderStartEndRadius: 8, borderEndEndRadius: 8, background: `linear-gradient(${rtl ? 270 : 90}deg, ${tint(col, 0.4)}, ${col})`, boxShadow: edge(col, lit(i))}} />
                  <div style={{opacity: q > 0 ? 1 : 0}}>
                    <NumText id={`${ctx.id}:v${i}`} text={fmtNum(s.value, valueAt(s, k))} unit={s.value.unit} size={nfs} color={lit(i) ? col : C.ink} fx={ctx.fx} glowK={0.5 * lit(i)} ca={lit(i) > 0} style={ovl(fNum.overflow)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Plate>
    </Shell>
  );
};

export const BarStack: DcComponent<Props> = {name: 'BarStack', Component: BarStackView, text: true, slot: 'center'};
