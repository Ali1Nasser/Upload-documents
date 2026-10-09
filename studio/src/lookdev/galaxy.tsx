// Vector galaxy (CH-33 §6.18). One seeded 3D field, two renderers sharing the same camera maths:
// standard tier = SVG point sprites, hero tier = R3F points + postprocessing Bloom; both capped at fx.particles (1,500, ADR-002).
// Text-safe masks (ADR-002): particles, nebula and bloom are masked out of every text box plus padding.
import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, Img, OffthreadVideo, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Bloom, EffectComposer} from '@react-three/postprocessing';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ArCaption, Backdrop, Bokeh, FloorGrid, Glass, KWord, Mix, Post, Rect, Scrim, TermChip, Vignette, textSafeMask} from './kit';
import {FX as FX_TIERS} from '../tokens';
import {C, EASE, Fx, Typo, caShadow, glow, halo} from './theme';
import {RAG} from './content';

const W = 1920;
const H = 1080;
const FOV = 42;

export type Cam = {pos: [number, number, number]; target: [number, number, number]};

// semantic anchors (positions are a layout, not measurements; closeness ordering follows the scores 0.227 > 0.165)
export const ANCHOR = {
  q0: new THREE.Vector3(0.6, 0.3, 0.8), // raw query
  q1: new THREE.Vector3(-0.5, -0.1, 0.9), // query after synonym expansion
  roadmap: new THREE.Vector3(1.55, 0.9, 0.5),
  idem: new THREE.Vector3(-1.05, -0.55, 1.35),
  third: new THREE.Vector3(-0.2, 1.35, 0.15),
};

