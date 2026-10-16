// LayerStack (catalog: Structure & flow). Stacked translucent slabs (04 section 6: Docker layers = translucent slabs where cache hits
// glow; changing an early layer invalidates everything above, the cascade of §6.7; OSI / network stacks; model layers; backend
// floors controller / service / repository; warehouse terraces ODS -> DW -> ADS -> marts as `generic`). layers[0] is the BOTTOM slab.
// Each slab is an acrylic block in oblique depth (front face = glass plate with the label, lit top face and darker side face, key
// light from the upper right, 04 section 1.2). Docker: Latin instructions in mono; cached layers carry an ok check and an ok edge
// glow; an optional `size` (a data-contract Num with ref) sits on the reading-end side in mono tabular figures.
// Entrance: slabs settle bottom-up from the layer anchor (label preset + a short drop).
// Actions (on the word that names them, 04 section 4 lead -2 f; RV1 = first visible step on the anchor frame):
//   highlight   -> the slab lifts and glows signal, the others dim (a later highlight replaces it);
//   rebuildFrom -> the cascade: the slab at `index` and every slab above flash crit (cache busted) in an upward wave, then rebuild
//                  one by one (warn progress bar across the face, then a fresh signal edge); slabs below pulse ok (cache hits).
// The stack auto-fits ctx.box (labels >= 28 px, SIZE.labelMin), else DC_QA overflow (snapshot fails).
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {MixedText} from '../../type/Text';
import {reportQa} from '../../type/qa';
import {arabicFace, isArabic} from '../../type/arabic';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {glow, halo} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {GlyphIcon, acts, alpha, bornAt, dirOf, exitStyle, fitScale, mix, useMeasure, type Glyph} from '../_struct-a/kit';

type Ctx = DcProps<Props>['ctx'];
/** Minimum clear padding between a label's ink and its slab border, in px at 1080 (critic round 2). */
const SLAB_PAD_MIN = 24;
const sizeText = (s: NonNullable<Props['layers'][number]['size']>) => `${formatValue(s.value, 'decimal', s.decimals ?? 0)}${s.unit ? ` ${s.unit}` : ''}`;

type SlabSt = {inv: number; invSince: number; build: number; built: boolean; hit: number};
/** Cascade state per slab at frame t (latest rebuildFrom wins). */
const cascade = (p: Props, ctx: Ctx, t: number): SlabSt[] => {
  const n = p.layers.length;
  const st: SlabSt[] = p.layers.map(() => ({inv: 0, invSince: -1, build: 0, built: false, hit: 0}));
  const lab = presetFrames('label', ctx.fps);
  const morph = presetFrames('morph', ctx.fps, true);
  const step = Math.max(1, Math.round(lab / 2));
  for (const a of acts(ctx, 'rebuildFrom')) {
    const from = Math.min(n - 1, a.props.index as number);
    if (t < a.at) continue;
    const count = n - from;
    for (let j = 0; j < n; j++) {
      if (j < from) {
        const since = t - a.at;
        st[j] = {...st[j], hit: since < morph * 2 ? 1 - revealProgress(since - morph, morph) : 0};
        continue;
      }
      const tInv = a.at + (j - from) * step;
      const tB = a.at + count * step + lab + (j - from) * morph;
      st[j] = {
        inv: t >= tInv ? revealProgress(t - tInv, lab) * (t >= tB ? 1 - revealProgress(t - tB, morph) : 1) : 0,
        invSince: t >= tInv ? t - tInv : -1,
        build: t >= tB ? revealProgress(t - tB, morph, ease.camera) : 0,
        built: t >= tB,
        hit: 0,
      };
    }
  }
  return st;
};

