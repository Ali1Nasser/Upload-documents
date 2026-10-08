# PHASE-04 (graph-engineer): P4 semantic graph, gate G4

G4 passes (8/8): `python3 tools/dc.py gate check G4` -> `reports/gates/G4.json`. Checker: `harness/gates/g04.py`.
Rebuild: `dc graph build --no-batches` (concepts + definitions) -> `dc graph embed` (queued, venv) -> `dc graph apply` (threshold, units, links,
sentence files) -> `dc graph report` (analyses + overview). Code: `tools/dclib/graph.py` (build/embed/candidates/CLI), `graph_p4.py` (apply/assemble/report).

## Inputs
15/15 batch outputs present and complete (4 label x 50 pairs, 5 adjudication = 241 pairs, 6 definition = 454 concepts); none missing.
Batch outputs carry `same` as a bool or as the string "true"/"false"; the loader now parses both (`_truthy`).
Vectors (bge-m3 dense, `data/derived/vectors/g_{sent,scene,asset,concept,fact}`): concept re-embedded with definitions; data facts (127) added.

## Threshold (reports/graph/threshold.md)
| Rule | tau | P | R | F1 | 5-fold CV F1 |
|---|---|---|---|---|---|
| cosine only | 0.81 | 0.743 | 0.873 | 0.803 | 0.785 |
| number veto -> adjudication (band 0.72-0.86, best S1 match) -> cos >= tau (applied) | 0.81 | 0.811 | 0.952 | 0.876 | 0.876 |

Cosine alone misses the 0.85 target; the applied rule passes. Confusion (applied): TP 60, FP 14, FN 3, TN 123. Adjudicator vs label agree on 38/44 overlap pairs.
Labels and adjudications are agent judgements (separate invocations), not human labels.

## Graph (corpus/graph/nodes.jsonl, edges.jsonl; schema-valid, 0 dangling endpoints)
Nodes: Sentence 3,126; IdeaUnit 2,957 (121 multi-member, largest 19 = the "let's dive in" openers of 16 parts); Concept 454; DataFact 127;
VisualAsset 1,303; Chapter 37; Pattern 22; AudioAsset 28.
Edges: illustrates 16,676 (14,785 top-5 unit candidates with scores + 1,891 caption tags); about 8,666; contains 3,126; says 3,126; requires 935;
duplicates 323 (198 same = merges, 122 subsumes directed big -> small, 3 scope_differs); states 284 (156 units); uses 166; version_of 1 (P00b -> P00);
contradicts 0. Merges: 63 label, 75 adjudicated, 60 threshold. Every decision: `data/derived/graph/decisions.jsonl` (458) + edge evidence.
`idea_unit` written into all 28 `corpus/sentences/*.jsonl` (only that field changed; verified against HEAD).

Link floors = p95 of cosine for random (unit, target) pairs: concept 0.545, fact 0.499, visual 0.567 (context query), 0.509 (centroid only).
- about: term mention 2,010 units; bge-m3 nearest concept >= 0.545 742; context of neighbouring sentences 205; weak 0.
- illustrates: query = unit centroid + 0.5 x neighbouring sentences. 2,893/2,957 (97.8 %) units have >= 3 candidates above the floor (centroid only: 2,807 = 94.9 %).
  The thumbnail rerank has not been done; it belongs to the visual-librarian in P8.
- states: shared distinctive number (not 0-10, or >= 2 shared) and (cos >= 0.499 or S1 chapter in the fact's chapters).
- requires: from the definition batches. They contain 7 cycles (e.g. statistics <-> distribution), listed in order.md.

## Analyses (reports/graph/)
- novelty.md/.json: 2,321 of 2,498 S4 units (92.9 %) are novel vs the trunk at claim level. There are 120 runs >= 20 s, totalling 195.3 of 221.4 min.
  Per part the novel share ranges from 80.6 % (P02) to 100 % (P00, P14). At topic level only 7.7 % of S4 units with a term mention use concepts that S1 never mentions.
  So S4 mostly adds claims, examples and detail on S1 topics, not new topics. The part x chapter matrix is in the JSON.
- coverage.md: lexical evidence only. S1 covers 301 of 454 concepts, S4 430; 142 concepts are S4-only, 13 S1-only, 11 have no audio. Results are given per curriculum domain.
- contradictions.md: 0 same-claim pairs with disjoint numbers; 3 scope pairs; 38 sentence-vs-data-contract candidates (noisy, for the fact-checker); 15 canon items.
- order.md: 142 prerequisite violations against the S1 order (109 cross-chapter); 71 prerequisites never mentioned in S1; 7 cycles. G5 needs 0 violations in the EDL,
  so the story-editor should use this list. Many violations come from LLM-proposed `requires` and need review.
- overview.md: Mermaid overview with counts.

## Open / for P5
- The 93 % claim-level novelty is the ADR-001 evidence; the 7.7 % topic-level figure qualifies it.
- Review the `requires` cycles and violations before the EDL. `dc graph q continuity` needs the EDL (P5/P8).
- Fixed: `dc graph embed` queued jobs with the system python (no torch); it now uses `.venv/bin/python`.
- `harness/pipeline.graph.yaml` and `reports/dag.md` were not touched in this phase.
