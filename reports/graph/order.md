# Prerequisite order vs the S1 trunk

Generated 2026-10-08T20:50:27Z by `dc graph report`.

935 `requires` edges (definition batches); 296 concepts first mentioned in S1. A violation = concept X first mentioned in S1 before its prerequisite Y.

- violations: **142** (109 across chapters, 33 inside one chapter)
- prerequisite never mentioned in S1: 71
- cycles in `requires`: 7

## Violations (largest gap first)

| concept | first in | requires | first in | gap (sentences) |
|---|---|---|---|---|
| `c:disaster-recovery` | CH-01 `s:S1:ar-natural:0016` | `c:incident-response` | CH-34 `s:S1:ar-natural:0527` | 511 |
| `c:metric-type` | CH-02 `s:S1:ar-natural:0031` | `c:metrics` | CH-34 `s:S1:ar-natural:0525` | 494 |
| `c:tracing` | CH-02 `s:S1:ar-natural:0037` | `c:correlation-id` | CH-34 `s:S1:ar-natural:0526` | 489 |
| `c:neural-network` | CH-01 `s:S1:ar-natural:0017` | `c:loss` | CH-31 `s:S1:ar-natural:0473` | 456 |
| `c:neural-network` | CH-01 `s:S1:ar-natural:0017` | `c:weight` | CH-31 `s:S1:ar-natural:0466` | 449 |
| `c:neural-network` | CH-01 `s:S1:ar-natural:0017` | `c:activation` | CH-31 `s:S1:ar-natural:0466` | 449 |
| `c:neural-network` | CH-01 `s:S1:ar-natural:0017` | `c:neuron` | CH-31 `s:S1:ar-natural:0465` | 448 |
| `c:container` | CH-07 `s:S1:ar-natural:0095` | `c:container-image` | CH-34 `s:S1:ar-natural:0516` | 421 |
| `c:offset` | CH-02 `s:S1:ar-natural:0029` | `c:topic` | CH-26 `s:S1:ar-natural:0392` | 363 |
| `c:offset` | CH-02 `s:S1:ar-natural:0029` | `c:consumer` | CH-26 `s:S1:ar-natural:0391` | 362 |
| `c:disaster-recovery` | CH-01 `s:S1:ar-natural:0016` | `c:replication` | CH-24 `s:S1:ar-natural:0365` | 349 |
| `c:data-governance` | CH-01 `s:S1:ar-natural:0016` | `c:metadata` | CH-24 `s:S1:ar-natural:0364` | 348 |
| `c:baseline` | CH-14 `s:S1:ar-natural:0205` | `c:metrics` | CH-34 `s:S1:ar-natural:0525` | 320 |
| `c:nrt` | CH-01 `s:S1:ar-natural:0016` | `c:batch` | CH-22 `s:S1:ar-natural:0336` | 320 |
| `c:reconciliation` | CH-01 `s:S1:ar-natural:0016` | `c:etl` | CH-21 `s:S1:ar-natural:0323` | 307 |
| `c:acceptance-testing` | CH-14 `s:S1:ar-natural:0216` | `c:integration-test` | CH-34 `s:S1:ar-natural:0519` | 303 |
| `c:reconciliation` | CH-01 `s:S1:ar-natural:0016` | `c:data-quality` | CH-21 `s:S1:ar-natural:0317` | 301 |
| `c:data-governance` | CH-01 `s:S1:ar-natural:0016` | `c:data-quality` | CH-21 `s:S1:ar-natural:0317` | 301 |
| `c:quality-gate` | CH-15 `s:S1:ar-natural:0230` | `c:continuous-integration` | CH-34 `s:S1:ar-natural:0519` | 289 |
| `c:apis` | CH-01 `s:S1:ar-natural:0014` | `c:http` | CH-20 `s:S1:ar-natural:0299` | 285 |
| `c:airflow` | CH-04 `s:S1:ar-natural:0065` | `c:task` | CH-22 `s:S1:ar-natural:0329` | 264 |
| `c:dashboard` | CH-00 `s:S1:ar-natural:0006` | `c:kpi` | CH-17 `s:S1:ar-natural:0261` | 255 |
| `c:dashboard` | CH-00 `s:S1:ar-natural:0006` | `c:measure` | CH-17 `s:S1:ar-natural:0255` | 249 |
| `c:b-tree` | CH-14 `s:S1:ar-natural:0210` | `c:tree` | CH-30 `s:S1:ar-natural:0453` | 243 |
| `c:streaming` | CH-07 `s:S1:ar-natural:0099` | `c:batch` | CH-22 `s:S1:ar-natural:0336` | 237 |
| `c:statistics` | CH-01 `s:S1:ar-natural:0017` | `c:cardinality` | CH-17 `s:S1:ar-natural:0254` | 237 |
| `c:statistics` | CH-01 `s:S1:ar-natural:0017` | `c:distribution` | CH-16 `s:S1:ar-natural:0244` | 227 |
| `c:metric-type` | CH-02 `s:S1:ar-natural:0031` | `c:measure` | CH-17 `s:S1:ar-natural:0255` | 224 |
| `c:nosql` | CH-07 `s:S1:ar-natural:0097` | `c:schema` | CH-21 `s:S1:ar-natural:0313` | 216 |
| `c:index` | CH-03 `s:S1:ar-natural:0047` | `c:column` | CH-17 `s:S1:ar-natural:0255` | 208 |
| `c:api` | CH-07 `s:S1:ar-natural:0104` | `c:http` | CH-20 `s:S1:ar-natural:0299` | 195 |
| `c:nrt` | CH-01 `s:S1:ar-natural:0016` | `c:latency` | CH-14 `s:S1:ar-natural:0206` | 190 |
| `c:dict` | CH-07 `s:S1:ar-natural:0097` | `c:hash-table` | CH-19 `s:S1:ar-natural:0286` | 189 |
| `c:set` | CH-07 `s:S1:ar-natural:0098` | `c:hash-table` | CH-19 `s:S1:ar-natural:0286` | 188 |
| `c:directed-acyclic-graph` | CH-01 `s:S1:ar-natural:0015` | `c:graph` | CH-13 `s:S1:ar-natural:0200` | 185 |
| `c:group-by` | CH-05 `s:S1:ar-natural:0070` | `c:column` | CH-17 `s:S1:ar-natural:0255` | 185 |
| `c:transaction` | CH-01 `s:S1:ar-natural:0013` | `c:dml` | CH-13 `s:S1:ar-natural:0193` | 180 |
| `c:tracing` | CH-02 `s:S1:ar-natural:0037` | `c:latency` | CH-14 `s:S1:ar-natural:0206` | 169 |
| `c:index` | CH-03 `s:S1:ar-natural:0047` | `c:query` | CH-14 `s:S1:ar-natural:0214` | 167 |
| `c:http-request` | CH-09 `s:S1:ar-natural:0136` | `c:http` | CH-20 `s:S1:ar-natural:0299` | 163 |
| `c:constraint` | CH-07 `s:S1:ar-natural:0098` | `c:column` | CH-17 `s:S1:ar-natural:0255` | 157 |
| `c:offset` | CH-02 `s:S1:ar-natural:0029` | `c:partition` | CH-12 `s:S1:ar-natural:0182` | 153 |
| `c:csv` | CH-07 `s:S1:ar-natural:0103` | `c:column` | CH-17 `s:S1:ar-natural:0255` | 152 |
| `c:floating-point` | CH-01 `s:S1:ar-natural:0022` | `c:data-type` | CH-10 `s:S1:ar-natural:0142` | 120 |
| `c:container-registry` | CH-26 `s:S1:ar-natural:0401` | `c:container-image` | CH-34 `s:S1:ar-natural:0516` | 115 |
| `c:primary-key` | CH-10 `s:S1:ar-natural:0144` | `c:column` | CH-17 `s:S1:ar-natural:0255` | 111 |
| `c:airflow-operator` | CH-14 `s:S1:ar-natural:0220` | `c:task` | CH-22 `s:S1:ar-natural:0329` | 109 |
| `c:test` | CH-01 `s:S1:ar-natural:0014` | `c:assert` | CH-09 `s:S1:ar-natural:0121` | 107 |
| `c:streaming` | CH-07 `s:S1:ar-natural:0099` | `c:latency` | CH-14 `s:S1:ar-natural:0206` | 107 |
| `c:database` | CH-00 `s:S1:ar-natural:0002` | `c:csv` | CH-07 `s:S1:ar-natural:0103` | 101 |
| `c:boolean-logic` | CH-03 `s:S1:ar-natural:0046` | `c:data-type` | CH-10 `s:S1:ar-natural:0142` | 96 |
| `c:funnel` | CH-11 `s:S1:ar-natural:0162` | `c:filtering` | CH-17 `s:S1:ar-natural:0258` | 96 |
| `c:select` | CH-11 `s:S1:ar-natural:0160` | `c:column` | CH-17 `s:S1:ar-natural:0255` | 95 |
| `c:dbt` | CH-15 `s:S1:ar-natural:0231` | `c:elt` | CH-21 `s:S1:ar-natural:0323` | 92 |
| `c:apis` | CH-01 `s:S1:ar-natural:0014` | `c:json` | CH-07 `s:S1:ar-natural:0104` | 90 |
| `c:skew` | CH-16 `s:S1:ar-natural:0242` | `c:task` | CH-22 `s:S1:ar-natural:0329` | 87 |
| `c:kafka` | CH-01 `s:S1:ar-natural:0015` | `c:streaming` | CH-07 `s:S1:ar-natural:0099` | 84 |
| `c:b-tree` | CH-14 `s:S1:ar-natural:0210` | `c:sorting` | CH-19 `s:S1:ar-natural:0293` | 83 |
| `c:nrt` | CH-01 `s:S1:ar-natural:0016` | `c:streaming` | CH-07 `s:S1:ar-natural:0099` | 83 |
| `c:test` | CH-01 `s:S1:ar-natural:0014` | `c:function` | CH-06 `s:S1:ar-natural:0090` | 76 |
| `c:fan-out` | CH-12 `s:S1:ar-natural:0178` | `c:cardinality` | CH-17 `s:S1:ar-natural:0254` | 76 |
| `c:query-optimization` | CH-14 `s:S1:ar-natural:0204` | `c:explain` | CH-18 `s:S1:ar-natural:0278` | 74 |
| `c:root-cause` | CH-02 `s:S1:ar-natural:0037` | `c:debugging` | CH-08 `s:S1:ar-natural:0109` | 72 |
| `c:class` | CH-05 `s:S1:ar-natural:0071` | `c:data-type` | CH-10 `s:S1:ar-natural:0142` | 71 |
| `c:stack` | CH-02 `s:S1:ar-natural:0029` | `c:list` | CH-07 `s:S1:ar-natural:0096` | 67 |
| `c:queue` | CH-02 `s:S1:ar-natural:0029` | `c:list` | CH-07 `s:S1:ar-natural:0096` | 67 |
| `c:distinct` | CH-11 `s:S1:ar-natural:0161` | `c:duplicates` | CH-15 `s:S1:ar-natural:0226` | 65 |
| `c:data-cleaning` | CH-11 `s:S1:ar-natural:0163` | `c:duplicates` | CH-15 `s:S1:ar-natural:0226` | 63 |
| `c:acceptance-testing` | CH-14 `s:S1:ar-natural:0216` | `c:acceptance-criteria` | CH-18 `s:S1:ar-natural:0277` | 61 |
| `c:systemd` | CH-00 `s:S1:ar-natural:0010` | `c:linux` | CH-05 `s:S1:ar-natural:0068` | 58 |
| `c:cardinality-estimate` | CH-14 `s:S1:ar-natural:0220` | `c:explain` | CH-18 `s:S1:ar-natural:0278` | 58 |
| `c:parameter` | CH-02 `s:S1:ar-natural:0032` | `c:function` | CH-06 `s:S1:ar-natural:0090` | 58 |
| `c:shell` | CH-01 `s:S1:ar-natural:0012` | `c:filesystem` | CH-04 `s:S1:ar-natural:0061` | 49 |
| `c:git` | CH-01 `s:S1:ar-natural:0014` | `c:filesystem` | CH-04 `s:S1:ar-natural:0061` | 47 |
| `c:list` | CH-07 `s:S1:ar-natural:0096` | `c:data-type` | CH-10 `s:S1:ar-natural:0142` | 46 |
| `c:dict` | CH-07 `s:S1:ar-natural:0097` | `c:data-type` | CH-10 `s:S1:ar-natural:0142` | 45 |
| `c:constraint` | CH-07 `s:S1:ar-natural:0098` | `c:data-type` | CH-10 `s:S1:ar-natural:0142` | 44 |
| `c:root-cause` | CH-02 `s:S1:ar-natural:0037` | `c:logging` | CH-05 `s:S1:ar-natural:0079` | 42 |
| `c:on-call` | CH-05 `s:S1:ar-natural:0077` | `c:production` | CH-08 `s:S1:ar-natural:0118` | 41 |
| `c:selectivity` | CH-14 `s:S1:ar-natural:0214` | `c:cardinality` | CH-17 `s:S1:ar-natural:0254` | 40 |

