// Spin (catalog: State & FX). Spins a target layer about its own centre (04 §6: a turn that shows the other side of a thing).
//  - axis y / x: a card turn about the vertical / horizontal axis, drawn as the projected width / height |cos theta|
//    (orthographic, CSS only, every tier; no WebGL, so no separate fallback). The face never mirrors (|cos|), so Arabic copy is never
//    shown reversed. The target is given a glass card while it turns (rim with a key-lit top edge, a face that darkens as it turns
//    away from the key light, a specular glint, a lit edge slab with real thickness when it passes edge-on, ADR-003 LK-F), and
//    standard / hero add a floor pool under it and (seeded) sparks off the edge. A card never rests edge-on: the sweep is rounded
//    to the nearest half turn (0.25 -> 0.5, 0.75 -> 1), so the target ends face-on and readable.
//  - axis z: a flat rotation by 360 x turns degrees; the target is shrunk while it turns just enough that its rotated box stays
//    inside title-safe (a wide card at 90 degrees would otherwise leave the frame).
// Length = max(anchor word, 2 beats per turn); camera ease (inOutCubic); RV1 via revealProgress (the first step is on the anchor
// frame); the card is on screen from the anchor frame and fades out after the sweep. Tokens only, remotion `random` only.
import React from 'react';
import {interpolate} from 'remotion';
import {hex} from '../../fx/look';
import {C} from '../../tokens';
import {ease, revealProgress} from '../../type/reveal';
import {safeRect, type Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, useFxTarget, type Drive} from '../_fx-a/drive';
import {abs, beat, exitK, pad, rnd, stepLen} from '../_fx-a/kit';
import type {Props} from './schema';

const EDGE_MIN = 0.02; // projected size floor at edge-on for the target (a hairline, never a degenerate 0 scale)
const EDGE_PX = 7; // thickness of the card seen edge-on (the lit slab)
const CARD_PAD = 26; // the card extends this far beyond the target's drawn extent
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Total sweep in degrees: z is exact; a card (x / y) is rounded to the nearest half turn (>= 0.5) so it never rests edge-on. */
export const spinTotal = (turns: number, axis: Props['axis']): number => (axis === 'z' ? 360 * turns : Math.max(1, Math.round(turns * 2)) * 180);
export const spinLen = (fps: number, total: number, word: number) => Math.max(word, Math.round(beat(fps) * (total / 180)), beat(fps));
export const spinAngle = (t: number, n: number, total: number): number => total * revealProgress(t, n, ease.camera);

/** Scale that keeps a box (centre c, half extents hw / hh) rotated by `deg` inside `safe`; 1 when it already fits. */
export const fitScale = (c: {x: number; y: number}, hw: number, hh: number, deg: number, safe: Rect): number => {
  const a = (deg * Math.PI) / 180;
  const ex = Math.abs(Math.cos(a)) * hw + Math.abs(Math.sin(a)) * hh;
  const ey = Math.abs(Math.sin(a)) * hw + Math.abs(Math.cos(a)) * hh;
  const dx = Math.min(c.x - safe.x, safe.x + safe.w - c.x) - 2;
  const dy = Math.min(c.y - safe.y, safe.y + safe.h - c.y) - 2;
  return Math.max(0.25, Math.min(1, dx / Math.max(1, ex), dy / Math.max(1, ey)));
};

const rectOf = (r: Rect): {c: {x: number; y: number}; hw: number; hh: number} => ({c: {x: r.x + r.w / 2, y: r.y + r.h / 2}, hw: r.w / 2 + CARD_PAD, hh: r.h / 2 + CARD_PAD});

