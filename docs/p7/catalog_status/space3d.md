# P7 catalog status: Space & 3D family

| Component | Status | Notes |
|---|---|---|
| VectorGalaxy | implemented | Embedding galaxy (CH-33, 04 §6 Embeddings/RAG): 900 seeded points in 4 labelled clusters (nebula sprites, halos, depth fade), ring markers + leaders to whole-word chips (text-safe knockouts), `probe` query lands with a glow and 3 nearest-neighbour beams (`highlightNeighbors`), `zoomCluster` camera dolly; chips declutter around the probe disc. Round-2 critic approved 7.6; this run applies carry-forward items 2 and 3 (ring r 12 / alpha 0.85, dimmed chip alpha floor 0.7) so baselines are pending-critic again. Open: roadmap leader still runs behind the keyword chip end (carry-forward 1); standard/hero stills not yet evidenced. Perf box s/frame at 3 slots: lite 0.070, standard 0.121, hero 0.116 (budgets 0.201 / 0.201 / 1.038); canvas 2D, hero equals standard plus bloom. Arabic QA pass on all 5 demo strings. |
