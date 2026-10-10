// SpecPlayer (P7.3): the one composition that plays a scene spec (corpus/specs/<id>.json) or a component demo.
// The node driver (studio/scripts/p7.ts, via `dc render spec|snap|perf`) passes the spec, the chapter's word-map rows
// (24-fps record frames), the chapter span from the EDL and the audio features as input props. calculateMetadata resolves
// every {word, lead_frames} for the requested fps ONCE (src/spec/resolve.ts), validates props against the frozen catalog
// and sets the duration from the EDL span; the resolver report travels in the props and the driver writes it next to the render.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction} from 'remotion';
import {Backdrop, Post} from '../fx/Atmos';
import {hex} from '../fx/look';
import {C, FPS, FX, H, PREVIEW, W, type FxId} from '../tokens';
import {loadFonts} from '../type/fonts';
import {checkArabicWholeWords, checkTitleSafe, checkWholeWords} from '../type/qa';
import {presetFrames} from '../type/reveal';
import {safeRect, type Rect} from '../type/safe';
import {checkWhenSettled} from '../type/settle';
import {getComponent, getDemo, isImplemented, isText, slotOf} from './registry';
import {PREVIEW_FPS, modAt, resolveSpec, walkStrings} from './resolve';
import {cameraAt, dollyCounter, planeStyle, streakAt, tailFrames, transitionState} from './rig';
import type {Anchor, DemoDef, LayerCtx, Resolved, ResolvedLayer, ResolvedShot, SpecInput} from './types';

loadFonts();

export type SpecPlayerProps = {
  input?: SpecInput | null; // a scene spec (driver) ...
  demo?: string | null; // ... or a registered demo name (Demo-<Name> compositions)
  preview?: boolean;
  fps?: number | null;
  tier?: FxId | null; // force a tier (perf); preview forces lite
  resolved?: Resolved | null; // filled by calculateMetadata
  /** Debug / measurement renders (sync-verifier isolated per-layer onsets): `nocam` = no camera move, `nofx` = no backdrop / post /
   * streak, `cut` = every transition is a hard cut; `solo` = only the layer with this id is drawn. Never used for deliverables. */
  debug?: {nocam?: boolean; nofx?: boolean; cut?: boolean; solo?: string | null} | null;
};

/** A demo as a one-shot spec on synthetic word ids (frames are 24-fps demo frames). */
export const demoInput = (d: DemoDef): SpecInput => {
  const sent = `s:DEMO:${d.name}:0001`;
  return {
    id: `demo-${d.name}`,
    spec: {v: 1, chapter: 'DEMO', edl_version: 'v1', shots: [{shot_id: 'DEMO-S01', sentences: [sent], intent: d.shot.intent ?? `demo ${d.name}`, ...d.shot}]},
    span: {start: 0, end: d.frames},
    words: d.words.map(([id, s, e]) => ({id, s, e, sent})),
    features: null,
    audio: null,
  };
};

export const inputOf = (p: SpecPlayerProps): SpecInput => {
  if (p.input) return p.input;
  const d = p.demo ? getDemo(p.demo) : undefined;
  if (!d) throw new Error(`SpecPlayer: no input and no registered demo '${p.demo ?? ''}'`);
  return demoInput(d);
};

export const calculateSpecMetadata: CalculateMetadataFunction<SpecPlayerProps> = ({props}) => {
  const preview = !!props.preview;
  const fps = props.fps ?? (preview ? PREVIEW_FPS : FPS);
  const resolved = resolveSpec(inputOf(props), {fps, preview, tier: props.tier ?? undefined, implemented: isImplemented, slotOf, textOf: isText});
  if (props.debug?.cut) for (const sh of resolved.shots) sh.transition = {type: 'cut', frames: 0};
  return {
    durationInFrames: resolved.frames,
    fps,
    width: preview ? PREVIEW.width : W,
    height: preview ? PREVIEW.height : H,
    props: {...props, resolved},
  };
};

const PLANE_ORDER = ['far', 'mid', 'near', 'fg'] as const;

const Missing: React.FC<{l: ResolvedLayer; preview: boolean}> = ({l, preview}) =>
  preview ? (
    <div style={{position: 'absolute', left: l.box.x, top: l.box.y, width: l.box.w, height: l.box.h, border: `2px dashed ${C.warn}${hex(0.6)}`, color: C.warn, font: `500 24px 'DC-JBMono'`, padding: 12}}>
      {l.component} (not implemented)
    </div>
  ) : null;

type Debug = NonNullable<SpecPlayerProps['debug']>;
const NO_CAM = {s: 1, x: 0, y: 0, rz: 0};

