// P7 render driver: `dc render snap|perf|spec|at11` (tools/dclib/render.py builds this file with esbuild and runs it INSIDE the
// tsp queue; never run it directly on a busy box). GL is swiftshader only (ADR-002 GL-SS). One bundle, one browser per run.
//   snap <Name> [--approve]        stills at 0/50/100 % of Demo-<Name>, pixelmatch vs studio/test/baselines/<Name>/, QA findings fail
//   snap _selftest                 the QA-Selftest fixture MUST report an overflow and a per-letter finding
//   perf <Name> [--tiers=a,b] [--frames=N]   s/frame at 1080p per FX tier -> reports/perf/components/<Name>.json
//   spec <id> [--final] [--fps=N] [--no-audio]   render corpus/specs/<id>.json; resolver report next to the render
//   at11                           AT-11 clip (wipe + arrive) and settled / mid-wipe JPGs -> reports/p7/at11/
import {bundle} from '@remotion/bundler';
import {openBrowser, renderFrames, renderMedia, renderStill, selectComposition, type BrowserLog} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {AT11_LABELS, AT11_SIZES, AT11_START} from '../src/at11/AT11.consts';
import {PREVIEW_FPS, playSpan} from '../src/spec/resolve';
import type {Features, Resolved, SpecInput, WordRow} from '../src/spec/types';
import {FPS, FX, PREVIEW, PRESETS} from '../src/tokens';
import {JOIN_GAP} from '../src/type/arabic';

const args = process.argv.slice(2);
const mode = args[0];
const pos = args.filter((a) => !a.startsWith('--')).slice(1);
const opt: Record<string, string> = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : '1'];
}));
const ROOT = path.resolve(opt.root || path.join(process.cwd(), '..'));
const STUDIO = path.join(ROOT, 'studio');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const chromiumOptions = {gl: 'swiftshader' as const};
const rel = (p: string) => path.relative(ROOT, p);
const writeJson = (p: string, o: unknown) => {
  fs.mkdirSync(path.dirname(p), {recursive: true});
  fs.writeFileSync(p, `${JSON.stringify(o, null, 1)}\n`);
};
const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

/** Snapshot thresholds (documented in docs/tools/component_guide.md). Stills use the lite tier (no grain / bokeh noise) so the
 * PNG baselines stay small (~0.1 MB) and diff only layout, type and motion; tier looks are frozen tokens, checked by perf + look-dev. */
export const SNAP = {scale: 0.5, tier: 'lite', pixelThreshold: 0.1, maxDiffRatio: 0.001, frames: [0, 0.5, 1]} as const;
/** Perf budgets, slot-seconds per frame at 1080p, concurrency 1 (ADR-002: standard S-hi + 10 % = 0.201 box s/frame x 3 slots). */
export const PERF_BUDGET = {lite: 0.45, standard: 0.6, hero: 3.1} as const;

type Qa = {kind: string; id: string; detail: unknown};
const qa: Qa[] = [];
const regProblems: string[] = [];
const onBrowserLog = (l: BrowserLog) => {
  const t = l.text || '';
  if (t.startsWith('DC_QA ')) {
    try {
      const f = JSON.parse(t.slice(6)) as Qa;
      if (!qa.some((x) => x.kind === f.kind && x.id === f.id)) qa.push(f);
    } catch {
      qa.push({kind: 'parse', id: 'log', detail: t.slice(0, 200)});
    }
  } else if (t.startsWith('DC_REGISTRY ')) regProblems.push(t.slice(12));
  else if (t.startsWith('DC_FONT_FAIL')) qa.push({kind: 'font', id: 'load', detail: t});
};

const queueLoad = () => {
  try {
    const out = execFileSync('tsp', ['-l'], {encoding: 'utf8'});
    return {running: (out.match(/\brunning\b/g) || []).length, queued: (out.match(/\bqueued\b/g) || []).length};
  } catch {
    return {running: null, queued: null};
  }
};

