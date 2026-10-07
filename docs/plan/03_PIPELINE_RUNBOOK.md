# 03 · Pipeline runbook (phase by phase)

Conventions:
- Every command below is something `tools/dc.py` wraps. `harness-engineer` implements `dc` in P0 and P1.
- Heavy jobs run through the queue (`tsp`).
- Paths are relative to the repo root. `data/` is git-ignored; `corpus/` is versioned.
- Each phase ends at its gate in [`06_QA_GATES_AND_DELIVERY.md`](06_QA_GATES_AND_DELIVERY.md).
- Each phase writes `docs/handoffs/PHASE-NN.md` and commits.

---

## P0 · Bootstrap & harness — gate G0

**Goal:** a working, measured environment and a scaffold any agent can operate. **Start the P1 downloads in the background first** (deadline).

1. **Deadline first.** `dc` doesn't exist yet, so run the six downloads directly as a background job:
   `curl -sS --retry 4 --retry-delay 2 -X POST https://temp.sh/<id>/<name>.zip -o data/raw/<name>.zip`, in parallel, with URLs from `docs/plan/inventory/archives.tsv`.
   Later, `dc ingest fetch` wraps the same logic for re-runs.
   If any link returns HTML or 404, the archive has expired. Tell the user immediately with the archive name and its SHA-256 so the re-upload can be verified.
2. **Scaffold.** Create the layout from `02_AGENT_SYSTEM.md` §9.1 and add a `.gitignore` covering `data/`, `logs/*.log`, `*.mp4`, `*.mov`, `*.wav`, `*.m4a`, `*.mp3`, models, `node_modules/` and `studio/out/`.
3. **`harness/setup.sh` (idempotent).**
   - **apt:** `ffmpeg sox task-spooler parallel jq tesseract-ocr tesseract-ocr-ara libraqm0 fonts-dejavu-core`.
     Check `ffmpeg -encoders | grep -E 'libx264|libx265|libsvtav1'` and `ffmpeg -filters | grep libvmaf`.
     If anything is missing, install a static ffmpeg 7.x build into `tools/bin/`.
   - **Python (uv venv `.venv`):**
     - audio and alignment: `faster-whisper`, `ctc-forced-aligner`, `torch torchaudio` (CPU), `silero-vad`, `librosa`, `soundfile`, `pyloudnorm`, `praat-parselmouth`, `demucs`, `speechbrain`, `torchmetrics[audio]`;
     - text and graph: `FlagEmbedding` or `sentence-transformers`, `faiss-cpu`, `hdbscan`, `networkx`, `rapidfuzz`, `camel-tools`, `pyarabic`;
     - parsing, schemas and images: `pydantic`, `jsonschema`, `beautifulsoup4`, `lxml`, `playwright`, `numpy`, `pandas`, `pyarrow`, `pillow`, `opencv-python-headless`, `scikit-image`, `pedalboard`;
     - optional: `manim`.
   - **Node 22, `studio/`:**
     - core: `remotion`, `@remotion/cli`, `@remotion/three`, `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`;
     - Remotion add-ons: `@remotion/transitions`, `@remotion/media-utils`, `@remotion/paths`, `@remotion/shapes`, `@remotion/noise`, `@remotion/motion-blur`;
     - tooling: `zod`, `typescript`, `pixelmatch`.
     If Remotion cannot download its headless shell, point it at the preinstalled Chromium: `--browser-executable` under `/opt/pw-browsers/`.
   - **Fonts (OFL), into `studio/public/fonts/`:**
     - IBM Plex Sans Arabic merged (`PlexAR-*.ttf` from the archive) and IBM Plex Mono;
     - the ADR-003 candidates (Alexandria, Readex Pro, Inter Tight, Space Grotesk, JetBrains Mono).
     Copy them from the archives where present; otherwise download them from Google Fonts' GitHub repos.
   - **Models**, pre-fetched into `data/models/`:
     - Whisper `large-v3` and `large-v3-turbo` (CTranslate2);
     - the MMS forced aligner;
     - `BAAI/bge-m3`;
     - Demucs `htdemucs`;
     - ECAPA speaker model.
   - **Network hosts this needs:** pypi, npm, huggingface.co (+ its CDN), github.com, dl.fbaipublicfiles.com (Demucs), and optionally johnvansickle.com (static ffmpeg).
     If a host is blocked, read the environment network documentation and tell the user exactly which host to allow.
