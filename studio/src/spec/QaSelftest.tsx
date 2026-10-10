// QA detector self-test (P7): a fixture that MUST trip every render-time detector: overflow, per-letter (element split),
// fragment (substring / typewriter reveal, M6) and unsafe (copy outside title-safe after transforms, B3).
// `dc render snap _selftest` passes only if all four DC_QA findings are reported (proves the detectors fail tests).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FX} from '../tokens';
import {KText} from '../type/Text';
import {checkArabicWholeWords, checkTitleSafe, checkWholeWords} from '../type/qa';
import {safeRect} from '../type/safe';
import {loadFonts} from '../type/fonts';

loadFonts();

const OVERFLOW_TEXT = 'الـconstraints مش زينة ومش overhead';
const TYPEWRITER_FULL = 'الكمبيوتر بيعمل';

export const QaSelftest: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    checkWholeWords(ref.current);
    checkArabicWholeWords(ref.current, [OVERFLOW_TEXT, 'كتاب', TYPEWRITER_FULL]);
    checkTitleSafe(ref.current, safeRect('title'), 1);
  });
  return (
    <AbsoluteFill ref={ref} style={{background: C.void}}>
      <div style={{position: 'absolute', left: 200, top: 200, width: 300, height: 200}}>
        {/* overflow: a long phrase in a 300 px box with a 120 px floor */}
        <KText id="selftest:overflow" text={OVERFLOW_TEXT} size={120} min={120} maxW={300} fx={FX.lite} at={0} fps={24} frame={frame} />
      </div>
      {/* per-letter split: an element boundary inside one Arabic word (forbidden; must be reported) */}
      <div data-dc-text="selftest:perletter" dir="rtl" style={{position: 'absolute', left: 900, top: 600, color: C.ink, fontSize: 64}}>
        <span>كت</span>
        <span>اب</span>
      </div>
      {/* fragment: a substring reveal (first n characters) inside ONE text node, no element boundary to see; the guard must still fire */}
      <div data-dc-text="selftest:fragment" dir="rtl" style={{position: 'absolute', left: 900, top: 760, color: C.ink, fontSize: 64}}>
        {TYPEWRITER_FULL.slice(0, 5)}
      </div>
      {/* unsafe: whole-word copy whose on-screen box (after a transform) leaves title-safe */}
      <div style={{position: 'absolute', left: 120, top: 860, transform: 'translateX(-90px) scale(1.2)', transformOrigin: '0 0'}}>
        <div data-dc-text="selftest:unsafe" dir="rtl" style={{color: C.ink, fontSize: 48, whiteSpace: 'nowrap'}}>
          كتاب
        </div>
      </div>
    </AbsoluteFill>
  );
};
