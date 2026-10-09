// P6 look-dev render driver (run through the queue: `python3 tools/dc.py q submit --label ... -- node studio/scripts/lookdev_render.mjs ...`).
// Usage: node scripts/lookdev_render.mjs <stills|motion> --gl=<swiftshader|swangle> [--only=ID,ID] [--conc=3]
// Bundles once, opens one browser, renders, and writes timings JSON to data/renders/lookdev/timings_<mode>_<gl>.json.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(HERE, '..');
const ROOT = path.resolve(STUDIO, '..');
const OUT = path.join(ROOT, 'data/renders/lookdev');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const args = process.argv.slice(2);
const mode = args[0];
const opt = Object.fromEntries(args.slice(1).map((a) => a.replace(/^--/, '').split('=')));
const gl = opt.gl || 'swiftshader';
const conc = Number(opt.conc || 3);
const only = opt.only ? new Set(opt.only.split(',')) : null;

const STILLS = [];
for (const f of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']) {
  for (const t of ['A', 'B', 'C']) STILLS.push({id: `${f}-${t}-standard`, props: {frame: f, typo: t, fx: 'standard'}});
  STILLS.push({id: `${f}-A-hero`, props: {frame: f, typo: 'A', fx: 'hero'}});
}
const MOTION = [
  {id: 'MA-standard', comp: 'LD-MA-Impact', props: {typo: 'A', fx: 'standard'}},
  {id: 'MA-hero', comp: 'LD-MA-Impact', props: {typo: 'A', fx: 'hero'}},
  {id: 'MB-standard', comp: 'LD-MB-Galaxy', props: {typo: 'A', fx: 'standard'}},
  {id: 'MB-hero', comp: 'LD-MB-Galaxy', props: {typo: 'A', fx: 'hero'}},
  {id: 'MC-standard', comp: 'LD-MC-Streak', props: {typo: 'A', fx: 'standard'}},
  {id: 'MC-hero', comp: 'LD-MC-Streak', props: {typo: 'A', fx: 'hero'}},
];

const chromiumOptions = {gl};
fs.mkdirSync(path.join(OUT, 'stills'), {recursive: true});
const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const bundleS = (Date.now() - t0) / 1000;
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
const res = {mode, gl, concurrency: mode === 'motion' ? conc : 1, bundle_s: bundleS, items: {}};
const outFile = path.join(OUT, `timings_${mode}_${gl}${opt.only ? '_partial' : ''}.json`);
const save = () => fs.writeFileSync(outFile, JSON.stringify(res, null, 1));

if (mode === 'stills') {
  for (const s of STILLS) {
    if (only && !only.has(s.id)) continue;
    const composition = await selectComposition({serveUrl, id: 'LookdevStill', inputProps: s.props, puppeteerInstance: browser, browserExecutable: BROWSER, chromiumOptions});
    const output = path.join(OUT, 'stills', `${s.id}.png`);
    const a = Date.now();
    await renderStill({composition, serveUrl, output, inputProps: s.props, puppeteerInstance: browser, browserExecutable: BROWSER, chromiumOptions, imageFormat: 'png', frame: 0, onBrowserLog: opt.log ? (l) => console.log('[browser]', l.type, l.text.slice(0, 400)) : undefined});
    res.items[s.id] = {s: (Date.now() - a) / 1000, png: path.relative(ROOT, output), props: s.props};
    console.log(s.id, res.items[s.id].s.toFixed(2), 's');
    save();
  }
} else if (mode === 'motion') {
  for (const m of MOTION) {
    if (only && !only.has(m.id)) continue;
    const composition = await selectComposition({serveUrl, id: m.comp, inputProps: m.props, puppeteerInstance: browser, browserExecutable: BROWSER, chromiumOptions});
    const base = {composition, serveUrl, codec: 'h264', crf: 18, inputProps: m.props, concurrency: conc, puppeteerInstance: browser, browserExecutable: BROWSER, chromiumOptions, imageFormat: 'jpeg', jpegQuality: 90, logLevel: 'error'};
    const o = Date.now();
    await renderMedia({...base, outputLocation: path.join(OUT, `_overhead.mp4`), frameRange: [0, 0]});
    const overhead = (Date.now() - o) / 1000;
    const output = path.join(OUT, `${m.id}_${gl}.mp4`);
    const a = Date.now();
    await renderMedia({...base, outputLocation: output});
    const wall = (Date.now() - a) / 1000;
    const n = composition.durationInFrames;
    const net = Math.max(0.001, wall - overhead);
    res.items[m.id] = {
      comp: m.comp,
      props: m.props,
      frames: n,
      wall_s: +wall.toFixed(2),
      overhead_s: +overhead.toFixed(2),
      fps_throughput: +((n - 1) / net).toFixed(3),
      s_per_frame: +((net * conc) / (n - 1)).toFixed(3),
      s_per_frame_box: +(net / (n - 1)).toFixed(4),
      mp4: path.relative(ROOT, output),
      mb: +(fs.statSync(output).size / 1e6).toFixed(2),
    };
    console.log(m.id, JSON.stringify(res.items[m.id]));
    save();
  }
}
fs.rmSync(path.join(OUT, '_overhead.mp4'), {force: true});
await browser.close({silent: true});
res.total_s = (Date.now() - t0) / 1000;
save();
console.log('done', outFile, res.total_s);
