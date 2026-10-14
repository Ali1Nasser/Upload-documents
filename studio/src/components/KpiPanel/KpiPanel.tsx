// KpiPanel (catalog: Data; 04 section 6 "Semantic model & report", "DataCube reporting": a panel of 1-6 KPIs with status colours).
// One glass card per KPI on a grid (1: 1x1, 2: 2x1, 3: 3x1, 4: 2x2, 5-6: 3x2). RTL when a label is Arabic: the first card is on
// the right. A card = status accent (idle ink3 / active signal / ok / warn / fail crit, semantic only), the label, the value in big
// mono tabular figures with its unit in one LTR isolate, and an optional delta (triangle + signed number). Cards arrive staggered
// (arrive preset) from the layer anchor and their values roll (count preset: first step on the anchor frame, lands on the anchor
// word end, staggered by the card). `update` (state change on its word) rolls one card from its current value to the new one over
// the action's word and flashes it. Every number is the prop's Num (value + ref); nothing is derived.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, Lbl, NumText, Plate, SIZE, Shell, STATUS, acts, flashAt, fmt, fmtNum, landLayer, landOf, probeLabels, probeNums, prog, roll, rtlOf, srcDecimals, stag, tint, useFitProbe} from '../_data/kit';

export const KpiPanelView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const kp = props.kpis;
  const n = kp.length;
  const rtl = rtlOf(...kp.map((k) => k.label));
  const cols = n === 1 ? 1 : n === 2 ? 2 : n === 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const gap = 28;
  const cw = Math.floor((W - gap * (cols - 1)) / cols);
  const ch = Math.min(Math.floor((H - gap * (rows - 1)) / rows), Math.round(cw * 0.9));
  const gridH = rows * ch + (rows - 1) * gap;
  const ups = acts(ctx, 'update');
  const land = landLayer(ctx);
  const upsOf = (i: number) => ups.filter((a) => (a.props.index as number) === i);

  const labels = kp.map((k) => k.label);
  const fLab = useFitProbe(`${ctx.id}:labels`, SIZE.body, cw - 2 * 28 - 40, (fs) => probeLabels(labels, fs), labels.join('|'));
  const texts = kp.flatMap((k, i) => [fmtNum(k.value) + (k.value.unit ? ` ${k.value.unit}` : ''), ...upsOf(i).map((a) => fmt((a.props.value as {value: number}).value, k.value.decimals ?? srcDecimals((a.props.value as {value: number}).value)))]);
  const fNum = useFitProbe(`${ctx.id}:vals`, SIZE.numberBig, cw - 2 * 28, (fs) => probeNums(texts, fs), texts.join('|'), {min: Math.round(SIZE.numberBig * 0.4)});
  const vfs = Math.min(fNum.size, Math.floor(ch * 0.3)); // one value per card (the probe stacks them all)
  const dTexts = kp.filter((k) => k.delta).map((k) => `▲ ${fmtNum(k.delta!)}`);
  const fDel = useFitProbe(`${ctx.id}:deltas`, SIZE.label, cw - 2 * 28, (fs) => probeNums(dTexts.length ? dTexts : ['0'], fs), dTexts.join('|'));

  return (
    <Shell ctx={ctx} style={{display: 'flex', alignItems: 'center'}}>
      {fLab.probe}
      {fNum.probe}
      {fDel.probe}
      <div dir={rtl ? 'rtl' : 'ltr'} style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cw}px)`, gridAutoRows: ch, gap, width: W, height: gridH}}>
        {kp.map((k, i) => {
          const t0 = ctx.at + stag(ctx, i, 3);
          const q = prog(ctx, t0, 'arrive');
          const col = C[STATUS[k.status ?? 'active']];
          const myUps = upsOf(i);
          const dec = Math.max(k.value.decimals ?? srcDecimals(k.value.value), ...myUps.map((a) => srcDecimals((a.props.value as {value: number}).value)));
          // value timeline: initial roll, then one roll per update (each over its own anchor word)
          let v = roll(t, t0, land + stag(ctx, i, 3), 0, k.value.value);
          let cur = k.value.value;
          let flashT: number | null = t >= land + stag(ctx, i, 3) ? land + stag(ctx, i, 3) : null;
          for (const a of myUps) {
            const to = (a.props.value as {value: number}).value;
            if (a.at <= t) {
              v = roll(t, a.at, landOf(ctx, a), cur, to);
              flashT = t >= landOf(ctx, a) ? landOf(ctx, a) : a.at;
            }
            cur = to;
          }
          const fl = flashAt(ctx, flashT);
          const dl = k.delta;
          const up = !!dl && dl.value >= 0;
          return (
            <div key={i} style={{position: 'relative', opacity: q, transform: `translateY(${((1 - q) * 8).toFixed(2)}px)`}}>
              <Plate accent={col} style={{width: cw, height: ch, borderRadius: 18, boxShadow: `inset 0 1px 0 ${tint(C.ink, 0.1)}, 0 0 ${(ctx.fx.glowPx * (0.3 + 0.9 * fl)).toFixed(1)}px ${tint(col, 0.18 + 0.4 * fl)}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: Math.round(vfs * 0.1)}}>
                <div style={{position: 'absolute', top: 0, bottom: 0, [rtl ? 'right' : 'left']: 0, width: 8, background: `linear-gradient(180deg, ${col}, ${tint(col, 0.35)})`, boxShadow: `0 0 ${ctx.fx.glowInner}px ${tint(col, 0.7)}`}} />
                <Lbl id={`${ctx.id}:l${i}`} text={k.label} size={fLab.size} color={C.ink2} overflow={fLab.overflow} />
                <NumText id={`${ctx.id}:v${i}`} text={fmt(v, dec)} unit={k.value.unit} size={vfs} color={C.ink} fx={ctx.fx} glowK={0.3 + 0.9 * fl + ctx.mod.glow} ca />
                {dl ? (
                  <div style={{display: 'flex', alignItems: 'center', gap: 12, direction: 'ltr', opacity: prog(ctx, t0 + stag(ctx, 1, 4), 'label')}}>
                    <svg width={Math.round(fDel.size * 0.7)} height={Math.round(fDel.size * 0.6)} viewBox="0 0 10 8" style={{transform: up ? undefined : 'scaleY(-1)'}}>
                      <polygon points="5,0 10,8 0,8" fill={C.ink2} />
                    </svg>
                    <NumText id={`${ctx.id}:d${i}`} text={fmtNum(dl, Math.abs(dl.value))} unit={dl.unit} size={fDel.size} color={C.ink2} />
                  </div>
                ) : null}
              </Plate>
            </div>
          );
        })}
      </div>
    </Shell>
  );
};

export const KpiPanel: DcComponent<Props> = {name: 'KpiPanel', Component: KpiPanelView, text: true, slot: 'center'};
