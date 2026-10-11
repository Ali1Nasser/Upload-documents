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
