"""dc q submit|wait|status: guarded wrapper over task-spooler (binary `tsp`, or `ts` if it is task-spooler).

Slots = nproc - 1 (set with `tsp -S`). Guards: free RAM after the job must stay >= 2 GB;
free disk must be >= expected_gb + 3 GB. Ledger: harness/state/queue.json for every job,
corpus/render/jobs.jsonl (append-only, last line per job_id wins) for render labels only.
"""
import os
import re
import shutil
import subprocess
import sys
import time

from . import common as C

QUEUE_JSON = os.path.join(C.STATE, "queue.json")
JOBS_JSONL = C.p("corpus", "render", "jobs.jsonl")
MIN_FREE_RAM_GB = 2.0
DISK_MARGIN_GB = 3.0
TIERS = ("bench", "preview", "final", "plate", "strip", "contact")


def tsp_bin():
    """Return the task-spooler executable or None. `ts` is accepted only if it really is task-spooler."""
    forced = os.environ.get("DC_TSP_BIN")
    if forced:
        return forced
    for name in ("tsp", "ts"):
        exe = shutil.which(name)
        if not exe:
            continue
        try:
            r = subprocess.run([exe, "-h"], capture_output=True, text=True, timeout=10)
            txt = (r.stdout or "") + (r.stderr or "")
        except Exception:  # noqa: BLE001
            continue
        if re.search(r"task.?spooler|\[action\]|-ngfmdE", txt, re.I):
            return exe
    return None


def in_queue():
    return bool(os.environ.get("TS_JOBID") or os.environ.get("DC_IN_QUEUE"))


def slots():
    return max(1, C.nproc() - 1)


def _load():
    q = C.read_json(QUEUE_JSON, {}) or {}
    q.setdefault("v", 1)
    q.setdefault("jobs", {})
    return q


def _save(q):
    C.write_json(QUEUE_JSON, q)


def _tsp(args, **kw):
    exe = tsp_bin()
    if not exe:
        C.fail("task-spooler not found (apt package 'task-spooler'; binary tsp). Run harness/setup.sh. "
               "Heavy compute must go through the queue.", 3)
    return subprocess.run([exe, *args], capture_output=True, text=True, timeout=kw.pop("timeout", 60), **kw)


def _is_render(label):
    return bool(re.match(r"(?i)^(render|r)[-_:]", label))


def _ledger(job):
    """Append a render-job ledger line (schema render_job)."""
    label = job["label"]
    tier = next((t for t in TIERS if re.search(rf"(?i)(^|[-_:]){t}([-_:]|$)", label)), "bench")
    ch = re.search(r"(CH-\d{2}|DD-P\d{2}(?:-\d+)?)", label)
    rec = {"v": 1, "job_id": label, "chapter": ch.group(1) if ch else "", "tier": tier, "engine": job.get("engine", ""),
           "cmd": job["cmd"], "tsp_id": job.get("tsp_id"), "status": job["status"], "attempts": job.get("attempts", 1),
           "mem_gb": job.get("mem_gb", 0), "expected_gb": job.get("expected_gb", 0)}
    C.append_jsonl(JOBS_JSONL, rec)


def guards(mem_gb, expected_gb, q):
    """Return (ok, reason). RAM: MemAvailable minus memory declared by jobs still waiting to start."""
    avail = C.mem_available_gb()
    if avail is not None:
        # at most `slots` jobs can run at once, so only the largest `slots` queued jobs can ever be resident together
        pending = sum(sorted((j.get("mem_gb", 0) for j in q["jobs"].values() if j.get("status") == "queued"), reverse=True)[:slots()])
        if avail - pending - mem_gb < MIN_FREE_RAM_GB:
            return False, (f"RAM guard: {avail:.1f} GB available - {pending:.1f} GB already promised to queued jobs "
                           f"- {mem_gb:.1f} GB for this job < {MIN_FREE_RAM_GB:.0f} GB floor")
    free = C.disk_free_gb()
    if free is not None and free < expected_gb + DISK_MARGIN_GB:
        return False, f"disk guard: {free:.1f} GB free < expected {expected_gb:.1f} GB + {DISK_MARGIN_GB:.0f} GB margin"
    return True, "ok"


