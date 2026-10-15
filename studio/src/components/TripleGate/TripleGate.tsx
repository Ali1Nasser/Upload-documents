// TripleGate (catalog: Domain specials). Three portals in reading order (RTL: gate 0 on the right) that ignite in turn; a
// payload capsule travels right -> left through them and passes or is rejected (04 §6 "Data work = 3 moves": portals ignite
// in sequence). States: dormant (dim acrylic), lit (signal: the thing explained now), open (ok), closed (ink2 barrier),
// fail (crit barrier). Actions, each anchored to the word that names it (RV1 onset):
//   ignite {gate | 'all'} -> the gate(s) light up (all: staggered 4 f@24);
//   pass -> the payload travels through every gate; each gate turns ok as the payload crosses it;
//   reject {gate} -> the payload stops at that gate, the gate turns fail (3 f shake <= IMPACT.nudgePxMax), the payload recoils
//   in crit and fades.
// The travel spans the action word (anchor -> word end, at least 18 f@24).
// Look (04 §1.2, ADR-003 LK-F): glowing acrylic arch with a key rim light from the upper right, a light shaft above and a
// light pool on the floor of every lit gate (the lit gate is the brightest thing on screen), a back glow on the far plane, the
// holographic floor grid, a comet trail on the payload, a floor ring and a few seeded sparks on every crossing.
// DOM + SVG only (no WebGL, no filter, no mask-image: deterministic): every tier is the same code, the tier sets glow radii and
// the spark count. Labels are the only copy; they are whole Arabic words/phrases through the type engine.
import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, IMPACT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import {ease} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps, LayerCtx} from '../../spec/types';
import type {Props} from './schema';
import {FitText, Floor, Place, acrylic, actsOf, clamp, emit, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

type GState = 'dormant' | 'lit' | 'open' | 'closed' | 'fail';
const TONE: Record<GState, string> = {dormant: C.ink3, lit: C.signal, open: C.ok, closed: C.ink2, fail: C.crit};
const ON: Record<GState, number> = {dormant: 0.12, lit: 1, open: 0.95, closed: 0.45, fail: 1};

type Travel = {t0: number; t1: number; to: number; reject: boolean};

const geometry = (box: Rect) => {
  const labelH = Math.round(SIZE.body * 1.9);
  const gw = Math.round(Math.min(box.w * 0.13, (box.h - labelH) * 0.42));
  const gh = Math.round(Math.min((box.h - labelH) * 0.78, gw * 1.75));
  const cy = box.y + (box.h - labelH) / 2 + 6;
  const cw = Math.round(Math.min(box.w * 0.2, 360)); // payload capsule slot width: it never leaves the slot (title-safe)
  const clear = 28;
  // [payload start | gate 0 | gate 1 | gate 2 | payload end]: the capsule always clears the gate edges at both ends
  const avail = box.w - 2 * (cw + clear);
  const spacing = Math.max(gw * 1.05, Math.min((avail - gw) / 2, gw * 1.9));
  const cx = box.x + box.w / 2;
  const gx = [0, 1, 2].map((i) => cx + spacing * (1 - i)); // RTL: gate 0 on the right
  const x0 = box.x + box.w - cw / 2; // payload start (right)
  const x1 = box.x + cw / 2; // payload end (left)
  const f = (x: number) => (x0 - x) / (x0 - x1);
  return {labelH, gw, gh, cy, cw, clear, spacing, gx, x0, x1, gateF: gx.map(f), stopF: gx.map((x) => f(x + gw / 2 + clear + cw / 2)), floorY: cy + gh / 2};
};
type Geo = ReturnType<typeof geometry>;

export const tripleTimeline = (p: Props, ctx: LayerCtx) => {
  const G = geometry(ctx.box);
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
    // crossing frame of gate g: the eased path reaches the gate (inverted numerically on whole frames: deterministic)
    const span = t1 - a.at;
    const endF = reject ? G.stopF[to] : 1;
    const pathAt = (t: number) => endF * interpolate(t + 1, [a.at, a.at + span], [0, 1], {...clamp, easing: ease.camera});
    for (let g = 0; g < 3; g++) {
      if (reject && g > to) continue;
      const goal = reject && g === to ? endF - 1e-6 : G.gateF[g];
      let tc = t1;
      for (let t = a.at; t <= t1; t++)
        if (pathAt(t) >= goal) {
          tc = t;
          break;
        }
      ev[g].push({t: tc, s: reject && g === to ? 'fail' : 'open'});
    }
  }
  ev.forEach((e) => e.sort((x, y) => x.t - y.t));
  return {ev, travels, G};
};

