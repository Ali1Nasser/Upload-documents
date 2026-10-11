// GitGraph (catalog: Structure & flow). "Git is a branching light-graph" (04 §6 Python · Tests, Git, review).
//  - One lane per branch (first branch = trunk, ink2; other branches = violet scope colour unless `color` is given). Time runs in
//    reading order: right -> left when any commit message is Arabic, else left -> right. Branch names sit at the lane start.
//  - Layer anchor: commits arrive one after another (3 film frames apart); each edge path-draws from its parent and the node pops
//    (RV1: first ink on its own frame). A commit on a new lane forks from its parent with an S-curve.
//  - commit(branch, msg?): a new node lands at the branch tip on its anchor (HEAD moves to that branch). merge(from, into): a merge
//    node on `into` with two parents; the incoming curve draws in and the node flashes ok. checkout(branch): HEAD travels (camera
//    ease, morph length) to the branch tip; a branch that has no commit yet forks from the HEAD commit.
//  - The HEAD branch carries the signal (04 §1.1: the thing being explained now). HEAD is a Latin tag above its commit.
//  - Messages: on plates, alternating above / below their node (same-side neighbours are two columns apart); when the lanes are
//    too tight, only the newest message is shown as a callout. Every label auto-fits (28 px floor; overflow is reported).
import React from 'react';
import {C, SIZE} from '../../tokens';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, GlowPath, Lbl, Pool, actionsOf, cPath, f24, lastAt, layerStyle, lerp, placeLabel, prog, rtlOf} from '../_struct-b/kit';

type Ctx = DcProps<Props>['ctx'];
type GNode = {id: string; lane: number; msg?: string; parents: string[]; born: number; col: number; merge: boolean};
type HeadEv = {t: number; lane: number};

/** Structural timeline: lanes, nodes (initial + action commits / merges) and the HEAD history. Pure (node-testable). */
export const gitTimeline = (p: Props, ctx: Ctx) => {
  const lanes = p.branches.map((b) => b.name);
  const laneOf = (name: string) => {
    let k = lanes.indexOf(name);
    if (k < 0 && lanes.length < 8) (lanes.push(name), (k = lanes.length - 1));
    return Math.max(0, k);
  };
  const nodes: GNode[] = [];
  const byId = new Map<string, GNode>();
  const add = (n: GNode) => (nodes.push(n), byId.set(n.id, n));
  p.commits.forEach((c, i) => add({id: c.id, lane: laneOf(c.branch), msg: c.msg, parents: c.parents.filter((x) => x !== c.id), born: ctx.at + f24(3 * i, ctx.fps), col: i, merge: c.parents.length > 1}));
  const tipAt = (lane: number, t: number) => {
    let tip: GNode | undefined;
    for (const n of nodes) if (n.lane === lane && n.born <= t) tip = n;
    return tip;
  };
  const heads: HeadEv[] = [{t: -1e9, lane: nodes.length ? nodes[nodes.length - 1].lane : 0}];
  const headLane = (t: number) => heads[lastAt(heads, t)].lane;
  const headNode = (t: number) => tipAt(headLane(t), t) ?? nodes.filter((n) => n.born <= t).slice(-1)[0];
  let col = nodes.length;
  for (const a of actionsOf(ctx, 'checkout', 'commit', 'merge')) {
    if (a.name === 'checkout') heads.push({t: a.at, lane: laneOf(a.props.branch as string)});
    else if (a.name === 'commit') {
      const lane = laneOf(a.props.branch as string);
      const parent = tipAt(lane, a.at - 1) ?? headNode(a.at - 1);
      add({id: `a${a.li}`, lane, msg: a.props.msg as string | undefined, parents: parent ? [parent.id] : [], born: a.at, col: col++, merge: false});
      heads.push({t: a.at, lane});
    } else {
      const into = laneOf(a.props.into as string);
      const from = laneOf(a.props.from as string);
      const pa = [tipAt(into, a.at - 1), tipAt(from, a.at - 1)].filter((x): x is GNode => !!x).map((x) => x.id);
      add({id: `m${a.li}`, lane: into, parents: pa, born: a.at, col: col++, merge: true});
      heads.push({t: a.at, lane: into});
    }
  }
  return {lanes, nodes, byId, heads, tipAt, headLane, headNode};
};

