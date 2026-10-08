"""P4.1 Concept seeding: glossary + coverage index + NotebookLM terms/scenes + sentence terms + chapter labels -> canonical c:<slug>.

Normalisation (norm_key): Arabic tatweel and the article on code-switched words ('الـquery' -> 'query'), case, punctuation -> '-',
British -> American spelling, last-word singular, then a synonym table (acronyms <-> expansions). Arabic transliterations come from
the S4 polish logs (edits with why=term, Arabic orig -> Latin to). A candidate is kept when it is a real technical/domain concept
with evidence: curated (glossary / NotebookLM term list / curriculum topic) AND seen in audio or scenes, or frequent in the audio
sentences across >= 2 source kinds. Pure data, no archive code is executed.
"""
import collections
import glob
import json
import os
import re

from . import common as C

AR = re.compile("[؀-ۿ]")
LAT = re.compile("[A-Za-z]")
TATWEEL = "ـ"

STOP = set("""the and to you is it in this of we that re your from by on a b for with what how why when where which who not no yes
are was be been can will would should could do does did done has have had one two three first last next new old good bad big small
all any each every some more most less few many much very just only also so then than there here our they them their its it's
our us me my he she his her i get got make made use used using way thing things part parts point example examples case cases kind
step steps idea ideas look see show shows question answer right left wrong real true false same different other another time times
total number numbers value values red green centre center spread length colour color power sample samples noise chart formula
numerator people person day days week year years minute minutes second seconds hour hours today now code learning mental model
machine work works working job jobs team life world story problem problems result results lot lots end start begin side top bottom
version line lines word words text name names list-of order orders customer customers shop shops money mobile session-a session-b
module modules unit units file-name rule rules level levels layer layers type types state status thing-is ok crit ember violet
course chapter chapters lesson lessons video videos part-one simple basic basics hard easy fast slow big-picture let lets plan
explainer welcome tricks trick""".split())

