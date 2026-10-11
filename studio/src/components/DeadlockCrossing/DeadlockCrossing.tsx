// DeadlockCrossing (catalog: Domain specials; 04 section 6 "deadlock = two trains locked at a crossing"). Transactions are
// capsule trains, resources are crossing blocks, laid out on one ring (txn, resource, txn, resource ...) so a wait-for
// cycle reads as a closed loop. A hold is a solid signal tether from the block to its holder (padlock on the block);
// a wait is a dashed warn arrow from the train to the block it wants, marching (linear motion only for marching flows).
// Once every edge is drawn, the edges on a wait-for cycle turn crit and a DEADLOCK chip lights at the crossing.
// `resolve {victim}` (anchored to the word that names it): the victim train turns crit, its tethers retract and it backs
// off into depth (ROLLBACK); every train that waited on a released block is granted it (the wait becomes an ok hold) and
// glows ok. All component motion uses revealProgress (RV1: first visible step on the anchor frame). No digits are shown.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, Chip, FitLabel, GlowLine, Stage, Svg, actsOf, arc, f24, glowBox, march, partial, prog, progN, rectExit, rim, stag, type Pt} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Node = {kind: 'txn' | 'res'; id: string; label: string; c: Pt; hw: number; hh: number};

/** Edges of the wait-for cycle(s): wait (A -> R) and hold (R -> B) where B can reach A through waits. */
export const cycleEdges = (p: Props): {waits: Set<number>; holds: Set<number>} => {
  const holder = (r: string) => p.holds.filter((h) => h.res === r).map((h) => h.txn);
  const next = (a: string) => p.waits.filter((w) => w.txn === a).flatMap((w) => holder(w.res)).filter((b) => b !== a);
  const reach = (from: string, to: string) => {
    const seen = new Set<string>([from]);
    const q = [from];
    while (q.length) {
      const x = q.shift() as string;
      if (x === to) return true;
      for (const y of next(x)) if (!seen.has(y)) (seen.add(y), q.push(y));
    }
    return false;
  };
  const waits = new Set<number>();
  const holds = new Set<number>();
  p.waits.forEach((w, wi) =>
    p.holds.forEach((h, hi) => {
      if (h.res === w.res && h.txn !== w.txn && reach(h.txn, w.txn)) (waits.add(wi), holds.add(hi));
    }),
  );
  return {waits, holds};
};

const Padlock: React.FC<{x: number; y: number; s: number; color: string; open: number}> = ({x, y, s, color, open}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
    <path d={`M${-s * 0.32} ${-s * 0.05} V${-s * 0.32 - open * s * 0.18} a${s * 0.32} ${s * 0.32} 0 0 1 ${s * 0.64} 0 V${-s * 0.05}`} fill="none" stroke={color} strokeWidth={s * 0.11} strokeLinecap="round" />
    <rect x={-s * 0.45} y={-s * 0.08} width={s * 0.9} height={s * 0.62} rx={s * 0.1} fill={color} />
  </g>
);

