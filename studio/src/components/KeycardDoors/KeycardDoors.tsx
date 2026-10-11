// KeycardDoors (catalog: Domain specials; 04 section 6 "keycards for identity"; IDOR: the keycard opens the neighbour's
// door -> ownership check). A row of doors (RTL: the first door on the right), each with its clearance shown as pips
// (never digits) and a whole-word label below. The keycard carries its own level pips.
// `swipe {door}` (anchored to the word that names it): the card travels to that door's reader (camera ease, RV1 onset on
// the anchor frame); card level >= door level -> the reader turns ok and the leaves slide open on a light spill; else
// the reader turns crit, the door frame flashes crit and the card shakes <= IMPACT.nudgePxMax px (failure beat).
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, IMPACT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, flashFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, FitLabel, Stage, f24, glowBox, lerp, morphF, prog, progN, rim, stag} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const PIPS = 5;

const Pips: React.FC<{n: number; on: string; r: number}> = ({n, on, r}) => (
  <div style={{display: 'flex', gap: Math.round(r * 0.8), direction: 'rtl'}}>
    {Array.from({length: PIPS}, (_, i) => (
      <div key={i} style={{width: r * 2, height: r * 2, borderRadius: r, background: i < n ? on : 'transparent', border: `1.5px solid ${i < n ? on : C.ink3}`, opacity: i < n ? 1 : 0.5}} />
    ))}
  </div>
);

