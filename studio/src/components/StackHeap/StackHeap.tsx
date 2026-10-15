// StackHeap (catalog: Structure & flow). Call-stack frames and heap objects with references (04 §6 Python: "a call slides in a
// new stack frame"; "two names -> one heap object (aliasing)"; an exception unwinds frames).
//  - RTL when any copy is Arabic: the stack (what the code sees) stands at the start side (right), the heap at the end side.
//  - The stack grows upward from the floor; the top frame is the running one (signal rim light). Variables are rows inside their
//    frame, each with a port on the frame edge that faces the heap.
//  - Layer anchor: frames stack up bottom-first (label preset, 3 film frames apart), then heap objects pop in, then references
//    path-draw from their variable to the object (arrow head on the object). An object that two names point at is lit brighter
//    (aliasing).
//  - push(label): a new frame drops onto the top on its anchor (RV1). pop: the top frame lifts away (exit preset) and its
//    references retract. collect(node): the object is garbage-collected: it turns crit, shrinks and dissolves into sparks.
//  - `refs[].from` names a variable (exact text, or the identifier before `=`/`:`/space; topmost frame first), else a heap object
//    id (object -> object reference), else a frame label.
//  - Sizes: 32 px rows, shrinking to the 28 px floor; if the stack is still too tall, the vars of the lowest frames fold.
import React from 'react';
import {random} from 'remotion';
import {C, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, actionsOf, arrowHead, cPath, cardStyle, clamp01, f24, layerStyle, prog, rtlOf} from '../_struct-b/kit';

type Ctx = DcProps<Props>['ctx'];
type SFrame = {key: string; label: string; vars: string[]; born: number; died: number};
type HObj = {id: string; label: string; born: number; died: number};

const ident = (v: string) => v.split(/[\s=:]/)[0];

/** Structural timeline (pure): frames with birth/death, heap objects with birth/collection. */
export const stackTimeline = (p: Props, ctx: Ctx) => {
  const frames: SFrame[] = p.frames.map((f, i) => ({key: `f${i}`, label: f.label, vars: f.vars ?? [], born: ctx.at + f24(3 * i, ctx.fps), died: Infinity}));
  const heapStart = ctx.at + f24(3 * p.frames.length + 2, ctx.fps);
  const heap: HObj[] = p.heap.map((o, j) => ({id: o.id, label: o.label, born: heapStart + f24(2 * j, ctx.fps), died: Infinity}));
  for (const a of actionsOf(ctx, 'push', 'pop', 'collect')) {
    if (a.name === 'push') frames.push({key: `p${a.li}`, label: a.props.label as string, vars: [], born: a.at, died: Infinity});
    else if (a.name === 'pop') {
      const top = [...frames].reverse().find((f) => f.born <= a.at && f.died > a.at);
      if (top) top.died = a.at;
    } else {
      const o = heap.find((x) => x.id === a.props.node);
      if (o && o.died === Infinity) o.died = a.at;
    }
  }
  const refsStart = heap.length ? heap[heap.length - 1].born + f24(4, ctx.fps) : heapStart;
  return {frames, heap, refsStart};
};

