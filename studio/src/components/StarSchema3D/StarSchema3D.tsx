// StarSchema3D (catalog: Structure & flow). A fact table with dimension tables in 3D (04 section 6, "Semantic model & report":
// fact table at the centre, dimensions orbit). The fact is a glowing glass plate on a floor disc; each dimension is a glass plate on
// an orbit ring around it, seen from above in perspective (back plates smaller and higher, front plates larger and lower, depth sorted),
// joined to the fact by foreign-key wires. The plates are upright billboards (copy never rotates or skews), so every string stays a
// whole word at its right size; only positions, plate sizes and the depth cue move in 3D.
// Entrance (label preset from the layer anchor): the fact plate, then the dimensions staggered, each growing out to its orbit slot.
// Action (on the word that names it, 04 section 4 lead -2 f; RV1 = first visible step on the anchor frame):
//   focusDim -> the orbit turns (camera ease) until the named dimension is at the front, the plate grows, its key wire lights
//               in signal with a pulse, the other dimensions dim. A later focusDim hands over to the next dimension.
// 3D with a standard-tier fallback: this is projected DOM / SVG (no WebGL), so lite, standard and hero render the same geometry;
// the tier only changes the glow radii. The whole diagram auto-fits ctx.box as ONE unit: the smallest (back) plate title is never
// below 28 px (SIZE.labelMin), attribute rows are secondary microcopy (>= SIZE.secondaryMin), else DC_QA overflow (snapshot fails).
import React, {useMemo} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {MixedText} from '../../type/Text';
import {isArabic, lineHeightFor} from '../../type/arabic';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {glow, halo} from '../../fx/look';
import {reportQa} from '../../type/qa';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlyphIcon, Wire, acts, alpha, bornAt, dirOf, exitStyle, fitScale, line, march, mix, rectExit, roleOf, useMeasure} from '../_struct-a/kit';

type Ctx = DcProps<Props>['ctx'];
const nfc = (s: string) => s.normalize('NFC').trim();

/** Depth cue: the front of the ring is 1 + DEPTH times the nominal size, the back 1 - DEPTH. */
const DEPTH = 0.11;
const FOCUS_SCALE = 1.22;
const GAP = 16;

type Plate = {w: number; h: number};
type Rect = {x: number; y: number; w: number; h: number};

/** Focus timeline: one ring phase per state (phi = ring rotation, focus = dimension index or -1). */
const focusStates = (p: Props, ctx: Ctx, theta: number[]) => {
  const idx = new Map(p.dims.map((d, i) => [nfc(d.name), i]));
  const st: {t: number; phi: number; focus: number}[] = [{t: -1e9, phi: 0, focus: -1}];
  for (const a of acts(ctx, 'focusDim')) {
    const i = idx.get(nfc(a.props.name as string));
    if (i === undefined) continue;
    const prev = st[st.length - 1].phi;
    let tgt = -Math.PI / 2 - theta[i];
    tgt += Math.round((prev - tgt) / (2 * Math.PI)) * 2 * Math.PI; // shortest way round
    st.push({t: a.at, phi: tgt, focus: i});
  }
  return st;
};

