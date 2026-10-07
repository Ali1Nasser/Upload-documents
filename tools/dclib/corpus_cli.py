"""Registers the `dc corpus ...` group. Each corpus feature adds its own `_register_<name>(corp)` here so cli.py stays small.

hub (P2.5, context-engineer): `dc corpus hub index|crash|items|shots|all`
"""


def _register_hub(corp):
    hub = corp.add_parser("hub", help="P2.5 HUB/knowledge harvest: knowledge index, crash course, hub items, offline screenshots")
    sub = hub.add_subparsers(dest="hub_cmd", required=True)
    helps = {"index": "stream DA_Camp_KNOWLEDGE.md by heading -> corpus/canon/knowledge_index.jsonl",
             "crash": "Visual Crash Course 79 steps -> corpus/canon/crash_course_steps.jsonl",
             "items": "mermaid/code/lab/section items from the six top HUB builds -> corpus/canon/hub_items.jsonl",
             "shots": "Playwright offline screenshots (queued, one job per build) -> data/derived/hub_shots + hub_shots.jsonl",
             "all": "index + crash + items + shots"}
    for name, h in helps.items():
        s = sub.add_parser(name, help=h)
        s.add_argument("--force", action="store_true", help="ignore the manifest skip check")
        if name in ("items", "shots", "all"):
            s.add_argument("--build", nargs="*", help="limit to these build slugs (vcc lab-m12-ds supreme-final2 nilepay-journey fusion unified)")
        if name in ("shots", "all"):
            s.add_argument("--max-shots", type=int, default=25, help="screenshots per build (default 25)")
            s.add_argument("--inline", action="store_true", help="run the browser here instead of through tsp")
            s.add_argument("--worker", action="store_true", help="(internal) run the listed builds inside a queue job")
            s.add_argument("--merge-only", action="store_true", help="no browser: merge per-build results into corpus/canon/hub_shots.jsonl")
            s.add_argument("--front", action="store_true", help="move the queue job to the front (short job, < 5 min)")
        s.set_defaults(fn="hub.run")


def _register_canon(corp):
    s = corp.add_parser("canon", help="P2.2-P2.4/P2.6 canon (graph-engineer): master.md -> chapters/data_contract/glossary/coverage/"
                                      "assets/patterns/scene_contract/motion/spec; NotebookLM scenes; 70:05 cues; legacy shots (ast); scripts registry")
    s.add_argument("--force", action="store_true", help="ignore the manifest skip check")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(fn="canon.cmd_canon")


def _register_text(corp):
    """P2.1/P2.8 (context-engineer): distill, index, search, smoke, maps."""
    s = corp.add_parser("distill", help="P2.1 heading-chunk every unique md/txt/json/csv/srt/vtt/ass source -> chunks.jsonl (+ docs.jsonl)")
    s.add_argument("--force", action="store_true")
    s.add_argument("--max-mb", type=float, default=60.0, help="keep chunks.jsonl in corpus/text up to this size, else data/derived/text")
    s.set_defaults(fn="distill.cmd_distill")
    s = corp.add_parser("index", help="BM25 index over chunks (pure Python) -> data/derived/index; --dense also queues bge-m3 encoding")
    s.add_argument("--force", action="store_true")
    s.add_argument("--dense", action="store_true", help="queue bge-m3 encoding of the dense subset (data/derived/vectors)")
    s.add_argument("--dense-all", action="store_true", help="encode every chunk (adds the 3 duplicate big masters, subtitles, knowledge ~12k more), not only the core ~2.9k")
    s.add_argument("--worker", help="(internal) encode shard k/n inside a queue job")
    s.set_defaults(fn="search.cmd_index")
    s = corp.add_parser("search", help="hybrid BM25 + bge-m3 search with citations")
    s.add_argument("query")
    s.add_argument("--k", type=int, default=8)
    s.add_argument("--lang", default="ar,en", help="comma list: ar, en (mixed chunks count for both)")
    s.add_argument("--family", help="restrict to a source family (see corpus/maps/corpus.md)")
    s.add_argument("--doc", help="restrict to a doc_id (f:...) or a path substring")
    s.add_argument("--no-dense", action="store_true", help="BM25 only")
    s.add_argument("--json", action="store_true")
    s.add_argument("--full", action="store_true", help="print the whole chunk text instead of a snippet")
    s.set_defaults(fn="search.cmd_search")
    s = corp.add_parser("show", help="print chunks by id (f:<doc>#NNNNN[-NNNNN]) or a knowledge section (K#####)")
    s.add_argument("ref")
    s.add_argument("--max-chars", type=int, default=6000)
    s.set_defaults(fn="search.cmd_show")
    s = corp.add_parser("smoke", help="smoke queries with an expected source in the top 3 -> reports/retrieval_smoke.md")
    s.add_argument("--no-dense", action="store_true")
    s.set_defaults(fn="search.cmd_smoke")
    s = corp.add_parser("maps", help="P2.8 corpus maps (corpus -> family -> document -> section), each <= 300 words -> corpus/maps/")
    s.add_argument("--force", action="store_true")
    s.set_defaults(fn="maps.cmd_maps")


def register(sub):
    corp = sub.add_parser("corpus", help="P2 corpus distillation (hub harvest; chunks/search/maps/packs are added by their owners)")
    c = corp.add_subparsers(dest="corpus_cmd", required=True)
    _register_hub(c)
    _register_canon(c)
    _register_text(c)
    return c
