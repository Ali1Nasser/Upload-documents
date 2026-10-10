// FX tier atmosphere (P7): backdrop, haze, grain, vignette, text-safe masks (ADR-002 FX2 + text-safe ON). Seeded only.
import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C, type Fx} from '../tokens';
import type {Rect} from '../type/safe';
import {hex} from './look';

// ---------- text-safe masks (ADR-002): haze / particles / bokeh / bloom are removed from text boxes + tier padding ----------
const FEATHER = {core: 0.25, out: 2.5, scale: 0.5} as const; // look-dev r3 feather (critic r2 #2)
const holeCache = new Map<string, string>();
const holeSprite = (w: number, h: number, pad: number): string => {
  const key = `${Math.round(w)}x${Math.round(h)}:${pad}`;
  const hit = holeCache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const E = pad * FEATHER.out;
  const core = pad * FEATHER.core;
  const mid = core + (E - core) / 2;
  const k = FEATHER.scale;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((w + 2 * E) * k);
  cv.height = Math.ceil((h + 2 * E) * k);
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  ctx.filter = `blur(${(((E - core) / 4) * k).toFixed(2)}px)`;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.roundRect((E - mid) * k, (E - mid) * k, (w + 2 * mid) * k, (h + 2 * mid) * k, Math.max(4, mid) * k);
  ctx.fill();
  const url = cv.toDataURL('image/png');
  holeCache.set(key, url);
  return url;
};
export const textSafeMask = (rects: Rect[], fx: Fx): React.CSSProperties => {
  if (!fx.textSafe || !rects.length) return {};
  const pad = fx.textSafePadPx;
  const E = pad * FEATHER.out;
  const holes = rects.map((r) => ({url: holeSprite(r.w, r.h, pad), r}));
  if (holes.some((h) => !h.url)) return {};
  return {
    maskImage: ['linear-gradient(#000, #000)', ...holes.map((h) => `url("${h.url}")`)].join(', '),
    maskComposite: ['subtract', ...holes.map(() => 'add')].join(', '),
    maskPosition: ['0px 0px', ...holes.map((h) => `${(h.r.x - E).toFixed(1)}px ${(h.r.y - E).toFixed(1)}px`)].join(', '),
    maskSize: ['100% 100%', ...holes.map((h) => `${(h.r.w + 2 * E).toFixed(1)}px ${(h.r.h + 2 * E).toFixed(1)}px`)].join(', '),
    maskRepeat: 'no-repeat',
    maskMode: 'alpha',
  } as React.CSSProperties;
};

/** void -> ground radial, key rim light upper right (04 §1.2), signal haze band masked out of the text boxes. */
export const Backdrop: React.FC<{fx: Fx; textRects?: Rect[]; tint?: string; audio?: number}> = ({fx, textRects = [], tint = C.signal, audio = 0}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse 90% 80% at 62% 38%, ${C.ground} 0%, ${C.void} 72%)`}}>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 40% 55% at 88% 6%, ${tint}${hex(0.07)} 0%, transparent 70%)`}} />
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 30% at 50% 62%, ${tint}${hex(fx.haze * (1 + 0.6 * audio))} 0%, transparent 70%)`,
        ...textSafeMask(textRects, fx),
      }}
    />
    <Bokeh fx={fx} textRects={textRects} />
  </AbsoluteFill>
);

/** Foreground bokeh discs (count from the tier), seeded positions, slow drift; masked out of text boxes. */
export const Bokeh: React.FC<{fx: Fx; textRects?: Rect[]; seed?: string}> = ({fx, textRects = [], seed = 'bk'}) => {
  const frame = useCurrentFrame();
  if (!fx.bokeh) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', ...textSafeMask(textRects, fx)}}>
      {Array.from({length: fx.bokeh}, (_, i) => {
        const r = 40 + random(`${seed}r${i}`) * 110;
        const x = random(`${seed}x${i}`) * 1920 + frame * 0.15 * (0.5 + random(`${seed}p${i}`));
        const y = random(`${seed}y${i}`) * 1080;
        const col = random(`${seed}c${i}`) > 0.75 ? C.violet : C.signal;
        const a = 0.04 + random(`${seed}a${i}`) * 0.06;
        return <div key={i} style={{position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: `radial-gradient(circle, ${col}${hex(a)} 0%, ${col}${hex(a * 0.6)} 45%, transparent 70%)`}} />;
      })}
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{fx: Fx}> = ({fx}) => {
  const frame = useCurrentFrame();
  const url = useMemo(() => {
    if (typeof document === 'undefined' || !fx.grain) return '';
    const s = 256;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');
    if (!ctx) return '';
    const img = ctx.createImageData(s, s);
    for (let i = 0; i < s * s; i++) {
      const v = Math.round(random(`grain${i}`) * 255);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }, [fx.grain]);
  if (!fx.grain || !url) return null;
  const ox = Math.floor(random(`gx${frame}`) * 256);
  const oy = Math.floor(random(`gy${frame}`) * 256);
  return <AbsoluteFill style={{backgroundImage: `url(${url})`, backgroundPosition: `${ox}px ${oy}px`, mixBlendMode: 'overlay', opacity: fx.grain * 8, pointerEvents: 'none'}} />;
};

export const Vignette: React.FC<{fx: Fx}> = ({fx}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, ${C.void}${hex(fx.vignette * 3.2)} 100%)`, pointerEvents: 'none'}} />
);

/** The tier's post stack over a whole shot. */
export const Post: React.FC<{fx: Fx}> = ({fx}) => (
  <>
    <Vignette fx={fx} />
    <Grain fx={fx} />
  </>
);

/** Glass plate behind copy / tables (04 §3.4: every string sits on a plate or a halo). */
export const Glass: React.FC<{style?: React.CSSProperties; accent?: string; children?: React.ReactNode}> = ({style, accent, children}) => (
  <div
    style={{
      background: `linear-gradient(180deg, ${C.panel}E6 0%, ${C.ground}D9 100%)`,
      border: `1px solid ${C.grid}`,
      borderRadius: 18,
      boxShadow: `inset 0 1px 0 ${C.ink}1A, 0 20px 60px ${C.void}73${accent ? `, 0 0 24px ${accent}22` : ''}`,
      ...style,
    }}
  >
    {children}
  </div>
);
