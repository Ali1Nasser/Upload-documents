// TestGate (catalog: Domain specials). 04 §6 "Tests, Git, review": the test gate stamps pass/fail; a red test blocks the merge,
// the fix turns it green. RTL reading order: the test rows stand on the right (start), the merge gate on the left. A row =
// status lamp + test name (one whole label; Latin / code names are mono LTR isolates) + a Latin state tag.
// States: pending (hollow ink3 lamp, no tag), running (signal arc, QUEUED/RUN), pass (ok), fail (crit), skip (ink2 dash).
// The frozen `status` of every test is its OUTCOME. Without a `run` action the outcomes are simply shown. With one:
//   run          -> every test starts running on the anchor frame, staggered over the action word, and resolves to its
//                   `status` (a second run re-resolves all: red test -> fix -> green);
//   fail {index} -> that test flips to fail on the anchor frame (stamp flash + 2 px shake), whatever it was.
// The merge gate follows the statuses: CI (closed, ink2) while anything runs or waits, BLOCKED (crit, shut, shake) while any
// test fails, MERGE (leaves slide apart, ok) when every test passed or was skipped. DOM + SVG only, same code at every tier.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {FitText, Place, Tag, acrylic, actsOf, clamp, ff, flashAt, layerStyle, mix, prog, stateAt, type Ev} from '../_dom-a/kit';

type St = 'pending' | 'running' | 'pass' | 'fail' | 'skip';
type Gate = 'ci' | 'blocked' | 'open';
const TONE: Record<St, string> = {pending: C.ink3, running: C.signal, pass: C.ok, fail: C.crit, skip: C.ink2};
const TAG: Record<St, string> = {pending: 'QUEUED', running: 'RUN', pass: 'PASS', fail: 'FAIL', skip: 'SKIP'};
const GATE_TONE: Record<Gate, string> = {ci: C.ink2, blocked: C.crit, open: C.ok};
const GATE_TAG: Record<Gate, string> = {ci: 'CI', blocked: 'BLOCKED', open: 'MERGE'};

/** Per-test status timelines + the gate timeline, all from the layer's actions (pure, whole frames). */
export const testTimeline = (p: Props, ctx: LayerCtx) => {
  const n = p.tests.length;
  const runs = actsOf(ctx, 'run');
  const fails = actsOf(ctx, 'fail');
  const ev: Ev<St>[][] = p.tests.map((t) => [{t: -1e9, s: runs.length ? 'pending' : t.status}]);
  const push = (i: number, t: number, s: St) => ev[i].push({t, s});
  const all = [...runs.map((a) => ({a, k: 'run' as const})), ...fails.map((a) => ({a, k: 'fail' as const}))].sort((x, y) => x.a.at - y.a.at || x.a.li - y.a.li);
  for (const {a, k} of all) {
    if (k === 'fail') {
      const i = Math.min(n - 1, a.props.index as number);
      push(i, a.at, 'fail');
    } else {
      const span = Math.max(ff(12, ctx.fps), a.end - a.at);
      const step = Math.max(1, Math.min(ff(5, ctx.fps), Math.floor(span / n)));
      p.tests.forEach((t, i) => {
        const t0 = a.at + i * step;
        push(i, t0, 'running');
        push(i, t0 + ff(7, ctx.fps), t.status === 'pending' ? 'pending' : t.status);
      });
    }
  }
  ev.forEach((e) => e.sort((x, y) => x.t - y.t));
  const at = (i: number, t: number): St => {
    let s = ev[i][0].s;
    for (const e of ev[i]) if (e.t <= t) s = e.s;
    return s;
  };
  const times = [...new Set(ev.flatMap((e) => e.map((x) => x.t)))].sort((x, y) => x - y);
  const gate: Ev<Gate>[] = [];
  for (const T of times) {
    const sts = p.tests.map((_, i) => at(i, T));
    const g: Gate = sts.some((s) => s === 'fail') ? 'blocked' : sts.every((s) => s === 'pass' || s === 'skip') && sts.some((s) => s === 'pass') ? 'open' : 'ci';
    if (!gate.length || gate[gate.length - 1].s !== g) gate.push({t: T, s: g});
  }
  return {ev, gate: gate.length ? gate : [{t: -1e9, s: 'ci' as Gate}]};
};

