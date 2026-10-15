// IdempotentStamp (catalog: Domain specials; 04 section 6 "DAG, retries, idempotency": retry duplicates rows; idempotent upsert =
// the stamp lands ONCE). Delivery packets, each carrying the same idempotency key (key chip from props, Latin code isolate),
// fly from the sender (start side, right) to a ledger page (end side, left). The FIRST delivery slams the seal on the page
// (impact preset: scale 1.08 -> 1 + a 2-frame flash, ok). Every later delivery with the same key arrives, meets the seal, is
// recognised (a warn ring pulses once around the seal) and rebounds: the page never gets a second seal. Under the page a row
// of pips counts the deliveries (ok = stamped, warn ring = absorbed duplicate): no digits, the counts are structural.
//   no `replay` action : all `attempts` deliveries run on their own, one every 16 film frames from the layer anchor.
//   `replay` (n times) : the first delivery runs on the layer anchor; each replay sends the duplicates again (attempts - 1,
//                        at least one) 6 film frames apart from the replay word.
// DOM + SVG only (standard tier).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Dot, Floor, Lbl, acrylic, acts, boxStyle, f24, mix, pf, prog, pulse, shell} from '../_dom-c/kit';

export type Delivery = {send: number; first: boolean};
export const deliveries = (attempts: number, ctx: DcProps<Props>['ctx']): Delivery[] => {
  const reps = acts(ctx, 'replay');
  if (reps.length === 0) return Array.from({length: attempts}, (_, i) => ({send: ctx.at + i * f24(ctx, 16), first: i === 0}));
  const out: Delivery[] = [{send: ctx.at, first: true}];
  for (const r of reps) for (let d = 0; d < Math.max(1, attempts - 1); d++) out.push({send: r.at + d * f24(ctx, 6), first: false});
  return out;
};

const KeyGlyph: React.FC<{x: number; y: number; s: number; color: string}> = ({x, y, s, color}) => (
  <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={-s * 0.28} cy={0} r={s * 0.22} />
    <path d={`M ${-s * 0.06} 0 L ${s * 0.42} 0 M ${s * 0.26} 0 L ${s * 0.26} ${s * 0.16} M ${s * 0.42} 0 L ${s * 0.42} ${s * 0.12}`} />
  </g>
);

