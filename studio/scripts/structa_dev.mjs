// struct-a dev stills (queue only): node studio/scripts/structa_dev.mjs <outDir> <Name>:<f,f,f>[:<tier>] ...
// Env: SC=scale (default 0.5), DET=1 renders each frame twice and reports differing pixels (threshold 0) + writes <name>_<f>_det.png.
// Prints DC_QA / DC_REGISTRY findings. Dev helper of the struct-a group; never a deliverable.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const [out, ...jobs] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const chromiumOptions = {gl: 'swiftshader'};
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
const onBrowserLog = (l) => {
  if (/DC_QA|DC_REGISTRY|Error|error/.test(l.text || '')) console.log('LOG', (l.text || '').slice(0, 400));
};
const SC = Number(process.env.SC || 0.5);
try {
  for (const j of jobs) {
    const [name, frames, tier = 'standard'] = j.split(':');
    const inputProps = {demo: name, tier};
    const comp = await selectComposition({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, id: `Demo-${name}`, inputProps});
    console.log(`${name}: ${comp.durationInFrames} frames @ ${comp.fps} fps`);
    if (process.env.DET) {
      // warm-up render (discarded): the first render of a session is cold (fonts / glyph cache / shader compile)
      const f0 = Number(frames.split(',')[0]);
      await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, onBrowserLog, composition: comp, frame: f0, inputProps, scale: SC, imageFormat: 'png', output: path.join(out, '_warm.png')});
      fs.rmSync(path.join(out, '_warm.png'), {force: true});
    }
    for (const f of frames.split(',').map(Number)) {
      const o = path.join(out, `${name}_${tier}_${f}.png`);
      const base = {serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, onBrowserLog, composition: comp, frame: f, inputProps, scale: SC, imageFormat: 'png'};
      await renderStill({...base, output: o});
      if (process.env.DET) {
        // render again REP-1 more times; report each render against the previous one and against the first
        const reps = Number(process.env.REP || 2);
        const first = PNG.sync.read(fs.readFileSync(o));
        let prev = first;
        const out2 = [];
        for (let r = 1; r < reps; r++) {
          const o2 = o.replace('.png', `_r${r}.png`);
          await renderStill({...base, output: o2});
          const b = PNG.sync.read(fs.readFileSync(o2));
          const d = new PNG({width: b.width, height: b.height});
          const pxPrev = pixelmatch(prev.data, b.data, d.data, b.width, b.height, {threshold: 0, includeAA: true});
          const pxFirst = pixelmatch(first.data, b.data, null, b.width, b.height, {threshold: 0, includeAA: true});
          out2.push(`r${r}: vs prev ${pxPrev} vs first ${pxFirst}`);
          if (pxPrev && r === 1) fs.writeFileSync(o.replace('.png', '_det.png'), PNG.sync.write(d));
          prev = b;
          fs.rmSync(o2);
        }
        console.log(`DET ${name} f${f} ${tier}: ${out2.join(' | ')}`);
      }
    }
  }
} finally {
  await browser.close({silent: true});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
