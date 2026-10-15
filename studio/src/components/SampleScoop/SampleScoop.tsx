// SampleScoop (catalog: Domain specials; 04 section 6 "Statistics: sampling = scooping from a pool"). A seeded population
// of point sprites sits in a pool (RTL: the population on the right); a scoop lifts a sample into a glass cup on the left
// and the cup's mean drops a block onto a small histogram, draw after draw, so the sampling distribution assembles over
// repeated samples (fact-check D2 ruling 4: one sample's mean is never "the truth").
// `method` sets the draw: random (seeded indices), stratified (violet strata bands, the same share from each band),
// systematic (every k-th unit of the frame from a seeded start), cluster (violet cluster hulls; whole clusters taken).
// Numbers: only the population label (`population`, with its ref) is shown. The dots are decorative (D2 ruling 2): the dot
// count stands for no quantity, `sample` is never displayed and does not set the dot count (CR-009: sample optional),
// the histogram has no axis and no digits. Determinism: random(seed) only.
// Look (04 1.2 / ADR-003 LK-F): a glass dish with a key rim light from the upper right, a seeded depth value per dot (size, tone and
// halo of the near ones), a glass beaker whose liquid rises as the scoop lands, and the dots return to the pool after each mean
// has dropped (a sample is put back: the draws are independent). DOM + SVG only (no WebGL): every FX tier renders it; the tier
// changes the dot count (<= FX[tier].particles) and the glow radii.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {isArabic} from '../../type/arabic';
import {At, Chip, FitLabel, Stage, Svg, clamp01, dPath, f24, fmtCount, glowBox, lerp, partial, prog, progN, type Pt} from '../_dom-b/kit';

const dotsFor = (tier: string) => (tier === 'lite' ? 240 : 360); // decorative population sprites (<= FX[tier].particles); not a quantity
const PICK = 18; // decorative dots per scoop; not the sample size
const BINS = 9;
const STRATA = 3;
const CLUSTERS = 8;

type Dot = {p: Pt; v: number; band: number; cl: number; z: number};

const buildPop = (seed: number, method: Props['method'], c: Pt, rx: number, ry: number, DOTS: number): {dots: Dot[]; centres: Pt[]} => {
  const r = (k: string) => random(`scoop:${seed}:${k}`);
  const centres: Pt[] = Array.from({length: CLUSTERS}, (_, i) => {
    const a = (2 * Math.PI * i) / CLUSTERS + r(`ca${i}`) * 0.5;
    const d = 0.35 + 0.4 * r(`cd${i}`);
    return {x: c.x + Math.cos(a) * rx * d, y: c.y + Math.sin(a) * ry * d};
  });
  const dots: Dot[] = Array.from({length: DOTS}, (_, i) => {
    let p: Pt;
    let cl = i % CLUSTERS;
    if (method === 'cluster') {
      const a = r(`a${i}`) * 2 * Math.PI;
      const d = Math.sqrt(r(`d${i}`)) * 0.17;
      p = {x: centres[cl].x + Math.cos(a) * rx * d, y: centres[cl].y + Math.sin(a) * ry * d};
    } else {
      const a = r(`a${i}`) * 2 * Math.PI;
      const d = Math.sqrt(r(`d${i}`)) * 0.94;
      p = {x: c.x + Math.cos(a) * rx * d, y: c.y + Math.sin(a) * ry * d};
      cl = -1;
    }
    const band = Math.min(STRATA - 1, Math.floor(((p.y - (c.y - ry)) / (2 * ry)) * STRATA));
    return {p, v: (p.x - (c.x - rx)) / (2 * rx), band, cl, z: r(`z${i}`)};
  });
  return {dots, centres};
};

