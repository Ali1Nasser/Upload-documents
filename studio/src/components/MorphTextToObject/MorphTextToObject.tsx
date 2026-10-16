// MorphTextToObject (catalog: State & FX). Text dissolves into particles that become an object, or the reverse (04 §3.5 `morph`
// preset: 300-500 ms, camera ease; 04 §6 "text <-> object via particles, count within the FX tier cap").
//  - text_to_object: the Arabic text arrives on the anchor frame with the frozen `arrive` wipe (RV1), holds until its word ends
//    (ctx.atEnd, at least one arrive length), then fades with the exit preset while the particles take over: they start ON the
//    text's own pixels (sampled from the browser's own shaping of the same string, never a per-letter animation), travel in
//    curved arcs staggered in reading order (right -> left for Arabic) and settle as an outline of the object, which holds with a
//    quiet shimmer.
//  - object_to_text: the particles gather into the object on the anchor frame (RV1), hold, then flow onto the text's pixels while
//    the real text is revealed with the `arrive` wipe in the same beat.
// The particles are ONE canvas painted on the settled frame as a pure function of the frame (remotion random only). The real text is
// always the DOM text (KText: whole words, auto-fit, overflow detector); the canvas never draws a readable word on its own, so
// OCR / fragment checks see the DOM text only. Count = min(props.particles, FX[tier].particles); 0 particles leaves the outline.
import React, {useLayoutEffect, useRef} from 'react';
import {continueRender, delayRender, random} from 'remotion';
import {hex} from '../../fx/look';
import {C, SIZE} from '../../tokens';
import {isArabic, visLen} from '../../type/arabic';
import {KText} from '../../type/Text';
import {ease, presetFrames, revealProgress} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import {whenSettled} from '../../type/settle';
import type {DcComponent, DcProps} from '../../spec/types';
import {abs, beat, exitK} from '../_fx-a/kit';
import {BODY, OBJECTS, objectKey, pickPoints, sampleOutline, seededOrder, type Pt} from '../_fx-a/shapes';
import type {Props} from './schema';

const STAGGER = 0.35; // share of the morph beat spent on the reading-order stagger
const TEXT_ALPHA_IN = 0.15; // particles reach full alpha at this share of the beat (the DOM text fades in the same time)
const TEXT_LEAD = 0.55; // object_to_text: the real text starts its reveal at this share of the beat
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export type MorphTimes = {ms: number; B: number; arrive: number; textAt: number; textExit: number | undefined};
/** Timeline in shot-local frames: the source form holds from the anchor to `ms` (word end, at least one arrive length), the morph
 * runs B = the morph upper bound (500 ms), the real text is revealed (object_to_text) or exits (text_to_object) around it. */
export const morphTimes = (dir: Props['direction'], at: number, atEnd: number, fps: number, until: number | undefined): MorphTimes => {
  const arrive = presetFrames('arrive', fps);
  const B = beat(fps);
  const ms = Math.max(atEnd, at + arrive + 2);
  return dir === 'text_to_object'
    ? {ms, B, arrive, textAt: at, textExit: ms}
    : {ms, B, arrive, textAt: ms + Math.round(B * TEXT_LEAD), textExit: until};
};

export type Particle = {src: Pt; dst: Pt; order: number; curl: number; size: number; phase: number; scatter: Pt; cls: number};

