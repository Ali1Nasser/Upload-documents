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

// LegendOrbs: "ستة أنوار، كل نور له معنى واحد" (04 §1.1 colour semantics, 04 §6 "Visual language"). No numbers.
const legendOrbs: DemoDef = {
  name: 'LegendOrbs',
  frames: 150,
  words: [
    [W('LegendOrbs', 1), 6, 20],
    [W('LegendOrbs', 2), 52, 66],
    [W('LegendOrbs', 3), 98, 112],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'LegendOrbs',
        props: {
          id: 'legend',
          items: [
            {label: 'اللي بنشرحه دلوقتي', color: 'signal'},
            {label: 'نجح وسليم', color: 'ok'},
            {label: 'بطيء أو قديم', color: 'warn'},
            {label: 'فشل أو اتكسر', color: 'crit'},
            {label: 'حدود أو مجموعة', color: 'violet'},
            {label: 'الإطار اللي بتشوفه الدالة', color: 'ember'},
          ],
        },
        at: A('LegendOrbs', 1),
      },
      {component: 'LegendOrbs.focus', props: {target: 'legend', index: 1}, at: A('LegendOrbs', 2)},
      {component: 'LegendOrbs.focus', props: {target: 'legend', index: 3}, at: A('LegendOrbs', 3)},
    ],
  },
};

// LatencyLadder: the waits of the labs on one log scale, each rung ~10x the last (d:6.6:6 150 ms twin p95, d:6.6:4 1 160 ms
// pool p95 wait, d:6.7:1 5 s documented-layer-order edit, d:6.7:2 57 s edit after pip install). The ladder climbs on the named step.
const latencyLadder: DemoDef = {
  name: 'LatencyLadder',
  frames: 160,
  words: [
    [W('LatencyLadder', 1), 6, 24],
    [W('LatencyLadder', 2), 56, 72],
    [W('LatencyLadder', 3), 104, 124],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'LatencyLadder',
        props: {
          id: 'ladder',
          rungs: [
            {label: 'التوأم الرقمي', latency: {value: 150, ref: 'd:6.6:6', unit: 'ms'}},
            {label: 'الـpool مزحوم', latency: {value: 1160, ref: 'd:6.6:4', unit: 'ms'}},
            {label: 'تعديل بترتيب الطبقات', latency: {value: 5, ref: 'd:6.7:1', unit: 's'}},
            {label: 'تعديل بعد ⟦pip install⟧', latency: {value: 57, ref: 'd:6.7:2', unit: 's'}},
          ],
        },
        at: A('LatencyLadder', 1),
      },
      {component: 'LatencyLadder.climb', props: {target: 'ladder', to: 1}, at: A('LatencyLadder', 1)},
      {component: 'LatencyLadder.climb', props: {target: 'ladder', to: 2}, at: A('LatencyLadder', 2)},
      {component: 'LatencyLadder.climb', props: {target: 'ladder', to: 3}, at: A('LatencyLadder', 3)},
    ],
  },
};

// PermissionLocks: rwx as a grid of locks (04 §6 "Linux ops"), the real modes of s:S4:P03:0026-0027: "700 للمفاتيح الخاصة"
// (owner rwx, nobody else), a 600 backup (owner rw-), a 644 page (rw- r-- r--); then the 777 disaster ("أي حد يقدر يعمل أي حاجة")
// opens the key to everyone and the fix closes it again. Roles = owner / group / other as the narration names them (s:S4:P03:0023).
const permissionLocks: DemoDef = {
  name: 'PermissionLocks',
  frames: 170,
  words: [
    [W('PermissionLocks', 1), 6, 20],
    [W('PermissionLocks', 2), 64, 80],
    [W('PermissionLocks', 3), 114, 130],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'PermissionLocks',
        props: {
          id: 'locks',
          roles: ['المالك', 'الجروب', 'الباقي'],
          resources: ['deploy.key', 'backup.sql', 'index.html'],
          grants: [
            {role: 'المالك', resource: 'deploy.key', level: 'admin'},
            {role: 'المالك', resource: 'backup.sql', level: 'write'},
            {role: 'المالك', resource: 'index.html', level: 'write'},
            {role: 'الجروب', resource: 'index.html', level: 'read'},
            {role: 'الباقي', resource: 'index.html', level: 'read'},
          ],
        },
        at: A('PermissionLocks', 1),
      },
      {component: 'PermissionLocks.grant', props: {target: 'locks', role: 'الباقي', resource: 'deploy.key', level: 'admin'}, at: A('PermissionLocks', 2)},
      {component: 'PermissionLocks.deny', props: {target: 'locks', role: 'الباقي', resource: 'deploy.key'}, at: A('PermissionLocks', 3)},
    ],
  },
};

