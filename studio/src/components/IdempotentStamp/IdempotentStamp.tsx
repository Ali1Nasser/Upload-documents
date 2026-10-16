// IdempotentStamp (catalog: Domain specials; 04 section 6 "DAG, retries, idempotency": retry duplicates rows; the idempotent upsert =
// the stamp lands ONCE). One idempotency key (key chip from props, Latin code in an LTR isolate) rides on every delivery.
// Deliveries (envelopes carrying the same key glyph) leave the sender outbox (start side = right) and slide along a lane onto a
// ledger page (end side = left of the outbox). The FIRST delivery is written: a rubber stamp comes down on the page (impact
// preset), leaves a green seal and fills ONE ledger row. Every later delivery with the same key reaches the seal, is recognised
// (an "equals" mark and a warn ring pulse once), a dashed ghost row tries to appear under the entry and dissolves, and the
// envelope rebounds: the page never gets a second seal or a second row. Under the page a row of pips counts the deliveries
// (ok = stamped, warn ring = absorbed duplicate): no digits, the counts are structural.
//   no `replay` action : all `attempts` deliveries run on their own, one every 16 film frames from the layer anchor.
//   `replay` (n times) : the first delivery runs on the layer anchor; each replay sends the duplicates again (attempts - 1,
//                        at least one) 6 film frames apart from the replay word.
// Light per ADR-003 LK-F: acrylic rim light, floor pool, extruded side, contact shadows (the stamp's shadow closes on the page).
// DOM + SVG only, no filter and no WebGL (hero = standard).
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Floor, Lbl, acrylic, acts, boxStyle, clamp01, f24, mix, pf, prog, pulse, shell} from '../_dom-c/kit';

export type Delivery = {send: number; first: boolean};
const MAX_PIPS = 16;
/** Delivery schedule (frames at the composition fps). */
export const deliveries = (attempts: number, ctx: DcProps<Props>['ctx']): Delivery[] => {
  const reps = acts(ctx, 'replay');
  if (reps.length === 0) return Array.from({length: attempts}, (_, i) => ({send: ctx.at + i * f24(ctx, 16), first: i === 0}));
  const out: Delivery[] = [{send: ctx.at, first: true}];
  for (const r of reps) for (let d = 0; d < Math.max(1, attempts - 1) && out.length < MAX_PIPS; d++) out.push({send: r.at + d * f24(ctx, 6), first: false});
  return out;
};

const KeyGlyph: React.FC<{x: number; y: number; s: number; color: string; w?: number}> = ({x, y, s, color, w = 3}) => (
  <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={-s * 0.28} cy={0} r={s * 0.22} />
    <path d={`M ${-s * 0.06} 0 L ${s * 0.42} 0 M ${s * 0.26} 0 L ${s * 0.26} ${s * 0.16} M ${s * 0.42} 0 L ${s * 0.42} ${s * 0.12}`} />
  </g>
);

/** Layout shared by the view and textRect. */
const layout = (W: number, H: number) => {
  const chipW = Math.min(W * 0.5, 900);
  const chipH = 104;
  const pageW = Math.min(W * 0.52, 940);
  const pageH = Math.round(H * 0.6);
  const pageX = W * 0.07;
  const pageY = H * 0.22;
  const sealR = Math.min(pageW, pageH) * 0.2;
  const sealC: [number, number] = [pageX + pageW * 0.55, pageY + pageH * 0.72];
  return {chipW, chipH, chipX: W * 0.5 - chipW / 2, chipY: H * 0.03, pageW, pageH, pageX, pageY, sealR, sealC};
};

