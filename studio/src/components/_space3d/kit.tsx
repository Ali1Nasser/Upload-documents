// Shared kit of the "Space & 3D" family (P7 group space3d). Lives in the group-owned folder; imported by the 11 space3d
// components only. Pure helpers over the FROZEN tokens: no colour, size or FX number is defined here.
//  - Cam3 / project: a small perspective camera (yaw, pitch, distance, fov) for 2.5D sets drawn on a 2D canvas. Every tier
//    draws the same seeded geometry; hero adds additive bloom sprites. No real-time WebGL is needed for these sets, so the
//    ADR-002 RT5 hero share is not consumed and the standard tier is always the full fallback.
//  - sprite(): cached radial point sprites (glow / core / bokeh / dot), so particles never use a per-frame `filter: blur`.
//  - SpaceCanvas: a canvas (default the overscanned full frame) drawn in a layout effect; deterministic (seeded geometry,
//    ctx.frame only). Lite draws at half resolution (previews and snapshots are 960x540).
//  - useTextSafe(): ADR-002 text-safe mask for particle / bloom canvases. After the frame has SETTLED (fonts + every auto-fit,
//    settle.ts), every visible [data-dc-text] box on screen (any layer) is cut out of the canvas with the frozen look-dev
//    feather (fx/Atmos textSafeMask) plus FX[tier].textSafePadPx. Needed because LayerCtx carries no text rects of other
//    layers; SpecPlayer masks only the backdrop.
//  - useMeasure(): natural widths of copy at a base size, measured once after the fonts are ready (fitBegin / fitEnd, so the
//    post-layout QA reads the settled layout). Components then lay copy out analytically and auto-fit with a floor
//    (fitTo); an overflow is reported (useOverflow) and FAILS snapshot tests.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, interpolate, random} from 'remotion';
import {C, FONT, H, LABEL_RISE_PX, SIZE, W, type ColorToken, type Fx} from '../../tokens';
import {halo, hex} from '../../fx/look';
import {textSafeMask} from '../../fx/Atmos';
import {fontsReady} from '../../type/fonts';
import {reportQa} from '../../type/qa';
import {MixedText} from '../../type/Text';
import {lineHeightFor} from '../../type/arabic';
import {ease, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {fitBegin, fitEnd, whenSettled} from '../../type/settle';
import type {Rect} from '../../type/safe';
import type {LayerCtx} from '../../spec/types';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const OVERSCAN = 0.06; // full-frame sets bleed past the frame so a push, truck or parallax never shows an edge
export const FULL: Rect = {x: -W * OVERSCAN, y: -H * OVERSCAN, w: W * (1 + 2 * OVERSCAN), h: H * (1 + 2 * OVERSCAN)};

/** Seeded standard normal (Box-Muller over remotion random). */
export const gauss = (s: string): number => {
  const u = Math.max(1e-6, random(`${s}u`));
  const v = random(`${s}v`);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
/** Positive modulo (seamless wrap of drifting particles). */
export const wrap = (v: number, m: number): number => ((v % m) + m) % m;
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

// ---------- motion helpers (RV1: anchored component motions use revealProgress) ----------
/** Enter progress of a layer: 1 when unanchored at the shot start (backgrounds), else the RV1 preset curve from ctx.at. */
export const enterK = (ctx: LayerCtx, preset: 'arrive' | 'label' | 'morph' = 'arrive', delay = 0): number =>
  ctx.at <= 0 && delay === 0 ? 1 : revealProgress(ctx.frame - ctx.at - delay, presetFrames(preset, ctx.fps, preset === 'morph'), preset === 'morph' ? ease.camera : ease.arrive);
/** Exit multiplier (1 -> 0 over the exit preset after `until`). */
export const exitK = (ctx: LayerCtx): number =>
  ctx.until === undefined ? 1 : 1 - interpolate(ctx.frame - ctx.until, [0, presetFrames('exit', ctx.fps)], [0, 1], {...clamp, easing: ease.camera});
/** Film frames (24 fps) -> composition frames, so staggers keep their ms at 12 / 15 / 24 fps. */
export const ff = (n24: number, fps: number): number => Math.max(1, Math.round((n24 * fps) / 24));
/** Seconds of shot time (ambient drift only: never used for anchored timing). */
export const secs = (ctx: LayerCtx): number => ctx.frame / ctx.fps;
/** Actions of one name in anchor order. */
export const actionsOf = (ctx: LayerCtx, name: string) => ctx.actions.filter((a) => a.name === name).sort((a, b) => a.at - b.at || a.li - b.li);
/** RV1 progress of a component-owned move starting on frame `t0` over `n24` film frames. */
export const moveK = (ctx: LayerCtx, t0: number, n24: number, easing: (x: number) => number = ease.camera): number => revealProgress(ctx.frame - t0, ff(n24, ctx.fps), easing);
/** Label-preset style (fade + rise) `t` frames after its anchor, with the layer exit. */
export const labelStyle = (ctx: LayerCtx, t0: number, dir: 'rtl' | 'ltr' = 'rtl'): React.CSSProperties =>
  revealStyle(ctx.frame - t0, ctx.fps, 'label', dir, ctx.until !== undefined ? ctx.frame - ctx.until : undefined).style;

// ---------- 3D ----------
export type V3 = [number, number, number];
export type Cam3 = {yaw: number; pitch: number; dist: number; fovDeg: number; cx: number; cy: number; viewH: number; target: V3};
export type P2 = {x: number; y: number; s: number; d: number; ok: boolean};
/** Perspective projection: the camera orbits `target` (yaw about Y, then pitch about X) at `dist`; s = px per world unit. */
export const project = (c: Cam3, p: V3): P2 => {
  const x = p[0] - c.target[0];
  const y = p[1] - c.target[1];
  const z = p[2] - c.target[2];
  const cy = Math.cos(c.yaw);
  const sy = Math.sin(c.yaw);
  const x1 = cy * x + sy * z;
  const z1 = -sy * x + cy * z;
  const cp = Math.cos(c.pitch);
  const sp = Math.sin(c.pitch);
  const y2 = cp * y - sp * z1;
  const z2 = sp * y + cp * z1;
  const d = c.dist - z2;
  const focal = c.viewH / 2 / Math.tan(((c.fovDeg / 2) * Math.PI) / 180);
  const s = focal / Math.max(0.05, d);
  return {x: c.cx + x1 * s, y: c.cy - y2 * s, s, d, ok: d > 0.1};
};

// ---------- sprites ----------
const SPRITES = new Map<string, HTMLCanvasElement>();
export type SpriteKind = 'glow' | 'core' | 'bokeh' | 'dot';
/** Cached 64 px radial sprite in a token colour. glow: soft halo; core: hot centre + halo; bokeh: flat soft disc; dot: crisp. */
export const sprite = (color: string, kind: SpriteKind): HTMLCanvasElement | null => {
  const key = `${color}:${kind}`;
  const hit = SPRITES.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return null;
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const g = cv.getContext('2d');
  if (!g) return null;
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  const stops: [number, string, number][] =
    kind === 'core'
      ? [[0, C.white, 1], [0.12, color, 1], [0.32, color, 0.35], [1, color, 0]]
      : kind === 'glow'
        ? [[0, color, 0.55], [0.4, color, 0.16], [1, color, 0]]
        : kind === 'bokeh'
          ? [[0, color, 0.5], [0.62, color, 0.38], [0.8, color, 0.12], [1, color, 0]]
          : [[0, color, 1], [0.45, color, 0.9], [0.7, color, 0.2], [1, color, 0]];
  for (const [o, c, a] of stops) r.addColorStop(o, `${c}${hex(a)}`);
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
  SPRITES.set(key, cv);
  return cv;
};
/** Draw a sprite centred at (x, y) with radius r and alpha a (caller sets the composite mode). */
export const blit = (g: CanvasRenderingContext2D, sp: HTMLCanvasElement | null, x: number, y: number, r: number, a: number): void => {
  if (!sp || a <= 0.003 || r <= 0.05) return;
  g.globalAlpha = Math.min(1, a);
  g.drawImage(sp, x - r, y - r, 2 * r, 2 * r);
};
/** Token colour + alpha as a canvas / CSS colour. */
export const rgba = (tok: ColorToken | string, a: number): string => `${tok in C ? C[tok as ColorToken] : tok}${hex(a)}`;
/** Mix two token colours (#rrggbb) at k (0 = a, 1 = b): used for colour-by-value ramps between tokens. */
export const mix = (a: string, b: string, k: number): string => {
  const p = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  const q = Math.max(0, Math.min(1, k));
  return `#${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * q).toString(16).padStart(2, '0')).join('')}`;
};
/** Bloom strength per tier: lite = CSS-free flat marks, standard = soft halos, hero = additive bloom sprites. */
export const bloomOf = (fx: Fx): number => (fx.id === 'hero' ? 1 : fx.id === 'standard' ? 0.6 : 0);

// ---------- canvas ----------
/** Canvas resolution factor: lite (previews, snapshots at 960x540) draws at half resolution. */
export const resOf = (fx: Fx): number => (fx.id === 'lite' ? 0.5 : 1);
type DrawFn = (g: CanvasRenderingContext2D, k: number) => void;
/**
 * A canvas covering `rect` (layer coordinates, default the overscanned full frame). `draw` receives a context already scaled so
 * that 1 unit = 1 px of the 1920x1080 layer, origin at the layer origin. Redrawn whenever `deps` change (pass ctx.frame).
 * `textSafe` cuts every visible copy box on screen (+ tier padding) out of the canvas once the frame has settled.
 */
export const SpaceCanvas: React.FC<{fx: Fx; frame: number; draw: DrawFn; deps: unknown[]; rect?: Rect; textSafe?: boolean; style?: React.CSSProperties}> = ({fx, frame, draw, deps, rect = FULL, textSafe = false, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const k = resOf(fx);
  useLayoutEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(k, 0, 0, k, -rect.x * k, -rect.y * k);
    draw(g, k);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useTextSafe(ref, fx, frame, textSafe);
  return (
    <canvas
      ref={ref}
      width={Math.round(rect.w * k)}
      height={Math.round(rect.h * k)}
      style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, pointerEvents: 'none', ...style}}
    />
  );
};

const MASK_KEYS = ['maskImage', 'maskComposite', 'maskPosition', 'maskSize', 'maskRepeat', 'maskMode'] as const;
/** ADR-002 text-safe for a particle / bloom element: holes at every visible [data-dc-text] box, measured on the settled frame. */
export const useTextSafe = (ref: React.RefObject<HTMLElement | null>, fx: Fx, frame: number, on = true): void => {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el || !fx.textSafe || typeof document === 'undefined') return;
    let done = false;
    const h = delayRender('space3d text-safe mask');
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(h);
      }
    };
    whenSettled().then(() => {
      if (done) return;
      try {
        const er = el.getBoundingClientRect();
        const kx = el.offsetWidth / Math.max(1e-6, er.width);
        const ky = el.offsetHeight / Math.max(1e-6, er.height);
        const rects: Rect[] = [];
        document.querySelectorAll<HTMLElement>('[data-dc-text]').forEach((t) => {
          if (t.closest('[data-space-measure]')) return;
          const cs = getComputedStyle(t);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          const r = t.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return;
          rects.push({x: (r.left - er.left) * kx, y: (r.top - er.top) * ky, w: r.width * kx, h: r.height * ky});
        });
        const st = el.style as unknown as Record<string, string>;
        MASK_KEYS.forEach((m) => (st[m] = ''));
        const css = textSafeMask(rects, fx) as Record<string, string>;
        for (const [m, v] of Object.entries(css)) st[m] = String(v);
      } finally {
        finish();
      }
    });
    return finish;
  }, [frame, on, fx.id]); // eslint-disable-line react-hooks/exhaustive-deps
};

