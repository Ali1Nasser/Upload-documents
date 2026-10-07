// DRAFT dynamic workflow — adapt with /workflow-authoring, then save to .claude/workflows/council.js
// Usage: /council with args { adr: 'ADR-001', question: '...', options: ['A', 'B', 'C', 'D'], evidence: ['reports/graph/novelty.md', ...] }
export const meta = {
  name: 'council',
  description: 'Convene the DA Camp production Council on one decision and write an ADR',
  phases: ['Brief', 'Proposals', 'Cross-review', 'Synthesis'],
}

const LENSES = [
  'director',
  'educator',
  'motion-design',
  'technical-accuracy',
  'egyptian-arabic',
  'audio-sync',
  'producer',
]

const proposalSchema = {
  type: 'object',
  required: ['lens', 'choice', 'scores', 'rationale', 'risks', 'confidence'],
  properties: {
    lens: { type: 'string' },
    choice: { type: 'string' },
    scores: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: 'number' } } },
    rationale: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
    experiment_if_unsure: { type: 'string' },
    confidence: { type: 'number' },
  },
}

const reviewSchema = {
  type: 'object',
  required: ['ranking', 'objection'],
  properties: {
    ranking: { type: 'array', items: { type: 'string' } },
    objection: { type: 'string' },
  },
}

const decisionSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { enum: ['decided', 'needs_experiment'] },
    choice: { type: 'string' },
    experiment: { type: 'string' },
    adr_path: { type: 'string' },
  },
}

phase('Brief')
const brief = await agent(
  `Act as council-chair (.claude/agents/council-chair.md). Build the decision brief for ${args.adr}. ` +
    `Question: ${args.question}. Options: ${JSON.stringify(args.options)}. ` +
    `Read only these evidence files and what they cite: ${JSON.stringify(args.evidence)}. ` +
    `Write docs/decisions/${args.adr}.brief.md: neutral, numeric, <= 1500 words, with weighted criteria. Return its path.`,
  { schema: { type: 'object', required: ['brief_path'], properties: { brief_path: { type: 'string' } } }, label: 'brief' },
)

phase('Proposals')
const proposals = await parallel(
  LENSES.map((lens) => () =>
    agent(
      `Act as council-member (.claude/agents/council-member.md) with lens "${lens}". ` +
        `Read ${brief.brief_path} and the files it cites; do not read other members' output. ` +
        `Score every option 1-10 on every criterion from your lens, choose one, list risks, give confidence 0-1, ` +
        `and name the smallest experiment that would change your mind.`,
      { schema: proposalSchema, label: lens },
    ),
  ),
)

phase('Cross-review')
const anonymized = proposals.filter(Boolean).map((p, i) => ({
  id: `M${i + 1}`,
  choice: p.choice,
  scores: p.scores,
  rationale: p.rationale,
  risks: p.risks,
  confidence: p.confidence,
}))
const reviews = await parallel(
  LENSES.map((lens) => () =>
    agent(
      `Act as council-member with lens "${lens}". Anonymized proposals: ${JSON.stringify(anonymized)}. ` +
        `Rank them best to worst from your lens (ids only) and state the strongest objection to the leading choice.`,
      { schema: reviewSchema, label: `review-${lens}` },
    ),
  ),
)

phase('Synthesis')
const decision = await agent(
  `Act as council-chair. Brief: ${brief.brief_path}. Proposals: ${JSON.stringify(proposals)}. ` +
    `Reviews: ${JSON.stringify(reviews)}. Compute weighted scores per the brief. ` +
    `If the top two options are within 5% or mean confidence < 0.6, do NOT decide: return status needs_experiment ` +
    `with the smallest separating experiment. Otherwise write docs/decisions/${args.adr}.md (context, options, decision, ` +
    `scores table, dissent verbatim, reversal triggers, evidence links) and record it in harness/state/decisions.json.`,
  { schema: decisionSchema, label: 'chair' },
)

return decision
