// Demos of the "Type & UI" family (rendered as Demo-<Name>; `dc render snap|perf <Name>`). Synthetic word ids
// (w:DEMO:<Name>:nnnnnn, 24-fps frames); copy and numbers are real (canon / data contract), never invented.
import type {DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;

const demos: DemoModule = {
  family: 'Type & UI',
  demos: [
    {
      name: 'KineticWord',
      frames: 72,
      words: [
        [W('KineticWord', 1), 10, 30],
        [W('KineticWord', 2), 30, 44],
        [W('KineticWord', 3), 46, 62],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.4},
        layers: [
          // ADR-010 display join gap (mixed case 0.25 em) on a tatweel compound, RTL wipe
          {component: 'KineticWord', props: {id: 'kw1', text: 'الـpartition', slot: 'upper-third', size: 'kinetic'}, at: {word: W('KineticWord', 1), lead_frames: 2}},
          // ALL-CAPS Latin with I: cv08 serifed I, LTR wipe, impact preset (CA allowed on Latin only)
          {component: 'KineticWord', props: {id: 'kw2', text: 'KPI', slot: 'center', size: 'impact', preset: 'impact', color: 'signal', emphasis: 'term'}, at: {word: W('KineticWord', 2), lead_frames: 2}},
          // Arabic with tashkeel (line-height 1.6, rule T1), label preset
          {component: 'KineticWord', props: {id: 'kw3', text: 'ثوانٍ', slot: 'lower-third', size: 'sub', preset: 'label', color: 'ink2'}, at: {word: W('KineticWord', 3), lead_frames: 2}},
        ],
      },
    },
    {
      name: 'NumberCounter',
      frames: 72,
      words: [
        [W('NumberCounter', 1), 8, 30],
        [W('NumberCounter', 2), 38, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {component: 'NumberCounter', props: {id: 'rate', to: {value: 66.67, ref: 'd:5.2:7', unit: '%', decimals: 2}, format: 'percent', label: 'نسبة النجاح', slot: 'start'}, at: {word: W('NumberCounter', 1), lead_frames: 0}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي', slot: 'end'}, at: {word: W('NumberCounter', 2), lead_frames: 0}},
        ],
      },
    },
  ],
};
export default demos;
