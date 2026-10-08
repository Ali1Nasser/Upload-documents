# ASR calibration (P3.4)

Reference: the TTS-clean chapter scripts (`LMArena/Folder 1/dacamp/tts/CH-nn_k.txt`, identical to master.md §8 Egyptian narration within punctuation), force-aligned to S1 by `dc align scripted`; the reference for a window is the script words whose aligned start lies inside the window. Windows: 5 x 120 s = 10 min, starting at the first second of CH-03, CH-11, CH-20, CH-26, CH-33 (5:00 to 63:55 of S1).

Settings (all variants): faster-whisper int8 CPU, language=ar, word_timestamps, vad_filter, condition_on_previous_text=False, initial_prompt = 60 Latin glossary terms (master §10.1/§10.2 + most frequent Latin tokens in the scripts). Beam 5 unless the variant name ends in -b1 (greedy). The turbo hypotheses are the full-S1 turbo run (3 shards, beam 5) cut to the same windows; the other variants ran on the five clips.

Normalisation: NFKC, tashkeel and tatweel removed, alef/ya/ta-marbuta/hamza folded, digits to ASCII, Latin casefolded, punctuation dropped, Arabic/Latin joins split ('الـmodel' = 'ال model'). CER over the space-joined string, WER over tokens. Latin recall = share of script Latin tokens that the model wrote verbatim in Latin script (the rest were transliterated into Arabic or lost).

| window | ref words | turbo (full S1 run) CER | turbo (full S1 run) WER | turbo (full S1 run) Latin | large-v3 CER | large-v3 WER | large-v3 Latin | large-v3-b1 CER | large-v3-b1 WER | large-v3-b1 Latin |
|---|---|---|---|---|---|---|---|---|---|---|
| CH-03 @ 5:00 | 205 | 0.124 | 0.197 | 0.32 | 0.112 | 0.183 | 0.43 | 0.110 | 0.183 | 0.43 |
| CH-11 @ 18:00 | 199 | 0.222 | 0.316 | 0.33 | 0.142 | 0.217 | 0.81 | 0.158 | 0.245 | 0.72 |
| CH-20 @ 35:40 | 182 | 0.184 | 0.193 | 0.48 | 0.085 | 0.104 | 0.77 | 0.086 | 0.109 | 0.77 |
| CH-26 @ 47:40 | 174 | 0.111 | 0.194 | 0.60 | 0.088 | 0.158 | 0.72 | 0.086 | 0.148 | 0.74 |
| CH-33 @ 61:55 | 191 | 0.191 | 0.283 | 0.46 | 0.092 | 0.170 | 0.81 | 0.094 | 0.174 | 0.81 |
| **all 5 windows** | 1040 | **0.165** | **0.236** | **0.49** | **0.103** | **0.167** | **0.74** | **0.106** | **0.173** | **0.73** |

Throughput (2-3 jobs sharing 4 vCPUs with other agents' work, so pessimistic): turbo RTF 1.04 on the full S1 (2 threads); large-v3 RTF 3.7, 2.9, 2.1, 3.3, 2.6 (2 threads); large-v3-b1 RTF 2.6, 2.4, 2.5, 2.3, 2.4 (2 threads). The P0 benchmark on an idle box (3 threads) measured turbo 0.87-1.05 and large-v3 3.6-6.2.

## Decision

**Chosen: turbo (large-v3-turbo, int8, beam 5, glossary prompt) for the S4 bulk; large-v3 only for disputed segments after polishing.**

Numbers (5 windows, 1040 script words, re-scored after the P3b frame-drift fix moved the aligned reference windows by up to 0.4 s): large-v3 beats turbo by 6.2 CER points (0.103 vs 0.165) and 6.9 WER points (0.167 vs 0.237); Latin-term recall 0.73 vs 0.49. Greedy large-v3 (-b1) loses almost nothing (CER 0.107, WER 0.173, Latin 0.73) but saves only about 20 % of the time (RTF 2.4 vs 3.0 on a busy box), because the 32-layer encoder dominates, so decoding strategy is not a lever.

Where the gap comes from (token-level, same windows): on Arabic-script script words turbo errs on 15.3 % (133/867) against 12.3 % (107/867) for large-v3, a 3-point difference; on Latin-script words (terms) turbo errs on 61.6 % (109/177) against 35.6 % (63/177). Most of the turbo deficit is therefore Latin terms written in Arabic script or misspelled, which is exactly what the P3.7 glossary polishing (master §10 'always English' terms, retrieval over the matching NotebookLM part) is specified to repair. Segment avg_logprob does not flag the errors (correlation -0.10 with segment WER; turbo's chunk logprob spans only -0.11 to -0.15 on this clean read), so the large-v3 re-decode should be triggered by polishing disagreements, not by logprob.

Cost: S4 is 3.7 h of audio: turbo about 4 slot-hours (RTF 0.9-1.0 on 2 threads), large-v3 about 9-11 slot-hours (RTF 2.1-3.7), against a P3 budget of 4-10 h CPU of which S1 alignment, S1 ASR, calibration and QA have already used about 4 h. Turbo fits; large-v3 for all of S4 does not. Revisit if the polishing pass shows turbo errors it cannot fix from the glossary and part source.

Prompt terms used:

`partition, offset, lineage, idempotency, context window, grain, fan-out, sargable, skew, backfill, SLO, RPO, RTO, leakage, groundedness, guardrail, SQL, Python, Java, Linux, Git, Docker, Kubernetes, API, HTTP, JSON, ETL, ELT, ODS, ADS, HDFS, Hadoop, Spark, Kafka, Airflow, dbt, ML, AI, LLM, RAG, Transformer, embedding, vector database, query, schema, table, row, column, index, join, consumer, producer, pipeline, dashboard, deployment, test, bug, cache, retry, timeout`
