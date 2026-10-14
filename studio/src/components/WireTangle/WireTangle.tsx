// WireTangle (catalog: Domain specials; 04 section 6 "Design & refactoring": tangled wires untangle into clean bundles).
// Two glass terminals (RTL frame: source on the right, sink on the left) joined by `wires` seeded bezier wires. In the
// `tangled` state every wire runs to a seeded other port with large vertical control offsets, so the wires loop over each
// other; a crossing counter is never shown (no copy, no digits). `untangle` (anchored to its word; else shortly after the
// layer anchor) morphs every wire (RV1: first visible step on the anchor frame) to port i -> port i with zero offsets, then a
// cable tie closes round the bundle and both terminals' status lights turn ok. `state: untangled` starts already clean.
// Wire colours are decorative tokens (signal / violet / ink2); ok is only the "clean" status light. Seeded: random(seed).
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowLine, Stage, Svg, actsOf, bez, f24, glowBox, lerp, prog, progN, rim, stag, type Pt} from '../_dom-b/kit';

const PALETTE = [C.signal, C.violet, C.ink2] as const;

/** Seeded permutation of 0..n-1 that moves every port (no fixed point when n >= 2), so the tangle is never accidentally tidy. */
export const tangledPerm = (n: number, seed: number): number[] => {
  const order = Array.from({length: n}, (_, i) => ({i, k: random(`wt:${seed}:perm:${i}`)})).sort((a, b) => a.k - b.k || a.i - b.i);
  const p = new Array<number>(n);
  order.forEach((o, j) => (p[o.i] = order[(j + 1) % n].i)); // a single cycle: no fixed points
  return p;
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
  const portY = (i: number) => ty0 + termH * 0.08 + ((i + 0.5) * termH * 0.84) / n;
  const perm = tangledPerm(n, props.seed);
  const wob = (i: number, k: string) => (random(`wt:${props.seed}:${k}:${i}`) - 0.5) * 2;
  // timeline
  const act = actsOf(ctx, 'untangle')[0];
  const dur = presetFrames('morph', fps, true) + f24(8, fps); // a gentle, readable morph
  const startClean = props.state === 'untangled';
  const q = startClean ? 1 : act ? progN(ctx, act.at, dur, ease.camera) : 0;
  const clean = q >= 1;
  const tie = startClean ? prog(ctx, ctx.at + f24(12, fps), 'label') : act ? progN(ctx, act.at + dur - 1, presetFrames('label', fps)) : 0;
  const lw = Math.max(3, Math.round(SIZE.label * 0.1));
  const ent = prog(ctx, ctx.at, 'label');
  // a bundle is tighter than the port pitch: wires converge to a ribbon in the middle
  const bundleY = (i: number) => H / 2 + (i - (n - 1) / 2) * Math.min(lw * 3.2, (termH * 0.5) / n);
  const wires = Array.from({length: n}, (_, i) => {
    const j = perm[i];
    const a: Pt = {x: xs, y: portY(i)};
    const b: Pt = {x: xe, y: lerp(portY(j), portY(i), q)};
    const sway = Math.sin(((t - ctx.at) * 0.12 + i * 1.7) % (Math.PI * 2)) * 7 * (1 - q); // a restless tangle: seeded phase, deterministic
    const c1: Pt = {x: lerp(xs - (xs - xe) * (0.15 + 0.35 * Math.abs(wob(i, 'a'))), xs - (xs - xe) * 0.3, q), y: lerp(a.y + wob(i, 'oa') * H * 0.55 + sway, bundleY(i), q)};
    const c2: Pt = {x: lerp(xe + (xs - xe) * (0.15 + 0.35 * Math.abs(wob(i, 'b'))), xe + (xs - xe) * 0.3, q), y: lerp(b.y + wob(i, 'ob') * H * 0.55 - sway, bundleY(i), q)};
    return {pts: bez(a, c1, c2, b, 36), col: PALETTE[i % PALETTE.length], i};
  });
  const lite = fx.id === 'lite';
  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        {wires.map((w) => {
          const e = prog(ctx, ctx.at + stag(w.i, fps, 1), 'arrive');
          return <GlowLine key={w.i} pts={w.pts.slice(0, Math.max(2, Math.round(e * (w.pts.length - 1)) + 1))} color={w.col} w={lw} fx={fx} k={lite ? 0.35 : 0.5 + ctx.mod.glow} opacity={e > 0 ? 1 : 0} />;
        })}
        {/* the cable ties: two bands close round the finished bundle */}
        {tie > 0
          ? [0.34, 0.66].map((u, k) => {
              const bx = lerp(xs, xe, u);
              const bh = Math.min(lw * 3.2, (termH * 0.5) / n) * n + lw * 4;
              return <rect key={k} x={bx - lw * 1.4} y={H / 2 - bh / 2 + (1 - tie) * bh * 0.5} width={lw * 2.8} height={bh * tie} rx={lw} fill={C.ink2} stroke={C.void} strokeWidth={1.5} opacity={0.95} />;
            })
          : null}
      </Svg>
      {[0, 1].map((side) => {
        const x = side === 0 ? W - termW : 0;
        const lit = clean ? C.ok : C.ink3;
        return (
          <div key={side} style={{position: 'absolute', left: x, top: ty0, width: termW, height: termH, borderRadius: 18, border: `2px solid ${clean ? C.ok : C.ink3}`, background: `linear-gradient(${side ? 100 : 260}deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.2)}, ${clean ? glowBox(C.ok, fx, 0.4 + 0.5 * tie) : `0 18px 40px ${C.void}${hex(0.6)}`}`, opacity: ent}}>
            {Array.from({length: n}, (_, i) => (
              <div key={i} style={{position: 'absolute', [side === 0 ? 'left' : 'right']: -lw * 1.5, top: portY(i) - ty0 - lw * 1.7, width: lw * 3.4, height: lw * 3.4, borderRadius: '50%', background: C.void, border: `${Math.max(2, lw - 1)}px solid ${PALETTE[i % PALETTE.length]}`}} />
            ))}
            {/* status light */}
            <div style={{position: 'absolute', left: '50%', top: termH * 0.03, width: lw * 3, height: lw * 3, marginLeft: -lw * 1.5, borderRadius: '50%', background: lit, boxShadow: clean ? glowBox(C.ok, fx, 0.6) : undefined}} />
          </div>
        );
      })}
    </Stage>
  );
};

export const WireTangle: DcComponent<Props> = {name: 'WireTangle', Component: WireTangleView, slot: 'full'};
