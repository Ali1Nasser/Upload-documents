"""dc deliver (P14 owns the film ladder/encode/upload; `fyi` exists from P5 for the FYI checkpoints in CLAUDE.md).

`dc deliver fyi <file>`  upload ONE FYI deliverable (under data/delivery/) to temp.sh (fallback x0.at), re-download it,
                         verify SHA-256 and byte count, and record {url, sha256, bytes, host, uploaded, expires, verified}
                         in harness/state/fyi.json. Commands follow docs/plan/06 section 5.4 (retries 2/4/8/16 s on network
                         errors only). Uploads go nowhere else (CLAUDE.md rule 9).
"""
import datetime as DT
import hashlib
import os
import subprocess
import time

from . import common as C

FYI_STATE = C.p("harness", "state", "fyi.json")
CHECK_DIR = C.p("data", "delivery_check", "fyi")
DELIVERY_ROOT = C.p("data", "delivery")
TEMPSH_MAX, X0_MAX = 3_800_000_000, 996_147_200
RETRY = (2, 4, 8, 16)


def _sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def _curl(argv):
    """curl with retries on network errors only (exit codes 5-7, 18, 28, 35, 52, 55, 56). Returns (rc, stdout, stderr)."""
    net = {5, 6, 7, 18, 28, 35, 52, 55, 56}
    for k, wait in enumerate((0,) + RETRY):
        if wait:
            time.sleep(wait)  # bounded network back-off inside one command, not queue polling
        r = subprocess.run(["curl", "-sS", "--fail", "--max-time", "600", *argv], capture_output=True, text=True)
        if r.returncode == 0 or r.returncode not in net:
            return r.returncode, r.stdout.strip(), r.stderr.strip()
    return r.returncode, r.stdout.strip(), r.stderr.strip()


def _expires(host, nbytes, now):
    if host == "temp.sh":
        days = 3.0
    else:  # x0.at: 3 + 97 * (1 - size/1024 MiB)^2 days (docs/plan/06 section 5.2)
        days = 3 + 97 * (1 - nbytes / (1024 * 1024 * 1024)) ** 2
    return (now + DT.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ"), round(days, 2)


def _upload(host, path):
    if host == "temp.sh":
        rc, out, err = _curl(["-F", f"file=@{path}", "https://temp.sh/upload"])
    else:
        rc, out, err = _curl(["-F", f"file=@{path}", "-F", "keep_name=1", "-F", "id_length=12", "https://x0.at/"])
    if rc != 0 or not out.startswith("https://"):
        return None, f"upload rc {rc}: {(err or out)[:200]}"
    return out.split()[0], ""


def _download(host, url, dst):
    if host == "temp.sh":   # temp.sh serves the file on POST to the page URL
        rc, _, err = _curl(["-X", "POST", url, "-o", dst])
    else:
        rc, _, err = _curl(["-L", url, "-o", dst])
    return rc == 0, err[:200]


def cmd_fyi(args):
    path = os.path.realpath(C.p(args.file) if not os.path.isabs(args.file) else args.file)
    if not path.startswith(os.path.realpath(DELIVERY_ROOT) + os.sep) or not os.path.isfile(path):
        C.fail(f"fyi: {args.file} must be an existing file under data/delivery/ (deliverables only)", 2)
    nbytes, sha = os.path.getsize(path), _sha(path)
    hosts = [h for h in (args.host, "x0.at" if args.host == "temp.sh" else "temp.sh")]
    os.makedirs(CHECK_DIR, exist_ok=True)
    tries, entry = [], None
    for host in hosts:
        if nbytes > (TEMPSH_MAX if host == "temp.sh" else X0_MAX):
            tries.append({"host": host, "error": "file over host cap"})
            continue
        now = DT.datetime.now(DT.timezone.utc)
        url, err = _upload(host, path)
        if not url:
            tries.append({"host": host, "error": err})
            continue
        dst = os.path.join(CHECK_DIR, f"{host}_{os.path.basename(path)}")
        ok, err = _download(host, url, dst)
        got_sha = _sha(dst) if ok and os.path.exists(dst) else None
        got_bytes = os.path.getsize(dst) if ok and os.path.exists(dst) else 0
        if os.path.exists(dst):
            os.remove(dst)
        verified = got_sha == sha and got_bytes == nbytes
        if not verified:
            tries.append({"host": host, "url": url, "error": err or f"checksum mismatch ({got_bytes} B, {got_sha})"})
            continue
        exp, days = _expires(host, nbytes, now)
        entry = {"label": args.label or os.path.basename(path), "file": C.rel(path), "host": host, "url": url, "sha256": sha,
                 "bytes": nbytes, "uploaded": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "expires": exp, "retention_days": days,
                 "verified": True, "verify": "re-downloaded " + ("(POST to page URL)" if host == "temp.sh" else "(GET)") +
                 ", SHA-256 and byte count equal"}
        if host == "temp.sh":
            entry["note"] = "temp.sh opens a page; press Download (the file is served on POST)"
        break
    st = C.read_json(FYI_STATE, None) or {"v": 1, "items": []}
    if entry:
        st["items"].append(entry)
    else:
        st.setdefault("failures", []).append({"file": C.rel(path), "sha256": sha, "at": C.now_iso(), "tries": tries})
    st["updated"] = C.now_iso()
    C.write_json(FYI_STATE, st)
    if not entry:
        C.fail(f"fyi upload failed on every host: {tries}", 4)
    if tries:
        entry["fallback_from"] = tries
    import json
    print(json.dumps(entry, ensure_ascii=False))
    return 0


def register(sub):
    d = sub.add_parser("deliver", help="FYI uploads now; ladder/encode/upload/verify/note in P14").add_subparsers(dest="deliver_cmd", required=True)
    s = d.add_parser("fyi", help="upload one FYI file under data/delivery/ to temp.sh (fallback x0.at), re-download, verify, record")
    s.add_argument("file")
    s.add_argument("--host", choices=("temp.sh", "x0.at"), default="temp.sh")
    s.add_argument("--label", default="")
    s.set_defaults(fn="deliver.cmd_fyi")
    for name in ("ladder", "encode", "upload", "verify", "note"):
        s = d.add_parser(name, help="not implemented yet (P14)")
        s.add_argument("rest", nargs="*")
        s.set_defaults(fn="planned", planned_group=f"deliver {name}", planned_phase="P14")