# synonyms: normalised key -> canonical key (both after norm_key's spelling/singular step)
SYN = {
    "db": "database", "dbms": "database", "rdbms": "relational-database", "dw": "data-warehouse", "warehouse": "data-warehouse",
    "edw": "data-warehouse", "llm": "large-language-model", "language-model": "large-language-model", "rag": "retrieval-augmented-generation",
    "ml": "machine-learning", "ai": "artificial-intelligence", "dag": "directed-acyclic-graph", "api": "api", "rest-api": "rest",
    "ci-cd": "ci-cd", "ci": "continuous-integration", "cd": "continuous-delivery", "groupby": "group-by", "btree": "b-tree",
    "b+tree": "b-tree", "b-plus-tree": "b-tree", "cte": "common-table-expression", "pk": "primary-key", "fk": "foreign-key",
    "dlq": "dead-letter-queue", "scd": "slowly-changing-dimension", "scd-type-2": "slowly-changing-dimension",
    "n-plus-1": "n-plus-one-query", "n+1": "n-plus-one-query", "n1": "n-plus-one-query", "idempotent": "idempotency",
    "idempotence": "idempotency", "venv": "virtual-environment", "virtualenv": "virtual-environment", "vectorization": "vectorization",
    "dataframe": "dataframe", "data-frame": "dataframe", "k8s": "kubernetes", "partitioning": "partition", "indice": "index",
    "indexe": "index", "querie": "query", "sql-query": "query", "window": "window-function", "window-functions": "window-function",
    "analytic-function": "window-function", "subqueries": "subquery", "correlated-subqueries": "correlated-subquery",
    "consumer-groups": "consumer-group", "etl-pipeline": "etl", "data-pipeline": "pipeline", "pipeline-run": "pipeline",
    "mvcc": "mvcc", "multi-version-concurrency-control": "mvcc", "acid-transaction": "acid", "transaction-isolation": "isolation-level",
    "isolation": "isolation-level", "gil": "global-interpreter-lock", "jvm": "jvm", "java-virtual-machine": "jvm",
    "hdfs": "hdfs", "hadoop-distributed-file-system": "hdfs", "yarn": "yarn", "rdd": "rdd", "ods": "ods", "operational-data-store": "ods",
    "ads": "ads", "application-data-store": "ads", "data-mart": "data-mart", "mart": "data-mart", "kpi": "kpi", "slo": "slo",
    "service-level-objective": "slo", "sla": "sla", "service-level-agreement": "sla", "rpo": "rpo", "rto": "rto",
    "pii": "pii", "personal-data": "pii", "rbac": "rbac", "role-based-access-control": "rbac", "iam": "iam",
    "jwt": "jwt", "json-web-token": "jwt", "tls": "tls", "ssl": "tls", "dns": "dns", "tcp": "tcp", "http": "http", "https": "http",
    "tf-idf": "tf-idf", "tfidf": "tf-idf", "bm25": "bm25", "hnsw": "hnsw", "embeddings": "embedding", "word-embedding": "embedding",
    "vector-db": "vector-database", "vector-store": "vector-database", "vector-index": "vector-database",
    "cosine": "cosine-similarity", "llm-agent": "ai-agent", "agent": "ai-agent", "ai-agents": "ai-agent", "agentic": "ai-agent",
    "tool-use": "tool-calling", "function-calling": "tool-calling", "react": "react-agent-loop", "re-act": "react-agent-loop",
    "prompt-injection-attack": "prompt-injection", "hallucinate": "hallucination", "precision-recall": "precision",
    "big-data": "big-data", "mapreduce": "mapreduce", "map-reduce": "mapreduce", "spark-job": "spark", "apache-spark": "spark",
    "apache-kafka": "kafka", "kafka-topic": "topic", "apache-airflow": "airflow", "airflow-dag": "directed-acyclic-graph",
    "docker-image": "container-image", "image": "container-image", "docker-container": "container", "git-branch": "branch",
    "git-commit": "commit", "merge-conflict": "merge-conflict", "three-way-merge": "three-way-merge", "pull-request": "pull-request",
    "pr": "pull-request", "unit-test": "unit-test", "unit-tests": "unit-test", "testing": "test", "tests": "test", "pytest": "pytest",
    "assertion": "assert", "traceback": "traceback", "stack-trace": "traceback", "call-stack": "call-stack", "stack-frame": "stack-frame",
    "frame": "stack-frame", "hash-map": "hash-table", "hashmap": "hash-table", "dictionary": "dict", "dict": "dict",
    "hash": "hashing", "hash-function": "hashing", "big-o": "big-o-notation", "time-complexity": "big-o-notation",
    "breadth-first-search": "bfs", "depth-first-search": "dfs", "topological-order": "topological-sort",
    "shortest-path": "shortest-path", "dijkstra": "shortest-path", "linked-list": "linked-list", "priority-queue": "heap",
    "binary-search-tree": "bst", "binary-tree": "tree", "connection-pooling": "connection-pool", "pool": "connection-pool",
    "pooling": "connection-pool", "prepared-statement": "prepared-statement", "preparedstatement": "prepared-statement",
    "sql-injection": "injection", "fan-out": "fan-out", "fanout": "fan-out", "join-fan-out": "fan-out", "row-explosion": "fan-out",
    "anti-join": "anti-join", "semi-join": "semi-join", "left-join": "join", "inner-join": "join", "outer-join": "join",
    "joins": "join", "join-type": "join", "aggregation": "aggregate", "aggregate-function": "aggregate", "aggregates": "aggregate",
    "null-value": "null", "nulls": "null", "three-valued-logic": "three-valued-logic", "unknown": "three-valued-logic",
    "execution-plan": "explain", "query-plan": "explain", "explain-plan": "explain", "explain-analyze": "explain",
    "query-planner": "query-optimizer", "planner": "query-optimizer", "optimizer": "query-optimizer", "full-table-scan": "scan",
    "table-scan": "scan", "seq-scan": "scan", "index-scan": "seek", "index-seek": "seek", "sargability": "sargable",
    "covering": "covering-index", "composite-index": "leftmost-prefix", "selectivity": "selectivity", "statistic": "statistics",
    "table-statistics": "statistics", "deadlocks": "deadlock", "lock": "locking", "locks": "locking", "row-lock": "locking",
    "lost-updates": "lost-update", "dirty-read": "dirty-read", "dirty-reads": "dirty-read", "phantom": "phantom-read",
    "phantoms": "phantom-read", "phantom-reads": "phantom-read", "non-repeatable-reads": "non-repeatable-read",
    "serializable": "isolation-level", "read-committed": "isolation-level", "repeatable-read": "isolation-level",
    "event-times": "event-time", "event_time": "event-time", "processing_time": "processing-time", "ingestion_time": "ingestion-time",
    "available_time": "available-time", "watermarks": "watermark", "consumer-lag": "lag", "kafka-lag": "lag", "offsets": "offset",
    "commit-offset": "offset", "rebalancing": "rebalance", "schema-registry": "schema-registry", "avro": "avro",
    "exactly-once": "delivery-semantics", "at-least-once": "delivery-semantics", "at-most-once": "delivery-semantics",
    "fact-table": "fact-table", "fact": "fact-table", "dimension": "dimension-table", "dimension-table": "dimension-table",
    "star-schema": "star-schema", "snowflake-schema": "star-schema", "surrogate": "surrogate-key", "olap-cube": "olap",
    "cube": "olap", "datacube": "datacube", "data-cube": "datacube", "drill-down": "drill-down", "roll-up": "roll-up",
    "rollup": "roll-up", "slice-and-dice": "slice-and-dice", "slice": "slice-and-dice", "dice": "slice-and-dice",
    "data-quality-check": "data-quality", "quality-check": "data-quality", "dq": "data-quality", "quality-gate": "quality-gate",
    "recon": "reconciliation", "reconcile": "reconciliation", "reconciliations": "reconciliation", "break": "reconciliation-break",
    "mismatch": "reconciliation-break", "data-lineage": "lineage", "back-fill": "backfill", "backfilling": "backfill",
    "re-run": "rerun", "retries": "retry", "retry-with-backoff": "backoff", "exponential-backoff": "backoff",
    "upserts": "upsert", "merge-statement": "upsert", "cdc": "change-data-capture", "incremental-load": "incremental-load",
    "incremental": "incremental-load", "full-load": "full-load", "batch-processing": "batch", "batches": "batch",
    "stream-processing": "streaming", "stream": "streaming", "real-time": "streaming", "near-real-time": "nrt",
    "near-real-time-reporting": "nrt", "msisdn": "msisdn", "arpu": "arpu", "mobile-money": "mobile-money", "m-pesa": "mobile-money",
    "e-wallet": "mobile-money", "wallet": "mobile-money", "aml": "aml-cft", "cft": "aml-cft", "kyc": "kyc",
    "k-anonymity": "k-anonymity", "masking": "pii-masking", "data-masking": "pii-masking", "desensitization": "pii-masking",
    "multi-tenant": "multi-tenancy", "tenant-isolation": "multi-tenancy", "tenant": "multi-tenancy",
    "feature": "feature", "features": "feature", "label": "label", "labels": "label", "train-test-split": "train-validation-test",
    "train-validation-test-split": "train-validation-test", "data-leakage": "leakage", "overfit": "overfitting",
    "neural-network": "neural-network", "neural-net": "neural-network", "perceptron": "neural-network", "mlp": "neural-network",
    "neuron": "neuron", "activation-function": "activation", "relu": "activation", "backprop": "backpropagation",
    "gradient-descent": "gradient-descent", "sgd": "gradient-descent", "learning-rate": "learning-rate", "loss-function": "loss",
    "cost-function": "loss", "mean-absolute-error": "mae", "mse": "mse", "mean-squared-error": "mse",
    "transformer-model": "transformer", "self-attention": "attention", "attention-mechanism": "attention",
    "q-k-v": "query-key-value", "qkv": "query-key-value", "tokenization": "tokenization", "tokenizer": "tokenization",
    "token": "token", "tokens": "token", "context-length": "context-window", "temperature-top-p": "temperature",
    "top-p": "top-p", "grounding": "groundedness", "faithfulness": "groundedness", "grounded": "groundedness",
    "reranking": "reranker", "re-ranker": "reranker", "re-ranking": "reranker", "chunking": "chunk", "chunks": "chunk",
    "hybrid-search": "hybrid-retrieval", "dense-retrieval": "dense-retrieval", "lexical-search": "bm25",
    "keyword-search": "bm25", "semantic-search": "dense-retrieval", "vector-search": "dense-retrieval",
    "text-to-sql": "text-to-sql", "nl2sql": "text-to-sql", "guardrails": "guardrail", "allow-list": "allowlist",
    "whitelist": "allowlist", "hitl": "human-in-the-loop", "containerization": "container", "containers": "container",
    "dockerfile": "dockerfile", "compose": "docker-compose", "docker-compose": "docker-compose", "health-check": "health-check",
    "healthcheck": "health-check", "rollbacks": "rollback", "blue-green": "blue-green-deployment", "canary": "canary-release",
    "observability": "observability", "logging": "logging", "logs": "logging", "log": "logging", "structured-logging": "logging",
    "metric": "metrics", "tracing": "tracing", "traces": "tracing", "trace": "tracing", "correlation-id": "correlation-id",
    "alert": "alerting", "alerts": "alerting", "postmortem": "postmortem", "post-mortem": "postmortem", "incident": "incident-response",
    "on-call": "on-call", "runbooks": "runbook", "playbook": "runbook", "dr": "disaster-recovery", "failover": "disaster-recovery",
    "adr": "adr", "architecture-decision-record": "adr", "readme": "readme", "portfolio": "portfolio", "capstone": "capstone",
    "star-method": "star-interview", "star": "star-interview", "oop": "object-oriented-programming", "class": "class",
    "classes": "class", "object": "object", "objects": "object", "inheritance": "inheritance", "encapsulation": "encapsulation",
    "polymorphism": "polymorphism", "interface": "interface", "solid-principle": "solid", "di": "dependency-injection",
    "refactor": "refactoring", "code-smell": "refactoring", "tech-debt": "technical-debt", "semver": "semantic-versioning",
    "code-review": "code-review", "reviews": "code-review", "review": "code-review", "csv-file": "csv", "parquet-file": "parquet",
    "json-file": "json", "pandas-dataframe": "dataframe", "series": "pandas-series", "pandas": "pandas", "numpy": "numpy",
    "for-loop": "loop", "while-loop": "loop", "loops": "loop", "iteration": "loop", "function-call": "function",
    "functions": "function", "def": "function", "variable": "variable", "variables": "variable", "f-string": "string",
    "strings": "string", "str": "string", "list-comprehension": "comprehension", "lists": "list", "tuples": "tuple", "sets": "set",
    "exception": "exception", "exceptions": "exception", "try-except": "exception", "error-handling": "exception",
    "context-manager": "context-manager", "with-statement": "context-manager", "generator": "generator", "yield": "generator",
    "lazy": "lazy-evaluation", "laziness": "lazy-evaluation", "decorators": "decorator", "mutable-default": "mutable-default-argument",
    "default-argument": "mutable-default-argument", "aliasing": "aliasing", "reference": "aliasing", "references": "aliasing",
    "mutability": "mutability", "mutable": "mutability", "immutable": "mutability", "scope": "scope", "legb": "scope",
    "recursion": "recursion", "recursive": "recursion", "terminal": "shell", "bash": "shell", "command-line": "shell", "cli": "shell",
    "shell": "shell", "linux-shell": "shell", "redirection": "redirection", "pipe": "pipe", "pipes": "pipe",
    "stdin": "standard-streams", "stdout": "standard-streams", "stderr": "standard-streams", "path-variable": "path-env",
    "env-var": "environment-variable", "env": "environment-variable", "environment-variables": "environment-variable",
    "permission": "file-permissions", "permissions": "file-permissions", "chmod": "file-permissions",
    "permission-class": "file-permissions", "sudo": "sudo", "root": "root-user", "pid": "process", "processes": "process",
    "signal": "signal", "signals": "signal", "sigterm": "signal", "sigkill": "signal", "systemd": "systemd", "service": "systemd",
    "services": "systemd", "systemd-unit": "systemd", "journald": "journald", "journalctl": "journald", "journal": "journald",
    "cron": "cron", "crontab": "cron", "cron-expression": "cron", "mount": "mount", "disk": "disk", "disks": "disk",
    "ssh": "ssh", "ssh-key": "ssh", "firewall": "firewall", "crash-loop": "crash-loop", "exit-code": "exit-code",
    "absolute-path": "absolute-path", "relative-path": "relative-path", "file-path": "path", "filesystem": "filesystem",
    "file-system": "filesystem", "directory": "directory", "folder": "directory", "working-directory": "directory",
    "encoding": "encoding", "character-encoding": "encoding", "utf8": "utf-8", "unicode": "unicode", "ascii": "ascii",
    "byte": "byte", "bytes": "byte", "bit": "bit", "bits": "bit", "binary": "binary", "cpu": "cpu", "ram": "ram", "memory": "ram",
    "main-memory": "ram", "storage": "storage", "os": "operating-system", "operating-system": "operating-system",
    "git": "git", "version-control": "git", "branches": "branch", "commits": "commit", "merge": "merge", "rebase": "rebase",
    "git-merge": "merge", "diff": "diff", "diffs": "diff", "repo": "repository", "repository": "repository",
    "endpoint": "endpoint", "endpoints": "endpoint", "status-code": "http-status-code", "http-status": "http-status-code",
    "request": "http-request", "requests": "http-request", "http-request": "http-request", "response": "http-response",
    "pagination": "pagination", "rate-limit": "rate-limiting", "rate-limiter": "rate-limiting", "authn": "authentication",
    "authz": "authorization", "auth": "authentication", "login": "authentication", "oauth": "oauth", "oauth2": "oauth",
    "idor": "idor", "xss": "xss", "csrf": "csrf", "owasp": "owasp", "least-privilege": "least-privilege",
    "secret": "secrets-management", "secrets": "secrets-management", "salt": "password-hashing", "password-hash": "password-hashing",
    "bcrypt": "password-hashing", "saga": "saga", "transaction": "transaction", "transactions": "transaction", "acid": "acid",
    "commit-transaction": "transaction", "rollback-transaction": "transaction", "savepoint": "savepoint",
    "@transactional": "transactional-annotation", "transactional": "transactional-annotation", "jdbc": "jdbc", "jpa": "jpa",
    "hibernate": "jpa", "orm": "orm", "spring": "spring", "spring-boot": "spring", "wrapper-class": "wrapper-class",
    "try-with-resource": "try-with-resources", "bytecode": "jvm", "null-pointer": "null", "nullpointerexception": "null",
    "schema-design": "schema", "schemas": "schema", "table": "table", "tables": "table", "column": "column", "columns": "column",
    "row": "row", "rows": "row", "record": "row", "records": "row", "primary-keys": "primary-key", "foreign-keys": "foreign-key",
    "constraint": "constraint", "constraints": "constraint", "unique": "constraint", "not-null": "constraint", "check": "constraint",
    "normal-form": "normalization", "1nf": "normalization", "2nf": "normalization", "3nf": "normalization", "bcnf": "normalization",
    "denormalisation": "denormalization", "erd": "erd", "er-diagram": "erd", "view": "view", "views": "view",
    "materialized-view": "materialized-view", "select": "select", "where": "where-clause", "where-clause": "where-clause",
    "having": "having", "order-by": "order-by", "sort": "sorting", "sorting": "sorting", "limit": "limit", "distinct": "distinct",
    "group": "group-by", "grouping": "group-by", "case-when": "case-expression", "case": "case-expression", "cast": "casting",
    "ddl": "ddl", "dml": "dml", "insert": "dml", "update": "dml", "delete": "dml", "truncate": "dml",
    "data-modeling": "data-modeling", "data-model": "data-modeling", "dimensional-modeling": "data-modeling",
    "grain": "grain", "table-grain": "grain", "granularity": "grain", "skewed": "skew", "data-skew": "skew", "salt-key": "salting",
    "broadcast": "broadcast-join", "broadcast-hash-join": "broadcast-join", "shuffles": "shuffle", "shuffling": "shuffle",
    "executor": "spark-executor", "executors": "spark-executor", "driver": "spark-driver", "spark-driver": "spark-driver",
    "stage": "spark-stage", "stages": "spark-stage", "task": "task", "tasks": "task", "operator": "airflow-operator",
    "operators": "airflow-operator", "sensor": "airflow-sensor", "sensors": "airflow-sensor", "xcom": "xcom",
    "namenode": "namenode", "name-node": "namenode", "datanode": "datanode", "data-node": "datanode", "replica": "replication",
    "replicas": "replication", "block": "hdfs-block", "blocks": "hdfs-block", "rack-awareness": "rack-awareness", "rack": "rack-awareness",
    "data-locality": "data-locality", "combiner": "combiner", "narrow-transformation": "narrow-wide-dependency",
    "wide-transformation": "narrow-wide-dependency", "narrow-wide": "narrow-wide-dependency", "catalyst": "catalyst-optimizer",
    "small-file": "small-files-problem", "small-files": "small-files-problem", "producer": "producer", "producers": "producer",
    "consumer": "consumer", "consumers": "consumer", "broker": "broker", "brokers": "broker", "topic": "topic", "topics": "topic",
    "isr": "isr", "in-sync-replica": "isr", "kafka-partition": "partition", "partition-key": "partition-key",
    "distribution-key": "distribution-key", "partition-pruning": "partition-pruning", "pruning": "partition-pruning",
    "mpp": "mpp", "shared-nothing": "mpp", "columnar": "columnar-storage", "column-store": "columnar-storage",
    "columnar-store": "columnar-storage", "lakehouse": "lakehouse", "data-lake": "data-lake", "delta-lake": "lakehouse",
    "iceberg": "lakehouse", "etl-elt": "etl", "elt": "elt", "etl": "etl", "landing-zone": "staging", "staging-area": "staging",
    "staging-table": "staging", "quarantine": "quarantine", "validation": "data-validation", "validate": "data-validation",
    "data-contract": "data-contract", "contract": "data-contract", "dbt": "dbt", "data-catalog": "data-catalog",
    "catalog": "data-catalog", "metadata": "metadata", "data-governance": "data-governance", "governance": "data-governance",
    "data-steward": "data-steward", "data-owner": "data-steward", "data-openness": "data-openness", "openness": "data-openness",
    "kpis": "kpi", "dashboards": "dashboard", "report": "report", "reports": "report", "reporting": "report",
    "measure": "measure", "measures": "measure", "dax": "dax", "power-bi": "power-bi", "powerbi": "power-bi",
    "power-query": "power-query", "filter-context": "filter-context", "time-intelligence": "time-intelligence",
    "year-over-year": "time-intelligence", "yoy": "time-intelligence", "semi-additive": "additivity", "non-additive": "additivity",
    "additive": "additivity", "mean": "mean-median", "median": "mean-median", "average": "mean-median",
    "standard-deviation": "standard-deviation", "std": "standard-deviation", "variance": "variance", "iqr": "iqr",
    "outlier": "outlier", "outliers": "outlier", "distribution": "distribution", "distributions": "distribution",
    "normal-distribution": "distribution", "sampling": "sampling", "sampling-distribution": "sampling", "clt": "central-limit-theorem",
    "central-limit-theorem": "central-limit-theorem", "confidence-interval": "confidence-interval", "ci-95": "confidence-interval",
    "p-value": "p-value", "pvalue": "p-value", "hypothesis-test": "hypothesis-testing", "hypothesis-tests": "hypothesis-testing",
    "significance": "hypothesis-testing", "statistical-power": "statistical-power", "sample-size": "statistical-power",
    "effect-size": "effect-size", "ab-test": "ab-testing", "a-b-test": "ab-testing", "a-b-testing": "ab-testing",
    "correlation": "correlation-causation", "causation": "correlation-causation", "bayes": "bayes-theorem",
    "probability": "probability", "tidy-data": "tidy-data", "data-cleaning": "data-cleaning", "cleaning": "data-cleaning",
    "clean-data": "data-cleaning", "duplicate": "duplicates", "dedup": "duplicates", "deduplication": "duplicates",
    "duplicate-row": "duplicates", "duplicated-row": "duplicates", "missing-value": "null", "missing-values": "null",
    "precision": "precision-recall", "recall": "precision-recall", "f1": "precision-recall", "f1-score": "precision-recall",
    "accuracy": "accuracy", "confusion-matrix": "confusion-matrix", "roc-auc": "roc-auc", "auc": "roc-auc",
    "cross-validation": "cross-validation", "k-fold": "cross-validation", "regularisation": "regularization", "l2": "regularization",
    "dropout": "dropout", "baseline": "baseline", "baseline-model": "baseline", "ensemble": "ensemble", "random-forest": "random-forest",
    "decision-tree": "decision-tree", "boosting": "boosting", "xgboost": "boosting", "gradient-boosting": "boosting",
    "linear-regression": "linear-regression", "logistic-regression": "logistic-regression", "k-means": "k-means",
    "kmeans": "k-means", "clustering": "k-means", "pca": "pca", "supervised-learning": "supervised-learning",
    "unsupervised-learning": "unsupervised-learning", "threshold": "threshold", "class-imbalance": "class-imbalance",
    "deep-learning": "deep-learning", "cnn": "cnn", "convolution": "cnn", "rnn": "rnn", "lstm": "rnn", "gan": "gan",
    "diffusion-model": "diffusion", "autoencoder": "autoencoder", "vae": "autoencoder", "gpu": "gpu", "tensor": "tensor",
    "tensors": "tensor", "weights": "weight", "weight": "weight", "parameter": "parameter", "parameters": "parameter",
    "bias": "bias-variance", "bias-variance": "bias-variance", "positional-encoding": "positional-encoding",
    "causal-mask": "causal-mask", "causal-masking": "causal-mask", "masking-attention": "causal-mask",
    "residual-stream": "residual-stream", "residual": "residual-stream", "fine-tuning": "fine-tuning", "finetuning": "fine-tuning",
    "pretraining": "pretraining", "pre-training": "pretraining", "next-token-prediction": "autoregressive-generation",
    "autoregressive": "autoregressive-generation", "knowledge-cutoff": "knowledge-cutoff", "prompt": "prompt",
    "prompts": "prompt", "prompting": "prompt", "prompt-engineering": "prompt", "system-prompt": "prompt",
    "structured-output": "structured-output", "json-mode": "structured-output", "recall@k": "retrieval-metrics",
    "recall-at-k": "retrieval-metrics", "mrr": "retrieval-metrics", "ndcg": "retrieval-metrics", "retrieval": "retrieval",
    "retriever": "retrieval", "citation": "citation", "citations": "citation", "exfiltration": "exfiltration",
    "llmops": "llmops", "latency": "latency", "drift": "drift", "data-drift": "drift", "model-drift": "drift",
    "cache": "caching", "caches": "caching", "cached": "caching", "cache-hit": "caching", "layer-cache": "docker-layer-cache",
    "registry": "container-registry", "container-registry": "container-registry", "multi-stage-build": "multi-stage-build",
    "12-factor": "twelve-factor", "twelve-factor-app": "twelve-factor", "iac": "infrastructure-as-code", "terraform": "infrastructure-as-code",
    "cloud": "cloud", "aws": "cloud", "azure": "cloud", "gcp": "cloud", "s3": "object-storage", "object-store": "object-storage",
    "sli": "slo", "error-budget": "slo", "load-test": "load-testing", "load-testing": "load-testing", "chaos": "failure-drill",
    "failure-drills": "failure-drill", "deployment": "deployment", "deploy": "deployment", "deployments": "deployment",
    "release": "deployment", "production": "production", "prod": "production", "test-double": "test-double",
    "mock": "test-double", "mocks": "test-double", "stub": "test-double", "fixture": "test-fixture", "fixtures": "test-fixture",
    "tdd": "tdd", "red-green-refactor": "tdd", "integration-test": "integration-test", "acceptance-test": "acceptance-test",
    "test-coverage": "test-coverage", "coverage": "test-coverage", "property-based-testing": "property-testing",
    "regression-test": "regression-test", "edge-case": "edge-case", "edge-cases": "edge-case", "bug": "bug", "bugs": "bug",
    "debugging": "debugging", "debug": "debugging", "error": "error", "errors": "error", "error-message": "error",
    "syntax-error": "syntax-error", "array": "array", "arrays": "array", "dynamic-array": "array", "stack": "stack",
    "stacks": "stack", "queue": "queue", "queues": "queue", "message-queue": "message-queue", "deque": "deque",
    "heap": "heap", "heaps": "heap", "graph": "graph", "graphs": "graph", "tree": "tree", "trees": "tree", "bst": "bst",
    "avl": "avl-tree", "union-find": "union-find", "two-pointer": "two-pointers", "two-pointers": "two-pointers",
    "sliding-window": "sliding-window", "greedy": "greedy-algorithm", "backtracking": "backtracking",
    "dynamic-programming": "dynamic-programming", "dp": "dynamic-programming", "binary-search": "binary-search",
    "load-factor": "load-factor", "frontier": "bfs-frontier", "visited": "bfs-frontier", "wait-for-graph": "wait-for-graph",
    "wait-graph": "wait-for-graph", "wait-for-cycle": "wait-for-graph", "victim": "deadlock", "deadlock-victim": "deadlock",
    "ip": "ip-address", "ip-address": "ip-address", "port": "port", "ports": "port", "packet": "packet", "packets": "packet",
    "tcp-handshake": "tcp-handshake", "handshake": "tcp-handshake", "udp": "udp", "header": "http-header",
    "headers": "http-header", "cors": "cors", "rest": "rest", "restful": "rest", "openapi": "openapi", "swagger": "openapi",
    "serialisation": "serialization", "background-job": "background-job", "session": "session", "sessions": "session",
    "cookie": "session", "parquet": "parquet", "orc": "orc", "compression": "compression", "json": "json", "csv": "csv",
    "xml": "xml", "yaml": "yaml", "sftp": "sftp", "ftps": "sftp", "ftp": "sftp", "retention": "data-retention",
    "data-retention": "data-retention", "partition-aging": "data-retention", "aging": "data-retention", "gdpr": "gdpr",
    "pep": "aml-cft", "dr-drill": "disaster-recovery", "sit": "acceptance-testing", "oat": "acceptance-testing",
    "cat": "acceptance-testing", "uat": "acceptance-testing", "lld": "low-level-design", "low-level-design": "low-level-design",
    "source-of-record": "source-of-record", "system-of-record": "source-of-record", "dbus": "dbus",
    "enrichment": "enrichment", "data-enrichment": "enrichment", "transposition": "transposition",
    "event-time": "event-time", "processing-time": "processing-time", "ingestion-time": "ingestion-time",
    "late-data": "late-arriving-data", "late-arriving": "late-arriving-data", "late-arriving-dimension": "late-arriving-data",
    "late-arriving-data": "late-arriving-data", "windowing": "stream-window", "tumbling-window": "stream-window",
    "freshness": "freshness", "data-freshness": "freshness", "sla-breach": "sla", "dashboard": "dashboard",
    "visualization": "data-visualization", "data-visualization": "data-visualization", "visualisation": "data-visualization",
    "chart-design": "data-visualization", "accessibility": "accessibility", "contrast": "accessibility",
    "clean-code": "clean-code", "cohesion": "cohesion", "coupling": "coupling", "dependency-inversion": "dependency-inversion",
    "composition": "composition", "value-object": "value-object", "design-pattern": "design-pattern",
    "design-patterns": "design-pattern", "factory": "design-pattern", "strategy-pattern": "design-pattern",
    "observer": "design-pattern", "repository-pattern": "design-pattern", "adapter": "design-pattern", "dry": "dry-kiss-yagni",
    "kiss": "dry-kiss-yagni", "yagni": "dry-kiss-yagni", "acceptance-criteria": "acceptance-criteria", "call-graph": "call-graph",
    "documentation": "documentation", "docs": "documentation", "python": "python", "java": "java", "sql": "sql", "linux": "linux",
    "docker": "docker", "kubernetes": "kubernetes", "hadoop": "hadoop", "spark": "spark", "kafka": "kafka", "airflow": "airflow",
    "hive": "hive", "hbase": "hbase", "zookeeper": "zookeeper", "sqoop": "hadoop-ecosystem", "flume": "hadoop-ecosystem",
    "oozie": "hadoop-ecosystem", "tez": "hadoop-ecosystem", "ambari": "hadoop-ecosystem", "mysql": "mysql", "postgres": "postgresql",
    "postgresql": "postgresql", "gaussdb": "gaussdb", "carbondata": "carbondata", "nosql": "nosql", "document-database": "nosql",
    "key-value": "nosql", "key-value-store": "nosql", "graph-database": "nosql", "time-series": "time-series-database",
    "time-series-database": "time-series-database", "huawei": "huawei-stack",
}
# composite labels kept whole instead of being split on ' / ' ' · ' ' vs '
KEEP_WHOLE = {"ci/cd", "train / validation / test", "stdin / stdout / stderr", "stdin/stdout/stderr", "tcp/ip", "a/b design",
              "rpo/rto", "q / k / v", "q/k/v", "1:1 / 1:n / m:n", "blue/green · canary", "temperature / top-p", "temperature · top-p",
              "event / ingestion / processing / available time", "dirty/non-repeatable/phantom/write skew", "oauth2/oidc",
              "aml/cft/pep", "aml / cft / pep", "ascii/unicode/utf-8", "bm25 / dense / hybrid", "recall@k / mrr / ndcg",
              "logs / metrics / traces", "ddl/dml/dql/dcl/tcl", "insert/update/delete/merge", "begin/commit/rollback",
              "select/from/where", "accuracy/precision/recall/f1", "cpu/gpu/tensors", "lstm/gru", "rdd/dataframe", "rbac/acl"}
