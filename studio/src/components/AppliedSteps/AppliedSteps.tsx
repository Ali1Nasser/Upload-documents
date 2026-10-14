// AppliedSteps (catalog: Domain specials; 04 section 6 "Applied steps & dirty data": the step list as a film strip, each
// step transforms the table). A Power Query applied-steps pane on a glass plate, framed as a film strip (sprocket rails on
// both sides). Steps arrive top-down on the label preset, staggered from the layer anchor; each row = an optional `kind`
// chip (Latin / mono, one LTR isolate) + the whole-word label, right-aligned (RTL).
// `select {index}` (anchored to the word that names the step): the selection bar travels to that row (camera ease, RV1
// onset on the anchor frame) and fills with signal; steps up to it are applied (ok tick), later steps dim (not applied
// yet), exactly as selecting a step in Power Query shows the table at that point. Auto-fit with the 28 px floor.
import React, {useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {Glass} from '../../fx/Atmos';
import {halo, hex} from '../../fx/look';
import {MixedText, useAutoFit} from '../../type/Text';
import {isArabic} from '../../type/arabic';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Chip, Stage, actsOf, glowBox, lerp, prog, progN, stag} from '../_dom-b/kit';

export const AppliedStepsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const ref = useRef<HTMLDivElement>(null);
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const n = props.steps.length;
  const size = n <= 7 ? SIZE.sub : n <= 9 ? SIZE.body : SIZE.label;
  const pad = 28;
  const rail = Math.round(SIZE.label * 1.2);
  const headH = Math.round(SIZE.label * 2.2);
  const key = props.steps.map((s) => `${s.kind ?? ''}:${s.label}`).join('|');
  const fit = useAutoFit(ref, {id: ctx.id, size, min: SIZE.labelMin, maxW: box.w - 2 * pad - 2 * rail - 24, maxH: box.h - 2 * pad - headH, key});
  const fs = fit.size;
  const rowH = Math.round(fs * 1.9);
  const rtl = props.steps.some((s) => isArabic(s.label));
  // selection timeline
  const sels = actsOf(ctx, 'select');
  const morph = presetFrames('morph', fps, true);
  let selY = -1;
  let selQ = 0;
  let selIdx = -1;
  let prevIdx = -1;
  for (const a of sels) {
    if (t < a.at) break;
    const idx = Math.min(n - 1, a.props.index as number);
    const q = progN(ctx, a.at, morph, ease.camera);
    selY = prevIdx < 0 ? idx : lerp(prevIdx, idx, q);
    selQ = prevIdx < 0 ? progN(ctx, a.at, presetFrames('label', fps)) : 1;
    selIdx = idx;
    prevIdx = idx;
  }
  const listH = n * rowH;
  return (
    <Stage ctx={ctx} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Glass style={{padding: `${pad}px ${pad + rail}px`, position: 'relative'}}>
        {/* film-strip rails with sprocket holes */}
        {[0, 1].map((side) => (
          <div key={side} style={{position: 'absolute', top: pad, bottom: pad, [side ? 'right' : 'left']: 10, width: rail - 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center', borderLeft: side ? `1px solid ${C.grid}` : undefined, borderRight: side ? undefined : `1px solid ${C.grid}`}}>
            {Array.from({length: Math.max(4, Math.round((listH + headH) / (rail * 0.9)))}, (_, i) => (
              <div key={i} style={{width: (rail - 14) * 0.55, height: (rail - 14) * 0.4, borderRadius: 3, background: C.void, border: `1px solid ${C.grid}`}} />
            ))}
          </div>
        ))}
        <div dir={rtl ? 'rtl' : 'ltr'} style={{height: headH, display: 'flex', alignItems: 'center', padding: '0 12px'}}>
          <Chip id={`${ctx.id}:head`} text="APPLIED STEPS" color={C.ink2} size={SIZE.labelMin} />
        </div>
        <div style={{position: 'relative'}}>
          {selY >= 0 ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: selY * rowH + 4,
                height: rowH - 8,
                borderRadius: 10,
                opacity: selQ,
                background: `${C.signal}${hex(0.16)}`,
                border: `1px solid ${C.signal}${hex(0.7)}`,
                boxShadow: `${glowBox(C.signal, fx, 0.4 + ctx.mod.glow)}, inset ${rtl ? '-' : ''}4px 0 0 ${C.signal}`,
              }}
            />
          ) : null}
          <div ref={ref} data-overflow={fit.overflow ? 1 : undefined} dir={rtl ? 'rtl' : 'ltr'} style={{display: 'flow-root', width: 'max-content', minWidth: '100%', fontSize: fs, outline: fit.overflow ? `2px dashed ${C.crit}` : undefined, position: 'relative'}}>
            {props.steps.map((s, i) => {
              const ent = prog(ctx, ctx.at + stag(i, fps, 3), 'label');
              const applied = selIdx < 0 || i <= selIdx;
              const isSel = i === selIdx;
              const tick = selIdx >= 0 && i <= selIdx;
              return (
                <div key={i} style={{height: rowH - 8, margin: '4px 0', display: 'flex', alignItems: 'center', gap: Math.round(fs * 0.5), padding: `0 ${Math.round(fs * 0.5)}px`, opacity: ent * (applied ? 1 : 0.42), transform: `translateY(${((1 - ent) * 6).toFixed(2)}px)`, borderRadius: 9, border: `1px solid ${isSel ? 'transparent' : C.grid}`, background: isSel ? 'transparent' : `${C.void}${hex(0.45)}`}}>
                  <svg width={fs * 0.7} height={fs * 0.7} viewBox="0 0 10 10" style={{flex: 'none'}}>
                    {tick ? <path d="M1.5 5.2 L4 7.6 L8.6 2.6" fill="none" stroke={C.ok} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /> : <circle cx={5} cy={5} r={2} fill={C.ink3} />}
                  </svg>
                  {s.kind ? <Chip id={`${ctx.id}:k${i}`} text={s.kind} color={isSel ? C.signal : C.ink2} size={Math.max(SIZE.labelMin, Math.round(fs * 0.72))} /> : null}
                  <div style={{whiteSpace: 'nowrap', flex: 1, color: isSel ? C.ink : applied ? C.ink : C.ink3, textShadow: halo}}>
                    <MixedText id={`${ctx.id}:s${i}`} text={s.label} size={fs} weight={isSel ? FONT.label.strong : FONT.label.weight} />
                  </div>
                  {/* the table after this step: a miniature (three columns, three rows); clean = ok once applied, signal when selected */}
                  <svg width={fs * 1.5} height={fs * 0.95} viewBox="0 0 30 19" style={{flex: 'none', opacity: applied ? 1 : 0.5}}>
                    {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={1 + c * 10} y={1 + r * 6.2} width={8} height={4.4} rx={1} fill={isSel ? C.signal : tick ? C.ok : C.ink3} opacity={r === 0 ? 0.95 : 0.5} />))}
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      </Glass>
    </Stage>
  );
};

export const AppliedSteps: DcComponent<Props> = {name: 'AppliedSteps', Component: AppliedStepsView, text: true, slot: 'center'};
