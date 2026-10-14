// ConfusionTiles (catalog: Data; 04 section 6 "Model families & evaluation": confusion tiles, precision/recall trade).
// A 2 x 2 matrix of glass tiles: columns = predicted (positive | negative), rows = actual (positive | negative); TP / FN / FP / TN
// tags are Latin (the only copy besides the two props labels, so no Arabic is ever set outside the props). Correct cells glow ok,
// a false positive warns, a false negative is crit (semantic colours, 04 section 1.1); the tile fill follows its share of the
// total. Each tile arrives staggered on the label preset from the layer anchor and its number rolls (count preset: first step on
// the anchor frame, lands on the anchor word end). `focus` (state change, anchored on the word that names the cell) lifts one
// tile with an emissive edge and dims the other three. RTL when the labels are Arabic: the first column / row header is on the
// right. Every number is the prop's Num (value + ref); no derived metric is shown.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {ColorToken} from '../../tokens';
import type {Props} from './schema';
import {C, Lbl, NumText, Plate, SIZE, Shell, fmtNum, landLayer, lastAct, presetFrames, probeLabels, probeNums, prog, revealProgress, roll, rtlOf, stag, tint, useFitProbe} from '../_data/kit';

type Cell = 'tp' | 'fp' | 'fn' | 'tn';
const TAG: Record<Cell, string> = {tp: 'TP', fp: 'FP', fn: 'FN', tn: 'TN'};
const COLOR: Record<Cell, ColorToken> = {tp: 'ok', tn: 'ok', fp: 'warn', fn: 'crit'};

export const ConfusionTilesView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const rtl = rtlOf(props.positive, props.negative);
  const pad = 28;
  const gap = 20;
  const cells: Cell[][] = [
    ['tp', 'fn'], // actual positive: predicted positive | predicted negative
    ['fp', 'tn'],
  ];
  const total = Math.max(1e-9, props.tp.value + props.fp.value + props.fn.value + props.tn.value);
  const foc = lastAct(ctx, 'focus');
  const focCell = foc ? (foc.props.cell as Cell) : null;
  const focQ = foc ? revealProgress(t - foc.at, presetFrames('impact', ctx.fps, true)) : 0;
  const land = landLayer(ctx);

  const rhW = Math.round(W * 0.2); // row-header column
  const headH = Math.round(SIZE.label * 3.2); // PREDICTED tag + column headers
  const tileW = Math.floor((W - 2 * pad - rhW - gap * 2) / 2);
  const gx0 = rtl ? pad : pad + rhW + gap; // grid left edge (the row-header column sits at the reading start)
  const tileH = Math.floor((H - 2 * pad - headH - gap) / 2);
  const labels = [props.positive, props.negative];
  const fLab = useFitProbe(`${ctx.id}:labels`, SIZE.body, Math.min(tileW, rhW) - 8, (fs) => probeLabels(labels, fs), labels.join('|'));
  const nums = (['tp', 'fp', 'fn', 'tn'] as Cell[]).map((k) => fmtNum(props[k]) + (props[k].unit ? ` ${props[k].unit}` : ''));
  const fNum = useFitProbe(`${ctx.id}:nums`, SIZE.numberBig, tileW * 0.86, (fs) => probeNums(nums, fs), nums.join('|'), {min: Math.round(SIZE.numberBig * 0.4)});
  const nfs = Math.min(fNum.size, Math.floor(tileH * 0.46)); // one number per tile (the probe stacks the four)
  const tagFs = SIZE.labelMin;
  const colX = (j: number) => gx0 + (rtl ? 1 - j : j) * (tileW + gap); // RTL: column 0 on the right
  const rowHeadX = rtl ? W - pad - rhW : pad;
  const headIn = prog(ctx, ctx.at, 'label');

  return (
    <Shell ctx={ctx}>
      {fLab.probe}
      {fNum.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: headIn}} />
      {/* column headers: predicted positive | negative */}
      <div style={{position: 'absolute', left: gx0, width: 2 * tileW + gap, top: pad, textAlign: 'center', opacity: headIn}}>
        <Lbl id={`${ctx.id}:pred`} text="PREDICTED" size={tagFs} color={C.ink3} style={{margin: '0 auto'}} />
      </div>
      {labels.map((l, j) => (
        <div key={`ch${j}`} style={{position: 'absolute', left: colX(j), width: tileW, top: pad + Math.round(tagFs * 1.7), display: 'flex', justifyContent: 'center', opacity: prog(ctx, ctx.at + stag(ctx, j, 1), 'label')}}>
          <Lbl id={`${ctx.id}:c${j}`} text={l} size={fLab.size} color={C.ink} weight={600} overflow={fLab.overflow} />
        </div>
      ))}
      <div style={{position: 'absolute', left: rowHeadX, width: rhW, top: pad + Math.round(tagFs * 0.4), display: 'flex', justifyContent: 'center', opacity: headIn}}>
        <Lbl id={`${ctx.id}:act`} text="ACTUAL" size={tagFs} color={C.ink3} />
      </div>
      {labels.map((l, i) => (
        <div key={`rh${i}`} style={{position: 'absolute', left: rowHeadX, width: rhW, top: pad + headH + i * (tileH + gap), height: tileH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: prog(ctx, ctx.at + stag(ctx, i, 1), 'label')}}>
          <Lbl id={`${ctx.id}:r${i}`} text={l} size={fLab.size} color={C.ink} weight={600} overflow={fLab.overflow} />
        </div>
      ))}
      {cells.map((row, i) =>
        row.map((k, j) => {
          const order = i * 2 + j;
          const t0 = ctx.at + stag(ctx, order, 3);
          const q = prog(ctx, t0, 'arrive');
          const num = props[k];
          const col = C[COLOR[k]];
          const share = Math.max(0, num.value) / total;
          const isF = focCell === k;
          const dim = focCell && !isF ? 1 - 0.6 * focQ : 1;
          const lift = isF ? focQ : 0;
          const v = roll(t, t0, land + stag(ctx, order, 3), 0, num.value);
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: colX(j),
                top: pad + headH + i * (tileH + gap),
                width: tileW,
                height: tileH,
                borderRadius: 16,
                background: `linear-gradient(160deg, ${tint(col, 0.1 + 0.34 * Math.sqrt(share))}, ${tint(C.panel, 0.92)})`,
                border: `2px solid ${tint(col, 0.35 + 0.65 * lift)}`,
                boxShadow: `inset 0 1px 0 ${tint(C.white, 0.12)}, 0 0 ${(ctx.fx.glowPx * (0.35 + 0.65 * lift)).toFixed(1)}px ${tint(col, 0.22 + 0.4 * lift)}`,
                opacity: q * dim,
                transform: `translateY(${((1 - q) * 6).toFixed(2)}px) scale(${(1 + 0.04 * lift).toFixed(4)})`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Math.round(nfs * 0.06),
              }}
            >
              <div style={{position: 'absolute', top: 12, [rtl ? 'right' : 'left']: 18}}>
                <Lbl id={`${ctx.id}:t${k}`} text={TAG[k]} size={tagFs} color={col} weight={600} />
              </div>
              <NumText id={`${ctx.id}:n${k}`} text={fmtNum(num, v)} unit={num.unit} size={nfs} color={C.ink} fx={ctx.fx} glowK={0.35 + 0.8 * lift + ctx.mod.glow} ca />
            </div>
          );
        }),
      )}
    </Shell>
  );
};

export const ConfusionTiles: DcComponent<Props> = {name: 'ConfusionTiles', Component: ConfusionTilesView, text: true, slot: 'center'};
