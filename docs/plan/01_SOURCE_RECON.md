# 01 · Source reconnaissance (what is actually in the six archives)

> Read-only reconnaissance done on 2026-10-07 while preparing this plan.
> **Done:** downloaded the six archives into an isolated scratch folder, hashed them, listed them recursively (zip-in-zip and tar.xz),
> extracted them with secrets skipped, de-duplicated by content hash, probed the media with `ffprobe`, measured loudness and speech share
> on the long narration tracks, read the key production docs, and grabbed three sample frames.
> **Not done:** no transcription, alignment, rendering, editing or uploading. The scratch copy is gone when this container is reclaimed,
> so the executor re-downloads in P1.
>
> Machine-readable snapshot: [`inventory/`](inventory/). Paths below use the extraction convention
> `<archive>.zip.d/…` (each nested archive `X.zip` is expanded into a sibling folder `X.zip.d/`).

---

## 1 · Archives

| Archive | Bytes | SHA-256 (first 16) | temp.sh expiry (≈ upload + 3 days) | Contains |
|---|---|---|---|---|
| `Chatgpt.zip` | 673,078,178 | `d79cda5bf0c0d2a5` | 2026-10-10 08:29 UTC | `Chatgpt_part1.zip`, `Chatgpt_part2.zip` |
| `ClaudeAndOthers.zip` | 1,308,704,061 | `d83a1122bd2fd5ad` | 2026-10-10 08:33 UTC | `Claude.zip`, `DA Camp Vedios_Others.zip`, `LmArena.zip` (**same as** the standalone LmArena.zip) |
| `LmArena.zip` | 508,344,726 | `d040306cc1b8e79c` | 2026-10-10 08:49 UTC | 3 × 70:05 masters, 2 sandbox workspace zips, `DA_Camp_Video_Sources_final.tar.xz` |
| `NotebookLM.zip` | 961,773,480 | `d730b77f33abf947` | 2026-10-10 08:59 UTC | `NotebookLM_part1/2/3.zip` (26 video overviews + Egyptian source set) |
| `DA_Camp_Videos_Files.zip` | 389,293,745 | `8c38e4f9c558a884` | 2026-10-10 08:01 UTC | Consolidated folder: NotebookLM extraction (audio/slides), LMArena film source, ChatGPT/Claude packs |
| `DA_Camp_HUB.zip` | 40,600,160 | `b1db6d40d4b3498e` | 2026-10-10 09:07 UTC | 21 HTML learning apps + `DA_Camp_SUPERCSET_CONTENT.md` |

Full hashes are in [`inventory/archives.tsv`](inventory/archives.tsv).
Download note: temp.sh serves the file only to an HTTP **POST**; a GET returns an HTML landing page. Use `curl -X POST <url> -o file`.
temp.sh does not honour Range requests. Measured throughput from this cloud container was about 30 MB/s; all six archives downloaded in about 1 minute.

**After recursive extraction:** 5,645 files → **1,119 unique contents, 3.08 GB**:

| Category | Unique files | Size |
|---|---|---|
| video (mp4) | 50 | 2,524 MB |
| audio (mp3/m4a) | 71 | 343 MB |
| html | 23 | 104 MB |
| text/doc (md, txt, srt, vtt, ass, csv, json, log) | 344 | 52 MB |
| image (jpg/png) | 576 | 39 MB |
| fonts (ttf) | 10 | 1.8 MB |
| code (py, sh) | 37 | 0.5 MB |
| other (wheels, gz, …) | 8 | 18 MB |

---

## 2 · Audio corpus (the master clock candidates)