WHOLE_MAP = {"ci/cd": "ci-cd", "train / validation / test": "train-validation-test", "stdin / stdout / stderr": "standard-streams",
             "stdin/stdout/stderr": "standard-streams", "tcp/ip": "tcp", "a/b design": "ab-testing", "rpo/rto": "rpo",
             "q / k / v": "query-key-value", "q/k/v": "query-key-value", "1:1 / 1:n / m:n": "cardinality",
             "blue/green · canary": "blue-green-deployment", "temperature / top-p": "temperature", "temperature · top-p": "temperature",
             "event / ingestion / processing / available time": "event-time", "dirty/non-repeatable/phantom/write skew": "read-anomalies",
             "oauth2/oidc": "oauth", "aml/cft/pep": "aml-cft", "aml / cft / pep": "aml-cft", "ascii/unicode/utf-8": "encoding",
             "bm25 / dense / hybrid": "hybrid-retrieval", "recall@k / mrr / ndcg": "retrieval-metrics", "logs / metrics / traces": "observability",
             "ddl/dml/dql/dcl/tcl": "sql-sublanguages", "insert/update/delete/merge": "dml", "begin/commit/rollback": "transaction",
             "select/from/where": "select", "accuracy/precision/recall/f1": "precision-recall", "cpu/gpu/tensors": "tensor",
             "lstm/gru": "rnn", "rdd/dataframe": "rdd", "rbac/acl": "rbac"}
