// Target driver for the State & FX components of group "fx-a" (Pulse, Shake, Spin, FailureGlitch, FixSettle, ShatterToBlocks).
// A target is another layer of the SAME shot (`to: '<layer id>'`, the `id` prop of that layer). The engine renders every layer in
// its own root (`[data-dc-layer]`, transform = camera plane); an FX layer acts on its target through the CSS individual transform
// properties `translate` / `rotate` / `scale` (and `visibility` for a shatter) of that root. They compose with the camera
// `transform` the engine owns (applied after it, in screen space) and React never writes them, so the camera, parallax and
// transitions keep working. Several FX layers may drive one target: each writes its own contribution (keyed by its layer id) and
// the combined drive is re-applied by whichever driver runs last in the frame. Every mounted driver re-computes its contribution
// on EVERY frame (identity outside its window) and removes it on unmount, so the result is a pure function of the frame
// (deterministic, frame order independent).
// Measurement runs on the SETTLED frame (fonts loaded, every auto-fit shrunk; settle.ts), with the driven properties cleared, so
// it reads the target's own layout; the frame is held (delayRender) until the drive is applied, and SpecPlayer's post-layout QA
// (title-safe etc.) runs after it on the same settle signal, i.e. it checks the DRIVEN position.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {continueRender, delayRender} from 'remotion';
import {H, W} from '../../tokens';
import {safeRect, type Rect} from '../../type/safe';
import {whenSettled} from '../../type/settle';

/** One driver's contribution, about the target's own centre: translate (px), scale (x, y), rotate about z (deg), hide. */
export type Drive = {tx: number; ty: number; sx: number; sy: number; rz: number; hide?: boolean};
export const IDENTITY: Drive = {tx: 0, ty: 0, sx: 1, sy: 1, rz: 0};

type Host = HTMLElement & {__dcFxa?: Map<string, Drive>};
/** Room (stage px, >= 0) between the target's visible copy and title-safe, per side; Infinity = no copy. */
export type Room = {l: number; r: number; t: number; b: number};
export type Measured = {
  rect: Rect; // target box (union of its drawn leaves) in the CALLER's layer space (1920x1080 layer px)
  room: Room;
};

const FULL_FRAME = 0.9; // a leaf covering >= 90 % of the frame is a backdrop, not the target

const layerOf = (self: HTMLElement): {mine: HTMLElement; shot: HTMLElement} | null => {
  const mine = self.closest('[data-dc-layer]') as HTMLElement | null;
  const shot = mine?.parentElement;
  return mine && shot ? {mine, shot} : null;
};
export const targetLayers = (self: HTMLElement, to: string | '*'): HTMLElement[] => {
  const l = layerOf(self);
  if (!l) return [];
  return (Array.from(l.shot.children) as HTMLElement[]).filter((c) => c !== l.mine && c.dataset?.dcLayer !== undefined && (to === '*' || c.dataset.dcLayer === to));
};

const clear = (el: HTMLElement) => {
  el.style.translate = '';
  el.style.rotate = '';
  el.style.scale = '';
  el.style.visibility = '';
};

