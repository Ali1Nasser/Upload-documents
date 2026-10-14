// Distribution (catalog: Data; 04 section 6 "Statistics": a distribution builds from the spoken numbers; CI = shaded interval).
// A density curve on a glass plate, math axis LTR. Parametric kinds live in standard units (z, x in [-4, 4], height normalised to
// the tallest point): normal, skewed (right-skew-normal), bimodal (two modes at -1.6 / 1.6), uniform (plateau on [-2.5, 2.5]),
// long-tail (log-normal, mode at the left, long right tail). `empirical` draws a histogram (Sturges bins) and a Gaussian-kernel
// density (Silverman bandwidth) of `values` in the data's own units. `markers.at_value` is in the same units as the axis. The
// curve draws left -> right from the layer anchor (lands on the anchor word end, at least 2 x the morph preset); markers (a
// dashed rule up to the curve and a label chip, two staggered levels so labels stay >= 40 px apart) appear as the curve passes
// them. `shade` (state change on its word) fills the area between lo and hi, wiping from lo to hi, and prints the area share of
// that interval (derived by numeric integration of the drawn density: arithmetic on the curve, 0 decimals). The single `ref`
// covers the distribution. No axis numerals are drawn (the axis is a scale, not a claim): spoken values are the markers.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, GAP, Lbl, NumText, Plate, SIZE, Shell, flashAt, landLayer, landOf, lastAct, presetFrames, probeLabels, prog, roll, tint, useFitProbe} from '../_data/kit';

const N = 240;
const SQ = Math.sqrt(2 * Math.PI);
const phi = (x: number, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * SQ);
// Abramowitz-Stegun erf (deterministic, no Math.random)
const erf = (x: number) => {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
};
const Phi = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
const smooth = (a: number, b: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

type Curve = {xs: number[]; ys: number[]; lo: number; hi: number; bars?: {x0: number; x1: number; h: number}[]};

export const curveOf = (p: Props): Curve => {
  if (p.kind === 'empirical' && p.values && p.values.length >= 2) {
    const v = [...p.values].sort((a, b) => a - b);
    const n = v.length;
    const mean = v.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)) || 1;
    const bw = 1.06 * sd * n ** -0.2;
    const lo = v[0] - 2 * bw;
    const hi = v[n - 1] + 2 * bw;
    const xs = Array.from({length: N + 1}, (_, i) => lo + ((hi - lo) * i) / N);
    const ys = xs.map((x) => v.reduce((a, b) => a + phi(x, b, bw), 0) / n);
    const k = Math.max(3, Math.ceil(Math.log2(n) + 1));
    const w = (v[n - 1] - v[0] || 1) / k;
    const cnt = Array.from({length: k}, () => 0);
    for (const x of v) cnt[Math.min(k - 1, Math.floor((x - v[0]) / w))]++;
    const dens = cnt.map((c) => c / (n * w));
    const top = Math.max(...ys, ...dens);
    return {xs, ys: ys.map((y) => y / top), lo, hi, bars: dens.map((d, i) => ({x0: v[0] + i * w, x1: v[0] + (i + 1) * w, h: d / top}))};
  }
  const lo = -4;
  const hi = 4;
  const xs = Array.from({length: N + 1}, (_, i) => lo + ((hi - lo) * i) / N);
  const f = (x: number): number => {
    switch (p.kind) {
      case 'skewed':
        return 2 * phi(x) * Phi(4 * x);
      case 'bimodal':
        return 0.5 * phi(x, -1.6, 0.6) + 0.5 * phi(x, 1.6, 0.6);
      case 'uniform':
        return smooth(-2.65, -2.5, x) * (1 - smooth(2.5, 2.65, x));
      case 'long-tail': {
        const u = (x + 4) * 0.75 + 1e-6;
        return Math.exp(-0.5 * (Math.log(u) / 0.9) ** 2) / (u * 0.9 * SQ);
      }
      default:
        return phi(x);
    }
  };
  const ys = xs.map(f);
  const top = Math.max(...ys);
  return {xs, ys: ys.map((y) => y / top), lo, hi};
};

