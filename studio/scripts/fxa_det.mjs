// Determinism probe for group fx-a (queue only): node studio/scripts/fxa_det.mjs <outDir> <Name> <frame> [tier]
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
const [out, name, frame, tier = 'lite'] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const chromiumOptions = {gl: 'swiftshader'};
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
const onBrowserLog = (l) => {
  if (/DC_|Error/.test(l.text || '')) console.log('LOG', (l.text || '').slice(0, 300));
};
try {
  const inputProps = {demo: name, tier};
  const comp = await selectComposition({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, id: `Demo-${name}`, inputProps});
  const files = [];
  // `frame` may be a list: f0,f1,...,fk: the LAST entry is the probed still; the others render first (as dc render snap does) and the probed one is repeated
  const list = frame.split(',').map(Number);
  const probe = list[list.length - 1];
  for (const fr of list.slice(0, -1)) await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, onBrowserLog, composition: comp, frame: fr, output: path.join(out, `${name}_pre${fr}.png`), inputProps, scale: 0.5, imageFormat: 'png'});
  for (let i = 0; i < 3; i++) {
    const f = path.join(out, `${name}_${probe}_${i}.png`);
    await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, onBrowserLog, composition: comp, frame: probe, output: f, inputProps, scale: 0.5, imageFormat: 'png'});
    files.push(f);
  }
  const rd = (p) => PNG.sync.read(fs.readFileSync(p));
  const a = rd(files[0]);
  for (let i = 1; i < files.length; i++) {
    const b = rd(files[i]);
    const d = new PNG({width: a.width, height: a.height});
    const n = pixelmatch(a.data, b.data, d.data, a.width, a.height, {threshold: 0, includeAA: true});
    console.log(`det ${name} f${probe}: render0 vs render${i}: ${n} px`);
    if (n) fs.writeFileSync(path.join(out, `${name}_${probe}_diff${i}.png`), PNG.sync.write(d));
  }
} finally {
  await browser.close({silent: true});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