/** Pair `src` with `dst` by reading order (x, right first for Arabic) so the flow sweeps instead of crossing; seeded local swaps. */
export const pairParticles = (src: Pt[], dst: Pt[], rtl: boolean, seed: string, reverse: boolean): Particle[] => {
  const n = Math.min(src.length, dst.length);
  const byX = (a: Pt[], sgn: number) => a.slice(0, n).sort((p, q) => sgn * (p[0] - q[0]) || p[1] - q[1]);
  const sgn = rtl ? -1 : 1;
  // `src`/`dst` here are text / object; the reading-order rank is taken on the text side
  const text = byX(reverse ? dst : src, sgn);
  const obj = byX(reverse ? src : dst, 1);
  const win = Math.max(2, Math.round(n * 0.04));
  const ord = seededOrder(n, `${seed}:pair`);
  const objSwap = obj.slice();
  for (let i = 0; i < n; i++) {
    const j = Math.min(n - 1, i + (ord[i] % win));
    [objSwap[i], objSwap[j]] = [objSwap[j], objSwap[i]];
  }
  return Array.from({length: n}, (_, i) => {
    const t = text[i];
    const o = objSwap[i];
    const a = random(`${seed}:a:${i}`) * Math.PI * 2;
    const r = 90 + random(`${seed}:r:${i}`) * 150;
    return {
      src: reverse ? o : t,
      dst: reverse ? t : o,
      order: n > 1 ? i / (n - 1) : 0,
      curl: random(`${seed}:c:${i}`) * 2 - 1,
      size: 1.8 + random(`${seed}:s:${i}`) * 1.4,
      phase: random(`${seed}:p:${i}`) * Math.PI * 2,
      scatter: [o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r * 0.7],
      cls: i % 8,
    };
  });
};

/** Morph progress u (0 at the source form, 1 at the target) of the particle with reading-order rank `order`, `tau` = beats since ms. */
export const morphU = (tau: number, order: number): number => ease.camera(clamp01((tau - STAGGER * order) / (1 - STAGGER)));

const warned = new Set<string>();
const sampleCache = new Map<string, Pt[]>();
/** Candidate pixels of `text` (relative to its centre), rendered by the browser with the DOM text's own face. */
const textPixels = (text: string, font: string, rtl: boolean, w: number, h: number, want: number, seed: string): Pt[] => {
  const key = `${text}|${font}|${Math.round(w)}x${Math.round(h)}|${want}|${seed}`;
  const hit = sampleCache.get(key);
  if (hit) return hit;
  const cw = Math.ceil(w) + 48;
  const ch = Math.ceil(h) + 48;
  const cv = document.createElement('canvas');
  cv.width = cw;
  cv.height = ch;
  const g = cv.getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D;
  g.font = font;
  g.direction = rtl ? 'rtl' : 'ltr';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  g.fillText(text.replace(/[⟦⟧]/g, ''), cw / 2, ch / 2);
  const img = g.getImageData(0, 0, cw, ch).data;
  let step = Math.max(1, Math.floor(Math.sqrt((w * h * 0.3) / (want * 3))));
  let cand: Pt[] = [];
  for (let tries = 0; tries < 4; tries++) {
    cand = [];
    for (let y = 0; y < ch; y += step) for (let x = 0; x < cw; x += step) if (img[(y * cw + x) * 4 + 3] > 128) cand.push([x - cw / 2, y - ch / 2]);
    if (cand.length >= want || step === 1) break;
    step = Math.max(1, Math.floor(step / 2));
  }
  const out = pickPoints(cand, want, `${seed}:text`);
  sampleCache.set(key, out);
  return out;
};

type PaintIn = {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  props: Props;
  frame: number;
  at: number;
  atEnd: number;
  until: number | undefined;
  fps: number;
  litePlus: boolean;
  n: number;
  seed: string;
  textC: Pt | null; // text centre in canvas px
  textFont: string;
  textBox: {w: number; h: number} | null;
};