const Lamp: React.FC<{s: St; r: number; ctx: LayerCtx; t0: number; q: number}> = ({s, r, ctx, q}) => {
  const tone = TONE[s];
  const d = 2 * r;
  const spin = ((ctx.frame * 360) / ff(18, ctx.fps)) % 360;
  return (
    <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{overflow: 'visible'}}>
      {s === 'pending' ? null : <circle cx={r} cy={r} r={r - 3} fill="none" stroke={tone} strokeOpacity={0.2} strokeWidth={3 + ctx.fx.glowInner * 1.2} />}
      {s === 'running' ? (
        <g transform={`rotate(${spin.toFixed(1)} ${r} ${r})`}>
          <circle cx={r} cy={r} r={r - 3} fill="none" stroke={`${tone}${hex(0.25)}`} strokeWidth={3} />
          <path d={`M ${r} 3 A ${r - 3} ${r - 3} 0 0 1 ${d - 3} ${r}`} fill="none" stroke={tone} strokeWidth={4} strokeLinecap="round" />
        </g>
      ) : s === 'pending' ? (
        <circle cx={r} cy={r} r={r - 3} fill="none" stroke={tone} strokeWidth={3} strokeDasharray="3 6" />
      ) : (
        <>
          <circle cx={r} cy={r} r={r - 2} fill={`${tone}${hex(0.18 + 0.2 * q)}`} stroke={tone} strokeWidth={3} />
          {s === 'pass' ? <path d={`M ${r * 0.5} ${r * 1.02} L ${r * 0.9} ${r * 1.4} L ${r * 1.5} ${r * 0.66}`} fill="none" stroke={tone} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
          {s === 'fail' ? <path d={`M ${r * 0.62} ${r * 0.62} L ${r * 1.38} ${r * 1.38} M ${r * 1.38} ${r * 0.62} L ${r * 0.62} ${r * 1.38}`} fill="none" stroke={tone} strokeWidth={4} strokeLinecap="round" /> : null}
          {s === 'skip' ? <path d={`M ${r * 0.55} ${r} H ${r * 1.45}`} fill="none" stroke={tone} strokeWidth={4} strokeLinecap="round" /> : null}
        </>
      )}
    </svg>
  );
};

