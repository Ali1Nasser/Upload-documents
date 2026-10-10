// P7 render driver: `dc render snap|perf|spec|at11` (tools/dclib/render.py builds this file with esbuild and runs it INSIDE the
// tsp queue; never run it directly on a busy box). GL is swiftshader only (ADR-002 GL-SS). One bundle, one browser per run.
//   snap <Name> [--approve]        stills p0 / a1 (first anchor settled) / p50 / p100 of Demo-<Name>, pixelmatch vs
//                                  studio/test/baselines/<Name>/ (absolute px cap), determinism, QA findings fail
//   snap _selftest                 the QA-Selftest fixture MUST report overflow, perletter, fragment and unsafe findings
//   perf <Name> [--tiers=a,b] [--frames=N] [--report-only]   BOX s/frame at 1080p per FX tier at the production concurrency
//                                  (3 render slots) -> reports/perf/components/<Name>.json; exit 1 when over the ADR-002 budget
//   spec <id> [--final] [--fps=N] [--no-audio] [--nocam] [--nofx] [--cut] [--solo=<layer>]
//                                  render corpus/specs/<id>.json; resolver report next to the render; debug flags = isolated renders
//   at11                           AT-11 clip (wipe + arrive), anchor / mid-wipe / settled JPGs and the anchor-frame ink check
//                                  -> reports/p7/at11/*<AT11_TAG>.* (clips in data/renders/p7/at11/)
import {bundle} from '@remotion/bundler';
import {openBrowser, renderFrames, renderMedia, renderStill, selectComposition, type BrowserLog} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {AT11_LABELS, AT11_SIZES, AT11_START, AT11_TAG} from '../src/at11/AT11.consts';
import {PREVIEW_FPS, playSpan} from '../src/spec/resolve';
import type {Features, Resolved, SpecInput, WordRow} from '../src/spec/types';
import {FPS, FX, PREVIEW} from '../src/tokens';
import {presetFrames, revealProgress, REVEAL_ONSET_F} from '../src/type/reveal';
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
 * PNG baselines stay small (~0.1 MB) and diff only layout, type and motion; tier looks are frozen tokens, checked by perf + look-dev.
 * P7 review B2: an ABSOLUTE cap (16 px at scale 0.5) with anti-aliased pixels counted. Determinism is 0 px on this box, and one
 * wrong table digit is ~50 px, so a ratio of the whole frame (518 px) hid real regressions. Stills: p0 / p50 / p100 of the demo
 * plus a1 = the first anchored reveal settled (the p0 still of every demo is the bare backdrop). */
export const SNAP = {scale: 0.5, tier: 'lite', pixelThreshold: 0.1, includeAA: true, maxDiffPx: 16, frames: [0, 0.5, 1]} as const;
/** Production render concurrency (ADR-002: 3 slots = nproc - 1 on the 4 vCPU box). Perf renders at this concurrency, and the
 * queue job claims all 3 slots (tsp -N 3), so the number is the box rate under full production load (P7 review B1). */
export const PERF_SLOTS = 3;
/** Perf budgets in BOX seconds per frame at 1080p, 3 concurrent slots (= wall / frames), straight from ADR-002:
 * standard <= 0.201 (R5 trigger, S-hi + 10 %); hero <= 1.038 (top of the H band); lite (previews) is held to the standard
 * figure, conservative because previews render at 960x540. */
