// Demos of the "Structure & flow" family, P7 group struct-b (rendered as Demo-<Name>; `dc render snap|perf <Name>`).
// Synthetic word ids (w:DEMO:<Name>:nnnnnn, 24-fps frames). Copy is Egyptian-Arabic; every shown number is real and carries
// its ref (data contract d:x.y:n or the s: sentence that speaks it), never invented.
import type {DemoDef, DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const A = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});
const words = (name: string, spans: [number, number][]): DemoDef['words'] => spans.map(([s, e], i) => [W(name, i + 1), s, e]);

// CH-28 DR: the RPO / RTO timeline (04 §6 Domain row; s:S4:P20:0082 names the RTO). No numbers on screen. The cursor walks
// last backup -> crash -> failover -> service back.
const timeline: DemoDef = {
  name: 'TimelineTrack',
  frames: 120,
  words: words('TimelineTrack', [
    [6, 18],
    [40, 52],
    [62, 74],
    [82, 92],
    [98, 110],
  ]),
  shot: {
    fx_tier: 'standard',
    camera: {move: 'push_in', intensity: 0.3},
    layers: [
      {
        component: 'TimelineTrack',
        props: {
          id: 'dr',
          slot: 'center',
          events: [
            {label: 'آخر backup', when: 'RPO', kind: 'milestone'},
            {label: 'السيرفر وقع', kind: 'incident'},
            {label: 'الـfailover', kind: 'event'},
            {label: 'الخدمة رجعت', when: 'RTO', kind: 'release'},
          ],
        },
        at: A('TimelineTrack', 1),
      },
      {component: 'TimelineTrack.cursorTo', props: {target: 'dr', index: 0}, at: A('TimelineTrack', 2)},
      {component: 'TimelineTrack.cursorTo', props: {target: 'dr', index: 1}, at: A('TimelineTrack', 3)},
      {component: 'TimelineTrack.cursorTo', props: {target: 'dr', index: 2}, at: A('TimelineTrack', 4)},
      {component: 'TimelineTrack.cursorTo', props: {target: 'dr', index: 3}, at: A('TimelineTrack', 5)},
    ],
  },
};

const demos: DemoModule = {family: 'Structure & flow', demos: [timeline]};
export default demos;
