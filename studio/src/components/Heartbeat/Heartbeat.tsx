// Heartbeat (catalog: Domain specials). 04 §6 "Linux ops": systemd services as heartbeats; a heartbeat flatlines and
// restarts. One rim-lit acrylic row per node: label + state tag on the right (RTL start), a status core, then an ECG trace.
// The node emits a full PQRST beat every 24 f@24 (seeded phase per node); beats travel leftwards and fade. Healthy = ok.
// Beat cadence is counted in film frames (components never derive frames from ms), so `interval` is SHOWN, never converted:
// a clock glyph + value + unit in a mono LTR isolate (whole seconds from 60 up read "M min S s", the way it is spoken).
// Actions, anchored to the word that names them (RV1 onset):
//   miss {node}    -> beats stop on the anchor: the trace flatlines in warn (a tinted dashed gap grows from the node, dashed
//                     ghost spikes mark each beat that did not come), the core hollows and breathes, tag SUSPECT, impact flash;
//   recover {node} -> beats resume on the anchor frame (first spike on it), core refills ok, tag OK fades, flash + radar ring.
// Light (ADR-003 LK-F): key from the upper right (acrylic rim), tone glow on the core, a floor pool under each row, a radar ring
// per beat. Colours are tokens only. DOM + SVG only (no filters), so lite = standard = hero code.
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

/** Clock glyph for the interval tag (SVG, no copy). */
const Clock: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{flex: 'none'}}>
    <circle cx={10} cy={10} r={8} fill="none" stroke={color} strokeWidth={1.8} />
    <path d="M 10 5 V 10 L 13.5 12" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The interval as it is spoken: whole seconds from 60 up become "M min S s"; everything else value + unit. */
const intervalText = (v: number, unit: string | undefined, decimals: number | undefined): string => {
  if (unit === 's' && Number.isInteger(v) && v >= 60) {
    const m = Math.floor(v / 60);
    const r = v % 60;
    return r ? `${m} min ${r} s` : `${m} min`;
  }
  return `${formatValue(v, 'decimal', decimals ?? 0)}${unit ? ` ${unit}` : ''}`;
};

/** One PQRST complex as points (right to left, age order), centred on x = xb; s = half-width unit, a = amplitude. */
const complex = (xb: number, s: number, a: number, base: number, xmax: number): string[] => {
  const p: Array<[number, number]> = [
    [5, 0], [4, 0.16], [3, 0], [1.2, 0], [0.7, 0.22], [0, -0.95], [-0.7, 0.4], [-1.4, 0], [-2.6, 0], [-3.4, -0.17], [-4.2, 0],
  ];
  return p.map(([dx, dy]) => `${Math.min(xmax, xb + dx * s).toFixed(1)},${(base + dy * a).toFixed(1)}`);
};

