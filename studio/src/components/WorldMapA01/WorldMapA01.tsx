// WorldMapA01 (catalog: Structure & flow). The A-01 Holo-City (04 §7 recurring asset; look-dev r3 F7 is the reference frame):
// a 3D glowing metro of the film's seven movements (CH-01: machine, data, systems, platform, domain, AI, evidence) plus the
// Orientation hub in the middle. True 3D geometry projected into SVG (standard tier, no WebGL), key light from the upper right.
//  - Layer anchor: the city rises district by district (towers staggered), the learned `highlights` ignite one after another
//    (ink2 + warm windows), and the `district` being learned ignites last in signal with a light shaft (RV1: first ink on the
//    anchor frame). Dark districts stay present but dim (04 §1.1: the lit thing is the brightest on screen).
//  - route [a, b]: the metro line between two districts draws on (morph, camera ease) with a light head; it carries the signal.
//  - flyTo(district): on its anchor the camera orbits to face that district (camera ease, >= 2 x morph, spans the spoken word when
//    longer) and the district ignites; the previous current district settles to learned. A slow ambient orbit (0.3 deg / s, 04 §2)
//    runs underneath. Never a whole-frame blur: depth comes from fog pools, the far skyline and perspective.
//  - District tags are Latin chips (number + movement name) placed by a collision-aware slot search (below the footprint, above
//    the roofs, left, right) so they never overlap each other or a neighbouring district and stay inside the box. The Arabic
//    movement names are NOT in the frozen props, so the fragment guard forbids setting them (CR-SB-001 asks for a `labels`
//    prop). Unknown slugs are flagged with a crit chip, never guessed.
//  - Aliases: act slugs (ground-zero, python, sql, analytics, craft, big-data, ship, close, hub) point at the movement that lights.
import React from 'react';
import {C, SIZE} from '../../tokens';
import {ease, presetFrames} from '../../type/reveal';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {GlowPath, Lbl, Pool, actionsOf, f24, layerStyle, lerp, makeCam, prog, V3} from '../_struct-b/kit';
import {DISTRICTS, GroundGrid, RING, Skyline, TowerShape, city, districtCenter, districtIndex, makeProjector, mixHex, stateColor, yawOf} from '../_struct-b/city';
import {hex} from '../../fx/look';
import {random} from 'remotion';

