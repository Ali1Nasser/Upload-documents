// CollectionMorph (catalog: Domain specials). 04 §6 "Collections & envs": list = a train of cars; dict = a key -> locker
// wall; set = bubbles merging duplicates; morphs between structures. Every item is ONE token whose body changes with the
// collection type: coupled car on a rail (list), sealed car with a closed lock (tuple), glass bubble (set), locker door with
// a key plate (dict), contiguous memory cell (array), table row (dataframe), indexed row (series), quoted JSON line (json).
// The container glyph (mono brackets) and a `from -> to` type pair (the current one lit) cross-fade. Items are code values
// (mono, LTR order as in code); an Arabic item goes through MixedText as one whole word run (FitText), never split.
// Depth and light (ADR-003 LK-F): holographic floor, back glow in the type's tone, key rim light from the upper right, a
// floor light pool under every car / bubble / locker, bubbles float on seeded phases.
// Timing (the frozen schema has no action, see CR in corpus/specs/_component_requests.jsonl): items arrive staggered
// 2 f@24 from the layer anchor in the `from` layout; the morph starts on the anchor word's END (ctx.atEnd, or 6 f@24 after
// the last arrival if later) and runs 12 f@24 (morph preset, long, camera ease, RV1 onset), items staggered 1 f@24.
// Uniqueness: when the target dedups (`set`, `dict` keys) the duplicate copies glow warn just before the morph, fly onto
// their first copy and fade into it; the first copy flashes ok with a ring and seeded sparks. The reverse (set -> list)
// splits the copies out again. No number is drawn: counts would be derived figures. DOM only; the same code at every tier
// (glow radii follow the tier tokens), so lite = standard = hero.
import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, SIZE, W} from '../../tokens';
import {halo, hex} from '../../fx/look';
import {isArabic, visLen} from '../../type/arabic';
import {ease, presetFrames} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FitText, Floor, LockGlyph, Tag, acrylic, clamp, emit, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

type Kind = Props['from'];
type Pos = {x: number; y: number; w: number; h: number};
const ROW: Kind[] = ['list', 'tuple', 'array'];
const COL: Kind[] = ['dataframe', 'series', 'json'];
const OPEN: Record<Kind, string> = {list: '[', tuple: '(', set: '{', dict: '{', array: 'array([', dataframe: '', series: '', json: '['};
const CLOSE: Record<Kind, string> = {list: ']', tuple: ')', set: '}', dict: '}', array: '])', dataframe: '', series: '', json: ']'};
const TONE: Record<Kind, string> = {list: C.signal, tuple: C.ink2, set: C.ok, dict: C.violet, array: C.signal, dataframe: C.ink2, series: C.ink2, json: C.ink2};
const dedups = (k: Kind) => k === 'set' || k === 'dict';

const keyOf = (s: string) => (s.includes(':') ? s.slice(0, s.indexOf(':')).trim() : s);
const valOf = (s: string) => (s.includes(':') ? s.slice(s.indexOf(':') + 1).trim() : '');

/** slot index of each item in a layout of `kind` (set / dict: duplicates share the first copy's slot) + slot count. */
export const slotsFor = (kind: Kind, items: string[]): {slot: number[]; first: boolean[]; count: number} => {
  if (!dedups(kind)) return {slot: items.map((_, i) => i), first: items.map(() => true), count: items.length};
  const seen = new Map<string, number>();
  const slot: number[] = [];
  const first: boolean[] = [];
  items.forEach((s) => {
    const k = kind === 'dict' ? keyOf(s) : s;
    const isNew = !seen.has(k);
    if (isNew) seen.set(k, seen.size);
    first.push(isNew);
    slot.push(seen.get(k) as number);
  });
  return {slot, first, count: seen.size};
};