SYN.update({"dirty-read": "read-anomalies", "non-repeatable-read": "read-anomalies", "phantom-read": "read-anomalies",
            "write-skew": "read-anomalies", "1-1-1-n-m-n": "cardinality", "one-to-many": "cardinality", "many-to-many": "cardinality",
            "relationship": "cardinality", "dql": "sql-sublanguages", "dcl": "sql-sublanguages", "tcl": "sql-sublanguages"})
NOT_CONCEPT = {"shopflow", "nilepay", "cairo", "egypt", "notebooklm", "da-camp", "claude", "openai", "chatgpt", "google",
               "course-outline", "chapter-title", "progressive-reveal", "transport", "failure-first", "callback", "artifact",
               "artifact-chain", "evidence", "trade-off", "green-red-flag", "green-flag", "red-flag", "five-minute-defence",
               "specialisation-branch", "completion-vs-proof", "what-a-program-is", "what-an-os-does", "verification-ritual",
               "the-twelve-command-working-set", "honest-benchmarking", "when-to-choose-each", "patterns-as-answer"}
# concepts the curriculum states but that are too broad to be nodes on their own
TOO_BROAD = {"data", "information", "system", "computer", "program", "software", "platform", "tool", "technology", "file", "files",
             "value", "conversion", "nesting", "editor", "memory", "cost", "review", "commit-message", "values", "variable-name",
             "ecosystem", "business", "company", "analyst", "engineer", "developer", "manager", "user", "users", "client", "server",
             "network", "internet", "web", "app", "application", "machine", "input", "output", "result", "answer", "dataset",
             "database-table", "query-result", "big", "learning", "model", "models", "mental-model"}


