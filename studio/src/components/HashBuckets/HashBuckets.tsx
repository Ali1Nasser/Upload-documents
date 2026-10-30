// HashBuckets (catalog: Domain specials; 04 section 6 "DSA: array scan vs hash hop"). A violet hash core on the RTL-start side
// (right) turns each key into a bucket index: numeric keys use the true `key mod buckets`, any other key a fixed FNV-1a hash
// mod buckets (deterministic on every host). The buckets are glass bins standing on a floor, in a row to the left of the core
// (bucket 0 nearest the core; two rows above 8 buckets), each with its mono index tile below. A key chip leaves the core's
// port and hops along a lit arc into its bin, landing on top of that bin's chain (a chain grows upwards). A key that lands in
// an occupied bin is a collision: the bin and the chain link flash warn. `props.keys` are inserted one after another from the
// layer anchor; `insert {key}` hops one more key on its anchor word; `collide {bucket}` holds that bin's chain in warn (and
// names it COLLISION when the bins sit in one row). All motion is RV1 (first visible step on the anchor frame). Bucket
// indices are structure, not data claims; keys carry no digits other than the ids given in props. Gradients and glows are SVG.
import React from 'react';
import {interpolate, random} from 'remotion';
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

/** Quadratic arc a -> b through a control point lifted above both ends. */
const hopArc = (a: Pt, b: Pt, liftY: number, n = 28): Pt[] => {
  const c = {x: lerp(a.x, b.x, 0.5), y: liftY};
  return Array.from({length: n + 1}, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return {x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y};
  });
};

