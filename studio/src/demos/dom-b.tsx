// Demos of P7 group dom-b (Domain specials). Synthetic word ids w:DEMO:<Name>:nnnnnn (24-fps frames). Copy is Egyptian
// Arabic from the corpus (sentence ids in the comments); every shown number is a data-contract fact (d:x.y:n) or a sentence
// that speaks it, never invented (fact-check rulings: reports/facts/p7_data_gaps.md).
import type {DemoDef, DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});

// DeadlockCrossing: "Session A قفلت صف ومستنية التاني ... وبتختار واحدة ... victim" (s:S4:P09:0085..0089). No digits.
const deadlock: DemoDef = {
  name: 'DeadlockCrossing',
  frames: 168,
  words: [
    [W('DeadlockCrossing', 1), 6, 24],
    [W('DeadlockCrossing', 2), 104, 124],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'DeadlockCrossing',
        props: {
          id: 'dl',
          txns: [{id: 'a', label: 'Session A'}, {id: 'b', label: 'Session B'}],
          resources: [{id: 'r1', label: 'الصف الأول'}, {id: 'r2', label: 'الصف التاني'}],
          holds: [{txn: 'a', res: 'r1'}, {txn: 'b', res: 'r2'}],
          waits: [{txn: 'a', res: 'r2'}, {txn: 'b', res: 'r1'}],
        },
        at: A('DeadlockCrossing', 1),
      },
      {component: 'DeadlockCrossing.resolve', props: {target: 'dl', victim: 'b'}, at: A('DeadlockCrossing', 2)},
    ],
  },
};

const demos: DemoModule = {family: 'Domain specials', demos: [deadlock]};
export default demos;