// ---------- copy measurement + analytic auto-fit ----------
export type Measured = {w: number[]; h: number[]};
/**
 * Natural sizes of the `[data-m]` children of the returned container (render it through <Measure>), measured once after the
 * fonts are ready. Holds a delayRender + fitBegin until measured, so SpecPlayer's post-layout checks never read an unsettled
 * layout (review M8).
 */
export const useMeasure = (id: string, key: string): [React.RefObject<HTMLDivElement | null>, Measured | null] => {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Measured | null>(null);
  const [handle] = useState(() => {
    if (typeof document === 'undefined') return null;
    fitBegin();
    return delayRender(`space3d measure ${id}`);
  });
  const released = useRef(false);
  const release = () => {
    if (handle !== null && !released.current) {
      released.current = true;
      continueRender(handle);
      fitEnd();
    }
  };
  useLayoutEffect(() => {
    let live = true;
    fontsReady()
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        const el = ref.current;
        if (!el) return release();
        const sc = el.getBoundingClientRect().width / Math.max(1, el.offsetWidth); // undo camera / preview transforms
        const kids = Array.from(el.querySelectorAll<HTMLElement>('[data-m]'));
        setM({w: kids.map((x) => x.getBoundingClientRect().width / Math.max(1e-6, sc)), h: kids.map((x) => x.getBoundingClientRect().height / Math.max(1e-6, sc))});
      });
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (m) release();
  }, [m]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => release(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, m];
};
/** Hidden measuring container (never visible, never masked, skipped by the title-safe check). */
export const Measure: React.FC<{mref: React.RefObject<HTMLDivElement | null>; size: number; children: React.ReactNode}> = ({mref, size, children}) => (
  <div ref={mref} data-space-measure="1" aria-hidden style={{position: 'absolute', left: 0, top: 0, visibility: 'hidden', pointerEvents: 'none', fontSize: size, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
    {children}
  </div>
);
/** One measured label at the base size (a child of <Measure>). */
export const MLabel: React.FC<{text: string; size: number; weight?: number; mono?: boolean}> = ({text, size, weight, mono}) => (
  <span data-m="1" style={{display: 'inline-block', width: 'max-content', lineHeight: lineHeightFor(text), fontFamily: mono ? `'${FONT.mono.family}'` : undefined}}>
    {mono ? <bdi dir="ltr">{text}</bdi> : <MixedText text={text} size={size} weight={weight ?? FONT.label.weight} />}
  </span>
);
/** Largest even size <= base whose natural width (measured at base) fits `avail`; never below `min` (then overflow). */
export const fitTo = (base: number, natural: number, avail: number, min: number): {size: number; overflow: boolean} => {
  if (natural <= avail || natural <= 0) return {size: base, overflow: false};
  const s = Math.floor((base * avail) / natural / 2) * 2;
  return s < min ? {size: min, overflow: true} : {size: Math.min(base, s), overflow: false};
};
/** Report an auto-fit overflow (DC_QA overflow: fails snapshot tests and spec renders). */
export const useOverflow = (id: string, overflow: boolean, detail: unknown): void => {
  useLayoutEffect(() => {
    if (overflow) reportQa('overflow', id, detail);
  });
};
/** Label floor for copy tied to speech (SIZE.labelMin, 28 px). */
export const LABEL_MIN = SIZE.labelMin;

// ---------- plates and labels ----------
/** Chip plate behind a label (04 section 3.4: every string sits on a plate or a halo). */
export const chipStyle = (accent?: string, a = 1): React.CSSProperties => ({
  background: `${C.panel}${hex(0.86 * a)}`,
  border: `1px solid ${accent ? `${accent}${hex(0.7 * a)}` : `${C.grid}${hex(a)}`}`,
  borderRadius: 14,
  boxShadow: `inset 0 1px 0 ${C.ink}${hex(0.08 * a)}${accent ? `, 0 0 18px ${accent}${hex(0.22 * a)}` : ''}`,
});
export const CHIP_PAD = {x: 16, y: 6} as const; // px around a chip label (layout constant)
/** Height of a one-line chip at `size` px. */
export const chipH = (text: string, size: number): number => Math.ceil(size * lineHeightFor(text)) + 2 * CHIP_PAD.y + 2;

/**
 * A positioned label chip: whole-string MixedText (never split), label-preset reveal from `t0` (RV1), the layer exit, an outline
 * in `crit` when its fit overflowed. (x, y) = top-left in layer px; `w` = chip width (measured natural width + padding).
 */
export const Chip: React.FC<{
  ctx: LayerCtx;
  id: string;
  text: string;
  size: number;
  x: number;
  y: number;
  t0: number;
  accent?: string;
  color?: string;
  overflow?: boolean;
  mono?: boolean;
  alpha?: number;
  plate?: boolean;
}> = ({ctx, id, text, size, x, y, t0, accent, color = C.ink, overflow, mono, alpha = 1, plate = true}) => {
  const st = labelStyle(ctx, t0);
  const op = (typeof st.opacity === 'number' ? st.opacity : 1) * alpha;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        padding: `${CHIP_PAD.y}px ${CHIP_PAD.x}px`,
        whiteSpace: 'nowrap',
        fontSize: size,
        lineHeight: lineHeightFor(text),
        color,
        textShadow: halo,
        ...(plate ? chipStyle(accent) : {}),
        ...st,
        opacity: op,
        outline: overflow ? `2px dashed ${C.crit}` : undefined,
      }}
    >
      {mono ? (
        <bdi dir="ltr" data-dc-text={id} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontFeatureSettings: '"tnum" 1'}}>
          {text}
        </bdi>
      ) : (
        <MixedText id={id} text={text} size={size} weight={FONT.label.weight} />
      )}
    </div>
  );
};
export {LABEL_RISE_PX};

