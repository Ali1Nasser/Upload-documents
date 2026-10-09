# Candidate EDLs for ADR-001

Generated 2026-10-09T01:29:50Z by `dc story candidates` (story-editor). Inputs: P4 graph (idea units, novelty, concept mentions), corpus/sentences, corpus/audio/{voices,assets}.json, corpus/canon/chapters.json, corpus/graph/requires_review.jsonl. EDLs: `corpus/edl/candidates/<X>.json`; judge outlines: `data/derived/story/outline_<X>.md`.

## Metrics

| metric | A | B | B100 | C | D |
|---|---|---|---|---|---|
| Runtime | 1:10:05 | 4:09:24 | 4:10:07 | 4:34:05 | 5:44:11 |
| Sentences | 562 | 2621 | 2630 | 2985 | 3547 |
| Trunk blocks / Deep-Dives | 37 / 0 | 37 / 37 | 37 / 37 | 37 / 1 | 74 / 1 |
| Spoken segments (cuts + 1) | 37 | 302 | 311 | 97 | 134 |
| Unique idea-unit coverage % | 30.8 | 99.7 | 100.0 | 99.9 | 99.9 |
|   content units (not transition-only) % | 34.6 | 99.8 | 100.0 | 99.8 | 99.9 |
|   novel S4 units % | 0.5 | 99.5 | 100.0 | 99.9 | 99.9 |
| Redundancy % (speech time) | 0.1 | 3.9 | 3.9 | 5.2 | 29.9 |
| S4 cross-part duplicates dropped | 0 | 53 | 53 | 1 | 1 |
| Voice switches | 0 | 66 | 66 | 47 | 47 |
| Voice switches / hour | 0.0 | 15.9 | 15.8 | 10.3 | 8.2 |
| Max switches per trunk chapter | 0 | 2 | 2 | 3 | 3 |
| Prereq violations, global review only | 0 | 21 | 21 | 39 | 39 |
| Prereq violations, after its context review | 0 | 0 | 0 | 39 | 39 |
| Prerequisite never mentioned | 54 | 5 | 5 | 3 | 57 |
| Audio-quality proxy (0-1) | 1.0 | 0.896 | 0.896 | 0.884 | 0.908 |
| Voice match to S1 (ECAPA cos, time-weighted) | 1.0 | 0.592 | 0.592 | 0.542 | 0.636 |
| Short excerpts < 20 s | 0 | 0 | 9 | 0 | 0 |
| Outline words | 3655 | 8426 | 8422 | 7317 | 8194 |
| Voice time, min | S1 70.1 | A 62.2, B 103.9, C 8.1, S1 70.1 | A 62.5, B 104.2, C 8.1, S1 70.1 | A 77.7, B 131.2, C 8.9, S1 54.4 | A 77.7, B 131.2, C 8.9, S1 124.4 |
| Est. P8-P9 subagent tokens (5-8 k/sentence) | 2.8-4.5 M | 13.1-21.0 M | 13.2-21.0 M | 14.9-23.9 M | 17.7-28.4 M |
| Est. final render h (5.6-8.2 h per film hour, render_bench) | 7-10 | 23-34 | 23-34 | 26-37 | 32-47 |
| LLM-judge coherence (1-10) | pending | pending | pending | pending | pending |

Coherence is scored by a separate judge invocation that reads `data/derived/story/outline_<X>.md`; authors never grade their own work.

D: film 1 1:10:05 + film 2 4:34:05; prerequisite counts are per film, summed; redundancy counts film 2 against film 1.

## B vs B100

B is the spec'd rule (windows >= 20 s). Its windows already absorb 99.5 % of novel S4 idea units; the 9 units it misses sit in novel cores shorter than 20 s that cannot merge. B100 adds them as 9 short excerpts inside the same part's Deep-Dive (+43 s), reaching the 100 % coverage rule with no extra voice switch.

**Runtime vs the 2.5-3.5 h target.** B100 runs 4:10:07. Capping it at 3:30:00 means dropping 40.5 min of the least dense Deep-Dive segments, and novel-unit coverage falls to 82.3 %. That needs an ADR waiver of the 100 % rule. The novelty figures are upper bounds: the P4 residual audit estimates 171 (range 75-393) of 2,037 novel sentences are restatements of S1. That is 8.4 % (3.7-19.3 %) of Deep-Dive speech, about 13 min (6-30 min) of B100 that a stricter merge could remove.

## Rules applied

