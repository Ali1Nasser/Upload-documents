// QA detector self-test (P7): a fixture that MUST trip every render-time detector: overflow, per-letter (element split),
// fragment (substring / typewriter reveal, M6), unsafe (copy outside title-safe after transforms, B3) and label (AT-4: labels
// closer than 40 px, review m12). It also holds a NEGATIVE case (review M8): copy that fits title-safe only after auto-fit has
// shrunk it must NOT be reported unsafe or overflow, so the checks must read the settled layout (settle.ts), not the pre-fit one.
// `dc render snap _selftest` passes only if all five kinds fire on their own fixtures and the negative case stays clean.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FX} from '../tokens';
import {KText, LabelRow} from '../type/Text';
import {checkArabicWholeWords, checkTitleSafe, checkWholeWords} from '../type/qa';
import {safeRect} from '../type/safe';
import {loadFonts} from '../type/fonts';
import {checkWhenSettled} from '../type/settle';

loadFonts();

const OVERFLOW_TEXT = 'الـconstraints مش زينة ومش overhead';
const TYPEWRITER_FULL = 'الكمبيوتر بيعمل';
/** M8 negative case: ~3,150 px wide at its natural 160 px (far outside title-safe), <= 1,000 px once auto-fit shrinks it (~50 px). */
export const FIT_SHRINK_TEXT = 'INTERNATIONALIZATIONMIDDLEWARES';
const LABELS = ['الـKafka', 'الـpartition', 'offset'];

export const QaSelftest: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(
    () =>
      checkWhenSettled(`selftest ${frame}`, () => {
        checkWholeWords(ref.current);
        checkArabicWholeWords(ref.current, [OVERFLOW_TEXT, 'كتاب', TYPEWRITER_FULL, ...LABELS]);
        checkTitleSafe(ref.current, safeRect('title'), 1);
      }),
    [frame],
  );
  return (
    <AbsoluteFill ref={ref} style={{background: C.void}}>
      <div style={{position: 'absolute', left: 200, top: 200, width: 300, height: 200}}>
        {/* overflow: a long phrase in a 300 px box with a 120 px floor */}
        <KText id="selftest:overflow" text={OVERFLOW_TEXT} size={120} min={120} maxW={300} fx={FX.lite} at={0} fps={24} frame={frame} />
      </div>
      {/* M8 negative: fits only after shrinking (natural 160 px is ~3,150 px wide; 786 px at the 40 px floor); must report neither unsafe nor overflow */}
      <div style={{position: 'absolute', left: 200, top: 420, width: 1000, height: 160}}>
        <KText id="selftest:fitshrink" text={FIT_SHRINK_TEXT} size={160} min={40} maxW={1000} fx={FX.lite} at={0} fps={24} frame={frame} />
      </div>
      {/* label (AT-4): three labels laid out 16 px apart on one baseline (< 40 px); the row check must report it */}
      <div style={{position: 'absolute', left: 200, top: 640}}>
        <LabelRow id="selftest:label" labels={LABELS} size={34} maxW={700} gap={16} />
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