const main = async () => {
  if (!['snap', 'perf', 'spec', 'at11'].includes(mode)) throw new Error(`usage: p7 snap|perf|spec|at11 ... (got ${mode})`);
  const t0 = Date.now();
  const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: path.join(STUDIO, 'public')});
  const bundleS = (Date.now() - t0) / 1000;
  const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions});
  const common = {serveUrl, puppeteerInstance: browser, chromiumOptions, onBrowserLog, browserExecutable: BROWSER};
  let code = 0;
  try {
    if (mode === 'snap') code = await snap(common, pos[0]);
    else if (mode === 'perf') code = await perf(common, pos[0]);
    else if (mode === 'spec') code = await spec(common, pos[0], serveUrl);
    else code = await at11(common);
  } finally {
    await browser.close({silent: true});
    fs.rmSync(serveUrl, {recursive: true, force: true}); // ~40 MB per bundle in /tmp; disk is tight (queue guard: 3 GB margin)
  }
  console.log(`p7 ${mode}: bundle ${bundleS.toFixed(1)} s, total ${((Date.now() - t0) / 1000).toFixed(1)} s, exit ${code}`);
  return code;
};

type Common = {serveUrl: string; puppeteerInstance: Awaited<ReturnType<typeof openBrowser>>; chromiumOptions: typeof chromiumOptions; onBrowserLog: typeof onBrowserLog; browserExecutable: string};

const readPng = (p: string) => PNG.sync.read(fs.readFileSync(p));
const sha256 = (p: string) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// ---------------------------------------------------------------- snap
async function snap(c: Common, name: string): Promise<number> {
  if (!name) throw new Error('snap <Name>');
  const out = path.join(ROOT, 'data/renders/p7/snap', name);
  fs.mkdirSync(out, {recursive: true});
  if (name === '_selftest') {
    const comp = await selectComposition({...c, id: 'QA-Selftest', inputProps: {}});
    await renderStill({...c, composition: comp, frame: 1, output: path.join(out, 'selftest.png'), inputProps: {}, scale: SNAP.scale});
    const kinds = new Set(qa.map((q) => q.kind));
    const pass = kinds.has('overflow') && kinds.has('perletter');
    const rep = {v: 1, name, at: now(), expect: ['overflow', 'perletter'], findings: qa, pass};
    writeJson(path.join(ROOT, 'reports/p7/snap/_selftest.json'), rep);
    console.log(`selftest: findings ${[...kinds].join(',') || 'none'} -> ${pass ? 'PASS (detectors fire)' : 'FAIL (a detector is silent)'}`);
    return pass ? 0 : 1;
  }
  const id = `Demo-${name}`;
  const snapProps = {demo: name, tier: opt.tier || SNAP.tier};
  const comp = await selectComposition({...c, id, inputProps: snapProps});
  const n = comp.durationInFrames;
  const frames = SNAP.frames.map((f) => Math.min(n - 1, Math.floor(f * (n - 1))));
  const base = path.join(STUDIO, 'test/baselines', name);
  const results: Record<string, unknown>[] = [];
  let ok = true;
  for (const [k, fr] of frames.entries()) {
    const tag = `p${Math.round(SNAP.frames[k] * 100)}`;
    const file = path.join(out, `${tag}.png`);
    await renderStill({...c, composition: comp, frame: fr, output: file, inputProps: snapProps, scale: SNAP.scale, imageFormat: 'png'});
    const r: Record<string, unknown> = {tag, frame: fr};
    if (k === 1) {
      // determinism: the same frame rendered twice must be pixel-identical (seeded randomness only)
      const again = path.join(out, `${tag}_again.png`);
      await renderStill({...c, composition: comp, frame: fr, output: again, inputProps: snapProps, scale: SNAP.scale, imageFormat: 'png'});
      const a = readPng(file);
      const b = readPng(again);
      const d = pixelmatch(a.data, b.data, null, a.width, a.height, {threshold: 0});
      r.determinism_diff_px = d;
      if (d) ok = false;
      fs.rmSync(again);
    }
    const bf = path.join(base, `${tag}.png`);
    const metaP = path.join(base, 'meta.json');
    const meta = fs.existsSync(metaP) ? JSON.parse(fs.readFileSync(metaP, 'utf8')) : null;
    if (!opt.approve && fs.existsSync(bf) && meta?.sha256?.[tag] && meta.sha256[tag] !== sha256(bf)) {
      r.pass = false;
      r.error = 'baseline PNG differs from meta.json sha256 (changed outside --approve)';
      ok = false;
      results.push(r);
      continue;
    }
    if (opt.approve) {
      fs.mkdirSync(base, {recursive: true});
      fs.copyFileSync(file, bf);
      r.baseline = 'written';
    } else if (fs.existsSync(bf)) {
      const a = readPng(file);
      const b = readPng(bf);
      if (a.width !== b.width || a.height !== b.height) {
        r.pass = false;
        r.error = `size ${a.width}x${a.height} != baseline ${b.width}x${b.height}`;
      } else {
        const diff = new PNG({width: a.width, height: a.height});
        const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {threshold: SNAP.pixelThreshold});
        const ratio = px / (a.width * a.height);
        r.mismatch_px = px;
        r.mismatch_ratio = +ratio.toFixed(6);
        r.pass = ratio <= SNAP.maxDiffRatio;
        if (!r.pass) fs.writeFileSync(path.join(out, `${tag}_diff.png`), PNG.sync.write(diff));
      }
      if (!r.pass) ok = false;
    } else {
      r.pass = false;
      r.error = 'no approved baseline (run with --approve, then ask the critic to approve it)';
      ok = false;
    }
    results.push(r);
  }
  // small JPG strip (0 / 50 / 100 %) for the critic: the only snapshot media that goes to git (PNG baselines stay local, see .gitignore)
  const strip = path.join(ROOT, 'reports/p7/snap', `${name}.jpg`);
  fs.mkdirSync(path.dirname(strip), {recursive: true});
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...frames.flatMap((_, k) => ['-i', path.join(out, `p${Math.round(SNAP.frames[k] * 100)}.png`)]), '-filter_complex', `hstack=inputs=${frames.length},scale=1440:-2`, '-q:v', '4', strip]);
  if (opt.approve) {
    writeJson(path.join(base, 'meta.json'), {
      sha256: Object.fromEntries(frames.map((_, k) => {
        const tag = `p${Math.round(SNAP.frames[k] * 100)}`;
        return [tag, sha256(path.join(base, `${tag}.png`))];
      })),
      v: 1,
      name,
      frames,
      scale: SNAP.scale,
      tier: snapProps.tier,
      written_at: now(),
      written_by: 'motion-engineer',
      approval: opt.approver ? {by: opt.approver, at: now()} : 'pending-critic',
      note: 'Baselines are regression references. A visual change re-writes them with --approve and needs critic approval (system rule).',
    });
  }
  const qaOwn = qa.filter((q) => q.kind !== 'parse');
  if (qaOwn.length || regProblems.length) ok = false;
  const rep = {v: 1, name, composition: id, at: now(), frames, thresholds: SNAP, results, qa_findings: qaOwn, registry_problems: regProblems, approve: !!opt.approve, pass: ok || (!!opt.approve && !qaOwn.length && !regProblems.length)};
  writeJson(path.join(ROOT, 'reports/p7/snap', `${name}.json`), rep);
  console.log(`snap ${name}: ${rep.pass ? 'PASS' : 'FAIL'} frames ${frames.join('/')} | ${results.map((r) => `${r.tag}:${r.baseline ?? r.mismatch_ratio ?? r.error}`).join(' ')} | qa ${qaOwn.length}`);
  return rep.pass ? 0 : 1;
}

