// KeyBeams (catalog: Domain specials). 04 §6 "Relational model": a key connects on the key word, a beam of light joins the key to
// what it opens. Keys stand on the right (RTL start, 1-4, top to bottom), targets on the left (1-6): each target is an acrylic
// tile with a padlock. A key = key glyph + its label (one whole label) + a Latin kind tag (PUBLIC / PRIVATE / API / SHARED);
// the beam takes the tone of the kind (public signal, private violet = scope boundary, api ember, shared ok).
// Motion (RV1 onset): keys and targets arrive staggered 2 f@24 from the layer anchor, locks shut.
//   unlock {key, to} -> the key flashes and a beam is drawn along a curve from the key to the target over the action word
//                       (at least 14 f@24; the head of the beam has ink on the anchor frame); when it lands the padlock opens,
//                       the tile turns ok with an impact flash. The beam stays lit, dimmed. A target opened by several keys
//                       keeps one lock; an unknown key / target index is ignored.
// DOM + SVG only (no filters on the beam: a wide faint stroke under a narrow bright one), same code at every tier.
import React from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import {ease, revealProgress} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FitText, KeyGlyph, LockGlyph, Place, Tag, acrylic, actsOf, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

type Kind = Props['keys'][number]['kind'];
const KIND_TONE: Record<Kind, string> = {public: C.signal, private: C.violet, api: C.ember, shared: C.ok};

export const keyBeamsLayout = (nk: number, nt: number, box: {x: number; y: number; w: number; h: number}) => {
  const kw = Math.round(Math.min(box.w * 0.34, 560));
  const kh = Math.round(Math.min(150, (box.h - 20) / nk - 18));
  const tw = Math.round(Math.min(box.w * 0.3, 520));
  const th = Math.round(Math.min(130, (box.h - 20) / nt - 14));
  const kx = box.x + box.w - kw; // key tile left edge (RTL start)
  const tx = box.x; // target tile left edge
  const yK = (i: number) => box.y + (box.h * (i + 0.5)) / nk;
  const yT = (j: number) => box.y + (box.h * (j + 0.5)) / nt;
  return {kw, kh, tw, th, kx, tx, yK, yT};
};

