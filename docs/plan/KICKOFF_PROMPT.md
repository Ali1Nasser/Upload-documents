# Kickoff prompt for Claude Code (ultracode)

## Before you paste

1. Open Claude Code on this repository, on this plan branch (`claude/da-camp-video-plan-qpf3tv`) or a branch made from it.
2. Version: Claude Code ≥ v2.1.203. Workflows must be enabled in `/config` (on Pro plans, turn the Dynamic workflows row on).
3. Run `/effort ultracode`.
4. ⚠ The source links expire **2026-10-10 ≈ 08:00 UTC**. Start before then, or re-upload the six zips and update `docs/plan/inventory/archives.tsv`.
5. Optional, but it speeds things up: add API keys or a GPU machine (see `00_MASTER_PLAN.md` §7.4), and pre-approve hosts in the environment network policy:
   - pypi and npm;
   - huggingface.co and its CDN;
   - github.com;
   - dl.fbaipublicfiles.com;
   - temp.sh and x0.at.

---

## Paste this

```
You are the Executive Producer of "DA Camp × NilePay — The Illustrated Film" (Egyptian Arabic).
Execute the production plan in this repository end to end.

Read first, in order: CLAUDE.md → docs/plan/00_MASTER_PLAN.md → docs/plan/02_AGENT_SYSTEM.md →
docs/plan/03_PIPELINE_RUNBOOK.md. Read the other plan files only when a phase needs them.

Operating rules:
1. URGENT: start P0 step 1 (background download of the six temp.sh archives, URLs in
   docs/plan/inventory/archives.tsv) before anything else. They expire 2026-10-10 ~08:00 UTC.
2. Run each phase P0…P14 as its own workflow. Advance only when `python3 tools/dc.py gate check G#`
   passes, or a Council ADR waives it. Use the agent roster in .claude/agents/ and adapt the workflow
   drafts in docs/plan/workflows/ (run /workflow-authoring first; save working ones to .claude/workflows/).
3. Convene the Council (council-chair + 7 council-member lenses) for ADR-001…008 and gate reviews
   G5, G6a, G8, G10a. Record ADRs in docs/decisions/.
4. Audio is the master clock. Lock audio at G5. Every visual event is anchored to word IDs, never seconds.
5. Specs are data, components are code. Scene-directors write JSON specs; motion-engineers build the
   frozen component catalog once.
6. Independent verification: authors never grade their own work (critic, fact-checker, sync-verifier).
7. All CPU-heavy work (ASR, alignment, render, encode) goes through the tsp job queue
   (slots = nproc − 1). Keep long renders alive with a self-paced /loop tick. Never poll with sleep.
8. Persist everything important to files. Commit small artifacts at every gate and push.
   Never commit media, models, data/ or secrets.
9. Safety: never extract, read, print, index, cache or upload anything under .ssh / id_ed25519 /
   known_hosts. Upload only deliverables, only to x0.at and temp.sh. Before the optional
   derived-corpus cache upload in P1, ask me.
10. FYI checkpoints (post them, then keep working unless I object): ADR-001 + a 3-minute radio-edit
    sample after G5; the pilot chapter link after G8; final sizes and hosts before P14 uploads.
11. Done = all of 00_MASTER_PLAN.md §1 (D1–D11) measured as passing. Then send me the x0.at direct
    link(s) and the temp.sh link, with SHA-256, expiry dates, runtime and chapter list
    (template in 06_QA_GATES_AND_DELIVERY.md §5.6).

Start now with P0 step 1, then continue the P0 scaffold while the downloads run.
```

---

## Variants

**Sources expired, and you re-uploaded new links:**

```
The archives were re-uploaded. New URLs: <list>. Update docs/plan/inventory/archives.tsv URLs only
(keep the SHA-256 values), verify each download against them, then continue the plan from P1.
```

**Resume after a container reset or a new session:**

```
Resume the DA Camp film production. Run `python3 tools/dc.py state brief`, read the latest
docs/handoffs/PHASE-*.md, re-run harness/setup.sh if the environment is fresh, restore data/ with
`dc ingest fetch` or `dc ingest cache-pull`, re-check the current gate, and continue from the
recorded next_actions. Relaunch any interrupted workflow from its saved results where possible.
```

**Run a single phase:**

```
ultracode: run phase P<N> of docs/plan/03_PIPELINE_RUNBOOK.md as one workflow, using the owners
listed in docs/plan/00_MASTER_PLAN.md §5; finish with `python3 tools/dc.py gate check G<N>` and a
handoff note in docs/handoffs/PHASE-<N>.md.
```
