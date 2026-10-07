#!/usr/bin/env python3
"""PreToolUse(Bash) guard. Reads the hook JSON from stdin.

Exit 2 + reason on stderr ONLY for clear violations:
  1. reading / printing / copying anything under data/quarantine or any path containing id_ed25519, known_hosts, .ssh/
  2. uploads (curl -F/-T/--upload-file/--data-binary @f/-d @f, wget --post-file) to hosts other than x0.at / temp.sh
  3. rm -r / rm -rf outside data/, logs/, reports/, studio/out, node_modules, /tmp (incl. the scratchpad);
     regenerable caches (.venv, __pycache__, ~/.cache/*, ~/.npm/*) are also allowed
     (also: any rm touching data/raw, the irreplaceable source archives)
  4. git add of data/, media, model files, archives, secrets
Everything else (including all parse/internal errors) exits 0: the guard fails OPEN.
Downloads (curl GET, curl -X POST to temp.sh without a file) are allowed.
"""
import json
import os
import re
import shlex
import sys

ROOT = os.environ.get("DC_REPO_ROOT") or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ALLOWED_UPLOAD_HOSTS = ("x0.at", "temp.sh")

READERS = set("""cat tac head tail less more nl od xxd hexdump strings base64 cp mv scp rsync tar zip unzip 7z 7za 7zr
gzip gunzip bzip2 xz zcat bzcat xzcat openssl ssh ssh-keygen ssh-add sftp gpg cut sort uniq tee diff cmp bat view vim vi
nano emacs source . dd install paste fold column rev""".split())
PATTERN_FIRST = set("grep egrep fgrep rg ag sed awk gawk mawk jq".split())  # first non-option arg is a pattern/script
INTERPRETERS = set("python python3 python3.12 python3.13 node nodejs perl ruby php bash sh zsh dash lua Rscript".split())
QUAR_SAFE = set("ls du stat rm rmdir mkdir test [ echo printf touch chmod chown df cd pwd tsp git true false".split())
WRAPPERS = {"sudo": {"-u", "-g", "-h", "-p", "-C", "-D", "-R", "-T"}, "env": {"-u", "-C", "-S"}, "nohup": set(),
            "time": {"-f", "-o"}, "command": set(), "exec": set(), "nice": {"-n"}, "ionice": {"-c", "-n", "-p"},
            "timeout": {"-s", "-k"}, "tsp": {"-L", "-S", "-w", "-c", "-i", "-D", "-u", "-k", "-s", "-r", "-U", "-m"},
            "ts": {"-L", "-S", "-w", "-c", "-i", "-D", "-u", "-k", "-s", "-r", "-U"}, "stdbuf": {"-i", "-o", "-e"},
            "setsid": set(), "unbuffer": set()}

MEDIA_EXT = set("mp4 mov mkv webm avi m4v wav m4a mp3 flac ogg opus aac aiff zip tar gz tgz xz bz2 7z rar whl".split())
MODEL_EXT = set("pt pth ckpt safetensors onnx gguf ggml h5 npy npz pkl joblib tflite pb engine".split())

SENS_NAME = re.compile(r"(id_ed25519|known_hosts)[^/]*$")
SENS_SSH_DIR = re.compile(r"(^|/)\.ssh(/|$)")
QUAR_DIR = re.compile(r"(^|/)data/quarantine(/|$)")
HOST_RX = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}(:\d+)?(/\S*)?$")
SCHEME_RX = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*://")
CURL_ARG_FLAGS = set("""-o -T -F -d -H -X -u -A -e -b -c -w -m -x -E -K -r -C -y -Y -z -D -P -Q -U -t
--output --header --request --data --data-raw --data-binary --data-urlencode --data-ascii --form --form-string --upload-file
--user --proxy --max-time --retry --retry-delay --retry-max-time --connect-timeout --cacert --capath --cert --key --user-agent
--referer --cookie --cookie-jar --write-out --limit-rate --resolve --json --range --continue-at --output-dir --config""".split())
WGET_ARG_FLAGS = set("-O -o -a -e -t -T -w -P -U -i -B --output-document --output-file --post-data --post-file --body-file --header "
                     "--user-agent --tries --timeout --wait --directory-prefix --input-file --proxy-user --user --password".split())


class Block(Exception):
    pass


