// Demos of the "State & FX" group fx-b (rendered as Demo-<Name>; `dc render snap|perf <Name>`). These components are
// SHOT-LEVEL (the compiler consumes them), so each demo is a real shot whose subject layers are the reference components and
// whose camera / depth / tier / audio modulation comes from the fx-b layer under test. Synthetic word ids
// (w:DEMO:<Name>:nnnnnn, 24-fps frames); copy and numbers are NilePay canon from the data contract (d:5.2:*), never invented.
import type {DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;

const RECEIPTS = {
  columns: [
    {key: 'id', label: 'الإيصال', kind: 'id'},
    {key: 'operator', label: 'المشغل', kind: 'text'},
    {key: 'amount_egp', label: 'EGP', kind: 'money'},
    {key: 'status', label: 'الحالة', kind: 'text'},
  ],
  rows: [
    {id: 'T1', operator: 'A', amount_egp: 120, status: 'OK'},
    {id: 'T2', operator: 'A', amount_egp: 80, status: 'OK'},
    {id: 'T3', operator: 'B', amount_egp: 200, status: 'FAILED'},
    {id: 'T4', operator: 'A', amount_egp: 50, status: 'OK'},
    {id: 'T5', operator: 'B', amount_egp: 150, status: 'OK'},
    {id: 'T6', operator: 'B', amount_egp: 100, status: 'FAILED'},
  ],
};

const demos: DemoModule = {
  family: 'State & FX',
  demos: [
    {
      // push-in = focus (04 section 2) on the success rate; a one-frame 4 px impact nudge lands ON the word after the count lands
      name: 'CameraRig',
      frames: 96,
      words: [
        [W('CameraRig', 1), 8, 24],
        [W('CameraRig', 2), 30, 54],
        [W('CameraRig', 3), 54, 70],
      ],
      shot: {
        fx_tier: 'standard',
        layers: [
          {component: 'CameraRig', props: {move: 'push_in', ease: 'inOutCubic', intensity: 0.7, nudges: [{word: W('CameraRig', 3), lead_frames: 0}]}},
          {component: 'KineticWord', props: {id: 'kw-receipts', text: 'الإيصالات', slot: 'upper-third', size: 'sub', color: 'ink2'}, at: {word: W('CameraRig', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'rate', to: {value: 66.67, ref: 'd:5.2:7', unit: '%', decimals: 2}, format: 'percent', label: 'نسبة النجاح', slot: 'center'}, at: {word: W('CameraRig', 2), lead_frames: 0}},
        ],
      },
    },
    {
      // truck along the data (04 section 2) so the planes separate: receipts table far (parallax 0.4) on the reading start (right), total mid (1.0) on the end. The far
      // plane's blur 0.6 is carried but not visible: both layers carry copy and DOF never blurs copy (ADR-002)
      name: 'DepthLayers',
      frames: 96,
      words: [
        [W('DepthLayers', 1), 6, 20],
        [W('DepthLayers', 2), 36, 60],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'truck', intensity: 0.8},
        layers: [
          {component: 'DepthLayers', props: {planes: [{layer: 'receipts', plane: 'far', parallax: 0.4, blur: 0.6}, {layer: 'total', plane: 'mid', parallax: 1, blur: 0}]}},
          {component: 'TableGrid', props: {id: 'receipts', ref: 'd:5.2:1', title: 'إيصالات NilePay', slot: 'start', ...RECEIPTS}, at: {word: W('DepthLayers', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي الناجح', slot: 'end'}, at: {word: W('DepthLayers', 2), lead_frames: 0}},
        ],
      },
    },
    {
      // the frozen tier object drives glow / grain / vignette / CA (Latin only) / haze / bokeh; perf runs force lite / standard / hero
      name: 'FXTier',
      frames: 72,
      words: [
        [W('FXTier', 1), 8, 30],
        [W('FXTier', 2), 40, 52],
      ],
      shot: {
        camera: {move: 'push_in', intensity: 0.4},
        layers: [
          {component: 'FXTier', props: {tier: 'standard'}},
          {component: 'NumberCounter', props: {id: 't3', to: {value: 200, ref: 'd:5.2:3', unit: 'EGP', decimals: 0}, format: 'currency', label: 'إيصال T3', slot: 'start', color: 'crit'}, at: {word: W('FXTier', 1), lead_frames: 0}},
          {component: 'KineticWord', props: {id: 'kw-failed', text: 'FAILED', slot: 'end', size: 'impact', preset: 'impact', color: 'crit', emphasis: 'term'}, at: {word: W('FXTier', 2), lead_frames: 2}},
        ],
      },
    },
    {
      // locked VO features modulate one parameter of one layer each (glow on the total, scale on the brand, backdrop haze)
      name: 'AudioReactive',
      frames: 72,
      words: [
        [W('AudioReactive', 1), 6, 20],
        [W('AudioReactive', 2), 28, 50],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {component: 'KineticWord', props: {id: 'kw-brand', text: 'NilePay', slot: 'upper-third', size: 'sub', color: 'signal', emphasis: 'term'}, at: {word: W('AudioReactive', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي الناجح', slot: 'center'}, at: {word: W('AudioReactive', 2), lead_frames: 0}},
          {component: 'AudioReactive', props: {feature: 'rms_dbfs', to: 'total', param: 'glow', amount: 0.5, smoothing: 'medium'}},
          {component: 'AudioReactive', props: {feature: 'onset_strength', to: 'kw-brand', param: 'scale', amount: 0.3, smoothing: 'low'}},
          {component: 'AudioReactive', props: {feature: 'rms_dbfs', to: 'total', param: 'haze', amount: 0.4, smoothing: 'high'}},
        ],
      },
    },
  ],
};
export default demos;
