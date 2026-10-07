# 05 · Data contracts (schemas, IDs, units)

P0 turns each block below into `harness/schemas/<name>.schema.json` (JSON Schema 2020-12). The `PostToolUse` hook validates every write under `corpus/**`.
Every record also carries `"v": <schema_version>`.

## 0 · Conventions

| Thing | Convention |
|---|---|
| Time in source audio | integer **milliseconds** from the start of that source file |
| Time on the record (film) timeline | integer **frames** at the EDL fps (30). `frame = round(ms × fps / 1000)` only through `tools/dc.py time` helpers |
| Scene timing | **word anchors** (`word_id` + `lead_frames`); seconds or frames are forbidden in specs |
| Text | UTF-8, NFC. Arabic is kept as authored; a normalized copy lives only in search fields |
| Languages | `ar-EG` (Egyptian Arabic), `en`; mixed segments carry `lang_mix: true` |
| Paths | repo-relative; large files under `data/` (never committed) |
| Hashes | `sha256` for integrity; `sha1` (first 12 hex) inside IDs |

### IDs (stable, greppable)

| Entity | Pattern | Example |
|---|---|---|
| file | `f:<sha1-12>` | `f:519039775c27` |
| audio asset | `a:<family>:<slug>` | `a:S1:ar-natural`, `a:S4:P23` |
| word | `w:<audio>:<6-digit index>` | `w:S4:P23:000417` |
| sentence | `s:<audio>:<4-digit index>` | `s:S1:ar-natural:0381` |
| idea unit | `iu:<5-digit>` | `iu:00412` |
| concept | `c:<kebab-slug>` | `c:consumer-lag` |
| data fact | `d:<master §>:<n>` | `d:6.18:3` |
| visual asset | `v:<file-sha1-12>[@<ms>]` | `v:3fa9c0d1e2b7@196000` |
| chapter | `CH-NN` (trunk), `DD-PNN[-k]` (Deep-Dive) | `CH-33`, `DD-P23` |
| shot | `<chapter>-S<NN>` | `CH-33-S07` |
| ADR | `ADR-0NN` | `ADR-001` |

---

## 1 · `catalog/files.jsonl`

```json
{"v":1,"file_id":"f:519039775c27","sha256":"…","bytes":70756228,"category":"audio",
 "paths":["ClaudeAndOthers.zip.d/DA Camp Vedios_Others.zip.d/02_DA_Camp_AR_Natural_Audio.m4a"],
 "canonical":"ClaudeAndOthers.zip.d/DA Camp Vedios_Others.zip.d/02_DA_Camp_AR_Natural_Audio.m4a",
 "archive_chain":["ClaudeAndOthers.zip","DA Camp Vedios_Others.zip"],"decode_ok":true,"notes":""}
```

Companion files:
- `catalog/media.jsonl`: `ffprobe` facts and decode error count.
- `catalog/quarantine.json`: archive path and reason only, never contents.
- `catalog/lineage.json`: version families and diff summaries.

## 2 · `audio/assets.json` (one entry per audio asset)

```json
{"v":1,"audio_id":"a:S1:ar-natural","file_id":"f:519039775c27","family":"S1","lang":"ar-EG",
 "duration_ms":4205000,"sr":48000,"channels":2,
 "qa":{"lufs_i":-16.0,"lra":7.1,"tp_dbtp":-1.2,"speech_ratio":0.65,"pauses":680,"noise_floor_db":-62,
       "bandwidth_hz":17800,"clipping":0,"music_bed_score":0.04,"speakers":1,"dnsmos":3.4,"utmos":3.6},
 "stems":{"vocals":null},"script_ref":"T1","alignment":{"method":"mms_fa","median_conf":0.91},
 "role":"trunk"}
```

`role` is one of `trunk | deep-dive | reference | unused`, decided in ADR-001.

## 3 · `transcripts/<audio_id>.words.jsonl`

```json
{"v":1,"word_id":"w:S4:P23:000417","audio_id":"a:S4:P23","i":417,"text":"الـembeddings","norm":"ال embeddings",
 "start_ms":183420,"end_ms":184010,"conf":0.88,"method":"asr+mms_fa","is_term":true,"term":"c:embedding",
 "is_number":false,"prominence":1.7,"polish":{"orig":"الامبدنجز","rule":"glossary"}}
```

