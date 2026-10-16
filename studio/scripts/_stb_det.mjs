// TEMP (ShatterToBlocks determinism): node scripts/_stb_det.mjs <outDir> <frame> <nRenders>
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const [out, frame, nr] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const chromiumOptions = {gl: 'swiftshader'};
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
try {
  const inputProps = {demo: 'ShatterToBlocks', tier: 'lite'};
  const comp = await selectComposition({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, id: 'Demo-ShatterToBlocks', inputProps});
  const files = [];
  for (let i = 0; i < Number(nr); i++) {
    const f = path.join(out, `r${i}.png`);
    await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, composition: comp, frame: Number(frame), output: f, inputProps, scale: 0.5, imageFormat: 'png'});
    files.push(f);
  }
  const rd = (p) => PNG.sync.read(fs.readFileSync(p));
  const a = rd(files[0]);
  const r = files.slice(1).map((f) => { const b = rd(f); return pixelmatch(a.data, b.data, null, a.width, a.height, {threshold: 0, includeAA: true}); });
  console.log(`VARIANT diffs vs first = ${r.join(',')}`);
} finally {
  await browser.close({silent: true});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
