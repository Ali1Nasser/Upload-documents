// Demos of P7 group dom-c (Domain specials). Synthetic word ids w:DEMO:<Name>:nnnnnn (24-fps frames). Copy is Egyptian
// Arabic from the corpus; every shown number is a data-contract fact (d:x.y:n) or a spoken sentence (s:...), never invented.
import type {DemoDef, DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});

// ConnPoolTaxi: pool lab (CH-14, d:6.6:1..4): the pool is a taxi rank; at 260 req/s against it a queue forms (d:6.6:2/3).
// Pictorial: pool_size / requests are structural counts, the spoken numbers are shown by NumberCounter layers in a scene.
const connPoolTaxi: DemoDef = {
  name: 'ConnPoolTaxi',
  frames: 168,
  words: [
    [W('ConnPoolTaxi', 1), 6, 22],
    [W('ConnPoolTaxi', 2), 70, 84],
    [W('ConnPoolTaxi', 3), 118, 134],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'ConnPoolTaxi', props: {id: 'pool', pool_size: 8, requests: 18, seed: 14}, at: A('ConnPoolTaxi', 1)},
      {component: 'ConnPoolTaxi.exhaust', props: {target: 'pool'}, at: A('ConnPoolTaxi', 2)},
      {component: 'ConnPoolTaxi.release', props: {target: 'pool', n: 3}, at: A('ConnPoolTaxi', 3)},
    ],
  },
};

// SagaChain: a NilePay transfer as a saga (DD-P14): each step has a compensation that runs backwards when a later step fails.
const sagaChain: DemoDef = {
  name: 'SagaChain',
  frames: 190,
  words: [
    [W('SagaChain', 1), 6, 24],
    [W('SagaChain', 2), 76, 92],
    [W('SagaChain', 3), 128, 150],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'SagaChain',
        props: {
          id: 'saga',
          steps: [
            {label: 'حجز الرصيد', compensation: 'فك الحجز'},
            {label: 'خصم من الحساب', compensation: 'رد الخصم'},
            {label: 'تحويل للمشغّل', compensation: 'استرجاع التحويل'},
            {label: 'إيصال للعميل', compensation: 'إلغاء الإيصال'},
          ],
        },
        at: A('SagaChain', 1),
      },
      {component: 'SagaChain.fail', props: {target: 'saga', at: 2}, at: A('SagaChain', 2)},
      {component: 'SagaChain.compensate', props: {target: 'saga'}, at: A('SagaChain', 3)},
    ],
  },
};

// RaceCondition (DD-P14): two NilePay requests update the same account balance; the lost update, then the lock.
const raceCondition: DemoDef = {
  name: 'RaceCondition',
  frames: 200,
  words: [
    [W('RaceCondition', 1), 6, 22],
    [W('RaceCondition', 2), 60, 76],
    [W('RaceCondition', 3), 124, 142],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'RaceCondition', props: {id: 'race', threads: [{id: 't1', label: 'طلب التحويل'}, {id: 't2', label: 'طلب السحب'}], shared: 'رصيد الحساب'}, at: A('RaceCondition', 1)},
      {component: 'RaceCondition.collide', props: {target: 'race'}, at: A('RaceCondition', 2)},
      {component: 'RaceCondition.lock', props: {target: 'race'}, at: A('RaceCondition', 3)},
    ],
  },
};

