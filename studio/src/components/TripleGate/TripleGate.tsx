// TripleGate (catalog: Domain specials). Three portals in reading order (RTL: gate 0 on the right) that ignite in turn; a
// payload capsule travels right -> left through them and passes or is rejected (04 §6 "Data work = 3 moves": portals ignite
// in sequence). States: dormant (dim acrylic), lit (signal: the thing explained now), open (ok), closed (ink2 barrier),
// fail (crit barrier). Actions, each anchored to the word that names it (RV1 onset):
//   ignite {gate | 'all'} -> the gate(s) light up (all: staggered 4 f@24);
//   pass -> the payload travels through every gate; each gate turns ok as the payload crosses it;
//   reject {gate} -> the payload stops at that gate, the gate turns fail, the payload recoils in crit and fades.
// The travel spans the action word (anchor -> word end, at least 18 f@24). DOM only (no WebGL): every tier is the same code.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import {ease} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {FitText, Floor, Place, acrylic, actsOf, clamp, emit, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

type GState = 'dormant' | 'lit' | 'open' | 'closed' | 'fail';
const TONE: Record<GState, string> = {dormant: C.ink3, lit: C.signal, open: C.ok, closed: C.ink2, fail: C.crit};
const ON: Record<GState, number> = {dormant: 0.12, lit: 1, open: 0.9, closed: 0.45, fail: 1};

type Travel = {t0: number; t1: number; to: number; reject: boolean};
/** Gate x as a fraction of the payload path (start right of gate 0 -> end left of gate 2). */
const GATE_F = [0.17, 0.5, 0.83];

export const tripleTimeline = (p: Props, ctx: LayerCtx) => {
  const ev: {t: number; s: GState}[][] = p.gates.map((g) => [{t: -1e9, s: (g.state ?? 'dormant') as GState}]);
  for (const a of actsOf(ctx, 'ignite')) {
    const which = a.props.gate === 'all' ? [0, 1, 2] : [a.props.gate as number];
    which.forEach((g, k) => ev[g].push({t: a.at + (a.props.gate === 'all' ? ff(4 * k, ctx.fps) : 0), s: 'lit'}));
  }
  const travels: Travel[] = [];
  for (const a of [...actsOf(ctx, 'pass'), ...actsOf(ctx, 'reject')].sort((x, y) => x.at - y.at || x.li - y.li)) {
    const reject = a.name === 'reject';
    const to = reject ? (a.props.gate as number) : 3;
    const t1 = Math.max(a.at + ff(18, ctx.fps), a.end);
    travels.push({t0: a.at, t1, to, reject});
    // crossing frame of gate g: the eased path reaches GATE_F[g] (inverted numerically on whole frames: deterministic)
    const span = t1 - a.at;
    const endF = reject ? GATE_F[to] - 0.06 : 1;
    const pathAt = (t: number) => endF * interpolate(t + 1, [a.at, a.at + span], [0, 1], {...clamp, easing: ease.camera});
    for (let g = 0; g < 3; g++) {
      if (reject && g > to) continue;
      let tc = t1;
      for (let t = a.at; t <= t1; t++)
        if (pathAt(t) >= (reject && g === to ? endF - 1e-6 : GATE_F[g])) {
          tc = t;
          break;
        }
      ev[g].push({t: tc, s: reject && g === to ? 'fail' : 'open'});
    }
  }
  ev.forEach((e) => e.sort((x, y) => x.t - y.t));
  return {ev, travels};
};

const gateLook = (e: {t: number; s: GState}[], ctx: LayerCtx): {tone: string; on: number; bar: number; s: GState; flash: number} => {
  let k = 0;
  for (let j = 0; j < e.length; j++) if (e[j].t <= ctx.frame) k = j;
  const cur = e[k];
  const prev = e[Math.max(0, k - 1)];
  const q = k === 0 ? 1 : prog(ctx, cur.t, 'label');
  const barOf = (s: GState) => (s === 'closed' || s === 'fail' ? 1 : 0);
  return {
    tone: mix(TONE[prev.s], TONE[cur.s], q),
    on: ON[prev.s] + (ON[cur.s] - ON[prev.s]) * q,
    bar: barOf(prev.s) + (barOf(cur.s) - barOf(prev.s)) * q,
    s: cur.s,
    flash: k === 0 ? 0 : flashAt(ctx, cur.t),
  };
};