4. **`dc` skeleton + state.** Create `harness/state/progress.json` (phase P0), `decisions.json` and `budget.json`. Implement `dc state brief|snapshot`.
5. **Schemas.** Write `harness/schemas/*.schema.json` from `05_DATA_CONTRACTS.md`, then add the hook scripts. Merge `docs/plan/harness/settings.hooks.json` into `.claude/settings.json`.
6. **Benchmarks** (into `budget.json`).
   - Remotion `still` and `render` of 3 test compositions at 1080p for 150 frames each: 2D typography, CSS-glow particles, R3F scene with bloom at `--gl=swangle`. Record s/frame at concurrency 1, 2 and 3.
   - faster-whisper real-time factor on 60 s of S1 (`large-v3`, `large-v3-turbo`, int8).
   - Disk free, RAM, `nproc`.
7. **Upload-path smoke test.** Upload a 1 KB text file to `https://x0.at/` and `https://temp.sh/upload`, download it back, and compare SHA-256.
   If either host is blocked, record that as a P14 risk now and tell the user.
8. **Workflows.** Run `/workflow-authoring` once. Adapt `docs/plan/workflows/*.js` to the installed version.
9. Commit with the message `G0: harness ready`.

---

## P1 · Ingest & forensics — gate G1 ⚠ before 2026-10-10 08:00 UTC

1. **Verify.** Run `sha256sum` on each zip and compare with `archives.tsv`. On a mismatch, re-download once, then escalate.
2. **Extract safely** (`dc ingest extract`), using the same convention as the recon.
   - Each archive `X.zip` expands to `data/extracted/X.zip.d/`. Nested `Y.zip` / `Y.tar.xz` expand to sibling `Y.zip.d/` / `Y.tar.xz.d/`, and the inner archive file is then removed.
   - Sanitize paths (no absolute paths, no `..`, no symlinks).
   - **Skip, and never write to disk,** any member whose path contains `.ssh`, `id_ed25519`, `known_hosts` or `.sudo_as_admin_successful`. Record the skips in `corpus/catalog/quarantine.json` by archive path only.
3. **Dedupe and catalog.** Hash every file (sha1 + sha256) and pick the canonical path (shortest; ties lexicographic).
   Write `corpus/catalog/files.jsonl` with `file_id`, every path, category, bytes, `archive_chain` and `canonical`.
   Reconcile with `docs/plan/inventory/unique_files.tsv`; the expected count is 1,119 unique files. Explain any difference.
4. **Media integrity.** For each unique media file, run `ffmpeg -v error -i f -f null -` and count errors; collect `ffprobe` metadata. Write `corpus/catalog/media.jsonl`.
   Expected finding: `DA_Camp_Master_70m05_v7_final.mp4` is corrupt.
5. **Lineage.** Group documents into version families (`master.md` 59:30 vs 70:05; narration packs; HTML families per `DA_Camp_Artifact_Analysis*.md`).
   Write the diff summaries to `corpus/catalog/lineage.json`.
6. **Disk hygiene.** Keep the raw zips until G3. Move the legacy MP4s you need as references into `data/extracted/` and leave the rest catalogued.
7. **Optional durable cache (ask the user first).** `dc ingest cache-push` tars the *derived* corpus: audio, text, HTML, slides, fonts and code, about 0.6 GB, **excluding secrets**. It splits the tar into ≤ 450 MiB parts so each part keeps about 40 days on x0.at, uploads them, and records URL + SHA-256 in `corpus/catalog/cache.json`.
   `dc ingest cache-pull` restores the corpus after the temp.sh links have expired.

---

## P2 · Corpus distillation — gate G2 (runs alongside P3)

Agents: context-engineer (text), visual-librarian (images), graph-engineer (canon structures).

1. **Text normalization.** Convert MD/TXT/JSON/CSV/SRT/VTT/ASS to UTF-8 NFC and chunk by heading.
   Write `corpus/text/chunks.jsonl`: `chunk_id`, `doc_id`, `heading_path`, `lang`, `text`, `char_span`.
   For search, also store a normalized variant with alef/yaa/taa-marbuta folded and tatweel and diacritics stripped. The original text stays intact.
