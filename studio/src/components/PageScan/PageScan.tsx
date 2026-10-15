// PageScan (catalog: Domain specials; 04 section 6 "Indexes & plans": a full scan streams past every page, a B-tree reaches
// a row in 3 hops). Data pages are tiles in an RTL grid (page 0 top-right). The read head starts on the `scan` action
// (anchored to its word; else shortly after the layer anchor):
//   full  -> a beam reads every page in order (linear: a marching flow, 04 section 2); hits glow ok as they are read;
//   index -> a 3-level index glyph lights root -> branch -> leaf (one hop each), then an arc lands on each hit page;
//   range -> the same 3 hops land on the first hit, then the head sweeps the contiguous run to the last hit.
// Pages never read stay dark: the picture is the count (no digits here; spoken counts belong to NumberCounter with refs).
// Counter lane: the page grid keeps to the top ~74 % of the slot; the lower quarter stays free for the NumberCounter that
// speaks the count (04 section 6: "pages streaming past with a counter to 12,500" vs "3 hops"). Depth: a glass slab under
// the pages, drop shadows falling away from the key light (upper right), rim light on every edge, a light wedge trailing the
// read head. DOM + SVG only (no WebGL), so every FX tier renders it; tier changes only the glow radii (tokens).
import React from 'react';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, Chip, GlowLine, Stage, Svg, actsOf, arc, clamp01, f24, glowBox, partial, prog, progN, rim, type Pt} from '../_dom-b/kit';

/** Share of the slot height the page grid may use; the rest is the counter lane. */
const LANE = 0.74;

const MODE: Record<Props['scan'], string> = {full: 'full scan', index: 'index seek', range: 'range scan'};