// QualityGauges: the p95 gate of CH-32 (d:6.11:1..3), the NilePay success rate (d:5.2:7) and the HAVING > 300 gate of the SQL funnel
// (d:6.3:12, d:6.3:13). A latency gate is a limit that must stay UNDER the threshold, so its status is passed explicitly.
const qualityGauges: DemoDef = {
  name: 'QualityGauges',
  frames: 130,
  words: [
    [W('QualityGauges', 1), 6, 22],
    [W('QualityGauges', 2), 44, 60],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'QualityGauges',
        props: {
          id: 'gates',
          gauges: [
            {label: 'p95 قبل التغيير', value: {value: 355, ref: 'd:6.11:2', unit: 'ms'}, threshold: 500, status: 'ok'},
            {label: 'p95 بعد التغيير', value: {value: 675, ref: 'd:6.11:3', unit: 'ms'}, threshold: 500, status: 'fail'},
            {label: 'نسبة نجاح التحويلات', value: {value: 66.67, ref: 'd:5.2:7', unit: '%', decimals: 2}},
            {label: 'إيراد شريحة silver', value: {value: 850.2, ref: 'd:6.3:12', unit: 'EUR', decimals: 2}, threshold: 300},
          ],
        },
        at: A('QualityGauges', 1),
      },
    ],
  },
};

// IdempotentStamp: the same payment retried (receipt T5, d:5.2:5) carries one idempotency key; the stamp lands once.
const idempotentStamp: DemoDef = {
  name: 'IdempotentStamp',
  frames: 170,
  words: [
    [W('IdempotentStamp', 1), 6, 24],
    [W('IdempotentStamp', 2), 70, 90],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'IdempotentStamp', props: {id: 'stamp', key: 'Idempotency-Key: T5', attempts: 3}, at: A('IdempotentStamp', 1)},
      {component: 'IdempotentStamp.replay', props: {target: 'stamp'}, at: A('IdempotentStamp', 2)},
    ],
  },
};

// KAnonBlur (CH-28, d:6.9:1..3): masking every direct identifier leaves k = 1 and nine unique rows; generalising reaches k >= 2.
const kAnonBlur: DemoDef = {
  name: 'KAnonBlur',
  frames: 190,
  words: [
    [W('KAnonBlur', 1), 6, 22],
    [W('KAnonBlur', 2), 60, 80],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'KAnonBlur', props: {id: 'anon', k: 2, rows: 9, quasi_ids: ['السن', 'المدينة', 'نوع الحساب']}, at: A('KAnonBlur', 1)},
      {component: 'KAnonBlur.generalize', props: {target: 'anon'}, at: A('KAnonBlur', 2)},
    ],
  },
};

// SplitDeck: the study-time split of CH-30 (s:S4:P25:0052 / 0053): 35 % SQL, 25 % Python, 20 % AI concepts, 10 % Java CRUD; the deck is dealt.
// (The ML train / validation / test shares are not in the corpus: data gap D3, see docs/p7/catalog_status/dom-c.md.)
const splitDeck: DemoDef = {
  name: 'SplitDeck',
  frames: 150,
  words: [
    [W('SplitDeck', 1), 6, 22],
    [W('SplitDeck', 2), 44, 64],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'SplitDeck',
        props: {
          id: 'deck',
          seed: 7,
          splits: [
            {label: 'SQL', share: {value: 35, ref: 's:S4:P25:0052', unit: '%'}},
            {label: 'Python', share: {value: 25, ref: 's:S4:P25:0052', unit: '%'}},
            {label: 'الذكاء الاصطناعي', share: {value: 20, ref: 's:S4:P25:0053', unit: '%'}},
            {label: 'Java CRUD', share: {value: 10, ref: 's:S4:P25:0053', unit: '%'}},
          ],
        },
        at: A('SplitDeck', 1),
      },
      {component: 'SplitDeck.deal', props: {target: 'deck'}, at: A('SplitDeck', 2)},
    ],
  },
};

// SamplingDial (CH-35, s:S4:P22:0085 / s:S4:P23:0062): temperature 0.3, then 0 "to make generation precise".
const samplingDial: DemoDef = {
  name: 'SamplingDial',
  frames: 150,
  words: [
    [W('SamplingDial', 1), 6, 22],
    [W('SamplingDial', 2), 70, 96],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'SamplingDial', props: {id: 'dial', params: [{label: 'temperature', value: {value: 0.3, ref: 's:S4:P22:0085', decimals: 1}, min: 0, max: 1}]}, at: A('SamplingDial', 1)},
      {component: 'SamplingDial.turn', props: {target: 'dial', param: 0, to: {value: 0, ref: 's:S4:P23:0062', decimals: 1}}, at: A('SamplingDial', 2)},
    ],
  },
};

