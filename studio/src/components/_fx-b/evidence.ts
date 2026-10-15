// fx-b evidence driver (critic review round 1, B1-B5). Renders stills of the SpecPlayer composition for jobs that a one-shot
// DemoDef cannot express: a demo at a named FX tier (standard / hero), a demo with synthetic LABELLED audio features (CR-005 is
// open, so Demo-AudioReactive itself has none), and two-shot specs that cross a shot transition (WhipPan / LightStreakTransition /
// MatchCut are consumed as the outgoing shot's transition, which a single-shot demo never plays). Evidence only: never a
// deliverable, never a baseline. Built with esbuild like studio/scripts/p7.ts and run INSIDE the tsp queue:
//   esbuild evidence.ts --bundle --platform=node --format=cjs --packages=external --outfile=<tmp>/fxb_ev.cjs
//   dc q submit --label fxb-evidence -- env NODE_PATH=studio/node_modules DC_STUDIO=<repo>/studio node <tmp>/fxb_ev.cjs <jobs.json> <outDir>
// jobs.json: [{tag, demo?: <fx-b demo name>, input?: SpecInput, features?: Features, tier, frames: number[], debug?, scale?}]
// Writes <outDir>/<tag>_f<frame>.png and <outDir>/evidence_run.json (DC_QA findings per job, determinism pairs).
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition, type BrowserLog} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import demos from '../../demos/fx-b';
import type {DemoDef, Features, SpecInput} from '../../spec/types';

const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const chromiumOptions = {gl: 'swiftshader' as const};

type Job = {tag: string; demo?: string; input?: SpecInput; features?: Features | null; tier: 'lite' | 'standard' | 'hero'; frames: number[]; debug?: Record<string, unknown> | null; scale?: number; det?: number; planeBlur?: Record<string, number>};

/** Same mapping as SpecPlayer demoInput (a demo = a one-shot spec on synthetic word ids), plus optional synthetic features. */
const inputOfDemo = (d: DemoDef, features: Features | null): SpecInput => {
  const sent = `s:DEMO:${d.name}:0001`;
  return {
    id: `demo-${d.name}`,
    spec: {v: 1, chapter: 'DEMO', edl_version: 'v1', shots: [{shot_id: 'DEMO-S01', sentences: [sent], intent: d.shot.intent ?? `demo ${d.name}`, ...d.shot}]},
    span: {start: 0, end: d.frames},
    words: d.words.map(([id, s, e]) => ({id, s, e, sent})),
    features,
    audio: null,
  };
};

const main = async () => {
  const [jobsP, outDir] = process.argv.slice(2);
  const jobs = JSON.parse(fs.readFileSync(jobsP, 'utf8')) as Job[];
  fs.mkdirSync(outDir, {recursive: true});
  const studio = process.env.DC_STUDIO ?? path.resolve(__dirname, '..', '..', '..'); // the bundled cjs lives outside studio/
  const serveUrl = await bundle({entryPoint: path.join(studio, 'src/index.ts'), publicDir: path.join(studio, 'public')});
  const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
  let cur: string[] = [];
  const onBrowserLog = (l: BrowserLog) => {
    const t = l.text || '';
    if (t.startsWith('DC_QA ') || t.startsWith('DC_REGISTRY ') || t.startsWith('DC_FONT_FAIL')) cur.push(t.slice(0, 300));
  };
  const c = {serveUrl, puppeteerInstance: browser, chromiumOptions, onBrowserLog, browserExecutable: BROWSER};
  const run: Record<string, unknown>[] = [];
  try {
    for (const j of jobs) {
      cur = [];
      const d = j.demo ? demos.demos.find((x) => x.name === j.demo) : undefined;
      const input = j.input ?? (d ? inputOfDemo(d, j.features ?? null) : null);
      if (!input) throw new Error(`job ${j.tag}: no input`);
      if (j.planeBlur) {
        // DOF evidence: same demo, DepthLayers planes[].blur overridden by layer id (the shipped demo has blur 0, CR-017)
        for (const sh of (input.spec as {shots: {layers: {component: string; props: {planes?: {layer: string; blur: number}[]}}[]}[]}).shots)
          for (const l of sh.layers) if (l.component === 'DepthLayers') for (const p of l.props.planes ?? []) if (j.planeBlur[p.layer] !== undefined) p.blur = j.planeBlur[p.layer];
      }
      const inputProps = {input, tier: j.tier, debug: j.debug ?? null};
      const comp = await selectComposition({...c, id: 'SpecPlayer', inputProps});
      const files: string[] = [];
      for (const f of j.frames) {
        const out = path.join(outDir, `${j.tag}_f${String(f).padStart(3, '0')}.png`);
        await renderStill({...c, composition: comp, frame: f, output: out, inputProps, scale: j.scale ?? 0.5, imageFormat: 'png'});
        files.push(path.basename(out));
      }
      let det: number | null = null;
      if (j.det !== undefined) {
        const a = path.join(outDir, `${j.tag}_det_a.png`);
        const b = path.join(outDir, `${j.tag}_det_b.png`);
        await renderStill({...c, composition: comp, frame: j.det, output: a, inputProps, scale: j.scale ?? 0.5, imageFormat: 'png'});
        await renderStill({...c, composition: comp, frame: j.det, output: b, inputProps, scale: j.scale ?? 0.5, imageFormat: 'png'});
        const pa = PNG.sync.read(fs.readFileSync(a));
        det = pixelmatch(pa.data, PNG.sync.read(fs.readFileSync(b)).data, null, pa.width, pa.height, {threshold: 0, includeAA: true});
        if (!det) fs.rmSync(a), fs.rmSync(b); // keep a non-deterministic pair for inspection
      }
      const shots = (comp.props as {resolved?: {shots: {shot_id: string; from: number; dur: number; tier: string; transition: unknown}[]}}).resolved?.shots ?? [];
      run.push({tag: j.tag, tier: j.tier, frames: j.frames, files, fps: comp.fps, duration: comp.durationInFrames, shots: shots.map((s) => ({id: s.shot_id, from: s.from, dur: s.dur, tier: s.tier, transition: s.transition})), synthetic_features: !!j.features, determinism_px: det, findings: [...new Set(cur)]});
      console.log(`evidence ${j.tag}: ${files.length} stills${det !== null ? `, det ${det} px` : ''}, findings ${cur.length}`);
    }
  } finally {
    await browser.close({silent: true});
    fs.rmSync(serveUrl, {recursive: true, force: true});
  }
  fs.writeFileSync(path.join(outDir, 'evidence_run.json'), `${JSON.stringify(run, null, 1)}\n`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