export const StackHeapView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const tl = stackTimeline(props, ctx);
  const rtl = rtlOf([...tl.frames.flatMap((f) => [f.label, ...f.vars]), ...tl.heap.map((o) => o.label)]);
  const exitN = presetFrames('exit', ctx.fps, true);
  const lblN = presetFrames('label', ctx.fps);
  const k = 1 + ctx.mod.glow;
  // ---- stack geometry (conservative: every frame that ever exists, so nothing jumps when frames come and go) ----
  const headTop = Math.round(SIZE.label * 1.6); // column captions
  const stackW = Math.min(620, w * 0.4);
  const stackX = rtl ? w - stackW : 0;
  const innerX = rtl ? stackX : stackX + stackW; // the edge that faces the heap (ref ports)
  const avail = h - headTop - 12;
  const gap = 14;
  const dims = (s: number, fold: number) => {
    const rowH = Math.round(s * 1.55);
    const hdr = Math.round(s * 1.9);
    const hs = tl.frames.map((f, i) => hdr + (i < fold ? 0 : f.vars.length * rowH) + (f.vars.length && i >= fold ? 10 : 0));
    return {rowH, hdr, hs, total: hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, tl.frames.length - 1)};
  };
  let s = SIZE.label;
  let fold = 0;
  let dm = dims(s, fold);
  while (dm.total > avail && s > SIZE.labelMin) dm = dims((s -= 2), fold);
  while (dm.total > avail && fold < tl.frames.length - 1) dm = dims(s, ++fold);
  // stack slots: alive frames bottom-up; a frame keeps its slot (pushes / pops only touch the top)
  const alive = (f: SFrame) => f.born <= t && t < f.died + exitN;
  const slotY = new Map<string, number>();
  const floorY = Math.round((h + headTop + dm.total) / 2); // the whole stack (every frame that ever exists) is centred in the box
  let yb = floorY;
  tl.frames.forEach((f, i) => {
    if (t < f.born) return;
    if (t >= f.died + exitN) return;
    slotY.set(f.key, yb - dm.hs[i]);
    yb -= dm.hs[i] + gap;
  });
  const topFrame = [...tl.frames].reverse().find((f) => f.born <= t && t < f.died);
  // variable ports (box-local) for references
  const ports = new Map<string, {x: number; y: number; on: number}>();
  tl.frames.forEach((f, i) => {
    const y0 = slotY.get(f.key);
    if (y0 === undefined || i < fold) return;
    const ent = prog(t, f.born, lblN);
    const out = t >= f.died ? 1 - clamp01((t - f.died + 1) / exitN) : 1;
    f.vars.forEach((v, j) => {
      const p = {x: innerX, y: y0 + dm.hdr + j * dm.rowH + dm.rowH / 2, on: ent * out};
      if (!ports.has(v)) ports.set(v, p);
      if (!ports.has(ident(v))) ports.set(ident(v), p);
    });
  });
  // ---- heap geometry: objects sit beside the variables that point at them (no reference crosses another object) ----
  const staticPort = new Map<string, number>(); // variable name -> y in the full (conservative) stack
  {
    let ys = floorY;
    tl.frames.forEach((f, i) => {
      const y0 = ys - dm.hs[i];
      ys = y0 - gap;
      if (i < fold) return;
      f.vars.forEach((v, j) => {
        const y = y0 + dm.hdr + j * dm.rowH + dm.rowH / 2;
        if (!staticPort.has(v)) staticPort.set(v, y);
        if (!staticPort.has(ident(v))) staticPort.set(ident(v), y);
      });
    });
  }
  const objW = Math.min(300, Math.max(180, w * 0.2));
  const objH = Math.round(s * 2.3);
  const heapGap = Math.max(60, w * 0.1);
  const minGap = objH + 26;
  const want = tl.heap.map((o) => {
    const ys = props.refs.filter((r) => r.to === o.id).map((r) => staticPort.get(r.from)).filter((y): y is number => y !== undefined);
    return {o, y: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : floorY - dm.total / 2};
  });
  want.sort((a, b) => a.y - b.y);
  const hcols = want.length * minGap > h - headTop - 24 ? 2 : 1;
  const objPos = new Map<string, {x: number; y: number}>();
  for (let c = 0; c < hcols; c++) {
    const col = want.filter((_, i) => i % hcols === c);
    let prev = -1e9;
    const ys = col.map((q) => (prev = Math.max(q.y, prev + minGap)));
    const over = ys.length ? ys[ys.length - 1] + objH / 2 - (h - 8) : 0;
    const under = ys.length ? headTop + 8 - (ys[0] - objH / 2) : 0;
    const shift = over > 0 ? -over : Math.max(0, under);
    const cx = rtl ? stackX - heapGap - objW / 2 - c * (objW + 50) : stackX + stackW + heapGap + objW / 2 + c * (objW + 50);
    col.forEach((q, i) => objPos.set(q.o.id, {x: cx, y: ys[i] + shift}));
  }
  const heapYs = [...objPos.values()].map((p) => p.y);
  const heapTop = heapYs.length ? Math.min(...heapYs) - objH / 2 : floorY;
  const heapXs = [...objPos.values()].map((p) => p.x);
  const heapCx = heapXs.length ? (Math.min(...heapXs) + Math.max(...heapXs)) / 2 : stackX;
  const capY = Math.max(0, Math.min(floorY - dm.total, heapTop) - Math.round(SIZE.labelMin * 2));
  const objState = (o: HObj) => {
    const ent = prog(t, o.born, presetFrames('impact', ctx.fps, true), ease.impact);
    const gc = t >= o.died ? clamp01((t - o.died + 1) / exitN) : 0;
    return {ent, gc, on: t >= o.born && gc < 1};
  };
  // ---- references ----
  type R = {d: string; head: string; on: number; to: string};
  const refs: R[] = [];
  const incoming = new Map<string, number>();
  props.refs.forEach((r, i) => {
    const to = tl.heap.find((o) => o.id === r.to);
    const tp = objPos.get(r.to);
    if (!to || !tp) return;
    const ts = objState(to);
    let a: {x: number; y: number; on: number} | undefined = ports.get(r.from);
    if (!a) {
      const src = tl.heap.find((o) => o.id === r.from);
      const sp = src && objPos.get(src.id);
      if (src && sp) {
        const ss = objState(src);
        a = {x: sp.x + ((tp.x > sp.x ? 1 : -1) * objW) / 2, y: sp.y, on: ss.on ? ss.ent * (1 - ss.gc) : 0};
      }
    }
    if (!a) {
      const f = tl.frames.find((x) => x.label === r.from);
      const y0 = f && slotY.get(f.key);
      if (f && y0 !== undefined) a = {x: innerX, y: y0 + dm.hdr / 2, on: prog(t, f.born, lblN) * (t >= f.died ? 0 : 1)};
    }
    if (!a || !ts.on) return;
    const draw = prog(t, Math.max(tl.refsStart + f24(2 * i, ctx.fps), to.born), presetFrames('arrive', ctx.fps), ease.arrive);
    const on = a.on * (1 - ts.gc);
    if (draw <= 0 || on <= 0.01) return;
    const tx = tp.x + ((a.x < tp.x ? -1 : 1) * objW) / 2;
    const b = {x: tx, y: tp.y};
    const dx = (b.x - a.x) * 0.5;
    refs.push({d: cPath(a, {x: a.x + dx, y: a.y}, {x: b.x - dx, y: b.y}, b), head: draw >= 1 ? arrowHead(b, {x: b.x - a.x >= 0 ? 1 : -1, y: 0}, 6) : '', on: on * Math.min(1, draw * 2), to: r.to});
    if (draw >= 1) incoming.set(r.to, (incoming.get(r.to) ?? 0) + 1);
  });
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, rtl)}}>
      {/* column captions (Latin chrome) */}
      <Lbl id={`${ctx.id}:cs`} text="stack" x={stackX + stackW / 2} y={capY} valign="top" maxW={stackW} size={SIZE.labelMin} color={C.ink3} opacity={prog(t, ctx.at, lblN)} role="code" />
      {tl.heap.length ? <Lbl id={`${ctx.id}:ch`} text="heap" x={heapCx} y={capY} valign="top" maxW={objW * 2} size={SIZE.labelMin} color={C.ink3} opacity={prog(t, tl.heap[0].born, lblN)} role="code" /> : null}
      {/* aliasing pools behind objects that two names point at */}
      {tl.heap.map((o) => {
        const p = objPos.get(o.id)!;
        const m = incoming.get(o.id) ?? 0;
        return m >= 2 ? <Pool key={o.id} x={p.x} y={p.y} r={objW * 0.9} color={C.signal} a={0.24} squash={0.6} /> : null;
      })}
      {/* stack frames */}
      {tl.frames.map((f, i) => {
        const y0 = slotY.get(f.key);
        if (y0 === undefined || !alive(f)) return null;
        const ent = prog(t, f.born, presetFrames('arrive', ctx.fps));
        const out = t >= f.died ? prog(t, f.died, exitN, ease.camera) : 0;
        const top = f === topFrame;
        const dy = -(1 - ent) * 40 - out * 60;
        const vars = i < fold ? [] : f.vars;
        return (
          <div key={f.key} style={{position: 'absolute', left: stackX, top: y0, width: stackW, height: dm.hs[i], transform: `translateY(${dy.toFixed(1)}px)`, opacity: ent * (1 - out), ...cardStyle(top ? C.signal : undefined, top ? 0.92 : 0.82)}}>
            <Lbl id={`${ctx.id}:f${f.key}`} text={f.label} x={rtl ? stackW - 20 : 20} y={dm.hdr / 2} align={rtl ? 'right' : 'left'} maxW={stackW - 40} size={s} color={top ? C.signal : C.ink} />
            {vars.length ? <div style={{position: 'absolute', left: 14, right: 14, top: dm.hdr - 2, height: 1, background: `${C.ink}${hex(0.1)}`}} /> : null}
            {vars.map((v, j) => (
              <React.Fragment key={j}>
                <Lbl id={`${ctx.id}:f${f.key}v${j}`} text={v} x={rtl ? stackW - 34 : 34} y={dm.hdr + j * dm.rowH + dm.rowH / 2} align={rtl ? 'right' : 'left'} maxW={stackW - 80} size={s} color={C.ink2} />
                <div style={{position: 'absolute', left: rtl ? -7 : stackW - 7, top: dm.hdr + j * dm.rowH + dm.rowH / 2 - 7, width: 14, height: 14, borderRadius: 7, background: C.ground, border: `2.5px solid ${C.signal}`}} />
              </React.Fragment>
            ))}
          </div>
        );
      })}
      {/* references */}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {refs.map((r, i) => (
          <g key={i} opacity={r.on}>
            <GlowPath d={r.d} color={C.signal} width={3} fx={ctx.fx} k={0.8 * k} />
            {r.head ? <path d={r.head} fill={C.signal} /> : null}
          </g>
        ))}
      </svg>
      {/* heap objects */}
      {tl.heap.map((o) => {
        const st = objState(o);
        if (!st.on) return null;
        const p = objPos.get(o.id)!;
        const alias = (incoming.get(o.id) ?? 0) >= 2;
        const accent = st.gc > 0 ? C.crit : alias ? C.signal : C.violet;
        const sc = (0.6 + 0.4 * st.ent) * (1 - 0.18 * st.gc);
        return (
          <React.Fragment key={o.id}>
            <div style={{position: 'absolute', left: p.x - objW / 2, top: p.y - objH / 2, width: objW, height: objH, transform: `scale(${sc.toFixed(3)})`, opacity: Math.min(1, st.ent * 1.4) * (1 - st.gc), ...cardStyle(accent, 0.9), borderRadius: objH / 2}}>
              <Lbl id={`${ctx.id}:o${o.id}`} text={o.label} x={objW / 2} y={objH / 2} maxW={objW - 36} size={s} color={st.gc > 0 ? C.crit : C.ink} />
            </div>
            {st.gc > 0 ? (
              <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none'}}>
                {Array.from({length: 10}, (_, q) => {
                  const ang = random(`gca${o.id}${q}`) * Math.PI * 2;
                  const dist = (40 + random(`gcd${o.id}${q}`) * 90) * st.gc;
                  return <circle key={q} cx={p.x + Math.cos(ang) * (objW * 0.3 + dist)} cy={p.y + Math.sin(ang) * (objH * 0.4 + dist * 0.6)} r={3} fill={C.crit} opacity={1 - st.gc} />;
                })}
              </svg>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const StackHeap: DcComponent<Props> = {name: 'StackHeap', Component: StackHeapView, text: true, slot: 'center'};