2. **Canon from `master.md`** (`corpus/canon/`):
   - `chapters.json`: 37 chapters × (timecode, act, objective, patterns, shot list rows, labels AR/EN, narration AR/EN, prediction, failure beat, callback, artifact);
   - `data_contract.json`: every §6 number, with an ID and its chapter;
   - `glossary.json`: §10 terms, never-translate list, pronunciation notes, register rules;
   - `coverage_index.json`: §12;
   - `assets_registry.json`: §9, including the six permitted 3D scenes;
   - `patterns.json`: P01–P22 with definitions.
3. **NotebookLM canon.** Parse the 25 part sources (T3): scenes with 🎬 on-screen, 🎞️ animation, narration, numbers, terms and questions.
   Write `corpus/canon/nblm_scenes.jsonl` (expected 351 scenes). Also parse the per-part 🎬 directions in `DA_Camp_00_Unified_Master_Full_Egyptian.md`.
4. **Other scripts.** Register T4–T7, each with lineage and with sentences split.
   Ingest the `*_EDITABLE_STANDALONE.html` cue sets (`DA_SCENES` + 637 `DA_CAPTIONS_EN` cues) into `corpus/canon/cues_70m05.json`.
5. **HUB / knowledge.**
   - Index `DA_Camp_KNOWLEDGE.md` by heading into the retrieval store. Do not load it whole.
   - Extract the "Visual Crash Course — 79 animated steps" into `corpus/canon/crash_course_steps.jsonl`.
   - Extract Mermaid blocks, code snippets and lab names from the top builds (`DA-Camp-Lab_M12-DS.html`, `DA_Camp_SUPREME_FINAL2.html`, `FUSION-standalone.html`, `DA-Camp-Unified.html`, `NilePay-Data-AI-Study-Journey.html`).
   - Playwright: open each top build offline. Screenshot up to 60 key lab and animation states per build into `data/derived/hub_shots/`. If the build depends on a blocked CDN, keep the text only.
6. **Legacy picture pipelines.** Parse `scenes_a–d.py` and `scenes_common.py` (and LMArena `story.json`) without executing them; use `ast` and static reads.
   Write `corpus/canon/legacy_shots.jsonl`: chapter, shot index, kind, data, title.
   Record the 25 pattern renderers' names and parameters as *visual idea* entries.
7. **Visual assets.**
   - Keyframes from legacy renders: `ffmpeg -vf "select='gt(scene,0.25)',showinfo,scale=640:-1"`, keeping timestamps.
   - The NotebookLM slides (519) already carry timestamps in their filenames.
   - `dc visual ocr` runs tesseract `ara+eng`.
   - `dc visual caption` runs visual-librarian agents in batches of 15 images and returns JSON: caption EN/AR, depicted concepts, layout, the "reusable idea" in one line, and text seen.
   - Write `corpus/visual/assets.jsonl`.
8. **Corpus maps.** Write `corpus/maps/*.md`: the summary hierarchy agents read before searching.

---

## P3 · Audio truth — gate G3 (CPU-heavy; queued; runs alongside P2)

Agents: audio-forensics, transcription-aligner.

1. **Normalize for analysis.** Convert each unique audio file to `data/derived/audio/<audio_id>.wav` at 16 kHz mono for ASR and alignment, and at 48 kHz mono 24-bit for editing.
   For S4, the source is the MP3 (already extracted from the NotebookLM videos). Cross-check one part against its MP4 audio stream to make sure they are identical.
2. **QA profile per file** (`corpus/audio/assets.json`):
   - integrated LUFS, LRA, true peak;
   - speech ratio (Silero VAD);
   - pause histogram;
   - noise floor in VAD-silent regions;
   - bandwidth (99 % rolloff);
   - clipping count;
   - music-bed score (non-speech energy and harmonicity);
   - speaker count (ECAPA embeddings on 3 s windows, then agglomerative clustering);
   - quality proxies (DNSMOS via torchmetrics, UTMOS): compare *relative* only, since they are English-trained.
3. **Separation.** If the music-bed score is high (expected for S2 Esraa), run Demucs `htdemucs --two-stems vocals` and keep both stems. Re-profile the vocals stem.
4. **ASR calibration** (decides the model for unscripted audio).
   - Use 10 minutes of S1 spread across 5 chapters, with reference text T1 §8 Egyptian narration (TTS-cleaned T6 where available).
   - Run faster-whisper `large-v3` and `large-v3-turbo` with `language="ar"`, `word_timestamps=True`, `vad_filter=True`, and `initial_prompt` = the 60 most frequent glossary terms (Latin form).
   - Report CER/WER with normalization (Arabic folding; Latin terms case-folded) and record it in `reports/asr/calibration.md`.
   - Pick the model with the best CER that fits the budget.
