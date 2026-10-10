// AT-11 (ADR-010 RT-010-1/4; PHASE-06 handoff): the 34 px (and 32 px) الـ+Latin labels IN MOTION, for the arabic-typographer.
// Text band join gap (< 56 px): ALL-CAPS 0.25 em, mixed case 0.30 em (frozen JOIN_GAP, src/type/arabic.ts). Every label is one
// whole element revealed by the frozen `wipe` (mask only) or `arrive` preset, RTL, never per letter.
// `dc render at11` renders it through the queue and extracts settled + mid-wipe frames to reports/p7/at11/.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop, Post} from '../fx/Atmos';
import {C, FX, H, W} from '../tokens';
import {KText} from '../type/Text';
import {checkArabicWholeWords, checkWholeWords} from '../type/qa';
import {loadFonts} from '../type/fonts';

loadFonts();

import {AT11_LABELS, AT11_SIZES, AT11_START} from './AT11.consts';

export type AT11Props = {preset: 'wipe' | 'arrive'};
export const AT11: React.FC<AT11Props> = ({preset}) => {
  const frame = useCurrentFrame();
  const ref = React.useRef<HTMLDivElement>(null);
  // the same whole-word guards as SpecPlayer (P7 review m12): element splits and substring fragments fail `dc render at11`
  React.useLayoutEffect(() => {
    checkWholeWords(ref.current);
    checkArabicWholeWords(ref.current, AT11_LABELS);
  }, [frame]);
  const fx = FX.standard;
  const colW = W * 0.36;
  const rowH = 118;
  const top = (H - AT11_LABELS.length * rowH) / 2;
  return (
    <AbsoluteFill ref={ref} style={{background: C.void}}>
      <Backdrop fx={fx} />
      {AT11_SIZES.map((size, ci) =>
        AT11_LABELS.map((t, i) => (
          <div key={`${size}-${i}`} dir="rtl" style={{position: 'absolute', top: top + i * rowH, height: rowH, right: W * 0.1 + ci * (colW + W * 0.08), width: colW, display: 'flex', alignItems: 'center', justifyContent: 'flex-start'}}>
            <KText id={`at11:${size}:${i}`} text={t} size={size} min={size} maxW={colW} fx={fx} at={AT11_START} fps={24} frame={frame} preset={preset} color={C.ink} role="sentence" />
          </div>
        )),
      )}
      {AT11_SIZES.map((size, ci) => (
        <div key={`h${size}`} style={{position: 'absolute', top: top - 64, right: W * 0.1 + ci * (colW + W * 0.08), width: colW, textAlign: 'right', color: C.ink3, font: `500 24px 'DC-JBMono'`}}>
          {`${size} px · ${preset}`}
        </div>
      ))}
      <Post fx={fx} />
    </AbsoluteFill>
  );
};