const gauss = (s: string) => {
  const u = Math.max(1e-6, random(s + 'u'));
  const v = random(s + 'v');
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export const buildField = (n: number) => {
  const centers = CLUSTERS;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const sig = new THREE.Color(C.signal);
  const vio = new THREE.Color(C.violet);
  const ink = new THREE.Color(C.ink2);
  for (let i = 0; i < n; i++) {
    const uniform = random(`un${i}`) < 0.12;
    const c = centers[Math.floor(random(`cl${i}`) * centers.length)];
    const spread = 0.35 + random(`sp${i}`) * 0.45;
    const p = uniform
      ? new THREE.Vector3((random(`ux${i}`) - 0.5) * 16, (random(`uy${i}`) - 0.5) * 9, (random(`uz${i}`) - 0.5) * 12)
      : new THREE.Vector3(c.x + gauss(`gx${i}`) * spread, c.y + gauss(`gy${i}`) * spread * 0.7, c.z + gauss(`gz${i}`) * spread);
    pos.set([p.x, p.y, p.z], i * 3);
    const r = random(`co${i}`);
    const cc = r < 0.12 ? vio : r < 0.55 ? sig : ink;
    const k = 0.35 + random(`br${i}`) * 0.65;
    col.set([cc.r * k, cc.g * k, cc.b * k], i * 3);
  }
  return {pos, col};
};

export const CLUSTERS = Array.from({length: 11}, (_, k) =>
  k === 0 ? ANCHOR.idem.clone() : k === 1 ? ANCHOR.roadmap.clone() : new THREE.Vector3((random(`cx${k}`) - 0.5) * 11, (random(`cy${k}`) - 0.5) * 6, (random(`cz${k}`) - 0.5) * 8),
);

/** Soft nebula discs at the cluster centres (cheap radial gradients; reads as density at any tier). */
export const Nebula: React.FC<{cam: Cam; fx: Fx}> = ({cam, fx}) => {
  const c = makeCamera(cam);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {CLUSTERS.map((v, k) => {
        const p = project(c, v);
        if (!p.ok) return null;
        const r = Math.min(520, 1500 / p.d);
        const col = k % 3 === 2 ? C.violet : C.signal;
        return <div key={k} style={{position: 'absolute', left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${col}${fx.bloomGL ? '30' : '26'} 0%, ${col}10 40%, transparent 70%)`}} />;
      })}
    </AbsoluteFill>
  );
};

export const makeCamera = (cam: Cam) => {
  const c = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 200);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.target));
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
};

export const project = (c: THREE.PerspectiveCamera, v: THREE.Vector3) => {
  const p = v.clone().project(c);
  const d = c.position.distanceTo(v);
  return {x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H, d, ok: p.z < 1 && p.z > -1};
};

/** Standard tier: SVG sprites with fake DOF (far = small + dim, near = big soft disc). */
export const GalaxySVG: React.FC<{n: number; cam: Cam; fx: Fx}> = ({n, cam, fx}) => {
  const field = useMemo(() => buildField(n), [n]);
  const c = makeCamera(cam);
  const v = new THREE.Vector3();
  const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    v.set(field.pos[i * 3], field.pos[i * 3 + 1], field.pos[i * 3 + 2]);
    const p = project(c, v);
    if (!p.ok || p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) continue;
    const near = p.d < 4.2;
    const r = Math.min(near ? 22 : 9, (near ? 34 : 30) / p.d);
    const a = near ? 0.22 : Math.max(0.3, Math.min(1, 60 / (p.d * p.d)));
    const col = `rgb(${Math.round(field.col[i * 3] * 255)},${Math.round(field.col[i * 3 + 1] * 255)},${Math.round(field.col[i * 3 + 2] * 255)})`;
    items.push(<circle key={i} cx={p.x} cy={p.y} r={Math.max(0.8, r)} fill={col} opacity={a} />);
  }
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, filter: `drop-shadow(0 0 ${fx.glowInner * 0.6}px ${C.signal}66)`}}>
      {items}
    </svg>
  );
};

let sprite: THREE.Texture | null = null;
const spriteTex = () => {
  if (sprite) return sprite;
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  sprite = new THREE.CanvasTexture(cv);
  return sprite;
};

const GLField: React.FC<{n: number; cam: Cam}> = ({n, cam}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...cam.pos);
  camera.lookAt(new THREE.Vector3(...cam.target));
  camera.updateMatrixWorld();
  const field = useMemo(() => buildField(n), [n]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(field.pos, 3));
    const boosted = field.col.map((x) => x * 1.6);
    g.setAttribute('color', new THREE.BufferAttribute(boosted, 3));
    return g;
  }, [field]);
  const mat = useMemo(
    () => new THREE.PointsMaterial({size: 0.12, map: spriteTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true}),
    [],
  );
  return <points geometry={geo} material={mat} />;
};

/**
 * Workaround (measured): with @remotion/three 4.0.534 the FIRST frame each browser tab renders is blank
 * (BenchR3F mp4 frames 0–2 at concurrency 3; every renderStill). Hold the capture once on mount and advance R3F
 * twice after the scene + EffectComposer are attached. Costs two extra GL renders per tab, not per frame.
 */
export const R3FWarmup: React.FC = () => {
  const advance = useThree((s) => s.advance);
  useLayoutEffect(() => {
    const h = delayRender('r3f warm-up');
    requestAnimationFrame(() => {
      advance(performance.now());
      requestAnimationFrame(() => {
        advance(performance.now());
        continueRender(h);
      });
    });
  }, [advance]);
  return null;
};

/** Hero tier: WebGL points + Bloom (04 §1.3 hero: intensity 0.8–1.2). */
export const GalaxyGL: React.FC<{n: number; cam: Cam; fx: Fx; style?: React.CSSProperties}> = ({n, cam, fx, style}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen', ...style}}>
  <ThreeCanvas width={W} height={H} camera={{fov: FOV, near: 0.1, far: 200, position: cam.pos}} gl={{alpha: false, antialias: false}}>
    <color attach="background" args={['#000000']} />
    <GLField n={n} cam={cam} />
    <R3FWarmup />
    <EffectComposer>
      <Bloom intensity={fx.bloomGL} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
    </EffectComposer>
  </ThreeCanvas>
  </AbsoluteFill>
);

/** Score card geometry (also used to build the text-safe mask). Dimmed roadmap card keeps >= 55 % opacity (critic r0 issue 3). */
export const CARD = {w: 440, h: 196, off: 44, lift: 56};
export const ROADMAP_DIM = 0.6;
export const cardRect = (cam: Cam, key: 'idem' | 'roadmap'): Rect => {
  const p = project(makeCamera(cam), ANCHOR[key]);
  const right = key === 'roadmap';
  // r3: cards carry their own 0.84-opaque surface, so the field stays at 35 % behind them (no hard hole)
  return {x: right ? p.x + CARD.off : p.x - CARD.off - CARD.w, y: p.y - CARD.lift, w: CARD.w, h: CARD.h, floor: 0.35};
};
// r2 (critic r1 #2): the title rect now starts at the measured left edge of 'لموضع' (x ~745) minus 24 px
export const TITLE_RECT: Rect = {x: 720, y: 56, w: 1080, h: 156};
// r2 (arabic r1 BLOCKING): the query caption is two lines at line-height 1.6 (shadda), bottom-right glass
export const CAPTION_RECT: Rect = {x: 1150, y: 806, w: 650, h: 180, floor: 0.3};
// r3 (critic r2 #2): the r2 chip rect was 420 px wide for a ~345 px pill, which left a starless box right of the chip
// (x 460-555); it now matches the pill and keeps 30 % of the field behind its opaque surface
export const CHIP_RECT: Rect = {x: 120, y: 90, w: 350, h: 58, floor: 0.3};

export type ProbeState = {
  q: THREE.Vector3; // current query position
  probe: number; // 0..1 probe visibility
  roadmap: number; // 0..1 beam to roadmap (raw top hit)
  roadmapFade: number; // 0..1 fade-out after expansion
  idem: number; // 0..1 beam to idempotency (expanded top hit)
  third: number; // 0..1 third neighbour
};

/** Probe, beams, neighbours and labels drawn in screen space over either renderer. */
export const ProbeOverlay: React.FC<{cam: Cam; st: ProbeState; typo: Typo; fx: Fx; labelAt?: number}> = ({cam, st, typo, fx, labelAt = -1000}) => {
  const frame = useCurrentFrame();
  const c = makeCamera(cam);
  const q = project(c, st.q);
  const nb = [
    {key: 'idem', v: ANCHOR.idem, k: st.idem, dim: 1, col: C.ok, label: RAG.after.label, score: RAG.after.score, note: RAG.after.note},
    {key: 'roadmap', v: ANCHOR.roadmap, k: st.roadmap, dim: 1 - (1 - ROADMAP_DIM) * st.roadmapFade, col: C.crit, label: RAG.before.label, score: RAG.before.score, note: RAG.before.note},
    {key: 'third', v: ANCHOR.third, k: st.third, dim: 1, col: C.ink2, label: '', score: null as number | null, note: ''},
  ];
  const pulse = 1 + 0.15 * Math.sin(frame / 6);
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          {[C.ok, C.crit, C.ink2, C.signal].map((col) => (
            <radialGradient key={col} id={`halo-${col.slice(1)}`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={col} stopOpacity={0.55} />
              <stop offset="0.35" stopColor={col} stopOpacity={0.28} />
              <stop offset="1" stopColor={col} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        {nb.map((n) => {
          if (n.k <= 0) return null;
          const p = project(c, n.v);
          const ex = q.x + (p.x - q.x) * Math.min(1, n.k * 1.4);
          const ey = q.y + (p.y - q.y) * Math.min(1, n.k * 1.4);
          const dashed = n.key === 'roadmap' && st.roadmapFade > 0;
          return (
            <g key={n.key} opacity={Math.min(1, n.k * 1.5) * n.dim}>
              {/* r3 perf: glow = wide low-alpha strokes / halo discs (no per-element CSS drop-shadow filter) */}
              <line x1={q.x} y1={q.y} x2={ex} y2={ey} stroke={n.col} strokeOpacity={0.18} strokeWidth={fx.glowInner * 1.4} strokeLinecap="round" strokeDasharray={dashed || n.key === 'third' ? '8 10' : undefined} />
              <line x1={q.x} y1={q.y} x2={ex} y2={ey} stroke={n.col} strokeWidth={n.key === 'third' ? 2 : 3.5} strokeDasharray={dashed || n.key === 'third' ? '8 10' : undefined} />
              <circle cx={p.x} cy={p.y} r={(n.key === 'third' ? 9 : 14) + fx.glowPx * 0.7} fill={`url(#halo-${n.col.slice(1)})`} />
              <circle cx={p.x} cy={p.y} r={n.key === 'third' ? 9 : 14} fill={n.col} />
              <circle cx={p.x} cy={p.y} r={n.key === 'third' ? 18 : 30} fill="none" stroke={n.col} strokeOpacity={0.5} strokeWidth={1.5} />
            </g>
          );
        })}
        {st.probe > 0 ? (
          <g opacity={st.probe}>
            <circle cx={q.x} cy={q.y} r={44 * pulse} fill="none" stroke={C.signal} strokeOpacity={0.35} strokeWidth={2} />
            <circle cx={q.x} cy={q.y} r={24 + fx.glowPx} fill={`url(#halo-${C.signal.slice(1)})`} opacity={0.7} />
            <circle cx={q.x} cy={q.y} r={24} fill="none" stroke={C.signal} strokeWidth={3} />
            <circle cx={q.x} cy={q.y} r={9} fill={C.ink} />
          </g>
        ) : null}
      </svg>
      {nb.map((n) => {
        if (n.k < 0.6 || n.key === 'third') return null;
        const p = project(c, n.v);
        const o = interpolate(n.k, [0.6, 1], [0, 1]) * n.dim;
        const right = n.key === 'roadmap';
        return (
          <div key={n.key} style={{position: 'absolute', left: right ? p.x + 44 : undefined, right: right ? undefined : W - p.x + 44, top: p.y - 56, opacity: o, textAlign: right ? 'left' : 'right', padding: '6px 16px 10px', borderRadius: 14, background: 'rgba(5,7,11,0.84)', border: `1.5px solid ${n.col}55`, width: CARD.w, boxSizing: 'border-box'}}>
            <bdi dir="ltr" style={{fontFamily: `'${typo.mono}'`, fontWeight: 700, fontSize: 64, color: n.col, textShadow: `${halo}, ${glow(n.col, fx, 0.6)}${caShadow(fx)}`, fontVariantNumeric: 'tabular-nums'}}>
              {n.score!.toFixed(3)}
            </bdi>
            {/* r2: Latin inside Arabic labels in Inter Tight, same colour (rule L1); note raised to 32 px ink2 (arabic r1) */}
            <div>
              <Mix text={n.label} latFont={typo.lat} latWeight={600} size={36} style={{color: C.ink, textShadow: halo}} />
            </div>
            <div>
              <Mix text={n.note} latFont={typo.lat} latWeight={600} size={32} style={{color: C.ink2, textShadow: halo}} />
            </div>
          </div>
        );
      })}
      {st.third > 0.6
        ? (() => {
            const p = project(c, ANCHOR.third);
            return <TermChip term="chunk" typo={typo} fx={fx} color={C.ink2} size={28} style={{left: p.x + 28, top: p.y - 22, opacity: interpolate(st.third, [0.6, 1], [0, 1])}} />;
          })()
        : null}
      {st.probe > 0 ? (
        <Glass accent={C.signal} style={{right: 120, bottom: 96, padding: '12px 28px 14px', opacity: st.probe, whiteSpace: 'nowrap'}}>
          <ArCaption text={RAG.queryAr} at={labelAt} typo={typo} fx={fx} size={40} color={C.ink} weight={600} />
        </Glass>
      ) : null}
    </AbsoluteFill>
  );
};

export const CAM_FINAL: Cam = {pos: [1.6, 0.9, 7.2], target: [0.1, 0.25, 0.6]};
export const STATE_FINAL: ProbeState = {q: ANCHOR.q1, probe: 1, roadmap: 1, roadmapFade: 1, idem: 1, third: 1};

// ---------- P10 plate path (critic r1 #2/#3): nebula + 1,500 GL points + Bloom are baked offline; only probe/cards are live ----------
export const PLATE = {push: 'plates/galaxy-ch33-push.mp4', pushSeq: 'plates/galaxy-ch33-push', final: 'plates/galaxy-ch33-final.png'} as const;

/** Plate composition: black + nebula + GL points + Bloom, no text, no masks (masks are applied when compositing). */
export const GalaxyPlate: React.FC<{mode: 'push' | 'final'}> = ({mode}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const cam = mode === 'final' ? CAM_FINAL : mbCam(frame, durationInFrames);
  const fx = FX_TIERS.hero;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Nebula cam={cam} fx={fx} />
      <GalaxyGL n={fx.particles} cam={cam} fx={fx} />
    </AbsoluteFill>
  );
};

