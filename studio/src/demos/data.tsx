// Demos of the "Data" family. NilePay receipts T1..T6 from the data contract (d:5.2:1..6), never invented.
import type {DemoModule} from '../spec/types';

const W = (n: number) => `w:DEMO:TableGrid:${String(n).padStart(6, '0')}`;
/** Synthetic word ids of one demo (24 fps frames). */
const wd = (name: string) => (n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const RF = wd('RowFunnel');

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
    {
      // CH-11 SQL funnel (data contract 6.3, d:6.3:2): 14 -> 13 -> 11 -> 2 -> ... -> 1. The schema caps stages at 8, so the
      // demo omits DISTINCT (the query has no DISTINCT clause; its count is the unchanged 2). CR filed for 9 stages.
      name: 'RowFunnel',
      frames: 150,
      words: [
        [RF(1), 6, 18],
        [RF(2), 34, 46],
        [RF(3), 60, 72],
        [RF(4), 84, 98],
        [RF(5), 112, 124],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'RowFunnel',
            props: {
              id: 'funnel',
              unit_ar: 'صف',
              stages: [
                {label: 'FROM', rows: {value: 14, ref: 'd:6.3:5'}},
                {label: 'JOIN', rows: {value: 13, ref: 'd:6.3:6'}},
                {label: 'WHERE', rows: {value: 11, ref: 'd:6.3:10'}},
                {label: 'GROUP BY', rows: {value: 2, ref: 'd:6.3:2'}},
                {label: 'HAVING', rows: {value: 2, ref: 'd:6.3:2'}},
                {label: 'SELECT', rows: {value: 2, ref: 'd:6.3:2'}},
                {label: 'ORDER BY', rows: {value: 2, ref: 'd:6.3:2'}},
                {label: 'LIMIT', rows: {value: 1, ref: 'd:6.3:2'}},
              ],
            },
            at: {word: RF(1), lead_frames: 2},
          },
          {component: 'RowFunnel.advance', props: {target: 'funnel', stage: 1}, at: {word: RF(2), lead_frames: 2}},
          {component: 'RowFunnel.advance', props: {target: 'funnel', stage: 2}, at: {word: RF(3), lead_frames: 2}},
          {component: 'RowFunnel.advance', props: {target: 'funnel', stage: 3}, at: {word: RF(4), lead_frames: 2}},
          {component: 'RowFunnel.advance', props: {target: 'funnel', stage: 7}, at: {word: RF(5), lead_frames: 2}},
        ],
      },
    },
  ],
};
export default demos;
