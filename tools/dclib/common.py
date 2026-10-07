"""Shared helpers: repo paths, hashing, atomic JSON IO, system probes. Stdlib only."""
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys

ROOT = os.environ.get("DC_REPO_ROOT") or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATE = os.path.join(ROOT, "harness", "state")
GATE_IDS = ["G0", "G1", "G2", "G3", "G4", "G5", "G6a", "G6b", "G7", "G8", "G9a", "G9b", "G10a", "G10"]
CHUNK = 8 * 1024 * 1024


def p(*parts):
    """Repo-relative path -> absolute."""
    return os.path.join(ROOT, *parts)


def rel(path):
    return os.path.relpath(path, ROOT)


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def dumps(obj, **kw):
    """JSON text. Falls back to ASCII escaping if the data holds lone surrogates (odd filenames)."""
    try:
        s = json.dumps(obj, ensure_ascii=False, **kw)
        s.encode("utf-8")
        return s
    except UnicodeEncodeError:
        return json.dumps(obj, ensure_ascii=True, **kw)


def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write_json(path, obj, indent=2):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(dumps(obj, indent=indent, sort_keys=False) + "\n")
    os.replace(tmp, path)


def write_jsonl(path, records):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        for r in records:
            f.write(dumps(r) + "\n")
    os.replace(tmp, path)


def read_jsonl(path):
    out = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def append_jsonl(path, record):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(dumps(record) + "\n")


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(CHUNK)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def sha1_sha256_file(path):
    a, b = hashlib.sha1(), hashlib.sha256()
    n = 0
    with open(path, "rb") as f:
        while True:
            buf = f.read(CHUNK)
            if not buf:
                break
            a.update(buf)
            b.update(buf)
            n += len(buf)
    return a.hexdigest(), b.hexdigest(), n


def sha256_text(s):
    return hashlib.sha256(s.encode("utf-8", "surrogateescape")).hexdigest()


def read_tsv(path):
    import csv
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def mem_available_gb():
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemAvailable:"):
                    return int(line.split()[1]) / 1024 / 1024
    except OSError:
        pass
    return None


def disk_free_gb(path=None):
    try:
        return shutil.disk_usage(path or ROOT).free / 1024 ** 3
    except OSError:
        return None


def nproc():
    return os.cpu_count() or 1


def tool_versions(*names):
    """Best-effort version strings for tools used by a command."""
    out = {"python": sys.version.split()[0]}
    for n in names:
        exe = shutil.which(n)
        if not exe:
            out[n] = None
            continue
        try:
            r = subprocess.run([exe, "-version" if n in ("ffmpeg", "ffprobe") else "--version"],
                               capture_output=True, text=True, timeout=10)
            out[n] = (r.stdout or r.stderr).splitlines()[0][:120] if (r.stdout or r.stderr) else "?"
        except Exception:  # noqa: BLE001
            out[n] = "?"
    return out


def fail(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)
