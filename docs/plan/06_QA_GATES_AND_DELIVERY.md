# 06 · Quality gates, metrics, rubrics, and delivery

A gate is passed **only** by `python3 tools/dc.py gate check <G#>`, which writes `reports/gates/<G#>.json`.
A gate is waived **only** through an ADR. Thresholds below are the defaults; changing one requires an ADR.

---

## 1 · Gates

| Gate | After | Pass criteria (all must hold) |
|---|---|---|
| **G0** Harness | P0 | • `harness/setup.sh` re-runs cleanly<br>• `dc state brief` works<br>• all schemas present<br>• hooks proven: a deliberately invalid `corpus/` write is blocked; a quarantine read is blocked<br>• benchmarks recorded in `budget.json`<br>• upload smoke test recorded for x0.at and temp.sh<br>• P1 downloads started |
| **G1** Ingest | P1 | • 6/6 archives match the SHA-256 in `inventory/archives.tsv`<br>• unique-file count reconciled with `inventory/unique_files.tsv` (1,119, every difference explained)<br>• 0 quarantined files on disk<br>• media decode report done (corrupt files flagged)<br>• lineage report written |
| **G2** Corpus | P2 | • canon files validate: 37 chapters, 200 shots, data-contract facts, glossary, patterns<br>• ~351 NotebookLM scenes parsed<br>• cues_70m05 imported<br>• 100 % of slides, PNG scenes and keyframes captioned + OCR'd<br>• HUB harvest report<br>• corpus maps written<br>• 10 smoke queries return the expected source in the top 3 |
| **G3** Audio truth | P3 | • every audio asset profiled<br>• ASR calibration report written<br>• **scripted audio (S1/S3/S5):** median word conf ≥ 0.80 and ≥ 95 % of words agree within 120 ms across two aligners<br>• **S2/S4:** transcribed, polished, aligned; median conf ≥ 0.75; polishing changes logged<br>• S1 speech sits inside its 37 chapter windows<br>• S5 sentence onsets vs the 637 English cues: median abs deviation ≤ 300 ms<br>• ≥ 90 % of S1 speech falls inside the cue windows (±500 ms)<br>• sentences and emphasis computed |
| **G4** Graph | P4 | • idea-unit threshold validated (F1 ≥ 0.85 on 200 labelled pairs)<br>• 100 % of sentences linked to an idea unit and ≥ 1 concept<br>• ≥ 95 % of idea units have ≥ 3 visual candidates<br>• novelty, coverage and contradiction reports written |
| **G5** Audio lock | P5 | • ADR-001 decided<br>• EDL validates<br>• 100 % of unique idea units included or waived (ADR)<br>• redundancy ≤ 5 % (callbacks excluded)<br>• 0 prerequisite violations<br>• radio edit: 0 clipped words; per-minute loudness within ±1.5 LU; no unplanned gap > 2.5 s<br>• VO SHA-256 and word map generated<br>• FYI sample offered to the user |
| **G6a** Look | P6 | • ADR-002/003/004/005 decided<br>• style frames: look rubric mean ≥ 8.0 and AI-Unpacked parity ≥ 7.5<br>• tokens, presets and component catalog frozen<br>• projected final render time ≤ budget (default 24 h on the current box) or an ADR on fps, FX share or scale-up |
| **G6b** Components | P7 | • every catalog component implemented, or explicitly mapped/deferred<br>• snapshot tests pass<br>• perf budgets recorded<br>• Arabic type suite passes: shaping OCR roundtrip ≥ 0.9, 0 tofu glyphs, 0 overflow, BiDi cases, Western digits<br>• compiler resolves 100 % of anchors on the demo spec |
| **G7** Storyboard | P8 | • specs for 100 % of EDL chapters, lint-clean<br>• every sentence anchored<br>• all numbers and first-mention terms on screen<br>• ≥ 20 events/min per chapter<br>• fact-check: 0 critical, ≤ 2 minor per chapter<br>• Arabic copy approved<br>• critic storyboard rubric mean ≥ 8.0 per chapter<br>• global coverage loop: two clean rounds |
| **G8** Previews + pilot | P9 | • all chapters previewed<br>• per chapter: visual rubric mean ≥ 8.0, min ≥ 6; sync p95 ≤ 100 ms; max static ≤ 4.0 s (holds excepted); ≤ 3 flashes/s<br>• pilot (CH-33 + DD-P23) at final quality approved by the Council<br>• FYI link offered to the user |
| **G9a** Audio post | P11 | • final mix −16 ± 0.5 LUFS, TP ≤ −1.0 dBTP<br>• VO intelligibility: ASR WER on the mix ≤ WER on VO-only + 2 pts<br>• SFX density limits respected<br>• licenses logged |
| **G9b** Final render | P12 | • 100 % of chunks rendered and QA'd (frames exact, 0 decode errors, no unplanned black/frozen runs)<br>• fallback tiers re-approved<br>• disk hygiene done |
| **G10a** Final QC | P13 | • full decode with 0 errors<br>• \|video − audio\| ≤ 1 frame<br>• loudness OK<br>• sync spot-check on 20 windows: median ≤ 40 ms, p95 ≤ 100 ms<br>• critic frame sampling (every 30 s + chapter boundaries) passes<br>• chapters + Arabic soft subtitles present<br>• Council final-cut sign-off |
| **G10** Delivered | P14 | • ladder chosen (VMAF ≥ 93 at the chosen bitrate, or best under cap + ADR)<br>• every upload re-downloaded and SHA-256 matched<br>• `delivery/links.json` + `DELIVERY_NOTE.md` written<br>• user informed |

