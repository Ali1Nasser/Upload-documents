// LineTrace (catalog: Data). Up to 4 line series drawn on anchors with point markers, on a glass plate. Math axes run LTR
// (numerals and x order read left -> right, 04 section 3.4), Arabic labels are set whole by the type engine.
// Draw: with `drawTo` actions the trace advances to each x over its anchor word (first step on the anchor frame, lands on the
// word end, at least the morph preset); without them the whole trace draws from the layer anchor over max(anchor word, 1 s).
// The leading point carries an emissive head. `markPoint` rings one point and shows its value (the series Num ref covers the
// points) plus the optional label. x ticks show the data x values (<= 10 distinct, else first / last); there are no invented
// y ticks: a y value appears only on a marked point. Series names sit at the line ends (stacked >= 1.5 em apart).
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {ColorToken} from '../../tokens';
import type {Props} from './schema';
import {C, GAP, LABEL_MIN, Lbl, NumText, Plate, SIZE, Shell, acts, flashAt, fmt, landOf, presetFrames, probeLabels, prog, revealProgress, roll, srcDecimals, tint, useFitProbe} from '../_data/kit';

const DEF_COL: ColorToken[] = ['signal', 'ink', 'ink2', 'ink3'];

export const LineTraceView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const ser = props.series;
  const allX = ser.flatMap((s) => s.points.map((p) => p[0]));
  const allY = ser.flatMap((s) => s.points.map((p) => p[1]));
  const x0 = Math.min(...allX);
  const x1 = Math.max(...allX, x0 + 1e-9);
  const y0 = Math.min(0, ...allY);
  const y1 = Math.max(...allY, y0 + 1e-9) * 1.06;
  const xDec = Math.max(0, ...allX.map(srcDecimals));
  const yDec = Math.max(0, ...allY.map(srcDecimals));

  // ---- fits ----
  const names = ser.map((s) => s.label);
  const fNames = useFitProbe(`${ctx.id}:names`, SIZE.label, W * 0.22, (fs) => probeLabels(names, fs), names.join('|'));
  const axisTxt = [props.x_label ?? '', props.y_label ?? ''].filter(Boolean);
  const fAxis = useFitProbe(`${ctx.id}:axes`, SIZE.label, W * 0.45, (fs) => probeLabels(axisTxt.length ? axisTxt : ['x'], fs), axisTxt.join('|'));
  const marks = acts(ctx, 'markPoint');
  const markTxt = marks.map((a) => (a.props.label as string | undefined) ?? '').filter(Boolean);
  const fMarks = useFitProbe(`${ctx.id}:marks`, SIZE.label, W * 0.3, (fs) => probeLabels(markTxt.length ? markTxt : ['x'], fs), markTxt.join('|'));
  const nfs = fNames.size;
  const afs = fAxis.size;
  const tfs = LABEL_MIN;

  // ---- layout ----
  const pad = 28;
  const mT = props.y_label ? Math.round(afs * 1.9) : Math.round(tfs * 1.2);
  const mB = Math.round(tfs * 1.8) + (props.x_label ? Math.round(afs * 1.7) : 0);
  const nameW = Math.max(...names.map((s) => s.length)) * nfs * 0.62 + GAP; // reserve: end labels never leave the plate
  const mL = 18;
  const mR = Math.min(W * 0.28, nameW);
  const pw = W - 2 * pad - mL - mR;
  const ph = H - 2 * pad - mT - mB;
  const px = (x: number) => pad + mL + ((x - x0) / (x1 - x0)) * pw;
  const py = (y: number) => pad + mT + ph - ((y - y0) / (y1 - y0)) * ph;

  // ---- draw head x ----
  const draws = acts(ctx, 'drawTo');
  let xd: number;
  if (!draws.length) {
    const land = ctx.at + Math.max(ctx.atEnd - ctx.at, 2 * presetFrames('morph', ctx.fps, true));
    xd = roll(t, ctx.at, land, x0, x1);
  } else {
    xd = x0;
    for (const a of draws) if (a.at <= t) xd = roll(t, a.at, landOf(ctx, a), xd, Math.max(x0, Math.min(x1, a.props.x as number)));
  }
  const axisIn = prog(ctx, ctx.at, 'label');

  const lineOf = (pts: [number, number][]) => {
    const out: string[] = [];
    let head: [number, number] | null = null;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (x <= xd) {
        out.push(`${px(x).toFixed(1)},${py(y).toFixed(1)}`);
        head = [x, y];
      } else {
        if (i > 0 && pts[i - 1][0] < xd) {
          const [xa, ya] = pts[i - 1];
          const yy = ya + ((y - ya) * (xd - xa)) / (x - xa);
          out.push(`${px(xd).toFixed(1)},${py(yy).toFixed(1)}`);
          head = [xd, yy];
        }
        break;
      }
    }
    return {d: out.join(' '), head};
  };

  // x ticks: the data x values (<= 10 distinct), else first and last
  const ux = [...new Set(allX)].sort((a, b) => a - b);
  const ticks = ux.length <= 10 ? ux : [x0, x1];
  const colOf = (k: number) => C[ser[k].color ?? DEF_COL[k] ?? 'signal'];

  // end labels: at each drawn head, pushed apart vertically by >= 1.5 em
  const heads = ser.map((s, k) => ({k, h: lineOf(s.points).head}));
  const ends = heads.filter((e) => e.h).map((e) => ({k: e.k, y: py((e.h as [number, number])[1]), x: px((e.h as [number, number])[0])}));
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < nfs * 1.5) ends[i].y = ends[i - 1].y + nfs * 1.5;

  return (
    <Shell ctx={ctx}>
      {fNames.probe}
      {fAxis.probe}
      {fMarks.probe}
      <Plate style={{position: 'absolute', inset: 0}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <g opacity={axisIn}>
          <line x1={px(x0)} x2={px(x1)} y1={py(y0)} y2={py(y0)} stroke={C.grid} strokeWidth={2} />
          <line x1={px(x0)} x2={px(x0)} y1={py(y0)} y2={pad + mT} stroke={C.grid} strokeWidth={2} />
          {ticks.map((x, i) => (
            <line key={i} x1={px(x)} x2={px(x)} y1={py(y0)} y2={pad + mT} stroke={tint(C.grid, 0.45)} strokeWidth={1} />
          ))}
        </g>
        {ser.map((s, k) => {
          const {d, head} = lineOf(s.points);
          if (!head) return null;
          const col = colOf(k);
          return (
            <g key={k}>
              <polyline points={d} fill="none" stroke={tint(col, 0.18)} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={d} fill="none" stroke={col} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              {s.points.length <= 40
                ? s.points.filter((p) => p[0] <= xd).map((p, i) => <circle key={i} cx={px(p[0])} cy={py(p[1])} r={5} fill={C.ground} stroke={col} strokeWidth={2.5} />)
                : null}
              {xd < x1 ? (
                <>
                  <circle cx={px(head[0])} cy={py(head[1])} r={14} fill={tint(col, 0.22 + 0.2 * ctx.mod.glow)} />
                  <circle cx={px(head[0])} cy={py(head[1])} r={6} fill={col} />
                </>
              ) : null}
            </g>
          );
        })}
        {marks.map((a, j) => {
          if (a.at > t) return null;
          const s = ser[Math.min(ser.length - 1, a.props.series as number)];
          const p = s.points[Math.min(s.points.length - 1, a.props.index as number)];
          const q = revealProgress(t - a.at, presetFrames('impact', ctx.fps, true));
          const fl = flashAt(ctx, a.at);
          const col = colOf(ser.indexOf(s));
          return (
            <g key={`m${j}`}>
              <circle cx={px(p[0])} cy={py(p[1])} r={10 + 10 * q} fill="none" stroke={col} strokeWidth={3} opacity={q} />
              <circle cx={px(p[0])} cy={py(p[1])} r={22 + 10 * fl} fill={tint(col, 0.12 + 0.2 * fl)} opacity={q} />
            </g>
          );
        })}
      </svg>
      {/* x ticks (data x values) */}
      {ticks.map((x, i) => (
        <div key={`t${i}`} style={{position: 'absolute', top: py(y0) + 8, left: px(x), transform: 'translateX(-50%)', opacity: axisIn}}>
          <NumText id={`${ctx.id}:x${i}`} text={fmt(x, xDec)} size={tfs} color={C.ink3} />
        </div>
      ))}
      {props.x_label ? (
        <div style={{position: 'absolute', top: py(y0) + tfs * 1.6, right: pad + mR, opacity: axisIn}}>
          <Lbl id={`${ctx.id}:xl`} text={props.x_label} size={afs} color={C.ink2} overflow={fAxis.overflow} />
        </div>
      ) : null}
      {props.y_label ? (
        <div style={{position: 'absolute', top: pad, left: px(x0), opacity: axisIn}}>
          <Lbl id={`${ctx.id}:yl`} text={props.y_label} size={afs} color={C.ink2} overflow={fAxis.overflow} />
        </div>
      ) : null}
      {/* series names at the line ends */}
      {ends.map((e) => (
        <div key={`n${e.k}`} style={{position: 'absolute', left: Math.min(e.x + 18, W - pad - mR + 18), top: e.y, transform: 'translateY(-50%)'}}>
          <Lbl id={`${ctx.id}:s${e.k}`} text={ser[e.k].label} size={nfs} color={colOf(e.k)} overflow={fNames.overflow} />
        </div>
      ))}
      {/* marked points: value (Num ref of the series) + optional label, above the point, kept inside the plot */}
      {marks.map((a, j) => {
        if (a.at > t) return null;
        const s = ser[Math.min(ser.length - 1, a.props.series as number)];
        const p = s.points[Math.min(s.points.length - 1, a.props.index as number)];
        const q = revealProgress(t - a.at, presetFrames('label', ctx.fps));
        const col = colOf(ser.indexOf(s));
        const lab = a.props.label as string | undefined;
        const left = Math.max(pad + mL, Math.min(px(p[0]) - 20, W - pad - mR - 260));
        const top = py(p[1]) - (lab ? fMarks.size * 1.5 : 0) - tfs * 2.6;
        return (
          <div key={`ml${j}`} style={{position: 'absolute', left, top: Math.max(pad, top), opacity: q, display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
            {lab ? <Lbl id={`${ctx.id}:ml${j}`} text={lab} size={fMarks.size} color={col} overflow={fMarks.overflow} /> : null}
            <NumText id={`${ctx.id}:mv${j}`} text={fmt(p[1], yDec)} size={Math.round(SIZE.body * 1.1)} color={col} fx={ctx.fx} glowK={0.5 + flashAt(ctx, a.at)} ca />
          </div>
        );
      })}
    </Shell>
  );
};

export const LineTrace: DcComponent<Props> = {name: 'LineTrace', Component: LineTraceView, text: true, slot: 'center'};
