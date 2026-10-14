// ScatterField (catalog: Data; 04 section 6 "Model families & evaluation": decision boundaries / clusters over points; anomalies).
// Seeded point clusters on a glass plate (<= 1,500 points; capped by the FX tier: lite 300, standard / hero 1,500, ADR-002 RT5). Each
// cluster is a clamped Gaussian blob around `center` (fractions of the plot, y up) with `spread` (fraction of the plot). Points come
// from `random(seed:cluster:i)` only (deterministic across frames, runs and hosts) and are drawn on ONE canvas (no per-point DOM).
// A cluster arrives (arrive preset, staggered 4 film frames) by its points flying out of the centre; its label (whole word(s) of
// the props, on its own small plate so dots never sit behind copy) sits above it. `highlightCluster` (state change on its word,
// matched by label) dims the other clusters and lights that one with a halo; `showOutliers` (state change) reveals the outliers as
// hollow crit rings with a ping. Without a `showOutliers` action in the shot the outliers arrive with the last cluster. No numbers.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {random} from 'remotion';
import type {DcComponent, DcProps} from '../../spec/types';
import type {ColorToken} from '../../tokens';
import type {Props} from './schema';
import {C, GAP, Lbl, Plate, SIZE, Shell, acts, ease, lastAct, presetFrames, probeLabels, prog, revealProgress, stag, tint, useFitProbe} from '../_data/kit';

const PAL: ColorToken[] = ['signal', 'violet', 'ok', 'ember', 'warn', 'ink2', 'paper', 'ink'];
type Pt = {x: number; y: number; k: number; o: number; d: number}; // plot fractions, cluster, outlier flag, arrival spread (0..1)

