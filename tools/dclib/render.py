"""dc render snap|perf|spec|at11  (P7 component harness; driver studio/scripts/p7.ts, guide docs/tools/component_guide.md).

Every subcommand enqueues itself through tsp (golden rule 5) and waits, unless it already runs inside the queue or --inline
is given. Inside the queue it builds the TypeScript driver with esbuild (light) and runs it with node. GL = swiftshader only.
  snap <Name> [--approve]   stills 0/50/100 % of Demo-<Name>; pixelmatch vs studio/test/baselines/<Name>/; QA findings fail
  snap _selftest            the QA detectors must fire on the QA-Selftest fixture
  perf <Name>               s/frame at 1080p per FX tier under queue load -> reports/perf/components/<Name>.json
  spec <id> [--final]       render corpus/specs/<id>.json (preview 960x540 @ 12 fps lite by default); resolver report
  at11                      AT-11 34 px join-gap motion clip + frames -> reports/p7/at11/
"""
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


def _heavy(args, label, driver_argv, mem_gb=3.0):
    argv = [C.p("tools", "dc.py"), *sys.argv[1:]]  # re-run this exact CLI line inside the queue
    rc = Q.run_heavy(label, argv, args.inline, mem_gb=mem_gb, expected_gb=0.2)
    if rc is not None:
        return rc
    return run_driver(driver_argv)


def cmd_snap(args):
    drv = ["snap", args.name] + (["--approve"] if args.approve else []) + ([f"--approver={args.approver}"] if args.approver else [])
    return _heavy(args, f"render-snap-{args.name.strip('_')}", drv)


def cmd_perf(args):
    drv = ["perf", args.name, f"--tiers={args.tiers}"] + ([f"--frames={args.frames}"] if args.frames else []) + (["--strict"] if args.strict else [])
    return _heavy(args, f"render-perf-{args.name}", drv)


def cmd_spec(args):
    drv = ["spec", args.id] + (["--final"] if args.final else []) + ([f"--fps={args.fps}"] if args.fps else []) \
        + (["--no-audio"] if args.no_audio else []) + ([f"--report={args.report}"] if args.report else []) + [f"--conc={args.conc}"]
    kind = "final" if args.final else "preview"
    return _heavy(args, f"render-{kind}-{args.id.strip('_')}", drv, mem_gb=4.0)


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
    s = rs.add_parser("perf", help="s/frame at 1080p per FX tier -> reports/perf/components/<Name>.json")
    s.add_argument("name")
    s.add_argument("--tiers", default="lite,standard,hero")
    s.add_argument("--frames", type=int, default=0, help="frames per tier (default: the whole demo)")
    s.add_argument("--strict", action="store_true", help="exit 1 when a tier is over its budget")
    inl(s)
    s.set_defaults(fn="render.cmd_perf")
    s = rs.add_parser("spec", help="render corpus/specs/<id>.json through SpecPlayer (preview 960x540 @ 12 fps, lite)")
    s.add_argument("id", help="spec file stem, e.g. CH-10 or _demo")
    s.add_argument("--final", action="store_true", help="1920x1080 @ 24 fps with the spec's FX tiers")
    s.add_argument("--fps", type=int, default=0)
    s.add_argument("--no-audio", action="store_true")
    s.add_argument("--conc", type=int, default=1)
    s.add_argument("--report", default="", help="also copy the resolver report to this repo path (e.g. reports/p7/_demo.resolver.json)")
    inl(s)
    s.set_defaults(fn="render.cmd_spec")
    s = rs.add_parser("at11", help="AT-11: 34 px الـ+Latin labels in motion -> reports/p7/at11/")
    inl(s)
    s.set_defaults(fn="render.cmd_at11")