/** Item geometry of a layout of `kind` with `m` slots inside `box`. fs = item type size, chW = widest copy in px. */
export const layoutFor = (kind: Kind, m: number, box: Rect, chW: number, fs: number = SIZE.label): {pos: Pos[]; bounds: Rect} => {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + 30;
  const pos: Pos[] = [];
  if (ROW.includes(kind)) {
    const rows = m > 6 ? 2 : 1;
    const per = Math.ceil(m / rows);
    const gap = kind === 'array' ? 0 : 40;
    const w = Math.min(chW + fs * 1.7, (box.w * 0.8 - gap * (per - 1)) / per);
    const h = Math.round(fs * (kind === 'array' ? 2.1 : 2.5));
    for (let i = 0; i < m; i++) {
      const r = Math.floor(i / per);
      const k = i % per;
      const inRow = r === rows - 1 ? m - per * (rows - 1) : per;
      const rw = inRow * w + (inRow - 1) * gap;
      pos.push({x: cx - rw / 2 + k * (w + gap) + w / 2, y: cy + (r - (rows - 1) / 2) * (h + 96), w, h});
    }
  } else if (COL.includes(kind)) {
    const h = Math.min(Math.round(fs * 1.9), (box.h * 0.7) / m);
    const w = Math.min(box.w * 0.5, Math.max(380, chW + fs * 5));
    for (let i = 0; i < m; i++) pos.push({x: cx, y: cy + (i - (m - 1) / 2) * h, w, h: h - 6});
  } else if (kind === 'set') {
    // hex-packed cluster of glass bubbles (rows of 3 / 4 balanced; rows differing by one stagger naturally)
    const d = Math.round(Math.min(Math.max(chW + fs * 1.9, fs * 4.2), 236));
    const rows = m <= 3 ? 1 : m <= 7 ? 2 : 3;
    const base = Math.floor(m / rows);
    const extra = m - base * rows;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      const inRow = base + (r < extra ? 1 : 0);
      const odd = rows > 1 && extra === 0 ? (r % 2 ? 0.25 : -0.25) : 0; // equal rows stagger like a hex pack
      for (let k = 0; k < inRow; k++, i++) pos.push({x: cx + (k - (inRow - 1) / 2 + odd) * d * 1.14, y: cy + (r - (rows - 1) / 2) * d * 0.98, w: d, h: d});
    }
  } else {
    const cols = Math.min(4, m);
    const rows = Math.ceil(m / cols);
    const w = Math.min(chW + fs * 1.9, (box.w * 0.84) / cols - 28);
    const h = Math.min(Math.round(fs * 4.4), (box.h * 0.66) / rows - 28);
    for (let i = 0; i < m; i++) {
      const r = Math.floor(i / cols);
      const inRow = r === rows - 1 ? m - cols * (rows - 1) : cols;
      const k = i % cols;
      pos.push({x: cx + (k - (inRow - 1) / 2) * (w + 28), y: cy + (r - (rows - 1) / 2) * (h + 28), w, h});
    }
  }
  const x0 = Math.min(...pos.map((p) => p.x - p.w / 2));
  const x1 = Math.max(...pos.map((p) => p.x + p.w / 2));
  const y0 = Math.min(...pos.map((p) => p.y - p.h / 2));
  const y1 = Math.max(...pos.map((p) => p.y + p.h / 2));
  return {pos, bounds: {x: x0, y: y0, w: x1 - x0, h: y1 - y0}};
};

/** Both layouts of a prop set (shared by the view and the text-safe rect). */
export const geomFor = (p: Props, box: Rect) => {
  const fs = p.items.length > 6 ? SIZE.label : SIZE.body;
  const lens = p.items.flatMap((s) => (p.from === 'dict' || p.to === 'dict' ? [keyOf(s), valOf(s)] : [s])).map((s) => visLen(s) + 1);
  const chW = Math.max(...lens) * fs * 0.62;
  const A = slotsFor(p.from, p.items);
  const B = slotsFor(p.to, p.items);
  return {fs, chW, A, B, LA: layoutFor(p.from, A.count, box, chW, fs), LB: layoutFor(p.to, B.count, box, chW, fs)};
};

const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
const sm = (q: number, a: number, b: number) => interpolate(q, [a, b], [0, 1], clamp);

