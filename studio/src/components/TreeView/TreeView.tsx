// TreeView (catalog: Structure & flow). A tree given as a flat parent list, in four variants (04 section 6):
//   btree    page cards top-down; leaves linked by a dashed sibling chain (B+ tree); `search` = the 3-hop descent (§6.5);
//   plan     query-plan operators top-down with their `kind` on a mono tag; rows flow UP the edges (pulses towards the root);
//   decision questions (diamond glyph) and outcomes (kind allow | deny | warn tint the card); `highlightPath` = the evaluation
//            trace, e.g. IAM "explicit deny -> allow -> implicit deny" (§6.8);
//   fs       folder tree as an outline with glowing branches from the reading-start side (RTL: the right); a path is a lit route.
// Entrance: nodes stagger in depth-first from the layer anchor (label preset); edges draw parent -> child.
// Actions (on the word that names them, 04 section 4 lead -2 f; RV1 = first visible step on the anchor frame):
//   expand        the node's children (hidden until then) grow out of it while the tree re-flows (morph timing);
//   highlightPath the route lights hop by hop in signal with a pulse on each hop; a later path replaces it;
//   search        a probe descends from the root hop by hop to the first node whose label contains `key` (ok ring on the hit;
//                 every other match glows ok too); no match = the probe dead-ends on the root (crit).
// The whole tree auto-fits ctx.box as one unit at its fully expanded size (labels >= 28 px), else DC_QA overflow.
import React, {useMemo} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {MixedText} from '../../type/Text';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {halo} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, GlyphIcon, Wire, acts, bornAt, dirOf, exitStyle, fitScale, march, mix, useMeasure, vS, type Cubic, type Glyph, type Pt, type Sz} from '../_struct-a/kit';
import {indentTree, tidyTree, treeOf} from '../_struct-a/layout';

type Ctx = DcProps<Props>['ctx'];
const TONE: Record<string, string> = {allow: C.ok, ok: C.ok, yes: C.ok, deny: C.crit, crit: C.crit, no: C.crit, fail: C.crit, warn: C.warn};
const norm = (s: string) => s.normalize('NFC').trim();

/** Visibility states: the initial one, then one per `expand` (children of an expand target stay hidden until it fires). */
const visStates = (p: Props, ctx: Ctx, tr: ReturnType<typeof treeOf>) => {
  const idx = new Map(p.nodes.map((q, i) => [q.id, i]));
  const ex = acts(ctx, 'expand')
    .map((a) => ({t: a.at, i: idx.get(a.props.node as string)}))
    .filter((e): e is {t: number; i: number} => e.i !== undefined);
  const closed = new Set(ex.map((e) => e.i));
  const vis = () =>
    p.nodes.map((_, i) => {
      for (let a = tr.parent[i]; a >= 0; a = tr.parent[a]) if (closed.has(a)) return false;
      return true;
    });
  const states: {t: number; vis: boolean[]}[] = [{t: -1e9, vis: vis()}];
  for (const e of ex) {
    if (!closed.has(e.i)) continue;
    closed.delete(e.i);
    states.push({t: e.t, vis: vis()});
  }
  return states;
};

