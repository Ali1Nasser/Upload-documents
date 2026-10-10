// Scene compiler, pure part (P7.3). spec + word map + audio features -> frames at the requested fps. No React, no DOM:
// runs in calculateMetadata (browser) and in node unit tests (src/spec/resolve.check.ts).
//
// Time model (golden rules 1-2, ADR-002 F24):
//  - the truth is the locked word map at 24 fps (rec_start_frame / rec_end_frame, absolute record frames);
//  - an anchor {word, lead_frames} lands at word.start24 - lead_frames (lead_frames are 24-fps frames, as in dc spec lint);
//  - at any other fps F a 24-fps frame x maps to round((x - span.start) * F / 24): previews at 12 fps sample every 2nd film frame;
//    an anchor maps as ONE quantity, round((start24 - lead_frames - span.start) * F / 24) (P7 review m6), so it is never more than
//    half a frame early at fps that do not divide 24. Exact at 24. Math.round = round half up (Python: floor(x + 0.5)).
//  - word-map frames are rec_start_frame = floor(start_ms * 24 / 1000) and rec_end_frame = ceil(end_ms * 24 / 1000)
//    (word map v1.1; the convention is filed for 05_DATA_CONTRACTS as CR-002).
//
// Shot spans mirror tools/dclib/speclint.py: shot k covers its sentences; the cut sits CUT_LEAD (5 f @ 24, 04 section 4 re-specified
// by ADR-002) before the first word of the shot, never before the previous shot's last word ends + 1. The first shot starts at the
// span start (chapter start or window start).
import {CATALOG} from '../components/catalog';
import {FX, LEAD_FRAMES, PREVIEW, PRESET_MS, msToFrames, type FxId} from '../tokens';
import {cameraSafeBox, tailFrames} from './rig';
import {slotRect, type Rect, type SlotId} from '../type/safe';
import type {
  Anchor,
  Features,
  Mod,
  ModSpec,
  Resolved,
  ResolvedAction,
  ResolvedLayer,
  ResolvedShot,
  ResolverReport,
  Spec,
  SpecInput,
  SpecLayer,
  SpecShot,
  Unresolved,
  WordRow,
} from './types';

/** Preview frame rate = the FROZEN token (tokens.ts PREVIEW.fps 15, 03 P7.3). 12 fps (an exact divisor of the 24 fps film rate)
 * is requested in CR-001 (corpus/specs/_component_requests.jsonl) and stays available as `dc render spec <id> --fps 12` until the
 * Council decides; code never overrides a frozen value without an ADR (P7 review M7). */
export const PREVIEW_FPS: number = PREVIEW.fps;
export const FILM_FPS = 24;
/** Window padding for underscore demo specs with `window` (24-fps frames): mirrored in tools/dclib/speclint.py WINDOW_PAD. */
export const WINDOW_PAD = {in: 12, out: 24} as const;
export const CUT_LEAD = LEAD_FRAMES.cutMax;

export const NO_MOD: Mod = {glow: 0, scale: 0, opacity: 0, particles: 0, haze: 0};

export const isAnchor = (v: unknown): v is Anchor =>
  !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as Anchor).word === 'string' && typeof (v as Anchor).lead_frames === 'number';

