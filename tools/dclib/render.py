"""dc render snap|perf|spec|at11  (P7 component harness; driver studio/scripts/p7.ts, guide docs/tools/component_guide.md).

Every subcommand enqueues itself through tsp (golden rule 5) and waits, unless it already runs inside the queue or --inline
is given. Inside the queue it builds the TypeScript driver with esbuild (light) and runs it with node. GL = swiftshader only.
  snap <Name> [--approve]   stills 0/50/100 % of Demo-<Name>; pixelmatch vs studio/test/baselines/<Name>/; QA findings fail
  snap _selftest            the QA detectors must fire on the QA-Selftest fixture
  perf <Name>               box s/frame at 1080p per FX tier at the production concurrency (3 slots; the job claims all
                            3 queue slots) -> reports/perf/components/<Name>.json; exit 1 over the ADR-002 budget
  perf --aggregate          rebuild reports/perf/components.json from the per-component files (light, no render)
  spec <id> [--final]       render corpus/specs/<id>.json (preview 960x540 @ tokens.ts PREVIEW.fps, lite, by default); resolver
                            report; --nocam/--nofx/--cut/--solo=<layer> = isolated measurement renders
  at11                      AT-11 34 px join-gap motion clip + frames -> reports/p7/at11/
"""
import glob
import json
import os
import subprocess
import sys

from . import common as C
from . import queue as Q

STUDIO = C.p("studio")
DRIVER_SRC = os.path.join(STUDIO, "scripts", "p7.ts")
DRIVER_OUT = os.path.join(STUDIO, "node_modules", ".cache", "dc-p7", "p7.cjs")


def build_driver():
    os.makedirs(os.path.dirname(DRIVER_OUT), exist_ok=True)
    esb = os.path.join(STUDIO, "node_modules", ".bin", "esbuild")
    r = subprocess.run([esb, DRIVER_SRC, "--bundle", "--platform=node", "--format=cjs", "--packages=external",
                        "--log-level=warning", f"--outfile={DRIVER_OUT}"], cwd=STUDIO, capture_output=True, text=True)
    if r.returncode:
        C.fail(f"esbuild failed: {r.stderr.strip()[:800]}", 2)


def run_driver(argv):
    build_driver()
    env = dict(os.environ, NODE_PATH=os.path.join(STUDIO, "node_modules"))
    return subprocess.run(["node", DRIVER_OUT, *argv, f"--root={C.ROOT}"], cwd=STUDIO, env=env).returncode


def _heavy(args, label, driver_argv, mem_gb=3.0, slots_req=1):
    argv = [C.p("tools", "dc.py"), *sys.argv[1:]]  # re-run this exact CLI line inside the queue
    rc = Q.run_heavy(label, argv, args.inline, mem_gb=mem_gb, expected_gb=0.2, slots_req=slots_req)
    if rc is not None:
        return rc
    return run_driver(driver_argv)


def cmd_snap(args):
    drv = ["snap", args.name] + (["--approve"] if args.approve else []) + ([f"--approver={args.approver}"] if args.approver else [])
    return _heavy(args, f"render-snap-{args.name.strip('_')}", drv)


PERF_SLOTS = 3  # ADR-002 production concurrency; mirrored in studio/scripts/p7.ts PERF_SLOTS


def aggregate_perf():
    """reports/perf/components.json from reports/perf/components/<Name>.json (built at gate time, never edited by perf runs)."""
    comps, over = {}, []
    budgets = None
    for f in sorted(glob.glob(C.p("reports", "perf", "components", "*.json"))):
        r = C.read_json(f, {}) or {}
        name = r.get("name") or os.path.splitext(os.path.basename(f))[0]
        if r.get("v", 1) < 2:
            comps[name] = {"stale": "v1 report (slot s/frame at concurrency 1); re-run dc render perf " + name}
            over.append(name)
            continue
        budgets = r.get("budgets_box_s_per_frame", budgets)
        comps[name] = {t: v.get("box_s_per_frame") for t, v in (r.get("tiers") or {}).items()}
        comps[name]["within_budget"] = bool(r.get("within_budget"))
        comps[name]["measured_at"] = r.get("at")
        if not r.get("within_budget"):
            over.append(name)
    out = {"v": 2, "unit": f"box s/frame at 1080p, concurrency {PERF_SLOTS} (production), swiftshader, JPEG q80",
           "budgets_box_s_per_frame": budgets, "components": comps, "over_budget_or_stale": over}
    p = C.p("reports", "perf", "components.json")
    with open(p, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"perf aggregate: {len(comps)} components, over budget or stale: {', '.join(over) or 'none'} -> reports/perf/components.json")
    return 1 if over else 0