/**
 * r3 hero (critic r2 #3): the 360 live points are an out-of-focus FOREGROUND, between the camera and the field, so the
 * push sweeps them across and out of frame at several times the plate's apparent speed (real parallax, not more stars).
 * Three size classes (sharp specks, soft discs, large bokeh), seeded; half are placed for the opening camera, half for
 * the final one, so both MB and the F4 still carry them. Additive, dim, masked out of every text box like the plate.
 */
const FG = [
  {n: 200, size: 0.05, k: [0.45, 0.85], soft: false},
  {n: 110, size: 0.2, k: [0.1, 0.22], soft: true},
  {n: 50, size: 0.55, k: [0.05, 0.11], soft: true},
] as const;
const TGT = new THREE.Vector3(0.1, 0.25, 0.6);
const fgField = (cls: number) => {
  const {n, k} = FG[cls];
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const pal = [new THREE.Color(C.signal), new THREE.Color(C.violet), new THREE.Color(C.ink)];
  for (let i = 0; i < n; i++) {
    const s = `fg${cls}-${i}`;
    const late = random(s + 'L') < 0.5; // placed for the final camera (dist ~7) or the opening one (dist 17)
    const camD = late ? 7.2 : 17;
    const u = late ? 1 + random(s + 'u') * 4.6 : 2 + random(s + 'u') * 12; // distance in front of the target, toward the camera
    const depth = Math.max(1.2, camD - u); // distance from that camera
    // frame the subject: soft discs keep to the outer 40-95 % of the frustum (the probe/centre stays clear), specks anywhere
    const edge = (key: string) => {
      const r = random(s + key);
      if (!FG[cls].soft) return (r - 0.5) * 2;
      const m = 0.4 + random(s + key + 'm') * 0.55;
      return r < 0.5 ? -m : m;
    };
    const x = TGT.x + edge('x') * 0.68 * depth * 0.95;
    const y = TGT.y + 0.6 + (FG[cls].soft && random(s + 'yy') < 0.6 ? (random(s + 'y') - 0.5) * 2 : edge('y')) * 0.38 * depth * 0.95;
    pos.set([x, y, TGT.z + u], i * 3);
    const c = pal[random(s + 'c') < 0.6 ? 0 : random(s + 'c2') < 0.6 ? 1 : 2];
    const b = k[0] + random(s + 'b') * (k[1] - k[0]);
    col.set([c.r * b, c.g * b, c.b * b], i * 3);
  }
  return {pos, col};
};
let bokehTex: THREE.Texture | null = null;
const bokehSprite = () => {
  if (bokehTex) return bokehTex;
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.4)');
  grd.addColorStop(0.7, 'rgba(255,255,255,0.46)');
  grd.addColorStop(0.84, 'rgba(255,255,255,0.62)'); // faint rim, like a lens disc
  grd.addColorStop(0.94, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  bokehTex = new THREE.CanvasTexture(cv);
  return bokehTex;
};
const GLForeground: React.FC<{cam: Cam}> = ({cam}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...cam.pos);
  camera.lookAt(new THREE.Vector3(...cam.target));
  camera.updateMatrixWorld();
  const layers = useMemo(
    () =>
      FG.map((c, i) => {
        const f = fgField(i);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(f.pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(f.col, 3));
        const m = new THREE.PointsMaterial({size: c.size, map: c.soft ? bokehSprite() : spriteTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true});
        return {g, m};
      }),
    [],
  );
  return (
    <>
      {layers.map((l, i) => (
        <points key={i} geometry={l.g} material={l.m} />
      ))}
    </>
  );
};
const ForegroundGL: React.FC<{cam: Cam; style?: React.CSSProperties}> = ({cam, style}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen', ...style}}>
    <ThreeCanvas width={W} height={H} camera={{fov: FOV, near: 0.8, far: 200, position: cam.pos}} gl={{alpha: false, antialias: false}}>
      <color attach="background" args={['#000000']} />
      <GLForeground cam={cam} />
      <R3FWarmup />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** Field layer: the baked plate (video for MB, still for F4) under the text-safe mask. The hero foreground is mounted
 * separately, ABOVE the probe overlay (it is nearer the camera than the probe). */
const Field: React.FC<{mask: React.CSSProperties; plate: 'push' | 'final'; blend?: boolean; still?: boolean; seq?: boolean}> = ({mask, plate, blend = true, still = false, seq = true}) => {
  const frame = useCurrentFrame();
  const src =
    plate === 'push' && !still ? (
      seq ? (
        // r3 perf: the push plate as a pre-extracted JPG sequence (one image decode per frame, no video frame server)
        <Img src={staticFile(`${PLATE.pushSeq}/${String(frame + 1).padStart(4, '0')}.jpg`)} />
      ) : (
        <OffthreadVideo src={staticFile(PLATE.push)} muted toneMapped={false} /* r3 perf: SDR bt709 plate, skip the tone-map pass */ />
      )
    ) : (
      <Img src={staticFile(PLATE.final)} />
    );
  return <AbsoluteFill style={{...mask, mixBlendMode: blend ? 'screen' : undefined}}>{src}</AbsoluteFill>;
};

/** MB camera: push 17 -> 7.4 units + 0.5 rad orbit (shared by the plate and the live overlay, so they stay locked). */
export const mbCam = (frame: number, dur: number): Cam => {
  const k = interpolate(frame, [0, dur - 1], [0, 1], {easing: EASE.camera});
  const ang = interpolate(k, [0, 1], [-0.32, 0.18]);
  const dist = interpolate(k, [0, 1], [17, 7.4]);
  const tgt: [number, number, number] = [0.1, 0.25, 0.6];
  return {pos: [tgt[0] + Math.sin(ang) * dist, tgt[1] + 0.6 + 0.3 * (1 - k), tgt[2] + Math.cos(ang) * dist], target: tgt};
};

const rectsFor = (cam: Cam, st: ProbeState, withTitle: boolean): Rect[] => [
  ...(withTitle ? [TITLE_RECT, CHIP_RECT] : []),
  ...(st.probe > 0 ? [CAPTION_RECT] : []),
  ...(st.idem > 0.5 ? [cardRect(cam, 'idem')] : []),
  ...(st.roadmap > 0.5 ? [cardRect(cam, 'roadmap')] : []),
];

/** (4) style frame: expanded query, three neighbours, 0.165 → 0.227. */
export const F4Galaxy: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const mask = textSafeMask(rectsFor(CAM_FINAL, STATE_FINAL, true), fx);
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.violet} shaft={false} />
      <FloorGrid y={860} drift={frame * 0.3} opacity={0.18} />
      <Field mask={mask} plate="final" />
      <Scrim r={TITLE_RECT} strength={0.5} />
      <ProbeOverlay cam={CAM_FINAL} st={STATE_FINAL} typo={typo} fx={fx} />
      {fx.webgl ? <ForegroundGL cam={CAM_FINAL} style={mask} /> : null}
      <div style={{position: 'absolute', right: 120, top: 64, textAlign: 'right'}}>
        <KWord text="بيحوّل النص لموضع" at={-1000} typo={typo} fx={fx} size={104} preset="impact" />
      </div>
      <TermChip term="cosine similarity" typo={typo} fx={fx} style={{left: 120, top: 90}} size={30} />
      <Bokeh fx={fx} seed="f4" drift={frame * 0.4} />
      <Post fx={fx} />
    </AbsoluteFill>
  );
};

