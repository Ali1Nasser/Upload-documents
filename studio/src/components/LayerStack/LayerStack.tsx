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
import React, {useMemo} from 'react';
import {C, FONT, SIZE} from '../../tokens';
import {MixedText} from '../../type/Text';
import {isArabic} from '../../type/arabic';
import {ease, flashFrames, presetFrames, revealProgress, revealStyle} from '../../type/reveal';
import {glow, halo} from '../../fx/look';
import type {DcComponent, DcProps} from '../../spec/types';
import type {Props} from './schema';
import {formatValue} from '../NumberCounter/NumberCounter';
import {GlyphIcon, acts, alpha, bornAt, dirOf, exitStyle, fitScale, mix, useMeasure, type Glyph} from '../_struct-a/kit';

type Ctx = DcProps<Props>['ctx'];
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
  const items = [...props.layers.map((l) => ({text: l.label, size: fs0, role: isArabic(l.label) ? ('sentence' as const) : ('code' as const)})), ...sizes.map((s) => ({text: s || '0', size: fs0, role: 'data' as const}))];
  const m = useMeasure(ctx.id, items);
  const dir = dirOf(props.layers.map((l) => l.label));
  const rtl = dir === 'rtl';

  const geo = useMemo(() => {
    if (!m.w) return null;
    const w = m.w as number[];
    const hF = Math.round(fs0 * 2.0);
    const depth = Math.round(hF * 0.7);
    // the top face (dy) of a slab sits in the gap above it: the gap is dy + a margin, so no face ever crosses the copy of the slab above
    const gap = Math.round(depth * 0.55 + fs0 * 0.3);
    const icon = Math.round(hF * 0.55);
    const hasSize = sizes.some(Boolean);
    const sizeW = hasSize ? Math.max(...sizes.map((s, i) => (s ? w[n + i] : 0))) + fs0 * 1.2 : 0;
    const W0 = Math.max(...w.slice(0, n)) + fs0 * 1.6 + icon + fs0 * 0.6 + sizeW;
    const lift = gap * 0.4;
    const nat = {w: W0 + depth * 0.9, h: n * hF + (n - 1) * gap + depth * 0.55 + lift};
    const fit = fitScale(ctx.id, nat, {w: ctx.box.w, h: ctx.box.h}, fs0, SIZE.labelMin, 1.35);
    const s = fit.s;
    const ox = (ctx.box.w - nat.w * s) / 2;
    const oy = (ctx.box.h - nat.h * s) / 2 + (depth * 0.55 + lift) * s;
    // slab i front face: x = ox, y = bottom-up
    const ys = props.layers.map((_, i) => oy + (n - 1 - i) * (hF + gap) * s);
    return {s, fs: fit.fs, overflow: fit.overflow, ox, ys, W: W0 * s, hF: hF * s, dx: depth * 0.9 * s, dy: depth * 0.55 * s, icon: icon * s, sizeW: sizeW * s, lift: lift * s};
  }, [m.w, props.layers, n, ctx.box.w, ctx.box.h, ctx.id, fs0]);

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
    const next = hls[k + 1];
    const fade = next && t >= next.at ? 1 - revealProgress(t - next.at, lab) : 1;
    hl[i] = Math.max(hl[i], revealProgress(t - a.at, presetFrames('arrive', fps)) * fade);
  });
  const anyHl = Math.max(0, ...hl);

  // painter's order: top slab first is BEHIND? No: oblique depth goes up-right, so lower slabs overlap the top face of nothing;
  // draw bottom -> top so each slab's top face is covered by the slab above's front face.
  const order = props.layers.map((_, i) => i);
  return (
    <div style={{position: 'absolute', left: ctx.box.x, top: ctx.box.y, width: ctx.box.w, height: ctx.box.h, ...exitStyle(ctx, dir)}}>
      {m.node}
      {order.map((i) => {
        const L = props.layers[i];
        const c = cas[i];
        const q = revealProgress(t - born[i], lab);
        if (q <= 0) return null;
        const cached = !!L.cached && !c.built && c.inv <= 0;
        const fresh = c.built ? c.build : 0;
        let col: string = cached ? C.ok : C.ink3;
        col = mix(col, C.signal, Math.max(hl[i], fresh));
        col = mix(col, C.crit, c.inv);
        const flash = c.invSince >= 0 && c.invSince < ff * 4 ? (c.invSince < ff ? 1 : 1 - (c.invSince - ff) / (3 * ff)) : 0;
        const drop = (1 - q) * 18 * geo.s;
        const y = geo.ys[i] - hl[i] * geo.lift - drop;
        const x = geo.ox;
        // dimming goes through colour, never a group opacity < 1 (an offscreen layer across raster tiles breaks snapshot determinism)
        const dim = anyHl > 0 && hl[i] < 0.5 ? 1 - 0.35 * anyHl : 1;
        const dm = (x: string) => (dim < 1 ? mix(x, C.ground, 1 - dim) : x);
        col = dm(col);
        const k = (cached ? 0.45 : 0) + hl[i] * 0.8 + c.hit * 0.6 + flash * 1.2 + fresh * 0.5;
        const g: Glyph = c.inv > 0.5 ? 'cross' : c.built && c.build < 1 ? 'spin' : cached ? 'check' : c.built ? 'dot' : docker ? 'dot' : 'layers';
        const top = `${x},${y} ${x + geo.dx},${y - geo.dy} ${x + geo.W + geo.dx},${y - geo.dy} ${x + geo.W},${y}`;
        const side = `${x + geo.W},${y} ${x + geo.W + geo.dx},${y - geo.dy} ${x + geo.W + geo.dx},${y - geo.dy + geo.hF} ${x + geo.W},${y + geo.hF}`;
        const ar = isArabic(L.label);
        const sz = sizes[i];
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: 0, ...(q < 1 ? {opacity: q} : {})}}>
            <svg width={ctx.box.w} height={ctx.box.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
              <polygon points={top} fill={mix(C.panel, col, 0.22)} fillOpacity={0.95} stroke={col} strokeOpacity={0.7} strokeWidth={1.5 * geo.s} strokeLinejoin="round" />
              <polygon points={side} fill={mix(C.void, col, 0.12)} fillOpacity={0.95} stroke={col} strokeOpacity={0.45} strokeWidth={1.5 * geo.s} strokeLinejoin="round" />
            </svg>
            <div
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
                padding: `0 ${0.8 * geo.fs}px`,
                gap: 0.6 * geo.fs,
                overflow: 'hidden',
                outline: geo.overflow ? `2px dashed ${C.crit}` : undefined,
              }}
            >
              {c.built && c.build < 1 ? (
                // rebuild progress across the face (reading direction)
                <div style={{position: 'absolute', top: 0, bottom: 0, [rtl ? 'right' : 'left']: 0, width: `${(c.build * 100).toFixed(2)}%`, background: alpha(C.warn, 0.16), borderInlineEnd: `2px solid ${C.warn}`}} />
              ) : null}
              <div style={{width: geo.icon, height: geo.icon, flex: 'none', position: 'relative'}}>
                <GlyphIcon g={g} color={col} turn={c.built ? c.build : 0} />
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: rtl ? 'flex-end' : 'flex-start',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  fontSize: geo.fs,
                  color: dm(C.ink),
                  textShadow: halo,
                  lineHeight: 1.3,
                  ...revealStyle(t - born[i], fps, 'label', ar ? 'rtl' : 'ltr').style,
                  transform: undefined,
                }}
              >
                <MixedText id={`${ctx.id}:l${i}`} text={L.label} size={geo.fs} weight={ar ? FONT.label.strong : FONT.mono.weight} role={ar ? 'sentence' : 'code'} />
              </div>
              {sz ? (
                <div style={{flex: 'none', width: geo.sizeW, display: 'flex', justifyContent: rtl ? 'flex-start' : 'flex-end', fontSize: geo.fs * 0.9, color: dm(C.ink2), textShadow: halo, position: 'relative'}}>
                  <bdi dir="ltr" data-dc-text={`${ctx.id}:s${i}`} style={{fontFamily: `'${FONT.mono.family}'`, fontWeight: FONT.mono.weight, fontFeatureSettings: '"tnum" 1'}}>
                    {sz}
                  </bdi>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const LayerStack: DcComponent<Props> = {name: 'LayerStack', Component: LayerStackView, text: true, slot: 'center'};
