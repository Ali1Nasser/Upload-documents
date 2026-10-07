"""dc state brief|snapshot|set-phase|block|unblock|next. State lives in harness/state/*.json."""
import os
import subprocess

from . import common as C

PROGRESS = os.path.join(C.STATE, "progress.json")
MAX_BRIEF = 25


def default_progress():
    return {"v": 1, "phase": "P0",
            "gates": {g: {"status": "pending"} for g in C.GATE_IDS},
            "counters": {"sentences": 0, "idea_units": 0, "shots": 0, "frames_final": 0},
            "blockers": [], "next_actions": [], "updated": C.now_iso()}


def load():
    prog = C.read_json(PROGRESS)
    if prog is None:
        prog = default_progress()
    for g in C.GATE_IDS:  # forward-compatible: newly registered gates appear as pending
        prog.setdefault("gates", {}).setdefault(g, {"status": "pending"})
    return prog


def save(prog):
    prog["updated"] = C.now_iso()
    C.write_json(PROGRESS, prog)


def _trim(s, n=150):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[: n - 1] + "…"


def brief_lines():
    prog = load()
    L = [f"DA Camp film | phase {prog.get('phase')} | state updated {prog.get('updated')}"]
    g = prog["gates"]
    cells = [f"{k}:{g[k].get('status', '?')}" for k in C.GATE_IDS]
    L.append("Gates:")
    for i in range(0, len(cells), 5):
        L.append("  " + "  ".join(cells[i:i + 5]))
    bl = prog.get("blockers", [])
    L.append(f"Blockers ({len(bl)}):" + (" none" if not bl else ""))
    for i, b in enumerate(bl[:5], 1):
        L.append(f"  {i}. {_trim(b)}")
    if len(bl) > 5:
        L.append(f"  (+{len(bl) - 5} more; see harness/state/progress.json)")
    na = prog.get("next_actions", [])
    L.append(f"Next actions ({len(na)}):" + (" none" if not na else ""))
    for i, a in enumerate(na[:5], 1):
        L.append(f"  {i}. {_trim(a)}")
    if len(na) > 5:
        L.append(f"  (+{len(na) - 5} more)")
    disk, ram = C.disk_free_gb(), C.mem_available_gb()
    L.append(f"Resources: disk free {disk:.1f} GB | RAM avail {ram:.1f} GB | nproc {C.nproc()}"
             if disk is not None and ram is not None else "Resources: unavailable")
    bud = C.read_json(os.path.join(C.STATE, "budget.json"), {}) or {}
    parts = []
    for k in ("render_s_per_frame", "asr_rtf", "upload_smoke"):
        parts.append(f"{k}={'set' if bud.get(k) else 'unset'}")
    L.append("Budgets: " + " ".join(parts) + f" | keys={len(bud)}")
    q = C.read_json(os.path.join(C.STATE, "queue.json"), {}) or {}
    jobs = q.get("jobs", {})
    if jobs:
        act = sum(1 for j in jobs.values() if j.get("status") in ("queued", "running"))
        L.append(f"Queue: {len(jobs)} jobs tracked, {act} active")
    L.append("Commands: python3 tools/dc.py state|gate|time|q|ingest ...  (docs/plan/02 section 9.2)")
    return [_trim(x, 170) for x in L][:MAX_BRIEF]


def cmd_brief(_args):
    try:
        print("\n".join(brief_lines()))
    except Exception as e:  # noqa: BLE001  never break SessionStart
        print(f"DA Camp film | state unavailable: {e}")
    return 0


def cmd_snapshot(args):
    prog = load()
    ts = C.now_iso().replace(":", "").replace("-", "")
    reason = (args.reason or "manual").replace("/", "_").replace(" ", "_")
    snap = {"v": 1, "created": C.now_iso(), "reason": reason, "progress": prog}
    for n in ("decisions", "budget", "queue"):
        snap[n] = C.read_json(os.path.join(C.STATE, f"{n}.json"))
    try:
        snap["git_head"] = subprocess.run(["git", "-C", C.ROOT, "rev-parse", "--short", "HEAD"],
                                          capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:  # noqa: BLE001
        snap["git_head"] = None
    d = os.path.join(C.STATE, "snapshots")
    path = os.path.join(d, f"{ts}-{reason}.json")
    C.write_json(path, snap)
    old = sorted(os.listdir(d))
    for f in old[:-20]:  # keep the 20 newest
        os.remove(os.path.join(d, f))
    print(f"snapshot written: {C.rel(path)}")
    return 0


def cmd_set_phase(args):
    import re
    if not re.fullmatch(r"P\d{1,2}", args.phase):
        C.fail(f"phase must look like P0..P15, got {args.phase!r}", 2)
    prog = load()
    prog["phase"] = args.phase
    save(prog)
    print(f"phase = {args.phase}")
    return 0


def cmd_block(args):
    prog = load()
    prog["blockers"].append(args.text)
    save(prog)
    print(f"blocker {len(prog['blockers'])} added")
    return 0


def cmd_unblock(args):
    prog = load()
    n = args.n
    if not 1 <= n <= len(prog["blockers"]):
        C.fail(f"no blocker {n} (have {len(prog['blockers'])})", 2)
    gone = prog["blockers"].pop(n - 1)
    save(prog)
    print(f"removed blocker {n}: {_trim(gone, 80)}")
    return 0


def cmd_next(args):
    prog = load()
    if args.done is not None:
        n = args.done
        if not 1 <= n <= len(prog["next_actions"]):
            C.fail(f"no next action {n} (have {len(prog['next_actions'])})", 2)
        gone = prog["next_actions"].pop(n - 1)
        save(prog)
        print(f"done: {_trim(gone, 80)}")
        return 0
    if args.clear:
        prog["next_actions"] = []
    if args.text:
        prog["next_actions"].append(args.text)
    save(prog)
    print(f"{len(prog['next_actions'])} next action(s)")
    return 0
