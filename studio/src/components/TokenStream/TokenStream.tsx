// TokenStream (catalog: Space & 3D). 04 section 6 "NLP, attention, Transformer": text -> token tiles. Each token is a glass tile (one
// whole string: an Arabic word, a Latin sub-word or a code piece, never split) that slides in along the stream; the head of the
// stream (the newest tile) is `signal`, the brightest mark, older tiles settle to neutral. Tiles flow in the reading direction of
// their script (right -> left when the copy is Arabic), wrap into rows inside the slot, and never shift once placed (the layout
// uses every token, so a later arrival never moves an earlier tile).
// Timing (RV1, every motion on its own anchor frame):
//   no emit action: the tokens stream in from the layer anchor, one every 2 film frames;
//   emit {count}:   the layer anchor shows the empty lane (+ tokenizer label); each emit action releases the next `count` tokens on
//                   ITS word (generation / streaming: one token per spoken beat).
// show_ids: the schema carries no token-id values, so the small mono figure under a tile is its POSITION in the stream ("#3"),
//   never a vocabulary id (no invented numbers; CR-013 asks for an `ids` prop).
// Tiers: lite = flat lane; standard = + marching flow dashes and a head halo; hero = + bloom on the head. Text-safe: every copy
// box is cut out of the lane canvas. Auto-fit: tile size shrinks to SIZE.labelMin; below it an overflow is reported.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {westernDigits} from '../../type/words';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {
  Chip, Measure, MLabel, SpaceCanvas, actionsOf, anyArabic, blit, bloomOf, chipH, chipW, ff, fitSearch, moveK, rgba, secs, sprite, useMeasure, useOverflow,
} from '../_space3d/kit';
import {revealProgress, presetFrames, ease} from '../../type/reveal';

const BASE = SIZE.sub; // measured at 56 px; the tile size is searched down from here (prefers one row at >= SIZE.body)
const GAP = 16; // between tiles (layout constant)
const ROW_GAP = 26;
const ID_H = 26; // height of the position line under a tile
const VEC_H = 64; // the embedding vector that rises above a settled tile

/** Emission frame of every token (shot-local); Infinity = never released. */
export const emitTimes = (n: number, ctx: DcProps<Props>['ctx']): number[] => {
  const t: number[] = Array.from({length: n}, () => Infinity);
  const emits = actionsOf(ctx, 'emit');
  if (!emits.length) {
    for (let i = 0; i < n; i++) t[i] = ctx.at + i * ff(2, ctx.fps);
    return t;
  }
  let j = 0;
  for (const a of emits) for (let c = 0; c < (a.props as {count: number}).count && j < n; c++) t[j++] = a.at + c * ff(2, ctx.fps);
  return t;
};

type Tile = {i: number; x: number; y: number; w: number; h: number};
const flow = (widths: number[], size: number, base: number, box: {x: number; y: number; w: number; h: number}, rtl: boolean, rowH: number): {tiles: Tile[]; height: number; fits: boolean} => {
  const tiles: Tile[] = [];
  let row = 0;
  let cur = 0;
  let fits = true;
  widths.forEach((nat, i) => {
    const w = chipW(nat, base, size);
    if (w > box.w) fits = false;
    if (cur > 0 && cur + GAP + w > box.w) {
      row++;
      cur = 0;
    }
    const off = cur;
    tiles.push({i, x: rtl ? box.x + box.w - off - w : box.x + off, y: row * (rowH + ROW_GAP), w, h: rowH});
    cur = off + w + GAP;
  });
  const height = (row + 1) * rowH + row * ROW_GAP;
  return {tiles, height, fits};
};

