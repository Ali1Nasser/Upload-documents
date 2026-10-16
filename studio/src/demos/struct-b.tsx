// Demos of the "Structure & flow" family, P7 group struct-b (rendered as Demo-<Name>; `dc render snap|perf <Name>`).
// Synthetic word ids (w:DEMO:<Name>:nnnnnn, 24-fps frames). Copy is Egyptian-Arabic; every shown number is real and carries
// its ref (data contract d:x.y:n or the s: sentence that speaks it), never invented.
import type {DemoDef, DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});
const words = (name: string, spans: [number, number][]): DemoDef['words'] => spans.map(([s, e], i) => [W(name, i + 1), s, e]);

// CH-34-style release timeline on the p95 gate (data contract d:6.11:1..3: a p95 gate at 500 ms passes at 355 ms and fails at
// 675 ms under regression; the rollback beat carries no number). Numbers on screen: 355 ms (d:6.11:2), 500 ms (d:6.11:1),
// 675 ms (d:6.11:3). The cursor walks event by event over the words that name them.
const timeline: DemoDef = {
  name: 'TimelineTrack',
  frames: 168,
  words: words('TimelineTrack', [
    [6, 18],
    [34, 46],
    [54, 66],
    [76, 88],
    [98, 110],
    [120, 132],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'TimelineTrack',
        props: {
          id: 'rel',
          slot: 'full',
          events: [
            {label: 'نسخة سليمة · ⟦355 ms⟧', when: 'p95', kind: 'release'},
            {label: 'الـgate · ⟦500 ms⟧', when: 'CI', kind: 'milestone'},
            {label: 'الـregression · ⟦675 ms⟧', when: 'p95', kind: 'incident'},
            {label: 'الـgate رفض النسخة', kind: 'event'},
            {label: 'رجوع للنسخة القديمة', when: 'rollback', kind: 'release'},
          ],
        },
        at: A('TimelineTrack', 1),
      },
      {component: 'TimelineTrack.cursorTo', props: {target: 'rel', index: 0}, at: A('TimelineTrack', 2)},
      {component: 'TimelineTrack.cursorTo', props: {target: 'rel', index: 1}, at: A('TimelineTrack', 3)},
      {component: 'TimelineTrack.cursorTo', props: {target: 'rel', index: 2}, at: A('TimelineTrack', 4)},
      {component: 'TimelineTrack.cursorTo', props: {target: 'rel', index: 3}, at: A('TimelineTrack', 5)},
      {component: 'TimelineTrack.cursorTo', props: {target: 'rel', index: 4}, at: A('TimelineTrack', 6)},
    ],
  },
};

// CH-?? Git (04 section 6 "Tests, Git, review": Git is a branching light-graph; a red test blocks the merge -> fix -> green).
const git: DemoDef = {
  name: 'GitGraph',
  frames: 216,
  words: words('GitGraph', [
    [6, 20],
    [60, 74],
    [96, 110],
    [128, 142],
    [160, 176],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'GitGraph',
        props: {
          id: 'g',
          slot: 'center',
          branches: [{name: 'main'}, {name: 'fix/retry'}],
          commits: [
            {id: 'c1', branch: 'main', msg: 'أول نسخة', parents: []},
            {id: 'c2', branch: 'main', msg: 'نظام الدفع', parents: ['c1']},
            {id: 'c3', branch: 'fix/retry', msg: 'إضافة الـretry', parents: ['c2']},
          ],
        },
        at: A('GitGraph', 1),
      },
      {component: 'GitGraph.checkout', props: {target: 'g', branch: 'fix/retry'}, at: A('GitGraph', 2)},
      {component: 'GitGraph.commit', props: {target: 'g', branch: 'fix/retry', msg: 'الـtest نجح'}, at: A('GitGraph', 3)},
      {component: 'GitGraph.checkout', props: {target: 'g', branch: 'main'}, at: A('GitGraph', 4)},
      {component: 'GitGraph.merge', props: {target: 'g', from: 'fix/retry', into: 'main'}, at: A('GitGraph', 5)},
    ],
  },
};

