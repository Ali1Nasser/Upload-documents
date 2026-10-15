// PipelineStations (catalog: Structure & flow). A payload travelling through 2-8 stations (04 section 6: ETL/ELT pipeline stations,
// CI/CD gated pipeline, DataCube model-build stages). Stations are glowing gate rings on an emissive track (RTL when the copy is
// Arabic: the first station on the right, the payload travels right -> left); each label sits under its gate on one baseline
// (>= 40 px apart, AT-4; long labels alternate between two rows). The payload is a glass capsule riding above the track.
// Entrance: the track draws, gates stagger in, then the payload lands on the first station (label preset from the layer anchor).
// Actions (on the word that names them, 04 section 4 lead -2 f; RV1 = first visible step on the anchor frame):
//   advance -> the capsule travels to station `to` (camera ease; marching light on the track behind it); every station it
//              passes turns ok (processed), the station it rests on glows signal (processing);
//   fail    -> the station turns crit with a cross glyph, impact flash and the failure shake (the only hard motion, 04 section 3.5);
//              the capsule turns crit if it is there; the optional `reason` appears under the station on a crit chip;
//   fix     -> the station settles to ok (check glyph, one expanding ok ring), the reason chip fades, the capsule recovers.
// The whole diagram auto-fits ctx.box as one unit (labels >= 28 px, SIZE.labelMin), else DC_QA overflow (snapshot fails).
import React, {useMemo} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {MixedText} from '../../type/Text';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {glow, halo} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, GlyphIcon, acts, alpha, bornAt, dirOf, exitStyle, fitScale, mix, shake, useMeasure, type Glyph} from '../_struct-a/kit';

type Ctx = DcProps<Props>['ctx'];

/** Payload index (fractional while travelling) at frame t, plus the travel segments. */
const travel = (p: Props, ctx: Ctx, t: number, startT: number) => {
  const idx = new Map(p.stations.map((q, i) => [q.id, i]));
  let from = 0;
  let pos = 0;
  let moving = false;
  const fps = ctx.fps;
  for (const a of acts(ctx, 'advance')) {
    const to = idx.get(a.props.to as string);
    if (to === undefined || t < a.at) continue;
    const dur = Math.max(presetFrames('morph', fps, true), Math.round(presetFrames('morph', fps) * Math.min(2.5, Math.abs(to - from))));
    const q = revealProgress(t - a.at, dur, ease.camera);
    pos = from + (to - from) * q;
    moving = q < 1;
    if (q >= 1) from = to;
  }
  return {pos: t < startT ? 0 : pos, moving};
};

type FailSt = {failQ: number; failSince: number; fixQ: number; fixSince: number; reason?: string};
const failStates = (p: Props, ctx: Ctx, t: number): FailSt[] => {
  const st: FailSt[] = p.stations.map(() => ({failQ: 0, failSince: -1, fixQ: 0, fixSince: -1}));
  const idx = new Map(p.stations.map((q, i) => [q.id, i]));
  const lab = presetFrames('label', ctx.fps);
  const evs = [...acts(ctx, 'fail').map((a) => ({a, k: 'fail' as const})), ...acts(ctx, 'fix').map((a) => ({a, k: 'fix' as const}))].sort((x, y) => x.a.at - y.a.at || x.a.li - y.a.li);
  for (const {a, k} of evs) {
    const i = idx.get(a.props.at as string);
    if (i === undefined || t < a.at) continue;
    if (k === 'fail') st[i] = {failQ: revealProgress(t - a.at, lab), failSince: t - a.at, fixQ: 0, fixSince: -1, reason: a.props.reason as string | undefined};
    else st[i] = {...st[i], fixQ: revealProgress(t - a.at, lab), fixSince: t - a.at};
  }
  return st;
};