const gateLook = (e: {t: number; s: GState}[], ctx: LayerCtx) => {
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
    t: k === 0 ? null : cur.t,
    flash: k === 0 ? 0 : flashAt(ctx, cur.t),
  };
};

/** Arch outline path in a gw x gh box (round top, small bottom corners), inset by the half stroke. */
const archPath = (w: number, h: number, i = 1.5, rb = 10): string => {
  const r = w / 2 - i;
  return `M ${i} ${h - i - rb} V ${w / 2} A ${r} ${r} 0 0 1 ${w - i} ${w / 2} V ${h - i - rb} Q ${w - i} ${h - i} ${w - i - rb} ${h - i} H ${i + rb} Q ${i} ${h - i} ${i} ${h - i - rb} Z`;
};

/** Seeded sparks leaving the floor line of a gate for 14 f@24; count follows the tier (lite 8, standard / hero 16). */
const Sparks: React.FC<{ctx: LayerCtx; seed: string; x: number; y: number; t0: number; tone: string; reach: number}> = ({ctx, seed, x, y, t0, tone, reach}) => {
  const life = ff(14, ctx.fps);
  const age = ctx.frame - t0;
  if (age < 0 || age > life) return null;
  const n = Math.max(0, Math.min(16, Math.round(ctx.fx.particles / 90)));
  const q = age / life;
  return (
    <>
      {Array.from({length: n}, (_, k) => {
        const ang = -Math.PI * (0.12 + 0.76 * random(`${seed}:a${k}`));
        const sp = reach * (0.45 + 0.55 * random(`${seed}:s${k}`));
        const e = 1 - Math.pow(1 - q, 2.2);
        const sz = 3 + 3 * random(`${seed}:z${k}`);
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: x + Math.cos(ang) * sp * e - sz / 2,
              top: y + Math.sin(ang) * sp * e - sz / 2 + 22 * q * q,
              width: sz,
              height: sz,
              borderRadius: '50%',
              background: tone,
              opacity: 1 - q,
              boxShadow: `0 0 ${(ctx.fx.glowInner * 0.8).toFixed(1)}px ${tone}`,
            }}
          />
        );
      })}
    </>
  );
};

