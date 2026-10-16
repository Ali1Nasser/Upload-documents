// Demos of the "Code" and "Media" families (group code-media). Synthetic word ids (w:DEMO:<Name>:nnnnnn, 24-fps frames); content comes
// from the data contract (d:6.3 SQL funnel, d:6.7 Docker layer cache, d:6.12 normal curve), never invented.
import type {DemoModule} from '../spec/types';

const wd = (name: string) => (n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const TM = wd('Terminal');
const CT = wd('CodeTrace');
const SS = wd('SqlStages');
const LP = wd('LoopPlate');
const MI = wd('ManimInsert');
const AP = wd('AIPlate');

const demos: DemoModule = {
  family: 'Code + Media',
  demos: [
    {
      // CH-34 Docker layer cache (d:6.7:1 = 5 s with the documented layer order, d:6.7:2 = 57 s with COPY . . above pip install)
      name: 'Terminal',
      frames: 150,
      words: [
        [TM(1), 8, 22],
        [TM(2), 44, 58],
        [TM(3), 74, 88],
        [TM(4), 108, 122],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'Terminal',
            props: {
              id: 'build',
              shell: 'bash',
              lines: [
                {kind: 'cmd', text: 'docker build -t nilepay-api .'},
                {kind: 'out', text: ' => CACHED [2/4] COPY requirements.txt .', at: {word: TM(2), lead_frames: 2}},
                {kind: 'out', text: ' => CACHED [3/4] RUN pip install -r requirements.txt'},
                {kind: 'out', text: ' => [4/4] COPY . .'},
                {kind: 'out', text: '# الطبقة الوحيدة اللي اتغيرت'},
                {kind: 'out', text: 'build finished in 5 s', at: {word: TM(3), lead_frames: 2}},
                {kind: 'cmd', text: 'git checkout order-wrong && docker build -t nilepay-api .', at: {word: TM(4), lead_frames: 2}},
                {kind: 'err', text: 'cache miss at pip install: build finished in 57 s'},
              ],
            },
            at: {word: TM(1), lead_frames: 2},
          },
        ],
      },
    },
    {
      // CH-27 receipts (data contract 5.2: rows d:5.2:1..6 are the six transactions, amounts 120, 80, 200, 50, 150, 100, T3 and T6 FAILED; the OK ones sum to 400 EGP, d:5.2:8). The cursor steps on the
      // spoken lines; the Arabic comment is a whole-word run inside the code; the footer note is one whole Arabic phrase per step.
      name: 'CodeTrace',
      frames: 150,
      words: [
        [CT(1), 8, 22],
        [CT(2), 36, 50],
        [CT(3), 64, 78],
        [CT(4), 92, 104],
        [CT(5), 120, 134],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'CodeTrace',
            props: {
              id: 'trace',
              lang: 'python',
              code: 'amounts = [120, 80, 200, 50, 150, 100]\nfailed = {"T3", "T6"}\ntotal = 0\nfor i, a in enumerate(amounts, 1):\n    if f"T{i}" not in failed:\n        total += a\n# المجموع الناجح\nprint(total)  # 400',
              highlights: [
                {lines: [1, 2], at: {word: CT(2), lead_frames: 2}, note_ar: 'ست عمليات، اتنين منهم فشلوا'},
                {lines: [4, 5], at: {word: CT(3), lead_frames: 2}, note_ar: 'نمر على كل عملية ناجحة'},
                {lines: [8, 8], at: {word: CT(5), lead_frames: 2}, note_ar: 'المجموع الناجح أربعمية جنيه'},
              ],
            },
            at: {word: CT(1), lead_frames: 2},
          },
          {component: 'CodeTrace.step', props: {target: 'trace', line: 6}, at: {word: CT(4), lead_frames: 2}},
        ],
      },
    },
    {
      // CH-11 SQL funnel (d:6.3:1): the query is written SELECT-first but runs FROM-first; the badge on each clause is its execution step
      name: 'SqlStages',
      frames: 230,
      words: [
        [SS(1), 8, 22],
        [SS(2), 36, 48],
        [SS(3), 60, 72],
        [SS(4), 84, 96],
        [SS(5), 108, 120],
        [SS(6), 132, 144],
        [SS(7), 156, 168],
        [SS(8), 180, 192],
        [SS(9), 204, 216],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'SqlStages',
            props: {
              id: 'q',
              query: "SELECT c.tier, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.tier HAVING SUM(o.total) > 300 ORDER BY revenue DESC LIMIT 1",
              stages: ['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'],
            },
            at: {word: SS(1), lead_frames: 2},
          },
          ...(['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'] as const).map((stage, i) => ({
            component: 'SqlStages.activate',
            props: {target: 'q', stage},
            at: {word: SS(i + 2), lead_frames: 2},
          })),
        ],
      },
    },
    {
      // seamless 10 s loop played behind a term and a sourced number (the plate never carries meaning; d:6.7:2 = 57 s cache-miss build):
      // screen blend (CSS mix-blend-mode on the layer host) over the backdrop
      name: 'LoopPlate',
      frames: 120,
      words: [[LP(1), 12, 36], [LP(2), 54, 78]],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {component: 'LoopPlate', props: {id: 'plate', plate: 'demo-aurora-loop', blend: 'screen', opacity: 1, speed: 1, slot: 'full', depth: 'far'}, at: {word: LP(1), lead_frames: 12}},
          {component: 'KineticWord', props: {id: 'kw', text: 'الـcache', slot: 'center', size: 'kinetic'}, at: {word: LP(1), lead_frames: 2}},
          {
            component: 'NumberCounter',
            props: {id: 'cnt', to: {value: 57, ref: 'd:6.7:2', unit: 's'}, format: 'duration', label: 'زمن البناء', slot: 'lower-third'},
            at: {word: LP(2), lead_frames: 2},
          },
        ],
      },
    },
    {
      // Manim alpha insert (d:6.12:5, normCdf(1.96) = 0.975): played once from its anchor, held on the last frame
      name: 'ManimInsert',
      frames: 130,
      words: [[MI(1), 10, 30]],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [{component: 'ManimInsert', props: {id: 'insert', clip: 'demo-normal-95', alpha: true, fit: 'contain', slot: 'center'}, at: {word: MI(1), lead_frames: 2}}],
      },
    },
    {
      // generated-plate stand-in (ADR-006 gated): plate + depth map, 2.5D drift over the shot
      name: 'AIPlate',
      frames: 120,
      words: [[AP(1), 12, 36]],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {component: 'AIPlate', props: {id: 'plate', plate: 'demo-glass-hall', depth_map: 'demo-glass-hall-depth', parallax: 0.5, slot: 'full', depth: 'far'}, at: {word: AP(1), lead_frames: 12}},
          {component: 'KineticWord', props: {id: 'kw', text: 'الـdepth', slot: 'upper-third', size: 'kinetic'}, at: {word: AP(1), lead_frames: 2}},
        ],
      },
    },
  ],
};
export default demos;
