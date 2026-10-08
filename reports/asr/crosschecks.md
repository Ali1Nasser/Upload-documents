# G3 cross-checks (dc align crosscheck)

Generated 2026-10-08T14:49:48Z. Overall: **PASS**.

| check | threshold | result | verdict |
|---|---|---|---|
| S1 speech inside its 37 chapter windows | all chapters, no overlaps | 37/37 chapters with every word inside (+-250 ms), 0 words outside, overlaps none | PASS |
| S1 speech inside the 637 cue windows (+-500 ms) | >= 90 % | 96.1 % of word duration, 95.9 % of words, 96.0 % of VAD speech | PASS |
| S5 caption onsets vs the 637 English cues | median abs <= 300 ms | median 160 ms (signed 157), 81.8 % within 300 ms, 637 compared, chapters skipped none | PASS |
| S3 vs per-chapter SRTs | the plan names the check, not a number: text identical (>= 99 % tokens), first/last cue within 1 s of first/last word, MMS nearer to Silero onsets than the SRT | tokens matched 100.0 %, envelope max 564 ms; cue-start deviation median 715 ms (signed 484), max 3785 ms, 26.4 % within 300 ms (SRT interior timing is an estimate); median distance to the nearest VAD onset: SRT 449 ms vs MMS 66 ms; 579 cues, 37 chapters | PASS |
| MMS vs a second CTC aligner on S1, S3 clips and S5 | >= 95 % within 120 ms | S1 97.9 % of 6644 words, median |diff| 0.0 ms; S3 98.1 % of 7126 words in 41 clips, median |diff| 0.0 ms; S5 (wav2vec2-base-960h, English) 99.8 % of 8643 words, median |diff| 20 ms | PASS |

## S3 per chapter

| chapter | audio | cues | compared | token match | median signed ms | median abs ms | within 300 ms | first word - first cue ms | last word end - last cue end ms | max abs ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CH-00 | CH-00_0 | 13 | 13 | 1.0 | 782 | 782 | 0.077 | -320 | -404 | 1390 |
| CH-01 | CH-01_0 | 14 | 14 | 1.0 | 1829.0 | 1829.0 | 0.214 | -240 | -156 | 2386 |
| CH-02 | CH-02_0 | 17 | 17 | 1.0 | 87 | 312 | 0.471 | -240 | -308 | 757 |
| CH-03 | CH-03_0 | 13 | 13 | 1.0 | -124 | 675 | 0.231 | -280 | -344 | 2235 |
| CH-04 | CH-04_0 | 14 | 14 | 1.0 | 99.0 | 272.5 | 0.571 | -260 | -228 | 913 |
| CH-05 | CH-05_0 | 12 | 12 | 1.0 | 588.0 | 588.0 | 0.333 | -280 | -284 | 1409 |
| CH-06 | CH-06_0 | 12 | 12 | 1.0 | 357.5 | 357.5 | 0.5 | -260 | -304 | 1332 |
| CH-07 | CH-07_0 | 15 | 15 | 1.0 | 314 | 314 | 0.467 | -160 | -348 | 1212 |
| CH-08 | CH-08_0 | 14 | 14 | 1.0 | 954.5 | 954.5 | 0.214 | -140 | -476 | 1339 |
| CH-09 | CH-09_0 | 17 | 17 | 1.0 | 1559 | 1559 | 0.235 | -260 | -288 | 2085 |
| CH-10 | CH-10_0 | 15 | 15 | 1.0 | 23 | 582 | 0.4 | -240 | -356 | 1879 |
| CH-11 | CH-11_0 | 19 | 19 | 1.0 | 533 | 533 | 0.211 | -280 | -564 | 2449 |
| CH-12 | CH-12_0 | 18 | 18 | 1.0 | 1206.0 | 1206.0 | 0.222 | -260 | -236 | 2314 |
| CH-13 | CH-13_0 | 17 | 17 | 1.0 | 1333 | 1333 | 0.118 | -300 | -508 | 2110 |
| CH-14 | CH-14_vo | 21 | 21 | 1.0 | -320 | 437 | 0.429 | -320 | -284 | 2279 |
| CH-15 | CH-15_0 | 14 | 14 | 1.0 | 446.5 | 446.5 | 0.429 | -260 | -376 | 1854 |
| CH-16 | CH-16_0 | 13 | 13 | 1.0 | 2617 | 2617 | 0.077 | -280 | -176 | 3593 |
| CH-17 | CH-17_0 | 12 | 12 | 1.0 | -435.5 | 435.5 | 0.083 | -280 | -304 | 932 |
| CH-18 | CH-18_0 | 16 | 16 | 1.0 | 1021.0 | 1021.0 | 0.188 | -280 | -516 | 1923 |
| CH-19 | CH-19_0 | 13 | 13 | 1.0 | 1078 | 1078 | 0.077 | -280 | -308 | 2249 |
| CH-20 | CH-20_0 | 18 | 18 | 1.0 | 469.5 | 469.5 | 0.167 | -280 | -324 | 3785 |
| CH-21 | CH-21_0 | 20 | 20 | 1.0 | 1360.0 | 1360.0 | 0.05 | -320 | -324 | 2432 |
| CH-22 | CH-22_0 | 16 | 16 | 1.0 | 650.0 | 650.0 | 0.312 | -300 | -484 | 1335 |
| CH-23 | CH-23_0 | 21 | 21 | 1.0 | -61 | 488 | 0.333 | -160 | -364 | 1387 |
| CH-24 | CH-24_0 | 12 | 12 | 1.0 | -66.0 | 506.0 | 0.333 | -300 | -404 | 1206 |
| CH-25 | CH-25_0 | 16 | 16 | 1.0 | 1545.0 | 1545.0 | 0.062 | -260 | -296 | 1847 |
| CH-26 | CH-26_0 | 12 | 12 | 1.0 | 162.0 | 317.5 | 0.5 | -300 | -348 | 867 |
| CH-27 | CH-27_0 | 15 | 15 | 1.0 | 1134 | 1134 | 0.133 | -260 | -328 | 2344 |
| CH-28 | CH-28_0 | 19 | 19 | 1.0 | 114 | 260 | 0.526 | -260 | -336 | 1179 |
| CH-29 | CH-29_0 | 18 | 18 | 1.0 | 1271.5 | 1271.5 | 0.167 | -280 | -376 | 2117 |
| CH-30 | CH-30_0 | 14 | 14 | 1.0 | 1122.5 | 1122.5 | 0.214 | -280 | -344 | 3099 |
| CH-31 | CH-31_0 | 16 | 16 | 1.0 | 1266.0 | 1266.0 | 0.125 | -300 | -324 | 2010 |
| CH-32 | CH-32_0 | 15 | 15 | 1.0 | 931 | 931 | 0.2 | -320 | -224 | 3461 |
| CH-33 | CH-33_vo | 23 | 23 | 1.0 | -1301 | 1301 | 0.217 | -300 | -264 | 2617 |
| CH-34 | CH-34_0 | 14 | 14 | 1.0 | -244.5 | 428.5 | 0.5 | -300 | -476 | 1764 |
| CH-35 | CH-35_0 | 15 | 15 | 1.0 | -5 | 456 | 0.333 | -280 | -316 | 1959 |
| CH-36 | CH-36_0 | 16 | 16 | 1.0 | -645.0 | 841.0 | 0.125 | -260 | -368 | 1466 |