export const TokenStreamView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const toks = props.tokens.map(westernDigits);
  const all = props.tokenizer ? [...toks, props.tokenizer] : toks;
  const [mref, m] = useMeasure(ctx.id, all.join('|'));
  const rtl = anyArabic(toks);
  const box = ctx.box;
  const ch = (s: number) => Math.max(...toks.map((t) => chipH(t, s)));
  const idH = props.show_ids ? ID_H : 0;
  const times = emitTimes(toks.length, ctx);
  const lastEmitted = times.reduce((b, t, i) => (t <= ctx.frame && (b < 0 || t >= times[b]) ? i : b), -1);
  const tokW = m ? m.w.slice(0, toks.length) : [];
  const tagH = props.tokenizer ? chipH(props.tokenizer, SIZE.labelMin) + 18 : 0;
  const avail = box.h - tagH;
  const oneRow = m ? fitSearch(BASE, SIZE.body, (s) => {
    const r = flow(tokW, s, BASE, box, rtl, VEC_H + ch(s) + idH);
    return r.fits && r.height <= avail && r.tiles.every((t) => t.y === 0);
  }) : {size: BASE, overflow: false};
  const fit = !m || !oneRow.overflow
    ? oneRow
    : fitSearch(SIZE.body, SIZE.labelMin, (s) => {
        const r = flow(tokW, s, BASE, box, rtl, VEC_H + ch(s) + idH);
        return r.fits && r.height <= avail;
      });
  useOverflow(ctx.id, fit.overflow, {tokens: toks.length, size: fit.size});
  const size = fit.size;
  const rowH = VEC_H + ch(size) + idH;
  const lay = m ? flow(tokW, size, BASE, box, rtl, rowH) : {tiles: [] as Tile[], height: 0, fits: true};
  const y0 = box.y + tagH + Math.max(0, (avail - lay.height) / 2);
  const glow = bloomOf(ctx.fx);
  const dirK = rtl ? -1 : 1;
  const tNow = secs(ctx);
  const rows = lay.height > 0 ? Math.round((lay.height + ROW_GAP) / (rowH + ROW_GAP)) : 0;

  const rect = {x: box.x - 60, y: box.y - 40, w: box.w + 120, h: box.h + 80};
  const gate = revealProgress(ctx.frame - ctx.at, presetFrames('arrive', ctx.fps), ease.arrive);
  // lane: guide line + marching flow dashes behind each row (plain lines, not haze: not masked, chips sit on plates)
  const drawLane = (g: CanvasRenderingContext2D) => {
    if (!m || gate <= 0) return;
    drawVectors(g);
    g.lineCap = 'round';
    for (let r = 0; r < rows; r++) {
      const cy = y0 + r * (rowH + ROW_GAP) + VEC_H + ch(size) / 2;
      g.strokeStyle = rgba(C.grid, 0.95 * gate);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(box.x, cy);
      g.lineTo(box.x + box.w, cy);
      g.stroke();
      if (ctx.fx.id !== 'lite') {
        g.strokeStyle = rgba(C.ink3, 0.6 * gate);
        g.lineWidth = 3;
        const period = 64;
        const off = (((tNow * 150 * dirK) % period) + period) % period;
        for (let x = box.x - period + off; x < box.x + box.w; x += period) {
          g.beginPath();
          g.moveTo(Math.max(box.x, x), cy);
          g.lineTo(Math.min(box.x + box.w, x + 16), cy);
          g.stroke();
        }
      }
    }
  };
  // "vectors rise": each settled tile grows a small embedding column above it (seeded cell heights; abstract, no figures)
  const drawVectors = (g: CanvasRenderingContext2D) => {
    if (!m) return;
    lay.tiles.forEach((t) => {
      const t0 = times[t.i];
      if (!Number.isFinite(t0)) return;
      const u = revealProgress(ctx.frame - t0 - ff(3, ctx.fps), ff(8, ctx.fps), ease.arrive);
      if (u <= 0) return;
      const head = t.i === lastEmitted;
      const base = y0 + t.y + VEC_H - 10;
      const cx = t.x + t.w / 2;
      for (let j = 0; j < 8; j++) {
        const hh = (0.25 + 0.75 * random(`ts:${toks[t.i]}:${j}`)) * (VEC_H - 18) * u;
        g.fillStyle = rgba(head ? C.signal : C.ink3, head ? 0.9 : 0.65);
        g.fillRect(cx + (j - 4) * 11, base - hh, 7, hh);
      }
    });
  };
  // head bloom (masked out of every copy box by the text-safe cut)
  const drawHead = (g: CanvasRenderingContext2D) => {
    const t = lastEmitted >= 0 ? lay.tiles[lastEmitted] : undefined;
    if (!m || !t) return;
    const cx = t.x + t.w / 2;
    const cy = y0 + t.y + VEC_H + ch(size) / 2;
    g.globalCompositeOperation = 'lighter';
    blit(g, sprite(C.signal, 'glow'), cx, cy, t.w * 0.9 + 50, 0.45 + 0.35 * glow);
  };

  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawLane} deps={[ctx.frame, m, size, ctx.fx.id, ctx.at]} rect={rect} />
      {ctx.fx.id !== 'lite' ? <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawHead} deps={[ctx.frame, m, size, lastEmitted, ctx.fx.id]} rect={rect} textSafe /> : null}
      <Measure mref={mref} size={BASE}>
        {all.map((t, i) => <MLabel key={i} text={t} size={BASE} />)}
      </Measure>
      {m && props.tokenizer ? (
        <Chip ctx={ctx} id={`${ctx.id}:tk`} text={props.tokenizer} size={SIZE.labelMin} x={rtl ? box.x + box.w - chipW(m.w[toks.length], BASE, SIZE.labelMin) : box.x} y={box.y} t0={ctx.at} color={C.ink2} />
      ) : null}
      {m
        ? lay.tiles.map((t) => {
            const t0 = times[t.i];
            if (!Number.isFinite(t0)) return null;
            const k = moveK(ctx, t0, 6, ease.arrive);
            const head = t.i === lastEmitted;
            const dx = -dirK * (1 - k) * 70; // slides in from upstream (the right for Arabic, the left for Latin)
            return (
              <div key={t.i} style={{position: 'absolute', left: 0, top: 0, transform: `translateX(${dx.toFixed(2)}px)`}}>
                <Chip ctx={ctx} id={`${ctx.id}:t${t.i}`} text={toks[t.i]} size={size} x={t.x} y={y0 + t.y + VEC_H} t0={t0} accent={head ? C.signal : undefined} color={head ? C.ink : C.ink2} overflow={fit.overflow} alpha={1} />
                {props.show_ids ? (
                  <div
                    style={{position: 'absolute', left: t.x, top: y0 + t.y + VEC_H + ch(size) + 2, width: t.w, textAlign: 'center', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: SIZE.secondaryMin, lineHeight: 1.2, color: C.ink3, opacity: k, fontFeatureSettings: '"tnum" 1'}}
                  >
                    <bdi dir="ltr" data-dc-text={`${ctx.id}:i${t.i}`}>{`#${t.i}`}</bdi>
                  </div>
                ) : null}
              </div>
            );
          })
        : null}
    </>
  );
};

export const TokenStream: DcComponent<Props> = {name: 'TokenStream', Component: TokenStreamView, text: true, slot: 'center'};