export const KeycardDoorsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const n = props.doors.length;
  const cellW = box.w / Math.max(n, 2.6);
  const dw = Math.min(cellW * 0.62, 230);
  const cardW = Math.min(170, dw * 0.9);
  const cardH = cardW * 0.62;
  const labelH = SIZE.label * 1.8;
  const top = 64;
  const dh = Math.max(160, Math.min(dw * 1.75, box.h - top - labelH - cardH - 56));
  const x0 = (box.w - cellW * n) / 2;
  const cx = (i: number) => box.w - x0 - cellW * (i + 0.5); // RTL: door 0 on the right
  const reader = (i: number) => ({x: cx(i) - dw / 2 - 26, y: top + dh * 0.52});
  const rest = {x: box.w / 2, y: top + dh + labelH + cardH / 2 + 28};
  const mf = morphF(fps);

  // swipe timeline
  const swipes = ctx.actions.filter((a) => a.name === 'swipe').sort((a, b) => a.at - b.at);
  let pos = rest;
  let shake = 0;
  const verdict: {t: number; ok: boolean}[] = Array.from({length: n}, () => ({t: Infinity, ok: false}));
  let from = rest;
  for (const a of swipes) {
    const d = Math.min(n - 1, a.props.door as number);
    const to = {x: reader(d).x - cardW * 0.18, y: reader(d).y};
    const q = progN(ctx, a.at, mf, ease.camera);
    if (t >= a.at) pos = {x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q)};
    const tv = a.at + mf - 1; // card at the reader
    const ok = props.card >= props.doors[d].level;
    if (verdict[d].t === Infinity) verdict[d] = {t: tv, ok};
    if (!ok && t >= tv) {
      const k = t - tv;
      const len = f24(8, fps);
      if (k <= len) shake = IMPACT.nudgePxMax * Math.sin((k / Math.max(1, f24(2, fps))) * Math.PI) * (1 - k / (len + 1));
    }
    from = to;
  }

  return (
    <Stage ctx={ctx}>
      {props.doors.map((d, i) => {
        const a0 = ctx.at + stag(i, fps);
        const ent = prog(ctx, a0, 'label');
        const v = verdict[i];
        const open = v.ok ? prog(ctx, v.t, 'morph', ease.camera, true) : 0;
        const denied = !v.ok && t >= v.t;
        const ff = flashFrames(fps);
        const flash = denied ? interpolate(t - v.t, [0, ff, ff * 4], [1, 1, 0.35], clamp) : 0;
        const frame = v.ok && t >= v.t ? C.ok : denied ? C.crit : C.ink3;
        const led = t >= v.t ? (v.ok ? C.ok : C.crit) : C.ink3;
        const rd = reader(i);
        return (
          <React.Fragment key={i}>
            <div style={{opacity: ent, transform: `translateY(${((1 - ent) * 6).toFixed(2)}px)`}}>
              {/* clearance pips (no digits) */}
              <At x={cx(i)} y={top - 26}>
                <Pips n={d.level} on={C.ink2} r={7} />
              </At>
              {/* door */}
              <div
                style={{
                  position: 'absolute',
                  left: cx(i) - dw / 2,
                  top,
                  width: dw,
                  height: dh,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: `2px solid ${frame}`,
                  background: v.ok ? `radial-gradient(ellipse 70% 60% at 50% 55%, ${C.ok}${hex(0.55 * open)} 0%, ${C.ok}${hex(0.12 * open)} 60%, ${C.void} 100%)` : C.void,
                  boxShadow: `${rim(0.18)}, ${frame !== C.ink3 ? glowBox(frame, fx, 0.5 + flash) : `0 18px 40px ${C.void}${hex(0.6)}`}`,
                }}
              >
                {[0, 1].map((leaf) => (
                  <div
                    key={leaf}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: dw / 2,
                      left: leaf === 0 ? 0 : dw / 2,
                      transform: `translateX(${((leaf === 0 ? -1 : 1) * open * dw * 0.46).toFixed(2)}px)`,
                      background: `linear-gradient(${leaf === 0 ? 100 : 260}deg, ${C.panel} 0%, ${C.ground} 100%)`,
                      borderLeft: leaf === 1 ? `1px solid ${C.grid}` : undefined,
                      borderRight: leaf === 0 ? `1px solid ${C.grid}` : undefined,
                    }}
                  >
                    <div style={{position: 'absolute', left: '18%', right: '18%', top: '12%', height: '30%', border: `1px solid ${C.grid}`, borderRadius: 4}} />
                    <div style={{position: 'absolute', left: '18%', right: '18%', top: '50%', height: '38%', border: `1px solid ${C.grid}`, borderRadius: 4}} />
                  </div>
                ))}
                {denied ? <div style={{position: 'absolute', inset: 0, background: `${C.crit}${hex(0.18 * flash)}`}} /> : null}
              </div>
              {/* reader */}
              <div style={{position: 'absolute', left: rd.x - 13, top: rd.y - 30, width: 26, height: 60, borderRadius: 6, background: C.panel, border: `1px solid ${C.grid}`, boxShadow: rim(0.2)}}>
                <div style={{position: 'absolute', left: 8, top: 8, width: 10, height: 10, borderRadius: 5, background: led, boxShadow: led !== C.ink3 ? glowBox(led, fx, 0.6) : undefined}} />
              </div>
              <At x={cx(i)} y={top + dh + labelH / 2 + 6}>
                <FitLabel id={`${ctx.id}:door${i}`} text={d.label} maxW={cellW - 24} color={frame === C.ink3 ? C.ink : frame} weight={FONT.label.strong} />
              </At>
            </div>
          </React.Fragment>
        );
      })}
      {/* the keycard */}
      {(() => {
        const a0 = ctx.at + stag(n, fps);
        const ent = prog(ctx, a0, 'label');
        return (
          <div
            style={{
              position: 'absolute',
              left: pos.x - cardW / 2 + shake,
              top: pos.y - cardH / 2,
              width: cardW,
              height: cardH,
              borderRadius: 12,
              opacity: ent,
              background: `linear-gradient(135deg, ${C.panel} 0%, ${C.ground} 100%)`,
              border: `1.5px solid ${C.signal}`,
              boxShadow: `${rim(0.25)}, ${glowBox(C.signal, fx, 0.45)}`,
              transform: `rotate(-4deg)`,
            }}
          >
            <div style={{position: 'absolute', right: '10%', top: '16%', width: '24%', height: '30%', borderRadius: 4, background: `linear-gradient(135deg, ${C.warn}${hex(0.75)}, ${C.ember}${hex(0.5)})`, opacity: 0.85}} />
            <div style={{position: 'absolute', left: '10%', bottom: '14%'}}>
              <Pips n={props.card} on={C.signal} r={Math.max(4, Math.round(cardW * 0.035))} />
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, top: '58%', height: 3, background: `${C.signal}${hex(0.35)}`}} />
          </div>
        );
      })()}
    </Stage>
  );
};

export const KeycardDoors: DcComponent<Props> = {name: 'KeycardDoors', Component: KeycardDoorsView, text: true, slot: 'center'};
