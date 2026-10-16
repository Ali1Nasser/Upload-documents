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
//  - Cuts avoid words: the seeded cut lines snap into the gaps between the target's word boxes (word rects of its text nodes, measured
//    on the settled frame), so no word is cut in half and no half-word peeks out of a neighbouring piece (fallback: the seeded line).
//  - Look (ADR-003 LK-F, 04 §1.2): key light from the upper right: each chunk has a rim on its top and right edges and a faint sheen, a
//    drop shadow that grows with its lift (outBack burst) and settles, a fracture-line flash (signal) on every cell edge on the anchor
//    frame decaying over the burst, then a thin ink3 chunk edge. Standard / hero add the edge glow and a signal impact flash at the
//    seeded impact point behind the pieces. No filter, no blur (box-shadow and gradients only).
import React from 'react';
import {hex} from '../../fx/look';
import {C, H, W} from '../../tokens';
import type {Rect} from '../../type/safe';
import {safeRect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import {IDENTITY, paintedRect, useFxTarget, type SettledInfo} from '../_fx-a/drive';
import {beat, exitK, pad} from '../_fx-a/kit';
import {clampCell, impactOf, planShards, shardAt} from '../_fx-a/shards';
import type {Props} from './schema';

const PAD_PX = 6; // the cells cover the target's drawn extent (leaves + painted containers, drive.paintedRect) plus a small margin
const WORD_PAD = 2; // px added around every word box before the cuts avoid it
const px = (v: number) => `${v.toFixed(2)}px`;

/** Word boxes (layer px) of every text node under the targets: whole whitespace-separated words, padded for ink overshoot. */
const wordRects = (i: SettledInfo): Rect[] => {
  const me = i.mine.getBoundingClientRect();
  if (me.width < 1 || me.height < 1) return [];
  const kx = W / me.width;
  const ky = H / me.height;
  const out: Rect[] = [];
  const doc = i.self.ownerDocument;
  for (const t of i.targets) {
    const walker = doc.createTreeWalker(t, 4 /* NodeFilter.SHOW_TEXT */);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const txt = n.textContent ?? '';
      const re = /\S+/g;
      for (let m = re.exec(txt); m; m = re.exec(txt)) {
        const rg = doc.createRange();
        rg.setStart(n, m.index);
        rg.setEnd(n, m.index + m[0].length);
        for (const b of Array.from(rg.getClientRects())) {
          if (b.width < 0.5 || b.height < 0.5) continue;
          out.push({x: (b.left - me.left) * kx - WORD_PAD, y: (b.top - me.top) * ky - WORD_PAD, w: b.width * kx + 2 * WORD_PAD, h: b.height * ky + 2 * WORD_PAD});
        }
      }
    }
  }
  return out;
};

const buildClones = (i: SettledInfo, props: Props, t: number, n: number, fxId: string) => {
  const host = i.self.querySelector<HTMLElement>('[data-shards]');
  if (!host) return;
  host.replaceChildren();
  if (!i.m || t < 0 || !i.targets.length) return;
  const area = pad(paintedRect(i) ?? i.m.rect, PAD_PX);
  const cells = planShards(area, props.blocks, props.seed, wordRects(i));
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
  // standard / hero: the impact flash behind the pieces, at the seeded impact point, decaying over the burst
  if (!lite) {
    const ip = impactOf(area, props.seed);
    const k = Math.max(0, 1 - t / n);
    const rad = (area.w + area.h) * 0.3 * (0.6 + 0.4 * Math.min(1, t / (n * 0.5)));
    const fl = doc.createElement('div');
    fl.style.cssText = `position:absolute;left:${px(ip.x - rad)};top:${px(ip.y - rad)};width:${px(2 * rad)};height:${px(2 * rad)};background:radial-gradient(circle, ${C.signal}${hex(0.38 * k)} 0%, ${C.signal}${hex(0.1 * k)} 45%, ${C.signal}00 70%)`;
    host.appendChild(fl);
  }
  const shadows = doc.createElement('div'); // every drop shadow under every chunk
  host.appendChild(shadows);
  for (const c of cells) {
    const m = shardAt(c, t, n);
    const [dx, dy] = clampCell(c, m.dx, m.dy, safe);
    const place = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:${px(c.cx)} ${px(c.cy)};transform:translate(${px(dx)},${px(dy)}) rotate(${m.rot.toFixed(3)}deg)`;
    // the clip-path sits on the transformed element itself (a clip on a child of a transformed box made the raster tiles flaky)
    const blk = doc.createElement('div');
    blk.style.cssText = `${place};clip-path:inset(${px(c.r.y)} ${px(W - c.r.x - c.r.w)} ${px(H - c.r.y - c.r.h)} ${px(c.r.x)})`;
    const under = doc.createElement('div');
    under.style.cssText = place;
    const box = `left:${px(c.r.x)};top:${px(c.r.y)};width:${px(c.r.w)};height:${px(c.r.h)}`;
    // drop shadow (key light upper right: it falls to the lower left), growing with the lift of the burst
    const lift = Math.min(1.15, m.p);
    const sh = doc.createElement('div');
    sh.style.cssText = `position:absolute;${box};box-shadow:${(-lift * 6).toFixed(1)}px ${(4 + lift * 10).toFixed(1)}px ${(8 + lift * 20).toFixed(1)}px ${C.void}${hex(0.5 + 0.3 * Math.min(1, lift))}`;
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
    // sheen: the key light from the upper right across the chunk (a faint gradient over the cloned pixels)
    const sheen = doc.createElement('div');
    sheen.style.cssText = `position:absolute;${box};background:linear-gradient(to bottom left, ${C.ink}${hex(0.09)} 0%, ${C.ink}00 55%)`;
    blk.appendChild(sheen);
    const edge = doc.createElement('div');
    const flash = m.edge;
    const line = `inset -1px 1px 0 ${C.ink}${hex(0.3)}, inset 0 0 0 1px ${C.ink3}${hex(0.6)}, inset 0 0 0 ${(1 + flash * 2).toFixed(2)}px ${C.signal}${hex(0.85 * flash)}`;
    edge.style.cssText = `position:absolute;${box};box-shadow:${lite ? line : `${line}, inset 0 0 14px ${C.signal}${hex(0.12 + 0.3 * flash)}`}`;
    blk.appendChild(edge);
    under.appendChild(sh);
    shadows.appendChild(under);
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
