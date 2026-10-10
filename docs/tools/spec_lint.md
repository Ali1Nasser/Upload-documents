# `dc spec lint | metrics | coverage | digest` and gate G7

Code: `tools/dclib/speclint.py`, `harness/gates/g07.py`. Tests: `python3 -I tools/tests/test_speclint.py` (70 checks, fixture `tools/tests/fixtures/spec/DD-P06-2.json`, real word ids) and `python3 -I tools/tests/test_g07.py` (23 checks, scratch repo root).

## Commands
- `dc spec lint <CH|DD-Pnn-k|a,b|all> [--force] [--json] [--errors N]`: exit 0 clean, 1 on any error or missing spec, 2 unknown chapter. Writes `reports/spec/lint/<CH>.json` and `reports/spec/manifest.json`. A run is skipped when the hashes of the spec, schemas, EDL, word map, glossary, data contract, sentences, transcripts and `speclint.py` match the last manifest. A missing spec writes nothing.
- `dc spec metrics <CH|all> [--json]`: events/min, anchored and mechanism share, numbers/terms on screen, hero (real-time 3D) share, max gap, median shot length, component and action frequency. `metrics.spec_sha256` is the spec revision; critics and fact-checkers copy it into their reports to prove freshness.
- `dc spec coverage [--record --by <role> --issues N]`: lint of all chapters plus the film-level 3D share. `--record` appends a round to `reports/spec/coverage_rounds.json` with the digest of all specs (`dc spec digest`). The scene-director cannot record a round.
- `dc spec pack`: still a P8 stub (exit 3).

## Lint rules (errors unless noted)
1. JSON Schema `scene_spec.schema.json` (fx_tier `lite|standard|hero`); `edl_version` = locked EDL; `chapter` = file.
2. No seconds or frames anywhere: forbidden key names (`start_ms`, `duration_s`, `frame`, ...), time-like string values (`3.5 s`, `00:01:23`), and every `{word,...}` anchor must be exactly `{word, lead_frames}` (`transition_out.frames` is the only other frame field).
3. Coverage: the shots' sentences equal the EDL chapter's sentences, once each, in order. Every sentence has at least one anchored event. At least 80 % of sentences have a mechanism event (an action layer or a component that is not type-only; type-only = KineticWord, KineticPhrase, TermChip, LowerThird, ChapterCard, DeepDiveCard, EquationLine, CalloutArrow, plates).
4. Anchors: every `at`, `props.until` and any nested anchor (counter `land`, terminal lines, camera nudges), sfx and hold anchor names a word of the word map inside the shot's own sentences and does not land more than 6 frames before the shot. Event frame = `rec_start_frame - lead_frames` (24 fps, `timeutil` only). KineticWord, KineticPhrase, TermChip, NumberCounter and every action layer need an `at`.
5. Components: the name is in the frozen catalog (`harness/schemas/components`); `Name.action` is one of its `x-actions`; props validate against that JSON schema; action `target` is an earlier layer of the same component (or a layer of that component exists); `transition_out.type` is a catalog component or `cut`/`dissolve`.
6. Data: `data_refs` and every `ref` exist in `corpus/canon/data_contract.json` (`d:`) or the sentence corpus (`s:`). A number shown on screen must be spoken in the shot, or the shot has `data_refs`, or its layer carries a `ref`.
7. On screen: every spoken number word (word-level `is_number`) appears in the display text of a layer that has arrived by the end of that word and has not exited; every first mention per chapter of a glossary term (`corpus/canon/glossary.json` terms, first-mention list and always-English list; Latin n-grams up to 3; plural tolerant) the same way. Display text = string leaves except id/enum-like keys, plus numeric `value|to|from`.
8. Density: events = shot cuts, anchored arrivals, anchored exits and sub-anchors, de-duplicated on (frame, component, action); at least 20 per minute of chapter time. No gap above 4.0 s between consecutive events (3.0 s inside shots longer than 12 s) unless covered by a hold; the chapter start and end count as boundaries. A hold is `{from, until, reason}` (anchors, at most 6 s, reason of at least 3 characters). A shot may not exceed 25 s; a median outside 6-12 s is a warning.
9. FX: tier defaults to `standard`; an `FXTier` layer must equal the shot tier. Hero tier = real-time WebGL (ADR-002 Q2.4); its share of a chapter is at most min(`fx_budget.hero_max_ratio`, 5 %) (ADR-002 RT5). A declared ratio above 5 % is a warning; the cap stays 5 %.

## G7 evidence conventions (checked by `g07.py`)
| Check | Evidence file |
|---|---|
| specs, lint, anchors, numbers/terms, density, 3D share | `corpus/specs/<CH>.json` for all 73 EDL chapters (lint is run by the gate) |
| fact-check: 0 critical, 0 major, at most 2 minor | `reports/facts/<CH>.json`: the fact-checker's list, or `{spec_sha256, issues}`; a list must be newer than the spec |
| Arabic copy | `dc qa arabic --spec corpus/specs/*.json --label storyboard` -> `reports/qa/arabic/storyboard.json`, verdict pass with OCR, covering every spec string |
| critic rubric | `reports/qa/storyboard/<CH>.rN.json` (qa_report schema, tier `storyboard`, reviewer `critic*`, 10 criteria, mean at least 8.0, min at least 6, `metrics.spec_sha256` or newer than the spec). The draft `storyboard.js` writes `reports/qa/specs/`; adapt it to this path and to rounds starting at 1 |
| global coverage loop | two consecutive `dc spec coverage --record --by critic` rounds, clean and recorded against the current spec digest |
