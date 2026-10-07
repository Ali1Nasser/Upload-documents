# DA Camp × NilePay — The Illustrated Film · production plan

This branch contains a **plan only**: an executable production plan for Claude Code (ultracode) to rebuild one long, professional,
Egyptian-Arabic illustrated film from the six DA Camp source archives, then upload it to x0.at and temp.sh.

Nothing has been rendered or uploaded yet. The only work done was a read-only inventory of the archives, which is recorded in `docs/plan/inventory/`.

## Start here
1. [`docs/plan/00_MASTER_PLAN.md`](docs/plan/00_MASTER_PLAN.md): what, why, how, decisions, phases, budgets, risks.
2. [`docs/plan/KICKOFF_PROMPT.md`](docs/plan/KICKOFF_PROMPT.md): what to paste into Claude Code after `/effort ultracode`.
3. [`CLAUDE.md`](CLAUDE.md): the executor's operating manual.

⚠ The source links on temp.sh expire on **2026-10-10 at about 08:00 UTC**. Start execution before then, or re-upload the archives.

## Contents
```
CLAUDE.md                         operating manual for the executing agent
.claude/agents/                   21 subagent role definitions (Council, engineers, specialists, verifiers)
docs/plan/00_MASTER_PLAN.md       mission, definition of done, ADR defaults, phase plan, budgets, risks
docs/plan/01_SOURCE_RECON.md      what the six archives contain (from the inventory)
docs/plan/02_AGENT_SYSTEM.md      ultracode config, Council protocol, loops, context, graph, harness
docs/plan/03_PIPELINE_RUNBOOK.md  phase-by-phase runbook P0–P15
docs/plan/04_VISUAL_BIBLE_V2.md   cinematic look, Arabic kinetic typography, metaphor library, components
docs/plan/05_DATA_CONTRACTS.md    schemas and IDs
docs/plan/06_QA_GATES_AND_DELIVERY.md  numeric gates, rubrics, encode ladder, upload + verification
docs/plan/workflows/              dynamic-workflow drafts (council, storyboard, preview-qa)
docs/plan/harness/                settings/permissions/hooks to install in P0
docs/plan/inventory/              archive hashes + URLs + expiry, full listing, unique files, media probe
```
