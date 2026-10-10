// Safe areas, slots and the label-row rule (P7). Layout constants only; colours, sizes and FX numbers stay in tokens.ts.
import {H, W} from '../tokens';

/** SMPTE ST 2046-1 at 1920x1080: action-safe 93 % (3.5 % per side), title-safe 90 % (5 % per side). All copy is title-safe. */
export const SAFE = {action: 0.035, title: 0.05} as const;
export type Rect = {x: number; y: number; w: number; h: number};

export const safeRect = (kind: keyof typeof SAFE = 'title', w = W, h = H): Rect => ({
  x: Math.round(w * SAFE[kind]),
  y: Math.round(h * SAFE[kind]),
  w: Math.round(w * (1 - 2 * SAFE[kind])),
  h: Math.round(h * (1 - 2 * SAFE[kind])),
});

export type SlotId = 'full' | 'center' | 'start' | 'end' | 'top' | 'bottom' | 'upper-third' | 'lower-third';
/** Slot rectangles inside the title-safe area. RTL frame: `start` = right half, `end` = left half. */
export const slotRect = (slot: SlotId = 'full'): Rect => {
  const s = safeRect('title');
  const r = (fx: number, fy: number, fw: number, fh: number): Rect => ({x: Math.round(s.x + s.w * fx), y: Math.round(s.y + s.h * fy), w: Math.round(s.w * fw), h: Math.round(s.h * fh)});
  switch (slot) {
    case 'center':
      return r(0.15, 0.2, 0.7, 0.6);
    case 'start':
      return r(0.52, 0.08, 0.48, 0.84);
    case 'end':
      return r(0, 0.08, 0.48, 0.84);
    case 'top':
      return r(0, 0, 1, 0.42);
    case 'bottom':
      return r(0, 0.58, 1, 0.42);
    case 'upper-third':
      return r(0.05, 0.02, 0.9, 0.3);
    case 'lower-third':
      return r(0.05, 0.68, 0.9, 0.3);
    default:
      return s;
  }
};

// ---------- AT-4: one label baseline + >= 40 px gap ----------
export const LABEL_GAP_MIN_PX = 40;
export type LabelBox = {x: number; w: number; baseline: number; text?: string};
/** Violations of AT-4 for one row of labels: every baseline on one y (+-0.5 px) and >= 40 px between neighbouring boxes. */
export const checkLabelRow = (boxes: LabelBox[], gapMin = LABEL_GAP_MIN_PX): string[] => {
  const v: string[] = [];
  if (boxes.length < 2) return v;
  const y0 = boxes[0].baseline;
  for (const b of boxes) if (Math.abs(b.baseline - y0) > 0.5) v.push(`baseline ${b.text ?? ''} at ${b.baseline.toFixed(1)} != ${y0.toFixed(1)}`);
  const s = [...boxes].sort((a, b) => a.x - b.x);
  for (let i = 1; i < s.length; i++) {
    const gap = s[i].x - (s[i - 1].x + s[i - 1].w);
    if (gap < gapMin - 0.5) v.push(`gap ${gap.toFixed(1)} px < ${gapMin} between '${s[i - 1].text ?? i - 1}' and '${s[i].text ?? i}'`);
  }
  return v;
};
/** RTL label row inside [x0, x1]: first label at the right edge, `gap` px apart. overflow = the row does not fit. */
export const layoutLabelRow = (widths: number[], x0: number, x1: number, gap = LABEL_GAP_MIN_PX): {xs: number[]; overflow: boolean} => {
  const xs: number[] = [];
  let right = x1;
  for (const w of widths) {
    xs.push(right - w);
    right -= w + gap;
  }
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1);
  return {xs, overflow: total > x1 - x0};
};
