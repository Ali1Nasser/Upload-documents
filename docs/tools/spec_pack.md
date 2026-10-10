# `dc spec pack` (P8 step 1)

Code: `tools/dclib/specpack.py`. Tests: `python3 -I tools/tests/test_specpack.py` (361 checks). Output: `corpus/packs/<id>.json` (the pack) and `<id>.md` (one-page summary), for all 73 EDL chapters.

`dc spec pack <CH-33 | DD-P23 | CH-01,CH-02 | all> [--force] [--target 25000] [--out-dir D] [--no-md] [--json]`. Exit 0 when every pack is within the target. Unchanged inputs skip the build (the pack header holds the input hashes).

## What a pack holds (recipe: `02` section 7, `03` P8.1)
| Section | Content |
|---|---|
| `inputs` | sha256 of the EDL (full), word map (full; `word_map.v1.1.jsonl` is used when it exists, else the locked file), lock, sentences, glossary, data contract, canon chapters/patterns, graph nodes/edges/requires/concepts, visual catalog, component index, freeze, Visual Bible, ADR-001, `specpack.py` (16 hex chars for the rest) |
| `sentences` | one row per EDL sentence: `w` = first..last word id inside the chapter (word k = first + k; `ar` tokens are those words), `fr` frames at 24 fps, kind, AR text, EN gloss, `impact` words (id=text), `num` (each spoken number with data-contract fact ids), `terms` (concept ids), `first_mention` (glossary terms to chip; same routine as the lint), `iu`, `dup` (same claim in another chapter) |
| `facts` | referenced data-contract facts (value, unit, context), other facts of the chapter (id+value), `unmatched_numbers` (spoken numbers with no contract fact: their source is the sentence, never a replacement figure) |
| `glossary` | dialect rules (register, never-translate, on-screen rules), always-English / first-mention gloss / pronunciation entries present in the chapter, chapter term chips |
| `concepts`, `prereqs` | concept cards (first-here vs taught-before with the chapter), prerequisite table from `requires_clean.jsonl` with `before@CH` / `here` / `later` / `never-in-film`, and the gap list |
| `continuity` | previous/next chapter, teaches/artifact/prediction/failure beat, callbacks (to and from), patterns, A-01 state, recurring assets, scene-contract beats; dives: anchor, `restates`, stack and pre-empt relations |
| `storyboard_notes` | the ADR-001 P8 notes that apply (N1 orientation stack, N-E002 pending, N2 bridges for pre-empting dives, N3 DD-P14 Java framing, N4 CH-04 promise fix with the measured gap, N5 micro-dive / stack / reorder / restating / zigzag) |
| `metaphors`, `components` | rows of `04` section 6 chosen by title/teaches/concept overlap (plus a direct hit on the DD id), and the compact prop/action schema of those components plus the base set, from `harness/schemas/components/` |
| `visual_candidates`, `visual_assets` | graph `illustrates` candidates per idea unit, ranked, with caption, reusable idea, quality and thumbnail path (`@/` = `data/extracted/DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/`). Ideas only: `use: idea-only`; `do-not-use` and quality <= 1 are dropped |
| `constraints` | fps, anchor and lead rules, density, coverage, FX, banned patterns (thresholds imported from `speclint.py`) |
| `budget` | target, estimated tokens, tokens per section, cuts applied, stats |

## Budget and cuts
Tokens are an offline estimate (no tokenizer is installed): Arabic-block chars / 2.0 + other chars / 3.2, a conservative figure. Target 25 000 per pack. Over budget the order is: (1) drop the lowest-ranked visual candidates, down to the top-1 of every idea unit; (2) cut background text (shorter captions, 2 metaphor rows and fewer components, lite concept cards); (3) only then drop the remaining top-1 candidates. Sentences and data facts are never cut. Cuts are recorded in `budget.cuts_applied`.

## Known limits
- `numbers_with_fact` is low (251 of 890) because the data contract holds 127 facts for 21 chapters; the rest are spoken-only numbers sourced from their sentence.
- The graph `requires` edges are LLM-derived: `never-in-film` gaps include generic concepts (string, data-type) and are hints, not blockers.
- Pre-empting dives are detected by concepts first taught in the dive that the next trunk chapter also names (>= 3, or >= 20 % of the chapter's concepts); `dive_relations.next_trunk` shows the raw overlap for the story-editor to override.
- The ADR-001 CH-04 gap (about 115 min) is a measurement from the word map; the fact-checker confirms it before it goes on screen.
