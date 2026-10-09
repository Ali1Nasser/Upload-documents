// Look-dev kit: backdrop, grain, vignette, glass, Arabic-first kinetic type. Seeded randomness only.
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, EASE, Fx, PRESET_MS, Typo, glow, halo, msToFrames} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ---------- atmosphere ----------

/** void→ground radial, key rim light from the upper right (04 §1.2), signal haze shaft. */
export const Backdrop: React.FC<{fx: Fx; tint?: string; shaft?: boolean}> = ({fx, tint = C.signal, shaft = true}) => (
  <AbsoluteFill>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 85% 75% at 55% 45%, ${C.ground} 0%, ${C.void} 78%)`}} />
    <AbsoluteFill style={{background: `radial-gradient(ellipse 45% 40% at 88% 6%, ${tint}${hex(fx.haze * 2.2)} 0%, transparent 70%)`}} />
    {shaft ? (
      <AbsoluteFill
        style={{
          background: `linear-gradient(112deg, transparent 38%, ${tint}${hex(fx.haze)} 50%, transparent 62%)`,
          mixBlendMode: 'screen',
        }}
      />
    ) : null}
  </AbsoluteFill>
);

/** Holographic floor grid in perspective, 1 px lines at --grid 35 %. */
export const FloorGrid: React.FC<{y?: number; drift?: number; opacity?: number}> = ({y = 700, drift = 0, opacity = 0.35}) => {
  const {width, height} = useVideoConfig();
  const vx = width / 2;
  const lines: React.ReactNode[] = [];
  for (let i = -24; i <= 24; i++) {
    const x = vx + i * 160 + (drift % 160);
    lines.push(<line key={`v${i}`} x1={vx + (x - vx) * 0.05} y1={y} x2={x * 1 + (x - vx) * 2} y2={height} />);
  }
  for (let k = 0; k < 12; k++) {
    const t = ((k + ((drift / 160) % 1)) / 12) ** 2.2;
    const yy = y + t * (height - y);
    lines.push(<line key={`h${k}`} x1={0} y1={yy} x2={width} y2={yy} />);
  }
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity}}>
      <defs>
        <linearGradient id="gridfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.grid} stopOpacity={0} />
          <stop offset="0.35" stopColor={C.grid} stopOpacity={1} />
        </linearGradient>
      </defs>
      <g stroke="url(#gridfade)" strokeWidth={1.2}>
        {lines}
      </g>
    </svg>
  );
};

/** Film grain: a seeded 256² luma tile, offset per frame (deterministic). */
export const Grain: React.FC<{fx: Fx}> = ({fx}) => {
  const frame = useCurrentFrame();
  const url = useMemo(() => {
    if (typeof document === 'undefined') return '';
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
  }, []);
  if (!fx.grain || !url) return null;
  const ox = Math.floor(random(`gx${frame}`) * 256);
  const oy = Math.floor(random(`gy${frame}`) * 256);
  // overlay blend at opacity a gives roughly ±a luma modulation
  return (
    <AbsoluteFill
      style={{backgroundImage: `url(${url})`, backgroundPosition: `${ox}px ${oy}px`, mixBlendMode: 'overlay', opacity: fx.grain * 8, pointerEvents: 'none'}}
    />
  );
};

export const Vignette: React.FC<{fx: Fx}> = ({fx}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,${fx.vignette * 3.2}) 100%)`, pointerEvents: 'none'}} />
);

