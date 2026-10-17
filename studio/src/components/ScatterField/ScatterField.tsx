// ScatterField (catalog: Data; 04 section 6 "Model families & evaluation": decision boundaries / clusters over points; anomalies).
// Seeded point clusters on a glass plate (<= 1,500 points; capped by the FX tier: lite 300, standard / hero 1,500, ADR-002 RT5). Each
// cluster is a clamped Gaussian blob around `center` (fractions of the plot, y up) with `spread` (fraction of the plot). Points come
// from `random(seed:cluster:i)` only (deterministic across frames, runs and hosts) and are drawn on ONE canvas (no per-point DOM).
// A cluster arrives (arrive preset, staggered 4 film frames) by its points flying out of the centre; its label (whole word(s) of
// the props, on its own small plate so dots never sit behind copy) sits above it. `highlightCluster` (state change on its word,
// matched by label) dims the other clusters and lights that one with a halo; `showOutliers` (state change) reveals the outliers as
// hollow crit rings with a ping. Without a `showOutliers` action in the shot the outliers arrive with the last cluster. No numbers.
// Depth + light (ADR-003 LK-F, 04 section 1.2): a rim-lit glass slab holds a faint plot plane. Every point is a small lit sphere
// (per-point seeded depth z: far points are smaller, dimmer and drawn first; a drop shadow, a body and a specular speck), each
// cluster has an additive density wash and a boundary ring (2.4 sigma, the "decision boundary" of 04 section 6); the highlight
// adds a spotlight, a light shaft from the label plate and a lit ring; outliers are crit rings with a ping and a dashed leader to
// the nearest cluster. 2D canvas + SVG only (no WebGL): the same render at every FX tier (tiers change the point cap, glow and grain).
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {random} from 'remotion';
import type {DcComponent, DcProps} from '../../spec/types';
import type {ColorToken} from '../../tokens';
import type {Props} from './schema';
import {C, GAP, Lbl, SIZE, Shell, acts, ease, lastAct, presetFrames, probeLabels, prog, revealProgress, stag, tint, useFitProbe} from '../_data/kit';

const PAL: ColorToken[] = ['signal', 'violet', 'ok', 'ember', 'warn', 'ink2', 'paper', 'ink'];
type Pt = {x: number; y: number; k: number; o: number; d: number; z: number}; // plot fractions, cluster, outlier flag, arrival spread (0..1), depth (0 far .. 1 near)

const gauss = (seed: string): number => {
  const u1 = Math.max(1e-9, random(`${seed}:a`));
  const u2 = random(`${seed}:b`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

/** Deterministic points of the whole field, capped to `cap` (clusters scaled proportionally, outliers kept first). */
export const makePoints = (p: Props, cap: number, avoid?: (x: number, y: number) => boolean): Pt[] => {
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
      pts.push({x: Math.max(0.02, Math.min(0.98, c.center[0] + gx * c.spread)), y: Math.max(0.03, Math.min(0.97, c.center[1] + gy * c.spread)), k, o: 0, d: i / n, z: random(`${sd}:z`)});
    }
  });
  for (let i = 0; i < out; i++) {
    let best = {x: 0.5, y: 0.5};
    for (let tries = 0; tries < 48; tries++) {
      const x = 0.04 + 0.92 * random(`${p.seed}:o:${i}:${tries}:x`);
      const y = 0.06 + 0.88 * random(`${p.seed}:o:${i}:${tries}:y`);
      best = {x, y};
      if (p.clusters.every((c) => Math.hypot(x - c.center[0], y - c.center[1]) > c.spread * 3.2 + 0.05) && !avoid?.(x, y)) break;
    }
    pts.push({...best, k: -1, o: 1, d: i / Math.max(1, out), z: 1});
  }
  // far points first (painter's order); a stable sort keeps the seeded order for equal depth
  return pts.map((q, i) => ({q, i})).sort((a, b) => a.q.o - b.q.o || a.q.z - b.q.z || a.i - b.i).map((e) => e.q);
};

