// Vector galaxy (CH-33 §6.18). One seeded 3D field, two renderers sharing the same camera maths:
// standard tier = SVG point sprites, hero tier = R3F points + postprocessing Bloom; both capped at fx.particles (1,500, ADR-002).
// Text-safe masks (ADR-002): particles, nebula and bloom are masked out of every text box plus padding.
import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Bloom, EffectComposer} from '@react-three/postprocessing';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Backdrop, Bokeh, FloorGrid, Glass, KWord, Mix, Post, Rect, Scrim, TermChip, textSafeMask} from './kit';
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
  return {x: right ? p.x + CARD.off : p.x - CARD.off - CARD.w, y: p.y - CARD.lift, w: CARD.w, h: CARD.h};
};
export const TITLE_RECT: Rect = {x: 900, y: 64, w: 900, h: 140};
export const CAPTION_RECT: Rect = {x: 760, y: 890, w: 1040, h: 96};
export const CHIP_RECT: Rect = {x: 120, y: 90, w: 420, h: 60};

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
        {nb.map((n) => {
          if (n.k <= 0) return null;
          const p = project(c, n.v);
          const ex = q.x + (p.x - q.x) * Math.min(1, n.k * 1.4);
          const ey = q.y + (p.y - q.y) * Math.min(1, n.k * 1.4);
          const dashed = n.key === 'roadmap' && st.roadmapFade > 0;
          return (
            <g key={n.key} opacity={Math.min(1, n.k * 1.5) * n.dim}>
              <line x1={q.x} y1={q.y} x2={ex} y2={ey} stroke={n.col} strokeWidth={n.key === 'third' ? 2 : 3.5} strokeDasharray={dashed || n.key === 'third' ? '8 10' : undefined} style={{filter: `drop-shadow(0 0 ${fx.glowInner}px ${n.col})`}} />
              <circle cx={p.x} cy={p.y} r={n.key === 'third' ? 9 : 14} fill={n.col} style={{filter: `drop-shadow(0 0 ${fx.glowPx * 0.7}px ${n.col})`}} />
              <circle cx={p.x} cy={p.y} r={n.key === 'third' ? 18 : 30} fill="none" stroke={n.col} strokeOpacity={0.5} strokeWidth={1.5} />
            </g>
          );
        })}
        {st.probe > 0 ? (
          <g opacity={st.probe}>
            <circle cx={q.x} cy={q.y} r={44 * pulse} fill="none" stroke={C.signal} strokeOpacity={0.35} strokeWidth={2} />
            <circle cx={q.x} cy={q.y} r={24} fill="none" stroke={C.signal} strokeWidth={3} style={{filter: `drop-shadow(0 0 ${fx.glowPx}px ${C.signal})`}} />
            <circle cx={q.x} cy={q.y} r={9} fill={C.ink} style={{filter: `drop-shadow(0 0 ${fx.glowInner}px ${C.signal})`}} />
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
            <div>
              <Mix text={n.label} latFont={typo.mono} latWeight={500} size={36} style={{color: C.ink, textShadow: halo}} />
            </div>
            <div>
              <Mix text={n.note} latFont={typo.mono} latWeight={500} size={30} style={{color: C.ink2, textShadow: halo}} />
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
        <Glass accent={C.signal} style={{right: 120, bottom: 96, padding: '18px 28px', opacity: st.probe, whiteSpace: 'nowrap'}}>
          <KWord text={RAG.queryAr} at={labelAt} typo={typo} fx={fx} size={40} color={C.ink} glowColor={C.void} weight={600} />
        </Glass>
      ) : null}
    </AbsoluteFill>
  );
};

export const CAM_FINAL: Cam = {pos: [1.6, 0.9, 7.2], target: [0.1, 0.25, 0.6]};
export const STATE_FINAL: ProbeState = {q: ANCHOR.q1, probe: 1, roadmap: 1, roadmapFade: 1, idem: 1, third: 1};

/** Field layers (nebula + points) with the text-safe mask applied. GL keeps screen blending on the masked element itself. */
const Field: React.FC<{cam: Cam; fx: Fx; rects: Rect[]}> = ({cam, fx, rects}) => {
  const mask = textSafeMask(rects, fx);
  return (
    <>
      <AbsoluteFill style={mask}>
        <Nebula cam={cam} fx={fx} />
        {fx.webgl ? null : <GalaxySVG n={fx.particles} cam={cam} fx={fx} />}
      </AbsoluteFill>
      {fx.webgl ? <GalaxyGL n={fx.particles} cam={cam} fx={fx} style={mask} /> : null}
    </>
  );
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
  return (
    <AbsoluteFill>
      <Backdrop fx={fx} tint={C.violet} shaft={false} />
      <FloorGrid y={860} drift={frame * 0.3} opacity={0.18} />
      <Field cam={CAM_FINAL} fx={fx} rects={rectsFor(CAM_FINAL, STATE_FINAL, true)} />
      <Scrim r={TITLE_RECT} />
      <ProbeOverlay cam={CAM_FINAL} st={STATE_FINAL} typo={typo} fx={fx} />
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
export const MBGalaxyPush: React.FC<{typo: Typo; fx: Fx}> = ({typo, fx}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const s = (sec: number) => Math.round(sec * fps);
  const k = interpolate(frame, [0, durationInFrames - 1], [0, 1], {easing: EASE.camera});
  const ang = interpolate(k, [0, 1], [-0.32, 0.18]);
  const dist = interpolate(k, [0, 1], [17, 7.4]);
  const tgt: [number, number, number] = [0.1, 0.25, 0.6];
  const cam: Cam = {pos: [tgt[0] + Math.sin(ang) * dist, tgt[1] + 0.6 + 0.3 * (1 - k), tgt[2] + Math.cos(ang) * dist], target: tgt};
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
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: par(0.3)}}>
        <Backdrop fx={fx} tint={C.violet} shaft={false} />
      </AbsoluteFill>
      <AbsoluteFill style={{transform: par(0.6)}}>
        <FloorGrid y={860} drift={frame * 0.3} opacity={0.18} />
      </AbsoluteFill>
      <Field cam={cam} fx={fx} rects={rectsFor(cam, st, titleOn)} />
      {titleOn ? <Scrim r={TITLE_RECT} /> : null}
      <ProbeOverlay cam={cam} st={st} typo={typo} fx={fx} labelAt={s(1.9)} />
      <div style={{position: 'absolute', right: 120, top: 64, textAlign: 'right'}}>
        <KWord text="بيحوّل النص لموضع" at={s(0.4)} typo={typo} fx={fx} size={104} preset="impact" out={s(5.2)} />
      </div>
      <AbsoluteFill style={{transform: par(2.2)}}>
        <Bokeh fx={fx} seed="mb" drift={frame * 0.6} />
      </AbsoluteFill>
      <Post fx={fx} />
    </AbsoluteFill>
  );
};
