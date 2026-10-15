// Heartbeat (catalog: Domain specials). 04 §6 "Linux ops": systemd services as heartbeats; a heartbeat flatlines and
// restarts. One row per node: the node label + a status core on the right (RTL start); the node emits beats leftwards along
// an ECG trace (newest beat next to the node, older beats travel away and fade). Healthy = ok; suspect = warn.
// Beat period: a fixed 24 f@24 cadence (seeded phase per node), counted in film frames; components never derive frames from
// ms, so `interval` is SHOWN (value + unit, mono LTR isolate, with its ref in the spec), not converted.
// Actions, anchored to the word that names them (RV1 onset):
//   miss {node}    -> no new beats from the anchor: the trace flatlines, the core turns warn (suspect) with a flash;
//   recover {node} -> beats resume from the anchor (first spike on the anchor frame), the core returns to ok with a flash.
// DOM + SVG only, same code at every tier.
import React from 'react';
import {random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {FitText, Tag, acrylic, actsOf, emit, ff, flashAt, layerStyle, mix, prog, stateAt, type Ev} from '../_dom-a/kit';

type S = 'ok' | 'suspect';

/** Beat frames of a node up to frame t: every `period` from its phase while alive, restarting on the recover frame. */
const beatsUntil = (t: number, start: number, period: number, phase: number, ev: Ev<S>[]): number[] => {
  const out: number[] = [];
  for (let j = 0; j < ev.length; j++) {
    if (ev[j].s !== 'ok') continue;
    const a = Math.max(start, ev[j].t);
    const b = Math.min(t, j + 1 < ev.length ? ev[j + 1].t - 1 : t);
    let f = j === 0 ? a + ((((phase - a) % period) + period) % period) : a; // a recover beats on its anchor frame
    for (; f <= b; f += period) out.push(f);
  }
  return out;
};

export const HeartbeatView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.nodes.length;
  const box = ctx.box;
  const t = ctx.frame;
  const hdrH = props.interval ? Math.round(SIZE.label * 2.2) : 0;
  const rowH = Math.min(170, (box.h - hdrH) / n);
  const top = box.y + hdrH + (box.h - hdrH - rowH * n) / 2;
  const labelW = Math.round(box.w * 0.24);
  const core = Math.round(Math.min(rowH * 0.36, 44));
  const xCore = box.x + box.w - labelW - 40 - core; // core centre
  const traceX0 = box.x; // trace runs from the core leftwards to the box edge
  const traceW = xCore - core - 24 - traceX0;
  const period = ff(24, ctx.fps);
  const travel = ff(96, ctx.fps); // frames a beat needs to cross the whole trace (4 beats visible)
  const amp = rowH * 0.32;
  const rtl = props.nodes.some((nd) => isArabic(nd.label));
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {props.interval ? (
        <div style={{position: 'absolute', left: box.x, top: box.y, width: traceW, height: hdrH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: prog(ctx, ctx.at, 'label')}}>
          <Tag id={`${ctx.id}:interval`} text={`${formatValue(props.interval.value, 'decimal', props.interval.decimals ?? 0)}${props.interval.unit ? ` ${props.interval.unit}` : ''}`} color={C.ink2} size={SIZE.label} fx={ctx.fx} on={0} />
        </div>
      ) : null}
      {props.nodes.map((nd, i) => {
        const born = ctx.at + ff(3 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'label');
        const ev: Ev<S>[] = [{t: -1e9, s: 'ok'}];
        for (const a of [...actsOf(ctx, 'miss'), ...actsOf(ctx, 'recover')].sort((p, q) => p.at - q.at || p.li - q.li))
          if (a.props.node === nd.id) ev.push({t: a.at, s: a.name === 'miss' ? 'suspect' : 'ok'});
        const st = stateAt(ev, ctx, 'label');
        const tone = mix(st.prev === 'ok' ? C.ok : C.warn, st.cur === 'ok' ? C.ok : C.warn, st.q);
        const fl = st.k > 0 ? flashAt(ctx, st.t) : 0;
        const phase = born + Math.floor(random(`hb-${nd.id}`) * period);
        const beats = beatsUntil(t, born, period, phase, ev).filter((b) => t - b <= travel);
        const cy = top + (i + 0.5) * rowH;
        // ECG polyline in trace-local coords (x from the right end = 0 age)
        const pts: string[] = [`${traceW},${amp}`];
        for (const b of [...beats].reverse()) {
          const age = t - b;
          const xb = traceW - (age / travel) * traceW;
          const s = traceW * 0.012;
          pts.push(`${(xb + 3 * s).toFixed(1)},${amp}`, `${(xb + 2 * s).toFixed(1)},${(amp - amp * 0.18).toFixed(1)}`, `${(xb + s).toFixed(1)},${amp}`, `${xb.toFixed(1)},${(amp + amp * 0.25).toFixed(1)}`, `${(xb - s).toFixed(1)},${(amp - amp * 0.95).toFixed(1)}`, `${(xb - 2 * s).toFixed(1)},${(amp + amp * 0.35).toFixed(1)}`, `${(xb - 3 * s).toFixed(1)},${amp}`);
        }
        pts.push(`0,${amp}`);
        const pulse = beats.length ? Math.max(0, 1 - (t - beats[beats.length - 1]) / ff(8, ctx.fps)) : 0;
        return (
          <React.Fragment key={nd.id}>
            <div style={{position: 'absolute', left: xCore + core + 40, top: cy - rowH / 2, width: labelW, height: rowH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: ent}}>
              <FitText id={`${ctx.id}:n${i}`} text={nd.label} size={SIZE.body} maxW={labelW} maxH={rowH} color={st.cur === 'ok' ? C.ink : C.warn} weight={FONT.label.strong} role={isArabic(nd.label) ? 'sentence' : 'code'} />
            </div>
            <div style={{position: 'absolute', left: xCore - core, top: cy - core, width: 2 * core, height: 2 * core, borderRadius: '50%', opacity: ent, transform: `scale(${(1 + 0.12 * pulse + 0.2 * fl).toFixed(4)})`, background: `radial-gradient(circle at 62% 32%, ${C.white}${hex(0.7)} 0%, ${tone} 30%, ${tone}${hex(0.35)} 75%)`, boxShadow: emit(tone, ctx.fx, 0.6 + 0.6 * pulse + fl + ctx.mod.glow)}} />
            <div style={{position: 'absolute', left: traceX0 - 8, top: cy - amp - 10, width: traceW + 16, height: 2 * amp + 20, opacity: ent * 0.9, ...acrylic(tone, ctx.fx, 0.12, 12), boxShadow: 'none'}} />
            <svg width={traceW} height={2 * amp} style={{position: 'absolute', left: traceX0, top: cy - amp, overflow: 'visible', opacity: ent}}>
              <defs>
                <linearGradient id={`${ctx.id}-hb${i}`} x1="1" x2="0" y1="0" y2="0">
                  <stop offset="0" stopColor={tone} stopOpacity={1} />
                  <stop offset="1" stopColor={tone} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <polyline points={pts.join(' ')} fill="none" stroke={tone} strokeOpacity={0.22} strokeWidth={3 + ctx.fx.glowInner} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={pts.join(' ')} fill="none" stroke={`url(#${ctx.id}-hb${i})`} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const Heartbeat: DcComponent<Props> = {name: 'Heartbeat', Component: HeartbeatView, text: true, slot: 'full'};
