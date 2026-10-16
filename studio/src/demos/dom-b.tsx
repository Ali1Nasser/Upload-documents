// Demos of P7 group dom-b (Domain specials). Synthetic word ids w:DEMO:<Name>:nnnnnn (24-fps frames). Copy is Egyptian
// Arabic from the corpus (sentence ids in the comments); every shown number is a data-contract fact (d:x.y:n) or a sentence
// that speaks it, never invented (fact-check rulings: reports/facts/p7_data_gaps.md).
import type {DemoDef, DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});

const words = (name: string, spans: [number, number][]): DemoDef['words'] => spans.map(([s0, e0], i) => [W(name, i + 1), s0, e0]);

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


// PageScan (04 section 6 Indexes: "the full scan reads 12 500 pages" d:6.5:3; "a three-level B-tree reaches one row in 3 page
// reads" d:6.5:2). The tiles are a picture of the count (60 tiles stand for 12 500 pages); the spoken numbers are shown by
// NumberCounter layers on the lane below the grids, one after the other: 12 500 rolls up over the full scan, then 3.
const pagescan: DemoDef = {
  name: 'PageScan',
  frames: 204,
  words: words('PageScan', [
    [6, 18],
    [30, 44],
    [112, 126],
    [136, 150],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'PageScan', props: {id: 'pf', slot: 'start', pages: 60, scan: 'full', hits: [41]}, at: A('PageScan', 1)},
      {component: 'PageScan', props: {id: 'pi', slot: 'end', pages: 60, scan: 'index', hits: [41]}, at: A('PageScan', 1)},
      {component: 'PageScan.scan', props: {target: 'pf'}, at: A('PageScan', 2)},
      {component: 'PageScan.scan', props: {target: 'pi'}, at: A('PageScan', 4)},
      {
        component: 'NumberCounter',
        props: {id: 'cnt_full', to: {value: 12500, ref: 'd:6.5:3'}, label: 'صفحة اتقرت', slot: 'lower-third', land: A('PageScan', 3, 0), until: A('PageScan', 4, 0)},
        at: A('PageScan', 2),
      },
      {component: 'NumberCounter', props: {id: 'cnt_idx', to: {value: 3, ref: 'd:6.5:2'}, label: 'صفحات اتقرت', slot: 'lower-third'}, at: A('PageScan', 4)},
    ],
  },
};

// AppliedSteps: the CH-15 cleaning pipeline in its documented order (d:6.1:2 defects; d:6.2:1 documented order). No digits.
const applied: DemoDef = {
  name: 'AppliedSteps',
  frames: 168,
  words: words('AppliedSteps', [
    [6, 18],
    [40, 52],
    [74, 86],
    [108, 120],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'AppliedSteps',
        props: {
          id: 'steps',
          steps: [
            {label: 'شيل المسافات الزيادة', kind: 'TRIM'},
            {label: 'وحّد شكل الحروف', kind: 'PROPER'},
            {label: 'غيّر النوع للتاريخ', kind: 'TYPE'},
            {label: 'امسح الصف المكرر', kind: 'DEDUPE'},
            {label: 'فلتر الحالات الغلط', kind: 'FILTER'},
            {label: 'اجمع حسب العميل', kind: 'GROUP'},
          ],
        },
        at: A('AppliedSteps', 1),
      },
      {component: 'AppliedSteps.select', props: {target: 'steps', index: 0}, at: A('AppliedSteps', 2)},
      {component: 'AppliedSteps.select', props: {target: 'steps', index: 3}, at: A('AppliedSteps', 3)},
      {component: 'AppliedSteps.select', props: {target: 'steps', index: 5}, at: A('AppliedSteps', 4)},
    ],
  },
};

// SampleScoop: "population of 5000 orders ... repeated samples" (s:S4:P11:0068..0073). Fact-check D2: the population label
// 5 000 is allowed (s:S4:P11:0070); the sample size n is NOT shown and not sourced. `sample` is a required prop that the
// component deliberately ignores (CR-009); the demo fills it with the sourced population value so no unsourced number exists.
const POP = {value: 5000, ref: 's:S4:P11:0070', unit: 'طلب', decimals: 0};
const scoop: DemoDef = {
  name: 'SampleScoop',
  frames: 216,
  words: words('SampleScoop', [[6, 18]]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [{component: 'SampleScoop', props: {id: 'scoop', population: POP, sample: POP, method: 'random', seed: 11}, at: A('SampleScoop', 1)}],
  },
};

// ABSplit: A/B = one stream, random assignment, two lanes (s:S1:ar-natural:0249). Fact-check D1: no digits today. The rate
// and user props are required numbers; they are ordinal placeholders here (rank only, never drawn as a value) and carry the
// sentence that names the test, not a d: fact, so the component stays in ordinal mode (CR-010).
const ab: DemoDef = {
  name: 'ABSplit',
  frames: 168,
  words: words('ABSplit', [
    [6, 18],
    [64, 78],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'ABSplit',
        props: {
          id: 'ab',
          variants: [
            {label: 'النسخة A', users: {value: 1, ref: 's:S1:ar-natural:0249'}, rate: {value: 1, ref: 's:S1:ar-natural:0249'}},
            {label: 'النسخة B', users: {value: 1, ref: 's:S1:ar-natural:0249'}, rate: {value: 2, ref: 's:S1:ar-natural:0249'}},
          ],
        },
        at: A('ABSplit', 1),
      },
      {component: 'ABSplit.reveal', props: {target: 'ab'}, at: A('ABSplit', 2)},
    ],
  },
};

