// Demos of the "State & FX" group fx-b (rendered as Demo-<Name>; `dc render snap|perf <Name>`). These components are
// SHOT-LEVEL (the compiler consumes them), so each demo is a real shot whose subject layers are the reference components and
// whose camera / depth / tier / audio modulation comes from the fx-b layer under test. DepthLayers also uses the space3d
// HoloGrid and ParticleField as its non-copy far and fg planes (its baseline must be re-approved if those change). Synthetic word ids
// (w:DEMO:<Name>:nnnnnn, 24-fps frames); copy and numbers are NilePay canon from the data contract (d:5.2:*), never invented.
import type {DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;

const demos: DemoModule = {
  family: 'State & FX',
  demos: [
    {
      // dolly-zoom = a realization moment (04 section 2): only 66.67 % of the receipts succeeded. Exaggerated for the demo (intensity 1,
      // the strongest move the rig has: the subject grows 12 % while the backdrop counter-scales and holds), so the move reads from
      // stills (review B4). A one-frame 4 px impact nudge lands ON the nudge word (RV1); the evidence strip shows it as a difference.
      name: 'CameraRig',
      frames: 96,
      words: [
        [W('CameraRig', 1), 2, 20],
        [W('CameraRig', 2), 26, 50],
        [W('CameraRig', 3), 62, 74],
      ],
      shot: {
        fx_tier: 'standard',
        layers: [
          {component: 'CameraRig', props: {move: 'dolly_zoom', ease: 'inOutCubic', intensity: 1, nudges: [{word: W('CameraRig', 3), lead_frames: 0}]}},
          {component: 'KineticWord', props: {id: 'kw-receipts', text: 'الإيصالات', slot: 'upper-third', size: 'sub', color: 'ink2'}, at: {word: W('CameraRig', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'rate', to: {value: 66.67, ref: 'd:5.2:7', unit: '%', decimals: 2}, format: 'percent', label: 'نسبة النجاح', slot: 'center'}, at: {word: W('CameraRig', 2), lead_frames: 0}},
        ],
      },
    },
    {
      // 4 depth planes (04 section 1.2: background grid + haze blurred and dim, sharp midground subject, blurred foreground bokeh) under a
      // strong truck (0.7) ("following data"), so the planes separate by parallax: grid far (0.4, DOF 0.6), the 400 EGP total mid (1.0),
      // the NilePay term near (1.3), dust fg (1.6, DOF 1). DOF = blur x FX[tier].dofBlurPx (0 at lite, 4 px at standard / hero) and never
      // touches copy, so the blurred planes are the two non-copy layers. Review B3.
      name: 'DepthLayers',
      frames: 96,
      words: [
        [W('DepthLayers', 1), 2, 18],
        [W('DepthLayers', 2), 30, 54],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'truck', intensity: 0.7},
        layers: [
          {
            component: 'DepthLayers',
            props: {
              planes: [
                {layer: 'grid', plane: 'far', parallax: 0.4, blur: 0.6},
                {layer: 'total', plane: 'mid', parallax: 1, blur: 0},
                {layer: 'kw-brand', plane: 'near', parallax: 1.3, blur: 0},
                {layer: 'dust', plane: 'fg', parallax: 1.6, blur: 1},
              ],
            },
          },
          {component: 'HoloGrid', props: {id: 'grid', surface: 'floor', color: 'grid'}},
          {component: 'KineticWord', props: {id: 'kw-brand', text: 'NilePay', slot: 'upper-third', size: 'sub', color: 'signal', emphasis: 'term'}, at: {word: W('DepthLayers', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي الناجح', slot: 'center'}, at: {word: W('DepthLayers', 2), lead_frames: 0}},
          {component: 'ParticleField', props: {id: 'dust', count: 90, kind: 'dust', color: 'signal', seed: 52}},
        ],
      },
    },
    {
      // 4 depth planes (04 section 1.2: background grid + haze blurred and dim, sharp midground subject, blurred foreground bokeh) under a
      // strong truck (0.7) ("following data"), so the planes separate by parallax: grid far (0.4, DOF 0.6), the 400 EGP total mid (1.0),
      // the NilePay term near (1.3), dust fg (1.6, DOF 1). DOF = blur x FX[tier].dofBlurPx (0 at lite, 4 px at standard / hero) and never
      // touches copy, so the blurred planes are the two non-copy layers. Review B3.
      name: 'DepthLayersX1',
      frames: 96,
      words: [
        [W('DepthLayersX1', 1), 2, 18],
        [W('DepthLayersX1', 2), 30, 54],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'truck', intensity: 0.7},
        layers: [
          {
            component: 'DepthLayers',
            props: {
              planes: [
                {layer: 'grid', plane: 'far', parallax: 0.4, blur: 0.6},
                {layer: 'total', plane: 'mid', parallax: 1, blur: 0},
                {layer: 'kw-brand', plane: 'near', parallax: 1.3, blur: 0},
              ],
            },
          },
          {component: 'HoloGrid', props: {id: 'grid', surface: 'floor', color: 'grid'}},
          {component: 'KineticWord', props: {id: 'kw-brand', text: 'NilePay', slot: 'upper-third', size: 'sub', color: 'signal', emphasis: 'term'}, at: {word: W('DepthLayersX1', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي الناجح', slot: 'center'}, at: {word: W('DepthLayersX1', 2), lead_frames: 0}},
        ],
      },
    },
    {
      // 4 depth planes (04 section 1.2: background grid + haze blurred and dim, sharp midground subject, blurred foreground bokeh) under a
      // strong truck (0.7) ("following data"), so the planes separate by parallax: grid far (0.4, DOF 0.6), the 400 EGP total mid (1.0),
      // the NilePay term near (1.3), dust fg (1.6, DOF 1). DOF = blur x FX[tier].dofBlurPx (0 at lite, 4 px at standard / hero) and never
      // touches copy, so the blurred planes are the two non-copy layers. Review B3.
      name: 'DepthLayersX2',
      frames: 96,
      words: [
        [W('DepthLayersX2', 1), 2, 18],
        [W('DepthLayersX2', 2), 30, 54],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'truck', intensity: 0.7},
        layers: [
          {
            component: 'DepthLayers',
            props: {
              planes: [
                {layer: 'total', plane: 'mid', parallax: 1, blur: 0},
                {layer: 'kw-brand', plane: 'near', parallax: 1.3, blur: 0},
                {layer: 'dust', plane: 'fg', parallax: 1.6, blur: 1},
              ],
            },
          },
          {component: 'KineticWord', props: {id: 'kw-brand', text: 'NilePay', slot: 'upper-third', size: 'sub', color: 'signal', emphasis: 'term'}, at: {word: W('DepthLayersX2', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي الناجح', slot: 'center'}, at: {word: W('DepthLayersX2', 2), lead_frames: 0}},
          {component: 'ParticleField', props: {id: 'dust', count: 90, kind: 'dust', color: 'signal', seed: 52}},
        ],
      },
    },
    {
      // the frozen tier object drives glow / grain / vignette / CA (Latin and numerals only) / haze / bokeh; perf runs force lite /
      // standard / hero, and the evidence triptych (reports/p7/evidence/fx-b/FXTier_tiers.jpg) shows the same frame at all three.
      // One idea, co-located (review note): the failed amount above, FAILED landing under it on the impact preset.
      name: 'FXTier',
      frames: 72,
      words: [
        [W('FXTier', 1), 2, 26],
        [W('FXTier', 2), 34, 46],
      ],
      shot: {
        camera: {move: 'push_in', intensity: 0.6},
        layers: [
          {component: 'FXTier', props: {tier: 'standard'}},
          {component: 'NumberCounter', props: {id: 't3', to: {value: 200, ref: 'd:5.2:3', unit: 'EGP', decimals: 0}, format: 'currency', label: 'إيصال T3', slot: 'top', color: 'crit'}, at: {word: W('FXTier', 1), lead_frames: 0}},
          {component: 'KineticWord', props: {id: 'kw-failed', text: 'FAILED', slot: 'bottom', size: 'impact', preset: 'impact', color: 'crit', emphasis: 'term'}, at: {word: W('FXTier', 2), lead_frames: 2}},
        ],
      },
    },
    {
      // locked VO features modulate one parameter of one layer each (glow on the total, scale on the brand, backdrop haze). A DemoDef
      // carries no features (CR-005), so these stills are the unmodulated state; the quiet | loud evidence pair
      // (reports/p7/evidence/fx-b/AudioReactive_quiet_loud.jpg) renders this same shot with synthetic, labelled features.
      // Amounts are at the top of their range so the modulation reads in a demo (scale 1 = the 8 % cap of KineticWord).
      name: 'AudioReactive',
      frames: 72,
      words: [
        [W('AudioReactive', 1), 2, 20],
        [W('AudioReactive', 2), 28, 50],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {component: 'KineticWord', props: {id: 'kw-brand', text: 'NilePay', slot: 'upper-third', size: 'sub', color: 'signal', emphasis: 'term'}, at: {word: W('AudioReactive', 1), lead_frames: 2}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي الناجح', slot: 'center'}, at: {word: W('AudioReactive', 2), lead_frames: 0}},
          {component: 'AudioReactive', props: {feature: 'rms_dbfs', to: 'total', param: 'glow', amount: 1, smoothing: 'medium'}},
          {component: 'AudioReactive', props: {feature: 'onset_strength', to: 'kw-brand', param: 'scale', amount: 1, smoothing: 'low'}},
          {component: 'AudioReactive', props: {feature: 'rms_dbfs', to: 'total', param: 'haze', amount: 0.8, smoothing: 'high'}},
        ],
      },
    },
  ],
};
export default demos;
