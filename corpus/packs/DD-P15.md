# Pack DD-P15 · ETL and DAGs: validate before transform, six quality dimensions, quarantine, Airflow inside, idempotent retries

deep-dive · Platform · voice A · 422.4 s · frames 196782..206921 @ 24 fps · anchor CH-22

Load `corpus/packs/DD-P15.json`. Est. 24754 tokens (target 25000, within). Built from EDL v1 sha f9ea31cba21e; every input hash is in `inputs`.

- 78 sentences, 26 spoken numbers (0 with a data-contract fact), 110 concepts, 42 visual ideas, 5 prerequisite gaps.
- Cuts: visual candidates 390->79 (lowest-ranked first; 78 idea units); background text level 2 (2 metaphor rows, fewer components). Sentences and facts are never cut.

## ADR-001 storyboard notes
- **N5-restating**: Restating dive: treat it as a visual callback that reuses the trunk chapter's assets (see `restates` in continuity); the fact-checker checks its numbers against the trunk.

## JSON sections
constraints · storyboard_notes · cards · sentences · facts · glossary (+dialect) · concepts · prereqs · continuity · metaphors · components · visual_candidates/visual_assets

## Metaphor rows chosen (04 section 6)
- ETL/ELT & quality: PipelineStations, QualityGauges
- DAG, retries, idempotency: DagRun, IdempotentStamp, NumberCounter