export const ScatterFieldView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const cap = ctx.fx.particles;
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
  const r0 = Math.max(4, ph / 80) * (ctx.fx.id === 'lite' ? 0.9 : 1); // point radius scales with the plot height
  const spreadF = presetFrames('arrive', ctx.fps) * 2; // a cluster's points settle over 2 x arrive

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
  // outliers never sit behind a label plate: candidates inside a label rect (+ margin) are re-drawn from the same seeded stream
  const pkey = JSON.stringify([props.clusters, props.outliers, props.seed, sorted.map((l) => [Math.round(l.x), Math.round(l.y), Math.round(l.w)]), Math.round(lh), W, H]);
  const pts = useMemo(
    () =>
      makePoints(props, cap, (fx, fy) => {
        const x = X(fx);
        const y = Y(fy);
        return sorted.some((l) => x > l.x - l.w / 2 - 24 && x < l.x + l.w / 2 + 24 && y > l.y - 24 && y < l.y + lh + 24);
      }),
    [pkey, cap], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const gk = ctx.fx.glowPx / 32; // 0.31 lite .. 1 standard / hero (token ratio, not a magic size)
  const wash = 1 + 0.35 * ctx.mod.glow;
  const hlLab = hlK >= 0 ? sorted.find((l) => l.k === hlK) : undefined;

  useLayoutEffect(() => {
    const cv = cvs.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const cx = (k: number) => X(props.clusters[k].center[0]);
    const cy = (k: number) => Y(props.clusters[k].center[1]);
    const rx = (k: number) => 2.4 * props.clusters[k].spread * pw;
    const ry = (k: number) => 2.4 * props.clusters[k].spread * ph;
    const dimOf = (k: number) => (hlK >= 0 && k !== hlK ? 1 - 0.78 * hlQ : 1);
    const qOf = (k: number) => revealProgress(t - t0(k), spreadF, ease.arrive);
    const lit = (on: boolean) => {
      g.globalCompositeOperation = on ? 'lighter' : 'source-over';
    };

    // 1. density wash + boundary ring per cluster (under the points)
    props.clusters.forEach((c, k) => {
      const q = qOf(k);
      if (q <= 0) return;
      const col = C[PAL[k % PAL.length]];
      const isH = k === hlK;
      const d = dimOf(k);
      lit(true);
      g.save();
      g.translate(cx(k), cy(k));
      g.scale(1, ry(k) / rx(k));
      const R = rx(k) * 1.35;
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, R);
      grd.addColorStop(0, tint(col, (0.26 + (isH ? 0.2 * hlQ : 0)) * q * d * wash));
      grd.addColorStop(1, tint(col, 0));
      g.fillStyle = grd;
      g.beginPath();
      g.arc(0, 0, R, 0, Math.PI * 2);
      g.fill();
      g.restore();
      lit(false);
      const rq = revealProgress(t - t0(k) - spreadF, presetFrames('label', ctx.fps), ease.arrive);
      if (rq > 0) {
        g.save();
        g.translate(cx(k), cy(k));
        g.scale(1, ry(k) / rx(k));
        g.beginPath();
        g.arc(0, 0, rx(k), 0, Math.PI * 2);
        if (isH && hlQ > 0) {
          g.setLineDash([]);
          g.strokeStyle = tint(col, 0.22 * hlQ * rq);
          g.lineWidth = 12;
          g.stroke();
          g.strokeStyle = tint(col, (0.45 + 0.5 * hlQ) * rq);
          g.lineWidth = 3;
        } else {
          g.setLineDash([10, 12]);
          g.strokeStyle = tint(col, 0.42 * rq * d);
          g.lineWidth = 2;
        }
        g.stroke();
        g.restore();
        g.setLineDash([]);
      }
    });

    // 2. highlight: spotlight + light shaft from the label plate down onto the cluster
    if (hlK >= 0 && hlQ > 0) {
      const col = C[PAL[hlK % PAL.length]];
      lit(true);
      g.save();
      g.translate(cx(hlK), cy(hlK));
      g.scale(1, ry(hlK) / rx(hlK));
      const R = rx(hlK) * 1.9;
      const sp = g.createRadialGradient(0, 0, rx(hlK) * 0.3, 0, 0, R);
      sp.addColorStop(0, tint(col, 0.2 * hlQ * wash));
      sp.addColorStop(1, tint(col, 0));
      g.fillStyle = sp;
      g.beginPath();
      g.arc(0, 0, R, 0, Math.PI * 2);
      g.fill();
      g.restore();
      if (hlLab && hlLab.y + lh < cy(hlK) - ry(hlK)) {
        const y0 = hlLab.y + lh;
        const y1 = cy(hlK);
        const sh = g.createLinearGradient(0, y0, 0, y1);
        sh.addColorStop(0, tint(col, 0.3 * hlQ));
        sh.addColorStop(1, tint(col, 0.04 * hlQ));
        g.fillStyle = sh;
        g.beginPath();
        g.moveTo(cx(hlK) - 16, y0);
        g.lineTo(cx(hlK) + 16, y0);
        g.lineTo(cx(hlK) + rx(hlK) * 0.9, y1);
        g.lineTo(cx(hlK) - rx(hlK) * 0.9, y1);
        g.closePath();
        g.fill();
      }
      lit(false);
    }

    // 3. points, far to near: shadow, additive glow, body, specular speck
    for (const p of pts) {
      if (p.o) continue;
      const c = props.clusters[p.k];
      const ts = t0(p.k) + Math.round(p.d * spreadF * 0.5);
      const q = revealProgress(t - ts, spreadF, ease.arrive);
      if (t < ts || q <= 0) continue;
      const drift = Math.sin((t / ctx.fps) * 1.7 + p.d * 40 + p.z * 9) * 1.4 * q * q * q * q;
      const x = X(c.center[0] + (p.x - c.center[0]) * q) + drift;
      const y = Y(c.center[1] + (p.y - c.center[1]) * q) + drift * 0.6;
      const isH = p.k === hlK;
      const dim = dimOf(p.k);
      const col = C[PAL[p.k % PAL.length]];
      const rr = r0 * (0.7 + 0.55 * p.z) * (isH ? 1 + 0.25 * hlQ : 1);
      const al = Math.min(1, q * 1.4) * dim * (0.55 + 0.45 * p.z);
      g.globalAlpha = al;
      g.fillStyle = tint(C.void, 0.5);
      g.beginPath();
      g.arc(x + rr * 0.3, y + rr * 0.85, rr, 0, Math.PI * 2);
      g.fill();
      lit(true);
      g.fillStyle = tint(col, (0.1 + 0.1 * p.z) * (0.4 + 0.6 * gk) * (isH ? 1 + hlQ : 1) * wash);
      g.beginPath();
      g.arc(x, y, rr * (2.2 + 0.8 * gk), 0, Math.PI * 2);
      g.fill();
      lit(false);
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = tint(C.white, 0.6);
      g.beginPath();
      g.arc(x - rr * 0.3, y - rr * 0.35, rr * 0.3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    // 4. outliers: hollow crit rings, ping, dashed leader to the nearest cluster
    for (const p of pts) {
      if (!p.o) continue;
      const ts = outAt + Math.round(p.d * 4);
      const q = revealProgress(t - ts, presetFrames('arrive', ctx.fps));
      if (t < ts || q <= 0) continue;
      const ox = X(p.x);
      const oy = Y(p.y);
      let nk = 0;
      let nd = Infinity;
      props.clusters.forEach((_, k) => {
        const dd = Math.hypot(ox - cx(k), oy - cy(k));
        if (dd < nd) {
          nd = dd;
          nk = k;
        }
      });
      const ux = (cx(nk) - ox) / Math.max(1, nd);
      const uy = (cy(nk) - oy) / Math.max(1, nd);
      const edge = (rx(nk) + ry(nk)) / 2 + 12;
      g.globalAlpha = 0.3 * q;
      g.strokeStyle = C.crit;
      g.lineWidth = 2;
      g.setLineDash([6, 10]);
      g.beginPath();
      g.moveTo(ox + ux * 18, oy + uy * 18);
      g.lineTo(cx(nk) - ux * edge, cy(nk) - uy * edge);
      g.stroke();
      g.setLineDash([]);
      const pq = revealProgress(t - ts, presetFrames('impact', ctx.fps, true), ease.arrive);
      lit(true);
      g.globalAlpha = q * (0.18 + 0.12 * gk) * wash;
      g.fillStyle = C.crit;
      g.beginPath();
      g.arc(ox, oy, 24 + 8 * gk, 0, Math.PI * 2);
      g.fill();
      lit(false);
      g.globalAlpha = 0.6 * (1 - pq) * q;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(ox, oy, 12 + 30 * pq, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = q;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(ox, oy, 8 + 9 * (1 - q), 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = C.crit;
      g.beginPath();
      g.arc(ox, oy, 3.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = tint(C.white, 0.6);
      g.beginPath();
      g.arc(ox - 1, oy - 1, 1.3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });

  const head = prog(ctx, ctx.at, 'label');

  return (
    <Shell ctx={ctx}>
      {fLab.probe}
      <div style={{position: 'absolute', inset: 0, opacity: head, borderRadius: 18, background: `linear-gradient(180deg, ${C.panel}E6 0%, ${C.ground}D9 100%)`, border: `1px solid ${C.grid}`, boxShadow: `inset 0 1px 0 ${C.ink}26, inset 0 0 0 1px ${C.signal}14`}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id={`${ctx.id}-sf-plane`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.grid} stopOpacity={0} />
            <stop offset="1" stopColor={C.grid} stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <g opacity={head} stroke={C.grid} strokeWidth={2}>
          <rect x={pad} y={pad} width={pw} height={ph} fill={`url(#${ctx.id}-sf-plane)`} stroke="none" />
          <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke={C.ink3} />
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
          <div key={l.k} style={{position: 'absolute', left: Math.max(pad, Math.min(W - pad - l.w, l.x - l.w / 2)), top: l.y, opacity: q * dim, padding: '0 18px', borderRadius: 14, background: tint(C.void, 0.86), border: `1.5px solid ${tint(col, isH ? 0.95 : 0.45)}`, boxShadow: `inset 0 1px 0 ${tint(C.white, 0.12)}${isH ? `, 0 0 ${(ctx.fx.glowInner * 1.6 * hlQ).toFixed(1)}px ${tint(col, 0.5)}` : ''}`}}>
            <Lbl id={`${ctx.id}:c${l.k}`} text={props.clusters[l.k].label} size={fLab.size} color={isH ? C.ink : col} overflow={fLab.overflow} />
          </div>
        );
      })}
    </Shell>
  );
};

export const ScatterField: DcComponent<Props> = {name: 'ScatterField', Component: ScatterFieldView, text: true, slot: 'center'};
