// WireTangle (catalog: Domain specials; 04 section 6 "Design & refactoring": tangled wires untangle into clean bundles).
// Two glass terminals (RTL frame: source on the right, sink on the left) joined by `wires` seeded bezier wires. In the
// `tangled` state every wire runs to a seeded other port with large vertical control offsets, so the wires loop over each
// other; a crossing counter is never shown (no copy, no digits). `untangle` (anchored to its word; else shortly after the
// layer anchor) morphs every wire (RV1: first visible step on the anchor frame) to port i -> port i with zero offsets, then a
// cable tie closes round the bundle and both terminals' status lights go warn -> ok. `state: untangled` starts already clean.
// Wire colours are decorative tokens (signal / violet / ink2); ok is only the "clean" status light. Seeded: random(seed).
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Stage, Svg, actsOf, bez, dPath, f24, glowBox, lerp, prog, progN, rim, stag, type Pt} from '../_dom-b/kit';

const PALETTE = [C.signal, C.violet, C.ink2] as const;

/** Seeded permutation of 0..n-1 that moves every port (no fixed point when n >= 2), so the tangle is never accidentally tidy. */
export const tangledPerm = (n: number, seed: number): number[] => {
  const order = Array.from({length: n}, (_, i) => ({i, k: random(`wt:${seed}:perm:${i}`)})).sort((a, b) => a.k - b.k || a.i - b.i);
  const p = new Array<number>(n);
  order.forEach((o, j) => (p[o.i] = order[(j + 1) % n].i)); // a single cycle: no fixed points
  return p;
};

const smooth = (x: number) => {
  const u = x < 0 ? 0 : x > 1 ? 1 : x;
  return u * u * (3 - 2 * u);
};

/** One cable: a soft halo, a dark casing (so a crossing reads over / under, depth by occlusion), the coloured core and a thin
 * specular line on the key-light side (upper right, ADR-003 LK-F). No SVG filter: cheap on swiftshader. */
const Cable: React.FC<{pts: Pt[]; color: string; w: number; k: number; spec: boolean}> = ({pts, color, w, k, spec}) => {
  if (pts.length < 2) return null;
  const d = dPath(pts);
  const common = {fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <g>
      <path d={d} stroke={color} strokeOpacity={0.12} strokeWidth={w * 3.2 * k + w} {...common} />
      <path d={d} stroke={C.void} strokeOpacity={0.92} strokeWidth={w + w * 0.9} {...common} />
      <path d={d} stroke={color} strokeWidth={w} {...common} />
      {spec ? <path d={d} stroke={C.ink} strokeOpacity={0.32} strokeWidth={Math.max(1, w * 0.28)} transform={`translate(${w * 0.18} ${-w * 0.22})`} {...common} /> : null}
    </g>
  );
};

