// BlockReplication (catalog: Structure & flow). HDFS-style replication (04 §6 Big data · HDFS: "file splits into blocks that
// replicate x3 across racks"; failure -> fix: "node dies -> replicas keep serving").
//  - Top: the file as one glass bar that splits into `blocks` segments (block ids b1..bn, Latin code isolates). Bottom: the
//    DataNodes as glass racks with their labels; each rack holds the replica chips it stores.
//  - Layer anchor: the file arrives, splits (morph), then the copies fly down replica round by replica round (copy 1 of every
//    block, then copy 2, ...) on arcs with a light trail; `factor` copies per block (capped at the node count), never two copies
//    of one block on the same node.
//  - failNode(node): on its anchor the rack turns crit and shakes; its chips go hollow (lost); the surviving copies of every
//    block that lost one turn warn (under-replicated) but keep glowing: the data is still served.
//  - rereplicate: each lost copy is re-created from a surviving holder onto the live node that has the fewest chips and does not
//    hold that block yet; chips land ok and the warn clears.
//  - RTL order when node labels are Arabic (first node on the right). Labels auto-fit (28 px floor for node labels; the block
//    ids are non-spoken microcopy, 18 px floor).
import React from 'react';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, actionsOf, cardStyle, f24, layerStyle, lerp, prog, qAt, qPath, rtlOf, shake} from '../_struct-b/kit';

type Ctx = DcProps<Props>['ctx'];
type Copy = {block: number; node: number; born: number; fly: number; from: number | null; re: boolean};

/** Structural timeline (pure): copies with landing times, node failures, re-replication copies. */
export const replTimeline = (p: Props, ctx: Ctx) => {
  const B = p.blocks;
  const N = p.nodes.length;
  const f = Math.min(p.factor, N);
  const splitAt = ctx.at + f24(8, ctx.fps);
  const flyStart = splitAt + presetFrames('morph', ctx.fps, true) + f24(2, ctx.fps);
  const fly = f24(8, ctx.fps);
  let step = N > f ? Math.floor(N / f) : 1;
  const distinct = (s: number) => new Set(Array.from({length: f}, (_, r) => (r * s) % N)).size === f;
  if (!distinct(step)) step = 1;
  const copies: Copy[] = [];
  for (let r = 0; r < f; r++)
    for (let b = 0; b < B; b++) copies.push({block: b, node: (b + r * step) % N, born: flyStart + Math.round(((r * B + b) * 1.5 * ctx.fps) / 24), fly, from: null, re: false});
  const fails: {node: number; t: number}[] = [];
  for (const a of actionsOf(ctx, 'failNode', 'rereplicate')) {
    if (a.name === 'failNode') {
      const node = p.nodes.findIndex((n) => n.id === a.props.node);
      if (node >= 0 && !fails.some((x) => x.node === node)) fails.push({node, t: a.at});
    } else {
      const dead = new Set(fails.filter((x) => x.t <= a.at).map((x) => x.node));
      const held = (n: number) => copies.filter((c) => c.node === n && c.born <= a.at && !dead.has(c.node)).length;
      let i = 0;
      for (let b = 0; b < B; b++) {
        const live = copies.filter((c) => c.block === b && !dead.has(c.node));
        const missing = f - new Set(live.map((c) => c.node)).size;
        for (let m = 0; m < missing; m++) {
          const cand = p.nodes.map((_, n) => n).filter((n) => !dead.has(n) && !copies.some((c) => c.block === b && c.node === n && !dead.has(c.node)));
          if (!cand.length || !live.length) break;
          cand.sort((x, y) => held(x) - held(y) || x - y);
          copies.push({block: b, node: cand[0], born: a.at + f24(2 * i++, ctx.fps), fly: f24(10, ctx.fps), from: live[0].node, re: true});
        }
      }
    }
  }
  return {B, N, f, splitAt, copies, fails};
};

