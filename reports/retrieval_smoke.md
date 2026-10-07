# Retrieval smoke test

Created 2026-10-07T16:49:33Z by `dc corpus smoke`. Mode: BM25 only (dense vectors not built). Chunks: 15069. Index terms: 23807.

Result: **10/10** queries return an expected source in the top 3.

A query passes when one of its top-3 chunks comes from a teaching source (regex below) and its text contains the required term. The expectation was fixed from the sources, not from the ranking. The column `specific part` is extra information: the best rank (top 10) of the single most precise source for the topic.

Teaching-source regex: `master\.md or Unified_Master or Merged_Video_Master or Visual_Video_Master or DA_Camp_Part_\d\d_of_25 or part[A-F]\.md or KNOWLEDGE or Unified_Narration or Narration_Script or Narration_Egyptian`

| # | query | required term | rank (top 3) | specific part | specific rank | top-3 |
|---|---|---|---|---|---|---|
| 1 | `fan-out SUM doubles` | fan | 1 | Part_09_of_25 | 3 | 1. partA.md > 6.4 Fan-out — CH-12<br>2. DA_Camp_00_Unified_Master_Full_Egyptian.md > المشهد 3 — توقّع: ست عملاء داخلين… ك<br>3. DA_Camp_Part_09_of_25_SQL_II_Joins_Windows_N > المشهد 3 — توقّع: ست عملاء داخلين… ك |
| 2 | `consumer lag` | lag | 1 | Part_19_of_25 | - | 1. DA_Camp_28min_Merged_Video_Master_Source.md > 13. Kafka & Near-Real-Time Streaming<br>2. DA_Camp_28min_Narration_Egyptian_Arabic_V2.m > 13. Kafka & Near-Real-Time Streaming<br>3. DA_Camp_NotebookLM_Visual_Video_Master.md > B6. Streaming, Kafka and event think |
| 3 | `الـgrain` | grain | 1 | Part_16_of_25 or Part_08_of_25 or Part_11_of_25 | 3 | 1. DA_Camp_00_Unified_Master_Full_Egyptian.md > المشهد 10 — سؤال الـgrain<br>2. DA_Camp_00_Unified_Master_Full_Egyptian.md > 08.5 خريطة الجزء<br>3. DA_Camp_Part_08_of_25_SQL_I_Relational_Model > المشهد 10 — سؤال الـgrain |
| 4 | `idempotency retry duplicates` | idempot | 1 | Part_15_of_25 | - | 1. DA_Camp_28min_Merged_Video_Master_Source.md > 09. ETL / ELT + DAG Orchestration<br>2. DA_Camp_28min_Narration_Egyptian_Arabic_V2.m > 09. ETL / ELT + DAG Orchestration<br>3. partD.md > CH-22 · DAG orchestration, retries a |
| 5 | `k-anonymity` | anonym | 1 | Part_20_of_25 or Part_13_of_25 | 5 | 1. partA.md > 6.9 Masking and k-anonymity — CH-28<br>2. master.md > 6.9 Masking and k-anonymity — CH-28<br>3. DA_Camp_00_Unified_Master_Full_Egyptian.md > المشهد 10 — إخفاء الاسم مش كفاية (k- |
| 6 | `six receipts NilePay` | nilepay | 1 | Part_01_of_25 or master\.md or Unified_Master | 2 | 1. partA.md > 5.2 NilePay — the domain spine<br>2. master.md > 5.2 NilePay — the domain spine<br>3. DA_Camp_KNOWLEDGE.md > `lesson:algorithms` — Data structure |
| 7 | `attention Q K V` | attention | 1 | Part_22_of_25 | - | 1. DA_Camp_28min_Merged_Video_Master_Source.md > Transformers<br>2. DA_Camp_NotebookLM_Visual_Video_Master_Egypt > Transformers<br>3. DA_Camp_NotebookLM_Visual_Video_Master.md > B13. Deep learning, NLP and Transfor |
| 8 | `docker layer cache` | docker | 1 | Part_24_of_25 | 5 | 1. partA.md > 6.7 Docker layer cache — CH-34<br>2. master.md > 6.7 Docker layer cache — CH-34<br>3. DA_Camp_00_Unified_Master_Full_Egyptian.md > الجزء 24 من 25 — SHIP IT: الـcontain |
| 9 | `RPO RTO` | rpo | 1 | Part_20_of_25 | 2 | 1. DA_Camp_00_Unified_Master_Full_Egyptian.md > الجزء 20 من 25 — الـReconciliation و<br>2. DA_Camp_Part_20_of_25_Reconciliation_DIM_Tes > الـReconciliation واختبارات D&IM وال<br>3. DA_Camp_00_Unified_Master_Full_Egyptian.md > 20.4 المصطلحات |
| 10 | `B-tree 3 page reads` | tree | 1 | Part_10_of_25 | 1 | 1. DA_Camp_Part_10_of_25_SQL_III_Indexes_Plans_ > المشهد 3 — scan مقابل seek على مليون<br>2. DA_Camp_00_Unified_Master_Full_Egyptian.md > المشهد 3 — scan مقابل seek على مليون<br>3. partA.md > 6.5 Index vs scan — CH-14 |
