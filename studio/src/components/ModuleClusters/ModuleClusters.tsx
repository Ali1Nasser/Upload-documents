// ModuleClusters (catalog: Domain specials; 04 section 6 "Design & refactoring": tangled wires become cohesive module
// clusters). Modules are glass chips inside cluster hulls (RTL: the first cluster on the right); dependencies are arrows
// between chips. A dependency inside a cluster is quiet (ink); one that crosses clusters is warn (the coupling the lesson
// is about). `decouple` (anchored to its word; else shortly after the layer anchor): the cross-cluster dependencies flash
// crit (impact flash), are cut at their middle and retract into the two ends, and the clusters pull apart; the intra-cluster
// dependencies stay. RV1: the first visible step is on the anchor frame. Cluster names and module labels are whole words,
// set by the type engine. No digits.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, flashFrames, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, FitLabel, GlowLine, Stage, Svg, actsOf, arc, f24, glowBox, lerp, partial, prog, progN, rectExit, rim, stag, type Pt} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const HULL = [C.signal, C.violet, C.ink2] as const;

type Cl = {name: string; mods: number[]; cell: {x: number; y: number; w: number; h: number}};

/** Distinct clusters in first-seen order. */
export const clustersOf = (p: Props): string[] => [...new Set(p.modules.map((m) => m.cluster))];

