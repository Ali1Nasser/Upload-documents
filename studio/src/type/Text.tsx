// P7 typography engine, React side. Arabic-first kinetic type on top of the FROZEN rules in ./arabic.ts.
//  - MixedText: Arabic runs + <bdi dir="ltr"> Latin isolates, ADR-010 tatweel join gap, cv08 serifed I, Western digits.
//  - useAutoFit: fit a run to its slot (safe area) by size, never below a floor; overflow is REPORTED (tests fail).
//  - KText: one whole kinetic element (word / phrase / number) with a preset reveal; never split per letter.
//  - LabelRow: one baseline, >= 40 px between labels (AT-4), auto-fit, overflow detector.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {C, FONT, LINE, type Fx, type PresetId} from '../tokens';
import {glow, halo, caShadow} from '../fx/look';
import {arabicFace, isArabic, joinGapEm, latinFamily, lineHeightFor, segment, type LatinRole} from './arabic';
import {fontsReady} from './fonts';
import {reportQa} from './qa';
import {fitBegin, fitEnd} from './settle';
import {revealStyle, type RevealDir} from './reveal';
import {LABEL_GAP_MIN_PX, checkLabelRow} from './safe';
import {fitToWidth, hasEasternDigits, latinFeatures, westernDigits} from './words';

/** Latin isolates are set at 0.92 of the Arabic size so x-heights sit together (look-dev r1, kept). */
export const LAT_SCALE = 0.92;

export type MixedTextProps = {
  text: string;
  size: number; // rendered px (selects the face band and the ADR-010 join-gap band)
  role?: LatinRole; // sentence -> Inter Tight in the Arabic colour; chip / code / data -> JetBrains Mono
  weight?: number;
  color?: string;
  latColor?: string;
  caLatin?: string; // extra text-shadow for Latin / numeral isolates only (CA), never on Arabic
  id?: string;
};

/** Mixed Arabic / Latin run. The browser shapes; this component only isolates runs and spaces the tatweel join. */
export const MixedText: React.FC<MixedTextProps> = ({text, size, role = 'sentence', weight, color, latColor, caLatin, id}) => {
  if (hasEasternDigits(text)) reportQa('digits', id ?? text.slice(0, 16), text);
  const t = westernDigits(text);
  const face = arabicFace(size);
  const lat = latinFamily(role);
  const latW = role === 'sentence' ? FONT.lat.weight : FONT.mono.weight;
  const segs = segment(t);
  if (!isArabic(t)) {
    // pure Latin / numeric copy: one LTR isolate in the Latin face
    return (
      <bdi dir="ltr" data-dc-text={id ?? 'lat'} style={{fontFamily: `'${lat}'`, fontWeight: weight ?? latW, color, fontFeatureSettings: latinFeatures(t) ?? '"tnum" 1', textShadow: caLatin}}>
        {t}
      </bdi>
    );
  }
  return (
    <span dir="rtl" lang="ar" data-dc-text={id ?? 'ar'} style={{fontFamily: `'${face.family}', '${lat}'`, fontWeight: weight ?? face.weight, wordSpacing: face.wordSpacing, unicodeBidi: 'isolate', color}}>
      {segs.map((s, i) => {
        if (!s.ltr) return <React.Fragment key={i}>{s.t}</React.Fragment>;
        const prev = segs[i - 1];
        const gap = prev && !prev.ltr ? joinGapEm(prev.t, s.t, size) : 0; // ADR-010 bands, em of the Arabic run
        return (
          <bdi
            key={i}
            dir="ltr"
            lang="en"
            style={{
              fontFamily: `'${lat}', '${face.family}'`,
              fontWeight: latW,
              fontSize: `${LAT_SCALE}em`,
              color: latColor,
              fontFeatureSettings: latinFeatures(s.t) ?? '"tnum" 1',
              textShadow: caLatin,
              marginRight: gap ? `${+(gap / LAT_SCALE).toFixed(4)}em` : undefined, // physical right = the side facing the Arabic prefix in RTL
            }}
          >
            {s.t}
          </bdi>
        );
      })}
    </span>
  );
};

// ---------- auto-fit ----------
export type FitOpts = {id: string; size: number; min: number; maxW: number; maxH?: number; key?: string};
/**
 * Measures the natural (max-content) box of `ref` at the current size after fonts are ready and returns the largest size that
 * fits maxW x maxH, never below `min`. If even `min` does not fit, `overflow` is true and a DC_QA overflow finding is logged.
 */
export const useAutoFit = (ref: React.RefObject<HTMLElement | null>, o: FitOpts): {size: number; overflow: boolean} => {
  const [fit, setFit] = useState({size: o.size, overflow: false});
  const [ok, setOk] = useState(false);
  const [handle] = useState(() => {
    if (typeof document === 'undefined') return null;
    fitBegin(); // M8: post-layout QA waits until every pending fit has settled (settle.ts)
    return delayRender(`fit ${o.id}`);
  });
  const released = useRef(false);
  const release = () => {
    if (handle !== null && !released.current) {
      released.current = true;
      continueRender(handle);
      fitEnd();
    }
  };
  useLayoutEffect(() => {
    let live = true;
    fontsReady()
      .then(() => document.fonts.ready)
      .then(() => {
        if (live) setOk(true);
      });
    return () => {
      live = false;
      release(); // never leave a pending delayRender behind an unmounted layer
    };
  }, []);
  useLayoutEffect(() => {
    if (!ok) return;
    const el = ref.current;
    if (el) {
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      const natW = (w * o.size) / fit.size;
      const natH = (h * o.size) / fit.size;
      let r = fitToWidth(natW, o.size, o.maxW, o.min);
      if (o.maxH && (natH * r.size) / o.size > o.maxH) {
        const s2 = Math.floor((o.maxH * o.size) / natH / 2) * 2;
        r = s2 < o.min ? {size: o.min, overflow: true, natural: natW} : {size: Math.min(r.size, s2), overflow: r.overflow, natural: natW};
      }
      if (r.size !== fit.size || r.overflow !== fit.overflow) {
        setFit({size: r.size, overflow: r.overflow});
        return; // re-measure after the re-render
      }
      if (r.overflow) reportQa('overflow', o.id, {natural_w: Math.round(natW), natural_h: Math.round(natH), max_w: o.maxW, max_h: o.maxH ?? null, min: o.min});
    }
    release();
  }, [ok, o.size, o.min, o.maxW, o.maxH, o.key, fit.size, fit.overflow]);
  return fit;
};

