# S1 aligner agreement (MMS forced alignment vs faster-whisper turbo word timing)

Script words 6644, whisper words 6679, matched (identical folded token in a Levenshtein alignment) 5393 (81.2 % of script words).

| |start diff| <= | share of matched words |
|---|---|
| 60 ms | 47.1 % |
| 120 ms | 74.8 % |
| 250 ms | 85.0 % |
| 500 ms | 92.6 % |

Median signed start difference (aligner minus whisper): +70 ms; median |diff| 70 ms; p90 390 ms.
Restricted to aligner conf >= 0.7 (3999 words): 76.6 % within 120 ms.

Whisper word times come from cross-attention DTW and are known to be coarser than a CTC forced alignment; treat this as a sanity check on the MMS times (no systematic offset, no drifting chapters), not as a ground truth. Gate G3 asks for >= 95 % within 120 ms for scripted audio; the independent second CTC model for that metric is listed as an open item in docs/handoffs/PHASE-03a.md.

## Per chapter (median |start diff| ms, share within 120 ms)

| chapter | n | median | within 120 ms |
|---|---|---|---|
| CH-00 | 117 | 60 | 74 % |
| CH-01 | 88 | 65 | 70 % |
| CH-02 | 142 | 60 | 73 % |
| CH-03 | 125 | 70 | 73 % |
| CH-04 | 133 | 70 | 74 % |
| CH-05 | 133 | 70 | 76 % |
| CH-06 | 115 | 70 | 76 % |
| CH-07 | 126 | 80 | 72 % |
| CH-08 | 137 | 70 | 77 % |
| CH-09 | 147 | 60 | 76 % |
| CH-10 | 151 | 80 | 74 % |
| CH-11 | 147 | 80 | 71 % |
| CH-12 | 146 | 60 | 82 % |
| CH-13 | 115 | 80 | 67 % |
| CH-14 | 206 | 70 | 74 % |
| CH-15 | 144 | 70 | 76 % |
| CH-16 | 151 | 70 | 77 % |
| CH-17 | 141 | 70 | 77 % |
| CH-18 | 154 | 70 | 72 % |
| CH-19 | 154 | 70 | 75 % |
| CH-20 | 159 | 70 | 75 % |
| CH-21 | 144 | 70 | 74 % |
| CH-22 | 146 | 70 | 79 % |
| CH-23 | 161 | 60 | 84 % |
| CH-24 | 126 | 60 | 81 % |
| CH-25 | 138 | 60 | 73 % |
| CH-26 | 155 | 60 | 68 % |
| CH-27 | 153 | 80 | 73 % |
| CH-28 | 185 | 80 | 75 % |
| CH-29 | 152 | 70 | 76 % |
| CH-30 | 171 | 60 | 77 % |
| CH-31 | 160 | 70 | 74 % |
| CH-32 | 150 | 70 | 75 % |
| CH-33 | 167 | 70 | 71 % |
| CH-34 | 170 | 70 | 74 % |
| CH-35 | 172 | 60 | 77 % |
| CH-36 | 112 | 70 | 73 % |

## Independent check: word start vs Silero VAD speech onset (first word after each pause)

| timer | segments | median signed diff (ms) | median abs (ms) | within 120 ms | within 250 ms |
|---|---|---|---|---|---|
| MMS forced alignment | 922 | +50 | 50 | 93.9 % | 98.0 % |
| whisper turbo | 862 | +219 | 291 | 5.3 % | 35.3 % |

The VAD onset carries a 30 ms pad and its own granularity (32 ms frames), so +-60 ms is noise. Whisper's word starts after a pause are systematically late (+219 ms against the acoustic onset, 5 % within 120 ms), which is why the whisper-vs-MMS agreement above stays below 95 %: the disagreement is mostly whisper's DTW timing, not the aligner. MMS onsets sit +50 ms from the acoustic onset (93.9 % within 120 ms, 98.0 % within 250 ms). The independent two-CTC check is in reports/asr/s1_agreement_w2v.md.

Correction (P3b): the first S1 alignment used emissions that lost one 20 ms frame per 30 s window (harness/lib/align.py), so word times ran early by up to 0.4 s inside each 10-min emission block (a 40 ms/min sawtooth). Fixed and re-aligned; word ids are unchanged.
