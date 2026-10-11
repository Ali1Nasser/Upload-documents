// LegendOrbs (catalog: Domain specials). 04 §6 "Visual language": six coloured lights, each owning one meaning; each light
// pulses as the narrator names it. 2-8 emissive orbs (token colour each) sit on a shallow orbit ellipse seen in perspective
// (RTL: item 0 on the right); a satellite spark circles every orb (seeded phase), labels sit on one baseline under the orbs
// with >= 40 px between them by construction (AT-4). 6-8 items use two rows.
// Motion: orbs arrive staggered 3 f@24 from the layer anchor (RV1 onset); `focus {index}` (anchored to the word that names
// the meaning) -> that orb swells 1.25x with an impact flash, its label turns ink, the others dim to 45 %. Focus holds until
// the next focus. DOM + SVG only (no WebGL): every tier is the same code; glow radii follow the tier tokens.
import React from 'react';
import {interpolate, random} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import {ease} from '../../type/reveal';
import type {Rect} from '../../type/safe';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FitText, Floor, Place, actsOf, clamp, emit, ff, flashAt, layerStyle, prog} from '../_dom-a/kit';

export const orbLayout = (n: number, box: Rect) => {
  const rows = n > 5 ? 2 : 1;
  const perRow = Math.ceil(n / rows);
  const labelH = Math.round(SIZE.body * 1.9);
  const rowH = box.h / rows;
  const cell = box.w / perRow;
  const r = Math.round(Math.min(cell * 0.26, (rowH - labelH) * 0.3, 110));
  const pos = Array.from({length: n}, (_, i) => {
    const row = Math.floor(i / perRow);
    const k = i % perRow;
    const inRow = row === rows - 1 ? n - perRow * (rows - 1) : perRow;
    const off = (perRow - inRow) / 2;
    const x = box.x + box.w - (k + off + 0.5) * cell; // RTL: first item on the right
    const u = inRow > 1 ? (k + off) / (perRow - 1) - 0.5 : 0; // -0.5..0.5 along the orbit
    const y = box.y + row * rowH + (rowH - labelH) / 2 + 4 * r * 0.35 * (0.25 - u * u); // shallow ellipse: centre sits lower
    return {x, y};
  });
  return {pos, r, cell, labelH, rows};
};

export const LegendOrbsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.items.length;
  const L = orbLayout(n, ctx.box);
  const t = ctx.frame;
  const focus = actsOf(ctx, 'focus');
  let cur: {i: number; at: number} | null = null;
  for (const a of focus) if (a.at <= t) cur = {i: a.props.index as number, at: a.at};
  const fq = cur ? prog(ctx, cur.at, 'arrive') : 0;
  const rtl = props.items.some((it) => isArabic(it.label));
  const glowK = 1 + ctx.mod.glow;
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      <Floor x={ctx.box.x} y={L.pos[0].y + L.r * 0.9} w={ctx.box.w} h={Math.round(ctx.box.h * 0.4)} opacity={0.45} />
      {/* orbit ellipse (decorative, neutral) */}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, overflow: 'visible'}}>
        {Array.from({length: L.rows}, (_, row) => {
          const ys = L.pos.filter((_, i) => Math.floor(i / Math.ceil(n / L.rows)) === row).map((p) => p.y);
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2 - ctx.box.y;
          return <ellipse key={row} cx={ctx.box.w / 2} cy={cy} rx={ctx.box.w * 0.47} ry={Math.max(18, L.r * 0.55)} fill="none" stroke={C.ink3} strokeOpacity={0.35} strokeDasharray="2 10" strokeWidth={1.5} />;
        })}
      </svg>
      {props.items.map((it, i) => {
        const born = ctx.at + ff(3 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'arrive');
        const tone = C[it.color];
        const isF = cur !== null && cur.i === i;
        const dim = cur === null ? 1 : isF ? 1 : interpolate(fq, [0, 1], [1, 0.45], clamp);
        const flash = isF && cur ? flashAt(ctx, cur.at) : 0;
        const sc = (isF ? 1 + 0.25 * fq : 1) * (0.7 + 0.3 * ent);
        const {x, y} = L.pos[i];
        const ph = random(`orb-${i}`) * Math.PI * 2;
        const ang = ph + ((t - born) / ff(72, ctx.fps)) * Math.PI * 2; // one satellite turn per 3 s of film frames
        const sx = Math.cos(ang) * L.r * 1.45;
        const sy = Math.sin(ang) * L.r * 0.42;
        const front = Math.sin(ang) > 0;
        const k = (0.9 + 0.8 * flash + (isF ? 0.5 * fq : 0)) * glowK * dim;
        const sat = <div style={{position: 'absolute', left: x + sx - 5, top: y + sy - 5, width: 10, height: 10, borderRadius: '50%', background: C.ink, opacity: 0.7 * ent * dim, boxShadow: emit(tone, ctx.fx, 0.4)}} />;
        return (
          <React.Fragment key={i}>
            {!front ? sat : null}
            <div
              style={{
                position: 'absolute',
                left: x - L.r,
                top: y - L.r,
                width: 2 * L.r,
                height: 2 * L.r,
                borderRadius: '50%',
                opacity: ent * (0.35 + 0.65 * dim),
                transform: `scale(${sc.toFixed(4)})`,
                background: `radial-gradient(circle at 64% 30%, ${C.white}${hex(0.85)} 0%, ${tone} 22%, ${tone}${hex(0.55)} 55%, ${C.void}${hex(0.6)} 100%)`,
                boxShadow: `${emit(tone, ctx.fx, k)}, inset -${Math.round(L.r * 0.25)}px -${Math.round(L.r * 0.3)}px ${Math.round(L.r * 0.5)}px ${C.void}${hex(0.55)}`,
              }}
            />
            {front ? sat : null}
            {/* floor reflection */}
            <div style={{position: 'absolute', left: x - L.r * 1.1, top: y + L.r * 1.05, width: L.r * 2.2, height: L.r * 0.35, borderRadius: '50%', background: `radial-gradient(ellipse, ${tone}${hex(0.4 * ent * dim)} 0%, transparent 70%)`}} />
            <Place x={x} y={y + L.r * 1.3 + L.labelH / 2 + 6} w={L.cell - 40} h={L.labelH} style={{opacity: ent}}>
              <FitText id={`${ctx.id}:o${i}`} text={it.label} size={SIZE.body} maxW={L.cell - 40} color={isF ? C.ink : cur ? C.ink3 : C.ink2} weight={FONT.label.strong} />
            </Place>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const LegendOrbs: DcComponent<Props> = {name: 'LegendOrbs', Component: LegendOrbsView, text: true, slot: 'full'};