export const PageScanView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const n = props.pages;
  const tree = props.scan !== 'full';
  // ---------- layout ----------
  const chipH = SIZE.label * 2.2;
  const treeW = tree ? Math.min(W * 0.26, 380) : 0;
  const gw = W - treeW - (tree ? W * 0.03 : 0);
  const gy0 = chipH + 12;
  const gh = H * LANE - gy0;
  const pad = Math.max(10, gw * 0.025);
  // the column count that makes the largest page tile
  let cols = 1;
  let best = 0;
  for (let c = 1; c <= n; c++) {
    const cl = Math.min((gw - 2 * pad) / c, (gh - 2 * pad) / (Math.ceil(n / c) * 1.28));
    if (cl > best + 1e-6) ((best = cl), (cols = c));
  }
  const rows = Math.ceil(n / cols);
  const cell = Math.min((gw - 2 * pad) / cols, (gh - 2 * pad) / (rows * 1.28));
  const pw = cell * 0.78;
  const ph = pw * 1.28;
  const slabW = cols * cell + 2 * pad;
  const slabH = rows * cell * 1.28 + 2 * pad;
  const ox = (gw - cols * cell) / 2;
  const oy = gy0 + (gh - rows * cell * 1.28) / 2;
  const pageC = (i: number): Pt => ({x: ox + (cols - 1 - (i % cols) + 0.5) * cell, y: oy + (Math.floor(i / cols) + 0.5) * cell * 1.28}); // RTL rows
  // ---------- hits ----------
  const rawHits = (props.hits ?? []).filter((h) => h < n);
  const hits = rawHits.length ? [...new Set(rawHits)].sort((a, b) => a - b) : props.scan === 'full' ? [] : props.scan === 'index' ? [Math.floor(n * 0.62)] : [Math.floor(n * 0.4), Math.min(n - 1, Math.floor(n * 0.4) + Math.min(5, n - 1))];
  const hitSet = new Set(hits);
  // ---------- timeline ----------
  const act = actsOf(ctx, 'scan')[0];
  const t0 = act ? act.at : ctx.at + f24(10, fps);
  const hop = f24(6, fps);
  const arriveF = presetFrames('arrive', fps);
  const fullDur = f24(Math.min(84, Math.max(24, n * 2)), fps);
  const tLand = t0 + 3 * hop;
  const range: [number, number] = props.scan === 'range' ? [hits[0], hits[hits.length - 1]] : [0, -1];
  const sweepN = range[1] - range[0] + 1;
  const sweepDur = f24(Math.max(6, 2 * sweepN), fps);
  const sweepT0 = tLand + arriveF - 1;
  const readAt = (i: number): number => {
    if (props.scan === 'full') return t0 + Math.floor((i / n) * fullDur);
    if (props.scan === 'index') {
      const k = hits.indexOf(i);
      return k < 0 ? Infinity : tLand + k * f24(4, fps) + arriveF - 1;
    }
    if (i < range[0] || i > range[1]) return Infinity;
    return sweepT0 + Math.floor(((i - range[0]) / sweepN) * sweepDur);
  };
  const flash = presetFrames('label', fps) + f24(4, fps);

  // index glyph: a 3-level tree of page nodes (root, branch, leaf = three page reads); key order runs right to left
  const tx = W - treeW / 2;
  const ty0 = gy0 + gh * 0.12;
  const lv = (gh * 0.52) / 2;
  const sp = treeW * 0.115;
  const treeNodes: Pt[][] = [[{x: tx, y: ty0}], [1, -1].map((s) => ({x: tx + s * sp * 2.1, y: ty0 + lv})), [3, 1, -1, -3].map((s) => ({x: tx + s * sp, y: ty0 + 2 * lv}))];
  const target = hits[0] ?? 0;
  const pathIdx = [0, Math.min(1, Math.floor((target / n) * 2)), Math.min(3, Math.floor((target / n) * 4))]; // lower keys on the right
  const hopQ = (k: number) => (tree ? progN(ctx, t0 + (k - 1) * hop, hop, ease.camera) : 0);
  const lw = Math.max(2, Math.round(SIZE.label * 0.09));

  // read head: full = linear over all pages; range = the sweep over the run
  let cur = -1;
  if (props.scan === 'full') cur = t >= t0 ? Math.floor(clamp01((t - t0) / fullDur) * n) : -1;
  if (props.scan === 'range') cur = t >= sweepT0 ? range[0] + Math.min(sweepN - 1, Math.floor(clamp01((t - sweepT0) / sweepDur) * sweepN)) : -1;
  const ent = prog(ctx, ctx.at, 'label');
  const gid = `ps-${ctx.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const headC = cur >= 0 && cur < n ? pageC(cur) : null;
  const nodeS = (li: number) => SIZE.label * (li === 0 ? 1.25 : 1.0);

  return (
    <Stage ctx={ctx}>
      <At x={W / 2} y={chipH / 2}>
        <Chip id={`${ctx.id}:mode`} text={MODE[props.scan]} color={C.signal} size={SIZE.label} />
      </At>
      {/* glass slab under the pages: panel plate, grid-colour rim, soft shadow falling away from the key light */}
      <div
        style={{
          position: 'absolute',
          left: gw / 2 - slabW / 2,
          top: gy0 + gh / 2 - slabH / 2,
          width: slabW,
          height: slabH,
          borderRadius: pad,
          background: `linear-gradient(160deg, ${C.panel}${hex(0.78)} 0%, ${C.ground}${hex(0.7)} 100%)`,
          border: `1px solid ${C.grid}`,
          boxShadow: `${rim(0.2)}, -4px 6px 0 ${C.void}${hex(0.55)}, -8px 12px 0 ${C.void}${hex(0.3)}`,
          opacity: ent,
        }}
      />
      {Array.from({length: n}, (_, i) => {
        const c = pageC(i);
        const r = readAt(i);
        const read = t >= r;
        const age = t - r;
        const hot = read && age < flash;
        const hit = hitSet.has(i) && read;
        const eI = prog(ctx, ctx.at + Math.floor((i / n) * f24(10, fps)), 'label');
        const col = hit ? C.ok : read ? C.signal : C.grid;
        const fillA = hit ? 0.3 : hot ? 0.34 : read ? 0.1 : 0;
        // one element per page: the fill, the header bar and the text lines are background layers (a few hundred fewer DOM nodes)
        const lineC = read ? `${col}${hex(0.6)}` : `${C.ink3}${hex(0.35)}`;
        const barC = read ? `${col}${hex(0.9)}` : `${C.ink3}${hex(0.5)}`;
        const lh = Math.max(1, Math.round(pw * 0.05));
        const seg = (c: string, y: number, w: number, left?: number) => `linear-gradient(${c}, ${c}) ${left === undefined ? `right ${(pw * 0.14).toFixed(1)}px` : `left ${left.toFixed(1)}px`} top ${(ph * y).toFixed(1)}px / ${w.toFixed(1)}px ${lh}px no-repeat`;
        const full = pw * 0.72;
        const pageBg = [
          seg(barC, 0.1, pw * 0.34),
          ...[0.3, 0.46, 0.62].map((y) => seg(lineC, y, full)),
          seg(lineC, 0.78, full * 0.54, pw * 0.14),
          `linear-gradient(${col}${hex(fillA)}, ${col}${hex(fillA)})`,
          `linear-gradient(180deg, ${C.panel} 0%, ${C.ground} 100%)`,
        ].join(', ');
        const pop = hit && age < flash ? 1 + 0.14 * (1 - progN(ctx, r, flash, ease.arrive)) : 1;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.x - pw / 2,
              top: c.y - ph / 2,
              width: pw,
              height: ph,
              borderRadius: Math.max(3, pw * 0.08),
              border: `${hit || hot ? 2 : 1}px solid ${col}`,
              background: pageBg,
              boxShadow: hit || hot ? `${rim(0.25)}, ${glowBox(col, fx, hit ? 0.6 + ctx.mod.glow : 0.4)}` : `${rim(0.14)}, -2px 3px 0 ${C.void}${hex(0.6)}`,
              opacity: eI,
              transform: pop !== 1 ? `scale(${pop.toFixed(4)})` : undefined,
              overflow: 'hidden',
            }}
          />
        );
      })}
      <Svg w={W} h={H}>
        <defs>
          <linearGradient id={gid} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor={C.signal} stopOpacity={0} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        {headC ? (
          <g>
            <rect x={headC.x} y={headC.y - ph * 0.62} width={cell * 1.7} height={ph * 1.24} fill={`url(#${gid})`} />
            <GlowLine pts={[{x: headC.x, y: headC.y - ph * 0.62}, {x: headC.x, y: headC.y + ph * 0.62}]} color={C.signal} w={lw + 1} fx={fx} k={1.1} />
          </g>
        ) : null}
        {tree ? (
          <g opacity={ent}>
            {treeNodes.slice(0, 2).map((lvl, li) => lvl.map((a, ai) => treeNodes[li + 1].slice(ai * 2, ai * 2 + 2).map((b, bi) => <line key={`${li}${ai}${bi}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink3} strokeOpacity={0.5} strokeWidth={2} />)))}
            {[0, 1].map((k) => {
              const a = treeNodes[k][pathIdx[k]];
              const b = treeNodes[k + 1][pathIdx[k + 1]];
              return <GlowLine key={`p${k}`} pts={partial([a, b], hopQ(k + 1))} color={C.signal} w={lw} fx={fx} opacity={t >= t0 + k * hop ? 1 : 0} />;
            })}
            {/* a ping ring on every page read of the descent (root, branch, leaf) */}
            {[0, 1, 2].map((li) => {
              const ts = t0 + li * hop;
              const q = progN(ctx, ts, hop * 2, ease.arrive);
              const p = treeNodes[li][pathIdx[li]];
              return t >= ts && q < 1 ? <circle key={`g${li}`} cx={p.x} cy={p.y} r={nodeS(li) * (0.7 + 0.9 * q)} fill="none" stroke={C.signal} strokeOpacity={0.7 * (1 - q)} strokeWidth={2} /> : null;
            })}
            {(props.scan === 'index' ? hits : hits.slice(0, 1)).map((h, k) => {
              const leaf = treeNodes[2][pathIdx[2]];
              const pc = pageC(h);
              const tl = tLand + (props.scan === 'index' ? k * f24(4, fps) : 0);
              const q = progN(ctx, tl, arriveF, ease.camera);
              return <GlowLine key={`l${k}`} pts={partial(arc(leaf, {x: pc.x, y: pc.y - ph * 0.5}, 0.22, 24), q)} color={C.ok} w={lw} fx={fx} opacity={t >= tl ? 1 : 0} arrow />;
            })}
          </g>
        ) : null}
      </Svg>
      {tree
        ? treeNodes.map((lvl, li) =>
            lvl.map((p, pi) => {
              const lit = t >= t0 + li * hop && pathIdx[li] === pi;
              const s = nodeS(li);
              const col = lit ? C.signal : C.ink3;
              return (
                <div key={`n${li}${pi}`} style={{position: 'absolute', left: p.x - s * 0.4, top: p.y - s * 0.5, width: s * 0.8, height: s, borderRadius: s * 0.1, opacity: ent, border: `2px solid ${col}`, background: lit ? `${C.signal}${hex(0.28)}` : `linear-gradient(180deg, ${C.panel}, ${C.ground})`, boxShadow: lit ? `${rim(0.25)}, ${glowBox(C.signal, fx, 0.6)}` : `${rim(0.14)}, -2px 3px 0 ${C.void}${hex(0.6)}`}}>
                  {[0.32, 0.52, 0.72].map((y) => (
                    <div key={y} style={{position: 'absolute', left: '18%', right: '18%', top: `${y * 100}%`, height: 2, background: `${col}${hex(lit ? 0.85 : 0.45)}`}} />
                  ))}
                </div>
              );
            }),
          )
        : null}
    </Stage>
  );
};

/** Text-safe rect: the mode chip at the top. */
const textRect = (_p: Props, box: {x: number; y: number; w: number; h: number}) => ({x: box.x + box.w * 0.3, y: box.y, w: box.w * 0.4, h: SIZE.label * 2.2});

export const PageScan: DcComponent<Props> = {name: 'PageScan', Component: PageScanView, text: true, slot: 'full', textRect};