export const GitGraphView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const tl = gitTimeline(props, ctx);
  const rtl = rtlOf(tl.nodes.map((n) => n.msg));
  const nl = tl.lanes.length;
  const laneColor = (k: number) => {
    const tok = props.branches[k]?.color;
    return tok ? C[tok] : k === 0 ? C.ink2 : C.violet;
  };
  // layout: branch chips at the lane start, columns after them in reading order
  const chipW = Math.min(300, Math.max(180, w * 0.15));
  const pad = 36;
  const cols = Math.max(1, tl.nodes.length);
  const region = w - chipW - 2 * pad;
  const colW = Math.min(220, region / cols);
  const startX = rtl ? w - chipW - pad : chipW + pad;
  const xOf = (c: number) => (rtl ? startX - (c + 0.5) * colW : startX + (c + 0.5) * colW);
  const bandH = h / nl;
  const yOf = (k: number) => (k + 0.5) * bandH;
  const lblH = Math.round(SIZE.label * 1.7);
  const roomy = bandH >= 2 * (lblH + 34) + 28 && 2 * colW - 40 >= 150;
  const k = 1 + ctx.mod.glow;
  const arrive = presetFrames('arrive', ctx.fps);
  const morph = presetFrames('morph', ctx.fps, true);
  const born = tl.nodes.filter((n) => n.born <= t);
  // HEAD position: travels between commits (camera ease, >= morph long)
  const hk = lastAt(tl.heads, t);
  const headNow = tl.headNode(t);
  const headPrev = hk > 0 ? tl.headNode(tl.heads[hk].t - 1) : headNow;
  const hq = hk > 0 ? prog(t, tl.heads[hk].t, morph, ease.camera) : 1;
  const hp = headNow && headPrev ? {x: lerp(xOf(headPrev.col), xOf(headNow.col), hq), y: lerp(yOf(headPrev.lane), yOf(headNow.lane), hq)} : null;
  const headLane = tl.headLane(t);
  const headShown = born.length ? prog(t, born[0].born, presetFrames('label', ctx.fps)) : 0;
  const newest = born.length ? born[born.length - 1] : null;
  const newestMsg = [...born].reverse().find((n) => n.msg);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {newest ? <Pool x={xOf(newest.col)} y={yOf(newest.lane)} r={Math.max(120, colW * 1.2)} color={newest.merge ? C.ok : C.signal} a={0.2 * (1 - 0.5 * prog(t, newest.born + arrive, morph))} /> : null}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* lane guides from the lane's first commit to its tip */}
        {tl.lanes.map((_, li) => {
          const ns = born.filter((n) => n.lane === li);
          if (!ns.length) return null;
          const a = xOf(ns[0].col);
          const b = xOf(ns[ns.length - 1].col);
          return <line key={li} x1={a} y1={yOf(li)} x2={b} y2={yOf(li)} stroke={li === headLane ? C.signal : laneColor(li)} strokeOpacity={0.14} strokeWidth={10} strokeLinecap="round" />;
        })}
        {/* edges: parent -> child, drawn on the child's anchor */}
        {born.map((n) =>
          n.parents.map((pid, j) => {
            const pn = tl.byId.get(pid);
            if (!pn) return null;
            const a = {x: xOf(pn.col), y: yOf(pn.lane)};
            const b = {x: xOf(n.col), y: yOf(n.lane)};
            const dx = (b.x - a.x) * 0.55;
            const d = pn.lane === n.lane ? `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}` : cPath(a, {x: a.x + dx, y: a.y}, {x: b.x - dx, y: b.y}, b);
            const lane = j === 0 ? n.lane : pn.lane;
            const col = n.merge && j > 0 ? C.ok : lane === headLane ? C.signal : laneColor(lane);
            return <GlowPath key={`${n.id}-${pid}`} d={d} color={col} width={n.merge && j > 0 ? 4 : 3.5} fx={ctx.fx} k={(lane === headLane ? 0.9 : 0.45) * k} draw={prog(t, n.born, arrive, ease.arrive)} />;
          }),
        )}
        {/* commit nodes */}
        {born.map((n) => {
          const pop = prog(t, n.born, presetFrames('impact', ctx.fps, true), ease.impact);
          const x = xOf(n.col);
          const y = yOf(n.lane);
          const col = n.lane === headLane ? C.signal : laneColor(n.lane);
          const flash = n.merge ? 1 - prog(t, n.born + arrive, morph) : 0;
          return (
            <g key={n.id} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.5 + 0.5 * pop).toFixed(3)})`} opacity={Math.min(1, pop * 1.5)}>
              {n.merge ? <Dot x={0} y={0} r={19} color={C.ok} fx={ctx.fx} k={0.5 + flash} ring={2} /> : null}
              <Dot x={0} y={0} r={n.merge ? 11 : 13} color={n.merge ? C.ok : col} fill={n === newest ? col : undefined} fx={ctx.fx} k={(n === newest ? 1 : 0.45) * k} ring={3} />
            </g>
          );
        })}
        {/* HEAD pointer */}
        {hp ? (
          <g opacity={headShown}>
            <circle cx={hp.x} cy={hp.y} r={24} fill="none" stroke={C.signal} strokeWidth={2.5} strokeOpacity={0.85} />
            <line x1={hp.x} y1={hp.y - 26} x2={hp.x} y2={hp.y - 46} stroke={C.signal} strokeWidth={2.5} />
          </g>
        ) : null}
      </svg>
      {/* branch chips at the lane start */}
      {tl.lanes.map((name, li) => {
        const first = tl.nodes.find((n) => n.lane === li);
        const at = first ? Math.min(first.born, li === 0 ? ctx.at : first.born) : ctx.at;
        if (t < at) return null;
        const op = prog(t, at, presetFrames('label', ctx.fps));
        const head = li === headLane;
        return (
          <Lbl
            key={`b${li}`}
            id={`${ctx.id}:b${li}`}
            text={name}
            x={rtl ? w - 8 : 8}
            y={yOf(li)}
            align={rtl ? 'right' : 'left'}
            maxW={chipW - 24}
            color={head ? C.signal : laneColor(li)}
            plate
            accent={head ? C.signal : laneColor(li)}
            fx={ctx.fx}
            opacity={op}
            role="code"
          />
        );
      })}
      {hp ? <Lbl id={`${ctx.id}:head`} text="HEAD" x={hp.x} y={hp.y - 50} valign="bottom" maxW={Math.max(150, colW * 2)} size={SIZE.labelMin} color={C.signal} plate accent={C.signal} fx={ctx.fx} opacity={headShown} role="code" /> : null}
      {/* commit messages */}
      {born.map((n, i) => {
        if (!n.msg) return null;
        if (!roomy && n !== newestMsg) return null;
        const lp = prog(t, n.born, presetFrames('label', ctx.fps));
        const x = xOf(n.col);
        const y = yOf(n.lane);
        const up = roomy ? n.col % 2 === 1 : n.lane > 0 || nl === 1;
        const pl = placeLabel(x, roomy ? 2 * colW - 40 : Math.min(w * 0.4, 4 * colW), w);
        const off = up ? (hp && Math.abs(hp.x - x) < 4 && n.lane === headLane ? 64 + lblH : 30) : 30;
        return (
          <Lbl
            key={`m${i}`}
            id={`${ctx.id}:m${n.id}`}
            text={n.msg}
            x={pl.x}
            y={up ? y - off : y + off}
            align={pl.align}
            valign={up ? 'bottom' : 'top'}
            maxW={pl.maxW}
            color={n === newestMsg ? C.ink : C.ink2}
            plate={n === newestMsg}
            accent={n.merge ? C.ok : C.signal}
            fx={ctx.fx}
            opacity={lp}
            style={{marginTop: (1 - lp) * 6}}
          />
        );
      })}
    </div>
  );
};

export const GitGraph: DcComponent<Props> = {name: 'GitGraph', Component: GitGraphView, text: true, slot: 'center'};