SYN.update({
    "try": "exception", "except": "exception", "finally": "exception", "try-except-else-finally": "exception",
    "else": "control-flow", "if": "control-flow", "if-statement": "control-flow", "or": "boolean-logic", "and": "boolean-logic",
    "return": "function", "returns": "function", "estimated": "cardinality-estimate", "actual": "cardinality-estimate",
    "actual-row": "cardinality-estimate", "estimated-vs-actual": "cardinality-estimate", "estimated-row": "cardinality-estimate",
    "logical": "logical-execution-order", "logical-order": "logical-execution-order", "integration": "integration-test",
    "acceptance": "acceptance-testing", "wide": "narrow-wide-dependency", "narrow": "narrow-wide-dependency",
    "counter": "metric-type", "measurement": "metric-type", "cumulative": "metric-type", "gauge": "metric-type",
    "derived": "metric-type", "dense": "dense-retrieval", "lexical": "bm25", "hybrid": "hybrid-retrieval", "partial": "partial-index",
    "clean": "data-cleaning", "trim": "data-cleaning", "filter": "filtering", "atomic": "acid", "atomicity": "acid",
    "uniqueness": "constraint", "limit-1": "limit", "full-scan": "scan", "test-set": "train-validation-test",
    "validation-set": "train-validation-test", "training-set": "train-validation-test", "row-number": "window-function",
    "rank": "window-function", "dense-rank": "window-function", "crud": "dml", "integer": "data-type", "type": "data-type",
    "data-types": "data-type", "float": "floating-point", "binary-floating-point": "floating-point", "rounding-error": "floating-point",
    "six-quality-dimension": "data-quality", "facts-and-dimension": "fact-table", "distributed-storage-and-processing": "big-data",
    "2vs3": "reconciliation", "1vs2": "reconciliation", "post-load-reconciliation": "reconciliation",
    "groupby-split-apply-combine": "group-by", "split-apply-combine": "group-by", "dockerfile-order": "docker-layer-cache",
    "scd-type": "slowly-changing-dimension", "users-and-group": "file-permissions", "bias-and-variance": "bias-variance",
    "avl-rotation": "avl-tree", "multi-head": "attention", "scaled-dot-product": "attention", "package": "package-manager",
    "pip": "package-manager", "pip-install": "package-manager", "package-manager": "package-manager", "remote": "git-remote",
    "repartition": "partition", "users": "file-permissions", "processes-and-signal": "signal", "sgid": "file-permissions",
    "umask": "file-permissions", "explicit-deny": "iam", "explicit-deny-win": "iam", "iam-and-policy-precedence": "iam",
    "requirements-txt": "package-manager", "python-m-venv": "virtual-environment", "stack-unwinding": "exception",
    "exceptions-and-unwinding": "exception", "control-flow": "control-flow", "boolean": "boolean-logic",
    "test-order-total": "unit-test", "assert": "assert", "red-green": "tdd", "kafka-consumer": "consumer",
    "pyspark": "spark", "spark-sql": "spark", "spark-dataframe": "rdd", "dataframe-api": "rdd", "mobile-money-core": "mobile-money",
    "cash-in": "mobile-money", "cash-out": "mobile-money", "transfer": "mobile-money", "facts": "fact-table",
    "dimensions": "dimension-table", "rdd-dataframe": "rdd", "full-table": "scan", "index-only-scan": "covering-index",
    "event-time-vs-processing-time": "event-time", "windows-and-watermark": "watermark", "ordering-scope": "ordering",
    "delivery-semantic": "delivery-semantics", "exactly-once-as-a-path-property": "delivery-semantics",
    "duplicate-message": "duplicates", "duplicated": "duplicates", "nested-loop": "join-strategy", "hash-join": "join-strategy",
    "merge-join": "join-strategy", "join-strategie": "join-strategy", "join-strategies": "join-strategy",
    "statistics-and-stale-plan": "statistics", "stale-statistics": "statistics", "b-tree-structure-and-node-split": "b-tree",
    "clustered": "clustered-index", "secondary": "clustered-index", "clustered-vs-secondary": "clustered-index",
    "composite-and-leftmost-prefix": "leftmost-prefix", "connection-pools": "connection-pool", "the-tuning-workflow": "explain",
    "tuning": "query-optimization", "query-optimization": "query-optimization", "query-tuning": "query-optimization",
    "relational": "relational-database", "relational-model": "relational-database", "document": "nosql",
    "graph-db": "nosql", "vector": "vector-database", "scan-type": "scan", "page-read": "page-reads", "page": "page-reads",
    "pages": "page-reads", "rows-examined": "page-reads", "wall-clock-time": "latency", "data-format": "file-format",
    "data-formats": "file-format", "file-format": "file-format", "schema-and-contract": "data-contract",
    "freshness-slo": "freshness", "nrt-freshness-slo": "freshness", "report-sla": "sla", "kpi-dashboard": "dashboard",
    "semantic-model": "semantic-model", "measures-and-filter-context": "filter-context", "dax-style-evaluation": "dax",
    "report-design": "data-visualization", "encodings-and-perception": "data-visualization", "accessibility-check": "accessibility",
    "classes-and-encapsulation": "encapsulation", "composition-vs-inheritance": "composition", "refactoring-and-smell": "refactoring",
    "semantic-versioning": "semantic-versioning", "reading-unfamiliar-code": "code-reading", "adrs-with-rejected-alternative": "adr",
    "big-o-and-amortized-cost": "big-o-notation", "arrays-and-dynamic-array": "array", "hash-tables-and-load-factor": "hash-table",
    "trees-and-bst": "bst", "heaps-and-priority-queue": "heap", "graphs-and-representation": "graph",
    "tcp-handshake-and-acknowledgement": "tcp-handshake", "tls-and-certificate": "tls", "http-methods": "http-method",
    "rest-resource-modelling": "rest", "statelessness": "rest", "validation-and-error-contract": "api-error-contract",
    "hashing-and-salted-password": "password-hashing", "roles-and-permission": "rbac", "owasp-set": "owasp",
    "broken-access-control": "access-control", "access-control": "access-control", "threat-modelling": "threat-modeling",
    "jvm-and-bytecode": "jvm", "classes-and-record": "class", "jdbc-lifecycle": "jdbc", "preparedstatement-as-an-injection-barrier": "prepared-statement",
    "transaction-boundarie": "transaction", "jpa-vs-jdbc": "jpa", "controller-service-repository-layering": "layered-architecture",
    "spring-request-flow": "spring", "concurrency-basic": "concurrency", "caching-strategie": "caching",
    "landing-and-staging": "staging", "retries-and-backoff": "backoff", "dbt-style-tested-transformation": "dbt",
    "star-and-snowflake": "star-schema", "scd-types": "slowly-changing-dimension", "additive-vs-non-additive-measure": "additivity",
    "logical-vs-physical-model": "data-modeling", "datacube-platform-architecture": "datacube", "hdfs-namenode-and-datanode": "namenode",
    "mapreduce-map-shuffle-reduce": "mapreduce", "spark-driver-and-executor": "spark-driver", "transformations-vs-action": "lazy-evaluation",
    "transformation": "", "action": "", "structured-streaming": "streaming", "small-files-problem": "small-files-problem",
    "avro-and-schema-registry": "schema-registry", "dbus-kafka-ingestion": "dbus", "ods-ads-layering": "ods",
    "central-and-country-flow": "multi-tenancy", "sftp-ftps-delivery-window": "sftp", "retention-and-partition-aging": "data-retention",
    "data-quality-check": "data-quality", "the-four-break-class": "reconciliation-break", "four-break-classes": "reconciliation-break",
    "oat-and-cat-acceptance-testing": "acceptance-testing", "five-phase-test-methodology": "acceptance-testing",
    "rpo-rto-and-dr-failover": "disaster-recovery", "multi-tenancy-and-country-isolation": "multi-tenancy",
    "aml-cft-pep-and-gdpr-vocabulary": "aml-cft", "problem-formulation": "problem-formulation", "features-and-label": "feature",
    "scaling-and-encoding": "feature-scaling", "linear-and-logistic-regression": "linear-regression",
    "perceptrons-and-mlp": "neural-network", "cnns-and-pooling": "cnn", "rnns": "rnn", "tokenization-and-bpe": "tokenization",
    "bpe": "tokenization", "bow-and-tf-idf": "tf-idf", "word-embeddings": "embedding", "embeddings-and-similarity-metric": "cosine-similarity",
    "vector-indexes": "vector-database", "chunking-and-metadata": "chunk", "lexical-vs-dense-vs-hybrid": "hybrid-retrieval",
    "access-control-at-the-retrieval-layer": "access-control", "pii-in-citation": "pii", "agent-state-and-memory": "agent-memory",
    "images-and-layer": "container-image", "multi-stage-build": "multi-stage-build", "12-factor-config": "twelve-factor",
    "deployment-strategie": "deployment", "cloud-compute-storage-network": "cloud", "managed-service": "cloud",
    "iac-orientation": "infrastructure-as-code", "sli-slo-error-budget": "slo", "alerting-design": "alerting",
    "the-artifact-chain-and-lineage": "lineage", "readme-a-stranger-can-run": "readme", "architecture-diagram": "architecture-diagram",
    "portfolio-publication": "portfolio", "interview-technique": "interview", "star-interview": "interview",
    "references-and-aliasing": "aliasing", "stack-vs-heap": "stack-vs-heap", "the-mutable-default": "mutable-default-argument",
    "generators-and-laziness": "generator", "memory-bounding": "chunked-processing", "chunking": "chunk",
    "scope-and-legb": "scope", "the-call-stack": "call-stack", "strings-and-f-string": "string", "context-managers": "context-manager",
    "series-and-dataframe": "dataframe", "merge-and-the-duplication-trap": "fan-out", "vectorization-vs-row-loop": "vectorization",
    "unit-vs-integration-vs-acceptance": "test-pyramid", "coverage-and-its-limit": "test-coverage", "property-and-contract-testing": "property-testing",
    "hypothesis-driven-debugging": "debugging", "primary-and-foreign-key": "foreign-key", "normalization-1nf-3nf-and-bcnf": "normalization",
    "denormalization-trade-off": "denormalization", "views-and-materialized-view": "materialized-view", "all-join-type": "join",
    "anti-and-semi-join": "anti-join", "ctes-and-recursion": "common-table-expression", "set-operation": "set-operations",
    "window-functions-and-frame": "window-function", "gaps-and-island": "gaps-and-islands", "null-three-valued-logic": "three-valued-logic",
    "deadlock-and-victim-selection": "deadlock", "2pl": "locking", "isolation-levels": "isolation-level",
    "partitioning-and-pruning": "partition-pruning", "columnar-store": "columnar-storage", "lakehouse-format": "lakehouse",
    "spreadsheet-cleaning": "data-cleaning", "applied-step-transformation": "power-query", "applied-step": "power-query",
    "applied-steps": "power-query", "descriptive-statistic": "descriptive-statistics", "probability-and-baye": "bayes-theorem",
    "sampling-and-the-clt": "central-limit-theorem", "hypothesis-tests-and-p-value": "p-value", "power-and-sample-size": "statistical-power",
    "correlation-vs-causation": "correlation-causation", "cohesion-and-coupling": "coupling", "shell-as-a-repl": "shell",
    "reading-error": "error", "reading-errors": "error", "permissions-and-ownership": "file-permissions",
    "systemd-units-and-state": "systemd", "cron-and-scheduling": "cron", "ssh-key": "ssh", "ulimit-umask": "file-permissions",
    "resource-limit": "resource-limits", "troubleshooting-method": "troubleshooting", "filesystem-hierarchy": "filesystem",
    "boot-process": "boot-process", "loops-and-loop-control": "loop", "absolute-vs-relative-path": "relative-path",
    "ram-vs-storage": "ram", "choosing-by-operation-cost": "big-o-notation", "project-layout": "project-layout",
    "networking-tool": "networking", "networking-tools": "networking", "hardening": "hardening", "error-budget": "slo",
    "memory-rss": "ram", "shuffle-network": "shuffle", "stage-boundary-shuffle": "shuffle", "one-straggler": "skew",
    "straggler": "skew", "temperature-top-p": "temperature", "w-x-b": "neuron", "r-w-x": "file-permissions",
    "owner-group-other": "file-permissions", "rows-surviving": "where-clause", "alias-born-here": "logical-execution-order",
    "same-object": "aliasing", "name-value": "variable", "name-address": "dns", "read-bottom-up": "logging",
    "cycle-detected": "directed-acyclic-graph", "no-cycle": "directed-acyclic-graph", "acyclic": "directed-acyclic-graph",
    "event-time-ingestion-time": "event-time", "batch-id": "idempotency", "transaction-id": "idempotency",
    "same-transaction-id": "idempotency", "one-correlation-id": "correlation-id", "authenticated-authorized": "authorization",
    "completed-proven": "evidence", "verify-don-t-assume": "evidence", "as-was-not-as-is": "slowly-changing-dimension",
    "replaces-not-narrow": "filter-context", "all-ignores-the-filter": "filter-context", "metadata-only": "metadata",
    "blocked-at-retrieval": "access-control", "release-blocked": "quality-gate", "behaviour-unchanged": "refactoring",
    "behavior-unchanged": "refactoring", "branch-taken": "control-flow", "k-1": "knn", "nonlinearity": "activation",
    "non-linearity": "activation", "comparison": "big-o-notation", "decode": "fetch-decode-execute", "fetch": "fetch-decode-execute",
    "execute": "fetch-decode-execute", "absolute": "absolute-path", "relative": "relative-path", "victim-selection": "deadlock",
})
TOO_BROAD |= {"at", "map", "key", "source", "failed", "apply", "scale", "execution", "equal", "range", "default", "context",
              "generation", "dependency", "owner", "curriculum", "proof", "architecture", "performance", "date", "algorithm",
              "slot", "restart", "extract", "demo", "roadmap", "revenue", "refunded", "business-logic", "ai-analyst", "data-platform",
              "analytical-query", "d-im", "searching", "controller", "lifecycle", "hierarchy", "state", "total", "sum", "for",
              "transform", "data-engineering", "evidence", "ordering", "concurrency", "networking", "hardening", "troubleshooting",
              "project-layout", "code-reading", "resource-limits", "boot-process", "problem-formulation", "five-minute-defense",
              "verification", "frame", "star-interview", "interview-technique", "volume", "measure-", "comparisons", "knowledge", "interview", "ownership", "versioning",
              "collection", "extension", "routing", "loss-", "finally", "readme", "documentation", "portfolio"}
