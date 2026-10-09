// r1 additions for the critic's r0 issue 10: (7) A-01 Holo-City, (8) TripleGate portal ignition,
// (9) camera orbit + kinetic Arabic word at the same time (motion test MD; F8/F9 are frames of it).
// 2.5D: true 3D geometry projected with the galaxy camera maths into SVG (standard tier, no WebGL).
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {Backdrop, Bokeh, Haze, KWord, Post, Rect, Scrim, TermChip, hex, textSafeMask} from './kit';
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
const CUR = 3; // the district being learned now (lit in signal); 0-2 already learned; 4-6 dark
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
          </React.Fragment>
        );
      })}
    </g>
  );
};

export const HoloCity: React.FC<{typo: Typo; fx: Fx; orbit?: number}> = ({typo, fx, orbit}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const towers = useMemo(buildCity, []);
  const ang = orbit ?? 0.3 + (frame / fps) * ((0.3 * Math.PI) / 180); // 0.3°/s ambient orbit (04 §2)
  const dist = 11.8;
  const cam: Cam = {pos: [Math.sin(ang) * dist, 7.6, Math.cos(ang) * dist], target: [0, 0.3, -0.6]};
  const c = makeCamera(cam);
  const camPos = V(...cam.pos);
  const sorted = [...towers].sort((a, b) => camPos.distanceTo(V(b.x, b.h / 2, b.z)) - camPos.distanceTo(V(a.x, a.h / 2, a.z)));
  const centers = Array.from({length: DISTRICTS}, (_, k) => districtCenter(k));
  // metro routes: ring order; 0→1→2→3 learned, 2→3 drawing now, the rest future
  const routes = centers.map((a, k) => ({a, b: centers[(k + 1) % DISTRICTS], k}));
  const cur = project(c, centers[CUR].clone().setY(2.4));
  const TITLE: Rect = {x: 1100, y: 60, w: 700, h: 150};
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <AbsoluteFill style={{filter: `blur(${fx.dofBlurPx * 0.5}px)`}}>
        <Ground c={c} />
      </AbsoluteFill>
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
              {now || learned ? <path d={d} fill="none" stroke={now ? C.signal : C.ink2} strokeWidth={now ? 12 : 6} opacity={now ? 0.35 : 0.15} style={{filter: `blur(${fx.glowInner * 0.6}px)`}} /> : null}
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
      {/* light shaft over the lit district */}
      <div style={{position: 'absolute', left: cur.x - 90, top: 0, width: 180, height: cur.y + 120, background: `linear-gradient(180deg, transparent 0%, ${C.signal}${hex(fx.haze * 1.6)} 70%, ${C.signal}${hex(fx.haze * 2.4)} 100%)`, filter: 'blur(14px)', mixBlendMode: 'screen'}} />
      <TermChip term="SQL" typo={typo} fx={fx} style={{left: cur.x - 52, top: cur.y - 74}} size={34} />
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
const PHRASE_WORDS = [48, 49, 50];

const Ring: React.FC<{c: THREE.PerspectiveCamera; cx: number; cy: number; r: number; prog: number; col: string; fx: Fx; lit: number}> = ({c, cx, cy, r, prog, col, fx, lit}) => {
  const N = 72;
  const ring = Array.from({length: N + 1}, (_, i) => {
    const a = Math.PI / 2 - (i / N) * Math.PI * 2; // starts at the top, runs clockwise
    return V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0);
  });
  const P = ring.map((v) => project(c, v));
  const d = P.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const ctr = project(c, V(cx, cy, 0));
  const rx = Math.max(...P.map((p) => Math.abs(p.x - ctr.x)));
  const ry = Math.max(...P.map((p) => Math.abs(p.y - ctr.y)));
  const floor = project(c, V(cx, 0, 0));
  return (
    <g>
      {/* floor reflection pool */}
      <ellipse cx={floor.x} cy={floor.y} rx={rx * 1.2} ry={ry * 0.18} fill={col} opacity={0.08 + lit * 0.22} style={{filter: `blur(${fx.glowInner * 1.5}px)`}} />
      {/* portal surface */}
      <ellipse cx={ctr.x} cy={ctr.y} rx={rx * 0.96} ry={ry * 0.96} fill={`url(#portal-${col.slice(1)})`} opacity={lit} />
      {/* dormant ring */}
      <path d={d} fill="none" stroke={C.ink3} strokeOpacity={0.35} strokeWidth={3} />
      {/* igniting / lit ring: path-draw */}
      {prog > 0 ? (
        <>
          <path d={d} fill="none" stroke={col} strokeWidth={22} opacity={0.35} pathLength={1} strokeDasharray={`${prog} 1`} style={{filter: `blur(${fx.glowInner}px)`}} />
          <path d={d} fill="none" stroke={col} strokeWidth={6} pathLength={1} strokeDasharray={`${prog} 1`} />
          <path d={d} fill="none" stroke={C.white} strokeWidth={2} opacity={0.8} pathLength={1} strokeDasharray={`${prog} 1`} />
          {prog < 0.999 ? (
            <g>
              <circle cx={P[Math.round(prog * N)].x} cy={P[Math.round(prog * N)].y} r={26} fill={col} opacity={0.45} style={{filter: `blur(${fx.glowInner}px)`}} />
              <circle cx={P[Math.round(prog * N)].x} cy={P[Math.round(prog * N)].y} r={7} fill={C.white} />
            </g>
          ) : null}
        </>
      ) : null}
    </g>
  );
};

