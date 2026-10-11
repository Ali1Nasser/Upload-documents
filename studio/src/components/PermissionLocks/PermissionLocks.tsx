// PermissionLocks (catalog: Domain specials). 04 §6 "Linux ops": rwx as a grid of locks (user / group / other x files);
// locks click. Roles are rows (labels on the right, RTL), resources are columns (labels on top). Each cell is a padlock
// whose shackle and tone show the grant level: none = shut, ink3, `---`; read = signal, `r--`; write = ok, `rw-`;
// admin = violet (scope owner), `rwx`. Level tags are mono LTR isolates (component-owned Latin, never Arabic).
// Cells arrive row by row (3 f@24 stagger, label preset, RV1 onset). Actions, anchored to the word that names them:
//   grant {role, resource, level} -> the shackle springs open (impact flash in the level tone), tag rolls to the new level;
//   deny  {role, resource}        -> the shackle snaps shut with a crit flash and a 2 px shake, level -> none.
// Unknown role / resource names in an action are ignored (the props define the grid). DOM + SVG only, same at every tier.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FitText, LockGlyph, Tag, acrylic, actsOf, clamp, ff, flashAt, layerStyle, mix, prog, stateAt, type Ev} from '../_dom-a/kit';

type Level = 'none' | 'read' | 'write' | 'admin';
const TONE: Record<Level, string> = {none: C.ink3, read: C.signal, write: C.ok, admin: C.violet};
const RWX: Record<Level, string> = {none: '---', read: 'r--', write: 'rw-', admin: 'rwx'};
const OPEN: Record<Level, number> = {none: 0, read: 1, write: 1, admin: 1};

export const PermissionLocksView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {roles, resources} = props;
  const box = ctx.box;
  const t = ctx.frame;
  const nr = roles.length;
  const nc = resources.length;
  const headW = Math.round(box.w * 0.24);
  const headH = Math.round(SIZE.body * 2.2);
  const cellW = Math.min(300, (box.w - headW - 40) / nc);
  const cellH = Math.min(190, (box.h - headH) / nr);
  const gridW = cellW * nc;
  const x0 = box.x + (box.w - headW - 40 - gridW) / 2; // grid left
  const xR = x0 + gridW + 40; // role label column left edge
  const y0 = box.y + (box.h - headH - cellH * nr) / 2 + headH;
  // per-cell event timelines
  const ev: Ev<Level>[][] = roles.map((r) => resources.map((s) => [{t: -1e9, s: (props.grants.find((g) => g.role === r && g.resource === s)?.level ?? 'none') as Level}]));
  const deny: number[][][] = roles.map(() => resources.map(() => []));
  for (const a of [...actsOf(ctx, 'grant'), ...actsOf(ctx, 'deny')].sort((p, q) => p.at - q.at || p.li - q.li)) {
    const ri = roles.indexOf(a.props.role as string);
    const ci = resources.indexOf(a.props.resource as string);
    if (ri < 0 || ci < 0) continue;
    ev[ri][ci].push({t: a.at, s: a.name === 'deny' ? 'none' : (a.props.level as Level)});
    if (a.name === 'deny') deny[ri][ci].push(a.at);
  }
  const rtl = [...roles, ...resources].some(isArabic);
  const lock = Math.round(Math.min(cellH * 0.42, cellW * 0.3, 72));
  const tagPx = Math.max(SIZE.labelMin, Math.round(lock * 0.45));
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      {resources.map((s, ci) => {
        const ent = prog(ctx, ctx.at, 'label');
        const cx = x0 + gridW - (ci + 0.5) * cellW; // RTL: first resource next to the role labels
        return (
          <div key={`c${ci}`} style={{position: 'absolute', left: cx - (cellW - 40) / 2, top: y0 - headH, width: cellW - 40, height: headH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ent}}>
            <FitText id={`${ctx.id}:c${ci}`} text={s} size={SIZE.body} maxW={cellW - 40} color={C.ink2} role={isArabic(s) ? 'sentence' : 'code'} weight={isArabic(s) ? FONT.label.strong : undefined} />
          </div>
        );
      })}
      {roles.map((r, ri) => {
        const born = ctx.at + ff(3 * (ri + 1), ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'label');
        const cy = y0 + (ri + 0.5) * cellH;
        return (
          <React.Fragment key={`r${ri}`}>
            <div style={{position: 'absolute', left: xR, top: cy - cellH / 2, width: headW, height: cellH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: ent}}>
              <FitText id={`${ctx.id}:r${ri}`} text={r} size={SIZE.body} maxW={headW} color={C.ink} weight={FONT.label.strong} />
            </div>
            <div style={{position: 'absolute', left: x0, top: cy + cellH / 2 - 1, width: gridW, height: 1, background: `${C.grid}`, opacity: ent}} />
            {resources.map((_, ci) => {
              const st = stateAt(ev[ri][ci], ctx, 'arrive');
              const tone = mix(TONE[st.prev], TONE[st.cur], st.q);
              const open = OPEN[st.prev] + (OPEN[st.cur] - OPEN[st.prev]) * prog(ctx, st.t, 'impact');
              const fl = st.k > 0 ? flashAt(ctx, st.t) : 0;
              const lastDeny = deny[ri][ci].filter((d) => d <= t).pop();
              const shake = lastDeny !== undefined ? interpolate(t - lastDeny, [0, ff(2, ctx.fps), ff(4, ctx.fps), ff(6, ctx.fps)], [0, 2, -2, 0], clamp) : 0;
              const on = (st.cur === 'none' ? 0.25 : 0.8) + fl;
              const cx = x0 + gridW - (ci + 0.5) * cellW;
              const tw = cellW - 24;
              return (
                <div key={ci} style={{position: 'absolute', left: cx - tw / 2, top: cy - cellH / 2 + 10, width: tw, height: cellH - 20, opacity: ent, transform: `translateX(${shake.toFixed(2)}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, ...acrylic(lastDeny !== undefined && fl > 0 ? C.crit : tone, ctx.fx, Math.min(1.4, on), 16)}}>
                  <LockGlyph size={lock} tone={tone} open={open} fx={ctx.fx} on={on} />
                  <Tag id={`${ctx.id}:t${ri}-${ci}`} text={RWX[st.cur]} color={tone} size={tagPx} fx={ctx.fx} on={st.cur === 'none' ? 0 : st.q} style={{background: `${C.void}${hex(0.5)}`}} />
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const PermissionLocks: DcComponent<Props> = {name: 'PermissionLocks', Component: PermissionLocksView, text: true, slot: 'full'};
