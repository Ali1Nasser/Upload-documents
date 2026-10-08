# PHASE-03 (transcription-aligner): P3.4-P3.10, gate G3

G3 passes (13/13): `python3 tools/dc.py gate check G3` -> `reports/gates/G3.json`. Checker: `harness/gates/g03.py` (gate modules live in `harness/gates/`, not in `tools/dclib/gates.py`, which only dispatches them). Earlier handoff: `PHASE-03a.md` (audio forensics, calibration, S1 alignment).

## Per source (corpus/transcripts, corpus/sentences)
| Source | Words | Median conf | Sentences | Method |
|---|---|---|---|---|
| S1 `a:S1:ar-natural` | 6,644 | 0.826 | 562 (max 26 words, median 11) | script text, MMS-300m forced alignment per chapter window |
| S2 `a:S2:ar-esraa` | 6,644 | 0.806 | optional, none | script text (s2_script_id), MMS |
| S3 41 TTS clips | 7,126 | 0.869 (no clip < 0.70) | none | script text per clip, MMS (CH-14, CH-33 `_vo` aligned jointly) |
| S5 `a:S5:en-natural` | 8,643 | 0.997 | none | English script, MMS |
| S4 27 parts (P00, P00b, P01-P25) | 30,460 (31,008 ASR words) | 0.835 (parts 0.778-0.90, median of parts 0.824) | 2,564 | whisper turbo, polished, MMS re-alignment of the polished text |

S4 low-confidence words (< 0.3): 1,201 of 30,460 (3.9 %). Latin terms align worst (median conf about 0.50 on P05: MMS has no Latin letters, uroman guesses). 0 fallback segments. Every sentence has a gloss; `impact_words` on 3,120 of 3,126 S1+S4 sentences (the rest are 1-3 word sentences with only stop words); every word has `prominence` (z-score of RMS, f0 range and duration, plus lexical bonus number 2.0 > term 1.5 > contrast 1.0 > change 0.8).

## Polish (S4; `corpus/transcripts/a_S4_Pnn.polish.json`, original indices kept)
Inputs: 27/27 `data/derived/polish/a_S4_*.out.json` and 6/6 `S1_batch_*.out.json` present, valid (`validate_out`), sentence ranges contiguous with no gap or overlap, none over 28 words; no repair was needed. Applied with `dc asr polish-apply all` (queued, cached emissions), then `dc asr sentences all`, `dc asr emphasis all`.
Edits: 3,895 replace/delete + 5 insert on 31,008 ASR words (12.6 %): term 2,087 replaced + 21 deleted; mishear 878 replaced + 2 deleted; merge 117 replaced + 593 deleted (ASR splits of one word); number 172 replaced + 6 deleted; split 19; dropout inserts 5. Word IDs are the new sequential ids `w:S4:Pnn:NNNNNN` (S4 ids are first published here and are now permanent). A spot check of 24 mishear/number edits showed spelling and letter-confusion fixes, with no paraphrase. Two edits to review: P05 "اللي" -> "الـlist" and P07 "34" -> "4 في 30" (the polisher's context call).
S1: the script is authoritative, no text edits; the six gloss batches give the sentence boundaries (merge or split by meaning, chapter cuts 0, overlaps dropped 0) and glosses.

## Cross-checks (`dc align crosscheck` -> `reports/asr/crosschecks.md/.json`; all pass)
| Check | Threshold | Result |
|---|---|---|
| Two aligners (MMS vs wav2vec2-xlsr53-arabic), start within 120 ms | >= 95 % | S1 97.9 % of 6,644; S3 98.1 % of 7,126 (41 clips); median abs diff 0 ms |
| S1 inside its 37 chapter windows | all | 37/37, 0 words outside, no overlaps |
| S1 speech inside 637 cue windows (+-500 ms) | >= 90 % | 96.1 % of word duration (95.9 % of words, 96.0 % of VAD speech). The earlier 91.3 % figure used a different measure; both pass |
| S5 onsets vs 637 English cues | median <= 300 ms | median 160 ms (signed +157), 81.8 % within 300 ms, 637/637 compared |
| S3 vs per-chapter SRTs (`output_sidecars/CH-nn_ar.srt`) | plan gives no number | text identical (100 % tokens, 579 cues, 37 chapters); first/last cue within 564 ms of first/last word. Cue-start deviation median 715 ms, max 3.8 s: the SRT interior timing is a proportional estimate (zero offset at both ends, up to +3.6 s in the middle). MMS words sit 66 ms median from the nearest Silero onset, the SRT cues 449 ms. Use the MMS words, never the SRT times |

Also: `reports/asr/s1_agreement*.md`, `reports/audio/s1_alignment.md` (VAD speech unexplained by words 1.1 s). Whisper-vs-MMS on S1: 74.8 % within 120 ms.

## New code
`tools/dclib/crosscheck.py` (`dc align crosscheck`), `tools/dclib/align2.py` (`dc align second all-s3 | a:S3:CH-nn_k`, 2 queue jobs), `harness/gates/g03.py`. `tools/tests/test_p3b.py`: 30 checks pass. Cache: `data/derived/align/emis_w2v` and `*.w2v.words.jsonl` (not committed).

## Open issues
1. **Three S4 voices** (ECAPA clusters, `corpus/audio/voices.json`): A (S1/S2 voice) P00, P00b, P02, P05, P08, P13, P15, P16, P20, P24; B (S3 TTS voice) P03, P04, P06, P07, P09-P12, P14, P17-P19, P21-P23, P25; C (close to the English S5 voice) P01. P5 must decide voice per part in ADR-001 or the audio lock; nothing in P3 depends on it.
2. S5 (English) has no second aligner (the Arabic wav2vec2 cannot align English); it is covered by the 637-cue check (median 160 ms). Needs an English CTC model (about 360 MB download) if the Council wants strict G3 parity.
3. Latin technical terms in S1/S3 align with crude letter mapping: conf is lower (S4 Latin median about 0.50), timing within 120 ms still agrees for 96.5 % of S1 Latin words. Use the word start, not the end, for term anchors.
4. S4 turbo transcripts keep about 3.9 % words under conf 0.3 (mostly Latin terms and fast speech). The polish used the glossary and NotebookLM part sources; no large-v3 re-decode was needed or run.
5. Word `end_ms` is the tight CTC end, not the acoustic end (see PHASE-03a #6).
6. `idea_unit`, `script_match` in sentences and `term` in words stay null until P4.
7. `crosschecks.json` goes stale if a words file changes (the gate checks the mtime): re-run `dc align crosscheck` after any re-alignment.