| ID | File (canonical path) | Duration | Format | Measured | What it is |
|---|---|---|---|---|---|
| **S1** | `ClaudeAndOthers.zip.d/DA Camp Vedios_Others.zip.d/02_DA_Camp_AR_Natural_Audio.m4a` | 70:05 | AAC 48 k stereo | −16.0 LUFS · speech ≈ 2,746 s (65 %) · 680 pauses | **Natural Egyptian-Arabic narration recorded to the 37-chapter timeline.** The earlier delivery note measured speech-inside-caption 56.9 % vs speech-outside-caption 6.1 %, so it follows the picture. Script = `master.md` §8 Egyptian narration |
| S2 | `…/01_DA_Camp_AR_Esraa_Audio.m4a` | 70:05 | AAC 48 k stereo | −16.0 LUFS · only 9 s of silence | "Esraa" voice. Almost continuous signal, which suggests a **music bed under the voice**; not timed to the picture (−3.8 pt caption separation). Needs source separation + ASR to learn its exact script |
| S3 | `DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/LMArena/Folder 1/dacamp/vo/CH-00_0.mp3 … CH-36_0.mp3` (+ `CH-14_1`, `CH-33_1`) | 52:19 total | MP3 24 k mono | — | TTS (ar-EG, "voice-00") of the cleaned chapter scripts (`dacamp/tts/CH-nn_k.txt`). Per-chapter SRTs exist in `DA_Camp_Video_Sources/output_sidecars/` |
| **S4** | `DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/DA_Camp_NotebookLM/Audio_MP3/P00…P25_*.mp3` | 3:34:29 (+ 8:44 alt P00) | MP3 44.1 k mono, ~48–64 kbps VBR | P23 sample: −21.9 LUFS · 22 % silence · 152 pauses in 6:41 | NotebookLM video-overview narration extracted from the 26 part videos. Egyptian Arabic, conversational; unscripted relative to our texts (it was generated *from* the 25 part sources) |
| S5 | `…/03_DA_Camp_EN_Natural_Audio.m4a` | 70:05 | AAC 48 k stereo | −16.0 LUFS · speech ≈ 2,751 s | English natural narration of the same film |

NotebookLM parts (S4). Titles are from `DA_Camp_NotebookLM/inventory.md`:

| P | Topic | Dur | P | Topic | Dur |
|---|---|---|---|---|---|
| P00 | DA Camp × NilePay intro (2 renders) | 8:50 / 8:44 | P13 | Systems, web, APIs, security | 7:16 |
| P01 | Journey & visual language | 8:56 | P14 | Backend depth: Java, JDBC, Spring, concurrency | 7:48 |
| P02 | Machine, files & terminal | 6:37 | P15 | ETL, DAGs, Airflow, idempotency, quality | 9:49 |
| P03 | Linux admin I | 9:22 | P16 | Warehouse, star schema, OLAP, SCD | 7:39 |
| P04 | Linux admin II (operations) | 8:01 | P17 | Huawei DataCube & mobile-money reporting | 7:46 |
| P05 | Python I: values → collections | 9:31 | P18 | Hadoop (HDFS, YARN, MapReduce) & Spark | 9:47 |
| P06 | Python II: state, errors, tests, Git | 8:41 | P19 | Kafka & the NRT transaction journey | 8:43 |
| P07 | Python for data: pandas & databases | 7:54 | P20 | Reconciliation, D&IM testing, governance, DR | 7:37 |
| P08 | SQL I: relational model & query pipeline | 8:01 | P21 | ML: baseline, leakage, evaluation | 7:39 |
| P09 | SQL II: joins, windows, NULL, transactions | 8:59 | P22 | Deep learning, NLP, Transformers, LLMs | 8:02 |
| P10 | SQL III: indexes, plans, tuning, dialects | 8:12 | P23 | Embeddings, RAG & guarded agents | 6:41 |
| P11 | Analytics: dirty data, statistics, reporting | 8:38 | P24 | Ship it: Docker, CI/CD, cloud, observability | 7:57 |
| P12 | Software craft, OOP, patterns, DSA | 7:37 | P25 | Evidence, portfolio, career & close | 8:25 |

Every unique audio file and video, with its duration and format, is listed in [`inventory/media_probe.tsv`](inventory/media_probe.tsv).

---

## 3 · Script / text corpus

