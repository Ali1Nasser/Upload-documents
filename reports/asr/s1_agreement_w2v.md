# S1 aligner agreement: MMS-300m vs wav2vec2-large-xlsr-53-arabic (second CTC aligner)

Words in the script 6644; comparable (aligned by both, not interpolated) 6644 (100.0 %). Same chapter windows, same alignment surrogate; start time of a word = first frame of its first letter's CTC run (identical rule for both models). Coverage of the second aligner's vocabulary: 5707 Arabic-only tokens, 937 tokens with Latin letters mapped to approximate Arabic letters (6175 Latin characters), 0 tokens with nothing to align.

| word set | n | start <= 60 ms | start <= 120 ms | start <= 250 ms | end <= 120 ms |
|---|---|---|---|---|---|
| all comparable words | 6644 | 93.1 % | **97.9 %** | 99.7 % | 94.3 % |
| Arabic-script words (no Latin letters) | 5667 | 93.8 % | **98.2 %** | 99.8 % | 95.6 % |
| words containing Latin letters (w2v letters mapped) | 977 | 89.3 % | **96.5 %** | 99.6 % | 86.5 % |
| both aligners conf >= 0.5 | 5150 | 96.1 % | **99.2 %** | 100.0 % | 96.9 % |

Median signed start difference (w2v minus MMS): +0 ms; median |diff| 0 ms; p90 40 ms; p99 180 ms. After removing the median offset: 97.9 % within 120 ms.

G3 asks for >= 95 % of words within 120 ms for scripted audio. Verdict on the Arabic-script words: **PASS** (98.2 %); on all comparable words: **PASS** (97.9 %).

## Per chapter (all comparable words)

| chapter | n | median signed ms | start <= 120 ms | w2v median conf |
|---|---|---|---|---|
| CH-00 | 135 | +0 | 98 % | 0.802 |
| CH-01 | 143 | +0 | 97 % | 0.750 |
| CH-02 | 162 | +0 | 99 % | 0.786 |
| CH-03 | 150 | +0 | 99 % | 0.798 |
| CH-04 | 159 | +0 | 97 % | 0.750 |
| CH-05 | 160 | +0 | 99 % | 0.764 |
| CH-06 | 135 | +0 | 96 % | 0.763 |
| CH-07 | 155 | +0 | 99 % | 0.750 |
| CH-08 | 165 | +0 | 97 % | 0.758 |
| CH-09 | 174 | +0 | 97 % | 0.750 |
| CH-10 | 166 | +0 | 98 % | 0.824 |
| CH-11 | 199 | +0 | 96 % | 0.833 |
| CH-12 | 195 | +0 | 97 % | 0.800 |
| CH-13 | 155 | +0 | 96 % | 0.736 |
| CH-14 | 263 | +0 | 99 % | 0.800 |
| CH-15 | 188 | +0 | 97 % | 0.796 |
| CH-16 | 180 | +0 | 98 % | 0.821 |
| CH-17 | 166 | +0 | 98 % | 0.827 |
| CH-18 | 183 | +0 | 98 % | 0.785 |
| CH-19 | 186 | +0 | 97 % | 0.752 |
| CH-20 | 185 | +0 | 97 % | 0.780 |
| CH-21 | 179 | +0 | 99 % | 0.771 |
| CH-22 | 183 | +0 | 98 % | 0.832 |
| CH-23 | 207 | +0 | 99 % | 0.800 |
| CH-24 | 173 | +0 | 98 % | 0.800 |
| CH-25 | 182 | +0 | 100 % | 0.785 |
| CH-26 | 184 | +0 | 97 % | 0.715 |
| CH-27 | 175 | +0 | 98 % | 0.803 |
| CH-28 | 216 | +0 | 99 % | 0.803 |
| CH-29 | 187 | +0 | 98 % | 0.800 |
| CH-30 | 206 | +0 | 99 % | 0.800 |
| CH-31 | 193 | +0 | 99 % | 0.750 |
| CH-32 | 191 | +0 | 98 % | 0.802 |
| CH-33 | 219 | +0 | 97 % | 0.750 |
| CH-34 | 207 | +0 | 98 % | 0.767 |
| CH-35 | 212 | +0 | 97 % | 0.800 |
| CH-36 | 126 | +0 | 97 % | 0.796 |

Largest disagreements (word index, text, diff ms): 2025 دي. +2340; 2142 خمسميّة، -540; 312 جاي، +480; 2101 مجموعة -340; 3817 اتأثروا. +340; 6030 فالفلتر +320; 2802 وتسعين -300; 5308 تشرحه. +300; 1659 تقدر +280; 510 cache، -260; 1513 case؟ -260; 1755 والصفوف -260; 4598 تصدّق +260; 5771 query -260; 5974 خمسة -260
