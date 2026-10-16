// SamplingDial (catalog: Domain specials; 04 section 6 "LLM prompting": temperature / top-p as a dial sharpening or flattening the
// distribution; beat: "bars reshape with the dial"). 1-3 dials in a row (parameter 1 on the right): a 270-degree track, a value arc,
// a knob, the mono value in the centre, the label under it. The dial scale ends are bare ticks (no numerals: only the spoken value
// is a shown number, Num.ref in the contract). Under the dials an unlabelled next-token distribution (10 bars) is driven by the
// dials: parameter 1 is the temperature (low = one tall bar, high = flat), parameter 2 (if any) is top-p (bars beyond the nucleus
// dim and the rest renormalise). The bars are an illustration of the effect, not data.
//   turn {param, to} : the dial rotates and the value rolls to `to` from the turn word to its end (count semantics: it lands on
//                      the word end, first visible step on the anchor frame), the bars reshape continuously with it.
// DOM + SVG only (standard tier).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Floor, Lbl, NumText, acts, arcPath, boxStyle, clamp01, mix, pf, polar, prog, pulse, roll, shell} from '../_dom-c/kit';
import {f24} from '../_dom-c/kit';

const A0 = -135;
const A1 = 135;
const LOGITS = [2.6, 2.05, 1.55, 1.1, 0.8, 0.5, 0.3, 0.15, 0.05, 0];

const decimalsOf = (v: number): number => (Number.isInteger(v) ? 0 : (String(v).split('.')[1] ?? '').length);

/** Value of every dial at frame t (rolls over the turn words) plus the landing frame of the latest turn. */
export const dialValues = (p: Props, ctx: DcProps<Props>['ctx'], t: number): {v: number[]; lastT: (number | null)[]; dec: number[]} => {
  const turns = acts(ctx, 'turn');
  const P = pf(ctx);
  const v: number[] = [];
  const lastT: (number | null)[] = [];
  const dec: number[] = [];
  p.params.forEach((pr, i) => {
    let cur = pr.value.value;
    let land: number | null = null;
    let d = pr.value.decimals ?? decimalsOf(pr.value.value);
    for (const a of turns.filter((x) => x.props.param === i)) {
      const to = (a.props.to as {value: number; decimals?: number}).value;
      d = Math.max(d, (a.props.to as {decimals?: number}).decimals ?? decimalsOf(to));
      const t1 = Math.max(a.at + P.morph, a.end);
      if (t >= a.at) {
        cur = roll(t, a.at, t1, cur, to);
        land = t >= t1 ? t1 : null;
      }
      if (t < a.at) break;
      if (t >= t1) cur = to;
    }
    v.push(cur);
    lastT.push(land);
    dec.push(d);
  });
  return {v, lastT, dec};
};

export const distribution = (temp: number, topp: number | null): {p: number[]; kept: boolean[]} => {
  const T = 0.1 + 1.9 * clamp01(temp);
  const e = LOGITS.map((l) => Math.exp(l / T));
  const s = e.reduce((a, b) => a + b, 0);
  let pr = e.map((x) => x / s);
  const kept = pr.map(() => true);
  if (topp !== null) {
    let cum = 0;
    let cut = false;
    pr.forEach((x, i) => {
      if (cut) kept[i] = false;
      else {
        cum += x;
        if (cum >= clamp01(topp) - 1e-9) cut = true;
      }
    });
    const ks = pr.reduce((a, x, i) => a + (kept[i] ? x : 0), 0);
    pr = pr.map((x, i) => (kept[i] ? x / ks : x));
  }
  return {p: pr, kept};
};

