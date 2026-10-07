"""Registers the `dc corpus ...` group. Each corpus feature adds its own `_register_<name>(corp)` here so cli.py stays small.

canon (P2.2-P2.4/P2.6, graph-engineer): `dc corpus canon [--force]`
"""


def _register_canon(corp):
    s = corp.add_parser("canon", help="P2.2-P2.4/P2.6 canon (graph-engineer): master.md -> chapters/data_contract/glossary/coverage/"
                                      "assets/patterns/scene_contract/motion/spec; NotebookLM scenes; 70:05 cues; legacy shots (ast); scripts registry")
    s.add_argument("--force", action="store_true", help="ignore the manifest skip check")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(fn="canon.cmd_canon")


def register(sub):
    corp = sub.add_parser("corpus", help="P2 corpus distillation")
    c = corp.add_subparsers(dest="corpus_cmd", required=True)
    _register_canon(c)
    return c