export const KeyBeamsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const nk = props.keys.length;
  const nt = props.targets.length;
  const L = keyBeamsLayout(nk, nt, box);
  const unlocks = actsOf(ctx, 'unlock')
    .map((a) => ({a, key: a.props.key as number, to: a.props.to as number}))
    .filter((u) => u.key < nk && u.to < nt);
  const dur = (a: {at: number; end: number}) => Math.max(ff(14, ctx.fps), a.end - a.at);
  const arrive = (u: (typeof unlocks)[number]) => u.a.at + dur(u.a) - 1; // frame the beam head lands (RV1: settles on at + n - 1)
  const rtl = props.keys.some((k) => isArabic(k.label)) || props.targets.some(isArabic);
  const glowK = 1 + ctx.mod.glow;
  const gapX0 = L.kx - 16; // beam start (left edge of the key tiles, minus the tile border)
  const gapX1 = L.tx + L.tw + 16; // beam end (right edge of the target tiles)
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {/* neutral guide rails between the columns */}
      <svg width={box.w} height={box.h} style={{position: 'absolute', left: box.x, top: box.y, overflow: 'visible'}}>
        {unlocks.map((u, ui) => {
          const n = dur(u.a);
          const q = revealProgress(t - u.a.at, n, ease.camera);
          if (t < u.a.at) return null;
          const tone = KIND_TONE[props.keys[u.key].kind];
          const x0 = gapX0 - box.x;
          const y0 = L.yK(u.key) - box.y;
          const x1 = gapX1 - box.x;
          const y1 = L.yT(u.to) - box.y;
          const pts = beamPrefix(x0, y0, x1, y1, q);
          const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          const head = pts[pts.length - 1];
          const done = t >= arrive(u);
          const rest = done ? 0.55 : 1;
          return (
            <g key={ui}>
              <polyline points={line} fill="none" stroke={tone} strokeOpacity={0.18 * rest} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={line} fill="none" stroke={tone} strokeOpacity={0.95 * rest} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              {!done ? <circle cx={head[0]} cy={head[1]} r={9} fill={C.white} stroke={tone} strokeWidth={3} opacity={0.95} /> : null}
            </g>
          );
        })}
      </svg>
      {props.keys.map((k, i) => {
        const born = ctx.at + ff(2 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'arrive');
        const tone = KIND_TONE[k.kind];
        const fl = Math.max(0, ...unlocks.filter((u) => u.key === i).map((u) => flashAt(ctx, u.a.at)));
        const used = unlocks.some((u) => u.key === i && u.a.at <= t);
        const y = L.yK(i);
        const kwLabel = L.kw - 200;
        return (
          <div key={i} style={{position: 'absolute', left: L.kx, top: y - L.kh / 2, width: L.kw, height: L.kh, opacity: ent, transform: `translateX(${((1 - ent) * 28).toFixed(1)}px)`, display: 'flex', alignItems: 'center', gap: 22, padding: '0 26px', ...acrylic(tone, ctx.fx, Math.min(1.5, (used ? 0.9 : 0.45) * glowK + 0.9 * fl), 16)}}>
            <KeyGlyph size={64} tone={tone} fx={ctx.fx} on={used ? 1 : 0.4} />
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, width: kwLabel}}>
              <FitText id={`${ctx.id}:k${i}`} text={k.label} size={SIZE.body} maxW={kwLabel} color={C.ink} weight={FONT.label.strong} role={isArabic(k.label) ? 'sentence' : 'code'} />
              <Tag id={`${ctx.id}:kd${i}`} text={k.kind.toUpperCase()} color={tone} size={SIZE.secondaryMin + 4} fx={ctx.fx} on={used ? 1 : 0} />
            </div>
          </div>
        );
      })}
      {props.targets.map((label, j) => {
        const born = ctx.at + ff(2 * (j + nk), ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'arrive');
        const lands = unlocks.filter((u) => u.to === j).map(arrive);
        const first = lands.length ? Math.min(...lands) : null;
        const open = first !== null && t >= first ? prog(ctx, first, 'impact') : 0;
        const fl = first !== null ? flashAt(ctx, first) : 0;
        const tone = mix(C.ink3, C.ok, open);
        const y = L.yT(j);
        const lw = L.tw - 130;
        return (
          <div key={j} style={{position: 'absolute', left: L.tx, top: y - L.th / 2, width: L.tw, height: L.th, opacity: ent, transform: `translateX(${((ent - 1) * 28).toFixed(1)}px)`, display: 'flex', alignItems: 'center', gap: 20, padding: '0 24px', ...acrylic(tone, ctx.fx, Math.min(1.5, (0.3 + 0.6 * open) * glowK + 0.9 * fl), 16)}}>
            <LockGlyph size={Math.round(L.th * 0.5)} tone={tone} open={open} fx={ctx.fx} on={0.3 + 0.7 * open} />
            <FitText id={`${ctx.id}:t${j}`} text={label} size={SIZE.body} maxW={lw} color={open > 0.5 ? C.ink : C.ink2} weight={FONT.label.strong} role={isArabic(label) ? 'sentence' : 'code'} />
          </div>
        );
      })}
    </div>
  );
};

/** The first fraction q (by arc length) of the S-shaped cubic from (x0,y0) to (x1,y1) as a polyline (48 samples, pure maths). */
export const beamPrefix = (x0: number, y0: number, x1: number, y1: number, q: number): [number, number][] => {
  const mx = (x0 + x1) / 2;
  const N = 48;
  const pt = (u: number): [number, number] => {
    const v = 1 - u;
    return [v * v * v * x0 + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * x1, v * v * v * y0 + 3 * v * v * u * y0 + 3 * v * u * u * y1 + u * u * u * y1];
  };
  const all = Array.from({length: N + 1}, (_, i) => pt(i / N));
  const cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]));
  const target = cum[N] * Math.max(0, Math.min(1, q));
  const out: [number, number][] = [all[0]];
  for (let i = 1; i <= N; i++) {
    if (cum[i] <= target) out.push(all[i]);
    else {
      const f = (target - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      out.push([all[i - 1][0] + (all[i][0] - all[i - 1][0]) * f, all[i - 1][1] + (all[i][1] - all[i - 1][1]) * f]);
      break;
    }
  }
  return out.length > 1 ? out : [all[0], all[0]];
};

export const KeyBeams: DcComponent<Props> = {name: 'KeyBeams', Component: KeyBeamsView, text: true, slot: 'full'};