- Windows (B/B100): novel cores merged across restated gaps <= 20 s while >= 60 % of the window's idea units are novel; trimmed to sentence boundaries. Restatements inside are dropped only where both cuts fall in pauses >= 250 ms. Question/prediction setups that frame a novel answer are kept, and so are answers to novel questions.
- Duplicates across S4 parts are kept once, preferring the voice-A member, otherwise the first in EDL order.
- Placement: each part has editorial home chapters (one voice per chapter block, so each trunk chapter has <= 2 switches). A part split across several home chapters is assigned monotonically (never reordered) by concept and S1-link affinity.
- Segment handles: 60 ms before the first onset, 90 ms after the last offset. Cut gaps are 250-700 ms. Deep-Dive entry and exit cards are 2 s each; C/D part cards are 2 s.
- Audio-quality proxy per asset = min(1, bandwidth / S1 bandwidth) x (1 - 0.01 x clip runs) x 0.92 for lossy S4 MP3 x 0.9 if the noise floor is above -70 dB, time-weighted. DNSMOS/UTMOS stay null (blocked weights, reports/audio/sources.md).

## Prerequisite graph review

`corpus/graph/requires_review.jsonl`: 223 decisions (bad_edge 24, cycle_edge 6, forward_ref 121, mention_fn 10, mention_fp 62). By context: B 40, S1 183. Cleaned edges: `corpus/graph/requires_clean.jsonl` (935 -> 906). The S1 designed order goes from 142 to **0** violations, and cycles go from 7 to 0.
- *bad_edge*: the prerequisite is wrong or too weak (for example database->csv, row->table, now inverted to table->row, and rollback->deployment, since rollback also means a DB undo). Dropped or inverted.
- *cycle_edge*: one edge per cycle is dropped (assert->test, duplicates->distinct, overfitting->bias-variance, distribution->statistics, distribution->sampling, container-image->docker).
- *mention_fp*: the tagger hit a homonym (Linux group vs GROUP BY, pull request vs HTTP request, /dev/null vs NULL, 'solid ground' vs SOLID). The mention is removed. For S4, a use must also appear in the P3 per-sentence `terms`, and part-level sense filters cover recurring homonyms.
- *mention_fn*: the prerequisite is stated in the same or an earlier sentence but was not tagged (for example 'CSV is rows and columns'). The mention is added.
- *forward_ref*: a genuine preview, such as the CH-01 map, 'we will meet Airflow in 35 minutes', or naming a concept and decomposing it in the next sentences. The edge is kept and the early mention is marked as a preview; the storyboard should tag it as a 'later' callout. Previews recorded against a candidate order apply only to that candidate.
- Signposting (transition/recap sentences and the orientation material CH-00..02, P00, P00b, P01) is never counted as a use.

## Deep-Dive placement (B100)

