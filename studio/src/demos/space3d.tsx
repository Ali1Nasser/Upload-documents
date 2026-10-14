// Demos of the "Space & 3D" group space3d (rendered as Demo-<Name>; `dc render snap|perf <Name>`). Synthetic word ids
// (w:DEMO:<Name>:nnnnnn, 24-fps frames). Copy is Egyptian-Arabic narration / canon wording (CH-32 Transformer, CH-33 retrieval,
// CH-29/31 ML); every shown number carries a data-contract ref (corpus/canon/data_contract.json) or the sentence that speaks it.
import type {DemoDef, DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;
const words = (name: string, ...ws: [number, number][]): DemoDef['words'] => ws.map(([s, e], i) => [W(name, i + 1), s, e]);
const at = (name: string, n: number, lead = 2) => ({word: W(name, n), lead_frames: lead});

const demos: DemoModule = {
  family: 'Space & 3D',
  demos: [
    {
      // CH-33 (04 section 6 "Embeddings, RAG"): meaning as position; the query probe lands, its nearest neighbours ignite,
      // the camera dollies into the matching cluster. Labels: CH-33 narration (look-dev r3 F4 copy, s:S1:ar-natural:0495-0498).
      name: 'VectorGalaxy',
      frames: 120,
      words: words('VectorGalaxy', [6, 18], [30, 44], [54, 66], [84, 98]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'VectorGalaxy',
            props: {id: 'galaxy', clusters: ['قسم الـidempotency', 'قسم الـroadmap', 'الـ⟦keyword search⟧', 'الـembeddings'], points: 900, seed: 33},
            at: at('VectorGalaxy', 1),
          },
          {component: 'VectorGalaxy.probe', props: {target: 'galaxy', query: 'تحمّل نفس الصفوف مرتين'}, at: at('VectorGalaxy', 2)},
          {component: 'VectorGalaxy.highlightNeighbors', props: {target: 'galaxy', k: 5}, at: at('VectorGalaxy', 3)},
          {component: 'VectorGalaxy.zoomCluster', props: {target: 'galaxy', cluster: 'قسم الـidempotency'}, at: at('VectorGalaxy', 4)},
        ],
      },
    },
    {
      // Ambient data particles behind a kinetic term: the field is cut out of the copy box (ADR-002 text-safe).
      name: 'ParticleField',
      frames: 72,
      words: words('ParticleField', [8, 22]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {component: 'ParticleField', props: {id: 'field', count: 900, kind: 'data', color: 'signal', seed: 7, depth: 'far'}},
          {component: 'KineticWord', props: {text: 'الـembedding', size: 'kinetic'}, at: at('ParticleField', 1)},
        ],
      },
    },
    {
      // Holographic floor (04 section 1.1 --grid) with an emissive pulse on the anchor word.
      name: 'HoloGrid',
      frames: 72,
      words: words('HoloGrid', [8, 20]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [{component: 'HoloGrid', props: {id: 'floor', surface: 'floor', color: 'grid', pulse: true, depth: 'far'}, at: at('HoloGrid', 1)}],
      },
    },
    {
      // CH-32 (04 section 6 "NLP, attention, Transformer"): text -> token tiles. The sentence is released on the spoken beats
      // (emit on words 2 and 3); the head tile is signal. show_ids prints the position in the stream (#0..#6), not a vocabulary id.
      name: 'TokenStream',
      frames: 96,
      words: words('TokenStream', [6, 16], [30, 42], [58, 70]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {
            component: 'TokenStream',
            props: {id: 'stream', tokens: ['العميل', 'ضغط', 'الدفع', 'مرتين', 'idem', 'potency', 'key'], show_ids: true, tokenizer: 'BPE tokenizer'},
            at: at('TokenStream', 1),
          },
          {component: 'TokenStream.emit', props: {target: 'stream', count: 4}, at: at('TokenStream', 2)},
          {component: 'TokenStream.emit', props: {target: 'stream', count: 3}, at: at('TokenStream', 3)},
        ],
      },
    },
    {
      // CH-32: "who does this token look at?" Beams leave the focus token and land on the tokens it attends to; the weights only
      // set beam width (no figures are printed without a ref), then `attend` re-focuses on the next spoken beat.
      name: 'AttentionBeams',
      frames: 120,
      words: words('AttentionBeams', [6, 16], [40, 52], [78, 92]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {
            component: 'AttentionBeams',
            props: {id: 'beams', tokens: ['الـKafka', 'بيبعت', 'الرسالة', 'ثم', 'بتتخزن', 'في', 'الـpartition'], focus: 4, weights: [0.05, 0.1, 0.52, 0.04, 0, 0.06, 0.38]},
            at: at('AttentionBeams', 1),
          },
          {component: 'AttentionBeams.attend', props: {target: 'beams', from: 6, to: [0, 4, 5]}, at: at('AttentionBeams', 3)},
        ],
      },
    },
    {
      // CH-32 (s:S1:ar-natural:0486, query / key / value): the token x token grid; after the causal mask it is lower-triangular.
      // Seeded picture (the contract carries no per-cell values, so no figures are printed); a row lights on its word.
      name: 'AttentionMatrix',
      frames: 120,
      words: words('AttentionMatrix', [6, 16], [52, 64]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {component: 'AttentionMatrix', props: {id: 'matrix', tokens: ['العميل', 'ضغط', 'الدفع', 'مرتين', 'الـAPI', 'رفض'], head: 'Head 1'}, at: at('AttentionMatrix', 1)},
          {component: 'AttentionMatrix.highlightRow', props: {target: 'matrix', index: 4}, at: at('AttentionMatrix', 2)},
        ],
      },
    },
    {
      // CH-33 (04 section 6 "context tunnel"): the window of s:S4:P22:0074 (4000 .. 128000 tokens). Items push in, the oldest are
      // evicted (an explicit evict, then the automatic eviction when the window is full).
      name: 'ContextTunnel',
      frames: 150,
      words: words('ContextTunnel', [6, 18], [44, 56], [74, 86], [102, 116]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {
            component: 'ContextTunnel',
            props: {
              id: 'tunnel',
              window: {value: 128000, unit: 'tokens', ref: 's:S4:P22:0074'},
              items: [{label: 'تعليمات النظام', kind: 'system'}, {label: 'سؤال العميل', kind: 'user'}, {label: 'قسم الـidempotency', kind: 'doc'}],
            },
            at: at('ContextTunnel', 1),
          },
          {component: 'ContextTunnel.push', props: {target: 'tunnel', label: 'نتيجة الـAPI', kind: 'tool'}, at: at('ContextTunnel', 2)},
          {component: 'ContextTunnel.push', props: {target: 'tunnel', label: 'الإجابة', kind: 'answer'}, at: at('ContextTunnel', 3)},
          {component: 'ContextTunnel.push', props: {target: 'tunnel', label: 'سؤال تاني', kind: 'user'}, at: at('ContextTunnel', 4)},
        ],
      },
    },
    {
      // The model core (04 section 6): thinking -> streaming on the spoken beat, then an error.
      name: 'InferenceCore',
      frames: 144,
      words: words('InferenceCore', [6, 16], [46, 58], [96, 108]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {component: 'InferenceCore', props: {id: 'core', state: 'thinking', label: 'الموديل بيفكر', load: 0.7}, at: at('InferenceCore', 1)},
          {component: 'InferenceCore.setState', props: {target: 'core', state: 'streaming'}, at: at('InferenceCore', 2)},
          {component: 'InferenceCore.setState', props: {target: 'core', state: 'error'}, at: at('InferenceCore', 3)},
        ],
      },
    },
    {
      // Streams (04 section 6; Kafka / pipelines): three sources converge into one bundle at the reading end.
      name: 'DataRibbons',
      frames: 96,
      words: words('DataRibbons', [6, 18]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {
            component: 'DataRibbons',
            props: {id: 'streams', ribbons: [{label: 'الطلبات', color: 'signal'}, {label: 'المدفوعات', color: 'violet'}, {label: 'المرتجعات', color: 'ink2'}], flow: 'converge', seed: 11},
            at: at('DataRibbons', 1),
          },
        ],
      },
    },
    {
      // CH-29 / CH-31 (d:6.16:2): gradient descent diverges above a learning rate of about 0.35. The ball walks the bowl on the
      // first word, then the rate is pushed past the limit and the trail turns crit.
      name: 'LossLandscape',
      frames: 144,
      words: words('LossLandscape', [6, 30], [66, 78], [100, 118]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {component: 'LossLandscape', props: {id: 'loss', kind: 'convex', seed: 29, steps: 12, lr: {value: 0.35, ref: 'd:6.16:2', decimals: 2}}, at: at('LossLandscape', 1)},
          {component: 'LossLandscape.step', props: {target: 'loss', n: 10}, at: at('LossLandscape', 1)},
          {component: 'LossLandscape.overshoot', props: {target: 'loss'}, at: at('LossLandscape', 3)},
        ],
      },
    },
    {
      // CH-32 (d:6.17:1): the feed-forward block d_model 8 -> d_ff 16 -> 8. forward on the first beat, gradients back on the second.
      name: 'NeuralNet3D',
      frames: 144,
      words: words('NeuralNet3D', [6, 16], [48, 60], [92, 104], [120, 132]),
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.2},
        layers: [
          {component: 'NeuralNet3D', props: {id: 'net', layers: [8, 16, 8], labels: ['المدخلات', 'الطبقة المخفية', 'المخرجات']}, at: at('NeuralNet3D', 1)},
          {component: 'NeuralNet3D.forward', props: {target: 'net'}, at: at('NeuralNet3D', 2)},
          {component: 'NeuralNet3D.backprop', props: {target: 'net'}, at: at('NeuralNet3D', 3)},
          {component: 'NeuralNet3D.highlightLayer', props: {target: 'net', index: 1}, at: at('NeuralNet3D', 4)},
        ],
      },
    },
  ],
};
export default demos;