/** Paint the particle layer of one frame. */
const paint = (p: PaintIn) => {
  const {g, w, h, props} = p;
  g.clearRect(0, 0, w, h);
  const tt = morphTimes(props.direction, p.at, p.atEnd, p.fps, p.until);
  const t = p.frame - p.at;
  if (t < 0) return;
  const toObj = props.direction === 'text_to_object';
  const rtl = isArabic(props.text);
  const {key, known} = objectKey(props.object);
  if (!known && !warned.has(props.object)) {
    warned.add(props.object);
    console.log(`DC_OBJECT unknown object "${props.object}" -> orb`);
  }
  const R = Math.min(300, Math.min(w, h) * 0.46);
  const oc: Pt = [w / 2, h / 2];
  const polys = OBJECTS[key];
  const scaleP = (q: Pt): Pt => [oc[0] + q[0] * R, oc[1] + q[1] * R];
  const outline = p.n > 0 ? sampleOutline(polys, p.n).map(scaleP) : [];
  let parts: Particle[] = [];
  if (p.n > 0 && p.textC && p.textBox) {
    const tp = textPixels(props.text, p.textFont, rtl, p.textBox.w, p.textBox.h, p.n, p.seed).map((q): Pt => [p.textC![0] + q[0], p.textC![1] + q[1]]);
    parts = pairParticles(toObj ? tp : outline, toObj ? outline : tp, rtl, p.seed, !toObj);
  }
  const tau = (p.frame - tt.ms) / tt.B; // beats since the morph started
  // ---- the object as a lit glass body (ADR-003 LK-F: key light from the upper right, rim on the top / right edges, a floor shadow)
  const e0 = revealProgress(t, tt.arrive, ease.arrive);
  const formed = toObj ? smooth(0.7, 1.4, tau) : (1 - smooth(0, 0.5, tau)) * e0; // how present the body is
  const lineA = toObj ? 0.75 * smooth(0.55, 1, tau) : 0.75 * (1 - smooth(0, 0.35, tau)) * e0;
  const bob = Math.sin(((p.frame * 24) / p.fps / 48) * Math.PI * 2) * 3 * (toObj ? smooth(0.9, 1.6, tau) : (1 - smooth(0, 0.4, tau)) * e0);
  if (formed > 0.01) {
    g.save();
    g.translate(oc[0], oc[1] + R * 1.12);
    g.scale(1, 0.15);
    const fl = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.9);
    fl.addColorStop(0, `${C.signal}${hex(0.32 * formed)}`);
    fl.addColorStop(1, `${C.signal}${hex(0)}`);
    g.fillStyle = fl;
    g.beginPath();
    g.arc(0, 0, R * 0.9, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.save();
  g.translate(0, bob);
  const lit = (a0: number, a1: number, a2: number, k: number) => {
    const gr = g.createLinearGradient(oc[0] + R * 0.8, oc[1] - R, oc[0] - R * 0.8, oc[1] + R);
    gr.addColorStop(0, `${C.ink}${hex(a0 * k)}`);
    gr.addColorStop(0.4, `${C.signal}${hex(a1 * k)}`);
    gr.addColorStop(1, `${C.violet}${hex(a2 * k)}`);
    return gr;
  };
  const trace = (poly: Pt[]) => {
    g.beginPath();
    poly.forEach((q, i) => {
      const [x, y] = scaleP(q);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
  };
  if (formed > 0.01) {
    const closed = (q: Pt[]) => q.length > 3 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1];
    const body = BODY[key] ?? polys.filter(closed);
    g.fillStyle = lit(0.16, 0.2, 0.05, formed);
    for (const poly of body) {
      trace(poly);
      g.closePath();
      g.fill();
    }
  }
  if (lineA > 0.01) {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    if (p.litePlus) {
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = lit(0.5, 0.5, 0.2, lineA * 0.3);
      g.lineWidth = 7;
      for (const poly of polys) {
        trace(poly);
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }
    g.strokeStyle = lit(1, 0.9, 0.55, lineA);
    g.lineWidth = 2;
    for (const poly of polys) {
      trace(poly);
      g.stroke();
    }
  }
  // ---- particles
  const e = revealProgress(t, tt.arrive, ease.arrive);
  const sprites: {x: number; y: number; r: number; a: number; c: string}[] = [];
  for (const q of parts) {
    let x: number;
    let y: number;
    let a: number;
    let textual = false;
    const shimmer = 0.78 + 0.22 * Math.sin(((p.frame * 24) / p.fps / 36) * Math.PI * 2 + q.phase);
    if (toObj) {
      if (tau < 0) continue; // the real text carries the beat until the morph starts
      const u = morphU(tau, q.order);
      const arcK = Math.sin(Math.PI * u) * q.curl * 0.22;
      const dx = q.dst[0] - q.src[0];
      const dy = q.dst[1] - q.src[1];
      x = q.src[0] + dx * u - dy * arcK;
      y = q.src[1] + dy * u + dx * arcK;
      a = clamp01(tau / TEXT_ALPHA_IN) * (u < 1 ? 1 : shimmer);
      textual = u < 0.12;
    } else if (tau < 0) {
      // gather into the object on the anchor frame (RV1), then hold
      x = q.scatter[0] + (q.src[0] - q.scatter[0]) * e;
      y = q.scatter[1] + (q.src[1] - q.scatter[1]) * e;
      a = clamp01(e * 1.6) * shimmer;
    } else {
      const u = morphU(tau, q.order);
      const arcK = Math.sin(Math.PI * u) * q.curl * 0.22;
      const dx = q.dst[0] - q.src[0];
      const dy = q.dst[1] - q.src[1];
      x = q.src[0] + dx * u - dy * arcK;
      y = q.src[1] + dy * u + dx * arcK;
      a = u < 0.8 ? 1 : 1 - clamp01((u - 0.8) / 0.2);
      textual = u > 0.88;
    }
    if (a <= 0.01) continue;
    const c = textual ? C.ink : q.cls === 0 ? C.white : q.cls === 1 ? C.violet : C.signal;
    sprites.push({x: Math.max(4, Math.min(w - 4, x)), y: Math.max(4, Math.min(h - 4, y)), r: q.size, a, c});
  }
  if (p.litePlus) {
    g.globalCompositeOperation = 'lighter';
    for (const s of sprites) {
      g.fillStyle = `${s.c}${hex(0.1 * s.a)}`;
      g.beginPath();
      g.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  for (const s of sprites) {
    g.fillStyle = `${s.c}${hex(0.95 * s.a)}`;
    g.beginPath();
    g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
};

export const MorphTextToObjectView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const tt = morphTimes(props.direction, ctx.at, ctx.atEnd, ctx.fps, ctx.until);
  const n = Math.max(0, Math.min(props.particles, ctx.fx.particles));
  const id = `${ctx.id}:text`;
  const frame = ctx.frame;
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const h = delayRender(`dc fx-a morph @${frame}`);
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
        const c = cv.current;
        const r = root.current;
        if (!c || !r) return;
        const g = c.getContext('2d') as CanvasRenderingContext2D;
        const cr = c.getBoundingClientRect();
        const k = c.width / Math.max(1, cr.width);
        const el = r.querySelector<HTMLElement>(`[data-dc-text="${id}"]`);
        let textC: Pt | null = null;
        let textBox: {w: number; h: number} | null = null;
        let textFont = '';
        if (el) {
          const tr = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const px = parseFloat(cs.fontSize) * k;
          textC = [(tr.left + tr.width / 2 - cr.left) * k, (tr.top + tr.height / 2 - cr.top) * k];
          textBox = {w: tr.width * k, h: tr.height * k};
          textFont = `${cs.fontWeight} ${px.toFixed(1)}px ${cs.fontFamily}`;
        }
        paint({g, w: c.width, h: c.height, props, frame, at: ctx.at, atEnd: ctx.atEnd, until: ctx.until, fps: ctx.fps, litePlus: ctx.fx.id !== 'lite', n, seed: `morph:${ctx.id}`, textC, textFont, textBox});
      } finally {
        finish();
      }
    });
    return finish;
  });
  return (
    <div ref={root} style={{...abs(ctx.box), opacity: exitK(ctx), pointerEvents: 'none'}}>
      <canvas ref={cv} width={Math.round(ctx.box.w)} height={Math.round(ctx.box.h)} style={{position: 'absolute', left: 0, top: 0, width: ctx.box.w, height: ctx.box.h}} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <KText id={id} text={props.text} size={SIZE.kinetic} maxW={ctx.box.w} maxH={ctx.box.h} fx={ctx.fx} at={tt.textAt} exitAt={tt.textExit} fps={ctx.fps} frame={ctx.frame} preset="arrive" color={C.ink} glowColor={C.signal} />
      </div>
    </div>
  );
};

const textRect = (p: Props, box: Rect): Rect => {
  const size = SIZE.kinetic;
  const w = Math.min(box.w, size * 0.6 * visLen(p.text) + size * 0.4);
  const h = Math.min(box.h, size * 1.6);
  return {x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h};
};

export const MorphTextToObject: DcComponent<Props> = {name: 'MorphTextToObject', Component: MorphTextToObjectView, text: true, slot: 'center', textRect};
