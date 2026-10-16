// BarStack (catalog: Data; 04 section 6 "baseline vs model bars", "next-token probability bars", "bars reshape with the dial").
// Single bars (orientation h | v) or one stacked bar with a legend, on token colours; every value is a Num with its ref.
// RTL when a label is Arabic: the label column sits on the right and horizontal bars grow right -> left (TableGrid rule).
// Motion: bars grow from zero, staggered 2 film frames, on the first `grow` action (else on the layer anchor) and LAND on that
// anchor word's end (at least 2 x arrive); the value rolls with its bar (count preset, RV1 first step on the anchor frame).
// `highlight` (state change, 04 section 4) lights one bar in a token colour with an emissive edge and dims the others.
// `sort` changes the display order only. Labels and values auto-fit as sets (28 px floor; overflow = DC_QA, crit outline).
// Depth + light (ADR-003 LK-F, 04 section 1.2): bars are raised glass blocks (lit top face, darker lower face, rim light on the
// upper edge, emissive end cap) standing on a glass slab, each throws a coloured pool on the floor under it, a faint track shows
// the zero-to-max scale and a dashed reference line at the longest bar makes the gap to the others readable (no derived number).
// `highlight` also sets a glass lens (tinted outline) around the row / column. 2.5D CSS only, no WebGL, no filter blur: the same
// render at every FX tier (tiers change glow radius, grain and CA only), so hero equals standard.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {ColorToken} from '../../tokens';
import type {Props} from './schema';
import {C, FONT, GAP, LABEL_MIN, Lbl, NumText, SIZE, Shell, acts, fmtNum, landLayer, landOf, lastAct, monoW, presetFrames, probeLabels, probeNums, prog, revealProgress, roll, rtlOf, stag, tint, useFitProbe} from '../_data/kit';

type S = Props['series'][number];

/**
 * Glass slab: a plain gradient backing (no blurred drop shadow: a 60 px shadow under a group made the first-render raster
 * non-deterministic, see WindowFrame) with a rim-lit edge; fades in on its own leaf element, never as a group opacity.
 */
