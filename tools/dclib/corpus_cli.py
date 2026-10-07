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
            s.add_argument("--front", action="store_true", help="move the queue job to the front (short job, < 5 min)")
        s.set_defaults(fn="hub.run")


def _register_canon(corp):
    s = corp.add_parser("canon", help="P2.2-P2.4/P2.6 canon (graph-engineer): master.md -> chapters/data_contract/glossary/coverage/"
                                      "assets/patterns/scene_contract/motion/spec; NotebookLM scenes; 70:05 cues; legacy shots (ast); scripts registry")
    s.add_argument("--force", action="store_true", help="ignore the manifest skip check")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(fn="canon.cmd_canon")


def register(sub):
    corp = sub.add_parser("corpus", help="P2 corpus distillation (hub harvest; chunks/search/maps/packs are added by their owners)")
    c = corp.add_subparsers(dest="corpus_cmd", required=True)
    _register_hub(c)
    _register_canon(c)
    return c
