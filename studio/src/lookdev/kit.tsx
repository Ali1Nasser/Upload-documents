// Look-dev kit: backdrop, grain, vignette, glass, Arabic-first kinetic type. Seeded randomness only.
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, EASE, Fx, PRESET_MS, Typo, caShadow, glow, halo, msToFrames} from './theme';
import {LINE, SIZE} from '../tokens';
import {arabicFace, blockLineHeight, breakCaption, joinGapEm, labelRole, latinFamily, lineHeightFor, minus, segment} from '../type/arabic';

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
      <g stroke="url(#gridfade)" strokeWidth={1.6}>
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

// ---------- depth, light and text-safe masks (DepthLayers / FXTier contract, ADR-002 text-safe ON) ----------

/** Text box for the text-safe mask. `floor` = residual alpha of the masked layer inside the box (0 = fully removed);
 * use > 0 only for boxes that carry their own opaque surface (chips, cards, glass), so no hard hole shows around them. */
export type Rect = {x: number; y: number; w: number; h: number; floor?: number};

/** r3: feather ramp from the solid core (+0.25 pad) to fully open (+2.5 pad) (critic r2 #2: 1.75 pad read as a hard panel). */
export const MASK_FEATHER = {core: 0.25, out: 2.5, scale: 0.5} as const;
const holeCache = new Map<string, string>();

/**
 * One feathered hole sprite per (w, h, pad, floor), rasterised ONCE per browser tab on a half-res canvas with a true
 * Gaussian ramp, then reused on every frame (r3, critic r2 #1: the r2 10-ring SVG mask was re-rasterised on every frame
 * a card moved). Moving boxes only change the sprite's mask-position, which needs no re-rasterisation.
 */
const holeSprite = (w: number, h: number, pad: number, floor: number): string => {
  const key = `${Math.round(w)}x${Math.round(h)}:${pad}:${floor}`;
  const hit = holeCache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const E = pad * MASK_FEATHER.out;
  const core = pad * MASK_FEATHER.core;
  const ramp = E - core;
  const mid = core + ramp / 2;
  const k = MASK_FEATHER.scale;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((w + 2 * E) * k);
  cv.height = Math.ceil((h + 2 * E) * k);
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  ctx.filter = `blur(${((ramp / 4) * k).toFixed(2)}px)`; // +-2 sigma spans the ramp
  ctx.fillStyle = `rgba(0,0,0,${1 - floor})`;
  ctx.beginPath();
  ctx.roundRect((E - mid) * k, (E - mid) * k, (w + 2 * mid) * k, (h + 2 * mid) * k, Math.max(4, mid) * k);
  ctx.fill();
  const url = cv.toDataURL('image/png');
  holeCache.set(key, url);
  return url;
};

/**
 * CSS mask that removes a layer (particles, haze, plate, bloom) from every text box plus padding, with a Gaussian feather.
 * Layer stack: an opaque base minus the union of cached hole sprites (mask-composite: subtract over add). Overlapping holes
 * union (never lighten each other). `floor` = default residual alpha inside the boxes (a Rect's own floor wins).
 */
export const textSafeMask = (rects: Rect[], fx: Fx, floor = 0): React.CSSProperties => {
  if (!fx.textSafe || !rects.length) return {};
  const pad = fx.textSafePadPx;
  const E = pad * MASK_FEATHER.out;
  const holes = rects.map((r) => ({url: holeSprite(r.w, r.h, pad, r.floor ?? floor), r}));
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

/** Radial dark scrim behind a text block, so no light layer lowers its contrast. */
export const Scrim: React.FC<{r: Rect; strength?: number}> = ({r, strength = 0.78}) => (
  <div
    style={{
      position: 'absolute',
      left: r.x - r.w * 0.25,
      top: r.y - r.h * 0.6,
      width: r.w * 1.5,
      height: r.h * 2.2,
      background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.void}${hex(strength)} 0%, ${C.void}${hex(strength * 0.6)} 45%, transparent 75%)`,
      pointerEvents: 'none',
    }}
  />
);

/** Volumetric haze band between depth planes (04 §1.2): soft signal-tinted fog, densest at `y`. */
export const Haze: React.FC<{fx: Fx; y?: number; h?: number; tint?: string; k?: number; style?: React.CSSProperties}> = ({fx, y = 540, h = 520, tint = C.signal, k = 1, style}) => (
  <div
    style={{
      position: 'absolute',
      left: -100,
      right: -100,
      top: y - h / 2,
      height: h,
      background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${tint}${hex(fx.haze * 1.6 * k)} 0%, ${tint}${hex(fx.haze * 0.6 * k)} 50%, transparent 80%)`,
      mixBlendMode: 'screen',
      pointerEvents: 'none',
      ...style,
    }}
  />
);

