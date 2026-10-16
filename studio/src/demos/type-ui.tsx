// Demos of the "Type & UI" family (rendered as Demo-<Name>; `dc render snap|perf <Name>`). Synthetic word ids
// (w:DEMO:<Name>:nnnnnn, 24-fps frames); copy and numbers are real (canon / data contract), never invented.
import type {DemoModule} from '../spec/types';

const W = (name: string, n: number) => `w:DEMO:${name}:${String(n).padStart(6, '0')}`;

const demos: DemoModule = {
  family: 'Type & UI',
  demos: [
    {
      name: 'KineticWord',
      frames: 72,
      words: [
        [W('KineticWord', 1), 10, 30],
        [W('KineticWord', 2), 30, 44],
        [W('KineticWord', 3), 46, 62],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.4},
        layers: [
          // ADR-010 display join gap (mixed case 0.25 em) on a tatweel compound, RTL wipe
          {component: 'KineticWord', props: {id: 'kw1', text: 'الـpartition', slot: 'upper-third', size: 'kinetic'}, at: {word: W('KineticWord', 1), lead_frames: 2}},
          // ALL-CAPS Latin with I: cv08 serifed I, LTR wipe, impact preset (CA allowed on Latin only)
          {component: 'KineticWord', props: {id: 'kw2', text: 'KPI', slot: 'center', size: 'impact', preset: 'impact', color: 'signal', emphasis: 'term'}, at: {word: W('KineticWord', 2), lead_frames: 2}},
          // Arabic with tashkeel (line-height 1.6, rule T1), label preset
          {component: 'KineticWord', props: {id: 'kw3', text: 'ثوانٍ', slot: 'lower-third', size: 'sub', preset: 'label', color: 'ink2'}, at: {word: W('KineticWord', 3), lead_frames: 2}},
        ],
      },
    },
    {
      name: 'NumberCounter',
      frames: 72,
      words: [
        [W('NumberCounter', 1), 8, 30],
        [W('NumberCounter', 2), 38, 58],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {component: 'NumberCounter', props: {id: 'rate', to: {value: 66.67, ref: 'd:5.2:7', unit: '%', decimals: 2}, format: 'percent', label: 'نسبة النجاح', slot: 'start'}, at: {word: W('NumberCounter', 1), lead_frames: 0}},
          {component: 'NumberCounter', props: {id: 'total', to: {value: 400, ref: 'd:5.2:8', unit: 'EGP', decimals: 0}, format: 'currency', label: 'الإجمالي', slot: 'end'}, at: {word: W('NumberCounter', 2), lead_frames: 0}},
        ],
      },
    },
    {
      // CH-10 narration (constraints = business rules turned into walls); 5 whole words on 2 lines, each on its own word
      name: 'KineticPhrase',
      frames: 84,
      words: [
        [W('KineticPhrase', 1), 8, 24],
        [W('KineticPhrase', 2), 26, 34],
        [W('KineticPhrase', 3), 34, 42],
        [W('KineticPhrase', 4), 46, 56],
        [W('KineticPhrase', 5), 56, 66],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'KineticPhrase',
            props: {
              id: 'walls',
              slot: 'center',
              lines: 2,
              size: 'kinetic',
              words: [
                {text: 'الـconstraints', at: {word: W('KineticPhrase', 1), lead_frames: 2}, emphasis: 'term'},
                {text: 'قواعد', at: {word: W('KineticPhrase', 2), lead_frames: 2}},
                {text: 'الشغل', at: {word: W('KineticPhrase', 3), lead_frames: 2}},
                {text: 'متحوّلة', at: {word: W('KineticPhrase', 4), lead_frames: 2}, emphasis: 'stressed'},
                {text: 'لحيطان', at: {word: W('KineticPhrase', 5), lead_frames: 2}, color: 'signal'},
              ],
            },
            at: {word: W('KineticPhrase', 1), lead_frames: 2},
          },
        ],
      },
    },
    {
      // glossary first-mention glosses (corpus/canon/glossary.json): term, acronym, plus a code chip (GROUP BY department, canon
      // SQL) and a metric chip (p95, canon incident copy); no numbers are invented
      name: 'TermChip',
      frames: 84,
      words: [
        [W('TermChip', 1), 8, 18],
        [W('TermChip', 2), 18, 28],
        [W('TermChip', 3), 28, 38],
        [W('TermChip', 4), 38, 48],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {component: 'TermChip', props: {id: 'idem', term: 'idempotency', gloss_ar: 'إن تكرار نفس الطلب ما يعملش أثر زيادة', kind: 'term', slot: 'start'}, at: {word: W('TermChip', 1), lead_frames: 2}},
          {component: 'TermChip', props: {id: 'slo', term: 'SLO', gloss_ar: 'الهدف المتفق عليه لمستوى الخدمة', kind: 'acronym', color: 'ok', slot: 'end'}, at: {word: W('TermChip', 2), lead_frames: 2}},
          {component: 'TermChip', props: {id: 'sql', term: 'GROUP BY department', gloss_ar: 'تجميع الصفوف حسب القسم', kind: 'code', color: 'signal', slot: 'lower-third'}, at: {word: W('TermChip', 3), lead_frames: 2}},
          {component: 'TermChip', props: {id: 'p95', term: 'p95', gloss_ar: 'زمن الاستجابة للطلبات البطيئة', kind: 'metric', color: 'warn', slot: 'upper-third'}, at: {word: W('TermChip', 4), lead_frames: 2}},
        ],
      },
    },
    {
      // NilePay success rate (data contract d:5.2:7: 4 / 6 = 66.67 %); each operand on its spoken word, the result on the last
      name: 'EquationLine',
      frames: 80,
      words: [
        [W('EquationLine', 1), 8, 18],
        [W('EquationLine', 2), 24, 34],
        [W('EquationLine', 3), 42, 62],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'EquationLine',
            props: {
              id: 'rate',
              size: 'kinetic',
              terms: [
                {text: '4', kind: 'operand', ref: 'd:5.2:7', at: {word: W('EquationLine', 1), lead_frames: 2}},
                {text: '/', kind: 'operator'},
                {text: '6', kind: 'operand', ref: 'd:5.2:7', at: {word: W('EquationLine', 2), lead_frames: 2}},
                {text: '=', kind: 'operator'},
                {text: '66.67 %', kind: 'result', ref: 'd:5.2:7', at: {word: W('EquationLine', 3), lead_frames: 0}},
              ],
            },
            at: {word: W('EquationLine', 1), lead_frames: 2},
          },
        ],
      },
    },
    {
      // glossary: grain (shadda in بيمثّل -> tashkeel line metrics and title -> subtitle clearance)
      name: 'LowerThird',
      frames: 72,
      words: [[W('LowerThird', 1), 8, 30]],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [{component: 'LowerThird', props: {id: 'grain', title: 'الـgrain', subtitle: 'الصف الواحد بيمثّل إيه بالظبط', kind: 'term'}, at: {word: W('LowerThird', 1), lead_frames: 2}}],
      },
    },
    {
      // CH-10 as locked in the EDL (corpus/edl/master_edl.v1.json chapters[]: title_ar, title_en, act)
      name: 'ChapterCard',
      frames: 72,
      words: [[W('ChapterCard', 1), 8, 40]],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'ChapterCard',
            props: {id: 'card', chapter: 'CH-10', index: 10, title_ar: 'ليه Database؟ — الـRelational Model', title_en: 'Why a database — the relational model', act: 'SQL'},
            at: {word: W('ChapterCard', 1), lead_frames: 3},
          },
        ],
      },
    },
    {
      // DD-P23 as locked in the EDL (parent CH-33; title_en shortened to the 48-char schema cap); prerequisites are the concepts the
      // DD-P23 pack lists as needed (corpus/packs/DD-P23.json prereqs.table: embedding, chunk, knn), graph ids from corpus/graph/concepts.jsonl
      name: 'DeepDiveCard',
      frames: 84,
      words: [[W('DeepDiveCard', 1), 8, 40]],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'DeepDiveCard',
            props: {
              id: 'dd',
              chapter: 'DD-P23',
              parent: 'CH-33',
              title_ar: 'Embeddings والـRAG والـAgents: المعنى كموضع',
              title_en: 'Embeddings, RAG and agents: meaning as position',
              prerequisites: ['c:embedding', 'c:chunk', 'c:knn'],
            },
            at: {word: W('DeepDiveCard', 1), lead_frames: 3},
          },
        ],
      },
    },
    {
      // CH-11 narration: the grain question and its three candidate answers; the reveal lands on the answer word
      name: 'PredictionTimer',
      frames: 120,
      words: [
        [W('PredictionTimer', 1), 8, 30],
        [W('PredictionTimer', 2), 96, 108],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'static'},
        layers: [
          {
            component: 'PredictionTimer',
            props: {id: 'grainq', question_ar: 'قبل ما تكتب سطر واحد، جاوب: صف واحد لكل إيه؟', reveal: {word: W('PredictionTimer', 2), lead_frames: 2}, options: ['لكل order', 'لكل customer', 'لكل customer في اليوم'], slot: 'full'},
            at: {word: W('PredictionTimer', 1), lead_frames: 2},
          },
        ],
      },
    },
    {
      // callouts on the parts of the success-rate equation (d:5.2:7): the successful receipts and the rate
      name: 'CalloutArrow',
      frames: 84,
      words: [
        [W('CalloutArrow', 1), 6, 16],
        [W('CalloutArrow', 2), 30, 44],
        [W('CalloutArrow', 3), 52, 66],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'EquationLine',
            props: {
              id: 'rate',
              size: 'kinetic',
              terms: [
                {text: '4', kind: 'operand', ref: 'd:5.2:7'},
                {text: '/', kind: 'operator'},
                {text: '6', kind: 'operand', ref: 'd:5.2:7'},
                {text: '=', kind: 'operator'},
                {text: '66.67 %', kind: 'result', ref: 'd:5.2:7'},
              ],
            },
            at: {word: W('CalloutArrow', 1), lead_frames: 2},
          },
          {component: 'CalloutArrow', props: {id: 'ok4', to: 'rate.t0', label: 'العمليات الناجحة', side: 'top', color: 'ok'}, at: {word: W('CalloutArrow', 2), lead_frames: 2}},
          {component: 'CalloutArrow', props: {id: 'pct', to: 'rate.t4', label: 'نسبة النجاح', side: 'bottom'}, at: {word: W('CalloutArrow', 3), lead_frames: 2}},
        ],
      },
    },
    {
      // NilePay receipts (d:5.2:1..6); the spotlight isolates the T3 FAILED status cell
      name: 'Spotlight',
      frames: 84,
      words: [
        [W('Spotlight', 1), 6, 20],
        [W('Spotlight', 2), 40, 56],
      ],
      shot: {
        fx_tier: 'standard',
        camera: {move: 'push_in', intensity: 0.3},
        layers: [
          {
            component: 'TableGrid',
            props: {
              id: 'receipts',
              ref: 'd:5.2:1',
              title: 'إيصالات NilePay',
              columns: [
                {key: 'id', label: 'الإيصال', kind: 'id'},
                {key: 'operator', label: 'المشغل', kind: 'text'},
                {key: 'amount_egp', label: 'EGP', kind: 'money'},
                {key: 'status', label: 'الحالة', kind: 'text'},
              ],
              rows: [
                {id: 'T1', operator: 'A', amount_egp: 120, status: 'OK'},
                {id: 'T2', operator: 'A', amount_egp: 80, status: 'OK'},
                {id: 'T3', operator: 'B', amount_egp: 200, status: 'FAILED'},
                {id: 'T4', operator: 'A', amount_egp: 50, status: 'OK'},
                {id: 'T5', operator: 'B', amount_egp: 150, status: 'OK'},
                {id: 'T6', operator: 'B', amount_egp: 100, status: 'FAILED'},
              ],
            },
            at: {word: W('Spotlight', 1), lead_frames: 2},
          },
          {component: 'Spotlight', props: {id: 'spot', to: 'receipts.r2c3', shape: 'rect', dim: 0.65}, at: {word: W('Spotlight', 2), lead_frames: 2}},
        ],
      },
    },
  ],
};
export default demos;
