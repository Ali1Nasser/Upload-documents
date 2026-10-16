// AttentionBeams (catalog: Space & 3D). 04 section 6 "NLP, attention, Transformer": Q.K beams form the attention weights. The tokens sit
// on one baseline (whole strings, one chip each; right -> left for Arabic, left -> right for Latin); the focus token is `signal`;
// glowing arcs leave it and land on every token it attends to. Beam width and brightness = the attention weight (relative to the
// strongest), so the eye reads "who matters" before any figure is read.
// Weights: props.weights when given; otherwise a seeded decay over distance (VISUAL ONLY: no number is printed without `weights`).
// Numbers: only when BOTH `weights` and `ref` are given, each landing token shows its weight (2 decimals, Western digits, mono) above
//   it, and `ref` is the data-contract id / sentence that carries the figures (rule: every shown number carries a ref).
// Actions: attend {from, to[]} on its own word (RV1): the focus moves to `from`, the old beams retract and the new beams draw to the
//   `to` tokens (weights[to] when given, else an equal share); the latest attend wins.
// Layout: tokens sit at equal pitch. If the widest chip fits the pitch they share one baseline; if not (>= 12 tokens) they alternate
// between two baselines so labels stay >= 28 px without colliding; below the floor an overflow is reported.
// Tiers: lite flat lines; standard + glow underlay, focus light pool, sparks running along settled beams and landing ripples; hero adds a stronger bloom on the landing points (bloomOf). Beam bloom is masked out of copy.
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {westernDigits} from '../../type/words';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {
  Chip, Measure, MLabel, SpaceCanvas, actionsOf, anyArabic, blit, bloomOf, chipH, chipW, enterK, exitK, ff, fitSearch, fmtNum, moveK, rgba, sprite, useMeasure, useOverflow,
} from '../_space3d/kit';

const BASE = SIZE.body;
const MIN_GAP = 14; // between neighbours on one baseline
const NUM_SIZE = SIZE.labelMin; // landing figures are spoken: 28 px floor
const NUM_H = 46;

type Beam = {to: number; w: number; rank: number};
type Set_ = {from: number; beams: Beam[]; t0: number};

/** Seeded decay over distance for the unweighted case (visual only). */
const seededWeights = (n: number, focus: number): number[] =>
  Array.from({length: n}, (_, j) => (j === focus ? 0 : (0.25 + 0.75 * random(`ab${n}:${focus}:${j}`)) / (1 + 0.35 * Math.abs(j - focus))));

export const beamSets = (props: Props, ctx: LayerCtx): Set_[] => {
  const n = props.tokens.length;
  const focus = Math.min(n - 1, props.focus);
  const w0 = props.weights ?? seededWeights(n, focus);
  const mk = (from: number, to: number[], ws: (j: number) => number): Beam[] =>
    to.filter((j) => j >= 0 && j < n && j !== from).map((j) => ({to: j, w: ws(j), rank: 0}))
      .sort((a, b) => Math.abs(a.to - from) - Math.abs(b.to - from))
      .map((b, rank) => ({...b, rank}));
  const base = mk(focus, props.weights ? w0.map((w, j) => (w > 0.02 ? j : -1)) : w0.map((_, j) => j), (j) => w0[j] ?? 0.1);
  const sets: Set_[] = [{from: focus, beams: base, t0: ctx.at}];
  for (const a of actionsOf(ctx, 'attend')) {
    const p = a.props as {from: number; to: number[]};
    const from = Math.min(n - 1, p.from);
    // props.weights is the row of the base focus only: another row has no contract values, so its widths are seeded (visual only, never printed)
    const row = seededWeights(n, from);
    sets.push({from, beams: mk(from, p.to, (j) => Math.max(0.1, row[j] ?? 0.1)), t0: a.at});
  }
  return sets;
};

type Pos = {x: number; y: number; w: number; h: number};
export const layoutTokens = (widths: number[], size: number, box: {x: number; y: number; w: number; h: number}, rtl: boolean, hs: number[]): {pos: Pos[]; rows: number; ok: boolean} => {
  const n = widths.length;
  const pitch = box.w / n;
  const ws = widths.map((w) => chipW(w, BASE, size));
  const maxW = Math.max(...ws);
  const rows = maxW + MIN_GAP <= pitch ? 1 : 2;
  const ok = maxW + MIN_GAP <= pitch * rows;
  const rowH = Math.max(...hs);
  const pos = ws.map((w, i): Pos => {
    const cx = rtl ? box.x + box.w - pitch * (i + 0.5) : box.x + pitch * (i + 0.5);
    const lower = rows === 2 && i % 2 === 1;
    return {x: cx - w / 2, y: box.y + box.h * 0.8 - rowH * rows - (rows === 2 ? 10 : 0) + (lower ? rowH + 10 : 0), w, h: hs[i]};
  });
  return {pos, rows, ok};
};

