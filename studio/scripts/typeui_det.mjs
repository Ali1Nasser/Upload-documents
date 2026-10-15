// Determinism probe for group typeui (queue only): node studio/scripts/typeui_det.mjs <outDir> <tier> <Name:f1,f2,...>... ; renders each frame list in order in ONE browser (like dc render snap) and compares repeated frames
// Renders the same still several times (fresh page each, like dc render snap), prints pixel diffs between repeats.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const [out, tier, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const chromiumOptions = {gl: 'swiftshader'};
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
const onBrowserLog = (l) => {
  if (/DC_|Error/.test(l.text || '')) console.log('LOG', (l.text || '').slice(0, 300));
};
try {
  for (const spec of specs) {
  const [name, fl] = spec.split(':');
  const seq = fl.split(',').map(Number);
  const inputProps = {demo: name, tier};
  const comp = await selectComposition({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, id: `Demo-${name}`, inputProps});
  const rd = (p) => PNG.sync.read(fs.readFileSync(p));
  const files = [];
  for (let i = 0; i < seq.length; i++) {
    const f = path.join(out, `${name}_${seq[i]}_${i}.png`);
    await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, onBrowserLog, composition: comp, frame: seq[i], output: f, inputProps, scale: 0.5, imageFormat: 'png'});
    files.push(f);
  }
  for (let i = 0; i < seq.length; i++)
    for (let j = i + 1; j < seq.length; j++) {
      if (seq[i] !== seq[j]) continue;
      const a = rd(files[i]);
      const b = rd(files[j]);
      console.log(`det ${name} f${seq[i]}: render#${i} vs render#${j}: ${pixelmatch(a.data, b.data, null, a.width, a.height, {threshold: 0, includeAA: true})} px`);
    }
  }
} finally {
  await browser.close({silent: true});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