def submit(label, cmd, mem_gb=1.0, expected_gb=0.0, engine=""):
    """Library entry (also used by other dclib modules). Returns the job record."""
    q = _load()
    ok, why = guards(mem_gb, expected_gb, q)
    if not ok:
        C.fail(f"refused: {why}", 4)
    _tsp(["-S", str(slots())])
    env_cmd = ["env", "DC_IN_QUEUE=1", *cmd]
    r = _tsp(["-L", label, *env_cmd])
    if r.returncode != 0 or not r.stdout.strip().isdigit():
        C.fail(f"tsp submit failed: {(r.stderr or r.stdout).strip()}", 5)
    tid = int(r.stdout.strip())
    job = {"label": label, "cmd": " ".join(cmd), "tsp_id": tid, "status": "queued", "mem_gb": mem_gb,
           "expected_gb": expected_gb, "engine": engine, "attempts": 1, "submitted": C.now_iso()}
    q["jobs"][str(tid)] = job
    _save(q)
    if _is_render(label):
        _ledger(job)
    return job


def parse_list(txt):
    """Parse `tsp -l`: ID State Output E-Level Times Command [label]. Returns {id: (state, exit)}."""
    out = {}
    for line in txt.splitlines()[1:]:
        m = re.match(r"^\s*(\d+)\s+(queued|running|finished|skipped|allocating)\s+(\S+)\s+(\S+)", line)
        if m:
            out[int(m.group(1))] = (m.group(2), m.group(4) if m.group(2) == "finished" else None)
    return out


def refresh():
    """Sync ledger statuses from tsp. Returns (queue, listing text)."""
    q = _load()
    exe = tsp_bin()
    if not exe:
        return q, ""
    txt = _tsp(["-l"]).stdout
    states = parse_list(txt)
    for tid, (st, ex) in states.items():
        j = q["jobs"].get(str(tid))
        if not j:
            continue
        new = j["status"]
        if st == "finished":
            new = "done" if ex in (None, "0") else "failed"
            j["exit"] = ex
        elif st in ("running", "queued"):
            new = st
        if new != j["status"]:
            j["status"] = new
            j["updated"] = C.now_iso()
            if _is_render(j["label"]):
                _ledger(j)
    _save(q)
    return q, txt


def cmd_submit(args):
    cmd = list(args.cmd)
    if cmd and cmd[0] == "--":
        cmd = cmd[1:]
    if not cmd:
        C.fail("usage: dc q submit --label L [--mem-gb N] [--expected-gb N] -- <cmd...>", 2)
    job = submit(args.label, cmd, args.mem_gb, args.expected_gb, args.engine or "")
    print(job["tsp_id"])
    return 0


def cmd_wait(args):
    _tsp(["-w", str(args.id)], timeout=args.timeout)
    q, _ = refresh()
    j = q["jobs"].get(str(args.id), {})
    info = _tsp(["-i", str(args.id)]).stdout
    m = re.search(r"exit code (\d+)", info)
    code = int(m.group(1)) if m else (0 if j.get("status") == "done" else 1)
    if args.tail:
        out = _tsp(["-c", str(args.id)]).stdout
        sys.stdout.write("\n".join(out.splitlines()[-args.tail:]) + "\n")
    print(f"job {args.id} finished, exit {code}")
    return code


def cmd_status(_args):
    q, txt = refresh()
    c = {}
    for j in q["jobs"].values():
        c[j["status"]] = c.get(j["status"], 0) + 1
    exe = tsp_bin()
    print(f"tsp: {exe or 'NOT INSTALLED'} | slots target {slots()} | jobs: {c or 'none'}")
    ram, disk = C.mem_available_gb(), C.disk_free_gb()
    print(f"RAM avail {ram:.1f} GB (floor {MIN_FREE_RAM_GB:.0f}) | disk free {disk:.1f} GB (margin {DISK_MARGIN_GB:.0f})")
    if txt.strip():
        print(txt.rstrip())
    return 0


def run_heavy(label, argv, inline, mem_gb=1.0, expected_gb=0.0):
    """Used by ingest commands: enqueue self through tsp and wait, unless already inside the queue / --inline.
    Returns None when the caller should run inline, else the exit code."""
    if inline or in_queue():
        return None
    if not tsp_bin():
        print("WARNING: tsp not installed yet; running inline (bootstrap only).", file=sys.stderr)
        return None
    job = submit(label, [sys.executable, *argv], mem_gb, expected_gb)
    print(f"queued as tsp job {job['tsp_id']} ({label}); waiting...", file=sys.stderr)
    class A:  # noqa: D401
        id = job["tsp_id"]
        timeout = 7200
        tail = 60
    return cmd_wait(A)
