// PageScan (catalog: Domain specials; 04 section 6 "Indexes & plans": a full scan streams past every page, a B-tree reaches
// a row in 3 hops). Data pages are tiles in an RTL grid (page 0 top-right). The read head starts on the `scan` action
// (anchored to its word; else shortly after the layer anchor):
//   full  -> a beam reads every page in order (linear: a marching flow, 04 section 2); hits glow ok as they are read;
//   index -> a 3-level index glyph lights root -> branch -> leaf (one hop each), then an arc lands on each hit page;
//   range -> the same 3 hops land on the first hit, then the head sweeps the contiguous run to the last hit.
// Pages never read stay dark: the picture is the count (no digits here; spoken counts belong to NumberCounter with refs).
import React from 'react';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, Chip, GlowLine, Stage, Svg, actsOf, arc, clamp01, f24, glowBox, partial, prog, progN, rim, type Pt} from '../_dom-b/kit';

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
  const treeW = tree ? Math.min(W * 0.24, 380) : 0;
  const gx0 = 0;
  const gw = W - treeW - (tree ? W * 0.04 : 0);
  const gy0 = chipH + 16;
  const gh = H - gy0;
  let cols = Math.max(1, Math.round(Math.sqrt((n * gw) / (gh * 0.78))));
  cols = Math.min(cols, n);
  const rows = Math.ceil(n / cols);
  const cell = Math.min(gw / cols, gh / (rows * 1.28));
  const pw = cell * 0.78;
  const ph = pw * 1.28;
  const ox = gx0 + (gw - cols * cell) / 2;
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
  // full: linear read head over the pages
  const fullDur = f24(Math.min(84, Math.max(24, n * 2)), fps);
  // index / range: 3 hops (root, branch, leaf) then landings
  const tLand = t0 + 3 * hop;
  const range: [number, number] = props.scan === 'range' ? [hits[0], hits[hits.length - 1]] : [0, -1];
  const sweepDur = f24(Math.max(6, 2 * (range[1] - range[0] + 1)), fps);
  const readAt = (i: number): number => {
    if (props.scan === 'full') return t0 + Math.floor((i / n) * fullDur);
    if (props.scan === 'index') {
      const k = hits.indexOf(i);
      return k < 0 ? Infinity : tLand + k * f24(4, fps) + arriveF - 1;
    }
    if (i < range[0] || i > range[1]) return Infinity;
    return tLand + arriveF - 1 + Math.floor(((i - range[0]) / Math.max(1, range[1] - range[0] + 1)) * sweepDur);
  };
  const flash = presetFrames('label', fps) + f24(4, fps);

  // index glyph: root, 2 branches, 4 leaves (a stand-in for "3 levels"; never a count)
  const tx = W - treeW / 2;
  const ty0 = gy0 + gh * 0.16;
  const lv = (gh * 0.5) / 2;
  const treeNodes: Pt[][] = [[{x: tx, y: ty0}], [-1, 1].map((s) => ({x: tx + s * treeW * 0.24, y: ty0 + lv})), [-3, -1, 1, 3].map((s) => ({x: tx + s * treeW * 0.115, y: ty0 + 2 * lv}))];
  const target = hits[0] ?? 0;
  const pathIdx = [0, target >= n / 2 ? 0 : 1, target >= n / 2 ? (target >= (3 * n) / 4 ? 0 : 1) : target >= n / 4 ? 2 : 3];
  const hopQ = (k: number) => (tree ? progN(ctx, t0 + k * hop, hop, ease.camera) : 0);
  const nodeLit = (lvl: number) => tree && t >= t0 + lvl * hop;
  const lw = Math.max(2, Math.round(SIZE.label * 0.09));

  // the full-scan beam position (current page)
  const cur = props.scan === 'full' ? Math.floor(clamp01((t - t0) / fullDur) * n) : -1;
  const ent = prog(ctx, ctx.at, 'label');

  return (
    <Stage ctx={ctx}>
      <At x={W / 2} y={chipH / 2}>
        <Chip id={`${ctx.id}:mode`} text={MODE[props.scan]} color={C.signal} size={SIZE.label} />
      </At>
      {Array.from({length: n}, (_, i) => {
        const c = pageC(i);
        const r = readAt(i);
        const read = t >= r;
        const hot = read && t - r < flash;
        const hit = hitSet.has(i) && read;
        const eI = prog(ctx, ctx.at + Math.floor((i / n) * f24(10, fps)), 'label');
        const col = hit ? C.ok : hot ? C.signal : read ? C.signal : C.grid;
        const fillA = hit ? 0.3 : hot ? 0.34 : read ? 0.1 : 0;
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
              background: `linear-gradient(180deg, ${C.panel} 0%, ${C.ground} 100%)`,
              boxShadow: hit || hot ? `${rim(0.2)}, ${glowBox(col, fx, hit ? 0.6 + ctx.mod.glow : 0.4)}` : rim(0.12),
              opacity: eI,
              overflow: 'hidden',
            }}
          >
            <div style={{position: 'absolute', inset: 0, background: `${col}${hex(fillA)}`}} />
            {[0.24, 0.42, 0.6, 0.78].map((y, k) => (
              <div key={k} style={{position: 'absolute', right: '16%', left: k === 3 ? '46%' : '16%', top: `${y * 100}%`, height: Math.max(1, pw * 0.05), background: read ? `${col}${hex(0.6)}` : `${C.ink3}${hex(0.35)}`}} />
            ))}
          </div>
        );
      })}
      <Svg w={W} h={H}>
        {props.scan === 'full' && t >= t0 && cur < n ? (
          (() => {
            const c = pageC(Math.min(n - 1, cur));
            return <GlowLine pts={[{x: c.x, y: c.y - ph * 0.62}, {x: c.x, y: c.y + ph * 0.62}]} color={C.signal} w={lw + 1} fx={fx} k={1.1} />;
          })()
        ) : null}
        {tree ? (
          <g opacity={ent}>
            {treeNodes.slice(0, 2).map((lvl, li) =>
              lvl.map((a, ai) =>
                treeNodes[li + 1].slice(ai * (li === 0 ? 2 : 2), ai * 2 + 2).map((b, bi) => <line key={`${li}${ai}${bi}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.grid} strokeWidth={2} />),
              ),
            )}
            {/* the lit path: root -> branch -> leaf */}
            {[0, 1].map((k) => {
              const a = treeNodes[k][pathIdx[k]];
              const b = treeNodes[k + 1][pathIdx[k + 1]];
              return <GlowLine key={`p${k}`} pts={partial([a, b], hopQ(k + 1))} color={C.signal} w={lw} fx={fx} opacity={t >= t0 + (k + 1) * hop ? 1 : 0} />;
            })}
            {/* landing arcs from the leaf to the hit pages */}
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
              const lit = nodeLit(li) && pathIdx[li] === pi;
              const s = SIZE.label * (li === 0 ? 1.3 : 1.05);
              return (
                <div
                  key={`n${li}${pi}`}
                  style={{position: 'absolute', left: p.x - s / 2, top: p.y - s / 2, width: s, height: s, borderRadius: s * 0.22, opacity: ent, border: `2px solid ${lit ? C.signal : C.ink3}`, background: lit ? `${C.signal}${hex(0.28)}` : C.panel, boxShadow: lit ? glowBox(C.signal, fx, 0.6) : rim(0.15)}}
                />
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