export const IdempotentStampView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const P = pf(ctx);
  const W = ctx.box.w;
  const H = ctx.box.h;
  const {chipW, chipH, chipX, chipY, pageW, pageH, pageX, pageY, sealR, sealC} = layout(W, H);
  const dl = deliveries(props.attempts, ctx);
  const travel = f24(ctx, 10);
  const ent = prog(ctx, ctx.at, P.arrive);
  const laneY = sealC[1];
  const boxW = Math.min(W * 0.15, 250);
  const boxH = Math.round(H * 0.3);
  const boxX = W * 0.97 - boxW;
  const x0 = boxX + 8; // envelopes leave from the outbox's left edge
  const stopX = sealC[0] + sealR * 1.3; // a duplicate stops at the seal's edge
  const impacts = dl.map((d) => d.send + travel);
  const first = dl.find((d) => d.first) as Delivery;
  const sealT = first.send + travel;
  const sealed = t >= sealT;
  const slam = f24(ctx, 5);
  const sealP = sealed ? prog(ctx, sealT, P.impact, (x) => x) : 0;
  const sealScale = sealed ? 1 + 0.08 * (1 - prog(ctx, sealT, P.impact)) : 1;
  const flash = sealed ? pulse(t, sealT, f24(ctx, 4)) : 0;
  const dupHits = dl.filter((d) => !d.first).map((d) => d.send + travel);
  const lastDup = dupHits.filter((ti) => t >= ti).reduce((a, b) => Math.max(a, b), -1);
  const ringK = lastDup < 0 ? 0 : prog(ctx, lastDup, f24(ctx, 10));
  const eqK = lastDup < 0 ? 0 : pulse(t, lastDup, f24(ctx, 14));

  // rubber stamp device: armed above the seal from the anchor, slams on the first delivery, then lifts and idles dimmed
  const hoverY = sealC[1] - sealR * 1.9;
  const lift = sealed ? prog(ctx, sealT + f24(ctx, 3), f24(ctx, 9)) : 0;
  const down = prog(ctx, sealT - slam, slam, (x) => x * x);
  const stampY = sealed ? sealC[1] - sealR * 0.2 - lift * (sealR * 1.5) : hoverY + (sealC[1] - sealR * 0.2 - hoverY) * (t >= sealT - slam ? down : 0) + Math.sin(t * 0.16) * 4 * (t < sealT - slam ? 1 : 0);
  const devA = ent * (sealed ? 1 - lift : 1);
  const nearK = sealed ? 1 - lift : t >= sealT - slam ? down : 0;

  const els: React.ReactNode[] = [];
  // lane (dashed guide) + outbox -> page
  els.push(<path key="lane" d={`M ${x0} ${laneY} L ${pageX + pageW * 0.9} ${laneY}`} stroke={C.grid} strokeWidth={3} strokeDasharray="3 14" strokeLinecap="round" opacity={ent} fill="none" />);
  dl.forEach((d, i) => {
    if (t < d.send) return;
    const q = prog(ctx, d.send, travel, (x) => 1 - (1 - x) * (1 - x));
    const hit = d.send + travel;
    const endX = d.first ? sealC[0] : stopX;
    let x = x0 - 80 + (endX - (x0 - 80)) * q;
    let a = 1;
    let s = 1;
    let col: string = C.signal;
    if (t >= hit) {
      const r = prog(ctx, hit, f24(ctx, 9));
      if (d.first) {
        s = 1 - r * 0.85;
        a = 1 - r;
      } else {
        x = endX + (x0 - 80 - endX) * 0.35 * r; // rebound
        a = 1 - r;
        col = C.warn;
      }
    }
    if (a <= 0.01) return;
    els.push(
      <g key={`p${i}`} opacity={a} transform={`translate(${x.toFixed(2)} ${laneY}) scale(${s.toFixed(3)})`}>
        <ellipse cx={0} cy={58} rx={64} ry={9} fill={C.void} fillOpacity={0.5} />
        <rect x={-70} y={-48} width={140} height={96} rx={14} fill={`${C.panel}F5`} stroke={col} strokeWidth={3} />
        <path d="M -70 -38 L 0 8 L 70 -38" fill="none" stroke={col} strokeWidth={3} strokeLinejoin="round" strokeOpacity={0.55} />
        <rect x={-30} y={-6} width={60} height={42} rx={9} fill={`${C.ground}F2`} stroke={col} strokeWidth={2} />
        <KeyGlyph x={0} y={15} s={42} color={col} w={3} />
        <circle cx={-104} cy={0} r={5} fill={col} fillOpacity={0.5} />
        <circle cx={-132} cy={0} r={3.5} fill={col} fillOpacity={0.25} />
      </g>,
    );
  });

  // pips (structural counts, no digits)
  const pipsDone = impacts.filter((ti) => t >= ti).length;
  const pipR = 16;
  const pitch = Math.min(pipR * 2 + 22, (pageW * 0.92) / Math.max(1, dl.length));
  const pipY = pageY + pageH + 62;
  dl.forEach((d, i) => {
    const px = pageX + pageW / 2 + ((dl.length - 1) / 2 - i) * pitch;
    const on = i < pipsDone;
    const k = on ? prog(ctx, impacts[i], P.label) : 0;
    els.push(
      <g key={`pip${i}`}>
        <circle cx={px} cy={pipY} r={pipR} fill="none" stroke={C.grid} strokeWidth={3} opacity={ent} />
        {on ? d.first ? <circle cx={px} cy={pipY} r={pipR - 3} fill={C.ok} opacity={k} /> : <circle cx={px} cy={pipY} r={pipR - 2} fill="none" stroke={C.warn} strokeWidth={4} opacity={k} /> : null}
      </g>,
    );
  });

  // ledger rows on the page: skeleton bars; row 2 is the entry that gets written once; a ghost row under it never lands
  const rowX = pageX + pageW * 0.1;
  const rowW = pageW * 0.8;
  const rowH = Math.round(pageH * 0.05);
  const rowYs = [0.1, 0.2, 0.3, 0.4].map((v) => pageY + pageH * v);
  const entryK = sealed ? prog(ctx, sealT, P.label) : 0;
  const ghostK = lastDup < 0 ? 0 : prog(ctx, lastDup, f24(ctx, 14));
  const rows: React.ReactNode[] = [];
  rowYs.slice(0, 3).forEach((y, i) => {
    const w = rowW * [0.85, 0.6, 1][i];
    const entry = i === 2;
    rows.push(
      <g key={`r${i}`} opacity={ent}>
        <rect x={rowX + (rowW - w)} y={y} width={w} height={rowH} rx={rowH / 2} fill={C.grid} fillOpacity={0.55} />
        {entry ? <rect x={rowX + rowW - w * entryK} y={y} width={w * entryK} height={rowH} rx={rowH / 2} fill={C.ok} fillOpacity={0.75} /> : null}
      </g>,
    );
  });
  const ghostY = rowYs[3];
  const ghost =
    ghostK > 0 && ghostK < 0.999 ? (
      <rect x={rowX} y={ghostY} width={rowW} height={rowH} rx={rowH / 2} fill="none" stroke={C.warn} strokeWidth={3} strokeDasharray="10 8" strokeOpacity={1 - ghostK} transform={`translate(0 ${(-ghostK * rowH * 0.7).toFixed(2)})`} />
    ) : null;

  return (
    <div style={{...boxStyle(ctx), ...shell(ctx)}}>
      <Floor gid={`is-${ctx.id}`} w={W} h={H} y={H * 0.62} color={sealed ? C.ok : C.signal} pool={0.1 + 0.1 * flash} cx={sealC[0]} opacity={ent} />
      <div style={{position: 'absolute', left: pageX, top: pageY, width: pageW, height: pageH, borderRadius: 26, ...acrylic(sealed ? C.ok : C.signal, ctx.fx, 0.16 + 0.5 * flash + ctx.mod.glow), opacity: ent}} />
      <div style={{position: 'absolute', left: boxX, top: laneY - boxH / 2, width: boxW, height: boxH, borderRadius: 30, ...acrylic(C.signal, ctx.fx, 0.3 + ctx.mod.glow), opacity: ent}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <g transform={`translate(${boxX + boxW / 2} ${laneY})`} opacity={ent}>
          <path d={`M ${-boxW * 0.28} 0 L ${boxW * 0.2} 0 M ${-boxW * 0.28} 0 L ${-boxW * 0.1} ${-boxH * 0.1} M ${-boxW * 0.28} 0 L ${-boxW * 0.1} ${boxH * 0.1}`} stroke={C.signal} strokeWidth={5} strokeLinecap="round" fill="none" />
          <rect x={-boxW * 0.38} y={-boxH * 0.3} width={boxW * 0.76} height={boxH * 0.6} rx={16} fill="none" stroke={C.signal} strokeWidth={3} strokeOpacity={0.35} strokeDasharray="4 10" />
        </g>
        {rows}
        {ghost}
        {els}
        {lastDup >= 0 && ringK < 0.999 ? <circle cx={sealC[0]} cy={sealC[1]} r={sealR * (1.1 + 0.55 * ringK)} fill="none" stroke={C.warn} strokeWidth={5} strokeOpacity={1 - ringK} /> : null}
        {sealed ? (
          <g transform={`translate(${sealC[0]} ${sealC[1]}) scale(${sealScale.toFixed(4)})`} opacity={Math.min(1, sealP * 1.4)}>
            <circle r={sealR * 1.18} fill={C.ok} fillOpacity={0.1 + 0.25 * flash} />
            <circle r={sealR} fill="none" stroke={C.ok} strokeWidth={9} />
            <circle r={sealR * 0.82} fill="none" stroke={C.ok} strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" />
            <path d={`M ${-sealR * 0.38} ${sealR * 0.02} L ${-sealR * 0.1} ${sealR * 0.3} L ${sealR * 0.42} ${-sealR * 0.3}`} fill="none" stroke={C.ok} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" />
            {eqK > 0 ? (
              <g stroke={C.warn} strokeWidth={9} strokeLinecap="round" opacity={eqK}>
                <path d={`M ${-sealR * 0.3} ${-sealR * 0.55} L ${sealR * 0.3} ${-sealR * 0.55}`} />
                <path d={`M ${-sealR * 0.3} ${-sealR * 0.4} L ${sealR * 0.3} ${-sealR * 0.4}`} />
              </g>
            ) : null}
          </g>
        ) : null}
        {/* rubber stamp: acrylic handle + base plate; its contact shadow closes on the page as it comes down */}
        <g opacity={clamp01(devA)}>
          <ellipse cx={sealC[0]} cy={sealC[1] + sealR * 0.12} rx={sealR * (0.55 + 0.5 * nearK)} ry={sealR * 0.16} fill={C.void} fillOpacity={0.15 + 0.4 * nearK} />
          <g transform={`translate(${sealC[0]} ${stampY.toFixed(2)})`}>
            <rect x={-sealR * 0.95} y={sealR * 0.02} width={sealR * 1.9} height={sealR * 0.26} rx={sealR * 0.1} fill={`${C.panel}F5`} stroke={sealed ? C.ok : C.signal} strokeWidth={4} />
            <rect x={-sealR * 0.95} y={sealR * 0.22} width={sealR * 1.9} height={sealR * 0.08} rx={sealR * 0.04} fill={mix(sealed ? C.ok : C.signal, C.void, 0.68)} />
            <rect x={-sealR * 0.16} y={-sealR * 0.7} width={sealR * 0.32} height={sealR * 0.74} rx={sealR * 0.1} fill={`${C.panel}F5`} stroke={sealed ? C.ok : C.signal} strokeWidth={4} />
            <rect x={-sealR * 0.42} y={-sealR * 1.02} width={sealR * 0.84} height={sealR * 0.38} rx={sealR * 0.19} fill={`${C.ground}F2`} stroke={sealed ? C.ok : C.signal} strokeWidth={4} />
          </g>
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: chipX,
          top: chipY,
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
    </div>
  );
};

const textRect = (_p: Props, b: {x: number; y: number; w: number; h: number}) => {
  const l = layout(b.w, b.h);
  return {x: b.x + l.chipX, y: b.y + l.chipY, w: l.chipW, h: l.chipH};
};
export const IdempotentStamp: DcComponent<Props> = {name: 'IdempotentStamp', Component: IdempotentStampView, text: true, slot: 'full', textRect};