export const AttentionBeamsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const toks = props.tokens.map(westernDigits);
  const n = toks.length;
  const [mref, m] = useMeasure(ctx.id, toks.join('|'));
  const rtl = anyArabic(toks);
  const box = ctx.box;
  const sets = beamSets(props, ctx);
  const live = sets.filter((s) => s.t0 <= ctx.frame);
  const cur = live.length ? live[live.length - 1] : sets[0];
  const prev = live.length > 1 ? live[live.length - 2] : null;
  const refOn = !!props.ref && !!props.weights;
  const showNums = refOn && cur === sets[0]; // figures belong to the contract row (the base focus), never to an `attend` row
  const k = enterK(ctx) * exitK(ctx);
  const hsAt = (s: number) => toks.map((t) => chipH(t, s));
  const fit = m
    ? fitSearch(BASE, SIZE.labelMin, (s) => layoutTokens(m.w, s, box, rtl, hsAt(s)).ok)
    : {size: BASE, overflow: false};
  useOverflow(ctx.id, fit.overflow, {tokens: n, size: fit.size});
  const lay = m ? layoutTokens(m.w, fit.size, box, rtl, hsAt(fit.size)) : null;
  const bloom = bloomOf(ctx.fx);
  const arcTop = box.y + Math.round(box.h * 0.12); // the arcs are the hero: they rise into the upper third

  const anchorOf = (i: number, raise: boolean): {x: number; y: number} | null => {
    if (!lay) return null;
    const p = lay.pos[i];
    return {x: p.x + p.w / 2, y: p.y - (raise ? NUM_H + 6 : 6)};
  };
  const curve = (a: {x: number; y: number}, b: {x: number; y: number}) => {
    const dx = Math.abs(b.x - a.x);
    const lift = Math.min(2 * (a.y - arcTop), 120 + dx * 0.72); // control-point lift; the curve peaks at half of it
    return {cx: (a.x + b.x) / 2, cy: Math.min(a.y, b.y) - lift};
  };
  const pt = (a: {x: number; y: number}, c: {cx: number; cy: number}, b: {x: number; y: number}, u: number) => ({
    x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.cx + u * u * b.x,
    y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.cy + u * u * b.y,
  });
  const wMax = (s: Set_) => Math.max(0.05, ...s.beams.map((b) => b.w));

  const drawBeams = (g: CanvasRenderingContext2D) => {
    if (!lay || k <= 0) return;
    g.lineCap = 'round';
    // floor (LK-F depth and light): a hairline under the chips that fades out at both ends; standard + hero put a flattened pool of
    // signal light under the focus chip and under every landing chip (pool size and brightness = the weight), all under the chips
    const lo = Math.min(...lay.pos.map((q) => q.x));
    const hi = Math.max(...lay.pos.map((q) => q.x + q.w));
    const floorY = Math.max(...lay.pos.map((q) => q.y + q.h)) + 16;
    const fg = g.createLinearGradient(lo - 60, 0, hi + 60, 0);
    fg.addColorStop(0, rgba(C.grid, 0));
    fg.addColorStop(0.12, rgba(C.grid, 0.9 * k));
    fg.addColorStop(0.88, rgba(C.grid, 0.9 * k));
    fg.addColorStop(1, rgba(C.grid, 0));
    g.fillStyle = fg;
    g.fillRect(lo - 60, floorY, hi - lo + 120, 2);
    if (bloom) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const pool = (cx: number, r: number, al: number) => {
        g.save();
        g.translate(cx, floorY + 6);
        g.scale(2.6, 0.32);
        blit(g, sprite(C.signal, 'glow'), 0, 0, r, al);
        g.restore();
      };
      const fp = lay.pos[cur.from];
      pool(fp.x + fp.w / 2, 100, 0.55 * k * moveK(ctx, cur.t0, 8));
      const wm0 = wMax(cur);
      for (const b of cur.beams) {
        const q = lay.pos[b.to];
        pool(q.x + q.w / 2, 46 + 40 * (b.w / wm0), 0.5 * (b.w / wm0) * k * moveK(ctx, cur.t0 + b.rank * ff(2, ctx.fps) + ff(4, ctx.fps), 8));
      }
      g.restore();
    }
    const paint = (s: Set_, vis: number, retract: number) => {
      const wm = wMax(s);
      for (const b of s.beams) {
        const a = anchorOf(s.from, false)!;
        const e = anchorOf(b.to, refOn && s === sets[0])!;
        const c = curve(a, e);
        const u = moveK(ctx, s.t0 + b.rank * ff(2, ctx.fps), 8) * (1 - retract) * vis;
        if (u <= 0.001) continue;
        const rel = Math.max(0.12, b.w / wm);
        const steps = 28;
        const draw = (lw: number, al: number, col: string) => {
          g.globalAlpha = 1;
          g.strokeStyle = rgba(col, al * k);
          g.lineWidth = lw;
          g.beginPath();
          for (let i = 0; i <= steps * u; i++) {
            const q = pt(a, c, e, Math.min(u, i / steps));
            if (i) g.lineTo(q.x, q.y);
            else g.moveTo(q.x, q.y);
          }
          g.stroke();
        };
        if (bloom && rel > 0.3) draw(ctx.fx.glowInner * (0.6 + rel), 0.12 * rel * bloom, C.signal);
        draw(2 + 9 * rel, 0.3 + 0.7 * rel, C.signal);
        if (ctx.fx.id !== 'lite') draw(1.2, 0.8 * rel, C.white);
        // receiver node: a solid dot where the beam lands, sized by the weight (also in lite)
        if (u >= 0.999) {
          g.fillStyle = rgba(C.signal, (0.55 + 0.45 * rel) * k);
          g.beginPath();
          g.arc(e.x, e.y, 4 + 5 * rel, 0, Math.PI * 2);
          g.fill();
        }
      }
    };
    if (prev) paint(prev, 1, moveK(ctx, cur.t0, 6));
    paint(cur, 1, 0);
  };
  const drawBloom = (g: CanvasRenderingContext2D) => {
    if (!lay || k <= 0 || !bloom) return;
    g.globalCompositeOperation = 'lighter';
    const f = anchorOf(cur.from, false)!;
    blit(g, sprite(C.signal, 'glow'), f.x, f.y, 90, 0.7 * k);
    const wm = wMax(cur);
    const period = ff(30, ctx.fps);
    for (const b of cur.beams) {
      const a = f;
      const e = anchorOf(b.to, showNums)!;
      const c = curve(a, e);
      const t1 = cur.t0 + b.rank * ff(2, ctx.fps);
      const u = moveK(ctx, t1, 8);
      const rel = Math.max(0.12, b.w / wm);
      blit(g, sprite(C.signal, 'core'), e.x, e.y, 14 + 26 * rel, 0.9 * u * k);
      // a spark runs focus -> target along the settled beam (seeded phase, frame-driven: deterministic); brighter beams run more sparks
      if (u < 1) continue;
      const nSp = rel > 0.6 ? 2 : 1;
      for (let q = 0; q < nSp; q++) {
        const ph = random(`abs:${ctx.id}:${b.to}:${q}`);
        const tt = ((ctx.frame - t1 + ph * period + (q * period) / nSp) % period) / period;
        const sp = pt(a, c, e, Math.max(0, tt));
        const fade = Math.sin(Math.PI * tt);
        blit(g, sprite(C.signal, 'core'), sp.x, sp.y, 12 + 12 * rel, (0.5 + 0.5 * rel) * fade * k);
      }
      // landing ring: a short ripple when the beam arrives (impact length)
      const ring = moveK(ctx, t1 + ff(8, ctx.fps), 10);
      if (ring > 0 && ring < 1) blit(g, sprite(C.signal, 'glow'), e.x, e.y, 20 + 70 * ring * rel, 0.5 * (1 - ring) * k);
    }
  };

  const rect = {x: box.x - 80, y: box.y - 60, w: box.w + 160, h: box.h + 120};
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawBeams} deps={[ctx.frame, m, fit.size, k, props.weights, props.focus, ctx.fx.id]} rect={rect} />
      {ctx.fx.id !== 'lite' ? <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawBloom} deps={[ctx.frame, m, fit.size, k, ctx.fx.id]} rect={rect} textSafe /> : null}
      <Measure mref={mref} size={BASE}>
        {toks.map((t, i) => <MLabel key={i} text={t} size={BASE} />)}
      </Measure>
      {lay
        ? toks.map((t, i) => {
            const p = lay.pos[i];
            const isFocus = i === cur.from;
            const hit = cur.beams.find((b) => b.to === i);
            const dim = !isFocus && !hit;
            return (
              <React.Fragment key={i}>
                <Chip ctx={ctx} id={`${ctx.id}:t${i}`} text={t} size={fit.size} x={p.x} y={p.y} t0={ctx.at + ff(1 + i, ctx.fps)} accent={isFocus ? C.signal : undefined} color={dim ? C.ink3 : C.ink} overflow={fit.overflow} alpha={k} />
                {isFocus ? (
                  // focus plate (read before the arcs draw): a signal tint and a 2 px signal edge over the chip plate
                  <div style={{position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, boxSizing: 'border-box', borderRadius: 14, background: rgba(C.signal, 0.16), border: `2px solid ${rgba(C.signal, 0.9)}`, opacity: k * moveK(ctx, ctx.at + ff(1 + i, ctx.fps), 8), pointerEvents: 'none'}} />
                ) : null}
                {showNums && hit && props.weights ? (
                  <Chip ctx={ctx} id={`${ctx.id}:w${i}`} text={fmtNum(hit.w, 2)} size={NUM_SIZE} x={p.x + p.w / 2 - 52} y={p.y - NUM_H - 4} t0={cur.t0 + hit.rank * ff(2, ctx.fps) + ff(4, ctx.fps)} color={C.signal} mono plate={false} alpha={k} />
                ) : null}
              </React.Fragment>
            );
          })
        : null}
    </>
  );
};

export const AttentionBeams: DcComponent<Props> = {name: 'AttentionBeams', Component: AttentionBeamsView, text: true, slot: 'full'};
