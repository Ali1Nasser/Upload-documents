# AT-13R renders (render-ops; no measurement or judgement)

- Engine commit SHA: 011cae100ff2d612e4c5d34ea388e98fb54ef4d8
- Worktree: git worktree of HEAD in scratch dir; `git status --short` showed only untracked symlinks (studio/node_modules, studio/src/lookdev/data, data -> main tree); no modified or untracked source files. Shared-tree partial component files are not in the engine.
- studio/src/type/reveal.ts: REVEAL_ONSET_F = 1 (RV1), confirmed in worktree
- Spec corpus/specs/_demo.json, 24 fps, 14 distinct anchored layers (29 events in reports/sync/p7_demo.events24.json). Preview tier, JPEG q80, crf 26, concurrency 1, 3 queue slots in parallel, queue jobs 0-13 (harness/state/queue.json).
- Command per layer (via `dc q submit --mem-gb 4 --expected-gb 0.2 -- env DC_REPO_ROOT=<worktree> python3 <worktree>/tools/dc.py render spec _demo --fps 24 --nocam --nofx --cut --solo <layer> --inline`)
- Output: data/renders/at13r/<layer>/_demo.mp4 + resolver.json (not committed)

| layer | job | frames | s/frame | MB | result |
|---|---|---|---|---|---|
| kw-callback | 0 | 1229 | 0.0662 | 2.1 | PASS, qa 0 |
| kw-code | 1 | 1229 | 0.0663 | 2.1 | PASS, qa 0 |
| kw-constraints | 2 | 1229 | 0.0657 | 2.1 | PASS, qa 0 |
| kw-customers | 3 | 1229 | 0.065 | 2.1 | PASS, qa 0 |
| kw-missing | 4 | 1229 | 0.0644 | 2.1 | PASS, qa 0 |
| kw-notfound | 5 | 1229 | 0.0647 | 2.1 | PASS, qa 0 |
| kw-only | 6 | 1229 | 0.063 | 2.1 | PASS, qa 0 |
| kw-overhead | 7 | 1229 | 0.0636 | 2.1 | PASS, qa 0 |
| kw-required | 8 | 1229 | 0.0627 | 2.1 | PASS, qa 0 |
| kw-walls | 9 | 1229 | 0.0625 | 2.1 | PASS, qa 0 |
| n1007 | 10 | 1229 | 0.0623 | 2.1 | PASS, qa 0 |
| n3 | 11 | 1229 | 0.0622 | 2.1 | PASS, qa 0 |
| orders | 12 | 1229 | 0.0594 | 2.1 | PASS, qa 0 |
| rules | 13 | 1229 | 0.0617 | 2.2 | PASS, qa 0 |

Render log: harness/state/queue.json and corpus/render/jobs.jsonl (labels at13r-<layer>). RAM guard refused 11 early submissions (12 GB promised); they were resubmitted in batches of 3 after earlier jobs finished.
