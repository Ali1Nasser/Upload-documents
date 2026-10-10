// Scene compiler contracts (P7). Specs are data (corpus/specs/*.json, 05 §8); components are code.
import type React from 'react';
import type {Fx, FxId} from '../tokens';
import type {Rect, SlotId} from '../type/safe';

export type Anchor = {word: string; lead_frames: number};
export type SpecLayer = {component: string; props: Record<string, unknown>; at?: Anchor; notes?: string};
export type SpecShot = {
  shot_id: string;
  sentences: string[];
  intent: string;
  layout?: string;
  fx_tier?: FxId;
  camera?: {move?: string; ease?: string; intensity?: number};
  layers: SpecLayer[];
  holds?: {from: Anchor; until: Anchor; reason: string}[];
  sfx?: {cue: string; at: Anchor}[];
  transition_out?: {type: string; frames?: number};
  [k: string]: unknown;
};
export type Spec = {v: number; chapter: string; edl_version: string; window?: {from: string; to: string}; shots: SpecShot[]; [k: string]: unknown};

/** One word of the locked word map: absolute frames at the film rate (24 fps, ADR-002 F24). */
export type WordRow = {id: string; s: number; e: number; sent: string};
export type Features = {start_frame: number; rms_dbfs: number[]; onset_strength: number[]; centroid_hz: number[]};
/** Everything the compiler needs, loaded by the node driver (scripts/p7_render.mjs) or built by a demo. */
export type SpecInput = {
  id: string;
  spec: Spec;
  span: {start: number; end: number}; // absolute 24-fps frames of the CHAPTER (the resolver narrows it to spec.window)
  words: WordRow[];
  features?: Features | null;
  audio?: string | null; // staticFile-relative VO excerpt (preview only)
  src?: Record<string, string>;
};

export type ResolvedAction = {name: string; props: Record<string, unknown>; at: number; end: number; li: number};
export type Mod = {glow: number; scale: number; opacity: number; particles: number; haze: number};
export type ModSpec = {to: string; param: keyof Mod; amount: number; curve: string}; // curve = key into Resolved.curves
export type ResolvedLayer = {
  li: number;
  id: string;
  component: string;
  props: Record<string, unknown>;
  at: number; // shot-local frame (anchor onset - lead), 0 if unanchored
  atEnd: number; // shot-local end frame of the arrival word
  until?: number;
  box: Rect;
  depth: 'far' | 'mid' | 'near' | 'fg';
  parallax: number;
  blur: number;
  actions: ResolvedAction[];
  implemented: boolean;
};
export type ResolvedShot = {
  shot_id: string;
  from: number; // composition frame
  dur: number;
  tier: FxId;
  camera: {move: string; ease: string; intensity: number; nudges: number[]};
  layers: ResolvedLayer[];
  mods: ModSpec[];
  transition: {type: string; frames: number};
};
export type Unresolved = {shot: string; where: string; word?: string; why: string};
export type ResolverReport = {
  v: 1;
  spec: string;
  chapter: string;
  fps: number;
  preview: boolean;
  span24: [number, number];
  frames: number;
  shots: number;
  layers: number;
  anchors_total: number;
  anchors_resolved: number;
  resolved_pct: number;
  unresolved: Unresolved[];
  invalid_props: Unresolved[];
  unknown_components: string[];
  unimplemented: string[];
  by_kind: Record<string, number>;
};
export type Resolved = {
  fps: number;
  frames: number;
  preview: boolean;
  shots: ResolvedShot[];
  words: Record<string, [number, number]>; // composition-local [start, end] of every anchored word
  curves: Record<string, number[]>; // audio-reactive curves at the composition fps, 0..1
  report: ResolverReport;
  audio?: string | null;
  span24: [number, number]; // absolute 24-fps frames actually played (chapter or window)
};

/** What a component receives besides its validated props. All frames are SHOT-local at the composition fps. */
export type LayerCtx = {
  id: string;
  fx: Fx;
  fps: number;
  preview: boolean;
  frame: number; // shot-local current frame
  at: number;
  atEnd: number;
  until?: number;
  shotDur: number;
  box: Rect;
  frameOf: (a?: Anchor) => number | undefined;
  endOf: (a?: Anchor) => number | undefined;
  actions: ResolvedAction[];
  mod: Mod;
};
export type DcProps<P> = {props: P; ctx: LayerCtx};
/** A catalog implementation. `text` = the layer carries copy: its text rect (default: the slot box) is masked out of haze /
 * particles / bokeh (ADR-002 text-safe). `slot` = default slot when the spec gives none. */
export type DcComponent<P = any> = {
  name: string;
  Component: React.FC<DcProps<P>>;
  text?: boolean;
  slot?: SlotId;
  textRect?: (props: P, box: Rect) => Rect;
};
/** studio/src/components/families/<family>.ts default shape. */
export type FamilyModule = {family: string; components: DcComponent[]};

/** A demo: a one-shot mini spec on synthetic word ids (`w:DEMO:<name>:000001`), frames at 24 fps. */
export type DemoDef = {
  name: string; // catalog component name -> composition `Demo-<name>`
  frames: number;
  words: [id: string, start: number, end: number][];
  shot: {
    intent?: string;
    layout?: string;
    fx_tier?: FxId;
    camera?: SpecShot['camera'];
    layers: SpecLayer[];
    holds?: SpecShot['holds'];
    sfx?: SpecShot['sfx'];
    transition_out?: SpecShot['transition_out'];
  };
  perfFrames?: number; // frames rendered by `dc render perf` (default 48)
};
export type DemoModule = {family: string; demos: DemoDef[]};