export const SamplingDialView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const n = props.params.length;
  const W = ctx.box.w;
  const H = ctx.box.h;
  const {v, lastT, dec} = dialValues(props, ctx, t);
  const cellW = Math.min(W / n, 640);
  const r = Math.min(cellW * 0.33, H * 0.2);
  const cy = H * 0.27;
  const ent = prog(ctx, ctx.at, P.arrive);
  const norm = (i: number) => {
    const pr = props.params[i];
    return clamp01((v[i] - pr.min) / Math.max(1e-9, pr.max - pr.min));
  };
  // which dial drives what: a label that names top-p / nucleus drives the nucleus cut, the first other dial is the temperature
  const isP = props.params.map((x) => /top[\s_-]?p|nucleus|توب/i.test(x.label));
  const ti = isP.findIndex((x) => !x);
  const pi = isP.findIndex((x) => x);
  const dist = distribution(ti >= 0 ? norm(ti) : 0.5, pi >= 0 ? norm(pi) : null);
  // the distribution before the first turn stays as an outline (the "before" the bars reshape from)
  const turns0 = acts(ctx, 'turn');
  const normOf = (j: number) => clamp01((props.params[j].value.value - props.params[j].min) / Math.max(1e-9, props.params[j].max - props.params[j].min));
  const ghost = turns0.length ? distribution(ti >= 0 ? normOf(ti) : 0.5, pi >= 0 ? normOf(pi) : null) : null;
  const ghostE = turns0.length ? prog(ctx, turns0[0].at, P.label) : 0;
  const maxP = Math.max(...dist.p);
  const panelY = H * 0.66;
  const panelH = H * 0.26;
  const bw = Math.min(88, (W * 0.56) / LOGITS.length - 18);
  const bgap = 18;
  const totalBw = LOGITS.length * (bw + bgap) - bgap;
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`sm-${ctx.id}`} w={W} h={H} y={panelY - 20} color={C.violet} pool={0.1} opacity={ent} />
      {props.params.map((pr, i) => {
        const cx = W / 2 + ((n - 1) / 2 - i) * cellW;
        const b = ctx.at + Math.round((3 * i * ctx.fps) / 24);
        const e = prog(ctx, b, P.arrive);
        if (t < b) return null;
        const frac = norm(i);
        const a = A0 + (A1 - A0) * frac;
        const land = lastT[i] !== null ? pulse(t, lastT[i] as number, f24(ctx, 6)) : 0;
        const [kx, ky] = polar(cellW / 2, cy, r, a);
        const col = mix(C.signal, C.violet, 0);
        const widest = Math.max(pr.value.value, ...acts(ctx, 'turn').filter((x) => x.props.param === i).map((x) => (x.props.to as {value: number}).value));
        return (
          <div key={i} style={{position: 'absolute', left: cx - cellW / 2, top: 0, width: cellW, height: H, opacity: e}}>
            <svg width={cellW} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
              {/* dial housing: contact shadow, extruded side, glass face with a lit rim */}
              <ellipse cx={cellW / 2} cy={cy + r + 56} rx={r * 1.0} ry={r * 0.12} fill={C.void} fillOpacity={0.6} />
              <circle cx={cellW / 2} cy={cy + 10} r={r + 40} fill={mix(col, C.void, 0.8)} />
              <circle cx={cellW / 2} cy={cy} r={r + 40} fill={`${C.panel}F2`} stroke={`${C.ink}${hex(0.16)}`} strokeWidth={2} />
              <path d={arcPath(cellW / 2, cy, r + 39, 15, 95)} fill="none" stroke={C.ink} strokeOpacity={0.18} strokeWidth={3} strokeLinecap="round" />
              <path d={arcPath(cellW / 2, cy, r, A0, A1)} fill="none" stroke={C.grid} strokeWidth={24} strokeLinecap="round" />
              {frac > 0.004 ? (
                <>
                  <path d={arcPath(cellW / 2, cy, r, A0, a)} fill="none" stroke={col} strokeOpacity={0.2 + 0.2 * land} strokeWidth={24 + 14 + 10 * land} strokeLinecap="round" />
                  <path d={arcPath(cellW / 2, cy, r, A0, a)} fill="none" stroke={col} strokeWidth={20} strokeLinecap="round" />
                </>
              ) : null}
              {Array.from({length: 21}, (_, k) => {
                const ta = A0 + ((A1 - A0) * k) / 20;
                const major = k % 5 === 0;
                const [ax, ay] = polar(cellW / 2, cy, r + 17, ta);
                const [bx, by] = polar(cellW / 2, cy, r + (major ? 31 : 25), ta);
                return <path key={`tk${k}`} d={`M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}`} stroke={ta <= a + 0.01 ? col : C.ink3} strokeOpacity={ta <= a + 0.01 ? 0.9 : 0.7} strokeWidth={major ? 4 : 2.5} strokeLinecap="round" />;
              })}
              <circle cx={kx} cy={ky} r={22} fill={col} fillOpacity={0.2 + 0.2 * land} />
              <circle cx={kx} cy={ky} r={13} fill={C.ink} stroke={col} strokeWidth={5} />
            </svg>
            <div style={{position: 'absolute', left: 0, right: 0, top: cy - SIZE.numberBig * 0.3, display: 'flex', justifyContent: 'center'}}>
              <NumText id={`${ctx.id}:v${i}`} value={v[i]} target={widest} decimals={dec[i]} unit={pr.value.unit} maxW={r * 1.5} size={SIZE.numberBig * 0.55} color={C.ink} glow={land > 0 ? `0 0 ${(ctx.fx.glowPx * land).toFixed(1)}px ${col}${hex(0.6)}` : undefined} />
            </div>
            <div style={{position: 'absolute', left: 0, width: cellW, top: cy + r + 66, display: 'flex', justifyContent: 'center'}}>
              <Lbl id={`${ctx.id}:l${i}`} text={pr.label} maxW={cellW * 0.9} maxH={SIZE.body * 1.6} size={SIZE.body} fps={ctx.fps} color={C.ink} weight={FONT.label.strong} />
            </div>
          </div>
        );
      })}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={`M ${W / 2 - totalBw / 2 - 20} ${panelY + panelH} L ${W / 2 + totalBw / 2 + 20} ${panelY + panelH}`} stroke={C.grid} strokeWidth={3} strokeLinecap="round" opacity={ent} />
        {dist.p.map((pv, i) => {
          const be = prog(ctx, ctx.at + Math.round(((6 + i) * ctx.fps) / 24), P.label);
          const h = Math.max(4, pv * panelH);
          const x = W / 2 + totalBw / 2 - (i + 1) * bw - i * bgap; // most likely token on the right (reading start)
          const col = dist.kept[i] ? mix(C.violet, C.signal, Math.sqrt(pv / maxP)) : C.ink3;
          const gh = ghost ? Math.max(4, ghost.p[i] * panelH) : 0;
          return (
            <g key={i} opacity={be}>
              {ghost ? <rect x={x - 1} y={panelY + panelH - gh - 1} width={bw + 2} height={gh + 1} rx={9} fill="none" stroke={C.ink2} strokeOpacity={0.55 * ghostE} strokeWidth={2.5} strokeDasharray="10 8" /> : null}
              <rect x={x - 5} y={panelY + panelH - h - 5} width={bw + 10} height={h + 5} rx={10} fill={col} fillOpacity={dist.kept[i] ? 0.16 + 0.1 * (pv / maxP) : 0.06} />
              <rect x={x} y={panelY + panelH - h} width={bw} height={h} rx={8} fill={col} fillOpacity={dist.kept[i] ? 0.95 : 0.35} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
export const SamplingDial: DcComponent<Props> = {name: 'SamplingDial', Component: SamplingDialView, text: true, slot: 'full'};
