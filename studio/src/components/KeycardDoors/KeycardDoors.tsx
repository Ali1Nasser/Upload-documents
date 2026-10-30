// KeycardDoors (catalog: Domain specials; 04 section 6 "keycards for identity"; IDOR: the keycard opens the neighbour's
// door -> ownership check). A row of lit doors standing on a floor plane (RTL: the first door on the right), each with its
// clearance shown as pips above the frame (never digits), a card reader on its RTL-start side and a whole-word label below.
// The keycard waits on the floor in front of the row and carries its own level pips.
// `swipe {door}` (anchored to the word that names it): the card travels to that door's reader (camera ease, RV1 onset on
// the anchor frame); card level >= door level -> the reader turns ok, the leaves slide open and the doorway spills ok light
// onto the floor; else the reader turns crit, the frame flashes crit (impact flash) and the card shakes <= IMPACT.nudgePxMax px.
// Determinism (r8): every gradient and glow is drawn in one SVG (no gradient divs, no rotated glow boxes); the moving card is
// placed on whole pixels and is never rotated; dust motes are seeded (random(seed)).
import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, IMPACT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, flashFrames} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, FitLabel, Stage, Svg, actsOf, f24, glowBox, lerp, morphF, prog, progN, rim, stag, type Pt} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const PIPS = 5;

/** Layout shared by the view and the text-safe rect (box-local). */
function layoutOf(n: number, W: number, H: number) {
  const cellW = W / Math.max(n, 2.6);
  const dw = Math.min(cellW * 0.5, H * 0.34);
  const pipR = Math.max(6, dw * 0.032);
  const pipBand = pipR * 2 + Math.max(14, dw * 0.06);
  const labelH = SIZE.body * 1.9;
  const cardW = Math.min(cellW * 0.34, dw * 0.78);
  const cardH = cardW * 0.63;
  const pad = H * 0.04;
  const dh = Math.max(SIZE.body * 3, Math.min(dw * 1.85, H - pipBand - labelH - cardH - pad * 3));
  const total = pipBand + dh + labelH + pad + cardH;
  const oy = Math.max(0, (H - total) / 2);
  const top = oy + pipBand;
  const floorY = top + dh;
  const x0 = (W - cellW * n) / 2;
  const rw = dw * 0.13;
  const rh = dw * 0.34;
  return {
    cellW,
    dw,
    dh,
    pipR,
    labelH,
    cardW,
    cardH,
    top,
    floorY,
    rw,
    rh,
    labelY: floorY + labelH / 2 + 6,
    rest: {x: W / 2, y: floorY + labelH + pad + cardH / 2} as Pt,
    cx: (i: number) => W - x0 - cellW * (i + 0.5), // RTL: door 0 on the right
    reader: (i: number): Pt => ({x: W - x0 - cellW * (i + 0.5) + dw / 2 + dw * 0.06 + rw / 2, y: top + dh * 0.5}),
  };
}