# single words that are also everyday English: a match in gloss_en alone is not a technical mention
COMMON_EN = set("""test row table column function loop error stack queue graph tree path process task measure branch merge commit
session batch volume port label feature weight parameter threshold distribution list set filter select limit order key join index
query pipeline dashboard token container partition offset grain lineage skew retry timeout cache consumer producer schema bug
deployment production storage scope loss baseline signal disk directory shell lag bias interface class object variable string
attention neuron activation report network block recall precision sample mean median stage retrieval embedding chunk metadata
encoding view owner group groups reconciliation break measure freshness model funnel kernel scheduler conflict tuple dict
cardinality dependency window streaming staging quarantine enrichment exception generator decorator coupling cohesion composition
heap deque array record records file files package remote source clean where select limit having distinct sorting case""".split())


BRIT_STEMS = ("normal", "vector", "serial", "token", "optim", "summar", "visual", "organ", "recogn", "priorit", "initial",
              "regular", "random", "material", "parallel", "central", "minim", "maxim", "standard", "categor", "special")


def _british(s):
    s = s.replace("isation", "ization")
    s = re.sub(r"(" + "|".join(BRIT_STEMS) + r")is(e|ed|es|ing)\b", r"\1iz\2", s)
    return s.replace("behaviour", "behavior").replace("colour", "color").replace("defence", "defense")


