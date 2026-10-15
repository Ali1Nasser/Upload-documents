#!/usr/bin/env python3
"""Concurrency tests for harness/state/*.json IO (tools/dclib/stateio.py). Run: python3 tools/tests/test_stateio.py (exit 0 = pass).

N parallel processes hammer one state dir; a reader polls without the lock. The file must always parse (never torn) and
no read-modify-write may be lost. Uses a temp state dir (DC_REPO_ROOT) - never touches the real harness/state.
"""
import json
import multiprocessing as mp
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import stateio  # noqa: E402

N_PROC, N_ITER = 8, 40


def _incr(path, who):
    from dclib import stateio as s
    for i in range(N_ITER):
        def f(d):
            d["n"] += 1
            d["by"][who] = d["by"].get(who, 0) + 1
            d["pad"] = "x" * (200 + (i * 37) % 4000)   # varying size: exposes torn / in-place writes
        s.update_json(path, f, default=lambda: {"n": 0, "by": {}})


def _blind(path, who):
    from dclib import stateio as s
    for i in range(N_ITER):
        s.write_json(os.path.join(os.path.dirname(path), "blind.json"), {"who": who, "i": i, "pad": "y" * (i * 97 % 5000)})


def main():
    td = tempfile.mkdtemp(prefix="stateio_")
    sd = os.path.join(td, "harness", "state")
    os.makedirs(sd)
    try:
        q = os.path.join(sd, "queue.json")
        bad, reads = [], [0]
        stop = threading.Event()

        def reader():
            while not stop.is_set():
                for name in ("queue.json", "blind.json"):
                    try:
                        with open(os.path.join(sd, name), encoding="utf-8") as f:
                            json.load(f)
                        reads[0] += 1
                    except FileNotFoundError:
                        pass
                    except Exception as e:  # noqa: BLE001
                        bad.append(f"{name}: {e!r}")
        th = threading.Thread(target=reader)
        th.start()
        ps = [mp.Process(target=_incr, args=(q, f"w{i}")) for i in range(N_PROC)]
        ps += [mp.Process(target=_blind, args=(q, f"b{i}")) for i in range(N_PROC)]
        for p in ps:
            p.start()
        for p in ps:
            p.join(120)
            assert p.exitcode == 0, f"writer exit {p.exitcode}"
        stop.set()
        th.join()
        d = json.load(open(q))
        assert not bad, f"torn reads: {bad[:3]}"
        assert d["n"] == N_PROC * N_ITER, f"lost updates: {d['n']} != {N_PROC * N_ITER}"
        assert all(v == N_ITER for v in d["by"].values()) and len(d["by"]) == N_PROC
        json.load(open(os.path.join(sd, "blind.json")))
        assert not [f for f in os.listdir(sd) if f.endswith(".tmp")], "leftover temp files"
        print(f"ok: {N_PROC} RMW + {N_PROC} blind writers x {N_ITER}, {reads[0]} lock-free reads, 0 torn, 0 lost")

        # real dc commands (progress.json via state.py critical sections) in parallel
        env = dict(os.environ, DC_REPO_ROOT=td)
        cmds = [subprocess.Popen([sys.executable, os.path.join(ROOT, "tools", "dc.py"), "state", "block", f"blocker {i}"],
                                 env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE) for i in range(12)]
        for c in cmds:
            err = c.communicate()[1]
            assert c.returncode == 0, err.decode()[-300:]
        prog = json.load(open(os.path.join(sd, "progress.json")))
        assert sorted(prog["blockers"]) == sorted(f"blocker {i}" for i in range(12)), prog["blockers"]
        print("ok: 12 parallel `dc state block` -> 12 blockers, progress.json parses")

        # missing file tolerated; corrupt file refused (never silently overwritten); reentrancy; bounded retry
        assert stateio.read_json(os.path.join(sd, "nope.json"), {"d": 1}) == {"d": 1}
        open(os.path.join(sd, "bad.json"), "w").write('{"a": 1}{"frag')
        try:
            stateio.update_json(os.path.join(sd, "bad.json"), lambda d: d)
            raise AssertionError("corrupt file was overwritten")
        except stateio.StateCorrupt:
            pass
        with stateio.lock(sd):
            stateio.write_json(os.path.join(sd, "re.json"), {"ok": True})   # nested lock in same thread must not deadlock
        holder = subprocess.Popen([sys.executable, "-c", (
            "import sys,time;sys.path.insert(0,%r);from dclib import stateio\n"
            "with stateio.lock(%r):\n print('held',flush=True);time.sleep(3)") % (os.path.join(ROOT, "tools"), sd)],
            stdout=subprocess.PIPE, text=True)
        assert holder.stdout.readline().strip() == "held"
        t0 = time.monotonic()
        try:
            with stateio.lock(sd, timeout=0.5):
                raise AssertionError("lock acquired while held")
        except stateio.LockTimeout:
            assert 0.4 < time.monotonic() - t0 < 2.0
        holder.wait()
        with stateio.lock(sd, timeout=2):
            pass
        print("ok: missing->default, corrupt refused, reentrant, bounded retry -> LockTimeout, released after holder exit")
    finally:
        shutil.rmtree(td, ignore_errors=True)
    print("PASS test_stateio")


if __name__ == "__main__":
    main()
