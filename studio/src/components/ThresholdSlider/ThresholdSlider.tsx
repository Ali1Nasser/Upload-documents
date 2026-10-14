// ThresholdSlider (catalog: Data; 04 section 6 "Model families & evaluation": threshold slider; testing gate p95). A horizontal scale
// (math axis, always LTR) split into status zones (ok / warn / fail colours, semantic only; the part of the scale past the last zone
// is idle) with a handle at `value`. The readout above the handle shows the value (mono tabular, unit in the same isolate) in the
// colour of the zone it is in, with a status glyph (check / bar / cross drawn as shapes: no component-owned words). The zone the
// handle sits in is lit, the others are dimmed, so crossing a boundary visibly flips the state. The scale draws from the layer
// anchor (label preset), the handle arrives (arrive preset). `moveTo` (state change on its word) slides the handle and rolls the
// readout from the current value to the new one (count preset: first step on the anchor frame, lands on the word end), then flashes.
// Zone boundaries (`upto`) are printed under the scale: a zone has no ref in the frozen schema (CR-006), the scene must speak them.
// The label is placed at the reading start (right in Arabic). Every readout number is the prop Num (value + ref) or the moveTo Num.
import React from 'react';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {C, GAP, Lbl, NumText, Plate, SIZE, STATUS, Shell, flashAt, fmt, landOf, acts, probeLabels, probeNums, prog, roll, rtlOf, srcDecimals, tint, useFitProbe} from '../_data/kit';
import type {StatusT} from '../_data/kit';