type Ctx = DcProps<Props>['ctx'];
type Box = {x0: number; y0: number; x1: number; y1: number};
const hit = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const wrap = (a: number) => {
  let d = a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
const FEATHER = 'radial-gradient(ellipse 72% 70% at 50% 52%, #000 62%, transparent 100%)'; // scene edge falloff: no hard box edge (tags sit outside the mask)
const DEFAULT = 3; // the platform district faces the default camera (look-dev r3)

/** Structural timeline (pure): state events per district, camera legs, the route. */
export const mapTimeline = (p: Props, ctx: Ctx) => {
  const cur0 = districtIndex(p.district);
  const hl = p.highlights.map(districtIndex);
  const morph = presetFrames('morph', ctx.fps, true);
  const evs: {t: number; v: number}[][] = DISTRICTS.map(() => []);
  const unknown: string[] = [];
  if (cur0 === null) unknown.push(p.district);
  hl.forEach((k, i) => {
    if (k === null) unknown.push(p.highlights[i]);
    else evs[k].push({t: ctx.at + f24(3 * i, ctx.fps), v: 1});
  });
  const igniteCur = ctx.at + f24(3 * hl.filter((k) => k !== null).length + 2, ctx.fps);
  if (cur0 !== null) evs[cur0].push({t: igniteCur, v: 2});
  const legs: {t: number; dur: number; from: number; to: number}[] = [{t: -1e9, dur: 1, from: cur0 ?? DEFAULT, to: cur0 ?? DEFAULT}];
  let cur = cur0 ?? DEFAULT;
  for (const a of actionsOf(ctx, 'flyTo')) {
    const k = districtIndex(a.props.district as string);
    if (k === null) {
      unknown.push(a.props.district as string);
      continue;
    }
    for (let j = 0; j < DISTRICTS.length; j++) if (evs[j].length && evs[j][evs[j].length - 1].v === 2 && j !== k) evs[j].push({t: a.at, v: 1});
    evs[k].push({t: a.at, v: 2});
    legs.push({t: a.at, dur: Math.max(2 * morph, a.end - a.at), from: cur, to: k});
    cur = k;
  }
  const ra = p.route ? districtIndex(p.route[0]) : null;
  const rb = p.route ? districtIndex(p.route[1]) : null;
  if (p.route && (ra === null || rb === null)) unknown.push(...p.route.filter((_, i) => (i === 0 ? ra : rb) === null));
  const routeAt = ctx.at + f24(3 * hl.length + 8, ctx.fps);
  return {evs, legs, route: ra !== null && rb !== null ? {a: ra, b: rb, t: routeAt} : null, unknown, cur0, morph};
};

/** State value (0..2) of district k at frame t: each event eases from the value before it (arrive length). */
const stateAt = (tl: ReturnType<typeof mapTimeline>, k: number, t: number, arriveN: number) => {
  const evs = [...tl.evs[k]].sort((a, b) => a.t - b.t);
  let before = 0;
  for (const e of evs) {
    if (t < e.t) break;
    const q = prog(t, e.t, arriveN, ease.arrive);
    if (q < 1) return lerp(before, e.v, q);
    before = e.v;
  }
  return before;
};

export const WorldMapA01View: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const t = ctx.frame;
  const {w, h} = ctx.box;
  const tl = mapTimeline(props, ctx);
  const towers = city();
  const morph = tl.morph;
  const arriveN = presetFrames('arrive', ctx.fps);
  const lblN = presetFrames('label', ctx.fps);
  const k = 1 + ctx.mod.glow;
  // ---- camera: yaw legs (shortest arc, camera ease) + ambient orbit ----
  let yaw = yawOf(tl.legs[0].to);
  for (const leg of tl.legs.slice(1)) {
    if (t < leg.t) break;
    yaw = yawOf(leg.from) + wrap(yawOf(leg.to) - yawOf(leg.from)) * prog(t, leg.t, leg.dur, ease.camera);
  }
  yaw += 0.3 * (Math.PI / 180) * (t / ctx.fps);
  const aspect = w / h;
  const dist = (11.8 / 1.4) * 1.26 * Math.max(1, Math.pow(1.78 / aspect, 0.6)) * (1 - 0.06 * (tl.legs.length > 1 ? prog(t, tl.legs[tl.legs.length - 1].t, tl.legs[tl.legs.length - 1].dur, ease.camera) : 0));
  const camPos = V3(Math.sin(yaw) * dist, 7.6 / 1.4, Math.cos(yaw) * dist);
  const cam = makeCam({pos: [camPos.x, camPos.y, camPos.z], target: [0, 0.45, 0.4]}, w, h);
  const P = makeProjector(cam, w, h);
  // ---- state per district at t ----
  const vs = DISTRICTS.map((_, i) => stateAt(tl, i, t, arriveN));
  const riseOf = (tw: (typeof towers)[number]) => {
    const d = f24(2 * tw.district, ctx.fps) + Math.round(random(`rs${tw.id}`) * f24(6, ctx.fps));
    return prog(t, ctx.at + d, morph + f24(6, ctx.fps), ease.camera);
  };
  const sorted = [...towers].sort((a, b) => camPos.distanceTo(V3(b.x, b.h / 2, b.z)) - camPos.distanceTo(V3(a.x, a.h / 2, a.z)));
  const centers = DISTRICTS.map((_, i) => districtCenter(i));
  const exists = (i: number) => t >= ctx.at + f24(2 * i, ctx.fps);
  // ---- metro ring + route ----
  const curve = (a: number, b: number, n = 28) => {
    const A = centers[a];
    const B = centers[b];
    const M = A.clone().add(B).multiplyScalar(0.5).multiplyScalar(a >= RING || b >= RING ? 1 : 0.72);
    return Array.from({length: n + 1}, (_, i) => {
      const s = i / n;
      const x = (1 - s) * (1 - s) * A.x + 2 * (1 - s) * s * M.x + s * s * B.x;
      const z = (1 - s) * (1 - s) * A.z + 2 * (1 - s) * s * M.z + s * s * B.z;
      return P(V3(x, 0.03, z));
    });
  };
  const dOf = (pp: {x: number; y: number}[]) => pp.map((q, i) => `${i ? 'L' : 'M'} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
  const ring = Array.from({length: RING}, (_, i) => ({a: i, b: (i + 1) % RING, pts: curve(i, (i + 1) % RING)}));
  const rte = tl.route ? {...tl.route, pts: curve(tl.route.a, tl.route.b), q: prog(t, tl.route.t, morph + f24(10, ctx.fps), ease.camera)} : null;
  // ---- tags: first slot that clears the other districts and tags, inside the box ----
  const dBox = (i: number): Box => {
    const ps = towers.filter((x) => x.district === i).flatMap((x) => [0, x.h].flatMap((y) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => P(V3(x.x + (sx * x.w) / 2, y, x.z + (sz * x.d) / 2))))));
    return {x0: Math.min(...ps.map((q) => q.x)), y0: Math.min(...ps.map((q) => q.y)), x1: Math.max(...ps.map((q) => q.x)), y1: Math.max(...ps.map((q) => q.y))};
  };
  const boxes = DISTRICTS.map((_, i) => dBox(i));
  const tagOn = (i: number) => (DISTRICTS[i].hub ? vs[i] > 0.02 : exists(i));
  const tagSize = (i: number) => (vs[i] > 1.5 ? SIZE.label + 4 : SIZE.label);
  const tagText = (i: number) => (DISTRICTS[i].hub ? DISTRICTS[i].name : `${i + 1} ${DISTRICTS[i].name}`);
  const placed: {i: number; box: Box; slot: number}[] = [];
  const edge = 10;
  DISTRICTS.forEach((_, i) => {
    if (!tagOn(i)) return;
    const size = tagSize(i);
    const tw = 44 + size * 0.62 * tagText(i).length;
    const th = size * 1.3 + 12;
    const b = boxes[i];
    const base = towers.filter((x) => x.district === i).flatMap((x) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => P(V3(x.x + (sx * x.w) / 2, 0, x.z + (sz * x.d) / 2)))));
    const cx = (Math.min(...base.map((q) => q.x)) + Math.max(...base.map((q) => q.x))) / 2;
    const foot = Math.max(...base.map((q) => q.y));
    const cand: Box[] = [
      {x0: cx - tw / 2, y0: foot + 10, x1: cx + tw / 2, y1: foot + 10 + th},
      {x0: cx - tw / 2, y0: b.y0 - th - 12, x1: cx + tw / 2, y1: b.y0 - 12},
      {x0: b.x0 - tw - 14, y0: (b.y0 + b.y1) / 2 - th / 2, x1: b.x0 - 14, y1: (b.y0 + b.y1) / 2 + th / 2},
      {x0: b.x1 + 14, y0: (b.y0 + b.y1) / 2 - th / 2, x1: b.x1 + 14 + tw, y1: (b.y0 + b.y1) / 2 + th / 2},
    ];
    const free = (q: Box) => q.x0 > edge && q.x1 < w - edge && q.y0 > edge && q.y1 < h - edge && !boxes.some((o, j) => j !== i && tagOn(j) && hit(q, o)) && !placed.some((o) => hit(q, o.box));
    const slot = Math.max(0, cand.findIndex(free));
    // clamp the fallback slot into the box so a tag never leaves it
    const c = cand[slot];
    const dx = Math.max(edge - c.x0, Math.min(0, w - edge - c.x1));
    const dy = Math.max(edge - c.y0, Math.min(0, h - edge - c.y1));
    placed.push({i, slot, box: {x0: c.x0 + dx, y0: c.y0 + dy, x1: c.x1 + dx, y1: c.y1 + dy}});
  });
  const bornTag = (i: number) => ctx.at + f24(2 * i, ctx.fps) + f24(4, ctx.fps);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: w, height: h, ...layerStyle(ctx, false)}}>
      <div style={{position: 'absolute', inset: 0, WebkitMaskImage: FEATHER, maskImage: FEATHER}}>
      <GroundGrid P={P} w={w} h={h} opacity={0.22 * prog(t, ctx.at, morph, ease.camera)} />
      <Skyline P={P} w={w} h={h} camPos={camPos} opacity={prog(t, ctx.at, morph + f24(6, ctx.fps), ease.camera)} />
      {/* district light pools: the lit thing is the brightest on screen (ADR-003 LK-F) */}
      {centers.map((c, i) => {
        const p = P(c);
        const rr = (2400 / p.d) * (w / 1920);
        return <Pool key={i} x={p.x} y={p.y} r={rr} color={stateColor(vs[i])} a={0.05 + 0.15 * Math.min(1, vs[i]) + 0.2 * Math.max(0, vs[i] - 1)} squash={0.45} />;
      })}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
        {ring.map((r) => {
          const learned = Math.min(vs[r.a], vs[r.b]) > 0.5;
          const d = dOf(r.pts);
          return learned ? <GlowPath key={`${r.a}-${r.b}`} d={d} color={C.ink2} width={3} fx={ctx.fx} k={0.35 * k} opacity={0.75} /> : <path key={`${r.a}-${r.b}`} d={d} fill="none" stroke={C.ink3} strokeWidth={2.5} strokeOpacity={0.4} strokeDasharray="6 10" />;
        })}
        {rte && rte.q > 0 ? <GlowPath d={dOf(rte.pts)} color={C.signal} width={5} fx={ctx.fx} k={1.1 * k} draw={rte.q} /> : null}
        {sorted.map((tw) => (
          <TowerShape key={tw.id} t={tw} P={P} camPos={camPos} v={vs[tw.district]} rise={riseOf(tw)} />
        ))}
        {centers.map((c, i) => {
          if (!exists(i)) return null;
          const p = P(c.clone().setY(0.03));
          const col = stateColor(vs[i]);
          return <circle key={i} cx={p.x} cy={p.y} r={7 + 4 * Math.max(0, vs[i] - 1)} fill={vs[i] > 0.05 ? col : C.void} stroke={col} strokeWidth={2} />;
        })}
        {rte && rte.q > 0 && rte.q < 1 ? (() => {
          const hd = rte.pts[Math.min(rte.pts.length - 1, Math.round(rte.q * (rte.pts.length - 1)))];
          return <circle cx={hd.x} cy={hd.y} r={10} fill={C.white} stroke={C.signal} strokeWidth={4} />;
        })() : null}
      </svg>
      {/* fog planes between the district rows: depth without a whole-frame blur */}
      <Pool x={w * 0.5} y={h * 0.34} r={w * 0.4} color={C.violet} a={0.07} squash={0.18} />
      <Pool x={w * 0.5} y={h * 0.58} r={w * 0.46} color={C.signal} a={0.05} squash={0.2} />
      {/* light shaft over every district in proportion to how current it is */}
      {centers.map((c, i) => {
        const q = Math.max(0, vs[i] - 1);
        if (q < 0.02) return null;
        const foot = P(c.clone().setY(0.03));
        const sw = (150 * (w / 1920)) * (8.4 / foot.d);
        return <div key={`sh${i}`} style={{position: 'absolute', left: foot.x - sw / 2, top: 0, width: sw, height: foot.y, opacity: q, background: `linear-gradient(180deg, transparent 0%, ${C.signal}${hex(ctx.fx.haze * 1.6)} 60%, ${C.signal}${hex(ctx.fx.haze * 2.4)} 100%)`, mixBlendMode: 'screen'}} />;
      })}
      </div>
      {/* leaders for tags that left their footprint slot */}
      <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
        {placed
          .filter((g) => g.slot > 0)
          .map((g) => {
            const st = P(centers[g.i].clone().setY(0.03));
            const ax = Math.min(g.box.x1, Math.max(g.box.x0, st.x));
            const ay = Math.min(g.box.y1, Math.max(g.box.y0, st.y));
            return <line key={g.i} x1={ax} y1={ay} x2={st.x} y2={st.y} stroke={stateColor(vs[g.i])} strokeOpacity={0.6} strokeWidth={1.5} />;
          })}
      </svg>
      {placed.map((g) => {
        const q = prog(t, bornTag(g.i), lblN);
        const col = stateColor(vs[g.i]);
        const cur = vs[g.i] > 1.5;
        return (
          <Lbl
            key={g.i}
            id={`${ctx.id}:d${g.i}`}
            text={tagText(g.i)}
            x={(g.box.x0 + g.box.x1) / 2}
            y={(g.box.y0 + g.box.y1) / 2}
            maxW={g.box.x1 - g.box.x0 - 24}
            size={tagSize(g.i)}
            color={vs[g.i] > 0.5 ? C.ink : C.ink2}
            plate
            accent={cur ? C.signal : mixHex(C.grid, col, Math.min(1, vs[g.i]))}
            fx={ctx.fx}
            opacity={q * (vs[g.i] > 0.05 ? 1 : 0.8)}
            role="code"
          />
        );
      })}
      {tl.unknown.map((s, i) => (
        <Lbl key={`u${i}`} id={`${ctx.id}:u${i}`} text={`? ${s}`} x={w / 2} y={h - 30 - i * 56} maxW={w * 0.6} color={C.crit} plate accent={C.crit} fx={ctx.fx} opacity={prog(t, ctx.at, lblN)} role="code" />
      ))}
    </div>
  );
};

export const WorldMapA01: DcComponent<Props> = {name: 'WorldMapA01', Component: WorldMapA01View, text: true, slot: 'full'};