const Slab: React.FC<{q: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({q, style, children}) => (
  <div style={{position: 'relative', isolation: 'isolate', ...style}}>
    <div style={{position: 'absolute', inset: 0, zIndex: -1, opacity: q, borderRadius: 18, background: `linear-gradient(180deg, ${C.panel}E6 0%, ${C.ground}D9 100%)`, border: `1px solid ${C.grid}`, boxShadow: `inset 0 1px 0 ${C.ink}26, inset 0 0 0 1px ${C.signal}14`}} />
    {children}
  </div>
);

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
  const rowH = Math.min(Math.floor(ih / n), Math.round(SIZE.body * (n <= 3 ? 3.6 : 2.8)));
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

  /** Raised block face: lit top half over a darker lower half, rim light on the leading edge. */
  const face = (col: string, deg: number): string => `linear-gradient(${deg}deg, ${tint(col, 0.55)} 0%, ${col} 100%)`;
  const lensOf = (i: number, r: number): React.CSSProperties => {
    const c = colorOf(props.series[i], i);
    return {position: 'absolute', borderRadius: r, border: `2px solid ${tint(c, 0.7 * lit(i))}`, background: tint(c, 0.09 * lit(i)), boxShadow: lit(i) > 0 ? `0 0 ${(ctx.fx.glowPx * 0.5 * lit(i)).toFixed(1)}px ${tint(c, 0.35)}` : undefined, pointerEvents: 'none'};
  };
  const pool = (col: string, q: number, k: number): React.CSSProperties => ({position: 'absolute', background: `radial-gradient(ellipse at 50% 50%, ${tint(col, Math.min(0.5, 0.3 * q + 0.2 * k))} 0%, ${tint(col, 0)} 70%)`, pointerEvents: 'none'});
  const maxI = vals.reduce((b, v, i) => (Math.abs(v) > Math.abs(vals[b]) ? i : b), 0);
  const maxK = rows.findIndex((r) => r.i === maxI);
  const refLine = n > 1 && !props.stacked;

  if (props.stacked) {
    const barT = Math.round(Math.min(horiz ? ih * 0.26 : iw * 0.2, SIZE.body * 3.2));
    let acc = 0;
    const segs = rows.map(({s, i}, k) => {
      const f = Math.max(0, s.value.value) / vmax;
      const seg = {s, i, k, off: acc, f};
      acc += f;
      return seg;
    });
    const gq = grownAt(0);
    const front = Math.min(1, gq); // fill front of the whole bar (0..1)
    const frontCol = colorOf(segs[Math.max(0, segs.findIndex((g) => g.off + g.f >= front))]?.s ?? segs[0].s, segs[0].i);
    return (
      <Shell ctx={ctx} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {probes}
        <Slab q={baseIn} style={{padding: pad, display: 'flex', flexDirection: horiz ? 'column' : rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: GAP, width: horiz ? iw : undefined, height: horiz ? undefined : ih}}>
          <div style={{position: 'relative', width: horiz ? '100%' : barT, height: horiz ? barT : '100%'}}>
            <div style={{...pool(frontCol, gq, 0), left: horiz ? '4%' : -barT * 0.6, right: horiz ? '4%' : undefined, width: horiz ? undefined : barT * 2.2, top: horiz ? barT * 0.72 : '4%', bottom: horiz ? undefined : '4%', height: horiz ? barT * 0.7 : undefined}} />
            <div style={{position: 'absolute', inset: 0, background: tint(C.grid, 0.7), borderRadius: 12, overflow: 'hidden', border: `1px solid ${tint(C.ink, 0.1)}`}}>
              {segs.map(({s, i, off, f}) => {
                const shown = Math.max(0, Math.min(f, gq - off)); // segments fill in order as the bar grows
                const col = colorOf(s, i);
                const pos = `${(off * 100).toFixed(3)}%`;
                const len = `${(shown * 100).toFixed(3)}%`;
                const geo: React.CSSProperties = horiz ? {top: 0, bottom: 0, [rtl ? 'right' : 'left']: pos, width: len} : {left: 0, right: 0, bottom: pos, height: len};
                return <div key={i} style={{position: 'absolute', ...geo, background: face(col, horiz ? 0 : 90), opacity: dim(i), borderInlineEnd: `2px solid ${C.void}`, boxShadow: edge(col, lit(i))}} />;
              })}
              <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: Math.round(barT * 0.32), background: `linear-gradient(180deg, ${tint(C.white, 0.22)}, ${tint(C.white, 0)})`}} />
            </div>
          </div>
          <div dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: GAP, rowGap: Math.round(fs * 0.4), maxWidth: iw}}>
            {segs.map(({s, i, k}) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: Math.round(fs * 0.4), opacity: prog(ctx, g0 + stag(ctx, k), 'label') * dim(i)}}>
                <div style={{width: Math.round(fs * 0.55), height: Math.round(fs * 0.55), borderRadius: 4, background: colorOf(s, i), boxShadow: lit(i) ? edge(colorOf(s, i), lit(i)) : undefined}} />
                <Lbl id={`${ctx.id}:l${i}`} text={s.label} size={fs} color={lit(i) ? colorOf(s, i) : C.ink2} style={ovl(fLab.overflow)} />
                <NumText id={`${ctx.id}:v${i}`} text={fmtNum(s.value)} unit={s.value.unit} size={nfs} color={C.ink} style={ovl(fNum.overflow)} />
              </div>
            ))}
          </div>
        </Slab>
      </Shell>
    );
  }

  if (!horiz) {
    // vertical columns: value on top, label underneath; reading order follows the labels
    const valH = Math.round(nfs * 1.5);
    const labH = Math.round(fs * 1.9);
    const chartH = ih - valH - labH - 12;
    const colW = Math.max(8, Math.min(pitchV - GAP, fs * 3.4));
    const top0 = pad + valH;
    return (
      <Shell ctx={ctx}>
        {probes}
        <Slab q={baseIn} style={{position: 'absolute', inset: 0}} />
        <div dir={rtl ? 'rtl' : 'ltr'} style={{position: 'absolute', left: pad, top: pad, width: iw, height: valH + chartH, display: 'flex', columnGap: GAP, alignItems: 'flex-end'}}>
          {rows.map(({s, i}, k) => {
            const q = grownAt(k);
            const col = colorOf(s, i);
            const h = Math.max(0, (Math.abs(s.value.value) / vmax) * chartH * q);
            return (
              <div key={i} style={{position: 'relative', width: pitchV - GAP, height: valH + chartH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', opacity: dim(i)}}>
                <div style={{...pool(col, q, lit(i)), left: '50%', marginLeft: -colW * 0.95, width: colW * 1.9, bottom: -Math.round(colW * 0.2), height: Math.round(colW * 0.4)}} />
                <div style={{opacity: q > 0 ? 1 : 0, height: valH, display: 'flex', alignItems: 'center'}}>
                  <NumText id={`${ctx.id}:v${i}`} text={fmtNum(s.value, valueAt(s, k))} unit={s.value.unit} size={nfs} color={lit(i) ? col : C.ink} fx={ctx.fx} glowK={0.5 * lit(i)} style={ovl(fNum.overflow)} />
                </div>
                <div style={{position: 'relative', width: colW, height: chartH, display: 'flex', alignItems: 'flex-end'}}>
                  <div style={{position: 'absolute', inset: 0, borderRadius: '8px 8px 2px 2px', background: tint(C.grid, 0.55), opacity: baseIn}} />
                  <div style={{position: 'relative', width: colW, height: h, borderRadius: '8px 8px 2px 2px', background: face(col, 0), boxShadow: edge(col, lit(i)), borderTop: h > 2 ? `2px solid ${tint(C.white, 0.35)}` : undefined}}>
                    <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, width: '26%', background: `linear-gradient(90deg, ${tint(C.white, 0.2)}, ${tint(C.white, 0)})`, borderRadius: '8px 0 0 2px'}} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {refLine ? <div style={{position: 'absolute', left: pad, top: top0, width: iw, borderTop: `2px dashed ${tint(C.ink3, 0.55 * grownAt(maxK))}`, pointerEvents: 'none'}} /> : null}
        {hlIdx >= 0 ? (() => { const k = rows.findIndex((r) => r.i === hlIdx); return <div style={{...lensOf(hlIdx, 14), left: pad + (rtl ? n - 1 - k : k) * pitchV - GAP / 2, top: pad - 6, width: pitchV, height: valH + chartH + labH + 18}} />; })() : null}
        <div style={{position: 'absolute', left: pad, top: top0 + chartH, width: iw, height: 2, background: C.grid, opacity: baseIn}} />
        <div dir={rtl ? 'rtl' : 'ltr'} style={{position: 'absolute', left: pad, top: top0 + chartH + 12, width: iw, display: 'flex', columnGap: GAP, opacity: baseIn}}>
          {rows.map(({s, i}) => (
            <div key={i} style={{width: pitchV - GAP, display: 'flex', justifyContent: 'center', opacity: dim(i)}}>
              <Lbl id={`${ctx.id}:l${i}`} text={s.label} size={fs} color={lit(i) ? colorOf(s, i) : C.ink2} weight={lit(i) ? FONT.label.strong : undefined} style={ovl(fLab.overflow)} />
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // horizontal bars: label column at the reading start, bars grow away from it, the value rides the bar end
  const fsRow = Math.max(LABEL_MIN, Math.min(fs, Math.floor(rowH / 1.6)));
  const widest = Math.max(...nums.map((s) => s.length));
  const valW = monoW('0'.repeat(widest), nfs) + 24;
  const barH = Math.max(10, Math.round(rowH * 0.46));
  const lensK = hlIdx >= 0 ? rows.findIndex((r) => r.i === hlIdx) : -1;
  return (
    <Shell ctx={ctx} style={{display: 'flex', alignItems: 'center'}}>
      {probes}
      <Slab q={baseIn} style={{padding: pad, width: iw}}>
        <div dir={rtl ? 'rtl' : 'ltr'} style={{position: 'relative', display: 'flex', width: '100%', columnGap: 28, alignItems: 'center'}}>
          {lensK >= 0 ? <div style={{...lensOf(hlIdx, 14), left: -14, right: -14, top: lensK * rowH + 3, height: rowH - 6}} /> : null}
          <div style={{display: 'flex', flexDirection: 'column', width: 'max-content', position: 'relative'}}>
            {rows.map(({s, i}, k) => (
              <div key={i} style={{height: rowH, display: 'flex', alignItems: 'center', opacity: prog(ctx, ctx.at + stag(ctx, k), 'label') * dim(i)}}>
                <Lbl id={`${ctx.id}:l${i}`} text={s.label} size={fsRow} color={lit(i) ? colorOf(s, i) : C.ink2} weight={lit(i) ? FONT.label.strong : undefined} style={ovl(fLab.overflow)} />
              </div>
            ))}
          </div>
          <div style={{flex: 1, position: 'relative', borderInlineStart: `2px solid ${C.grid}`}}>
            {refLine ? <div style={{position: 'absolute', top: 0, bottom: 0, insetInlineStart: `calc((100% - ${valW}px) * ${(Math.abs(vals[maxI]) / vmax).toFixed(5)})`, borderInlineStart: `2px dashed ${tint(C.ink3, 0.55 * grownAt(maxK))}`}} /> : null}
            {rows.map(({s, i}, k) => {
              const q = grownAt(k);
              const col = colorOf(s, i);
              const frac = (Math.abs(s.value.value) / vmax) * q;
              const trackW = `calc(100% - ${valW}px)`;
              const barW = `calc((100% - ${valW}px) * ${frac.toFixed(5)})`;
              return (
                <div key={i} style={{height: rowH, position: 'relative', display: 'flex', alignItems: 'center', columnGap: 16, opacity: dim(i)}}>
                  <div style={{...pool(col, q, lit(i)), insetInlineStart: 0, width: barW, top: '50%', marginTop: barH * 0.32, height: Math.round(barH * 0.8)}} />
                  <div style={{position: 'absolute', insetInlineStart: 0, width: trackW, height: barH, top: '50%', marginTop: -barH / 2, borderStartEndRadius: 8, borderEndEndRadius: 8, background: tint(C.grid, 0.5)}} />
                  <div style={{position: 'relative', width: barW, height: barH, borderStartEndRadius: 8, borderEndEndRadius: 8, background: face(col, 180), borderTop: q > 0 ? `2px solid ${tint(C.white, 0.35)}` : undefined, boxShadow: edge(col, lit(i))}}>
                    <div style={{position: 'absolute', insetInlineEnd: 0, top: 0, bottom: 0, width: 6, background: tint(C.white, 0.55), borderStartEndRadius: 8, borderEndEndRadius: 8, opacity: q > 0 ? 1 : 0}} />
                  </div>
                  <div style={{opacity: q > 0 ? 1 : 0, position: 'relative'}}>
                    <NumText id={`${ctx.id}:v${i}`} text={fmtNum(s.value, valueAt(s, k))} unit={s.value.unit} size={nfs} color={lit(i) ? col : C.ink} fx={ctx.fx} glowK={0.5 * lit(i)} ca={lit(i) > 0} style={ovl(fNum.overflow)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Slab>
    </Shell>
  );
};

export const BarStack: DcComponent<Props> = {name: 'BarStack', Component: BarStackView, text: true, slot: 'center'};