const gauss = (seed: string): number => {
  const u1 = Math.max(1e-9, random(`${seed}:a`));
  const u2 = random(`${seed}:b`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

/** Deterministic points of the whole field, capped to `cap` (clusters scaled proportionally, outliers kept first). */
export const makePoints = (p: Props, cap: number): Pt[] => {
  const out = Math.min(p.outliers, Math.floor(cap * 0.1));
  const budget = Math.max(1, cap - out);
  const total = p.clusters.reduce((a, c) => a + c.n, 0);
  const scale = total > budget ? budget / total : 1;
  const pts: Pt[] = [];
  p.clusters.forEach((c, k) => {
    const n = Math.max(1, Math.floor(c.n * scale));
    for (let i = 0; i < n; i++) {
      const sd = `${p.seed}:${k}:${i}`;
      const gx = Math.max(-2.6, Math.min(2.6, gauss(`${sd}:x`)));
      const gy = Math.max(-2.6, Math.min(2.6, gauss(`${sd}:y`)));
      pts.push({x: Math.max(0.02, Math.min(0.98, c.center[0] + gx * c.spread)), y: Math.max(0.03, Math.min(0.97, c.center[1] + gy * c.spread)), k, o: 0, d: i / n});
    }
  });
  for (let i = 0; i < out; i++) {
    let best = {x: 0.5, y: 0.5};
    for (let tries = 0; tries < 24; tries++) {
      const x = 0.04 + 0.92 * random(`${p.seed}:o:${i}:${tries}:x`);
      const y = 0.06 + 0.88 * random(`${p.seed}:o:${i}:${tries}:y`);
      best = {x, y};
      if (p.clusters.every((c) => Math.hypot(x - c.center[0], y - c.center[1]) > c.spread * 3.2 + 0.05)) break;
    }
    pts.push({...best, k: -1, o: 1, d: i / Math.max(1, out)});
  }
  return pts;
};

export const ScatterFieldView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const cap = ctx.fx.particles;
  const pkey = JSON.stringify([props.clusters, props.outliers, props.seed]);
  const pts = useMemo(() => makePoints(props, cap), [pkey, cap]); // eslint-disable-line react-hooks/exhaustive-deps
  const cvs = useRef<HTMLCanvasElement>(null);
  const pad = 28;
  const pw = W - 2 * pad;
  const ph = H - 2 * pad;
  const X = (x: number) => pad + x * pw;
  const Y = (y: number) => pad + (1 - y) * ph;
  const nC = props.clusters.length;
  const so = acts(ctx, 'showOutliers')[0];
  const hl = lastAct(ctx, 'highlightCluster');
  const hlK = hl ? props.clusters.findIndex((c) => c.label === (hl.props.label as string)) : -1;
  const hlQ = hl ? revealProgress(t - hl.at, presetFrames('label', ctx.fps)) : 0;
  const t0 = (k: number) => ctx.at + stag(ctx, k, 4);
  const outAt = so ? so.at : t0(nC);
  const fLab = useFitProbe(`${ctx.id}:labels`, SIZE.label, W * 0.3, (fs) => probeLabels(props.clusters.map((c) => c.label), fs), props.clusters.map((c) => c.label).join('|'));
  const r0 = ctx.fx.id === 'lite' ? 4.5 : 5;
  const spreadF = presetFrames('arrive', ctx.fps) * 2; // a cluster's points settle over 2 x arrive

  useLayoutEffect(() => {
    const cv = cvs.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    for (const p of pts) {
      if (p.o) {
        const q = revealProgress(t - outAt - Math.round(p.d * 4), presetFrames('arrive', ctx.fps));
        if (t < outAt || q <= 0) continue;
        g.globalAlpha = q;
        g.strokeStyle = C.crit;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(X(p.x), Y(p.y), 7 + 9 * (1 - q), 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = C.crit;
        g.beginPath();
        g.arc(X(p.x), Y(p.y), 3, 0, Math.PI * 2);
        g.fill();
        continue;
      }
      const c = props.clusters[p.k];
      const ts = t0(p.k) + Math.round(p.d * spreadF * 0.5);
      const q = revealProgress(t - ts, spreadF, ease.arrive);
      if (t < ts || q <= 0) continue;
      const e = q;
      const x = X(c.center[0] + (p.x - c.center[0]) * e);
      const y = Y(c.center[1] + (p.y - c.center[1]) * e);
      const isH = p.k === hlK;
      const dim = hlK >= 0 && !isH ? 1 - 0.78 * hlQ : 1;
      const col = C[PAL[p.k % PAL.length]];
      g.globalAlpha = Math.min(1, q * 1.4) * dim;
      if (isH && hlQ > 0) {
        g.fillStyle = tint(col, 0.2 * hlQ);
        g.beginPath();
        g.arc(x, y, r0 * (1 + 1.6 * hlQ), 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, r0 * (isH ? 1 + 0.25 * hlQ : 1), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });

  // labels above their cluster (below when there is no room), pushed apart so two never overlap
  const lh = Math.round(fLab.size * 1.7);
  const lw = (s: string) => s.length * fLab.size * 0.62 + 36;
  const labs = props.clusters.map((c, k) => {
    const top = Y(c.center[1] + c.spread * 2.7) - lh;
    const below = top < pad;
    return {k, x: X(c.center[0]), y: below ? Y(c.center[1] - c.spread * 2.7) + 6 : top, w: lw(c.label)};
  });
  const sorted = [...labs].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i++)
    for (let j = 0; j < i; j++) if (Math.abs(sorted[i].x - sorted[j].x) < (sorted[i].w + sorted[j].w) / 2 + GAP * 0.5 && Math.abs(sorted[i].y - sorted[j].y) < lh) sorted[i].y = sorted[j].y + lh + 6;
  const head = prog(ctx, ctx.at, 'label');

  return (
    <Shell ctx={ctx}>
      {fLab.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: head}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <g opacity={head} stroke={C.grid} strokeWidth={2}>
          <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} />
          <line x1={pad} x2={pad} y1={pad} y2={H - pad} />
          {[0.25, 0.5, 0.75].map((f) => (
            <React.Fragment key={f}>
              <line x1={X(f)} x2={X(f)} y1={pad} y2={H - pad} strokeDasharray="2 14" opacity={0.7} />
              <line x1={pad} x2={W - pad} y1={Y(f)} y2={Y(f)} strokeDasharray="2 14" opacity={0.7} />
            </React.Fragment>
          ))}
        </g>
      </svg>
      <canvas ref={cvs} width={W} height={H} style={{position: 'absolute', left: 0, top: 0}} />
      {labs.map((l0) => {
        const l = sorted.find((s) => s.k === l0.k) ?? l0;
        const q = prog(ctx, t0(l.k) + presetFrames('arrive', ctx.fps), 'label');
        const isH = l.k === hlK;
        const dim = hlK >= 0 && !isH ? 1 - 0.7 * hlQ : 1;
        const col = C[PAL[l.k % PAL.length]];
        return (
          <div key={l.k} style={{position: 'absolute', left: Math.max(pad, Math.min(W - pad - l.w, l.x - l.w / 2)), top: l.y, opacity: q * dim, padding: '0 18px', borderRadius: 14, background: tint(C.void, 0.82), border: `1.5px solid ${tint(col, isH ? 0.95 : 0.45)}`}}>
            <Lbl id={`${ctx.id}:c${l.k}`} text={props.clusters[l.k].label} size={fLab.size} color={isH ? C.ink : col} overflow={fLab.overflow} />
          </div>
        );
      })}
    </Shell>
  );
};

export const ScatterField: DcComponent<Props> = {name: 'ScatterField', Component: ScatterFieldView, text: true, slot: 'center'};