SING_KEEP = {"kubernetes", "pandas", "analysis", "status", "aws", "postgres", "series", "css", "https", "dbs", "ads", "ods",
             "statistics", "metrics", "mvcc", "jobs", "dns", "tls", "iis", "class", "access", "process", "success", "less", "bias",
             "axis", "basis", "loss", "address", "boss", "pass", "yes", "its", "this", "has", "was", "is", "us", "gas", "bus",
             "dbus", "tasks", "bayes", "cors", "corpus", "nrt", "rbac", "xss", "gans", "news", "physics", "economics", "redis",
             "try-with-resources", "two-pointers", "dry-kiss-yagni", "aml-cft", "hdfs", "yes", "always"}


def _singular(w):
    if w in SING_KEEP or len(w) <= 3 or not w.isascii():
        return w
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith(("sses", "shes", "ches", "xes")):
        return w[:-2]
    if w.endswith("s") and not w.endswith(("ss", "us", "is")):
        return w[:-1]
    return w


def slugify(s):
    s = s.replace(TATWEEL, "").strip().strip("`'\"“”")
    s = re.sub(r"^(?:ال|بال|وال|لل|فال|كال|بـ|و|ب|ل)(?=[A-Za-z])", "", s)
    s = s.lower().replace("+", "-plus-").replace("@", "-at-").replace("#", "sharp")
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9.\-]+", "-", s).strip("-.")
    s = re.sub(r"-+", "-", s).replace(".", "-")
    return s.strip("-")


def norm_key(term):
    """surface form -> canonical key (or '' if not latin / empty)."""
    if not term:
        return ""
    t = term.replace(TATWEEL, "").strip()
    if t.lower() in WHOLE_MAP:
        return WHOLE_MAP[t.lower()]
    if not LAT.search(t):
        return ""
    s = slugify(t)
    if not s:
        return ""
    if s in SYN:
        return SYN[s]
    s2 = _british(s)
    parts = s2.split("-")
    parts[-1] = _singular(parts[-1])
    s3 = "-".join(parts)
    for k in (s2, s3):
        if k in SYN:
            return SYN[k]
    return s3


def split_label(lbl):
    lo = lbl.lower().strip()
    if lo in KEEP_WHOLE or lo in WHOLE_MAP:
        return [lbl]
    if re.search(r"[=<>→≠∂()\[\]{}$£€%]|\d{2,}", lbl) or len(lbl) > 48:
        return []
    out = []
    for x in re.split(r"\s+/\s+|\s+·\s+|/|\s+vs\.?\s+| and its | with honest verdicts", lbl):
        x = re.sub(r"^(the|a|an)\s+", "", x.strip(), flags=re.I).strip(" .,:;`")
        if x:
            out.append(x)
    return out


def _sentences():
    out = []
    for f in sorted(glob.glob(C.p("corpus", "sentences", "a_S*.jsonl"))):
        out += C.read_jsonl(f)
    return out


def _translit():
    """Arabic surface -> latin term, from the S4 polish logs (why=term)."""
    m = collections.defaultdict(collections.Counter)
    for f in glob.glob(C.p("corpus", "transcripts", "*.polish.json")):
        for e in (C.read_json(f) or {}).get("edits", []):
            to, orig = e.get("to") or "", e.get("orig") or ""
            if e.get("why") == "term" and AR.search(orig) and LAT.search(to) and len(orig) >= 3:
                k = norm_key(to)
                a = re.sub(r"[^\u0600-\u06FF]", "", orig.replace(TATWEEL, ""))
                if k and len(a) >= 3:
                    m[k][a] += 1
    return {k: collections.Counter({a: n for a, n in c.items() if n >= 2}) for k, c in m.items()}


def seed(verbose=False):
    cands = collections.defaultdict(lambda: {"labels": collections.Counter(), "aliases": set(), "src": collections.Counter(),
                                              "refs": set(), "gloss_ar": None, "meaning_ar": None, "chapters": set()})

    def add(lbl, src, ref=None, w=1, chapters=()):
        for piece in split_label(lbl):
            k = norm_key(piece)
            if not k or len(k) < 2 or k in NOT_CONCEPT:
                continue
            c = cands[k]
            c["labels"][piece] += w
            c["aliases"].add(piece)
            c["src"][src] += 1
            if ref:
                c["refs"].add(ref)
            c["chapters"].update(chapters)
            yield k

    g = C.read_json(C.p("corpus", "canon", "glossary.json"))
    for t in g["terms"]:
        if t["kind"] in ("glossed", "always_english", "acronym"):
            list(add(t["term"], "glossary", f"glossary:{t.get('source') or t['kind']}", w=5))
    for t in g["first_mention_gloss"]:
        for k in add(t["term"], "glossary", "glossary:first_mention", w=3):
            cands[k]["gloss_ar"] = t["gloss_ar"]
    for t in g["nblm_terms"]:
        for k in add(t["term"], "nblm_term", f"nblm:{t['part']}", w=3):
            cands[k]["meaning_ar"] = cands[k]["meaning_ar"] or t["meaning_ar"]
    for t in g["term_chips"]:
        if t["kind"] == "term" and len(t["term"].split()) <= 3:
            list(add(t["term"], "chip", None, chapters=t.get("chapters", [])))
    ci = C.read_json(C.p("corpus", "canon", "coverage_index.json"))
    for d in ci["domains"]:
        for tp in d["topics"]:
            list(add(tp, "coverage", f"coverage:{d['domain']}", w=2, chapters=d.get("chapters", [])))
    for gp in ci.get("gaps", []):
        list(add(gp["gap"], "coverage", "coverage:gap", w=2, chapters=gp.get("closed_in", [])))
    for ch in C.read_json(C.p("corpus", "canon", "chapters.json"))["chapters"]:
        for lbl in ch.get("labels_en") or []:
            list(add(lbl, "chapter_label", ch["id"], chapters=[ch["id"]]))
        for sh in ch.get("shots", []):
            for lbl in sh.get("on_screen_terms") or []:
                list(add(lbl, "chapter_label", ch["id"], chapters=[ch["id"]]))
    scene_hits = collections.Counter()
    for sc in C.read_jsonl(C.p("corpus", "canon", "nblm_scenes.jsonl")):
        for t in sc.get("terms") or []:
            if len(t) <= 32 and not re.search(r"[=<>|&;$]|\s-\-?\w|\.\w{2,4}$", t):
                for k in add(t, "nblm_scene", sc["scene_id"]):
                    scene_hits[k] += 1
    vis = collections.Counter()
    for a in C.read_jsonl(C.p("corpus", "visual", "assets.jsonl")):
        for c in a.get("concepts") or []:
            k = norm_key(c[2:] if c.startswith("c:") else c)
            if k:
                vis[k] += 1

    # sentence terms (drop fragments: a term that is a hyphen-component of another term in the same sentence)
    sents = _sentences()
    sent_terms = {}
    def is_en(s):
        t = s["text"]
        return len(AR.findall(t)) < 0.2 * max(1, len(re.findall(r"\w", t)))
    for s in sents:
        ts = [t[2:] for t in s.get("terms") or [] if t.startswith("c:")] if not is_en(s) else []
        keep = [t for t in ts if not any(t != u and t in u.split("-") for u in ts)]
        ks = set()
        for t in keep:
            k = norm_key(t)
            if k and k not in NOT_CONCEPT:
                ks.add(k)
                c = cands[k]
                c["labels"][t.replace("-", " ")] += 1
                c["src"]["sentence_term"] += 1
        sent_terms[s["sent_id"]] = ks

    # mentions by n-gram lookup on gloss_en and the latin tokens of the Arabic text, + Arabic transliterations
    tr = _translit()
    ar_map = {}
    for k, cnt in tr.items():
        for a in cnt:
            ar_map.setdefault(a, k)
            if a.startswith("ال") and len(a) > 4:
                ar_map.setdefault(a[2:], k)
    keys = set(cands)
    mentions = collections.defaultdict(set)
    strong = collections.defaultdict(set)
    for s in sents:
        found = set(sent_terms[s["sent_id"]])
        for k in found:
            strong[k].add(s["sent_id"])
        en = is_en(s)
        texts = (s.get("gloss_en") or "",) if en else (s.get("gloss_en") or "", " ".join(re.findall(r"[A-Za-z][A-Za-z0-9_+\-./@]*", s["text"])))
        for src_i, txt in enumerate(texts):
            toks = re.findall(r"[A-Za-z0-9][A-Za-z0-9_+\-/@]*", txt)
            for n in (4, 3, 2, 1):
                for i in range(len(toks) - n + 1):
                    raw = " ".join(toks[i:i + n])
                    k = norm_key(raw)
                    if k in keys and not (src_i == 0 and n == 1 and (raw.lower() in COMMON_EN or k in COMMON_EN
                                                                     or raw.lower() in STOP or _singular(raw.lower()) in COMMON_EN)):
                        found.add(k)
                        if n >= 2 or src_i == 1:
                            strong[k].add(s["sent_id"])
        for w in re.findall(r"[؀-ۿـ]+", s["text"]):
            k = ar_map.get(w.replace(TATWEEL, ""))
            if k in keys:
                found.add(k)
        for k in found:
            mentions[k].add(s["sent_id"])

    # selection
    out = []
    for k, c in cands.items():
        if k in TOO_BROAD or k in STOP or k in NOT_CONCEPT or re.fullmatch(r"[\d\-]+|[a-z]", k):
            continue
        m = mentions.get(k, set())
        m1 = sum(1 for x in m if x.startswith("s:S1:"))
        m4 = len(m) - m1
        curated = bool(c["src"]["glossary"] or c["src"]["nblm_term"] or c["src"]["coverage"])
        kinds = sum(1 for x in ("glossary", "nblm_term", "coverage", "chip", "chapter_label", "nblm_scene", "sentence_term") if c["src"][x])
        kinds += 1 if vis.get(k) else 0
        st = c["src"]["sentence_term"]
        score = 3 * bool(c["src"]["glossary"]) + 2 * bool(c["src"]["nblm_term"]) + 1.5 * bool(c["src"]["coverage"]) \
            + min(len(m), 20) / 4 + min(scene_hits[k], 10) / 5 + min(vis.get(k, 0), 10) / 10
        if curated:
            keep = (len(m) + scene_hits[k] + vis.get(k, 0)) >= 1 and (len(m) >= 1 or scene_hits[k] >= 2 or c["src"]["glossary"]
                                                                      or (c["src"]["nblm_term"] and c["src"]["coverage"]))
        else:
            keep = st >= 3 and len(m) >= 3 and kinds >= 2
        if not keep:
            continue
        out.append({"key": k, "score": round(score, 2), "m_S1": m1, "m_S4": m4, "scenes": scene_hits[k], "visual": vis.get(k, 0),
                    "c": c, "mentions": m, "strong": strong.get(k, set()) & m})
    out.sort(key=lambda r: -r["score"])
    return out, tr, sents, cands