export const WireTangleView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const n = props.wires;
  const termW = Math.min(W * 0.1, 190);
  const termH = H * 0.86;
  const ty0 = (H - termH) / 2;
  const xs = W - termW; // wire start (right terminal's inner edge) - RTL: source on the right
  const xe = termW; // wire end (left terminal's inner edge)
  const portY = (i: number) => ty0 + termH * 0.1 + ((i + 0.5) * termH * 0.8) / n;
  const perm = tangledPerm(n, props.seed);
  const wob = (i: number, k: string) => (random(`wt:${props.seed}:${k}:${i}`) - 0.5) * 2;
  // timeline
  const act = actsOf(ctx, 'untangle')[0];
  const dur = presetFrames('morph', fps, true) + f24(8, fps); // a gentle, readable morph
  const startClean = props.state === 'untangled';
  const q = startClean ? 1 : act ? progN(ctx, act.at, dur, ease.camera) : 0;
  const clean = q >= 1;
  const tie = startClean ? prog(ctx, ctx.at + f24(12, fps), 'label') : act ? progN(ctx, act.at + dur - 1, presetFrames('label', fps)) : 0;
  const lw = Math.max(4, Math.round(SIZE.label * 0.13));
  const ent = prog(ctx, ctx.at, 'label');
  const pitch = Math.min(lw * 2.8, (termH * 0.5) / n); // a bundle is tighter than the port pitch: a ribbon in the middle
  const bundleY = (i: number) => H / 2 + (i - (n - 1) / 2) * pitch;
  const wires = Array.from({length: n}, (_, i) => {
    const j = perm[i];
    const a: Pt = {x: xs, y: portY(i)};
    const bT: Pt = {x: xe, y: portY(j)};
    const sway = Math.sin(((t - ctx.at) * 0.12 + i * 1.7) % (Math.PI * 2)) * 7 * (1 - q); // a restless tangle: seeded phase, deterministic
    const c1: Pt = {x: xs - (xs - xe) * (0.15 + 0.35 * Math.abs(wob(i, 'a'))), y: a.y + wob(i, 'oa') * H * 0.55 + sway};
    const c2: Pt = {x: xe + (xs - xe) * (0.15 + 0.35 * Math.abs(wob(i, 'b'))), y: bT.y + wob(i, 'ob') * H * 0.55 - sway};
    const tangled = bez(a, c1, c2, bT, 48);
    // the clean harness: port -> smooth fan-in -> a straight parallel run -> fan-out to port i
    const cleanPts: Pt[] = tangled.map((_, m) => {
      const u = m / 48;
      const wgt = smooth(Math.min(u, 1 - u) / 0.3);
      return {x: lerp(xs, xe, u), y: lerp(portY(i), bundleY(i), wgt)};
    });
    const pts = tangled.map((p, m) => ({x: lerp(p.x, cleanPts[m].x, q), y: lerp(p.y, cleanPts[m].y, q)}));
    return {pts, col: PALETTE[i % PALETTE.length], i};
  });
  const lite = fx.id === 'lite';
  const status = clean ? C.ok : C.warn;
  const tieH = pitch * n + lw * 3;
  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        {wires.map((w) => {
          const e = prog(ctx, ctx.at + stag(w.i, fps, 1), 'arrive');
          const cut = w.pts.slice(0, Math.max(2, Math.round(e * (w.pts.length - 1)) + 1));
          return e > 0 ? <Cable key={w.i} pts={cut} color={w.col} w={lw} k={lite ? 0.35 : 0.5 + ctx.mod.glow} spec={!lite} /> : null;
        })}
        {/* plugs: the cable ends seat in the terminal faces (they slide to their own port while untangling) */}
        {wires.map((w) => {
          const e = prog(ctx, ctx.at + stag(w.i, fps, 1), 'arrive');
          if (e < 1) return null;
          const ends = [w.pts[0], w.pts[w.pts.length - 1]];
          return ends.map((p, k) => <rect key={`${w.i}:${k}`} x={p.x - lw * 1.3 + (k === 0 ? lw * 0.9 : -lw * 0.9)} y={p.y - lw * 1.2} width={lw * 2.6} height={lw * 2.4} rx={lw * 0.7} fill={C.void} stroke={w.col} strokeWidth={Math.max(2, lw * 0.5)} />);
        })}
        {/* the cable ties: two straps close round the finished bundle */}
        {tie > 0
          ? [0.42, 0.58].map((u, k) => {
              const bx = lerp(xs, xe, u);
              return (
                <g key={k}>
                  <rect x={bx - lw * 1.7} y={H / 2 - (tieH / 2) * tie} width={lw * 3.4} height={tieH * tie} rx={lw * 1.2} fill={C.panel} stroke={C.ink2} strokeWidth={2} />
                  <rect x={bx - lw * 0.7} y={H / 2 - (tieH / 2) * tie + 2} width={lw * 0.9} height={Math.max(0, tieH * tie - 4)} rx={lw * 0.4} fill={C.ink} fillOpacity={0.22} />
                </g>
              );
            })
          : null}
      </Svg>
      {[0, 1].map((side) => {
        const x = side === 0 ? W - termW : 0;
        return (
          <div key={side} style={{position: 'absolute', left: x, top: ty0, width: termW, height: termH, borderRadius: 18, border: `2px solid ${clean ? C.ok : C.ink3}`, background: `linear-gradient(${side ? 100 : 260}deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.2)}${clean ? `, 0 0 ${(fx.glowInner * (0.4 + 0.5 * tie)).toFixed(1)}px ${C.ok}${hex(0.5)}` : ''}`, opacity: ent}}>
            {/* port sockets */}
            {Array.from({length: n}, (_, i) => (
              <div key={i} style={{position: 'absolute', [side === 0 ? 'right' : 'left']: lw, top: portY(i) - ty0 - lw * 1.2, width: lw * 2.6, height: lw * 2.4, borderRadius: lw * 0.7, background: C.void, border: `1px solid ${PALETTE[i % PALETTE.length]}${hex(0.4)}`}} />
            ))}
            {/* status light */}
            <div style={{position: 'absolute', left: '50%', top: termH * 0.03, width: lw * 3, height: lw * 3, marginLeft: -lw * 1.5, borderRadius: '50%', background: status, boxShadow: glowBox(status, fx, clean ? 0.6 : 0.3)}} />
          </div>
        );
      })}
    </Stage>
  );
};

export const WireTangle: DcComponent<Props> = {name: 'WireTangle', Component: WireTangleView, slot: 'full'};
