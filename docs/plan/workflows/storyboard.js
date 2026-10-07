// DRAFT dynamic workflow for phase P8 (semantic storyboard).
// Adapt with /workflow-authoring, then save to .claude/workflows/storyboard.js
// Usage: /storyboard with args { chapters: ['CH-33'] }  (omit chapters to do every stale chapter)
export const meta = {
  name: 'storyboard',
  description: 'Author, lint, independently critique and fix scene specs for every chapter of the locked EDL',
  phases: ['Plan', 'Author', 'Verify', 'Fix', 'Report'],
}

const MAX_ROUNDS = (args && args.max_rounds) || 3

const listSchema = {
  type: 'object',
  required: ['chapters'],
  properties: { chapters: { type: 'array', items: { type: 'string' } } },
}

const lintSchema = {
  type: 'object',
  required: ['chapter', 'lint_clean', 'shots', 'events_per_min', 'uncovered_sentences'],
  properties: {
    chapter: { type: 'string' },
    lint_clean: { type: 'boolean' },
    shots: { type: 'number' },
    events_per_min: { type: 'number' },
    uncovered_sentences: { type: 'number' },
  },
}

const verdictSchema = {
  type: 'object',
  required: ['chapter', 'verdict', 'score', 'issues'],
  properties: {
    chapter: { type: 'string' },
    verdict: { enum: ['pass', 'fail'] },
    score: { type: 'number' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['shot_id', 'severity', 'problem', 'fix_hint'],
        properties: {
          shot_id: { type: 'string' },
          severity: { enum: ['critical', 'major', 'minor'] },
          problem: { type: 'string' },
          fix_hint: { type: 'string' },
        },
      },
    },
  },
}

phase('Plan')
const restrict = args && args.chapters ? ` Restrict to ${JSON.stringify(args.chapters)}.` : ''
const plan = await agent(
  'Read corpus/edl/master_edl.json and harness/state/progress.json. Return chapter ids that have a pack in corpus/packs/ ' +
    'and whose spec in corpus/specs/ is missing or stale (spec.edl_version != edl.version).' + restrict,
  { schema: listSchema, label: 'plan' },
)

phase('Author')
await pipeline(plan.chapters, (ch) =>
  agent(
    `Act as scene-director (.claude/agents/scene-director.md). Use corpus/packs/${ch}.md and ` +
      `docs/plan/04_VISUAL_BIBLE_V2.md (component catalog + metaphor rows only). Write corpus/specs/${ch}.json ` +
      `valid against harness/schemas/scene_spec.schema.json. Anchor every event to word ids, never seconds. ` +
      `Run "python3 tools/dc.py spec lint ${ch}" and fix until clean. Return the lint summary.`,
    { schema: lintSchema, label: `author-${ch}` },
  ),
)

phase('Verify')
const critique = (chapters, round) =>
  pipeline(chapters, (ch) =>
    agent(
      `Act as critic (.claude/agents/critic.md); you did not author corpus/specs/${ch}.json. ` +
        `Run "python3 tools/dc.py spec metrics ${ch}", read the spec and corpus/packs/${ch}.md, score with the ` +
        `storyboard rubric in docs/plan/06_QA_GATES_AND_DELIVERY.md, and check every on-screen number against ` +
        `corpus/canon/data_contract.json (fact-checker duty). Round ${round}. Write reports/qa/specs/${ch}.r${round}.json.`,
      { schema: verdictSchema, label: `critic-${ch}-r${round}` },
    ),
  )

let verdicts = (await critique(plan.chapters, 0)).filter(Boolean)
let failing = verdicts.filter((v) => v.verdict !== 'pass')

phase('Fix')
let round = 0
let lastCount = failing.length
let stalls = 0
while (failing.length > 0 && round < MAX_ROUNDS && stalls < 2) {
  round += 1
  log(`Fix round ${round}: ${failing.length} chapter(s) failing`)
  await pipeline(failing, (v) =>
    agent(
      `Act as scene-director. Fix corpus/specs/${v.chapter}.json for these critic issues: ${JSON.stringify(v.issues)}. ` +
        `Re-run "python3 tools/dc.py spec lint ${v.chapter}" until clean.`,
      { schema: lintSchema, label: `fix-${v.chapter}-r${round}` },
    ),
  )
  failing = (await critique(failing.map((v) => v.chapter), round)).filter(Boolean).filter((v) => v.verdict !== 'pass')
  stalls = failing.length >= lastCount ? stalls + 1 : 0
  lastCount = failing.length
}

phase('Report')
const report = await agent(
  `Write reports/qa/specs/SUMMARY.md: chapters=${plan.chapters.length}, still failing=${JSON.stringify(
    failing.map((f) => f.chapter),
  )}, rounds=${round}. If any still fail, add them to harness/state/progress.json blockers for Council escalation. ` +
    'Return the path.',
  { schema: { type: 'object', required: ['path'], properties: { path: { type: 'string' } } }, label: 'report' },
)
return { report: report.path, failing: failing.map((f) => f.chapter), rounds: round }