def label_en(c, k):
    if k in LABEL_FIX:
        return LABEL_FIX[k]
    best = None
    exact = [lbl for lbl, w in c["labels"].most_common() if LAT.search(lbl) and len(lbl) <= 40
             and "-".join(_singular(t) for t in slugify(lbl).split("-")) in (k, k.replace("-", ""))]
    if exact:
        best = exact[0]
    for lbl, w in ([] if best else c["labels"].most_common()):
        if slugify(lbl) not in SYN or SYN.get(slugify(lbl)) != k:
            continue
        if LAT.search(lbl) and len(lbl) <= 40 and len(lbl.split()) <= 4 and "_" not in lbl and k.split("-")[0] in slugify(lbl):
            best = lbl
            break
    best = best or LABEL_FIX.get(k) or k.replace("-", " ")
    best = re.sub(r"^(?:ال|الـ)", "", best.replace(TATWEEL, "")).strip("` ")
    if best.islower() and k in {"sql", "api", "etl", "elt", "ods", "ads", "hdfs", "llm", "rag", "kpi", "slo", "sla", "rpo", "rto",
                                "pii", "rbac", "iam", "jwt", "tls", "dns", "tcp", "http", "json", "csv", "jvm", "mvcc", "cpu", "ram",
                                "gpu", "erd", "ddl", "dml", "dag", "adr", "bfs", "dfs", "bst", "cnn", "rnn", "gan", "pca", "mae",
                                "mse", "kyc", "nrt", "msisdn", "arpu", "isr", "mpp", "xss", "csrf", "idor", "cors", "udp", "orc",
                                "sftp", "gdpr", "dbus", "dbt", "yarn", "rdd", "xcom", "owasp"}:
        best = best.upper() if k not in {"dbt", "xcom"} else best
    return best


LABEL_FIX = {"directed-acyclic-graph": "DAG", "retrieval-augmented-generation": "RAG", "large-language-model": "LLM",
             "artificial-intelligence": "AI", "machine-learning": "machine learning", "n-plus-one-query": "N+1 query",
             "ci-cd": "CI/CD", "at-transactional": "@Transactional", "aml-cft": "AML/CFT", "b-tree": "B-tree", "mean-median": "mean / median", "train-validation-test": "train / validation / test split",
             "precision-recall": "precision / recall", "query-key-value": "Q / K / V", "common-table-expression": "CTE",
             "global-interpreter-lock": "GIL", "dead-letter-queue": "DLQ", "slowly-changing-dimension": "SCD (slowly changing dimension)",
             "react-agent-loop": "ReAct", "tf-idf": "TF-IDF", "k-anonymity": "k-anonymity", "ab-testing": "A/B testing", "rest": "REST", "scope": "scope (LEGB)",
             "docker-layer-cache": "Docker layer cache", "access-control": "access control", "page-reads": "page reads",
             "narrow-wide-dependency": "narrow vs wide dependency", "slice-and-dice": "slice and dice", "hybrid-retrieval": "hybrid retrieval",
             "dense-retrieval": "dense retrieval", "aml-cft": "AML/CFT", "bias-variance": "bias-variance trade-off",
             "correlation-causation": "correlation vs causation", "partial-index": "partial index", "avl-tree": "AVL tree",
             "columnar-storage": "columnar storage", "late-arriving-data": "late-arriving data", "processing-time": "processing time",
             "ip-address": "IP address", "where-clause": "WHERE", "alerting": "alerting", "secrets-management": "secrets management",
             "mutable-default-argument": "mutable default argument", "dimension-table": "dimension table", "rdd": "RDD",
             "precision-recall-": ""}


def concept_records(limit=None):
    sel, tr, sents, _ = seed()
    gl = {s["sent_id"]: s for s in sents}
    recs = []
    for r in sel[:limit] if limit else sel:
        k, c = r["key"], r["c"]
        le = label_en(c, k)
        ar_aliases = [a for a, _ in tr.get(k, collections.Counter()).most_common(6)]
        ktoks = set(k.split("-"))
        lat = [a for a in c["aliases"] if a != le]
        true_al = [a for a in lat if (set(_singular(t) for t in slugify(a).split("-")) & ktoks) or re.fullmatch(r"[A-Z0-9/&+\-]{2,8}", a)
                   or SYN.get(slugify(a)) == k and len(a.split()) <= 3 and "_" not in a]
        related = sorted(set(lat) - set(true_al))[:10]
        aliases = sorted(set(true_al) | set(ar_aliases), key=lambda x: (AR.search(x) is None, x))[:16]
        la = f"الـ{le}" if re.fullmatch(r"[A-Za-z0-9 .+\-/@]+", le) else le
        ex = sorted(r["mentions"], key=lambda sid: (not sid.startswith("s:S1"), sid))
        recs.append({"v": 1, "id": f"c:{k}", "type": "Concept", "label_en": le, "label_ar": la, "aliases": aliases, "related_terms": related,
                     "def_ar": None, "def_en": None, "requires": [],
                     "gloss_ar": c["gloss_ar"], "meaning_ar": c["meaning_ar"],
                     "sources": sorted(c["refs"])[:12], "source_kinds": dict(c["src"]),
                     "mentions": {"S1": r["m_S1"], "S4": r["m_S4"], "nblm_scenes": r["scenes"], "visual": r["visual"]},
                     "chapters": sorted(c["chapters"])[:12], "score": r["score"],
                     "_examples": [gl[x]["gloss_en"] for x in ex if gl[x].get("gloss_en")][:40],
                     "_mention_ids": sorted(r["mentions"]), "_strong_ids": sorted(r["strong"])})
    return recs
