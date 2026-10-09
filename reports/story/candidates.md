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
| LLM-judge coherence (1-10, mean of 2 full-outline judges) | 7.00 | 6.00 | 6.25 | 6.00 | 6.00 |

Coherence is scored by separate judge invocations that read the ordered outline (`data/derived/story/outline_<X>.md`); authors never grade their own work. The row is the mean of the two full-outline judgements per candidate; partial-input and wrong-file judgements are excluded. See "Coherence (LLM judge)" at the end of this file.

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

## Coherence (LLM judge)

Appended 2026-10-09 from 16 separate judge invocations (none by the story-editor that built the EDLs). Scores and reasons below are the judges' own and are not re-scored here; only the grouping, the means and the "recurring points" list are added. Judges are numbered J1-J16 in the order received.

Not all 16 records are comparable. **10** read a full ordered outline (J1-J5, J8-J12): these give the means. **3** had partial input (J6 placement table only, J7 aggregate metrics only, J16 the generator source only) and are shown but kept out of the means. **3** were pointed at the wrong file (J13-J15) and do not score any candidate.

### Scores

| candidate | full-outline judges | mean | partial-input judges (not in mean) |
|---|---|---|---|
| A | J1 7, J8 7 | **7.00** | none |
| B | J2 6, J9 6 | **6.00** | J7 7.5 (metrics only; inferred, "not a read of the actual story") |
| B100 | J3 6.5, J10 6 | **6.25** | J6 7 (placement table only), J16 7 (story.py only) |
| C | J4 6, J11 6 | **6.00** | none |
| D | J5 6, J12 6 | **6.00** | none |

Including the partial records, B would be 6.5 (n=3) and B100 6.6 (n=4); the ranking does not change. The spread between candidates is 1.0 point at most, with two judges each, so coherence does not separate B, B100, C and D. A scores highest, but it covers only 30.8 % of idea units with 54 prerequisites never mentioned; J8 calls it a survey (chapters of 85-165 s) and J1 a flat 70 minutes of trunk. Coherence alone does not decide ADR-001.

### Recurring points (extracted from the reasons below; not a new judgement)