// ---------- layout ----------
/** Top-left that keeps a w x h box inside `box` (the camera-envelope slot inside title-safe), nearest to (x, y). */
export const clampInto = (box: Rect, x: number, y: number, w: number, h: number): {x: number; y: number} => ({
  x: Math.max(box.x, Math.min(box.x + box.w - w, x)),
  y: Math.max(box.y, Math.min(box.y + box.h - h, y)),
});
/** Full width of a chip whose label measured `natural` px at `base` and is drawn at `size`. */
export const chipW = (natural: number, base: number, size: number): number => Math.ceil((natural * size) / base) + 2 * CHIP_PAD.x + 2;
/** A shown number: Western digits, fixed decimals, U+2212 minus, thousands grouped only from 10 000 (data contract style). */
export const fmtNum = (v: number, decimals = 0): string => {
  const s = Math.abs(v).toFixed(decimals);
  const [i, f] = s.split('.');
  const g = Math.abs(v) >= 10000 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') : i;
  return `${v < 0 ? '\u2212' : ''}${g}${f ? `.${f}` : ''}`;
};
/** Does the copy read right-to-left (any Arabic letter)? */
export const anyArabic = (xs: readonly string[]): boolean => xs.some((x) => /[\u0600-\u06FF]/.test(x));

/** Largest even size in [min, base] for which `ok(size)` holds; below the floor it returns min with overflow (reported, fails snapshots). */
export const fitSearch = (base: number, min: number, ok: (size: number) => boolean): {size: number; overflow: boolean} => {
  for (let s = base; s >= min; s -= 2) if (ok(s)) return {size: s, overflow: false};
  return {size: min, overflow: !ok(min)};
};
/** Rescale a width measured at `base` to `size`. */
export const scaleW = (natural: number, base: number, size: number): number => (natural * size) / base;