// 04 section 6 "State, memory": two names -> one heap object (aliasing); a call slides in a new frame; the dropped object is
// collected. Content follows CH-08 (canon chapters.json: S01 two variables draw arrows to one heap list, label_ar 'نفس الـobject';
// S03 `def f(x, acc=[])`). No numbers on screen, so nothing needs a ref.
const stack: DemoDef = {
  name: 'StackHeap',
  frames: 216,
  words: words('StackHeap', [
    [6, 20],
    [56, 70],
    [100, 114],
    [136, 150],
    [172, 186],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'StackHeap',
        props: {
          id: 'mem',
          slot: 'full',
          frames: [
            {label: 'main', vars: ['a', 'b']},
            {label: 'f(x)', vars: ['acc']},
          ],
          heap: [
            {id: 'lst', label: 'نفس الـobject'},
            {id: 'tmp', label: 'قايمة مؤقتة'},
          ],
          refs: [
            {from: 'a', to: 'lst'},
            {from: 'b', to: 'lst'},
            {from: 'acc', to: 'tmp'},
          ],
        },
        at: A('StackHeap', 1),
      },
      {component: 'StackHeap.pop', props: {target: 'mem'}, at: A('StackHeap', 3)},
      {component: 'StackHeap.collect', props: {target: 'mem', node: 'tmp'}, at: A('StackHeap', 4)},
      {component: 'StackHeap.push', props: {target: 'mem', label: 'g(y)'}, at: A('StackHeap', 5)},
    ],
  },
};

// 04 section 6 "Kafka & NRT": topic = river with partition lanes; the six NilePay receipts (d:6.19:5) are the messages; lag =
// a gap that grows; adding a consumer rebalances. The lag value is the 5-minute freshness SLA of s:S4:P19:0090.
const lanes: DemoDef = {
  name: 'PartitionLanes',
  frames: 264,
  words: words('PartitionLanes', [
    [6, 20],
    [64, 78],
    [112, 126],
    [160, 174],
    [208, 222],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'PartitionLanes',
        props: {
          id: 'topic',
          slot: 'full',
          topic: 'إيصالات NilePay',
          partitions: 3,
          messages: 6,
          keyed: true,
          seed: 4,
          consumers: [
            {id: 'c1', group: 'fraud-check', lanes: [0, 1]},
            {id: 'c2', group: 'fraud-check', lanes: []},
          ],
        },
        at: A('PartitionLanes', 1),
      },
      {component: 'PartitionLanes.produce', props: {target: 'topic', lane: 2, key: 'T3'}, at: A('PartitionLanes', 2)},
      {component: 'PartitionLanes.lag', props: {target: 'topic', lane: 2, value: {value: 5, unit: 'min', ref: 's:S4:P19:0090'}}, at: A('PartitionLanes', 3)},
      {component: 'PartitionLanes.rebalance', props: {target: 'topic', assign: [{consumer: 'c1', lanes: [0, 1]}, {consumer: 'c2', lanes: [2]}]}, at: A('PartitionLanes', 4)},
    ],
  },
};

// 04 section 6 "HDFS": a file splits into 8 blocks (s:S4:P18:0026) that replicate x3 (s:S4:P18:0024) across the racks; a node dies
// -> replicas keep serving -> re-replication.
const repl: DemoDef = {
  name: 'BlockReplication',
  frames: 264,
  words: words('BlockReplication', [
    [6, 20],
    [70, 84],
    [140, 154],
    [196, 210],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'BlockReplication',
        props: {
          id: 'hdfs',
          slot: 'center',
          blocks: 8,
          factor: 3,
          nodes: [
            {id: 'na', label: 'سيرفر A'},
            {id: 'nb', label: 'سيرفر B'},
            {id: 'nc', label: 'سيرفر C'},
            {id: 'nd', label: 'سيرفر D'},
            {id: 'ne', label: 'سيرفر E'},
          ],
        },
        at: A('BlockReplication', 1),
      },
      {component: 'BlockReplication.failNode', props: {target: 'hdfs', node: 'nc'}, at: A('BlockReplication', 3)},
      {component: 'BlockReplication.rereplicate', props: {target: 'hdfs'}, at: A('BlockReplication', 4)},
    ],
  },
};