1. **Orientation stack before CH-03** (B, B100, C, D; 21-27 min). CH-01, DD-P00b, DD-P00 and DD-P01 (or their PT/ins equivalents in C and D) retell the roadmap and the journey two to four times before any teaching. Every judge that saw DD-P00b notes its own title says "alternate take of part 0" (J2, J3, J4, J5, J6, J9, J10, J11, J12, J16).
2. **S1 trunk order problems affect all five candidates, because the trunk is shared.** CH-15 to CH-20 zigzag (spreadsheets after Python and SQL; CH-18 repeats CH-09 themes; DSA and networks split the software strand) (J1). CH-17 (semantic models and measures) comes before CH-23 (warehouse, star schema) (J1, J8). CH-17 to CH-18/CH-19 steps back to engineering craft (J5). The NilePay thread is sparse after CH-00, mostly CH-27 and CH-28 (J1).
3. **Deep-dives that restate the trunk instead of extending it** (B, B100): DD-P08a (CH-10 customer 9), DD-P08b (CH-11 funnel, alias born at SELECT), DD-P11a (CH-15 TRIM 11 to 7), DD-P11b (CH-16 mean vs median), DD-P15 (CH-22 retry doubles the count), DD-P22a (CH-31 learning rate 0.35), DD-P24 (CH-34 saturation) (J2, J3). This is consistent with the Caveats estimate of about 13 min (6-30) of B100 that is restatement.
4. **Deep-dive placement jumps** (B, B100). DD-P07 lands after DD-P10 at CH-14, a Python lesson inside the SQL act (J2, J3, J6, J9, J10, J16). DD-P17 lands after DD-P19b at CH-27 although DataCube is introduced at CH-23/DD-P16 (J3, J9, J10, J16). DD-P14 (Java, JDBC, Spring Boot) hangs off CH-21 with no Java in the trunk, and DD-P15 (the real extension of CH-21) only arrives after CH-22 (J2, J9, J10). DD-P12 follows CH-19 (J3). Some dives use ideas before the trunk teaches them: DD-P05a (set membership, before CH-07), DD-P06a (acceptance tests and Git, before CH-09), DD-P10 (shards, CarbonData, before CH-24) (J2, J9).
5. **CH-04 line "we will meet Airflow in about thirty-five minutes"** holds for the 70-min trunk (J1 sees it land near CH-22) but is wrong once deep-dives are inserted: CH-22 is about 115 min after CH-04 in B (J2) and starts near minute 146 in B100 (J3). Rewrite or condition this line if B or B100 is chosen.
6. **Text fixes the storyboard should carry**: DD-P00 says "ShopFlow" where CH-00 and DD-P00b say "NilePay" (J2, J3, J4); CH-01 ends on a stray line about decimals (J3; the same line closes CH-01-ins in C, J4), CH-24 ends on a dangling colon (J3), and CH-00 opens on "She cannot answer it..." (J4).
7. **Runtime and voice (B, B100)**: 4:09-4:10, above the 2.5-3.5 h target; deep-dives are about 175 of 250 min (70 %); 66 switches (15.8-15.9/h); voice B matches S1 at only 0.59 cosine; voice C is used once (DD-P01); micro-inserts of 0.8-2 min (DD-P06b, DD-P11b, DD-P11c, DD-P19a, DD-P02a, DD-P22a) each cost two switches plus 2 s cards; stacked runs without the narrator: DD-P03+DD-P04 16 min, DD-P10+DD-P07 13.4 min, DD-P19b+DD-P17 12.3 min (J3, J6). Voice and runtime figures come from J2, J3, J6, J9, J10.
8. **C and D**: 39 prerequisite violations each, measured on the global review only (C has had no context review, see Caveats). Examples: Docker/git/shell (PT-P02) before container image (PT-P24), gap 2,422 sentences; firewall (PT-P04) before packet (PT-P13); pandas before dataframe (J11, J12). D's film 2 inserts are all 459 S1 sentences verbatim from film 1, about 54 min, hence 29.9 % redundancy (J12); read alone, D's film 1 would score 8-9 (J5). C has a single deep-dive (DD-P00b), so "extend, do not repeat" is barely exercised (J4, J11).
9. **Where the judges credit the candidates**: the S1 spine CH-00 to CH-36 is a sound arc and the callbacks pay off (orphan order 1007 in CH-10/CH-12, doubled count on retry in CH-22, deadlock CH-13 and hot key CH-25 recalled in CH-36) (J1, J2, J3, J8); deep-dives in the middle acts (DD-P03/P04, P05, P09, P11) extend rather than repeat (J9); B and B100 have 0 prerequisite violations after context review (J6, J7, J9).

### Records excluded from the means (wrong input)

These three scores are placeholders from judges that were pointed at graph files, not at an outline. They are kept for the record and must not be read as scores for any candidate.

- **J13, `corpus/graph/requires_review.jsonl`, 6 (self-flagged low confidence).** 223 review records (forward_ref 121, mention_fp 62, bad_edge 24, mention_fn 10, cycle_edge 6). 42 forward refs are orientation-map lines in CH-00..CH-02 (neural network, loss, weight, neuron named in CH-01 and taught in CH-31; disaster recovery and tracing named in CH-01/CH-02 and taught in CH-34). 27 of 91 chapter-located forward refs span 10 or more chapters (largest 33, for example CH-01 to CH-31 and CH-02 to CH-34), so each needs a visible callback when taught. 30 refs are "named first, decomposed later in the same chapter" (CH-33 x6, CH-24 x4, CH-03 x3). 29 edges dropped and one inverted (table requires row); cycles such as sampling/statistics/distribution and container/docker were broken. Remaining cross-chapter jump-backs: CH-32/CH-33 (5), CH-14 to CH-18 (3), CH-07 to CH-10 (3), CH-02/CH-03 (3).
- **J14, `corpus/graph/requires_clean.jsonl`, 0 (not-assessable marker).** 906 concept-to-concept edges over 452 concepts (428 sources, 256 targets), no cycles, no self-loops, sorted alphabetically by source. No chapters, voices or minutes.
- **J15, `reports/story/order_clean.json`, 1 (placeholder).** Edge-cleanup report: edges 935 to 906, S1 violations 142 to 0, cycles 0, `missing_prereq_in_s1` 54. Its `forward_ref` count is 98 where this file says 121; checked against `requires_review.jsonl`: 98 records have no `context` field (S1) and 23 have `context: B`, so the two figures are consistent.

