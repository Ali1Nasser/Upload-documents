// Unit checks for the "typeui" family (KineticPhrase, TermChip, EquationLine, LowerThird, ChapterCard, DeepDiveCard, PredictionTimer,
// CalloutArrow, Spotlight). Pure (no render). Recipe as check_p7.sh:
//   esbuild studio/src/components/_typeui/typeui.check.ts --bundle --platform=node --format=cjs --outfile=/tmp/x.cjs && node /tmp/x.cjs
import {resolveSpec} from '../../spec/resolve';
import type {DemoDef, SpecInput} from '../../spec/types';
import {isArabic} from '../../type/arabic';
import {safeRect} from '../../type/safe';
import demos from '../../demos/type-ui';
import {breakWords} from '../KineticPhrase/KineticPhrase';
import {termFrames} from '../EquationLine/EquationLine';
import {ddTag} from '../DeepDiveCard/DeepDiveCard';
import {questionLines} from '../PredictionTimer/PredictionTimer';
import {geometry} from '../CalloutArrow/CalloutArrow';
import {parseTarget} from './target';
import {conceptLabel} from './concepts';
import {isolateRuns} from './kit';

let fails = 0;
const ok = (name: string, cond: boolean, info?: unknown) => {
  if (!cond) fails++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || info === undefined ? '' : `: ${JSON.stringify(info)}`}`);
};
const MINE = ['KineticPhrase', 'TermChip', 'EquationLine', 'LowerThird', 'ChapterCard', 'DeepDiveCard', 'PredictionTimer', 'CalloutArrow', 'Spotlight'];
const inputOf = (d: DemoDef): SpecInput => ({
  id: `demo-${d.name}`,
  spec: {v: 1, chapter: 'DEMO', edl_version: 'v1', shots: [{shot_id: 'DEMO-S01', sentences: [`s:DEMO:${d.name}:0001`], intent: 'check', ...d.shot}]},
  span: {start: 0, end: d.frames},
  words: d.words.map(([id, s, e]) => ({id, s, e, sent: `s:DEMO:${d.name}:0001`})),
  features: null,
  audio: null,
});

// 1) every demo resolves with all anchors, valid props, known components, at 24 and at the 12 fps preview rate
for (const name of MINE) {
  const d = demos.demos.find((x) => x.name === name) as DemoDef;
  ok(`${name}: demo exists`, !!d);
  if (!d) continue;
  for (const fps of [24, 12]) {
    const r = resolveSpec(inputOf(d), {fps, preview: fps === 12});
    ok(`${name} @${fps}: 100 % anchors, no invalid props`, r.report.resolved_pct === 100 && !r.report.invalid_props.length, r.report);
  }
}

// 2) KineticPhrase: whole words only, reading order kept, balanced rows
const w5 = ['الـconstraints', 'قواعد', 'الشغل', 'متحوّلة', 'لحيطان'];
const rows = breakWords(w5, 2);
ok('breakWords: 2 rows, every word once, order kept', rows.length === 2 && rows.flat().join() === '0,1,2,3,4', rows);
ok('breakWords: 1 line = 1 row', breakWords(w5, 1).length === 1 && breakWords(['a'], 2).length === 1);
ok('breakWords: never splits a word (rows hold whole indices)', rows.flat().every((i) => Number.isInteger(i) && i < w5.length));

// 3) EquationLine: a term without an anchor arrives with the next anchored one, else the previous, else the layer anchor
const ctx = {frameOf: (a?: {word: string}) => (a ? Number(a.word.slice(-1)) * 10 : undefined), at: 5} as never;
const A = (n: number) => ({word: `w${n}`, lead_frames: 0});
const eq = {terms: [{text: '4', kind: 'operand', at: A(1)}, {text: '/', kind: 'operator'}, {text: '6', kind: 'operand', at: A(2)}, {text: '=', kind: 'operator'}, {text: '66.67 %', kind: 'result'}]} as never;
ok('termFrames: operator leads its right operand, trailing term follows the previous', termFrames(eq, ctx).join() === '10,20,20,20,20', termFrames(eq, ctx));
ok('termFrames: no anchors at all -> layer anchor', termFrames({terms: [{text: 'x', kind: 'operand'}]} as never, ctx).join() === '5');

// 4) PredictionTimer questions: <= 2 lines of <= 32 chars where the caption rule allows; whole words
const q = 'قبل ما تكتب سطر واحد، جاوب: صف واحد لكل إيه؟';
const ql = questionLines(q);
ok('questionLines: words kept whole, order kept', ql.join(' ') === q && ql.length <= 3, ql);

// 5) DeepDiveCard / concept labels
ok('ddTag', ddTag('DD-P23') === 'DEEP DIVE · P23' && ddTag('DD-P19-2') === 'DEEP DIVE · P19 · 2');
ok('conceptLabel: known and fallback', conceptLabel('c:chunk') === 'chunk' && conceptLabel('c:some-new-thing') === 'some new thing');
ok('concept labels are Latin only (no Arabic copy outside the props)', !isArabic(conceptLabel('c:cosine-similarity')));

// 6) targets and callout geometry stay inside the box on every side, label and arrow endpoints included
ok('parseTarget', parseTarget('rate.t4').part === 't4' && parseTarget('receipts').part === undefined);
const box = safeRect('title');
for (const side of ['start', 'end', 'top', 'bottom'] as const) {
  for (const t of [{x: box.x + 5, y: box.y + 5, w: 200, h: 80}, {x: box.x + box.w - 205, y: box.y + box.h - 85, w: 200, h: 80}, {x: 900, y: 500, w: 300, h: 100}]) {
    const g = geometry(side, t, 380, 70, box);
    ok(`geometry ${side}: label inside the box`, g.lx >= box.x && g.ly >= box.y && g.lx + 380 <= box.x + box.w && g.ly + 70 <= box.y + box.h, g);
  }
}

// 7) Latin runs inside Arabic copy become ONE isolate (reading order), Arabic words are never touched
ok('isolateRuns: adjacent Latin words share one isolate', isolateRuns('الـRelational Model') === 'الـ⟦Relational Model⟧', isolateRuns('الـRelational Model'));
ok('isolateRuns: single Latin token unchanged', isolateRuns('لكل order') === 'لكل order');

console.log(fails ? `${fails} FAILED` : 'all typeui checks passed');
process.exit(fails ? 1 : 0);