/** Union of the drawn leaf boxes under `el` (screen px). */
export const leafUnion = (el: Element, frameArea: number): DOMRect | null => {
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

const roomOf = (layers: HTMLElement[], shotR: DOMRect): Room => {
  const s = safeRect('title');
  const k = W / shotR.width;
  const room: Room = {l: Infinity, r: Infinity, t: Infinity, b: Infinity};
  for (const el of layers)
    el.querySelectorAll('[data-dc-text]').forEach((n) => {
      const b = n.getBoundingClientRect();
      if (b.width < 0.5 || b.height < 0.5) return;
      const x0 = (b.left - shotR.left) * k;
      const y0 = (b.top - shotR.top) * k;
      const x1 = (b.right - shotR.left) * k;
      const y1 = (b.bottom - shotR.top) * k;
      room.l = Math.min(room.l, Math.max(0, x0 - s.x));
      room.r = Math.min(room.r, Math.max(0, s.x + s.w - x1));
      room.t = Math.min(room.t, Math.max(0, y0 - s.y));
      room.b = Math.min(room.b, Math.max(0, s.y + s.h - y1));
    });
  return room;
};
/** Clamp a translation so the target's copy stays inside title-safe (1 px spare). */
export const clampToRoom = (tx: number, ty: number, room: Room): [number, number] => [
  Math.max(-Math.max(0, room.l - 1), Math.min(Math.max(0, room.r - 1), tx)),
  Math.max(-Math.max(0, room.t - 1), Math.min(Math.max(0, room.b - 1), ty)),
];

/** Apply the combined contributions on `el` about the screen point (cx, cy) given in the shot's 1920x1080 space. */
const apply = (el: Host, cx: number, cy: number) => {
  const m = el.__dcFxa;
  if (!m || !m.size) return clear(el);
  let tx = 0;
  let ty = 0;
  let sx = 1;
  let sy = 1;
  let rz = 0;
  let hide = false;
  for (const d of m.values()) {
    tx += d.tx;
    ty += d.ty;
    sx *= d.sx;
    sy *= d.sy;
    rz += d.rz;
    hide = hide || !!d.hide;
  }
  // CSS: translate, then rotate, then scale, about the layer origin O (= frame centre); about P instead: t' = t + (I - RS)(P - O)
  const ox = cx - W / 2;
  const oy = cy - H / 2;
  const c = Math.cos((rz * Math.PI) / 180);
  const s = Math.sin((rz * Math.PI) / 180);
  const ax = c * sx * ox - s * sy * oy;
  const ay = s * sx * ox + c * sy * oy;
  const X = tx + ox - ax;
  const Y = ty + oy - ay;
  el.style.translate = Math.abs(X) > 0.005 || Math.abs(Y) > 0.005 ? `${X.toFixed(3)}px ${Y.toFixed(3)}px` : '';
  el.style.rotate = Math.abs(rz) > 0.0005 ? `${rz.toFixed(4)}deg` : '';
  el.style.scale = Math.abs(sx - 1) > 1e-5 || Math.abs(sy - 1) > 1e-5 ? `${sx.toFixed(5)} ${sy.toFixed(5)}` : '';
  el.style.visibility = hide ? 'hidden' : '';
};

export type DriveFn = (m: Measured) => Drive | null;
export type SettledInfo = {self: HTMLElement; mine: HTMLElement; targets: HTMLElement[]; m: Measured | null};

/**
 * Drive `to` (a layer id, or '*' = every other layer of the shot: whole-frame shake) on every frame. `drive` returns this layer's
 * contribution for the current frame (null = none). Returns the measured target box in this layer's space (null until measured or
 * when the target is missing; then the caller draws on its own slot). `after` runs in the same settled pass, after the React
 * state is committed (ShatterToBlocks injects its clones there).
 */
export const useFxTarget = (
  to: string | '*' | undefined,
  frame: number,
  key: string,
  drive: DriveFn,
  after?: (i: SettledInfo) => void,
): {ref: React.RefObject<HTMLDivElement | null>; m: Measured | null} => {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Measured | null>(null);
  const cur = useRef(m);
  cur.current = m;
  const fn = useRef({drive, after});
  fn.current = {drive, after};
  useLayoutEffect(() => {
    if (!to || typeof document === 'undefined') return;
    const h = delayRender(`dc fx-a ${key} @${frame}`);
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
        const self = ref.current;
        const l = self ? layerOf(self) : null;
        const targets = self ? targetLayers(self, to) : [];
        if (!self || !l || !targets.length) {
          if (self) console.warn(`DC_TARGET fx-a '${to}' not found in this shot (${key})`);
          if (cur.current !== null) flushSync(() => setM(null));
          fn.current.after?.({self: self as HTMLElement, mine: l?.mine as HTMLElement, targets, m: null});
          return;
        }
        targets.forEach((t) => clear(t));
        const me = l.mine.getBoundingClientRect();
        const shotR = l.shot.getBoundingClientRect();
        let u: DOMRect | null = null;
        for (const t of targets) {
          const b = leafUnion(t, shotR.width * shotR.height);
          if (!b) continue;
          u = u ? new DOMRect(Math.min(u.left, b.left), Math.min(u.top, b.top), Math.max(u.right, b.right) - Math.min(u.left, b.left), Math.max(u.bottom, b.bottom) - Math.min(u.top, b.top)) : b;
        }
        let meas: Measured | null = null;
        if (u && me.width > 1 && me.height > 1) {
          const kx = W / me.width;
          const ky = H / me.height;
          meas = {rect: {x: (u.left - me.left) * kx, y: (u.top - me.top) * ky, w: u.width * kx, h: u.height * ky}, room: roomOf(targets, shotR)};
        }
        const d = meas ? fn.current.drive(meas) : null;
        const ks = W / Math.max(1, shotR.width);
        const cx = u ? (u.left + u.width / 2 - shotR.left) * ks : W / 2;
        const cy = u ? (u.top + u.height / 2 - shotR.top) * ks : H / 2;
        for (const t of targets as Host[]) {
          const map = (t.__dcFxa ??= new Map());
          if (d) map.set(key, d);
          else map.delete(key);
          apply(t, cx, cy);
        }
        const same =
          (meas === null && cur.current === null) ||
          (!!meas && !!cur.current && (['x', 'y', 'w', 'h'] as const).every((k) => Math.abs(meas!.rect[k] - cur.current!.rect[k]) < 0.05) && JSON.stringify(meas.room) === JSON.stringify(cur.current.room));
        if (!same) flushSync(() => setM(meas));
        fn.current.after?.({self, mine: l.mine, targets, m: meas});
      } finally {
        finish();
      }
    });
    return finish;
  }, [to, frame, key]);
  // unmount: remove this layer's contribution from every target it drove
  useLayoutEffect(
    () => () => {
      const self = ref.current;
      if (!self || !to) return;
      for (const t of targetLayers(self, to) as Host[]) {
        if (!t.__dcFxa?.delete(key)) continue;
        if (!t.__dcFxa.size) clear(t);
      }
    },
    [to, key],
  );
  return {ref, m: to ? m : null};
};