export const IdempotentStampView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const W = ctx.box.w;
  const H = ctx.box.h;
  const dl = deliveries(props.attempts, ctx);
  const travel = f24(ctx, 10);
  const ent = prog(ctx, ctx.at, P.arrive);
  const pageW = Math.min(W * 0.34, 600);
  const pageH = Math.round(H * 0.56);
  const pageX = W * 0.1;
  const pageY = H * 0.3;
  const sealR = Math.min(pageW, pageH) * 0.28;
  const sealC: [number, number] = [pageX + pageW / 2, pageY + pageH * 0.46];
  const laneY = sealC[1];
  const x0 = W * 0.92;
  const hitX = pageX + pageW + 6;
  const chipW = Math.min(W * 0.5, 920);
  const chipH = 104;
  const impacts = dl.map((d) => d.send + travel);
  const first = dl.find((d) => d.first) as Delivery;
  const sealT = first.send + travel;
  const sealP = t >= sealT ? prog(ctx, sealT, P.impact, (x) => x) : 0;
  const sealScale = t >= sealT ? 1 + (1.08 - 1) * (1 - prog(ctx, sealT, P.impact)) : 1;
  const flash = t >= sealT ? pulse(t, sealT, f24(ctx, 4)) : 0;
  // absorbed-duplicate ring pulses
  const rings = dl.filter((d) => !d.first).map((d) => d.send + travel).filter((ti) => t >= ti);
  const lastRing = rings.length ? Math.max(...rings) : null;
  const els: React.ReactNode[] = [];
  els.push(<path key="lane" d={`M ${x0} ${laneY} L ${hitX} ${laneY}`} stroke={C.grid} strokeWidth={3} strokeDasharray="3 14" strokeLinecap="round" opacity={ent} fill="none" />);
  dl.forEach((d, i) => {
    if (t < d.send) return;
    const q = prog(ctx, d.send, travel, (x) => 1 - (1 - x) * (1 - x));
    const hit = d.send + travel;
    let x = x0 + (hitX + 8 - x0) * q;
    let a = 1;
    let col: string = C.signal;
    if (t >= hit) {
      const r = prog(ctx, hit, f24(ctx, 9));
      if (d.first) {
        a = 1 - r; // consumed by the page
        x = hitX - 30 * r;
      } else {
        x = hitX + 8 + 120 * r; // rebound
        a = 1 - r;
        col = C.warn;
      }
    }
    if (a <= 0.01) return;
    els.push(
      <g key={`p${i}`} opacity={a} transform={`translate(${x.toFixed(2)} ${laneY})`}>
        <rect x={-62} y={-40} width={124} height={80} rx={14} fill={`${C.panel}F0`} stroke={col} strokeWidth={3} />
        <KeyGlyph x={0} y={0} s={64} color={col} />
        <circle cx={-96} cy={0} r={5} fill={col} fillOpacity={0.5} />
        <circle cx={-122} cy={0} r={3.5} fill={col} fillOpacity={0.25} />
      </g>,
    );
  });
  // pips (structural counts, no digits)
  const pipsDone = impacts.filter((ti) => t >= ti).length;
  const pipR = 16;
  const pipGap = 22;
  const pipY = pageY + pageH + 70;
  dl.forEach((d, i) => {
    const px = pageX + pageW / 2 + ((dl.length - 1) / 2 - i) * (pipR * 2 + pipGap);
    const on = i < pipsDone;
    const k = on ? prog(ctx, impacts[i], P.label) : 0;
    els.push(
      <g key={`pip${i}`}>
        <circle cx={px} cy={pipY} r={pipR} fill="none" stroke={C.grid} strokeWidth={3} opacity={ent} />
        {on ? (d.first ? <circle cx={px} cy={pipY} r={pipR - 3} fill={C.ok} opacity={k} /> : <circle cx={px} cy={pipY} r={pipR - 2} fill="none" stroke={C.warn} strokeWidth={4} opacity={k} />) : null}
      </g>,
    );
  });
  const ringK = lastRing === null ? 0 : prog(ctx, lastRing, f24(ctx, 10));
  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`is-${ctx.id}`} w={W} h={H} y={H * 0.5} color={sealP > 0 ? C.ok : C.signal} pool={0.1 + 0.08 * flash} cx={pageX + pageW / 2} opacity={ent} />
      <div style={{position: 'absolute', left: pageX, top: pageY, width: pageW, height: pageH, borderRadius: 26, ...acrylic(C.ink3, ctx.fx, 0.2 + flash + ctx.mod.glow), opacity: ent}}>
        {[0.2, 0.34, 0.74, 0.86].map((yy) => (
          <div key={yy} style={{position: 'absolute', left: '12%', right: '12%', top: `${yy * 100}%`, height: 3, borderRadius: 2, background: C.grid}} />
        ))}
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {els}
        {lastRing !== null && ringK < 0.999 ? <circle cx={sealC[0]} cy={sealC[1]} r={sealR * (1.1 + 0.55 * ringK)} fill="none" stroke={C.warn} strokeWidth={4} strokeOpacity={1 - ringK} /> : null}
        {sealP > 0 ? (
          <g transform={`translate(${sealC[0]} ${sealC[1]}) scale(${sealScale.toFixed(4)})`} opacity={Math.min(1, sealP * 1.4)}>
            <circle r={sealR * 1.18} fill={C.ok} fillOpacity={0.1 + 0.25 * flash} />
            <circle r={sealR} fill="none" stroke={C.ok} strokeWidth={8} />
            <circle r={sealR * 0.82} fill="none" stroke={C.ok} strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" />
            <path d={`M ${-sealR * 0.38} ${sealR * 0.02} L ${-sealR * 0.1} ${sealR * 0.3} L ${sealR * 0.42} ${-sealR * 0.3}`} fill="none" stroke={C.ok} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: W / 2 - chipW / 2 + W * 0.04,
          top: H * 0.06,
          width: chipW,
          height: chipH,
          borderRadius: chipH / 2,
          ...acrylic(C.signal, ctx.fx, 0.35 + ctx.mod.glow),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          opacity: ent,
        }}
      >
        <svg width={64} height={64} viewBox="-32 -32 64 64" style={{flex: 'none'}}>
          <KeyGlyph x={0} y={0} s={60} color={C.signal} />
        </svg>
        <Lbl id={`${ctx.id}:key`} text={props.key} maxW={chipW - 150} maxH={chipH - 16} size={SIZE.body} role="chip" fps={ctx.fps} color={C.ink} weight={FONT.mono.weight} />
      </div>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        <Dot x={x0 + 18} y={laneY} r={9} color={mix(C.grid, C.ink2, ent)} k={0.4} opacity={ent} />
      </svg>
    </div>
  );
};
export const IdempotentStamp: DcComponent<Props> = {name: 'IdempotentStamp', Component: IdempotentStampView, text: true, slot: 'full'};
