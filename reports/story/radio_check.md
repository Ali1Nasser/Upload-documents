# Radio check: master_edl.v1 / master_vo_v1

Generated 2026-10-09T16:19:08Z by `dc story radio-check` (seed 20261009). Overall: **PASS**.

## EDL

- Source: `corpus/edl/candidates/B100-noC.json` (ADR-001, waivers W-001-RT, W-001-D2).
- Runtime **3:51:00** (13860.4 s, 415813 frames at 30 fps).
- Chapters 73 (37 trunk, 36 Deep-Dives); 605 spoken segments, 68 visual cards (2.0 s each, music sting); 2524 sentences, 29480 words in the word map.
- Voice switches 64 (16.6 per hour).
- Pauses longer than 2.0 s inside kept speech tightened to 2.0 s: 306 pauses, 486.9 s removed (S1 was paced to the old 70:05 picture).
- Continuous joins (adjacent S1 chapters with no Deep-Dive between): 0.

## Render

- `data/derived/audio/master_vo_v1.flac`: FLAC 48 kHz / 24-bit mono, SHA-256 `57abfd2d8ff43a3d330a73af9951996b5bb1dd545e0b627cc8ab728527213850`.
- Integrated -16.02 LUFS (master trim 0.18 dB); true peak -1.5 dBTP; limiter active on 36658723 samples (ceiling -1.5 dBFS).
- Block gains: each trunk chapter / Deep-Dive measured BS.1770 gated (speech-gated) and set to -16.0 LUFS.
- S4 EQ match to S1 (`corpus/audio/eq_match_s4_to_s1.json`, ±4 dB clamp, linear-phase FIR): spectral distance to S1 (1/3-octave LTAS, 100 Hz–8 kHz, level-matched 200 Hz–4 kHz) median 4.515 dB before, 2.455 dB after (26 parts).
- Cut points: word gaps ≥ 250 ms only; room tone kept ≥ 60 ms before onsets and ≥ 90 ms after offsets (up to 300 ms each side).
  Every cut has a 20 ms equal-power (sin/cos) fade against a per-source room-tone bed; fades start and end at zero gain,
  so no zero-crossing search is needed for click-free joins.

## Checks

| Check | Threshold | Result | |
|---|---|---|---|
| Static: first/last word of every segment inside its kept region | 0 fails | 0 of 605 | PASS |
| Static: dropped neighbour word outside the cut | 0 fails | 0 | PASS |
| MMS re-align, 20 seeded windows across cuts: words outside their kept region | 0 | 0 of 625 words in 20 windows (0 errors) | PASS |
| Per-minute loudness (gated), 231 minutes | within ±1.5 LU of −16 | -17.05 to -15.07 LUFS, max dev 1.05 LU, 0 out | PASS |
| Unplanned gap > 2.5 s (acoustic: 50 ms RMS < −50 dBFS, cards excluded) | 0 | 0 | PASS |
| True peak (4x oversampled, edge-safe) | ≤ −1.0 dBTP | -1.5 dBTP | PASS |
| VO file hash matches EDL | equal | equal | PASS |

Re-align sanity: onset offset re-aligned vs word map, median |Δ| 10 ms, p95 10 ms; median word confidence 0.819. Edge words with interpolated times: 0.
Planned gaps (cards) over 2.5 s word-to-word: 68, longest 3000 ms.
Tightened pauses: 306 removed stretches, loudest 50 ms RMS -59.9 dBFS; over −45 dBFS (possible speech removed): 0 (PASS).
Cut points: 1210 fade edges; loudest source RMS in the 20 ms around a cut -50.2 dBFS; over −45 dBFS: 0 (PASS). Cuts not inside measured silence: 0; long pauses left untightened (no removable silence): 1.

## Word-map holes (transcript defect, not a gap)

