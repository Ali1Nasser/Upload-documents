// r1 additions for the critic's r0 issue 10: (7) A-01 Holo-City, (8) TripleGate portal ignition,
// (9) camera orbit + kinetic Arabic word at the same time (motion test MD; F8/F9 are frames of it).
// 2.5D: true 3D geometry projected with the galaxy camera maths into SVG (standard tier, no WebGL).
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {Backdrop, Bokeh, Burst, Haze, KWord, Mix, Post, Rect, Scrim, TermChip, hex, textSafeMask} from './kit';
import {halo} from './theme';
import {C, EASE, Fx, Typo, glow} from './theme';
import {Cam, makeCamera, project} from './galaxy';
import {COPY} from './content';
import {LEAD_FRAMES, msToFrames} from '../tokens';
import {ArStack} from '../type/ArStack';
import WIN from './data/ch00_gates_window.json';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const pts = (c: THREE.PerspectiveCamera, vs: THREE.Vector3[]) =>
  vs
    .map((v) => project(c, v))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

// ---------- ground grid in perspective (true 3D) ----------
const Ground: React.FC<{c: THREE.PerspectiveCamera; size?: number; step?: number; opacity?: number; color?: string}> = ({c, size = 14, step = 1, opacity = 0.22, color = C.ink3}) => {
  const lines: React.ReactNode[] = [];
  for (let i = -size; i <= size; i += step) {
    const a = project(c, V(i, 0, -size));
    const b = project(c, V(i, 0, size));
    const d = project(c, V(-size, 0, i));
    const e = project(c, V(size, 0, i));
    lines.push(<line key={`x${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />);
    lines.push(<line key={`z${i}`} x1={d.x} y1={d.y} x2={e.x} y2={e.y} />);
  }
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity}}>
      <g stroke={color} strokeWidth={1.2}>
        {lines}
      </g>
    </svg>
  );
};

// ---------- (7) A-01 Holo-City ----------
type Tower = {x: number; z: number; w: number; d: number; h: number; district: number};
const DISTRICTS = 7;
/** Inter Tight cv08 = serifed capital I. Chip 6 `AI` otherwise reads `Al` (sans I/l are the same glyph; ADR-009 B1 fallback
 * names a serifed I). Plex Sans Arabic has no cv08, so Arabic labels are untouched. Promote to tokens via ADR in P7. */
export const TAG_LAT_FEATURES = '"cv08"';
/** District-tag content: number at the RTL start + label. Shared with the isolated OCR probe (TypeProbe `chip`, ADR-009 cond 2). */
export const TagContent: React.FC<{n: number; label: string; typo: Typo; col: string; latFeatures?: string}> = ({n, label, typo, col, latFeatures = TAG_LAT_FEATURES}) => (
  <>
    <bdi dir="ltr" style={{fontFamily: `'${typo.lat}'`, fontWeight: 700, color: col}}>{n}</bdi>
    <Mix text={label} arFont={typo.body} latFont={typo.lat} latWeight={700} latScale={1} style={{fontWeight: 600, fontFeatureSettings: latFeatures}} />
  </>
);
const CUR = 3; // the district being learned now (lit in signal); 0-2 already learned; 4-6 dark
/** r2 (critic r1 #1): district names = canon CH-01 labels_ar, the film's seven movements (order 1..7).
 * r3 fix (arabic r3 B1): district 6 shows the acronym bare (`AI`, Latin per glossary; a noun tag needs no article): `الـAI` at 32 px read `AIJI`. */
const DISTRICT_AR = ['الجهاز', 'الداتا', 'الأنظمة', 'المنصة', 'المجال', 'AI', 'الدليل'];
const districtCenter = (k: number) => {
  const a = (k / DISTRICTS) * Math.PI * 2 - 1.42; // district CUR faces the default camera
  const r = 3.4 + (random(`dr${k}`) - 0.5) * 0.6;
  return V(Math.cos(a) * r * 1.25, 0, Math.sin(a) * r * 0.85);
};
const buildCity = (): Tower[] => {
  const out: Tower[] = [];
  for (let k = 0; k < DISTRICTS; k++) {
    const c = districtCenter(k);
    const n = 7 + Math.floor(random(`dn${k}`) * 5);
    for (let i = 0; i < n; i++) {
      const gx = (i % 3) - 1;
      const gz = Math.floor(i / 3) - 1.5;
      out.push({
        x: c.x + gx * 0.5 + (random(`tx${k}-${i}`) - 0.5) * 0.12,
        z: c.z + gz * 0.5 + (random(`tz${k}-${i}`) - 0.5) * 0.12,
        w: 0.28 + random(`tw${k}-${i}`) * 0.12,
        d: 0.28 + random(`td${k}-${i}`) * 0.12,
        h: 0.25 + random(`th${k}-${i}`) ** 1.6 * (k === CUR ? 2.0 : 1.4),
        district: k,
      });
    }
  }
  return out;
};

const TowerShape: React.FC<{t: Tower; c: THREE.PerspectiveCamera; camPos: THREE.Vector3; fx: Fx; state: 'done' | 'cur' | 'off'}> = ({t, c, camPos, fx, state}) => {
  const x0 = t.x - t.w / 2;
  const x1 = t.x + t.w / 2;
  const z0 = t.z - t.d / 2;
  const z1 = t.z + t.d / 2;
  const faces: {n: THREE.Vector3; v: THREE.Vector3[]; side: boolean}[] = [
    {n: V(0, 0, 1), v: [V(x0, 0, z1), V(x1, 0, z1), V(x1, t.h, z1), V(x0, t.h, z1)], side: true},
    {n: V(0, 0, -1), v: [V(x1, 0, z0), V(x0, 0, z0), V(x0, t.h, z0), V(x1, t.h, z0)], side: true},
    {n: V(1, 0, 0), v: [V(x1, 0, z1), V(x1, 0, z0), V(x1, t.h, z0), V(x1, t.h, z1)], side: true},
    {n: V(-1, 0, 0), v: [V(x0, 0, z0), V(x0, 0, z1), V(x0, t.h, z1), V(x0, t.h, z0)], side: true},
    {n: V(0, 1, 0), v: [V(x0, t.h, z1), V(x1, t.h, z1), V(x1, t.h, z0), V(x0, t.h, z0)], side: false},
  ];
  const col = state === 'cur' ? C.signal : state === 'done' ? C.ink2 : C.ink3;
  const key = V(0.6, 0.5, -0.6).normalize(); // key light from the upper right / back
  return (
    <g>
      {faces.map((f, i) => {
        const fc = f.v.reduce((a, b) => a.clone().add(b), V(0, 0, 0)).multiplyScalar(0.25);
        if (f.n.dot(camPos.clone().sub(fc)) <= 0) return null;
        const lit = Math.max(0, f.n.dot(key));
        if (!f.side) {
          const a = state === 'cur' ? 0.85 : state === 'done' ? 0.4 : 0.12;
          return <polygon key={i} points={pts(c, f.v)} fill={state === 'cur' ? col : `${col}${hex(a)}`} fillOpacity={state === 'cur' ? a : 1} stroke={col} strokeOpacity={state === 'off' ? 0.35 : 0.95} strokeWidth={1.4} />;
        }
        const base = state === 'cur' ? 0.18 + lit * 0.22 : state === 'done' ? 0.1 + lit * 0.12 : 0.05 + lit * 0.08;
        // r2 (critic r1 #1): emissive window grid on every side face (bright when lit, dim but present when dark)
        const [a0, a1, , a3] = f.v; // a0 bottom-left, a1 bottom-right, a3 top-left
        const ux = a1.clone().sub(a0);
        const uy = a3.clone().sub(a0);
        const rows = Math.max(1, Math.floor(t.h / 0.16));
        const wins: React.ReactNode[] = [];
        const wa = state === 'cur' ? 0.9 : state === 'done' ? 0.45 : 0.22;
        const wc = state === 'cur' ? C.signal : state === 'done' ? C.warn : C.ink2;
        for (let r = 0; r < rows; r++)
          for (let q = 0; q < 2; q++) {
            if (random(`win${t.x.toFixed(2)}${t.z.toFixed(2)}${i}${r}${q}`) < (state === 'off' ? 0.55 : 0.3)) continue;
            const u0 = 0.16 + q * 0.42;
            const v0 = (r + 0.3) / rows;
            const v1 = (r + 0.7) / rows;
            const P = (u: number, v: number) => a0.clone().add(ux.clone().multiplyScalar(u)).add(uy.clone().multiplyScalar(v));
            wins.push(<polygon key={`w${r}${q}`} points={pts(c, [P(u0, v0), P(u0 + 0.26, v0), P(u0 + 0.26, v1), P(u0, v1)])} fill={wc} opacity={wa * (0.5 + 0.5 * lit + 0.25)} />);
          }
        return (
          <React.Fragment key={i}>
          <polygon points={pts(c, f.v)} fill={C.ground} />
          <polygon
            points={pts(c, f.v)}
            fill={state === 'off' ? C.panel : `${col}${hex(base)}`}
            style={{mixBlendMode: 'normal'}}
            stroke={col}
            strokeOpacity={state === 'off' ? 0.18 + lit * 0.3 : 0.35 + lit * 0.5}
            strokeWidth={1}
          />
          {wins}
          </React.Fragment>
        );
      })}
    </g>
  );
};

type Box = {x0: number; y0: number; x1: number; y1: number};
const hit = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** Screen bbox of a district (all tower corners, base and roof). */
const districtBox = (c: THREE.PerspectiveCamera, ts: Tower[]): Box => {
  const ps = ts.flatMap((t) => [0, t.h].flatMap((y) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => project(c, V(t.x + (sx * t.w) / 2, y, t.z + (sz * t.d) / 2))))));
  return {x0: Math.min(...ps.map((q) => q.x)), y0: Math.min(...ps.map((q) => q.y)), x1: Math.max(...ps.map((q) => q.x)), y1: Math.max(...ps.map((q) => q.y))};
};
/** r3 (critic r2 #5d): far skyline ring (dim silhouettes beyond the seven districts) so the far plane is not bare grid. */
const SKY = Array.from({length: 110}, (_, i) => {
  const a = (i / 110) * Math.PI * 2 + (random(`ska${i}`) - 0.5) * 0.05;
  const r = 9.4 + random(`skr${i}`) * 2.2;
  return {x: Math.cos(a) * r * 1.2, z: Math.sin(a) * r, w: 0.22 + random(`skw${i}`) * 0.22, h: 0.35 + random(`skh${i}`) ** 1.6 * 1.5};
});
const Skyline: React.FC<{c: THREE.PerspectiveCamera; camPos: THREE.Vector3}> = ({c, camPos}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id="skyfade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.ink3} stopOpacity={0.32} />
        <stop offset="1" stopColor={C.ink3} stopOpacity={0.04} />
      </linearGradient>
    </defs>
    {SKY.filter((b) => camPos.distanceTo(V(b.x, 0, b.z)) > 9).map((b, i) => {
      // camera-facing billboard silhouette (far plane: no side faces needed)
      const right = V(-(camPos.z - b.z), 0, camPos.x - b.x).normalize().multiplyScalar(b.w / 2);
      const v = [V(b.x, 0, b.z).sub(right), V(b.x, 0, b.z).add(right), V(b.x, b.h, b.z).add(right), V(b.x, b.h, b.z).sub(right)];
      const pr = v.map((q) => project(c, q));
      if (pr.some((q) => !q.ok)) return null;
      if (pr[2].y < 0) return null; // keep whole silhouettes only (no slabs cut by the frame edge)
      const P = (u: number, v: number) => ({x: pr[0].x + (pr[1].x - pr[0].x) * u, y: pr[0].y + (pr[3].y - pr[0].y) * v});
      return (
        <g key={i}>
          <polygon points={pr.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} fill="url(#skyfade)" stroke={C.ink3} strokeOpacity={0.2} strokeWidth={1} />
          {[0.25, 0.5, 0.75].map((v) =>
            [0.3, 0.7].map((u) => (random(`skw${i}${u}${v}`) < 0.3 ? <circle key={`${u}${v}`} cx={P(u, v).x} cy={P(u, v).y} r={1.6} fill={random(`skc${i}${v}`) < 0.5 ? C.signal : C.warn} opacity={0.5} /> : null)),
          )}
        </g>
      );
    })}
  </svg>
);

export const HoloCity: React.FC<{typo: Typo; fx: Fx; orbit?: number}> = ({typo, fx, orbit}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const towers = useMemo(buildCity, []);
  const ang = orbit ?? 0.3 + (frame / fps) * ((0.3 * Math.PI) / 180); // 0.3°/s ambient orbit (04 §2)
  const dist = 11.8 / 1.4; // r2 (critic r1 #1): camera pushed 1.4x so the seven districts fill the frame
  const cam: Cam = {pos: [Math.sin(ang) * dist, 7.6 / 1.4, Math.cos(ang) * dist], target: [0, 0.2, 0.5]};
  const c = makeCamera(cam);
  const camPos = V(...cam.pos);
  const sorted = [...towers].sort((a, b) => camPos.distanceTo(V(b.x, b.h / 2, b.z)) - camPos.distanceTo(V(a.x, a.h / 2, a.z)));
  const centers = Array.from({length: DISTRICTS}, (_, k) => districtCenter(k));
  // metro routes: ring order; 0→1→2→3 learned, 2→3 drawing now, the rest future
  const routes = centers.map((a, k) => ({a, b: centers[(k + 1) % DISTRICTS], k}));
  const cur = project(c, centers[CUR].clone().setY(2.4));
  const TITLE: Rect = {x: 1100, y: 60, w: 700, h: 150};
  // r3: screen boxes of every district, the Kafka chip over district 4, then collision-aware tag slots
  const dBox = centers.map((_, k) => districtBox(c, towers.filter((t) => t.district === k)));
  // the route being drawn now (district 3 -> 4) carries the act's term: the chip hangs from the route's midpoint
  const nowR = routes[CUR - 1];
  const nowMid = nowR.a.clone().add(nowR.b).multiplyScalar(0.5).multiplyScalar(0.72);
  const rp = [nowR.a, nowMid, nowR.b].map((v) => project(c, v.clone().setY(0.02)));
  const roof = {x: 0.25 * rp[0].x + 0.5 * rp[1].x + 0.25 * rp[2].x, y: 0.25 * rp[0].y + 0.5 * rp[1].y + 0.25 * rp[2].y}; // Bezier t = 0.5
  const kafka = {x: roof.x - 75, y: roof.y + 34, w: 150, h: 58};
  const obstacles: Box[] = [{x0: TITLE.x - 200, y0: TITLE.y, x1: TITLE.x + TITLE.w, y1: TITLE.y + TITLE.h}, {x0: kafka.x, y0: kafka.y, x1: kafka.x + kafka.w, y1: kafka.y + kafka.h}];
  const tags: {k: number; box: Box; size: number; slot: number}[] = [];
  centers.forEach((_, k) => {
    const size = k === CUR ? 36 : 32;
    const label = DISTRICT_AR[k];
    const tw = 34 + size * (0.62 * label.length + 1.1);
    const th = size * 1.3 + 10;
    const b = dBox[k];
    const base = towers.filter((t) => t.district === k).flatMap((t) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => project(c, V(t.x + (sx * t.w) / 2, 0, t.z + (sz * t.d) / 2)))));
    const cx = (Math.min(...base.map((q) => q.x)) + Math.max(...base.map((q) => q.x))) / 2;
    const foot = Math.max(...base.map((q) => q.y));
    const cand: Box[] = [
      {x0: cx - tw / 2, y0: foot + 10, x1: cx + tw / 2, y1: foot + 10 + th},
      {x0: cx - tw / 2, y0: b.y0 - th - 12, x1: cx + tw / 2, y1: b.y0 - 12},
      {x0: b.x0 - tw - 14, y0: (b.y0 + b.y1) / 2 - th / 2, x1: b.x0 - 14, y1: (b.y0 + b.y1) / 2 + th / 2},
      {x0: b.x1 + 14, y0: (b.y0 + b.y1) / 2 - th / 2, x1: b.x1 + 14 + tw, y1: (b.y0 + b.y1) / 2 + th / 2},
    ];
    const free = (q: Box) => q.x0 > 40 && q.x1 < 1880 && q.y0 > 40 && q.y1 < 1040 && !dBox.some((o, j) => j !== k && hit(q, o)) && !obstacles.some((o) => hit(q, o)) && !tags.some((t) => hit(q, t.box));
    const slot = Math.max(0, cand.findIndex(free));
    tags.push({k, box: cand[slot], size, slot});
  });
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <AbsoluteFill style={{filter: `blur(${fx.dofBlurPx * 0.5}px)`}}>
        <Ground c={c} />
      </AbsoluteFill>
      <Skyline c={c} camPos={camPos} />
      <Haze fx={fx} y={250} h={300} k={1.2} tint={C.violet} />
      <Haze fx={fx} y={430} h={380} k={1.6} />
      {/* district light pools */}
      {centers.map((v, k) => {
        const p = project(c, v);
        const r = 2400 / p.d;
        const col = k === CUR ? C.signal : k < CUR ? C.ink2 : C.ink3;
        const a = k === CUR ? 0.34 : k < CUR ? 0.12 : 0.05;
        return <div key={k} style={{position: 'absolute', left: p.x - r, top: p.y - r * 0.45, width: r * 2, height: r * 0.9, borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${col}${hex(a)} 0%, transparent 70%)`}} />;
      })}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {routes.map((r) => {
          const mid = r.a.clone().add(r.b).multiplyScalar(0.5).multiplyScalar(0.72);
          const p = [r.a, mid, r.b].map((v) => project(c, v.clone().setY(0.02)));
          const d = `M ${p[0].x} ${p[0].y} Q ${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y}`;
          const learned = r.k < CUR - 1;
          const now = r.k === CUR - 1;
          return (
            <g key={r.k}>
              {now || learned ? <path d={d} fill="none" stroke={now ? C.signal : C.ink2} strokeWidth={now ? 20 : 6} opacity={now ? 0.5 : 0.15} style={{filter: `blur(${fx.glowInner * 0.8}px)`}} /> : null}
              <path d={d} fill="none" stroke={now ? C.signal : learned ? C.ink2 : C.ink3} strokeWidth={now ? 4 : 2.5} strokeOpacity={now ? 1 : learned ? 0.7 : 0.35} strokeDasharray={now || learned ? undefined : '6 10'} />
            </g>
          );
        })}
        {sorted.map((t, i) => (
          <TowerShape key={i} t={t} c={c} camPos={camPos} fx={fx} state={t.district === CUR ? 'cur' : t.district < CUR ? 'done' : 'off'} />
        ))}
        {/* station nodes */}
        {centers.map((v, k) => {
          const p = project(c, v.clone().setY(0.02));
          const col = k === CUR ? C.signal : k < CUR ? C.ink2 : C.ink3;
          return <circle key={k} cx={p.x} cy={p.y} r={k === CUR ? 11 : 7} fill={k <= CUR ? col : C.void} stroke={col} strokeWidth={2} style={k === CUR ? {filter: `drop-shadow(0 0 ${fx.glowPx * 0.6}px ${C.signal})`} : undefined} />;
        })}
      </svg>
      {/* r2: fog planes between the district rows (depth separation) */}
      <Haze fx={fx} y={330} h={200} k={1.1} />
      <Haze fx={fx} y={560} h={180} k={0.8} tint={C.violet} />
      <Haze fx={fx} y={820} h={260} k={0.7} />
      {/* r3 (critic r2 #5a/#5b, arabic r2 J1): tags try below the footprint, then above the roofs, then left/right, and take
          the first slot that clears every other district, the title and the Kafka chip; 32 px (36 px on the lit district) */}
      {/* r3: a tag moved off its footprint slot hangs from its district's station by a thin leader */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {tags
          .filter((g) => g.slot > 0)
          .map((g) => {
            const st = project(c, centers[g.k].clone().setY(0.02));
            const ax = Math.min(g.box.x1, Math.max(g.box.x0, st.x));
            const ay = Math.min(g.box.y1, Math.max(g.box.y0, st.y));
            return <line key={g.k} x1={ax} y1={ay} x2={st.x} y2={st.y} stroke={g.k <= CUR ? C.ink2 : C.ink3} strokeOpacity={0.6} strokeWidth={1.5} />;
          })}
      </svg>
      {tags.map((g) => {
        const col = g.k === CUR ? C.signal : g.k < CUR ? C.ink2 : C.ink3;
        return (
          <div key={`tag${g.k}`} dir="rtl" lang="ar" style={{position: 'absolute', left: g.box.x0, top: g.box.y0, width: g.box.x1 - g.box.x0, height: g.box.y1 - g.box.y0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 999, background: 'rgba(13,17,23,0.84)', border: `1.5px solid ${col}${g.k === CUR ? 'FF' : '88'}`, boxShadow: g.k === CUR ? `0 0 ${fx.glowPx * 0.7}px ${C.signal}88` : undefined, whiteSpace: 'nowrap', fontFamily: `'${typo.body}'`, fontWeight: 600, fontSize: g.size, lineHeight: 1.3, color: g.k <= CUR ? C.ink : C.ink2, textShadow: halo}}>
            <TagContent n={g.k + 1} label={DISTRICT_AR[g.k]} typo={typo} col={col} />
          </div>
        );
      })}
      {/* light shaft over the lit district */}
      <div style={{position: 'absolute', left: cur.x - 90, top: 0, width: 180, height: cur.y + 120, background: `linear-gradient(180deg, transparent 0%, ${C.signal}${hex(fx.haze * 1.6)} 70%, ${C.signal}${hex(fx.haze * 2.4)} 100%)`, filter: 'blur(14px)', mixBlendMode: 'screen'}} />
      {/* r3 (critic r2 #5b): Kafka chip anchored on the glowing route into district 4 (a station pin + short leader) */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <line x1={roof.x} y1={roof.y} x2={kafka.x + kafka.w / 2} y2={kafka.y} stroke={C.signal} strokeWidth={2} strokeOpacity={0.85} />
        <circle cx={roof.x} cy={roof.y} r={7} fill={C.white} stroke={C.signal} strokeWidth={3} />
      </svg>
      <TermChip term="Kafka" typo={typo} fx={fx} style={{left: kafka.x, top: kafka.y}} size={34} />
      <Scrim r={TITLE} strength={0.6} />
      <div style={{position: 'absolute', right: 120, top: 60}}>
        <KWord text={COPY.f7Title} at={-1000} typo={typo} fx={fx} size={104} preset="impact" />
      </div>
      <Bokeh fx={fx} seed="f7" drift={frame * 0.4} />
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

// ---------- (8)/(9) TripleGate: three portals ignite on S1 words; camera orbits; kinetic phrase lands ----------
type WordRec = {word_id: string; text: string; start_ms: number; end_ms: number};
const WORDS = WIN.words as WordRec[];
const wordAt = (n: number): WordRec => {
  const id = `w:S1:ar-natural:${String(n).padStart(6, '0')}`;
  const w = WORDS.find((x) => x.word_id === id);
  if (!w) throw new Error(`word ${id} not in window map`);
  return w;
};
export const GATES_FRAMES = Math.round(((WIN.window.end_ms - WIN.window.start_ms) / 1000) * 24);
/** Ignition anchors (word ids) per gate, in narration order: تجيب / تثق / تجاوب. Phrase: دي / الشغلانة / كلها. */
const GATE_WORDS = [36, 42, 45];
const GATE_R = 1.15 * 1.3;
const GATE_CY = 2.0;
const PHRASE_WORDS = [48, 49, 50];

const Ring: React.FC<{c: THREE.PerspectiveCamera; cx: number; cy: number; r: number; prog: number; col: string; fx: Fx; lit: number; idle: number; beat: number}> = ({c, cx, cy, r, prog, col, fx, lit, idle, beat}) => {
  const N = 72;
  const ringAt = (sy: number) =>
    Array.from({length: N + 1}, (_, i) => {
      const a = Math.PI / 2 - (i / N) * Math.PI * 2; // starts at the top, runs clockwise
      return project(c, V(cx + Math.cos(a) * r, sy * (cy + Math.sin(a) * r), 0));
    });
  const P = ringAt(1);
  const R = ringAt(-1); // r3 (critic r2 #4): mirror image under the floor plane y = 0
  const path = (pp: {x: number; y: number}[]) => pp.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const d = path(P);
  const ctr = project(c, V(cx, cy, 0));
  const rctr = project(c, V(cx, -cy, 0));
  const rx = Math.max(...P.map((p) => Math.abs(p.x - ctr.x)));
  const ry = Math.max(...P.map((p) => Math.abs(p.y - ctr.y)));
  const floor = project(c, V(cx, 0, 0));
  const id = col.slice(1);
  const glowK = 1 + beat * 0.8;
  // r3 perf: no CSS/SVG blur filters here; glow = stacked low-alpha strokes and gradient fills
  return (
    <g>
      {/* reflection on the floor: ring + portal, mirrored, dim */}
      <g opacity={0.1 + 0.3 * lit + 0.1 * idle}>
        <ellipse cx={rctr.x} cy={rctr.y} rx={rx * 0.96} ry={ry * 0.96} fill={`url(#portal-${id})`} opacity={0.5 * lit} />
        <path d={path(R)} fill="none" stroke={prog > 0.99 ? col : C.ink2} strokeWidth={10} strokeOpacity={0.25} />
        <path d={path(R)} fill="none" stroke={prog > 0.99 ? col : C.ink2} strokeWidth={3} />
      </g>
      {/* floor contact pool */}
      <ellipse cx={floor.x} cy={floor.y} rx={rx * 1.35} ry={Math.max(14, ry * 0.2)} fill={`url(#pool-${id})`} opacity={0.35 + 0.65 * lit} />
      {/* vertical light cone from above: core + wide soft skirt (two gradient polygons, no blur) */}
      {[1.0, 1.45].map((w, j) => {
        const top = [project(c, V(cx - 0.25 * w, cy + r + 4.5, 0)), project(c, V(cx + 0.25 * w, cy + r + 4.5, 0))];
        const bot = [project(c, V(cx + r * 1.15 * w, 0, 0)), project(c, V(cx - r * 1.15 * w, 0, 0))];
        return <polygon key={j} points={[...top, ...bot].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill={`url(#cone-${id})`} opacity={(0.45 + 0.55 * lit) * (j ? 0.4 : 0.7)} style={{mixBlendMode: 'screen'}} />;
      })}
      {/* portal surface */}
      <ellipse cx={ctr.x} cy={ctr.y} rx={rx * 0.96} ry={ry * 0.96} fill={`url(#portal-${id})`} opacity={Math.min(1, lit + beat * 0.5)} />
      {/* dormant ring (standby breathing before ignition) + inner rings (portal depth) */}
      <path d={d} fill="none" stroke={C.ink2} strokeOpacity={0.12 * idle} strokeWidth={16} />
      <path d={d} fill="none" stroke={C.ink2} strokeOpacity={0.3 + 0.25 * idle} strokeWidth={3} />
      <ellipse cx={ctr.x} cy={ctr.y} rx={rx * 0.72} ry={ry * 0.72} fill="none" stroke={prog > 0.99 ? col : C.ink2} strokeOpacity={0.3 + 0.5 * lit} strokeWidth={2} strokeDasharray="14 10" />
      <ellipse cx={ctr.x} cy={ctr.y} rx={rx * 0.5} ry={ry * 0.5} fill="none" stroke={prog > 0.99 ? col : C.ink2} strokeOpacity={0.15 + 0.35 * lit} strokeWidth={1.2} />
      {/* igniting / lit ring: path-draw with a stacked-stroke glow */}
      {prog > 0 ? (
        <>
          <path d={d} fill="none" stroke={col} strokeWidth={34 * glowK} opacity={0.1} pathLength={1} strokeDasharray={`${prog} 1`} />
          <path d={d} fill="none" stroke={col} strokeWidth={18 * glowK} opacity={0.2} pathLength={1} strokeDasharray={`${prog} 1`} />
          <path d={d} fill="none" stroke={col} strokeWidth={6} pathLength={1} strokeDasharray={`${prog} 1`} />
          <path d={d} fill="none" stroke={C.white} strokeWidth={2} opacity={0.8} pathLength={1} strokeDasharray={`${prog} 1`} />
          {prog < 0.999 ? (
            <g>
              <circle cx={P[Math.round(prog * N)].x} cy={P[Math.round(prog * N)].y} r={30} fill={`url(#spark-${id})`} />
              <circle cx={P[Math.round(prog * N)].x} cy={P[Math.round(prog * N)].y} r={7} fill={C.white} />
            </g>
          ) : null}
        </>
      ) : null}
    </g>
  );
};

/** Carry-over line (S1 w:000027-000033, spoken 19.4-21.4 s, just before the window): the ghost title from f0. */
const CARRY = (WIN as unknown as {carry_over: {words: WordRec[]}}).carry_over.words;

export const GatesOrbit: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const on = (n: number) => msToFrames(wordAt(n).start_ms - WIN.window.start_ms, fps) - Math.round((LEAD_FRAMES.kinetic * fps) / 24);
  const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  // camera: slow push + orbit through the whole shot (0.6 rad over 12 s ≈ 2.9°/s: a deliberate move, not ambient)
  const k = interpolate(frame, [0, durationInFrames - 1], [0, 1], {easing: EASE.camera});
  // r2 (critic r1 #4): the camera is already yawed from f0 (rings read as ellipses), gates 1.3x, row centred at 50 % height
  // the yaw never crosses 0 (a front-on pass made the rings read as flat circles at the F8 frame)
  const ang = interpolate(k, [0, 1], [-0.78, -0.3]);
  const dist = interpolate(k, [0, 1], [13.6, 10.8]);
  // target shifted 0.8 toward -x so the near (left) gate keeps >= 80 px from the frame edge under the yaw
  const tgt: [number, number, number] = [-0.8, GATE_CY, 0];
  const impact = on(PHRASE_WORDS[2]);
  const nudge = frame === impact ? 3 : frame === impact + 1 ? -2 : 0; // 04 §3.5 one-frame camera nudge
  const cam: Cam = {pos: [tgt[0] + Math.sin(ang) * dist, GATE_CY + 0.9 + 0.5 * (1 - k), Math.cos(ang) * dist], target: tgt};
  const c = makeCamera(cam);
  const gx = [4.7, 0, -4.7]; // RTL: the first move sits on the right
  const prog = GATE_WORDS.map((w) => interpolate(frame, [on(w), on(w) + msToFrames(420, fps)], [0, 1], {...cl, easing: EASE.arrive}));
  const lit = GATE_WORDS.map((w, i) => {
    const a = interpolate(frame, [on(w) + msToFrames(300, fps), on(w) + msToFrames(700, fps)], [0, 1], cl);
    const next = GATE_WORDS[i + 1];
    const handoff = next ? interpolate(frame, [on(next), on(next) + msToFrames(500, fps)], [0, 1], cl) : 0;
    return {a, done: handoff};
  });
  const colOf = (i: number) => (lit[i].done > 0.5 ? C.ok : C.signal);
  // r3 (critic r2 #6): dormant gates breathe from f0 (standby), so the opening is not three ghost rings
  const idle = (i: number) => (1 - prog[i]) * (0.55 + 0.45 * Math.sin(frame / 9 + i * 1.7));
  // r3 secondary beat on كلها: every gate flares for ~8 frames as the impact word lands
  const beat = interpolate(frame - impact, [0, 2, 9], [0, 1, 0], cl);
  // receipt particles stream through the lit gates (seeded; 160 sprites, no per-sprite filter)
  const streams = Array.from({length: 160}, (_, i) => {
    const sp = 0.6 + random(`ps${i}`) * 0.8;
    const t = ((frame / fps) * sp * 0.22 + random(`po${i}`)) % 1;
    const x = 6 - t * 12;
    const y = GATE_CY + (random(`py${i}`) - 0.5) * 2.0;
    const z = (random(`pz${i}`) - 0.5) * 1.2;
    const passed = GATE_WORDS.filter((_, g) => x < gx[g] && prog[g] > 0.99).length;
    const reach = gx.findIndex((g, j) => x < g + 0.2 && prog[j] < 0.99);
    if (reach >= 0 && x < gx[reach]) return null; // blocked before an unlit gate
    return {p: project(c, V(x, y, z)), passed, i};
  });
  // r3 (critic r2 #4): 4 bright packets travel gate to gate; the open range ends at the first unlit gate and extends
  // smoothly as each gate ignites (packets queue at a dark gate, then are released through it)
  const ends = [gx[0] + 0.45, gx[1] + 0.45, gx[2] + 0.45, -7];
  const endX = ends[0] + prog.reduce((acc, p, i) => acc + (ends[i + 1] - ends[i]) * p, 0);
  const packets = Array.from({length: 4}, (_, i) => {
    const y = GATE_CY + [-0.35, 0.2, -0.05, 0.42][i];
    const at = (f: number) => {
      const t = ((f / fps) / 2.4 + i / 4) % 1;
      return 7 - t * (7 - endX);
    };
    const x = at(frame);
    const passed = gx.filter((g, j) => x < g && prog[j] > 0.99).length;
    const trail = [1, 2, 3, 4, 5].map((d) => at(frame - d * 1.5)).filter((tx) => tx > x && tx - x < 2.2);
    return {x, y, passed, trail, a: interpolate(x, [endX, endX + 0.6, 6.2, 7], [0.25, 1, 1, 0], cl)};
  });
  const labels = GATE_WORDS.map((w, i) => {
    const p = project(c, V(gx[i], GATE_CY - GATE_R - 0.32, 0));
    const bottom = project(c, V(gx[i], GATE_CY - GATE_R, 0));
    return {p, bottom, at: on(w)};
  });
  const labelRects: Rect[] = labels.map((l) => ({x: l.p.x - 220, y: l.p.y, w: 440, h: 96}));
  const TITLE: Rect = {x: 1000, y: 60, w: 800, h: 150};
  const phraseOn = frame >= on(PHRASE_WORDS[0]) - 2;
  const carryOut = on(PHRASE_WORDS[0]) - 6;
  const carryOp = interpolate(frame, [0, 30, carryOut, carryOut + 5], [0.9, 0.5, 0.5, 0], cl);
  return (
    <AbsoluteFill style={nudge ? {transform: `translateX(${nudge}px)`} : undefined}>
      <Backdrop fx={fx} />
      <Ground c={c} size={7} opacity={0.13} />
      <Haze fx={fx} y={560} h={520} k={1.5} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          {[C.signal, C.ok].map((col) => (
            <React.Fragment key={col}>
              <linearGradient id={`cone-${col.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={col} stopOpacity={0.04} />
                <stop offset="0.5" stopColor={col} stopOpacity={0.12} />
                <stop offset="1" stopColor={col} stopOpacity={0.3} />
              </linearGradient>
              <radialGradient id={`portal-${col.slice(1)}`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor={col} stopOpacity={0.55} />
                <stop offset="0.6" stopColor={col} stopOpacity={0.16} />
                <stop offset="1" stopColor={col} stopOpacity={0.05} />
              </radialGradient>
              <radialGradient id={`pool-${col.slice(1)}`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor={col} stopOpacity={0.5} />
                <stop offset="0.5" stopColor={col} stopOpacity={0.16} />
                <stop offset="1" stopColor={col} stopOpacity={0} />
              </radialGradient>
              <radialGradient id={`spark-${col.slice(1)}`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor={C.white} stopOpacity={0.9} />
                <stop offset="0.3" stopColor={col} stopOpacity={0.55} />
                <stop offset="1" stopColor={col} stopOpacity={0} />
              </radialGradient>
            </React.Fragment>
          ))}
        </defs>
        {gx.map((x, i) => (
          <Ring key={i} c={c} cx={x} cy={GATE_CY} r={GATE_R} prog={prog[i]} col={colOf(i)} fx={fx} lit={lit[i].a * (1 - 0.35 * lit[i].done)} idle={idle(i)} beat={beat} />
        ))}
        {/* leader ticks: each label hangs from its gate */}
        {labels.map((l, i) => (
          <line key={`lead${i}`} x1={l.bottom.x} y1={l.bottom.y + 4} x2={l.p.x} y2={l.p.y + 14} stroke={colOf(i)} strokeOpacity={0.25 + 0.5 * lit[i].a} strokeWidth={2} />
        ))}
      </svg>
      <AbsoluteFill style={textSafeMask([...labelRects, ...(phraseOn ? [TITLE] : [])], fx)}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {streams.map((s) =>
            s && s.p.ok ? <circle key={s.i} cx={s.p.x} cy={s.p.y} r={Math.min(6, 30 / s.p.d)} fill={s.passed >= 2 ? C.ok : C.signal} opacity={0.4 + 0.18 * s.passed} /> : null,
          )}
          {packets.map((pk, i) => {
            const col = pk.passed >= 1 ? C.ok : C.signal;
            const p = project(c, V(pk.x, pk.y, 0));
            return (
              <g key={`pk${i}`} opacity={pk.a}>
                {pk.trail.map((tx, j) => {
                  const q = project(c, V(tx, pk.y, 0));
                  return <circle key={j} cx={q.x} cy={q.y} r={9 - j * 1.3} fill={col} opacity={0.4 - j * 0.07} />;
                })}
                <circle cx={p.x} cy={p.y} r={30} fill={`url(#spark-${col.slice(1)})`} />
                <circle cx={p.x} cy={p.y} r={7} fill={C.white} />
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      {labels.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: l.p.x - 300, width: 600, top: l.p.y + 6, display: 'flex', justifyContent: 'center'}}>
          <KWord text={COPY.gates[i]} at={l.at} typo={typo} fx={fx} size={56} color={C.ink} glowColor={colOf(i)} />
        </div>
      ))}
      <Scrim r={TITLE} strength={0.6} />
      {/* r3 (critic r2 #4/#6): the line spoken just before the window holds the title slot as a ghost from f0 */}
      {/* r3 fix (arabic r3 R2): 7 words > 6 per kinetic phrase, so two phrases on two lines (اللي أي حد شغال / في الداتا بيعمله), each
          its own element anchored to its first word (both onsets precede the window, so both are in at f0); no canon word dropped */}
      {carryOp > 0 ? (
        <div dir="rtl" style={{position: 'absolute', right: 120, top: 84, opacity: carryOp, display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
          {[CARRY.slice(0, 4), CARRY.slice(4)].map((ph, j) => (
            <KWord key={j} text={ph.map((w) => w.text).join(' ').replace('.', '')} at={msToFrames(ph[0].start_ms - WIN.window.start_ms, fps) - Math.round((LEAD_FRAMES.kinetic * fps) / 24)} typo={typo} fx={fx} size={72} color={C.ink2} glowColor={C.void} />
          ))}
        </div>
      ) : null}
      <Burst at={impact + 1} x={900} y={150} r={360} color={C.signal} frames={3} />
      <div style={{position: 'absolute', right: 120, top: 60}}>
        <ArStack
          lines={[
            {
              text: COPY.f7Title,
              size: 104,
              node: (
                <div dir="rtl" style={{display: 'flex', gap: 28, alignItems: 'baseline'}}>
                  {PHRASE_WORDS.map((w, j) => (
                    <KWord key={w} text={wordAt(w).text.replace('.', '')} at={on(w)} typo={typo} fx={fx} size={j === 2 ? 128 : 104} color={j === 2 ? C.signal : C.ink} preset={j === 2 ? 'impact' : 'arrive'} flashFrames={j === 2 ? 3 : 0} />
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>
      <AbsoluteFill style={{transform: `translateX(${-ang * 400}px)`}}>
        <Bokeh fx={fx} seed="md" drift={frame * 0.6} />
      </AbsoluteFill>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

/** Frames of MD used as stills: F8 = third gate igniting, F9 = impact word landing mid-orbit. */
export const GATES_STILL_FRAMES = (() => {
  const on = (n: number) => msToFrames(wordAt(n).start_ms - WIN.window.start_ms, 24) - LEAD_FRAMES.kinetic;
  // r2 (arabic r1): F8 is taken after the arrive wipe of 'جاوب على السؤال' completes (240 ms = 6 f), ring still igniting
  return {F8: on(45) + 7, F9: on(50) + 6};
})();
export {glow};