export const SpinView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const total = spinTotal(props.turns, props.axis);
  const n = spinLen(ctx.fps, total, Math.max(0, ctx.atEnd - ctx.at));
  const deg = t < 0 ? 0 : spinAngle(t, n, total);
  const rad = (deg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const c = Math.abs(cosA);
  const sinA = Math.sin(rad);
  const drive = (mm: {rect: Rect}): Drive | null => {
    if (t < 0 || deg === 0) return null;
    if (props.axis === 'z') {
      const g = rectOf(mm.rect);
      const k = fitScale(g.c, g.hw, g.hh, deg, safeRect('title'));
      return {...IDENTITY, rz: deg, sx: k, sy: k};
    }
    return props.axis === 'y' ? {...IDENTITY, sx: Math.max(EDGE_MIN, c)} : {...IDENTITY, sy: Math.max(EDGE_MIN, c)};
  };
  const {ref, m} = useFxTarget(props.to, ctx.frame, `spin:${ctx.id}`, drive);
  const tail = stepLen(ctx.fps);
  // the card: in from the anchor frame (RV1), out over a short tail after the sweep has landed (face-on again)
  const a = t < 0 ? 0 : Math.min(revealProgress(t, stepLen(ctx.fps)), interpolate(t, [n - 1, n - 1 + tail], [1, 0], clamp));
  const r = m ? pad(m.rect, CARD_PAD) : null;
  let overlay: React.ReactNode = null;
  if (r && a > 0.002) {
    const fx = ctx.fx;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const flat = props.axis === 'z';
    const yAx = props.axis === 'y';
    const k = flat ? fitScale({x: cx, y: cy}, r.w / 2, r.h / 2, deg, safeRect('title')) : 1;
    const w = flat ? r.w * k : yAx ? Math.max(EDGE_PX, r.w * c) : r.w;
    const h = flat ? r.h * k : yAx ? r.h : Math.max(EDGE_PX, r.h * c);
    const edge = flat ? 0 : Math.max(0, 1 - c / 0.3); // 1 when edge-on
    const away = 1 - c; // how far the face has turned from the viewer
    const side = sinA >= 0 ? 1 : -1;
    const glintAt = 50 + 42 * sinA;
    const bar = yAx || flat ? 90 : 180;
    const lit = (x: number) => `${C.signal}${hex(x * a)}`;
    const glowK = fx.id === 'hero' ? 1.4 : 1;
    const sparks = fx.id === 'lite' ? 0 : fx.id === 'hero' ? 18 : 10; // tier particle cap / 100 (hero is the same cap, wider swell)
    const pool = fx.id === 'lite' ? null : (
      <div
        style={{
          position: 'absolute',
          left: cx - (r.w * (0.34 + 0.16 * (flat ? 1 : c))),
          width: r.w * (0.68 + 0.32 * (flat ? 1 : c)),
          top: cy + (flat ? r.h * 0.5 * k : r.h / 2) + 6,
          height: Math.min(64, r.h * 0.34),
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 30%, ${lit(0.3 * (0.5 + 0.5 * c))} 0%, ${lit(0.09)} 48%, transparent 74%)`,
        }}
      />
    );
    overlay = (
      <>
        {pool}
        <div
          style={{
            ...abs({x: cx - w / 2, y: cy - h / 2, w, h}),
            transform: flat ? `rotate(${deg.toFixed(3)}deg)` : undefined,
            borderRadius: Math.min(14, w / 2, h / 2),
            overflow: 'hidden',
            boxShadow: fx.id === 'lite' ? undefined : `0 0 ${(fx.glowPx * glowK * (0.25 + 0.75 * (edge + 0.35))).toFixed(1)}px ${lit(0.28 + 0.4 * edge)}`,
          }}
        >
          {/* the face: faint glass with a shade that deepens as it turns away from the key light (top right) */}
          <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${bar}deg, ${C.void}${hex(a * 0.42 * away)} 0%, ${C.void}${hex(a * 0.05)} 55%, ${C.panel}${hex(a * 0.2)} 100%)`}} />
          {/* specular glint crossing the face */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(${bar}deg, transparent ${(glintAt - 16).toFixed(1)}%, ${C.white}${hex(0.17 * a * (0.4 + 0.6 * Math.abs(sinA)))} ${glintAt.toFixed(1)}%, transparent ${(glintAt + 16).toFixed(1)}%)`,
              mixBlendMode: fx.id === 'lite' ? undefined : 'screen',
            }}
          />
          {/* rim: hairline cyan, brighter on the key-lit top edge */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              border: `${(1.5 + 2 * edge).toFixed(2)}px solid ${lit(0.34 + 0.5 * edge)}`,
              borderTopColor: `color-mix(in srgb, ${C.white} ${(30 + 30 * edge).toFixed(0)}%, ${C.signal}${hex(a * (0.55 + 0.4 * edge))})`,
            }}
          />
          {/* the card's thickness: a lit slab when it passes edge-on */}
          {edge > 0.01 ? <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${yAx ? 90 + 90 * side : 180}deg, ${C.white}${hex(a * 0.9 * edge)}, ${C.signal}${hex(a * 0.75 * edge)})`}} /> : null}
        </div>
        {sparks > 0 && edge > 0.05
          ? Array.from({length: sparks}, (_, i) => {
              // seeded sparks lifting off the lit edge (kept within the card's own height); each lives 12 film frames
              const life = 12;
              const f = Math.floor((t * 24) / ctx.fps + 1e-6);
              const born = Math.floor(rnd(`spin:${ctx.id}`, 'b', i) * (Math.max(1, Math.round((n * 24) / ctx.fps)) + 1));
              const u = (f - born) / life;
              if (u < 0 || u >= 1) return null;
              const jx = (rnd(`spin:${ctx.id}`, 'x', i) * 2 - 1) * 26;
              const lift = (yAx ? 1 : 0.5) * u * 46;
              const py = yAx ? cy + (rnd(`spin:${ctx.id}`, 'y', i) * 2 - 1) * (r.h / 2) - lift : cy + (rnd(`spin:${ctx.id}`, 'y', i) * 2 - 1) * 8 - lift;
              const px = yAx ? cx + jx * 0.4 + side * u * 22 : cx + (rnd(`spin:${ctx.id}`, 'y', i) * 2 - 1) * (r.w / 2) + jx * 0.2;
              const sz = 2 + rnd(`spin:${ctx.id}`, 's', i) * 2.5;
              return <div key={i} style={{position: 'absolute', left: px - sz / 2, top: py - sz / 2, width: sz, height: sz, borderRadius: '50%', background: C.signal, opacity: (1 - u) * edge * a, boxShadow: `0 0 ${(sz * 2.5).toFixed(1)}px ${C.signal}`}} />;
            })
          : null}
      </>
    );
  }
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: exitK(ctx)}}>
      {overlay}
    </div>
  );
};

export const Spin: DcComponent<Props> = {name: 'Spin', Component: SpinView, slot: 'full'};
