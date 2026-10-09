// Mirrors the frozen zod catalog into JSON Schema: harness/schemas/components/<Name>.json (+ _WordAnchor.json, _index.json),
// then runs the contract checks. Run: bash studio/scripts/check_catalog.sh (esbuild bundle -> node). Light CPU, no render.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {z} from 'zod';
import {CATALOG} from '../src/components/catalog';
import {WordAnchor} from '../src/components/contract';
import {FPS, PRESETS, msToFrames} from '../src/tokens';

const ROOT = process.argv[2];
const OUT = path.join(ROOT, 'harness/schemas/components');
fs.mkdirSync(OUT, {recursive: true});
const js = (s: z.ZodType) => z.toJSONSchema(s, {io: 'input', unrepresentable: 'any'}) as Record<string, unknown>;
const write = (file: string, obj: unknown) => {
  const txt = JSON.stringify(obj, null, 1) + '\n';
  fs.writeFileSync(path.join(OUT, file), txt);
  return crypto.createHash('sha256').update(txt).digest('hex');
};

let fails = 0;
const eq = (name: string, ok: boolean, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: ${detail}`}`);
};

const index: Record<string, unknown> = {};
index._WordAnchor = write('_WordAnchor.json', {...js(WordAnchor), $id: 'dc:component:_WordAnchor', title: '{word, lead_frames}', description: 'Word anchor (golden rule 2); lead_frames at the film fps (ADR-002 F24).'});
for (const [name, c] of Object.entries(CATALOG)) {
  const actions = Object.fromEntries(Object.entries(c.actions).map(([a, s]) => [a, js(s)]));
  const sha = write(`${name}.json`, {...js(c.props), $id: `dc:component:${name}`, title: name, description: c.description, 'x-family': c.family, 'x-status': 'frozen-contract', 'x-impl': 'P7', 'x-actions': actions});
  index[name] = {family: c.family, actions: Object.keys(c.actions), sha256: sha};
}
const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && f !== '_index.json');
for (const f of files) if (!(f.replace(/\.json$/, '') in index)) fs.rmSync(path.join(OUT, f)); // no stale schemas
write('_index.json', {v: 1, source: 'studio/src/components/*/schema.ts (zod 4, io=input)', count: Object.keys(CATALOG).length, components: index});

// ---- contract checks ----
eq('104 catalog components (04 §8)', Object.keys(CATALOG).length === 104, String(Object.keys(CATALOG).length));
for (const [id, p] of Object.entries(PRESETS)) {
  const want = p.f24 === null ? null : [msToFrames(p.ms[0], 24), msToFrames(p.ms[1], 24)];
  eq(`preset ${id} f24 = msToFrames(ms, 24)`, JSON.stringify(want) === JSON.stringify(p.f24), JSON.stringify([want, p.f24]));
}
eq('film fps is 24 (ADR-002 F24)', FPS === 24);
eq('anchor accepts {word, lead_frames}', WordAnchor.safeParse({word: 'w:S1:ar-natural:004871', lead_frames: 3}).success);
eq('anchor requires lead_frames (as scene_spec.schema.json)', !WordAnchor.safeParse({word: 'w:S4:P23:000417'}).success);
eq('anchor rejects seconds', !WordAnchor.safeParse({word: 'w:S1:ar-natural:004871', lead_frames: 3, start_s: 1.2}).success);
eq('anchor rejects a bad word id', !WordAnchor.safeParse({word: 'S1-004871', lead_frames: 3}).success);
const kw = CATALOG.KineticWord.props;
eq('KineticWord accepts الـKafka', kw.safeParse({text: 'الـKafka', preset: 'impact'}).success);
eq('KineticWord rejects Eastern digits', !kw.safeParse({text: '٥ ثواني'}).success);
eq('KineticWord rejects a raw colour', !kw.safeParse({text: 'المعنى', color: '#FF0000'}).success);
eq('KineticWord rejects unknown props (strict)', !kw.safeParse({text: 'المعنى', fontSize: 90}).success);
eq('KineticPhrase caps 6 words', !CATALOG.KineticPhrase.props.safeParse({words: Array.from({length: 7}, (_, i) => ({text: 'كلمة', at: {word: `w:S1:ar-natural:00000${i}`, lead_frames: 2}}))}).success);
eq('NumberCounter needs a ref', !CATALOG.NumberCounter.props.safeParse({to: {value: 0.165}}).success);
eq('NumberCounter ok with data ref', CATALOG.NumberCounter.props.safeParse({to: {value: 0.165, ref: 'd:6.18:1', decimals: 3}}).success);
eq('05 §8 example VectorGalaxy props', CATALOG.VectorGalaxy.props.safeParse({clusters: ['payments', 'refunds', 'fraud'], seed: 33}).success);
eq('05 §8 example VectorGalaxy.highlightNeighbors', CATALOG.VectorGalaxy.actions.highlightNeighbors.safeParse({k: 3, scores_ref: 'd:6.18:1'}).success);
eq('05 §8 example TermChip', CATALOG.TermChip.props.safeParse({term: 'semantic search', gloss_ar: 'بحث بالمعنى'}).success);
eq('05 §8 example LoopPlate', CATALOG.LoopPlate.props.safeParse({plate: 'vector-galaxy-a'}).success);
eq('ParticleField over the 1,500 hero cap rejected', !CATALOG.ParticleField.props.safeParse({count: 4000, seed: 1}).success);
const timeKeys = /^(start|end|start_ms|end_ms|start_s|end_s|seconds|time|time_ms|frame|start_frame|end_frame|duration|duration_ms|duration_s|ms|fps)$/;
const bad: string[] = [];
const walk = (o: unknown, where: string) => {
  if (!o || typeof o !== 'object') return;
  const props = (o as {properties?: Record<string, unknown>}).properties;
  if (props) for (const k of Object.keys(props)) if (timeKeys.test(k)) bad.push(`${where}.${k}`);
  for (const [k, v] of Object.entries(o)) walk(v, `${where}/${k}`);
};
for (const f of fs.readdirSync(OUT)) walk(JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')), f);
eq('no numeric time fields in any component schema (05 §8 lint)', bad.length === 0, bad.join(', '));
console.log(fails ? `${fails} FAILED` : `all catalog checks passed; ${Object.keys(CATALOG).length} schemas in harness/schemas/components`);
process.exit(fails ? 1 : 0);
