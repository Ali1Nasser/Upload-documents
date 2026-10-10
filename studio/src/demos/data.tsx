// Demos of the "Data" family. NilePay receipts T1..T6 from the data contract (d:5.2:1..6), never invented.
import type {DemoModule} from '../spec/types';

const W = (n: number) => `w:DEMO:TableGrid:${String(n).padStart(6, '0')}`;

const demos: DemoModule = {
  family: 'Data',
  demos: [
    {
      name: 'TableGrid',
      frames: 110,
      words: [
        [W(1), 6, 20],
        [W(2), 40, 52],
        [W(3), 64, 76],
        [W(4), 82, 92],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'TableGrid',
            props: {
              id: 'receipts',
              ref: 'd:5.2:1',
              title: 'إيصالات NilePay',
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
            },
            at: {word: W(1), lead_frames: 2},
          },
          {component: 'TableGrid.highlightRows', props: {target: 'receipts', rows: [2, 5], color: 'crit'}, at: {word: W(2), lead_frames: 2}},
          {component: 'TableGrid.filterRows', props: {target: 'receipts', keep: [0, 1, 3, 4]}, at: {word: W(3), lead_frames: 2}},
          {component: 'TableGrid.sortBy', props: {target: 'receipts', key: 'amount_egp', dir: 'desc'}, at: {word: W(4), lead_frames: 2}},
        ],
      },
    },
  ],
};
export default demos;
