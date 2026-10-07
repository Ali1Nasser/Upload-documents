# 02 · Agent system: ultracode, Council, subagents, loops, context, graph, harness

This file is the operating model for the multi-agent production. The agent definitions live in
[`.claude/agents/`](../../.claude/agents/). Workflow drafts live in [`workflows/`](workflows/).
References: Claude Code docs on [dynamic workflows](https://code.claude.com/docs/en/workflows) and
[subagents](https://code.claude.com/docs/en/sub-agents).

---

## 1 · Ultracode configuration

| Item | Setting | Why |
|---|---|---|
| Claude Code version | ≥ v2.1.203 (`claude --effort ultracode`); ≥ v2.1.248 for the `/workflow-authoring` skill; ≥ v2.1.271 for usage-limit pause/resume | Workflows are research preview; newer versions fix resume and replay |
| Turn on | `/effort ultracode` in the session (or `claude --effort ultracode`) | Claude plans a workflow for each substantive task |
| One workflow per phase | Each phase P0…P14 is launched as its own workflow; gates and Council sign-offs happen *between* workflows | Workflows accept **no mid-run user input** |
| Size guideline | `workflowSizeGuideline`: `medium` by default; `large` for P2, P8, P9 | Keeps fan-out proportional |
| Concurrency | `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS=12` (v2.1.269+) | The default shrinks on low-CPU containers. LLM agents are I/O-bound; CPU-bound work is throttled separately by the job queue (§9.4) |
| Subagent model default | `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` | Cheaper fan-out. Agents that need more set `model:` in their frontmatter |
| Prompt cache | `subagentPromptCacheTtl: "1h"` | Long fan-outs share cached prefixes |
| Usage limits | `autoContinueAtUsageLimit: true` | Runs pause and resume instead of failing |
| Structured output | `MAX_STRUCTURED_OUTPUT_RETRIES=5` (default) | Schema-validated agent returns |
| Saved workflows | After a phase workflow works, save it (`/workflows` → `s`) into `.claude/workflows/` | Re-runnable as `/<name>` with `args` |
| Permissions | Pre-allow the tools the agents need (see `harness/settings.hooks.json`) before long runs | Avoids prompts that stall a run |

P0 merges [`harness/settings.hooks.json`](harness/settings.hooks.json) into `.claude/settings.json`. That file holds these keys plus the hooks.
Run `/workflow-authoring` once before adapting the drafts in [`workflows/`](workflows/). The drafts use only the documented primitives:
`agent()`, `pipeline()`, `parallel()`, `phase()`, `log()` and `args`.

---

## 2 · Org chart

```
                         ┌───────────────────────────────┐
                         │  EXECUTIVE PRODUCER (main      │  owns plan, state machine, gates,
                         │  ultracode session)            │  writes one workflow per phase
                         └──────────────┬────────────────┘
          ┌──────────────────────┬──────┴────────────┬────────────────────────┐
   ┌──────▼──────┐        ┌──────▼──────┐     ┌──────▼──────┐          ┌──────▼──────┐
   │  COUNCIL    │        │ ENGINEERING │     │ PRODUCTION  │          │ VERIFICATION│
   │ chair + 7   │        │ loop        │     │ archivist   │          │ critic      │
   │ lenses      │        │ context     │     │ audio-forens│          │ fact-checker│
   │ (ADRs,      │        │ graph       │     │ transcr-align│         │ sync-verif. │
   │  gate       │        │ harness     │     │ story-editor│          │ (never grade│
   │  reviews)   │        │             │     │ vis-librarian│         │  own work)  │
   └─────────────┘        └─────────────┘     │ scene-director│        └─────────────┘
                                              │ motion-engineer│
                                              │ arabic-typogr.│
                                              │ sound-designer│
                                              │ render-ops    │
                                              │ delivery-pub. │
                                              │ genai-artist* │
                                              └───────────────┘
```

---

## 3 · Council protocol

**When it convenes:**
- ADR-001…008 (see the master plan §4).
- Gate reviews G5 (audio lock), G6a (look-dev), G8 (pilot) and G10a (final cut).
- Any waiver of a numeric gate.
- Any disagreement between two specialist agents that the Executive Producer cannot settle with data.

**Members (lenses).** One `council-member` definition is invoked with a lens. The chair may vary the model per member for diversity
(for example 3 × `opus` + 4 × `sonnet`).

| Lens | Asks | Owns these criteria |
|---|---|---|
| Director | Would a viewer stay engaged for 3 hours? Is the arc clear? | pacing, arc, transitions, voice switches |
| Educator | Is it learnable? Are prerequisites respected, failure-first, low cognitive load? | clarity, order, scene-contract adherence |
| Motion Design | Is it at AI Unpacked level? Consistent? Rhythmic? | look, camera, typography motion, density |
| Technical Accuracy | Is every claim, number and diagram correct? | correctness, data contract |
| Egyptian Arabic | Is the dialect natural, on-screen copy short and idiomatic, BiDi correct? | language, typography, culture |
| Audio & Sync | Voice quality, edit points, mix, sync tolerance | audio, sync |
| Producer | Can we finish within compute, disk, tokens and the deadline? | cost, risk, schedule |

**Rounds** (workflow draft: [`workflows/council.js`](workflows/council.js)):

1. **Brief.** The chair writes a neutral, number-heavy brief: question, options, criteria with weights, and evidence paths.
2. **Independent proposals.** Members run in parallel and don't see each other. Each returns JSON: choice, a 1–10 score per option per criterion, risks, confidence, and the "experiment I'd run if unsure".
3. **Anonymous cross-review.** Each member ranks the anonymized proposals and names the strongest objection to the leader.
4. **Synthesis.** The chair computes weighted scores. If the top two are within 5 % or the mean confidence is below 0.6, there is **no decision yet**: the chair specifies the smallest experiment that would separate them (for example, render two 10-second tests). Otherwise the chair writes the ADR.
5. **ADR file** `docs/decisions/ADR-0NN-<slug>.md`, containing:
   - context
   - options
   - decision
   - scores table
   - dissent (verbatim)
   - reversal triggers (what new evidence would reopen it)
   - links to the evidence

Rules:
- The Council never edits production files. It decides; the owners execute.
- An ADR can be reopened only through its reversal triggers.
- Waivers name what is being traded and why.

---

## 4 · Subagent roster

All definitions are in `.claude/agents/<name>.md`. Every agent:
- reads `CLAUDE.md` plus only the plan sections its file lists;
- writes outputs to the declared paths;
- returns a summary of at most 200 words with paths, never file dumps;
- logs learnings in its project memory (`memory: project` where enabled).

| Agent | Mission | Key outputs | Model / effort |
|---|---|---|---|
| `council-chair` | Run the Council protocol; write ADRs; gate reviews | `docs/decisions/*` | opus / xhigh |
| `council-member` | One lens per invocation; independent proposal + review | JSON returns | sonnet (chair may override) / high |
| `loop-engineer` | Design and run iterative loops: caps, stop rules, cadence, escalation; keep long renders alive | `harness/loops/*.yaml`, loop logs | sonnet / high |
| `context-engineer` | Build context packs, retrieval index, corpus maps, handoffs; enforce token budgets | `corpus/packs/*`, `corpus/maps/*`, `tools/corpus_search.py` | sonnet / high |
| `graph-engineer` | Knowledge graph (concepts, idea units, links) + production DAG + coverage/redundancy queries | `corpus/graph/*`, `harness/pipeline.graph.yaml`, `reports/graph/*` | opus / high |
| `harness-engineer` | Repo scaffold, setup script, schemas, `dc` CLI, hooks, gates, queue, state | `harness/*`, `tools/*` | sonnet / high |
| `archivist` | Download, verify, safely extract, dedupe, quarantine, catalog, media integrity | `corpus/catalog/*` | sonnet / medium |
| `audio-forensics` | Audio QA, music-bed detection and separation, speaker check, loudness/EQ profiles | `corpus/audio/*`, stems in `data/derived/audio/` | sonnet / high |
| `transcription-aligner` | ASR calibration, transcription, forced alignment, transcript polishing, sentences, emphasis | `corpus/transcripts/*`, `corpus/sentences/*` | sonnet / high |
| `story-editor` | Build candidate EDLs, radio edit, chapters/acts, Deep-Dive framing; lock audio | `corpus/edl/*`, `data/derived/audio/master_vo.wav` | opus / high |
| `visual-librarian` | Caption, OCR and tag every legacy visual; harvest HTML/PY/Mermaid visual ideas | `corpus/visual/*` | haiku / low (bulk) |
| `scene-director` | Sentence → beats → scene specs bound to word IDs (the semantic storyboard) | `corpus/specs/*.json` | opus / high |
| `motion-engineer` | Remotion/R3F component library, scene compiler, pre-rendered loops | `studio/**`, `data/derived/plates/*` | opus / high |
| `arabic-typographer` | On-screen Egyptian copy, kinetic-type presets, BiDi/shaping tests, font QA | `studio/src/type/*`, `reports/type/*` | sonnet / high |
| `fact-checker` | Verify claims and numbers against the data contract and sources | `reports/facts/*` | sonnet / high |
| `critic` | Independent rubric scoring of specs, previews and finals (vision on contact sheets) | `reports/qa/*` | sonnet (opus for G6a/G8/G10a) / high |
| `sync-verifier` | Measure word↔event offsets, A/V offsets, static stretches, density | `reports/sync/*` | sonnet / medium |
| `render-ops` | Job queue, chunked renders, retries, disk hygiene, checkpoints, benchmarks | `harness/state/queue.json`, `data/renders/*` | sonnet / medium |
| `sound-designer` | Music bed, SFX palette, event-driven SFX placement, ducking, loudness | `data/derived/audio/mix/*`, `corpus/sfx_cues/*` | sonnet / high |
| `delivery-publisher` | Encode ladder, VMAF tests, uploads to x0.at/temp.sh, checksum verification, delivery note | `delivery/*` | sonnet / medium |
| `genai-artist` (optional) | Text-free AI backplates/b-roll under ADR-006 limits; license log | `data/derived/genai/*` | sonnet / medium |

---

## 5 · Workflow patterns used

Each phase workflow follows one of these shapes, all documented as workflow idioms:

1. **Fan-out + adversarial verify.** One author agent per item (chapter, file, slide batch), then an independent verifier per item. Only verified results are merged.
2. **Keep fixing until the check passes.** Run the checker, fix what failed, and repeat until it passes or **two rounds in a row make no progress**. Then escalate.
3. **Find until the list stops growing.** Used for coverage: query the graph for gaps, generate tasks, close them, and stop when two rounds find nothing new.
4. **Multi-angle drafting.** Used for creative decisions (metaphors for hard concepts, style frames): N drafts from different angles, then a judge or the Council picks.

Drafts:
- [`workflows/council.js`](workflows/council.js): the Council protocol.
- [`workflows/storyboard.js`](workflows/storyboard.js): P8 per-chapter scene specs with lint, critic and fix loops.
- [`workflows/preview_qa.js`](workflows/preview_qa.js): P9 preview render → critic → fix loop with escalation.

The drafts are shapes. Adapt them with `/workflow-authoring`, then save them to `.claude/workflows/` so they run as `/council`, `/storyboard` and `/preview-qa`.

---

## 6 · Loop engineering

The loop-engineer owns `harness/loops/*.yaml`: one file per loop with `trigger`, `steps`, `metric`, `pass_condition`, `max_iterations`, `no_progress_rule`, `escalation` and `cadence`.

| Loop | Trigger | Body | Pass condition | Cap / no-progress | Escalation |
|---|---|---|---|---|---|
| L1 Ingest-reconcile | P1 | download → verify SHA-256 → extract → catalog → compare with `docs/plan/inventory/` | 0 missing, 0 unexplained extras, all media probed | 3 | Ask user to re-upload the missing archive |
| L2 Align-QA | per audio file | ASR/align → confidence + cross-method agreement + script WER | median word conf ≥ 0.80 and ≥ 95 % words agree within 120 ms (scripted audio) | 3 variants (model, VAD params, chunking) | Council (Audio & Sync) |
| L3 Spec-lint-fix | per chapter | author spec → schema + lint (coverage, density, data contract, terms on screen) | lint clean | 3 / 2 rounds no progress | story-editor + scene-director pair |
| L4 Preview-critic-fix | per chapter | preview render → contact sheet + motion strip → critic rubric → fix specs/components | rubric ≥ 8.0, no criterion < 6 | 3 / 2 no progress | Council (Motion + Educator) |
| L5 Global coverage | after P8 and P9 | graph query: idea units/terms/numbers without events → tasks → fix | 0 gaps (or ADR waiver) | until two rounds find nothing new | Council |
| L6 Render-farm tick | during P9/P12 | every 10–20 min: queue status, restart failed jobs (max 2 retries each), disk check, commit manifests | queue empty, all chunks QA-passed | n/a (time-boxed) | render-ops → Executive Producer |
| L7 Final QC | P13 | full decode, A/V equality, loudness, sync sample, frame critic sampling | G10a thresholds | 3 | Council |
| L8 Delivery verify | P14 | upload → re-download → SHA-256 compare | all match | 4 retries with backoff (2/4/8/16 s) | Report the failure with the host's error |

**Cadence tools in Claude Code:**
- Background `Bash` with `run_in_background` for long jobs.
- `Monitor` with an until-loop to wait for a condition.
- `/loop` (self-paced, using `ScheduleWakeup`) for the render-farm tick.
- Saved workflows for re-runs.

Never poll with `sleep`. While renders run for hours, the L6 tick keeps the session alive and checkpointed.

**Anti-drift rules:**
- Each iteration re-reads its goal and thresholds from the loop YAML (on disk), not from conversation memory.
- Each iteration appends a line to `logs/loops/<loop>.jsonl` with the metric value, so "no progress" is computed, not felt.
- Authors never verify their own output. The verifier is always a different agent invocation with a different role file.

**Optional "Ralph" batch mode.** For an unattended overnight grind (for example re-rendering failed chunks), a headless loop is acceptable:
`while ! python3 tools/dc.py gate check G9b --quiet; do claude -p "$(cat harness/loops/L6_prompt.md)" --max-turns 40; done`.
Workflows don't auto-trigger from `-p`, so this mode is for mechanical steps only.

---

## 7 · Context engineering

The corpus is far bigger than any context window (42 MB knowledge base, 1.8 MB masters, ~8 h of transcripts, thousands of specs).
Every agent therefore works from **small, curated, file-backed context**.

**Context tiers**

| Tier | What | Size budget | Who maintains |
|---|---|---|---|
| L0 | `CLAUDE.md`: rules, layout, commands, phase pointer | ≤ 150 lines | harness-engineer |
| L1 | `docs/plan/*`: this plan, read selectively by section | per file ≤ 600 lines | (frozen; changed only by ADR) |
| L2 | `docs/handoffs/PHASE-NN.md`: what was done, where outputs are, open issues, next actions | ≤ 1 page each | phase owner |
| L3 | `corpus/packs/<unit>.md`: per-task briefing packs | 30–60k tokens | context-engineer |
| L4 | Retrieval: `python3 tools/dc.py corpus search "<query>" --k 8 --lang ar,en` (hybrid BM25 + bge-m3 dense, with citations) | on demand | context-engineer |
| L5 | Agent project memory: `.claude/agent-memory/<agent>/MEMORY.md` (first 200 lines are auto-loaded) | ≤ 200 lines | each agent |

**Pack recipe for a storyboard pack** (`corpus/packs/CH-xx.md`):
1. The EDL slice: sentence table with `sent_id`, `word_id` ranges, text (AR), English gloss, start/end frames, emphasis words, numbers, terms.
2. Concept cards for the concepts in those sentences: definition AR/EN, prerequisites, common failure.
3. Visual candidates per idea unit: the top 5 legacy assets with captions, plus thumbnail paths for vision.
4. Data-contract facts that apply.
5. Visual Bible excerpts: only the component catalog rows and metaphor rows for these concepts.
6. Continuity: previous/next chapter summary, the A-01 world-map state, recurring motifs in play.
7. Constraints: density targets, fps, safe areas, banned patterns.

**Rules:**
- Never load the 42 MB `DA_Camp_KNOWLEDGE.md`, whole masters or whole transcripts into a prompt. Use search or packs.
- Bulk mechanical agents (`visual-librarian`) run with `omitClaudeMd: true` and a tight system prompt.
- Agents return at most 200 words plus paths. Large results go to files. The orchestrator's context holds decisions, not data.
- Before compaction, a `PreCompact` hook runs `tools/dc.py state snapshot`. After compaction or a restart, the `SessionStart` hook prints `tools/dc.py state brief` (phase, gate status, blockers, next actions).
- IDs are greppable and stable (see `05_DATA_CONTRACTS.md`), so any agent can find a sentence, shot or asset by ID.
- Glossary and dialect rules (`master.md` §10) are injected into every pack that produces on-screen text.

**Corpus maps** (`corpus/maps/`). A hierarchy of short summaries (corpus → source family → document → section), each ≤ 300 words with paths.
This is the table of contents agents read before searching.

---

## 8 · Graph engineering

### 8.1 Knowledge graph (content)

**Node types:**
- `Source` (archive/family)
- `Document`, `Section`
- `AudioAsset`, `Sentence` (words live in tables, not as nodes)
- `IdeaUnit` (a claim or explanation, deduplicated across sources)
- `Concept` (glossary term or topic, with AR/EN aliases)
- `Entity` (NilePay, ShopFlow, T1…T6 receipts, operators A/B)
- `DataFact` (a number from §6 or a source sentence)
- `VisualAsset` (slide, legacy shot spec, HTML lab/section, Mermaid diagram, Python pattern, prior-render keyframe)
- `Pattern` (P01–P22)
- `Component` (new library)
- `Shot`, `Chapter`, `Act`

**Edge types:**

| Edge | Meaning |
|---|---|
| `contains` | Document → Section, Chapter → Shot |
| `version_of` | Document ↔ Document, with a diff summary |
| `says` | Sentence → IdeaUnit |
| `about` | IdeaUnit → Concept |
| `requires` | Concept → Concept (prerequisite) |
| `illustrates` | VisualAsset → Concept/IdeaUnit, with score |
| `states` | Sentence → DataFact |
| `contradicts` | DataFact ↔ DataFact |
| `uses` | Shot → Component |
| `anchored_to` | Shot → Sentence/word range |
| `duplicates` | Sentence ↔ Sentence, with similarity and adjudication |
| `callback_to` | Shot → Shot |

**Storage:** `corpus/graph/nodes.jsonl` and `edges.jsonl` (git). Loaded into NetworkX for analysis and SQLite for ad-hoc queries.
Dense vectors go in `data/derived/vectors/*.npy` + FAISS (regenerable).

**Standard queries** (`tools/dc.py graph q <name>`):

| Query | Returns |
|---|---|
| `coverage` | idea units / concepts / terms / numbers with no EDL sentence, or no shot event |
| `redundancy` | idea-unit groups with more than one EDL sentence (kept only if they are intentional callbacks) |
| `novelty S4 vs S1` | per NotebookLM part: share of idea units not present in the trunk; this is the ADR-001 evidence |
| `order` | prerequisite violations in the EDL order (topological check) |
| `contradictions` | conflicting DataFacts across versions/sources |
| `visual candidates <idea_unit>` | ranked legacy assets plus metaphor-library rows |
| `continuity <chapter>` | recurring entities/assets and their state at chapter start and end |

### 8.2 Production DAG (process)

`harness/pipeline.graph.yaml` declares every production step as a node with typed inputs and outputs, a content-hash cache key, an owner agent and a gate.
Conditional edges route on gate results:
- **pass** → next node;
- **fail** → the loop node;
- **waived** → next node, plus a link to the ADR.

`tools/dc.py dag status | next | run <node>` executes it incrementally. A node is skipped when the hashes of its inputs match the last successful run.
The graph engineer exports a Mermaid view to `reports/dag.md` after every phase. The semantics map 1:1 onto a LangGraph-style state graph if you ever want one, but no extra framework is required.

---

## 9 · Harness engineering

### 9.1 Repository layout (created in P0)

```
CLAUDE.md                       executor operating manual (exists)
.claude/agents/                 roster (exists)
.claude/workflows/              saved phase workflows (P0+)
.claude/settings.json           merged from docs/plan/harness/settings.hooks.json (P0)
docs/plan/                      this plan (read-only; amended only via ADR)
docs/decisions/                 ADRs
docs/handoffs/                  per-phase handoffs
docs/memory/lessons.md          append-only pitfalls
harness/setup.sh                idempotent environment bootstrap
harness/schemas/*.schema.json   data contracts (from 05)
harness/hooks/*.py              hook scripts
harness/gates/gNN.py            gate checkers → reports/gates/GNN.json
harness/loops/*.yaml            loop specs
harness/pipeline.graph.yaml     production DAG
harness/state/                  progress.json, decisions.json, budget.json, queue.json
tools/dc.py                     single CLI entry point (subcommands below)
studio/                         Remotion project (src/components, src/type, src/scenes, src/compositions, public/fonts)
manim/ blender/ sfx/            optional engines + sound tools
corpus/                         SMALL & versioned: catalog, canon, transcripts, sentences, graph, edl, specs, packs, maps, visual
reports/                        gates, qa, sync, facts, type, graph, contact sheets (small JPGs)
data/                           LARGE & git-ignored: raw, extracted, quarantine, derived, renders, delivery
logs/                           run and loop logs (jsonl)
```

### 9.2 `dc` CLI (all subcommands idempotent and content-addressed)

```
dc state brief|snapshot|set-phase|block|unblock
dc ingest fetch|verify|extract|dedupe|catalog|probe|lineage|cache-push|cache-pull
dc audio qa|separate|speakers|profile
dc asr calibrate|transcribe|align|polish|sentences|emphasis
dc corpus distill|search|maps
dc visual caption|ocr|keyframes|html-harvest|py-harvest
dc graph build|embed|cluster|link|q <query>|export
dc story candidates|score|edl|radio-edit|lock
dc spec pack|lint|metrics|compile
dc render bench|preview|final|status|retry|contact-sheet|strip
dc sound bed|sfx|place|mix|loudness
dc qa chapter|film|sync|static|density|legibility|arabic
dc deliver ladder|encode|upload|verify|note
dc gate check <G#> [--quiet]
dc dag status|next|run <node>
```

### 9.3 State machine

`harness/state/progress.json` holds:
- `phase` and per-gate `status` (`pending | running | pass | fail | waived`), plus a report path;
- counters (sentences, specs, shots, frames rendered);
- `blockers[]` and `next_actions[]`.

Only `dc gate check` can move a gate to `pass`. Only an ADR can move it to `waived`.
The Executive Producer advances phases only on `pass` or `waived`.

### 9.4 Compute queue (protects 4 vCPU / 15 GB)

- **task-spooler** (`tsp`) with `TS_SLOTS = nproc − 1` is the only way to run ASR, render, encode and analysis jobs heavier than about 30 s.
  Commands: `tsp -L <label> <cmd>` to enqueue; `tsp -w <id>` to wait.
- Memory guard: each render job declares `mem_gb`. render-ops refuses to start a job if free memory would drop below 2 GB.
- Disk guard: refuse to start a render if free disk is below `job.expected_gb + 3 GB`. Hygiene tasks run at gates (§7.2 of the master plan).
- LLM agents never run heavy compute inline. They enqueue and wait. That is how 12 concurrent agents coexist with 3 compute slots.

### 9.5 Hooks (installed in P0 from [`harness/settings.hooks.json`](harness/settings.hooks.json))

| Event | Matcher | Script | Behaviour |
|---|---|---|---|
| `SessionStart` | — | `dc state brief` | Injects phase, gates, blockers and next actions into context |
| `PreToolUse` | `Bash` | `harness/hooks/guard_bash.py` | Blocks (exit 2):<br>• reading/printing `data/quarantine/**` or `*id_ed25519*`<br>• `curl`/`wget` uploads to hosts other than `x0.at`/`temp.sh`<br>• `rm -rf` outside `data/`, `logs/`, `reports/`<br>• `git add` of media, models or `data/` |
| `PostToolUse` | `Write\|Edit` | `harness/hooks/validate_written.py` | Validates files under `corpus/**` against their JSON Schema; on failure, exit 2 sends the error back to the agent |
| `PreCompact` | — | `dc state snapshot --reason precompact` | Persists working state before compaction |

### 9.6 Git discipline

- Commit at every gate, with messages like `G3 pass: audio truth (S1/S2/S4 aligned)`.
- Never commit `data/`, media, models or secrets. `.gitignore` is created in P0.
- Small binary reports (contact-sheet JPGs ≤ 300 KB) are fine.
- Push to the working branch after each gate so a reset never loses more than one phase of decisions.

### 9.7 Reproducibility

- Pin versions: `uv.lock`, `package-lock.json`, and the model IDs and revisions in `harness/state/budget.json`.
- Seeds for every procedural component are recorded in the specs.
- `dc` writes `manifest.json` next to every output, with input hashes, tool versions and the command.

---

## 10 · Other modern practices built in

- **Spec-driven development.** Specs are data with schemas; components are code with tests. Agents write specs at scale and code rarely.
- **Prompt evals before fan-out.** A golden set of 25 sentences across topics. The scene-director prompt must average ≥ 8/10 from the critic on the golden set before the 1,000+ sentence fan-out.
- **Best-of-N for hard creative calls.** For the 30 hardest concepts, 3 metaphor drafts each; a judge or the Council picks.
- **Canary / pilot.** One full chapter at final quality (G8) before mass rendering.
- **Content-addressed caching.** Changing one chapter's spec re-renders only that chapter.
- **Self-healing renders.** Failed chunks retry with a fallback preset (lower effects tier). Every fallback is logged and needs critic re-approval.
- **Observability.** `reports/dashboard.md` is regenerated each tick with progress, budgets, gate states and queue.
- **Agent memory.** Key agents keep `.claude/agent-memory/<name>/MEMORY.md` (project scope, committed). Lessons survive container resets.
- **Isolation when needed.** Component authors work in disjoint folders (`studio/src/components/<Name>/`). `isolation: worktree` is available but costs a `node_modules` install per worktree, so use it only for risky refactors.
- **Two-key rule for irreversible actions.** Uploads, deletions of raw sources and history rewrites need a passing gate *and* an explicit line in `progress.json.next_actions` written by the Executive Producer.

## 11 · Anti-patterns (reject on sight)

- An agent writing *code* per shot instead of a *spec*.
- Timing in seconds inside specs instead of word IDs.
- One agent writing and approving its own output.
- Loading whole masters, transcripts or the knowledge base into a prompt.
- Running heavy compute outside the queue.
- "Fixing" gates by lowering thresholds without an ADR.
- Re-using legacy frames as final footage.
- Splitting Arabic words into per-letter animated spans (it breaks shaping).