# --------------------------------------------------------------------------- tokenising
def strip_heredocs(cmd):
    out, term = [], None
    for line in cmd.split("\n"):
        if term is not None:
            if line.strip() == term:
                term = None
            continue
        out.append(line)
        m = re.search(r"<<-?\s*(['\"]?)([A-Za-z_][\w]*)\1", line)
        if m:
            term = m.group(2)
    return "\n".join(out)


def newlines_to_semicolons(cmd):
    out, q, esc = [], None, False
    for ch in cmd:
        if esc:
            esc = False
            out.append(ch)
            continue
        if ch == "\\" and q != "'":
            esc = True
            out.append(ch)
            continue
        if q:
            if ch == q:
                q = None
            out.append(ch)
            continue
        if ch in "'\"":
            q = ch
        if ch == "\n":
            out.append(" ; ")
        else:
            out.append(ch)
    return "".join(out)


def split_segments(cmd):
    """Return a list of argv lists (one per simple command). Redirect targets of >/>> are dropped."""
    cmd = strip_heredocs(cmd.replace("\\\n", " "))
    cmd = newlines_to_semicolons(cmd)
    lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
    lex.whitespace_split = True
    lex.commenters = ""
    toks = list(lex)
    segs, cur, skip_next = [], [], False
    for t in toks:
        if skip_next:
            skip_next = False
            continue
        if re.fullmatch(r"[;&|()]+", t):
            if cur:
                segs.append(cur)
            cur = []
        elif re.fullmatch(r"[<>&|]+", t) and ("<" in t or ">" in t):
            if ">" in t:  # output redirect: the target is not an argument
                skip_next = True
                if cur and re.fullmatch(r"\d{1,2}", cur[-1]):
                    cur.pop()
            # '<' input redirect: keep the following filename as an argument (it IS read)
        else:
            cur.append(t)
    if cur:
        segs.append(cur)
    return segs


def unwrap(argv):
    """Strip wrapper programs / VAR=x prefixes. Returns the real argv (may be empty)."""
    i = 0
    while i < len(argv):
        t = argv[i]
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", t):
            i += 1
            continue
        base = os.path.basename(t)
        if base in WRAPPERS:
            argflags = WRAPPERS[base]
            i += 1
            while i < len(argv) and (argv[i].startswith("-") or (base in ("timeout", "nice") and re.fullmatch(r"[\d.]+[smhd]?", argv[i]))
                                     or (base == "env" and re.fullmatch(r"[A-Za-z_]\w*=.*", argv[i]))):
                i += 2 if argv[i] in argflags else 1
            continue
        break
    return argv[i:]


# --------------------------------------------------------------------------- helpers
def _abs(path, cwd):
    path = os.path.expanduser(path)
    return os.path.normpath(path if os.path.isabs(path) else os.path.join(cwd, path))


def _rel_to_root(path, cwd):
    a = _abs(path, cwd)
    try:
        r = os.path.relpath(a, ROOT)
    except ValueError:
        return None
    return None if r.startswith("..") else r


def sensitive_path(tok):
    """Why this token is a protected path, or None."""
    if QUAR_DIR.search(tok):
        return "data/quarantine"
    if SENS_NAME.search(tok) and "|" not in tok:
        return "id_ed25519/known_hosts"
    if SENS_SSH_DIR.search(tok):
        return ".ssh directory"
    return None


def args_of(argv):
    return argv[1:]


def non_option(args):
    return [a for a in args if not a.startswith("-") or a == "-"]


# --------------------------------------------------------------------------- checks
def check_secret_read(prog, argv, cwd):
    args = args_of(argv)
    if prog == "cd":
        for a in args:
            if QUAR_DIR.search(a.rstrip("/") + "/") or a.rstrip("/").endswith("data/quarantine"):
                raise Block("Blocked: entering data/quarantine. Quarantined files (SSH keys, known_hosts) are never read, listed by content, "
                            "copied or uploaded (CLAUDE.md rule 8). Use `python3 tools/dc.py ingest quarantine` to see names only.")
        return
    why = None
    if prog in PATTERN_FIRST:
        seen_pattern, skip = False, False
        for a in args:
            if skip:  # argument of -e/-f (a pattern or pattern file name)
                skip = False
                continue
            if a in ("-e", "--regexp", "-f", "--file"):
                seen_pattern, skip = True, True
                continue
            if a.startswith("-"):
                continue
            if not seen_pattern:
                seen_pattern = True
                continue
            why = why or sensitive_path(a)
    elif prog in READERS:
        for a in args:
            if not a.startswith("-") or "/" in a:
                why = why or sensitive_path(a)
    elif prog in INTERPRETERS or prog == "eval":
        for a in args:
            m = re.search(r"(/|~|\.ssh-?)\S*?(id_ed25519|known_hosts)|(^|/)\.ssh/|data/quarantine", a)
            if m:
                why = "protected path in interpreter arguments"
                break
    elif prog not in QUAR_SAFE:
        for a in args:
            if QUAR_DIR.search(a):
                why = "data/quarantine"
                break
    if why:
        raise Block(f"Blocked: this command would read/print/copy a protected path ({why}). Quarantined material "
                    "(data/quarantine, *id_ed25519*, known_hosts, .ssh/*) is never read, printed, copied, indexed or uploaded "
                    "(CLAUDE.md rule 8). Work from corpus/catalog/quarantine.json (names only).")


