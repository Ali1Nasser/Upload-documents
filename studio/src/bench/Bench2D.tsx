import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadPlexAR} from '../fonts';
import {C} from '../tokens';

loadPlexAR();

// Whole Arabic words (never per-letter), RTL, shaped by the browser; Latin impact words interleaved.
const WORDS: {t: string; lang: 'ar' | 'en'; at: number; color: string}[] = [
  {t: 'الكمبيوتر', lang: 'ar', at: 5, color: C.ink},
  {t: 'بيعمل', lang: 'ar', at: 17, color: C.ink},
  {t: 'حاجة', lang: 'ar', at: 29, color: C.signal},
  {t: 'Latency', lang: 'en', at: 41, color: C.warn},
  {t: 'قاعدة البيانات', lang: 'ar', at: 53, color: C.ink},
  {t: '99.9%', lang: 'en', at: 65, color: C.ok},
  {t: 'الاتساق النهائي', lang: 'ar', at: 77, color: C.violet},
  {t: 'Throughput', lang: 'en', at: 89, color: C.signal},
];

const Word: React.FC<{w: (typeof WORDS)[number]; i: number}> = ({w, i}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - w.at, fps, config: {damping: 14, stiffness: 140}});
  const op = interpolate(frame - w.at, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const row = Math.floor(i / 2);
  const col = i % 2;
  return (
    <div
      dir={w.lang === 'ar' ? 'rtl' : 'ltr'}
      lang={w.lang}
      style={{
        position: 'absolute',
        top: 120 + row * 150,
        left: 40 + col * 580,
        width: 560,
        textAlign: 'center',
        fontFamily: 'PlexAR, sans-serif',
        fontWeight: 700,
        fontSize: 88,
        lineHeight: 1.25,
        color: w.color,
        opacity: op,
        transform: `translateY(${(1 - s) * 40}px) scale(${0.85 + 0.15 * s})`,
        textShadow: `0 0 18px ${w.color}88`,
        whiteSpace: 'nowrap',
      }}
    >
      {w.t}
    </div>
  );
};

const Diagram: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 150;
  const nodes = [0, 1, 2, 3, 4].map((k) => ({
    x: 1180 + k * 150,
    y: 300 + Math.sin(t * Math.PI * 4 + k) * 70 + (k % 2) * 160,
  }));
  const dot = interpolate(frame % 50, [0, 50], [0, 1], {easing: Easing.inOut(Easing.cubic)});
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: 24}).map((_, i) => (
        <line key={`g${i}`} x1={0} x2={1920} y1={600 + i * 24} y2={600 + i * 24} stroke={C.grid} strokeOpacity={0.35} />
      ))}
      <polyline points={nodes.map((n) => `${n.x},${n.y}`).join(' ')} fill="none" stroke={C.signal} strokeWidth={3} strokeOpacity={0.7} />
      {nodes.map((n, k) => (
        <g key={k}>
          <circle cx={n.x} cy={n.y} r={26} fill={C.panel} stroke={k === 2 ? C.signal : C.ink3} strokeWidth={3} />
          <circle cx={n.x} cy={n.y} r={9} fill={k === 2 ? C.signal : C.ink2} />
        </g>
      ))}
      {nodes.slice(0, -1).map((n, k) => {
        const m = nodes[k + 1];
        return <circle key={`p${k}`} cx={n.x + (m.x - n.x) * dot} cy={n.y + (m.y - n.y) * dot} r={8} fill={C.ok} />;
      })}
    </svg>
  );
};

export const Bench2D: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = 1 + 0.025 * (frame / 150);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 60% 40%, ${C.ground} 0%, ${C.void} 75%)`}}>
      <AbsoluteFill style={{transform: `scale(${drift})`}}>
        <Diagram />
        {WORDS.map((w, i) => (
          <Word key={i} w={w} i={i} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