export const PERF_BUDGET = {lite: 0.201, standard: 0.201, hero: 1.038} as const;

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
    const expect = ['overflow', 'perletter', 'fragment', 'unsafe'];
    const pass = expect.every((k) => kinds.has(k));
    const rep = {v: 2, name, at: now(), expect, findings: qa, pass};
    writeJson(path.join(ROOT, 'reports/p7/snap/_selftest.json'), rep);
    console.log(`selftest: findings ${[...kinds].join(',') || 'none'} -> ${pass ? 'PASS (detectors fire)' : 'FAIL (a detector is silent)'}`);
    return pass ? 0 : 1;
  }
  const id = `Demo-${name}`;
  const snapProps = {demo: name, tier: opt.tier || SNAP.tier};
  const comp = await selectComposition({...c, id, inputProps: snapProps});
  const n = comp.durationInFrames;
  const stills = snapFrames(comp.props as {resolved?: Resolved}, n, comp.fps);
  const frames = stills.map((x) => x.frame);
  const base = path.join(STUDIO, 'test/baselines', name);
  const results: Record<string, unknown>[] = [];
  let ok = true;
  // 1) render every still, 2) determinism (p50 twice, 0 px), 3) only then compare or approve: a non-deterministic render can
  // never become a baseline (P7 review M1)
  for (const {tag, frame} of stills) await renderStill({...c, composition: comp, frame, output: path.join(out, `${tag}.png`), inputProps: snapProps, scale: SNAP.scale, imageFormat: 'png'});
  const det = stills.find((x) => x.tag === 'p50') ?? stills[0];
  const again = path.join(out, `${det.tag}_again.png`);
  await renderStill({...c, composition: comp, frame: det.frame, output: again, inputProps: snapProps, scale: SNAP.scale, imageFormat: 'png'});
  const da = readPng(path.join(out, `${det.tag}.png`));
  const determinismPx = pixelmatch(da.data, readPng(again).data, null, da.width, da.height, {threshold: 0, includeAA: true});
  fs.rmSync(again);
  if (determinismPx) ok = false;
  const metaP = path.join(base, 'meta.json');
  const meta = fs.existsSync(metaP) ? JSON.parse(fs.readFileSync(metaP, 'utf8')) : null;
  const approve = !!opt.approve && determinismPx === 0;
  for (const {tag, frame, why} of stills) {
    const file = path.join(out, `${tag}.png`);
    const r: Record<string, unknown> = {tag, frame, why};
    if (tag === det.tag) r.determinism_diff_px = determinismPx;
    const bf = path.join(base, `${tag}.png`);
    if (opt.approve && !approve) {
      r.pass = false;
      r.error = 'not approved: the determinism check failed';
    } else if (!approve && fs.existsSync(bf) && meta?.sha256?.[tag] && meta.sha256[tag] !== sha256(bf)) {
      r.pass = false;
      r.error = 'baseline PNG differs from meta.json sha256 (changed outside --approve)';
    } else if (approve) {
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
        const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {threshold: SNAP.pixelThreshold, includeAA: SNAP.includeAA});
        r.mismatch_px = px;
        r.pass = px <= SNAP.maxDiffPx;
        if (!r.pass) fs.writeFileSync(path.join(out, `${tag}_diff.png`), PNG.sync.write(diff));
      }
    } else {
      r.pass = false;
      r.error = 'no approved baseline (run with --approve, then ask the critic to approve it)';
    }
    if (r.pass === false) ok = false;
    results.push(r);
  }
  // small JPG strip (p0 / a1 / p50 / p100) for the critic: the only snapshot media that goes to git (PNG baselines stay local)
  const strip = path.join(ROOT, 'reports/p7/snap', `${name}.jpg`);
  fs.mkdirSync(path.dirname(strip), {recursive: true});
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...stills.flatMap((x) => ['-i', path.join(out, `${x.tag}.png`)]), '-filter_complex', `hstack=inputs=${stills.length},scale=1600:-2`, '-q:v', '4', strip]);
  if (approve) {
    writeJson(metaP, {
      sha256: Object.fromEntries(stills.map((x) => [x.tag, sha256(path.join(base, `${x.tag}.png`))])),
      v: 2,
      name,
      frames: Object.fromEntries(stills.map((x) => [x.tag, x.frame])),
      scale: SNAP.scale,
      tier: snapProps.tier,
      thresholds: SNAP,
      written_at: now(),
      written_by: 'motion-engineer',
      approval: opt.approver ? {by: opt.approver, at: now()} : 'pending-critic',
      note: 'Baselines are regression references. A visual change re-writes them with --approve and needs critic approval (system rule).',
    });
  }
  const qaOwn = qa.filter((q) => q.kind !== 'parse');
  if (qaOwn.length || regProblems.length) ok = false;
  const rep = {v: 2, name, composition: id, at: now(), frames, thresholds: SNAP, results, qa_findings: qaOwn, registry_problems: regProblems, approve: !!opt.approve, pass: ok};
  writeJson(path.join(ROOT, 'reports/p7/snap', `${name}.json`), rep);
  console.log(`snap ${name}: ${rep.pass ? 'PASS' : 'FAIL'} frames ${frames.join('/')} | ${results.map((r) => `${r.tag}:${r.baseline ?? r.mismatch_px ?? r.error}`).join(' ')} | det ${determinismPx} | qa ${qaOwn.length}`);
  return rep.pass ? 0 : 1;
}

