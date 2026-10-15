// Review stills for group struct-b (queue only): node studio/scripts/structb_stills.mjs <outDir> <Name>:<f,f,f>[:<tier>] ... (copy of fxa_stills.mjs with a 180 s browser timeout for a loaded box)
// Renders Demo-<Name> frames at scale 0.5 (JPEG) at the given tier (default standard) and prints DC_QA / DC_TARGET logs.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const [out, ...jobs] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
const chromiumOptions = {gl: 'swiftshader'};
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions, timeoutInMilliseconds: 180000});
const onBrowserLog = (l) => {
  if (/DC_QA|DC_TARGET|DC_OBJECT|Error/.test(l.text || '')) console.log('LOG', (l.text || '').slice(0, 300));
};
try {
  for (const j of jobs) {
    const [name, frames, tier = 'standard'] = j.split(':');
    const inputProps = {demo: name, tier};
    const comp = await selectComposition({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, id: `Demo-${name}`, inputProps});
    for (const f of frames.split(',').map(Number)) {
      await renderStill({serveUrl, puppeteerInstance: browser, chromiumOptions, browserExecutable: BROWSER, onBrowserLog, composition: comp, frame: f, output: path.join(out, `${name}_${tier}_${f}.jpg`), inputProps, scale: Number(process.env.SC || 0.5), imageFormat: 'jpeg', jpegQuality: 85});
    }
  }
} finally {
  await browser.close({silent: true});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
