// Shared media helpers of P7 group "code-media" (LoopPlate, AIPlate, ManimInsert). Group-private.
//  - studio/public/media/{plates,manim} are symlinks to data/derived/{plates,manim}. The Remotion bundler forwards symlinks
//    into the bundle (it never copies the media), so plates and inserts stay out of git and out of /tmp.
//  - every asset has a JSON sidecar (<slug>.json: fps, frames, width, height, ...) written by its generator; the sidecar is
//    fetched once per page while the render is held with delayRender. A missing sidecar resolves to null: previews show a
//    marked placeholder, finals throw (a missing plate must never ship silently).
//  - video frames are chosen from ctx.frame only: <Freeze> pins the clip time, so no component reads useCurrentFrame().
import React from 'react';
import {continueRender, delayRender, Freeze, OffthreadVideo, staticFile} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';

export const MEDIA = {plates: 'media/plates', manim: 'media/manim'} as const;
export const mediaUrl = (kind: keyof typeof MEDIA, file: string): string => staticFile(`${MEDIA[kind]}/${file}`);

export type Sidecar = {slug: string; fps: number; frames: number; width: number; height: number; alpha?: boolean; seamless?: boolean; [k: string]: unknown};

const pending = new Map<string, Promise<unknown>>();
const values = new Map<string, unknown>();
/** Fetch a JSON sidecar once per page; the render waits for it (delayRender). undefined = loading, null = missing. */
export const useSidecar = <T,>(url: string): T | null | undefined => {
  const [, force] = React.useState(0);
  const [handle] = React.useState(() => (values.has(url) || typeof document === 'undefined' ? null : delayRender(`sidecar ${url}`)));
  React.useLayoutEffect(() => {
    if (values.has(url)) {
      if (handle !== null) continueRender(handle);
      return;
    }
    let p = pending.get(url);
    if (!p) {
      p = fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      pending.set(url, p);
    }
    let live = true;
    p.then((v) => {
      values.set(url, v);
      if (live) force((x) => x + 1);
      if (handle !== null) continueRender(handle);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return values.has(url) ? (values.get(url) as T | null) : undefined;
};

/** Missing asset: a marked placeholder in previews; a hard failure in finals. */
export const missingMedia = (what: string, preview: boolean): React.ReactElement | null => {
  console.error(`DC_MEDIA ${JSON.stringify({missing: what})}`);
  if (!preview) throw new Error(`missing media ${what} (data/derived; generate it before a final)`);
  return (
    <div style={{position: 'absolute', inset: 0, border: `2px dashed ${C.crit}`, display: 'flex', alignItems: 'flex-end', padding: 24}}>
      <bdi dir="ltr" data-dc-text="media:missing" style={{fontFamily: `'${FONT.mono.family}'`, fontSize: SIZE.labelMin, color: C.crit, background: `${C.void}${hex(0.8)}`}}>
        {what}
      </bdi>
    </div>
  );
};

/** One frame of a clip (index `idx` at the clip's own fps), pinned through <Freeze> at the mid-point of that frame. */
export const ClipFrame: React.FC<{src: string; idx: number; clipFps: number; fps: number; transparent?: boolean; style?: React.CSSProperties}> = ({src, idx, clipFps, fps, transparent, style}) => (
  <Freeze frame={((idx + 0.5) / clipFps) * fps}>
    <OffthreadVideo src={src} muted transparent={transparent} style={style} />
  </Freeze>
);

// ---------- 2.5D depth slices (AIPlate) ----------
/** One slice of a plate: RGBA at the working resolution (cumulative alpha from a depth threshold; hidden pixels inpainted). */
export type Slice = {data: ImageData; depth: number};
const sliceCache = new Map<string, Promise<Slice[] | null>>();
const sliceValue = new Map<string, Slice[] | null>();

const loadImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Build N slices from a plate and its depth map (0 = far, 255 = near), at w x h. Slice k keeps the pixels with depth >= k / N
 * (soft edge), so at zero offset the stack composites to the plate exactly (identical colours over each other); the pixels that a
 * nearer slice will cover are replaced by a blurred fill of the surrounding farther colours, so a parallax shift reveals plausible
 * background instead of a ghost of the near object. Pure per-pixel maths plus the canvas blur filter: deterministic on one box.
 */
const buildSlices = async (plateUrl: string, depthUrl: string, n: number, w: number, h: number): Promise<Slice[] | null> => {
  const [pi, di] = await Promise.all([loadImage(plateUrl), loadImage(depthUrl)]);
  if (!pi || !di) return null;
  const grab = (im: HTMLImageElement) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d', {willReadFrequently: true})!;
    x.drawImage(im, 0, 0, w, h);
    return x.getImageData(0, 0, w, h);
  };
  const P = grab(pi);
  const D = grab(di);
  const out: Slice[] = [];
  const blurR = Math.round(w * 0.035);
  for (let k = 0; k < n; k++) {
    const th = k / n;
    const next = (k + 1) / n;
    const f = 0.5 / n;
    const px = new ImageData(w, h);
    // colour source: the actual plate where nothing nearer will cover it, else the blurred fill of the farther pixels
    let fill: ImageData | null = null;
    if (k < n - 1) {
      const src = new ImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const dv = D.data[i * 4] / 255;
        const m = 1 - smooth(next - f, next + f, dv); // farther than the next slice = usable fill
        src.data[i * 4] = P.data[i * 4];
        src.data[i * 4 + 1] = P.data[i * 4 + 1];
        src.data[i * 4 + 2] = P.data[i * 4 + 2];
        src.data[i * 4 + 3] = Math.round(255 * m);
      }
      const a = document.createElement('canvas');
      a.width = w;
      a.height = h;
      a.getContext('2d')!.putImageData(src, 0, 0);
      const b = document.createElement('canvas');
      b.width = w;
      b.height = h;
      const bx = b.getContext('2d', {willReadFrequently: true})!;
      bx.filter = `blur(${blurR}px)`;
      bx.drawImage(a, 0, 0);
      fill = bx.getImageData(0, 0, w, h);
    }
    for (let i = 0; i < w * h; i++) {
      const dv = D.data[i * 4] / 255;
      const alpha = k === 0 ? 1 : smooth(th - f, th + f, dv);
      const cover = k < n - 1 ? smooth(next - f, next + f, dv) : 0; // 1 = a nearer slice covers this pixel
      const fa = fill ? fill.data[i * 4 + 3] / 255 : 0;
      const useFill = cover > 0 && fa > 0.02;
      for (let c = 0; c < 3; c++) {
        const actual = P.data[i * 4 + c];
        px.data[i * 4 + c] = useFill ? Math.round(actual * (1 - cover) + fill!.data[i * 4 + c] * cover) : actual;
      }
      px.data[i * 4 + 3] = Math.round(255 * alpha);
    }
    out.push({data: px, depth: (k + 0.5) / n});
  }
  return out;
};

/** Slices of a plate (cached once per page); the render is held with delayRender until they exist. undefined = loading, null = missing. */
export const useDepthSlices = (plateUrl: string, depthUrl: string, n: number, w: number, h: number): Slice[] | null | undefined => {
  const key = `${plateUrl}|${depthUrl}|${n}|${w}x${h}`;
  const [, force] = React.useState(0);
  const [handle] = React.useState(() => (sliceValue.has(key) || typeof document === 'undefined' ? null : delayRender(`slices ${key}`, {timeoutInMilliseconds: 60000})));
  React.useLayoutEffect(() => {
    if (sliceValue.has(key)) {
      if (handle !== null) continueRender(handle);
      return;
    }
    let p = sliceCache.get(key);
    if (!p) {
      p = buildSlices(plateUrl, depthUrl, n, w, h).catch(() => null);
      sliceCache.set(key, p);
    }
    let live = true;
    p.then((v) => {
      sliceValue.set(key, v);
      if (live) force((x) => x + 1);
      if (handle !== null) continueRender(handle);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return sliceValue.has(key) ? (sliceValue.get(key) as Slice[] | null) : undefined;
};
