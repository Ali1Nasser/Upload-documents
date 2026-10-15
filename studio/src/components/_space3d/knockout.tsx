// Text-safe knockout drawn INSIDE a space3d canvas (ADR-002 text-safe, same feather as fx/Atmos textSafeMask: solid core, soft edge,
// FX[tier].textSafePadPx). The kit's useTextSafe() applies a CSS mask to the whole overscanned canvas, which costs ~0.16 box s/frame
// on swiftshader (measured, VectorGalaxy standard 0.363 vs 0.199). A hole punched with destination-out costs ~nothing, so a
// component cuts its own copy boxes analytically and, for copy owned by OTHER layers, reads their settled boxes once (useForeignText).
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import type {Fx} from '../../tokens';
import type {Rect} from '../../type/safe';
import {whenSettled} from '../../type/settle';

const FEATHER = {core: 0.25, out: 2.5, scale: 0.5} as const; // the frozen look-dev r3 feather (fx/Atmos)
const HOLES = new Map<string, HTMLCanvasElement>();
const hole = (w: number, h: number, pad: number): HTMLCanvasElement | null => {
  const key = `${Math.round(w)}x${Math.round(h)}:${pad}`;
  const hit = HOLES.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return null;
  const E = pad * FEATHER.out;
  const core = pad * FEATHER.core;
  const mid = core + (E - core) / 2;
  const k = FEATHER.scale;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((w + 2 * E) * k);
  cv.height = Math.ceil((h + 2 * E) * k);
  const g = cv.getContext('2d');
  if (!g) return null;
  g.filter = `blur(${(((E - core) / 4) * k).toFixed(2)}px)`;
  g.fillStyle = '#000';
  g.beginPath();
  g.roundRect((E - mid) * k, (E - mid) * k, (w + 2 * mid) * k, (h + 2 * mid) * k, Math.max(4, mid) * k);
  g.fill();
  HOLES.set(key, cv);
  return cv;
};
/** Erase everything drawn so far from each rect (layer px) plus the tier padding. Call between the field and the marks that must stay. */
export const knockOut = (g: CanvasRenderingContext2D, rects: Rect[], fx: Fx): void => {
  if (!fx.textSafe || !rects.length) return;
  const E = fx.textSafePadPx * FEATHER.out;
  const was = g.globalCompositeOperation;
  g.globalCompositeOperation = 'destination-out';
  g.globalAlpha = 1;
  for (const r of rects) {
    const sp = hole(r.w, r.h, fx.textSafePadPx);
    if (sp) g.drawImage(sp, r.x - E, r.y - E, r.w + 2 * E, r.h + 2 * E);
  }
  g.globalCompositeOperation = was;
};

/**
 * Boxes (layer px, relative to the returned origin marker) of every visible [data-dc-text] element whose id does not start with
 * `ownPrefix`, measured once the frame has settled (fonts + auto-fits). The first render draws without them; the settled
 * measurement re-draws with them under a delayRender, so the rendered frame is always the settled one. Deterministic.
 */
export const useForeignText = (ownPrefix: string, fx: Fx, frame: number): [React.RefObject<HTMLDivElement | null>, Rect[]] => {
  const ref = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !fx.textSafe || typeof document === 'undefined') return;
    let done = false;
    const h = delayRender('space3d foreign text-safe');
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
        const out: Rect[] = [];
        document.querySelectorAll<HTMLElement>('[data-dc-text]').forEach((t) => {
          if (t.closest('[data-space-measure]')) return;
          if ((t.getAttribute('data-dc-text') ?? '').startsWith(ownPrefix)) return;
          const cs = getComputedStyle(t);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          const r = t.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return;
          out.push({x: Math.round((r.left - er.left) * kx), y: Math.round((r.top - er.top) * ky), w: Math.round(r.width * kx), h: Math.round(r.height * ky)});
        });
        setRects((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
      } finally {
        finish();
      }
    });
    return finish;
  }, [frame, fx.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, rects];
};
/** Zero-size origin marker for useForeignText: a 100 px wide probe at the layer origin (so scale and offset are measured). */
export const Origin: React.FC<{oref: React.RefObject<HTMLDivElement | null>}> = ({oref}) => (
  <div ref={oref} data-space-measure="1" aria-hidden style={{position: 'absolute', left: 0, top: 0, width: 100, height: 1, visibility: 'hidden', pointerEvents: 'none'}} />
);