export const TreeViewView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const v = props.variant;
  const n = props.nodes.length;
  const fs0 = n <= 12 ? SIZE.body : SIZE.label;
  const fk0 = Math.max(SIZE.labelMin, Math.round(fs0 * 0.8));
  const showKind = v === 'plan';
  const items = [...props.nodes.map((q) => ({text: q.label, size: fs0})), ...(showKind ? props.nodes.map((q) => ({text: q.kind ?? '-', size: fk0, weight: 500, role: 'code' as const})) : [])];
  const m = useMeasure(ctx.id, items);
  const dir = dirOf(props.nodes.map((q) => q.label));
  const rtl = dir === 'rtl';
  const tr = useMemo(() => treeOf(props.nodes), [props.nodes]);
  const states = visStates(props, ctx, tr);
  const stKey = states.map((s) => s.vis.map((b) => (b ? 1 : 0)).join('')).join('|');

  const glyphOf = (i: number): Glyph | null => {
    const kind = (props.nodes[i].kind ?? '').toLowerCase();
    if (v === 'fs') return kind === 'dir' || kind === 'folder' || tr.kids[i].length ? 'folder' : 'file';
    if (v === 'decision') return tr.kids[i].length ? 'diamond' : TONE[kind] === C.ok ? 'check' : TONE[kind] === C.crit ? 'cross' : null;
    return null;
  };

  const geo = useMemo(() => {
    if (!m.w) return null;
    const h = Math.round(fs0 * (v === 'fs' ? 1.75 : 2.0));
    const icon = Math.round(h * 0.62);
    const padX = fs0 * 0.7;
    const kindH = showKind ? Math.round(fk0 * 1.5) : 0;
    const sz: Sz[] = props.nodes.map((_, i) => {
      const lw = (m.w as number[])[i] + 2 * padX + (glyphOf(i) ? icon + Math.round(h * 0.18) : 0);
      const kw = showKind ? (m.w as number[])[n + i] + fk0 : 0;
      return {w: Math.max(lw, kw), h};
    });
    const gapX = Math.max(fs0 * 1.1, 44);
    const levelH0 = h + kindH + Math.max(fs0 * 1.6, 56);
    const allVis = props.nodes.map(() => true);
    const layAt = (vis: boolean[], lh: number) =>
      v === 'fs' ? indentTree(tr, sz, Math.round(fs0 * 1.6), Math.round(h * 1.32), rtl, vis) : tidyTree(tr, sz, gapX, lh, rtl, vis);
    // a first pass at the base level gap, then the levels open up (up to 1.9x) so the tree fills the slot height
    const first = layAt(allVis, levelH0);
    const s0 = Math.min(1.3, ctx.box.w / first.nat.w, ctx.box.h / (first.nat.h + kindH));
    const maxDepth = Math.max(1, ...tr.depth);
    const levelH = v === 'fs' ? levelH0 : levelH0 + Math.min(levelH0 * 0.9, (Math.max(0, ctx.box.h / s0 - (first.nat.h + kindH)) * 0.85) / maxDepth);
    const lay = (vis: boolean[]) => layAt(vis, levelH);
    const all = lay(allVis);
    const nat = {w: all.nat.w, h: all.nat.h + kindH};
    const fit = fitScale(ctx.id, nat, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin, 1.3);
    const s = fit.s;
    const top = (ctx.box.h - nat.h * s) / 2 + kindH * s;
    const place = (vis: boolean[]): Pt[] => {
      const L = lay(vis);
      const ox = v === 'fs' ? (ctx.box.w - all.nat.w * s) / 2 + (rtl ? (all.nat.w - L.nat.w) * s : 0) : (ctx.box.w - L.nat.w * s) / 2;
      const pos = L.pos.map((q) => ({x: ox + q.x * s, y: top + q.y * s}));
      // hidden nodes sit on their nearest visible ancestor (they grow out of it on expand)
      return pos.map((q, i) => {
        if (vis[i]) return q;
        let a = tr.parent[i];
        while (a >= 0 && !vis[a]) a = tr.parent[a];
        return a >= 0 ? pos[a] : q;
      });
    };
    const P = states.map((st) => place(st.vis));
    return {P, sz: sz.map((q) => ({w: q.w * s, h: q.h * s})), fs: fit.fs, fk: Math.max(SIZE.labelMin, fk0 * s), kindH: kindH * s, s, overflow: fit.overflow};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.w, props.nodes, v, stKey, ctx.box.w, ctx.box.h, ctx.id, rtl, fs0]);

  if (!geo) return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y}}>{m.node}</div>;

  const t = ctx.frame;
  const fps = ctx.fps;
  const lab = presetFrames('label', fps);
  const arr = presetFrames('arrive', fps);
  const morph = presetFrames('morph', fps, true);
  const ff = flashFrames(fps);
  const idx = new Map(props.nodes.map((q, i) => [q.id, i]));

  // ---- structure at t: interpolated positions + alpha ----
  let k = 0;
  for (let j = 0; j < states.length; j++) if (states[j].t <= t) k = j;
  const q = k === 0 ? 1 : revealProgress(t - states[k].t, morph, ease.camera);
  const prevVis = states[Math.max(0, k - 1)].vis;
  const curVis = states[k].vis;
  const P0 = geo.P[Math.max(0, k - 1)];
  const P1 = geo.P[k];
  const pos = props.nodes.map((_, i) => ({x: P0[i].x + (P1[i].x - P0[i].x) * q, y: P0[i].y + (P1[i].y - P0[i].y) * q}));
  const aVis = props.nodes.map((_, i) => (curVis[i] ? (k === 0 || prevVis[i] ? 1 : q) : prevVis[i] && k > 0 ? 1 - q : 0));
  // birth: depth-first order for the initially visible nodes; expanded nodes are born on their expand
  const dfs: number[] = [];
  const walk = (i: number) => (dfs.push(i), tr.kids[i].forEach(walk));
  tr.roots.forEach(walk);
  const init = dfs.filter((i) => states[0].vis[i]);
  const born = new Array<number>(n).fill(1e9);
  init.forEach((i, j) => (born[i] = bornAt(ctx, j, init.length)));
  for (let j = 1; j < states.length; j++) for (let i = 0; i < n; i++) if (born[i] === 1e9 && states[j].vis[i]) born[i] = states[j].t;

  // ---- actions: highlightPath + search ----
  const lit = new Array<number>(n).fill(0);
  const hits = new Array<number>(n).fill(0);
  const ring: {i: number; q: number; c: string}[] = [];
  const flash = new Array<number>(n).fill(0);
  const routes: {a: number; b: number; p: number; op: number; c: string}[] = [];
  const paths = acts(ctx, 'highlightPath');
  paths.forEach((a, pi) => {
    if (t < a.at) return;
    const next = paths[pi + 1];
    const fade = next && t >= next.at ? 1 - revealProgress(t - next.at, lab) : 1;
    if (fade <= 0) return;
    const ids = (a.props.nodes as string[]).map((id) => idx.get(id)).filter((i): i is number => i !== undefined);
    ids.forEach((i, j) => {
      lit[i] = Math.max(lit[i], revealProgress(t - (a.at + j * arr), lab) * fade);
      if (j + 1 < ids.length) {
        const pq = revealProgress(t - (a.at + j * arr), arr, ease.camera);
        if (pq > 0) routes.push({a: i, b: ids[j + 1], p: pq, op: fade, c: C.signal});
      }
    });
  });
  for (const a of acts(ctx, 'search')) {
    if (t < a.at) continue;
    const key = norm(a.props.key as string);
    const match = props.nodes.map((nd, i) => norm(nd.label).includes(key) && curVis[i]);
    const first = dfs.find((i) => match[i]);
    const chain: number[] = [];
    if (first !== undefined) for (let x = first; x >= 0; x = tr.parent[x]) chain.unshift(x);
    else if (tr.roots.length) chain.push(tr.roots[0]);
    const landT = a.at + (chain.length - 1) * arr;
    chain.forEach((i, j) => {
      const tj = a.at + j * arr;
      const sq = revealProgress(t - tj, lab);
      if (sq > 0 && t - tj < arr * 2) ring.push({i, q: revealProgress(t - tj, morph), c: first === undefined ? C.crit : C.signal});
      lit[i] = Math.max(lit[i], sq * 0.7);
      if (j + 1 < chain.length) {
        const pq = revealProgress(t - tj, arr, ease.camera);
        if (pq > 0) routes.push({a: i, b: chain[j + 1], p: pq, op: 1, c: C.signal});
      }
    });
    if (t >= landT) {
      const since = t - landT;
      const hq = revealProgress(since, lab);
      if (first === undefined) {
        const r0 = chain[0];
        flash[r0] = Math.max(flash[r0], since < ff ? 1 : Math.max(0, 1 - (since - ff) / (3 * ff)));
        hits[r0] = -hq;
      } else {
        match.forEach((mm, i) => mm && (hits[i] = Math.max(hits[i], i === first ? hq : revealProgress(since - arr, lab))));
        flash[first] = Math.max(flash[first], since < ff ? 1 : Math.max(0, 1 - (since - ff) / (3 * ff)));
        if (since < morph) ring.push({i: first, q: revealProgress(since, morph), c: C.ok});
      }
    }
  }

  // ---- geometry ----
  const S = geo.sz;
  const edgeOf = (a: number, b: number): Cubic => {
    if (v === 'fs') {
      // elbow: down the parent's icon column, then across to the child (reading-start side)
      const sx = rtl ? pos[a].x + S[a].w / 2 - S[a].h * 0.5 : pos[a].x - S[a].w / 2 + S[a].h * 0.5;
      const ex = rtl ? pos[b].x + S[b].w / 2 + 4 : pos[b].x - S[b].w / 2 - 4;
      const A = {x: sx, y: pos[a].y + S[a].h / 2};
      const B = {x: ex, y: pos[b].y};
      return [A, {x: sx, y: B.y}, {x: sx, y: B.y}, B];
    }
    return vS({x: pos[a].x, y: pos[a].y + S[a].h / 2}, {x: pos[b].x, y: pos[b].y - S[b].h / 2 - geo.kindH - 6});
  };
  const flip = (c: Cubic): Cubic => [c[3], c[2], c[1], c[0]];
  const period = Math.round(2 * fps);
  const leaves = v === 'btree' ? (() => {
    const maxD = Math.max(...tr.depth.filter((_, i) => curVis[i]));
    return dfs.filter((i) => curVis[i] && !tr.kids[i].some((c) => curVis[c]) && tr.depth[i] === maxD);
  })() : [];

  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {props.nodes.map((_, b) => {
          const a = tr.parent[b];
          if (a < 0 || aVis[b] <= 0) return null;
          const c = edgeOf(a, b);
          const p = revealProgress(t - Math.max(born[a] + lab, born[b]), arr, ease.camera);
          const hot = Math.min(lit[a], lit[b]);
          const up = v === 'plan';
          return (
            <Wire
              key={`e${b}`}
              c={up ? flip(c) : c}
              p={p}
              color={mix(C.ink3, C.ink2, hot)}
              width={2.2 * geo.s}
              opacity={aVis[b] * 0.95}
              arrow={v !== 'fs'}
              pulses={up && p >= 1 ? march(t, period, 1, (b * 0.37) % 1) : undefined}
              pulseR={3 * geo.s}
            />
          );
        })}
        {leaves.slice(1).map((b, j) => {
          const a = leaves[j];
          const y = Math.max(pos[a].y, pos[b].y) + S[a].h / 2 + 10 * geo.s;
          const xa = pos[a].x;
          const xb = pos[b].x;
          const c: Cubic = [{x: xa, y: y - 4}, {x: xa, y: y + 8}, {x: xb, y: y + 8}, {x: xb, y: y - 4}];
          const p = revealProgress(t - Math.max(born[a], born[b]) - lab, arr, ease.camera);
          return <Wire key={`l${b}`} c={c} p={p} color={C.violet} width={1.6 * geo.s} opacity={0.7 * Math.min(aVis[a], aVis[b])} dash arrow />;
        })}
        {routes.map((r, j) => {
          const parentFirst = tr.parent[r.b] === r.a;
          const c = parentFirst ? edgeOf(r.a, r.b) : tr.parent[r.a] === r.b ? flip(edgeOf(r.b, r.a)) : vS(pos[r.a], pos[r.b]);
          return <Wire key={`r${j}`} c={c} p={r.p} color={r.c} width={3.4 * geo.s} glowPx={ctx.fx.glowInner} opacity={r.op} arrow={v !== 'fs'} pulses={r.p < 1 ? [r.p] : march(t, period, 2)} pulseR={5 * geo.s} />;
        })}
        {ring.map((r, j) => {
          const grow = 1 + r.q * 0.8;
          const w = S[r.i].w * grow;
          const h = S[r.i].h * grow;
          return <rect key={`g${j}`} x={pos[r.i].x - w / 2} y={pos[r.i].y - h / 2} width={w} height={h} rx={h * 0.3} fill="none" stroke={r.c} strokeWidth={3} opacity={1 - r.q} />;
        })}
      </svg>
      {props.nodes.map((nd, i) => {
        if (aVis[i] <= 0 || born[i] > t) return null;
        const kind = (nd.kind ?? '').toLowerCase();
        const tone = v === 'decision' && !tr.kids[i].length ? TONE[kind] : undefined;
        const L = lit[i];
        const H = hits[i];
        let col = tone ? mix(C.ink3, tone, 0.75) : C.ink3;
        col = mix(col, C.signal, L);
        if (H > 0) col = mix(col, C.ok, H);
        if (H < 0) col = mix(col, C.crit, -H);
        const g = glyphOf(i);
        const rv = revealStyle(t - born[i], fps, 'label', dirOf([nd.label]));
        const glowK = Math.max(L * 0.7, Math.abs(H) * 0.8) + flash[i] * 1.2 + (tone ? 0.25 : 0);
        return (
          <React.Fragment key={nd.id}>
            <Chip
              id={`${ctx.id}:${nd.id}`}
              text={nd.label}
              x={pos[i].x}
              y={pos[i].y}
              w={S[i].w}
              h={S[i].h}
              fs={geo.fs}
              color={col}
              glowK={glowK}
              fill={0.14 * Math.max(L, Math.abs(H)) + (tone ? 0.06 : 0)}
              fx={ctx.fx}
              overflow={geo.overflow}
              radius={v === 'fs' ? Math.round(S[i].h * 0.2) : undefined}
              icon={g ? <GlyphIcon g={g} color={tone ?? (L > 0.3 ? C.signal : v === 'fs' ? C.violet : C.ink2)} /> : undefined}
              dir={dir}
              reveal={{...rv.style, opacity: (typeof rv.style.opacity === 'number' ? rv.style.opacity : 1) * aVis[i]}}
            />
            {showKind && nd.kind ? (
              <div
                style={{
                  position: 'absolute',
                  left: pos[i].x - S[i].w / 2,
                  width: S[i].w,
                  top: pos[i].y - S[i].h / 2 - geo.kindH,
                  height: geo.kindH,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: geo.fk,
                  color: L > 0.3 ? C.signal : C.ink3,
                  textShadow: halo,
                  whiteSpace: 'nowrap',
                  ...rv.style,
                  opacity: (typeof rv.style.opacity === 'number' ? rv.style.opacity : 1) * aVis[i],
                }}
              >
                <MixedText id={`${ctx.id}:${nd.id}:kind`} text={nd.kind} size={geo.fk} role="code" weight={FONT.mono.weight} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const TreeView: DcComponent<Props> = {name: 'TreeView', Component: TreeViewView, text: true, slot: 'full'};
