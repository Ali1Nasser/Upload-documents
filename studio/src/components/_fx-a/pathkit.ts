// SVG path sampling for PathDraw (group fx-a). The browser measures the path (getTotalLength / getPointAtLength on a detached
// <path>: geometry only, no layout, no clock); everything else is pure arithmetic on the samples.
import type {Pt} from './shapes';

export type PathInfo = {len: number; pts: Pt[]; box: {x0: number; y0: number; x1: number; y1: number}; chord: Pt; closed: boolean; area: number};
const cache = new Map<string, PathInfo | null>();

export const samplePath = (d: string): PathInfo | null => {
  if (cache.has(d)) return cache.get(d) ?? null;
  let info: PathInfo | null = null;
  if (typeof document !== 'undefined') {
    try {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      const len = p.getTotalLength();
      if (len > 0.001) {
        const n = Math.max(24, Math.min(480, Math.ceil(len / 4)));
        const pts: Pt[] = [];
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let i = 0; i <= n; i++) {
          const q = p.getPointAtLength((len * i) / n);
          pts.push([q.x, q.y]);
          x0 = Math.min(x0, q.x);
          y0 = Math.min(y0, q.y);
          x1 = Math.max(x1, q.x);
          y1 = Math.max(y1, q.y);
        }
        const a = pts[0];
        const b = pts[pts.length - 1];
        const chord: Pt = [b[0] - a[0], b[1] - a[1]];
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
          const u = pts[i];
          const v = pts[(i + 1) % pts.length];
          area += u[0] * v[1] - v[0] * u[1];
        }
        info = {len, pts, box: {x0, y0, x1, y1}, chord, closed: Math.hypot(chord[0], chord[1]) < 0.06 * len, area: area / 2};
      }
    } catch {
      info = null;
    }
  }
  cache.set(d, info);
  return info;
};

/** Drawing direction of a path: does the traversal run against the requested reading direction (then draw it reversed)? */
export const shouldReverse = (info: PathInfo, dir: 'rtl' | 'ltr' | 'up' | 'down'): boolean => {
  if (info.closed) {
    // screen coordinates (y down): positive shoelace area = clockwise on screen; rtl wants the top edge moving left (counter-clockwise)
    if (dir === 'rtl') return info.area > 0;
    if (dir === 'ltr') return info.area < 0;
    return false;
  }
  const v: Pt = dir === 'rtl' ? [-1, 0] : dir === 'ltr' ? [1, 0] : dir === 'up' ? [0, -1] : [0, 1];
  return info.chord[0] * v[0] + info.chord[1] * v[1] < 0;
};

/** Point and unit tangent at arc length `s` (0..len) of the path as traversed in the drawing direction. */
export const pointAt = (info: PathInfo, s: number, reversed: boolean): {p: Pt; tan: Pt} => {
  const n = info.pts.length - 1;
  const a = Math.max(0, Math.min(info.len, s));
  const x = reversed ? info.len - a : a;
  const f = (x / info.len) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  const A = info.pts[i];
  const B = info.pts[i + 1];
  const p: Pt = [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u];
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
  const sg = reversed ? -1 : 1;
  return {p, tan: [(sg * (B[0] - A[0])) / L, (sg * (B[1] - A[1])) / L]};
};