## Cycles

- c:statistics -> c:distribution -> c:statistics
- c:sampling -> c:statistics -> c:distribution -> c:sampling
- c:test -> c:assert -> c:test
- c:duplicates -> c:distinct -> c:duplicates
- c:bias-variance -> c:overfitting -> c:bias-variance
- c:container -> c:container-image -> c:docker -> c:container
- c:container-image -> c:docker -> c:container-image

## Prerequisites missing from the trunk (first 60)

- `c:token` (CH-20) requires `c:string`
- `c:window-function` (CH-12) requires `c:aggregate`
- `c:pipeline` (CH-04) requires `c:pipe`
- `c:spark` (CH-01) requires `c:big-data`
- `c:spark` (CH-01) requires `c:dataframe`
- `c:iam` (CH-34) requires `c:access-control`
- `c:dml` (CH-13) requires `c:sql-sublanguages`
- `c:group-by` (CH-05) requires `c:aggregate`
- `c:leakage` (CH-29) requires `c:label`
- `c:retrieval-augmented-generation` (CH-33) requires `c:large-language-model`
- `c:airflow` (CH-04) requires `c:cron`
- `c:process` (CH-02) requires `c:cpu`
- `c:metric-type` (CH-02) requires `c:aggregate`
- `c:retry` (CH-02) requires `c:timeout`
- `c:data-cleaning` (CH-11) requires `c:string`
- `c:chunk` (CH-33) requires `c:string`
- `c:fetch-decode-execute` (CH-03) requires `c:cpu`
- `c:json` (CH-07) requires `c:string`
- `c:ai-agent` (CH-01) requires `c:large-language-model`
- `c:ai-agent` (CH-01) requires `c:tool-calling`
- `c:path` (CH-04) requires `c:environment-variable`
- `c:dns` (CH-20) requires `c:ip-address`
- `c:context-window` (CH-33) requires `c:large-language-model`
- `c:hdfs` (CH-24) requires `c:big-data`
- `c:encoding` (CH-03) requires `c:string`
- `c:data-mart` (CH-23) requires `c:aggregate`
- `c:slowly-changing-dimension` (CH-23) requires `c:surrogate-key`
- `c:measure` (CH-17) requires `c:aggregate`
- `c:additivity` (CH-23) requires `c:aggregate`
- `c:byte` (CH-03) requires `c:bit`
- `c:filtering` (CH-17) requires `c:dataframe`
- `c:linux` (CH-05) requires `c:cpu`
- `c:confidence-interval` (CH-16) requires `c:sampling`
- `c:data-governance` (CH-01) requires `c:access-control`
- `c:pii-masking` (CH-28) requires `c:pii`
- `c:pii-masking` (CH-28) requires `c:access-control`
- `c:http` (CH-20) requires `c:ip-address`
- `c:temperature` (CH-32) requires `c:large-language-model`
- `c:solid` (CH-18) requires `c:object-oriented-programming`
- `c:tcp-handshake` (CH-20) requires `c:ip-address`
- `c:tcp-handshake` (CH-20) requires `c:port`
- `c:roll-up` (CH-23) requires `c:aggregate`
- `c:container-image` (CH-34) requires `c:docker`
- `c:train-validation-test` (CH-29) requires `c:sampling`
- `c:refactoring` (CH-09) requires `c:clean-code`
- `c:mapreduce` (CH-24) requires `c:aggregate`
- `c:integration-test` (CH-34) requires `c:test-double`
- `c:mae` (CH-29) requires `c:label`
- `c:incident-response` (CH-34) requires `c:alerting`
- `c:suppression` (CH-28) requires `c:k-anonymity`
- `c:suppression` (CH-28) requires `c:pii`
- `c:packet` (CH-20) requires `c:ip-address`
- `c:allowlist` (CH-33) requires `c:access-control`
- `c:distribution` (CH-16) requires `c:sampling`
- `c:cloud` (CH-34) requires `c:cpu`
- `c:ensemble` (CH-30) requires `c:decision-tree`
- `c:hash-table` (CH-19) requires `c:array`
- `c:having` (CH-11) requires `c:aggregate`
- `c:funnel` (CH-11) requires `c:logical-execution-order`
- `c:confusion-matrix` (CH-30) requires `c:supervised`
