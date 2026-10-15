// Unit checks for group code-media (Terminal, CodeTrace, SqlStages, LoopPlate, AIPlate, ManimInsert). Pure (no render).
//   esbuild studio/src/components/_code-media/code-media.check.ts --bundle --platform=node --format=cjs --outfile=/tmp/x.cjs && node /tmp/x.cjs
import {resolveSpec} from '../../spec/resolve';
import type {DemoDef, SpecInput} from '../../spec/types';
import demos from '../../demos/code-media';
import {codeRuns, codeLayout, tokenize, wrapLine} from './kit';
import {linesOf, splitClauses} from '../SqlStages/SqlStages';
import {loopIndex} from '../LoopPlate/LoopPlate';
import {insertIndex} from '../ManimInsert/ManimInsert';
import {sliceMotion} from '../AIPlate/AIPlate';
import {cursorEvents, traceLines} from '../CodeTrace/CodeTrace';
import {terminalTimeline} from '../Terminal/Terminal';
import {SIZE} from '../../tokens';
import {isArabic} from '../../type/arabic';

let fails = 0;
const ok = (name: string, cond: boolean, info?: unknown) => {
  if (!cond) fails++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || info === undefined ? '' : `: ${JSON.stringify(info)}`}`);
};

// ---- Arabic runs inside code are whole words; wrapping never cuts one
const line = '    x = f(a, b)   # النسبة المئوية للنجاح في كل إيصال من إيصالات العميل الجديد ثم نكمل';
const runs = codeRuns(line);
ok('codeRuns: one whole-word Arabic run', runs.filter((r) => r.ar).length === 1 && runs.map((r) => r.t).join('') === line);
for (const cols of [20, 28, 33, 40, 60]) {
  const pieces = wrapLine(line, cols);
  const joined = pieces.map(([s, e]) => line.slice(s, e)).join('');
  // no Arabic word may be split across two rows: every piece boundary must not sit between two Arabic letters
  const split = pieces.slice(1).some(([s]) => isArabic(line[s - 1] ?? '') && isArabic(line[s] ?? ''));
  ok(`wrapLine(${cols}): lossless, no Arabic word split`, joined === line && !split, {pieces});
}
ok('tokenize: SQL keyword, string, comment', (() => {
  const t = tokenize("SELECT 'x' -- n", 'sql');
  return t[0].k === 'kw' && t.some((k) => k.k === 'str') && t[t.length - 1].k === 'com';
})());
const L1 = codeLayout(['a = 1', 'return a'], 1700, 900, 0, 0);
ok('codeLayout: size within the token band, <= 12 rows', L1.size >= SIZE.labelMin && L1.size <= SIZE.label && L1.visRows <= 12, L1.size);

// ---- SqlStages: clause split is parenthesis / quote aware
const q = "SELECT c.tier, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.tier HAVING SUM(o.total) > 300 ORDER BY revenue DESC LIMIT 1";
const cl = splitClauses(q);
ok('splitClauses: 8 clauses in written order', cl.map((c) => c.stage).join(',') === 'SELECT,FROM,JOIN,WHERE,GROUP BY,HAVING,ORDER BY,LIMIT', cl.map((c) => c.stage));
ok('splitClauses: lossless text', cl.map((c) => c.text).join(' ') === q);
ok('splitClauses: a subquery keeps its own FROM inside the parentheses', (() => {
  const c = splitClauses('SELECT a FROM (SELECT b FROM t WHERE b > 1) s WHERE a = 2');
  return c.length === 3 && c[1].text.includes('(SELECT b FROM t WHERE b > 1)');
})());
ok("splitClauses: a keyword inside quotes is not a clause", splitClauses("SELECT 'FROM x' FROM t").length === 2);
ok('linesOf: DISTINCT / WINDOW light SELECT', linesOf(splitClauses('SELECT DISTINCT a, SUM(b) OVER (PARTITION BY a) FROM t'), 'DISTINCT').length === 1 && linesOf(splitClauses('SELECT SUM(b) OVER (PARTITION BY a) FROM t'), 'WINDOW').length === 1);

// ---- media frame functions are pure, seamless and clamped
const N = 240;
ok('loopIndex: starts at 0 on the anchor', loopIndex(10, 10, 1, 24, 24, N) === 0);
ok('loopIndex: wraps seamlessly (frame N -> 0)', loopIndex(10 + N, 10, 1, 24, 24, N) === 0 && loopIndex(10 + N - 1, 10, 1, 24, 24, N) === N - 1);
ok('loopIndex: speed 2 doubles the rate; 12 fps comp halves the index step', loopIndex(20, 10, 2, 24, 24, N) === 20 && loopIndex(16, 10, 1, 24, 12, N) === 12);
ok('loopIndex: before the anchor holds frame 0', loopIndex(0, 10, 1, 24, 24, N) === 0);
ok('insertIndex: clamps on the last frame', insertIndex(10000, 10, 24, 24, 84) === 83 && insertIndex(10, 10, 24, 24, 84) === 0 && insertIndex(34, 10, 24, 24, 84) === 24);
const mid = sliceMotion(0.45, 0.5, 0.5);
ok('sliceMotion: pivot plane does not move at mid-drift; near moves opposite to far', mid.x === 0 && sliceMotion(0.9, 1, 0.5).x * sliceMotion(0.1, 1, 0.5).x < 0);
ok('sliceMotion: parallax 0 = no motion', sliceMotion(0.9, 1, 0).x === 0 && sliceMotion(0.9, 1, 0).s === 1);

// ---- the demos resolve (100 % anchors) and the first visible step lands on the anchor frame
const inputOf = (d: DemoDef): SpecInput => ({
  id: `demo-${d.name}`,
  spec: {v: 1, chapter: 'DEMO', edl_version: 'v1', shots: [{shot_id: 'DEMO-S01', sentences: [`s:DEMO:${d.name}:0001`], intent: 'check', ...d.shot}]},
  span: {start: 0, end: d.frames},
  words: d.words.map(([id, s, e]) => ({id, s, e, sent: `s:DEMO:${d.name}:0001`})),
  features: null,
  audio: null,
});
for (const d of demos.demos) {
  for (const fps of [24, 12]) {
    const r = resolveSpec(inputOf(d), {fps, preview: fps === 12});
    ok(`${d.name} @${fps}: 100 % anchors, no invalid props`, r.report.resolved_pct === 100 && r.report.invalid_props.length === 0 && r.report.unknown_components.length === 0, r.report);
  }
}
{
  const d = demos.demos.find((x) => x.name === 'Terminal') as DemoDef;
  const r = resolveSpec(inputOf(d), {fps: 24, preview: false});
  const l = r.shots[0].layers[0];
  const ctx: any = {fps: 24, at: l.at, frameOf: (a: any) => (a ? r.words[a.word][0] - r.shots[0].from - a.lead_frames : undefined), actions: []};
  const props: any = l.props;
  const tl = terminalTimeline(props, ctx);
  ok('Terminal: line 0 starts on the layer anchor; anchored lines start on their anchor', tl[0].start === l.at && tl[1].start === ctx.frameOf(props.lines[1].at), tl);
  ok('Terminal: unanchored lines follow in order', tl.every((x, i) => i === 0 || x.start >= tl[i - 1].start));
}
{
  const d = demos.demos.find((x) => x.name === 'CodeTrace') as DemoDef;
  const r = resolveSpec(inputOf(d), {fps: 24, preview: false});
  const layers = r.shots[0].layers;
  const l = layers[0];
  const ctx: any = {fps: 24, at: l.at, frameOf: (a: any) => (a ? r.words[a.word][0] - r.shots[0].from - a.lead_frames : undefined), actions: l.actions};
  const props: any = l.props;
  const ev = cursorEvents(props, ctx, traceLines(props.code).length);
  ok('CodeTrace: highlights + the step action are time-ordered events', ev.length === 4 && ev.every((e, i) => i === 0 || e.t >= ev[i - 1].t), ev);
}
console.log(fails ? `FAIL ${fails}` : 'code-media check: all passed');
process.exit(fails ? 1 : 0);