| ID | Canonical path | What it is | Use |
|---|---|---|---|
| **T1** | `DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/LMArena/Folder 3/film/master.md` (245 KB; 43 identical copies) | **Production bible v70:05.** Contents: §1 spec · §2 22 visual patterns · §3 motion · §4 scene contract · §5 narrative spine (ShopFlow + NilePay entity contract) · §6 **data contract** · §7 runtime map · §8 storyboard for 37 chapters / 200 shots with AR+EN narration · §9 recurring assets (A-01, six permitted 3D scenes) · §10 terminology & dialect policy · §11 captions · §12 coverage index · §13 provenance · §14 prompts · §15 QA gate | Canon for the trunk; script for S1/S3/S5 alignment |
| T1-old | `…/DA Camp vedio narration/partA.md … partF.md` | Earlier master version (runtime 59:30) split into 6 parts | Lineage diff only |
| T2 | `…/LMArena/Folder 1/uploads/DA_Camp_00_Unified_Narration_Egyptian.md` | Unified Egyptian narration: 351 scenes, ~15k words (~2 h at normal pace) | Semantic map for S4 |
| **T3** | `…/LMArena/Folder 1/uploads/DA_Camp_Part_01_of_25_…md` … `Part_25` + `DA_Camp_00_Unified_Master_Full_Egyptian.md` | NotebookLM source set: per scene 🎬 on-screen · 🎞️ animation · narration · numbers · terms · questions | **Visual directions** for Deep-Dives |
| T4 | `Chatgpt.zip.d/Chatgpt_part1.zip.d/DA_Camp_28min_Narration_Egyptian_Arabic_V2.md`, `…24min_Narration…`, `…28min_V2_Integration_Notes.md` | 28-min V2 cut (21 chapters) and 24-min cut | Alternate phrasing and condensed explanations |
| T5 | `ClaudeAndOthers.zip.d/Claude.zip.d/Claude/Folder 1/DA_Camp_Narration_Script_AR.md` (78 KB) + `DA_Camp_Unified_Illustrative_Video_Master_EN_AR.md` | Claude's Arabic film script | Likely script for S2; confirm with ASR |
| T6 | `Chatgpt…/ElevenLab/DA_Camp_70m05_ElevenLabs_Voice_Pack.zip.d/` (79 txt + `chapter_manifest.csv`); `arabic_voice_package` (74 txt + `chapter_voice_timing.csv`); `dacamp/tts/CH-nn_k.txt` | TTS-cleaned chapter scripts + per-chapter word counts (AR 6,753 words, EN 8,751 words) | Speech-clean text for forced alignment |
| T7 | `Chatgpt.zip.d/Chatgpt_part1.zip.d/DA_Camp_NotebookLM_Visual_Video_Master_Egyptian_Arabic.md` (1.7 MB), `…28min_Merged_Video_Master_Source.md` (1.8 MB) | Large merged "visual video masters" (Egyptian), including the visual-language chapter in Arabic | Visual ideas; Arabic phrasing of the patterns |
| K | `…/LMArena/Folder 1/DA_Camp_KNOWLEDGE.md` (**42 MB**, 1,507 headings) | Consolidated knowledge base of all HUB builds: design system, curriculum text, interactive labs & animations, engine internals, traces, **"Visual Crash Course — 79 animated steps"**, lesson content | Retrieval only (never load whole) |
| K2 | `…/LMArena/Folder 1/DA_Camp_Artifact_Analysis{,_B,_C,_D,_E}.md`, `DA_Camp_SPACE.md`; `DA_Camp_HUB.zip.d/DA Camp HUB/DA_Camp_SUPERCSET_CONTENT.md` | Prior static analysis of the HTML builds (ranked: `M12-DS` strongest app; `SUPREME_FINAL2` best content: 144 lessons, 95 deep dives) + curriculum spec (9 phases / 54 topics) | Saves re-analysis |
| C | `…/LMArena/Folder 1/0{1,2,3}_*_EDITABLE_STANDALONE.html` | "Reconstructed editable source" per audio master: `DA_SCENES` (37 chapter windows) + `DA_CAPTIONS_EN` (**637 sentence cues with start/end on the 70:05 timeline**) + 111 reference stills | Ready-made sentence-level timing to cross-check S1/S5 alignment |

