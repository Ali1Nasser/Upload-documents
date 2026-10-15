"""Atomic, serialized IO for harness/state/*.json (queue, progress, budget, decisions, fyi, snapshots). Stdlib only.

Every writer takes ONE exclusive fcntl lock (<state dir>/.lock) and replaces the file via temp file in the same dir
+ fsync + os.replace, so a reader never sees a torn file and two concurrent read-modify-writes never lose an update.
  - lock(path_or_dir)            reentrant context manager (same process may nest); bounded retry, then LockTimeout
  - write_json(path, obj)        locked atomic replace (use for blind overwrites)
  - update_json(path, fn, default)  locked read-modify-write; fn mutates obj in place (or returns a new one)
  - read_json(path, default)     lock-free (replace is atomic); a missing/empty file gives `default`
A file that exists but does not parse raises StateCorrupt: it is never silently overwritten.
Semantics of the stored data are untouched; only the IO path is. Also loadable by path from harness/lib/budget_io.py.
"""
import contextlib
import fcntl
import json
import os
import tempfile
import threading
import time

LOCK_NAME = ".lock"
LOCK_TIMEOUT_S = float(os.environ.get("DC_STATE_LOCK_TIMEOUT", "60"))
_tls = threading.local()   # per-thread: {lockfile: [fd, depth]}; flock is per open-file, so nesting must reuse the fd


class LockTimeout(RuntimeError):
    pass


class StateCorrupt(RuntimeError):
    pass


def state_dir(path):
    """Directory whose .lock guards `path`: the nearest ancestor named `state` (so snapshots/ share the lock)."""
    d = os.path.dirname(os.path.abspath(path)) if not os.path.isdir(path) else os.path.abspath(path)
    cur = d
    while True:
        if os.path.basename(cur) == "state":
            return cur
        nxt = os.path.dirname(cur)
        if nxt == cur:
            return d
        cur = nxt


@contextlib.contextmanager
def lock(path_or_dir, timeout=None):
    sd = state_dir(path_or_dir)
    lf = os.path.join(sd, LOCK_NAME)
    held = getattr(_tls, "held", None)
    if held is None:
        held = _tls.held = {}
    if lf in held:                      # re-entrant
        held[lf][1] += 1
        try:
            yield
        finally:
            held[lf][1] -= 1
        return
    os.makedirs(sd, exist_ok=True)
    fd = os.open(lf, os.O_RDWR | os.O_CREAT, 0o644)
    deadline = time.monotonic() + (LOCK_TIMEOUT_S if timeout is None else timeout)
    delay = 0.005
    try:
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError:
                if time.monotonic() >= deadline:
                    raise LockTimeout(f"could not lock {lf} within {LOCK_TIMEOUT_S if timeout is None else timeout}s")
                time.sleep(delay)
                delay = min(delay * 2, 0.1)
        held[lf] = [fd, 1]
        try:
            yield
        finally:
            del held[lf]
            fcntl.flock(fd, fcntl.LOCK_UN)
    finally:
        os.close(fd)


def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            txt = f.read()
    except FileNotFoundError:
        return default
    if not txt.strip():
        return default
    try:
        return json.loads(txt)
    except ValueError as e:
        raise StateCorrupt(f"{path} is not valid JSON ({e}); repair it by hand, writers refuse to overwrite") from e


def _dumps(obj, indent, sort_keys):
    try:
        s = json.dumps(obj, ensure_ascii=False, indent=indent, sort_keys=sort_keys)
        s.encode("utf-8")
    except UnicodeEncodeError:
        s = json.dumps(obj, ensure_ascii=True, indent=indent, sort_keys=sort_keys)
    return s + "\n"


def _replace_atomic(path, text):
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=os.path.basename(path) + ".", suffix=".tmp", dir=d)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        with contextlib.suppress(OSError):
            os.unlink(tmp)
        raise
    dfd = os.open(d, os.O_RDONLY)
    try:
        os.fsync(dfd)
    finally:
        os.close(dfd)


def write_json(path, obj, indent=2, sort_keys=False):
    with lock(path):
        _replace_atomic(path, _dumps(obj, indent, sort_keys))


def update_json(path, fn, default=None, indent=2, sort_keys=False):
    """Locked read-modify-write. `default` (a value or a zero-arg callable) is used when the file is missing."""
    with lock(path):
        cur = read_json(path, None)
        if cur is None:
            cur = default() if callable(default) else default
        new = fn(cur)
        if new is None:
            new = cur
        _replace_atomic(path, _dumps(new, indent, sort_keys))
        return new


def in_state(path, root_state):
    p = os.path.abspath(path)
    return p.startswith(os.path.abspath(root_state) + os.sep)
