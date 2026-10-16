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
//  - Depth and light (ADR-003 LK-F): the file is a row of raised glass tiles under a signal key pool; racks are tall glass cabinets
//    (lit top face, status LEDs, drive bays) on a lit perspective floor with a per-rack under-light pool; copies fly as raised
//    tiles with a light trail and land as raised chips; the dead rack throws crit sparks and a crit pool. 2.5D only, no WebGL.
//  - RTL order when node labels are Arabic (first node on the right). Labels auto-fit (28 px floor for node labels; the block
//    ids are non-spoken microcopy, 18 px floor).
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, actionsOf, cardStyle, f24, layerStyle, lPath, lerp, prog, qAt, rtlOf, shake} from '../_struct-b/kit';

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
  const morph = presetFrames('morph', ctx.fps, true);
  const lblN = presetFrames('label', ctx.fps);
  const k = 1 + ctx.mod.glow;
  const deadAt = (n: number) => tl.fails.find((x) => x.node === n)?.t;
  const isDead = (n: number) => {
    const d = deadAt(n);
    return d !== undefined && t >= d;
  };
  // ---- file slab ----
  const fileW = Math.min(w * 0.82, B * 150);
  const fileX = (w - fileW) / 2;
  const fileH = Math.round(SIZE.label * 2.2);
  const split = prog(t, tl.splitAt, morph, ease.camera);
  const segGap = 16 * split;
  const segW = (fileW - segGap * (B - 1)) / B;
  const segX = (b: number) => (rtl ? fileX + fileW - (b + 1) * segW - b * segGap : fileX + b * (segW + segGap));
  // ---- racks ----
  const gapX = 26;
  const nodeW = Math.min(250, (w - gapX * (N - 1)) / N);
  const rowW = N * nodeW + gapX * (N - 1);
  const nodeX = (n: number) => (rtl ? (w + rowW) / 2 - (n + 1) * nodeW - n * gapX : (w - rowW) / 2 + n * (nodeW + gapX));
  const labelH = Math.round(SIZE.label * 1.8);
  const perNode = Math.max(...Array.from({length: N}, (_, n) => tl.copies.filter((c) => c.node === n).length), 1);
  const gcols = nodeW >= 190 ? 3 : 2;
  const grows = Math.ceil(perNode / gcols);
  const pad = 14;
  const top = 38; // rack head: top face + LEDs
  const chipW = (nodeW - 2 * pad - (gcols - 1) * 8) / gcols;
  const chipH = Math.min(chipW * 0.7, 72);
  // the whole composition (file slab, gap, racks, node labels, floor) is sized from its content and centred in the box
  const nodeH = Math.round(Math.max(pad * 2 + top + grows * (chipH + 8), Math.min(nodeW * 1.25, h * 0.42)));
  const floorH = 46;
  const gapFR = Math.max(110, h * 0.16);
  const total = fileH + gapFR + nodeH + labelH + 8;
  const fileY = Math.max(0, (h - total) / 2);
  const nodeTop = fileY + fileH + gapFR;
  const base = nodeTop + nodeH;
  const slotOf = (c: Copy) => tl.copies.filter((x) => x.node === c.node && (x.born < c.born || (x.born === c.born && tl.copies.indexOf(x) < tl.copies.indexOf(c)))).length;
  const bayXY = (n: number, s: number) => {
    const col = s % gcols;
    const row = Math.floor(s / gcols);
    const cx = rtl ? nodeX(n) + nodeW - pad - (col + 0.5) * chipW - col * 8 : nodeX(n) + pad + (col + 0.5) * chipW + col * 8;
    return {x: cx, y: nodeTop + pad + top + (row + 0.5) * chipH + row * 8};
  };
  const slotXY = (c: Copy) => bayXY(c.node, slotOf(c));
  const lost = (c: Copy) => isDead(c.node);
  const underRep = (b: number) => {
    const live = tl.copies.filter((c) => c.block === b && t >= c.born + c.fly && !lost(c));
    return tl.fails.some((x) => t >= x.t) && new Set(live.map((c) => c.node)).size < tl.f;
  };
  const fileOn = prog(t, ctx.at, presetFrames('arrive', ctx.fps));
  const rackOn = (n: number) => prog(t, ctx.at + f24(2 + 2 * n, ctx.fps), presetFrames('arrive', ctx.fps));
  const firstFail = tl.fails.filter((x) => t >= x.t).slice(-1)[0];
  // a block restored (all its re-replicated copies landed) pulses ok for a moment
  const restoredAt = (b: number) => Math.max(-1, ...tl.copies.filter((c) => c.re && c.block === b).map((c) => c.born + c.fly));
  const leaving = (b: number) => tl.copies.some((c) => !c.re && c.block === b && t >= c.born && t < c.born + f24(5, ctx.fps));
  const pulseOk = (b: number) => {
    const r = restoredAt(b);
    return r > 0 && t >= r && t < r + f24(14, ctx.fps) ? 1 - (t - r) / f24(14, ctx.fps) : 0;
  };
  const id = ctx.id;
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {/* light (ADR-003 LK-F): signal key pool over the file slab, an under-light pool per live rack on the floor, crit pool on the dead rack */}
      <Pool x={w / 2} y={fileY + fileH + 10} r={fileW * 0.5} color={C.signal} a={0.14 * fileOn * k} squash={0.25} />
      {props.nodes.map((nd, n) => (
        <Pool key={`pl${nd.id}`} x={nodeX(n) + nodeW / 2} y={base + 10} r={nodeW * 0.85} color={isDead(n) ? C.crit : C.signal} a={(isDead(n) ? 0.12 : 0.2) * rackOn(n) * k} squash={0.16} />
      ))}
      {firstFail ? <Pool x={nodeX(firstFail.node) + nodeW / 2} y={nodeTop + nodeH / 2} r={nodeW * 1.3} color={C.crit} a={0.22 * (1 - 0.6 * prog(t, firstFail.t, morph * 2))} squash={0.8} /> : null}
      {/* perspective floor grid under the racks (depth), fading away from the lit base */}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: prog(t, ctx.at, morph, ease.camera)}}>
        <defs>
          <linearGradient id={`${id}-fl`} gradientUnits="userSpaceOnUse" x1="0" y1={base + 8} x2="0" y2={base + floorH + 50}>
            <stop offset="0" stopColor={C.signal} stopOpacity={0.4} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0} />
          </linearGradient>
        </defs>
        {Array.from({length: 4}, (_, i) => {
          const d = Math.pow((i + 1) / 4, 1.6) * (floorH + 40);
          return <line key={`fh${i}`} x1={(w - rowW) / 2 - 40} x2={(w + rowW) / 2 + 40} y1={base + 8 + d} y2={base + 8 + d} stroke={`url(#${id}-fl)`} strokeWidth={1.5} />;
        })}
        {Array.from({length: 17}, (_, j) => {
          const q = (j - 8) / 8;
          const xa = w / 2 + q * (rowW / 2 + 40);
          return <line key={`fv${j}`} x1={xa} x2={w / 2 + q * (rowW / 2 + 40) * 1.5} y1={base + 8} y2={base + floorH + 50} stroke={`url(#${id}-fl)`} strokeWidth={1.5} />;
        })}
      </svg>
      {/* file slab: raised glass tiles; a tile glows while one of its copies departs, flashes ok when its block is restored */}
      {Array.from({length: B}, (_, b) => {
        const ok = pulseOk(b);
        const out = leaving(b);
        const ur = underRep(b);
        const accent = ok > 0 ? C.ok : ur ? C.warn : C.signal;
        return (
          <div
            key={`s${b}`}
            style={{
              position: 'absolute',
              left: segX(b),
              top: fileY - (out ? 3 : 0),
              width: segW,
              height: fileH,
              opacity: fileOn,
              ...cardStyle(split > 0 ? accent : C.grid, 0.92),
              borderRadius: split > 0.5 ? 10 : 4,
              boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.16)}, 0 12px 22px ${C.void}${hex(0.6)}, 0 0 ${(ctx.fx.glowInner * (out || ok > 0 ? 2.2 : 1.2) * k).toFixed(1)}px ${accent}${hex(out || ok > 0 ? 0.6 : 0.28)}`,
            }}
          >
            <Lbl id={`${id}:s${b}`} text={`b${b + 1}`} x={segW / 2} y={fileH / 2} maxW={segW - 10} size={SIZE.labelMin} min={SIZE.secondaryMin} color={C.ink} role="code" />
          </div>
        );
      })}
      {/* racks: tall glass cabinets with a lit top face, status LEDs and drive bays */}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id={`${id}-rk`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.panel} stopOpacity={0.95} />
            <stop offset="1" stopColor={C.ground} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        {props.nodes.map((nd, n) => {
          const on = rackOn(n);
          if (on <= 0) return null;
          const dead = isDead(n);
          const dx = dead ? shake(t, deadAt(n)!, f24(10, ctx.fps), 7) : 0;
          const x = nodeX(n) + dx;
          const y = nodeTop + (1 - on) * 24;
          const col = dead ? C.crit : C.signal;
          const bays = Math.max(grows * gcols, perNode);
          const st = t - (deadAt(n) ?? 1e9);
          const sparks = dead && st < f24(12, ctx.fps) ? Array.from({length: 7}, (_, i) => ({a: -Math.PI * (0.1 + 0.8 * random(`br-sp-${id}-${n}-${i}`)), l: 20 + 46 * random(`br-sl-${id}-${n}-${i}`)})) : [];
          return (
            <g key={nd.id} opacity={on * (dead ? 0.82 : 1)}>
              <rect x={x + 6} y={y + 12} width={nodeW} height={nodeH} rx={14} fill={C.void} opacity={0.5} />
              <rect x={x} y={y} width={nodeW} height={nodeH} rx={14} fill={`url(#${id}-rk)`} stroke={col} strokeOpacity={dead ? 1 : 0.7} strokeWidth={1.5} />
              <path d={`M ${x + 14} ${y + 1} L ${x + nodeW - 14} ${y + 1}`} stroke={C.ink} strokeOpacity={0.2} strokeWidth={2} strokeLinecap="round" />
              <rect x={x + pad} y={y + pad - 2} width={nodeW - 2 * pad} height={top - pad + 2 - 8} rx={6} fill={C.void} opacity={0.45} />
              {[0, 1, 2].map((q) => (
                <circle key={q} cx={rtl ? x + nodeW - pad - 14 - q * 18 : x + pad + 14 + q * 18} cy={y + pad + (top - pad - 8) / 2 - 1} r={5} fill={dead ? C.crit : q === 0 ? C.ok : C.ink} fillOpacity={dead || q === 0 ? 1 : 0.25} />
              ))}
              {Array.from({length: bays}, (_, s) => {
                const p = bayXY(n, s);
                return <rect key={s} x={p.x - chipW / 2 + dx} y={p.y - chipH / 2 + (1 - on) * 24} width={chipW} height={chipH} rx={8} fill={C.ink} fillOpacity={0.035} stroke={C.grid} strokeOpacity={0.55} strokeWidth={1} />;
              })}
              {sparks.map((s, i) => {
                const u = st / f24(12, ctx.fps);
                const cx = x + nodeW / 2;
                return <line key={i} x1={cx + Math.cos(s.a) * s.l * u} y1={y + Math.sin(s.a) * s.l * u} x2={cx + Math.cos(s.a) * (s.l * u + 18)} y2={y + Math.sin(s.a) * (s.l * u + 18)} stroke={C.crit} strokeWidth={3} strokeLinecap="round" opacity={1 - u} />;
              })}
            </g>
          );
        })}
      </svg>
      {props.nodes.map((nd, n) => {
        const dead = isDead(n);
        const dx = dead ? shake(t, deadAt(n)!, f24(10, ctx.fps), 7) : 0;
        return <Lbl key={nd.id} id={`${id}:n${n}`} text={nd.label} x={nodeX(n) + nodeW / 2 + dx} y={base + 12} valign="top" maxW={nodeW + gapX - 8} color={dead ? C.crit : C.ink} opacity={rackOn(n)} />;
      })}
      {/* copies in flight: a raised tile on an arc with a light trail */}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {tl.copies.map((c, i) => {
          if (t < c.born) return null;
          const q = prog(t, c.born, c.fly, ease.arrive);
          if (q >= 1) return null;
          const end = slotXY(c);
          const st = c.from === null ? {x: segX(c.block) + segW / 2, y: fileY + fileH} : {x: nodeX(c.from) + nodeW / 2, y: nodeTop + top};
          const ctl = {x: (st.x + end.x) / 2, y: Math.min(st.y, end.y) - (c.re ? 150 : 40)};
          const p = qAt(st, ctl, end, q);
          const col = c.re ? C.ok : C.signal;
          const pts = Array.from({length: 7}, (_, j) => qAt(st, ctl, end, Math.max(0, q - 0.3) + ((q - Math.max(0, q - 0.3)) * j) / 6));
          const s = Math.min(chipW, 70) * lerp(0.9, 0.7, q);
          return (
            <g key={i}>
              <GlowPath d={lPath(pts)} color={col} width={3} fx={ctx.fx} k={0.8 * k} opacity={0.8 * (1 - q * 0.5)} />
              <rect x={p.x - s / 2 + 2} y={p.y - s * 0.32 + 6} width={s} height={s * 0.64} rx={6} fill={C.void} opacity={0.45} />
              <rect x={p.x - s / 2} y={p.y - s * 0.32} width={s} height={s * 0.64} rx={6} fill={`${col}${hex(0.3)}`} stroke={col} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {/* chips: copies that landed */}
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
              opacity: dead ? 0.5 : 1,
              background: dead ? 'transparent' : `linear-gradient(180deg, ${accent}${hex(0.28)} 0%, ${accent}${hex(0.1)} 100%)`,
              border: `1.5px ${dead ? 'dashed' : 'solid'} ${accent}`,
              boxShadow: dead ? undefined : `inset 0 1px 0 ${C.ink}${hex(0.22)}, 0 6px 10px ${C.void}${hex(0.55)}, 0 0 ${(ctx.fx.glowInner * 1.2 * k * (1 + land * (c.re ? 0.8 : 0.4) * (1 - land))).toFixed(1)}px ${accent}${hex(0.5)}`,
            }}
          >
            <Lbl id={`${id}:c${i}`} text={`b${c.block + 1}`} x={chipW / 2} y={chipH / 2} maxW={chipW - 8} size={SIZE.labelMin} min={SIZE.secondaryMin} color={dead ? C.crit : C.ink} role="code" />
          </div>
        );
      })}
      {/* under-replicated block: a warn bar under its file tile */}
      {Array.from({length: B}, (_, b) => (underRep(b) ? <div key={`u${b}`} style={{position: 'absolute', left: segX(b), top: fileY + fileH + 8, width: segW, height: 4, borderRadius: 2, background: C.warn, boxShadow: `0 0 ${(ctx.fx.glowInner * k).toFixed(1)}px ${C.warn}`}} /> : null))}
      {void lblN}
    </div>
  );
};

export const BlockReplication: DcComponent<Props> = {name: 'BlockReplication', Component: BlockReplicationView, text: true, slot: 'center'};
