// VenvDome (catalog: Domain specials). 04 §6 "Collections & envs": venv = a sealed glass dome; a global install pollutes
// every dome -> isolated venv. 1-3 glass domes (RTL: env 0 on the right) stand on a shared base plate (the interpreter,
// `python` label when given); each holds its package chips (mono). The env name sits under its dome.
// Glass: acrylic rim, specular highlight from the upper right (04 §1.2 key rim light), soft inner haze; no blur filters.
// Actions, anchored to the word that names them (RV1 onset):
//   conflict {package} -> every chip with that name turns crit with a 2 px shake; while the domes are NOT sealed a crit
//                         haze floods all of them (the pollution travels through the open base);
//   isolate            -> a seal ring sweeps up each dome (staggered 3 f@24), rims light ok, the pollution drains; chips that
//                         were in conflict calm to ink inside their own dome (each env keeps its own copy).
// DOM + SVG only; the same code at every tier (glow radii follow the tier tokens).
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {isArabic} from '../../type/arabic';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {FitText, Floor, Place, Tag, actsOf, clamp, emit, ff, flashAt, layerStyle, mix, prog} from '../_dom-a/kit';

export const VenvDomeView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const box = ctx.box;
  const t = ctx.frame;
  const n = props.envs.length;
  const labelH = Math.round(SIZE.body * 1.9);
  const baseH = props.python ? Math.round(SIZE.body * 2) : 22;
  const cell = box.w / n;
  const dw = Math.round(Math.min(cell - 60, 560));
  const dh = Math.round(Math.min(box.h - labelH - baseH - 40, dw * 0.95));
  const floorY = box.y + (box.h - labelH - baseH - dh) / 2 + dh; // dome base line
  const iso = actsOf(ctx, 'isolate');
  const isoAt = iso.length ? iso[0].at : null;
  const conflicts = actsOf(ctx, 'conflict').filter((a) => a.at <= t);
  const conf = conflicts.length ? conflicts[conflicts.length - 1] : null;
  const confPkg = conf ? (conf.props.package as string) : null;
  const rtl = props.envs.some((e) => isArabic(e.name)) || (!!props.python && isArabic(props.python));
  const sealedQ = (i: number) => (isoAt !== null && t >= isoAt + ff(3 * i, ctx.fps) ? prog(ctx, isoAt + ff(3 * i, ctx.fps), 'morph', undefined, true) : 0);
  // pollution: rises on a conflict while unsealed, drains on isolate
  const pol = conf && (isoAt === null || conf.at < isoAt || t < isoAt) ? prog(ctx, conf.at, 'morph', undefined, true) * (isoAt !== null && t >= isoAt ? 1 - prog(ctx, isoAt, 'morph', undefined, true) : 1) : 0;
  const confAfterIso = conf && isoAt !== null && conf.at >= isoAt;
  return (
    <div style={{position: 'absolute', inset: 0, ...layerStyle(ctx, rtl)}}>
      <Floor x={box.x} y={floorY} w={box.w} h={Math.round(box.h * 0.3)} opacity={0.5} />
      {/* shared base plate = the interpreter */}
      <div style={{position: 'absolute', left: box.x + 20, top: floorY, width: box.w - 40, height: baseH, borderRadius: 10, background: `linear-gradient(180deg, ${C.panel}, ${C.ground})`, border: `1px solid ${C.grid}`, boxShadow: `0 0 ${ctx.fx.glowPx}px ${C.crit}${hex(0.5 * pol)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: prog(ctx, ctx.at, 'label')}}>
        {props.python ? <FitText id={`${ctx.id}:py`} text={props.python} size={SIZE.body} maxW={box.w - 80} maxH={baseH} color={C.ink2} role={isArabic(props.python) ? 'sentence' : 'code'} /> : null}
      </div>
      {props.envs.map((e, i) => {
        const born = ctx.at + ff(4 * i, ctx.fps);
        if (t < born) return null;
        const ent = prog(ctx, born, 'arrive');
        const cx = box.x + box.w - (i + 0.5) * cell;
        const sq = sealedQ(i);
        const sealFl = isoAt !== null ? flashAt(ctx, isoAt + ff(3 * i, ctx.fps)) : 0;
        const rim = mix(C.ink2, C.ok, sq);
        const x0 = cx - dw / 2;
        const y0 = floorY - dh;
        const ringY = dh * (1 - sq); // seal ring sweeps up
        const chipCols = e.packages.length > 4 ? 2 : 1;
        const chipW = (dw * 0.66) / chipCols - 12;
        const rows = Math.ceil(e.packages.length / chipCols);
        const chipH = Math.min(68, (dh * 0.5) / Math.max(1, rows));
        const chipTop = y0 + dh * 0.62 - (rows * (chipH + 10)) / 2; // the chip block sits low-centre in the dome
        return (
          <React.Fragment key={i}>
            {/* dome body */}
            <div style={{position: 'absolute', left: x0, top: y0 + (1 - ent) * 30, width: dw, height: dh, opacity: ent, borderRadius: `${dw / 2}px ${dw / 2}px 12px 12px / ${dh * 0.62}px ${dh * 0.62}px 12px 12px`, border: `3px solid ${rim}${hex(0.55 + 0.45 * sq)}`, background: `radial-gradient(ellipse 60% 40% at 72% 16%, ${C.white}${hex(0.16)} 0%, transparent 60%), radial-gradient(ellipse 90% 70% at 50% 85%, ${(pol > 0 ? C.crit : C.signal)}${hex(0.06 + 0.22 * pol)} 0%, transparent 75%), linear-gradient(180deg, ${C.panel}66, ${C.ground}99)`, boxShadow: `inset 0 0 40px ${rim}${hex(0.12 + 0.2 * sq)}, ${emit(rim, ctx.fx, 0.25 + 0.6 * sq + sealFl)}`, overflow: 'hidden'}}>
              {/* specular streak (key light upper right) */}
              <div style={{position: 'absolute', right: dw * 0.14, top: dh * 0.1, width: dw * 0.08, height: dh * 0.42, borderRadius: 999, background: `linear-gradient(180deg, ${C.white}${hex(0.35)}, transparent)`, transform: 'rotate(18deg)'}} />
              {sq > 0 && sq < 1 ? <div style={{position: 'absolute', left: 0, right: 0, top: ringY - 3, height: 6, background: C.ok, boxShadow: emit(C.ok, ctx.fx, 1)}} /> : null}
            </div>
            {/* seal at the base: a lit ring once sealed */}
            <div style={{position: 'absolute', left: x0 - 6, top: floorY - 5, width: dw + 12, height: 10, borderRadius: 5, background: sq > 0 ? C.ok : C.ink3, opacity: ent * (0.35 + 0.65 * sq), boxShadow: sq > 0 ? emit(C.ok, ctx.fx, sq) : undefined}} />
            {e.packages.map((pkg, j) => {
              const cb = born + ff(3 + 2 * j, ctx.fps);
              if (t < cb) return null;
              const ce = prog(ctx, cb, 'label');
              const hit = confPkg !== null && pkg === confPkg;
              const calm = hit && isoAt !== null && t >= isoAt && !confAfterIso ? prog(ctx, isoAt, 'label') : 0;
              const hq = hit && conf ? prog(ctx, conf.at, 'impact') * (1 - calm) : 0;
              const sh = hit && conf ? interpolate(t - conf.at, [0, ff(2, ctx.fps), ff(4, ctx.fps), ff(6, ctx.fps)], [0, 2, -2, 0], clamp) : 0;
              const col = j % chipCols;
              const row = Math.floor(j / chipCols);
              const px = cx + (chipCols === 1 ? 0 : (col - 0.5) * (chipW + 12));
              const py = chipTop + row * (chipH + 10) + chipH / 2;
              return (
                <Place key={j} x={px + sh} y={py} w={chipW} h={chipH} style={{opacity: ce * ent}}>
                  <Tag id={`${ctx.id}:p${i}-${j}`} text={pkg} color={mix(C.ink, C.crit, hq)} size={Math.max(SIZE.secondaryMin, Math.min(SIZE.body, Math.floor((chipW - 24) / (0.62 * (pkg.length + 1)))))} fx={ctx.fx} on={0.3 + 0.7 * hq} />
                </Place>
              );
            })}
            <Place x={cx} y={floorY + baseH + labelH / 2 + 6} w={cell - 40} h={labelH} style={{opacity: ent}}>
              <FitText id={`${ctx.id}:e${i}`} text={e.name} size={SIZE.body} maxW={cell - 40} color={sq > 0.5 ? C.ink : C.ink2} weight={FONT.label.strong} />
            </Place>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const VenvDome: DcComponent<Props> = {name: 'VenvDome', Component: VenvDomeView, text: true, slot: 'full'};
