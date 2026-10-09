// Isolated type probe (arabic r3 B2 gate): one mixed Arabic/Latin string on a flat void, no glow, no FX, rendered through the
// same Mix path (faces, J1 join gap) the frames use. For OCR checks only (`lookdev_typeprobe.mjs`); never a deliverable.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../tokens';
import {arabicFace} from '../type/arabic';
import {Mix} from './kit';
import {TYPO, TypoId} from './theme';

export type ProbeProps = {text: string; size: number; typo: TypoId; latScale?: number; gapEm?: number};

export const TypeProbe: React.FC<ProbeProps> = ({text, size, typo, latScale, gapEm}) => {
  const t = TYPO[typo];
  const face = arabicFace(size);
  return (
    <AbsoluteFill style={{background: C.void, alignItems: 'center', justifyContent: 'center'}}>
      <div dir="rtl" lang="ar" style={{fontSize: size, color: C.ink, fontWeight: face.weight, whiteSpace: 'nowrap', lineHeight: 1.6}}>
        <Mix text={text} arFont={face.family} latFont={t.lat} latWeight={t.latWeight} latScale={latScale} px={size} gapOverrideEm={gapEm} style={{fontWeight: face.weight, wordSpacing: face.wordSpacing}} />
      </div>
    </AbsoluteFill>
  );
};