// ---------------------------------------------------------------- perf
async function perf(c: Common, name: string): Promise<number> {
  if (!name) throw new Error('perf <Name>');
  const tiers = (opt.tiers || 'lite,standard,hero').split(',') as (keyof typeof FX)[];
  const id = `Demo-${name}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dcperf-'));
  const res: Record<string, unknown> = {};
  let over = false;
  for (const tier of tiers) {
    const inputProps = {demo: name, tier};
    const comp = await selectComposition({...c, id, inputProps});
    const n = Math.min(comp.durationInFrames, Number(opt.frames || comp.durationInFrames));
    await renderStill({...c, composition: comp, frame: 0, output: path.join(tmp, 'warm.jpeg'), inputProps, imageFormat: 'jpeg'}); // warm caches
    const q0 = queueLoad();
    const l0 = os.loadavg()[0];
    const a = Date.now();
    await renderFrames({...c, composition: comp, inputProps, outputDir: tmp, imageFormat: 'jpeg', jpegQuality: 80, concurrency: 1, frameRange: [0, n - 1], onStart: () => undefined, onFrameUpdate: () => undefined});
    const wall = (Date.now() - a) / 1000;
    const spf = +(wall / n).toFixed(4);
    const within = spf <= PERF_BUDGET[tier];
    if (!within) over = true;
    res[tier] = {frames: n, wall_s: +wall.toFixed(2), s_per_frame: spf, box_s_per_frame_at_3_slots: +(spf / 3).toFixed(4), budget_s_per_frame: PERF_BUDGET[tier], within_budget: within, loadavg1: [+l0.toFixed(2), +os.loadavg()[0].toFixed(2)], queue: q0};
    for (const f of fs.readdirSync(tmp)) fs.rmSync(path.join(tmp, f));
    console.log(`perf ${name} ${tier}: ${spf} s/frame (${n} f, ${wall.toFixed(1)} s) budget ${PERF_BUDGET[tier]} ${within ? 'ok' : 'OVER'}`);
  }
  fs.rmSync(tmp, {recursive: true, force: true});
  const rep = {v: 1, name, composition: id, at: now(), resolution: '1920x1080', gl: 'swiftshader', concurrency: 1, image: 'jpeg q80', host: {cpus: os.cpus().length, mem_gb: +(os.totalmem() / 2 ** 30).toFixed(1)}, budgets: PERF_BUDGET, tiers: res, qa_findings: qa};
  writeJson(path.join(ROOT, 'reports/perf/components', `${name}.json`), rep);
  const aggP = path.join(ROOT, 'reports/perf/components.json');
  const agg = fs.existsSync(aggP) ? JSON.parse(fs.readFileSync(aggP, 'utf8')) : {v: 1, unit: 'slot s/frame at 1080p, concurrency 1, swiftshader, under queue load', components: {}};
  agg.components[name] = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, (v as {s_per_frame: number}).s_per_frame]));
  agg.components[name].measured_at = rep.at;
  agg.budgets = PERF_BUDGET;
  writeJson(aggP, agg);
  return over && opt.strict ? 1 : 0;
}

// ---------------------------------------------------------------- spec
async function spec(c: Common, id: string, serveUrl: string): Promise<number> {
  if (!id) throw new Error('spec <id>');
  const specFile = path.join(ROOT, 'corpus/specs', `${id}.json`);
  const sp = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus/edl/lock.json'), 'utf8'));
  const edlPath = path.join(ROOT, lock.edl || 'corpus/edl/master_edl.v1.json');
  const edl = JSON.parse(fs.readFileSync(edlPath, 'utf8'));
  const ch = edl.chapters.find((x: {id: string}) => x.id === sp.chapter);
  if (!ch) throw new Error(`chapter ${sp.chapter} not in the EDL`);
  const wmPath = path.join(ROOT, 'corpus', edl.word_map);
  const words: WordRow[] = [];
  for (const line of fs.readFileSync(wmPath, 'utf8').split('\n')) {
    if (!line.includes(`"chapter": "${sp.chapter}"`)) continue;
    const r = JSON.parse(line);
    words.push({id: r.word_id, s: r.rec_start_frame, e: r.rec_end_frame, sent: r.sent_id});
  }
  const featP = path.join(ROOT, 'corpus/edl/features', `${sp.chapter}.json`);
  const features: Features | null = fs.existsSync(featP) ? JSON.parse(fs.readFileSync(featP, 'utf8')) : null;
  const final = !!opt.final;
  const fps = Number(opt.fps || (final ? FPS : PREVIEW_FPS));
  const input: SpecInput = {id, spec: sp, span: {start: ch.start_frame, end: ch.end_frame}, words, features, audio: null};
  const ps = playSpan(input);
  const vo = path.join(ROOT, edl.vo_wav);
  if (!opt['no-audio'] && fs.existsSync(vo)) {
    const dst = path.join(serveUrl, 'public', 'p7audio');
    fs.mkdirSync(dst, {recursive: true});
    const ss = (ps.start / 24).toFixed(4);
    const t = ((ps.end - ps.start) / 24).toFixed(4);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', ss, '-t', t, '-i', vo, '-ac', '1', '-c:a', 'aac', '-b:a', '96k', path.join(dst, `${id}.m4a`)]);
    input.audio = `p7audio/${id}.m4a`;
  }
  const inputProps = {input, preview: !final, fps};
  const comp = await selectComposition({...c, id: 'SpecPlayer', inputProps});
  const resolved = (comp.props as {resolved: Resolved}).resolved;
  const outDir = path.join(ROOT, 'data/renders/spec', id, final ? `final${fps}` : `preview${fps}`);
  fs.mkdirSync(outDir, {recursive: true});
  const report = {...resolved.report, at: now(), spec_file: rel(specFile), edl: rel(edlPath), word_map: rel(wmPath), size: `${comp.width}x${comp.height}`, tier_forced: final ? null : PREVIEW.tier, audio: input.audio ? `VO excerpt ${ps.start}..${ps.end} @24` : null};
  writeJson(path.join(outDir, 'resolver.json'), report);
  console.log(`resolver ${id}: anchors ${report.anchors_resolved}/${report.anchors_total} (${report.resolved_pct} %), invalid ${report.invalid_props.length}, unknown ${report.unknown_components.length}, unimplemented ${report.unimplemented.join(',') || '-'}, ${comp.durationInFrames} f @ ${fps}`);
  const file = path.join(outDir, `${id}.mp4`);
  const a = Date.now();
  await renderMedia({...c, composition: comp, inputProps, codec: 'h264', crf: final ? 18 : 26, outputLocation: file, concurrency: Number(opt.conc || 1), imageFormat: 'jpeg', jpegQuality: final ? 92 : 80, audioCodec: 'aac'});
  const wall = (Date.now() - a) / 1000;
  const qaOwn = qa.filter((q) => q.kind !== 'parse');
  const full = {...report, render: {file: rel(file), wall_s: +wall.toFixed(1), s_per_frame: +(wall / comp.durationInFrames).toFixed(4), bytes: fs.statSync(file).size}, qa_findings: qaOwn, registry_problems: regProblems};
  writeJson(path.join(outDir, 'resolver.json'), full);
  if (opt.report) writeJson(path.join(ROOT, opt.report), full); // small copy for git (reports/p7/...)
  const pass = report.resolved_pct === 100 && !report.invalid_props.length && !report.unknown_components.length && !qaOwn.length;
  console.log(`spec ${id}: ${pass ? 'PASS' : 'FAIL'} ${rel(file)} ${(full.render.bytes / 1e6).toFixed(1)} MB, ${full.render.s_per_frame} s/frame, qa ${qaOwn.length}`);
  return pass ? 0 : 1;
}

// ---------------------------------------------------------------- at11
async function at11(c: Common): Promise<number> {
  const rep = path.join(ROOT, 'reports/p7/at11');
  const dat = path.join(ROOT, 'data/renders/p7/at11');
  fs.mkdirSync(rep, {recursive: true});
  fs.mkdirSync(dat, {recursive: true});
  const shots: Record<string, unknown>[] = [];
  const wipeF = PRESETS.arrive.f24 ? PRESETS.arrive.f24[0] : 6;
  for (const preset of ['wipe', 'arrive'] as const) {
    const inputProps = {preset};
    const comp = await selectComposition({...c, id: 'AT11', inputProps});
    await renderMedia({...c, composition: comp, inputProps, codec: 'h264', crf: 18, outputLocation: path.join(dat, `at11_${preset}.mp4`), concurrency: 1});
    for (const [tag, fr] of [['t1', AT11_START + 1], ['t2', AT11_START + 2], ['t3', AT11_START + 3], ['settled', comp.durationInFrames - 1]] as const) {
      const f = path.join(rep, `${preset}_${tag}.jpg`);
      await renderStill({...c, composition: comp, frame: fr, output: f, inputProps, imageFormat: 'jpeg', jpegQuality: 88});
      shots.push({file: rel(f), preset, frame: fr, t_from_start: fr - AT11_START, wipe_frames: wipeF, wipe_progress: tag === 'settled' ? 1 : +(1 - Math.pow(2, (-10 * (fr - AT11_START)) / wipeF)).toFixed(3)});
    }
  }
  const gaps = AT11_SIZES.map((s) => ({size_px: s, caps_gap_px: +(JOIN_GAP.text.caps * s).toFixed(1), mixed_gap_px: +(JOIN_GAP.text.latin * s).toFixed(1)}));
  writeJson(path.join(rep, 'index.json'), {v: 1, at: now(), test: 'AT-11 (ADR-010 RT-010-1/4): 34 px and 32 px الـ+Latin labels in motion', labels: AT11_LABELS, sizes: AT11_SIZES, join_gap_em: JOIN_GAP.text, gaps_px: gaps, start_frame: AT11_START, fps: 24, presets: ['wipe (mask only)', 'arrive (mask + scale 0.92->1 + blur 6->0)'], frames: shots, clips: [rel(path.join(dat, 'at11_wipe.mp4')), rel(path.join(dat, 'at11_arrive.mp4'))], qa_findings: qa, reviewer: 'arabic-typographer (native reader veto); the author does not grade'});
  console.log(`at11: ${shots.length} frames -> ${rel(rep)}; qa ${qa.length}`);
  return qa.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error('p7 FAILED', e?.stack || e);
    process.exit(2);
  },
);