// WireTangle: spaghetti dependencies untangle (04 section 6 Design & refactoring). No copy, no digits.
const wire: DemoDef = {
  name: 'WireTangle',
  frames: 144,
  words: words('WireTangle', [
    [6, 18],
    [62, 74],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'WireTangle', props: {id: 'wires', wires: 12, state: 'tangled', seed: 7}, at: A('WireTangle', 1)},
      {component: 'WireTangle.untangle', props: {target: 'wires'}, at: A('WireTangle', 2)},
    ],
  },
};

// ModuleClusters: NilePay modules in three cohesive clusters; the cross-cluster dependencies are cut by `decouple`.
const modules: DemoDef = {
  name: 'ModuleClusters',
  frames: 192,
  words: words('ModuleClusters', [
    [6, 18],
    [80, 94],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'ModuleClusters',
        props: {
          id: 'mods',
          modules: [
            {id: 'gw', label: 'بوابة الدفع', cluster: 'المدفوعات'},
            {id: 'auth', label: 'التحقق', cluster: 'المدفوعات'},
            {id: 'rcpt', label: 'الإيصالات', cluster: 'المدفوعات'},
            {id: 'acc', label: 'الحسابات', cluster: 'الدفتر'},
            {id: 'entry', label: 'القيود', cluster: 'الدفتر'},
            {id: 'sms', label: 'رسائل SMS', cluster: 'التنبيهات'},
            {id: 'push', label: 'الإشعارات', cluster: 'التنبيهات'},
          ],
          deps: [
            {from: 'gw', to: 'auth'},
            {from: 'gw', to: 'rcpt'},
            {from: 'entry', to: 'acc'},
            {from: 'sms', to: 'push'},
            {from: 'rcpt', to: 'entry'},
            {from: 'auth', to: 'acc'},
            {from: 'acc', to: 'sms'},
            {from: 'gw', to: 'push'},
          ],
        },
        at: A('ModuleClusters', 1),
      },
      {component: 'ModuleClusters.decouple', props: {target: 'mods'}, at: A('ModuleClusters', 2)},
    ],
  },
};

// ComplexityRace: list O(n) vs set O(1) (s:S4:P05:0060, s:S4:P05:0062), a loop inside a loop (s:S4:P05:0061), over
// n = 10 000 items (d:6.20:7).
const race: DemoDef = {
  name: 'ComplexityRace',
  frames: 192,
  words: words('ComplexityRace', [
    [6, 18],
    [44, 58],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'ComplexityRace',
        props: {
          id: 'race',
          racers: [
            {label: 'الـlist', big_o: 'O(n)'},
            {label: 'الـset', big_o: 'O(1)'},
            {label: 'لوب جوة لوب', big_o: 'O(n^2)'},
          ],
          n: {value: 10000, ref: 'd:6.20:7', unit: 'items', decimals: 0},
        },
        at: A('ComplexityRace', 1),
      },
      {component: 'ComplexityRace.race', props: {target: 'race'}, at: A('ComplexityRace', 2)},
    ],
  },
};

// HashBuckets: order ids from the one keyspace 1001-1014 (d:6.1:1; 1007 d:6.1:12, 1008 d:6.1:3, 1009 d:6.1:4, 1010 d:6.1:14,
// 1013 d:6.1:5), hashed mod the bucket count. 1001 and 1008 collide in bucket 0, then 1014 collides with 1007 in bucket 6.
const hashb: DemoDef = {
  name: 'HashBuckets',
  frames: 216,
  words: words('HashBuckets', [
    [6, 18],
    [84, 98],
    [124, 138],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'HashBuckets', props: {id: 'hb', buckets: 7, keys: ['1001', '1007', '1008', '1009', '1010', '1013'], hash: 'hash(id)'}, at: A('HashBuckets', 1)},
      {component: 'HashBuckets.insert', props: {target: 'hb', key: '1014'}, at: A('HashBuckets', 2)},
      {component: 'HashBuckets.collide', props: {target: 'hb', bucket: 0}, at: A('HashBuckets', 3)},
    ],
  },
};

// StatusStamp: NilePay receipt T3 FAILED (d:5.2:3).
const stamp: DemoDef = {
  name: 'StatusStamp',
  frames: 96,
  words: words('StatusStamp', [[8, 20]]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'static'},
    layers: [{component: 'StatusStamp', props: {id: 'st', status: 'fail', label_ar: 'الإيصال T3 فشل'}, at: A('StatusStamp', 1)}],
  },
};

// KeycardDoors: IDOR (04 section 6 "keycards for identity"): the card opens your own receipts, not someone else's.
const doors: DemoDef = {
  name: 'KeycardDoors',
  frames: 192,
  words: words('KeycardDoors', [
    [6, 18],
    [50, 64],
    [100, 116],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'KeycardDoors',
        props: {
          id: 'kd',
          doors: [
            {label: 'إيصالاتك', level: 1},
            {label: 'تقارير الفريق', level: 2},
            {label: 'إيصالات غيرك', level: 3},
          ],
          card: 1,
          slot: 'full',
        },
        at: A('KeycardDoors', 1),
      },
      {component: 'KeycardDoors.swipe', props: {target: 'kd', door: 0}, at: A('KeycardDoors', 2)},
      {component: 'KeycardDoors.swipe', props: {target: 'kd', door: 2}, at: A('KeycardDoors', 3)},
    ],
  },
};

const demos: DemoModule = {family: 'Domain specials', demos: [deadlock, pagescan, applied, scoop, ab, wire, modules, race, hashb, stamp, doors]};
export default demos;