/** Indices drawn in scoop k (deterministic per seed). */
const drawIdx = (dots: Dot[], method: Props['method'], seed: number, k: number): number[] => {
  const DOTS = dots.length;
  const r = (s: string) => random(`scoop:${seed}:draw${k}:${s}`);
  if (method === 'stratified') {
    const out: number[] = [];
    for (let b = 0; b < STRATA; b++) {
      const pool = dots.map((d, i) => (d.band === b ? i : -1)).filter((i) => i >= 0);
      const order = pool.map((i, j) => ({i, k: r(`b${b}:${j}`)})).sort((x, y) => x.k - y.k);
      out.push(...order.slice(0, PICK / STRATA).map((o) => o.i));
    }
    return out;
  }
  if (method === 'systematic') {
    const frame = dots.map((d, i) => ({i, key: d.band * 10 + d.v})).sort((x, y) => x.key - y.key).map((o) => o.i); // the sampling frame (a listed order)
    const step = Math.floor(DOTS / PICK);
    const s0 = Math.floor(r('start') * step);
    return Array.from({length: PICK}, (_, j) => frame[(s0 + j * step) % DOTS]);
  }
  if (method === 'cluster') {
    const a = Math.floor(r('c0') * CLUSTERS);
    const b = (a + 1 + Math.floor(r('c1') * (CLUSTERS - 1))) % CLUSTERS;
    return dots.map((d, i) => (d.cl === a || d.cl === b ? i : -1)).filter((i) => i >= 0);
  }
  const order = dots.map((_, i) => ({i, k: r(`r${i}`)})).sort((x, y) => x.k - y.k);
  return order.slice(0, PICK).map((o) => o.i);
};

