// Demos of the P7 group "struct-a" (family Structure & flow), rendered as Demo-<Name> (`dc render snap|perf <Name>`).
// Synthetic word ids (w:DEMO:<Name>:nnnnnn, 24-fps frames). Copy follows 04 section 6 (metaphor library); every shown number is a
// data-contract fact (`ref`), never invented. Labels are Egyptian-Arabic with Latin terms in LTR isolates.
import type {DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});

const demos: DemoModule = {
  family: 'Structure & flow',
  demos: [
    {
      // 04 section 6 "HDFS, YARN, MapReduce": NameNode as the map, DataNodes on two racks; the read route lights hop by hop,
      // a DataNode is named, then the client reads the replica on the other rack.
      name: 'GraphNetwork',
      frames: 120,
      words: [
        [W('GraphNetwork', 1), 6, 22],
        [W('GraphNetwork', 2), 44, 60],
        [W('GraphNetwork', 3), 72, 84],
        [W('GraphNetwork', 4), 92, 108],
      ],
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
        ],
      },
    },
    {
      // 04 section 6 "DAG lights in topological order; retry": the nightly NilePay receipts job. The DAG is drawn dark, then lit by
      // setState on the words that name each step; the cleaning task fails, retries and recovers; the report waits for both branches.
      name: 'DagRun',
      frames: 216,
      words: [
        [W('DagRun', 1), 6, 20],
        [W('DagRun', 2), 40, 52],
        [W('DagRun', 3), 62, 74],
        [W('DagRun', 4), 84, 96],
        [W('DagRun', 5), 108, 120],
        [W('DagRun', 6), 132, 144],
        [W('DagRun', 7), 156, 168],
        [W('DagRun', 8), 180, 192],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'DagRun',
            props: {
              id: 'nightly',
              schedule: '@daily 02:00',
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
      // 04 section 6.5 "index vs scan": a three-level B-tree reaches one row in 3 page reads (d:6.5:2); the probe descends from the
      // root to the leaf holding order 1007 (an order id of the data contract, d:6.1:12). Leaves are linked (B+ tree).
      name: 'TreeView',
      frames: 144,
      words: [
        [W('TreeView', 1), 6, 20],
        [W('TreeView', 2), 52, 70],
        [W('TreeView', 3), 100, 116],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
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
            at: A('TreeView', 1),
          },
          {component: 'TreeView.search', props: {target: 'idx', key: '1007'}, at: A('TreeView', 2)},
          {component: 'TreeView.highlightPath', props: {target: 'idx', nodes: ['root', 'p1', 'l3']}, at: A('TreeView', 3)},
        ],
      },
    },
    {
      // 04 section 6 "ETL/ELT pipeline stations": the cleaned-export payload crosses the stations, the transform fails on a
      // bad date format (d:6.1:6), is fixed, and the payload moves on to the load.
      name: 'PipelineStations',
      frames: 192,
      words: [
        [W('PipelineStations', 1), 6, 20],
        [W('PipelineStations', 2), 44, 58],
        [W('PipelineStations', 3), 76, 90],
        [W('PipelineStations', 4), 106, 120],
        [W('PipelineStations', 5), 138, 152],
        [W('PipelineStations', 6), 164, 178],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'PipelineStations',
            props: {
              id: 'etl',
              payload: 'ملف الإيصالات',
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
        ],
      },
    },
    {
      // 04 section 6.7 "Docker layer cache": cached layers glow; editing the source line rebuilds only the layers above it and
      // costs 5 s with the documented layer order (d:6.7:1). layers[0] is the bottom slab.
      name: 'LayerStack',
      frames: 168,
      words: [
        [W('LayerStack', 1), 6, 20],
        [W('LayerStack', 2), 52, 66],
        [W('LayerStack', 3), 92, 106],
      ],
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
        ],
      },
    },
  ],
};
export default demos;
