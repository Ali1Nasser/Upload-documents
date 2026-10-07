# PHASE-02 (context-engineer): P2.1 text chunks, P2.7 visual merge, P2.8 maps, retrieval, gate G2

G2 passes (8/8 checks): `python3 tools/dc.py gate check G2` -> `reports/gates/G2.json`. Sibling handoffs: `PHASE-02-canon.md`, `PHASE-02-hub.md`.

## Commands (all idempotent; inputs hashed in the manifest next to their outputs; they re-exec under `.venv/bin/python -I`)
| Command | Output | Result |
|---|---|---|
| `dc visual merge` | `corpus/visual/assets.jsonl`, `reports/visual/missing.md` | 1,303 assets: slide 519, render_keyframe 212, png_scene 21, hub_section 150, mermaid 1, legacy_shot 400. 752/752 listed images captioned and OCR'd, 0 missing batches, 0 duplicate ids |
| `dc corpus distill [--max-mb 60]` | `corpus/text/chunks.jsonl` (36.4 MB, in git), `docs.jsonl`, `manifest.json` | 15,069 chunks from 339/339 unique md/txt/json/csv/srt/vtt/ass sources; knowledge file through `knowledge_index.jsonl` byte ranges (6,238 chunks) |
| `dc corpus index [--dense]` | `data/derived/index/bm25.pkl` (10 MB, 5 s) | pure-Python BM25 over `norm` + heading words |
| `dc corpus search "<q>" --k 8 --lang ar,en [--family F] [--doc ID] [--json] [--no-dense]` | stdout | hits with chunk id, repo path, heading path, char span (+ K-section and byte span) |
| `dc corpus show f:<doc>#NNNNN[-NNNNN] \| K#####` | stdout | the cited chunk(s), or a whole knowledge section |
| `dc corpus smoke` | `reports/retrieval_smoke.md/.json` | 10/10 in top 3 (BM25) |
| `dc corpus maps` | `corpus/maps/` | 192 files, longest 284 words |

Chunk record (schema `chunk`): `chunk_id` `f:<doc>#NNNNN`, `doc_id`, `heading_path`, `lang` (`ar-EG`|`en`), `lang_mix`, `text` (original, NFC), `norm` (alef/yaa/taa-marbuta folded, tatweel and diacritics removed, `الـmodel` split), `char_span`, `family`; knowledge chunks add `section_id`, `byte_span`; payload stubs add `payload`.
Families: masters 5 docs/6,172 chunks, hub-knowledge 1/6,238, nblm-parts 25/553, narration-scripts 10/403, subtitles 49/429, data-json-csv 8/614, tts-chapter-texts 213/367, reports-notes 21/280, sidecar-txt 7/13.
Maps: `corpus/maps/corpus.md` -> `families/<fam>.md` -> `docs/<hex>.md` -> `sections/<hex>-NN.md` (86 documents mapped; the rest are listed in their family map). Mechanical summaries (headings plus first sentence), so they rebuild byte-identically.

## Decisions and deviations
- `chunks.jsonl` is 36.4 MB, below the 60 MB limit, so it stays in `corpus/text/` and in git. `dc corpus distill --max-mb N` moves it to `data/derived/text/`; every reader goes through `distill.chunks_path()`.
- Knowledge payload sections (verbatim JSON/JS/CSS dumps, 80 % of the 42 MB) keep their first 3 chunks (`payload: true`; 31 sections cut, 117 stub chunks); 34.9 M chars of payload are not indexed. Use `dc corpus show K#####` for the whole section.
- Smoke expectations: top-3 chunk from a teaching source (masters, NotebookLM parts, narration, knowledge) containing the key term; the precise NotebookLM part rank is reported next to it (it is in the top 10 for 7 of 10 queries; near-duplicate masters rank first). Fixed from the sources, not from the ranking.
- `quality` 1-5 from the captioners is mapped to the contract's 0-3. HUB shots and legacy shots have text-derived captions (`caption_src` `dom-text` / `legacy-data`), not vision captions; 4 caption lines with unescaped quotes were repaired and are listed in `reports/visual/missing.md`.

## Open
- **Dense rerank not built yet.** The code is tested (24 chunks encode, query vectors work) and `plan.json` is written (2,928 core chunks, 2 shards, 192 tokens), but `dc corpus index --dense` was refused by the queue RAM guard: the 24 queued S4 ASR jobs promise 5.4 GB. Re-run it when the backlog shrinks (about 1 h on two 2-thread jobs). Then `dc corpus smoke` runs hybrid by itself. `--dense-all` adds about 12k chunks (about 4 h).
- No packs yet (`corpus/packs/CH-xx.md`): they need the EDL, sentences and graph (P4-P5). Retrieval, the glossary (`corpus/canon/glossary.json`) and the visual assets are ready for the pack builder.
- Near-duplicate chunks across masters/narrations are not merged; `duplicates` edges belong to the graph (P4).
- 1,433 HUB `code` items and 2,398 code snippets are searchable only through `hub_items.jsonl`, not through chunks or assets.

## Tests
`.venv/bin/python -I tools/tests/test_text.py` (18 checks: chunk spans, SRT without blank lines, VTT/ASS, language, stemming, word budget, caption repair).