def _hosts_in(tokens, argflags, proxy_flags):
    hosts, prev = [], ""
    for t in tokens:
        cand = None
        if prev in proxy_flags:
            prev = t
            continue
        if SCHEME_RX.match(t):
            m = re.match(r"^[A-Za-z][A-Za-z0-9+.-]*://(?:[^/@]*@)?([^/:?#]+)", t)
            cand = m.group(1) if m else None
        elif not t.startswith("-") and prev not in argflags and HOST_RX.match(t) and "@" not in t and "=" not in t:
            cand = re.split(r"[:/]", t)[0]
        if cand and "$" not in cand and "`" not in cand:
            hosts.append(cand.lower())
        prev = t
    return hosts


def check_upload(prog, argv):
    args = args_of(argv)
    upload = False
    if prog == "curl":
        prev = ""
        for a in args:
            if a in ("-F", "--form", "--form-string", "-T", "--upload-file"):
                upload = True
            elif a.startswith("--form=") or a.startswith("--upload-file="):
                upload = True
            elif prev in ("--data-binary", "-d", "--data", "--data-urlencode", "--json", "--data-ascii") and (
                    a.startswith("@") or ("=@" in a and prev == "--data-urlencode")):
                upload = True
            elif re.match(r"^-d@|^--data-binary@", a):
                upload = True
            elif re.fullmatch(r"-[A-Za-z]+", a) and any(c in "FT" for c in a[1:]):
                upload = True
            prev = a
        flags, proxy = CURL_ARG_FLAGS, {"-x", "--proxy", "--noproxy", "--proxy-user", "-U"}
    else:  # wget
        for a in args:
            if a.startswith("--post-file") or a.startswith("--body-file"):
                upload = True
        flags, proxy = WGET_ARG_FLAGS, set()
    if not upload:
        return
    bad = [h for h in _hosts_in(args, flags, proxy)
           if not any(h == ok for ok in ALLOWED_UPLOAD_HOSTS)]
    if bad:
        raise Block(f"Blocked: file upload to {', '.join(sorted(set(bad)))}. Uploads are allowed only to x0.at and temp.sh, only for "
                    "deliverables or the user-approved corpus cache (CLAUDE.md rule 9). Downloads and other requests are not affected.")


def check_rm(argv, cwd):
    args, targets, recursive, end_opts = args_of(argv), [], False, False
    for a in args:
        if not end_opts and a == "--":
            end_opts = True
        elif not end_opts and a.startswith("--"):
            recursive |= a == "--recursive"
        elif not end_opts and a.startswith("-") and len(a) > 1:
            recursive |= any(c in "rR" for c in a[1:])
        else:
            targets.append(a)
    tmp_dirs = {"/tmp", "/var/tmp", os.path.realpath("/tmp")}
    if os.environ.get("TMPDIR"):
        tmp_dirs.add(os.path.realpath(os.environ["TMPDIR"]))
    for t in targets:
        if "$" in t or "`" in t:
            continue  # unexpanded variable/substitution: cannot judge, fail open
        a = _abs(t, cwd)
        r = _rel_to_root(t, cwd)
        if r is not None and (r == "data/raw" or r.startswith("data/raw/")):
            raise Block("Blocked: removing data/raw. The six source archives are irreplaceable (the download links expire "
                        "2026-10-10); deletion needs a passing gate and an explicit Executive Producer line (two-key rule).")
        if not recursive:
            continue
        comps = a.split("/")
        if any(a == d or a.startswith(d.rstrip("/") + "/") for d in tmp_dirs):
            continue
        if "node_modules" in comps or "__pycache__" in comps or ".pytest_cache" in comps:
            continue
        home = os.path.expanduser("~")  # package-manager caches are regenerable and needed to free disk
        if any(a.startswith(os.path.join(home, c) + "/") for c in (".cache", ".npm")):
            continue
        if r is not None:
            top = r.split("/")
            if top[0] in ("data", "logs", "reports") and r != ".":
                continue
            if r == ".venv" or r.startswith(".venv/") or r == "studio/out" or r.startswith("studio/out/"):
                continue
        raise Block(f"Blocked: recursive rm of {t!r} (resolves to {a}). rm -r / rm -rf is allowed only inside data/, logs/, reports/, "
                    "studio/out, node_modules, .venv, __pycache__ or /tmp. Use a narrower path, or ask the user.")