export const BlockReplicationView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const tl = replTimeline(props, ctx);
  const {B, N} = tl;
  const rtl = rtlOf(props.nodes.map((n) => n.label));
  const lblN = presetFrames('label', ctx.fps);
  const morph = presetFrames('morph', ctx.fps, true);
  const k = 1 + ctx.mod.glow;
  const deadAt = (n: number) => tl.fails.find((x) => x.node === n)?.t;
  const isDead = (n: number) => {
    const d = deadAt(n);
    return d !== undefined && t >= d;
  };
  // ---- file bar ----
  const fileW = Math.min(w * 0.82, B * 150);
  const fileX = (w - fileW) / 2;
  const fileH = Math.round(SIZE.label * 2.2);
  const split = prog(t, tl.splitAt, morph, ease.camera);
  const segGap = 16 * split;
  const segW = (fileW - segGap * (B - 1)) / B;
  const segX = (b: number) => (rtl ? fileX + fileW - (b + 1) * segW - b * segGap : fileX + b * (segW + segGap));
  // ---- nodes ----
  const gapX = 26;
  const nodeW = Math.min(250, (w - gapX * (N - 1)) / N);
  const rowW = N * nodeW + gapX * (N - 1);
  const nodeX = (n: number) => (rtl ? (w + rowW) / 2 - (n + 1) * nodeW - n * gapX : (w - rowW) / 2 + n * (nodeW + gapX));
  const labelH = Math.round(SIZE.label * 1.8);
  const perNode = Math.max(...Array.from({length: N}, (_, n) => tl.copies.filter((c) => c.node === n).length), 1);
  const gcols = nodeW >= 190 ? 3 : 2;
  const grows = Math.ceil(perNode / gcols);
  const pad = 14;
  const chipW = (nodeW - 2 * pad - (gcols - 1) * 8) / gcols;
  const chipH = Math.min(chipW * 0.7, 72);
  // the whole composition (file bar, gap, racks, node labels) is sized from its content and centred in the box
  const nodeH = pad * 2 + 30 + grows * (chipH + 8);
  const gapFR = Math.max(110, h * 0.16);
  const total = fileH + gapFR + nodeH + labelH + 8;
  const fileY = Math.max(0, (h - total) / 2);
  const nodeTop = fileY + fileH + gapFR;
  const slotOf = (c: Copy) => tl.copies.filter((x) => x.node === c.node && (x.born < c.born || (x.born === c.born && tl.copies.indexOf(x) < tl.copies.indexOf(c)))).length;
  const slotXY = (c: Copy) => {
    const s = slotOf(c);
    const col = s % gcols;
    const row = Math.floor(s / gcols);
    const cx = rtl ? nodeX(c.node) + nodeW - pad - (col + 0.5) * chipW - col * 8 : nodeX(c.node) + pad + (col + 0.5) * chipW + col * 8;
    return {x: cx, y: nodeTop + pad + 30 + (row + 0.5) * chipH + row * 8};
  };
  const lost = (c: Copy) => isDead(c.node);
  const underRep = (b: number) => {
    const live = tl.copies.filter((c) => c.block === b && t >= c.born + c.fly && !lost(c));
    return tl.fails.some((x) => t >= x.t) && new Set(live.map((c) => c.node)).size < tl.f;
  };
  const fileOn = prog(t, ctx.at, presetFrames('arrive', ctx.fps));
  const firstFail = tl.fails.filter((x) => t >= x.t).slice(-1)[0];
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {firstFail ? <Pool x={nodeX(firstFail.node) + nodeW / 2} y={nodeTop + nodeH / 2} r={nodeW * 1.3} color={C.crit} a={0.22 * (1 - 0.6 * prog(t, firstFail.t, morph * 2))} squash={0.8} /> : null}
      {/* file segments */}
      {Array.from({length: B}, (_, b) => (
        <div key={`s${b}`} style={{position: 'absolute', left: segX(b), top: fileY, width: segW, height: fileH, opacity: fileOn, ...cardStyle(split > 0 ? C.signal : C.grid, 0.9), borderRadius: split > 0.5 ? 10 : 4}}>
          <Lbl id={`${ctx.id}:s${b}`} text={`b${b + 1}`} x={segW / 2} y={fileH / 2} maxW={segW - 10} size={SIZE.labelMin} min={SIZE.secondaryMin} color={C.ink} role="code" />
        </div>
      ))}
      {/* racks */}
      {props.nodes.map((nd, n) => {
        const on = prog(t, ctx.at + f24(2 + 2 * n, ctx.fps), presetFrames('arrive', ctx.fps));
        const dead = isDead(n);
        const dx = dead ? shake(t, deadAt(n)!, f24(10, ctx.fps), 7) : 0;
        return (
          <React.Fragment key={nd.id}>
            <div style={{position: 'absolute', left: nodeX(n) + dx, top: nodeTop, width: nodeW, height: nodeH, opacity: on * (dead ? 0.75 : 1), transform: `translateY(${((1 - on) * 24).toFixed(1)}px)`, ...cardStyle(dead ? C.crit : undefined, 0.85)}}>
              {[0, 1, 2].map((q) => (
                <div key={q} style={{position: 'absolute', left: rtl ? nodeW - pad - 10 - q * 16 : pad + q * 16, top: pad, width: 9, height: 9, borderRadius: 5, background: dead ? C.crit : q === 0 ? C.ok : `${C.ink}${hex(0.25)}`}} />
              ))}
            </div>
            <Lbl id={`${ctx.id}:n${n}`} text={nd.label} x={nodeX(n) + nodeW / 2 + dx} y={nodeTop + nodeH + 8} valign="top" maxW={nodeW + gapX - 8} color={dead ? C.crit : C.ink} opacity={on} />
          </React.Fragment>
        );
      })}
      {/* copies: flight arcs then chips */}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {tl.copies.map((c, i) => {
          if (t < c.born) return null;
          const q = prog(t, c.born, c.fly, ease.arrive);
          if (q >= 1) return null;
          const end = slotXY(c);
          const st = c.from === null ? {x: segX(c.block) + segW / 2, y: fileY + fileH} : {x: nodeX(c.from) + nodeW / 2, y: nodeTop + 20};
          const ctl = {x: (st.x + end.x) / 2, y: Math.min(st.y, end.y) - (c.re ? 140 : 40)};
          const p = qAt(st, ctl, end, q);
          return (
            <g key={i}>
              <GlowPath d={qPath(st, ctl, end)} color={c.re ? C.ok : C.signal} width={2} fx={ctx.fx} k={0.4 * k} opacity={0.5 * (1 - q)} draw={q} />
              <circle cx={p.x} cy={p.y} r={7} fill={c.re ? C.ok : C.signal} />
            </g>
          );
        })}
      </svg>
      {tl.copies.map((c, i) => {
        if (t < c.born + c.fly - 1) return null;
        const land = prog(t, c.born + c.fly - 1, presetFrames('impact', ctx.fps, true), ease.impact);
        const p = slotXY(c);
        const dead = lost(c);
        const ur = !dead && underRep(c.block);
        const accent = dead ? C.crit : c.re ? C.ok : ur ? C.warn : C.signal;
        const dx = dead ? shake(t, deadAt(c.node)!, f24(10, ctx.fps), 7) : 0;
        return (
          <div
            key={`c${i}`}
            style={{
              position: 'absolute',
              left: p.x - chipW / 2 + dx,
              top: p.y - chipH / 2,
              width: chipW,
              height: chipH,
              borderRadius: 8,
              transform: `scale(${(0.7 + 0.3 * land).toFixed(3)})`,
              opacity: dead ? 0.45 : 1,
              background: dead ? 'transparent' : `${accent}${hex(0.16)}`,
              border: `1.5px ${dead ? 'dashed' : 'solid'} ${accent}`,
              boxShadow: dead ? undefined : `0 0 ${(ctx.fx.glowInner * 1.2 * k).toFixed(1)}px ${accent}${hex(0.45)}`,
            }}
          >
            <Lbl id={`${ctx.id}:c${i}`} text={`b${c.block + 1}`} x={chipW / 2} y={chipH / 2} maxW={chipW - 8} size={SIZE.labelMin} min={SIZE.secondaryMin} color={dead ? C.crit : C.ink} role="code" />
          </div>
        );
      })}
      {/* lane rule between file and racks */}
      <div style={{position: 'absolute', left: fileX, top: fileY + fileH + (nodeTop - fileY - fileH) / 2, width: fileW, height: 1, background: `${C.grid}`, opacity: 0.6 * fileOn}} />
      {Array.from({length: B}, (_, b) => (underRep(b) ? <div key={`u${b}`} style={{position: 'absolute', left: segX(b), top: fileY + fileH + 6, width: segW, height: 4, borderRadius: 2, background: C.warn}} /> : null))}
      {void lerp}
    </div>
  );
};

export const BlockReplication: DcComponent<Props> = {name: 'BlockReplication', Component: BlockReplicationView, text: true, slot: 'center'};
