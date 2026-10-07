import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {loadPlexAR} from '../fonts';
import {C} from '../tokens';

loadPlexAR();
const N = 400;

export const BenchGlow: React.FC = () => {
  const frame = useCurrentFrame();
  const parts = useMemo(
    () =>
      Array.from({length: N}, (_, i) => ({
        x: random(`x${i}`) * 1920,
        y: random(`y${i}`) * 1080,
        r: 2 + random(`r${i}`) * 7,
        sp: 0.2 + random(`s${i}`) * 0.8,
        ph: random(`p${i}`) * Math.PI * 2,
        c: [C.signal, C.violet, C.ok, C.ember][i % 4],
      })),
    [],
  );
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${C.ground} 0%, ${C.void} 80%)`}}>
      {parts.map((p, i) => {
        const x = (p.x + frame * 3 * p.sp) % 1920;
        const y = p.y + Math.sin(frame / 15 + p.ph) * 30;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.r * 2,
              height: p.r * 2,
              borderRadius: '50%',
              background: p.c,
              boxShadow: `0 0 ${p.r * 3}px ${p.r}px ${p.c}66`,
              opacity: 0.55 + 0.45 * Math.sin(frame / 10 + p.ph),
            }}
          />
        );
      })}
      <div
        dir="rtl"
        style={{
          position: 'absolute',
          left: 460,
          top: 290,
          width: 1000,
          height: 500,
          borderRadius: 28,
          background: `${C.panel}b8`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${C.signal}55`,
          boxShadow: `0 0 40px ${C.signal}33, inset 0 0 0 1px #ffffff10`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'PlexAR, sans-serif',
          color: C.ink,
        }}
      >
        <div style={{fontSize: 110, fontWeight: 700, textShadow: `0 0 24px ${C.signal}`}}>الاتساق النهائي</div>
        <div style={{fontSize: 48, fontWeight: 500, color: C.ink2, marginTop: 20}} dir="ltr">
          Eventual consistency
        </div>
      </div>
    </AbsoluteFill>
  );
};
