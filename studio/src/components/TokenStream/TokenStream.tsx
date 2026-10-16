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
// Depth and light (ADR-003 LK-F): the stream runs in a rim-lit glass channel (top and bottom rim, contact shadow), each tile is a raised
//   slab with a soft drop shadow, and the vectors rise from the tile tops on a stem. The tokenizer is a slim glass gate at the upstream
//   end of the channel: tiles slide out of it onto their place.
// Tiers: lite = flat channel; standard = + marching flow dashes, a light pool under the channel and a head halo; hero = + bloom on the
//   head. Text-safe: the halo canvas is cut around every copy box. Auto-fit: tile size shrinks to SIZE.labelMin; below it an overflow is reported.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {westernDigits} from '../../type/words';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {
  Chip, Measure, MLabel, SpaceCanvas, actionsOf, anyArabic, blit, bloomOf, chipH, chipW, enterK, exitK, ff, fitSearch, mix, moveK, rgba, secs, sprite, useMeasure, useOverflow,
} from '../_space3d/kit';
import {revealProgress, presetFrames, ease} from '../../type/reveal';

const BASE = SIZE.sub; // measured at 56 px; the tile size is searched down from here (prefers one row at >= SIZE.body)
const GAP = 16; // between tiles (layout constant)
const ROW_GAP = 26;
const ID_H = 26; // height of the position line under a tile
const VEC_H = 92; // the embedding vector that rises above a settled tile

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
  const tagH = props.tokenizer ? chipH(props.tokenizer, SIZE.labelMin) + 34 : 0;
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
  const std = ctx.fx.id !== 'lite';
  const kk = enterK(ctx) * exitK(ctx);
  const gateX = rtl ? box.x + box.w + 26 : box.x - 26; // the tokenizer gate: where tiles come out
  const tileH = ch(size);
  const rowTop = (r: number) => y0 + r * (rowH + ROW_GAP) + VEC_H; // top of the tile row r
  // a new tile never crosses a settled one (that would overprint text): it eases out of the gate over a short run, dropping onto the channel
  const slide = (t: Tile) => Math.min(70, Math.abs(gateX - (t.x + t.w / 2)));
  const DROP = 34; // px the tile falls onto the channel while it arrives

  const rect = {x: box.x - 120, y: box.y - 60, w: box.w + 240, h: box.h + 120};
  // channel: a rim-lit glass strip behind each row of tiles (contact shadow below, light pool in standard+), the gate, flow dashes, then
  // the drop shadow of every tile and the vector columns that rise from the settled tiles (abstract: seeded heights, no figures)
  const drawLane = (g: CanvasRenderingContext2D) => {
    if (!m || kk <= 0) return;
    const gate = revealProgress(ctx.frame - ctx.at, presetFrames('arrive', ctx.fps), ease.arrive) * kk;
    if (gate <= 0) return;
    const lx = box.x - 70;
    const lw = box.w + 140;
    g.lineCap = 'round';
    for (let r = 0; r < rows; r++) {
      const ty = rowTop(r);
      const by = ty - 10;
      const bh = tileH + idH + 22;
      const sh = g.createLinearGradient(0, by + bh, 0, by + bh + 46);
      sh.addColorStop(0, rgba(C.void, 0.75 * gate));
      sh.addColorStop(1, rgba(C.void, 0));
      g.fillStyle = sh;
      g.fillRect(lx + 10, by + bh - 2, lw - 20, 48);
      if (std) {
        g.save();
        g.translate(lx + lw / 2, by + bh + 8);
        g.scale(1, 0.12);
        const R = lw * 0.5;
        const pool = g.createRadialGradient(0, 0, 0, 0, 0, R);
        pool.addColorStop(0, rgba(C.signal, 0.2 * gate));
        pool.addColorStop(0.55, rgba(C.signal, 0.06 * gate));
        pool.addColorStop(1, rgba(C.signal, 0));
        g.fillStyle = pool;
        g.fillRect(-R, -R, 2 * R, 2 * R);
        g.restore();
      }
      // the glass body fades out at both ends so the channel reads as a section of a longer stream
      const body = g.createLinearGradient(lx, 0, lx + lw, 0);
      const edge = rtl ? 1 : 0;
      body.addColorStop(0, rgba(mix(C.panel, C.ink3, 0.1), (edge === 0 ? 0.2 : 0.9) * gate));
      body.addColorStop(0.18, rgba(mix(C.panel, C.ink3, 0.1), 0.9 * gate));
      body.addColorStop(0.82, rgba(mix(C.panel, C.ink3, 0.1), 0.9 * gate));
      body.addColorStop(1, rgba(mix(C.panel, C.ink3, 0.1), (edge === 1 ? 0.2 : 0.9) * gate));
      g.fillStyle = body;
      g.fillRect(lx, by, lw, bh);
      const rim = g.createLinearGradient(lx, 0, lx + lw, 0);
      rim.addColorStop(0, rgba(C.ink2, 0));
      rim.addColorStop(0.15, rgba(C.ink2, 0.5 * gate));
      rim.addColorStop(0.85, rgba(C.ink2, 0.5 * gate));
      rim.addColorStop(1, rgba(C.ink2, 0));
      g.fillStyle = rim;
      g.fillRect(lx, by, lw, 2);
      g.fillStyle = rgba(C.void, 0.6 * gate);
      g.fillRect(lx, by + bh - 2, lw, 2);
      if (std) {
        // marching dashes along the base of the channel: the stream is moving (frame-driven, deterministic)
        g.strokeStyle = rgba(C.ink3, 0.5 * gate);
        g.lineWidth = 3;
        const period = 72;
        const off = (((tNow * 150 * dirK) % period) + period) % period;
        const dy = by + bh - 8;
        for (let x = lx - period + off; x < lx + lw; x += period) {
          g.beginPath();
          g.moveTo(Math.max(lx, x), dy);
          g.lineTo(Math.min(lx + lw, x + 18), dy);
          g.stroke();
        }
      }
    }
    // the tokenizer gate: a slim rim-lit glass slit at the upstream end of each row
    for (let r = 0; r < rows; r++) {
      const by = rowTop(r) - 22;
      const bh = tileH + idH + 46;
      const gx = gateX;
      g.fillStyle = rgba(C.signal, 0.1 * gate);
      g.fillRect(gx - 9, by, 18, bh);
      g.fillStyle = rgba(C.signal, 0.75 * gate);
      g.fillRect(gx - 2, by, 4, bh);
      g.fillStyle = rgba(C.white, 0.5 * gate);
      g.fillRect(gx - 0.5, by + 4, 1, bh - 8);
    }
    // leader: binds the tokenizer label to the gate it names
    if (props.tokenizer) {
      const ly0 = rowTop(0) - VEC_H - 12 - 6 + chipH(props.tokenizer, SIZE.labelMin);
      g.fillStyle = rgba(C.signal, 0.55 * gate);
      g.fillRect(gateX - 1, ly0, 2, rowTop(0) - 22 - ly0);
    }
    lay.tiles.forEach((t) => {
      const t0 = times[t.i];
      if (!Number.isFinite(t0)) return;
      const k = moveK(ctx, t0, 6, ease.arrive);
      if (k <= 0) return;
      const head = t.i === lastEmitted;
      const x = t.x - dirK * (1 - k) * slide(t);
      const y = rowTop(Math.round(t.y / (rowH + ROW_GAP)));
      // raised slab: a soft drop shadow under the tile
      const dsh = g.createLinearGradient(0, y + tileH - 2, 0, y + tileH + 14);
      dsh.addColorStop(0, rgba(C.void, 0.7 * k * kk));
      dsh.addColorStop(1, rgba(C.void, 0));
      g.fillStyle = dsh;
      g.fillRect(x + 6, y + tileH - 2, t.w - 12, 16);
      // vector column: a stem from the tile top and 8 seeded bars (panel -> signal ramp by height), staggered rise
      const u0 = revealProgress(ctx.frame - t0 - ff(3, ctx.fps), ff(8, ctx.fps), ease.arrive);
      if (u0 <= 0) return;
      const nb = Math.max(4, Math.min(8, Math.floor((t.w - 24) / 14)));
      const bw = 8;
      const gap = 6;
      const span = nb * bw + (nb - 1) * gap;
      const cx = t.x + t.w / 2;
      const base = y - 12;
      g.fillStyle = rgba(head ? C.signal : C.ink3, (head ? 0.7 : 0.45) * u0 * kk);
      g.fillRect(cx - 1, base, 2, 12);
      for (let j = 0; j < nb; j++) {
        const u = revealProgress(ctx.frame - t0 - ff(3 + j, ctx.fps), ff(8, ctx.fps), ease.arrive);
        const v = 0.25 + 0.75 * random(`ts:${toks[t.i]}:${t.i}:${j}`);
        const hh = v * (VEC_H - 26) * u;
        if (hh < 1) continue;
        const bx = cx - span / 2 + j * (bw + gap);
        const col = head ? mix(C.signal, C.white, 0.15 * v) : mix(C.ink3, C.signal, 0.25 + 0.45 * v);
        g.fillStyle = rgba(col, (head ? 0.95 : 0.7) * kk);
        g.fillRect(bx, base - 2 - hh, bw, hh);
        g.fillStyle = rgba(C.white, (head ? 0.45 : 0.18) * kk);
        g.fillRect(bx, base - 2 - hh, bw, 2);
      }
    });
  };
  // head bloom (masked out of every copy box by the text-safe cut)
  const drawHead = (g: CanvasRenderingContext2D) => {
    const t = lastEmitted >= 0 ? lay.tiles[lastEmitted] : undefined;
    if (!m || !t || kk <= 0) return;
    const k = moveK(ctx, times[lastEmitted], 6, ease.arrive);
    const cx = t.x + t.w / 2 - dirK * (1 - k) * slide(t);
    const cy = rowTop(Math.round(t.y / (rowH + ROW_GAP))) - VEC_H * 0.35;
    g.globalCompositeOperation = 'lighter';
    blit(g, sprite(C.signal, 'glow'), cx, cy, t.w * 0.9 + 60, (0.4 + 0.3 * glow) * kk * k);
    blit(g, sprite(C.signal, 'glow'), gateX, rowTop(0) + tileH / 2, 90, 0.3 * kk * (1 - 0.4 * k));
  };

  return (
    <>
      <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawLane} deps={[ctx.frame, m, size, ctx.fx.id, ctx.at, kk]} rect={rect} />
      {std ? <SpaceCanvas fx={ctx.fx} frame={ctx.frame} draw={drawHead} deps={[ctx.frame, m, size, lastEmitted, ctx.fx.id, kk]} rect={rect} textSafe /> : null}
      <Measure mref={mref} size={BASE}>
        {all.map((t, i) => <MLabel key={i} text={t} size={BASE} />)}
      </Measure>
      {m && props.tokenizer ? (
        <Chip
          ctx={ctx}
          id={`${ctx.id}:tk`}
          text={props.tokenizer}
          size={SIZE.labelMin}
          x={rtl ? gateX - chipW(m.w[toks.length], BASE, SIZE.labelMin) + 40 : gateX - 40}
          y={rowTop(0) - VEC_H - 12 - chipH(props.tokenizer, SIZE.labelMin) - 6}
          t0={ctx.at}
          accent={C.signal}
          color={C.ink}
        />
      ) : null}
      {m
        ? lay.tiles.map((t) => {
            const t0 = times[t.i];
            if (!Number.isFinite(t0)) return null;
            const k = moveK(ctx, t0, 6, ease.arrive);
            const head = t.i === lastEmitted;
            const dx = -dirK * (1 - k) * slide(t); // eases out of the gate (the right for Arabic, the left for Latin) and drops onto the channel
            const dy = -(1 - k) * DROP;
            const ty = rowTop(Math.round(t.y / (rowH + ROW_GAP)));
            return (
              <div key={t.i} style={{position: 'absolute', left: 0, top: 0, transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`, opacity: Math.min(1, k * 1.6)}}>
                <Chip ctx={ctx} id={`${ctx.id}:t${t.i}`} text={toks[t.i]} size={size} x={t.x} y={ty} t0={t0} accent={head ? C.signal : undefined} color={head ? C.ink : C.ink2} overflow={fit.overflow} alpha={1} />
                {props.show_ids ? (
                  <div
                    style={{position: 'absolute', left: t.x, top: ty + tileH + 4, width: t.w, textAlign: 'center', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: SIZE.secondaryMin, lineHeight: 1.2, color: head ? C.signal : C.ink3, opacity: k, fontFeatureSettings: '"tnum" 1'}}
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
