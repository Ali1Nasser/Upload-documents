// struct-b determinism probe (queue only): node studio/scripts/structb_det.mjs <outDir> <Name> <frame> [tier]
// Renders Demo-<Name> frames in the given order (comma list, e.g. 0,11,59,119,59; PNG, scale 0.5) and compares the first and last render of the last frame number; prints the bounding box of differing pixels and writes the diff PNG.
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
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions, timeoutInMilliseconds: 180000});
try {
  const inputProps = {demo: name, tier};
  const comp = await selectComposition({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, id: `Demo-${name}`, inputProps});
  const seq = frame.split(',').map(Number);
  const files = [];
  for (const [k, fr] of seq.entries()) {
    const f = path.join(out, `${name}_${k}_f${fr}.png`);
    await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, composition: comp, frame: fr, output: f, inputProps, scale: 0.5, imageFormat: 'png'});
    files.push(f);
  }
  const last = seq[seq.length - 1];
  const rd = (f) => PNG.sync.read(fs.readFileSync(f));
  const first = seq.indexOf(last);
  const a = rd(files[first]);
  const b = rd(files[files.length - 1]);
  const diff = new PNG({width: a.width, height: a.height});
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {threshold: 0, includeAA: true});
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) { const i = (y * a.width + x) * 4; if (diff.data[i] === 255 && diff.data[i + 1] === 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  console.log(`DET ${name} seq ${frame}: ${n} px, bbox [${x0},${y0},${x1},${y1}]`);
  if (n) fs.writeFileSync(path.join(out, `${name}_diff.png`), PNG.sync.write(diff));
} finally {
  await browser.close({silent: true});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
