// CollectionMorph (catalog: Domain specials). 04 §6 "Collections & envs": list = a train of cars; dict = a key -> locker
// wall; set = bubbles merging duplicates; morphs between structures. Every item is one token whose body changes with the
// collection type (car, sealed car, bubble, locker, contiguous cell, table row, indexed row, JSON line); the container
// glyph (mono brackets / frame) and a type tag (`list` -> `set`) cross-fade. Items are code values (mono, LTR order as in
// code); an Arabic item goes through MixedText as one whole word run.
// Timing (the frozen schema has no action, see CR in corpus/specs/_component_requests.jsonl): items arrive staggered
// 2 f@24 from the layer anchor in the `from` layout; the morph starts on the anchor word's END (ctx.atEnd, or 6 f@24 after
// the last arrival if later) and runs 12 f@24 (morph preset, long, camera ease, RV1 onset), items staggered 1 f@24.
// Into `set` (or `dict` keys) duplicates fly onto their first copy and fade (uniqueness). DOM only; same at every tier.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE, W} from '../../tokens';
import {halo, hex} from '../../fx/look';
import {MixedText} from '../../type/Text';
import {isArabic, visLen} from '../../type/arabic';
import {ease} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {Tag, clamp, emit, ff, layerStyle, prog} from '../_dom-a/kit';

type Kind = Props['from'];
type Pos = {x: number; y: number; w: number; h: number};
const ROW: Kind[] = ['list', 'tuple', 'array'];
const COL: Kind[] = ['dataframe', 'series', 'json'];
const OPEN: Record<Kind, string> = {list: '[', tuple: '(', set: '{', dict: '{', array: 'array([', dataframe: '', series: '', json: '['};
const CLOSE: Record<Kind, string> = {list: ']', tuple: ')', set: '}', dict: '}', array: '])', dataframe: '', series: '', json: ']'};
const TONE: Record<Kind, string> = {list: C.signal, tuple: C.ink2, set: C.ok, dict: C.violet, array: C.signal, dataframe: C.ink2, series: C.ink2, json: C.ink2};

const keyOf = (s: string) => (s.includes(':') ? s.slice(0, s.indexOf(':')).trim() : s);
/** slot index of each item in a layout of `kind` (set / dict: duplicates share the first copy's slot) + slot count. */
export const slotsFor = (kind: Kind, items: string[]): {slot: number[]; first: boolean[]; count: number} => {
  if (kind !== 'set' && kind !== 'dict') return {slot: items.map((_, i) => i), first: items.map(() => true), count: items.length};
  const seen = new Map<string, number>();
  const slot: number[] = [];
  const first: boolean[] = [];
  items.forEach((s) => {
    const k = kind === 'dict' ? keyOf(s) : s;
    if (!seen.has(k)) seen.set(k, seen.size);
    first.push(slot.filter((x) => x === seen.get(k)).length === 0);
    slot.push(seen.get(k) as number);
  });
  return {slot, first, count: seen.size};
};

export const layoutFor = (kind: Kind, m: number, box: Rect, chW: number): {pos: Pos[]; bounds: Rect} => {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + 30;
  const pos: Pos[] = [];
  if (ROW.includes(kind)) {
    const rows = m > 6 ? 2 : 1;
    const per = Math.ceil(m / rows);
    const gap = kind === 'array' ? 0 : 28;
    const w = Math.min(chW + 48, (box.w * 0.8 - gap * (per - 1)) / per);
    const h = kind === 'array' ? Math.min(96, w) : 96;
    for (let i = 0; i < m; i++) {
      const r = Math.floor(i / per);
      const k = i % per;
      const inRow = r === rows - 1 ? m - per * (rows - 1) : per;
      const rw = inRow * w + (inRow - 1) * gap;
      pos.push({x: cx - rw / 2 + k * (w + gap) + w / 2, y: cy + (r - (rows - 1) / 2) * (h + 56), w, h});
    }
  } else if (COL.includes(kind)) {
    const h = Math.min(68, (box.h * 0.72) / m);
    const w = Math.min(box.w * 0.5, chW + 160);
    for (let i = 0; i < m; i++) pos.push({x: cx, y: cy + (i - (m - 1) / 2) * h, w, h: h - 6});
  } else if (kind === 'set') {
    const R = Math.min(box.h * 0.3, 110 + 26 * m);
    const s = Math.min(chW + 56, 260);
    for (let i = 0; i < m; i++) {
      const a = -Math.PI / 2 + (i / Math.max(1, m)) * Math.PI * 2;
      pos.push(m === 1 ? {x: cx, y: cy, w: s, h: 84} : {x: cx + Math.cos(a) * R * 1.5, y: cy + Math.sin(a) * R * 0.75, w: s, h: 84});
    }
  } else {
    const cols = Math.min(4, m);
    const rows = Math.ceil(m / cols);
    const w = Math.min(chW + 60, (box.w * 0.8) / cols - 24);
    const h = Math.min(130, (box.h * 0.66) / rows - 20);
    for (let i = 0; i < m; i++) {
      const r = Math.floor(i / cols);
      const k = i % cols;
      pos.push({x: cx + (k - (cols - 1) / 2) * (w + 24), y: cy + (r - (rows - 1) / 2) * (h + 20), w, h});
    }
  }
  const x0 = Math.min(...pos.map((p) => p.x - p.w / 2));
  const x1 = Math.max(...pos.map((p) => p.x + p.w / 2));
  const y0 = Math.min(...pos.map((p) => p.y - p.h / 2));
  const y1 = Math.max(...pos.map((p) => p.y + p.h / 2));
  return {pos, bounds: {x: x0, y: y0, w: x1 - x0, h: y1 - y0}};
};