export const TestGateView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const n = props.tests.length;
  const {ev, gate} = testTimeline(props, ctx);
  const rowH = Math.round(Math.min(92, box.h / n));
  const listH = rowH * n;
  const listW = Math.round(box.w * 0.62);
  const listX = box.x + box.w - listW; // RTL start
  const top = box.y + (box.h - listH) / 2;
  const lamp = Math.round(Math.min(rowH * 0.3, 20));
  const tagW = 150;
  const nameW = listW - 2 * lamp - tagW - 70;
  const gw = Math.round(Math.min(box.w * 0.22, 380));
  const gx = box.x + (box.w - listW - gw) / 2 + gw / 2 - 10; // gate centre, left of the list
  const gh = Math.round(Math.min(box.h * 0.62, 560));
  const gy = box.y + box.h / 2 - 30;
  const rtl = props.tests.some((x) => isArabic(x.name));
  const gs = stateAt(gate, ctx, 'arrive');
  const gTone = mix(GATE_TONE[gs.prev], GATE_TONE[gs.cur], gs.q);
  const openQ = (g: Gate) => (g === 'open' ? 1 : 0);
  const open = openQ(gs.prev) + (openQ(gs.cur) - openQ(gs.prev)) * gs.q;
  const gFl = gs.k > 0 ? flashAt(ctx, gs.t) : 0;
  const gShake = gs.cur === 'blocked' && gs.k > 0 ? interpolate(t - gs.t, [0, ff(2, ctx.fps), ff(4, ctx.fps), ff(6, ctx.fps)], [0, 3, -3, 0], clamp) : 0;
  const entGate = prog(ctx, ctx.at, 'arrive');
  const glowK = 1 + ctx.mod.glow;
  const leaf = (gw - 24) / 2;
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {/* feed rail from the rows to the gate */}
      <div style={{position: 'absolute', left: gx + gw / 2, top: gy - 1, width: listX - gx - gw / 2, height: 2, background: `linear-gradient(270deg, ${C.ink3}${hex(0.5)}, ${gTone}${hex(0.7)})`, opacity: entGate}} />
      {props.tests.map((tst, i) => {
        const born = ctx.at + ff(2 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'label');
        const st = stateAt(ev[i], ctx, 'arrive');
        const tone = mix(TONE[st.prev], TONE[st.cur], st.q);
        const fl = st.k > 0 && (st.cur === 'fail' || st.cur === 'pass') ? flashAt(ctx, st.t) : 0;
        const shake = st.cur === 'fail' && st.k > 0 ? interpolate(t - st.t, [0, ff(2, ctx.fps), ff(4, ctx.fps), ff(6, ctx.fps)], [0, 2, -2, 0], clamp) : 0;
        const y = top + i * rowH;
        const on = (st.cur === 'pending' ? 0.1 : st.cur === 'running' ? 0.5 : 0.35) + 0.9 * fl;
        const tagText = st.cur === 'pending' && ev[i].length === 1 ? '' : TAG[st.cur];
        return (
          <div key={i} style={{position: 'absolute', left: listX, top: y + 5, width: listW, height: rowH - 10, opacity: ent, transform: `translate(${shake.toFixed(2)}px, ${((1 - ent) * 6).toFixed(1)}px)`, display: 'flex', alignItems: 'center', gap: 22, padding: '0 28px', ...acrylic(tone, ctx.fx, Math.min(1.5, on), 12)}}>
            <Lamp s={st.cur} r={lamp} ctx={ctx} t0={st.t} q={st.q} />
            <div style={{width: nameW, display: 'flex', alignItems: 'center', justifyContent: 'flex-start'}}>
              <FitText id={`${ctx.id}:t${i}`} text={tst.name} size={SIZE.label} maxW={nameW} color={st.cur === 'pending' ? C.ink2 : C.ink} role={isArabic(tst.name) ? 'sentence' : 'code'} weight={isArabic(tst.name) ? FONT.label.strong : undefined} />
            </div>
            <div style={{width: tagW, display: 'flex', justifyContent: 'flex-end', marginInlineStart: 'auto'}}>
              {tagText ? <Tag id={`${ctx.id}:s${i}`} text={tagText} color={tone} size={SIZE.secondaryMin + 8} fx={ctx.fx} on={st.cur === 'pending' ? 0 : 0.5 + 0.5 * st.q} /> : null}
            </div>
          </div>
        );
      })}
      {/* merge gate: arch + two leaves that slide apart */}
      <div style={{position: 'absolute', left: gx - gw / 2 + gShake, top: gy - gh / 2, width: gw, height: gh, opacity: entGate, ...acrylic(gTone, ctx.fx, Math.min(1.6, (0.4 + 0.5 * open + 0.9 * gFl) * glowK), 0), borderRadius: `${gw / 2}px ${gw / 2}px 12px 12px`, borderWidth: 3, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 55%, ${gTone}${hex(0.1 + 0.3 * open + 0.2 * gFl)} 0%, transparent 100%)`}} />
        {[0, 1].map((side) => (
          <div key={side} style={{position: 'absolute', top: 12, bottom: 12, width: leaf, [side === 0 ? 'left' : 'right']: 12, transform: `translateX(${((side === 0 ? -1 : 1) * open * (leaf + 6)).toFixed(1)}px)`, borderRadius: side === 0 ? `${gw / 2}px 6px 6px 8px` : `6px ${gw / 2}px 8px 6px`, background: `linear-gradient(${side === 0 ? 100 : 260}deg, ${C.panel}F2, ${C.ground}F2)`, border: `2px solid ${gTone}${hex(0.55)}`, boxShadow: `inset 0 0 18px ${gTone}${hex(0.18)}`} as React.CSSProperties} />
        ))}
      </div>
      <Place x={gx} y={gy + gh / 2 + 56} w={gw + 40} h={56} style={{opacity: entGate}}>
        <Tag id={`${ctx.id}:gate`} text={GATE_TAG[gs.cur]} color={gTone} size={SIZE.label} fx={ctx.fx} on={0.4 + 0.6 * gs.q + gFl} />
      </Place>
      {/* floor reflection of the gate */}
      <div style={{position: 'absolute', left: gx - gw * 0.6, top: gy + gh / 2 - 8, width: gw * 1.2, height: 22, borderRadius: '50%', background: `radial-gradient(ellipse, ${gTone}${hex(0.35 * entGate)} 0%, transparent 70%)`}} />
    </div>
  );
};

export const TestGate: DcComponent<Props> = {name: 'TestGate', Component: TestGateView, text: true, slot: 'full'};