| Deep-Dive | after | voice | min |
|---|---|---|---|
| DD-P00b The real job, the journey map and the data contract (alternate take of | CH-01 | A | 5.2 |
| DD-P00 The whole roadmap: from zero to an AI-powered data platform | CH-01 | A | 8.3 |
| DD-P01 The journey and the visual language: how we will learn and what we wil | CH-02 | C | 8.1 |
| DD-P02a The machine, files and the terminal: from the byte to the first pipeli | CH-03 | A | 1.7 |
| DD-P02b The machine, files and the terminal: from the byte to the first pipeli | CH-04 | A | 2.7 |
| DD-P03 Linux Admin I: permissions, users, processes and packages | CH-05 | B | 8.6 |
| DD-P04 Linux Admin II: services, logs, disk, SSH and security, the night of t | CH-05 | B | 7.4 |
| DD-P05a Python I: from value to function, collections, files and environments | CH-06 | A | 3.9 |
| DD-P05b Python I: from value to function, collections, files and environments | CH-07 | A | 3.7 |
| DD-P06a Python II: state, memory, errors, decorators, tests and Git | CH-08 | B | 6.0 |
| DD-P06b Python II: state, memory, errors, decorators, tests and Git | CH-09 | B | 0.8 |
| DD-P08a SQL I: why a database, the relational model, normalization, the query  | CH-10 | A | 3.2 |
| DD-P08b SQL I: why a database, the relational model, normalization, the query  | CH-11 | A | 2.9 |
| DD-P09a SQL II: joins and fan-out, windows, CTEs, NULL logic, transactions and | CH-12 | B | 3.3 |
| DD-P09b SQL II: joins and fan-out, windows, CTEs, NULL logic, transactions and | CH-13 | B | 2.2 |
| DD-P10 SQL III: indexes, reading the plan, the tuning loop, dialects and SQL  | CH-14 | B | 5.8 |
| DD-P07 Python for data: pandas, database connections, ETL, pools and tests | CH-14 | B | 7.6 |
| DD-P11a Analytics: dirty data and applied steps, statistics from mean to A/B,  | CH-15 | B | 3.0 |
| DD-P11b Analytics: dirty data and applied steps, statistics from mean to A/B,  | CH-16 | B | 1.5 |
| DD-P11c Analytics: dirty data and applied steps, statistics from mean to A/B,  | CH-17 | B | 1.4 |
| DD-P12 Software craft and DSA: coupling, cohesion, SOLID, OOP and patterns, r | CH-19 | B | 5.6 |
| DD-P13 Systems and the web: DNS to database, HTTP and status codes, API contr | CH-20 | A | 5.9 |
| DD-P14 Backend in depth: Java, collections and streams, JDBC and transactions | CH-21 | B | 7.6 |
| DD-P15 ETL and DAGs: validate before transform, six quality dimensions, quara | CH-22 | A | 6.9 |
| DD-P16 The warehouse: ODS/DW/ADS layers, star schema and grain, the cube, non | CH-23 | A | 6.5 |
| DD-P18 Big data: Hadoop (HDFS, YARN, MapReduce) and Spark (laziness, stages,  | CH-25 | B | 7.3 |
| DD-P19a Kafka and streaming, and one Mobile Money transaction: offsets, lag, d | CH-26 | B | 1.7 |
| DD-P19b Kafka and streaming, and one Mobile Money transaction: offsets, lag, d | CH-27 | B | 5.0 |
| DD-P17 Huawei DataCube and Mobile Money reports: sources and layers, storage, | CH-27 | B | 7.3 |
| DD-P20 Reconciliation, D&IM testing, governance and DR: four kinds of differe | CH-28 | A | 6.3 |
| DD-P21a Machine learning: business question and baseline, split and leakage, m | CH-29 | B | 2.1 |
| DD-P21b Machine learning: business question and baseline, split and leakage, m | CH-30 | B | 2.4 |
| DD-P22a Deep learning and Transformers: a neuron by hand to backpropagation, t | CH-31 | B | 1.9 |
| DD-P22b Deep learning and Transformers: a neuron by hand to backpropagation, t | CH-32 | B | 3.7 |
| DD-P23 Embeddings, RAG and agents: meaning as position, the pipeline and its  | CH-33 | B | 5.0 |
| DD-P24 Ship it: containers and layer cache, docker-compose, the CI/CD gate an | CH-34 | A | 5.3 |
| DD-P25 Evidence and career: the artifact chain, the five-minute defence, inte | CH-35 | B | 6.8 |

## Producer notes (verbatim, reports/story/producer_notes.md)

Facts the Council must weigh alongside the content evidence:

1. **Usage budget is the binding constraint, not CPU.** The production has hit the account's usage limit 4 times
   (each time agents failed until the window reset, roughly every 5 h). Subagent tokens so far: P0 ~0.85 M,
   P1-P3a ~4.9 M, P3b ~5.6 M, P4 ~2.7 M (≈ 14 M total). P7-P9 cost scales with the number of EDL sentences
   (one scene-director pass + critic + fixes per chapter): S1 alone = 562 sentences; all S4 = 2,564 sentences.
   Rough planning figure: ~5-8 k subagent tokens per EDL sentence through P8-P9 → A ≈ 3-5 M, B ≈ 12-18 M, C ≈ 15-22 M.
2. **Render cost** (reports/perf/render_bench.md, harness/state/budget.json render_bench): `--gl=swiftshader` is 2.3-5x faster
   than swangle; a 3 h film at 15 % real-time 3D ≈ 24.7 h render, at 5 % ≈ 16.7 h; 70 min ≈ 6-10 h.
3. **Voices** (corpus/audio/voices.json): S4 uses three voices — A (close to S1/S2), B (close to the S3 TTS voice), C (P01, close to the EN S5 voice).
   Voice-A parts can follow the trunk with the least audible switch.
4. **Novelty** (reports/graph/novelty.md): ~73 % (64-77 %) of S4 idea units are new claims vs S1 (upper bound 79.7 %),
   but only ~7.6 % introduce concepts S1 never mentions; P14 (backend) and P17 (DataCube) are the most novel.
5. **The user's explicit intent**: one long Egyptian-Arabic film containing all content (semantic merge), every word illustrated, premium look.
   A shorter cut that drops content must be justified by the merge (redundancy), not by cost alone; cost may shape *how* (e.g. 2.5D vs 3D), not *what*.

## Caveats

- Coverage counts idea units from P4 (2,846). Novelty is claim-level and an upper bound (see above).
- Voice A (10 S4 parts) is the same family as S1, but it is a different recording and narrator (cosine 0.54-0.62). P01 is voice C. Every Deep-Dive is an audible switch, framed by its cards.
- C has not had its own context review: its 39 violations are measured on the global review only, which is comparable to B's 21.
- C/D keep each S4 part whole, so restated S4 material stays and redundancy is measured only against earlier EDL speech.
