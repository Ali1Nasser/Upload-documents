#!/usr/bin/env python3
"""Plain-assert tests for the ADR-011 AT-13R2 engine provenance in `dc render spec` (tools/dclib/render.py).
Run: python3 tools/tests/test_render_engine.py  (exit 0 = all pass). Uses throwaway git repos; no render, no queue."""
import json
import os
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import common as C  # noqa: E402
from dclib import render as R  # noqa: E402

N = [0]


def check(cond, msg):
    N[0] += 1
    if not cond:
        print("FAIL:", msg)
        sys.exit(1)


def git(d, *a):
    return subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *a], cwd=d, capture_output=True, text=True, check=True).stdout.strip()


def main():
    with tempfile.TemporaryDirectory() as d:
        git(d, "init", "-q")
        os.makedirs(os.path.join(d, "studio", "src"))
        open(os.path.join(d, "studio", "src", "a.ts"), "w").write("x\n")
        open(os.path.join(d, "other.txt"), "w").write("x\n")
        git(d, "add", "-A")
        git(d, "commit", "-qm", "init")
        head = git(d, "rev-parse", "HEAD")

        e = R.engine_state(d)
        check(e["head"] == head and len(head) == 40, "head recorded")
        check(e["studio_dirty"] is False and R.engine_tag(e) == head, "clean studio -> no +dirty")
        check(R.check_solo(e, "rules") == "", "--solo allowed on a clean studio/")

        open(os.path.join(d, "other.txt"), "w").write("changed\n")  # outside studio/: does not count
        check(R.engine_state(d)["studio_dirty"] is False, "dirty file outside studio/ ignored")

        open(os.path.join(d, "studio", "src", "a.ts"), "w").write("y\n")  # modified tracked file
        e = R.engine_state(d)
        check(e["studio_dirty"] and e["studio_dirty_count"] == 1 and "a.ts" in e["studio_dirty_files"][0], "modified file -> dirty")
        check(R.engine_tag(e) == head + "+dirty", "tag has +dirty")
        msg = R.check_solo(e, "rules")
        check(msg.startswith("refused") and "--solo=rules" in msg, "--solo refused on dirty studio/")
        check(R.check_solo(e, "") == "", "non-solo render allowed (only recorded) on dirty studio/")
        git(d, "checkout", "--", "studio")

        open(os.path.join(d, "studio", "new.ts"), "w").write("z\n")  # untracked counts
        check(R.engine_state(d)["studio_dirty"], "untracked file in studio/ -> dirty")
        os.remove(os.path.join(d, "studio", "new.ts"))
        check(not R.engine_state(d)["studio_dirty"], "clean again")

        # fail closed outside a git repo
        with tempfile.TemporaryDirectory() as nd:
            e = R.engine_state(nd)
            check(e["head"] == "unknown" and e["studio_dirty"], "no git repo -> unknown + dirty (fail closed)")

        # stamping resolver.json (driver output untouched in studio/)
        old = C.ROOT
        C.ROOT = d
        try:
            od = os.path.join(d, "data", "renders", "spec", "X", "preview12_dbg-solo-rules")
            stale = os.path.join(d, "data", "renders", "spec", "X", "final24")
            os.makedirs(od)
            os.makedirs(stale)
            json.dump({"anchors_total": 1}, open(os.path.join(stale, "resolver.json"), "w"))
            os.utime(os.path.join(stale, "resolver.json"), (1, 1))
            since = time.time()
            json.dump({"anchors_total": 3}, open(os.path.join(od, "resolver.json"), "w"))
            os.makedirs(os.path.join(d, "reports"))
            json.dump({"anchors_total": 3}, open(os.path.join(d, "reports", "r.json"), "w"))
            e = R.engine_state(d)
            done = R.stamp_resolvers("X", since, e, "reports/r.json")
            check(len(done) == 2, f"stamped the new resolver + the --report copy only, got {done}")
            for f in (os.path.join(od, "resolver.json"), os.path.join(d, "reports", "r.json")):
                j = json.load(open(f))
                check(j["engine"]["head"] == head and j["engine"]["studio_dirty"] is False and j["anchors_total"] == 3, "engine field written, rest kept")
            check("engine" not in json.load(open(os.path.join(stale, "resolver.json"))), "older resolver untouched")
        finally:
            C.ROOT = old

    # CLI wiring: dc render spec --solo on a dirty studio/ exits 2 before anything is queued or rendered
    with tempfile.TemporaryDirectory() as d:
        git(d, "init", "-q")
        os.makedirs(os.path.join(d, "studio"))
        open(os.path.join(d, "studio", "a.ts"), "w").write("x\n")
        git(d, "add", "-A")
        git(d, "commit", "-qm", "init")
        open(os.path.join(d, "studio", "a.ts"), "w").write("y\n")
        env = dict(os.environ, DC_REPO_ROOT=d)
        env.pop("DC_IN_QUEUE", None)
        r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "dc.py"), "render", "spec", "_demo", "--solo", "rules"],
                           cwd=d, env=env, capture_output=True, text=True, timeout=120)
        check(r.returncode == 2 and "dirty studio/" in (r.stderr + r.stdout), f"CLI refuses --solo on dirty studio/ (rc {r.returncode}: {r.stderr[-200:]})")
        check(not os.path.exists(os.path.join(d, "harness", "state", "queue.json")), "nothing was queued")
    print(f"test_render_engine: {N[0]} checks passed")


if __name__ == "__main__":
    main()
