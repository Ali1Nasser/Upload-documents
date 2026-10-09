# Producer notes for ADR-001 / ADR-002 (Executive Producer, 2026-10-09)

Facts the Council must weigh alongside the content evidence:

1. **Usage budget is the binding constraint, not CPU.** The production has hit the account's usage limit 4 times
   (each time agents failed until the window reset, roughly every 5 h). Subagent tokens so far: P0 ~0.85 M,
   P1-P3a ~4.9 M, P3b ~5.6 M, P4 ~2.7 M (≈ 14 M total). P7-P9 cost scales with the number of EDL sentences
   (one scene-director pass + critic + fixes per chapter): S1 alone = 562 sentences; all S4 = 2,564 sentences.
   Rough planning figure: ~5-8 k subagent tokens per EDL sentence through P8-P9 → A ≈ 3-5 M, B ≈ 12-18 M, C ≈ 15-22 M.
2. **Render cost** (reports/perf/render_bench.md, harness/state/budget.json render_bench): `--gl=swiftshader` is 2.3-5x faster
   than swangle; a 3 h film at 15 % real-time 3D ≈ 24.7 h render, at 5 % ≈ 16.7 h; 70 min ≈ 6-10 h.
3. **Voices** (corpus/audio/voices.json): S4 uses three voices — A (close to S1/S2), B (close to the S3 TTS voice), C (P01, close to the EN S5 voice).
   Voice-A parts can follow the trunk with the least audible switch.
4. **Novelty** (reports/graph/novelty.md): ~73 % (64-77 %) of S4 idea units are new claims vs S1 (upper bound 79.7 %),
   but only ~7.6 % introduce concepts S1 never mentions; P14 (backend) and P17 (DataCube) are the most novel.
5. **The user's explicit intent**: one long Egyptian-Arabic film containing all content (semantic merge), every word illustrated, premium look.
   A shorter cut that drops content must be justified by the merge (redundancy), not by cost alone; cost may shape *how* (e.g. 2.5D vs 3D), not *what*.