const lerp = (a: number, b: number, q: number) => a + (b - a) * q;

export const CollectionMorphView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const items = props.items;
  const fs = SIZE.label;
  const chW = Math.max(...items.map((s) => visLen(s) + 2)) * fs * 0.62;
  const A = slotsFor(props.from, items);
  const B = slotsFor(props.to, items);
  const LA = layoutFor(props.from, A.count, box, chW);
  const LB = layoutFor(props.to, B.count, box, chW);
  const lastIn = ctx.at + ff(2 * (items.length - 1), ctx.fps);
  const M = Math.max(ctx.atEnd, lastIn + ff(6, ctx.fps));
  const morphing = props.from !== props.to && (ctx.until === undefined || M < ctx.until);
  const qAll = morphing ? prog(ctx, M, 'morph', ease.camera, true) : 0;
  const tag = (k: Kind, o: number, key: string) => (o > 0.01 ? <Tag id={`${ctx.id}:${key}`} text={k} color={TONE[k]} size={SIZE.label} fx={ctx.fx} on={o} style={{position: 'absolute', left: 0, top: 0, opacity: o, transform: 'translateX(-50%)'}} /> : null);
  const brackets = (k: Kind, L: {bounds: Rect}, o: number, key: string) => {
    if (o <= 0.01 || !OPEN[k]) return null;
    const b = L.bounds;
    const bs: React.CSSProperties = {position: 'absolute', top: b.y - 20, height: b.h + 40, display: 'flex', alignItems: 'center', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: Math.min(SIZE.title, b.h + 40), color: TONE[k], opacity: o * 0.85, textShadow: `${halo}, 0 0 ${ctx.fx.glowPx * 0.5}px ${TONE[k]}`, lineHeight: 1, whiteSpace: 'nowrap'};
    return (
      <React.Fragment key={key}>
        <bdi dir="ltr" data-dc-text={`${ctx.id}:${key}o`} style={{...bs, right: W - b.x + 16}}>{OPEN[k]}</bdi>
        <bdi dir="ltr" data-dc-text={`${ctx.id}:${key}c`} style={{...bs, left: b.x + b.w + 16}}>{CLOSE[k]}</bdi>
      </React.Fragment>
    );
  };
  const body = (k: Kind, s: string, i: number, last: boolean, on: number): React.ReactNode => {
    const tone = TONE[k];
    const isKV = k === 'dict';
    const key = keyOf(s);
    const val = s.includes(':') ? s.slice(s.indexOf(':') + 1).trim() : '';
    const txt = (x: string, id: string, color: string = C.ink) =>
      isArabic(x) ? <MixedText id={id} text={x} size={fs} role="code" color={color} /> : <bdi dir="ltr" data-dc-text={id} style={{color}}>{x}</bdi>;
    const base: React.CSSProperties = {position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: fs, whiteSpace: 'nowrap', textShadow: halo, opacity: on};
    const edge = `2px solid ${tone}${hex(0.85)}`;
    const fill = `linear-gradient(200deg, ${C.panel}F0, ${C.ground}E6)`;
    const glowS = emit(tone, ctx.fx, 0.45 + ctx.mod.glow);
    if (k === 'list' || k === 'tuple')
      return (
        <div style={base}>
          <div style={{position: 'absolute', inset: '0 0 18px 0', borderRadius: 14, border: k === 'tuple' ? `2px dashed ${tone}` : edge, background: fill, boxShadow: glowS}} />
          {[0.22, 0.78].map((f) => <div key={f} style={{position: 'absolute', left: `${f * 100}%`, bottom: 2, width: 22, height: 22, marginLeft: -11, borderRadius: '50%', border: `3px solid ${tone}`, background: C.void}} />)}
          <div style={{position: 'relative', marginBottom: 18}}>{txt(s, `${ctx.id}:${k}${i}`)}</div>
        </div>
      );
    if (k === 'set')
      return (
        <div style={base}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 999, border: edge, background: `radial-gradient(ellipse at 65% 25%, ${tone}${hex(0.28)} 0%, ${C.panel}E6 60%)`, boxShadow: glowS}} />
          <div style={{position: 'relative'}}>{txt(s, `${ctx.id}:${k}${i}`)}</div>
        </div>
      );
    if (isKV)
      return (
        <div style={{...base, flexDirection: 'column', justifyContent: 'flex-start'}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 10, border: edge, background: fill, boxShadow: glowS}} />
          <div style={{position: 'relative', height: '50%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${tone}${hex(0.5)}`, background: `${tone}${hex(0.18)}`, borderRadius: '10px 10px 0 0'}}>{txt(key, `${ctx.id}:k${i}`)}</div>
          <div style={{position: 'relative', height: '50%', display: 'flex', alignItems: 'center', color: C.ink2}}>{val ? txt(val, `${ctx.id}:v${i}`, C.ink2) : <div style={{width: 46, height: 6, borderRadius: 3, background: `${C.ink3}${hex(0.6)}`}} />}</div>
        </div>
      );
    if (k === 'array')
      return (
        <div style={base}>
          <div style={{position: 'absolute', inset: 0, border: `1.5px solid ${tone}${hex(0.7)}`, background: `${tone}${hex(0.08)}`}} />
          <div style={{position: 'relative'}}>{txt(s, `${ctx.id}:${k}${i}`)}</div>
        </div>
      );
    // column kinds: dataframe row (striped table), series row (index rail dot), json line (quoted, comma)
    return (
      <div style={{...base, justifyContent: 'flex-start', paddingLeft: 28}}>
        {k === 'dataframe' ? <div style={{position: 'absolute', inset: 0, background: i % 2 ? `${C.ink}${hex(0.04)}` : `${C.panel}CC`, borderBottom: `1px solid ${C.grid}`}} /> : null}
        {k === 'series' ? <div style={{position: 'relative', width: 12, height: 12, marginRight: 24, borderRadius: '50%', background: tone, boxShadow: emit(tone, ctx.fx, 0.3)}} /> : null}
        <div style={{position: 'relative', color: C.ink}}>{k === 'json' ? <bdi dir="ltr" data-dc-text={`${ctx.id}:q${i}`} style={{color: C.ink3}}>"</bdi> : null}{txt(s, `${ctx.id}:${k}${i}`, k === 'json' ? C.ok : C.ink)}{k === 'json' ? <bdi dir="ltr" data-dc-text={`${ctx.id}:qq${i}`} style={{color: C.ink3}}>{last ? '"' : '",'}</bdi> : null}</div>
      </div>
    );
  };
  const frameFor = (k: Kind, L: {bounds: Rect}, o: number, key: string) =>
    (k === 'dataframe' || k === 'series') && o > 0.01 ? (
      <div key={key} style={{position: 'absolute', left: L.bounds.x - 12, top: L.bounds.y - 12, width: L.bounds.w + 24, height: L.bounds.h + 24, borderRadius: 12, border: `1px solid ${C.grid}`, borderLeft: k === 'series' ? `3px solid ${C.ink2}` : `1px solid ${C.grid}`, background: `${C.ground}B3`, opacity: o}} />
    ) : null;
  const tagY = Math.min(LA.bounds.y, LB.bounds.y) - 120;
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, false)}}>
      {frameFor(props.from, LA, 1 - qAll, 'fa')}
      {frameFor(props.to, LB, qAll, 'fb')}
      {brackets(props.from, LA, (1 - qAll) * prog(ctx, ctx.at, 'arrive'), 'ba')}
      {brackets(props.to, LB, qAll, 'bb')}
      <div style={{position: 'absolute', left: box.x + box.w / 2, top: Math.max(box.y, tagY)}}>
        {tag(props.from, 1 - qAll, 'tf')}
        {tag(props.to, qAll, 'tt')}
      </div>
      {items.map((s, i) => {
        const born = ctx.at + ff(2 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'arrive');
        const q = morphing ? prog(ctx, M + ff(i, ctx.fps), 'morph', ease.camera, true) : 0;
        const pa = LA.pos[A.slot[i]];
        const pb = LB.pos[B.slot[i]];
        const p = {x: lerp(pa.x, pb.x, q), y: lerp(pa.y, pb.y, q), w: lerp(pa.w, pb.w, q), h: lerp(pa.h, pb.h, q)};
        const aliveB = B.first[i] ? 1 : interpolate(q, [0.6, 1], [1, 0], clamp);
        const alpha = ent * (q < 0.5 ? 1 : aliveB);
        const lift = (1 - ent) * 24;
        return (
          <div key={i} style={{position: 'absolute', left: p.x - p.w / 2, top: p.y - p.h / 2 + lift, width: p.w, height: p.h, opacity: alpha}}>
            {q < 1 ? body(props.from, s, i, i === items.length - 1, 1 - interpolate(q, [0.25, 0.65], [0, 1], clamp)) : null}
            {q > 0 ? body(props.to, s, i, i === items.length - 1, interpolate(q, [0.35, 0.75], [0, 1], clamp)) : null}
          </div>
        );
      })}
    </div>
  );
};

export const CollectionMorph: DcComponent<Props> = {name: 'CollectionMorph', Component: CollectionMorphView, text: true, slot: 'full'};