const geometry = (box: Rect) => {
  const labelH = Math.round(SIZE.body * 1.9);
  const gw = Math.round(Math.min(box.w * 0.14, (box.h - labelH) * 0.42));
  const gh = Math.round(Math.min((box.h - labelH) * 0.78, gw * 1.75));
  const cy = box.y + (box.h - labelH) / 2 + 6;
  const cw = Math.round(Math.min(box.w * 0.26, 420)); // payload capsule width: it never leaves the slot (title-safe)
  const x0 = box.x + box.w - cw / 2; // payload start (right)
  const x1 = box.x + cw / 2; // payload end (left)
  const gx = GATE_F.map((f) => x0 + (x1 - x0) * f);
  return {labelH, gw, gh, cy, x0, x1, gx, cw};
};

export const TripleGateView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {ev, travels} = tripleTimeline(props, ctx);
  const G = geometry(ctx.box);
  const t = ctx.frame;
  const spacing = G.gx[0] - G.gx[1];
  const fx = ctx.fx;
  // payload position along the path
  let pf = 0; // 0..1 of the path
  let payTone: string = C.signal;
  let payAlpha = props.payload ? 1 : 0;
  let moving = false;
  for (const tr of travels) {
    if (t < tr.t0) break;
    const endF = tr.reject ? GATE_F[tr.to] - 0.06 : 1;
    const q = interpolate(t + 1, [tr.t0, tr.t1], [0, 1], {...clamp, easing: ease.camera});
    pf = endF * q;
    moving = t < tr.t1;
    payAlpha = 1;
    payTone = C.signal;
    if (tr.reject && t >= tr.t1) {
      const r = prog(ctx, tr.t1, 'arrive', ease.camera, true);
      pf = endF - 0.08 * r;
      payTone = mix(C.signal, C.crit, prog(ctx, tr.t1, 'label'));
      payAlpha = 1 - interpolate(t - tr.t1, [ff(10, ctx.fps), ff(22, ctx.fps)], [0, 1], clamp);
    } else if (!tr.reject && t >= tr.t1) payTone = C.ok;
  }
  const px = G.x0 + (G.x1 - G.x0) * pf;
  const payIn = prog(ctx, ctx.at + ff(10, ctx.fps), 'arrive');
  const rtl = props.gates.some((g) => isArabic(g.label));
  const glowK = 1 + ctx.mod.glow;
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      <Floor x={ctx.box.x} y={G.cy + G.gh / 2 - 4} w={ctx.box.w} h={Math.round(ctx.box.h * 0.35)} opacity={0.55} />
      {/* path rail */}
      <div style={{position: 'absolute', left: G.x1, top: G.cy + G.gh / 2 - 3, width: G.x0 - G.x1, height: 2, background: `linear-gradient(270deg, transparent, ${C.ink3}${hex(0.5)} 12%, ${C.ink3}${hex(0.5)} 88%, transparent)`}} />
      {props.gates.map((g, i) => {
        const lk = gateLook(ev[i], ctx);
        const ent = prog(ctx, ctx.at + ff(4 * i, ctx.fps), 'arrive');
        if (t < ctx.at + ff(4 * i, ctx.fps)) return null;
        const on = lk.on * glowK + lk.flash * 0.8;
        const x = G.gx[i];
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x - G.gw / 2,
                top: G.cy - G.gh / 2,
                width: G.gw,
                height: G.gh,
                opacity: ent,
                transform: `translateY(${((1 - ent) * 18).toFixed(1)}px)`,
                ...acrylic(lk.tone, fx, Math.min(1.6, on), 0),
                borderRadius: `${G.gw / 2}px ${G.gw / 2}px 10px 10px`,
                borderWidth: 3,
              }}
            >
              {/* portal light (inner field) */}
              <div style={{position: 'absolute', inset: 10, borderRadius: `${G.gw / 2 - 10}px ${G.gw / 2 - 10}px 6px 6px`, background: `radial-gradient(ellipse 70% 60% at 50% 60%, ${lk.tone}${hex(0.32 * Math.min(1, lk.on) + 0.25 * lk.flash)} 0%, ${lk.tone}${hex(0.06 * lk.on)} 60%, transparent 100%)`}} />
              <div style={{position: 'absolute', inset: 16, borderRadius: `${G.gw / 2 - 16}px ${G.gw / 2 - 16}px 4px 4px`, border: `1.5px solid ${lk.tone}${hex(0.15 + 0.35 * Math.min(1, lk.on))}`}} />
              {/* barrier (closed / fail) */}
              {lk.bar > 0.01 ? (
                <div style={{position: 'absolute', left: 8, right: 8, top: '58%', height: 10, borderRadius: 5, background: lk.tone, opacity: lk.bar, transform: `scaleX(${lk.bar.toFixed(3)})`, boxShadow: emit(lk.tone, fx, 0.8)}} />
              ) : null}
              {lk.s === 'fail' && lk.bar > 0.5 ? (
                <svg width={G.gw} height={G.gh} style={{position: 'absolute', left: -3, top: -3}}>
                  <g stroke={C.crit} strokeWidth={7} strokeLinecap="round" opacity={lk.bar}>
                    <line x1={G.gw * 0.32} y1={G.gh * 0.3} x2={G.gw * 0.68} y2={G.gh * 0.5} />
                    <line x1={G.gw * 0.68} y1={G.gh * 0.3} x2={G.gw * 0.32} y2={G.gh * 0.5} />
                  </g>
                </svg>
              ) : null}
            </div>
            {/* floor reflection */}
            <div style={{position: 'absolute', left: x - G.gw * 0.7, top: G.cy + G.gh / 2 - 10, width: G.gw * 1.4, height: 20, borderRadius: '50%', background: `radial-gradient(ellipse, ${lk.tone}${hex(0.35 * Math.min(1, lk.on) * ent)} 0%, transparent 70%)`}} />
            <Place x={x} y={G.cy + G.gh / 2 + G.labelH / 2 + 8} w={spacing - 40} h={G.labelH} style={{opacity: ent}}>
              <FitText id={`${ctx.id}:g${i}`} text={g.label} size={SIZE.body} maxW={spacing - 40} color={lk.s === 'dormant' ? C.ink2 : C.ink} weight={FONT.label.strong} />
            </Place>
          </React.Fragment>
        );
      })}
      {payAlpha > 0.01 && t >= ctx.at + ff(10, ctx.fps) ? (
        <Place x={px} y={G.cy + G.gh * 0.08} w={G.cw} h={Math.round(SIZE.label * 2.2)} style={{opacity: payAlpha * payIn, zIndex: 2}}>
          {props.payload ? (
            <div style={{...acrylic(payTone, fx, 1.1 * glowK, 999), padding: `6px ${Math.round(SIZE.label * 0.7)}px`, display: 'flex', alignItems: 'center', transform: moving ? 'scale(1.04)' : undefined}}>
              <FitText id={`${ctx.id}:payload`} text={props.payload} size={SIZE.label} maxW={G.cw - Math.round(SIZE.label * 1.6) - 4} color={C.ink} />
            </div>
          ) : (
            <div style={{width: 26, height: 26, borderRadius: '50%', background: payTone, boxShadow: emit(payTone, fx, 1.4)}} />
          )}
        </Place>
      ) : null}
    </div>
  );
};

export const TripleGate: DcComponent<Props> = {name: 'TripleGate', Component: TripleGateView, text: false, slot: 'full'};