/**
 * Parallax plane. depth 0 = subject (sharp), > 0 = farther (smaller, dimmer, blurred), < 0 = foreground.
 * `cam` is a 0..1 camera parameter; planes translate by (1 - depth) so the far ones move least.
 */
export const Plane: React.FC<{depth: number; fx: Fx; cam?: number; pan?: number; post?: string; children?: React.ReactNode; style?: React.CSSProperties}> = ({depth, fx, cam = 0, pan = 60, post = '', children, style}) => {
  const far = Math.max(0, depth);
  const s = 1 - far * 0.4;
  const blur = far * fx.dofBlurPx * 1.2;
  const m = 1 - depth * 0.7;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${-cam * pan * m}px, ${cam * pan * 0.25 * m}px) scale(${s}) ${post}`,
        transformOrigin: '50% 45%',
        filter: blur > 0.2 ? `blur(${blur.toFixed(1)}px) brightness(${1 - far * 0.15})` : undefined,
        opacity: 1 - far * 0.1,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---------- Arabic-first text (rules in src/type/arabic.ts) ----------

export {segment};

/** Mixed Arabic + Latin line: Arabic in the face chosen by size (ADR-003), Latin isolates in `latFont`. CA only on Latin runs. */
export const Mix: React.FC<{
  text: string;
  arFont?: string;
  latFont: string;
  latWeight?: number;
  latScale?: number;
  latColor?: string;
  size?: number;
  caLatin?: string;
  style?: React.CSSProperties;
}> = ({text, arFont, latFont, latWeight, latScale = 0.92, latColor, size, caLatin, style}) => {
  const face = size ? arabicFace(size) : null;
  const fam = arFont ?? face?.family ?? 'DC-PlexArabic';
  return (
    <span
      dir="rtl"
      lang="ar"
      style={{fontFamily: `'${fam}', '${latFont}'`, unicodeBidi: 'isolate', fontWeight: face?.weight, wordSpacing: face?.wordSpacing ?? '0.08em', fontSize: size, ...style}}
    >
      {segment(text).map((s, i, all) =>
        s.ltr ? (
          <bdi
            key={i}
            dir="ltr"
            lang="en"
            // r3 (arabic r2 J1): gap after a tatweel join, on the side facing the Arabic prefix
            style={{fontFamily: `'${latFont}', '${fam}'`, fontWeight: latWeight, fontSize: `${latScale}em`, color: latColor, fontVariantNumeric: 'tabular-nums', textShadow: caLatin, marginRight: joinGap(all[i - 1], s.t)}}
          >
            {s.t}
          </bdi>
        ) : (
          <React.Fragment key={i}>{s.t}</React.Fragment>
        ),
      )}
    </span>
  );
};

const joinGap = (prev: {t: string; ltr: boolean} | undefined, latin: string): string | undefined => {
  const g = prev && !prev.ltr ? joinGapEm(prev.t, latin) : 0;
  return g ? `${g}em` : undefined;
};

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
  outGhost?: number; // exit to this opacity instead of 0 (a receding ghost, critic r0 issue 6)
  glowColor?: string;
  style?: React.CSSProperties;
  weight?: number;
  flashFrames?: number; // r2: hard flash on the stressed word for N frames from `at` (glow + brightness; no CA on Arabic)
};

/**
 * Kinetic word/phrase, animated as ONE element (never per letter). Arabic: clip-path wipe right→left,
 * scale 0.92→1, blur 6→0, opacity (04 §3.4). `impact` adds 1.08→1 outBack + 80 ms glow flash (04 §3.5).
 * Faces, line-height and CA follow ADR-002/003: Alexandria only >= 56 px, line-height 1.6 with tashkeel,
 * CA on Latin / numeral runs only.
 */
export const KWord: React.FC<KWordProps> = ({text, at, typo, fx, size, color = C.ink, preset = 'arrive', lang = 'ar', out, outGhost = 0, glowColor, style, weight, flashFrames = 0}) => {
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
    op *= 1 - e * (1 - outGhost);
    scale *= 1 - 0.04 * e;
    exitBlur = (outGhost ? 2 : 8) * e;
  }
  const g = glowColor ?? (color === C.ink ? C.signal : color);
  const face = arabicFace(size);
  const family = lang === 'ar' ? face.family : lang === 'en' ? typo.lat : typo.mono;
  const fw = weight ?? (lang === 'ar' ? face.weight : lang === 'en' ? typo.latWeight : 600);
  const hard = flashFrames > 0 && t >= 0 && t < flashFrames ? 1 - t / flashFrames : 0;
  const base = `${halo}, ${glow(g, fx, 0.6 + flash * 1.2 + hard * 1.6)}`;
  const ca = preset === 'impact' ? caShadow(fx) : '';
  // Arabic: CA never on the Arabic run; only on its Latin isolates. Latin/mono impact words get CA on the whole word.
  const shadow = lang === 'ar' ? base : base + ca;
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      lang={rtl ? 'ar' : 'en'}
      style={{
        fontSize: size,
        lineHeight: rtl ? lineHeightFor(text) : LINE.base,
        color,
        whiteSpace: 'nowrap',
        fontWeight: fw,
        clipPath: p < 1 && !hidden ? clip : undefined,
        transform: `scale(${scale})`,
        transformOrigin: rtl ? 'right center' : 'left center',
        filter: !hidden && (blur + exitBlur > 0.05 || hard > 0) ? `${blur + exitBlur > 0.05 ? `blur(${blur + exitBlur}px)` : ''}${hard > 0 ? ` brightness(${1 + 0.7 * hard})` : ''}` : undefined,
        opacity: op,
        visibility: hidden ? 'hidden' : undefined,
        textShadow: shadow,
        fontVariantNumeric: 'tabular-nums',
        wordSpacing: rtl ? face.wordSpacing : undefined,
        ...style,
      }}
    >
      {lang === 'ar' ? (
        <Mix text={text} arFont={family} latFont={typo.lat} latWeight={typo.latWeight} caLatin={ca ? base + ca : undefined} style={{fontWeight: fw, wordSpacing: face.wordSpacing}} />
      ) : (
        <span style={{fontFamily: `'${family}'`}}>{text}</span>
      )}
    </div>
  );
};


/** Tabular mono counter in an LTR isolate; rolls from→to between frames a..b. `impact` = numeral impact (CA allowed, ADR-002). */
export const Counter: React.FC<{from: number; to: number; a: number; b: number; decimals?: number; typo: Typo; fx: Fx; size: number; color?: string; unit?: string; prefix?: string; impact?: boolean; font?: string}> = ({
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
  impact = false,
  font,
}) => {
  const frame = useCurrentFrame();
  const v = b > a ? interpolate(frame, [a, b], [from, to], {...clamp, easing: EASE.arrive}) : frame >= a ? to : from;
  return (
    <bdi
      dir="ltr"
      style={{fontFamily: `'${font ?? typo.mono}'`, fontSize: size, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', textShadow: `${halo}, ${glow(color, fx, 0.7)}${impact ? caShadow(fx) : ''}`, whiteSpace: 'nowrap'}}
    >
      {prefix ? minus(prefix) : null}
      {minus(v.toFixed(decimals))}
      {unit ? <span style={{fontSize: '0.42em', marginLeft: '0.25em', color: C.ink2, textShadow: 'none'}}>{unit}</span> : null}
    </bdi>
  );
};

/** Term chip: Latin mono term (+ optional Arabic gloss), sits next to its object (04 §3.2). */
export const TermChip: React.FC<{term: string; gloss?: string; typo: Typo; fx: Fx; color?: string; size?: number; glossSize?: number; style?: React.CSSProperties}> = ({
  term,
  gloss,
  typo,
  fx,
  color = C.signal,
  size = 32,
  glossSize,
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
      <span dir="rtl" lang="ar" style={{fontFamily: `'${typo.body}'`, fontWeight: 500, fontSize: Math.max(SIZE.labelMin, glossSize ?? size * 0.85), color: C.ink2, textShadow: halo}}>
        {gloss}
      </span>
    ) : null}
  </div>
);

/**
 * Object label, Arabic body face. ADR-003 floors: 28 px for object labels and anything tied to a spoken term or number
 * (`spoken`, default), 18 px for non-spoken secondary microcopy. Sizes below the floor are raised, never rendered small.
 */
export const Label: React.FC<{text: string; typo: Typo; size?: number; color?: string; style?: React.CSSProperties; weight?: number; spoken?: boolean}> = ({
  text,
  typo,
  size = 32,
  color = C.ink2,
  style,
  weight = 500,
  spoken = true,
}) => {
  const px = Math.max(spoken ? SIZE.labelMin : SIZE.secondaryMin, size);
  return (
    <div dir="rtl" lang="ar" style={{position: 'absolute', fontSize: px, color, fontWeight: weight, whiteSpace: 'nowrap', textShadow: halo, lineHeight: lineHeightFor(text), ...style}}>
      <Mix text={text} arFont={typo.body} latFont={latinFamily(labelRole(text))} latWeight={labelRole(text) === 'sentence' ? weight : 500} latScale={labelRole(text) === 'sentence' ? 0.92 : 0.9} style={{fontWeight: weight, wordSpacing: LINE.arWordSpacing}} />
    </div>
  );
};

/**
 * Caption block (arabic-typographer r1): broken by `breakCaption` (<= 32 visible chars per line, <= 2 lines, top-heavy),
 * one KWord per line, block line-height 1.6 when any line carries tashkeel or shadda. Throws on overflow (lint).
 */
export const ArCaption: React.FC<{text: string; at: number; typo: Typo; fx: Fx; size: number; color?: string; glowColor?: string; weight?: number; align?: 'right' | 'center'; stagger?: number}> = ({
  text,
  at,
  typo,
  fx,
  size,
  color = C.ink,
  glowColor = C.void,
  weight,
  align = 'right',
  stagger = 4,
}) => {
  const b = breakCaption(text);
  if (b.overflow) throw new Error(`caption overflows the 32 x 2 rule: "${text}"`);
  const lh = blockLineHeight(b.lines);
  return (
    <div dir="rtl" style={{display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-start' : 'center'}}>
      {b.lines.map((l, i) => (
        <KWord key={i} text={l} at={at + i * stagger} typo={typo} fx={fx} size={size} color={color} glowColor={glowColor} weight={weight} style={{lineHeight: lh}} />
      ))}
    </div>
  );
};

/** r2 impact beat: a 3-frame radial light burst behind a stressed word (light, not CA: legal on Arabic). */
export const Burst: React.FC<{at: number; x: number; y: number; r: number; color: string; frames?: number}> = ({at, x, y, r, color, frames = 3}) => {
  const t = useCurrentFrame() - at;
  if (t < 0 || t >= frames + 2) return null;
  const a = t < frames ? 1 - (t / frames) * 0.6 : 0.25 * (frames + 2 - t);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r * 0.6,
        width: r * 2,
        height: r * 1.2,
        borderRadius: '50%',
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.white}${hex(0.45 * a)} 0%, ${color}${hex(0.6 * a)} 18%, ${color}${hex(0.25 * a)} 45%, transparent 75%)`, // r2: hot core (r2 first pass read as a ring)
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

/** r2 standard-tier camera: eased slow push over the shot + lateral track; far planes get a fraction `m` of it. */
export const push = (frame: number, dur: number, pct = 0.04, m = 1, trackPx = 24, origin = '55% 50%'): React.CSSProperties => {
  const k = interpolate(frame, [0, Math.max(1, dur - 1)], [0, 1], {...clamp, easing: EASE.camera});
  return {transform: `translateX(${-k * trackPx * m}px) scale(${1 + pct * k * m})`, transformOrigin: origin};
};

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
