// Unit checks for the P7 typography engine (words.ts, Text.tsx, safe.ts, reveal.ts). Run: bash studio/scripts/check_p7.sh.
import {FX, H, W} from '../tokens';
import {joinGapEm, segment} from './arabic';
import {presetFrames, revealProgress, revealStyle, wipeClip, ease, REVEAL_ONSET_F, type RevealOut} from './reveal';
import {LABEL_GAP_MIN_PX, checkLabelRow, layoutLabelRow, safeRect, slotRect} from './safe';
import {fitToWidth, hasEasternDigits, latinFeatures, needsSerifI, perLetterViolations, westernDigits, wordUnits} from './words';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

// whole-word units (never a fragment of an Arabic word)
eq('units: tatweel compound stays one unit', wordUnits('قسم الـroadmap').map((u) => u.t), ['قسم', 'الـroadmap']);
eq('units: isolate is one unit', wordUnits('النسبة ⟦4 / 6 = 66.67 %⟧').map((u) => u.t), ['النسبة', '⟦4 / 6 = 66.67 %⟧']);
eq('units: Latin flagged ltr', wordUnits('الـKafka KPI').map((u) => u.ltr), [false, true]);
eq('units: every Arabic unit is a whole word of the input', wordUnits('بيتقسم على الـpartitions').every((u) => 'بيتقسم على الـpartitions'.split(' ').includes(u.t)), true);
// per-letter detector
eq('perletter: split inside a word is a violation', perLetterViolations([{text: 'كت', el: 0}, {text: 'اب', el: 1}]).length, 1);
eq('perletter: tatweel + Latin isolate is allowed', perLetterViolations([{text: 'قسم الـ', el: 0}, {text: 'roadmap', el: 1}]).length, 0);
eq('perletter: word boundary (space) between elements is allowed', perLetterViolations([{text: 'قسم ', el: 0}, {text: 'الصفوف', el: 1}]).length, 0);
eq('perletter: split before a mark is a violation', perLetterViolations([{text: 'ثوان', el: 0}, {text: 'ٍ', el: 1}]).length, 1);
// digits
eq('Western digits: Arabic-Indic', westernDigits('٦٦٫٦٧ و ١٠٠٧'), '66٫67 و 1007');
eq('Western digits: Extended (Persian)', westernDigits('۹'), '9');
eq('Eastern digit detector', [hasEasternDigits('١٠٠٧'), hasEasternDigits('1007')], [true, false]);
// cv08 serifed I (arabic_r5 / PHASE-06: AI, API, KPI)
eq('cv08 on KPI / API / AI', ['KPI', 'API', 'AI'].map(needsSerifI), [true, true, true]);
eq('no cv08 on mixed case or caps without I', ['Kafka', 'SQL', 'partition'].map(needsSerifI), [false, false, false]);
eq('cv08 feature string', latinFeatures('KPI'), '"cv08" 1, "tnum" 1');
// ADR-010 join gap through the engine's segmentation
const segs = segment('قسم الـidempotency');
eq('segment keeps الـ with the Arabic run', segs.map((s) => s.ltr), [false, true]);
eq('ADR-010 text band, mixed case at 34 px = 0.30 em', joinGapEm(segs[0].t, segs[1].t, 34), 0.3);
eq('ADR-010 text band, caps at 34 px = 0.25 em', joinGapEm('الـ', 'AI', 34), 0.25);
eq('ADR-010 display band, caps at 92 px = 0.20 em', joinGapEm('الـ', 'KPI', 92), 0.2);
eq('ADR-010 display band, mixed at 92 px = 0.25 em', joinGapEm('الـ', 'partition', 92), 0.25);
// auto-fit + overflow
eq('fit: fits as is', fitToWidth(500, 92, 600, 56), {size: 92, overflow: false, natural: 500});
eq('fit: shrinks linearly to the box', fitToWidth(1000, 92, 600, 40).size <= 92 * 0.6 && fitToWidth(1000, 92, 600, 40).size >= 52, true);
eq('fit: below the floor = overflow', fitToWidth(2210, 120, 300, 120).overflow, true);
// safe areas and slots
const s = safeRect('title');
eq('title-safe 5 % per side', [s.x, s.y, s.w, s.h], [96, 54, 1728, 972]);
eq('every slot inside title-safe', (['full', 'center', 'start', 'end', 'top', 'bottom', 'upper-third', 'lower-third'] as const).every((k) => {
  const r = slotRect(k);
  return r.x >= s.x && r.y >= s.y && r.x + r.w <= s.x + s.w + 1 && r.y + r.h <= s.y + s.h + 1;
}), true);
eq('RTL: start slot is the right half', slotRect('start').x > W / 2 - 1, true);
eq('frame size from tokens', [W, H], [1920, 1080]);
// AT-4: one label baseline + >= 40 px gap
eq('AT-4 gap min is 40 px', LABEL_GAP_MIN_PX, 40);
eq('AT-4 ok row', checkLabelRow([{x: 0, w: 100, baseline: 500}, {x: 140, w: 80, baseline: 500}]), []);
eq('AT-4 gap 39 px fails', checkLabelRow([{x: 0, w: 100, baseline: 500}, {x: 139, w: 80, baseline: 500}]).length, 1);
eq('AT-4 baseline drift fails', checkLabelRow([{x: 0, w: 100, baseline: 500}, {x: 200, w: 80, baseline: 503}]).length, 1);
const lr = layoutLabelRow([200, 150, 120], 100, 1000);
eq('label row RTL: first label at the right edge', lr.xs[0], 800);
eq('label row: 40 px between labels', lr.xs[0] - (lr.xs[1] + 150), 40);
eq('label row overflow detected', layoutLabelRow([600, 600], 0, 1000).overflow, true);
// reveal: RTL wipe for Arabic, presets from tokens, exact settle
eq('arrive = 6 f @ 24 (tokens)', presetFrames('arrive', 24), 6);
eq('arrive = 3 f @ 12 (preview)', presetFrames('arrive', 12), 3);
eq('RTL wipe reveals from the right edge', wipeClip(0.25, 'rtl')?.startsWith('polygon(75.00%'), true);
eq('LTR wipe reveals from the left edge', wipeClip(0.25, 'ltr')?.includes('25.00% -60%'), true);
eq('settled word has no clip', wipeClip(1, 'rtl'), undefined);
eq('ease.arrive(1) is exactly 1 (Easing.out(exp) is 0.999)', ease.arrive(1), 1);
eq('hidden before the anchor (laid out, no shift)', revealStyle(-1, 24, 'arrive', 'rtl').style.visibility, 'hidden');
eq('settled after the preset', revealStyle(6, 24, 'arrive', 'rtl').style.clipPath, undefined);
// ADR-011 Q2 = RV1: the first visible step lands ON the anchor frame for every preset, at every fps, in both directions.
// ink = (visibility) x opacity x the visible fraction of the clip box (0 = nothing on screen).
const ink = (r: RevealOut): number => {
  if (!r.visible || r.style.visibility === 'hidden') return 0;
  const op = typeof r.style.opacity === 'number' ? r.style.opacity : 1;
  const cp = r.style.clipPath;
  if (!cp) return op;
  const m = /^polygon\((-?[\d.]+)% -60%, (-?[\d.]+)% -60%/.exec(cp);
  if (!m) return NaN;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const frac = Math.max(0, Math.min(100, b) - Math.max(0, a)) / 100; // visible horizontal span of the 0..100 % box
  return op * frac;
};
eq('RV1: onset shift is one frame', REVEAL_ONSET_F, 1);
for (const fps of [12, 15, 24])
  for (const preset of ['arrive', 'impact', 'label', 'wipe', 'count', 'morph'] as const)
    for (const dir of ['rtl', 'ltr'] as const) {
      const k = `${preset} ${dir} @${fps}`;
      eq(`RV1: ${k} anchor frame has visible ink > 0`, ink(revealStyle(0, fps, preset, dir)) > 0, true);
      eq(`RV1: ${k} frame before the anchor has no ink`, ink(revealStyle(-1, fps, preset, dir)), 0);
      const n = presetFrames(preset === 'wipe' || preset === 'count' || preset === 'morph' ? 'arrive' : preset, fps, preset === 'impact');
      eq(`RV1: ${k} settles at anchor + n - 1`, revealStyle(n - 1, fps, preset, dir).p, 1);
    }
eq('RV1: arrive @24 anchor frame = the old (RV2) anchor + 1 step', +revealStyle(0, 24, 'arrive', 'rtl').p.toFixed(3), 0.685);
eq('RV1: revealProgress > 0 on the anchor, 0 before it', revealProgress(0, 6) > 0 && revealProgress(-1, 6) === 0, true);
eq('RV1: ink parser sees an RTL half wipe as 0.5', ink({style: {clipPath: wipeClip(0.5, 'rtl')}, p: 0.5, flash: 0, visible: true}), 0.5);
eq('RV1: ink parser sees an LTR half wipe as 0.5', ink({style: {clipPath: wipeClip(0.5, 'ltr')}, p: 0.5, flash: 0, visible: true}), 0.5);
eq('clip overshoots vertically (tashkeel / glow never cut)', wipeClip(0.5, 'rtl')?.includes('-60%') && wipeClip(0.5, 'rtl')?.includes('160%'), true);
eq('CA never on Arabic (token)', FX.standard.caPx > 0, true);

if (fails) {
  console.error(`${fails} P7 type check(s) failed`);
  process.exit(1);
}
console.log('all P7 type checks passed');
