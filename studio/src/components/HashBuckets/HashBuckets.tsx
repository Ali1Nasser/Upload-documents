// HashBuckets (catalog: Domain specials; 04 section 6 "DSA: array scan vs hash hop"). A hash panel on the left (RTL frame:
// the buckets sit on the right) turns each key into a bucket index: numeric keys use the true `key mod buckets`, any other
// key a fixed FNV-1a hash mod buckets (deterministic on every host). A key chip hops from the panel to its bucket along a
// signal line and lands at the head of that bucket's chain (chains grow leftwards, away from the index tile). A key that
// lands in an occupied bucket is a collision: the tile and the link flash warn. `props.keys` are inserted one after another
// from the layer anchor; `insert {key}` hops one more key on its anchor word; `collide {bucket}` highlights that bucket's
// chain in warn (and names it COLLISION when the buckets sit in one column). All motion is RV1 (first visible step on the
// anchor frame). Bucket indices are structure, not data claims; keys carry no digits other than the ids given in props.
import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, SIZE} from '../../tokens';
import {hex} from '../../fx/look';
import {ease, flashFrames, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {At, Chip, FitLabel, GlowLine, Stage, Svg, actsOf, f24, fnv1a, glowBox, lerp, partial, prog, progN, rim, type Pt} from '../_dom-b/kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Bucket of a key: numeric ids use the real modulus, everything else FNV-1a (fixed, seed-free). */
export const bucketOf = (key: string, buckets: number): number => (/^\d{1,15}$/.test(key) ? Number(key) % buckets : fnv1a(key) % buckets);

type Item = {key: string; bucket: number; t0: number; pos: number};

export const HashBucketsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const b = props.buckets;
  // ---------- items in time order, chain positions ----------
  const raw: {key: string; t0: number}[] = [
    ...props.keys.map((key, i) => ({key, t0: ctx.at + f24(8 + 3 * i, fps)})),
    ...actsOf(ctx, 'insert').map((a) => ({key: a.props.key as string, t0: a.at})),
  ].sort((x, y) => x.t0 - y.t0);
  const fill = new Array(b).fill(0);
  const items: Item[] = raw.map((r) => {
    const bucket = bucketOf(r.key, b);
    return {...r, bucket, pos: fill[bucket]++};
  });
  const maxDepth = Math.max(1, ...fill);
  // ---------- layout ----------
  const cols = b > 8 ? 2 : 1;
  const rowsPer = Math.ceil(b / cols);
  const panelW = Math.min(W * 0.24, 430);
  const areaX0 = panelW + W * 0.04;
  const colW = (W - areaX0) / cols;
  const rh = H / rowsPer;
  const keySize = rh >= SIZE.body * 2.6 ? SIZE.body : rh >= SIZE.label * 2.4 ? SIZE.label : SIZE.labelMin;
  const tile = Math.min(rh * 0.7, keySize * 1.8);
  const keyLen = Math.max(4, ...raw.map((r) => r.key.length));
  const chipW = Math.min(keyLen * keySize * 0.62 + 34, colW * 0.4);
  const pitch = Math.min((colW - tile - 24) / maxDepth, chipW + 56);
  const rowCy = (i: number) => (i % rowsPer) * rh + rh / 2;
  const tileCx = (i: number) => W - (Math.floor(i / rowsPer) * colW + tile / 2 + 6);
  const slotCx = (i: number, k: number) => tileCx(i) - tile / 2 - 18 - chipW / 2 - k * pitch;
  const S: Pt = {x: panelW - 6, y: H / 2};
  const hopN = presetFrames('morph', fps);
  const ent = prog(ctx, ctx.at, 'label');
  const ff = flashFrames(fps);
  const colls = actsOf(ctx, 'collide');
  const collAt = (bk: number) => colls.find((a) => (a.props.bucket as number) === bk)?.at ?? Infinity;
  const lw = Math.max(2, Math.round(SIZE.label * 0.08));
  // the key the panel is working on (the latest hop that has started)
  const cur = [...items].reverse().find((it) => t >= it.t0);
  return (
    <Stage ctx={ctx}>
      {/* hash panel */}
      <div style={{position: 'absolute', left: 0, top: H / 2 - H * 0.2, width: panelW, height: H * 0.4, borderRadius: 22, border: `2px solid ${C.violet}${hex(0.8)}`, background: `linear-gradient(160deg, ${C.panel} 0%, ${C.ground} 100%)`, boxShadow: `${rim(0.2)}, ${glowBox(C.violet, fx, 0.35 + ctx.mod.glow)}`, opacity: ent, transform: `translateY(${((1 - ent) * 6).toFixed(2)}px)`}}>
        <At x={panelW / 2} y={H * 0.09}>
          <FitLabel id={`${ctx.id}:hash`} text={props.hash ?? 'hash(key)'} maxW={panelW - 36} color={C.violet} weight={FONT.label.strong} />
        </At>
        <At x={panelW / 2} y={H * 0.26}>
          {cur ? <Chip id={`${ctx.id}:cur`} text={`${cur.key} → ${cur.bucket}`} color={C.signal} size={SIZE.labelMin} /> : <div style={{height: SIZE.labelMin * 1.6}} />}
        </At>
      </div>
      {/* bucket trays: glass troughs with the index tile at the right end; chains grow leftwards */}
      {Array.from({length: b}, (_, i) => {
        const e = prog(ctx, ctx.at + Math.round((i * fps) / 24), 'label');
        const x1 = tileCx(i) + tile / 2 + 10;
        return <div key={i} style={{position: 'absolute', left: x1 - (colW - 14), top: rowCy(i) - rh * 0.4, width: colW - 14, height: rh * 0.8, borderRadius: rh * 0.2, background: `linear-gradient(90deg, ${C.void}${hex(0.35)} 0%, ${C.panel}${hex(0.6)} 100%)`, border: `1px solid ${C.grid}`, boxShadow: rim(0.1), opacity: e}} />;
      })}
      <Svg w={W} h={H}>
        {/* hop lines and chain links */}
        {items.map((it, k) => {
          const to: Pt = {x: slotCx(it.bucket, it.pos), y: rowCy(it.bucket)};
          const q = progN(ctx, it.t0, hopN, ease.camera);
          const fade = interpolate(t - it.t0, [0, hopN + ff * 2, hopN + ff * 6], [1, 1, 0], clamp);
          const out: React.ReactNode[] = [];
          if (t >= it.t0 && fade > 0) out.push(<GlowLine key={`h${k}`} pts={partial([S, {x: lerp(S.x, to.x, 0.5), y: lerp(S.y, to.y, 0.9)}, to], q)} color={it.pos > 0 ? C.warn : C.signal} w={lw} fx={fx} k={0.35} opacity={fade * 0.85} />);
          if (it.pos > 0 && t >= it.t0 + hopN - 1) {
            const prev: Pt = {x: slotCx(it.bucket, it.pos - 1) - chipW / 2, y: rowCy(it.bucket)};
            const here: Pt = {x: slotCx(it.bucket, it.pos) + chipW / 2, y: rowCy(it.bucket)};
            const pulse = interpolate(t - (it.t0 + hopN - 1), [0, ff * 2, ff * 8], [1.2, 0.8, 0.25], clamp);
            const hot = t >= collAt(it.bucket);
            out.push(<GlowLine key={`l${k}`} pts={[prev, here]} color={C.warn} w={lw + 1} fx={fx} k={hot ? 1.1 : pulse} arrow />);
          }
          return <g key={k}>{out}</g>;
        })}
      </Svg>
      {/* bucket index tiles */}
      {Array.from({length: b}, (_, i) => {
        const last = [...items].reverse().find((it) => it.bucket === i && t >= it.t0 + hopN - 1);
        const hitT = last ? t - (last.t0 + hopN - 1) : Infinity;
        const coll = last ? last.pos > 0 : false;
        const hotC = t >= collAt(i);
        const col = hotC || (coll && hitT < ff * 8) ? C.warn : last && hitT < ff * 8 ? C.signal : C.ink3;
        const e = prog(ctx, ctx.at + Math.round((i * fps) / 24), 'label');
        return (
          <div key={i} style={{position: 'absolute', left: tileCx(i) - tile / 2, top: rowCy(i) - tile / 2, width: tile, height: tile, borderRadius: tile * 0.24, border: `2px solid ${col}`, background: `${col === C.ink3 ? C.panel : `${col}${hex(0.16)}`}`, boxShadow: col === C.ink3 ? rim(0.15) : `${rim(0.2)}, ${glowBox(col, fx, 0.45)}`, opacity: e, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Chip id={`${ctx.id}:ix${i}`} text={String(i)} color={col === C.ink3 ? C.ink2 : col} size={Math.min(keySize, Math.round(tile * 0.6))} border="transparent" fill="transparent" style={{padding: 0}} />
          </div>
        );
      })}
      {/* keys */}
      {items.map((it, k) => {
        const to: Pt = {x: slotCx(it.bucket, it.pos), y: rowCy(it.bucket)};
        const q = progN(ctx, it.t0, hopN, ease.camera);
        if (t < it.t0) return null;
        const lift = Math.sin(q * Math.PI) * rh * 0.35;
        const x = lerp(S.x, to.x, q);
        const y = lerp(S.y, to.y, q) - lift;
        const hot = t >= collAt(it.bucket);
        const landed = t >= it.t0 + hopN - 1;
        const col = hot ? C.warn : landed ? C.ink : C.signal;
        return (
          <At key={k} x={x} y={y} style={{opacity: Math.min(1, q * 3 + 0.34)}}>
            <Chip id={`${ctx.id}:k${k}`} text={it.key} color={col} size={keySize} style={{width: chipW, justifyContent: 'center', background: hot ? `${C.warn}${hex(0.14)}` : `${C.panel}`, boxShadow: hot ? glowBox(C.warn, fx, 0.4) : landed ? rim(0.18) : glowBox(C.signal, fx, 0.4)}} border={hot ? C.warn : undefined} />
          </At>
        );
      })}
      {cols === 1
        ? colls.map((a, k) => {
            const bk = a.props.bucket as number;
            if (bk >= b) return null;
            const x = slotCx(bk, fill[bk]) + (fill[bk] > 0 ? 0 : 0) - chipW * 0.2;
            const e = prog(ctx, a.at, 'label');
            return (
              <At key={k} x={x} y={rowCy(bk)} style={{opacity: e}}>
                <Chip id={`${ctx.id}:coll${k}`} text="COLLISION" color={C.warn} size={keySize} border={C.warn} />
              </At>
            );
          })
        : null}
    </Stage>
  );
};

/** Text-safe rect: the whole slot (chips and labels are spread over it). */
export const HashBuckets: DcComponent<Props> = {name: 'HashBuckets', Component: HashBucketsView, text: true, slot: 'full'};
