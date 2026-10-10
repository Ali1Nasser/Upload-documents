# Word map v1.1 sync verification (independent)

Verdict: PASS (one observation, below).

## Checks
- v1 vs v1.1: 0 v1 ids missing; 44 new ids (appended; they sit in the 9 F1 hole spans: P02, P13 x2, P14, P19, P17 x2, P20); 29480 -> 29524 words.
- Changed v1 words: 9, exactly the 9 `retimes` in corpus/transcripts/f1_holes.log.json (w:S4:P02:000265 F1; 8 x w:S4:P17 DD-P17/F5: 000241, 000299, 000307, 000334, 000363, 000770, 000795, 000855). All other v1 words byte-identical. Side effect: w:S4:P17:000795 seg_id seg-0496 -> seg-0497 and its end moved +2.49 s (documented retime, check in P17 review).
- Holes > 2500 ms over audible speech: 0 (log: 9 before, 0 after). Max inter-word gap is the planned 3000 ms card gap.
- Frames: 29524/29524 words satisfy start=floor(ms*24/1000), end=ceil(ms*24/1000); start_ms monotonic (0 violations).
- lock.json: word_map_sha256 64c4fedad... and edl_sha256 f9ea31cb... match the files; words 29524.
- `dc gate check G5`: PASS 13/13.

## Re-align (queue job 30, MMS forced alignment on master_vo_v1.flac, seed 20261010)
5 windows: 3 seeded F1 clusters (P02 ~1217 s, P13 ~7346 s, P13 ~7422 s), the F1 P17 span (~10553 s), and a DD-P17 retime window (10521-10550 s).
| window | words | median abs offset | p95 | max |
|---|---|---|---|---|
| F1 P13 7422 s | 41 | 10 ms | 20 | 100 (w:S4:P13:000675) |
| F1 P13 7346 s | 37 | 10 | 30 | 50 |
| F1 P02 1217 s | 39 | 10 | 10 | 30 |
| F1 P17 10553 s | 47 | 10 | 10 | 150 (w:S4:P17:001002) |
| DD-P17 retimes | 102 | 10 | 10 | 330 (w:S4:P17:000336) |
All: 266 words, median 10 ms, p95 10 ms (gate: median <= 40, p95 <= 100). New words (29): median 10 ms, p95 150 ms (single outlier w:S4:P17:001002, 150 ms).

## Observations
- w:S4:P17:000336 (neighbour of retimed 000334) is 330 ms off the re-align; w:S4:P17:001002 150 ms; w:S4:P17:000377 130 ms. Only 3 of 266 words exceed 100 ms. Not gate-blocking; flag for the P17 sync pass.