5. **Transcribe** S2 (vocals stem), S4 (26 + alternate P00) and S1 (for verification) with the chosen model. Write `corpus/transcripts/<audio_id>.asr.json`.
6. **Forced alignment.**
   - **Scripted audio** (S1 ↔ T1/T6; S3 ↔ `dacamp/tts`; S5 ↔ T1 EN): align the *script text* to audio per chapter window, using `ctc-forced-aligner` (MMS-300m, `language=ara`/`eng`, romanized via uroman) or torchaudio `MMS_FA`.
   - **Unscripted audio** (S2, S4): first polish the transcript (step 7), then align it.
   - Output per word: `start_ms`, `end_ms`, `conf`, `method`.
7. **Transcript polishing (LLM, glossary-guided)** for S2/S4.
   - Fix Latin technical terms written in Arabic script (for example كافكا → Kafka when `master.md` §10 says "always English").
   - Fix numbers and obvious mishearings, using retrieval over T2/T3 for the same part.
   - **Never paraphrase.** Every change keeps a mapping to the original ASR word indices. Re-align after polishing.
8. **Sentences** (`corpus/sentences/<audio_id>.jsonl`).
   - Segment on Arabic/Latin punctuation, plus pause ≥ 350 ms, plus a 28-word cap. An LLM pass merges or splits by meaning.
   - Tag each sentence: `kind` (claim | example | question | prediction | transition | recap), `numbers`, `terms`, `entities`.
   - Store an English gloss per sentence (LLM). It feeds subtitles and agents that read English faster.
9. **Emphasis / impact words.** Compute a per-word prominence z-score (RMS dB + pitch range via `librosa.pyin`/Parselmouth + duration). Combine it with lexical priority: number > term > contrast word > verb of change. Keep the top candidates per sentence.
10. **Cross-checks.**
    - S1 alignment against the 37 chapter windows: every chapter's speech must sit inside its window.
    - S5 sentence onsets against the 637 English cue times in `cues_70m05.json`: median deviation ≤ 300 ms.
    - S1 speech against the cue windows: ≥ 90 % of it inside them (±500 ms).
    A larger offset means a systematic error.
    - S3 against its per-chapter SRTs.
11. Commit `corpus/transcripts`, `corpus/sentences` and `corpus/audio`. Do not commit the WAVs.

---

## P4 · Semantic graph — gate G4

Agent: graph-engineer, with context-engineer.

1. **Concepts.** Seed from the glossary, the coverage index, NotebookLM part titles and scene terms, and KNOWLEDGE headings.
   Normalize aliases across AR, EN and transliterations. Write `corpus/graph/nodes.jsonl` (`type=Concept`) with a definition in AR and EN and prerequisites.
2. **Embeddings.** Use bge-m3 dense vectors (plus its sparse lexical weights) for sentences, script units, NotebookLM scenes, chunks, visual captions and concept definitions. Store them in FAISS.
3. **Idea units.**
   - Candidate sentence pairs across sources with cos ≥ 0.80 (tune the threshold on a 200-pair hand-labelled sample by the Educator lens; target F1 ≥ 0.85).
   - Borderline pairs between 0.72 and 0.85 go to LLM adjudication ("same claim at the same level of detail?").
   - Connected components become `IdeaUnit` nodes, each with a representative sentence per source.
4. **Links.** `says` / `about` / `states` / `illustrates`. Visual candidates per idea unit come from top-k retrieval, then an LLM rerank with thumbnails in view.
5. **Analyses** into `reports/graph/`:
   - novelty matrix S4 part × S1 chapter (share of idea units in S4 not covered by S1);
   - coverage of curriculum concepts by each audio source;
   - contradictions between DataFacts;
   - prerequisite order of the trunk.
6. Export a Mermaid overview plus counts.

---

## P5 · Narrative assembly & audio lock — gate G5

Agents: story-editor; Council for ADR-001.