---

## 4 · Visual corpus (ideas, data and references — not footage)

| ID | Where | Count | Notes |
|---|---|---|---|
| V1 | `master.md` §8 shot lists | 37 chapters · 200 shots | Exact on-screen data, labels (AR/EN), motion notes, predictions, failure beats, callbacks |
| V2 | T3 scene directions | 351 scenes | 🎬/🎞️ per scene, mapped to S4 topics |
| V3 | `DA_Camp_NotebookLM/Scene_Photos/P**/scene_XXXXs_MMmSSs.jpg` + `Contact_Sheets/` | 519 slides + 27 sheets | Whiteboard-style slides with source timestamps, so we know what NotebookLM showed when |
| V4 | `…/uploads/scene_01.png … scene_21.png` (= `DA_Camp_28min_V2_Production_Pack/da_camp_video_v2/`; 10 copies each) + `stills/0*.png` (5 Claude-film frames) | 21 + 5 | Scene PNGs of the 28-min cut + reference stills |
| V5 | `DA_Camp_HUB.zip.d/DA Camp HUB/*.html` (21 files; `M12_RC2_DS` = `M12_RC2` and `M12` = `baseline_M12_RC` byte-for-byte) + LMArena `uploads/` copies | 19 unique apps (+ 3 standalone cue HTMLs + NotebookLM `gallery.html` = 23 unique HTML) | React/Vue/GSAP/Pixi/Mermaid/Prism apps. FUSION (22.8 MB) and Unified (18.8 MB) are the richest; they contain interactive labs, Mermaid diagrams, code, and SVG/canvas visuals |
| V6 | `LMArena/Folder 3/film/` = Claude film source: `patterns.py` (25 renderers), `scenes_a–d.py` (per-shot spec: kind + exact data), `engine.py` (tokens, Arabic-aware text), `film.py`, `voice_integrate.py`, fonts `PlexAR-400…700`, `Mono-400…700` (OFL) | 1 pipeline | Best prior picture pipeline (Pillow + raqm → ffmpeg, 1080p24) |
| V7 | `LMArena/Folder 2/dacamp/` (`viz.py`, `viz2.py`, `scene.py`, `story.json` 282 KB, `audit.py`, `MANIFEST.md`) | 1 pipeline | P01–P22 renderers + story graph (37 chapters, 200 beats, 580 caption sentences) |
| V8 | Prior renders (50 unique MP4s) | 50 | Claude film AR 1080p24 (8 parts + full + Esraa variant); ChatGPT 70m05 AR/EN 720p10; LMArena v5/v6/v7 720p10; 26 NotebookLM videos 720p24; 28-min V2 720p10; previews |

### Baseline quality (three sampled frames)

- **Claude film, CH-33 at 62:05.** Clean dark UI and a correct 2D "meaning as position" scatter. But it is mostly static, with long caption bars carrying the narration, a flat look, and BiDi friction in mixed Arabic+Latin captions.
- **NotebookLM P23.** Light whiteboard sketch slides with bullet lists: a slideshow aesthetic.
- **LMArena v7, CH-34.** HUD clutter, empty BEFORE/AFTER panels, overlapping header text, and an irrelevant "success rate 16.24 %" counter in a Docker scene. The file is also **corrupt** (about 23k decode errors in a 30 s window around 61:40).

**Conclusion:** none of the legacy renders meets the target look. The legacy material is valuable for **content, data, structure and visual ideas**, and the new film must be re-rendered from scratch.

---

## 5 · Lessons already paid for by earlier attempts (carry forward)

From `DELIVERY_NOTE.md`, `STATE.md`, `REPORT.md`, `Final_Verification_Report.md` and `Source_QA_Reconciliation.md`:

1. Arabic text **must** be shaped (HarfBuzz/raqm). Pillow without raqm renders disconnected letters. Noto Sans Arabic produced tofu for `—` and Latin runs in one build; IBM Plex Arabic merged fonts fixed this.
2. The ChatGPT "Arabic" masters are **picture-only**: no Egyptian narration was ever voiced on them (HeyGen ran out of TTS minutes).
3. S1 is the narration that matches the 70:05 picture. S2 (Esraa) is continuous talk not timed to the picture.
4. Sandbox resets destroyed builds kept in `build/`-style folders that the snapshot excluded. **Keep irreplaceable state in versioned paths** and regenerable output elsewhere.
5. Two parallel 1080p encoders plus a frame cache tripped the OOM killer on 2 GB machines. Render in bounded batches with a queue.
6. A merge bug once produced a 2 h 13 m file. **Always verify `video duration == audio duration`** per chapter and for the final film.
7. `master.md` has internal contradictions: CH-00/03/24 "Artifact: none" while §15 requires an artifact for every chapter, and CH-36 has no prediction. Preserve them, log them, and let the Council rule on them (ADR-008). Never rewrite silently.
8. Speech share for the TTS build was 0.75 (52:19 of speech in 70:05). Chapter durations were derived from the narration at 125 wpm (AR) and 135 wpm (EN) plus a 5 s prediction pause.

---

## 6 · Hazards found

| Hazard | Where | Action |
|---|---|---|
| **SSH private key** + known_hosts (sandbox) | `LmArena.zip.d/workspace-01a10cc4…zip.d/.ssh/id_ed25519` (+ `.pub`, `known_hosts`); `DA_Camp_Videos_Files…/LMArena/Folder 2/.ssh-id_ed25519`, `.ssh-known_hosts` (3 copies of the key) | Skip on extraction → `data/quarantine/` (or don't extract at all); never read, print, index, cache or upload. Tell the user once (rotate if it was ever authorised anywhere) |
| Sandbox junk | `.sudo_as_admin_successful`, `.whl` wheels, logs | Exclude from indexes |
| Corrupt media | `LmArena.zip.d/DA_Camp_Master_70m05_v7_final.mp4` | Mark `decode_ok=false`; don't use it as a reference for frames around the corrupt ranges |
| Picture-only masters | `DA_Camp_70m05_Picture_Master.mp4`, `…ARABIC_BurnedCaptions_VO_Pending.mp4`, `…Visual_Captioned_VO_Pending.mp4` | Visual reference only |
| Version drift | `master.md` 59:30 (partA–F) vs 70:05 | Lineage table in P2; canon = 70:05 |
| Mixed loudness/fidelity | S4 ≈ −22 LUFS at 48–64 kbps mono vs S1 −16 LUFS at AAC 48 k stereo | Loudness and EQ matching in P5; Council weighs this in ADR-001 |

---

## 7 · The 37-chapter trunk (from `master.md` §7)

Acts:
- **Orientation:** CH-00–02
- **Ground Zero:** CH-03–05
- **Python:** CH-06–09
- **SQL:** CH-10–14
- **Analytics:** CH-15–17
- **Craft & Systems:** CH-18–20
- **Platform:** CH-21–23
- **Big data:** CH-24–26
- **Domain:** CH-27–28
- **AI:** CH-29–33
- **Ship:** CH-34–36

Chapter lengths run from 75 to 165 s. Each act closes on a P20 zoom-out to the recurring architecture asset **A-01**.

The NotebookLM parts map onto these acts almost one-to-one: P02–P04 ↔ Ground Zero, P05–P07 ↔ Python, P08–P10 ↔ SQL, and so on.
P14 (Java/Spring backend) has **no dedicated trunk chapter**. P17 (Huawei DataCube reporting: 5-stage model build, 24 KPIs, report designer) goes far beyond the DataCube mention in CH-23. Both are the strongest Deep-Dive candidates. The P4 novelty matrix will confirm this and find the rest.
