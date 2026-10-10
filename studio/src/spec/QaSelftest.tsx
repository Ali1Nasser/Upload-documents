// QA detector self-test (P7): a fixture that MUST trip the overflow detector and the per-letter detector.
// `dc render snap _selftest` passes only if both DC_QA findings are reported (proves the detectors fail tests).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FX} from '../tokens';
import {KText} from '../type/Text';
import {checkWholeWords} from '../type/qa';
import {loadFonts} from '../type/fonts';

loadFonts();

export const QaSelftest: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => checkWholeWords(ref.current));
  return (
    <AbsoluteFill ref={ref} style={{background: C.void}}>
      <div style={{position: 'absolute', left: 200, top: 200, width: 300, height: 200}}>
        {/* overflow: a long phrase in a 300 px box with a 120 px floor */}
        <KText id="selftest:overflow" text="الـconstraints مش زينة ومش overhead" size={120} min={120} maxW={300} fx={FX.lite} at={0} fps={24} frame={frame} />
      </div>
      {/* per-letter split: an element boundary inside one Arabic word (forbidden; must be reported) */}
      <div data-dc-text="selftest:perletter" dir="rtl" style={{position: 'absolute', left: 900, top: 600, color: C.ink, fontSize: 64}}>
        <span>كت</span>
        <span>اب</span>
      </div>
    </AbsoluteFill>
  );
};