export const LayerStackView: React.FC<DcProps<Props>> = ({props, ctx}) => {
  const n = props.layers.length;
  const fs0 = n <= 6 ? SIZE.body : SIZE.label;
  const docker = props.variant === 'docker';
  const sizes = props.layers.map((l) => (l.size ? sizeText(l.size) : ''));
  const maxUp = n <= 4 ? 1.7 : 1.35;
  // Labels are measured at two sizes: the Arabic face switches at FONT.arDisplay.minPx (Alexandria 700 is wider than IBM Plex 600),
  // so a stack that fits at 40 px and renders at 68 px would be wider than measured (critic round 2: the ADS label hit the border).
  const fsBig = Math.max(Math.round(fs0 * maxUp), FONT.arDisplay.minPx);
  const lrole = (l: string) => (isArabic(l) ? ('sentence' as const) : ('code' as const));
  const items = [
    ...props.layers.map((l) => ({text: l.label, size: fs0, role: lrole(l.label)})),
    ...sizes.map((s) => ({text: s || '0', size: fs0, role: 'data' as const})),
    ...props.layers.map((l) => ({text: l.label, size: fsBig, role: lrole(l.label)})),
  ];
  const m = useMeasure(ctx.id, items);
  const dir = dirOf(props.layers.map((l) => l.label));
  const rtl = dir === 'rtl';

  const geo = useMemo(() => {
    if (!m.w) return null;
    const w = m.w as number[];
    // nominal (fs0) label widths for the small face, and for the display face (measured at fsBig, scaled linearly to fs0)
    const wSmall = w.slice(0, n);
    const wBig = w.slice(2 * n, 3 * n).map((x) => (x * fs0) / fsBig);
    const hF = Math.round(fs0 * 2.0);
    const depth = Math.round(hF * 0.7);
    // the top face (dy) of a slab sits in the gap above it: the gap is dy + the highlight lift + a margin, so no face ever crosses the
    // copy of the slab above, even when the slab is lifted (critic round 1 item 2)
    const lift = Math.round(fs0 * 0.2);
    const gap = Math.round(depth * 0.55 + lift + fs0 * 0.3);
    const icon = Math.round(hF * 0.55);
    const hasSize = sizes.some(Boolean);
    const sizeW = hasSize ? Math.max(...sizes.map((s, i) => (s ? w[n + i] : 0))) + fs0 * 1.2 : 0;
    const layout = (wl: number[]) => {
      const W0 = Math.max(...wl) + fs0 * 1.6 + icon + fs0 * 0.6 + sizeW + fs0 * 0.3;
      return {W0, nat: {w: W0 + depth * 0.9, h: n * hF + (n - 1) * gap + depth * 0.55 + lift}};
    };
    const fitFor = (L: ReturnType<typeof layout>) => fitScale(ctx.id, L.nat, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin, maxUp);
    // the face depends on the rendered size, which depends on the fit: fit with the small face; if that lands on the display face,
    // refit with the display widths; if that drops back below the switch, stay just under it on the small face
    const aA = fitFor(layout(wSmall));
    let L0 = layout(wSmall);
    let fit = aA;
    if (arabicFace(aA.fs).family !== arabicFace(fs0).family) {
      const lb = layout(wBig);
      const fb = fitFor(lb);
      if (arabicFace(fb.fs).family === arabicFace(aA.fs).family) {
        L0 = lb;
        fit = fb;
      } else {
        const cap = (FONT.arDisplay.minPx - 0.5) / fs0;
        const sc = Math.min(aA.s, cap);
        fit = {s: sc, fs: fs0 * sc, overflow: aA.overflow};
      }
    }
    const {W0, nat} = L0;
    const s = fit.s;
    const ox = (ctx.box.w - nat.w * s) / 2;
    const oy = (ctx.box.h - nat.h * s) / 2 + (depth * 0.55 + lift) * s;
    // slab i front face: x = ox, y = bottom-up
    const ys = props.layers.map((_, i) => oy + (n - 1 - i) * (hF + gap) * s);
    return {s, fs: fit.fs, overflow: fit.overflow, ox, ys, W: W0 * s, hF: hF * s, dx: depth * 0.9 * s, dy: depth * 0.55 * s, icon: icon * s, sizeW: sizeW * s, lift: lift * s};
  }, [m.w, props.layers, n, ctx.box.w, ctx.box.h, ctx.id, fs0]);

  // Overflow lint (critic: ADS label touched the slab border): after layout, every label's ink box must keep >= SLAB_PAD_MIN px (at
  // 1080) of clear padding inside its slab, measured in layout px (the camera transform is divided out). A violation is a
  // DC_QA overflow finding, so snapshot tests and spec renders fail on it.
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !geo) return;
    el.querySelectorAll<HTMLElement>('[data-ls-slab]').forEach((sl, k) => {
      const tx = sl.querySelector<HTMLElement>('[data-ls-label] [data-dc-text]');
      if (!tx || !sl.offsetWidth) return;
      const a = sl.getBoundingClientRect();
      const b = tx.getBoundingClientRect();
      const u = a.width / sl.offsetWidth;
      const left = (b.left - a.left) / u;
      const right = (a.right - b.right) / u;
      if (left < SLAB_PAD_MIN - 0.5 || right < SLAB_PAD_MIN - 0.5) reportQa('overflow', `${ctx.id}:slab${sl.dataset.lsSlab || k}`, {slab: 'label pad', left: Math.round(left), right: Math.round(right), min: SLAB_PAD_MIN});
    });
  });
  if (!geo) return <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y}}>{m.node}</div>;

  const t = ctx.frame;
  const fps = ctx.fps;
  const lab = presetFrames('label', fps);
  const ff = flashFrames(fps);
  const born = props.layers.map((_, i) => bornAt(ctx, i, n));
  const cas = cascade(props, ctx, t);
  const hls = acts(ctx, 'highlight');
  const hl = new Array<number>(n).fill(0);
  hls.forEach((a, k) => {
    const i = a.props.index as number;
    if (i >= n || t < a.at) return;
    // a later highlight or a rebuildFrom replaces this highlight (the cascade is read on its own)
    const nexts = [hls[k + 1]?.at, ...acts(ctx, 'rebuildFrom').map((r) => r.at).filter((x) => x > a.at)].filter((x): x is number => x !== undefined);
    const nx = nexts.length ? Math.min(...nexts) : undefined;
    const fade = nx !== undefined && t >= nx ? 1 - revealProgress(t - nx, lab) : 1;
    hl[i] = Math.max(hl[i], revealProgress(t - a.at, presetFrames('arrive', fps)) * fade);
  });
  const anyHl = Math.max(0, ...hl);

  // Faces: ONE svg holds every slab's top and side face (they sit in the gap above / beside their slab, never under another slab's
  // front plate); the front plates are separate DOM boxes drawn after it. No wrapper group carries an opacity and no plate clips its
  // children (an offscreen group or a rounded overflow clip splits into raster tiles whose seams differ between renders, struct-a L1).
  const slabs = props.layers.map((L, i) => {
    const c = cas[i];
    const q = revealProgress(t - born[i], lab);
    const cached = !!L.cached && !c.built && c.inv <= 0;
    const fresh = c.built ? c.build : 0;
    let col: string = cached ? C.ok : C.ink3;
    col = mix(col, C.signal, Math.max(hl[i], fresh));
    col = mix(col, C.crit, c.inv);
    // dimming goes through colour, never an opacity < 1
    const dim = anyHl > 0 && hl[i] < 0.5 ? 1 - 0.3 * anyHl : 1;
    const dm = (x: string) => (dim < 1 ? mix(x, C.ground, 1 - dim) : x);
    // label ink dims only a little so dimmed slabs stay readable at 960 (critic round 1 item 3)
    const dmInk = (x: string) => (dim < 1 ? mix(x, C.ground, (1 - dim) * 0.45) : x);
    return {i, L, c, q, cached, fresh, col: dm(col), dm, dmInk, y: geo.ys[i] - hl[i] * geo.lift - (1 - q) * 18 * geo.s};
  });
  return (
    <div ref={root} style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <radialGradient id={`${ctx.id}-floor`}>
            <stop offset="0" stopColor={C.void} stopOpacity={0.85} />
            <stop offset="1" stopColor={C.void} stopOpacity={0} />
          </radialGradient>
        </defs>
        {slabs[0].q > 0 ? (
          <ellipse cx={geo.ox + (geo.W + geo.dx) / 2} cy={geo.ys[0] + geo.hF + geo.dy * 0.35} rx={(geo.W + geo.dx) * 0.6} ry={geo.dy * 1.25} fill={`url(#${ctx.id}-floor)`} opacity={slabs[0].q} />
        ) : null}
        {slabs.map(({i, q, col, y}) => {
          if (q <= 0) return null;
          const x = geo.ox;
          const top = `${x},${y} ${x + geo.dx},${y - geo.dy} ${x + geo.W + geo.dx},${y - geo.dy} ${x + geo.W},${y}`;
          const side = `${x + geo.W},${y} ${x + geo.W + geo.dx},${y - geo.dy} ${x + geo.W + geo.dx},${y - geo.dy + geo.hF} ${x + geo.W},${y + geo.hF}`;
          return (
            <g key={i}>
              <polygon points={top} fill={mix(C.panel, col, 0.22)} fillOpacity={0.95 * q} stroke={col} strokeOpacity={0.7 * q} strokeWidth={1.5 * geo.s} strokeLinejoin="round" />
              <polygon points={side} fill={mix(C.void, col, 0.12)} fillOpacity={0.95 * q} stroke={col} strokeOpacity={0.45 * q} strokeWidth={1.5 * geo.s} strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>
      {slabs.map(({i, L, c, q, cached, fresh, col, dm, dmInk, y}) => {
        if (q <= 0) return null;
        const flash = c.invSince >= 0 && c.invSince < ff * 4 ? (c.invSince < ff ? 1 : 1 - (c.invSince - ff) / (3 * ff)) : 0;
        const x = geo.ox;
        const k = (cached ? 0.45 : 0) + hl[i] * 0.8 + c.hit * 0.6 + flash * 1.2 + fresh * 0.5;
        const g: Glyph = c.inv > 0.5 ? 'cross' : c.built && c.build < 1 ? 'spin' : cached ? 'check' : c.built ? 'dot' : docker ? 'dot' : 'layers';
        const ar = isArabic(L.label);
        const sz = sizes[i];
        const rv = revealStyle(t - born[i], fps, 'label', ar ? 'rtl' : 'ltr').style;
        const pad = Math.max(0.8 * geo.fs, SLAB_PAD_MIN);
        return (
          <div
            key={i}
            data-ls-slab={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: geo.W,
              height: geo.hF,
              boxSizing: 'border-box',
              borderRadius: 4 * geo.s,
              background: `linear-gradient(180deg, ${alpha(C.panel, 0.94)} 0%, ${alpha(C.ground, 0.9)} 100%)`,
              border: `${2 * geo.s}px solid ${col}`,
              boxShadow: `inset 0 1px 0 ${alpha(C.ink, 0.12)}, inset 0 0 0 999px ${alpha(col, 0.06 + 0.1 * Math.max(hl[i], c.inv, cached ? 0.5 : 0))}${k > 0 ? `, ${glow(col, ctx.fx, k)}` : ''}`,
              display: 'flex',
              flexDirection: rtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              padding: `0 ${pad}px`,
              gap: 0.6 * geo.fs,
              outline: geo.overflow ? `2px dashed ${C.crit}` : undefined,
              opacity: q < 1 ? q : undefined,
            }}
          >
            {c.built && c.build < 1 ? (
              // rebuild progress across the face (reading direction), inside the border, no clipping needed
              <div style={{position: 'absolute', top: 0, bottom: 0, [rtl ? 'right' : 'left']: 0, width: `${(c.build * 100).toFixed(2)}%`, background: alpha(C.warn, 0.16), [rtl ? 'borderLeft' : 'borderRight']: `2px solid ${C.warn}`}} />
            ) : null}
            <div style={{width: geo.icon, height: geo.icon, flex: 'none', position: 'relative'}}>
              <GlyphIcon g={g} color={col} turn={c.built ? c.build : 0} />
            </div>
            <div
              data-ls-label=""
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: rtl ? 'flex-end' : 'flex-start',
                position: 'relative',
                whiteSpace: 'nowrap',
                fontSize: geo.fs,
                color: dmInk(C.ink),
                textShadow: halo,
                lineHeight: 1.3,
                ...rv,
                transform: undefined,
                opacity: undefined,
              }}
            >
              <MixedText id={`${ctx.id}:l${i}`} text={L.label} size={geo.fs} weight={ar ? FONT.label.strong : FONT.mono.weight} role={ar ? 'sentence' : 'code'} />
            </div>
            {sz ? (
              <div style={{flex: 'none', width: geo.sizeW, display: 'flex', justifyContent: rtl ? 'flex-start' : 'flex-end', fontSize: geo.fs * 0.9, color: dmInk(sz && !L.cached ? C.ink : C.ink2), textShadow: halo, position: 'relative'}}>
                <bdi dir="ltr" data-dc-text={`${ctx.id}:s${i}`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontFeatureSettings: '"tnum" 1'}}>
                  {sz}
                </bdi>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const LayerStack: DcComponent<Props> = {name: 'LayerStack', Component: LayerStackView, text: true, slot: 'center'};