A clean re-score would point each judge at `data/derived/story/outline_<X>.md`; not done here.

### Judgement detail

Reasons are condensed from the judges' wording; chapter ids, part ids and numbers are as given.

**J1, A, 7**
- Strong spine CH-03 to CH-14: machine, files, Linux, Python, testing/Git, then the database run. The orphan row (order 1007 / customer 9) is planted in CH-10 and paid off in CH-11 (funnel) and CH-12 (silent inner-join drop); CH-13 transactions and CH-14 indexes follow.
- CH-15 to CH-20 zigzag: spreadsheets and applied steps (CH-15) arrive after Python and SQL; CH-18 (software craft) repeats CH-09 testing/review/design; DSA (CH-19) and networks/security (CH-20) sit between BI and ETL and split the software strand.
- CH-17 (semantic models, measures, report) comes before the layers it depends on: ETL/quality (CH-21), DAG/idempotency (CH-22), warehouse/star schema (CH-23). CH-23 runs the dashboard-to-source trace backwards, so CH-17 belongs after CH-23.
- CH-21 to CH-28 is well ordered; CH-26 pays off CH-22 (at-least-once into an idempotent sink); CH-27/CH-28 work as a capstone.
- CH-29 to CH-33 builds cleanly; CH-33's SQL allowlist and read-only role link back to the database chapters.
- The ending is cohesive (CH-04's Airflow reference lands near CH-22, 32-35 min later; CH-34 to CH-36 recall the CH-13 deadlock and CH-25 hot key). Cost: the NilePay thread is sparse (CH-27, CH-28 only), and there are no deep-dives or voice changes, so it is a flat 70 min of trunk.

**J2, B, 6**
- The trunk CH-00 to CH-36 is a sound spine with good callbacks (order 1007 in CH-10/CH-12, doubled count on retry in CH-22, deadlock and hot key in CH-36). Split dives (P05a/b, P08a/b, P11a/b/c, P21a/b, P22a/b) sit after the matching chapters.
- The opening is front-loaded: CH-01, DD-P00b ("alternate take"), DD-P00 (8.3 min), CH-02 and DD-P01 (8.1 min) are four overlapping roadmaps, about 27 min before CH-03, and they preview Airflow, agents and Docker before any vocabulary exists. NilePay is introduced in CH-00 and again in DD-P00b; DD-P00 says ShopFlow.
- Dives restate the preceding chapter: DD-P08b (CH-11 funnel), DD-P08a (CH-10 customer 9), DD-P11a (CH-15 TRIM), DD-P11b (CH-16 mean vs median), DD-P22a (CH-31 rate 0.35), DD-P24 (CH-34 saturation). Poor fit for the "novel idea units" rule.
- Confusing jumps: DD-P14 (Java etc.) has no trunk chapter and splits ETL from orchestration between CH-21 and CH-22; DD-P15 comes only after CH-22; DD-P07 jumps back to Python after DD-P10 and before CH-15; pools are taught again in DD-P13 and DD-P14.
- CH-04's "Airflow in about thirty-five minutes" holds for the trunk alone (CH-22 at about 40 min) but is about 115 min with dives. DD-P05a, DD-P06a and DD-P10 use ideas before the trunk teaches them.
- 66 switches; dives are about 174 of 249 min (70 %), the trunk is a thin spine; stubs (DD-P06b 0.8, DD-P11c 1.4, DD-P11b 1.5, DD-P19a 1.7) cost two switches each; voice C appears once; 4:09 exceeds the target.

**J3, B100, 6.5**
- The spine is logical and cumulative; CH-36 calls back CH-13 (deadlock), CH-25 (hot key), CH-22 (running twice).
- The opening is repetitive: CH-01 then DD-P00b (5.2) and DD-P00 (8.3), two takes of one roadmap, then DD-P01 (8.1) after CH-02; about 27 min before the first teaching in CH-03, previewing Airflow, star schemas, LLMs and agents to a novice.
- Wrong forward reference for this cut: CH-04 says Airflow in about 35 min, but CH-22 starts around minute 146 of 4:10. Naming is inconsistent (DD-P00 ShopFlow vs NilePay).
- Dives re-narrate demos: DD-P08b, DD-P11b, DD-P22a, DD-P15, DD-P24 (see recurring point 3).
- Order breaks: DD-P12 after CH-19, so CH-18's topic is revisited; DD-P07 after SQL III before CH-15; DD-P10 mentions CarbonData and shards before CH-24/CH-25; DD-P17 (Mobile Money star schema, 24 KPIs) follows CH-27/DD-P19b but builds on CH-23/DD-P16.
- Voice is steady within each part but the move from formal S1 to chatty NotebookLM voices is abrupt, and 2-min chapters are followed by 5-8 min dives; stacked runs DD-P03+DD-P04 (16 min), DD-P10+DD-P07 (13.4), DD-P19b+DD-P17 (12.3); DD-P06b is an orphan 0.8-min fragment; CH-01 ends on a stray line about decimals and CH-24 ends on a dangling colon.

**J4, C, 6**
- Macro-progression is sound and bookended: CH-00 cold open (the shoebox question) through foundations, analytics, craft, systems, ETL/warehouse, big data, ML/DL/RAG, ship-it, and a closing wall in CH-35/CH-36.
- The opening is bloated: CH-00, PT-P00, DD-P00b, CH-01-ins and PT-P01 all re-present the roadmap and the NilePay table, about 25 min before teaching; DD-P00b is explicitly an alternate take.
- The only dive, DD-P00b, is mislabelled and misplaced (says "after CH-01" but sits before CH-01-ins); with one dive in 4.5 h, "extend, do not repeat" is not met.
- Most S1 inserts (CH-03/04, CH-06/07, CH-11, CH-13, CH-22, CH-29/30) restate the preceding PT part; CH-11-ins repeats PT-P08's SELECT/alias explanation almost word for word. 47 switches.
- Jump-backs: PT-P17 (Mobile Money/DataCube) is interrupted by PT-P18 (Hadoop/Spark) and then resumed in PT-P19/CH-27; CH-02-ins ("how to read this film") arrives after P00, P01 and the dive; PT-P14 (Java) sits between P13 and P15 with the CH-21 ETL gloss wedged after it.
- The running example is inconsistent (NilePay in S1 inserts and DD-P00b, ShopFlow/api.shopflow in PT-P00 and PT-P13); stray fragments at the end of CH-01-ins and the start of CH-00; voice C is used once.

**J5, D, 6**
- Film 1 (CH-00 to CH-36, voice S1) is a strong linear arc and would score 8-9 alone; the CH-36 close recalls the deadlock and hot-key examples.
- Film 2 tells the roadmap four times in about 25 min: CH-00 insert, PT-P00 (8.8), DD-P00b (5.1, "after CH-01" but placed before CH-01-ins), CH-01-ins, then PT-P01 (8.9).
- The film-1 inserts repeat film 1 near-verbatim (CH-03-ins, CH-06-ins, CH-10-ins, CH-12-ins), each right after a 7-10 min PT part on the same topic (CH-12-ins and CH-13-ins after PT-P09, CH-22-ins after PT-P15).
- 47 switches; a 1-2 min formal S1 insert sits between conversational 6-10 min parts; A/B/C assignment looks arbitrary (C once in PT-P01; B runs PT-P09 to PT-P12).
- Order: CH-17 to CH-18/CH-19 steps back to craft, and PT-P11 to PT-P12 does the same; PT-P07 uses pandas joins and DB connections before SQL joins (PT-P08/P09); PT-P14 (Java, Spring Boot, saga) has no film-1 counterpart or bridge.
- Insert placement is inconsistent (CH-21-ins before PT-P15, others after); PT-P17 comes before the transaction walk-through (PT-P19, CH-27-ins) and reconciliation (PT-P20); CH-00 opens both films.

**J6, B100, 7 (partial input: placement table only; not in mean)**
- Dives follow the curriculum in order, with no jumps back (Python to CH-06..09, SQL to CH-10..14, analytics to CH-15..17, craft CH-19, systems CH-20, backend CH-21, ETL CH-22, warehouse CH-23, big data CH-25, streaming CH-26/27, reconciliation CH-28, ML CH-29/30, DL CH-31/32, RAG CH-33, shipping CH-34, career CH-35); 0 prerequisite violations after context review.
- Orientation is front-loaded: about 21.6 min (DD-P00b 5.2, DD-P00 8.3, DD-P01 8.1) before CH-03, and P00b/P00 largely repeat each other and the CH-01 map.
- Micro-inserts: P02, P05, P06, P08, P09, P11, P19, P21, P22 are split into 2-3 pieces, several under 2 min (DD-P06b 0.8, DD-P11c 1.4, DD-P11b 1.5, DD-P19a 1.7, DD-P02a 1.7, DD-P22a 1.9), each paying 2 s cards plus a voice switch.
- Stacked dives at CH-05 (16 min voice B), CH-14 (13.4 min, with P10 before P07 against P-number order) and CH-27 (12.3 min).
- 66 switches (15.8/h), at most 2 per chapter; voice B matches S1 at 0.59; A/B alternate across CH-05..CH-13, then B at CH-19, A at CH-20, B at CH-21, A at CH-22/23; voice C once (CH-02).
- 4:10:07 against 2.5-3.5 h; about 8.4 % of dive speech may be restatement (about 13 min, range 6-30); coverage 100 %; CH-18 and CH-24 have no inserts while CH-05, CH-14 and CH-27 are heavy.

**J7, B, 7.5 (partial input: `candidates.json` aggregate metrics only; the judge states the score is inferred, "not a read of the actual story"; not in mean)**
- 0 prerequisite violations (21 fixed by 23 accepted context previews), 5 prerequisites never mentioned against 54 in A and 57 in D.
- 37 dives for 37 trunk blocks, 3.9 % redundancy, 99.5 % novel S4 units; C has a single dive, D 29.9 % redundancy.
- 66 switches (15.9/h), none above 2 per chapter; voice match to S1 0.59; S1 70.1 min against A 62.2, B 103.9, C 8.1.
- Rejected alternatives: C (39 violations, up to 3 switches per chapter); D (39 violations, 57 missing, 29.9 % redundancy, two films stitched at 5:44:11); A (smooth, but 30.8 % coverage and 54 missing prerequisites).
- B vs B100: B100 fills the 9 uncovered units but adds 9 excerpts under 20 s, which are choppy; B is the better pick for coherence. B is 4:09:24, over target. The 3:30 cap on B100 removes 40.5 min and drops novel S4 units to 82.3 %; whether the cut breaks prerequisites or dive pairings was not checkable, so it needs a re-check.

**J8, A, 7**
- CH-00 to CH-02 orient the learner, then the acts run Ground Zero, Python, SQL, Analytics, Craft, Systems, Platform, Big data, Domain, AI, Ship, with CH-36 closing; 0 prerequisite violations, 0.1 % redundancy.
- SQL (CH-10 to CH-14) and AI (CH-29 to CH-33) sequences are tight, each chapter extending the one before.
- Mild forward dependency: CH-17 (measures) before CH-23 (dimensional modelling); 54 prerequisite concepts are never taught.
- Abrupt transitions at CH-26 to CH-27 (Kafka to Mobile Money) and CH-28 to CH-29 (governance to ML); the part-to-chapter map homes P17 on CH-27 ahead of P18 on CH-24/CH-25, which suggests the source order had Mobile Money earlier.
- Over-compressed: chapters of about 85-165 s; CH-20 packs networks, HTTP, APIs, identity and security into about 125 s; CH-28 packs four governance topics into 130 s; coverage 30.8 % (34.6 % of content), 1,969 uncovered units; reads as a survey.
- 0 dives and 0 voice switches (S1 only, 70:05, under the 2.5-3.5 h target), so no optional depth for hard chapters such as CH-14, CH-25 and CH-31.

**J9, B, 6**
- Macro arc is sound with most dives directly after the chapter they extend; CH-36 has no dive; 0 prerequisite violations.
- Opening repeats three times before CH-03 (DD-P00b, DD-P00, DD-P01): about 21 min of voice A/C roadmap against about 5 min of S1 trunk.
- Wrong anchors: DD-P07 follows DD-P10 inside CH-14; DD-P14 sits under CH-21 and delays the ETL dive DD-P15 until after CH-22; DD-P17 follows DD-P19b although DataCube was introduced at CH-23/DD-P16.
- Dives run ahead: DD-P06a at CH-08 covers errors, decorators, tests and Git, but "Testing, debugging, Git" is introduced in CH-09; DD-P06b is a stray 0.8-min fragment; DD-P19a/b (1.7 then 5.0 min across CH-26/CH-27) spread one topic thinly.
- The trunk is about 1.5-2.5 min per chapter (about 70 min) against about 175 min of dives, so the trunk is a teaser; 66 switches; dives alternate A and B by source, not by role; voice C appears once as an 8-min block.
- Dives extend rather than repeat in the middle acts (DD-P03/P04, P05a/b, P09a/b, P11a/b/c; split windows k0-23 then k31-66 show real continuation); dives made of 10-16 cut segments (DD-P05a, DD-P12, DD-P24) risk choppiness; 4:09 is above target.

**J10, B100, 6**
- Macro arc is sound; each trunk chapter is a 1.4-2.3 min S1 summary followed by a dive.
- The opening repeats itself (DD-P00b then DD-P00 back to back, DD-P01 as a third pass); about 22 min of preview before CH-03, the weakest part of the film.
- Out of part order: DD-P07 after DD-P10 at CH-14; DD-P17 after DD-P19b at CH-27, where it would read better right after DD-P16 at CH-23.
- Anchor mismatches: DD-P14 hangs off CH-21 with no Java in the trunk; DD-P15 comes after CH-22; Hadoop (DD-P18) is anchored on CH-25 (Spark) and CH-24 has no dive.
- 66 switches (15.8/h); voice C once, between voice A blocks; A/B alternate arbitrarily in the Python and SQL acts (P05 A, P06 B, P08 A, P09 B); every dive is entered from and returned to S1, and four of them are only 0.8-2 min.
- 4:10:07 against target, about 175 min of dive against about 70 of trunk, so the short S1 summaries give little to hold the film together; repeated and split titles (P02a/b, P05a/b, P11a/b/c) make some dives read as continuations.

**J11, C, 6**
- Macro arc is sound (foundations to ship-it and close); short S1 glosses of 0.8-2 min after each part read as recap-and-extend; the CH-00 cold open (1.5 min) is a good hook.
- The opening is repetitive: CH-01 is covered three times in a row (PT-P00 8.8 min, DD-P00b 5.1 min in the same voice A, CH-01-ins), with PT-P01 and CH-02-ins twice more; about 25 min of orientation.
- Act order jumps: PT-P07 (Python for data, home CH-14/CH-21) sits between Python and SQL under the label "Platform", has no CH insert, and uses DB connections, upsert and fan-out before PT-P08 teaches primary key and cardinality. Domain (PT-P17, CH-27) and Big data (PT-P18, CH-24/CH-25) interleave, so the Mobile Money reports come before Hadoop and Spark.
- Forward references are not repaired: 39 prerequisite violations plus 3 never mentioned. Docker, git and shell (PT-P02, CH-04) before container image (PT-P24, CH-34), gap 2,422 sentences; firewall (PT-P04) needs packet (PT-P13), about 1,000; HTTP (PT-P06) needs the TCP handshake (PT-P13); refactoring (PT-P06) needs clean code (PT-P12); Spark (PT-P02) needs dataframe (PT-P07); dashboard (PT-P08) needs KPI/measure (PT-P11).
- Inserts arrive after the part they gloss, so definitions come too late: "filesystem" is defined in CH-04-ins after PT-P02 used shell, redirection and git; "column" in CH-07-ins after csv and index appear; "interface" near S1:0272 after PT-P12 used polymorphism, repository and design pattern.
- 47 switches (10.3/h); parts alternate A/B/A/B across act boundaries; voice C once (PT-P01); voice match to S1 0.54; 4:34 runs about an hour over target.

**J12, D, 6**
- Both films follow the same arc; film 1 (70 min, S1, 0 switches) is clean and linear; in film 2 each long part sits 1-3 blocks from its anchor insert.
- The only dive, DD-P00b, is an "alternate take of part 0" that repeats PT-P00 (8.8 min) and sits before CH-01-ins.
- Film 2 spends about 27 min (CH-00, PT-P00, DD-P00b, CH-01, PT-P01, CH-02) on orientation before PT-P02/CH-03; the S1 "map" (CH-01-ins) comes after the long roadmap it summarises, while film 1 does the same in about 5 min.
- Out-of-order parts: PT-P07 (anchor CH-21) sits after CH-09 and before SQL, 19 blocks before CH-21-ins; PT-P17 comes before Hadoop/Spark/Kafka and the transaction chapter it depends on; PT-P14 (Java/Spring/saga) has no trunk Java chapter. 39 prerequisite violations (Docker before container image, gap 2,422; firewall before packet; pandas before dataframe).
- 47 switches in 64 blocks, S1 alternating with A/B/C every 8-12 min; A and B are not tied to topic (Python I A to Python II B; SQL I A to SQL II/III B); voice C once (PT-P01, 8.9 min); voice match to S1 0.636.
- All 459 S1 sentences in film 2's inserts are verbatim from film 1 (about 54 min), redundancy 29.9 %; several inserts are clipped excerpts (CH-13-ins 3 segments/8 sentences, CH-34-ins 6 sentences, CH-36-ins 2 segments); the file has no glosses, only `title_en`.

**J16, B100, 7 (partial input: `tools/dclib/story.py`, the generator; the judge could not check actual text; not in mean)**
- Scored the structure the generator encodes, not a rendered outline (no glosses, minutes or voice labels).
- Progression is logical (CH-00 to CH-35 orientation through career), each dive is anchored after a chapter on the same topic, and placement is monotone inside a part.
- Dives extend by design (windows kept at >= 60 % novel units, restatements cut at clean pauses, cross-part duplicates kept once); the risk is the early chapters, where CH-01 stacks DD-P00b before DD-P00 after an S1 cold open and roadmap, and CH-02 adds DD-P01.
- Possible jumps back: P17 homed on CH-27 and sorted after P19; P07 split between CH-14 and CH-21 and sorted after P10.
- Voice changes are signposted by 2 s cards but may stack: CH-05 (P03, P04), CH-14 (P10, P07) and CH-27 (P19b, P17) each hold two consecutive dives; `max_switches_per_trunk_chapter` has to be checked against actual output.
- B100's excerpts under 20 s (250-700 ms gaps) risk choppy, context-poor fragments, and split parts reuse the whole-part title (for example DD-P07a and DD-P07b), so the card promises more than the excerpt covers and two inserts look identical.

Regeneration warning: `dc story candidates` (`tools/dclib/story.py`, lines 812-813) rewrites this file and resets the coherence row to "pending". Re-append this section after any regeneration.
