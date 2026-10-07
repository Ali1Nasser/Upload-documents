# PHASE-02 · canon (graph-engineer) — P2.2, P2.3, P2.4 (cues + script registry), P2.6

## What was done
`python3 tools/dc.py corpus canon [--force]` (runs under `python3 -I`, stdlib only, under 2 s, idempotent via `corpus/canon/manifest.json` step `canon`).
It parses the archives statically. Markdown and HTML are read as text, JS literals are read with `json.raw_decode`, and Python sources are read with `ast` through a whitelist literal evaluator. No archive code is imported or run.
Every output is validated against its schema before the manifest is written (16 new schemas under `harness/schemas/`, rules in `paths.json`).
Code: `tools/dclib/canon.py`, `canon_md.py`, `canon_src.py`. Test: `python3 -I tools/tests/test_canon.py`.

## Outputs (`corpus/canon/`) and counts
| File | Content | Count |
|---|---|---|
| chapters.json | §7+§8: id, start/end ms, dur, core, act, teaches, patterns, shots[t_from,t_to(_ms),beat,on_screen,motion], labels EN/AR, narration EN/AR (+ `_plain` speech-clean), prediction, failure_beat, callback, artifact | 37 ch · 200 shots · 4205 s · core 28 ch / 3220 s · EN 8751 / AR 6753 words |
| data_contract.json | §6 facts `d:6.N:k` (bold/code/plain/table rows) + §5.2 receipts `d:5.2:1–10` + derived + 12 arithmetic checks | 103 facts · 12/12 checks pass |
| glossary.json | §10.1 glosses, §10.2 always-English, §10.3 pronunciation, §10.4/10.5 register, §0.3 never-translate, §8 term chips, NotebookLM terms, priority `terms` list (read by `dclib/scripts.py` ASR prompt) | 15 · 50 · 12 · 346 chips · 232 nblm terms · 232 terms |
| coverage_index.json | §12.1 domains, §12.2 gaps, §12.3 primers | 29 · 10 · 31 |
| assets_registry.json | §9 A-01…A-15 + §9.1 permitted 3D | 15 · 6 |
| patterns.json / scene_contract.json / motion.json / spec.json | §2 P01–P22 (definition, rules, used-for, chapters); §4 nine beats + indexes example; §3 ten moves (ms); §1 format/typography/colour tokens, §11, §13.3, §15 checklist | 22 · 9 · 10 |
| nblm_scenes.jsonl | `P07-sc03`: on_screen 🎬, animation 🎞️, narration, numbers, terms, questions, src line; plus `P00-sc01` (intro visual rules, kind=intro) | 351 scenes + 1; 351/351 identical to the unified master |
| nblm_parts.json | per part: one-liner, directing notes, numbers, terms, map (prediction/failure/fix/next/artifact), questions, prompt; P00 table | 25 + P00 (15 271 words, matches P00 total) |
| cues_70m05.json | DA_SCENES + DA_CAPTIONS_EN (ms, chapter-assigned); 3 HTMLs identical except DA_CONFIG; 111 ref-still names (no image data); T5's 487 timed AR lines (`ar_lines_t5`) | 37 · 637 cues (8751 words = master EN, 37/37 chapters) · 487 |
| legacy_shots.jsonl | `LG:film:CH-nn:ii` from scenes_a–d.py (kind, title, literal data; colours as `@TOKEN`, A-01 as `{asset:A-01}`) + `LG:story:…` from dacamp/story.json | 200 film shots (0 unresolved) + 200 story beats |
| legacy_patterns.json | patterns.py RENDER: 25 renderers with required/optional params, banner pattern ids, shot usage; story.json patterns/stats/figures | 25 |
| scripts.json | T1, T1-old, T2–T7: paths, file ids, copies, lang, words, lineage, per-chapter/part pointers and similarity to T1 | 8 entries |
| contradictions.json | preserved findings for ADR-008 (`K001…`) | 13 contradictions · 2 info |

## Open issues (for the Council, ADR-008; nothing was rewritten)
- K001/K003/K004: Artifact none in CH-00, CH-03 and CH-24, but §15 requires one per chapter. K002/K005: Prediction none in CH-01 and CH-36. K006: act "Close" (CH-36 only) has no prediction.
- K007: the §7 table has 13 act names (Craft, Systems and Close are separate). The "Act rhythm" line has 11 (Craft & Systems, and Ship 34–36). So the number of A-01 callbacks differs (8 per P20, versus 11 or 13).
- K008–K010: §9.1 permits 3D in CH-01, CH-25 and CH-36, but their Patterns lines omit P19. K014: NotebookLM P00 allows 3D in only three places.
- K011: §5.2 "Operator totals A = 250, B = 150" are successful-only totals. The all-status total for B is 450.
- K012: §12.2 is headed "seven gaps" but lists 10.
- K013 (info): 31/37 chapters list fewer AR labels than EN (162 vs 121), mostly technical labels kept Latin. The arabic-typographer decides.
- Lineage: T1-old runs 3570 s (59:30); 30 chapter durations differ; 27 EN and 26 AR narrations are identical to T1. T5 is T1 verbatim (AR 37/37). T5's EN_AR master is byte-identical to master.md. The ElevenLabs pack and arabic_voice_package are T1 verbatim, including markdown. dacamp/tts is T1 with markdown stripped (37/37 equal to `narration_*_plain`). K015 (info): T5 timestamps wrap at 60:00 and were unwrapped.

## Next actions
- P3 aligners: use `narration_ar_plain` / `narration_en_plain` (= dacamp/tts) as the forced-alignment text. Use `cues_70m05.json` captions (EN) and `ar_lines_t5` (AR) as timing cross-checks.
- P4 graph: seed Concept nodes from `glossary.json#terms` + `nblm_terms`, DataFact nodes from `data_contract.json#facts`, Shot/Chapter nodes from chapters.json, and Pattern nodes from patterns.json. Then embed `nblm_scenes` narration with bge-m3.