export const SampleScoopView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const labelH = SIZE.sub * 1.9;
  const pc = {x: W * 0.68, y: labelH + (H - labelH) * 0.46};
  const rx = W * 0.27;
  const ry = (H - labelH) * 0.36;
  const {dots, centres} = buildPop(props.seed, props.method, pc, rx, ry, dotsFor(fx.id));
  const gid = `sc${ctx.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const gk = 1 + ctx.mod.glow;
  // cup + histogram (left)
  const cupC = {x: W * 0.2, y: labelH + (H - labelH) * 0.36};
  const cupW = Math.min(W * 0.28, 500);
  const cupH = cupW * 0.8;
  const histY = labelH + (H - labelH) * 0.93;
  const histW = Math.min(W * 0.36, 640);
  const binW = histW / BINS;
  const blockH = Math.max(14, binW * 0.62);
  // draws
  const first = ctx.at + f24(14, fps);
  const every = f24(40, fps);
  const lift = f24(8, fps);
  const morph = presetFrames('morph', fps, true);
  const drop = f24(26, fps);
  const nDraws = Math.max(1, Math.min(4, Math.floor((ctx.shotDur - (first - 0) - drop) / every) + 1));
  const draws = Array.from({length: nDraws}, (_, k) => {
    const idx = drawIdx(dots, props.method, props.seed, k);
    const mean = idx.reduce((s, i) => s + dots[i].v, 0) / Math.max(1, idx.length);
    const bin = Math.max(0, Math.min(BINS - 1, Math.floor(((mean - 0.3) / 0.4) * BINS)));
    return {t0: first + k * every, idx: new Set(idx), list: idx, bin};
  });
  const active = [...draws].reverse().find((d) => t >= d.t0);
  const ent = prog(ctx, ctx.at, 'label');
  const cupSlot = (j: number, m: number): Pt => {
    const r = (s: string) => random(`scoop:${props.seed}:cup:${j}:${s}`);
    const u = (j + 0.5) / m;
    return {x: cupC.x + (u - 0.5) * cupW * 0.7 + (r('x') - 0.5) * cupW * 0.08, y: cupC.y + cupH * 0.14 + r('y') * cupH * 0.26};
  };
  const dotR = Math.max(4, Math.min(W, H) * 0.0085);
  // histogram stacks
  const stacks: {bin: number; level: number; t: number}[] = [];
  const level = new Array(BINS).fill(0);
  for (const d of draws) {
    stacks.push({bin: d.bin, level: level[d.bin], t: d.t0 + drop});
    level[d.bin] += 1;
  }
  // the active scoop: lift (m), and the return to the pool once its mean has dropped (not after the last draw)
  const ai = active ? draws.indexOf(active) : -1;
  const hasNext = ai >= 0 && ai < draws.length - 1;
  const lq = active ? progN(ctx, active.t0 + lift, morph, ease.camera) : 0;
  const rq = active && hasNext ? progN(ctx, active.t0 + drop + f24(2, fps), f24(9, fps), ease.camera) : 0;
  const m = lq * (1 - rq);
  const held = active ? clamp01(progN(ctx, active.t0, presetFrames('label', fps))) * (1 - rq) : 0;
  // the number is one LTR isolate; an Arabic unit follows it outside the isolate, a Latin unit stays inside (rule U1)
  const popText = props.population ? (() => {
    const n = fmtCount(props.population.value, props.population.decimals ?? 0);
    const u = props.population.unit;
    return !u ? `⟦${n}⟧` : isArabic(u) ? `⟦${n}⟧ ${u}` : `⟦${n} ${u}⟧`;
  })() : null;
  const METHOD: Record<Props['method'], string> = {random: 'random', stratified: 'stratified', systematic: 'systematic', cluster: 'cluster'};
  // dish geometry (a glass dish: floor shadow, side wall, top face, key rim light from the upper right)
  const wall = ry * 0.1;
  const rimArc = (a0: number, a1: number, n = 18) =>
    dPath(Array.from({length: n + 1}, (_, i) => {
      const a = lerp(a0, a1, i / n);
      return {x: pc.x + Math.cos(a) * rx, y: pc.y + Math.sin(a) * ry};
    }));
  const order = dots.map((d, i) => ({i, z: d.z})).sort((a, b) => a.z - b.z || a.i - b.i);
  // beaker geometry
  const cy0 = cupC.y - cupH * 0.2;
  const cy1 = cupC.y + cupH * 0.5;
  const topHW = cupW / 2;
  const botHW = cupW * 0.4;
  const hwAt = (y: number) => lerp(topHW, botHW, (y - cy0) / (cy1 - cy0));
  const liqTop = cy1 - cupH * 0.36 * m;
  const liqSurf = liqTop <= cy1 - 2;
  const lastStack = stacks.filter((s) => t >= s.t).pop();
  const flash = lastStack ? 1 - clamp01((t - lastStack.t) / f24(6, fps)) : 0;

  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        <defs>
          <radialGradient id={`${gid}d`} cx="0.62" cy="0.38" r="0.75">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.12} />
            <stop offset="0.55" stopColor={C.panel} stopOpacity={0.7} />
            <stop offset="1" stopColor={C.ground} stopOpacity={0.92} />
          </radialGradient>
          <linearGradient id={`${gid}w`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.panel} stopOpacity={0.95} />
            <stop offset="1" stopColor={C.void} stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id={`${gid}g`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.03} />
            <stop offset="0.8" stopColor={C.signal} stopOpacity={0.1} />
            <stop offset="1" stopColor={C.ink} stopOpacity={0.14} />
          </linearGradient>
          <linearGradient id={`${gid}l`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.signal} stopOpacity={0.3} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0.12} />
          </linearGradient>
          <clipPath id={`${gid}c`}>
            <ellipse cx={pc.x} cy={pc.y} rx={rx} ry={ry} />
          </clipPath>
        </defs>
        {/* the dish */}
        <ellipse cx={pc.x + rx * 0.03} cy={pc.y + wall + ry * 0.16} rx={rx * 1.02} ry={ry * 0.98} fill={C.void} opacity={ent * 0.7} />
        <ellipse cx={pc.x} cy={pc.y + wall} rx={rx} ry={ry} fill={`url(#${gid}w)`} stroke={C.grid} strokeWidth={2} opacity={ent} />
        <ellipse cx={pc.x} cy={pc.y} rx={rx} ry={ry} fill={`url(#${gid}d)`} stroke={C.grid} strokeWidth={2} opacity={ent} />
        <path d={rimArc(-1.25, -0.2)} fill="none" stroke={C.ink} strokeOpacity={0.4} strokeWidth={3} strokeLinecap="round" opacity={ent} />
        <path d={rimArc(1.9, 2.7)} fill="none" stroke={C.signal} strokeOpacity={0.22} strokeWidth={2} strokeLinecap="round" opacity={ent} />
        {props.method === 'stratified' ? (
          <g clipPath={`url(#${gid}c)`} opacity={ent}>
            {Array.from({length: STRATA}, (_, b) => (
              <rect key={b} x={pc.x - rx} y={pc.y - ry + (b * 2 * ry) / STRATA} width={rx * 2} height={(2 * ry) / STRATA} fill={C.violet} fillOpacity={b % 2 ? 0.0 : 0.08} />
            ))}
          </g>
        ) : null}
        {props.method === 'stratified'
          ? Array.from({length: STRATA - 1}, (_, b) => {
              const y = pc.y - ry + ((b + 1) * 2 * ry) / STRATA;
              const hw = rx * Math.sqrt(Math.max(0, 1 - ((y - pc.y) / ry) ** 2));
              return <line key={b} x1={pc.x - hw} x2={pc.x + hw} y1={y} y2={y} stroke={C.violet} strokeWidth={2} strokeDasharray="8 8" opacity={ent * 0.8} />;
            })
          : null}
        {props.method === 'cluster'
          ? centres.map((c, i) => {
              const hot = !!active && active.list.some((j) => dots[j].cl === i);
              return <ellipse key={i} cx={c.x} cy={c.y} rx={rx * 0.2} ry={ry * 0.2} fill={C.violet} fillOpacity={hot ? 0.16 * held + 0.05 : 0.05} stroke={C.violet} strokeWidth={hot ? 3 : 1.5} opacity={ent * (hot ? 1 : 0.6)} />;
            })
          : null}
        {/* systematic: the sampling frame is a listed order; the k-th stride is traced through it */}
        {props.method === 'systematic' && active && held > 0
          ? (() => {
              const pts = [...active.list].sort((a, b) => dots[a].band - dots[b].band || dots[a].v - dots[b].v).map((i) => dots[i].p);
              return <path d={dPath(partial(pts, held))} fill="none" stroke={C.signal} strokeOpacity={0.3 * (1 - lq)} strokeWidth={1.5} strokeDasharray="3 7" />;
            })()
          : null}
        {order.map(({i}) => {
          const d = dots[i];
          const eI = prog(ctx, ctx.at + Math.floor((i % 24) * (fps / 24)), 'label');
          const near = d.z > 0.72;
          const r0 = dotR * (0.7 + 0.6 * d.z);
          const picked = !!active && active.idx.has(i);
          if (!picked || held <= 0) {
            return (
              <g key={i} opacity={eI}>
                {near ? <circle cx={d.p.x} cy={d.p.y} r={r0 * 2.1} fill={C.ink2} opacity={0.05} /> : null}
                <circle cx={d.p.x} cy={d.p.y} r={r0} fill={d.z > 0.4 ? C.ink2 : C.ink3} opacity={0.4 + 0.5 * d.z} />
              </g>
            );
          }
          const a = active as (typeof draws)[number];
          const j = a.list.indexOf(i);
          const to = cupSlot(j, a.list.length);
          const x = lerp(d.p.x, to.x, m);
          const y = lerp(d.p.y, to.y, m) - Math.sin(m * Math.PI) * ry * 0.35;
          return (
            <g key={i}>
              {m > 0 ? <circle cx={d.p.x} cy={d.p.y} r={r0} fill="none" stroke={C.ink3} strokeWidth={1} opacity={0.6} /> : null}
              <circle cx={x} cy={y} r={dotR * 2.8} fill={C.signal} opacity={0.2 * held * gk} />
              <circle cx={x} cy={y} r={r0 * (1 + 0.5 * held)} fill={C.signal} opacity={eI} />
            </g>
          );
        })}
        {/* the beaker: liquid behind the dots' lens, glass front over them */}
        <ellipse cx={cupC.x} cy={cy1 + cupH * 0.1} rx={botHW * 1.05} ry={cupH * 0.06} fill={C.void} opacity={ent * 0.65} />
        <g opacity={ent}>
          <path
            d={`M${cupC.x - topHW} ${cy0} L${cupC.x - botHW} ${cy1} Q${cupC.x} ${cy1 + cupH * 0.12} ${cupC.x + botHW} ${cy1} L${cupC.x + topHW} ${cy0}`}
            fill={`url(#${gid}g)`}
            stroke={C.signal}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {liqSurf ? (
            <g>
              <path d={`M${cupC.x - hwAt(liqTop)} ${liqTop} L${cupC.x - botHW} ${cy1} Q${cupC.x} ${cy1 + cupH * 0.12} ${cupC.x + botHW} ${cy1} L${cupC.x + hwAt(liqTop)} ${liqTop} Z`} fill={`url(#${gid}l)`} />
              <ellipse cx={cupC.x} cy={liqTop} rx={hwAt(liqTop)} ry={cupH * 0.045} fill={C.signal} fillOpacity={0.18} stroke={C.signal} strokeOpacity={0.6} strokeWidth={1.5} />
            </g>
          ) : null}
          <ellipse cx={cupC.x} cy={cy0} rx={topHW} ry={cupH * 0.07} fill="none" stroke={C.signal} strokeOpacity={0.65} strokeWidth={1.5} />
          <path d={`M${cupC.x + topHW * 0.9} ${cy0 + cupH * 0.05} L${cupC.x + botHW * 0.88} ${cy1 - cupH * 0.05}`} stroke={C.ink} strokeOpacity={0.28} strokeWidth={3} strokeLinecap="round" fill="none" />
        </g>
        {/* the sampling distribution: a glass slab, no axis, no digits */}
        <ellipse cx={cupC.x} cy={histY + 12} rx={histW * 0.55} ry={9} fill={C.void} opacity={ent * 0.7} />
        <rect x={cupC.x - histW / 2} y={histY} width={histW} height={7} rx={3.5} fill={C.panel} stroke={C.grid} strokeWidth={1.5} opacity={ent} />
        <line x1={cupC.x - histW / 2 + 4} x2={cupC.x + histW / 2 - 4} y1={histY + 0.5} y2={histY + 0.5} stroke={C.ink} strokeOpacity={0.22} strokeWidth={1.5} opacity={ent} />
        {stacks.map((s, k) => {
          const q = progN(ctx, s.t, presetFrames('impact', fps, true), ease.impact);
          if (t < s.t) return null;
          const x = cupC.x - histW / 2 + s.bin * binW + binW * 0.1;
          const y = histY - (s.level + 1) * (blockH + 3);
          const fresh = k === stacks.indexOf(lastStack as (typeof stacks)[number]) ? flash : 0;
          const yy = y - (1 - q) * blockH * 2;
          return (
            <g key={k} opacity={Math.min(1, q * 1.4)}>
              <rect x={x} y={yy} width={binW * 0.8} height={blockH} rx={3} fill={C.signal} fillOpacity={0.62 + 0.3 * fresh} stroke={C.signal} strokeWidth={1.5} style={{filter: undefined}} />
              <line x1={x + 3} x2={x + binW * 0.8 - 3} y1={yy + 1.5} y2={yy + 1.5} stroke={C.ink} strokeOpacity={0.45} strokeWidth={2} />
              {fresh > 0 ? <rect x={x - 3} y={yy - 3} width={binW * 0.8 + 6} height={blockH + 6} rx={5} fill="none" stroke={C.signal} strokeOpacity={0.5 * fresh * gk} strokeWidth={3} /> : null}
            </g>
          );
        })}
        {/* the falling mean marker */}
        {active && t >= active.t0 + lift + morph
          ? (() => {
              const q = progN(ctx, active.t0 + lift + morph, active.t0 + drop - (active.t0 + lift + morph), ease.camera);
              const x = cupC.x - histW / 2 + (active.bin + 0.5) * binW;
              return q < 1 ? <line x1={cupC.x} y1={cy1 + cupH * 0.05} x2={lerp(cupC.x, x, q)} y2={lerp(cy1 + cupH * 0.05, histY - blockH, q)} stroke={C.signal} strokeWidth={2} strokeDasharray="4 6" opacity={0.8} /> : null;
            })()
          : null}
      </Svg>
      {popText ? (
        <At x={pc.x} y={labelH / 2} style={{opacity: ent}}>
          <FitLabel id={`${ctx.id}:pop`} text={popText} maxW={rx * 2} size={SIZE.sub} color={C.ink} weight={FONT.label.strong} style={{fontFeatureSettings: '"tnum" 1'}} />
        </At>
      ) : null}
      <At x={cupC.x} y={cy0 - SIZE.labelMin * 1.4} style={{opacity: ent}}>
        <Chip id={`${ctx.id}:method`} text={METHOD[props.method]} color={C.signal} size={SIZE.labelMin} style={{boxShadow: glowBox(C.signal, fx, 0.25 * gk), outline: `1px solid ${C.grid}`}} />
      </At>
    </Stage>
  );
};

/** Text-safe rect: the population label band and the method chip. */
const textRect = (_p: Props, b: {x: number; y: number; w: number; h: number}) => ({x: b.x, y: b.y, w: b.w, h: SIZE.sub * 1.9});

export const SampleScoop: DcComponent<Props> = {name: 'SampleScoop', Component: SampleScoopView, text: true, slot: 'full', textRect};