export const DeadlockCrossingView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  // ---------- layout: one ring, interleaved ----------
  const seq: {kind: 'txn' | 'res'; i: number}[] = [];
  for (let i = 0; i < Math.max(props.txns.length, props.resources.length); i++) {
    if (i < props.txns.length) seq.push({kind: 'txn', i});
    if (i < props.resources.length) seq.push({kind: 'res', i});
  }
  const rx = W * 0.33;
  const ry = H * 0.3;
  const cx0 = W / 2;
  const cy0 = H * 0.5;
  const tw = Math.min(W * 0.2, 360);
  const th = Math.max(SIZE.label * 2.4, Math.min(H * 0.13, 120));
  const rw = Math.min(W * 0.17, 300);
  const rh = Math.max(SIZE.label * 3, Math.min(H * 0.15, 140));
  const nodes: Node[] = seq.map((s, k) => {
    const ang = -Math.PI / 2 - (2 * Math.PI * k) / seq.length; // counter-clockwise from the top: reads right-to-left on the upper arc
    const c = {x: cx0 + rx * Math.cos(ang), y: cy0 + ry * Math.sin(ang)};
    const src = s.kind === 'txn' ? props.txns[s.i] : props.resources[s.i];
    return s.kind === 'txn' ? {kind: 'txn', id: src.id, label: src.label, c, hw: tw / 2, hh: th / 2} : {kind: 'res', id: src.id, label: src.label, c, hw: rw / 2, hh: rh / 2};
  });
  const byId = (kind: 'txn' | 'res', id: string) => nodes.find((n) => n.kind === kind && n.id === id);
  const order = (n: Node) => nodes.indexOf(n);

  // ---------- timeline ----------
  const arrive = presetFrames('arrive', fps);
  const morph = presetFrames('morph', fps, true);
  const tHold = (k: number) => ctx.at + f24(10 + 4 * k, fps);
  const tWait = (k: number) => ctx.at + f24(10 + 4 * props.holds.length + 5 * k, fps);
  const lastEdge = props.waits.length ? tWait(props.waits.length - 1) : props.holds.length ? tHold(props.holds.length - 1) : ctx.at;
  const cyc = cycleEdges(props);
  const hasCycle = cyc.waits.size > 0;
  const tCycle = lastEdge + arrive + f24(4, fps);
  const qCycle = hasCycle ? progN(ctx, tCycle, presetFrames('label', fps)) : 0;
  const res = actsOf(ctx, 'resolve')[0];
  const victim = res ? (res.props.victim as string) : null;
  const tRes = res ? res.at : Infinity;
  const qRes = res ? progN(ctx, tRes, morph, ease.camera) : 0;
  const released = new Set(victim ? props.holds.filter((h) => h.txn === victim).map((h) => h.res) : []);
  const granted = (txn: string, r: string) => !!victim && txn !== victim && released.has(r);
  const winners = new Set(victim ? props.waits.filter((w) => granted(w.txn, w.res)).map((w) => w.txn) : []);
  const tGrant = tRes + morph - 1;
  const qGrant = res ? progN(ctx, tGrant, presetFrames('label', fps)) : 0;

  const edgePts = (a: Node, b: Node, bow: number) => {
    const raw = arc(a.c, b.c, bow, 24);
    const s = rectExit(a.c, a.hw + 8, a.hh + 8, raw[1].x - a.c.x, raw[1].y - a.c.y);
    const e = rectExit(b.c, b.hw + 12, b.hh + 12, raw[raw.length - 2].x - b.c.x, raw[raw.length - 2].y - b.c.y);
    return arc(s, e, bow, 24);
  };
  const lw = Math.max(3, Math.round(SIZE.label * 0.12));
  const dashL = lw * 4;
  const ph = march(ctx, ctx.at, 1.2) * dashL * 2;

  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        {/* rails: a faint ring the trains run on */}
        <ellipse cx={cx0} cy={cy0} rx={rx} ry={ry} fill="none" stroke={C.grid} strokeWidth={2} strokeDasharray="2 10" opacity={prog(ctx, ctx.at, 'label')} />
        {props.holds.map((h, k) => {
          const r = byId('res', h.res);
          const x = byId('txn', h.txn);
          if (!r || !x) return null;
          const q = prog(ctx, tHold(k), 'arrive');
          const back = h.txn === victim ? 1 - qRes : 1;
          const inCyc = cyc.holds.has(k);
          const col = inCyc && qCycle > 0 && qRes < 1 ? (qCycle > 0.5 ? C.crit : C.signal) : C.signal;
          return <GlowLine key={`h${k}`} pts={partial(edgePts(r, x, order(r) < order(x) ? 0.08 : -0.08), q * back)} color={col} w={lw} fx={fx} k={0.6 + 0.6 * qCycle * (inCyc ? 1 : 0) + ctx.mod.glow} opacity={q > 0 ? 1 : 0} />;
        })}
        {props.waits.map((w, k) => {
          const x = byId('txn', w.txn);
          const r = byId('res', w.res);
          if (!x || !r) return null;
          const q = prog(ctx, tWait(k), 'arrive');
          const inCyc = cyc.waits.has(k);
          const grant = granted(w.txn, w.res);
          const gone = w.txn === victim ? qRes : 0;
          // a granted wait turns into a solid ok hold once the victim has released the block
          const col = grant && qGrant > 0 ? C.ok : inCyc && qCycle > 0.5 ? C.crit : C.warn;
          const solid = grant && qGrant > 0;
          return (
            <GlowLine
              key={`w${k}`}
              pts={partial(edgePts(x, r, order(x) < order(r) ? 0.18 : -0.18), q)}
              color={col}
              w={lw}
              fx={fx}
              k={0.5 + (inCyc ? 0.7 * qCycle : 0) + ctx.mod.glow}
              dash={solid ? undefined : `${dashL} ${dashL}`}
              dashOffset={solid ? undefined : -ph}
              opacity={(q > 0 ? 1 : 0) * (1 - gone)}
              arrow
            />
          );
        })}
      </Svg>
      {nodes.map((n, k) => {
        const ent = prog(ctx, ctx.at + stag(k, fps, 3), 'label');
        if (n.kind === 'res') {
          return (
            <div key={`r${n.id}`} style={{position: 'absolute', left: n.c.x - n.hw, top: n.c.y - n.hh, width: n.hw * 2, height: n.hh * 2, opacity: ent, transform: `translateY(${((1 - ent) * 6).toFixed(2)}px)`}}>
              <div style={{position: 'absolute', inset: 0, borderRadius: 16, border: `2px solid ${C.ink3}`, background: `linear-gradient(135deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.18)}, 0 16px 40px ${C.void}${hex(0.6)}`, overflow: 'hidden'}}>
                {/* the crossing: two rails meeting under the block */}
                <svg width={n.hw * 2} height={n.hh * 2} style={{position: 'absolute', left: 0, top: 0}}>
                  <path d={`M0 0 L${n.hw * 2} ${n.hh * 2} M${n.hw * 2} 0 L0 ${n.hh * 2}`} stroke={C.grid} strokeWidth={6} />
                </svg>
              </div>
              <At x={n.hw} y={n.hh}>
                <FitLabel id={`${ctx.id}:res:${n.id}`} text={n.label} maxW={n.hw * 2 - 28} color={C.ink} weight={FONT.label.strong} />
              </At>
            </div>
          );
        }
        const isVictim = n.id === victim;
        const isWinner = winners.has(n.id);
        const tone = isVictim && qRes > 0 ? C.crit : isWinner && qGrant > 0 ? C.ok : hasCycle && qCycle > 0.5 && qRes === 0 ? C.warn : C.signal;
        const out = isVictim ? qRes : 0;
        // back off into depth: away from the crossing centre, smaller and dimmer
        const dx = (n.c.x - cx0) * 0.18 * out;
        const dy = (n.c.y - cy0) * 0.18 * out;
        const nudge = isWinner ? interpolate(qGrant, [0, 1], [0, 1], clamp) : 0;
        return (
          <div
            key={`t${n.id}`}
            style={{
              position: 'absolute',
              left: n.c.x - n.hw,
              top: n.c.y - n.hh,
              width: n.hw * 2,
              height: n.hh * 2,
              opacity: ent * (1 - 0.6 * out),
              transform: `translate(${(dx + (cx0 - n.c.x) * 0.04 * nudge).toFixed(2)}px, ${(dy + (1 - ent) * 6 + (cy0 - n.c.y) * 0.04 * nudge).toFixed(2)}px) scale(${(1 - 0.12 * out).toFixed(4)})`,
              borderRadius: n.hh,
              border: `2px solid ${tone}`,
              background: `linear-gradient(180deg, ${C.panel} 0%, ${C.ground} 100%)`,
              boxShadow: `${rim(0.22)}, ${glowBox(tone, fx, 0.55 + ctx.mod.glow)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* headlights */}
            <div style={{position: 'absolute', right: n.hh * 0.45, top: '50%', width: n.hh * 0.22, height: n.hh * 0.22, marginTop: -n.hh * 0.11, borderRadius: '50%', background: tone, boxShadow: glowBox(tone, fx, 0.5)}} />
            <div style={{position: 'absolute', left: n.hh * 0.45, top: '50%', width: n.hh * 0.22, height: n.hh * 0.22, marginTop: -n.hh * 0.11, borderRadius: '50%', background: `${tone}${hex(0.45)}`}} />
            <FitLabel id={`${ctx.id}:txn:${n.id}`} text={n.label} maxW={n.hw * 2 - n.hh * 1.6} color={C.ink} weight={FONT.label.strong} />
          </div>
        );
      })}
      <Svg w={W} h={H}>
        {/* padlocks on held blocks */}
        {props.resources.map((rr, i) => {
          const r = byId('res', rr.id) as Node;
          const heldK = props.holds.findIndex((h) => h.res === rr.id);
          if (heldK < 0) return null;
          const q = prog(ctx, tHold(heldK), 'label');
          const rel = released.has(rr.id) ? qRes : 0;
          const regrab = props.waits.some((w) => granted(w.txn, rr.id)) ? qGrant : 0;
          const col = regrab > 0 ? C.ok : rel > 0 ? C.ink3 : C.signal;
          return <g key={`l${i}`} opacity={q}><Padlock x={r.c.x + r.hw * 0.62} y={r.c.y - r.hh * 0.62} s={SIZE.label * 0.9} color={col} open={Math.max(0, rel - regrab)} /></g>;
        })}
      </Svg>
      {hasCycle ? (
        <At x={cx0} y={cy0} style={{opacity: qCycle * (1 - qRes)}}>
          <Chip id={`${ctx.id}:deadlock`} text="DEADLOCK" color={C.crit} size={SIZE.label} border={C.crit} style={{boxShadow: glowBox(C.crit, fx, 0.5)}} />
        </At>
      ) : null}
      {victim
        ? (() => {
            const v = nodes.find((n) => n.kind === 'txn' && n.id === victim);
            if (!v) return null;
            return (
              <At x={v.c.x + (v.c.x - cx0) * 0.18 * qRes} y={v.c.y + (v.c.y - cy0) * 0.18 * qRes - (v.c.y >= cy0 ? 1 : -1) * (v.hh + SIZE.labelMin * 1.4)} style={{opacity: qRes}}>
                <Chip id={`${ctx.id}:rollback`} text="ROLLBACK" color={C.crit} size={SIZE.labelMin} border={C.crit} />
              </At>
            );
          })()
        : null}
    </Stage>
  );
};

export const DeadlockCrossing: DcComponent<Props> = {name: 'DeadlockCrossing', Component: DeadlockCrossingView, text: true, slot: 'full'};
