// P6 motion tests (a) and (c). (b) lives in galaxy.tsx (MBGalaxyPush).
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop, Bokeh, Counter, KWord, Post, TermChip, drift} from './kit';
import {C, EASE, Fx, Typo, msToFrames} from './theme';
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

/** Resolve a {word, lead_frames} anchor to a composition frame (04 §4: kinetic word −3 frames at 30 fps = −100 ms). */
const useAnchor = () => {
  const {fps} = useVideoConfig();
  const lead = Math.round(0.1 * fps);
  return {
    on: (n: number, leadFrames = lead) => msToFrames(byId(n).start_ms - WIN.window.start_ms, fps) - leadFrames,
    end: (n: number) => msToFrames(byId(n).end_ms - WIN.window.start_ms, fps),
    text: (n: number) => byId(n).text,
  };
};

/**
 * Motion test (a): Arabic impact words on real S1 timings, CH-33 3768.8–3778.8 s
 * ("أعلى نتيجة قسم roadmap بدرجة 0.165 — واثق وغلط وضعيف … وسّع الـquery بمرادفات").
 */
export const MAImpact: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const A = useAnchor();
  const exit1 = msToFrames(3776900 - WIN.window.start_ms, fps); // inside the 4.1 s pause, ≥ 1.2 s after the result word
  const impactF = A.on(5976);
  const nudge = frame === impactF ? 4 : frame === impactF + 1 ? -2 : 0; // 04 §3.5 one-frame camera nudge ≤ 4 px
  const counterA = A.on(5970, 0);
  const counterB = A.end(5974);
  const settle = interpolate(frame, [exit1, exit1 + msToFrames(500, fps)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.camera});
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.crit} shaft={false} />
      <Bokeh fx={fx} seed="ma" drift={frame * 0.5} />
      <AbsoluteFill style={{transform: `${drift(frame, fps, 0.02)} translateX(${nudge}px)`}}>
        <div dir="rtl" style={{position: 'absolute', right: 180, top: 170, display: 'flex', gap: 22, alignItems: 'baseline'}}>
          <KWord text={A.text(5965)} at={A.on(5965)} out={exit1} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
          <KWord text={A.text(5966)} at={A.on(5966)} out={exit1} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
          <KWord text={A.text(5967)} at={A.on(5967)} out={exit1} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
          <KWord text="roadmap" lang="mono" at={A.on(5968)} out={exit1} typo={typo} fx={fx} size={64} color={C.signal} />
        </div>
        <div dir="rtl" style={{position: 'absolute', right: 180, top: 330, display: 'flex', alignItems: 'center', gap: 56}}>
          <KWord text={A.text(5975)} at={A.on(5975)} out={exit1} typo={typo} fx={fx} size={92} color={C.ink} preset="impact" />
          <KWord text={A.text(5976)} at={A.on(5976)} out={exit1} typo={typo} fx={fx} size={176} color={C.crit} preset="impact" />
          <KWord text={A.text(5977).replace('.', '')} at={A.on(5977)} out={exit1} typo={typo} fx={fx} size={92} color={C.warn} preset="impact" />
        </div>
        {frame >= counterA - 2 ? (
          <div
            dir="ltr"
            style={{
              position: 'absolute',
              left: interpolate(settle, [0, 1], [200, 140]),
              top: interpolate(settle, [0, 1], [650, 120]),
              transform: `scale(${interpolate(settle, [0, 1], [1, 0.5])})`,
              transformOrigin: 'left top',
              opacity: interpolate(frame, [counterA - 2, counterA + 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * interpolate(settle, [0, 1], [1, 0.55]),
            }}
          >
            <Counter from={0} to={0.165} a={counterA} b={counterB} decimals={3} typo={typo} fx={fx} size={200} color={C.crit} />
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

const Streak: React.FC<{k: number; fx: Fx}> = ({k, fx}) => {
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
          <div key={i} style={{position: 'absolute', left: cx + off - len / 2, top: y, width: len, height: th, borderRadius: th, opacity: o, background: `linear-gradient(90deg, transparent, ${i % 4 === 0 ? C.violet : C.signal} 40%, #FFFFFF 50%, ${C.signal} 60%, transparent)`, boxShadow: `0 0 ${fx.glowPx}px ${C.signal}`}} />
        );
      })}
      <div style={{position: 'absolute', left: cx - width, top: cy - 3, width: width * 2, height: 6, opacity: a, background: `linear-gradient(90deg, transparent, ${C.signal} 35%, #FFFFFF 50%, ${C.signal} 65%, transparent)`, boxShadow: `0 0 ${fx.glowPx * 1.5}px ${C.signal}, 0 0 ${fx.glowPx * 3}px ${C.signal}88`}} />
      <AbsoluteFill style={{background: '#FFFFFF', opacity: a * a * 0.12}} />
    </AbsoluteFill>
  );
};

/** Motion test (c): SQL funnel → whip-pan + light streak → Kafka partitions (cut at 5.0 s, 520 ms transition). */
export const MCStreak: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const T0 = Math.round(5 * fps);
  const half = msToFrames(260, fps);
  const k = interpolate(frame, [T0 - half, T0 + half], [-1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const inT = frame >= T0 - half && frame <= T0 + half;
  const showA = frame < T0;
  const eA = interpolate(frame, [T0 - half, T0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.camera});
  const eB = interpolate(frame, [T0, T0 + half], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.arrive});
  const e = showA ? eA : eB;
  const shift = showA ? -e * width * 0.3 : e * width * 0.3;
  const blur = Math.round(e * 48);
  return (
    <AbsoluteFill style={{background: C.void}}>
      <WhipFilter id="whip" px={blur} />
      <AbsoluteFill style={{transform: `translateX(${shift}px)`, filter: blur > 0 ? 'url(#whip)' : undefined}}>
        {showA ? <F2SqlFunnel typo={typo} fx={fx} /> : <F3Kafka typo={typo} fx={fx} />}
      </AbsoluteFill>
      {inT ? <Streak k={k} fx={fx} /> : null}
    </AbsoluteFill>
  );
};