// Heartbeat: HDFS DataNodes report to the NameNode by heartbeat (s:S4:P18:0035 "one DataNode died, its heartbeat stopped";
// s:S4:P18:0036 "after exactly 10 minutes and 30 seconds the cluster notices": 630 s). The dead node later re-registers
// (recover). 04 section 6 "Linux ops" (heartbeat flatlines and restarts). The only number is the spoken 10:30.
const heartbeat: DemoDef = {
  name: 'Heartbeat',
  frames: 200,
  words: [
    [W('Heartbeat', 1), 6, 20],
    [W('Heartbeat', 2), 62, 76],
    [W('Heartbeat', 3), 140, 156],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'Heartbeat',
        props: {
          id: 'hb',
          nodes: [
            {id: 'dn1', label: 'الـDataNode 1'},
            {id: 'dn2', label: 'الـDataNode 2'},
            {id: 'dn3', label: 'الـDataNode 3'},
          ],
          interval: {value: 630, ref: 's:S4:P18:0036', unit: 's'},
        },
        at: A('Heartbeat', 1),
      },
      {component: 'Heartbeat.miss', props: {target: 'hb', node: 'dn2'}, at: A('Heartbeat', 2)},
      {component: 'Heartbeat.recover', props: {target: 'hb', node: 'dn2'}, at: A('Heartbeat', 3)},
    ],
  },
};

// LogScroll: the connection-pool lab as a ledger with a grep spotlight (d:6.6:1..6, 6.6:8).
const logScroll: DemoDef = {
  name: 'LogScroll',
  frames: 150,
  words: [
    [W('LogScroll', 1), 6, 20],
    [W('LogScroll', 2), 78, 94],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'LogScroll',
        props: {
          id: 'log',
          speed: 'normal',
          lines: [
            {level: 'info', text: 'pool: capacity 67 req/s (pool / service time)'},
            {level: 'info', text: 'load: 260 req/s against the pool'},
            {level: 'debug', text: 'borrow: waiting for a free connection'},
            {level: 'warn', text: 'queue depth: 289'},
            {level: 'warn', text: 'p95 wait: 1160 ms'},
            {level: 'error', text: 'borrow timeout: shedding load'},
            {level: 'info', text: 'twin: 25 req/s, 100 % success, p95 150 ms'},
          ],
        },
        at: A('LogScroll', 1),
      },
      {component: 'LogScroll.highlight', props: {target: 'log', index: 5}, at: A('LogScroll', 2)},
    ],
  },
};

// CollectionMorph: the duplicated order id 1008 (d:6.1:3) merges when the list becomes a set (04 §6 "set = bubbles merging duplicates").
const collectionMorph: DemoDef = {
  name: 'CollectionMorph',
  frames: 150,
  words: [[W('CollectionMorph', 1), 8, 56]],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'CollectionMorph',
        props: {id: 'coll', from: 'list', to: 'set', items: ['1005', '1006', '1007', '1008', '1008', '1009']},
        at: A('CollectionMorph', 1),
      },
    ],
  },
};

// VenvDome: a global install pollutes every dome; an isolated venv seals each one (04 §6 "Collections & envs").
const venvDome: DemoDef = {
  name: 'VenvDome',
  frames: 170,
  words: [
    [W('VenvDome', 1), 6, 20],
    [W('VenvDome', 2), 62, 78],
    [W('VenvDome', 3), 112, 130],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'VenvDome',
        props: {
          id: 'venv',
          python: 'python',
          envs: [
            {name: 'مشروع الإيصالات', packages: ['pandas', 'requests']},
            {name: 'مشروع التقارير', packages: ['pandas', 'matplotlib']},
          ],
        },
        at: A('VenvDome', 1),
      },
      {component: 'VenvDome.conflict', props: {target: 'venv', package: 'pandas'}, at: A('VenvDome', 2)},
      {component: 'VenvDome.isolate', props: {target: 'venv'}, at: A('VenvDome', 3)},
    ],
  },
};

