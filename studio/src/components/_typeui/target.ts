// Target lookup for the pointing components of group "typeui" (CalloutArrow, Spotlight). A target is another layer of the SAME
// shot (`to: 'layer'`) or a named part of it (`to: 'layer.part'`). Parts are found, in order, as:
//   [data-dc-part="<part>"]                       (components tag their parts, e.g. EquationLine t0..t8, PredictionTimer opt0..opt3)
//   [data-dc-text="<layer>:<part>"]               (type-engine ids, e.g. TableGrid cells `receipts:r2c3`)
// A whole layer is the union of its leaf element boxes (so a slot-sized wrapper never counts, only what is drawn).
// The box is measured on the SETTLED frame (fonts loaded, every auto-fit shrunk; settle.ts) and mapped from screen space into the
// caller's own layer space (its layer root is W x H before the camera / preview transforms), so the pointer follows the target
// through the camera push, parallax and preview scale. Pure DOM reads: deterministic, no clock, no randomness.
import React, {useLayoutEffect, useRef, useState} from 'react';
// @ts-ignore -- react-dom ships no type declarations in this tree (no @types/react-dom); flushSync is the stable React 18 API
import {flushSync} from 'react-dom';
import {continueRender, delayRender} from 'remotion';
import {H, W} from '../../tokens';
import {whenSettled} from '../../type/settle';
import type {Rect} from '../../type/safe';

export type Target = {layer: string; part?: string};
export const parseTarget = (to: string): Target => {
  const i = to.indexOf('.');
  return i < 0 ? {layer: to} : {layer: to.slice(0, i), part: to.slice(i + 1)};
};

const esc = (s: string) => s.replace(/["\\]/g, '\\$&');
const FULL_FRAME = 0.9; // a leaf covering >= 90 % of the layer is a backdrop, not the target

/** Union of the leaf boxes under `el` (screen px), ignoring empty and frame-sized leaves. */
const leafUnion = (el: Element, frameArea: number): DOMRect | null => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const all = [el, ...Array.from(el.querySelectorAll('*'))];
  for (const n of all) {
    if (n.childElementCount > 0) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5 || r.width * r.height >= FULL_FRAME * frameArea) continue;
    x0 = Math.min(x0, r.left);
    y0 = Math.min(y0, r.top);
    x1 = Math.max(x1, r.right);
    y1 = Math.max(y1, r.bottom);
  }
  return x1 > x0 ? new DOMRect(x0, y0, x1 - x0, y1 - y0) : null;
};

export type Measured = {rect: Rect; found: 'part' | 'layer'};
/** Measure `to` from the element `self` (inside the caller's layer). null = no such layer / part in this shot. */
export const measureTarget = (self: HTMLElement, to: string): Measured | null => {
  const mine = self.closest('[data-dc-layer]') as HTMLElement | null;
  const shot = mine?.parentElement;
  if (!mine || !shot) return null;
  const t = parseTarget(to);
  const layer = Array.from(shot.children).find((c) => (c as HTMLElement).dataset?.dcLayer === t.layer) as HTMLElement | undefined;
  if (!layer || layer === mine) return null;
  const me = mine.getBoundingClientRect();
  if (me.width < 1 || me.height < 1) return null;
  let box: DOMRect | null = null;
  let found: Measured['found'] = 'layer';
  if (t.part) {
    const p = layer.querySelector(`[data-dc-part="${esc(t.part)}"]`) ?? layer.querySelector(`[data-dc-text="${esc(`${t.layer}:${t.part}`)}"]`);
    if (!p) return null;
    box = p.getBoundingClientRect();
    found = 'part';
  } else box = leafUnion(layer, me.width * me.height);
  if (!box || box.width < 0.5 || box.height < 0.5) return null;
  const kx = W / me.width;
  const ky = H / me.height;
  return {rect: {x: (box.left - me.left) * kx, y: (box.top - me.top) * ky, w: box.width * kx, h: box.height * ky}, found};
};

const same = (a: Measured | null, b: Measured | null) =>
  a === b || (!!a && !!b && a.found === b.found && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a.rect[k as keyof Rect] - b.rect[k as keyof Rect]) < 0.05));

/**
 * The target's box in this layer's space, re-measured on every frame while `active`. The frame is held (delayRender) until the
 * measurement has been committed (flushSync), and the measurement runs after the frame has settled, so the post-layout QA of
 * SpecPlayer (which waits on the same settle signal, registered after this child effect) reads the final position.
 * `extra` measures the caller's own elements in the same pass (e.g. the label box), in layer px.
 */
export const useTargetRect = <E extends Record<string, number>>(
  to: string,
  frame: number,
  active: boolean,
  extra?: (self: HTMLElement) => E,
): {ref: React.RefObject<HTMLDivElement | null>; m: Measured | null; e: E | null} => {
  const ref = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState<{m: Measured | null; e: E | null}>({m: null, e: null});
  const cur = useRef(st);
  cur.current = st;
  useLayoutEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const h = delayRender(`dc target ${to} @${frame}`);
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(h);
      }
    };
    whenSettled().then(() => {
      if (done) return;
      try {
        const el = ref.current;
        const m = el ? measureTarget(el, to) : null;
        const e = el && extra ? extra(el) : null;
        const sameE = JSON.stringify(e) === JSON.stringify(cur.current.e);
        if (!same(m, cur.current.m) || !sameE) flushSync(() => setSt({m, e}));
        else if (m === null && el) console.warn(`DC_TARGET '${to}' not found in this shot`);
      } finally {
        finish();
      }
    });
    return finish;
  }, [to, frame, active]);
  return {ref, m: active ? st.m : null, e: active ? st.e : null};
};
