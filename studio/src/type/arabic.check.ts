// Unit checks for src/type/arabic.ts. Run: bash studio/scripts/check_type.sh (esbuild bundle -> node).
import {LINE} from '../tokens';
import {MINUS, arabicFace, assertArrows, assertFormula, blockLineHeight, breakCaption, hasLowerMarks, hasTashkeel, joinGapEm, labelRole, latinFamily, lineHeightFor, minus, segment, stackGap, visLen, withUnit} from './arabic';
import {displayText} from './overrides';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

// tashkeel descender clearance
eq('ثوانٍ has tashkeel', hasTashkeel('5 ثوانٍ مقابل 57'), true);
eq('ثوانٍ has lower mark (kasratan)', hasLowerMarks('5 ثوانٍ مقابل 57'), true);
eq('plain line has no tashkeel', hasTashkeel('غيّر سطر واحد في الكود'.replace('ّ', '')), false);
eq('line-height with tashkeel >= 1.6', lineHeightFor('5 ثوانٍ مقابل 57') >= LINE.tashkeel, true);
eq('line-height without tashkeel = base', lineHeightFor('الصفوف الباقية'), LINE.base);
const g = stackGap({text: '5 ثوانٍ مقابل 57', size: 104}, {text: 'غيّر سطر واحد في الكود', size: 48}, 'title-sub');
eq('title-sub gap >= 0.3 em (title already at line-height 1.6)', g >= Math.round(LINE.titleSubGapEm * 104), true);
eq('tight line with lower marks gets descender clearance', stackGap({text: '5 ثوانٍ', size: 104, lineHeight: 1.1}, {text: 'سطر', size: 48}) >= Math.round(LINE.lowerMarkEm * 104), true);
eq('إ counts as a lower mark (hamza below)', hasLowerMarks('إزاي'), true);
eq('lines gap without marks = 0', stackGap({text: 'الصفوف الباقية', size: 92}, {text: 'هات الصفوف', size: 56}), 0);

// U+2212 minus
eq('lag formula uses U+2212', minus('lag = 11 - 7 = 4'), `lag = 11 ${MINUS} 7 = 4`);
eq('leading sign', minus('-0.5 px'), `${MINUS}0.5 px`);
eq('hyphenated words untouched', minus('at-least-once CH-26 T-A'), 'at-least-once CH-26 T-A');
let threw = false;
try {
  assertFormula('11 - 7');
} catch {
  threw = true;
}
eq('assertFormula rejects hyphen operator', threw, true);
eq('assertFormula accepts U+2212', assertFormula(`11 ${MINUS} 7`), `11 ${MINUS} 7`);

// faces (ADR-003)
eq('>= 56 px uses Alexandria 700', arabicFace(56).family, 'DC-Alexandria');
eq('< 56 px uses Plex Sans Arabic 600', [arabicFace(48).family, arabicFace(48).weight], ['DC-PlexArabic', 600]);

// whole words, tatweel joins, isolates
eq('tatweel join keeps الـ in the Arabic run', segment('الترتيب داخل الـpartition'), [
  {t: 'الترتيب داخل الـ', ltr: false},
  {t: 'partition', ltr: true},
]);
eq('no Arabic word is split', segment('واثق وغلط وضعيف').length, 1);

// caption breaking (<= 32 visible chars, <= 2 lines, balanced, word boundaries only)
eq('F2 subtitle splits at the phrase seam', breakCaption('SQL مش بتشتغل بالترتيب اللي إنت كاتبها بيه').lines, ['SQL مش بتشتغل بالترتيب', 'اللي إنت كاتبها بيه']);
eq('F4 query caption splits before نفس', breakCaption('إزاي أمنع ⟦job⟧ إنها تحمّل نفس الصفوف مرتين').lines, ['إزاي أمنع ⟦job⟧ إنها تحمّل', 'نفس الصفوف مرتين']);
eq('shadda does not count as a character', visLen('تحمّل'), 4);
eq('short caption stays one line', breakCaption('دي الشغلانة كلها').lines.length, 1);
eq('3-line text overflows a 2-line rule', breakCaption('واحد اتنين تلاتة اربعة خمسة ستة سبعة تمانية تسعة عشرة حداشر اتناشر', 12).overflow, true);
eq('caption block with shadda uses line-height 1.6', blockLineHeight(['إزاي أمنع job إنها تحمّل', 'نفس الصفوف مرتين']), LINE.tashkeel);

// inline Latin face, arrows, units
eq('Latin inside an Arabic sentence = Inter Tight', latinFamily(labelRole('قسم الـroadmap')), 'DC-InterTight');
eq('pure Latin data label = mono', latinFamily(labelRole('⟦producer⟧')), 'DC-JBMono');
eq('→ inside a numeric isolate is fine', assertArrows('⟦0.165 → 0.227⟧ بعد التوسيع'), '⟦0.165 → 0.227⟧ بعد التوسيع');
let arrowThrew = false;
try {
  assertArrows('6 فواتير → 6 صفوف');
} catch {
  arrowThrew = true;
}
eq("'→' between Arabic blocks is rejected", arrowThrew, true);
eq("'←' between Arabic blocks passes", assertArrows('الجهاز ← الداتا'), 'الجهاز ← الداتا');
eq('unit after the number, Latin, in an isolate', withUnit(57, 's'), '⟦57 s⟧');
eq('negative value with unit uses U+2212', withUnit(-50, 'EGP'), `⟦${MINUS}50 EGP⟧`);

// tatweel join gap (arabic r2 J1)
eq('ALL-CAPS Latin after الـ gets 0.12em', joinGapEm('الـ', 'AI'), 0.12);
eq('mixed-case Latin after الـ gets 0.06em', joinGapEm('قسم الـ', 'roadmap'), 0.06);
eq('no tatweel = no gap', joinGapEm('بترتيب ', 'layers'), 0);
eq('segment keeps الـ with the Arabic run before the isolate', segment('الـAI').map((x) => x.t).join('|'), 'الـ|AI');

// display overrides (canon untouched)
eq('roadmap article override', displayText('w:S1:ar-natural:005968', 'roadmap'), 'الـroadmap');
eq('CH-34 label override drops MSA tanween', hasTashkeel(displayText('CH-34:labels_ar:0', '5 ثوانٍ مقابل 57')), false);
eq('no override = verbatim', displayText('w:S1:ar-natural:005965', 'أعلى'), 'أعلى');

if (fails) {
  console.error(`${fails} check(s) failed`);
  process.exit(1);
}
console.log('all type checks passed');