// ---------- KText: one whole kinetic element ----------
export type KTextProps = {
  id: string;
  text: string;
  size: number; // px at 1080p (from a SIZE token)
  min?: number; // auto-fit floor (default 28 px label floor, or 60 % of size for display)
  maxW: number;
  maxH?: number;
  fx: Fx;
  at: number; // local frame the reveal starts (anchor onset - lead)
  exitAt?: number;
  fps: number;
  frame: number;
  preset?: PresetId | 'wipe';
  color?: string;
  glowColor?: string;
  role?: LatinRole;
  emphasis?: 'none' | 'stressed' | 'number' | 'term';
  align?: 'center' | 'start' | 'end';
  modGlow?: number; // audio-reactive glow multiplier (0..1 added)
};
export const KText: React.FC<KTextProps> = (p) => {
  const ref = useRef<HTMLDivElement>(null);
  const min = p.min ?? Math.max(28, Math.round(p.size * 0.6));
  const fit = useAutoFit(ref, {id: p.id, size: p.size, min, maxW: p.maxW, maxH: p.maxH, key: p.text});
  const ar = isArabic(p.text);
  const dir: RevealDir = ar ? 'rtl' : 'ltr';
  const exitT = p.exitAt !== undefined ? p.frame - p.exitAt : undefined;
  const r = revealStyle(p.frame - p.at, p.fps, p.preset ?? 'arrive', dir, exitT);
  const color = p.color ?? C.ink;
  const g = p.glowColor ?? (color === C.ink ? C.signal : color);
  const k = 0.6 + r.flash * 1.2 + (p.emphasis === 'stressed' ? 0.3 : 0) + (p.modGlow ?? 0);
  const base = `${halo}, ${glow(g, p.fx, k)}`;
  const impactCA = p.preset === 'impact' || p.emphasis === 'number' ? caShadow(p.fx) : '';
  const lh = ar ? lineHeightFor(p.text) : LINE.base;
  return (
    <div
      ref={ref}
      data-overflow={fit.overflow ? 1 : undefined}
      style={{
        display: 'inline-block',
        width: 'max-content',
        whiteSpace: 'nowrap',
        fontSize: fit.size,
        lineHeight: lh,
        color,
        textShadow: base,
        transformOrigin: ar ? 'right center' : p.align === 'center' ? 'center' : 'left center',
        outline: fit.overflow ? `2px dashed ${C.crit}` : undefined,
        ...r.style,
      }}
    >
      <MixedText id={p.id} text={p.text} size={fit.size} role={p.emphasis === 'number' ? 'data' : p.role ?? 'sentence'} caLatin={impactCA ? base + impactCA : undefined} />
    </div>
  );
};

// ---------- LabelRow (AT-4) ----------
export type LabelRowProps = {id: string; labels: string[]; size: number; maxW: number; color?: string; gap?: number; style?: React.CSSProperties};
/** Labels on ONE baseline, >= 40 px apart, RTL order, auto-fit to maxW (floor = SIZE.labelMin 28 px), checked after layout. */
export const LabelRow: React.FC<LabelRowProps> = ({id, labels, size, maxW, color = C.ink2, gap = LABEL_GAP_MIN_PX, style}) => {
  const ref = useRef<HTMLDivElement>(null);
  const fit = useAutoFit(ref, {id, size, min: 28, maxW, key: labels.join('|')});
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const boxes = Array.from(el.children).map((c, i) => {
      const r = (c as HTMLElement).getBoundingClientRect();
      const probe = (c as HTMLElement).querySelector('[data-baseline]') as HTMLElement | null;
      const b = probe ? probe.getBoundingClientRect().top : r.bottom;
      return {x: r.left, w: r.width, baseline: b, text: labels[i]};
    });
    // AT-4 floor is the token LABEL_GAP_MIN_PX, never the caller's `gap` (a row laid out tighter than 40 px must be reported)
    const v = checkLabelRow(boxes, LABEL_GAP_MIN_PX * (el.getBoundingClientRect().width / Math.max(1, el.offsetWidth)));
    if (v.length) reportQa('label', id, v.slice(0, 3));
  });
  return (
    <div ref={ref} dir="rtl" style={{display: 'flex', alignItems: 'baseline', columnGap: gap, width: 'max-content', fontSize: fit.size, color, whiteSpace: 'nowrap', ...style}}>
      {labels.map((l, i) => (
        <div key={i} style={{display: 'inline-flex', alignItems: 'baseline', lineHeight: lineHeightFor(l)}}>
          <MixedText id={`${id}:${i}`} text={l} size={fit.size} weight={FONT.label.weight} />
          <span data-baseline style={{display: 'inline-block', width: 0, height: 0}} />
        </div>
      ))}
    </div>
  );
};
