# DA Camp corpus map

Start here, then open one family, then one document, then search. Never load `DA_Camp_KNOWLEDGE.md` or a whole master.

## Text families (corpus/text/chunks.jsonl)
- **data-json-csv** 8 docs, 614 ch -> `maps/families/data-json-csv.md`
- **hub-knowledge** 1 docs, 6238 ch -> `maps/families/hub-knowledge.md`
- **masters** 5 docs, 6172 ch -> `maps/families/masters.md`
- **narration-scripts** 10 docs, 403 ch -> `maps/families/narration-scripts.md`
- **nblm-parts** 25 docs, 553 ch -> `maps/families/nblm-parts.md`
- **reports-notes** 21 docs, 280 ch -> `maps/families/reports-notes.md`
- **sidecar-txt** 7 docs, 13 ch -> `maps/families/sidecar-txt.md`
- **subtitles** 49 docs, 429 ch -> `maps/families/subtitles.md`
- **tts-chapter-texts** 213 docs, 367 ch -> `maps/families/tts-chapter-texts.md`

## Other stores
- Canon: `corpus/canon/` chapters, data_contract, glossary, patterns, nblm_scenes (352), crash_course_steps (79), hub_items (4180), legacy_shots (400).
- Visual: `corpus/visual/assets.jsonl` (1303 captioned assets).
- Transcripts: `corpus/transcripts/`; audio facts: `corpus/audio/`.

## Commands
`dc corpus search "<q>" --k 8 --lang ar,en [--family F] [--doc ID]`; `dc corpus show <chunk_id>`.

