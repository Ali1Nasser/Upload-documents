// Demos of the "State & FX" group fx-a (rendered as Demo-<Name>; `dc render snap|perf <Name>`). Each demo is one real shot: the
// effect layer under test acts on (or beside) reference-component layers. Synthetic word ids (w:DEMO:<Name>:nnnnnn, 24-fps
// frames). Copy and numbers are NilePay canon from the data contract (d:5.2:*: six receipts, 66.67 % success, 400 EGP), never
// invented; every shown number is a reference component carrying its `ref`.
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
const table = (name: string) => ({component: 'TableGrid', props: {id: 'receipts', ref: 'd:5.2:1', title: 'إيصالات NilePay', slot: 'center', ...RECEIPTS}, at: {word: W(name, 1), lead_frames: 2}});
const rate = (name: string, id = 'rate', slot = 'center') => ({
  component: 'NumberCounter',
  props: {id, to: {value: 66.67, ref: 'd:5.2:7', unit: '%', decimals: 2}, format: 'percent', label: 'نسبة النجاح', slot},
  at: {word: W(name, 1), lead_frames: 0},
});
const cam = {move: 'push_in', intensity: 0.3};

const demos: DemoModule = {
  family: 'State & FX',
  demos: [
    {
      // failure (crit glitch) lands on the word that names it: the table jolts, crit scan slices, one flash, then brackets + label hold
      name: 'FailureGlitch',
      frames: 96,
      words: [
        [W('FailureGlitch', 1), 6, 22],
        [W('FailureGlitch', 2), 40, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [
          table('FailureGlitch'),
          {component: 'FailureGlitch', props: {to: 'receipts', intensity: 0.7, label_ar: 'العملية فشلت', slot: 'lower-third'}, at: {word: W('FailureGlitch', 2), lead_frames: 2}},
        ],
      },
    },
    {
      // fix (ok settle): the same table drops into its seat, ok brackets close in, a light sweeps right to left, the chime label holds
      name: 'FixSettle',
      frames: 96,
      words: [
        [W('FixSettle', 1), 6, 22],
        [W('FixSettle', 2), 40, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [
          table('FixSettle'),
          {component: 'FixSettle', props: {to: 'receipts', label_ar: 'اتصلحت والعملية نجحت', slot: 'lower-third'}, at: {word: W('FixSettle', 2), lead_frames: 2}},
        ],
      },
    },
    {
      // a document shatters into chunks (04 §6 embeddings / RAG): the receipts table breaks into 16 seeded blocks on the word
      name: 'ShatterToBlocks',
      frames: 96,
      words: [
        [W('ShatterToBlocks', 1), 6, 22],
        [W('ShatterToBlocks', 2), 40, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [table('ShatterToBlocks'), {component: 'ShatterToBlocks', props: {to: 'receipts', blocks: 16, seed: 7}, at: {word: W('ShatterToBlocks', 2), lead_frames: 2}}],
      },
    },
    {
      // the word "البيانات" (the data) dissolves into particles that settle as a database outline
      name: 'MorphTextToObject',
      frames: 96,
      words: [
        [W('MorphTextToObject', 1), 6, 30],
        [W('MorphTextToObject', 2), 44, 60],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [{component: 'MorphTextToObject', props: {text: 'البيانات', object: 'database', direction: 'text_to_object', particles: 900, slot: 'center'}, at: {word: W('MorphTextToObject', 1), lead_frames: 2}}],
      },
    },
    {
      // a payment route drawn right to left (the Arabic reading direction) with an arrowhead at the head of the stroke
      name: 'PathDraw',
      frames: 96,
      words: [
        [W('PathDraw', 1), 6, 22],
        [W('PathDraw', 2), 28, 56],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [
          {component: 'KineticWord', props: {id: 'kw-route', text: 'مسار الدفع', slot: 'upper-third', size: 'sub', color: 'ink2'}, at: {word: W('PathDraw', 1), lead_frames: 2}},
          {
            component: 'PathDraw',
            props: {d: 'M 0 300 C 220 300 260 40 520 120 S 860 330 1100 90', color: 'signal', width: 5, arrowhead: true, slot: 'center'},
            at: {word: W('PathDraw', 2), lead_frames: 2},
          },
        ],
      },
    },
    {
      // each light pulses as the narrator names it: the success rate pulses twice
      name: 'Pulse',
      frames: 96,
      words: [
        [W('Pulse', 1), 6, 22],
        [W('Pulse', 2), 40, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [rate('Pulse'), {component: 'Pulse', props: {to: 'rate', color: 'signal', times: 2}, at: {word: W('Pulse', 2), lead_frames: 2}}],
      },
    },
    {
      // the failure shake: the only hard motion; no `to`, so every layer of the shot jolts (<= 8 px, decaying), copy stays title-safe
      name: 'Shake',
      frames: 96,
      words: [
        [W('Shake', 1), 6, 22],
        [W('Shake', 2), 40, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [
          {component: 'NumberCounter', props: {id: 't3', to: {value: 200, ref: 'd:5.2:3', unit: 'EGP', decimals: 0}, format: 'currency', label: 'إيصال T3', slot: 'start', color: 'crit'}, at: {word: W('Shake', 1), lead_frames: 0}},
          {component: 'KineticWord', props: {id: 'kw-failed', text: 'FAILED', slot: 'end', size: 'impact', preset: 'impact', color: 'crit', emphasis: 'term'}, at: {word: W('Shake', 2), lead_frames: 2}},
          {component: 'Shake', props: {amplitude_px: 8}, at: {word: W('Shake', 2), lead_frames: 2}},
        ],
      },
    },
    {
      // a card turn about the vertical axis: the total (400 EGP, d:5.2:8) flips once, face-on again at the end
      name: 'Spin',
      frames: 96,
      words: [
        [W('Spin', 1), 6, 22],
        [W('Spin', 2), 40, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: cam,
        layers: [
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي الناجح', slot: 'center'}, at: {word: W('Spin', 1), lead_frames: 0}},
          {component: 'Spin', props: {to: 'total', turns: 1, axis: 'y'}, at: {word: W('Spin', 2), lead_frames: 2}},
        ],
      },
    },
  ],
};
export default demos;