// GuardedAgentLoop (CH-33/35: the agent loop inside guard rings; "retrieval is a query, not permission").
const guardedAgentLoop: DemoDef = {
  name: 'GuardedAgentLoop',
  frames: 190,
  words: [
    [W('GuardedAgentLoop', 1), 6, 22],
    [W('GuardedAgentLoop', 2), 50, 66],
    [W('GuardedAgentLoop', 3), 128, 150],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'GuardedAgentLoop',
        props: {
          id: 'agent',
          steps: [
            {label: 'خطة الـagent', kind: 'plan'},
            {label: 'استدعاء أداة', kind: 'act'},
            {label: 'قراءة النتيجة', kind: 'observe'},
            {label: 'كتابة الرد', kind: 'act'},
            {label: 'فحص الناتج', kind: 'guard'},
          ],
          guards: ['صلاحيات الوصول', 'فلتر الخصوصية'],
        },
        at: A('GuardedAgentLoop', 1),
      },
      {component: 'GuardedAgentLoop.iterate', props: {target: 'agent'}, at: A('GuardedAgentLoop', 2)},
      {component: 'GuardedAgentLoop.block', props: {target: 'agent', guard: 1}, at: A('GuardedAgentLoop', 3)},
    ],
  },
};

// ArtifactChain: each chapter's artefact joins the chain (04 section 6 "Evidence, portfolio, branches").
const artifactChain: DemoDef = {
  name: 'ArtifactChain',
  frames: 170,
  words: [
    [W('ArtifactChain', 1), 6, 22],
    [W('ArtifactChain', 2), 64, 82],
    [W('ArtifactChain', 3), 108, 126],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'ArtifactChain',
        props: {
          id: 'chain',
          artifacts: [
            {label: 'سكربت التنضيف', kind: 'code'},
            {label: 'جدول نظيف', kind: 'data'},
            {label: 'نموذج التوقع', kind: 'model'},
            {label: 'تقرير النتائج', kind: 'report'},
          ],
        },
        at: A('ArtifactChain', 1),
      },
      {component: 'ArtifactChain.link', props: {target: 'chain', from: 0, to: 1}, at: A('ArtifactChain', 2)},
      {component: 'ArtifactChain.link', props: {target: 'chain', from: 1, to: 3}, at: A('ArtifactChain', 3)},
    ],
  },
};

// BranchPaths: a question forks into outcomes (idempotency, CH-21 "DAG, retries").
const branchPaths: DemoDef = {
  name: 'BranchPaths',
  frames: 170,
  words: [
    [W('BranchPaths', 1), 6, 24],
    [W('BranchPaths', 2), 80, 98],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'BranchPaths',
        props: {
          id: 'fork',
          question: 'إيه اللي يحصل لما الـjob يتكرر؟',
          branches: [
            {label: 'من غير key', outcome: 'صفوف مكررة', status: 'fail'},
            {label: 'مع ⟦idempotency key⟧', outcome: 'تأثير واحد بس', status: 'ok'},
            {label: 'بـtimeout', outcome: 'تحميل ناقص', status: 'warn'},
          ],
        },
        at: A('BranchPaths', 1),
      },
      {component: 'BranchPaths.choose', props: {target: 'fork', index: 1}, at: A('BranchPaths', 2)},
    ],
  },
};

const demos: DemoModule = {family: 'Domain specials', demos: [connPoolTaxi, raceCondition, sagaChain, qualityGauges, idempotentStamp, kAnonBlur, splitDeck, samplingDial, guardedAgentLoop, artifactChain, branchPaths]};
export default demos;