/** Every {word, lead_frames} object inside a props tree, with its dotted path (layer.at is handled separately). */
export const walkAnchors = (o: unknown, path = 'props', out: [string, Anchor][] = []): [string, Anchor][] => {
  if (isAnchor(o)) out.push([path, o]);
  else if (Array.isArray(o)) o.forEach((v, i) => walkAnchors(v, `${path}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walkAnchors(v, `${path}.${k}`, out);
  return out;
};

/** Every string inside a props tree (the whole-word lexicon of SpecPlayer's fragment guard). */
export const walkStrings = (o: unknown, out: string[] = []): string[] => {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((v) => walkStrings(v, out));
  else if (o && typeof o === 'object') for (const v of Object.values(o)) walkStrings(v, out);
  return out;
};

export const splitComp = (c: string): [string, string | null] => {
  const i = c.indexOf('.');
  return i < 0 ? [c, null] : [c.slice(0, i), c.slice(i + 1)];
};

/** Transition normalisation: spec `transition_out.type` or a transition layer in the shot. */
export type TransitionKind = 'cut' | 'dissolve' | 'whip' | 'streak' | 'match';
const TRANSITION_ALIAS: Record<string, TransitionKind> = {
  cut: 'cut',
  hard: 'cut',
  dissolve: 'dissolve',
  crossfade: 'dissolve',
  fade: 'dissolve',
  whip: 'whip',
  whip_pan: 'whip',
  'whip-pan': 'whip',
  WhipPan: 'whip',
  streak: 'streak',
  light_streak: 'streak',
  LightStreakTransition: 'streak',
  match: 'match',
  match_cut: 'match',
  MatchCut: 'match',
};
/** Default transition length in 24-fps frames (04 section 3.5: whip total 520 ms; dissolve / match at the morph lower bound). */
export const TRANSITION_F24: Record<TransitionKind, number> = {
  cut: 0,
  dissolve: msToFrames(300, FILM_FPS),
  whip: msToFrames(PRESET_MS.whipTotal, FILM_FPS),
  streak: msToFrames(PRESET_MS.whipTotal, FILM_FPS),
  match: msToFrames(300, FILM_FPS),
};

/** Default parallax / blur per depth plane (04 section 1.2); DepthLayers overrides per layer. */
export const PLANE = {far: {parallax: 0.4, blur: 1}, mid: {parallax: 1, blur: 0}, near: {parallax: 1.3, blur: 0}, fg: {parallax: 1.6, blur: 0.5}} as const;

/** Audio-reactive normalisation (features are per 24-fps record frame, corpus/edl/features/<id>.json). */
const norm = {
  rms_dbfs: (v: number) => Math.min(1, Math.max(0, (v + 50) / 40)),
  onset_strength: (v: number) => Math.min(1, Math.max(0, v)),
  centroid_hz: (v: number) => Math.min(1, Math.max(0, v / 6000)),
};
const SMOOTH_A24 = {low: 0.5, medium: 0.25, high: 0.1} as const;

export type ResolveOpts = {
  fps: number;
  preview: boolean;
  tier?: FxId; // force a tier (perf runs); preview forces lite
  implemented?: (name: string) => boolean;
  slotOf?: (name: string) => SlotId | undefined;
  /** Layers that carry copy (DcComponent.text). Their boxes are shrunk by the camera envelope (B3). Default: every layer. */
  textOf?: (name: string) => boolean;
};

type WordIx = Map<string, WordRow>;

/** The 24-fps span actually played: the chapter, or (underscore demo specs only) `window` {from, to} sentence ids + WINDOW_PAD. */
export const playSpan = (input: SpecInput): {start: number; end: number; window: boolean} => {
  const w = input.spec.window;
  if (!w || !input.id.startsWith('_')) return {...input.span, window: false};
  const a = input.words.filter((x) => x.sent === w.from);
  const b = input.words.filter((x) => x.sent === w.to);
  if (!a.length || !b.length) return {...input.span, window: false};
  const start = Math.max(input.span.start, Math.min(...a.map((x) => x.s)) - WINDOW_PAD.in);
  const end = Math.min(input.span.end, Math.max(...b.map((x) => x.e)) + WINDOW_PAD.out);
  return {start, end, window: true};
};

const curveFor = (f: Features | null | undefined, feature: keyof typeof norm, smoothing: keyof typeof SMOOTH_A24, span: {start: number}, fps: number, frames: number): number[] => {
  const out = new Array<number>(frames).fill(0);
  if (!f || !Array.isArray(f[feature])) return out;
  const arr = f[feature] as number[];
  const a = 1 - Math.pow(1 - SMOOTH_A24[smoothing], FILM_FPS / fps);
  let y = 0;
  for (let k = 0; k < frames; k++) {
    const i = Math.round(span.start + (k * FILM_FPS) / fps - f.start_frame);
    const v = i >= 0 && i < arr.length ? norm[feature](arr[i]) : 0;
    y = k === 0 ? v : y + a * (v - y);
    out[k] = +y.toFixed(4);
  }
  return out;
};

export const resolveSpec = (input: SpecInput, o: ResolveOpts): Resolved => {
  const fps = o.fps;
  const spec: Spec = input.spec;
  const ps = playSpan(input);
  const c = (x24: number) => Math.round(((x24 - ps.start) * fps) / FILM_FPS);
  const frames = Math.max(1, c(ps.end));
  const anchorF = (s24: number, lead24: number) => Math.round(((s24 - lead24 - ps.start) * fps) / FILM_FPS);
  const wix: WordIx = new Map(input.words.map((w) => [w.id, w]));
  const sentWords = new Map<string, WordRow[]>();
  for (const w of input.words) (sentWords.get(w.sent) ?? sentWords.set(w.sent, []).get(w.sent)!).push(w);

  const unresolved: Unresolved[] = [];
  const invalid: Unresolved[] = [];
  const unknown = new Set<string>();
  const unimpl = new Set<string>();
  const byKind: Record<string, number> = {};
  let total = 0;
  let ok = 0;
  const words: Record<string, [number, number]> = {};
  const words24: Record<string, [number, number]> = {};
  const curves: Record<string, number[]> = {};

  // shots in the window (all shots for a chapter spec)
  const inWin = (sh: SpecShot) => sh.sentences.some((s) => (sentWords.get(s) ?? []).some((w) => w.s >= ps.start && w.e <= ps.end));
  const shots = spec.shots.filter(inWin);
  const dropped = spec.shots.filter((sh) => !inWin(sh)).map((sh) => sh.shot_id);
  const firstWord = (sh: SpecShot) => Math.min(...sh.sentences.flatMap((s) => (sentWords.get(s) ?? []).map((w) => w.s)));
  const lastWord = (sh: SpecShot) => Math.max(...sh.sentences.flatMap((s) => (sentWords.get(s) ?? []).map((w) => w.e)));
  const starts24 = shots.map((sh, i) => {
    if (i === 0) return ps.start;
    const fw = firstWord(sh);
    const prevEnd = lastWord(shots[i - 1]);
    return Math.max(ps.start, Number.isFinite(prevEnd) ? prevEnd + 1 : ps.start, fw - CUT_LEAD);
  });

  const out: ResolvedShot[] = shots.map((sh, si) => {
    const from = c(starts24[si]);
    const to = si + 1 < shots.length ? c(starts24[si + 1]) : frames;
    const dur = Math.max(1, to - from);
    const sset = new Set(sh.sentences);
    const frameOf = (a: Anchor | undefined, where: string, kind: string): number | undefined => {
      if (!a) return undefined;
      total++;
      byKind[kind] = (byKind[kind] ?? 0) + 1;
      const w = wix.get(a.word);
      let why = '';
      if (!w) why = 'word not in the word map';
      else if (!sset.has(w.sent)) why = `word lies outside the shot's sentences (${w.sent})`;
      else if (w.s < ps.start || w.e > ps.end) why = 'word outside the played span';
      if (why) {
        unresolved.push({shot: sh.shot_id, where, word: a.word, why});
        return undefined;
      }
      ok++;
      const wr = w as WordRow;
      words[a.word] = [c(wr.s), c(wr.e)];
      words24[a.word] = [wr.s - ps.start, wr.e - ps.start];
      return anchorF(wr.s, a.lead_frames) - from;
    };
    const endOf = (a: Anchor | undefined): number | undefined => {
      const w = a && wix.get(a.word);
      return w ? c(w.e) - from : undefined;
    };

    // tier
    const fxLayer = sh.layers.find((l) => l.component === 'FXTier');
    const tier: FxId = o.preview ? 'lite' : o.tier ?? ((fxLayer?.props?.tier as FxId) || sh.fx_tier || 'standard');

    // camera
    const rig = sh.layers.find((l) => l.component === 'CameraRig');
    const camProps = (rig?.props ?? {}) as {move?: string; ease?: string; intensity?: number; nudges?: Anchor[]};
    const camera = {
      move: camProps.move ?? sh.camera?.move ?? 'push_in',
      ease: camProps.ease ?? sh.camera?.ease ?? 'inOutCubic',
      intensity: camProps.intensity ?? sh.camera?.intensity ?? 0.5,
      nudges: [] as number[],
    };

    // transition
    const trLayer = sh.layers.find((l) => ['WhipPan', 'LightStreakTransition', 'MatchCut'].includes(l.component));
    const trType = TRANSITION_ALIAS[sh.transition_out?.type ?? trLayer?.component ?? 'cut'] ?? 'dissolve';
    const trF24 = sh.transition_out?.frames ?? TRANSITION_F24[trType];
    const transition = {type: trType, frames: si + 1 < shots.length ? Math.round((trF24 * fps) / FILM_FPS) : 0};

    // depth planes
    const planes = new Map<string, {plane: ResolvedLayer['depth']; parallax: number; blur: number}>();
    for (const l of sh.layers.filter((x) => x.component === 'DepthLayers')) {
      for (const p of ((l.props?.planes as {layer: string; plane: ResolvedLayer['depth']; parallax?: number; blur?: number}[]) ?? []))
        planes.set(p.layer, {plane: p.plane, parallax: p.parallax ?? PLANE[p.plane].parallax, blur: p.blur ?? PLANE[p.plane].blur});
    }

    const layers: ResolvedLayer[] = [];
    const mods: ModSpec[] = [];
    const lastOf = new Map<string, ResolvedLayer>();
    sh.layers.forEach((ly: SpecLayer, li) => {
      const where = `L${li}`;
      const [base, act] = splitComp(ly.component);
      const cs = CATALOG[base];
      if (!cs) {
        unknown.add(base);
        return;
      }
      const sch = act ? cs.actions[act] : cs.props;
      if (!sch) {
        invalid.push({shot: sh.shot_id, where, why: `${base} has no action '${act}'`});
        return;
      }
      const parsed = sch.safeParse(ly.props ?? {});
      if (!parsed.success) {
        const iss = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
        invalid.push({shot: sh.shot_id, where, why: `${ly.component} props: ${iss.join('; ')}`});
      }
      const props = (parsed.success ? parsed.data : ly.props ?? {}) as Record<string, unknown>;
      const at = ly.at ? frameOf(ly.at, `${where}.at`, 'layer.at') : undefined;
      const nested = walkAnchors(ly.props ?? {});
      const nestedF = new Map<string, number | undefined>();
      for (const [p, a] of nested) nestedF.set(p, frameOf(a, `${where}.${p}`, p.endsWith('.until') ? 'props.until' : p.replace(/\[\d+\]/g, '[]')));
      if (base === 'CameraRig') camera.nudges = (camProps.nudges ?? []).map((_, k) => nestedF.get(`props.nudges[${k}]`)).filter((x): x is number => x !== undefined);
      if (base === 'AudioReactive') {
        const p = props as {feature: keyof typeof norm; to: string; param: keyof Mod; amount: number; smoothing: keyof typeof SMOOTH_A24};
        const key = `${p.feature}:${p.smoothing}`;
        if (!curves[key]) curves[key] = curveFor(input.features, p.feature, p.smoothing, ps, fps, frames);
        mods.push({to: p.to, param: p.param, amount: p.amount, curve: key});
        return;
      }
      if (['FXTier', 'CameraRig', 'DepthLayers', 'WhipPan', 'LightStreakTransition', 'MatchCut'].includes(base)) return; // shot-level, consumed above
      if (act) {
        const tgt = (props.target as string | undefined) ? layers.find((x) => x.id === props.target && x.component === base) : lastOf.get(base);
        if (!tgt) {
          invalid.push({shot: sh.shot_id, where, why: `action ${ly.component} has no earlier ${base} layer`});
          return;
        }
        const a: ResolvedAction = {name: act, props, at: at ?? 0, end: endOf(ly.at) ?? at ?? 0, li};
        tgt.actions.push(a);
        return;
      }
      if (o.implemented && !o.implemented(base)) unimpl.add(base);
      const id = (props.id as string | undefined) ?? `l${li}`;
      const pl = planes.get(id);
      const depth = pl?.plane ?? ((props.depth as ResolvedLayer['depth']) || 'mid');
      const slot = ((props.slot as SlotId | undefined) ?? o.slotOf?.(base) ?? 'full') as SlotId;
      const box: Rect = slotRect(slot);
      const untilF = props.until ? nestedF.get('props.until') : undefined;
      const rl: ResolvedLayer = {
        li,
        id,
        component: base,
        props,
        at: at ?? 0,
        atEnd: endOf(ly.at) ?? at ?? 0,
        until: untilF,
        box,
        depth,
        parallax: pl?.parallax ?? PLANE[depth].parallax,
        blur: pl?.blur ?? PLANE[depth].blur,
        actions: [],
        implemented: o.implemented ? o.implemented(base) : true,
      };
      layers.push(rl);
      lastOf.set(base, rl);
    });
    for (const h of sh.holds ?? []) {
      frameOf(h.from, 'holds.from', 'holds');
      frameOf(h.until, 'holds.until', 'holds');
    }
    for (const s of sh.sfx ?? []) frameOf(s.at, `sfx.${s.cue}`, 'sfx');
    // B3: copy boxes shrink by the camera envelope so that, at the peak of the push / truck / roll on their plane, the slot
    // still maps inside title-safe. The incoming transition (whip travel, match scale) is excluded on purpose.
    for (const l of layers) if (!o.textOf || o.textOf(l.component)) l.box = cameraSafeBox(camera, dur, tailFrames(transition), fps, l.parallax, l.box);
    return {shot_id: sh.shot_id, from, dur, tier, camera, layers, mods, transition};
  });

  const report: ResolverReport = {
    v: 1,
    spec: input.id,
    chapter: spec.chapter,
    fps,
    preview: o.preview,
    span24: [ps.start, ps.end],
    frames,
    shots: out.length,
    layers: out.reduce((n, s) => n + s.layers.length, 0),
    anchors_total: total,
    anchors_resolved: ok,
    resolved_pct: total ? +((100 * ok) / total).toFixed(2) : 100,
    unresolved,
    invalid_props: invalid,
    unknown_components: [...unknown],
    unimplemented: [...unimpl],
    by_kind: byKind,
    dropped_shots: dropped,
  };
  return {fps, frames, preview: o.preview, shots: out, words, words24, curves, report, audio: input.audio ?? null, span24: [ps.start, ps.end]};
};

/** Audio-reactive modulation of one layer at composition frame k. */
export const modAt = (shot: ResolvedShot, layerId: string, curves: Record<string, number[]>, k: number): Mod => {
  const m: Mod = {...NO_MOD};
  for (const s of shot.mods) {
    if (s.to !== layerId) continue;
    const cv = curves[s.curve];
    m[s.param] += s.amount * (cv?.[Math.max(0, Math.min(cv.length - 1, k))] ?? 0);
  }
  return m;
};

/** Tier object for a resolved shot. */
export const fxOf = (shot: ResolvedShot) => FX[shot.tier];