## 4 · `sentences/<audio_id>.jsonl`

```json
{"v":1,"sent_id":"s:S4:P23:0052","audio_id":"a:S4:P23","w_from":"w:S4:P23:000410","w_to":"w:S4:P23:000431",
 "start_ms":182900,"end_ms":191300,"pause_before_ms":420,"text":"…","gloss_en":"…",
 "kind":"claim","numbers":[],"terms":["c:embedding","c:semantic-search"],"entities":[],
 "impact_words":["w:S4:P23:000417","w:S4:P23:000425"],"idea_unit":"iu:00412",
 "script_match":{"doc":"T3:Part_23","scene":"P23-sc07","score":0.81}}
```

`kind` is one of `claim | example | question | prediction | transition | recap`.

## 5 · Graph: `graph/nodes.jsonl` and `graph/edges.jsonl`

```json
{"v":1,"id":"c:consumer-lag","type":"Concept","label_ar":"الـlag","label_en":"consumer lag",
 "aliases":["lag","اللاج"],"def_ar":"…","def_en":"…","requires":["c:kafka-offset"],"sources":["T1:CH-26","T3:P19-sc04"]}
{"v":1,"src":"s:S4:P19:0033","dst":"iu:00877","type":"says","w":1.0,"evidence":"cos=0.86; adjudicated=same"}
```

Node types: `Source | Document | Section | AudioAsset | Sentence | IdeaUnit | Concept | Entity | DataFact | VisualAsset | Pattern | Component | Shot | Chapter | Act`.

Edge types: `contains | version_of | says | about | requires | illustrates | states | contradicts | uses | anchored_to | duplicates | callback_to`.

## 6 · `visual/assets.jsonl`

```json
{"v":1,"asset_id":"v:3fa9c0d1e2b7@196000","file_id":"f:3fa9c0d1e2b7","kind":"slide",
 "source":"S4:P01","t_ms":196000,"caption_en":"…","caption_ar":"…","ocr":"…",
 "concepts":["c:visual-language"],"layout":"title+3 bullets+icon","reusable_idea":"…",
 "reuse_mode":"reference","quality":2}
```

- `kind` is one of `slide | legacy_shot | hub_section | mermaid | code | py_pattern | png_scene | render_keyframe`.
- `reuse_mode` is one of `reference | data | do-not-use`. Legacy pixels are never `footage`.

## 7 · `edl/master_edl.vN.json`

```json
{"v":1,"version":"v1","fps":30,"sr":48000,"total_frames":0,"vo_wav":"data/derived/audio/master_vo_v1.wav","vo_sha256":"…",
 "chapters":[{"id":"CH-00","kind":"trunk","title_ar":"…","title_en":"Cold open","act":"Orientation",
              "start_frame":0,"end_frame":2850}],
 "segments":[{"seg_id":"seg-0001","chapter":"CH-00","audio_id":"a:S1:ar-natural",
              "src_in_ms":0,"src_out_ms":95000,"rec_in_frame":0,"rec_out_frame":2850,
              "sentences":["s:S1:ar-natural:0001","…"],"fade_in_ms":20,"fade_out_ms":20,"gain_db":0.0,
              "eq":null,"role":"trunk","notes":""},
             {"seg_id":"seg-0002","chapter":"DD-P00","audio_id":null,"role":"card","rec_in_frame":2850,
              "rec_out_frame":2910,"notes":"Deep-Dive entry card + sting"}],
 "word_map":"edl/word_map.v1.jsonl"}
```

`word_map` lines look like `{"word_id":"…","rec_start_frame":…,"rec_end_frame":…}`. They are generated at lock time and are the only timing source for picture.

## 8 · `specs/<chapter>.json` (scene spec, written by scene-director)

