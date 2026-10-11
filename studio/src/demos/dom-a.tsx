// Demos of P7 group dom-a (Domain specials). Synthetic word ids w:DEMO:<Name>:nnnnnn (24-fps frames). Copy is Egyptian
// Arabic from the corpus; every shown number is a data-contract fact (d:x.y:n) and never invented.
import type {DemoDef, DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});

// TripleGate: "هات الصفوف. خليها موثوقة. جاوب على السؤال." (s:S1:ar-natural:0560; 04 §6 "Data work = 3 moves")
const tripleGate: DemoDef = {
  name: 'TripleGate',
  frames: 120,
  words: [
    [W('TripleGate', 1), 6, 20],
    [W('TripleGate', 2), 34, 46],
    [W('TripleGate', 3), 62, 90],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'TripleGate',
        props: {id: 'gates', gates: [{label: 'هات الصفوف'}, {label: 'خليها موثوقة'}, {label: 'جاوب على السؤال'}], payload: 'إيصالات NilePay'},
        at: A('TripleGate', 1),
      },
      {component: 'TripleGate.ignite', props: {target: 'gates', gate: 'all'}, at: A('TripleGate', 2)},
      {component: 'TripleGate.pass', props: {target: 'gates'}, at: A('TripleGate', 3)},
    ],
  },
};

const demos: DemoModule = {family: 'Domain specials', demos: [tripleGate]};
export default demos;