export const HeartbeatView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.nodes.length;
  const box = ctx.box;
  const t = ctx.frame;
  const hdrH = props.interval ? Math.round(SIZE.label * 2.4) : 0;
  const rowH = Math.min(200, (box.h - hdrH) / n);
  const panelH = Math.round(rowH * 0.8);
  const top = box.y + hdrH + (box.h - hdrH - rowH * n) / 2;
  const pad = 36;
  const labelW = Math.round(box.w * 0.25);
  const core = Math.round(Math.min(panelH * 0.2, 36));
  const xRight = box.x + box.w - pad;
  const xCore = xRight - labelW - 36 - core; // core centre
  const traceX0 = box.x + pad;
  const traceW = xCore - core - 28 - traceX0;
  const period = ff(24, ctx.fps);
  const travel = ff(96, ctx.fps); // frames a beat needs to cross the whole trace (4 beats visible)
  const amp = panelH * 0.32;
  const sU = traceW * 0.0105;
  const rtl = props.nodes.some((nd) => isArabic(nd.label));
  const xOf = (age: number) => traceW - (age / travel) * traceW;
  const ringFr = ff(16, ctx.fps);
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {props.interval ? (
        <div style={{position: 'absolute', left: traceX0, top: box.y, width: traceW + 2 * core + 60, height: hdrH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, opacity: prog(ctx, ctx.at, 'label')}}>
          <Clock size={Math.round(SIZE.label * 1.1)} color={C.ink2} />
          <Tag id={`${ctx.id}:interval`} text={intervalText(props.interval.value, props.interval.unit, props.interval.decimals)} color={C.ink2} size={SIZE.label} fx={ctx.fx} on={0} />
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
        const sus = st.cur === 'suspect';
        const tone = mix(st.prev === 'ok' ? C.ok : C.warn, st.cur === 'ok' ? C.ok : C.warn, st.q);
        const fl = st.k > 0 ? flashAt(ctx, st.t) : 0;
        const ringQ = st.k > 0 ? prog(ctx, st.t, 'morph') : 1;
        const phase = born + Math.floor(random(`hb-${nd.id}`) * period);
        const all = beatsUntil(t, born, period, phase, ev);
        const beats = all.filter((b) => t - b <= travel + 2 * period);
        const last = all.length ? all[all.length - 1] : undefined;
        const cy = top + (i + 0.5) * rowH;
        const py = cy - panelH / 2;
        // silent gaps (suspect intervals) in trace coordinates, plus the ghost spikes of the beats that did not come
        const gaps: Array<{xa: number; xb: number}> = [];
        const ghosts: Array<{x: number; q: number}> = [];
        for (let j = 1; j < ev.length; j++) {
          if (ev[j].s !== 'suspect' || ev[j].t > t) continue;
          const t0 = ev[j].t;
          const t1 = j + 1 < ev.length ? Math.min(t, ev[j + 1].t) : t;
          gaps.push({xa: Math.max(0, xOf(t - t1)), xb: Math.max(0, xOf(t - t0))});
          const prev = all.filter((b) => b < t0);
          const base = prev.length ? prev[prev.length - 1] : phase - period;
          for (let f = base + period; f < t1; f += period) if (f >= t0 && f >= born && t - f <= travel) ghosts.push({x: xOf(t - f), q: Math.min(1, (t - f) / ff(6, ctx.fps))});
        }
        const pts: string[] = [`${traceW},${amp}`];
        for (const b of [...beats].reverse()) pts.push(...complex(xOf(t - b), sU, amp, amp, traceW));
        pts.push(`0,${amp}`);
        const pulse = last !== undefined ? Math.max(0, 1 - (t - last) / ff(8, ctx.fps)) : 0;
        const ring = last !== undefined ? (t - last) / ringFr : 2;
        const breathe = sus ? 0.5 + 0.5 * Math.sin((2 * Math.PI * (t - st.t)) / ff(36, ctx.fps)) : 0;
        const scale = 1 + 0.14 * pulse + 0.2 * fl + 0.05 * breathe;
        const coreFill = sus
          ? `radial-gradient(circle at 62% 32%, ${tone}${hex(0.35)} 0%, ${C.void}E6 70%)`
          : `radial-gradient(circle at 62% 32%, ${C.white}${hex(0.7)} 0%, ${tone} 30%, ${tone}${hex(0.35)} 75%)`;
        const tagOn = sus ? 1 : st.k > 0 ? Math.max(0, 1 - (t - st.t) / (4 * ff(12, ctx.fps))) : 0;
        const ticks: number[] = [];
        for (let x = traceW; x > 0; x -= sU * 8) ticks.push(x);
        return (
          <React.Fragment key={nd.id}>
            {/* floor pool under the row */}
            <div style={{position: 'absolute', left: box.x + box.w * 0.18, top: py + panelH - 6, width: box.w * 0.64, height: Math.round(rowH * 0.28), opacity: ent * (0.5 + 0.5 * pulse), background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${tone}${hex(0.26)} 0%, transparent 100%)`}} />
            {/* acrylic row plate */}
            <div style={{position: 'absolute', left: box.x, top: py, width: box.w, height: panelH, opacity: ent, ...acrylic(tone, ctx.fx, 0.22 + 0.5 * fl, 18)}} />
            <div style={{position: 'absolute', left: xRight - labelW, top: py, width: labelW, height: panelH, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: Math.round(panelH * 0.07), opacity: ent}}>
              <FitText id={`${ctx.id}:n${i}`} text={nd.label} size={SIZE.body} maxW={labelW} maxH={panelH * 0.5} color={sus ? C.warn : C.ink} weight={FONT.label.strong} role={isArabic(nd.label) ? 'sentence' : 'code'} />
              {tagOn > 0.02 ? <Tag id={`${ctx.id}:s${i}`} text={sus ? 'SUSPECT' : 'OK'} color={tone} size={SIZE.labelMin} fx={ctx.fx} on={tagOn} style={{opacity: sus ? 1 : tagOn}} /> : null}
            </div>
            {ring < 1 && !sus ? <div style={{position: 'absolute', left: xCore - core * (1 + ring), top: cy - core * (1 + ring), width: 2 * core * (1 + ring), height: 2 * core * (1 + ring), borderRadius: '50%', border: `2px solid ${tone}${hex(0.7 * (1 - ring))}`, opacity: ent}} /> : null}
            {st.k > 0 && ringQ < 1 ? <div style={{position: 'absolute', left: xCore - core * (1 + 1.6 * ringQ), top: cy - core * (1 + 1.6 * ringQ), width: 2 * core * (1 + 1.6 * ringQ), height: 2 * core * (1 + 1.6 * ringQ), borderRadius: '50%', border: `3px solid ${tone}${hex(0.9 * (1 - ringQ))}`}} /> : null}
            <div style={{position: 'absolute', left: xCore - core, top: cy - core, width: 2 * core, height: 2 * core, boxSizing: 'border-box', borderRadius: '50%', opacity: ent, transform: `scale(${scale.toFixed(4)})`, background: coreFill, border: sus ? `2px solid ${tone}` : undefined, boxShadow: emit(tone, ctx.fx, (sus ? 0.35 + 0.35 * breathe : 0.6 + 0.6 * pulse) + fl + ctx.mod.glow)}} />
            <svg width={traceW} height={2 * amp} style={{position: 'absolute', left: traceX0, top: cy - amp, overflow: 'hidden', opacity: ent}}>
              <defs>
                <linearGradient id={`${ctx.id}-hb${i}`} gradientUnits="userSpaceOnUse" x1={traceW} x2={0} y1={0} y2={0}>
                  <stop offset="0" stopColor={C.ok} stopOpacity={1} />
                  <stop offset="1" stopColor={C.ok} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              {ticks.map((x, k) => (
                <line key={k} x1={x} x2={x} y1={0} y2={2 * amp} stroke={C.ink3} strokeOpacity={0.1 + 0.12 * (x / traceW)} strokeWidth={1} />
              ))}
              <line x1={0} x2={traceW} y1={amp} y2={amp} stroke={C.ink3} strokeOpacity={0.35} strokeWidth={1.5} />
              {gaps.map((g, k) => (
                <React.Fragment key={k}>
                  <rect x={g.xa} y={0} width={Math.max(0, g.xb - g.xa)} height={2 * amp} fill={C.warn} fillOpacity={0.1} />
                  <line x1={g.xa} x2={g.xb} y1={amp} y2={amp} stroke={C.warn} strokeWidth={3 + ctx.fx.glowInner * 0.25} strokeOpacity={0.9} strokeDasharray="14 9" strokeLinecap="round" />
                </React.Fragment>
              ))}
              {ghosts.map((g, k) => (
                <polyline key={k} points={complex(g.x, sU, amp, amp, traceW).join(' ')} fill="none" stroke={C.warn} strokeWidth={2.2} strokeOpacity={0.55 * g.q} strokeDasharray="5 6" strokeLinejoin="round" />
              ))}
              <polyline points={pts.join(' ')} fill="none" stroke={C.ok} strokeOpacity={0.2} strokeWidth={4 + ctx.fx.glowInner * 0.5} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={pts.join(' ')} fill="none" stroke={`url(#${ctx.id}-hb${i})`} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={traceW - 3} cy={amp} r={sus ? 5 : 5 + 3 * pulse} fill={sus ? 'none' : C.ok} stroke={sus ? C.warn : 'none'} strokeWidth={2} />
            </svg>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const Heartbeat: DcComponent<Props> = {name: 'Heartbeat', Component: HeartbeatView, text: true, slot: 'full'};
