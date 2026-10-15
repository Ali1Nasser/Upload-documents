// A-01 Holo-City geometry of P7 group "struct-b" (WorldMapA01). True 3D towers projected with the look-dev r3 camera maths into
// SVG (standard tier, no WebGL; 04 §7 recurring asset). Pure, seeded (remotion random), no hard-coded colours: the caller
// passes token colours. The 7 film movements (CH-01: machine, data, systems, platform, domain, AI, evidence) are the ring
// districts; `orientation` is the hub in the middle (the Orientation act).
import React from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {C} from '../../tokens';
import {hex} from '../../fx/look';
import {V3} from './kit';

export type District = {slug: string; name: string; hub?: boolean};
/** Ring order = the CH-01 order of the seven movements; the hub is index 7. */
export const DISTRICTS: District[] = [
  {slug: 'machine', name: 'machine'},
  {slug: 'data', name: 'data'},
  {slug: 'systems', name: 'systems'},
  {slug: 'platform', name: 'platform'},
  {slug: 'domain', name: 'domain'},
  {slug: 'ai', name: 'AI'},
  {slug: 'evidence', name: 'evidence'},
  {slug: 'orientation', name: 'A-01', hub: true},
];
export const RING = 7;
/** Act slugs (corpus/canon/chapters.json acts) that point at the movement that lights them; anything else is unknown. */
const ALIAS: Record<string, string> = {
  'ground-zero': 'machine',
  computer: 'machine',
  python: 'data',
  sql: 'data',
  analytics: 'data',
  craft: 'data',
  'big-data': 'platform',
  ship: 'evidence',
  close: 'evidence',
  hub: 'orientation',
  'a-01': 'orientation',
  core: 'orientation',
};
/** District index of a slug (null = unknown: the component flags it instead of guessing). */
export const districtIndex = (slug: string): number | null => {
  const s = ALIAS[slug] ?? slug;
  const i = DISTRICTS.findIndex((d) => d.slug === s);
  return i < 0 ? null : i;
};

export type Tower = {x: number; z: number; w: number; d: number; h: number; district: number; id: string};
const ringAngle = (k: number) => (k / RING) * Math.PI * 2 - 1.42; // district 3 faces the default camera (look-dev r3)
export const districtCenter = (k: number): THREE.Vector3 => {
  if (k >= RING) return V3(0, 0, 0.1);
  const a = ringAngle(k);
  const r = 3.4 + (random(`dr${k}`) - 0.5) * 0.6;
  return V3(Math.cos(a) * r * 1.25, 0, Math.sin(a) * r * 0.85);
};
/** Camera yaw that makes district k face the camera (camera sits at (sin yaw, cos yaw) * dist). */
export const yawOf = (k: number) => (k >= RING ? 0 : Math.PI / 2 - ringAngle(k));

let CITY: Tower[] | null = null;
export const city = (): Tower[] => {
  if (CITY) return CITY;
  const out: Tower[] = [];
  for (let k = 0; k < DISTRICTS.length; k++) {
    const c = districtCenter(k);
    const hub = k >= RING;
    const n = hub ? 5 : 7 + Math.floor(random(`dn${k}`) * 5);
    for (let i = 0; i < n; i++) {
      const gx = (i % 3) - 1;
      const gz = Math.floor(i / 3) - (hub ? 0.5 : 1.5);
      out.push({
        id: `${k}-${i}`,
        x: c.x + gx * 0.5 + (random(`tx${k}-${i}`) - 0.5) * 0.12,
        z: c.z + gz * 0.5 + (random(`tz${k}-${i}`) - 0.5) * 0.12,
        w: 0.28 + random(`tw${k}-${i}`) * 0.12,
        d: 0.28 + random(`td${k}-${i}`) * 0.12,
        h: (hub ? 0.5 : 0.25) + random(`th${k}-${i}`) ** 1.6 * (hub ? 2.6 : 1.5),
        district: k,
      });
    }
  }
  CITY = out;
  return out;
};