/** Foreground bokeh: soft discs (radial gradients, no CSS filter), slow drift. */
export const Bokeh: React.FC<{fx: Fx; seed: string; drift?: number}> = ({fx, seed, drift = 0}) => {
  const {width, height} = useVideoConfig();
  const n = fx.bokeh;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: n}, (_, i) => {
        const r = 40 + random(`${seed}r${i}`) * 110;
        const x = random(`${seed}x${i}`) * width + drift * (0.6 + random(`${seed}p${i}`));
        const y = random(`${seed}y${i}`) * height;
        const col = random(`${seed}c${i}`) > 0.75 ? C.violet : C.signal;
        const a = 0.05 + random(`${seed}a${i}`) * 0.08;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${col}${hex(a)} 0%, ${col}${hex(a * 0.6)} 45%, transparent 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Wraps a scene with the tier's post stack: grain + vignette. */
export const Post: React.FC<{fx: Fx}> = ({fx}) => (
  <>
    <Vignette fx={fx} />
    <Grain fx={fx} />
  </>
);

// ---------- surfaces ----------

export const Glass: React.FC<{style?: React.CSSProperties; children?: React.ReactNode; accent?: string; blur?: boolean}> = ({
  style,
  children,
  accent,
  blur = false,
}) => (
  <div
    style={{
      position: 'absolute',
      background: `linear-gradient(180deg, rgba(22,27,34,0.84) 0%, rgba(22,27,34,0.72) 100%)`,
      border: `1px solid ${accent ? accent + '66' : 'rgba(230,237,243,0.10)'}`,
      boxShadow: `inset 0 1px 0 rgba(230,237,243,0.10), 0 20px 60px rgba(0,0,0,0.45)${accent ? `, 0 0 24px ${accent}22` : ''}`,
      borderRadius: 18,
      backdropFilter: blur ? 'blur(12px)' : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------- Arabic-first text ----------

const LTR_HINT = /[A-Za-z0-9]/;
const PUNCT_END = /[.,،:؛!?؟]+$/;
const AR_PREFIX = /^([؀-ۿـ]*)(.*)$/;

type Seg = {t: string; ltr: boolean};

/**
 * Split a mixed Arabic/Latin string into Arabic text runs and LTR isolates. Arabic words are never split:
 * the only split inside a token is at an Arabic prefix boundary (`الـKafka` → `الـ` + <bdi>Kafka</bdi>,
 * `وindex` → `و` + <bdi>index</bdi>). Use ⟦…⟧ to force one LTR isolate (e.g. `⟦4 / 6 = 66.67 %⟧`).
 */
export const segment = (text: string): Seg[] => {
  const out: Seg[] = [];
  const pushAr = (t: string) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && !last.ltr) last.t += t;
    else out.push({t, ltr: false});
  };
  const parts = text.split(/(⟦[^⟧]*⟧)/);
  for (const part of parts) {
    if (part.startsWith('⟦')) {
      out.push({t: part.slice(1, -1), ltr: true});
      continue;
    }
    for (const tok of part.split(/(\s+)/)) {
      if (!tok) continue;
      if (!LTR_HINT.test(tok)) {
        pushAr(tok);
        continue;
      }
      const p = (tok.match(PUNCT_END) || [''])[0];
      const core = p ? tok.slice(0, -p.length) : tok;
      const m = core.match(AR_PREFIX);
      const pre = m ? m[1] : '';
      const rest = m ? m[2] : core;
      pushAr(pre);
      out.push({t: rest, ltr: true});
      pushAr(p);
    }
  }
  return out;
};

/** Mixed Arabic + Latin line: Arabic in `arFont`, Latin isolates in `latFont`. */
export const Mix: React.FC<{text: string; arFont: string; latFont: string; latWeight?: number; latScale?: number; latColor?: string; style?: React.CSSProperties}> = ({
  text,
  arFont,
  latFont,
  latWeight,
  latScale = 0.92,
  latColor,
  style,
}) => (
  <span dir="rtl" lang="ar" style={{fontFamily: `'${arFont}'`, unicodeBidi: 'isolate', ...style}}>
    {segment(text).map((s, i) =>
      s.ltr ? (
        <bdi key={i} dir="ltr" lang="en" style={{fontFamily: `'${latFont}', '${arFont}'`, fontWeight: latWeight, fontSize: `${latScale}em`, color: latColor, fontVariantNumeric: 'tabular-nums'}}>
          {s.t}
        </bdi>
      ) : (
        <React.Fragment key={i}>{s.t}</React.Fragment>
      ),
    )}
  </span>
);

export type KWordProps = {
  text: string;
  at: number; // frame the reveal starts (anchor onset − lead already applied)
  typo: Typo;
  fx: Fx;
  size: number;
  color?: string;
  preset?: 'arrive' | 'impact';
  lang?: 'ar' | 'en' | 'mono';
  out?: number; // frame the exit starts
  glowColor?: string;
  style?: React.CSSProperties;
  weight?: number;
};

/**
 * Kinetic word/phrase, animated as ONE element (never per letter). Arabic: clip-path wipe right→left,
 * scale 0.92→1, blur 6→0, opacity (04 §3.4). `impact` adds 1.08→1 outBack + 80 ms glow flash (04 §3.5).
 */
export const KWord: React.FC<KWordProps> = ({text, at, typo, fx, size, color = C.ink, preset = 'arrive', lang = 'ar', out, glowColor, style, weight}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fa = Math.max(1, msToFrames(PRESET_MS.arrive, fps));
  const fi = Math.max(1, msToFrames(PRESET_MS.impact, fps));
  const ff = Math.max(1, msToFrames(PRESET_MS.impactFlash, fps));
  const t = frame - at;
  const hidden = t < 0; // keep the layout slot so later words never shift earlier ones
  const p = hidden ? 0 : interpolate(t, [0, fa], [0, 1], {...clamp, easing: EASE.arrive});
  const rtl = lang === 'ar';
  const edge = (1 - p) * 100;
  const clip = rtl ? `polygon(${edge}% -60%, 160% -60%, 160% 160%, ${edge}% 160%)` : `polygon(-60% -60%, ${100 - edge}% -60%, ${100 - edge}% 160%, -60% 160%)`;
  let scale = interpolate(p, [0, 1], [0.92, 1]);
  let flash = 0;
  if (preset === 'impact') {
    scale = interpolate(t, [0, fi], [1.08, 1], {...clamp, easing: EASE.impact});
    flash = interpolate(t, [0, ff, ff * 3], [1, 1, 0], clamp);
  }
  const blur = interpolate(p, [0, 1], [6, 0]);
  let op = interpolate(p, [0, 0.4], [0, 1], clamp);
  let exitBlur = 0;
  if (out !== undefined && frame >= out) {
    const e = interpolate(frame - out, [0, msToFrames(300, fps)], [0, 1], clamp);
    op *= 1 - e;
    scale *= 1 - 0.04 * e;
    exitBlur = 8 * e;
  }
  const g = glowColor ?? (color === C.ink ? C.signal : color);
  const family = lang === 'ar' ? typo.ar : lang === 'en' ? typo.lat : typo.mono;
  const fw = weight ?? (lang === 'ar' ? typo.arWeight : lang === 'en' ? typo.latWeight : 600);
  const ca = fx.caPx && preset === 'impact' ? `, ${fx.caPx}px 0 0 rgba(255,107,99,0.55), ${-fx.caPx}px 0 0 rgba(55,216,255,0.55)` : '';
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      lang={rtl ? 'ar' : 'en'}
      style={{
        fontSize: size,
        lineHeight: 1.3,
        color,
        whiteSpace: 'nowrap',
        fontWeight: fw,
        clipPath: p < 1 && !hidden ? clip : undefined,
        transform: `scale(${scale})`,
        transformOrigin: rtl ? 'right center' : 'left center',
        filter: !hidden && blur + exitBlur > 0.05 ? `blur(${blur + exitBlur}px)` : undefined,
        opacity: op,
        visibility: hidden ? 'hidden' : undefined,
        textShadow: `${halo}, ${glow(g, fx, 0.6 + flash * 1.2)}${ca}`,
        fontVariantNumeric: 'tabular-nums',
        wordSpacing: rtl ? '0.08em' : undefined,
        ...style,
      }}
    >
      {lang === 'ar' ? <Mix text={text} arFont={family} latFont={typo.lat} latWeight={typo.latWeight} /> : <span style={{fontFamily: `'${family}'`}}>{text}</span>}
    </div>
  );
};

/** Tabular mono counter in an LTR isolate; rolls from→to between frames a..b. */
export const Counter: React.FC<{from: number; to: number; a: number; b: number; decimals?: number; typo: Typo; fx: Fx; size: number; color?: string; unit?: string; prefix?: string}> = ({
  from,
  to,
  a,
  b,
  decimals = 0,
  typo,
  fx,
  size,
  color = C.ink,
  unit,
  prefix,
}) => {
  const frame = useCurrentFrame();
  const v = b > a ? interpolate(frame, [a, b], [from, to], {...clamp, easing: EASE.arrive}) : frame >= a ? to : from;
  return (
    <bdi
      dir="ltr"
      style={{fontFamily: `'${typo.mono}'`, fontSize: size, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', textShadow: `${halo}, ${glow(color, fx, 0.7)}`, whiteSpace: 'nowrap'}}
    >
      {prefix}
      {v.toFixed(decimals)}
      {unit ? <span style={{fontSize: '0.42em', marginLeft: '0.25em', color: C.ink2, textShadow: 'none'}}>{unit}</span> : null}
    </bdi>
  );
};

/** Term chip: Latin mono term (+ optional Arabic gloss), sits next to its object (04 §3.2). */
export const TermChip: React.FC<{term: string; gloss?: string; typo: Typo; fx: Fx; color?: string; size?: number; style?: React.CSSProperties}> = ({
  term,
  gloss,
  typo,
  fx,
  color = C.signal,
  size = 32,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '8px 18px',
      borderRadius: 999,
      background: 'rgba(13,17,23,0.82)',
      border: `1.5px solid ${color}`,
      boxShadow: `0 0 ${fx.glowPx * 0.8}px ${color}55, inset 0 0 12px ${color}22`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <bdi dir="ltr" style={{fontFamily: `'${typo.mono}'`, fontWeight: 600, fontSize: size, color}}>
      {term}
    </bdi>
    {gloss ? (
      <span dir="rtl" lang="ar" style={{fontFamily: `'${typo.body}'`, fontWeight: 500, fontSize: size * 0.85, color: C.ink2}}>
        {gloss}
      </span>
    ) : null}
  </div>
);

/** Object label (28–40 px, Arabic body face). */
export const Label: React.FC<{text: string; typo: Typo; size?: number; color?: string; style?: React.CSSProperties; weight?: number}> = ({text, typo, size = 32, color = C.ink2, style, weight = 500}) => (
  <div dir="rtl" lang="ar" style={{position: 'absolute', fontSize: size, color, fontWeight: weight, whiteSpace: 'nowrap', textShadow: halo, ...style}}>
    <Mix text={text} arFont={typo.body} latFont={typo.mono} latWeight={500} latScale={0.9} />
  </div>
);

export function hex(a: number): string {
  return Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
}

/** Ambient camera drift (04 §2: never dead-static): 1.5–3 % push per 5 s. Returns a CSS transform. */
export const drift = (frame: number, fps: number, pct = 0.02, seed = 'cam') => {
  const t = frame / fps;
  const s = 1 + (pct * t) / 5;
  const dx = Math.sin(t * 0.4 + random(seed) * 6) * 6;
  const dy = Math.cos(t * 0.33 + random(seed + 'y') * 6) * 4;
  return `translate(${dx}px, ${dy}px) scale(${s})`;
};