export const CollectionMorphView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const items = props.items;
  const {fs, A, B, LA, LB} = geomFor(props, box);
  const n = presetFrames('morph', ctx.fps, true);
  const lastIn = ctx.at + ff(2 * (items.length - 1), ctx.fps);
  const M = Math.max(ctx.atEnd, lastIn + ff(6, ctx.fps));
  const morphing = props.from !== props.to && (ctx.until === undefined || M < ctx.until);
  const qAll = morphing ? prog(ctx, M, 'morph', ease.camera, true) : 0;
  const glowK = 1 + ctx.mod.glow;
  const merge = !dedups(props.from) && dedups(props.to) && morphing; // copies collapse into their first copy
  const split = dedups(props.from) && !dedups(props.to) && morphing; // copies come out of their first copy
  const dd = dedups(props.to) ? B : A;
  const inGroup = items.map((_, i) => dd.slot.filter((s) => s === dd.slot[i]).length > 1);
  const landF = (i: number) => M + ff(i, ctx.fps) + n - 1;
  const cxm = box.x + box.w / 2;

  const text = (x: string, id: string, maxW: number, color: string = C.ink) => <FitText id={id} text={x} size={fs} maxW={maxW} role="code" color={color} />;

  const pool = (tone: string, w: number, h: number, dy: number, k: number) => (
    <div style={{position: 'absolute', left: -w * 0.08, top: h + dy, width: w * 1.16, height: Math.round(fs * 0.9), borderRadius: '50%', background: `radial-gradient(ellipse, ${tone}${hex(0.38 * k)} 0%, ${tone}${hex(0.1 * k)} 45%, transparent 72%)`}} />
  );

  /** one item body of kind k, filling its container (natural geometry nat). */
  const body = (k: Kind, s: string, i: number, nat: Pos, on: number, tone: string, g: number, last: boolean): React.ReactNode => {
    const id = `${ctx.id}:${k}${i}`;
    const base: React.CSSProperties = {position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontSize: fs, whiteSpace: 'nowrap', textShadow: halo, opacity: on};
    const glowOn = Math.min(1.6, 0.5 + ctx.mod.glow + g);
    if (k === 'list' || k === 'tuple') {
      const wheel = (f: number) => <div key={f} style={{position: 'absolute', left: `${f * 100}%`, bottom: -8, width: 26, height: 26, marginLeft: -13, borderRadius: '50%', border: `3px solid ${tone}`, background: `radial-gradient(circle, ${tone}${hex(0.5)} 0 22%, ${C.void} 25%)`}} />;
      return (
        <div style={base}>
          {pool(tone, nat.w, nat.h, 22, 0.8 * on)}
          {!last ? <div style={{position: 'absolute', right: -42, top: '58%', width: 44, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${tone}, ${tone}${hex(0.5)})`, boxShadow: emit(tone, ctx.fx, 0.3)}} /> : null}
          <div style={{position: 'absolute', inset: '0 0 12px 0', ...acrylic(tone, ctx.fx, glowOn, 14), ...(k === 'tuple' ? {borderStyle: 'dashed'} : {})}} />
          <div style={{position: 'absolute', left: 14, right: 14, top: 8, height: 2, borderRadius: 1, background: `linear-gradient(270deg, ${C.ink}${hex(0.5)}, transparent)`}} />
          {wheel(0.2)}
          {wheel(0.8)}
          {k === 'tuple' ? <div style={{position: 'absolute', right: 12, top: 8, opacity: 0.9}}><LockGlyph size={22} tone={tone} open={0} fx={ctx.fx} on={0.5} /></div> : null}
          <div style={{position: 'relative', marginBottom: 12}}>{text(s, id, nat.w - 28)}</div>
        </div>
      );
    }
    if (k === 'set') {
      const d = nat.w;
      return (
        <div style={base}>
          {pool(tone, d * 0.8, d, -d * 0.02, 0.9 * on)}
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${C.ink}${hex(0.22 + 0.3 * g)}`, background: `radial-gradient(circle at 66% 28%, ${C.white}${hex(0.5)} 0%, ${tone}${hex(0.55)} 17%, ${tone}${hex(0.2)} 52%, ${C.void}${hex(0.55)} 100%)`, boxShadow: `${emit(tone, ctx.fx, glowOn)}, inset -${Math.round(d * 0.07)}px -${Math.round(d * 0.09)}px ${Math.round(d * 0.16)}px ${C.void}${hex(0.6)}`}} />
          <div style={{position: 'absolute', left: '60%', top: '12%', width: '26%', height: '14%', borderRadius: '50%', background: `radial-gradient(ellipse, ${C.white}${hex(0.7)} 0%, transparent 72%)`, transform: 'rotate(-28deg)'}} />
          <div style={{position: 'relative'}}>{text(s, id, d - 36)}</div>
        </div>
      );
    }
    if (k === 'dict') {
      const key = keyOf(s);
      const val = valOf(s);
      const ph = nat.h * 0.38;
      return (
        <div style={{...base, flexDirection: 'column', justifyContent: 'flex-start'}}>
          {pool(tone, nat.w, nat.h, 2, 0.8 * on)}
          <div style={{position: 'absolute', inset: 0, ...acrylic(tone, ctx.fx, glowOn, 10)}} />
          <div style={{position: 'relative', height: ph, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1.5px solid ${tone}${hex(0.55)}`, background: `linear-gradient(270deg, ${tone}${hex(0.3)}, ${tone}${hex(0.1)})`, borderRadius: '10px 10px 0 0'}}>{text(key, `${ctx.id}:k${i}`, nat.w - 40)}</div>
          {[0.5, 0.64, 0.78].map((f) => <div key={f} style={{position: 'absolute', left: 18, right: 18, top: nat.h * f, height: 2, borderRadius: 1, background: `${C.ink3}${hex(0.22)}`}} />)}
          {[0.25, 0.75].map((f) => <div key={f} style={{position: 'absolute', left: -4, top: nat.h * f, width: 8, height: 22, borderRadius: 3, background: `${tone}${hex(0.8)}`}} />)}
          <div style={{position: 'absolute', right: 10, top: nat.h * 0.55, width: 6, height: nat.h * 0.26, borderRadius: 3, background: `${tone}${hex(0.7)}`, boxShadow: emit(tone, ctx.fx, 0.25)}} />
          <div style={{position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: C.ink2}}>
            {val ? text(val, `${ctx.id}:v${i}`, nat.w - 40, C.ink2) : <svg width={26} height={34} viewBox="0 0 26 34"><circle cx={13} cy={12} r={7} fill="none" stroke={tone} strokeWidth={3} /><path d="M13 19 V30" stroke={tone} strokeWidth={3} strokeLinecap="round" /></svg>}
          </div>
        </div>
      );
    }
    if (k === 'array')
      return (
        <div style={base}>
          <div style={{position: 'absolute', inset: 0, border: `1.5px solid ${tone}${hex(0.75)}`, background: `linear-gradient(180deg, ${tone}${hex(0.16)}, ${tone}${hex(0.05)})`, boxShadow: `inset 0 1px 0 ${C.ink}1F, ${emit(tone, ctx.fx, 0.25 * glowOn)}`}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: `${tone}${hex(0.55)}`}} />
          <div style={{position: 'relative'}}>{text(s, id, nat.w - 16)}</div>
        </div>
      );
    // column kinds: dataframe row (striped table), series row (index rail dot), json line (quoted, comma)
    return (
      <div style={{...base, justifyContent: 'flex-start', paddingLeft: 28}}>
        {k === 'dataframe' ? <div style={{position: 'absolute', inset: 0, background: i % 2 ? `${C.ink}${hex(0.05)}` : `${C.panel}CC`, borderBottom: `1px solid ${C.grid}`}} /> : null}
        {k === 'dataframe' ? <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: `${C.ink3}${hex(0.16)}`}} /> : null}
        {k === 'series' ? <div style={{position: 'relative', width: 12, height: 12, marginRight: 24, borderRadius: '50%', background: tone, boxShadow: emit(tone, ctx.fx, 0.3 + g)}} /> : null}
        {k === 'dataframe' ? <div style={{width: 10}} /> : null}
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', color: C.ink}}>
          {k === 'json' ? <bdi dir="ltr" data-dc-text={`${id}q`} style={{color: C.ink3}}>"</bdi> : null}
          {text(s, id, nat.w - 110, k === 'json' ? C.ok : C.ink)}
          {k === 'json' ? <bdi dir="ltr" data-dc-text={`${id}qq`} style={{color: C.ink3}}>{last ? '"' : '",'}</bdi> : null}
        </div>
      </div>
    );
  };

  const frameFor = (k: Kind, L: {bounds: Rect; pos: Pos[]}, o: number, key: string) => {
    if (o <= 0.01) return null;
    const b = L.bounds;
    if (k === 'dataframe' || k === 'series')
      return (
        <React.Fragment key={key}>
          <div style={{position: 'absolute', left: b.x - 12, top: b.y - 12, width: b.w + 24, height: b.h + 24, borderRadius: 12, border: `1px solid ${C.grid}`, background: `${C.ground}B3`, boxShadow: `inset 0 1px 0 ${C.ink}1F, 0 0 ${ctx.fx.glowPx * 0.6}px ${C.void}`, opacity: o}} />
          {k === 'series' ? <div style={{position: 'absolute', left: b.x + 33, top: b.y + 6, width: 2, height: b.h - 12, background: `${C.ink3}${hex(0.5)}`, opacity: o}} /> : null}
        </React.Fragment>
      );
    if (k === 'list' || k === 'tuple') {
      // rail under every row of cars: two rails with sleepers
      const rows = [...new Set(L.pos.map((p) => p.y))];
      return (
        <React.Fragment key={key}>
          {rows.map((y, r) => {
            const h = L.pos[0].h;
            return (
              <div key={r} style={{position: 'absolute', left: b.x - 24, top: y + h / 2 + 12, width: b.w + 48, height: 16, opacity: o * 0.9}}>
                <div style={{position: 'absolute', left: 0, right: 0, top: 3, height: 2, background: `${TONE[k]}${hex(0.55)}`}} />
                <div style={{position: 'absolute', left: 0, right: 0, top: 11, height: 2, background: `${TONE[k]}${hex(0.35)}`}} />
                <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 16, backgroundImage: `repeating-linear-gradient(90deg, ${C.ink3}${hex(0.35)} 0 3px, transparent 3px 44px)`}} />
              </div>
            );
          })}
        </React.Fragment>
      );
    }
    return null;
  };

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

  const glowBox = (k: Kind, L: {bounds: Rect}, o: number, key: string) => {
    if (o <= 0.01) return null;
    const b = L.bounds;
    const rx = b.w * 0.62 + 120;
    const ry = b.h * 0.75 + 100;
    return <div key={key} style={{position: 'absolute', left: b.x + b.w / 2 - rx, top: b.y + b.h / 2 - ry, width: 2 * rx, height: 2 * ry, borderRadius: '50%', background: `radial-gradient(ellipse, ${TONE[k]}${hex(0.17 * o * glowK)} 0%, ${TONE[k]}${hex(0.05 * o)} 48%, transparent 72%)`}} />;
  };

  const tagY = Math.max(box.y, Math.min(LA.bounds.y, LB.bounds.y) - 124);
  const showPair = props.from !== props.to;
  const items_ = items.map((s, i) => {
    const born = ctx.at + ff(2 * i, ctx.fps);
    if (t < born) return null;
    const ent = prog(ctx, born, 'arrive');
    const q = morphing ? prog(ctx, M + ff(i, ctx.fps), 'morph', ease.camera, true) : 0;
    const pa = LA.pos[A.slot[i]];
    const pb = LB.pos[B.slot[i]];
    const vA = A.first[i] ? 1 : 0;
    const vB = B.first[i] ? 1 : 0;
    const vis = vA === vB ? vA : vA === 1 ? 1 - sm(q, 0.62, 0.92) : sm(q, 0.1, 0.3); // merge: fade into the first copy; split: appear out of it
    const bobW = (props.from === 'set' ? 1 - q : 0) + (props.to === 'set' ? q : 0);
    const bob = bobW * 7 * Math.sin(((t + i * 7) / ff(40, ctx.fps)) * Math.PI * 2);
    const p = {x: lerp(pa.x, pb.x, q), y: lerp(pa.y, pb.y, q) + bob + (1 - ent) * 26, w: lerp(pa.w, pb.w, q), h: lerp(pa.h, pb.h, q)};
    const sh = merge && vB === 0 ? 1 - 0.25 * sm(q, 0.7, 1) : 1;
    // warn tint on every copy of a duplicated value: ramps in just before the morph, releases as the copies merge
    const tint = !inGroup[i] ? 0 : merge ? sm(t, M - ff(10, ctx.fps), M) * (1 - sm(q, 0.15, 0.6)) : split ? sm(q, 0.5, 1) : 0;
    const flash = merge && B.first[i] ? Math.max(0, ...items.map((_, j) => (j !== i && B.slot[j] === B.slot[i] && !B.first[j] ? flashAt(ctx, landF(j)) : 0))) : 0;
    const showA = q < 1;
    const showB = q > 0;
    const aOn = 1 - sm(q, 0.25, 0.65);
    const bOn = sm(q, 0.35, 0.75);
    return (
      <div key={i} style={{position: 'absolute', left: p.x - p.w / 2, top: p.y - p.h / 2, width: p.w, height: p.h, opacity: ent * vis, transform: `scale(${(0.88 + 0.12 * ent) * sh})`}}>
        {showA ? body(props.from, s, i, pa, aOn, mix(TONE[props.from], C.warn, tint), tint * 0.6 + flash, i === items.length - 1) : null}
        {showB ? body(props.to, s, i, pb, bOn, mix(TONE[props.to], C.warn, tint), tint * 0.6 + flash, i === items.length - 1) : null}
      </div>
    );
  });

  // merge effects at the slot of each first copy: ring + seeded sparks on every copy that lands
  const fxEls: React.ReactNode[] = [];
  if (merge) {
    items.forEach((_, j) => {
      if (B.first[j]) return;
      const age = t - landF(j);
      const life = ff(18, ctx.fps);
      if (age < 0 || age > life) return;
      const pb = LB.pos[B.slot[j]];
      const u = age / life;
      const rr = pb.w * (0.55 + 0.45 * (1 - Math.pow(1 - u, 2)));
      fxEls.push(<div key={`r${j}`} style={{position: 'absolute', left: pb.x - rr, top: pb.y - rr, width: 2 * rr, height: 2 * rr, borderRadius: '50%', border: `2px solid ${C.ok}${hex(0.85 * (1 - u))}`}} />);
      const nSp = Math.min(8, ctx.fx.particles);
      for (let s = 0; s < nSp; s++) {
        const ang = random(`cm-${ctx.id}-${j}-${s}`) * Math.PI * 2;
        const dist = pb.w * (0.45 + 0.5 * random(`cm-${ctx.id}-${j}-${s}-d`)) * (0.4 + 0.6 * (1 - Math.pow(1 - u, 2)));
        const sz = 5 + 4 * random(`cm-${ctx.id}-${j}-${s}-z`);
        fxEls.push(<div key={`s${j}-${s}`} style={{position: 'absolute', left: pb.x + Math.cos(ang) * dist - sz / 2, top: pb.y + Math.sin(ang) * dist * 0.8 - sz / 2, width: sz, height: sz, borderRadius: '50%', background: s % 2 ? C.white : C.ok, opacity: 1 - u, boxShadow: emit(C.ok, ctx.fx, 0.4)}} />);
      }
    });
  }

  const arrive = prog(ctx, ctx.at, 'arrive');
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, false)}}>
      {glowBox(props.from, LA, (1 - qAll) * arrive, 'ga')}
      {glowBox(props.to, LB, qAll, 'gb')}
      <Floor x={box.x} y={Math.round(box.y + box.h * 0.5)} w={box.w} h={Math.round(box.h * 0.46)} opacity={0.5} />
      {frameFor(props.from, LA, (1 - qAll) * arrive, 'fa')}
      {frameFor(props.to, LB, qAll, 'fb')}
      {brackets(props.from, LA, (1 - qAll) * arrive, 'ba')}
      {brackets(props.to, LB, qAll, 'bb')}
      <div style={{position: 'absolute', left: cxm, top: tagY, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 22, opacity: arrive}}>
        <Tag id={`${ctx.id}:tf`} text={props.from} color={TONE[props.from]} size={SIZE.label} fx={ctx.fx} on={showPair ? 1 - qAll : 1} style={{opacity: showPair ? 0.4 + 0.6 * (1 - qAll) : 1}} />
        {showPair ? (
          <>
            <svg width={64} height={20} viewBox="0 0 64 20" style={{overflow: 'visible'}}>
              <path d="M4 10 H56 M46 3 L58 10 L46 17" fill="none" stroke={C.ink3} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <Tag id={`${ctx.id}:tt`} text={props.to} color={TONE[props.to]} size={SIZE.label} fx={ctx.fx} on={qAll} style={{opacity: 0.4 + 0.6 * qAll}} />
          </>
        ) : null}
      </div>
      {items_}
      {fxEls}
    </div>
  );
};

/** Copy sits inside the union of both layouts (brackets and the type pair included); haze and particles keep out of it. */
const textRect = (p: Props, box: Rect): Rect => {
  const {LA, LB} = geomFor(p, box);
  const x0 = Math.min(LA.bounds.x, LB.bounds.x) - 160;
  const x1 = Math.max(LA.bounds.x + LA.bounds.w, LB.bounds.x + LB.bounds.w) + 160;
  const y0 = Math.max(box.y, Math.min(LA.bounds.y, LB.bounds.y) - 130);
  const y1 = Math.max(LA.bounds.y + LA.bounds.h, LB.bounds.y + LB.bounds.h) + 60;
  return {x: Math.max(box.x, x0), y: y0, w: Math.min(box.x + box.w, x1) - Math.max(box.x, x0), h: y1 - y0};
};

export const CollectionMorph: DcComponent<Props> = {name: 'CollectionMorph', Component: CollectionMorphView, text: true, slot: 'full', textRect};
