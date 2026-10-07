# PHASE-03a handoff: audio decode and QA, S2 identification, S1 forced alignment, ASR calibration, S4 ASR launched

Date 2026-10-07. Author: transcription-aligner + audio-forensics. Scope: docs/plan/03 P3.1-P3.6 for S1 and the S4 launch. Not done here: P3.7 polishing, S2/S3/S5/S4 alignment, sentences, emphasis, the S5 and S3 cross-checks, gate G3.

## What exists now

| Output | Path | Notes |
|---|---|---|
| 16 kHz mono WAV, 71 assets (0.94 GB) | data/derived/audio/16k/a_<family>_<slug>.wav | git-ignored; manifest.json beside them. Decode is `dc audio decode` (idempotent). 48 kHz editing WAVs not made (P5 on demand, disk). |
| Per-asset QA profile | corpus/audio/assets.json (71 entries, schema audio_assets), reports/audio/sources.md | per-asset detail incl. 1/3-octave LTAS in data/derived/audio/qa/*.json; VAD segments in data/derived/audio/vad/*.json |
| S2 script identification | corpus/audio/s2_script_id.json | `dc audio identify-s2` |
| Voice identity across assets | corpus/audio/voices.json | `dc audio voices` |
| EQ curve S4 to S1 (clamped +-4 dB) | corpus/audio/eq_match_s4_to_s1.json | for P5 |
| S1 whisper transcript (turbo) | corpus/transcripts/a_S1_ar-natural.asr.json | 6679 words, 3 shards merged |
| S1 words (forced alignment) | corpus/transcripts/a_S1_ar-natural.words.jsonl | 6644 words, ids w:S1:ar-natural:000000-006643, method mms_fa |
| S1 alignment report | corpus/transcripts/a_S1_ar-natural.align.json, reports/audio/s1_alignment.md | `dc align scripted a:S1:ar-natural`, `dc align check a:S1:ar-natural` |
| ASR calibration | reports/asr/calibration.md, reports/asr/decision.json | `dc asr calibrate --prepare/--report` |
| Aligner agreement | reports/asr/s1_agreement.md | `dc asr agreement` |
| S4 ASR jobs | tsp ids 73-99 | see below |
| Tests | tools/tests/test_p3a.py | `.venv/bin/python -I tools/tests/test_p3a.py` |

New commands (tools/dclib/{audio,asr,align,s2id,scripts,textnorm}.py, registered in cli.py; `tools/dc.py` re-executes audio/asr/align under .venv/bin/python -I): `dc audio decode|qa|report|crosscheck|voices|identify-s2`, `dc asr transcribe|submit-s4|calibrate|agreement`, `dc align scripted|check`. New schemas: asr, align_report, s2_script_id (paths.json rules added). queue.py RAM guard changed to count only the largest `slots` queued jobs (see lessons P3a-1).

## Results

**Audio profile (reports/audio/sources.md).** S1, S2, S5 are all -16.0 LUFS-I. S1 and S5 have digital silence between phrases. S2 has a continuous bed (non-speech frames at -31.6 dBFS, music_bed_score 0.947 against 0.0), so Demucs would be needed to use its voice alone; not run because S2 adds no content. S4 is -21.9 to -20.4 LUFS-I, 44.1 kHz mono, speech ratio 0.84-0.94, true peaks up to +1.1 dBTP (P00, P01 have clipped samples). S4 P23 MP3 equals its MP4 audio (correlation 0.998, lag 0). DNSMOS and UTMOS are null (weights on blocked hosts).

**S2 (decision for ADR-001, provisional role `reference`).** It reads the same script as S1: master.md §8 Egyptian narration, partial-ratio median 96.8 over two 3-min windows (5:00 and 40:00), matched to CH-03/04 and CH-22/23, the same chapters S1 has at those times. The 28-min V2 narration scores 50. Its sentence starts follow S1's timeline loosely (median +465 ms, 21 of 32 matched segments within 1 s, range -2.0 to +4.8 s). Only the two windows were transcribed; the whole file has not been, so "same script everywhere" is shown for 6 of 70 minutes.

**Voices.** One speaker inside every track. S1 and S2 are the same voice family. S4 has three voices across parts (A like S1, B like the S3 TTS voice, C=P01 close to the English S5); see sources.md and lessons P3a-7.

**S1 forced alignment (reports/audio/s1_alignment.md).** 6644 words, median conf 0.826 (mean char posterior). All 37 chapters lie inside their nominal master §7 windows (windows equal DA_SCENES), 0 chapter overlaps, 0 VAD segments crossing a boundary, 20.3 s (0.73 %) of Silero speech farther than 400 ms from any aligned word. Lowest chapters: CH-13 0.649 (dense English: "Session A/B", transaction, commit), CH-10 0.733, CH-19 0.764, CH-20 0.769. Latin-script words have median conf 0.52 (977 words) against 0.875 for Arabic-only words; 353 words have conf < 0.3 and 1057 have conf < 0.5, and their internal timing can be off by a few hundred ms (the stretch is bounded by confident neighbours). No chapter is flagged as a script mismatch: whisper-vs-script WER per chapter is 10-34 % (the tail is Latin transliteration), except CH-01 at 49 %, where whisper skipped two runs of English-heavy term lists (about 50 words at 2:04-2:09 and 2:12-2:24); the aligned words there have conf 0.65-0.72 and Silero sees speech in both, so the script is right and the whisper transcript is what is incomplete (a reason to keep a script-guided pass for S1 and to expect similar dropouts in S4).

**ASR calibration (reports/asr/calibration.md).** 10 min of S1 in 5 windows (CH-03, 11, 20, 26, 33). turbo CER 0.169 / WER 0.240 / Latin recall 0.49; large-v3 CER 0.108 / WER 0.171 / Latin recall 0.73; large-v3 greedy CER 0.111 / WER 0.176. Chosen: **turbo for S4 bulk**; large-v3 reserved for disputed segments, because the gap is mostly Latin terms that the polishing step repairs (Arabic-word error 15.3 % vs 12.3 %), large-v3 costs 2.1-3.7x real time against 1.0 for turbo and does not fit the P3 budget for 3.7 h of S4. Revisit if polishing leaves unfixable errors. The calibration turbo numbers come from the full-S1 turbo run cut to the same windows, not from separate clip runs.

**Aligner agreement (reports/asr/s1_agreement.md).** Whisper-turbo vs MMS: 45.7 % of 5393 matched words within 120 ms (76 % within 250 ms, median |diff| 140 ms). This is below the G3 target of 95 %, and the independent check shows why: against Silero speech onsets whisper is +219 ms late (5 % within 120 ms), MMS is -22 ms (65 % within 120 ms, 95 % within 250 ms). So the metric is limited by the second method, not demonstrably by MMS.

**Variants tried (L2 loop).** (1) nominal window +-2 s: neighbour leakage; (2) whisper-anchored windows: fixed leakage; (3) edge-char trimming and silent-alef surrogate: removed 4-9 s word stretches. Agreement was measured only on the final variant.

## S4 ASR (queued, not finished)

`dc asr submit-s4` queued 27 jobs, turbo, int8, 1 thread each, glossary initial_prompt, label `asr-S4:Pnn-turbo`, tsp ids 73-99 (longest first: P15=73, P18=74, P05=75, P03=76, P09=77, P01=78, P00=79, P00b=80, P19=81, P06=82, P11=83, P25=84, P10=85, P22=86, P08=87, P04=88, P24=89, P07=90, P14=91, P17=92, P21=93, P16=94, P20=95, P12=96, P13=97, P23=98, P02=99). Outputs: corpus/transcripts/a_S4_Pnn.asr.json (a_S4_P00b for render2); they validate against schemas/asr. First two outputs (P05, P18) validated against the schema; measured RTF 1.31-1.36 at 1 thread, so about 5 slot-hours in total, roughly 1.7 h wall on an otherwise idle box. The S4 outputs are not committed (they arrive after this handoff); commit them with the P3b polish. Re-run `dc asr submit-s4` to queue only the missing ones.

## Open issues and next steps

1. **G3 agreement (>= 95 % within 120 ms, scripted audio) is not met and not yet measurable.** Needs an independent CTC model (an Arabic wav2vec2 fine-tune from huggingface.co is reachable, about 1.2 GB; disk 7.2 GB free) or an accepted amendment of the metric; this is the L2 escalation to the Council (Audio & Sync).
2. S1 cross-checks still to do: 637 English cue windows (corpus/canon/cues_70m05.json does not exist yet, P2) for "S1 speech inside cue windows >= 90 %"; S5 onsets vs cues (S5 not aligned yet; DA_CAPTIONS_EN in 03_Natural_EN_EDITABLE_STANDALONE.html is the fallback source); S3 vs its SRTs (S3 clips not aligned yet; 16 kHz WAVs are ready).
3. Alignment of S3 (41 clips, `LMArena/Folder 1/dacamp/tts`) and S5 reuses `dc align scripted` with a different text source; the function currently refuses ids other than a:S1:ar-natural.
4. P3.7 polishing of S4 (and S2 if S2 is kept): glossary + retrieval over the matching Part_nn source; log edits with original token indices; keep Egyptian spelling in `text`. The S1 `words.jsonl` ids are permanent now (w:S1:ar-natural:NNNNNN); corrections may change times and text only.
5. `norm` is the folded search form; `is_term` is set from the glossary Latin list, `term` concept ids stay null until P4. `prominence` and `polish` are not filled (P3.9).
6. The word `end_ms` is the tight CTC end (last supported char frame), not the acoustic end of the vowel; a consumer needing "hold until next word" should extend to the next start itself.
7. A second ECAPA caveat: speaker counts on short TTS clips read 2 for a few clips (over-split); do not use them for the voice decision.
8. Disk: data/derived/align/emis (about 13 MB) and data/derived/audio/16k (0.94 GB) are the caches; the S4 jobs add nothing large. Free space was 7.2 GB at handoff.