def cmd_perf(args):
    if args.aggregate:
        return aggregate_perf()
    if not args.name:
        C.fail("perf <Name> (or --aggregate)", 2)
    drv = ["perf", args.name, f"--tiers={args.tiers}"] + ([f"--frames={args.frames}"] if args.frames else []) \
        + (["--report-only"] if args.report_only else [])
    return _heavy(args, f"render-perf-{args.name}", drv, slots_req=PERF_SLOTS)


def cmd_spec(args):
    drv = ["spec", args.id] + (["--final"] if args.final else []) + ([f"--fps={args.fps}"] if args.fps else []) \
        + (["--no-audio"] if args.no_audio else []) + ([f"--report={args.report}"] if args.report else []) + [f"--conc={args.conc}"] \
        + (["--nocam"] if args.nocam else []) + (["--nofx"] if args.nofx else []) + (["--cut"] if args.cut else []) \
        + ([f"--solo={args.solo}"] if args.solo else [])
    kind = "final" if args.final else "preview"
    return _heavy(args, f"render-{kind}-{args.id.strip('_')}", drv, mem_gb=4.0, slots_req=args.conc)  # one queue slot per render tab


def cmd_at11(args):
    return _heavy(args, "render-at11", ["at11"])


def register(sub):
    rp = sub.add_parser("render", help="P7 component harness: snap / perf / spec preview / AT-11 (queue only)")
    rs = rp.add_subparsers(dest="render_cmd", required=True)

    def inl(s):
        s.add_argument("--inline", action="store_true", help="run here (only when already inside the queue)")

    s = rs.add_parser("snap", help="snapshot test of Demo-<Name> at 0/50/100 %% (pixelmatch vs studio/test/baselines)")
    s.add_argument("name", help="catalog component name, or _selftest")
    s.add_argument("--approve", action="store_true", help="write the renders as the new baselines (critic approval pending)")
    s.add_argument("--approver", default="", help="record the critic who approved the new baseline")
    inl(s)
    s.set_defaults(fn="render.cmd_snap")
    s = rs.add_parser("perf", help="box s/frame at 1080p per FX tier, 3 slots -> reports/perf/components/<Name>.json")
    s.add_argument("name", nargs="?", default="")
    s.add_argument("--aggregate", action="store_true", help="rebuild reports/perf/components.json from the per-component files")
    s.add_argument("--tiers", default="lite,standard,hero")
    s.add_argument("--frames", type=int, default=0, help="frames per tier (default: the whole demo)")
    s.add_argument("--report-only", action="store_true", help="exit 0 even when a tier is over its budget (default: exit 1)")
    inl(s)
    s.set_defaults(fn="render.cmd_perf")
    s = rs.add_parser("spec", help="render corpus/specs/<id>.json through SpecPlayer (preview 960x540 @ PREVIEW.fps, lite)")
    s.add_argument("id", help="spec file stem, e.g. CH-10 or _demo")
    s.add_argument("--final", action="store_true", help="1920x1080 @ 24 fps with the spec's FX tiers")
    s.add_argument("--fps", type=int, default=0)
    s.add_argument("--no-audio", action="store_true")
    s.add_argument("--conc", type=int, default=1)
    s.add_argument("--report", default="", help="also copy the resolver report to this repo path (e.g. reports/p7/_demo.resolver.json)")
    s.add_argument("--nocam", action="store_true", help="measurement render: no camera move")
    s.add_argument("--nofx", action="store_true", help="measurement render: no backdrop / post / streak")
    s.add_argument("--cut", action="store_true", help="measurement render: every transition is a hard cut")
    s.add_argument("--solo", default="", help="measurement render: draw only the layer with this id")
    inl(s)
    s.set_defaults(fn="render.cmd_spec")
    s = rs.add_parser("at11", help="AT-11: 34 px الـ+Latin labels in motion -> reports/p7/at11/")
    inl(s)
    s.set_defaults(fn="render.cmd_at11")