/** Motion test (b): camera push + slight orbit + parallax over the galaxy; probe, raw hit, expansion, new top hit. */
/** `ablate` (perf bench only, never in a spec): comma list: plate, mask, bokeh, post, grain, overlay, title, grid (drop a layer);
 * blend (plate without screen blend), video (plate as a still PNG), mp4 (r2 path: OffthreadVideo instead of the r3 JPG sequence). */
export const MBGalaxyPush: React.FC<{typo: Typo; fx: Fx; ablate?: string}> = ({typo, fx, ablate = ''}) => {
  const off = new Set(ablate.split(',').filter(Boolean));
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const s = (sec: number) => Math.round(sec * fps);
  const k = interpolate(frame, [0, durationInFrames - 1], [0, 1], {easing: EASE.camera});
  const ang = interpolate(k, [0, 1], [-0.32, 0.18]);
  const cam = mbCam(frame, durationInFrames);
  const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const qMove = interpolate(frame, [s(5.6), s(6.4)], [0, 1], {...cl, easing: EASE.camera});
  const st: ProbeState = {
    q: ANCHOR.q0.clone().lerp(ANCHOR.q1, qMove),
    probe: interpolate(frame, [s(1.8), s(2.2)], [0, 1], cl),
    roadmap: interpolate(frame, [s(3.0), s(3.6)], [0, 1], {...cl, easing: EASE.arrive}),
    roadmapFade: interpolate(frame, [s(5.6), s(6.2)], [0, 1], cl),
    idem: interpolate(frame, [s(6.4), s(7.0)], [0, 1], {...cl, easing: EASE.arrive}),
    third: interpolate(frame, [s(7.4), s(8.0)], [0, 1], cl),
  };
  const titleOn = frame < s(5.6);
  // parallax planes: far grid/haze move least, foreground bokeh most (04 §1.2: 3–5 planes)
  const par = (m: number) => `translate(${-ang * 260 * m}px, ${k * 30 * m}px) scale(${1 + k * 0.08 * m})`;
  const mask = off.has('mask') ? {} : textSafeMask(rectsFor(cam, st, titleOn), fx);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: par(0.3)}}>
        <Backdrop fx={fx} tint={C.violet} shaft={false} />
      </AbsoluteFill>
      {off.has('grid') ? null : (
        <AbsoluteFill style={{transform: par(0.6)}}>
          <FloorGrid y={860} drift={frame * 0.3} opacity={0.18} />
        </AbsoluteFill>
      )}
      {off.has('plate') ? null : <Field mask={mask} plate="push" blend={!off.has('blend')} still={off.has('video')} seq={!off.has('mp4')} />}
      {titleOn ? <Scrim r={TITLE_RECT} strength={0.5} /> : null}
      {off.has('overlay') ? null : <ProbeOverlay cam={cam} st={st} typo={typo} fx={fx} labelAt={s(1.9)} />}
      {fx.webgl ? <ForegroundGL cam={cam} style={mask} /> : null}
      {off.has('title') || frame >= s(5.6) ? null : (
        <div style={{position: 'absolute', right: 120, top: 64, textAlign: 'right'}}>
          <KWord text="بيحوّل النص لموضع" at={s(0.4)} typo={typo} fx={fx} size={104} preset="impact" out={s(5.2)} />
        </div>
      )}
      {off.has('bokeh') ? null : (
        <AbsoluteFill style={{transform: par(2.2)}}>
          <Bokeh fx={fx} seed="mb" drift={frame * 0.6} />
        </AbsoluteFill>
      )}
      {off.has('post') ? null : off.has('grain') ? <Vignette fx={fx} /> : <Post fx={fx} />}
    </AbsoluteFill>
  );
};
