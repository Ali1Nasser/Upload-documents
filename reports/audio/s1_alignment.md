# S1 forced alignment: a:S1:ar-natural

Script: LMArena/Folder 1/dacamp/tts/CH-nn_k.txt, 6644 words. Windows: master.md §7 (identical to DA_SCENES in 02_Natural_AR_EDITABLE_STANDALONE.html: yes). Aligner windows: asr-anchored (midpoint of the pauses between matched whisper words). Method: MMS-300m-1130 CTC emissions (cached, 10-min blocks) + uroman + torchaudio forced_align; alignment surrogate spells acronyms and numerals the way they are spoken; edge chars with no acoustic support or stranded more than 0.35 s from their neighbour are trimmed.

- Median word confidence (mean char posterior): **0.8261** over 6644 words; chapters with median < 0.70: ['CH-13'].
- Containment: chapters with every word inside its nominal window (+-250 ms): **37 of 37**; chapter-to-chapter overlaps: none; Silero speech segments crossing a nominal boundary by more than 250 ms either side: 0.
- VAD speech 2799.7 s, of which 20.3 s (0.73 %) lies more than 400 ms from any aligned word (narration not in the script, or noise taken for speech). Segments with >= 0.7 s unexplained: 0.

| chapter | window | words | median conf | p10 conf | lead-in s | tail s | conf < 0.3 | VAD s unexplained |
|---|---|---|---|---|---|---|---|---|
| CH-00 | 0:00-1:35 | 135 | 0.835 | 0.378 | 0.98 | 3.98 | 9 | 0.0 |
| CH-01 | 1:35-3:20 | 143 | 0.787 | 0.456 | 1.04 | 3.50 | 4 | 0.0 |
| CH-02 | 3:20-5:00 | 162 | 0.830 | 0.422 | 0.96 | 3.10 | 13 | 0.0 |
| CH-03 | 5:00-6:25 | 150 | 0.849 | 0.499 | 0.82 | 3.58 | 3 | 0.3 |
| CH-04 | 6:25-8:05 | 159 | 0.787 | 0.360 | 0.78 | 3.46 | 11 | 0.9 |
| CH-05 | 8:05-9:45 | 160 | 0.775 | 0.291 | 0.70 | 6.34 | 18 | 1.4 |
| CH-06 | 9:45-11:20 | 135 | 0.814 | 0.452 | 0.60 | 4.38 | 7 | 0.3 |
| CH-07 | 11:20-12:55 | 155 | 0.803 | 0.317 | 0.98 | 5.66 | 11 | 0.0 |
| CH-08 | 12:55-14:35 | 165 | 0.826 | 0.491 | 0.94 | 4.26 | 6 | 0.0 |
| CH-09 | 14:35-16:25 | 174 | 0.798 | 0.404 | 0.84 | 4.82 | 8 | 0.2 |
| CH-10 | 16:25-18:00 | 166 | 0.733 | 0.330 | 0.80 | 1.50 | 15 | 0.8 |
| CH-11 | 18:00-20:00 | 199 | 0.788 | 0.295 | 0.74 | 4.52 | 24 | 2.4 |
| CH-12 | 20:00-21:55 | 195 | 0.877 | 0.467 | 1.06 | 4.64 | 3 | 0.1 |
| CH-13 | 21:55-23:30 | 155 | 0.649 | 0.176 | 0.96 | 2.18 | 21 | 0.0 |
| CH-14 | 23:30-26:15 | 263 | 0.850 | 0.535 | 0.88 | 4.64 | 10 | 0.1 |
| CH-15 | 26:15-28:15 | 188 | 0.849 | 0.396 | 0.78 | 3.58 | 13 | 0.5 |
| CH-16 | 28:15-30:05 | 180 | 0.887 | 0.522 | 0.70 | 4.44 | 10 | 1.7 |
| CH-17 | 30:05-31:50 | 166 | 0.868 | 0.495 | 1.02 | 4.38 | 1 | 0.0 |
| CH-18 | 31:50-33:45 | 183 | 0.853 | 0.491 | 0.96 | 3.36 | 9 | 0.0 |
| CH-19 | 33:45-35:40 | 186 | 0.764 | 0.384 | 0.94 | 5.30 | 13 | 0.0 |
| CH-20 | 35:40-37:45 | 185 | 0.769 | 0.350 | 0.80 | 3.96 | 15 | 0.9 |
| CH-21 | 37:45-39:40 | 179 | 0.824 | 0.408 | 0.70 | 5.06 | 12 | 2.1 |
| CH-22 | 39:40-41:40 | 183 | 0.828 | 0.480 | 0.64 | 2.10 | 3 | 0.2 |
| CH-23 | 41:40-43:45 | 207 | 0.826 | 0.422 | 0.96 | 3.44 | 12 | 0.0 |
| CH-24 | 43:45-45:40 | 173 | 0.788 | 0.407 | 0.90 | 8.72 | 6 | 0.0 |
| CH-25 | 45:40-47:40 | 182 | 0.823 | 0.501 | 0.86 | 6.42 | 2 | 0.6 |
| CH-26 | 47:40-49:50 | 184 | 0.778 | 0.479 | 0.68 | 5.38 | 5 | 1.1 |
| CH-27 | 49:50-51:45 | 175 | 0.933 | 0.535 | 0.64 | 2.48 | 6 | 0.3 |
| CH-28 | 51:45-53:55 | 216 | 0.839 | 0.423 | 0.94 | 3.44 | 9 | 0.0 |
| CH-29 | 53:55-56:00 | 187 | 0.875 | 0.476 | 0.88 | 6.78 | 5 | 0.2 |
| CH-30 | 56:00-57:55 | 206 | 0.930 | 0.517 | 0.80 | 1.60 | 3 | 0.8 |
| CH-31 | 57:55-59:55 | 193 | 0.852 | 0.469 | 0.74 | 4.94 | 6 | 1.8 |
| CH-32 | 59:55-61:55 | 191 | 0.847 | 0.428 | 0.62 | 2.58 | 8 | 0.2 |
| CH-33 | 61:55-64:15 | 219 | 0.787 | 0.397 | 0.96 | 1.82 | 11 | 0.4 |
| CH-34 | 64:15-66:35 | 207 | 0.790 | 0.338 | 0.86 | 3.40 | 17 | 0.6 |
| CH-35 | 66:35-68:50 | 212 | 0.797 | 0.302 | 0.74 | 2.86 | 21 | 1.0 |
| CH-36 | 68:50-70:05 | 126 | 0.828 | 0.469 | 0.66 | 2.04 | 3 | 1.5 |