export const TripleGateView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {ev, travels, G} = tripleTimeline(props, ctx);
  const t = ctx.frame;
  const fx = ctx.fx;
  const spacing = G.spacing;
  // payload position along the path
  let pf = 0; // 0..1 of the path
  let payTone: string = C.signal;
  let payAlpha = props.payload ? 1 : 0;
  let moving = false;
  let trail = 0;
  for (const tr of travels) {
    if (t < tr.t0) break;
    const endF = tr.reject ? G.stopF[tr.to] : 1;
    const q = interpolate(t + 1, [tr.t0, tr.t1], [0, 1], {...clamp, easing: ease.camera});
    pf = endF * q;
    moving = t < tr.t1;
    trail = moving ? 1 : interpolate(t - tr.t1, [0, ff(6, ctx.fps)], [1, 0], clamp);
    payAlpha = 1;
    payTone = C.signal;
    if (tr.reject && t >= tr.t1) {
      const r = prog(ctx, tr.t1, 'arrive', ease.camera, true);
      pf = endF - 0.04 * r;
      payTone = mix(C.signal, C.crit, prog(ctx, tr.t1, 'label'));
      payAlpha = 1 - interpolate(t - tr.t1, [ff(10, ctx.fps), ff(22, ctx.fps)], [0, 1], clamp);
    } else if (!tr.reject && t >= tr.t1) payTone = C.ok;
  }
  const px = G.x0 + (G.x1 - G.x0) * pf;
  const payY = G.cy + G.gh * 0.1;
  const payIn = prog(ctx, ctx.at + ff(10, ctx.fps), 'arrive');
  const rtl = props.gates.some((g) => isArabic(g.label));
  const glowK = 1 + ctx.mod.glow;
  const shaftBase = G.cy - G.gh * 0.15; // the shaft rises from inside the arch (the opaque acrylic hides its foot)
  const shaftH = Math.max(0, shaftBase - ctx.box.y) * 0.95;
  const uid = ctx.id.replace(/\W/g, '_');
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      <Floor x={ctx.box.x} y={G.floorY - 4} w={ctx.box.w} h={Math.round(ctx.box.h * 0.35)} opacity={0.55} />
      {/* path rail on the floor line */}
      <div style={{position: 'absolute', left: G.x1 - G.cw / 2, top: G.floorY - 2, width: G.x0 - G.x1 + G.cw, height: 2, background: `linear-gradient(270deg, transparent, ${C.ink3}${hex(0.55)} 10%, ${C.ink3}${hex(0.55)} 90%, transparent)`}} />
      {props.gates.map((g, i) => {
        const lk = gateLook(ev[i], ctx);
        const at = ctx.at + ff(4 * i, ctx.fps);
        if (t < at) return null;
        const ent = prog(ctx, at, 'arrive');
        const on = Math.min(1.6, lk.on * glowK + lk.flash * 0.8);
        const on1 = Math.min(1, lk.on);
        const x = G.gx[i];
        const shake =
          lk.s === 'fail' && lk.t !== null && t - lk.t < ff(3, ctx.fps) ? (random(`${ctx.id}:shake:${i}:${t - lk.t}`) * 2 - 1) * IMPACT.nudgePxMax : 0;
        const rim = `rim_${uid}_${i}`;
        const shaft = `sh_${uid}_${i}`;
        const ringQ = lk.t !== null && lk.s !== 'dormant' ? prog(ctx, lk.t, 'morph', ease.arrive, true) : 1;
        const ringA = lk.t !== null && lk.s !== 'dormant' ? 1 - ringQ : 0;
        return (
          <React.Fragment key={i}>
            {/* far plane: back glow behind the arch */}
            <div style={{position: 'absolute', left: x - G.gw * 1.1, top: G.cy - G.gh * 0.7, width: G.gw * 2.2, height: G.gh * 1.5, opacity: ent * on1, background: `radial-gradient(ellipse 50% 50% at 50% 55%, ${lk.tone}${hex(0.2 + 0.1 * lk.flash)} 0%, ${lk.tone}${hex(0.05)} 55%, transparent 100%)`}} />
            {/* light shaft above the arch (haze role: decoration, no copy) */}
            {shaftH > 40 && on1 > 0.2 ? (
              <svg width={G.gw * 1.5} height={shaftH} style={{position: 'absolute', left: x - G.gw * 0.75, top: shaftBase - shaftH, opacity: ent * on1}}>
                <defs>
                  <linearGradient id={shaft} x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor={lk.tone} stopOpacity={0.22 + 0.18 * lk.flash} />
                    <stop offset="1" stopColor={lk.tone} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <polygon points={`${G.gw * 0.3},${shaftH} ${G.gw * 1.2},${shaftH} ${G.gw * 1.5},0 0,0`} fill={`url(#${shaft})`} />
              </svg>
            ) : null}
            <div
              style={{
                position: 'absolute',
                boxSizing: 'border-box',
                left: x - G.gw / 2 + shake,
                top: G.cy - G.gh / 2,
                width: G.gw,
                height: G.gh,
                opacity: ent,
                transform: `translateY(${((1 - ent) * 18).toFixed(1)}px)`,
                ...acrylic(lk.tone, fx, on, 0),
                borderRadius: `${G.gw / 2}px ${G.gw / 2}px 10px 10px`,
                borderWidth: 3,
              }}
            >
              {/* portal light: the field fills from the floor up, hot core when it flashes */}
              <div style={{position: 'absolute', inset: 10, borderRadius: `${G.gw / 2 - 10}px ${G.gw / 2 - 10}px 6px 6px`, background: `radial-gradient(ellipse 75% 62% at 50% 72%, ${lk.tone}${hex(0.42 * on1 + 0.3 * lk.flash)} 0%, ${lk.tone}${hex(0.1 * on1)} 62%, transparent 100%), linear-gradient(0deg, ${lk.tone}${hex(0.2 * on1)} 0%, transparent 55%)`}} />
              <div style={{position: 'absolute', left: '50%', top: '30%', width: 4, height: '50%', marginLeft: -2, borderRadius: 2, background: `linear-gradient(180deg, transparent, ${C.ink}${hex(0.5 * lk.flash + 0.12 * on1)}, transparent)`}} />
              <div style={{position: 'absolute', inset: 16, borderRadius: `${G.gw / 2 - 16}px ${G.gw / 2 - 16}px 4px 4px`, border: `1.5px solid ${lk.tone}${hex(0.15 + 0.35 * on1)}`}} />
              {/* key rim light from the upper right (04 §1.2) */}
              <svg width={G.gw} height={G.gh} style={{position: 'absolute', left: -3, top: -3, overflow: 'visible'}}>
                <defs>
                  <linearGradient id={rim} gradientUnits="userSpaceOnUse" x1={G.gw} y1={0} x2={G.gw * 0.15} y2={G.gh * 0.7}>
                    <stop offset="0" stopColor={C.ink} stopOpacity={0.35 + 0.5 * on1} />
                    <stop offset="1" stopColor={C.ink} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d={archPath(G.gw, G.gh)} fill="none" stroke={`url(#${rim})`} strokeWidth={2.5} strokeLinecap="round" />
              </svg>
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
            {/* light pool on the floor + crossing ring */}
            <div style={{position: 'absolute', left: x - G.gw * 0.95, top: G.floorY - 16, width: G.gw * 1.9, height: 40, borderRadius: '50%', background: `radial-gradient(ellipse, ${lk.tone}${hex(0.5 * on1 * ent + 0.25 * lk.flash)} 0%, ${lk.tone}${hex(0.12 * on1)} 55%, transparent 72%)`}} />
            {ringA > 0.01 ? (
              <div style={{position: 'absolute', left: x - G.gw * (0.5 + 0.9 * ringQ), top: G.floorY - 18 * (0.4 + ringQ), width: G.gw * (1 + 1.8 * ringQ), height: 36 * (0.4 + ringQ), borderRadius: '50%', border: `2px solid ${lk.tone}${hex(0.8 * ringA)}`}} />
            ) : null}
            {lk.t !== null && lk.s !== 'dormant' && lk.s !== 'lit' && lk.s !== 'closed' ? (
              <Sparks ctx={ctx} seed={`${ctx.id}:sp:${i}:${lk.t}`} x={x} y={G.floorY} t0={lk.t} tone={lk.tone} reach={G.gh * 0.38} />
            ) : null}
            <Place x={x} y={G.floorY + G.labelH / 2 + 12} w={spacing - 40} h={G.labelH} style={{opacity: ent}}>
              <FitText id={`${ctx.id}:g${i}`} text={g.label} size={SIZE.body} maxW={spacing - 40} color={lk.s === 'dormant' ? C.ink2 : C.ink} weight={FONT.label.strong} />
            </Place>
          </React.Fragment>
        );
      })}
      {payAlpha > 0.01 && t >= ctx.at + ff(10, ctx.fps) ? (
        <>
          {/* comet trail behind the moving capsule (it travels right -> left, the tail streams to the right) */}
          {trail > 0.01 ? (
            <div style={{position: 'absolute', left: px, top: payY - 4, width: Math.min(G.cw * 0.9, 300) * trail, height: 8, borderRadius: 4, opacity: payAlpha * payIn, background: `linear-gradient(90deg, ${payTone}${hex(0.55)} 0%, transparent 100%)`}} />
          ) : null}
          <Place x={px} y={payY} w={G.cw} h={Math.round(SIZE.label * 2.2)} style={{opacity: payAlpha * payIn, zIndex: 2}}>
            {props.payload ? (
              <div style={{...acrylic(payTone, fx, 1.1 * glowK, 999), padding: `6px ${Math.round(SIZE.label * 0.7)}px`, display: 'flex', alignItems: 'center', transform: moving ? 'scale(1.04)' : undefined}}>
                <FitText id={`${ctx.id}:payload`} text={props.payload} size={SIZE.label} maxW={G.cw - Math.round(SIZE.label * 1.6) - 4} color={C.ink} />
              </div>
            ) : (
              <div style={{width: 26, height: 26, borderRadius: '50%', background: payTone, boxShadow: emit(payTone, fx, 1.4)}} />
            )}
          </Place>
        </>
      ) : null}
    </div>
  );
};

/** Copy sits in the payload band and under the gates: the text-safe mask (haze, particles, bokeh) covers that band only. */
export const tripleTextRect = (_p: Props, box: Rect): Rect => {
  const G: Geo = geometry(box);
  const y0 = G.cy + G.gh * 0.1 - SIZE.label * 1.4;
  const y1 = G.floorY + G.labelH + 12 + G.labelH / 2;
  return {x: box.x, y: y0, w: box.w, h: y1 - y0};
};

export const TripleGate: DcComponent<Props> = {name: 'TripleGate', Component: TripleGateView, text: true, slot: 'full', textRect: tripleTextRect};
