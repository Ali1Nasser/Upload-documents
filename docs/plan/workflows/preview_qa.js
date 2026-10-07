// DRAFT dynamic workflow for phase P9 (preview render -> independent critique -> fix), CPU work goes through the queue.
// Adapt with /workflow-authoring, then save to .claude/workflows/preview_qa.js
// Usage: /preview-qa with args { chapters: ['CH-33', 'DD-P23'], tier: 'preview' }
export const meta = {
  name: 'preview-qa',
  description: 'Render previews through the job queue, score them with an independent critic and sync verifier, fix and repeat',
  phases: ['Render', 'Assess', 'Fix loop', 'Report'],
}

const MAX_ROUNDS = (args && args.max_rounds) || 3
const tier = (args && args.tier) || 'preview'

const renderSchema = {
  type: 'object',
  required: ['chapter', 'ok', 'video_path', 'contact_sheet', 'strip'],
  properties: {
    chapter: { type: 'string' },
    ok: { type: 'boolean' },
    video_path: { type: 'string' },
    contact_sheet: { type: 'string' },
    strip: { type: 'string' },
    error: { type: 'string' },
  },
}

const assessSchema = {
  type: 'object',
  required: ['chapter', 'verdict', 'rubric_mean', 'rubric_min', 'sync_p95_ms', 'max_static_s', 'issues'],
  properties: {
    chapter: { type: 'string' },
    verdict: { enum: ['pass', 'fail'] },
    rubric_mean: { type: 'number' },
    rubric_min: { type: 'number' },
    sync_p95_ms: { type: 'number' },
    max_static_s: { type: 'number' },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

const render = (chapters, round) =>
  pipeline(chapters, (ch) =>
    agent(
      `Act as render-ops (.claude/agents/render-ops.md). Enqueue and wait: "python3 tools/dc.py render ${tier} ${ch} --wait". ` +
        `Then "python3 tools/dc.py render contact-sheet ${ch}" and "python3 tools/dc.py render strip ${ch}". ` +
        `Never run renders outside the queue. Round ${round}.`,
      { schema: renderSchema, label: `render-${ch}-r${round}` },
    ),
  )

const assess = (renders, round) =>
  pipeline(renders.filter((r) => r && r.ok), (r) =>
    agent(
      `Act as critic (.claude/agents/critic.md) and sync-verifier (.claude/agents/sync-verifier.md) for ${r.chapter}. ` +
        `Run "python3 tools/dc.py qa chapter ${r.chapter} --tier ${tier}" for metrics (sync, static, density, legibility, arabic). ` +
        `View ${r.contact_sheet} and ${r.strip}; score the visual rubric in docs/plan/06_QA_GATES_AND_DELIVERY.md. ` +
        `Write reports/qa/${tier}/${r.chapter}.r${round}.json.`,
      { schema: assessSchema, label: `assess-${r.chapter}-r${round}` },
    ),
  )

phase('Render')
let renders = await render(args.chapters, 0)

phase('Assess')
let results = (await assess(renders, 0)).filter(Boolean)
const renderFailures = renders.filter((r) => r && !r.ok).map((r) => r.chapter)
let failing = results.filter((r) => r.verdict !== 'pass')

phase('Fix loop')
let round = 0
let stalls = 0
let lastCount = failing.length
while (failing.length > 0 && round < MAX_ROUNDS && stalls < 2) {
  round += 1
  log(`Round ${round}: fixing ${failing.length} chapter(s)`)
  await pipeline(failing, (f) =>
    agent(
      `Act as scene-director, or as motion-engineer when the issue is in a component. Fix ${f.chapter} for: ` +
        `${JSON.stringify(f.issues)}. Edit specs (corpus/specs/) or components (studio/src/components/) only; ` +
        `re-run lint and component snapshot tests.`,
      { label: `fix-${f.chapter}-r${round}` },
    ),
  )
  renders = await render(failing.map((f) => f.chapter), round)
  failing = (await assess(renders, round)).filter(Boolean).filter((r) => r.verdict !== 'pass')
  stalls = failing.length >= lastCount ? stalls + 1 : 0
  lastCount = failing.length
}

phase('Report')
return {
  passed: args.chapters.length - failing.length - renderFailures.length,
  failing: failing.map((f) => f.chapter),
  render_failures: renderFailures,
  rounds: round,
  escalate: failing.length > 0 || renderFailures.length > 0,
}