export const GatesOrbit: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const on = (n: number) => msToFrames(wordAt(n).start_ms - WIN.window.start_ms, fps) - Math.round((LEAD_FRAMES.kinetic * fps) / 24);
  const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  // camera: slow push + orbit through the whole shot (0.6 rad over 12 s ≈ 2.9°/s: a deliberate move, not ambient)
  const k = interpolate(frame, [0, durationInFrames - 1], [0, 1], {easing: EASE.camera});
  const ang = interpolate(k, [0, 1], [-0.32, 0.28]);
  const dist = interpolate(k, [0, 1], [12.5, 9.2]);
  const tgt: [number, number, number] = [0, 1.25, 0];
  const cam: Cam = {pos: [Math.sin(ang) * dist, 2.3 + 0.5 * (1 - k), Math.cos(ang) * dist], target: tgt};
  const c = makeCamera(cam);
  const gx = [4.1, 0, -4.1]; // RTL: the first move sits on the right
  const prog = GATE_WORDS.map((w) => interpolate(frame, [on(w), on(w) + msToFrames(420, fps)], [0, 1], {...cl, easing: EASE.arrive}));
  const lit = GATE_WORDS.map((w, i) => {
    const a = interpolate(frame, [on(w) + msToFrames(300, fps), on(w) + msToFrames(700, fps)], [0, 1], cl);
    const next = GATE_WORDS[i + 1];
    const handoff = next ? interpolate(frame, [on(next), on(next) + msToFrames(500, fps)], [0, 1], cl) : 0;
    return {a, done: handoff};
  });
  const colOf = (i: number) => (lit[i].done > 0.5 ? C.ok : C.signal);
  // receipt particles stream through the lit gates (seeded; ≤ 1,500 cap irrelevant here: 160 sprites)
  const streams = Array.from({length: 160}, (_, i) => {
    const sp = 0.6 + random(`ps${i}`) * 0.8;
    const t = ((frame / fps) * sp * 0.22 + random(`po${i}`)) % 1;
    const x = 6 - t * 12;
    const y = 1.25 + (random(`py${i}`) - 0.5) * 1.6;
    const z = (random(`pz${i}`) - 0.5) * 1.2;
    const passed = GATE_WORDS.filter((_, g) => x < gx[g] && prog[g] > 0.99).length;
    const reach = gx.findIndex((g, j) => x < g + 0.2 && prog[j] < 0.99);
    if (reach >= 0 && x < gx[reach]) return null; // blocked before an unlit gate
    return {p: project(c, V(x, y, z)), passed, i};
  });
  const labels = GATE_WORDS.map((w, i) => {
    const p = project(c, V(gx[i], -0.15, 0));
    return {p, at: on(w)};
  });
  const labelRects: Rect[] = labels.map((l) => ({x: l.p.x - 220, y: l.p.y, w: 440, h: 96}));
  const TITLE: Rect = {x: 1000, y: 60, w: 800, h: 150};
  const phraseOn = frame >= on(PHRASE_WORDS[0]) - 2;
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} />
      <AbsoluteFill style={{filter: `blur(${fx.dofBlurPx * 0.6}px)`}}>
        <Ground c={c} size={7} opacity={0.16} />
      </AbsoluteFill>
      <Haze fx={fx} y={560} h={520} k={1.5} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          {[C.signal, C.ok].map((col) => (
            <radialGradient key={col} id={`portal-${col.slice(1)}`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={col} stopOpacity={0.55} />
              <stop offset="0.6" stopColor={col} stopOpacity={0.16} />
              <stop offset="1" stopColor={col} stopOpacity={0.05} />
            </radialGradient>
          ))}
        </defs>
        {gx.map((x, i) => (
          <Ring key={i} c={c} cx={x} cy={1.35} r={1.15} prog={prog[i]} col={colOf(i)} fx={fx} lit={lit[i].a * (1 - 0.35 * lit[i].done)} />
        ))}
      </svg>
      <AbsoluteFill style={textSafeMask([...labelRects, ...(phraseOn ? [TITLE] : [])], fx)}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {streams.map((s) =>
            s && s.p.ok ? <circle key={s.i} cx={s.p.x} cy={s.p.y} r={Math.min(6, 30 / s.p.d)} fill={s.passed >= 2 ? C.ok : C.signal} opacity={0.35 + 0.15 * s.passed} style={{filter: `drop-shadow(0 0 ${fx.glowInner * 0.6}px ${C.signal})`}} /> : null,
          )}
        </svg>
      </AbsoluteFill>
      {labels.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: l.p.x - 300, width: 600, top: l.p.y + 6, display: 'flex', justifyContent: 'center'}}>
          <KWord text={COPY.gates[i]} at={l.at} typo={typo} fx={fx} size={56} color={C.ink} glowColor={colOf(i)} />
        </div>
      ))}
      {phraseOn ? <Scrim r={TITLE} strength={0.6} /> : null}
      <div style={{position: 'absolute', right: 120, top: 60}}>
        <ArStack
          lines={[
            {
              text: COPY.f7Title,
              size: 104,
              node: (
                <div dir="rtl" style={{display: 'flex', gap: 28, alignItems: 'baseline'}}>
                  {PHRASE_WORDS.map((w, j) => (
                    <KWord key={w} text={wordAt(w).text.replace('.', '')} at={on(w)} typo={typo} fx={fx} size={j === 2 ? 128 : 104} color={j === 2 ? C.signal : C.ink} preset={j === 2 ? 'impact' : 'arrive'} />
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
  return {F8: on(45) + 2, F9: on(50) + 6};
})();
export {glow};