export const KeycardDoorsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const n = props.doors.length;
  const L = layoutOf(n, W, H);
  const {dw, dh, top, floorY, cardW, cardH, rw, rh, cx, reader, rest} = L;
  const mf = morphF(fps);
  const ff = flashFrames(fps);
  const lite = fx.id === 'lite';

  // ---------- swipe timeline: card position, shake and the verdict of each door ----------
  const swipes = actsOf(ctx, 'swipe');
  let pos = rest;
  let lift = 0;
  let shake = 0;
  const verdict: {t: number; ok: boolean}[] = Array.from({length: n}, () => ({t: Infinity, ok: false}));
  let from = rest;
  for (const a of swipes) {
    const d = Math.min(n - 1, a.props.door as number);
    const rd = reader(d);
    const to = {x: rd.x, y: rd.y + rh * 0.12};
    const q = progN(ctx, a.at, mf, ease.camera);
    if (t >= a.at) {
      pos = {x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q)};
      lift = Math.sin(q * Math.PI) * dh * 0.08;
    }
    const tv = a.at + mf - 1; // the card is on the reader
    const ok = props.card >= props.doors[d].level;
    if (verdict[d].t === Infinity) verdict[d] = {t: tv, ok};
    if (!ok && t >= tv) {
      const k = t - tv;
      const len = f24(8, fps);
      if (k <= len) shake = IMPACT.nudgePxMax * Math.sin((k / Math.max(1, f24(2, fps))) * Math.PI) * (1 - k / (len + 1));
    }
    from = to;
  }
  const doorState = props.doors.map((d, i) => {
    const v = verdict[i];
    const open = v.ok ? prog(ctx, v.t, 'morph', ease.camera, true) : 0;
    const denied = !v.ok && t >= v.t;
    const flash = denied ? interpolate(t - v.t, [0, ff, ff * 4], [1, 1, 0.35], clamp) : 0;
    const tone = v.ok && t >= v.t ? C.ok : denied ? C.crit : null;
    const ent = prog(ctx, ctx.at + stag(i, fps, 3), 'label');
    return {d, i, v, open, denied, flash, tone, ent};
  });
  const lw = Math.max(2, Math.round(dw * 0.012));
  const fr = Math.max(6, dw * 0.035); // frame thickness
  const MOTES = lite ? 10 : 22;

  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        <defs>
          <linearGradient id={`${ctx.id}-floor`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0" stopColor={C.signal} stopOpacity={0.07} />
            <stop offset="1" stopColor={C.signal} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-leafL`} x1={0} y1={0} x2={1} y2={0.2}>
            <stop offset="0" stopColor={C.panel} />
            <stop offset="1" stopColor={C.ground} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-leafR`} x1={1} y1={0} x2={0} y2={0.2}>
            <stop offset="0" stopColor={C.panel} />
            <stop offset="1" stopColor={C.ground} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-room`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0" stopColor={C.ok} stopOpacity={0.18} />
            <stop offset="0.7" stopColor={C.ok} stopOpacity={0.5} />
            <stop offset="1" stopColor={C.ok} stopOpacity={0.75} />
          </linearGradient>
          <linearGradient id={`${ctx.id}-refl`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0" stopColor={C.ink} stopOpacity={0.07} />
            <stop offset="1" stopColor={C.ink} stopOpacity={0} />
          </linearGradient>
          {[C.ok, C.crit].map((col, k) => (
            <radialGradient key={k} id={`${ctx.id}-pool${k}`} cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor={col} stopOpacity={0.42} />
              <stop offset="1" stopColor={col} stopOpacity={0} />
            </radialGradient>
          ))}
          <linearGradient id={`${ctx.id}-shaft`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0" stopColor={C.ok} stopOpacity={0.3} />
            <stop offset="1" stopColor={C.ok} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* floor plane: a faint lit band and the horizon line the doors stand on */}
        <g opacity={prog(ctx, ctx.at, 'label')}>
          <rect x={0} y={floorY} width={W} height={Math.max(0, H - floorY)} fill={`url(#${ctx.id}-floor)`} />
          <line x1={W * 0.02} x2={W * 0.98} y1={floorY} y2={floorY} stroke={C.grid} strokeWidth={2} />
        </g>
        {/* dust motes drifting in the corridor air (seeded; never over a doorway) */}
        {Array.from({length: MOTES}, (_, m) => {
          const sp = 0.1 + 0.2 * random(`kd:ms:${ctx.id}:${m}`);
          const x = random(`kd:mx:${ctx.id}:${m}`) * W + Math.sin((t - ctx.at) * 0.02 + m) * 8;
          const y = floorY - ((random(`kd:my:${ctx.id}:${m}`) * floorY + (t - ctx.at) * sp) % Math.max(1, floorY));
          const inDoor = props.doors.some((_, i) => Math.abs(x - cx(i)) < dw / 2 + fr && y > top - fr);
          if (inDoor) return null;
          return <circle key={m} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(1 + 2 * random(`kd:mr:${ctx.id}:${m}`)).toFixed(2)} fill={C.signal} opacity={((0.1 + 0.22 * random(`kd:mo:${ctx.id}:${m}`)) * Math.sin((y / Math.max(1, floorY)) * Math.PI) * prog(ctx, ctx.at, 'label')).toFixed(3)} />;
        })}
        {doorState.map(({i, open, denied, flash, tone, ent, d}) => {
          const x = cx(i) - dw / 2;
          const rd = reader(i);
          const led = tone ?? C.ink3;
          const ledK = tone ? 1 : 0;
          const leafW = dw / 2;
          const slide = open * leafW * 0.92;
          return (
            <g key={i} opacity={ent} transform={`translate(0 ${((1 - ent) * 6).toFixed(2)})`}>
              {/* light spill on the floor: ok from an open doorway, crit under a denied door */}
              {open > 0 ? (
                <>
                  <polygon points={`${x},${floorY} ${x + dw},${floorY} ${x + dw + dw * 0.45},${H} ${x - dw * 0.45},${H}`} fill={`url(#${ctx.id}-shaft)`} opacity={open} />
                  <ellipse cx={cx(i)} cy={floorY + dh * 0.05} rx={dw * 0.95} ry={dh * 0.07} fill={`url(#${ctx.id}-pool0)`} opacity={open} />
                </>
              ) : null}
              {denied ? <ellipse cx={cx(i)} cy={floorY + dh * 0.04} rx={dw * 0.8} ry={dh * 0.055} fill={`url(#${ctx.id}-pool1)`} opacity={0.4 + 0.6 * flash} /> : null}
              {/* reflection of the door on the floor */}
              <rect x={x} y={floorY + 4} width={dw} height={dh * 0.22} fill={`url(#${ctx.id}-refl)`} />
              {/* frame glow (status only) */}
              {tone ? (
                <>
                  <rect x={x - fr} y={top - fr} width={dw + 2 * fr} height={dh + fr} rx={fr * 1.2} fill="none" stroke={tone} strokeOpacity={0.12} strokeWidth={fx.glowPx * 0.9 * (0.6 + flash)} />
                  <rect x={x - fr} y={top - fr} width={dw + 2 * fr} height={dh + fr} rx={fr * 1.2} fill="none" stroke={tone} strokeOpacity={0.3} strokeWidth={fx.glowInner * (0.8 + flash)} />
                </>
              ) : null}
              {/* frame: acrylic jambs and head, key rim light on the upper-right edge */}
              <rect x={x - fr} y={top - fr} width={dw + 2 * fr} height={dh + fr} rx={fr * 1.2} fill={C.panel} stroke={tone ?? C.grid} strokeWidth={lw} />
              <path d={`M${x - fr + fr * 1.2} ${top - fr + 1} L${x + dw + fr - fr * 1.2} ${top - fr + 1} Q${x + dw + fr - 1} ${top - fr + 1} ${x + dw + fr - 1} ${top - fr + fr * 1.2} L${x + dw + fr - 1} ${top + dh * 0.6}`} fill="none" stroke={C.ink} strokeOpacity={0.22} strokeWidth={1.5} />
              {/* the doorway: dark until it opens onto a lit room */}
              <rect x={x} y={top} width={dw} height={dh} fill={C.void} />
              {open > 0 ? <rect x={x} y={top} width={dw} height={dh} fill={`url(#${ctx.id}-room)`} opacity={open} /> : null}
              {/* the two leaves slide into the jambs */}
              <svg x={x} y={top} width={dw} height={dh} overflow="hidden">
                {[0, 1].map((leaf) => {
                  const lx = leaf === 0 ? -slide : leafW + slide;
                  return (
                    <g key={leaf} transform={`translate(${lx.toFixed(2)} 0)`}>
                      <rect x={0} y={0} width={leafW} height={dh} fill={`url(#${ctx.id}-leaf${leaf === 0 ? 'L' : 'R'})`} />
                      <line x1={leaf === 0 ? leafW - 0.5 : 0.5} x2={leaf === 0 ? leafW - 0.5 : 0.5} y1={0} y2={dh} stroke={C.grid} strokeWidth={1.5} />
                      <rect x={leafW * 0.18} y={dh * 0.1} width={leafW * 0.64} height={dh * 0.32} rx={4} fill="none" stroke={C.grid} strokeWidth={1.5} />
                      <rect x={leafW * 0.18} y={dh * 0.5} width={leafW * 0.64} height={dh * 0.4} rx={4} fill="none" stroke={C.grid} strokeWidth={1.5} />
                      <rect x={leaf === 0 ? leafW * 0.82 : leafW * 0.12} y={dh * 0.45} width={Math.max(4, dw * 0.02)} height={dh * 0.1} rx={2} fill={C.ink3} />
                    </g>
                  );
                })}
              </svg>
              {denied ? <rect x={x} y={top} width={dw} height={dh} fill={C.crit} opacity={0.2 * flash} /> : null}
              {/* clearance pips above the frame (RTL fill: filled pips start on the right) */}
              {Array.from({length: PIPS}, (_, k) => {
                const on = k < d.level;
                const px = cx(i) + ((PIPS - 1) / 2 - k) * L.pipR * 2.9;
                return <circle key={k} cx={px} cy={top - fr - L.pipR * 1.9} r={L.pipR} fill={on ? (tone ?? C.ink2) : 'none'} stroke={on ? (tone ?? C.ink2) : C.ink3} strokeWidth={1.5} opacity={on ? 1 : 0.55} />;
              })}
              {/* reader: a dark plate with a status lamp and a card slot */}
              <rect x={rd.x - rw / 2} y={rd.y - rh / 2} width={rw} height={rh} rx={rw * 0.25} fill={C.panel} stroke={C.grid} strokeWidth={1.5} />
              <line x1={rd.x - rw / 2 + 3} x2={rd.x + rw / 2 - 3} y1={rd.y - rh / 2 + 1.5} y2={rd.y - rh / 2 + 1.5} stroke={C.ink} strokeOpacity={0.2} strokeWidth={1.5} />
              <rect x={rd.x - rw * 0.08} y={rd.y - rh * 0.02} width={rw * 0.16} height={rh * 0.4} rx={rw * 0.06} fill={C.void} />
              {ledK ? <circle cx={rd.x} cy={rd.y - rh * 0.3} r={rw * 0.5} fill={led} opacity={0.18} /> : null}
              <circle cx={rd.x} cy={rd.y - rh * 0.3} r={rw * 0.17} fill={led} />
            </g>
          );
        })}
        {/* the card's floor shadow at rest */}
        <ellipse cx={rest.x} cy={rest.y + cardH * 0.62} rx={cardW * 0.55} ry={cardH * 0.1} fill={C.void} opacity={0.6 * prog(ctx, ctx.at + stag(n, fps, 3), 'label') * (pos === rest ? 1 : 0.4)} />
      </Svg>
      {/* door labels: whole words, one baseline */}
      {doorState.map(({d, i, tone, ent}) => (
        <At key={i} x={cx(i)} y={L.labelY} style={{opacity: ent, transform: `translate(-50%, -50%) translateY(${((1 - ent) * 6).toFixed(2)}px)`}}>
          <FitLabel id={`${ctx.id}:door${i}`} text={d.label} maxW={L.cellW * 0.9} size={SIZE.body} color={tone ?? C.ink} weight={FONT.label.strong} />
        </At>
      ))}
      {/* the keycard: never rotated, placed on whole pixels */}
      {(() => {
        const ent = prog(ctx, ctx.at + stag(n, fps, 3), 'label');
        const pr = Math.max(4, cardW * 0.032);
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.round(pos.x - cardW / 2 + shake),
              top: Math.round(pos.y - cardH / 2 - lift),
              width: Math.round(cardW),
              height: Math.round(cardH),
              borderRadius: Math.round(cardH * 0.1),
              opacity: ent,
              background: `linear-gradient(135deg, ${C.panel} 0%, ${C.ground} 100%)`,
              border: `1.5px solid ${C.signal}`,
              boxShadow: `${rim(0.28)}, ${glowBox(C.signal, fx, 0.45 + ctx.mod.glow)}`,
            }}
          >
            <div style={{position: 'absolute', left: 0, right: 0, top: '22%', height: '16%', background: `${C.ink}${hex(0.08)}`}} />
            <div style={{position: 'absolute', right: '9%', top: '46%', width: '22%', height: '30%', borderRadius: 4, background: `linear-gradient(135deg, ${C.warn}${hex(0.8)}, ${C.ember}${hex(0.55)})`}} />
            <svg width={pr * 2.9 * PIPS} height={pr * 2.4} style={{position: 'absolute', left: '9%', bottom: '14%', overflow: 'visible'}}>
              {Array.from({length: PIPS}, (_, k) => {
                const on = k < props.card;
                return <circle key={k} cx={pr * 2.9 * (PIPS - 1 - k) + pr * 1.2} cy={pr * 1.2} r={pr} fill={on ? C.signal : 'none'} stroke={on ? C.signal : C.ink3} strokeWidth={1.5} opacity={on ? 1 : 0.55} />;
              })}
            </svg>
          </div>
        );
      })()}
    </Stage>
  );
};

/** Text-safe rect: the label row under the doors (the doors and the card keep the haze around them). */
const textRect = (p: Props, b: Rect): Rect => {
  const L = layoutOf(p.doors.length, b.w, b.h);
  return {x: b.x, y: b.y + L.labelY - L.labelH / 2, w: b.w, h: L.labelH};
};

export const KeycardDoors: DcComponent<Props> = {name: 'KeycardDoors', Component: KeycardDoorsView, text: true, slot: 'center', textRect};