// TestGate: "الـpytest نتيجته خضرة": a red p95 test (d:6.11:3, 675 ms > 500 ms) blocks the merge; fix, run again, green.
const testGate: DemoDef = {
  name: 'TestGate',
  frames: 200,
  words: [
    [W('TestGate', 1), 6, 24],
    [W('TestGate', 2), 78, 94],
    [W('TestGate', 3), 134, 152],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'TestGate',
        props: {
          id: 'gate',
          tests: [
            {name: 'test_transfer_commit', status: 'pass'},
            {name: 'test_idor_receipts', status: 'pass'},
            {name: 'رصيد مش سالب', status: 'pass'},
            {name: 'test_p95_gate', status: 'pass'},
          ],
        },
        at: A('TestGate', 1),
      },
      {component: 'TestGate.run', props: {target: 'gate'}, at: A('TestGate', 1, 0)},
      {component: 'TestGate.fail', props: {target: 'gate', index: 3}, at: A('TestGate', 2)},
      {component: 'TestGate.run', props: {target: 'gate'}, at: A('TestGate', 3)},
    ],
  },
};

// KeyBeams: public / private / API keys open their targets (04 §6 "Relational model": a beam connects on the key word).
const keyBeams: DemoDef = {
  name: 'KeyBeams',
  frames: 170,
  words: [
    [W('KeyBeams', 1), 6, 20],
    [W('KeyBeams', 2), 54, 70],
    [W('KeyBeams', 3), 98, 114],
    [W('KeyBeams', 4), 138, 152],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'KeyBeams',
        props: {
          id: 'keys',
          keys: [
            {label: 'المفتاح العام', kind: 'public'},
            {label: 'المفتاح الخاص', kind: 'private'},
            {label: 'مفتاح الـAPI', kind: 'api'},
          ],
          targets: ['تشفير الرسالة', 'فك التشفير', 'واجهة المدفوعات'],
        },
        at: A('KeyBeams', 1),
      },
      {component: 'KeyBeams.unlock', props: {target: 'keys', key: 0, to: 0}, at: A('KeyBeams', 2)},
      {component: 'KeyBeams.unlock', props: {target: 'keys', key: 1, to: 1}, at: A('KeyBeams', 3)},
      {component: 'KeyBeams.unlock', props: {target: 'keys', key: 2, to: 2}, at: A('KeyBeams', 4)},
    ],
  },
};

// TxnCapsule: one capsule lands whole (COMMIT, serializable); the other vanishes (ROLLBACK, read committed). 04 §6 "Transactions".
const txnCapsule: DemoDef = {
  name: 'TxnCapsule',
  frames: 170,
  words: [
    [W('TxnCapsule', 1), 6, 20],
    [W('TxnCapsule', 2), 70, 90],
    [W('TxnCapsule', 3), 112, 132],
  ],
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'TxnCapsule', props: {id: 'ok', slot: 'start', ops: ['debit(A)', 'credit(B)', 'write ledger_row'], isolation: 'serializable'}, at: A('TxnCapsule', 1)},
      {component: 'TxnCapsule', props: {id: 'bad', slot: 'end', ops: ['debit(A)', 'credit(B)', 'write ledger_row'], isolation: 'read_committed'}, at: A('TxnCapsule', 1)},
      {component: 'TxnCapsule.commit', props: {target: 'ok'}, at: A('TxnCapsule', 2)},
      {component: 'TxnCapsule.rollback', props: {target: 'bad'}, at: A('TxnCapsule', 3)},
    ],
  },
};

const demos: DemoModule = {family: 'Domain specials', demos: [tripleGate, legendOrbs, latencyLadder, permissionLocks, heartbeat, logScroll, collectionMorph, venvDome, testGate, keyBeams, txnCapsule]};
export default demos;
