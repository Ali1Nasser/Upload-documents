// Demos of the P7 group "struct-a" (family Structure & flow), rendered as Demo-<Name> (`dc render snap|perf <Name>`).
// Synthetic word ids (w:DEMO:<Name>:nnnnnn, 24-fps frames). Copy follows 04 section 6 (metaphor library); every shown number is a
// data-contract fact (`ref`), never invented. Labels are Egyptian-Arabic with Latin terms in LTR isolates.
// A demo plays its variants one after the other in the same slot (each layer has its own `at` and `until` anchor), so the three
// still frames (p0 / a1 / p50 / p100) and the review strips cover them.
import type {DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});
/** Words of a demo: one [start, end] pair per word, numbered from 1. */
const words = (name: string, spans: [number, number][]): [string, number, number][] => spans.map(([s, e], i) => [W(name, i + 1), s, e]);

const demos: DemoModule = {
  family: 'Structure & flow',
  demos: [
    {
      // 04 section 6 "HDFS, YARN, MapReduce": NameNode as the map, DataNodes on two racks; the read route lights hop by hop, a
      // DataNode is named, then the client reads the replica on the other rack. Then "who talks to whom" as a radial network:
      // the gateway at the centre and BFS waves going out ring by ring (04 section 6 DSA: BFS waves).
      name: 'GraphNetwork',
      frames: 292,
      words: words('GraphNetwork', [
        [6, 22], // 1 entrance (force)
        [44, 60], // 2 highlightPath
        [72, 84], // 3 pulseNode
        [92, 108], // 4 addEdge
        [150, 160], // 5 exit of the first graph
        [164, 178], // 6 entrance (radial)
        [196, 208], // 7 highlightPath ring 1
        [232, 246], // 8 highlightPath ring 2
        [262, 276], // 9 pulseNode
      ]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'GraphNetwork',
            props: {
              id: 'hdfs',
              layout: 'force',
              seed: 7,
              until: A('GraphNetwork', 5),
              nodes: [
                {id: 'client', label: 'العميل'},
                {id: 'nn', label: 'الـNameNode'},
                {id: 'dna', label: 'DataNode A', group: 'الرف الأول'},
                {id: 'dnb', label: 'DataNode B', group: 'الرف الأول'},
                {id: 'dnc', label: 'DataNode C', group: 'الرف التاني'},
                {id: 'dnd', label: 'DataNode D', group: 'الرف التاني'},
              ],
              edges: [
                {from: 'client', to: 'nn', label: 'metadata'},
                {from: 'nn', to: 'dna', directed: false},
                {from: 'nn', to: 'dnb', directed: false},
                {from: 'nn', to: 'dnc', directed: false},
                {from: 'nn', to: 'dnd', directed: false},
                {from: 'dna', to: 'dnc'},
              ],
            },
            at: A('GraphNetwork', 1),
          },
          {component: 'GraphNetwork.highlightPath', props: {target: 'hdfs', nodes: ['client', 'nn', 'dna']}, at: A('GraphNetwork', 2)},
          {component: 'GraphNetwork.pulseNode', props: {target: 'hdfs', node: 'dnc'}, at: A('GraphNetwork', 3)},
          {component: 'GraphNetwork.addEdge', props: {target: 'hdfs', from: 'client', to: 'dnc'}, at: A('GraphNetwork', 4)},
          {
            component: 'GraphNetwork',
            props: {
              id: 'mesh',
              layout: 'radial',
              seed: 11,
              nodes: [
                {id: 'gw', label: 'API Gateway'},
                {id: 'pay', label: 'خدمة الدفع'},
                {id: 'wallet', label: 'المحفظة'},
                {id: 'notify', label: 'الإشعارات'},
                {id: 'bank', label: 'البنك'},
                {id: 'kafka', label: 'الـKafka'},
                {id: 'db', label: 'قاعدة البيانات'},
              ],
              edges: [
                {from: 'gw', to: 'pay'},
                {from: 'gw', to: 'wallet'},
                {from: 'gw', to: 'notify'},
                {from: 'pay', to: 'bank'},
                {from: 'pay', to: 'kafka'},
                {from: 'wallet', to: 'db'},
                {from: 'kafka', to: 'notify'},
              ],
            },
            at: A('GraphNetwork', 6),
          },
          {component: 'GraphNetwork.highlightPath', props: {target: 'mesh', nodes: ['gw', 'pay']}, at: A('GraphNetwork', 7)},
          {component: 'GraphNetwork.highlightPath', props: {target: 'mesh', nodes: ['gw', 'pay', 'kafka', 'notify']}, at: A('GraphNetwork', 8)},
          {component: 'GraphNetwork.pulseNode', props: {target: 'mesh', node: 'kafka'}, at: A('GraphNetwork', 9)},
        ],
      },
    },
    {
      // 04 section 6 "DAG lights in topological order; retry": the nightly NilePay receipts job. The DAG is drawn dark, then lit by
      // setState on the words that name each step; the cleaning task fails, retries and recovers; the report waits for both branches.
      name: 'DagRun',
      frames: 250,
      // the failure lands on the 50 % still (f124: failed flash, shake settling) and the first anchor on f11
      words: words('DagRun', [
        [6, 18],
        [32, 42],
        [60, 70],
        [123, 133],
        [152, 162],
        [174, 184],
        [196, 206],
        [218, 228],
      ]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'DagRun',
            props: {
              id: 'nightly',
              schedule: '@daily',
              tasks: [
                {id: 'extract', label: 'استخراج الإيصالات'},
                {id: 'clean', label: 'تنقية البيانات'},
                {id: 'validate', label: 'فحص الجودة'},
                {id: 'stage', label: 'تجهيز الـWarehouse'},
                {id: 'report', label: 'تقرير الصباح'},
              ],
              deps: [
                {from: 'extract', to: 'clean'},
                {from: 'clean', to: 'validate'},
                {from: 'clean', to: 'stage'},
                {from: 'validate', to: 'report'},
                {from: 'stage', to: 'report'},
              ],
            },
            at: A('DagRun', 1),
          },
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'extract', state: 'running'}, at: A('DagRun', 2)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'extract', state: 'success'}, at: A('DagRun', 3)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'clean', state: 'running'}, at: A('DagRun', 3)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'clean', state: 'failed'}, at: A('DagRun', 4)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'clean', state: 'retry'}, at: A('DagRun', 5)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'clean', state: 'success'}, at: A('DagRun', 6)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'validate', state: 'running'}, at: A('DagRun', 6)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'stage', state: 'running'}, at: A('DagRun', 6)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'validate', state: 'success'}, at: A('DagRun', 7)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'stage', state: 'skipped'}, at: A('DagRun', 7)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'report', state: 'running'}, at: A('DagRun', 7)},
          {component: 'DagRun.setState', props: {target: 'nightly', task: 'report', state: 'success'}, at: A('DagRun', 8)},
        ],
      },
    },
    {
      // The four variants one after the other (04 section 6):
      //  plan      the SQL funnel of section 6.3 as operators, rows flowing up (the rows 14 -> 13 -> 11 are d:6.3:2, spoken by the
      //            narration, never printed here);
      //  decision  IAM policy evaluation, "explicit deny wins" (section 6.8): the trace goes question -> question -> allow;
      //  fs        a project folder as glowing branches, a path is a lit route;
      //  btree     a three-level B-tree reaches one row in 3 page reads (d:6.5:2); the probe descends to order 1007 (d:6.1:12).
      name: 'TreeView',
      frames: 520,
      words: words('TreeView', [
        [6, 20], // 1 plan entrance
        [50, 64], // 2 plan highlightPath
        [112, 122], // 3 plan exit
        [128, 142], // 4 decision entrance
        [172, 186], // 5 decision highlightPath
        [214, 228], // 6 decision highlightPath (second trace)
        [262, 272], // 7 decision exit
        [276, 290], // 8 fs entrance
        [318, 332], // 9 fs expand
        [350, 364], // 10 fs search
        [384, 394], // 11 fs exit
        [398, 412], // 12 btree entrance
        [440, 458], // 13 btree search
        [484, 500], // 14 btree highlightPath
      ]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'TreeView',
            props: {
              id: 'plan',
              variant: 'plan',
              until: A('TreeView', 3),
              nodes: [
                {id: 'lim', label: 'أول صف واحد', kind: 'LIMIT'},
                {id: 'srt', parent: 'lim', label: 'ترتيب', kind: 'SORT'},
                {id: 'grp', parent: 'srt', label: 'تجميع بالشريحة', kind: 'GROUP BY'},
                {id: 'jn', parent: 'grp', label: 'ربط', kind: 'JOIN'},
                {id: 'flt', parent: 'jn', label: 'تصفية delivered', kind: 'WHERE'},
                {id: 'so', parent: 'flt', label: 'الطلبات', kind: 'SCAN'},
                {id: 'sc', parent: 'jn', label: 'العملاء', kind: 'SCAN'},
              ],
            },
            at: A('TreeView', 1),
          },
          {component: 'TreeView.highlightPath', props: {target: 'plan', nodes: ['lim', 'srt', 'grp', 'jn', 'flt', 'so']}, at: A('TreeView', 2)},
          {
            component: 'TreeView',
            props: {
              id: 'iam',
              variant: 'decision',
              until: A('TreeView', 7),
              nodes: [
                {id: 'q1', label: 'فيه Deny صريح؟'},
                {id: 'deny', parent: 'q1', label: 'أيوه: مرفوض', kind: 'deny'},
                {id: 'q2', parent: 'q1', label: 'لأ: فيه Allow؟'},
                {id: 'allow', parent: 'q2', label: 'أيوه: مسموح', kind: 'allow'},
                {id: 'imp', parent: 'q2', label: 'لأ: مرفوض ضمنًا', kind: 'deny'},
              ],
            },
            at: A('TreeView', 4),
          },
          {component: 'TreeView.highlightPath', props: {target: 'iam', nodes: ['q1', 'deny']}, at: A('TreeView', 5)},
          {component: 'TreeView.highlightPath', props: {target: 'iam', nodes: ['q1', 'q2', 'allow']}, at: A('TreeView', 6)},
          {
            component: 'TreeView',
            props: {
              id: 'files',
              variant: 'fs',
              until: A('TreeView', 11),
              nodes: [
                {id: 'proj', label: 'nilepay', kind: 'dir'},
                {id: 'src', parent: 'proj', label: 'src', kind: 'dir'},
                {id: 'app', parent: 'src', label: 'app.py', kind: 'file'},
                {id: 'clean', parent: 'src', label: 'clean.py', kind: 'file'},
                {id: 'tests', parent: 'proj', label: 'tests', kind: 'dir'},
                {id: 'tclean', parent: 'tests', label: 'test_clean.py', kind: 'file'},
                {id: 'dock', parent: 'proj', label: 'Dockerfile', kind: 'file'},
              ],
            },
            at: A('TreeView', 8),
          },
          {component: 'TreeView.expand', props: {target: 'files', node: 'tests'}, at: A('TreeView', 9)},
          {component: 'TreeView.search', props: {target: 'files', key: 'test_clean'}, at: A('TreeView', 10)},
          {
            component: 'TreeView',
            props: {
              id: 'idx',
              variant: 'btree',
              nodes: [
                {id: 'root', label: 'الجذر'},
                {id: 'p1', parent: 'root', label: 'صفحة وسيطة'},
                {id: 'p2', parent: 'root', label: 'صفحة وسيطة'},
                {id: 'l1', parent: 'p1', label: '1001–1003'},
                {id: 'l2', parent: 'p1', label: '1004–1006'},
                {id: 'l3', parent: 'p1', label: '1007–1009'},
                {id: 'l4', parent: 'p2', label: '1010–1012'},
                {id: 'l5', parent: 'p2', label: '1013–1014'},
              ],
            },
            at: A('TreeView', 12),
          },
          {component: 'TreeView.search', props: {target: 'idx', key: '1007'}, at: A('TreeView', 13)},
          {component: 'TreeView.highlightPath', props: {target: 'idx', nodes: ['root', 'p1', 'l3']}, at: A('TreeView', 14)},
        ],
      },
    },
    {
      // 04 section 6 "ETL/ELT pipeline stations": the cleaned-export payload crosses the stations, the transform fails on a
      // bad date format (d:6.1:6, the ambiguous 03/02/2026), is fixed, and the payload moves on to the load. Then the 04 section 6
      // "CI/CD gated pipeline" (containers, CI/CD): a release crosses five gates, the production gate fails and is fixed.
      name: 'PipelineStations',
      frames: 432,
      words: words('PipelineStations', [
        [6, 20],
        [44, 58],
        [76, 90],
        [106, 120],
        [232, 246],
        [256, 268],
        [278, 288], // 7 exit of the ETL pipeline
        [290, 302], // 8 CI/CD entrance
        [318, 330], // 9 advance to staging
        [346, 358], // 10 advance to production
        [376, 388], // 11 fail
        [406, 418], // 12 fix
      ]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'PipelineStations',
            props: {
              id: 'etl',
              payload: 'ملف الإيصالات',
              until: A('PipelineStations', 7),
              stations: [
                {id: 'extract', label: 'استخراج'},
                {id: 'clean', label: 'تنقية'},
                {id: 'transform', label: 'تحويل'},
                {id: 'load', label: 'تحميل'},
              ],
            },
            at: A('PipelineStations', 1),
          },
          {component: 'PipelineStations.advance', props: {target: 'etl', to: 'clean'}, at: A('PipelineStations', 2)},
          {component: 'PipelineStations.advance', props: {target: 'etl', to: 'transform'}, at: A('PipelineStations', 3)},
          {component: 'PipelineStations.fail', props: {target: 'etl', at: 'transform', reason: 'صيغة التاريخ غلط'}, at: A('PipelineStations', 4)},
          {component: 'PipelineStations.fix', props: {target: 'etl', at: 'transform'}, at: A('PipelineStations', 5)},
          {component: 'PipelineStations.advance', props: {target: 'etl', to: 'load'}, at: A('PipelineStations', 6)},
          {
            component: 'PipelineStations',
            props: {
              id: 'cicd',
              payload: 'إصدار جديد',
              stations: [
                {id: 'build', label: 'بناء الـImage'},
                {id: 'test', label: 'اختبار'},
                {id: 'scan', label: 'فحص أمني'},
                {id: 'stg', label: 'نشر Staging'},
                {id: 'prod', label: 'نشر Production'},
              ],
            },
            at: A('PipelineStations', 8),
          },
          {component: 'PipelineStations.advance', props: {target: 'cicd', to: 'stg'}, at: A('PipelineStations', 9)},
          {component: 'PipelineStations.advance', props: {target: 'cicd', to: 'prod'}, at: A('PipelineStations', 10)},
          {component: 'PipelineStations.fail', props: {target: 'cicd', at: 'prod', reason: 'فحص الصحة فشل'}, at: A('PipelineStations', 11)},
          {component: 'PipelineStations.fix', props: {target: 'cicd', at: 'prod'}, at: A('PipelineStations', 12)},
        ],
      },
    },
    {
      // 04 section 6.7 "Docker layer cache": cached layers glow; editing the source line rebuilds only the layers above it and
      // costs 5 s with the documented layer order (d:6.7:1). layers[0] is the bottom slab. Then the warehouse terraces (04 section 6,
      // "Warehouse, OLAP, SCD": ODS -> DW -> ADS -> marts, data descends and refines) as the generic variant.
      name: 'LayerStack',
      frames: 312,
      words: words('LayerStack', [
        [6, 20], // 1 docker entrance
        [52, 66], // 2 highlight
        [92, 106], // 3 rebuildFrom
        [158, 168], // 4 docker exit
        [172, 186], // 5 terraces entrance
        [208, 220], // 6 ODS
        [234, 246], // 7 DW
        [260, 272], // 8 ADS
        [286, 298], // 9 marts
      ]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'LayerStack',
            props: {
              id: 'img',
              slot: 'full',
              variant: 'docker',
              until: A('LayerStack', 4),
              layers: [
                {label: 'FROM python', cached: true},
                {label: 'COPY requirements.txt', cached: true},
                {label: 'RUN pip install', cached: true},
                {label: 'COPY src', size: {value: 5, unit: 's', ref: 'd:6.7:1'}},
                {label: 'CMD app'},
              ],
            },
            at: A('LayerStack', 1),
          },
          {component: 'LayerStack.highlight', props: {target: 'img', index: 3}, at: A('LayerStack', 2)},
          {component: 'LayerStack.rebuildFrom', props: {target: 'img', index: 3}, at: A('LayerStack', 3)},
          {
            component: 'LayerStack',
            props: {
              id: 'terraces',
              slot: 'full',
              variant: 'generic',
              layers: [
                {label: 'Marts — لكل فريق'},
                {label: 'ADS — جاهز للتقارير'},
                {label: 'DW — مخزن موحّد'},
                {label: 'ODS — بيانات خام'},
              ],
            },
            at: A('LayerStack', 5),
          },
          {component: 'LayerStack.highlight', props: {target: 'terraces', index: 3}, at: A('LayerStack', 6)},
          {component: 'LayerStack.highlight', props: {target: 'terraces', index: 2}, at: A('LayerStack', 7)},
          {component: 'LayerStack.highlight', props: {target: 'terraces', index: 1}, at: A('LayerStack', 8)},
          {component: 'LayerStack.highlight', props: {target: 'terraces', index: 0}, at: A('LayerStack', 9)},
        ],
      },
    },
    {
      // 04 section 6 "Semantic model & report": a 3D star schema, the fact table at the centre and the dimensions in orbit. The orders
      // fact (order total and quantity are the shown measures of the data contract section 6.1 / 6.3) is joined to its customers (with
      // tier), date, product and status dimensions; the orbit turns to the named dimension on its word.
      name: 'StarSchema3D',
      frames: 168,
      words: words('StarSchema3D', [
        [6, 22],
        [64, 80],
        [112, 128],
      ]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'StarSchema3D',
            props: {
              id: 'star',
              fact: {name: 'الطلبات', measures: ['total', 'quantity']},
              dims: [
                {name: 'العملاء', attrs: ['name', 'tier']},
                {name: 'التاريخ', attrs: ['day', 'month']},
                {name: 'المنتج', attrs: ['sku', 'category']},
                {name: 'الحالة', attrs: ['status']},
              ],
            },
            at: A('StarSchema3D', 1),
          },
          {component: 'StarSchema3D.focusDim', props: {target: 'star', name: 'العملاء'}, at: A('StarSchema3D', 2)},
          {component: 'StarSchema3D.focusDim', props: {target: 'star', name: 'التاريخ'}, at: A('StarSchema3D', 3)},
        ],
      },
    },
    {
      // 04 section 6 "Warehouse, OLAP, SCD": a rotating cube with slice / dice / roll-up. Axes are real members of the data contract
      // (section 6.4 customers Amara / Ravi / Lena / Yuki, section 6.3 order statuses, customer tiers); cells show a heat, no numbers.
      name: 'OlapCube',
      frames: 264,
      words: words('OlapCube', [
        [6, 22],
        [50, 64],
        [100, 114],
        [148, 162],
        [196, 210],
      ]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'OlapCube',
            props: {
              id: 'cube',
              axes: [
                {label: 'العميل', members: ['Amara', 'Ravi', 'Lena', 'Yuki']},
                {label: 'حالة الطلب', members: ['delivered', 'cancelled', 'refunded']},
                {label: 'الشريحة', members: ['gold', 'silver']},
              ],
            },
            at: A('OlapCube', 1),
          },
          {component: 'OlapCube.slice', props: {target: 'cube', axis: 1, member: 'delivered'}, at: A('OlapCube', 2)},
          {component: 'OlapCube.rollup', props: {target: 'cube', axis: 2}, at: A('OlapCube', 3)},
          {component: 'OlapCube.drill', props: {target: 'cube', axis: 2}, at: A('OlapCube', 4)},
          {component: 'OlapCube.dice', props: {target: 'cube', members: ['Amara', 'Lena', 'gold']}, at: A('OlapCube', 5)},
        ],
      },
    },
  ],
};
export default demos;