/** Share (0..1) of the total area between a and b (trapezoid over the sampled density). */
export const areaShare = (c: Curve, a: number, b: number): number => {
  let tot = 0;
  let part = 0;
  for (let i = 1; i < c.xs.length; i++) {
    const seg = ((c.ys[i] + c.ys[i - 1]) / 2) * (c.xs[i] - c.xs[i - 1]);
    tot += seg;
    const m = (c.xs[i] + c.xs[i - 1]) / 2;
    if (m >= a && m <= b) part += seg;
  }
  return tot > 0 ? part / tot : 0;
};

export const DistributionView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const cv = curveOf(props);
  const marks = props.markers ?? [];
  const pad = 36;
  const mLabels = marks.map((m) => m.label);
  const fM = useFitProbe(`${ctx.id}:marks`, SIZE.label, W * 0.2, (fs) => probeLabels(mLabels.length ? mLabels : ['x'], fs), mLabels.join('|'));
  const levels = marks.length > 1 ? 2 : 1;
  const topM = pad + levels * Math.round(fM.size * 1.9) + 8;
  const x0 = pad + 8;
  const x1 = W - pad - 8;
  const yB = H - pad - 28; // baseline
  const yT = topM + 16; // top of the tallest point
  const px = (x: number) => x0 + ((x - cv.lo) / (cv.hi - cv.lo)) * (x1 - x0);
  const py = (y: number) => yB - y * (yB - yT);
  const land = Math.max(landLayer(ctx), ctx.at + 2 * presetFrames('morph', ctx.fps, true));
  const dr = roll(t, ctx.at, land, 0, 1); // draw progress 0..1 along x
  const xd = cv.lo + dr * (cv.hi - cv.lo);
  const pts = cv.xs.map((x, i) => `${px(x).toFixed(1)},${py(cv.ys[i]).toFixed(1)}`);
  const line = pts.join(' ');
  const area = `${px(cv.lo)},${yB} ${line} ${px(cv.hi)},${yB}`;
  const head = prog(ctx, ctx.at, 'label');
  const shd = lastAct(ctx, 'shade');
  let sa = 0;
  let sb = 0;
  let sq = 0;
  if (shd) {
    sa = Math.max(cv.lo, Math.min(cv.hi, shd.props.lo as number));
    sb = Math.max(cv.lo, Math.min(cv.hi, shd.props.hi as number));
    sq = roll(t, shd.at, landOf(ctx, shd), 0, 1);
  }
  const sh = shd ? flashAt(ctx, t >= landOf(ctx, shd) ? landOf(ctx, shd) : null) : 0;
  const shadePts = (() => {
    if (!shd) return '';
    const hiNow = sa + (sb - sa) * sq;
    const idx = cv.xs.map((x, i) => ({x, i})).filter((o) => o.x >= sa && o.x <= hiNow);
    if (idx.length < 1) return '';
    const body = idx.map((o) => `${px(o.x).toFixed(1)},${py(cv.ys[o.i]).toFixed(1)}`);
    return `${px(idx[0].x)},${yB} ${body.join(' ')} ${px(idx[idx.length - 1].x)},${yB}`;
  })();
  const share = shd ? Math.round(areaShare(cv, sa, sb) * 100) : 0;
  const yAt = (x: number) => {
    const i = Math.max(0, Math.min(N, Math.round(((x - cv.lo) / (cv.hi - cv.lo)) * N)));
    return cv.ys[i];
  };
  // markers: appear (label preset) as the curve passes them; two label levels when neighbours are closer than a label + 40 px
  const mx = marks.map((m) => px(m.at_value));
  const lvH = Math.round(fM.size * 1.9);
  const need = fM.size * 0.62 * Math.max(1, ...mLabels.map((s) => s.length)) + GAP;
  const lvl: number[] = [];
  marks.forEach((_, i) => {
    lvl[i] = mx.slice(0, i).some((xx, j) => lvl[j] === 0 && Math.abs(xx - mx[i]) < need) ? 1 : 0;
  });
  const mT0 = marks.map((m) => ctx.at + Math.round(Math.max(0, Math.min(1, (m.at_value - cv.lo) / (cv.hi - cv.lo))) * (land - ctx.at)));
  const mq = marks.map((_, i) => (t >= mT0[i] ? prog(ctx, mT0[i], 'label') : 0));

  return (
    <Shell ctx={ctx}>
      {fM.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: head}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <clipPath id={`${ctx.id}-dr`}>
            <rect x={x0 - 6} y={0} width={Math.max(0, px(xd) - x0 + 6)} height={H} />
          </clipPath>
          <linearGradient id={`${ctx.id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.26} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <line x1={x0} x2={x1} y1={yB} y2={yB} stroke={C.grid} strokeWidth={3} opacity={head} />
        <g clipPath={`url(#${ctx.id}-dr)`}>
          {cv.bars ? cv.bars.map((b, i) => <rect key={i} x={px(b.x0) + 2} y={py(b.h)} width={Math.max(1, px(b.x1) - px(b.x0) - 4)} height={yB - py(b.h)} rx={4} fill={tint(C.ink3, 0.32)} stroke={tint(C.ink2, 0.5)} strokeWidth={1.5} />) : null}
          <polygon points={area} fill={`url(#${ctx.id}-fill)`} />
          <polyline points={line} fill="none" stroke={tint(C.signal, 0.2)} strokeWidth={12} strokeLinejoin="round" />
          <polyline points={line} fill="none" stroke={C.signal} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {dr < 1 && dr > 0 ? <circle cx={px(xd)} cy={py(yAt(xd))} r={9} fill={C.signal} /> : null}
        {shd && shadePts ? (
          <>
            <polygon points={shadePts} fill={tint(C.signal, 0.34 + 0.2 * sh)} />
            <line x1={px(sa)} x2={px(sa)} y1={yB} y2={py(yAt(sa))} stroke={C.signal} strokeWidth={3} />
            {sq >= 1 ? <line x1={px(sb)} x2={px(sb)} y1={yB} y2={py(yAt(sb))} stroke={C.signal} strokeWidth={3} /> : null}
          </>
        ) : null}
        {marks.map((_, i) => (
          <line key={i} x1={mx[i]} x2={mx[i]} y1={yB} y2={pad + (lvl[i] + 1) * lvH - 6} stroke={C.violet} strokeWidth={2.5} strokeDasharray="8 7" opacity={mq[i]} />
        ))}
      </svg>
      {marks.map((m, i) => (
        <div key={`ml${i}`} style={{position: 'absolute', left: mx[i], top: pad + lvl[i] * lvH, transform: 'translateX(-50%)', opacity: mq[i]}}>
          <Lbl id={`${ctx.id}:m${i}`} text={m.label} size={fM.size} color={C.violet} weight={600} overflow={fM.overflow} />
        </div>
      ))}
      {shd && shadePts ? (
        <div style={{position: 'absolute', left: (px(sa) + px(sb)) / 2, top: yB - (yB - yT) * 0.3, transform: 'translate(-50%, -50%)', opacity: sq > 0 ? 1 : 0}}>
          <NumText id={`${ctx.id}:share`} text={`${Math.round(share * sq)}`} unit="%" size={SIZE.sub} color={C.ink} fx={ctx.fx} glowK={0.4 + sh} ca />
        </div>
      ) : null}
    </Shell>
  );
};

export const Distribution: DcComponent<Props> = {name: 'Distribution', Component: DistributionView, text: true, slot: 'center'};
