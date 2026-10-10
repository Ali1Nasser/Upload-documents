// Unit checks for the scene compiler (src/spec/resolve.ts) on the REAL locked EDL + word map and corpus/specs/_demo.json.
// Run: bash studio/scripts/check_p7.sh (esbuild bundle -> node; reads corpus/ read-only).
import fs from 'node:fs';
import path from 'node:path';
import {CUT_LEAD, playSpan, resolveSpec, WINDOW_PAD} from './resolve';
import type {Spec, SpecInput, WordRow} from './types';

const ROOT = process.env.DC_ROOT || path.resolve(process.cwd(), '..');
let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

const spec: Spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/specs/_demo.json'), 'utf8'));
const edl = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/edl/master_edl.v1.json'), 'utf8'));
const ch = edl.chapters.find((c: {id: string}) => c.id === spec.chapter);
const words: WordRow[] = [];
for (const line of fs.readFileSync(path.join(ROOT, 'corpus', edl.word_map), 'utf8').split('\n')) {
  if (!line.includes(`"chapter": "${spec.chapter}"`)) continue;
  const r = JSON.parse(line);
  words.push({id: r.word_id, s: r.rec_start_frame, e: r.rec_end_frame, sent: r.sent_id});
}
const wm = new Map(words.map((w) => [w.id, w]));
const input: SpecInput = {id: '_demo', spec, span: {start: ch.start_frame, end: ch.end_frame}, words, features: null};

// span: window = first word of `from` - 12 f .. last word of `to` + 24 f (clamped), identical to dc spec lint
const ps = playSpan(input);
const first = Math.min(...words.filter((w) => w.sent === spec.window!.from).map((w) => w.s));
const last = Math.max(...words.filter((w) => w.sent === spec.window!.to).map((w) => w.e));
eq('window span = lint window', [ps.start, ps.end], [Math.max(ch.start_frame, first - WINDOW_PAD.in), Math.min(ch.end_frame, last + WINDOW_PAD.out)]);
eq('window only for underscore specs', playSpan({...input, id: 'CH-10'}).window, false);
eq('demo window is 45-60 s', (ps.end - ps.start) / 24 >= 45 && (ps.end - ps.start) / 24 <= 60, true);

// final 24 fps
const r24 = resolveSpec(input, {fps: 24, preview: false});
eq('24 fps: 100 % anchors resolved', [r24.report.anchors_resolved, r24.report.anchors_total, r24.report.resolved_pct], [r24.report.anchors_total, r24.report.anchors_total, 100]);
eq('24 fps: no invalid props / unknown components', [r24.report.invalid_props.length, r24.report.unknown_components.length], [0, 0]);
eq('24 fps: duration = EDL window', r24.frames, ps.end - ps.start);
eq('24 fps: spec tiers kept', [...new Set(r24.shots.map((s) => s.tier))], ['standard']);
let exact = 0;
let total = 0;
r24.shots.forEach((sh, si) => {
  sh.layers.forEach((l) => {
    const ly = spec.shots.find((x) => x.shot_id === sh.shot_id)!.layers[l.li];
    if (!ly.at) return;
    total++;
    if (sh.from + l.at === wm.get(ly.at.word)!.s - ly.at.lead_frames - ps.start) exact++;
  });
  if (si > 0) {
    const fw = Math.min(...spec.shots[si].sentences.flatMap((s) => words.filter((w) => w.sent === s).map((w) => w.s)));
    const prevEnd = Math.max(...spec.shots[si - 1].sentences.flatMap((s) => words.filter((w) => w.sent === s).map((w) => w.e)));
    if (sh.from !== Math.max(prevEnd + 1, fw - CUT_LEAD) - ps.start) fails++, console.log(`FAIL cut of ${sh.shot_id} at ${sh.from}`);
  }
});
eq('24 fps: every layer anchor = word start - lead_frames (dc spec lint formula)', exact, total);
eq('24 fps: cuts 5 f before the first word, inside the pause', r24.shots.map((s) => s.from)[1], 91792 - CUT_LEAD - ps.start);
eq('transitions: dissolve 14 f, WhipPan -> whip, last shot none', r24.shots.map((s) => s.transition.type + s.transition.frames), ['dissolve14', 'dissolve14', 'whip12', 'cut0', 'cut0']);
eq('actions attach to their target layer', r24.shots[0].layers.find((l) => l.id === 'rules')!.actions.map((a) => a.name), ['addRow', 'addRow', 'highlightRows', 'highlightRows']);
eq('until anchors resolve to exit frames', r24.shots[4].layers.filter((l) => l.until !== undefined).length, 3);

// preview 12 fps: every frame is a film frame (exact halves), lite tier
const r12 = resolveSpec(input, {fps: 12, preview: true});
eq('12 fps: 100 % resolved', r12.report.resolved_pct, 100);
eq('12 fps: duration halves', r12.frames, Math.round((ps.end - ps.start) / 2));
eq('12 fps: lite tier forced', [...new Set(r12.shots.map((s) => s.tier))], ['lite']);
const w1685 = 'w:S1:ar-natural:001685';
eq('12 fps: counter 1007 starts on its word onset (half frames)', r12.words[w1685][0], Math.round((wm.get(w1685)!.s - ps.start) / 2));
eq('deterministic: same input -> same output', JSON.stringify(resolveSpec(input, {fps: 12, preview: true})), JSON.stringify(r12));

// failure paths are reported, not hidden
const bad: Spec = JSON.parse(JSON.stringify(spec));
bad.shots[0].layers[4].props.text = 'كلمة ١٢'; // Eastern digits -> invalid (frozen Txt)
bad.shots[0].layers[6].at = {word: 'w:S1:ar-natural:009999', lead_frames: 2}; // not in this chapter
bad.shots[1].layers.push({component: 'NoSuchThing', props: {}});
const rb = resolveSpec({...input, spec: bad}, {fps: 24, preview: false, implemented: (n) => n !== 'KineticWord'});
eq('invalid props reported', rb.report.invalid_props.length, 1);
eq('unresolved anchor reported (< 100 %)', [rb.report.unresolved.length, rb.report.resolved_pct < 100], [1, true]);
eq('unknown component reported', rb.report.unknown_components, ['NoSuchThing']);
eq('unimplemented component reported', rb.report.unimplemented, ['KineticWord']);

// audio-reactive curves from corpus/edl/features
const feat = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/edl/features', `${spec.chapter}.json`), 'utf8'));
const ar: Spec = JSON.parse(JSON.stringify(spec));
ar.shots[3].layers.push({component: 'AudioReactive', props: {feature: 'rms_dbfs', to: 'n3', param: 'glow', amount: 0.4}});
const ra = resolveSpec({...input, spec: ar, features: feat}, {fps: 24, preview: false});
const cv = ra.curves['rms_dbfs:medium'];
eq('audio curve: one value per frame, 0..1, not flat', [cv.length === ra.frames, cv.every((v) => v >= 0 && v <= 1), Math.max(...cv) > 0.3], [true, true, true]);
eq('audio mod attached to its layer', ra.shots[3].mods.map((m) => `${m.to}.${m.param}`), ['n3.glow']);

if (fails) {
  console.error(`${fails} compiler check(s) failed`);
  process.exit(1);
}
console.log('all compiler checks passed');
