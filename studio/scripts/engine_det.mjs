// Engine-owner determinism probe (CR-012, queue only): node studio/scripts/engine_det.mjs <outDir> <repeats> <Name:frame:tag>...
// Renders each still <repeats> times (fresh page each, lite tier, scale 0.5, exactly like `dc render snap`) in ONE browser and
// prints (a) the exact pixel diff of every repeat vs repeat #0 (threshold 0, AA counted) and (b) the snap metric vs the approved
// baseline studio/test/baselines/<Name>/<tag>.png (threshold 0.1, AA counted, pass <= 16 px). Never writes baselines.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const [out, reps, ...specs] = process.argv.slice(2);
const N = Number(reps) || 5;
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const chromiumOptions = {gl: 'swiftshader'};
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
const onBrowserLog = (l) => {
  if (/DC_|Error/.test(l.text || '')) console.log('LOG', (l.text || '').slice(0, 300));
};
const rd = (p) => PNG.sync.read(fs.readFileSync(p));
const summary = [];
try {
  for (const spec of specs) {
    const [name, fr, tag] = spec.split(':');
    const frame = Number(fr);
    const inputProps = {demo: name, tier: 'lite'};
    const comp = await selectComposition({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, id: `Demo-${name}`, inputProps});
    const base = tag ? path.join(STUDIO, 'test/baselines', name, `${tag}.png`) : '';
    const B = base && fs.existsSync(base) ? rd(base) : null;
    const det = [];
    const vsBase = [];
    let first = null;
    for (let i = 0; i < N; i++) {
      const f = path.join(out, `${name}_${frame}_${i}.png`);
      await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, onBrowserLog, composition: comp, frame, output: f, inputProps, scale: 0.5, imageFormat: 'png'});
      const a = rd(f);
      if (!first) first = a;
      det.push(pixelmatch(first.data, a.data, null, a.width, a.height, {threshold: 0, includeAA: true}));
      if (B) vsBase.push(pixelmatch(B.data, a.data, null, a.width, a.height, {threshold: 0.1, includeAA: true}));
    }
    const line = `${name} f${frame}${tag ? ` (${tag})` : ''}: det vs #0 [${det.join(',')}]${B ? ` | vs approved baseline [${vsBase.join(',')}]` : ''}`;
    console.log(line);
    summary.push(line);
  }
} finally {
  await browser.close({silent: true});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
