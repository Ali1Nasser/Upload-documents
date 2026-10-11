// SampleScoop (catalog: Domain specials; 04 section 6 "Statistics: sampling = scooping from a pool"). A seeded population
// of point sprites sits in a pool (RTL: the population on the right); a scoop lifts a sample into a glass cup on the left
// and the cup's mean drops a block onto a small histogram, draw after draw, so the sampling distribution assembles over
// repeated samples (fact-check D2 ruling 4: one sample's mean is never "the truth").
// `method` sets the draw: random (seeded indices), stratified (violet strata bands, the same share from each band),
// systematic (every k-th unit of the frame from a seeded start), cluster (violet cluster hulls; whole clusters taken).
// Numbers: only the population label (`population`, with its ref) is shown. The dots are decorative (D2 ruling 2): the dot
// count stands for no quantity, `sample` is never displayed and does not set the dot count (CR filed: sample optional),
// the histogram has no axis and no digits. Determinism: random(seed) only.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {At, Chip, FitLabel, Stage, Svg, f24, glowBox, lerp, prog, progN, rim, type Pt} from '../_dom-b/kit';

const DOTS = 240; // decorative population sprites (<= FX.lite.particles); not a quantity
const PICK = 18; // decorative dots per scoop; not the sample size
const BINS = 9;
const STRATA = 3;
const CLUSTERS = 8;

type Dot = {p: Pt; v: number; band: number; cl: number};

const buildPop = (seed: number, method: Props['method'], c: Pt, rx: number, ry: number): {dots: Dot[]; centres: Pt[]} => {
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
    return {p, v: (p.x - (c.x - rx)) / (2 * rx), band, cl};
  });
  return {dots, centres};
};

