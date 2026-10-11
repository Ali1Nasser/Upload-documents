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
  ],
};
export default demos;
