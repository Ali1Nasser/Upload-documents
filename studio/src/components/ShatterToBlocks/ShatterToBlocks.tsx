// ShatterToBlocks (catalog: State & FX). A target layer (`to`) shatters into `blocks` seeded pieces (04 §6: "a document shatters into
// chunks"; the chunks stay on screen as the pieces the narrator counts).
//  - Pure plan: _fx-a/shards.ts (brick layout of exactly `blocks` cells, seeded jitter, rest offset away from a seeded impact point,
//    seeded rest tilt <= 5 deg, outBack burst of one morph beat staggered from the impact; the nearest cell moves ON the anchor frame
//    (RV1)). Cells are kept inside title-safe.
//  - Rendering: on the anchor frame the target is hidden (visibility on its layer root) and each cell shows a clipped DEEP CLONE of the
//    target's own DOM (same fonts, same shaping: nothing is redrawn or re-typeset), so the pieces carry exactly the target's pixels.
//    The clone sits in the camera space of the target (this layer's transform is cancelled), loses `data-dc-text` (the post-layout
//    title-safe check reads the live copy; the pieces are clamped to title-safe by the plan itself) and may be a different depth plane.
//    Canvas / WebGL content of the target is not cloned (use a DOM target).
//  - Look: a fracture-line flash (signal) on every cell edge on the anchor frame decaying over the burst, then a thin ink3 chunk edge.
//    No filter, no blur: tiers differ only by the edge glow (box-shadow, standard / hero).
import React from 'react';
import {hex} from '../../fx/look';
import {C, H, W} from '../../tokens';
import {safeRect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, paintedRect, useFxTarget, type SettledInfo} from '../_fx-a/drive';
import {beat, exitK, pad} from '../_fx-a/kit';
import {clampCell, planShards, shardAt} from '../_fx-a/shards';
import type {Props} from './schema';

const PAD_PX = 6; // the cells cover the target's drawn extent (leaves + painted containers, drive.paintedRect) plus a small margin
const px = (v: number) => `${v.toFixed(2)}px`;

const buildClones = (i: SettledInfo, props: Props, t: number, n: number, fxId: string) => {
  const host = i.self.querySelector<HTMLElement>('[data-shards]');
  if (!host) return;
  host.replaceChildren();
  if (!i.m || t < 0 || !i.targets.length) return;
  const cells = planShards(pad(paintedRect(i) ?? i.m.rect, PAD_PX), props.blocks, props.seed);
  const safe = safeRect('title');
  const mineCs = getComputedStyle(i.mine);
  const inv = (() => {
    try {
      return new DOMMatrix(mineCs.transform === 'none' ? undefined : mineCs.transform).inverse().toString();
    } catch {
      return '';
    }
  })();
  const doc = host.ownerDocument;
  const lite = fxId === 'lite';
  for (const c of cells) {
    const m = shardAt(c, t, n);
    const [dx, dy] = clampCell(c, m.dx, m.dy, safe);
    const blk = doc.createElement('div');
    blk.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:${px(c.cx)} ${px(c.cy)};transform:translate(${px(dx)},${px(dy)}) rotate(${m.rot.toFixed(3)}deg);clip-path:inset(${px(c.r.y)} ${px(W - c.r.x - c.r.w)} ${px(H - c.r.y - c.r.h)} ${px(c.r.x)})`;
    for (const tg of i.targets) {
      const wrap = doc.createElement('div');
      wrap.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:${mineCs.transformOrigin};transform:${inv || 'none'}`;
      const clone = tg.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-dc-layer');
      clone.querySelectorAll('[data-dc-text]').forEach((e) => e.removeAttribute('data-dc-text'));
      clone.style.visibility = 'visible';
      clone.style.translate = '';
      clone.style.rotate = '';
      clone.style.scale = '';
      wrap.appendChild(clone);
      blk.appendChild(wrap);
    }
    const edge = doc.createElement('div');
    const flash = m.edge;
    const line = `inset 0 0 0 1px ${C.ink3}${hex(0.55)}, inset 0 0 0 ${(1 + flash * 2).toFixed(2)}px ${C.signal}${hex(0.85 * flash)}`;
    edge.style.cssText = `position:absolute;left:${px(c.r.x)};top:${px(c.r.y)};width:${px(c.r.w)};height:${px(c.r.h)};box-shadow:${lite ? line : `${line}, inset 0 0 14px ${C.signal}${hex(0.12 + 0.3 * flash)}`}`;
    blk.appendChild(edge);
    host.appendChild(blk);
  }
};

export const ShatterToBlocksView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame - ctx.at;
  const n = beat(ctx.fps);
  const {ref} = useFxTarget(
    props.to,
    ctx.frame,
    `shatter:${ctx.id}`,
    () => (t >= 0 ? {...IDENTITY, hide: true} : null),
    (i) => buildClones(i, props, t, n, ctx.fx.id),
  );
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: exitK(ctx)}}>
      <div data-shards style={{position: 'absolute', inset: 0}} />
    </div>
  );
};

export const ShatterToBlocks: DcComponent<Props> = {name: 'ShatterToBlocks', Component: ShatterToBlocksView, slot: 'full'};