1. **Candidate EDLs** for the ADR-001 options (A, B, C, D), built automatically from the graph:
   - **B (default):** trunk = S1 chapters in order. After each trunk chapter, consider the matching S4 part segments, keeping *contiguous* runs of ≥ 20 s whose novelty is ≥ 60 %.
     Runs may be trimmed at sentence boundaries. Drop runs that only restate the trunk. Cap Deep-Dive voice switches at ≤ 2 per chapter. Order runs by prerequisite.
   - Compute for each EDL: runtime, novelty coverage, redundancy %, voice switches per hour, prerequisite violations, a mean audio-quality proxy, and the LLM-judge coherence score.
     For coherence, a judge agent reads the EDL as an ordered transcript (English glosses) and rates flow from 1 to 10 with reasons.
2. **Council ADR-001** with these numbers. If the result is "needs experiment", assemble 3-minute radio-edit samples of the top two and re-vote.
3. **Build the chosen EDL** (`corpus/edl/master_edl.vN.json`).
   - **Cut points:** only at pauses ≥ 250 ms. Keep ≥ 60 ms of room tone before a word onset and ≥ 90 ms after an offset. 20 ms equal-power crossfades at zero crossings.
   - **Gain:** match each segment to −16 LUFS (speech-gated) before the master normalization.
   - **Tone:** gentle EQ to match S4 to S1's average spectrum (clamped to ±4 dB), and room-tone fill under gaps. The Audio & Sync lens approves this by listening proxies (spectral distance before and after).
   - **Deep-Dive framing:** 1.5–2.5 s *visual* cards with a music sting at each switch. No new speech is synthesised.
   - **Chapters and acts:** titles in AR and EN for every chapter, including Deep-Dives (for example `DD-P14 · Backend from the inside`).