/** Indices drawn in scoop k (deterministic per seed). */
const drawIdx = (dots: Dot[], method: Props['method'], seed: number, k: number): number[] => {
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
  const labelH = SIZE.body * 2;
  const pc = {x: W * 0.68, y: labelH + (H - labelH) * 0.46};
  const rx = W * 0.27;
  const ry = (H - labelH) * 0.36;
  const {dots, centres} = buildPop(props.seed, props.method, pc, rx, ry);
  // cup + histogram (left)
  const cupC = {x: W * 0.2, y: labelH + (H - labelH) * 0.3};
  const cupW = Math.min(W * 0.17, 300);
  const cupH = cupW * 0.8;
  const histY = labelH + (H - labelH) * 0.92;
  const histW = Math.min(W * 0.3, 520);
  const binW = histW / BINS;
  const blockH = Math.max(10, binW * 0.42);
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
    return {x: cupC.x + (u - 0.5) * cupW * 0.7 + (r('x') - 0.5) * cupW * 0.08, y: cupC.y + cupH * 0.12 + r('y') * cupH * 0.26};
  };
  const dotR = Math.max(3, Math.min(W, H) * 0.0065);
  // histogram stacks
  const stacks: {bin: number; level: number; t: number}[] = [];
  const level = new Array(BINS).fill(0);
  for (const d of draws) {
    stacks.push({bin: d.bin, level: level[d.bin], t: d.t0 + drop});
    level[d.bin] += 1;
  }
  const popText = props.population ? `${formatValue(props.population.value, 'integer', props.population.decimals ?? 0)}${props.population.unit ? ` ${props.population.unit}` : ''}` : null;
  const METHOD: Record<Props['method'], string> = {random: 'random', stratified: 'stratified', systematic: 'systematic', cluster: 'cluster'};

  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        {/* the pool */}
        <ellipse cx={pc.x} cy={pc.y} rx={rx} ry={ry} fill={`${C.panel}${hex(0.55)}`} stroke={C.grid} strokeWidth={2} opacity={ent} />
        {props.method === 'stratified'
          ? Array.from({length: STRATA - 1}, (_, b) => {
              const y = pc.y - ry + ((b + 1) * 2 * ry) / STRATA;
              const hw = rx * Math.sqrt(Math.max(0, 1 - ((y - pc.y) / ry) ** 2));
              return <line key={b} x1={pc.x - hw} x2={pc.x + hw} y1={y} y2={y} stroke={C.violet} strokeWidth={2} strokeDasharray="8 8" opacity={ent * 0.8} />;
            })
          : null}
        {props.method === 'cluster'
          ? centres.map((c, i) => {
              const hot = active && active.list.some((j) => dots[j].cl === i) && t >= active.t0;
              return <ellipse key={i} cx={c.x} cy={c.y} rx={rx * 0.2} ry={ry * 0.2} fill="none" stroke={C.violet} strokeWidth={hot ? 3 : 1.5} opacity={ent * (hot ? 1 : 0.6)} />;
            })
          : null}
        {dots.map((d, i) => {
          const eI = prog(ctx, ctx.at + Math.floor((i % 24) * (fps / 24)), 'label');
          const picked = active && active.idx.has(i);
          if (!picked) return <circle key={i} cx={d.p.x} cy={d.p.y} r={dotR} fill={C.ink2} opacity={eI * 0.7} />;
          const a = active as (typeof draws)[number];
          const hq = progN(ctx, a.t0, presetFrames('label', fps));
          const mq = progN(ctx, a.t0 + lift, morph, ease.camera);
          const j = a.list.indexOf(i);
          const to = cupSlot(j, a.list.length);
          const x = lerp(d.p.x, to.x, mq);
          const y = lerp(d.p.y, to.y, mq) - Math.sin(mq * Math.PI) * ry * 0.35;
          return (
            <g key={i}>
              {mq > 0 ? <circle cx={d.p.x} cy={d.p.y} r={dotR} fill="none" stroke={C.ink3} strokeWidth={1} opacity={0.6} /> : null}
              <circle cx={x} cy={y} r={dotR * (1 + 0.5 * hq)} fill={C.signal} opacity={eI} />
              <circle cx={x} cy={y} r={dotR * 2.6} fill={C.signal} opacity={0.18 * hq} />
            </g>
          );
        })}
        {/* the cup (glass beaker) */}
        <g opacity={ent}>
          <path
            d={`M${cupC.x - cupW / 2} ${cupC.y - cupH * 0.2} L${cupC.x - cupW * 0.4} ${cupC.y + cupH * 0.5} Q${cupC.x} ${cupC.y + cupH * 0.62} ${cupC.x + cupW * 0.4} ${cupC.y + cupH * 0.5} L${cupC.x + cupW / 2} ${cupC.y - cupH * 0.2}`}
            fill={`${C.signal}${hex(0.06)}`}
            stroke={C.signal}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <ellipse cx={cupC.x} cy={cupC.y - cupH * 0.2} rx={cupW / 2} ry={cupH * 0.07} fill="none" stroke={`${C.signal}${hex(0.6)}`} strokeWidth={1.5} />
        </g>
        {/* histogram of sample means: no axis, no digits */}
        <line x1={cupC.x - histW / 2} x2={cupC.x + histW / 2} y1={histY} y2={histY} stroke={C.ink3} strokeWidth={2} opacity={ent} />
        {stacks.map((s, k) => {
          const q = progN(ctx, s.t, presetFrames('impact', fps, true), ease.impact);
          if (t < s.t) return null;
          const x = cupC.x - histW / 2 + s.bin * binW + binW * 0.1;
          const y = histY - (s.level + 1) * (blockH + 3);
          return <rect key={k} x={x} y={y - (1 - q) * blockH * 2} width={binW * 0.8} height={blockH} rx={3} fill={C.signal} opacity={Math.min(1, q * 1.4) * 0.85} style={{filter: undefined}} />;
        })}
        {/* the falling mean marker */}
        {active && t >= active.t0 + lift + morph
          ? (() => {
              const q = progN(ctx, active.t0 + lift + morph, active.t0 + drop - (active.t0 + lift + morph), ease.camera);
              const x = cupC.x - histW / 2 + (active.bin + 0.5) * binW;
              return q < 1 ? <line x1={cupC.x} y1={cupC.y + cupH * 0.55} x2={lerp(cupC.x, x, q)} y2={lerp(cupC.y + cupH * 0.55, histY - blockH, q)} stroke={C.signal} strokeWidth={2} strokeDasharray="4 6" opacity={0.8} /> : null;
            })()
          : null}
      </Svg>
      {popText ? (
        <At x={pc.x} y={labelH / 2} style={{opacity: ent}}>
          <FitLabel id={`${ctx.id}:pop`} text={popText} maxW={rx * 2} size={SIZE.body} color={C.ink} weight={FONT.label.strong} style={{fontFeatureSettings: '"tnum" 1'}} />
        </At>
      ) : null}
      <At x={cupC.x} y={cupC.y - cupH * 0.2 - SIZE.labelMin * 1.4} style={{opacity: ent}}>
        <Chip id={`${ctx.id}:method`} text={METHOD[props.method]} color={C.signal} size={SIZE.labelMin} style={{boxShadow: glowBox(C.signal, fx, 0.25), outline: `1px solid ${C.grid}`}} />
      </At>
      <div style={{position: 'absolute', left: cupC.x - histW / 2, top: histY + 4, width: histW, height: 2, boxShadow: rim(0.1)}} />
    </Stage>
  );
};

/** Text-safe rect: the population label band and the method chip. */
const textRect = (_p: Props, b: {x: number; y: number; w: number; h: number}) => ({x: b.x, y: b.y, w: b.w, h: SIZE.body * 2});

export const SampleScoop: DcComponent<Props> = {name: 'SampleScoop', Component: SampleScoopView, text: true, slot: 'full', textRect};
