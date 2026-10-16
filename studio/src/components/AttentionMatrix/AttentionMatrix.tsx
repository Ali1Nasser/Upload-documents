// AttentionMatrix (catalog: Space & 3D). 04 section 6 "NLP, attention, Transformer": the heat-map matrix. Rows = the token that is
// looking (query), columns = the token being looked at (key), drawn as a mathematician reads it (columns left -> right, so a causal
// mask is visibly LOWER-triangular, d:6.17:2); row labels sit to the left, column labels run on a 45 degree rise above the grid.
// Cell colour = the weight (panel -> signal ramp, brightest cell = the thing being explained); a zero cell is a dim hatch-free void
// (the mask). Cells arrive on an anti-diagonal wave from the layer anchor (RV1: the first wave front is on the anchor frame).
// Numbers: printed in the cells only when BOTH `matrix` and `ref` are given (and the cells are big enough, <= 8 tokens); `ref` is
//   the data-contract id / sentence that carries the figures. Without `matrix` a seeded row-normalised matrix is drawn as a pure
//   picture (visual only, no figures).
// highlightRow {index}: on its word that row takes a signal outline and its label, the others dim (latest wins).
// Depth and light (ADR-003 LK-F): the grid lies on a rim-lit glass panel (top and left rim, contact shadow); cells are bevelled, masked cells are
//   recessed voids with a faint edge. Tiers: lite flat bevelled cells; standard + signal light pool under the panel and glow on the brightest cells; hero + bloom. Cell figures are copy: the glow canvas is text-safe masked.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {halo} from '../../fx/look';
import {westernDigits} from '../../type/words';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {
  Chip, Measure, MLabel, SpaceCanvas, actionsOf, blit, bloomOf, chipH, chipW, enterK, exitK, ff, fitSearch, fmtNum, labelStyle, lerp, mix, moveK, rgba, sprite, useMeasure, useOverflow,
} from '../_space3d/kit';

const BASE = SIZE.label;
const GAP = 3; // between cells (layout constant)
const CS_MAX = 128;
const CS_MIN = 30;
const SIN45 = Math.SQRT1_2;
const FIG_MAX_TOKENS = 8; // figures print inside cells only up to this many tokens (readability)

/** The weight matrix as drawn: the given rows (missing entries 0) or a seeded, row-normalised causal-leaning picture. */
export const matrixOf = (props: Props): {m: number[][]; given: boolean} => {
  const n = props.tokens.length;
  if (props.matrix) return {m: Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => props.matrix?.[i]?.[j] ?? 0)), given: true};
  const m = Array.from({length: n}, (_, i) => {
    const row = Array.from({length: n}, (_, j) => (j > i ? 0 : (0.15 + 0.85 * random(`am${n}:${i}:${j}`) ** 2) / (1 + 0.5 * (i - j))));
    const s = row.reduce((a, b) => a + b, 0) || 1;
    return row.map((v) => v / s);
  });
  return {m, given: false};
};

type Lay = {cs: number; x0: number; y0: number; labW: number; hh: number; size: number; ok: boolean};
const layout = (widths: number[], hs: number[], size: number, box: {x: number; y: number; w: number; h: number}): Lay => {
  const n = widths.length;
  const ws = widths.map((w) => chipW(w, BASE, size));
  const labW = Math.max(...ws);
  const hh = Math.max(...ws.map((w, i) => (w + hs[i]) * SIN45)) + 10;
  const rm = (ws[n - 1] + hs[n - 1]) * SIN45 - 20; // the last column label rises past the grid on the right
  const csW = (box.w - labW - 24 - Math.max(0, rm)) / n;
  const csH = (box.h - hh) / n;
  const cs = Math.floor(Math.min(CS_MAX, csW, csH));
  const total = labW + 24 + cs * n + Math.max(0, rm);
  const x0 = box.x + (box.w - total) / 2 + labW + 24;
  const y0 = box.y + hh + Math.max(0, (box.h - hh - cs * n) / 2);
  return {cs, x0, y0, labW, hh, size, ok: cs >= CS_MIN};
};