```json
{"v":1,"chapter":"CH-33","edl_version":"v1","fx_budget":{"hero_max_ratio":0.15},
 "continuity":{"a01_district":"AI","entering_from":"CH-32","recurring":["vector-galaxy"]},
 "shots":[{
   "shot_id":"CH-33-S07","sentences":["s:S1:ar-natural:0612","s:S1:ar-natural:0613"],
   "intent":"Semantic search finds meaning, not words",
   "concepts":["c:embedding","c:semantic-search","c:cosine-similarity"],
   "metaphor":"Query probe enters a galaxy of meaning; nearest stars ignite",
   "layout":"fullbleed-3d","fx_tier":"hero",
   "camera":{"move":"push_in","ease":"inOutCubic","intensity":0.6},
   "layers":[
     {"component":"LoopPlate","props":{"plate":"vector-galaxy-a"}},
     {"component":"VectorGalaxy","props":{"clusters":["payments","refunds","fraud"],"seed":33}},
     {"component":"KineticWord","props":{"text":"المعنى","preset":"impact"},"at":{"word":"w:S1:ar-natural:004871","lead_frames":3}},
     {"component":"TermChip","props":{"term":"semantic search","gloss_ar":"بحث بالمعنى"},"at":{"word":"w:S1:ar-natural:004880","lead_frames":3}},
     {"component":"VectorGalaxy.highlightNeighbors","props":{"k":3,"scores_ref":"d:6.18:1"},"at":{"word":"w:S1:ar-natural:004886","lead_frames":2}}
   ],
   "holds":[],
   "sfx":[{"cue":"whoosh_soft_2","at":{"word":"w:S1:ar-natural:004871","lead_frames":4}}],
   "transition_out":{"type":"LightStreakTransition","frames":12},
   "data_refs":["d:6.18:1"],"legacy_refs":["v:1d0c…@3725000","legacy:CH-33#2"],
   "scene_contract_beat":"progressive_visual"}]}
```

Lint rules (`dc spec lint`):
- no numeric time fields;
- every `at.word` exists in the EDL word map and lies inside the shot's sentences;
- every component name and props validate against the frozen catalog;
- every number shown has a `data_refs` or `source sentence` reference;
- the density and coverage targets from `04` §5 are met;
- the hero-tier share is within budget.

## 9 · `render/jobs.jsonl` (queue ledger)

```json
{"v":1,"job_id":"r-CH-33-final-1","chapter":"CH-33","tier":"final","frames":[0,4199],"engine":"remotion",
 "cmd":"…","tsp_id":42,"status":"done","attempts":1,"mem_gb":5,"expected_gb":0.4,
 "out":"data/renders/final/CH-33.mp4","sha256":"…","qa":{"frames_ok":true,"decode_errors":0,"frozen_runs":0}}
```

## 10 · `reports/qa/<tier>/<chapter>.rN.json`

```json
{"v":1,"chapter":"CH-33","tier":"preview","round":1,
 "metrics":{"events_per_min":27.4,"max_static_s":3.1,"sync_median_ms":18,"sync_p95_ms":61,
            "legibility_min_px":30,"contrast_min":5.2,"arabic_shaping_ok":true,"flicker_events":0},
 "rubric":{"clarity":8,"mechanism":9,"look":8,"typography":8,"camera":7,"rhythm":8,"accuracy":10,"continuity":8,"arabic":9,"sync":9},
 "issues":[{"shot_id":"CH-33-S09","severity":"major","problem":"…","fix_hint":"…"}],
 "verdict":"pass","reviewer":"critic"}
```

## 11 · `harness/state/progress.json`

```json
{"v":1,"phase":"P3","gates":{"G0":{"status":"pass","report":"reports/gates/G0.json"},"G1":{"status":"pass"},
 "G2":{"status":"running"},"G3":{"status":"pending"}},
 "counters":{"sentences":0,"idea_units":0,"shots":0,"frames_final":0},
 "blockers":[],"next_actions":["P3.4 ASR calibration on S1"],"updated":"<iso8601 passed in by the tool>"}
```

## 12 · ADR template (`docs/decisions/ADR-0NN-<slug>.md`)

```
# ADR-0NN — <title>
Status: decided | needs_experiment | superseded by ADR-0MM
Context: …  (links to evidence)
Options: A … / B … / C …
Scores: table (criterion × option, weights, per-lens)
Decision: …
Rationale: …
Dissent (verbatim): …
Reversal triggers: …
Consequences / follow-ups: …
```