---

## 2 · Metric definitions (implemented in `dc qa`)

| Metric | Definition | Source |
|---|---|---|
| Visual event | A compiled-timeline entry that is a layer arrival or exit, state change, highlight, counter step, kinetic word, intentional camera move or cut | Compiler output (deterministic), cross-checked against frame-difference spikes in renders |
| Events/min | Events ÷ chapter minutes | Compiler |
| Static stretch | Longest run of consecutive frames whose mean absolute luma difference (320×180 downscale) is below τ (calibrated in P6, about 0.6/255), excluding `hold` shots | Render |
| Sync offset (picture) | For a sample of 200 word-anchored events per chapter: the detected visual onset (frame-diff spike in the event's bbox) minus the expected frame (`word_start − lead`) | Render + word map |
| Sync offset (final A/V) | Aligner word starts measured on the final mix minus the word-map times, over 20 random 30 s windows | Final file |
| Legibility | Minimum rendered font px, contrast ratio of text vs the sampled background, safe-area violations. From a debug pass that dumps DOM text boxes and computed styles | Debug render |
| Arabic shaping | Each unique on-screen Arabic string rendered alone → tesseract `ara` → normalized similarity ≥ 0.9; font cmap covers every codepoint (no tofu) | Type suite |
| Flashes | Luminance flashes per second (WCAG 2.3.1 limit: ≤ 3/s) | Render |
| Loudness | `ffmpeg -af ebur128=peak=true` integrated / LRA / true peak | Mix and final |
| VMAF | libvmaf `vmaf_v0.6.1` of the delivery encode vs the mezzanine, on 3 two-minute excerpts | Delivery |

---

## 3 · Rubrics (1–10 each; the critic must justify any score ≤ 6 with a shot ID)

### 3.1 Storyboard rubric (specs)

1. **Coverage & anchoring:** every sentence, number and term is anchored; nothing is time-based.
2. **Mechanism:** state changes show cause and effect; this is not decoration.
3. **Metaphor:** concrete, apt, consistent with the library and earlier chapters.
4. **Pedagogy:** scene contract present; prerequisites respected; failure → fix.
5. **Density & rhythm:** events/min, impacts on stressed words, holds where thinking is needed, variety.
6. **Accuracy:** claims and numbers match the data contract and sources.
7. **Continuity:** callbacks, recurring assets, A-01 progression, Deep-Dive identity.
8. **On-screen Arabic:** concise, idiomatic Egyptian, correct BiDi/terms policy.
9. **Feasibility:** catalog components only, within the FX/3D budget.
10. **Improvement over legacy:** clearly better than the best legacy idea for the same idea unit.

### 3.2 Look rubric (style frames, P6)

Composition · palette discipline · light and depth · typography · legibility · **AI-Unpacked parity** · render cost (inverse).

### 3.3 Visual rubric (previews, pilot, final samples)

1. Clarity of the subject.
2. Mechanism visible.
3. Look parity (premium, cinematic, consistent).
4. Typography (shaping, hierarchy, timing).
5. Camera & depth.
6. Rhythm & sync (impacts on words).
7. Accuracy.
8. Continuity & consistency.
9. Legibility.
10. Polish (no aliasing, banding, flicker, overlaps or empty panels).

**AI-Unpacked parity read (1–10):** depth & light · camera life · kinetic-type integration · metaphor concreteness · rhythm/impact.

---

## 4 · Container format of the master

- Video: H.264 High, 1920×1080, 30 fps (or the ADR-002 rate), yuv420p, BT.709 tags.
- Audio: AAC-LC 48 kHz stereo at 192 kbps for the master, re-encoded per delivery.
- Subtitles: Arabic soft track (`mov_text`, language `ara`), plus an optional English track (`eng`); `.srt`/`.vtt` sidecars.
- Chapters from the EDL (`ffmetadata`); metadata title, language and description.
- `-movflags +faststart`.
- Keyframes forced at every chapter start (`-force_key_frames` from the EDL) so volumes can be split exactly with stream copy.

---

## 5 · Delivery ladder (P14)

### 5.1 Size math

```
video_kbps = floor( (target_bytes × 8 / duration_s − audio_kbps × 1000) / 1000 × 0.97 )      # 3 % container margin
```

| Host | Limit | Target per file | Retention | Link type |
|---|---|---|---|---|
| temp.sh | 4 GB | **≤ 3.8 × 10⁹ bytes** | 3 days | Landing page → *Download* button (file served via POST) |
| x0.at | 1024 MiB | **≤ 950 MiB** (996,147,200 B) | `3 + 97 × (1 − size/1024 MiB)²` days (≈ 3.5 days at 950 MiB; ≈ 28 days at 500 MiB) | **Direct** (GET) |

Example for a 3 h film (10,800 s) and a temp.sh single file with 160 kbps audio: about **2,570 kbps video**.

### 5.2 Codec choice (ADR-007)

1. Encode three 2-minute excerpts (typography-heavy, particle-heavy, 3D) at the target bitrate with:
   - x264: `-preset slow -tune animation -profile:v high -pix_fmt yuv420p`, 2-pass;
   - x265: `-preset slow -tag:v hvc1`, 2-pass.
2. Measure VMAF against the mezzanine.
3. Choose H.264 if its VMAF is ≥ 93 (maximum compatibility). Otherwise use HEVC for the temp.sh file **and** H.264 volumes for x0.at.
4. AV1 (SVT-AV1) is allowed only if both fail and the user's playback supports it (state it in the note).

### 5.3 Files produced

- `delivery/DA_Camp_Illustrated_Film_AR_1080p.mp4`: the single file for temp.sh.
- `delivery/DA_Camp_Illustrated_Film_AR_1080p_volNN.mp4`: x0.at volumes, split at chapter boundaries with stream copy, each ≤ 950 MiB.
- If the whole film fits ≤ 950 MiB at VMAF ≥ 93, also `delivery/DA_Camp_Illustrated_Film_AR_1080p_x0.mp4` for one direct link.
- Sidecars: `.ar.srt`, `.ar.vtt` (+ `.en.*`), `chapters.txt` (YouTube-style timestamps), `SHA256SUMS`.

### 5.4 Upload and verification commands (retries 2/4/8/16 s on network errors only)

```bash
# temp.sh (single file)
URL=$(curl -sS --fail -F "file=@delivery/DA_Camp_Illustrated_Film_AR_1080p.mp4" https://temp.sh/upload)
curl -sS --fail -X POST "$URL" -o data/delivery_check/tempsh.mp4 && sha256sum data/delivery_check/tempsh.mp4

# x0.at (each volume; direct link)
URL=$(curl -sS --fail -F "file=@delivery/DA_Camp_Illustrated_Film_AR_1080p_vol01.mp4" -F "keep_name=1" -F "id_length=12" https://x0.at/)
curl -sS --fail -L "$URL" -o data/delivery_check/vol01.mp4 && sha256sum data/delivery_check/vol01.mp4
```

The guard hook allows uploads **only** to these two hosts, and only for files under `delivery/` (or the approved corpus cache).

### 5.5 `delivery/links.json`

```json
{"v":1,"film":"DA Camp × NilePay — The Illustrated Film (Egyptian Arabic)","runtime":"hh:mm:ss","chapters":0,
 "files":[{"host":"temp.sh","url":"…","kind":"single","bytes":0,"sha256":"…","verified":true,"uploaded":"…","expires":"…"},
          {"host":"x0.at","url":"…","kind":"vol01","bytes":0,"sha256":"…","verified":true,"uploaded":"…","expires":"…"}],
 "waivers":["ADR-0NN …"]}
```

### 5.6 Final message to the user (template)

```
✅ الفيلم جاهز — DA Camp × NilePay (مصري) · <runtime> · <N> chapters · 1080p<fps>

Direct link(s) (x0.at — plays/downloads directly):
  Vol 1 (CH-00 → CH-xx): <url>   sha256 <first 16>   expires ~<date>
  …
Single file (temp.sh — opens a page, press Download): <url>   sha256 <first 16>   expires <date, 3 days>

Chapters: <link to chapters.txt or inline list>
Subtitles: Arabic soft track (+ .srt)
Known waivers: <none | list>
```
