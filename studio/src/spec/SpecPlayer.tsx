// SpecPlayer (P7.3): the one composition that plays a scene spec (corpus/specs/<id>.json) or a component demo.
// The node driver (studio/scripts/p7.ts, via `dc render spec|snap|perf`) passes the spec, the chapter's word-map rows
// (24-fps record frames), the chapter span from the EDL and the audio features as input props. calculateMetadata resolves
// every {word, lead_frames} for the requested fps ONCE (src/spec/resolve.ts), validates props against the frozen catalog
// and sets the duration from the EDL span; the resolver report travels in the props and the driver writes it next to the render.
import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction} from 'remotion';
import {Backdrop, Post} from '../fx/Atmos';
import {hex} from '../fx/look';
import {C, FPS, FX, H, PREVIEW, W, type FxId} from '../tokens';
import {loadFonts} from '../type/fonts';
import {checkWholeWords} from '../type/qa';
import {presetFrames} from '../type/reveal';
import type {Rect} from '../type/safe';
import {getComponent, getDemo, isImplemented, slotOf} from './registry';
import {PREVIEW_FPS, modAt, resolveSpec} from './resolve';
import {cameraAt, dollyCounter, planeStyle, streakAt, tailFrames, transitionStyle} from './rig';
import type {Anchor, DemoDef, LayerCtx, Resolved, ResolvedLayer, ResolvedShot, SpecInput} from './types';

loadFonts();

export type SpecPlayerProps = {
  input?: SpecInput | null; // a scene spec (driver) ...
  demo?: string | null; // ... or a registered demo name (Demo-<Name> compositions)
  preview?: boolean;
  fps?: number | null;
  tier?: FxId | null; // force a tier (perf); preview forces lite
  resolved?: Resolved | null; // filled by calculateMetadata
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
  const resolved = resolveSpec(inputOf(props), {fps, preview, tier: props.tier ?? undefined, implemented: isImplemented, slotOf});
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

const Shot: React.FC<{shot: ResolvedShot; prev: ResolvedShot | null; r: Resolved}> = ({shot, prev, r}) => {
  const t = useCurrentFrame(); // Sequence-local = shot-local
  const fx = FX[shot.tier];
  const cam = cameraAt(shot.camera, t, shot.dur, r.fps);
  const k = shot.from + t;
  const text: Rect[] = [];
  const exitF = presetFrames('exit', r.fps, true);
  for (const l of shot.layers) {
    const def = getComponent(l.component);
    const live = t >= l.at - 2 && (l.until === undefined || t <= l.until + exitF); // mask only while the copy is on screen
    if (def?.text && live) text.push(def.textRect ? def.textRect(l.props as never, l.box) : l.box);
  }
  const anyHaze = shot.mods.filter((m) => m.param === 'haze').reduce((a, m) => a + m.amount * (r.curves[m.curve]?.[k] ?? 0), 0);
  const frameOf = (a?: Anchor) => {
    const w = a && r.words[a.word];
    return w ? w[0] - Math.round((a.lead_frames * r.fps) / 24) - shot.from : undefined;
  };
  const endOf = (a?: Anchor) => {
    const w = a && r.words[a.word];
    return w ? w[1] - shot.from : undefined;
  };
  const streak = streakAt(t, shot.dur, shot.transition, fx);
  return (
    <AbsoluteFill style={transitionStyle(t, shot.dur, prev?.transition ?? null, shot.transition)}>
      <AbsoluteFill style={planeStyle(cam, 0.25 * dollyCounter(shot.camera, cam), 0)}>
        <Backdrop fx={fx} textRects={text} audio={anyHaze} />
      </AbsoluteFill>
      {PLANE_ORDER.map((pl) => {
        const ls = shot.layers.filter((l) => l.depth === pl);
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
                <AbsoluteFill key={l.li} style={planeStyle(cam, l.parallax, blurPx)} data-dc-layer={l.id}>
                  {def ? <def.Component props={l.props} ctx={ctx} /> : <Missing l={l} preview={r.preview} />}
                </AbsoluteFill>
              );
            })}
          </React.Fragment>
        );
      })}
      <Post fx={fx} />
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
  const r = props.resolved ?? resolveSpec(inputOf(props), {fps: props.fps ?? FPS, preview: !!props.preview, implemented: isImplemented, slotOf});
  const scale = r.preview ? PREVIEW.width / W : 1;
  useLayoutEffect(() => checkWholeWords(ref.current), [frame]);
  return (
    <AbsoluteFill style={{background: C.void}}>
      <div ref={ref} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: '0 0', overflow: 'hidden'}}>
        {r.shots.map((s, i) => (
          <Sequence key={s.shot_id} from={s.from} durationInFrames={s.dur + tailFrames(s.transition)} name={s.shot_id} layout="none">
            <AbsoluteFill style={{zIndex: i}}>
              <Shot shot={s} prev={i > 0 ? r.shots[i - 1] : null} r={r} />
            </AbsoluteFill>
          </Sequence>
        ))}
      </div>
      {r.audio ? <Audio src={staticFile(r.audio)} /> : null}
    </AbsoluteFill>
  );
};
