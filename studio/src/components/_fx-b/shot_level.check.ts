// Unit checks for the fx-b shot-level components (CameraRig, DepthLayers, FXTier, AudioReactive) and the compiler transitions
// that LightStreakTransition / WhipPan / MatchCut are mapped to. Pure (no render). Run with the check_p7.sh recipe:
//   esbuild studio/src/components/_fx-b/shot_level.check.ts --bundle --platform=node --format=cjs --outfile=/tmp/x.cjs && node /tmp/x.cjs
import {modAt, resolveSpec, TRANSITION_F24} from '../../spec/resolve';
import {cameraAt, streakAt, transitionState} from '../../spec/rig';
import type {DemoDef, Features, SpecInput} from '../../spec/types';
import {C, FX, IMPACT} from '../../tokens';
import demos from '../../demos/fx-b';
import {fxbStreakP, fxbTransitionOf, fxbTransitionState, matchWrap, streakBand, WHIP_BLUR} from './transitions';

let fails = 0;
const ok = (name: string, cond: boolean, info?: unknown) => {
  if (!cond) fails++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || info === undefined ? '' : `: ${JSON.stringify(info)}`}`);
};
const demo = (n: string) => demos.demos.find((d) => d.name === n) as DemoDef;
// the same one-shot input SpecPlayer.demoInput builds (not imported: SpecPlayer pulls the require.context registry)
const inputOf = (d: DemoDef, features: Features | null = null, extra: DemoDef['shot'][] = []): SpecInput => {
  const shots = [d.shot, ...extra].map((s, i) => ({shot_id: `DEMO-S0${i + 1}`, sentences: [`s:DEMO:${d.name}:000${i + 1}`], intent: 'check', ...s}));
  return {
    id: `demo-${d.name}`,
    spec: {v: 1, chapter: 'DEMO', edl_version: 'v1', shots},
    span: {start: 0, end: d.frames},
    words: d.words.map(([id, s, e], i) => ({id, s, e, sent: `s:DEMO:${d.name}:000${extra.length && i === d.words.length - 1 ? 2 : 1}`})),
    features,
    audio: null,
  };
};
const R = (inp: SpecInput, fps = 24, extra: {preview?: boolean; tier?: 'lite' | 'standard' | 'hero'} = {}) => resolveSpec(inp, {fps, preview: !!extra.preview, tier: extra.tier});

// ---------------- CameraRig ----------------
for (const fps of [24, 12]) {
  const r = R(inputOf(demo('CameraRig')), fps);
  const sh = r.shots[0];
  const want = Math.floor((62 * fps) / 24 + 0.5); // W3 starts at 62 (24 fps), lead 0, one half-up rounding (ADR-011 RD1)
  ok(`CameraRig nudge resolves to the anchor frame @${fps}`, JSON.stringify(sh.camera.nudges) === JSON.stringify([want]), sh.camera.nudges);
  ok(`CameraRig props reach the shot camera @${fps}`, sh.camera.move === 'dolly_zoom' && sh.camera.intensity === 1 && sh.camera.ease === 'inOutCubic', sh.camera);
  ok(`CameraRig draws no layer @${fps}`, !sh.layers.some((l) => l.component === 'CameraRig') && sh.layers.length === 2);
  const c = (t: number) => cameraAt(sh.camera, t, sh.dur, fps);
  ok(`CameraRig nudge = ${IMPACT.nudgePxMax} px on the anchor frame only @${fps}`, c(want).x === IMPACT.nudgePxMax && c(want - 1).x === 0 && c(want + 1).x === 0, [c(want - 1).x, c(want).x, c(want + 1).x]);
  let mono = true;
  for (let t = 1; t < sh.dur; t++) if (c(t).s < c(t - 1).s) mono = false;
  ok(`CameraRig push-in is monotonic and never dead-static @${fps}`, mono && c(sh.dur - 1).s > 1.01, c(sh.dur - 1).s);
  ok(`CameraRig r.report: 100 % anchors, no invalid props @${fps}`, r.report.resolved_pct === 100 && !r.report.invalid_props.length, r.report);
}
{
  const d = demo('CameraRig');
  const st = R(inputOf({...d, shot: {...d.shot, layers: d.shot.layers.map((l) => (l.component === 'CameraRig' ? {...l, props: {move: 'static'}} : l))}}));
  ok('CameraRig static = hold: no push', [0, 40, 95].every((t) => cameraAt(st.shots[0].camera, t, st.shots[0].dur, 24).s === 1));
}

// ---------------- DepthLayers ----------------
{
  const r = R(inputOf(demo('DepthLayers')));
  const L = Object.fromEntries(r.shots[0].layers.map((l) => [l.id, l]));
  ok('DepthLayers maps grid -> far (parallax 0.4, blur 0.6)', L.grid?.depth === 'far' && L.grid.parallax === 0.4 && L.grid.blur === 0.6, L.grid);
  ok('DepthLayers maps kw-brand -> near (1.3) and dust -> fg (1.6, blur 1)', L['kw-brand']?.depth === 'near' && L['kw-brand'].parallax === 1.3 && L.dust?.depth === 'fg' && L.dust.parallax === 1.6 && L.dust.blur === 1, [L['kw-brand'], L.dust]);
  ok('DepthLayers: 4 planes in use', new Set(r.shots[0].layers.map((l) => l.depth)).size === 4);
  ok('DepthLayers maps total -> mid (parallax 1, blur 0)', L.total?.depth === 'mid' && L.total.parallax === 1 && L.total.blur === 0, L.total);
  ok('DepthLayers draws no layer', !r.shots[0].layers.some((l) => l.component === 'DepthLayers'));
  ok('DepthLayers DOF capped by tier (lite 0 px, standard/hero <= 4 px)', FX.lite.dofBlurPx === 0 && FX.standard.dofBlurPx <= 4 && FX.hero.dofBlurPx <= 4);
  const cam = r.shots[0].camera;
  const xs = [0, 48, 95].map((t) => cameraAt(cam, t, r.shots[0].dur, 24).x);
  ok('DepthLayers truck moves the planes (far moves 0.4 x mid)', Math.abs(xs[2] - xs[0]) > 50, xs);
  ok('DepthLayers r.report clean', r.report.resolved_pct === 100 && !r.report.invalid_props.length, r.report.invalid_props);
}

// ---------------- FXTier ----------------
{
  const inp = inputOf(demo('FXTier'));
  ok('FXTier tier from props', R(inp).shots[0].tier === 'standard');
  ok('FXTier forced tier (perf) wins', R(inp, 24, {tier: 'hero'}).shots[0].tier === 'hero');
  ok('FXTier preview forces lite', R(inp, 12, {preview: true}).shots[0].tier === 'lite');
  ok('FXTier text-safe masks on at every tier', Object.values(FX).every((f) => f.textSafe && f.textSafePadPx > 0));
  ok('FXTier WebGL only on hero', Object.values(FX).every((f) => f.webgl === (f.id === 'hero')));
  ok('FXTier draws no layer', R(inp).shots[0].layers.length === 2);
}

// ---------------- AudioReactive ----------------
{
  const d = demo('AudioReactive');
  const n = d.frames;
  const rms = Array.from({length: n}, (_, i) => (Math.floor(i / 12) % 2 ? -12 : -48)); // 0.5 s syllable envelope
  const onset = Array.from({length: n}, (_, i) => (i % 12 === 0 ? 1 : 0));
  const feat: Features = {start_frame: 0, rms_dbfs: rms, onset_strength: onset, centroid_hz: rms.map(() => 2000)};
  const r = R(inputOf(d, feat));
  const sh = r.shots[0];
  ok('AudioReactive builds one curve per feature x smoothing', ['rms_dbfs:medium', 'onset_strength:low', 'rms_dbfs:high'].every((k) => r.curves[k]?.length === n), Object.keys(r.curves));
  ok('AudioReactive curves in 0..1 and non-zero', Object.values(r.curves).every((c) => c.every((v) => v >= 0 && v <= 1) && Math.max(...c) > 0.3));
  const tv = (c: number[]) => c.slice(1).reduce((a, v, i) => a + Math.abs(v - c[i]), 0);
  ok('AudioReactive smoothing high is smoother than medium', tv(r.curves['rms_dbfs:high']) < tv(r.curves['rms_dbfs:medium']));
  const k = 30;
  const mt = modAt(sh, 'total', r.curves, k);
  ok('AudioReactive glow on target = amount x curve', Math.abs(mt.glow - 1 * r.curves['rms_dbfs:medium'][k]) < 1e-9 && mt.scale === 0, mt);
  ok('AudioReactive modulates only its target', modAt(sh, 'kw-brand', r.curves, k).glow === 0 && modAt(sh, 'kw-brand', r.curves, 24).scale > 0);
  ok('AudioReactive draws no layer', sh.layers.length === 2 && sh.mods.length === 3);
  const r12 = R(inputOf(d, feat), 12);
  ok('AudioReactive 12 fps curve has half the frames', r12.curves['rms_dbfs:medium'].length === n / 2);
  const dev = Math.max(...r12.curves['rms_dbfs:medium'].map((v, i) => Math.abs(v - r.curves['rms_dbfs:medium'][2 * i])));
  ok('AudioReactive 12 fps tracks the 24 fps curve (re-derived coefficient)', dev < 0.2, dev);
  ok('AudioReactive without features = no modulation (demo)', Object.values(R(inputOf(d)).curves).every((c) => c.every((v) => v === 0)));
}

// ---------------- mapped transitions (LightStreakTransition / WhipPan / MatchCut -> compiler transition_out) ----------------
{
  const d = demo('CameraRig');
  const base: DemoDef = {...d, words: [...d.words, ['w:DEMO:CameraRig:000009', 80, 92]], frames: 96};
  const next: DemoDef['shot'] = {layers: [{component: 'KineticWord', props: {id: 'kw-n', text: 'التالي'}, at: {word: 'w:DEMO:CameraRig:000009', lead_frames: 2}}]};
  for (const [comp, kind] of [['WhipPan', 'whip'], ['LightStreakTransition', 'streak'], ['MatchCut', 'match']] as const) {
    const props = comp === 'MatchCut' ? {from: 'rate', to: 'kw-n'} : {};
    const inp = inputOf({...base, shot: {...base.shot, layers: [...base.shot.layers, {component: comp, props}]}}, null, [next]);
    const r = R(inp);
    const [a, b] = r.shots;
    ok(`${comp} -> transition '${kind}' of ${TRANSITION_F24[kind]} f @24`, a.transition.type === kind && a.transition.frames === TRANSITION_F24[kind], a.transition);
    ok(`${comp} props valid and no layer drawn`, !r.report.invalid_props.length && !a.layers.some((l) => l.component === comp), r.report.invalid_props);
    const T = a.transition.frames;
    if (kind === 'whip' || kind === 'streak') {
      const out = transitionState(a.dur - 1, a.dur, null, a.transition);
      const inn = transitionState(0, b.dur, a.transition, b.transition);
      ok(`${comp} RTL: outgoing leaves to the left, incoming enters from the right`, /translateX\(-/.test(String(out.wrap.transform)) && /translateX\(\d/.test(String(inn.wrap.transform)), [out.wrap.transform, inn.wrap.transform]);
      ok(`${comp} settles: no transform after T/2 of the incoming shot`, transitionState(Math.ceil(T / 2) + 1, b.dur, a.transition, b.transition).wrap.transform === undefined);
    }
    if (kind === 'streak') ok('LightStreakTransition overlay peaks across the cut and is absent mid-shot', streakAt(10, a.dur, a.transition, FX.standard) === null && (streakAt(a.dur - 1, a.dur, a.transition, FX.standard) ?? 0) > 0);
    if (kind === 'match') {
      ok('MatchCut incoming backdrop fades in with a 1.04 -> 1 scale', transitionState(0, b.dur, a.transition, b.transition).fadeIn === 0 && /scale\(1\.04/.test(String(transitionState(0, b.dur, a.transition, b.transition).wrap.transform)));
      ok('MatchCut outgoing copy fades over the tail', transitionState(a.dur + T, a.dur, null, a.transition).textOut === 0);
    }
  }
}

// ---------------- _fx-b/transitions.ts: props-aware replacement (CR-003) ----------------
{
  const dur = 60;
  const T = TRANSITION_F24.whip; // 12 f @24
  const h = Math.round(T / 2);
  const tx = (st: {wrap: {transform?: string}}) => {
    const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(String(st.wrap.transform));
    return m ? [+m[1], +m[2]] : [0, 0];
  };
  for (const dir of ['rtl', 'ltr', 'up', 'down'] as const) {
    const tr = fxbTransitionOf({type: 'whip', frames: T}, {direction: dir});
    const out = tx(fxbTransitionState(dur - 1, dur, null, tr, FX.standard));
    const inn = tx(fxbTransitionState(0, dur, tr, {type: 'cut', frames: 0}, FX.standard));
    const v = {rtl: [-1, 0], ltr: [1, 0], up: [0, -1], down: [0, 1]}[dir];
    ok(`whip ${dir}: outgoing travels along the direction, incoming enters from the opposite side`, out[0] * v[0] + out[1] * v[1] > 0 && inn[0] * v[0] + inn[1] * v[1] < 0, [out, inn]);
    ok(`whip ${dir}: identity once settled (t = T/2)`, fxbTransitionState(h, dur, tr, {type: 'cut', frames: 0}, FX.standard).wrap.transform === undefined);
  }
  const whipMB = fxbTransitionOf({type: 'whip', frames: T}, {motion_blur: true});
  ok('whip: no whole-frame CSS blur at any tier (04 1.3: motion blur none on lite / standard)', (['lite', 'standard', 'hero'] as const).every((id) => fxbTransitionState(dur - 1, dur, null, whipMB, FX[id]).wrap.filter === undefined));
  ok('whip: CameraMotionBlur only on hero with motion_blur, only in transit', fxbTransitionState(dur - 1, dur, null, whipMB, FX.hero).motionBlur === WHIP_BLUR && fxbTransitionState(dur - 1, dur, null, whipMB, FX.standard).motionBlur === null && fxbTransitionState(dur - 1, dur, null, fxbTransitionOf({type: 'whip', frames: T}, {}), FX.hero).motionBlur === null && fxbTransitionState(10, dur, null, whipMB, FX.hero).motionBlur === null);
  // streak: continuous sweep across the cut (outgoing tail 0 -> 0.5, incoming head 0.5 -> 1), never vanishing at its peak
  const st = fxbTransitionOf({type: 'streak', frames: T}, {color: 'ember', direction: 'ltr'});
  const ps = [...Array.from({length: h}, (_, i) => fxbStreakP(dur - h + i, dur, null, st)?.p ?? -1), ...Array.from({length: h}, (_, i) => fxbStreakP(i, dur, st, {type: 'cut', frames: 0})?.p ?? -1)];
  ok('streak: sweep is monotonic 0 -> 1 across both shots', ps[0] === 0 && ps.every((p, i) => p >= 0 && (i === 0 || p > ps[i - 1])) && ps[ps.length - 1] < 1, ps);
  ok('streak: absent mid-shot', fxbStreakP(10, dur, null, st) === null && fxbStreakP(h + 1, dur, st, st) === null);
  const b = streakBand(0.5, st, FX.standard);
  ok('streak: colour token and white core, peak opacity at the cut', String(b.background).includes(C.ember) && String(b.background).includes(C.white) && b.opacity === 1, b);
  ok('streak ltr moves left -> right; rtl moves right -> left', (streakBand(0.2, st, FX.standard).left as number) < (streakBand(0.8, st, FX.standard).left as number) && (streakBand(0.2, fxbTransitionOf({type: 'streak', frames: T}, {}), FX.standard).left as number) > (streakBand(0.8, fxbTransitionOf({type: 'streak', frames: T}, {}), FX.standard).left as number));
  ok('streak defaults: signal, rtl; lite at 0.8', fxbTransitionOf({type: 'streak', frames: T}, {}).color === 'signal' && streakBand(0.5, fxbTransitionOf({type: 'streak', frames: T}, {}), FX.lite).opacity === 0.8);
  ok('whip streak at 0.6, signal colour', streakBand(0.5, whipMB, FX.standard).opacity === 0.6 && String(streakBand(0.5, whipMB, FX.standard).background).includes(C.signal));
  // match: the incoming `to` box starts on the outgoing `from` box and eases to identity
  const from = {x: 1200, y: 300, w: 400, h: 200};
  const to = {x: 300, y: 500, w: 200, h: 100};
  const m0 = matchWrap(0, 7, {kind: 'shape', fromBox: from, toBox: to});
  ok('match shape: t=0 maps the to-centre onto the from-centre at sqrt(area) scale 2', m0.transform === 'translate(1000.0px, -150.0px) scale(2.0000)' && m0.transformOrigin === '400.0px 550.0px', m0);
  ok('match position: translation only', /scale\(1\.0000\)/.test(String(matchWrap(0, 7, {kind: 'position', fromBox: from, toBox: to}).transform)));
  ok('match settles at T', matchWrap(7, 7, {kind: 'shape', fromBox: from, toBox: to}).transform === undefined);
  ok('match color: no geometry; missing boxes fall back to the 1.04 scale', matchWrap(0, 7, {kind: 'color'}).transform === undefined && matchWrap(0, 7, {kind: 'shape'}).transform === 'scale(1.0400)');
  const mt = fxbTransitionOf({type: 'match', frames: 7}, {from: 'a', to: 'b', kind: 'position'});
  const sIn = fxbTransitionState(0, dur, {...mt, match: {kind: 'position', fromBox: from, toBox: to}}, {type: 'cut', frames: 0}, FX.standard);
  ok('match: backdrop fades in from 0, copy is never faded in (M5), transit flagged', sIn.fadeIn === 0 && sIn.textOut === 1 && sIn.transit);
  ok('match: outgoing copy fades over the tail', fxbTransitionState(dur + 7, dur, null, mt, FX.standard).textOut === 0);
}

console.log(fails ? `shot_level.check: ${fails} FAILED` : 'shot_level.check: all passed');
if (fails) process.exit(1);