/** Far skyline ring: dim silhouettes beyond the districts so the far plane is not bare grid. */
export const SKY = Array.from({length: 64}, (_, i) => {
  const a = (i / 64) * Math.PI * 2 + (random(`ska${i}`) - 0.5) * 0.05;
  const r = 9.4 + random(`skr${i}`) * 2.2;
  return {x: Math.cos(a) * r * 1.2, z: Math.sin(a) * r, w: 0.26 + random(`skw${i}`) * 0.24, h: 0.35 + random(`skh${i}`) ** 1.6 * 1.5};
});

// ---------- colour maths (tokens in, tokens out) ----------
const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixHex = (a: string, b: string, t: number): string => {
  const x = rgb(a);
  const y = rgb(b);
  const q = Math.max(0, Math.min(1, t));
  return `#${[0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * q).toString(16).padStart(2, '0')).join('')}`;
};
/** State value v in [0, 2]: 0 = dark, 1 = learned (ink2 / warm windows), 2 = current (signal). */
export const stateColor = (v: number) => (v <= 1 ? mixHex(C.ink3, C.ink2, v) : mixHex(C.ink2, C.signal, v - 1));

export const makeProjector = (cam: THREE.PerspectiveCamera, w: number, h: number) => (v: THREE.Vector3) => {
  const p = v.clone().project(cam);
  return {x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, d: cam.position.distanceTo(v), ok: p.z < 1 && p.z > -1};
};
export type Proj = ReturnType<typeof makeProjector>;
const pts = (P: Proj, vs: THREE.Vector3[]) => vs.map((v) => P(v)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** One tower, 3 visible side faces + roof; `v` = state value (0..2); `rise` = 0..1 build-up of its height. */
export const TowerShape: React.FC<{t: Tower; P: Proj; camPos: THREE.Vector3; v: number; rise: number}> = ({t, P, camPos, v, rise}) => {
  const h = t.h * rise;
  if (h <= 0.001) return null;
  const x0 = t.x - t.w / 2;
  const x1 = t.x + t.w / 2;
  const z0 = t.z - t.d / 2;
  const z1 = t.z + t.d / 2;
  const faces: {n: THREE.Vector3; v: THREE.Vector3[]; side: boolean}[] = [
    {n: V3(0, 0, 1), v: [V3(x0, 0, z1), V3(x1, 0, z1), V3(x1, h, z1), V3(x0, h, z1)], side: true},
    {n: V3(0, 0, -1), v: [V3(x1, 0, z0), V3(x0, 0, z0), V3(x0, h, z0), V3(x1, h, z0)], side: true},
    {n: V3(1, 0, 0), v: [V3(x1, 0, z1), V3(x1, 0, z0), V3(x1, h, z0), V3(x1, h, z1)], side: true},
    {n: V3(-1, 0, 0), v: [V3(x0, 0, z0), V3(x0, 0, z1), V3(x0, h, z1), V3(x0, h, z0)], side: true},
    {n: V3(0, 1, 0), v: [V3(x0, h, z1), V3(x1, h, z1), V3(x1, h, z0), V3(x0, h, z0)], side: false},
  ];
  const col = stateColor(v);
  const key = V3(0.6, 0.5, -0.6).normalize();
  const cur = Math.max(0, v - 1); // 0..1 weight of "current"
  const done = Math.min(1, v); // 0..1 weight of "learned"
  return (
    <g>
      {faces.map((f, i) => {
        const fc = f.v.reduce((a, b) => a.clone().add(b), V3(0, 0, 0)).multiplyScalar(0.25);
        if (f.n.dot(camPos.clone().sub(fc)) <= 0) return null;
        const lit = Math.max(0, f.n.dot(key));
        if (!f.side) {
          const a = 0.12 + done * 0.28 + cur * 0.45;
          return <polygon key={i} points={pts(P, f.v)} fill={col} fillOpacity={a} stroke={col} strokeOpacity={0.35 + 0.6 * Math.min(1, v / 1.2)} strokeWidth={1.4} />;
        }
        const base = 0.05 + lit * 0.08 + done * (0.05 + lit * 0.04) + cur * (0.08 + lit * 0.1);
        const [a0, a1, , a3] = f.v;
        const ux = a1.clone().sub(a0);
        const uy = a3.clone().sub(a0);
        const rows = Math.max(1, Math.floor(h / 0.2));
        const wins: React.ReactNode[] = [];
        const wa = 0.22 + done * 0.23 + cur * 0.45;
        const wc = v > 1 ? mixHex(C.warn, C.signal, v - 1) : mixHex(C.ink2, C.warn, v);
        for (let r = 0; r < rows; r++)
          for (let q = 0; q < 2; q++) {
            if (random(`win${t.id}${i}${r}${q}`) < 0.5 - 0.2 * Math.min(1, v)) continue;
            const u0 = 0.16 + q * 0.42;
            const v0 = (r + 0.3) / rows;
            const v1 = (r + 0.7) / rows;
            const PP = (u: number, w: number) => a0.clone().add(ux.clone().multiplyScalar(u)).add(uy.clone().multiplyScalar(w));
            wins.push(<polygon key={`w${r}${q}`} points={pts(P, [PP(u0, v0), PP(u0 + 0.26, v0), PP(u0 + 0.26, v1), PP(u0, v1)])} fill={wc} opacity={wa * (0.5 + 0.5 * lit + 0.25)} />);
          }
        return (
          <React.Fragment key={i}>
            <polygon points={pts(P, f.v)} fill={C.ground} />
            <polygon points={pts(P, f.v)} fill={v < 0.05 ? C.panel : `${col}${hex(base)}`} stroke={col} strokeOpacity={0.18 + lit * 0.3 + 0.3 * Math.min(1, v)} strokeWidth={1} />
            {wins}
          </React.Fragment>
        );
      })}
    </g>
  );
};

/** Ground grid in perspective (true 3D). */
export const GroundGrid: React.FC<{P: Proj; w: number; h: number; size?: number; step?: number; opacity?: number}> = ({P, w, h, size = 12, step = 1, opacity = 0.2}) => {
  const lines: React.ReactNode[] = [];
  for (let i = -size; i <= size; i += step) {
    const a = P(V3(i, 0, -size));
    const b = P(V3(i, 0, size));
    const d = P(V3(-size, 0, i));
    const e = P(V3(size, 0, i));
    if (a.ok && b.ok) lines.push(<line key={`x${i}`} x1={a.x.toFixed(1)} y1={a.y.toFixed(1)} x2={b.x.toFixed(1)} y2={b.y.toFixed(1)} />);
    if (d.ok && e.ok) lines.push(<line key={`z${i}`} x1={d.x.toFixed(1)} y1={d.y.toFixed(1)} x2={e.x.toFixed(1)} y2={e.y.toFixed(1)} />);
  }
  return (
    <svg width={w} height={h} style={{position: 'absolute', inset: 0, opacity}}>
      <g stroke={C.ink3} strokeWidth={1.2}>
        {lines}
      </g>
    </svg>
  );
};

/** Camera-facing silhouette billboards of the far skyline. */
export const Skyline: React.FC<{P: Proj; w: number; h: number; camPos: THREE.Vector3; opacity: number}> = ({P, w, h, camPos, opacity}) => (
  <svg width={w} height={h} style={{position: 'absolute', inset: 0, opacity}}>
    <defs>
      <linearGradient id="a01-skyfade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.ink3} stopOpacity={0.32} />
        <stop offset="1" stopColor={C.ink3} stopOpacity={0.04} />
      </linearGradient>
    </defs>
    {SKY.filter((b) => camPos.distanceTo(V3(b.x, 0, b.z)) > 9).map((b, i) => {
      const right = V3(-(camPos.z - b.z), 0, camPos.x - b.x).normalize().multiplyScalar(b.w / 2);
      const v = [V3(b.x, 0, b.z).sub(right), V3(b.x, 0, b.z).add(right), V3(b.x, b.h, b.z).add(right), V3(b.x, b.h, b.z).sub(right)];
      const pr = v.map((q) => P(q));
      if (pr.some((q) => !q.ok) || pr[2].y < 0) return null;
      return <polygon key={i} points={pr.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} fill="url(#a01-skyfade)" stroke={C.ink3} strokeOpacity={0.2} strokeWidth={1} />;
    })}
  </svg>
);