export const PipelineStationsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const N = props.stations.length;
  const fs0 = SIZE.body;
  const reasons = acts(ctx, 'fail').map((a) => (a.props.reason as string | undefined) ?? '').filter(Boolean);
  const items = [...props.stations.map((q) => ({text: q.label, size: fs0})), {text: props.payload, size: fs0}, ...reasons.map((r) => ({text: r, size: Math.round(fs0 * 0.85), weight: 500}))];
  const m = useMeasure(ctx.id, items);
  const dir = dirOf([...props.stations.map((q) => q.label), props.payload]);
  const rtl = dir === 'rtl';

  const geo = useMemo(() => {
    if (!m.w) return null;
    const w = m.w as number[];
    const lw = w.slice(0, N);
    const gateR = fs0 * 1.45;
    const capH = Math.round(fs0 * 2.2);
    const capW = w[N] + fs0 * 1.6 + capH * 0.8;
    const rw = w.slice(N + 1);
    const reasonW = rw.length ? Math.max(...rw) + fs0 * 1.6 : 0;
    const rowH = fs0 * 1.7;
    const reasonH = rw.length ? fs0 * 2.2 : 0;
    // one label row (labels >= 40 px apart) or two alternating rows: take the layout that allows the larger scale
    const cand = [1, 2].map((rows) => {
      const need = rows === 1 ? Math.max(...lw) + 40 : Math.max(...lw.slice(0, -1).map((x, i) => (x + lw[i + 1]) / 2)) / 2 + 40;
      const d0 = Math.max(need, gateR * 3.2, rows === 1 ? 0 : (Math.max(...lw) + 40) / 2);
      const edge = Math.max(lw[0], lw[N - 1], capW, reasonW, gateR * 2);
      const nat = {w: d0 * (N - 1) + edge, h: capH + fs0 * 0.6 + 2 * gateR + fs0 * 0.7 + rows * rowH + reasonH};
      const s = Math.min(1.3, ctx.box.w / nat.w, ctx.box.h / nat.h);
      return {rows, d0, edge, nat, s};
    });
    const pick = cand[1].s > cand[0].s * 1.08 && cand[0].s * fs0 < SIZE.body ? cand[1] : cand[0];
    const fit = fitScale(ctx.id, pick.nat, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin, 1.3);
    const s = fit.s;
    const d = Math.min((ctx.box.w - pick.edge * s) / Math.max(1, N - 1), pick.d0 * s * 2.6);
    const trackW = d * (N - 1);
    const x0 = (ctx.box.w - trackW) / 2;
    const top = (ctx.box.h - pick.nat.h * s) / 2;
    const yTrack = top + (capH + fs0 * 0.6 + gateR) * s;
    const xs = props.stations.map((_, i) => (rtl ? x0 + trackW - i * d : x0 + i * d));
    return {
      s,
      fs: fit.fs,
      overflow: fit.overflow,
      xs,
      d,
      yTrack,
      gateR: gateR * s,
      capH: capH * s,
      capW: capW * s,
      yCap: top + (capH / 2) * s,
      rows: pick.rows,
      yLabel: yTrack + (gateR + fs0 * 0.7) * s,
      rowH: rowH * s,
      yReason: yTrack + (gateR + fs0 * 0.7 + pick.rows * rowH + fs0 * 1.1) * s,
      reasonH: fs0 * 1.6 * s,
      rw,
      lw,
    };
  }, [m.w, props.stations, N, ctx.box.w, ctx.box.h, ctx.id, rtl, fs0]);

  if (!geo) return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y}}>{m.node}</div>;

  const t = ctx.frame;
  const fps = ctx.fps;
  const lab = presetFrames('label', fps);
  const arr = presetFrames('arrive', fps);
  const ff = flashFrames(fps);
  const born = props.stations.map((_, i) => bornAt(ctx, i + 1, N + 2));
  const capBorn = bornAt(ctx, N + 1, N + 2);
  const trackP = revealProgress(t - ctx.at, Math.max(arr, born[N - 1] - ctx.at + lab), ease.camera);
  const {pos, moving} = travel(props, ctx, t, capBorn);
  const fails = failStates(props, ctx, t);
  const xAt = (u: number) => {
    const i = Math.max(0, Math.min(N - 1, Math.floor(u)));
    const f = u - i;
    return i >= N - 1 ? geo.xs[N - 1] : geo.xs[i] + (geo.xs[i + 1] - geo.xs[i]) * f;
  };
  const capX = xAt(pos);
  const restIdx = moving ? -1 : Math.round(pos);
  const capFail = restIdx >= 0 ? fails[restIdx] : null;
  const capCrit = capFail ? capFail.failQ * (1 - capFail.fixQ) : 0;
  const period = Math.round(1.2 * fps);
  const dash = 14 * geo.s;
  const flowOff = ((t / period) * dash * 2) % (dash * 2);
  const x0 = geo.xs[0];
  const xN = geo.xs[N - 1];
  const tx = Math.min(x0, xN);
  const tw = Math.abs(xN - x0);

  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {/* track: dim rail drawn from the first station, the processed part glows ok with a marching flow */}
        <line
          x1={x0}
          y1={geo.yTrack}
          x2={x0 + (xN - x0) * trackP}
          y2={geo.yTrack}
          stroke={C.grid}
          strokeWidth={6 * geo.s}
          strokeLinecap="round"
        />
        <line x1={x0} y1={geo.yTrack} x2={x0 + (xN - x0) * trackP} y2={geo.yTrack} stroke={C.ink3} strokeOpacity={0.5} strokeWidth={2 * geo.s} strokeLinecap="round" />
        {t >= capBorn && pos > 0 ? (
          <>
            <line x1={x0} y1={geo.yTrack} x2={capX} y2={geo.yTrack} stroke={C.ok} strokeOpacity={0.35} strokeWidth={10 * geo.s} strokeLinecap="round" />
            <line
              x1={x0}
              y1={geo.yTrack}
              x2={capX}
              y2={geo.yTrack}
              stroke={C.ok}
              strokeWidth={3 * geo.s}
              strokeDasharray={`${dash} ${dash}`}
              strokeDashoffset={rtl ? flowOff : -flowOff}
              strokeLinecap="round"
            />
          </>
        ) : null}
        {/* capsule tether to the track */}
        {t >= capBorn ? <line x1={capX} y1={geo.yCap + geo.capH / 2} x2={capX} y2={geo.yTrack - geo.gateR} stroke={mix(C.signal, C.crit, capCrit)} strokeOpacity={0.6} strokeWidth={2 * geo.s} strokeDasharray={`${4 * geo.s} ${4 * geo.s}`} /> : null}
        {props.stations.map((st, i) => {
          const f = fails[i];
          const q = revealProgress(t - born[i], lab);
          if (q <= 0) return null;
          const done = t >= capBorn && pos >= i - 0.02 && restIdx !== i ? 1 : 0;
          const active = restIdx === i && t >= capBorn ? revealProgress(t - capBorn, lab) : 0;
          let col = mix(C.ink3, C.ok, done);
          col = mix(col, C.signal, active);
          col = mix(col, C.crit, f.failQ);
          col = mix(col, C.ok, f.fixQ);
          const dx = f.failSince >= 0 && f.fixSince < 0 ? shake(f.failSince, fps, `${ctx.id}:${st.id}`) : 0;
          const ring = f.fixSince >= 0 ? revealProgress(f.fixSince, presetFrames('morph', fps, true)) : 0;
          const x = geo.xs[i] + dx;
          return (
            <g key={st.id} opacity={q}>
              <ellipse cx={x} cy={geo.yTrack + geo.gateR * 1.3} rx={geo.gateR * 1.15} ry={geo.gateR * 0.22} fill={col} fillOpacity={0.1 + 0.16 * Math.max(active, f.failQ, done * 0.5)} />
              <circle cx={x} cy={geo.yTrack} r={geo.gateR * 1.16} fill="none" stroke={col} strokeOpacity={0.3} strokeWidth={1.5 * geo.s} />
              <circle cx={x} cy={geo.yTrack} r={geo.gateR} fill={C.panel} fillOpacity={0.92} stroke={col} strokeWidth={3 * geo.s} />
              <circle cx={x} cy={geo.yTrack} r={geo.gateR * 0.78} fill={col} fillOpacity={0.1 + 0.12 * Math.max(active, f.failQ, done * 0.5)} stroke={col} strokeOpacity={0.35} strokeWidth={1.5 * geo.s} />
              {ring > 0 && ring < 1 ? <circle cx={x} cy={geo.yTrack} r={geo.gateR * (1 + ring * 0.9)} fill="none" stroke={C.ok} strokeWidth={3 * geo.s} opacity={1 - ring} /> : null}
            </g>
          );
        })}
      </svg>
      {/* gate glows + glyphs (DOM, so the tier glow radii apply) */}
      {props.stations.map((st, i) => {
        const f = fails[i];
        const q = revealProgress(t - born[i], lab);
        if (q <= 0) return null;
        const done = t >= capBorn && pos >= i - 0.02 && restIdx !== i;
        const active = restIdx === i && t >= capBorn;
        const failed = f.failQ > 0 && f.fixQ <= 0;
        const g: Glyph = f.fixQ > 0 ? 'check' : failed ? 'cross' : done ? 'check' : active ? 'spin' : 'dot';
        const col = f.fixQ > 0 ? C.ok : failed ? C.crit : done ? C.ok : active ? C.signal : C.ink3;
        const flash = f.failSince >= 0 && f.fixSince < 0 ? (f.failSince < ff ? 1 : Math.max(0, 1 - (f.failSince - ff) / (3 * ff))) : 0;
        const k = (active ? 0.8 : failed ? 0.7 : done || f.fixQ > 0 ? 0.45 : 0) + flash * 1.3;
        const dx = f.failSince >= 0 && f.fixSince < 0 ? shake(f.failSince, fps, `${ctx.id}:${st.id}`) : 0;
        const R = geo.gateR;
        return (
          <div key={`g${st.id}`} style={{position: 'absolute', left: geo.xs[i] + dx - R, top: geo.yTrack - R, width: 2 * R, height: 2 * R, borderRadius: '50%', boxShadow: k > 0 ? glow(col, ctx.fx, k) : undefined, opacity: q, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{width: R * 0.95, height: R * 0.95}}>
              <GlyphIcon g={g} color={col} turn={active ? ((t - capBorn) / fps) % 1 : 0} />
            </div>
          </div>
        );
      })}
      {props.stations.map((st, i) => {
        const rv = revealStyle(t - born[i], fps, 'label', dirOf([st.label]));
        const row = geo.rows === 2 ? i % 2 : 0;
        const active = restIdx === i && t >= capBorn;
        return (
          <div
            key={`l${st.id}`}
            style={{
              position: 'absolute',
              left: geo.xs[i] - ((geo.lw[i] * geo.s) / 2 + 4),
              width: geo.lw[i] * geo.s + 8,
              top: geo.yLabel + row * geo.rowH,
              display: 'flex',
              justifyContent: 'center',
              fontSize: geo.fs,
              color: active ? C.ink : C.ink2,
              textShadow: halo,
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
              outline: geo.overflow ? `2px dashed ${C.crit}` : undefined,
              ...rv.style,
            }}
          >
            <MixedText id={`${ctx.id}:${st.id}`} text={st.label} size={geo.fs} weight={FONT.label.strong} />
          </div>
        );
      })}
      {props.stations.map((st, i) => {
        const f = fails[i];
        if (!f.reason || f.failSince < 0) return null;
        const rq = 1 - f.fixQ;
        if (rq <= 0) return null;
        const rv = revealStyle(f.failSince, fps, 'label', dirOf([f.reason]));
        const k = reasons.indexOf(f.reason);
        const fsr = Math.max(SIZE.labelMin, geo.fs * 0.85);
        const w = (geo.rw[k] ?? 0) * (fsr / (SIZE.body * 0.85)) + fsr * 1.6;
        const x = Math.max(w / 2, Math.min(ctx.box.w - w / 2, geo.xs[i]));
        return (
          <Chip
            key={`r${st.id}`}
            id={`${ctx.id}:${st.id}:reason`}
            text={f.reason}
            x={x}
            y={geo.yReason}
            w={w}
            h={geo.reasonH}
            fs={fsr}
            color={C.crit}
            glowK={0.35}
            fill={0.12}
            fx={ctx.fx}
            weight={500}
            reveal={{...rv.style, opacity: (typeof rv.style.opacity === 'number' ? rv.style.opacity : 1) * rq}}
          />
        );
      })}
      {t >= capBorn ? (
        <Chip
          id={`${ctx.id}:payload`}
          text={props.payload}
          x={capX}
          y={geo.yCap}
          w={geo.capW}
          h={geo.capH}
          fs={geo.fs}
          color={mix(C.signal, C.crit, capCrit)}
          glowK={0.8 + (moving ? 0.3 : 0)}
          fill={0.14}
          fx={ctx.fx}
          radius={geo.capH / 2}
          icon={<GlyphIcon g="db" color={mix(C.signal, C.crit, capCrit)} />}
          dir={dir}
          reveal={revealStyle(t - capBorn, fps, 'label', dirOf([props.payload])).style}
        />
      ) : null}
      {/* haze under the track (decorative neutral, low alpha) */}
      <div style={{position: 'absolute', left: tx, width: tw, top: geo.yTrack - 2, height: 4, boxShadow: `0 0 ${ctx.fx.glowPx}px ${alpha(C.signal, 0.25)}`, opacity: trackP}} />
    </div>
  );
};

export const PipelineStations: DcComponent<Props> = {name: 'PipelineStations', Component: PipelineStationsView, text: true, slot: 'full'};
