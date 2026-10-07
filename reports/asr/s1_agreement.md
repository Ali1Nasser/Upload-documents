# S1 aligner agreement (MMS forced alignment vs faster-whisper turbo word timing)

Script words 6644, whisper words 6679, matched (identical folded token in a Levenshtein alignment) 5393 (81.2 % of script words).

| |start diff| <= | share of matched words |
|---|---|
| 60 ms | 27.9 % |
| 120 ms | 45.7 % |
| 250 ms | 76.2 % |
| 500 ms | 95.3 % |

Median signed start difference (aligner minus whisper): -80 ms; median |diff| 140 ms; p90 330 ms.
Restricted to aligner conf >= 0.7 (3997 words): 46.5 % within 120 ms.

Whisper word times come from cross-attention DTW and are known to be coarser than a CTC forced alignment; treat this as a sanity check on the MMS times (no systematic offset, no drifting chapters), not as a ground truth. Gate G3 asks for >= 95 % within 120 ms for scripted audio; the independent second CTC model for that metric is listed as an open item in docs/handoffs/PHASE-03a.md.

## Per chapter (median |start diff| ms, share within 120 ms)

| chapter | n | median | within 120 ms |
|---|---|---|---|
| CH-00 | 117 | 50 | 75 % |
| CH-01 | 88 | 55 | 77 % |
| CH-02 | 142 | 115 | 61 % |
| CH-03 | 125 | 160 | 22 % |
| CH-04 | 133 | 210 | 19 % |
| CH-05 | 133 | 270 | 8 % |
| CH-06 | 115 | 80 | 64 % |
| CH-07 | 126 | 40 | 84 % |
| CH-08 | 137 | 80 | 82 % |
| CH-09 | 147 | 140 | 36 % |
| CH-10 | 151 | 200 | 16 % |
| CH-11 | 147 | 280 | 10 % |
| CH-12 | 146 | 40 | 85 % |
| CH-13 | 115 | 60 | 81 % |
| CH-14 | 206 | 120 | 51 % |
| CH-15 | 144 | 215 | 15 % |
| CH-16 | 151 | 290 | 4 % |
| CH-17 | 141 | 40 | 79 % |
| CH-18 | 154 | 60 | 83 % |
| CH-19 | 154 | 110 | 64 % |
| CH-20 | 159 | 200 | 16 % |
| CH-21 | 144 | 270 | 7 % |
| CH-22 | 146 | 60 | 70 % |
| CH-23 | 161 | 40 | 89 % |
| CH-24 | 126 | 120 | 55 % |
| CH-25 | 138 | 190 | 15 % |
| CH-26 | 155 | 270 | 15 % |
| CH-27 | 153 | 60 | 68 % |
| CH-28 | 185 | 50 | 81 % |
| CH-29 | 152 | 130 | 41 % |
| CH-30 | 171 | 200 | 12 % |
| CH-31 | 160 | 280 | 11 % |
| CH-32 | 150 | 60 | 71 % |
| CH-33 | 167 | 70 | 83 % |
| CH-34 | 170 | 140 | 41 % |
| CH-35 | 172 | 230 | 9 % |
| CH-36 | 112 | 300 | 9 % |

## Independent check: word start vs Silero VAD speech onset (first word after each pause)

| timer | segments | median signed diff (ms) | median abs (ms) | within 120 ms | within 250 ms |
|---|---|---|---|---|---|
| MMS forced alignment | 922 | -22 | 78 | 64.6 % | 95.2 % |
| whisper turbo | 862 | +219 | 291 | 5.3 % | 35.3 % |

The VAD onset carries a 30 ms pad and its own granularity (32 ms frames), so +-60 ms is noise. Whisper's word starts after a pause are systematically late (median +219 ms against the acoustic onset), which is why the whisper-vs-MMS agreement above is far below 95 %: the disagreement is mostly whisper's DTW timing, not the aligner. MMS onsets sit within 120 ms of the acoustic onset for about two thirds of pauses and within 250 ms for most of the rest.
