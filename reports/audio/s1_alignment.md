# S1 forced alignment: a:S1:ar-natural

Script: LMArena/Folder 1/dacamp/tts/CH-nn_k.txt, 6644 words. Windows: master.md §7 (identical to DA_SCENES in 02_Natural_AR_EDITABLE_STANDALONE.html: yes). Aligner windows: asr-anchored (midpoint of the pauses between matched whisper words). Method: MMS-300m-1130 CTC emissions (cached, 10-min blocks) + uroman + torchaudio forced_align; alignment surrogate spells acronyms and numerals the way they are spoken; edge chars with no acoustic support or stranded more than 0.35 s from their neighbour are trimmed.

- Median word confidence (mean char posterior): **0.8264** over 6644 words; chapters with median < 0.70: ['CH-13'].
- Containment: chapters with every word inside its nominal window (+-250 ms): **37 of 37**; chapter-to-chapter overlaps: none; Silero speech segments crossing a nominal boundary by more than 250 ms either side: 0.
- VAD speech 2799.7 s, of which 1.1 s (0.04 %) lies more than 400 ms from any aligned word (narration not in the script, or noise taken for speech). Segments with >= 0.7 s unexplained: 0.

| chapter | window | words | median conf | p10 conf | lead-in s | tail s | conf < 0.3 | VAD s unexplained |
|---|---|---|---|---|---|---|---|---|
| CH-00 | 0:00-1:35 | 135 | 0.835 | 0.378 | 0.98 | 3.92 | 9 | 0.0 |
| CH-01 | 1:35-3:20 | 143 | 0.787 | 0.456 | 1.10 | 3.38 | 4 | 0.0 |
| CH-02 | 3:20-5:00 | 162 | 0.830 | 0.422 | 1.08 | 2.92 | 13 | 0.0 |
| CH-03 | 5:00-6:25 | 150 | 0.849 | 0.499 | 1.02 | 3.34 | 3 | 0.1 |
| CH-04 | 6:25-8:05 | 159 | 0.788 | 0.360 | 1.02 | 3.14 | 11 | 0.1 |
| CH-05 | 8:05-9:45 | 160 | 0.775 | 0.291 | 1.02 | 5.96 | 18 | 0.0 |
| CH-06 | 9:45-11:20 | 135 | 0.814 | 0.452 | 0.98 | 4.34 | 7 | 0.0 |
| CH-07 | 11:20-12:55 | 155 | 0.803 | 0.317 | 1.02 | 5.56 | 11 | 0.0 |
| CH-08 | 12:55-14:35 | 165 | 0.830 | 0.491 | 1.04 | 4.08 | 6 | 0.0 |
| CH-09 | 14:35-16:25 | 174 | 0.798 | 0.404 | 1.02 | 4.58 | 8 | 0.0 |
| CH-10 | 16:25-18:00 | 166 | 0.733 | 0.330 | 1.04 | 1.48 | 15 | 0.1 |
| CH-11 | 18:00-20:00 | 199 | 0.787 | 0.295 | 1.06 | 4.14 | 24 | 0.0 |
| CH-12 | 20:00-21:55 | 195 | 0.877 | 0.470 | 1.06 | 4.58 | 3 | 0.0 |
| CH-13 | 21:55-23:30 | 155 | 0.649 | 0.176 | 1.02 | 2.06 | 21 | 0.0 |
| CH-14 | 23:30-26:15 | 263 | 0.850 | 0.535 | 1.02 | 4.40 | 10 | 0.0 |
| CH-15 | 26:15-28:15 | 188 | 0.849 | 0.396 | 1.02 | 3.26 | 13 | 0.0 |
| CH-16 | 28:15-30:05 | 180 | 0.887 | 0.522 | 1.02 | 4.44 | 10 | 0.1 |
| CH-17 | 30:05-31:50 | 166 | 0.868 | 0.496 | 1.02 | 4.32 | 1 | 0.0 |
| CH-18 | 31:50-33:45 | 183 | 0.853 | 0.491 | 1.02 | 3.22 | 9 | 0.0 |
| CH-19 | 33:45-35:40 | 186 | 0.764 | 0.384 | 1.08 | 5.08 | 13 | 0.0 |
| CH-20 | 35:40-37:45 | 185 | 0.769 | 0.350 | 1.02 | 3.66 | 14 | 0.1 |
| CH-21 | 37:45-39:40 | 179 | 0.834 | 0.408 | 1.00 | 4.68 | 11 | 0.2 |
| CH-22 | 39:40-41:40 | 183 | 0.828 | 0.480 | 1.02 | 2.04 | 3 | 0.0 |
| CH-23 | 41:40-43:45 | 207 | 0.826 | 0.422 | 1.02 | 3.30 | 12 | 0.0 |
| CH-24 | 43:45-45:40 | 173 | 0.792 | 0.407 | 1.04 | 8.50 | 6 | 0.0 |
| CH-25 | 45:40-47:40 | 182 | 0.823 | 0.501 | 1.08 | 6.12 | 1 | 0.0 |
| CH-26 | 47:40-49:50 | 184 | 0.780 | 0.479 | 0.98 | 5.00 | 5 | 0.0 |
| CH-27 | 49:50-51:45 | 175 | 0.933 | 0.535 | 1.02 | 2.42 | 6 | 0.0 |
| CH-28 | 51:45-53:55 | 216 | 0.839 | 0.436 | 1.00 | 3.30 | 9 | 0.0 |
| CH-29 | 53:55-56:00 | 187 | 0.875 | 0.476 | 1.02 | 6.56 | 5 | 0.0 |
| CH-30 | 56:00-57:55 | 206 | 0.930 | 0.517 | 1.04 | 1.30 | 3 | 0.0 |
| CH-31 | 57:55-59:55 | 193 | 0.852 | 0.469 | 1.04 | 4.56 | 6 | 0.0 |
| CH-32 | 59:55-61:55 | 191 | 0.847 | 0.428 | 1.00 | 2.52 | 8 | 0.0 |
| CH-33 | 61:55-64:15 | 219 | 0.787 | 0.397 | 1.02 | 1.66 | 11 | 0.1 |
| CH-34 | 64:15-66:35 | 207 | 0.790 | 0.378 | 1.02 | 3.14 | 17 | 0.1 |
| CH-35 | 66:35-68:50 | 212 | 0.797 | 0.302 | 1.00 | 2.52 | 21 | 0.0 |
| CH-36 | 68:50-70:05 | 126 | 0.823 | 0.469 | 1.00 | 2.04 | 3 | 0.1 |
