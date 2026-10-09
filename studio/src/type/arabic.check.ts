// Unit checks for src/type/arabic.ts. Run: bash studio/scripts/check_type.sh (esbuild bundle -> node).
import {LINE} from '../tokens';
import {MINUS, arabicFace, assertFormula, hasLowerMarks, hasTashkeel, lineHeightFor, minus, segment, stackGap} from './arabic';

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

if (fails) {
  console.error(`${fails} check(s) failed`);
  process.exit(1);
}
console.log('all type checks passed');