export const AttentionMatrixView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const toks = props.tokens.map(westernDigits);
  const n = toks.length;
  const labels = props.head ? [...toks, props.head] : toks;
  const [mref, meas] = useMeasure(ctx.id, labels.join('|'));
  const box = ctx.box;
  const {m, given} = matrixOf(props);
  const hsAt = (s: number) => toks.map((t) => chipH(t, s));
  const fit = meas ? fitSearch(BASE, SIZE.labelMin, (s) => layout(meas.w.slice(0, n), hsAt(s), s, box).ok) : {size: BASE, overflow: false};
  useOverflow(ctx.id, fit.overflow, {tokens: n});
  const L = meas ? layout(meas.w.slice(0, n), hsAt(fit.size), fit.size, box) : null;
  const k = enterK(ctx, 'label') * exitK(ctx);
  const hr = actionsOf(ctx, 'highlightRow').filter((a) => a.at <= ctx.frame).pop();
  const hrIdx = hr ? Math.min(n - 1, (hr.props as {index: number}).index) : -1;
  const hrK = hr ? moveK(ctx, hr.at, 6) : 0;
  const bloom = bloomOf(ctx.fx);
  const showFig = given && !!props.ref && n <= FIG_MAX_TOKENS;
  const figPx = L ? Math.max(SIZE.secondaryMin, Math.min(SIZE.labelMin, Math.floor(L.cs * 0.34))) : SIZE.labelMin;
  const wave = (i: number, j: number) => moveK(ctx, ctx.at + (i + j) * ff(1, ctx.fps), 6);
  const rowDim = (i: number) => (hrIdx < 0 ? 1 : lerp(1, i === hrIdx ? 1 : 0.32, hrK));

  const drawCells = (g: CanvasRenderingContext2D) => {
    if (!L || k <= 0) return;
    const {cs, x0, y0} = L;
    const gw = cs * n;
    const PAD = 10;
    const std = ctx.fx.id !== 'lite';
    // glass panel under the grid: the matrix is an object lying in the scene (key light from the upper left, rim on top, contact shadow below)
    const px = x0 - PAD;
    const py = y0 - PAD;
    const pw = gw + 2 * PAD;
    const ph = gw + 2 * PAD;
    const pk = enterK(ctx, 'arrive') * exitK(ctx);
    const sh = g.createLinearGradient(0, py + ph, 0, py + ph + 56);
    sh.addColorStop(0, rgba(C.void, 0.7 * pk));
    sh.addColorStop(1, rgba(C.void, 0));
    g.fillStyle = sh;
    g.fillRect(px + 6, py + ph - 2, pw - 12, 58);
    if (std) {
      // soft elliptical light pool on the floor below the panel (a squashed radial, never a hard-edged bar)
      const R = pw * 0.6;
      g.save();
      g.translate(px + pw / 2, py + ph + 6);
      g.scale(1, 0.14);
      const pool = g.createRadialGradient(0, 0, 0, 0, 0, R);
      pool.addColorStop(0, rgba(C.signal, 0.2 * pk));
      pool.addColorStop(0.5, rgba(C.signal, 0.07 * pk));
      pool.addColorStop(1, rgba(C.signal, 0));
      g.fillStyle = pool;
      g.fillRect(-R, -R, 2 * R, 2 * R);
      g.restore();
    }
    const body = g.createLinearGradient(px, py, px + pw * 0.4, py + ph);
    body.addColorStop(0, rgba(mix(C.panel, C.ink3, 0.12), 0.94 * pk));
    body.addColorStop(1, rgba(C.ground, 0.94 * pk));
    g.fillStyle = body;
    g.fillRect(px, py, pw, ph);
    g.fillStyle = rgba(C.ink2, 0.5 * pk);
    g.fillRect(px, py, pw, 2); // top rim
    g.fillStyle = rgba(C.ink3, 0.28 * pk);
    g.fillRect(px, py, 2, ph); // left rim
    g.fillStyle = rgba(C.void, 0.55 * pk);
    g.fillRect(px, py + ph - 2, pw, 2);
    // the highlighted row lies in a lit channel
    if (hrIdx >= 0 && hrK > 0) {
      g.fillStyle = rgba(C.signal, 0.12 * hrK * k);
      g.fillRect(px, y0 + hrIdx * cs - 2, pw, cs + 4);
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = m[i][j];
        const a = wave(i, j) * rowDim(i) * k;
        if (a <= 0.004) continue;
        const x = x0 + j * cs + GAP / 2;
        const y = y0 + i * cs + GAP / 2;
        const w = cs - GAP;
        g.globalAlpha = 1;
        if (v <= 0) {
          // masked cell: a recessed void with a faint edge, so the lower-triangular mask reads as a mask and not as missing data
          g.fillStyle = rgba(C.void, 0.55 * a);
          g.fillRect(x, y, w, w);
          g.strokeStyle = rgba(C.grid, 0.9 * a);
          g.lineWidth = 1;
          g.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
          continue;
        }
        const t = Math.min(1, v ** 0.55);
        g.fillStyle = rgba(mix(C.panel, C.signal, t), (0.62 + 0.38 * t) * a);
        g.fillRect(x, y, w, w);
        // bevel: lit top and left edges, shaded bottom and right edges (strong cells catch more light)
        g.fillStyle = rgba(C.white, (0.1 + 0.3 * t) * a);
        g.fillRect(x, y, w, 2);
        g.fillRect(x, y, 2, w);
        g.fillStyle = rgba(C.void, 0.35 * a);
        g.fillRect(x, y + w - 2, w, 2);
        g.fillRect(x + w - 2, y, 2, w);
        if (v >= 0.35) {
          g.strokeStyle = rgba(C.signal, Math.min(1, (v - 0.2) * 1.4) * a);
          g.lineWidth = 2;
          g.strokeRect(x + 1, y + 1, w - 2, w - 2);
        }
      }
    if (hrIdx >= 0 && hrK > 0) {
      g.globalAlpha = 1;
      g.strokeStyle = rgba(C.signal, 0.95 * hrK * k);
      g.lineWidth = 4;
      g.strokeRect(x0 - 3, y0 + hrIdx * cs - 3, gw + 6, cs + 6);
    }
  };
  const drawGlow = (g: CanvasRenderingContext2D) => {
    if (!L || k <= 0 || !bloom) return;
    const {cs, x0, y0} = L;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = m[i][j];
        if (v < 0.42) continue;
        blit(g, sprite(C.signal, 'glow'), x0 + (j + 0.5) * cs, y0 + (i + 0.5) * cs, cs * 0.95, 0.5 * (v - 0.3) * wave(i, j) * rowDim(i) * k * bloom);
      }
  };

  const figStyle = (i: number, j: number): React.CSSProperties => {
    const st = labelStyle(ctx, ctx.at + (i + j) * ff(1, ctx.fps) + ff(4, ctx.fps));
    return {...st, opacity: (typeof st.opacity === 'number' ? st.opacity : 1) * rowDim(i) * k};
  };
  const rect = {x: box.x - 40, y: box.y - 40, w: box.w + 80, h: box.h + 80};
  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawCells} deps={[ctx.frame, L?.cs, L?.x0, L?.y0, k, hrIdx, hrK, props.matrix, ctx.fx.id]} rect={rect} />
      {ctx.fx.id !== 'lite' ? <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawGlow} deps={[ctx.frame, L?.cs, L?.x0, k, hrIdx, hrK, ctx.fx.id]} rect={rect} textSafe /> : null}
      <Measure mref={mref} size={BASE}>
        {labels.map((t, i) => <MLabel key={i} text={t} size={BASE} />)}
      </Measure>
      {L && meas
        ? (
          <>
            {toks.map((t, i) => {
              const w = chipW(meas.w[i], BASE, fit.size);
              const h = chipH(t, fit.size);
              const act = i === hrIdx;
              return (
                <React.Fragment key={i}>
                  <Chip ctx={ctx} id={`${ctx.id}:r${i}`} text={t} size={fit.size} x={L.x0 - 24 - w} y={L.y0 + (i + 0.5) * L.cs - h / 2} t0={ctx.at + ff(2 + i, ctx.fps)} accent={act ? C.signal : undefined} color={hrIdx < 0 || act ? C.ink : C.ink3} overflow={fit.overflow} alpha={k} />
                  <div style={{position: 'absolute', left: L.x0 + (i + 0.5) * L.cs - 10, top: L.y0 - 12, width: 0, height: 0, transformOrigin: '0 0', transform: 'rotate(-45deg)'}}>
                    <Chip ctx={ctx} id={`${ctx.id}:c${i}`} text={t} size={fit.size} x={0} y={-h} t0={ctx.at + ff(2 + i, ctx.fps)} color={C.ink2} overflow={fit.overflow} alpha={k} />
                  </div>
                </React.Fragment>
              );
            })}
            {props.head ? (
              <Chip ctx={ctx} id={`${ctx.id}:head`} text={props.head} size={fit.size} x={L.x0 - 24 - chipW(meas.w[n], BASE, fit.size)} y={Math.max(box.y, L.y0 - L.hh)} t0={ctx.at} accent={C.violet} alpha={k} />
            ) : null}
            {showFig
              ? m.flatMap((row, i) =>
                  row.map((v, j) =>
                    v > 0 ? (
                      <div
                        key={`${i}:${j}`}
                        style={{position: 'absolute', left: L.x0 + j * L.cs, top: L.y0 + i * L.cs, width: L.cs, height: L.cs, display: 'flex', alignItems: 'center', justifyContent: 'center', ...figStyle(i, j)}}
                      >
                        <bdi dir="ltr" data-dc-text={`${ctx.id}:v${i}:${j}`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: figPx, fontFeatureSettings: '"tnum" 1', color: v > 0.5 ? C.void : C.ink, textShadow: v > 0.5 ? undefined : halo}}>
                          {fmtNum(v, 2)}
                        </bdi>
                      </div>
                    ) : null,
                  ),
                )
              : null}
          </>
        )
        : null}
    </>
  );
};

export const AttentionMatrix: DcComponent<Props> = {name: 'AttentionMatrix', Component: AttentionMatrixView, text: true, slot: 'full'};
