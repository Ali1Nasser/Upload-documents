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
  ],
};
export default demos;