/** Snapshot stills: p0 / p50 / p100 of the demo plus a1 = the first anchored reveal settled (anchor frame + the longest reveal
 * preset + 1). The p0 still alone only re-tests the backdrop, because every demo starts its first reveal a few frames in (B2). */
export const snapFrames = (props: {resolved?: Resolved}, n: number, fps: number): {tag: string; frame: number; why: string}[] => {
  const at = (frac: number) => Math.min(n - 1, Math.floor(frac * (n - 1)));
  const sh = props.resolved?.shots?.[0];
  const ats = (sh?.layers ?? []).map((l) => sh!.from + l.at);
  const settle = Math.max(...(['arrive', 'impact', 'label'] as const).map((p) => presetFrames(p, fps, true)));
  const a1 = Math.min(n - 1, (ats.length ? Math.min(...ats) : 0) + settle + 1);
  return [
    {tag: 'p0', frame: at(0), why: '0 %'},
    {tag: 'a1', frame: a1, why: `first anchor settled (anchor + ${settle} + 1 f)`},
    {tag: 'p50', frame: at(0.5), why: '50 %'},
    {tag: 'p100', frame: at(1), why: '100 %'},
  ];
};

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
    // warm-up at the production concurrency (fonts, GL, caches); the measured run then starts from a warm browser
    await renderFrames({...c, composition: comp, inputProps, outputDir: tmp, imageFormat: 'jpeg', jpegQuality: 80, concurrency: PERF_SLOTS, frameRange: [0, Math.min(n - 1, PERF_SLOTS * 2 - 1)], onStart: () => undefined, onFrameUpdate: () => undefined});
    for (const f of fs.readdirSync(tmp)) fs.rmSync(path.join(tmp, f));
    const q0 = queueLoad();
    const l0 = os.loadavg()[0];
    const a = Date.now();
    await renderFrames({...c, composition: comp, inputProps, outputDir: tmp, imageFormat: 'jpeg', jpegQuality: 80, concurrency: PERF_SLOTS, frameRange: [0, n - 1], onStart: () => undefined, onFrameUpdate: () => undefined});
    const wall = (Date.now() - a) / 1000;
    const box = +(wall / n).toFixed(4);
    const within = box <= PERF_BUDGET[tier];
    if (!within) over = true;
    const others = q0.running === null ? null : Math.max(0, q0.running - 1); // this job is one of the running ones
    res[tier] = {
      frames: n,
      wall_s: +wall.toFixed(2),
      box_s_per_frame: box,
      slot_s_per_frame: +(box * PERF_SLOTS).toFixed(4),
      budget_box_s_per_frame: PERF_BUDGET[tier],
      within_budget: within,
      loadavg1: [+l0.toFixed(2), +os.loadavg()[0].toFixed(2)],
      queue: q0,
      other_jobs_running: others,
    };
    for (const f of fs.readdirSync(tmp)) fs.rmSync(path.join(tmp, f));
    console.log(`perf ${name} ${tier}: ${box} box s/frame at ${PERF_SLOTS} slots (${n} f, ${wall.toFixed(1)} s) budget ${PERF_BUDGET[tier]} ${within ? 'ok' : 'OVER'}${others ? ` (other jobs running: ${others})` : ''}`);
  }
  fs.rmSync(tmp, {recursive: true, force: true});
  const rep = {
    v: 2,
    name,
    composition: id,
    at: now(),
    unit: `box s/frame = wall / frames at 1920x1080, concurrency ${PERF_SLOTS} (production), swiftshader, JPEG q80`,
    resolution: '1920x1080',
    gl: 'swiftshader',
    concurrency: PERF_SLOTS,
    image: 'jpeg q80',
    host: {cpus: os.cpus().length, mem_gb: +(os.totalmem() / 2 ** 30).toFixed(1)},
    budgets_box_s_per_frame: PERF_BUDGET,
    budget_basis: 'ADR-002: standard <= 0.201 box s/frame (R5, S-hi + 10 %); hero <= 1.038 (H band top); lite held to 0.201',
    tiers: res,
    within_budget: !over,
    qa_findings: qa,
  };
  // per-component file only: the aggregate reports/perf/components.json is built at gate time (`dc render perf --aggregate`),
  // so parallel family agents never read-modify-write one shared file (P7 review M4)
  writeJson(path.join(ROOT, 'reports/perf/components', `${name}.json`), rep);
  return over && !opt['report-only'] ? 1 : 0;
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
  const debug = opt.nocam || opt.nofx || opt.cut || opt.solo ? {nocam: !!opt.nocam, nofx: !!opt.nofx, cut: !!opt.cut, solo: opt.solo && opt.solo !== '1' ? opt.solo : null} : null;
  if (debug && final) throw new Error('debug flags (--nocam/--nofx/--cut/--solo) are for measurement renders, never with --final');
  const inputProps = {input, preview: !final, fps, debug};
  const comp = await selectComposition({...c, id: 'SpecPlayer', inputProps});
  const resolved = (comp.props as {resolved: Resolved}).resolved;
  const dbgTag = debug ? `_dbg-${[debug.nocam && 'nocam', debug.nofx && 'nofx', debug.cut && 'cut', debug.solo && `solo-${debug.solo}`].filter(Boolean).join('-')}` : '';
  const outDir = path.join(ROOT, 'data/renders/spec', id, (final ? `final${fps}` : `preview${fps}`) + dbgTag);
  fs.mkdirSync(outDir, {recursive: true});
  const report = {...resolved.report, at: now(), spec_file: rel(specFile), edl: rel(edlPath), word_map: rel(wmPath), size: `${comp.width}x${comp.height}`, tier_forced: final ? null : PREVIEW.tier, debug, audio: input.audio ? `VO excerpt ${ps.start}..${ps.end} @24` : null};
  writeJson(path.join(outDir, 'resolver.json'), report);
  console.log(`resolver ${id}: anchors ${report.anchors_resolved}/${report.anchors_total} (${report.resolved_pct} %), invalid ${report.invalid_props.length}, unknown ${report.unknown_components.length}, unimplemented ${report.unimplemented.join(',') || '-'}, ${comp.durationInFrames} f @ ${fps}`);
  if (final && (report.unimplemented.length || regProblems.length)) {
    // never spend final-render hours on a spec that would draw blank layers (M3)
    console.log(`spec ${id}: FAIL before render: unimplemented ${report.unimplemented.join(',') || '-'}, registry problems ${regProblems.length}`);
    writeJson(path.join(outDir, 'resolver.json'), {...report, registry_problems: regProblems, blockers: ['unimplemented or registry problems before a final']});
    return 1;
  }
  const file = path.join(outDir, `${id}.mp4`);
  const a = Date.now();
  await renderMedia({...c, composition: comp, inputProps, codec: 'h264', crf: final ? 18 : 26, outputLocation: file, concurrency: Number(opt.conc || 1), imageFormat: 'jpeg', jpegQuality: final ? 92 : 80, audioCodec: 'aac'});
  const wall = (Date.now() - a) / 1000;
  const qaOwn = qa.filter((q) => q.kind !== 'parse');
  const full = {...report, render: {file: rel(file), wall_s: +wall.toFixed(1), s_per_frame: +(wall / comp.durationInFrames).toFixed(4), bytes: fs.statSync(file).size}, qa_findings: qaOwn, registry_problems: regProblems};
  // P7 review M3: registry problems fail every mode; an unimplemented layer fails a final (it would render nothing); a chapter
  // spec (no window) may not drop shots
  const blockers = [
    ...(report.resolved_pct === 100 ? [] : [`anchors ${report.resolved_pct} %`]),
    ...(report.invalid_props.length ? [`invalid props ${report.invalid_props.length}`] : []),
    ...(report.unknown_components.length ? [`unknown ${report.unknown_components.join(',')}`] : []),
    ...(qaOwn.length ? [`qa ${qaOwn.length}`] : []),
    ...(regProblems.length ? [`registry problems ${regProblems.length}`] : []),
    ...(final && report.unimplemented.length ? [`unimplemented in a final: ${report.unimplemented.join(',')}`] : []),
    ...(!sp.window && report.dropped_shots.length ? [`dropped shots ${report.dropped_shots.join(',')}`] : []),
  ];
  (full as Record<string, unknown>).blockers = blockers;
  writeJson(path.join(outDir, 'resolver.json'), full);
  if (opt.report) writeJson(path.join(ROOT, opt.report), full);
  const pass = !blockers.length;
  if (!pass) console.log(`spec ${id}: blockers: ${blockers.join('; ')}`);
  console.log(`spec ${id}: ${pass ? 'PASS' : 'FAIL'} ${rel(file)} ${(full.render.bytes / 1e6).toFixed(1)} MB, ${full.render.s_per_frame} s/frame, qa ${qaOwn.length}`);
  return pass ? 0 : 1;
}

