// P6 motion tests (a) and (c). (b) lives in galaxy.tsx (MBGalaxyPush).
import React from 'react';
import {AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArCaption, Backdrop, Bokeh, Burst, Counter, FloorGrid, Glass, Haze, KWord, Post, TermChip, push} from './kit';
import {displayText} from '../type/overrides';
import {PLATE} from './galaxy';
import {RAG} from './content';
import {C, EASE, Fx, Typo, msToFrames} from './theme';
import {LEAD_FRAMES, PRESET_MS} from '../tokens';
import {F2SqlFunnel, F3Kafka} from './frames';
import WIN from './data/ch33_window.json';

type WordRec = {word_id: string; text: string; start_ms: number; end_ms: number};
const WORDS = WIN.words as WordRec[];
const byId = (n: number): WordRec => {
  const id = `w:S1:ar-natural:${String(n).padStart(6, '0')}`;
  const w = WORDS.find((x) => x.word_id === id);
  if (!w) throw new Error(`word ${id} not in window map`);
  return w;
};

/** Resolve a {word, lead_frames} anchor to a composition frame (ADR-002 24 fps table: kinetic word −2 frames = −83 ms). */
const useAnchor = () => {
  const {fps} = useVideoConfig();
  const lead = Math.round((LEAD_FRAMES.kinetic * fps) / 24); // the table is in 24 fps frames; rescale for previews
  return {
    on: (n: number, leadFrames = lead) => msToFrames(byId(n).start_ms - WIN.window.start_ms, fps) - leadFrames,
    end: (n: number) => msToFrames(byId(n).end_ms - WIN.window.start_ms, fps),
    text: (n: number) => displayText(byId(n).word_id, byId(n).text), // r2: display overrides (e.g. w:005968 -> الـroadmap)
  };
};

/** P11 sound hooks emitted by MA (anchored to word ids, ADR-002 SFX lead 3 f). Read by the sound-designer, not rendered. */
export const MA_SFX_HOOKS = [
  {word: 'w:S1:ar-natural:005976', lead_frames: LEAD_FRAMES.sfx, kind: 'impact-hit', note: 'وغلط: 3-frame flash + nudge'},
  {word: 'w:S1:ar-natural:005974', lead_frames: LEAD_FRAMES.sfx, kind: 'counter-land', note: '0.165 lands on خمسة'},
  {word: 'w:S1:ar-natural:005979', lead_frames: LEAD_FRAMES.sfx, kind: 'whoosh-soft', note: 'الـquery expansion'},
] as const;

/**
 * Motion test (a): Arabic impact words on real S1 timings, CH-33 3768.8–3778.8 s
 * ("أعلى نتيجة قسم roadmap بدرجة 0.165 — واثق وغلط وضعيف … وسّع الـquery بمرادفات").
 */
