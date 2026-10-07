"""dc gate check G#. Gate modules live in harness/gates/gNN.py and expose check(ctx) -> [ {name,pass,detail} ].

Only this module can move a gate to `pass` (progress.json); waived is set by an ADR, never here.
"""
import importlib.util
import json
import os
import re
import subprocess
import sys

from . import common as C
from . import state


def canon(g):
    m = re.fullmatch(r"[Gg](\d{1,2})([ab]?)", g.strip())
    if not m or f"G{int(m.group(1))}{m.group(2)}" not in C.GATE_IDS:
        C.fail(f"unknown gate {g!r}; known: {' '.join(C.GATE_IDS)}", 2)
    return f"G{int(m.group(1))}{m.group(2)}"


def module_path(g):
    m = re.fullmatch(r"G(\d+)([ab]?)", g)
    return C.p("harness", "gates", f"g{int(m.group(1)):02d}{m.group(2)}.py")


class Ctx:
    """Helpers handed to gate modules."""
    root = C.ROOT
    p = staticmethod(C.p)
    rel = staticmethod(C.rel)
    common = C

    @staticmethod
    def run(cmd, timeout=600, cwd=None):
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=cwd or C.ROOT)
        return r.returncode, (r.stdout or "") + (r.stderr or "")

    @staticmethod
    def dc(*args, timeout=600):
        return Ctx.run([sys.executable, C.p("tools", "dc.py"), *args], timeout=timeout)


def run_gate(g):
    path = module_path(g)
    if not os.path.exists(path):
        return [{"name": "implemented", "pass": False, "detail": "not implemented yet"}]
    spec = importlib.util.spec_from_file_location(f"gate_{g}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    try:
        checks = mod.check(Ctx)
    except Exception as e:  # noqa: BLE001  a crashing gate is a failing gate
        checks = [{"name": "gate_runs", "pass": False, "detail": f"gate module raised {type(e).__name__}: {e}"}]
    return [{"name": str(c["name"]), "pass": bool(c["pass"]), "detail": str(c.get("detail", ""))} for c in checks]


def cmd_check(args):
    g = canon(args.gate)
    checks = run_gate(g)
    ok = bool(checks) and all(c["pass"] for c in checks)
    report = {"gate": g, "pass": ok, "checks": checks, "created": C.now_iso()}
    rpath = C.p("reports", "gates", f"{g}.json")
    C.write_json(rpath, report)
    prog = state.load()
    cur = prog["gates"].get(g, {})
    unimplemented = all(c["detail"] == "not implemented yet" for c in checks)
    if unimplemented:  # a gate that has no checker yet stays `pending`; it is not a failure of the work
        pass
    elif cur.get("status") != "waived":  # waivers come from ADRs only
        prog["gates"][g] = {"status": "pass" if ok else "fail", "report": C.rel(rpath), "checked": report["created"]}
    state.save(prog)
    if args.quiet:
        return 0 if ok else 1
    print(f"{g}: {'PASS' if ok else 'FAIL'}  ({sum(c['pass'] for c in checks)}/{len(checks)} checks)  -> {C.rel(rpath)}")
    for c in checks:
        print(f"  [{'ok' if c['pass'] else '!!'}] {c['name']}: {c['detail']}")
    return 0 if ok else 1