// ---------------------------------------------------------------- at11
async function at11(c: Common): Promise<number> {
  const rep = path.join(ROOT, 'reports/p7/at11');
  const dat = path.join(ROOT, 'data/renders/p7/at11');
  const tmp = path.join(os.tmpdir(), `dc_at11_${process.pid}`);
  fs.mkdirSync(rep, {recursive: true});
  fs.mkdirSync(dat, {recursive: true});
  fs.mkdirSync(tmp, {recursive: true});
  const shots: Record<string, unknown>[] = [];
  const ink: Record<string, unknown>[] = [];
  const wipeF = presetFrames('arrive', 24);
  const clips: string[] = [];
  for (const preset of ['wipe', 'arrive'] as const) {
    const inputProps = {preset};
    const comp = await selectComposition({...c, id: 'AT11', inputProps});
    const clip = path.join(dat, `at11_${preset}${AT11_TAG}.mp4`);
    await renderMedia({...c, composition: comp, inputProps, codec: 'h264', crf: 18, outputLocation: clip, concurrency: 1});
    clips.push(rel(clip));
    for (const [tag, fr] of [['t0', AT11_START], ['t1', AT11_START + 1], ['t2', AT11_START + 2], ['settled', comp.durationInFrames - 1]] as const) {
      const f = path.join(rep, `${preset}_${tag}${AT11_TAG}.jpg`);
      await renderStill({...c, composition: comp, frame: fr, output: f, inputProps, imageFormat: 'jpeg', jpegQuality: 88});
      const t = fr - AT11_START;
      shots.push({file: rel(f), preset, frame: fr, t_from_anchor: t, wipe_frames: wipeF, wipe_progress: tag === 'settled' ? 1 : +revealProgress(t, wipeF).toFixed(3)});
    }
    // RV1 ink check on real pixels: the anchor frame must differ from the frame before it (backdrop only) = ink on the anchor
    const pre = path.join(tmp, `${preset}_pre.png`);
    const on = path.join(tmp, `${preset}_on.png`);
    await renderStill({...c, composition: comp, frame: AT11_START - 1, output: pre, inputProps, imageFormat: 'png', scale: 0.5});
    await renderStill({...c, composition: comp, frame: AT11_START, output: on, inputProps, imageFormat: 'png', scale: 0.5});
    const a = readPng(pre);
    const b = readPng(on);
    const px = pixelmatch(a.data, b.data, null, a.width, a.height, {threshold: SNAP.pixelThreshold, includeAA: true});
    ink.push({preset, anchor_frame: AT11_START, ink_px_at_scale_0_5: px, pass: px > 0});
  }
  fs.rmSync(tmp, {recursive: true, force: true});
  const gaps = AT11_SIZES.map((s) => ({size_px: s, caps_gap_px: +(JOIN_GAP.text.caps * s).toFixed(1), mixed_gap_px: +(JOIN_GAP.text.latin * s).toFixed(1)}));
  const inkOk = ink.every((x) => x.pass);
  writeJson(path.join(rep, `index${AT11_TAG}.json`), {v: 2, at: now(), test: 'AT-11 (ADR-010 RT-010-1/4): 34 px and 32 px الـ+Latin labels in motion', onset: `ADR-011 Q2 RV1: first visible step on the anchor frame (REVEAL_ONSET_F = ${REVEAL_ONSET_F}); supersedes index.json (RV2) for re-review`, labels: AT11_LABELS, sizes: AT11_SIZES, join_gap_em: JOIN_GAP.text, gaps_px: gaps, start_frame: AT11_START, fps: 24, presets: ['wipe (mask only)', 'arrive (mask + scale 0.92->1 + blur 6->0)'], frames: shots, anchor_ink: ink, anchor_ink_pass: inkOk, clips, qa_findings: qa, reviewer: 'arabic-typographer (native reader veto); the author does not grade'});
  console.log(`at11${AT11_TAG}: ${shots.length} frames -> ${rel(rep)}; anchor ink ${ink.map((x) => `${x.preset}:${x.ink_px_at_scale_0_5}`).join(' ')}; qa ${qa.length}`);
  return qa.length || !inkOk ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error('p7 FAILED', e?.stack || e);
    process.exit(2);
  },
);