const Shot: React.FC<{shot: ResolvedShot; prev: ResolvedShot | null; r: Resolved; dbg: Debug}> = ({shot, prev, r, dbg}) => {
  const t = useCurrentFrame(); // Sequence-local = shot-local
  const fx = FX[shot.tier];
  const cam = dbg.nocam ? NO_CAM : cameraAt(shot.camera, t, shot.dur, r.fps);
  const maskLead = Math.max(1, Math.round((2 * r.fps) / 24)); // 2 film frames at any fps (m11)
  const k = shot.from + t;
  const text: Rect[] = [];
  const exitF = presetFrames('exit', r.fps, true);
  for (const l of shot.layers) {
    const def = getComponent(l.component);
    const live = t >= l.at - maskLead && (l.until === undefined || t <= l.until + exitF); // mask only while the copy is on screen
    if (def?.text && live) text.push(def.textRect ? def.textRect(l.props as never, l.box) : l.box);
  }
  const anyHaze = shot.mods.filter((m) => m.param === 'haze').reduce((a, m) => a + m.amount * (r.curves[m.curve]?.[k] ?? 0), 0);
  const frameOf = (a?: Anchor) => {
    const w = a && r.words24[a.word];
    return w ? Math.round(((w[0] - a.lead_frames) * r.fps) / 24) - shot.from : undefined; // one rounding, as resolve.ts (m6)
  };
  const endOf = (a?: Anchor) => {
    const w = a && r.words[a.word];
    return w ? w[1] - shot.from : undefined;
  };
  const streak = dbg.nofx ? null : streakAt(t, shot.dur, shot.transition, fx);
  const tr = transitionState(t, shot.dur, prev?.transition ?? null, shot.transition);
  const fade = (op: number): React.CSSProperties => (op < 1 ? {opacity: op} : {});
  return (
    <AbsoluteFill style={tr.wrap} data-dc-transit={tr.transit ? 1 : undefined}>
      {dbg.nofx ? null : (
        <AbsoluteFill style={{...planeStyle(cam, 0.25 * dollyCounter(shot.camera, cam), 0), ...fade(tr.fadeIn)}}>
          <Backdrop fx={fx} textRects={text} audio={anyHaze} />
        </AbsoluteFill>
      )}
      {PLANE_ORDER.map((pl) => {
        const ls = shot.layers.filter((l) => l.depth === pl && (!dbg.solo || l.id === dbg.solo));
        if (!ls.length) return null;
        return (
          <React.Fragment key={pl}>
            {ls.map((l) => {
              const def = getComponent(l.component);
              const blurPx = def?.text ? 0 : l.blur * fx.dofBlurPx; // DOF never blurs copy
              const ctx: LayerCtx = {
                id: l.id,
                fx,
                fps: r.fps,
                preview: r.preview,
                frame: t,
                at: l.at,
                atEnd: l.atEnd,
                until: l.until,
                shotDur: shot.dur,
                box: l.box,
                frameOf,
                endOf,
                actions: l.actions,
                mod: modAt(shot, l.id, r.curves, k),
              };
              return (
                <AbsoluteFill key={l.li} style={{...planeStyle(cam, l.parallax, blurPx), ...fade(def?.text ? tr.textOut : tr.fadeIn)}} data-dc-layer={l.id}>
                  {def ? <def.Component props={l.props} ctx={ctx} /> : <Missing l={l} preview={r.preview} />}
                </AbsoluteFill>
              );
            })}
          </React.Fragment>
        );
      })}
      {dbg.nofx ? null : (
        <AbsoluteFill style={fade(tr.fadeIn)}>
          <Post fx={fx} />
        </AbsoluteFill>
      )}
      {streak !== null ? (
        <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
          <div
            style={{
              position: 'absolute',
              top: H * 0.35,
              height: H * 0.3,
              width: W * 0.6,
              left: W * (1.1 - 1.7 * streak),
              background: `linear-gradient(90deg, transparent, ${C.signal}${hex(0.55)}, ${C.white}${hex(0.8)}, ${C.signal}${hex(0.55)}, transparent)`,
              filter: `blur(${fx.glowPx}px)`,
              opacity: Math.sin(Math.PI * streak),
            }}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export const SpecPlayer: React.FC<SpecPlayerProps> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const r = props.resolved ?? resolveSpec(inputOf(props), {fps: props.fps ?? (props.preview ? PREVIEW_FPS : FPS), preview: !!props.preview, implemented: isImplemented, slotOf, textOf: isText});
  const dbg: Debug = props.debug ?? {};
  const scale = r.preview ? PREVIEW.width / W : 1;
  // every Arabic word on screen must be a whole word of some layer's props (catches typewriter / substring reveals, M6)
  const lexicon = useMemo(() => {
    const out: string[] = [];
    for (const sh of r.shots) for (const l of sh.layers) walkStrings(l.props, out), l.actions.forEach((a) => walkStrings(a.props, out));
    return out;
  }, [r]);
  // M8: the checks read the SETTLED frame (fonts loaded, every auto-fit shrunk), never the pre-fit layout; the frame is held
  // (delayRender) until they have run
  useLayoutEffect(
    () =>
      checkWhenSettled(`spec ${frame}`, () => {
        checkWholeWords(ref.current);
        checkArabicWholeWords(ref.current, lexicon);
        checkTitleSafe(ref.current, safeRect('title'), scale); // B3: on-screen position of every copy element after transforms
      }),
    [frame, lexicon, scale],
  );
  return (
    <AbsoluteFill style={{background: C.void}}>
      <div ref={ref} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: '0 0', overflow: 'hidden'}}>
        {r.shots.map((s, i) => (
          <Sequence key={s.shot_id} from={s.from} durationInFrames={s.dur + tailFrames(s.transition)} name={s.shot_id} layout="none">
            <AbsoluteFill style={{zIndex: i}}>
              <Shot shot={s} prev={i > 0 ? r.shots[i - 1] : null} r={r} dbg={dbg} />
            </AbsoluteFill>
          </Sequence>
        ))}
      </div>
      {r.audio ? <Audio src={staticFile(r.audio)} /> : null}
    </AbsoluteFill>
  );
};