// 04 section 6 "Networks, HTTP, APIs": a request capsule travels client -> lb -> API -> cache -> DB, each hop lights on its word.
// The DB hop carries the pool-lab p95 wait 1 160 ms (d:6.6:4); the pool runs dry -> the request fails -> retry.
const journey: DemoDef = {
  name: 'RequestJourney',
  frames: 288,
  words: words('RequestJourney', [
    [6, 20],
    [48, 62],
    [84, 98],
    [118, 132],
    [160, 176],
    [210, 226],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'RequestJourney',
        props: {
          id: 'req',
          slot: 'full',
          hops: [
            {id: 'client', label: 'الموبايل', kind: 'client'},
            {id: 'lb', label: 'الـ⟦load balancer⟧', kind: 'lb'},
            {id: 'api', label: 'الـAPI', kind: 'service'},
            {id: 'cache', label: 'الـcache', kind: 'cache'},
            {id: 'db', label: 'الـdatabase', kind: 'db', latency: {value: 1160, unit: 'ms', ref: 'd:6.6:4'}},
          ],
        },
        at: A('RequestJourney', 1),
      },
      {component: 'RequestJourney.travel', props: {target: 'req', to: 'lb'}, at: A('RequestJourney', 2)},
      {component: 'RequestJourney.travel', props: {target: 'req', to: 'api'}, at: A('RequestJourney', 3)},
      {component: 'RequestJourney.travel', props: {target: 'req', to: 'db'}, at: A('RequestJourney', 4)},
      {component: 'RequestJourney.fail', props: {target: 'req', at: 'db'}, at: A('RequestJourney', 5)},
      {component: 'RequestJourney.retry', props: {target: 'req', at: 'db'}, at: A('RequestJourney', 6)},
    ],
  },
};

// 04 section 6 "Mobile Money": the six NilePay receipts T1..T6 (d:5.2:1..6, d:6.19:5) ride the belt through the pipeline stations;
// T3 (200 EGP, FAILED) jams, the belt stops, the jam clears. Statuses are the data-contract receipt statuses. No numbers on screen.
const conveyor: DemoDef = {
  name: 'Conveyor',
  frames: 240,
  words: words('Conveyor', [
    [6, 20],
    [64, 78],
    [104, 118],
    [148, 162],
    [196, 210],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'Conveyor',
        props: {
          id: 'belt',
          slot: 'full',
          speed: 'normal',
          stations: ['الموبايل', 'الـcore', 'Kafka'],
          items: [
            {label: 'T1', status: 'ok'},
            {label: 'T2', status: 'ok'},
            {label: 'T3', status: 'fail'},
            {label: 'T4', status: 'ok'},
            {label: 'T5', status: 'ok'},
            {label: 'T6', status: 'fail'},
          ],
        },
        at: A('Conveyor', 1),
      },
      {component: 'Conveyor.jam', props: {target: 'belt', index: 2}, at: A('Conveyor', 3)},
      {component: 'Conveyor.stop', props: {target: 'belt'}, at: A('Conveyor', 4)},
      {component: 'Conveyor.resume', props: {target: 'belt'}, at: A('Conveyor', 5)},
    ],
  },
};

// 04 section 7 / CH-01 "The map": the A-01 Holo-City of the seven movements. machine + data are learned, systems ignites, a route
// draws data -> systems; then the camera flies to the platform district (04 section 6 "The film map": fly-over, district ignites,
// route draws). No numbers on screen (tags are the movement order 1..7 of CH-01).
const worldmap: DemoDef = {
  name: 'WorldMapA01',
  frames: 264,
  words: words('WorldMapA01', [
    [6, 20],
    [100, 114],
    [148, 162],
    [200, 214],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {component: 'WorldMapA01', props: {id: 'a01', slot: 'full', district: 'systems', highlights: ['machine', 'data'], route: ['data', 'systems']}, at: A('WorldMapA01', 1)},
      {component: 'WorldMapA01.flyTo', props: {target: 'a01', district: 'platform'}, at: A('WorldMapA01', 3)},
    ],
  },
};

const demos: DemoModule = {family: 'Structure & flow', demos: [timeline, git, stack, lanes, repl, journey, conveyor, worldmap]};
export default demos;
