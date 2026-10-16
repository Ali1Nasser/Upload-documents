// Demos of the "Data" family. NilePay receipts T1..T6 from the data contract (d:5.2:1..6), never invented.
import type {DemoModule} from '../spec/types';

const W = (n: number) => `w:DEMO:TableGrid:${String(n).padStart(6, '0')}`;
/** Synthetic word ids of one demo (24 fps frames). */
const wd = (name: string) => (n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const RF = wd('RowFunnel');
const JF = wd('JoinFusion');
const WF = wd('WindowFrame');
const LP = wd('LedgerPair');
const HM = wd('Heatmap');
const BS = wd('BarStack');
const LT = wd('LineTrace');
const SF = wd('ScatterField');
const DI = wd('Distribution');
const CT = wd('ConfusionTiles');
const KP = wd('KpiPanel');
const TS = wd('ThresholdSlider');

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
                {label: 'LIMIT', rows: {value: 1, ref: 'd:6.3:14'}},
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
    {
      // CH-12 fan-out (data contract 6.4, d:6.4:1): `customers LEFT JOIN orders` = 6 customers in, 15 rows out.
      name: 'JoinFusion',
      frames: 170,
      words: [
        [JF(1), 6, 18],
        [JF(2), 54, 66],
        [JF(3), 96, 112],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'JoinFusion',
            props: {
              id: 'join',
              left: {name: 'العملاء', keys: ['id', 'name', 'tier']},
              right: {name: 'الطلبات', keys: ['customer_id', 'total', 'status']},
              on: 'c.id = o.customer_id',
              kind: 'left',
              result_rows: {value: 15, ref: 'd:6.4:1', unit: 'صف'},
            },
            at: {word: JF(1), lead_frames: 2},
          },
          {component: 'JoinFusion.showUnmatched', props: {target: 'join', side: 'left'}, at: {word: JF(2), lead_frames: 2}},
          {component: 'JoinFusion.fuse', props: {target: 'join'}, at: {word: JF(3), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-12 windows over the NilePay receipts (d:5.2:1..6, amounts in EGP, ordered by receipt id): frame = 2 PRECEDING .. CURRENT ROW
      // (frame sums 120, 200, 330, 300: none equals the film's 400 / 250 / 150 totals, so no sum can be misread as one of them).
      name: 'WindowFrame',
      frames: 160,
      words: [
        [WF(1), 6, 18],
        [WF(2), 50, 62],
        [WF(3), 88, 100],
        [WF(4), 122, 134],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'WindowFrame',
            props: {id: 'win', order_by: 'الإيصال', frame_kind: 'rows', bounds: ['2 PRECEDING', 'CURRENT ROW'], values: [120, 80, 200, 50, 150, 100], ref: 'd:6.19:5'},
            at: {word: WF(1), lead_frames: 2},
          },
          {component: 'WindowFrame.slide', props: {target: 'win', to: 1}, at: {word: WF(2), lead_frames: 2}},
          {component: 'WindowFrame.slide', props: {target: 'win', to: 3}, at: {word: WF(3), lead_frames: 2}},
          {component: 'WindowFrame.slide', props: {target: 'win', to: 5}, at: {word: WF(4), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-28 reconciliation over the six NilePay receipts: all receipts (d:5.2:1..6) vs the successful ones only (400 EGP, d:5.2:8).
      name: 'LedgerPair',
      frames: 170,
      words: [
        [LP(1), 6, 18],
        [LP(2), 60, 78],
        [LP(3), 118, 130],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'LedgerPair',
            props: {
              id: 'rec',
              left: {
                label: 'كل الإيصالات',
                entries: [
                  {label: 'T1', amount: {value: 120, ref: 'd:5.2:1', unit: 'EGP'}},
                  {label: 'T2', amount: {value: 80, ref: 'd:5.2:2', unit: 'EGP'}},
                  {label: 'T3', amount: {value: 200, ref: 'd:5.2:3', unit: 'EGP'}},
                  {label: 'T4', amount: {value: 50, ref: 'd:5.2:4', unit: 'EGP'}},
                  {label: 'T5', amount: {value: 150, ref: 'd:5.2:5', unit: 'EGP'}},
                  {label: 'T6', amount: {value: 100, ref: 'd:5.2:6', unit: 'EGP'}},
                ],
              },
              right: {
                label: 'الإيصالات الناجحة',
                entries: [
                  {label: 'T1', amount: {value: 120, ref: 'd:5.2:1', unit: 'EGP'}},
                  {label: 'T2', amount: {value: 80, ref: 'd:5.2:2', unit: 'EGP'}},
                  {label: 'T4', amount: {value: 50, ref: 'd:5.2:4', unit: 'EGP'}},
                  {label: 'T5', amount: {value: 150, ref: 'd:5.2:5', unit: 'EGP'}},
                ],
              },
            },
            at: {word: LP(1), lead_frames: 2},
          },
          {component: 'LedgerPair.reconcile', props: {target: 'rec'}, at: {word: LP(2), lead_frames: 2}},
          {component: 'LedgerPair.mismatch', props: {target: 'rec', index: 2}, at: {word: LP(3), lead_frames: 2}},
        ],
      },
    },
    {
      // NilePay receipts T1..T6 (d:5.2:1..6; the six rows: d:6.19:5): amount in EGP by receipt (columns) and status (rows); T3 failed = 200.
      name: 'Heatmap',
      frames: 130,
      words: [
        [HM(1), 6, 18],
        [HM(2), 70, 84],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'Heatmap',
            props: {
              id: 'heat',
              x: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
              y: ['ناجح', 'فاشل'],
              values: [
                [120, 80, 0, 50, 150, 0],
                [0, 0, 200, 0, 0, 100],
              ],
              ref: 'd:6.19:5',
              scale: 'sequential',
            },
            at: {word: HM(1), lead_frames: 2},
          },
          {component: 'Heatmap.highlightCell', props: {target: 'heat', x: 2, y: 1}, at: {word: HM(2), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-31 baseline vs model (d:6.16:1): the fitted line beats the baseline 7.33 vs 65.50 MAE on held-out data.
      name: 'BarStack',
      frames: 130,
      words: [
        [BS(1), 6, 20],
        [BS(2), 76, 90],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'BarStack',
            props: {
              id: 'mae',
              series: [
                {label: 'خط الأساس', value: {value: 65.5, ref: 'd:6.16:1', unit: 'MAE', decimals: 2}, color: 'warn'},
                {label: 'النموذج', value: {value: 7.33, ref: 'd:6.16:1', unit: 'MAE', decimals: 2}, color: 'ok'},
              ],
              orientation: 'h',
              stacked: false,
              sort: 'none',
            },
            at: {word: BS(1), lead_frames: 2},
          },
          {component: 'BarStack.grow', props: {target: 'mae'}, at: {word: BS(1), lead_frames: 2}},
          {component: 'BarStack.highlight', props: {target: 'mae', index: 1, color: 'ok'}, at: {word: BS(2), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-19 constructed illustration (6.20, arithmetic not measurement): 16 sorted items, linear search up to 16 comparisons
      // (d:6.20:3), binary search 4 (d:6.20:4).
      name: 'LineTrace',
      frames: 150,
      words: [
        [LT(1), 6, 36],
        [LT(2), 70, 84],
        [LT(3), 104, 118],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'LineTrace',
            props: {
              id: 'cmp',
              series: [
                {label: 'بحث خطي', points: [[2, 2], [4, 4], [8, 8], [16, 16]], ref: 'd:6.20:3', color: 'warn'},
                {label: 'بحث ثنائي', points: [[2, 1], [4, 2], [8, 3], [16, 4]], ref: 'd:6.20:4', color: 'ok'},
              ],
              x_label: 'عدد العناصر',
              y_label: 'المقارنات',
            },
            at: {word: LT(1), lead_frames: 2},
          },
          {component: 'LineTrace.drawTo', props: {target: 'cmp', x: 16}, at: {word: LT(1), lead_frames: 2}},
          {component: 'LineTrace.markPoint', props: {target: 'cmp', series: 0, index: 3, label: 'خطي'}, at: {word: LT(2), lead_frames: 2}},
          {component: 'LineTrace.markPoint', props: {target: 'cmp', series: 1, index: 3, label: 'ثنائي'}, at: {word: LT(3), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-30 / CH-31: seeded customer tiers (6.3: gold, silver) on two features, plus a few outliers. No numbers on screen.
      name: 'ScatterField',
      frames: 150,
      words: [
        [SF(1), 6, 18],
        [SF(2), 64, 76],
        [SF(3), 104, 116],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'ScatterField',
            props: {
              id: 'cust',
              clusters: [
                {label: 'عملاء Gold', n: 160, center: [0.7, 0.64], spread: 0.07},
                {label: 'عملاء Silver', n: 220, center: [0.3, 0.38], spread: 0.09},
              ],
              outliers: 9,
              seed: 1234,
            },
            at: {word: SF(1), lead_frames: 2},
          },
          {component: 'ScatterField.highlightCluster', props: {target: 'cust', label: 'عملاء Gold'}, at: {word: SF(2), lead_frames: 2}},
          {component: 'ScatterField.showOutliers', props: {target: 'cust'}, at: {word: SF(3), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-16 statistics (6.12): a 95 % interval under the normal curve; normCdf(1.96) = 0.975 (d:6.12:5).
      name: 'Distribution',
      frames: 150,
      words: [
        [DI(1), 6, 30],
        [DI(2), 84, 100],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'Distribution',
            props: {id: 'norm', kind: 'normal', ref: 'd:6.12:1', markers: [{at_value: -1.96, label: '−1.96'}, {at_value: 1.96, label: '1.96'}]},
            at: {word: DI(1), lead_frames: 2},
          },
          {component: 'Distribution.shade', props: {target: 'norm', lo: -1.96, hi: 1.96}, at: {word: DI(2), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-30 constructed illustration (6.20): a classifier that always predicts no on 1 % positives scores 99 % accuracy and
      // catches zero cases (d:6.20:1, d:6.20:2, d:6.20:10); the tiles are per 100 cases.
      name: 'ConfusionTiles',
      frames: 150,
      words: [
        [CT(1), 6, 18],
        [CT(2), 66, 80],
        [CT(3), 108, 122],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'ConfusionTiles',
            props: {
              id: 'cm',
              tp: {value: 0, ref: 'd:6.20:10', unit: '%'},
              fp: {value: 0, ref: 'd:6.20:1', unit: '%'},
              fn: {value: 1, ref: 'd:6.20:1', unit: '%'},
              tn: {value: 99, ref: 'd:6.20:2', unit: '%'},
              positive: 'إيجابي',
              negative: 'سلبي',
            },
            at: {word: CT(1), lead_frames: 2},
          },
          {component: 'ConfusionTiles.focus', props: {target: 'cm', cell: 'tn'}, at: {word: CT(2), lead_frames: 2}},
          {component: 'ConfusionTiles.focus', props: {target: 'cm', cell: 'fn'}, at: {word: CT(3), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-34 platform numbers (d:6.7:1, d:6.7:2 edit cost; d:6.6:1 pool capacity; d:6.11:2 p95; d:5.2:7 receipt success rate).
      name: 'KpiPanel',
      frames: 150,
      words: [
        [KP(1), 6, 18],
        [KP(2), 76, 94],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'KpiPanel',
            props: {
              id: 'kpi',
              kpis: [
                {label: 'تعديل سطر كود', value: {value: 5, ref: 'd:6.7:1', unit: 's'}, status: 'active'},
                {label: 'سعة الـpool', value: {value: 67, ref: 'd:6.6:1', unit: 'req/s'}, status: 'active'},
                {label: 'زمن p95', value: {value: 355, ref: 'd:6.11:2', unit: 'ms'}, status: 'ok'},
                {label: 'نجاح الإيصالات', value: {value: 66.67, ref: 'd:5.2:7', unit: '%', decimals: 2}, status: 'warn'},
              ],
            },
            at: {word: KP(1), lead_frames: 2},
          },
          {component: 'KpiPanel.update', props: {target: 'kpi', index: 0, value: {value: 57, ref: 'd:6.7:2', unit: 's'}}, at: {word: KP(2), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-09 / CH-34 testing gate (d:6.11:1..3): a p95 gate at 500 ms passes at 355 ms and fails at 675 ms under regression.
      name: 'ThresholdSlider',
      frames: 140,
      words: [
        [TS(1), 6, 18],
        [TS(2), 72, 92],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'ThresholdSlider',
            props: {
              id: 'gate',
              label: 'زمن الاستجابة p95',
              min: 0,
              max: 800,
              value: {value: 355, ref: 'd:6.11:2', unit: 'ms'},
              zones: [
                {upto: 500, status: 'ok'},
                {upto: 800, status: 'fail'},
              ],
            },
            at: {word: TS(1), lead_frames: 2},
          },
          {component: 'ThresholdSlider.moveTo', props: {target: 'gate', value: {value: 675, ref: 'd:6.11:3', unit: 'ms'}}, at: {word: TS(2), lead_frames: 2}},
        ],
      },
    },
  ],
};
export default demos;
