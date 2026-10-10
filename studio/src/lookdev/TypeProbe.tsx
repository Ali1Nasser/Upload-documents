// Isolated type probe (arabic r3 B2 gate): one mixed Arabic/Latin string on a flat void, no glow, no FX, rendered through the
// same Mix path (faces, J1 join gap) the frames use. For OCR checks only (`lookdev_typeprobe.mjs`); never a deliverable.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../tokens';
import {arabicFace} from '../type/arabic';
import {Mix} from './kit';
import {TYPO, TypoId} from './theme';
import {TagContent} from './world';

// `chip`: render `text` as an F7 district tag (number `n` at the RTL start, label = text) through the frame's own TagContent,
// with the tag container's font/weight/gap; `latFeatures` overrides the tag's Latin features (A/B check only).
export type ProbeProps = {text: string; size: number; typo: TypoId; latScale?: number; gapEm?: number; chip?: {n: number; latFeatures?: string}};

export const TypeProbe: React.FC<ProbeProps> = ({text, size, typo, latScale, gapEm, chip}) => {
  const t = TYPO[typo];
  const face = arabicFace(size);
  if (chip)
    return (
      <AbsoluteFill style={{background: C.void, alignItems: 'center', justifyContent: 'center'}}>
        <div dir="rtl" lang="ar" style={{display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', fontFamily: `'${t.body}'`, fontWeight: 600, fontSize: size, lineHeight: 1.3, color: C.ink}}>
          <TagContent n={chip.n} label={text} typo={t} col={C.ink} latFeatures={chip.latFeatures} />
        </div>
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={{background: C.void, alignItems: 'center', justifyContent: 'center'}}>
      <div dir="rtl" lang="ar" style={{fontSize: size, color: C.ink, fontWeight: face.weight, whiteSpace: 'nowrap', lineHeight: 1.6}}>
        <Mix text={text} arFont={face.family} latFont={t.lat} latWeight={t.latWeight} latScale={latScale} px={size} gapOverrideEm={gapEm} style={{fontWeight: face.weight, wordSpacing: face.wordSpacing}} />
      </div>
    </AbsoluteFill>
  );
};