9 places have > 2.5 s between consecutive word-map words outside the cards (longest 5350 ms), but none is silent: the audio there is kept and audible, the S4 transcript has no words for it.
faster-whisper (turbo, no VAD) on each hole; lines that read like Whisper boilerplate over music are likely transition stings:

| Chapter | Audio | Source ms | Record ms | Whisper hears |
|---|---|---|---|---|
| DD-P02-1 | a:S4:P02 | 114760–118200 | 1217260–1219830 | الديتا، البارتس والإنكورين |
| DD-P13 | a:S4:P13 | 210340–215080 | 7344700–7348560 | القسم الثالث معمارية FastAPI |
| DD-P13 | a:S4:P13 | 319080–323360 | 7421030–7424560 | القسم الخامس الحقن والحدود |
| DD-P14 | a:S4:P14 | 246100–250140 | 7878870–7882370 | وستوك أكبر من أو يساوي question mark |
| DD-P19-1 | a:S4:P19 | 24380–30120 | 9908610–9913960 | 1. أساسيات الستريمينج والكافكا 2. الأعطال والسكيماز والكود |
| DD-P17 | a:S4:P17 | 163560–167980 | 10552830–10556790 | صف واحد لكل معاملة أو One Row Per Transaction |
| DD-P17 | a:S4:P17 | 186520–190980 | 10575330–10579400 | ترجمة نانسي قنقر |
| DD-P17 | a:S4:P17 | 369400–372300 | 10757820–10760350 | مية خمسة وعشرين الف توممية سبعة واربعين |
| DD-P20 | a:S4:P20 | 280560–284180 | 11168310–11171000 | اشتركوا في القناة |

Follow-up (transcription-aligner): add the missing words to the S4 transcripts/sentences; the VO audio does not change, only the word map (version bump).

## Windows

| Cut | Record ms | Words | Clipped | Median conf |
|---|---|---|---|---|
| seg-0038|seg-0039 | 992350–1007810 | 33 | 0 | 0.784 |
| seg-0095|seg-0097 | 2545190–2560670 | 28 | 0 | 0.597 |
| seg-0109|seg-0110 | 2697590–2712330 | 36 | 0 | 0.84 |
| seg-0159|seg-0160 | 3709400–3724580 | 27 | 0 | 0.758 |
| seg-0223|seg-0224 | 4787350–4802920 | 40 | 0 | 0.855 |
| seg-0231|seg-0232 | 4942980–4958460 | 25 | 0 | 0.819 |
| seg-0267|seg-0268 | 6028430–6044130 | 36 | 0 | 0.815 |
| seg-0298|seg-0299 | 6365440–6380940 | 28 | 0 | 0.954 |
| seg-0300|seg-0301 | 6397460–6412620 | 26 | 0 | 0.847 |
| seg-0346|seg-0347 | 7162060–7173900 | 24 | 0 | 0.9 |
| seg-0384|seg-0385 | 8162600–8176900 | 28 | 0 | 0.918 |
| seg-0392|seg-0393 | 8221150–8236510 | 35 | 0 | 0.798 |
| seg-0442|seg-0444 | 9323070–9338330 | 33 | 0 | 0.888 |
| seg-0446|seg-0447 | 9438140–9453280 | 40 | 0 | 0.768 |
| seg-0527|seg-0528 | 11417480–11431380 | 23 | 0 | 0.865 |
| seg-0533|seg-0534 | 11526180–11541160 | 37 | 0 | 0.8 |
| seg-0540|seg-0541 | 11624680–11640240 | 31 | 0 | 0.84 |
| seg-0605|seg-0606 | 12605640–12621410 | 36 | 0 | 0.789 |
| seg-0612|seg-0613 | 12727460–12742180 | 32 | 0 | 0.552 |
| seg-0614|seg-0616 | 12813540–12829020 | 27 | 0 | 0.815 |

Machine-readable: `reports/story/radio_check.v1.json`, `reports/story/radio_render.v1.json`.