export const ThresholdSliderView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w: W, h: H} = ctx.box;
  const rtl = rtlOf(props.label);
  const pad = 36;
  const side = 56;
  const x0 = pad + side;
  const x1 = W - pad - side;
  const span = Math.max(1e-9, props.max - props.min);
  const px = (v: number) => x0 + ((Math.max(props.min, Math.min(props.max, v)) - props.min) / span) * (x1 - x0);
  const zones = props.zones ?? [];
  const mv = acts(ctx, 'moveTo');
  const decs = Math.max(props.value.decimals ?? srcDecimals(props.value.value), ...mv.map((a) => srcDecimals((a.props.value as {value: number}).value)));

  // ---- value timeline: the handle sits at `value` from the anchor, then one move per action ----
  let v = props.value.value;
  let vmap: Props['value'] = props.value;
  let landedAt: number | null = ctx.at + 2;
  for (const a of mv) {
    const to = a.props.value as Props['value'];
    if (a.at <= t) {
      v = roll(t, a.at, landOf(ctx, a), vmap.value, to.value);
      landedAt = t >= landOf(ctx, a) ? landOf(ctx, a) : null;
      if (t >= landOf(ctx, a)) vmap = to;
    } else break;
  }
  const zoneOf = (x: number): {i: number; status: StatusT} => {
    for (let i = 0; i < zones.length; i++) if (x <= zones[i].upto) return {i, status: zones[i].status};
    return {i: -1, status: 'idle'};
  };
  const z = zoneOf(v);
  const col = C[STATUS[z.status]];
  const fl = flashAt(ctx, landedAt);

  // ---- fits ----
  const fLab = useFitProbe(`${ctx.id}:label`, SIZE.body, W - 2 * pad - 200, (fs) => probeLabels([props.label], fs), props.label);
  const texts = [props.value, ...mv.map((a) => a.props.value as Props['value'])].map((n) => fmt(n.value, decs) + (n.unit ? ` ${n.unit}` : ''));
  const fVal = useFitProbe(`${ctx.id}:val`, SIZE.kinetic, W * 0.4, (fs) => probeNums(texts, fs), texts.join('|'), {min: Math.round(SIZE.kinetic * 0.5)});
  const bounds = zones.slice(0, -1).map((zn) => zn.upto);
  const bTexts = bounds.map((b) => fmt(b, srcDecimals(b)));
  const fTick = useFitProbe(`${ctx.id}:ticks`, SIZE.label, Math.max(60, (x1 - x0) / Math.max(2, bounds.length + 1) - GAP), (fs) => probeNums(bTexts.length ? bTexts : ['0'], fs), bTexts.join('|'));

  const trackY = Math.round(H * 0.66);
  const th = 30;
  const head = prog(ctx, ctx.at, 'label');
  const hq = prog(ctx, ctx.at, 'arrive');
  const hx = px(v);
  const glyph = (s: StatusT, c: string, size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      {s === 'ok' ? <polyline points="4,13 10,19 20,6" /> : s === 'fail' ? <path d="M5 5 L19 19 M19 5 L5 19" /> : s === 'warn' ? <path d="M12 3 L22 20 L2 20 Z M12 10 V14 M12 17 V17.5" /> : <circle cx="12" cy="12" r="6" />}
    </svg>
  );
  // zone bands: [lo, hi] per zone; the remainder up to max is idle
  const bands = zones.map((zn, i) => ({i, lo: i === 0 ? props.min : zones[i - 1].upto, hi: Math.min(props.max, zn.upto), status: zn.status}));
  const lastHi = zones.length ? Math.min(props.max, zones[zones.length - 1].upto) : props.min;
  const readX = Math.max(pad + fVal.size * 2.2, Math.min(W - pad - fVal.size * 2.2, hx));
  return (
    <Shell ctx={ctx}>
      {fLab.probe}
      {fVal.probe}
      {fTick.probe}
      <Plate style={{position: 'absolute', inset: 0, opacity: head}} />
      <div style={{position: 'absolute', top: pad, [rtl ? 'right' : 'left']: pad + 8, opacity: head}}>
        <Lbl id={`${ctx.id}:label`} text={props.label} size={fLab.size} color={C.ink2} overflow={fLab.overflow} />
      </div>
      {/* readout above the handle */}
      <div style={{position: 'absolute', left: readX, top: trackY - th - Math.round(fVal.size * 1.9), transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 18, direction: 'ltr', opacity: hq}}>
        {glyph(z.status, col, Math.round(fVal.size * 0.6))}
        <NumText id={`${ctx.id}:val`} text={fmt(v, decs)} unit={props.value.unit} size={fVal.size} color={col} fx={ctx.fx} glowK={0.5 + 1.1 * fl + ctx.mod.glow} ca />
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <clipPath id={`${ctx.id}-clip`}>
            <rect x={x0 - 4} y={trackY - th / 2} width={(x1 - x0 + 8) * head} height={th} rx={th / 2} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${ctx.id}-clip)`}>
          <rect x={x0} y={trackY - th / 2} width={x1 - x0} height={th} fill={tint(C.grid, 0.9)} />
          {bands.map((b) => {
            const lit = b.i === z.i;
            const c = C[STATUS[b.status]];
            return <rect key={b.i} x={px(b.lo)} y={trackY - th / 2} width={Math.max(0, px(b.hi) - px(b.lo))} height={th} fill={tint(c, lit ? 0.9 : 0.28)} />;
          })}
          {lastHi < props.max ? <rect x={px(lastHi)} y={trackY - th / 2} width={px(props.max) - px(lastHi)} height={th} fill={tint(C.ink3, 0.3)} /> : null}
        </g>
        {bounds.map((b, i) => (
          <line key={i} x1={px(b)} x2={px(b)} y1={trackY - th / 2 - 14} y2={trackY + th / 2 + 14} stroke={C.ink2} strokeWidth={3} opacity={head} />
        ))}
        {/* handle: a vertical bar with a round cap and a soft emissive halo (no filter: translucent discs) */}
        <g opacity={hq}>
          <circle cx={hx} cy={trackY} r={34 + 8 * fl} fill={tint(col, 0.14 + 0.18 * fl)} />
          <line x1={hx} x2={hx} y1={trackY - th / 2 - 22} y2={trackY + th / 2 + 22} stroke={col} strokeWidth={6} strokeLinecap="round" />
          <circle cx={hx} cy={trackY} r={20} fill={C.ground} stroke={col} strokeWidth={5} />
          <circle cx={hx} cy={trackY} r={8} fill={col} />
        </g>
      </svg>
      {bounds.map((b, i) => (
        <div key={i} style={{position: 'absolute', left: px(b), top: trackY + th / 2 + 26, transform: 'translateX(-50%)', opacity: head}}>
          <NumText id={`${ctx.id}:b${i}`} text={bTexts[i]} size={fTick.size} color={C.ink2} />
        </div>
      ))}
    </Shell>
  );
};

export const ThresholdSlider: DcComponent<Props> = {name: 'ThresholdSlider', Component: ThresholdSliderView, text: true, slot: 'center'};