export const HashBucketsView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const {box, fps, fx} = ctx;
  const t = ctx.frame;
  const W = box.w;
  const H = box.h;
  const b = props.buckets;
  const lite = fx.id === 'lite';
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
  const mW = Math.min(W * 0.24, 440);
  const R = Math.min(mW * 0.36, H * 0.17);
  const M: Pt = {x: W - mW / 2, y: H * 0.4};
  const port: Pt = {x: M.x - R, y: M.y};
  const regionW = W - mW - W * 0.03;
  const rowsN = b > 8 ? 2 : 1;
  const perRow = Math.ceil(b / rowsN);
  const binPitch = regionW / perRow;
  const binW = binPitch * 0.8;
  const band = H / rowsN;
  const tileH = SIZE.label * 1.5;
  const keyLen = Math.max(4, ...raw.map((r) => r.key.length));
  const keySize = Math.max(SIZE.labelMin, Math.min(SIZE.body, Math.floor((binW * 0.86 - 24) / (keyLen * 0.62))));
  const chipW = Math.min(binW * 0.86, keyLen * keySize * 0.62 + 30);
  const chipH = keySize * 1.5;
  const rowOf = (i: number) => Math.floor(i / perRow);
  const binCx = (i: number) => regionW - binPitch * ((i % perRow) + 0.5); // RTL: bucket 0 nearest the core
  const padB = Math.max(10, chipH * 0.3);
  const pitch0 = chipH + keySize * 0.7;
  const binBot = (i: number) => (rowOf(i) + 1) * band - tileH - band * 0.06;
  // a bin is as tall as its deepest chain needs (plus head room), never the whole band: an empty glass column reads as a table row
  const needH = padB * 2 + chipH + (Math.max(2, maxDepth) - 1 + 0.9) * pitch0;
  const binTop = (i: number) => Math.max(rowOf(i) * band + band * (rowsN === 1 ? 0.16 : 0.08), binBot(i) - needH);
  const binH = (i: number) => binBot(i) - binTop(i);
  const pitch = Math.min(pitch0, maxDepth > 1 ? (binH(0) - padB * 2 - chipH) / (maxDepth - 1) : pitch0);
  const slot = (i: number, k: number): Pt => ({x: binCx(i), y: binBot(i) - padB - chipH / 2 - k * pitch});
  const hopN = presetFrames('morph', fps);
  const ent = prog(ctx, ctx.at, 'label');
  const ff = flashFrames(fps);
  const colls = actsOf(ctx, 'collide');
  const collAt = (bk: number) => colls.find((a) => (a.props.bucket as number) === bk)?.at ?? Infinity;
  const lw = Math.max(2, Math.round(SIZE.label * 0.08));
  // the key the core is working on (the latest hop that has started) and its hop's glow on the core
  const cur = [...items].reverse().find((it) => t >= it.t0);
  const busy = cur ? interpolate(t - cur.t0, [0, ff, hopN + ff * 3], [1, 1, 0], clamp) : 0;
  const pathOf = (it: Item) => hopArc(port, slot(it.bucket, it.pos), Math.max(SIZE.label, Math.min(port.y, slot(it.bucket, it.pos).y) - H * 0.22));
  const binState = (i: number) => {
    const last = [...items].reverse().find((it) => it.bucket === i && t >= it.t0 + hopN - 1);
    const hitT = last ? t - (last.t0 + hopN - 1) : Infinity;
    const coll = last ? last.pos > 0 : false;
    const hotC = t >= collAt(i);
    const col = hotC || (coll && hitT < ff * 8) ? C.warn : last && hitT < ff * 8 ? C.signal : null;
    const pulse = hotC ? 1 : last ? interpolate(hitT, [0, ff * 2, ff * 8], [1, 0.8, 0], clamp) : 0;
    return {col, pulse};
  };
  const MOTES = lite ? 10 : 22;
  return (
    <Stage ctx={ctx}>
      <Svg w={W} h={H}>
        <defs>
          <radialGradient id={`${ctx.id}-core`} cx="42%" cy="38%" r="60%">
            <stop offset="0" stopColor={C.violet} stopOpacity={0.45} />
            <stop offset="0.6" stopColor={C.violet} stopOpacity={0.12} />
            <stop offset="1" stopColor={C.void} stopOpacity={0.6} />
          </radialGradient>
          <radialGradient id={`${ctx.id}-bloom`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={C.violet} stopOpacity={0.3} />
            <stop offset="1" stopColor={C.violet} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${ctx.id}-glass`} x1={0} y1={0} x2={0.3} y2={1}>
            <stop offset="0" stopColor={C.panel} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.ground} stopOpacity={0.75} />
          </linearGradient>
          {[C.signal, C.warn].map((col, k) => (
            <radialGradient key={k} id={`${ctx.id}-pool${k}`} cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor={col} stopOpacity={0.4} />
              <stop offset="1" stopColor={col} stopOpacity={0} />
            </radialGradient>
          ))}
          <radialGradient id={`${ctx.id}-floor`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={C.ink} stopOpacity={0.06} />
            <stop offset="1" stopColor={C.ink} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* dust motes in the air above the bins (seeded) */}
        {Array.from({length: MOTES}, (_, m) => {
          const sp = 0.1 + 0.2 * random(`hb:ms:${ctx.id}:${m}`);
          const x = random(`hb:mx:${ctx.id}:${m}`) * W + Math.sin((t - ctx.at) * 0.02 + m) * 8;
          const y = H - ((random(`hb:my:${ctx.id}:${m}`) * H + (t - ctx.at) * sp) % H);
          const inBin = x < regionW && Array.from({length: b}, (_, i) => i).some((i) => Math.abs(x - binCx(i)) < binW / 2 + 8 && y > binTop(i) - 8 && y < binBot(i) + tileH + 8);
          if (inBin || Math.hypot(x - M.x, y - M.y) < R * 1.4) return null;
          return <circle key={m} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(1 + 2 * random(`hb:mr:${ctx.id}:${m}`)).toFixed(2)} fill={C.signal} opacity={((0.1 + 0.22 * random(`hb:mo:${ctx.id}:${m}`)) * Math.sin((y / H) * Math.PI) * ent).toFixed(3)} />;
        })}
        {/* the hash core: a violet glass disc with a turning ring; it brightens while a key passes through */}
        <g opacity={ent}>
          <ellipse cx={M.x} cy={M.y} rx={R * 1.9} ry={R * 1.9} fill={`url(#${ctx.id}-bloom)`} opacity={(0.6 + 0.4 * busy + ctx.mod.glow * 0.3).toFixed(3)} />
          <ellipse cx={M.x} cy={M.y + R * 1.25} rx={R * 1.1} ry={R * 0.16} fill={`url(#${ctx.id}-floor)`} />
          <circle cx={M.x} cy={M.y} r={R} fill={`url(#${ctx.id}-core)`} stroke={C.violet} strokeWidth={2.5} />
          <circle cx={M.x} cy={M.y} r={R + fx.glowInner * 0.8} fill="none" stroke={C.violet} strokeOpacity={0.18 + 0.3 * busy} strokeWidth={fx.glowInner * 1.2} />
          <circle cx={M.x} cy={M.y} r={R * 0.72} fill="none" stroke={C.violet} strokeOpacity={0.55} strokeWidth={2} strokeDasharray={`${(R * 0.3).toFixed(1)} ${(R * 0.16).toFixed(1)}`} strokeDashoffset={(((t - ctx.at) * R * 0.04 + busy * R * 0.5) % (R * 4.6)).toFixed(1)} />
          <path d={`M${M.x - R * 0.62} ${M.y - R * 0.62} A${R} ${R} 0 0 1 ${M.x + R * 0.75} ${M.y - R * 0.5}`} fill="none" stroke={C.ink} strokeOpacity={0.3} strokeWidth={2} />
          {/* output port */}
          <circle cx={port.x} cy={port.y} r={lw * 3} fill={C.void} stroke={busy > 0 ? C.signal : C.violet} strokeWidth={2} />
        </g>
        {/* the bins: glass cups on the floor; a hit pulses signal, a collision glows warn */}
        {Array.from({length: b}, (_, i) => {
          const e = prog(ctx, ctx.at + f24(i, fps), 'label');
          const {col, pulse} = binState(i);
          const x = binCx(i) - binW / 2;
          const y = binTop(i);
          const h = binH(i);
          const r = Math.min(binW * 0.14, 22);
          const cup = `M${x} ${y} L${x} ${y + h - r} Q${x} ${y + h} ${x + r} ${y + h} L${x + binW - r} ${y + h} Q${x + binW} ${y + h} ${x + binW} ${y + h - r} L${x + binW} ${y}`;
          return (
            <g key={i} opacity={e}>
              <ellipse cx={binCx(i)} cy={y + h + tileH * 0.15} rx={binW * 0.62} ry={tileH * 0.22} fill={col ? `url(#${ctx.id}-pool${col === C.warn ? 1 : 0})` : `url(#${ctx.id}-floor)`} opacity={col ? 0.5 + 0.5 * pulse : 1} />
              <path d={`${cup} Z`} fill={`url(#${ctx.id}-glass)`} />
              {col ? <path d={cup} fill="none" stroke={col} strokeOpacity={0.14 + 0.2 * pulse} strokeWidth={fx.glowInner * 1.4} strokeLinejoin="round" /> : null}
              <path d={cup} fill="none" stroke={col ?? C.ink3} strokeOpacity={col ? 0.95 : 0.55} strokeWidth={2} strokeLinejoin="round" />
              {/* rim light: the cup lip and the right wall catch the key light */}
              <line x1={x - 4} x2={x + binW + 4} y1={y} y2={y} stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
              <line x1={x + binW - 1} x2={x + binW - 1} y1={y + 4} y2={y + h * 0.55} stroke={C.ink} strokeOpacity={0.16} strokeWidth={1.5} />
            </g>
          );
        })}
        {/* hop arcs (fade after landing) and chain links (stay) */}
        {items.map((it, k) => {
          const q = progN(ctx, it.t0, hopN, ease.camera);
          const fade = interpolate(t - it.t0, [0, hopN + ff * 2, hopN + ff * 6], [1, 1, 0], clamp);
          const out: React.ReactNode[] = [];
          if (t >= it.t0 && fade > 0) out.push(<GlowLine key={`h${k}`} pts={partial(pathOf(it), q)} color={it.pos > 0 ? C.warn : C.signal} w={lw} fx={fx} k={0.4} opacity={fade * 0.85} />);
          if (it.pos > 0 && t >= it.t0 + hopN - 1) {
            const here = slot(it.bucket, it.pos);
            const prev = slot(it.bucket, it.pos - 1);
            const pulse = interpolate(t - (it.t0 + hopN - 1), [0, ff * 2, ff * 8], [1.2, 0.8, 0.3], clamp);
            const hot = t >= collAt(it.bucket);
            out.push(<GlowLine key={`l${k}`} pts={[{x: here.x, y: here.y + chipH / 2 + 2}, {x: prev.x, y: prev.y - chipH / 2 - 2}]} color={C.warn} w={lw + 1} fx={fx} k={hot ? 1.1 : pulse} arrow />);
          }
          return <g key={k}>{out}</g>;
        })}
      </Svg>
      {/* hash function label and the current computation, under the core */}
      <At x={M.x} y={M.y + R * 1.25 + SIZE.body * 0.9} style={{opacity: ent}}>
        <FitLabel id={`${ctx.id}:hash`} text={props.hash ?? 'hash(key)'} maxW={mW - 24} size={SIZE.body} color={C.violet} weight={FONT.label.strong} />
      </At>
      <At x={M.x} y={M.y + R * 1.25 + SIZE.body * 2.4} style={{opacity: ent}}>
        {cur ? <Chip id={`${ctx.id}:cur`} text={/^\d{1,15}$/.test(cur.key) ? `${cur.key} mod ${b} = ${cur.bucket}` : `${cur.key} → ${cur.bucket}`} color={C.signal} size={SIZE.label} style={{boxShadow: glowBox(C.signal, fx, 0.25 + 0.4 * busy)}} /> : <div style={{height: SIZE.labelMin * 1.6}} />}
      </At>
      {/* bucket index tiles under the bins */}
      {Array.from({length: b}, (_, i) => {
        const {col} = binState(i);
        const e = prog(ctx, ctx.at + f24(i, fps), 'label');
        return (
          <At key={i} x={binCx(i)} y={binBot(i) + tileH * 0.62} style={{opacity: e}}>
            <Chip id={`${ctx.id}:ix${i}`} text={String(i)} color={col ?? C.ink2} size={SIZE.label} border={col ?? C.grid} fill={col ? `${col}${hex(0.14)}` : C.panel} style={{minWidth: SIZE.label * 1.5, justifyContent: 'center', boxShadow: col ? `${rim(0.2)}, ${glowBox(col, fx, 0.4)}` : rim(0.15)}} />
          </At>
        );
      })}
      {/* keys */}
      {items.map((it, k) => {
        if (t < it.t0) return null;
        const q = progN(ctx, it.t0, hopN, ease.camera);
        const pts = pathOf(it);
        const f = q * (pts.length - 1);
        const j = Math.min(pts.length - 2, Math.floor(f));
        const p = {x: lerp(pts[j].x, pts[j + 1].x, f - j), y: lerp(pts[j].y, pts[j + 1].y, f - j)};
        const hot = t >= collAt(it.bucket);
        const landed = t >= it.t0 + hopN - 1;
        const col = hot ? C.warn : landed ? C.ink : C.signal;
        return (
          <At key={k} x={Math.round(p.x)} y={Math.round(p.y)} style={{opacity: Math.min(1, q * 3 + 0.34)}}>
            <Chip id={`${ctx.id}:k${k}`} text={it.key} color={col} size={keySize} style={{width: chipW, height: chipH, boxSizing: 'border-box', justifyContent: 'center', background: hot ? `${C.warn}${hex(0.14)}` : C.panel, boxShadow: hot ? glowBox(C.warn, fx, 0.4) : landed ? rim(0.2) : glowBox(C.signal, fx, 0.4)}} border={hot ? C.warn : undefined} />
          </At>
        );
      })}
      {rowsN === 1
        ? colls.map((a, k) => {
            const bk = a.props.bucket as number;
            if (bk >= b) return null;
            const e = prog(ctx, a.at, 'label');
            return (
              <At key={k} x={binCx(bk)} y={binTop(bk) - SIZE.label * 1.1} style={{opacity: e}}>
                <Chip id={`${ctx.id}:coll${k}`} text="COLLISION" color={C.warn} size={SIZE.label} border={C.warn} style={{boxShadow: glowBox(C.warn, fx, 0.35)}} />
              </At>
            );
          })
        : null}
    </Stage>
  );
};

/** Text-safe rect: the whole slot (chips and labels are spread over it). */
export const HashBuckets: DcComponent<Props> = {name: 'HashBuckets', Component: HashBucketsView, text: true, slot: 'full'};