export const ModuleClustersView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const names = clustersOf(props);
  const nc = names.length;
  // ---------- timeline ----------
  const act = actsOf(ctx, 'decouple')[0];
  const tD = act ? act.at : Infinity;
  const ff = flashFrames(fps);
  const tCut = tD + f24(6, fps); // the dependencies flash crit first, then are cut
  const cutQ = progN(ctx, tCut, presetFrames('morph', fps, true), ease.camera);
  const apart = act ? progN(ctx, tCut, presetFrames('morph', fps, true) + f24(6, fps), ease.camera) : 0;
  // ---------- layout: clusters on a grid (RTL: column 0 on the right), pulled apart on decouple ----------
  const cols = nc <= 3 ? nc : Math.ceil(nc / 2);
  const rows = Math.ceil(nc / cols);
  const gap = lerp(44, 104, apart);
  const cw = (W - gap * (cols - 1)) / cols;
  const ch = (H - gap * (rows - 1)) / rows;
  const shrink = lerp(0.97, 0.84, apart);
  const headH = SIZE.label * 1.9;
  const CHIP_H = SIZE.label * 2.9; // chips are objects with a label: tall enough for body-size copy
  const ROW = CHIP_H + 16;
  // chips per hull: the column count that gives the widest chips whose rows still fit the row height
  const colsOf = (m: number, iw: number, ih: number) => {
    let best = {mc: 0, cwid: 0};
    for (let mc = 1; mc <= m; mc++) {
      const mr = Math.ceil(m / mc);
      const cwid = iw / mc - 14;
      if (mr * ROW <= ih && cwid > best.cwid) best = {mc, cwid};
    }
    return best.mc || m;
  };
  const modsOf = (name: string) => props.modules.map((m, i) => (m.cluster === name ? i : -1)).filter((i) => i >= 0);
  // hull height: as tall as the fullest hull needs (never the whole slot: a hull holding two chips must not look empty)
  const mcOf = new Map(names.map((n) => [n, colsOf(modsOf(n).length, cw - 24, ch - headH - 24)] as const));
  const need = Math.max(...names.map((n) => headH + 24 + Math.ceil(modsOf(n).length / (mcOf.get(n) as number)) * ROW));
  const hh = Math.min(ch, need);
  const cl: Cl[] = names.map((name, k) => {
    const col = k % cols;
    const row = Math.floor(k / cols);
    const w = cw * shrink;
    const h = hh * shrink;
    const cx = W - (col * (cw + gap) + cw / 2);
    const cy = row * (ch + gap) + ch / 2;
    return {name, mods: modsOf(name), cell: {x: cx - w / 2, y: cy - h / 2, w, h}};
  });
  const pos: Pt[] = new Array(props.modules.length);
  const size: {w: number; h: number}[] = new Array(props.modules.length);
  cl.forEach((c) => {
    const m = c.mods.length;
    const iw = c.cell.w - 24;
    const ih = c.cell.h - headH - 20;
    const rowH = ih / Math.ceil(m / (mcOf.get(c.name) as number));
    const mc = mcOf.get(c.name) as number;
    const mr = Math.ceil(m / mc);
    const chipW = iw / mc - 14;
    const chipH = Math.min(CHIP_H, rowH - 12);
    c.mods.forEach((mi, j) => {
      const col = j % mc;
      const row = Math.floor(j / mc);
      const rowCount = row === mr - 1 ? m - row * mc : mc; // centre the last row
      const off = ((mc - rowCount) * (chipW + 14)) / 2;
      pos[mi] = {x: c.cell.x + c.cell.w - 12 - 7 - chipW / 2 - col * (chipW + 14) - off, y: c.cell.y + headH + 10 + row * (ih / mr) + ih / mr / 2};
      size[mi] = {w: chipW, h: chipH};
    });
  });
  const idx = (id: string) => props.modules.findIndex((m) => m.id === id);
  const clOf = (i: number) => names.indexOf(props.modules[i].cluster);
  const deps = props.deps
    .map((d, k) => ({k, a: idx(d.from), b: idx(d.to)}))
    .filter((d) => d.a >= 0 && d.b >= 0 && d.a !== d.b)
    .map((d) => ({...d, cross: clOf(d.a) !== clOf(d.b)}));
  const tDep = (k: number) => ctx.at + f24(12 + 1.5 * props.modules.length, fps) + stag(k, fps, 2);
  const lw = Math.max(3, Math.round(SIZE.label * 0.11));
  const ent = prog(ctx, ctx.at, 'label');
  const flashing = t >= tD && t < tCut + ff * 2;
  const flashK = t >= tD ? interpolate(t, [tD, tD + ff, tCut + ff * 2], [0, 1, 0.5], clamp) : 0;
  return (
    <Stage ctx={ctx}>
      {cl.map((c, k) => {
        const col = HULL[k % HULL.length];
        return (
          <div key={c.name} style={{position: 'absolute', left: c.cell.x, top: c.cell.y, width: c.cell.w, height: c.cell.h, borderRadius: 26, border: `2px solid ${col}${hex(0.7)}`, background: `linear-gradient(160deg, ${col}${hex(0.07)} 0%, ${C.void}${hex(0.35)} 100%)`, boxShadow: `${rim(0.14)}, ${glowBox(col, fx, 0.18 + 0.25 * apart)}`, opacity: prog(ctx, ctx.at + stag(k, fps, 3), 'label')}}>
            <div style={{position: 'absolute', right: 20, top: 8}}>
              <FitLabel id={`${ctx.id}:cl${k}`} text={c.name} maxW={c.cell.w - 44} color={col} weight={FONT.label.strong} />
            </div>
          </div>
        );
      })}
      <Svg w={W} h={H}>
        {deps.map((d) => {
          const A = pos[d.a];
          const B = pos[d.b];
          const sa = size[d.a];
          const sb = size[d.b];
          const bow = d.cross ? 0.12 : 0.18;
          const raw = arc(A, B, bow, 20);
          const s = rectExit(A, sa.w / 2 + 6, sa.h / 2 + 6, raw[1].x - A.x, raw[1].y - A.y);
          const e = rectExit(B, sb.w / 2 + 10, sb.h / 2 + 10, raw[raw.length - 2].x - B.x, raw[raw.length - 2].y - B.y);
          const pts = arc(s, e, bow, 24);
          const q = prog(ctx, tDep(d.k), 'arrive');
          if (q <= 0) return null;
          if (!d.cross || !act || t < tCut) {
            const hot = d.cross && act && t >= tD;
            return <GlowLine key={d.k} pts={partial(pts, q)} color={d.cross ? (hot ? C.crit : C.warn) : C.ink3} w={lw} fx={fx} k={d.cross ? 0.5 + (hot ? flashK * 1.4 : 0.2) + ctx.mod.glow : 0.15} arrow />;
          }
          // cut: each half retracts into its own end
          const r = 1 - cutQ;
          const half = (a: Pt[], f: number) => partial(a, f);
          const mid = Math.floor(pts.length / 2);
          const first = pts.slice(0, mid + 1);
          const second = pts.slice(mid).reverse();
          return (
            <g key={d.k} opacity={Math.min(1, r * 1.6)}>
              <GlowLine pts={half(first, 0.5 * r + 0.0001)} color={C.crit} w={lw} fx={fx} k={0.4} />
              <GlowLine pts={half(second, 0.5 * r + 0.0001)} color={C.crit} w={lw} fx={fx} k={0.4} />
            </g>
          );
        })}
      </Svg>
      {props.modules.map((m, i) => {
        const e = prog(ctx, ctx.at + f24(6, fps) + stag(i, fps, 1), 'label');
        const touched = flashing && deps.some((d) => d.cross && (d.a === i || d.b === i));
        const col = HULL[clOf(i) % HULL.length];
        const edge = touched ? C.crit : `${col}${hex(0.85)}`;
        return (
          <div key={m.id} style={{position: 'absolute', left: pos[i].x - size[i].w / 2, top: pos[i].y - size[i].h / 2, width: size[i].w, height: size[i].h, borderRadius: 14, border: `2px solid ${edge}`, background: `linear-gradient(135deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.2)}, ${touched ? glowBox(C.crit, fx, 0.4 * flashK) : `0 10px 24px ${C.void}${hex(0.5)}`}`, opacity: e, transform: `translateY(${((1 - e) * 6).toFixed(2)}px)`}}>
            <At x={size[i].w / 2} y={size[i].h / 2}>
              <FitLabel id={`${ctx.id}:m${i}`} text={m.label} maxW={size[i].w - 20} size={SIZE.body} color={C.ink} weight={FONT.label.weight} />
            </At>
          </div>
        );
      })}
    </Stage>
  );
};

export const ModuleClusters: DcComponent<Props> = {name: 'ModuleClusters', Component: ModuleClustersView, text: true, slot: 'full'};