4. **Radio edit.** Render `data/derived/audio/master_vo_vN.wav` (48 k/24-bit) and listen by proxy:
   - re-run the aligner on 20 random windows: no word may be clipped (every word's start/end lies inside a kept region);
   - loudness per minute within ±1.5 LU;
   - no gap longer than 2.5 s except the planned cards.
5. **Lock.**
   - Freeze `master_edl.vN.json` + `master_vo_vN.wav` (record the SHA-256).
   - Map every kept word to record-timeline time. Word IDs are preserved; record time = EDL offset + source time.
   - Generate per-chapter audio features (RMS envelope, onset strength, spectral centroid; 30 fps arrays) in `corpus/edl/features/CH-xx.json`.
   - **Picture follows this lock.** A later change bumps the version, and the compiler re-times the specs automatically.

---

## P6 · Look-dev & Visual Bible freeze — gates G6a (look) and inputs to P7

Agents: motion-engineer, arabic-typographer, critic; Council for ADR-002/003/004.

1. **Six style frames** (Remotion stills, 1920×1080), one per family:
   - cold-open metaphor (NilePay receipts → table);
   - SQL funnel;
   - Kafka partitions;
   - vector galaxy (RAG);
   - Docker layer cache;
   - kinetic-typography-only frame.
   Each comes in 2–3 typography candidates and 2 FX intensities.
2. **Three 10-second motion tests:** typography impact on stressed words, camera push and parallax, and a transition. Measure render s/frame on each.
3. **Critic scoring** with the look rubric (`06` §3.2), then Council ADR-002 (stack/fps) and ADR-003 (look/typography), plus ADR-004 (captions) and ADR-005 (music/SFX).
4. **Freeze.** Write the design tokens (`studio/src/tokens.ts`), font files, motion presets, the FX tier table (lite / standard / hero) and the component prop schemas (zod, mirrored into `harness/schemas/components/*.json`).
   **This freeze is the contract between P7 and P8.**

---

## P7 · Component library & scene compiler — gate G6b

Agents: motion-engineer (one per component family, disjoint folders), arabic-typographer, critic.

1. **Components** from the catalog in [`04_VISUAL_BIBLE_V2.md`](04_VISUAL_BIBLE_V2.md) §8. Each component ships with:
   - a zod props schema, mirrored as JSON Schema;
   - a demo composition;
   - **snapshot tests**: stills at 0 %, 50 % and 100 % of its duration, diffed against approved baselines (pixelmatch threshold);
   - a performance budget: s/frame at 1080p at each FX tier, measured and recorded in `reports/perf/components.json`.
2. **Typography engine** (`studio/src/type/`).
   - Arabic and Latin shaping comes from the browser. Words are animated whole. Reveals use masks or clip-paths running right-to-left for Arabic.
   - Latin runs are wrapped in `dir="ltr"` isolates. `الـ` + Latin is joined with a tatweel (`الـKafka`). Western digits are used throughout.
   - Auto-fit to safe areas, with an overflow detector that fails the test.
3. **Scene compiler** (`studio/src/spec/`). A data-driven `SpecPlayer` composition:
   - reads `corpus/specs/<CH>.json` + the EDL + word timings;
   - resolves `at: {word, lead_frames}` anchors to frames for the requested fps;
   - validates props against schemas;
   - lays out shots with transitions;
   - mounts the camera rig, FX tier and audio-reactive modulators;
   - `calculateMetadata` sets the duration from the EDL;
   - preview mode = 960×540 at 15 fps with the lite FX tier.
4. **Pre-rendered loop pipeline** (`dc render plate <name>`): offline Three.js (or Blender, if available) renders of seamless 10 s loops for the heavy backgrounds (vector galaxy, neural core, Kafka river, data-center corridor, A-01 holo-city). Encoded as high-quality H.264, or VP9 with alpha where needed.

---

## P8 · Semantic storyboard — gate G7 (largest fan-out)

Agents: context-engineer (packs), scene-director (×N), fact-checker, arabic-typographer, critic. Workflow: [`workflows/storyboard.js`](workflows/storyboard.js).

1. **Packs.** `dc spec pack <CH>` builds a pack per chapter or Deep-Dive with the recipe in `02` §7.
2. **Golden-set eval.** 25 sentences across 10 topics.
   - Iterate the scene-director prompt and rules until the critic mean is ≥ 8.0 and every item is ≥ 6.
   - Freeze the winning rules in `corpus/rules/scene-director.house-rules.md`. The agent file tells the scene-director to read it, so the agent definition is never edited at runtime.
   - Record the eval in `reports/evals/golden_vN.md`.
3. **Authoring per chapter.** For each sentence:
   1. split it into *beats*: phrases of 1–4 s, cut at word boundaries;
   2. choose the **visual verb** for each beat (component + action) from the metaphor library, informed by the visual candidates in the pack;
   3. bind events to word IDs;
   4. pick kinetic words (≤ 6 on screen, ≤ 2 lines);
   5. set camera intent, transitions and SFX cues;
   6. reference data-contract IDs for every number.
   - The scene contract (problem → mental model → … → artifact) is tracked per chapter, not per sentence.
4. **Lint** (`dc spec lint`): schema; every sentence covered; density ≥ 20 events/min; no gap > 4 s without an event unless `hold`; all numbers and first-mention terms on screen; component props valid; FX-tier and 3D budget per chapter; no seconds anywhere.
5. **Independent verification.** Critic (storyboard rubric) + fact-checker + arabic-typographer, in a fix loop of at most 3 rounds with the 2-round no-progress rule.
6. **Global coverage loop** (L5) across the whole film, then the continuity pass (recurring assets, callbacks, A-01 progression).

---

## P9 · Preview renders, critique loops, pilot — gate G8

Agents: render-ops, critic, sync-verifier, scene-director, motion-engineer; Council for the pilot. Workflow: [`workflows/preview_qa.js`](workflows/preview_qa.js).

1. **Preview every chapter** at 960×540, 15 fps, lite FX, through the queue.
   For each: a contact sheet (1 frame per 2 s, 8×N grid), a motion strip (frame differences), and a sync overlay build that burns word timing only into previews.
2. **Automated metrics** (`dc qa chapter`): sync offsets, static stretches (frame-difference energy), event density, text legibility (size/contrast/safe area), Arabic shaping (renders of every on-screen string compared against an OCR roundtrip and glyph-coverage check), and flicker.
3. **Critic visual rubric** on contact sheets and strips. Fix loops (L4).
4. **Pilot.** CH-33 (RAG) followed by its Deep-Dive (P23), rendered at **final** quality.
   Council review at G8, using the rubric and an "AI Unpacked parity" read.
   **Post a link to the user** (temp.sh or x0.at) as an FYI checkpoint and continue unless they object.

---

## P10 · Hero plates (optional GenAI) — part of G8/G9

- Finish all pre-rendered loops at final quality.
- If ADR-006 allows it and keys exist, genai-artist generates **text-free** backplates. Prompts start from the style kernel in `04` §10, seeds are logged and licenses recorded.
  Each plate gets depth-map parallax (Depth-Anything-V2-Small on CPU), and the critic must approve it before use.

---

## P11 · Sound design & mix — gate G9a

Agent: sound-designer.

1. **Music bed** per act, following ADR-005. Melody-light, no percussion under dense explanation, tempo-free pads with risers into chapter cards. Stems: pads, pulses, stingers.
2. **SFX palette**, synthesized or CC0, about 20 sounds: soft whoosh ×3, tick, counter roll, impact (soft/hard), glitch (failure), settle (fix), UI blip, riser, reverse swell, data-stream hiss, shutter/snap.
   Loudness-normalized per sound. Record licenses in `docs/decisions/licenses.md`.
3. **Event-driven placement** from the specs' `sfx` cues plus automatic rules (transitions, counters, impact words, failure/fix).
   Density limiter: at least 350 ms between cues and at most 30 cues/min. When VO is active, SFX play −6 dB and stay out of the 1–4 kHz VO band where possible.
4. **Mix:**
   - VO (locked);
   - music, ducked by VO via sidechain to about −24 to −28 LUFS short-term under speech;
   - SFX.
   Master to −16 LUFS integrated, true peak ≤ −1.0 dBTP (two-pass `loudnorm` + `alimiter`). Write `data/derived/audio/mix/final_mix_vN.wav`.

---

## P12 · Final render — gate G9b

Agent: render-ops (L6 tick via `/loop`).

1. Render each chapter (or ≤ 9,000-frame slices of long chapters) at 1920×1080 and 30 fps, standard/hero FX tiers per spec:
   `--gl=swangle`, `--concurrency` from the benchmark, `--codec h264 --crf 16 --pixel-format yuv420p --muted`.
   Write a `manifest.json` per output.
2. **Per-chunk QA**, all automated:
   - exact duration in frames;
   - decode with 0 errors;
   - no black frames (unless planned), no frozen runs longer than 4 s (unless `hold`);
   - first and last frames look as expected (pixel stats).
   Failed chunks retry up to 2× with a fallback FX tier, and the critic must re-approve any fallback.
3. Disk hygiene as you go: delete preview renders of approved chapters and keep only the chapter mezzanines.

---

## P13 · Conform & full QC — gate G10a

1. **Concat** the chapters with the concat demuxer (stream copy, identical parameters), then mux the final mix.
2. **Subtitles:** a soft Arabic subtitle track (`mov_text`), plus `.srt`/`.vtt` sidecars, and an English track for the trunk if ADR-004 says so.
3. **Chapters:** add `ffmetadata` chapter markers.
4. **Metadata:** title, language `ara`, and description.
5. **`-movflags +faststart`**.
6. **Full QC** (L7):
   - a full decode with 0 errors;
   - `|video − audio| ≤ 1 frame`;
   - loudness and true peak;
   - sync spot-check: ASR word alignment on 20 random 30 s windows of the final file vs expected EDL times, median ≤ 40 ms and p95 ≤ 100 ms;
   - critic samples 1 frame every 30 s plus every chapter boundary;
   - Council final-cut sign-off.

---

## P14 · Encode ladder, upload, verification — gate G10

Agent: delivery-publisher. Details are in [`06`](06_QA_GATES_AND_DELIVERY.md) §5.

1. **Bitrate ladder test** on three 2-minute excerpts (typography-heavy, particle-heavy, 3D): x264 (tune animation) vs x265 at target bitrates, VMAF against the mezzanine. Pick per ADR-007.
2. **Encode:**
   - the temp.sh single file (≤ 3.8 GB);
   - x0.at direct-link volumes (≤ 950 MiB each, split at chapter boundaries);
   - a single x0.at file only if it fits at VMAF ≥ 93.
3. **Upload** with retries (2/4/8/16 s backoff).
   **Verify** by re-downloading and comparing SHA-256 (x0.at: GET; temp.sh: POST).
   Write `delivery/links.json` with URL, size, SHA-256, upload time and expected expiry. For x0.at the expiry is `3 + 97 × (1 − size/1024 MiB)²` days; for temp.sh it is 3 days.
4. **Report** to the user: links (with temp.sh flagged as a click-to-download page and x0.at as a direct link), checksums, expiry dates, runtime, chapter list, and known waivers.

---

## P15 · Archive & retrospective

- Commit specs, transcripts, graph, EDL, code and reports.
- Update `docs/memory/lessons.md`.
- Write `docs/handoffs/FINAL.md` (how to re-render any chapter, and how to cut an English trunk version later).
