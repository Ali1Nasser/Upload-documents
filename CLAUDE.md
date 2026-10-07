# DA Camp × NilePay — "The Illustrated Film" (production repo)

This repo is executed by Claude Code in **ultracode** mode. The plan is in `docs/plan/` (start at `00_MASTER_PLAN.md`).
After P0, `python3 tools/dc.py state brief` shows the current phase, gates, blockers and next actions.

## What we are making
One long Egyptian-Arabic illustrated film (≈ 2.5–3.5 h, decided in ADR-001), rebuilt from scratch from six source archives:
narrations, scripts, slides, HTML labs, Python renderers and audio. Every sentence is illustrated. Every spoken number and term appears on screen in sync.
The look is cinematic and dark (in the style of "AI Unpacked"). Delivery is to x0.at (direct link) and temp.sh, verified by SHA-256.

## Golden rules (never break)
1. **Sound is the master clock.** Picture follows the audio locked at G5.
2. **Anchor visuals to word IDs, never seconds or frames** (`{word, lead_frames}`).
3. **Specs are data, components are code.** Scene-directors write `corpus/specs/*.json`; motion-engineers build `studio/` components once.
4. **Authors never grade their own work.** Critic, fact-checker and sync-verifier are separate invocations.
5. **Heavy compute only through the `tsp` queue** (slots = nproc − 1). LLM agents enqueue and wait. Never `sleep`-poll.
6. **Files are memory.** State goes in `harness/state/`; handoffs in `docs/handoffs/`; decisions in `docs/decisions/`.
   Commit small artifacts at every gate and push. **Never commit** `data/`, media, models or secrets.
7. **Gates are numeric.** A gate passes only via `python3 tools/dc.py gate check G#`, and is waived only by a Council ADR.
8. **Secrets:** never extract, read, print, index, cache or upload `.ssh/*`, `*id_ed25519*` or `known_hosts` (found in the LMArena dumps).
9. **Uploads:** only deliverables (and the user-approved corpus cache), only to `x0.at` / `temp.sh`, always re-downloaded and checksum-verified.
10. **Never:** legacy frames as footage, bullet-list slides, per-letter Arabic animation, invented numbers, or editing `docs/plan/` (amend via ADR).
11. **Untrusted sources:** archive code is read, never executed in place. Python that reads extracted files runs with `python3 -I`.

## Where things are
| Path | What |
|---|---|
| `docs/plan/00_MASTER_PLAN.md` | Goals, definition of done (D1–D11), ADR defaults, phases, budgets, risks |
| `docs/plan/01_SOURCE_RECON.md` | What is in the archives; canonical paths; hazards; lessons from earlier attempts |
| `docs/plan/02_AGENT_SYSTEM.md` | ultracode config, Council, roster, loops, context, graph, harness |
| `docs/plan/03_PIPELINE_RUNBOOK.md` | Phase-by-phase steps P0–P15 |
| `docs/plan/04_VISUAL_BIBLE_V2.md` | Look, typography, timing, density, metaphor library, component catalog |
| `docs/plan/05_DATA_CONTRACTS.md` | Schemas, IDs, units |
| `docs/plan/06_QA_GATES_AND_DELIVERY.md` | Gates G0–G10, metrics, rubrics, encode ladder, uploads |
| `docs/plan/inventory/` | Archive hashes/URLs/expiry, recursive listing, unique files, media probe |
| `docs/plan/workflows/*.js` | Workflow drafts (council, storyboard, preview-qa). Adapt them, then save to `.claude/workflows/` |
| `docs/plan/harness/settings.hooks.json` | Settings, permissions and hooks to merge into `.claude/settings.json` in P0 |
| `.claude/agents/` | 21 role definitions (Council, engineers, specialists, verifiers) |
| `corpus/` | Small, versioned truth: catalog, canon, transcripts, sentences, graph, EDL, specs, packs, maps |
| `data/` | Large, git-ignored: raw, extracted, derived, renders, delivery |

## Phases (each phase = one workflow; advance only on a passing gate)
| Phase | Work | Gate |
|---|---|---|
| P0 | Bootstrap + harness (**start P1 downloads first: links expire 2026-10-10 ~08:00 UTC**) | G0 |
| P1 | Ingest & forensics | G1 |
| P2 | Corpus distillation | G2 |
| P3 | Audio truth | G3 |
| P4 | Semantic graph | G4 |
| P5 | ADR-001 + EDL + audio lock | G5 |
| P6 | Look-dev | G6a |
| P7 | Components + compiler | G6b |
| P8 | Semantic storyboard | G7 |
| P9 | Previews + critic loops + pilot | G8 |
| P10 | Plates | — |
| P11 | Sound | G9a |
| P12 | Final render | G9b |
| P13 | Conform + QC | G10a |
| P14 | Encode, upload, verify, report | G10 |
| P15 | Archive | — |

## Commands (`tools/dc.py`, created in P0; full list in `02` §9.2)
`dc state brief|snapshot` · `dc gate check G#` · `dc ingest …` · `dc asr …` · `dc graph q <query>` · `dc story …` · `dc spec pack|lint|metrics` · `dc render bench|preview|final|status|contact-sheet|strip` · `dc qa chapter|film|sync|arabic` · `dc sound …` · `dc deliver ladder|encode|upload|verify|note`

## Agents (in `.claude/agents/`)
- **Council:** council-chair · council-member (lenses: director, educator, motion-design, technical-accuracy, egyptian-arabic, audio-sync, producer)
- **Engineering:** loop-engineer · context-engineer · graph-engineer · harness-engineer
- **Production:**
  - sources and audio: archivist · audio-forensics · transcription-aligner
  - story and picture: story-editor · visual-librarian · scene-director · motion-engineer · arabic-typographer
  - output: sound-designer · render-ops · delivery-publisher · genai-artist (optional)
- **Verification:** critic · fact-checker · sync-verifier

## Talking to the user
- FYI checkpoints (post them, then keep working unless the user objects):
  - ADR-001 + a 3-minute radio-edit sample (after G5);
  - the pilot chapter link (after G8);
  - final sizes and hosts (before P14).
- Ask before the optional corpus-cache upload (P1.7).
- Final message: use the template in `06` §5.6, with x0.at direct links, the temp.sh link, SHA-256, expiry dates, runtime and chapters.
- Report failures plainly, with numbers. Never claim a gate passed without its report.
