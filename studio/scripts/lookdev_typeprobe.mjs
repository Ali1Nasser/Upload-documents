// Isolated type-probe renders for the join-gap OCR gate (arabic r3 B2). Queue only:
//   python3 tools/dc.py q submit --label typeprobe -- node studio/scripts/lookdev_typeprobe.mjs
// Writes data/renders/lookdev/r3/probe/<id>.png + probes.json; score with `python3 -I studio/scripts/lookdev_typeprobe_ocr.py`.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(HERE, '..');
const OUT = path.resolve(STUDIO, '../data/renders/lookdev/r3/probe');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
// id, text, size (px), latScale as used in the frame (KWord/Mix 0.92, Label term 0.9)
export const PROBES = [
  {id: 'F3-title', text: 'الترتيب داخل الـpartition', size: 92, latScale: 0.92, gate: true},
  {id: 'F6-head', text: 'أعلى نتيجة: قسم الـroadmap', size: 72, latScale: 0.92, gate: false},
  {id: 'roadmap-72', text: 'قسم الـroadmap', size: 72, latScale: 0.92, gate: true},
  {id: 'idem-72', text: 'قسم الـidempotency', size: 72, latScale: 0.92, gate: true},
  {id: 'F4-card-36', text: 'قسم الـidempotency', size: 36, latScale: 0.92, gate: false},
  {id: 'F6-label-roadmap-34', text: 'قسم الـroadmap', size: 34, latScale: 0.9, gate: false},
  {id: 'F6-label-idem-34', text: 'قسم الـidempotency', size: 34, latScale: 0.9, gate: false},
  {id: 'caps-AI-32', text: 'الـAI', size: 32, latScale: 1, gate: false},
  {id: 'caps-SQL-92', text: 'الـSQL', size: 92, latScale: 0.92, gate: false},
];
// `--sweep=0.1,0.2,...` renders every probe once per J1 gap (em of the Arabic run) to find the smallest gap that reads
const sweep = (process.argv.find((a) => a.startsWith('--sweep=')) || '').slice(8).split(',').filter(Boolean).map(Number);
const RUNS = sweep.length ? PROBES.flatMap((p) => sweep.map((g) => ({...p, id: `${p.id}@${g}`, gapEm: g}))) : PROBES;
fs.mkdirSync(OUT, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const chromiumOptions = {gl: 'swiftshader'};
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
for (const p of RUNS) {
  const inputProps = {text: p.text, size: p.size, typo: 'A', latScale: p.latScale, gapEm: p.gapEm};
  const composition = await selectComposition({serveUrl, id: 'LD-TypeProbe', inputProps, puppeteerInstance: browser, browserExecutable: BROWSER, chromiumOptions});
  await renderStill({composition, serveUrl, output: path.join(OUT, `${p.id}.png`), inputProps, puppeteerInstance: browser, browserExecutable: BROWSER, chromiumOptions, imageFormat: 'png', frame: 0});
  console.log('probe', p.id);
}
fs.writeFileSync(path.join(OUT, 'probes.json'), JSON.stringify(RUNS, null, 1));
await browser.close({silent: true});