def check_git(argv, cwd):
    args = args_of(argv)
    i, sub = 0, None
    while i < len(args):
        a = args[i]
        if a in ("-C",) and i + 1 < len(args):
            cwd = _abs(args[i + 1], cwd)
            i += 2
        elif a in ("-c", "--git-dir", "--work-tree", "--namespace") and i + 1 < len(args):
            i += 2
        elif a.startswith("-"):
            i += 1
        else:
            sub = a
            break
    if sub != "add":
        return
    rest = args[i + 1:]
    force = any(a in ("-f", "--force") or (re.fullmatch(r"-[A-Za-z]+", a) and "f" in a[1:]) for a in rest if a != "--")
    paths = [a for a in rest if not a.startswith("-") or a == "--"]
    paths = [a for a in paths if a != "--"]
    bad = None
    for pth in paths:
        r = _rel_to_root(pth, cwd)
        base = os.path.basename(pth.rstrip("/"))
        ext = base.rsplit(".", 1)[-1].lower() if "." in base else ""
        comps = (r or pth).split("/")
        if r is not None and (r == "data" or r.startswith("data/")):
            bad = f"{pth} (data/ is large and git-ignored)"
        elif "data" == comps[0] and r is None:
            bad = f"{pth} (data/)"
        elif ext in MEDIA_EXT:
            bad = f"{pth} (media/archive file .{ext})"
        elif ext in MODEL_EXT or "models" in comps[:-1] or base in ("models", "model"):
            bad = f"{pth} (model/weights)"
        elif "node_modules" in comps or (r is not None and (r == "studio/out" or r.startswith("studio/out/"))):
            bad = f"{pth} (build output)"
        elif sensitive_path(pth) or QUAR_DIR.search(pth):
            bad = f"{pth} (secret material)"
        if bad:
            break
    if not bad and force and any(p_ in (".", "..", "*", ":/") or p_.endswith("/") for p_ in paths):
        bad = "git add -f of a whole directory/tree bypasses .gitignore (data/, media, models)"
    if bad:
        raise Block(f"Blocked: git add of {bad}. Never commit data/, media, models, archives or secrets (CLAUDE.md rule 6). "
                    "Commit only small artifacts (corpus/, reports/, harness/, tools/, docs/). Add files by explicit small paths.")


# --------------------------------------------------------------------------- driver
def analyse(command, cwd, depth=0):
    if depth > 3:
        return
    for seg in split_segments(command):
        argv = unwrap(seg)
        if not argv:
            continue
        prog = os.path.basename(argv[0])
        args = argv[1:]
        if prog in ("bash", "sh", "zsh", "dash"):
            for k, a in enumerate(args):
                if re.fullmatch(r"-[A-Za-z]*c[A-Za-z]*", a) and k + 1 < len(args):
                    analyse(args[k + 1], cwd, depth + 1)
                    break
        elif prog == "eval":
            analyse(" ".join(args), cwd, depth + 1)
        if prog == "rm":
            check_rm(argv, cwd)
        elif prog == "git":
            check_git(argv, cwd)
        elif prog in ("curl", "wget"):
            check_upload(prog, argv)
        check_secret_read(prog, argv, cwd)


def main():
    try:
        data = json.load(sys.stdin)
        if data.get("tool_name") not in (None, "Bash"):
            return 0
        command = (data.get("tool_input") or {}).get("command")
        if not isinstance(command, str) or not command.strip():
            return 0
        cwd = data.get("cwd") or os.getcwd()
        analyse(command, cwd)
        return 0
    except Block as b:
        print(str(b), file=sys.stderr)
        return 2
    except Exception:  # noqa: BLE001  fail open on ANY internal/parse error
        return 0


if __name__ == "__main__":
    sys.exit(main())