export const MAImpact: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const A = useAnchor();
  const exit1 = msToFrames(3776900 - WIN.window.start_ms, fps); // inside the 4.1 s pause, ≥ 1.2 s after the result word
  const impactF = A.on(5976);
  const nudge = frame === impactF ? 4 : frame === impactF + 1 ? -2 : 0; // 04 §3.5 one-frame camera nudge ≤ 4 px
  const counterA = A.on(5970, 0);
  const counterB = A.end(5974);
  // r1 (critic r0 issue 6): the 0.165 counter leaves WITH its phrase (same exit frame and curve), no orphan left on screen.
  const settle = interpolate(frame, [exit1, exit1 + msToFrames(300, fps)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.camera});
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.crit} shaft={false} />
      {/* r2 (critic r1 #9): far plane = the CH-33 galaxy plate (blurred, 30 %) + floor grid, moving at 0.4x of the push */}
      <AbsoluteFill style={{...push(frame, durationInFrames, 0.03, 0.4, 40), opacity: 0.3, filter: `blur(${fx.dofBlurPx * 1.5}px)`, mixBlendMode: 'screen'}}>
        <Img src={staticFile(PLATE.final)} />
      </AbsoluteFill>
      <AbsoluteFill style={push(frame, durationInFrames, 0.03, 0.5, 40)}>
        <FloorGrid y={800} drift={frame * 0.4} opacity={0.5} />
      </AbsoluteFill>
      <Haze fx={fx} y={520} h={560} tint={C.crit} k={0.8} />
      {/* carry-over: the query just spoken (w:005957-005964) is on screen as the window opens and leaves as أعلى arrives */}
      <AbsoluteFill style={{...push(frame, durationInFrames, 0.03, 0.8, 40), opacity: interpolate(frame, [A.on(5965), A.on(5965) + 8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        <Glass accent={C.signal} style={{right: 180, top: 640, padding: '12px 28px 14px', whiteSpace: 'nowrap'}}>
          <ArCaption text={RAG.queryAr} at={-1000} typo={typo} fx={fx} size={40} color={C.ink2} weight={600} />
        </Glass>
      </AbsoluteFill>
      {/* r2: 3-frame light burst behind the stressed word وغلط (light, not CA: Arabic stays CA-free) */}
      <AbsoluteFill style={push(frame, durationInFrames, 0.03, 1, 40)}>
        <Burst at={impactF} x={1280} y={445} r={420} color={C.crit} frames={3} />
      </AbsoluteFill>
      <Bokeh fx={fx} seed="ma" drift={frame * 0.5} />
      <AbsoluteFill style={{...push(frame, durationInFrames, 0.03, 1, 40), translate: `${nudge}px 0px`} as React.CSSProperties}>
        <div dir="rtl" style={{position: 'absolute', right: 180, top: 170, display: 'flex', gap: 22, alignItems: 'baseline'}}>
          <KWord text={A.text(5965)} at={A.on(5965)} out={exit1} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
          <KWord text={A.text(5966)} at={A.on(5966)} out={exit1} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
          <KWord text={A.text(5967)} at={A.on(5967)} out={exit1} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
          {/* r2 (arabic r1): 'الـroadmap' via the display override; inline Latin in Inter Tight, same colour (rule L1) */}
          <KWord text={A.text(5968)} at={A.on(5968)} out={exit1} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
        </div>
        <div dir="rtl" style={{position: 'absolute', right: 180, top: 330, display: 'flex', alignItems: 'center', gap: 56}}>
          <KWord text={A.text(5975)} at={A.on(5975)} out={exit1} typo={typo} fx={fx} size={92} color={C.ink} preset="impact" />
          <KWord text={A.text(5976)} at={A.on(5976)} out={exit1} typo={typo} fx={fx} size={176} color={C.crit} preset="impact" flashFrames={3} />
          <KWord text={A.text(5977).replace('.', '')} at={A.on(5977)} out={exit1} typo={typo} fx={fx} size={92} color={C.warn} preset="impact" />
        </div>
        {frame >= counterA - 2 ? (
          <div
            dir="ltr"
            style={{
              position: 'absolute',
              left: 200,
              top: 650,
              transform: `scale(${1 - 0.04 * settle})`,
              transformOrigin: 'left top',
              filter: settle > 0.01 ? `blur(${8 * settle}px)` : undefined,
              opacity: interpolate(frame, [counterA - 2, counterA + 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (1 - settle),
            }}
          >
            <Counter from={0} to={0.165} a={counterA} b={counterB} decimals={3} typo={typo} fx={fx} size={200} color={C.crit} impact />
          </div>
        ) : null}
        <div dir="rtl" style={{position: 'absolute', right: 180, top: 420, display: 'flex', alignItems: 'baseline', gap: 26}}>
          <KWord text={A.text(5978)} at={A.on(5978)} typo={typo} fx={fx} size={110} color={C.ink} preset="impact" />
          <KWord text={A.text(5979)} at={A.on(5979)} typo={typo} fx={fx} size={110} color={C.signal} preset="impact" />
          <KWord text={A.text(5980)} at={A.on(5980)} typo={typo} fx={fx} size={110} color={C.ink} />
        </div>
        {frame >= A.on(5979) ? <TermChip term="query expansion" typo={typo} fx={fx} size={32} style={{right: 180, top: 640, opacity: interpolate(frame, [A.on(5979), A.on(5979) + 5], [0, 1], {extrapolateRight: 'clamp'})}} /> : null}
      </AbsoluteFill>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

/** Directional (whip) blur via an inline SVG filter; CSS blur() is isotropic. */
const WhipFilter: React.FC<{id: string; px: number}> = ({id, px}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id={id} x="-10%" y="0%" width="120%" height="100%">
        <feGaussianBlur stdDeviation={`${px} 0`} />
      </filter>
    </defs>
  </svg>
);

const Streak: React.FC<{k: number; fx: Fx; wash: boolean}> = ({k, fx, wash}) => {
  // k: -1..1 across the transition; peak at 0. Sweeps right → left (RTL reading direction).
  const {width, height} = useVideoConfig();
  const a = Math.max(0, 1 - Math.abs(k));
  const cx = interpolate(k, [-1, 1], [width * 1.25, -width * 0.25]);
  const cy = height * 0.47;
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: cy - 160, height: 320, background: `radial-gradient(ellipse 60% 50% at ${(cx / width) * 100}% 50%, ${C.signal}${Math.round(a * 0x55).toString(16).padStart(2, '0')} 0%, transparent 70%)`}} />
      {Array.from({length: 11}, (_, i) => {
        const y = cy + (random(`sy${i}`) - 0.5) * 360;
        const len = 500 + random(`sl${i}`) * 1300;
        const th = 1 + random(`st${i}`) * 4;
        const off = (random(`so${i}`) - 0.5) * 700;
        const o = a * (0.25 + random(`sa${i}`) * 0.6);
        return (
          <div key={i} style={{position: 'absolute', left: cx + off - len / 2, top: y, width: len, height: th, borderRadius: th, opacity: o, background: `linear-gradient(90deg, transparent, ${i % 4 === 0 ? C.violet : C.signal} 40%, ${C.white} 50%, ${C.signal} 60%, transparent)`, boxShadow: `0 0 ${fx.glowPx}px ${C.signal}`}} />
        );
      })}
      <div style={{position: 'absolute', left: cx - width, top: cy - 3, width: width * 2, height: 6, opacity: a, background: `linear-gradient(90deg, transparent, ${C.signal} 35%, ${C.white} 50%, ${C.signal} 65%, transparent)`, boxShadow: `0 0 ${fx.glowPx * 1.5}px ${C.signal}, 0 0 ${fx.glowPx * 3}px ${C.signal}88`}} />
      {wash ? <AbsoluteFill style={{background: C.white, opacity: a * a * 0.12}} /> : null}
    </AbsoluteFill>
  );
};

/**
 * Motion test (c): SQL funnel → whip-pan + light streak → Kafka partitions. Cut at 5.0 s; 520 ms total.
 * r1 (critic r0 issue 7): asymmetric — the outgoing whip takes 520 ms − 3 frames, the incoming scene is fully
 * de-blurred, settled and back at the tier's black level by cut + 3 frames (no streak, glow or wash after that).
 */
export const MCStreak: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const T0 = Math.round(5 * fps);
  const inF = 3; // cut + 3 frames
  const outF = Math.max(1, msToFrames(PRESET_MS.whipTotal, fps) - inF);
  const k = frame < T0 ? interpolate(frame, [T0 - outF, T0], [-1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : interpolate(frame, [T0, T0 + inF], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const inT = frame >= T0 - outF && frame < T0 + inF;
  const showA = frame < T0;
  const eA = interpolate(frame, [T0 - outF, T0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.camera});
  const eB = interpolate(frame, [T0, T0 + inF], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.arrive});
  const e = showA ? eA : frame >= T0 + inF ? 0 : eB;
  const shift = showA ? -e * width * 0.3 : e * width * 0.3;
  const blur = Math.round(e * 48);
  return (
    <AbsoluteFill style={{background: C.void}}>
      <WhipFilter id="whip" px={blur} />
      <AbsoluteFill style={{transform: shift ? `translateX(${shift}px)` : undefined, filter: blur > 0 ? 'url(#whip)' : undefined}}>
        {showA ? <F2SqlFunnel typo={typo} fx={fx} /> : <F3Kafka typo={typo} fx={fx} t0={T0} />}
      </AbsoluteFill>
      {/* r2 (critic r1 #10): the last 2 frames before the cut carry 20 % of the incoming scene's light (no black dip) */}
      {showA && frame >= T0 - 2 ? (
        <AbsoluteFill style={{opacity: 0.2, transform: `translateX(${width * 0.3 * 0.6}px)`, filter: 'url(#whip)'}}>
          <F3Kafka typo={typo} fx={fx} t0={T0} />
        </AbsoluteFill>
      ) : null}
      {inT ? <Streak k={k} fx={fx} wash={showA} /> : null}
    </AbsoluteFill>
  );
};
