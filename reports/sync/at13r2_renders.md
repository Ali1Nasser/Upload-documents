# AT-13R2 renders and provenance (render-ops, 2026-10-10)
Per ADR-011 "AT-13R2". Renders only; no measurement or judgement. Pre-registration: reports/sync/at13.md (7ae7483).

## Engine
- Worktree (KEPT until the sync-verifier countersigns): `/tmp/claude-0/-home-user-Upload-documents/8d44d46c-8542-5a82-961e-ef96bddd883b/scratchpad/wt-at13r2` (detached, HEAD `7ae7483c9c2803dec163cf8a9ead25f6a86cee98`).
- `git diff 011cae1 7ae7483 -- studio/` is empty (checked in main tree and in the worktree).
- Worktree `git status --porcelain` at render time (studio/ clean; resolver.json engine.studio_dirty = false for all three):
```
 M corpus/render/jobs.jsonl
 M harness/state/queue.json
?? corpus/specs/_demo_c14.json
?? corpus/specs/_demo_c8.json
```
- Worktree-only set-up: symlinks `data` and `studio/node_modules` to the main tree (hidden from git by two lines added to the shared `.git/info/exclude`: `/data`, `/studio/node_modules`; remove them when the worktree is removed). `studio/src/lookdev/data/` (git-ignored, 2 JSON) copied from the main tree because the bundle needs it. jobs.jsonl/queue.json diffs are the worktree's own ledger entries.
- The bundle driver cache (`studio/node_modules/.cache/dc-p7/p7.cjs`) is shared with the main tree and is built from the identical p7.ts.
- Three earlier attempts (tsp jobs 14-16) failed at bundling (missing lookdev data) before any frame was rendered; they produced no output. Jobs 18, 19, 20 are the renders below.

## Specs (SHA-256)
| id | sha256 | note |
|---|---|---|
| _demo (T) | 5cd9a9c72e2dc26f0fcde372a2c77173f154d4f31a70648997f78060a1beef83 | unchanged, identical to the main tree |
| _demo_c8 (C8) | c7cc6fc5bd70f30cacb4b4c6a137be6c0da616c6ae1214e4b2d4e3951da8e6fb | only the rules addRow at.word 001624 -> w:S1:ar-natural:001627 |
| _demo_c14 (C14) | bd0bf35d87234772dd6c5ffd91b3df11edb5b5490dd2fe8967075deac80b48c7 | only the rules highlightRows at.word 001644 -> w:S1:ar-natural:001646 |

## Commands (cwd = worktree, through the tsp queue)
`python3 tools/dc.py render spec <id> --fps 24 --nocam --nofx --cut --solo rules` for id in _demo, _demo_c8, _demo_c14 (tsp jobs 18, 19, 20; all exit 0; qa 0).

## Outputs (data/renders/at13r2/, git-ignored; 6.4 MB total; each dir also holds resolver.json)
| clone | file | frames | size | fps | ffmpeg decode errors | s/frame | sha256 |
|---|---|---|---|---|---|---|---|
| T | T/_demo.mp4 | 1229 | 960x540 | 24 | 0 | 0.0617 | cc09d89f1fb3fb947127935ea2d441cc8c9f6d7dca5cdb791a6424d2c34e42bd |
| C8 | C8/_demo_c8.mp4 | 1229 | 960x540 | 24 | 0 | 0.0624 | c9a38d110cbdba7bd6d6170601fb006370b74ffbc7b006dd8636f9931b09bb0e |
| C14 | C14/_demo_c14.mp4 | 1229 | 960x540 | 24 | 0 | 0.0615 | 0f2eb005b8b7e706c9dfd7343c9320f24cdc2a715bb6e0ed069b73838531be1a |

Renders are to be deleted after the AT-13R2 report; the worktree after countersign.

Cleanup (render-ops, 2026-10-10): provenance countersigned in reports/sync/at13.md (sync-verifier, AT-13R2 pass=true). Worktree wt-at13r2 (HEAD 7ae7483) removed; data/renders/at13r2/ deleted; no temp remotion bundles remained.
