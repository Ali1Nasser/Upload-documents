# PHASE-02 · hub (context-engineer) — P2.5 HUB / knowledge harvest

## What was done
`python3 tools/dc.py corpus hub index|crash|items|shots|all [--force]` (re-execs under `.venv/bin/python -I`; code in `tools/dclib/hub.py`, `hub_text.py`, `hub_shots.py`, registered in `corpus_cli.py`).
Every step is idempotent: inputs are hashed into `corpus/canon/manifest.json` (steps `hub_index`, `hub_crash`, `hub_items`, `hub_shots`) and a re-run says "up to date". Test: `.venv/bin/python -I tools/tests/test_hub.py` (12 checks).
Archive code is never executed outside the sandboxed browser: HTML/JS/JSON are read as text (`json.raw_decode`, a string- and comment-aware JS literal reader, lxml for HTML fragments).
Four new schemas (`knowledge_index`, `crash_course_step`, `hub_item`, `hub_shot`) are mapped in `harness/schemas/paths.json`; all four outputs validate with 0 errors.

## Outputs (`corpus/canon/`) and counts
| File | Content | Count |
|---|---|---|
| knowledge_index.jsonl | `DA_Camp_KNOWLEDGE.md` (42,286,584 B) streamed in binary, never loaded: `section_id` K00001.., `heading_path`, `byte_start`/`byte_end` (half-open, tile the file from byte 0 to EOF with 0 gaps), `chars`, plus `level`, `title`, `part` (the file's own "N · name" part), `line` | 2,207 sections (H1 4, H2 104, H3 368, H4 928, H5 5, H6 191, H7 290, H8 317); largest 8.5 MB (a verbatim payload block) |
| crash_course_steps.jsonl | the 79 Visual Crash Course steps: `step`, `step_id`, `title`, `phase`+`phase_title`, `real_life`, `intuition`, `what_moves` {description, motion[], controls[]}, `key_points`, `labels` (strings the canvas draws), `data` {arrays, scalars, sliders, rng_seeds}, `quiz`, `canvas` {lines, sha, full code lives in the VCC html}, `source` {knowledge section id + byte span}, `concepts_guess` | 79 steps in 9 phases (p0 3, p1 9, p2 8, p3 7, p4 21, p5 9, p6 10, p7 6, p8 6); 79/79 have labels (1,265 in all), 51 have literal data arrays, 71 have arrays or scalars |
| hub_items.jsonl | `hub:<build>:<kind>:NNNN`, kind mermaid / code / lab / section, `title`, `text` (clipped: section 700, lab 900, code 2,500, mermaid 4,000 chars; `chars` and `truncated` say what was cut), `concepts_guess`, `lang`, `lab_id`, `tag`, `source_ref` (path inside the build), `text_sha`, `dup_of` | 4,180 items = 2,398 code, 1,137 section, 643 lab, 2 mermaid; 3.1 MB |
| hub_shots.jsonl | `asset_id` `v:<sha1-12 of the PNG>`, `build`, `path`, `n`, `section_title`, `dom_text_excerpt`, `route`, `png_sha256`, `build_file_id` (catalog `f:` id of the html) | 150 shots = 25 per build, all 1280x720 |

Items per build (new text only; `dup_of` items keep metadata but `text` is empty and `dup_of` names the first holder): vcc 79 lab + 9 section; lab-m12-ds 1 mermaid + 869 code + 94 lab + 118 section; supreme-final2 215 / 36 / 299; nilepay-journey 97 / 49 / 144 (190 dups); fusion 268 / 163 / 284 (385 dups); unified 949 / 222 / 283 (1,159 dups, because it embeds the Lab and the VCC).
`lab` items cover: 85 `lab({id,g,n,tag,d})` definitions with the strings each draws (Lab, Unified), the 13 domain labs, 88 FUSION labs + 79 canvas steps, 36 SUPREME scene functions (`reg(...)`, `SCENES_A`), 49 NilePay `setupLab(...)` labs, and the 79 VCC steps.
`concepts_guess` is a regex lexicon (`hub_text.LEXICON`, 143 `c:<slug>` guesses: sql, join, window-function, b-tree, consumer-lag, grain, fan-out, kafka, spark ...), not the graph. 3,583 of 4,180 items carry at least one.

## Screenshots (`data/derived/hub_shots/<build>/NN.png`, git-ignored, 22 MB; metadata in hub_shots.jsonl + `notes.json` per build)
Playwright python, chromium headless shell from `/opt/pw-browsers`, `offline=True`, every non-file/data/blob request aborted, run as one queue job (`hubshots-all`, 1.8 GB declared). No build needed a blocked CDN: 0 blank builds, 0 page errors. Only Lab and Unified request one external URL (fonts.googleapis.com), which is cosmetic.
Navigation is by hash routes where the app has them, so the states are reproducible: Lab/Unified `#<lab id>`; SUPREME `#practice|review|progress|project|coverage|sources|scenes` and `#lesson/<id>`; NilePay `#practice|project|reference|progress`, `#phase/N`, `#lesson/<id>`. VCC clicks the step rows. FUSION clicks its nine views and the cards inside Labs, Canvas, Studio and Curriculum.
Capture-only DOM tweaks, so the picture shows the lab and not the paywall: `.m3-blocker` ("prerequisites not mastered"), `.primer-strip` and `.exec-disclosure` are hidden, the "predict before play" gates are answered with the text "my prediction", then the first canvas/svg is scrolled to the centre. Animated scenes are captured 1.2 to 2 s after load, mid-motion. Shot 1 of each build is the landing page.

## Findings and gaps (nothing rewritten)
- The recon said "1,507 headings". By the rules used here the file has 2,207 sections. The file mixes verbatim payloads (CSS, JS, JSON), embedded markdown shifted to H5-H8, and an unfenced Linux guide in section 6 whose shell comments (`# Schedule a command:`) look like H1s. The index ignores headings inside fences and accepts an H1 only when the lines before and after are blank. Sections are flat: each ends at the next heading. A part runs from its "## N · name" marker to the next one, so use `part` (not byte spans of one section) to fetch a whole part.
- Knowledge md bug: steps 72 and 77 list the ids `d2` and `rec` (nested canvas node ids) instead of `viz-dashboards` and `ship-communication`. Matched by title; the file's id is kept in `source.md_step_id`.
- The knowledge file shows only the first N lines of each canvas scene ("16 lines, verbatim" is a prefix). The full code is in `DA-Camp-Visual-Crash-Course.html`, so labels/data/motion come from there; `canvas.full_code_in` says so.
- Only ONE Mermaid block exists in all six builds (`flowchart LR`, CDC to Kafka to cube, in the Lab "Data Cubes ..." section). It is listed twice (Lab and Unified, the second as a dup).
- Skipped on purpose: FUSION's 11.8 MB Linux-simulator script, Unified's 14 MB `GTS_DONORS` (embedded copies of other builds), assessment banks (in the knowledge index, section 8), `testrun` evidence.
- The 25-per-build cap comes from the task. The runbook's "up to 60" is available through `--max-shots 60` (re-run the queue job; about 2 min per build).
- FUSION Labs shots (n 6-12) have run-together `section_title`s (innerText of inline spans, e.g. `animaiRAG pipelineChunk, ...`); the readable text is in `dom_text_excerpt`. A fix is in the code history but was not re-run because the queue RAM guard (7.9 GB promised to ASR jobs) refused a 1.8 GB job.
- 1,433 code items have no `lang` (prose-like code fields in lessons). Treat them as text snippets.
- `text` of the clipped kinds is capped. Fetch the rest by `source_ref` (path inside the build) or, for the knowledge file, by the byte span.

## Next actions
- visual-librarian: register `hub_shots.jsonl` into `corpus/visual/assets.jsonl` as `kind: hub_section` (`file_id` = `build_file_id`, `source` = `hub:<build>`, concepts from `concepts_guess` of the nearest item). Mermaid and code items are `kind: mermaid|code` assets.
- graph-engineer (P4): seed Concept candidates from `concepts_guess` counts (143 slugs; `sql` 974, `python` 823, `join` 407, `index` 381) and link crash-course steps (`step_id`) as *visual idea* nodes (`what_moves`, `labels`, `data`).
- context-engineer (P2.1/P2.8): add `knowledge_index.jsonl` spans to the retrieval store (read a section with `hub.read_span`), and use `part` for the maps in `corpus/maps/`.
- scene-director: crash-course steps and the FUSION/Lab/NilePay lab shots are reference ideas only (rule 10: no legacy frames as footage). Rebuild them as components.

## Commands
```
python3 tools/dc.py corpus hub index        # 0.5 s
python3 tools/dc.py corpus hub crash        # 1 s
python3 tools/dc.py corpus hub items        # 50 s (parses 22 MB + 18 MB builds)
python3 tools/dc.py corpus hub shots [--build fusion] [--max-shots 25] [--front]   # one tsp job; --merge-only rebuilds hub_shots.jsonl
```