export const StarSchema3DView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const D = props.dims.length;
  const fs0 = SIZE.body;
  const fa0 = Math.round(fs0 * 0.8);
  const items = [
    {text: props.fact.name, size: fs0},
    ...props.fact.measures.map((x) => ({text: x, size: fa0, weight: 500})),
    ...props.dims.flatMap((d) => [{text: d.name, size: fs0}, ...d.attrs.map((x) => ({text: x, size: fa0, weight: 500}))]),
  ];
  const m = useMeasure(ctx.id, items);
  const dir = dirOf([props.fact.name, ...props.fact.measures, ...props.dims.flatMap((d) => [d.name, ...d.attrs])]);
  const theta = useMemo(() => props.dims.map((_, i) => Math.PI / 2 - (2 * Math.PI * (i + 0.5)) / D), [D, props.dims]);
  const states = focusStates(props, ctx, theta);
  const stKey = states.map((s) => `${s.focus}:${s.phi.toFixed(3)}`).join('|');

  const geo = useMemo(() => {
    if (!m.w) return null;
    const w = m.w as number[];
    const padX = 24;
    const padY = 16;
    const hdr = Math.round(fs0 * 1.85);
    const row = Math.round(fa0 * 1.5);
    const iconW = Math.round(fs0 * 0.95);
    const mk = (nameW: number, rowW: number[]): Plate => ({w: Math.max(nameW + iconW + 14, (rowW.length ? Math.max(...rowW) : 0) + 34) + 2 * padX, h: hdr + rowW.length * row + 2 * padY});
    let k = 0;
    const factW = w[k++];
    const mw = props.fact.measures.map(() => w[k++]);
    const fact = mk(factW, mw);
    const dims = props.dims.map((d) => {
      const nw = w[k++];
      const aw = d.attrs.map(() => w[k++]);
      return mk(nw, aw);
    });
    const wMax = Math.max(...dims.map((q) => q.w));
    const hMax = Math.max(...dims.map((q) => q.h));
    const rect = (rx: number, ry: number, i: number, phi: number, focus: number, rho = 1): Rect => {
      const th = theta[i] + phi;
      const sn = Math.sin(th);
      const kk = 1 - DEPTH * sn;
      const f = i === focus ? FOCUS_SCALE : 1;
      const ww = dims[i].w * kk * f;
      const hh = dims[i].h * kk * f;
      return {x: rho * rx * Math.cos(th) - ww / 2, y: -rho * ry * sn - hh / 2, w: ww, h: hh};
    };
    const frect = (): Rect => ({x: -fact.w / 2, y: -fact.h / 2, w: fact.w, h: fact.h});
    const hit = (a: Rect, b: Rect) => a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
    const all = (rx: number, ry: number): Rect[][] => states.map((s) => [frect(), ...dims.map((_, i) => rect(rx, ry, i, s.phi, s.focus))]);
    const clash = (R: Rect[]) => {
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (hit(R[i], R[j])) return true;
      return false;
    };
    const bbox = (S: Rect[][]) => {
      const R = S.flat();
      const x0 = Math.min(...R.map((r) => r.x));
      const x1 = Math.max(...R.map((r) => r.x + r.w));
      const y0 = Math.min(...R.map((r) => r.y));
      const y1 = Math.max(...R.map((r) => r.y + r.h));
      return {x0, x1, y0, y1, w: x1 - x0, h: y1 - y0};
    };
    let rx = (fact.w + wMax) / 2 + 30;
    let ry = (fact.h + hMax) / 2 * 0.7;
    const aspect = ctx.box.w / ctx.box.h;
    for (let it = 0; it < 80; it++) {
      const S = all(rx, ry);
      if (!S.some(clash)) break;
      const b = bbox(S);
      const wide = b.w / b.h > aspect; // grow the axis with room first
      rx *= wide ? 1.015 : 1.05;
      ry *= wide ? 1.05 : 1.015;
    }
    const S = all(rx, ry);
    const residual = S.filter(clash).length;
    const b = bbox(S);
    const kMin = 1 - DEPTH;
    // the smallest plate (back of the ring) must still carry a >= 28 px title: the scale floor is labelMin / kMin
    const fit = fitScale(ctx.id, {w: b.w, h: b.h}, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin / kMin, 1.15);
    if (residual) reportQa('overflow', `${ctx.id}:overlap`, {states: residual});
    const s = fit.s;
    const cx = ctx.box.w / 2 - ((b.x0 + b.x1) / 2) * s;
    const cy = ctx.box.h / 2 - ((b.y0 + b.y1) / 2) * s;
    return {s, fit, rx, ry, cx, cy, fact, dims, hdr, row, padX, padY, iconW, overflow: fit.overflow || residual > 0, fs: fit.fs};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.w, props.fact, props.dims, ctx.box.w, ctx.box.h, ctx.id, stKey]);

  if (!geo) return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y}}>{m.node}</div>;

  const t = ctx.frame;
  const fps = ctx.fps;
  const lab = presetFrames('label', fps);
  const morph = presetFrames('morph', fps, true);
  const ff = flashFrames(fps);
  const s = geo.s;

  // ---- orbit state at t ----
  let kS = 0;
  for (let j = 0; j < states.length; j++) if (states[j].t <= t) kS = j;
  const cur = states[kS];
  const prev = states[Math.max(0, kS - 1)];
  const q = kS === 0 ? 1 : revealProgress(t - cur.t, morph, ease.camera);
  const phi = prev.phi + (cur.phi - prev.phi) * q;
  const fq = (i: number): number => {
    // focus level of dimension i (0..1): rises on the focusDim anchor, falls when the next focus takes over
    let v = 0;
    if (kS > 0 && cur.focus === i) v = q;
    else if (kS > 1 && prev.focus === i) v = 1 - q;
    return v;
  };
  const focusing = kS > 0;

  const born = [bornAt(ctx, 0, D + 1), ...props.dims.map((_, i) => bornAt(ctx, i + 1, D + 1))];
  const plates = props.dims.map((d, i) => {
    const th = theta[i] + phi;
    const sn = Math.sin(th);
    const kk = 1 - DEPTH * sn;
    const f = 1 + (FOCUS_SCALE - 1) * fq(i);
    const rho = 0.7 + 0.3 * revealProgress(t - born[i + 1], morph, ease.camera);
    const w = geo.dims[i].w * kk * f * s;
    const h = geo.dims[i].h * kk * f * s;
    return {i, d, sn, kk, f, w, h, x: geo.cx + rho * geo.rx * Math.cos(th) * s, y: geo.cy - rho * geo.ry * sn * s, fq: fq(i)};
  });
  const fx0 = geo.cx;
  const fy0 = geo.cy;
  const factR = {x: fx0, y: fy0, w: geo.fact.w * s, h: geo.fact.h * s};
  const order = [...plates].sort((a, b) => b.sn - a.sn || a.i - b.i);
  const period = Math.round(1.8 * fps);
  const dimK = focusing ? 0.42 : 0; // dim level of the dimensions that are not the subject

  const renderPlate = (key: string, id: string, title: string, rows: string[], w: number, h: number, x: number, y: number, kk: number, accent: string, fact: boolean, lit: number, dim: number, bornT: number) => {
    // rendered below 56 px: above it MixedText switches to the display face, whose widths differ from the measured ones
    const fsT = Math.min(55, fs0 * s * kk);
    const fsR = Math.min(55, fa0 * s * kk);
    const hdr = geo.hdr * s * kk;
    const row = geo.row * s * kk;
    const rv = revealStyle(t - bornT, fps, 'label', dirOf([title]));
    const col = mix(mix(C.ink3, accent, fact ? 0.9 : 0.55), C.signal, lit);
    const k = (fact ? 0.55 : 0.2) + lit * 0.9;
    const ink = mix(C.ink, C.ground, dim);
    const ink2 = mix(C.ink2, C.ground, dim);
    return (
      <div
        key={key}
        dir={dir}
        style={{
          position: 'absolute',
          left: x - w / 2,
          top: y - h / 2,
          width: w,
          height: h,
          boxSizing: 'border-box',
          borderRadius: Math.round(fsT * 0.5),
          background: `linear-gradient(180deg, ${alpha(C.panel, 0.96)} 0%, ${alpha(C.ground, 0.93)} 100%)`,
          border: `${Math.max(1.5, 2.2 * s * kk)}px solid ${col}`,
          boxShadow: `inset 0 1px 0 ${alpha(C.ink, 0.14)}, inset 0 0 0 999px ${alpha(col, 0.05 + 0.08 * lit + (fact ? 0.04 : 0))}, ${glow(col, ctx.fx, k)}, 0 ${Math.round(18 * s * kk)}px ${Math.round(40 * s * kk)}px ${alpha(C.void, 0.55)}`,
          outline: geo.overflow ? `2px dashed ${C.crit}` : undefined,
          padding: `${geo.padY * s * kk}px ${geo.padX * s * kk}px`,
          display: 'flex',
          flexDirection: 'column',
          ...rv.style,
        }}
      >
        <div style={{height: hdr, display: 'flex', alignItems: 'center', gap: fsT * 0.35, borderBottom: `1px solid ${alpha(col, 0.45)}`, marginBottom: 0}}>
          <div style={{width: geo.iconW * s * kk, height: geo.iconW * s * kk, flex: 'none'}}>
            <GlyphIcon g={fact ? 'bars' : 'table'} color={col} />
          </div>
          <div style={{width: 'max-content', whiteSpace: 'nowrap', fontSize: fsT, lineHeight: lineHeightFor(title), color: ink, textShadow: halo}}>
            <MixedText id={`${ctx.id}:${id}`} text={title} size={fsT} weight={FONT.label.strong} role={roleOf(title)} />
          </div>
        </div>
        {rows.map((r, j) => (
          <div key={j} style={{height: row, display: 'flex', alignItems: 'center', gap: fsR * 0.45}}>
            <div style={{width: fsR * 0.3, height: fsR * 0.3, borderRadius: '50%', background: fact ? mix(accent, ink, 0.2) : mix(C.ink3, accent, 0.6), flex: 'none', opacity: 0.9 - 0.5 * dim}} />
            <div style={{width: 'max-content', whiteSpace: 'nowrap', fontSize: fsR, lineHeight: lineHeightFor(r), color: ink2, textShadow: halo}}>
              <MixedText id={`${ctx.id}:${id}:r${j}`} text={r} size={fsR} weight={500} role={isArabic(r) ? 'sentence' : 'data'} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // floor ring (perspective ellipse under the orbit) + soft disc under the fact
  const ringA = revealProgress(t - born[0], morph, ease.camera);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <radialGradient id={`${ctx.id}-disc`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={C.signal} stopOpacity={0.2} />
            <stop offset="100%" stopColor={C.signal} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={fx0} cy={fy0} rx={geo.rx * s * 1.04 * ringA} ry={geo.ry * s * 1.04 * ringA} fill={`url(#${ctx.id}-disc)`} />
        <ellipse cx={fx0} cy={fy0} rx={geo.rx * s * ringA} ry={geo.ry * s * ringA} fill="none" stroke={C.violet} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="14 10" />
        <ellipse cx={fx0} cy={fy0} rx={geo.rx * s * 0.55 * ringA} ry={geo.ry * s * 0.55 * ringA} fill="none" stroke={C.violet} strokeOpacity={0.16} strokeWidth={1.5} />
        {plates.map((p) => {
          const bornD = born[p.i + 1];
          const grow = revealProgress(t - bornD - 1, lab, ease.camera);
          const a = {x: fx0, y: fy0};
          const b = {x: p.x, y: p.y};
          const c0 = rectExit(a, factR, b, 6);
          const c1 = rectExit(b, p, a, 6);
          const cub = line(c0, c1);
          const hot = p.fq;
          const col = mix(C.ink3, C.signal, hot);
          return (
            <Wire
              key={`w${p.i}`}
              c={cub}
              p={grow}
              color={col}
              width={(2.2 + 1.6 * hot) * s}
              opacity={0.55 + 0.4 * hot - (focusing && hot < 0.01 ? 0.25 : 0)}
              glowPx={hot > 0.05 ? ctx.fx.glowInner * hot : 0}
              pulses={grow >= 1 ? march(t, period, hot > 0.3 ? 2 : 1, (p.i * 0.29) % 1) : undefined}
              pulseR={(3 + 2 * hot) * s}
              arrow={false}
            />
          );
        })}
      </svg>
      {order
        .filter((p) => p.sn >= 0)
        .map((p) => renderPlate(`d${p.i}`, `d${p.i}`, p.d.name, p.d.attrs, p.w, p.h, p.x, p.y, p.kk * p.f, C.violet, false, p.fq, Math.min(0.6, dimK * (1 - p.fq) + 0.24 * Math.max(0, p.sn) * (1 - p.fq)), born[p.i + 1]))}
      {renderPlate('fact', 'fact', props.fact.name, props.fact.measures, factR.w, factR.h, fx0, fy0, 1, C.signal, true, 0, 0, born[0])}
      {order
        .filter((p) => p.sn < 0)
        .map((p) => renderPlate(`d${p.i}`, `d${p.i}`, p.d.name, p.d.attrs, p.w, p.h, p.x, p.y, p.kk * p.f, C.violet, false, p.fq, Math.min(0.6, dimK * (1 - p.fq) + 0.24 * Math.max(0, p.sn) * (1 - p.fq)), born[p.i + 1]))}
      {/* focus flash on the plate that arrives at the front (impact flash window of the anchor) */}
      {focusing && t - cur.t < ff * 3 && cur.focus >= 0 ? (
        <div
          style={{
            position: 'absolute',
            left: plates[cur.focus].x - plates[cur.focus].w / 2,
            top: plates[cur.focus].y - plates[cur.focus].h / 2,
            width: plates[cur.focus].w,
            height: plates[cur.focus].h,
            borderRadius: Math.round(fs0 * s * 0.5),
            boxShadow: glow(C.signal, ctx.fx, (1 - (t - cur.t) / (ff * 3)) * 1.1),
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </div>
  );
};

export const StarSchema3D: DcComponent<Props> = {name: 'StarSchema3D', Component: StarSchema3DView, text: true, slot: 'full'};
