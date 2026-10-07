"""argparse tree for tools/dc.py. Subcommands from docs/plan/02 section 9.2 that are not built yet say so clearly."""
import argparse
import sys

from . import common as C

PLANNED = {  # command group -> phase that implements it
    "audio": "P3", "asr": "P3", "corpus": "P2", "visual": "P2", "graph": "P4", "story": "P5", "spec": "P7/P8",
    "render": "P6/P9", "sound": "P11", "qa": "P9", "deliver": "P14", "dag": "P0 (later)",
}


def build():
    ap = argparse.ArgumentParser(prog="dc", description="DA Camp film production CLI")
    sub = ap.add_subparsers(dest="group", required=True)

    # state
    st = sub.add_parser("state", help="phase / gates / blockers / next actions").add_subparsers(dest="state_cmd", required=True)
    st.add_parser("brief", help="<=25 line status").set_defaults(fn="state.cmd_brief")
    s = st.add_parser("snapshot", help="persist working state")
    s.add_argument("--reason", default="manual")
    s.set_defaults(fn="state.cmd_snapshot")
    s = st.add_parser("set-phase")
    s.add_argument("phase")
    s.set_defaults(fn="state.cmd_set_phase")
    s = st.add_parser("block")
    s.add_argument("text")
    s.set_defaults(fn="state.cmd_block")
    s = st.add_parser("unblock")
    s.add_argument("n", type=int, help="1-based blocker number")
    s.set_defaults(fn="state.cmd_unblock")
    s = st.add_parser("next", help="append a next action (or --done N / --clear)")
    s.add_argument("text", nargs="?")
    s.add_argument("--done", type=int)
    s.add_argument("--clear", action="store_true")
    s.set_defaults(fn="state.cmd_next")

    # gate
    g = sub.add_parser("gate").add_subparsers(dest="gate_cmd", required=True)
    s = g.add_parser("check", help="the only path to pass")
    s.add_argument("gate")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(fn="gates.cmd_check")

    # time
    t = sub.add_parser("time", help="the only ms<->frame converters").add_subparsers(dest="time_cmd", required=True)
    for name, h in (("ms2frame", "ms -> frame (round half up)"), ("frame2ms", "frame -> ms (round half up)")):
        s = t.add_parser(name, help=h)
        s.add_argument("value", type=int)
        s.add_argument("--fps", type=int, default=30)
        s.set_defaults(fn="timeutil.run")

    # q
    q = sub.add_parser("q", help="task-spooler queue wrapper").add_subparsers(dest="q_cmd", required=True)
    s = q.add_parser("submit")
    s.add_argument("--label", required=True)
    s.add_argument("--mem-gb", type=float, default=1.0)
    s.add_argument("--expected-gb", type=float, default=0.0)
    s.add_argument("--engine", default="")
    s.add_argument("cmd", nargs=argparse.REMAINDER)
    s.set_defaults(fn="queue.cmd_submit")
    s = q.add_parser("wait")
    s.add_argument("id", type=int)
    s.add_argument("--tail", type=int, default=0, help="print last N output lines")
    s.add_argument("--timeout", type=int, default=7200)
    s.set_defaults(fn="queue.cmd_wait")
    q.add_parser("status").set_defaults(fn="queue.cmd_status")

    # ingest
    ing = sub.add_parser("ingest", help="P1 ingest & forensics").add_subparsers(dest="ingest_cmd", required=True)
    for name, h in (("verify", "sha256 of data/raw vs inventory"), ("catalog", "hash + dedupe data/extracted"),
                    ("probe", "ffprobe + decode-error count per unique media file"),
                    ("quarantine", "list sensitive names; assert none on disk"), ("lineage", "version families")):
        s = ing.add_parser(name, help=h)
        s.add_argument("--force", action="store_true", help="ignore the manifest skip check")
        s.add_argument("--inline", action="store_true", help="run here instead of through tsp")
        if name in ("catalog", "probe"):
            s.add_argument("--limit", type=int, help="smoke test on a subset (writes to data/derived/smoke/)")
        if name == "probe":
            s.add_argument("--timeout", type=int, default=3600, help="per-file decode timeout (s)")
        s.set_defaults(fn=f"ingest.cmd_{name}")

    # planned groups
    for grp, phase in PLANNED.items():
        s = sub.add_parser(grp, help=f"not implemented yet ({phase})")
        s.add_argument("rest", nargs=argparse.REMAINDER)
        s.set_defaults(fn="planned", planned_group=grp, planned_phase=phase)
    return ap


def main(argv):
    ap = build()
    args = ap.parse_args(argv)
    if args.fn == "planned":
        print(f"dc {args.planned_group}: not implemented yet (owner phase {args.planned_phase}; see docs/plan/02 section 9.2)",
              file=sys.stderr)
        return 3
    mod, fn = args.fn.split(".")
    import importlib
    m = importlib.import_module(f"dclib.{mod}")
    rc = getattr(m, fn)(args)
    return rc or 0
