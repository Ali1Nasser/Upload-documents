"""dc ingest verify|catalog|probe|quarantine|lineage (P1). Reads extracted files, never executes them.

Content-addressed: each command records input hashes in a manifest and skips when unchanged (--force overrides).
`catalog`/`probe`/`verify` are heavy and route through tsp unless --inline, --limit, or already inside the queue.
"""
import collections
import concurrent.futures as cf
import difflib
import json
import os
import re
import subprocess
import sys
import time

from . import common as C
from . import manifest as M
from . import queue as Q

INV = C.p("docs", "plan", "inventory")
RAW = C.p("data", "raw")
EXTRACTED = C.p("data", "extracted")
CAT_DIR = C.p("corpus", "catalog")
SMOKE_DIR = C.p("data", "derived", "smoke", "catalog")

EXT_CAT = {}
for cat, exts in {
    "audio": "m4a mp3 wav flac ogg opus aac", "video": "mp4 mov mkv webm avi",
    "image": "jpg jpeg png gif webp bmp svg", "text": "txt", "doc": "md", "html": "html htm",
    "code": "py sh js ts tsx jsx css", "data": "csv json ffmeta tsv yaml yml jsonl",
    "subtitle": "srt vtt ass ssa", "font": "ttf otf woff woff2", "log": "log", "wheel": "whl",
}.items():
    for e in exts.split():
        EXT_CAT[e] = cat

QUARANTINE_RX = re.compile(r"(^|/)\.ssh(/|$)|id_ed25519|known_hosts|\.sudo_as_admin_successful")


def category(path):
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    return EXT_CAT.get(ext, "other")


def archive_chain(relpath):
    parts = relpath.split("/")
    return [x[:-2] for x in parts[:-1] if x.endswith(".d")]


def out_dir(limit):
    return SMOKE_DIR if limit else CAT_DIR


def _self_argv(args):
    return [C.p("tools", "dc.py"), "ingest", args.ingest_cmd] + sys.argv[3:]


def _heavy(args, label, mem_gb=1.0):
    if getattr(args, "limit", None):
        return None
    return Q.run_heavy(label, _self_argv(args), args.inline, mem_gb)


# ------------------------------------------------------------------ verify
def stat_sig(path):
    st = os.stat(path)
    return f"{st.st_size}:{st.st_mtime_ns}"


def cmd_verify(args):
    rc = _heavy(args, "ingest-verify")
    if rc is not None:
        return rc
    rows = C.read_tsv(os.path.join(INV, "archives.tsv"))
    prev = C.read_json(os.path.join(CAT_DIR, "archives_verify.json"), {}) or {}
    prev_by = {a["archive"]: a for a in prev.get("archives", [])}

    def one(r):
        path = os.path.join(RAW, r["archive"])
        rec = {"archive": r["archive"], "expected_sha256": r["sha256"], "bytes_expected": int(r["bytes"])}
        if not os.path.isfile(path):
            return {**rec, "present": False, "actual_sha256": None, "bytes_actual": None, "match": False, "stat": None}
        sig = stat_sig(path)
        old = prev_by.get(r["archive"])
        if old and old.get("stat") == sig and old.get("actual_sha256") and not args.force:
            return {**rec, **{k: old[k] for k in ("present", "actual_sha256", "bytes_actual", "stat")},
                    "match": old["actual_sha256"] == r["sha256"] and old["bytes_actual"] == rec["bytes_expected"]}
        h = C.sha256_file(path)
        size = os.path.getsize(path)
        return {**rec, "present": True, "actual_sha256": h, "bytes_actual": size, "stat": sig,
                "match": h == r["sha256"] and size == rec["bytes_expected"]}

    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        res = list(ex.map(one, rows))
    doc = {"v": 1, "created": C.now_iso(), "archives": res, "all_match": all(a["match"] for a in res),
           "matched": sum(a["match"] for a in res), "total": len(res)}
    C.write_json(os.path.join(CAT_DIR, "archives_verify.json"), doc)
    inputs = [{"path": "docs/plan/inventory/archives.tsv", "sha256": C.sha256_file(os.path.join(INV, "archives.tsv"))}] + \
             [{"path": f"data/raw/{a['archive']}", "sha256": a["actual_sha256"] or ""} for a in res]
    M.write(CAT_DIR, "verify", "dc ingest verify", inputs, ["corpus/catalog/archives_verify.json"])
    for a in res:
        print(f"  {'OK ' if a['match'] else 'BAD'} {a['archive']}  {a['bytes_actual']} B")
    print(f"verify: {doc['matched']}/{doc['total']} archives match inventory SHA-256")
    return 0 if doc["all_match"] else 1


# ------------------------------------------------------------------ catalog
def walk_files(limit=None):
    out = []
    for dp, dn, fn in os.walk(EXTRACTED, followlinks=False):
        dn.sort()
        for f in sorted(fn):
            full = os.path.join(dp, f)
            if os.path.islink(full) or not os.path.isfile(full):
                continue
            out.append(os.path.relpath(full, EXTRACTED))
    out.sort()
    return out[:limit] if limit else out


def tree_fingerprint(relpaths):
    parts = []
    for r in relpaths:
        st = os.stat(os.path.join(EXTRACTED, r))
        parts.append(f"{r}\t{st.st_size}\t{st.st_mtime_ns}")
    return C.sha256_text("\n".join(parts))


def cmd_catalog(args):
    rc = _heavy(args, "ingest-catalog")
    if rc is not None:
        return rc
    t0 = time.time()
    od = out_dir(args.limit)
    rels = walk_files(args.limit)
    fp = tree_fingerprint(rels)
    inputs = [{"path": "data/extracted (tree: path+size+mtime)", "sha256": fp}]
    outs = [C.rel(os.path.join(od, "files.jsonl"))]
    if M.should_skip(od, "catalog", inputs, outs, args.force):
        print(f"catalog: inputs unchanged ({len(rels)} files), skipped (use --force to redo)")
        if not args.limit:  # the reconcile report is cheap; refresh it (explanations may have changed)
            reconcile_report(C.read_jsonl(os.path.join(od, "files.jsonl")), len(rels))
        return 0

    def hash_one(r):
        s1, s2, n = C.sha1_sha256_file(os.path.join(EXTRACTED, r))
        return r, s1, s2, n

    by_sha1 = collections.defaultdict(list)
    sha256 = {}
    sizes = {}
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for i, (r, s1, s2, n) in enumerate(ex.map(hash_one, rels), 1):
            by_sha1[s1].append(r)
            sha256[s1] = s2
            sizes[s1] = n
            if i % 1000 == 0:
                print(f"  hashed {i}/{len(rels)}", file=sys.stderr)
    # prior decode results survive a re-catalog
    old_decode = {}
    oldp = os.path.join(od, "files.jsonl")
    if os.path.exists(oldp):
        for r in C.read_jsonl(oldp):
            old_decode[r["file_id"]] = r.get("decode_ok")
    recs = []
    for s1, paths in by_sha1.items():
        paths = sorted(paths, key=lambda x: (len(x), x))  # canonical = shortest, then lexicographic
        canon = paths[0]
        recs.append({"v": 1, "file_id": f"f:{s1[:12]}", "sha1": s1, "sha256": sha256[s1], "bytes": sizes[s1],
                     "category": category(canon), "paths": paths, "canonical": canon,
                     "archive_chain": archive_chain(canon), "decode_ok": old_decode.get(f"f:{s1[:12]}"), "notes": ""})
    recs.sort(key=lambda r: r["canonical"])
    ids = collections.Counter(r["file_id"] for r in recs)
    clash = [k for k, v in ids.items() if v > 1]
    if clash:  # sha1-12 prefix collision between different contents: disambiguate loudly
        print(f"WARNING: file_id prefix collision {clash}", file=sys.stderr)
    C.write_jsonl(os.path.join(od, "files.jsonl"), recs)
    M.write(od, "catalog", "dc ingest catalog" + (f" --limit {args.limit}" if args.limit else ""), inputs, outs,
            extra={"files": len(rels), "unique": len(recs), "seconds": round(time.time() - t0, 1)})
    cats = collections.Counter(r["category"] for r in recs)
    print(f"catalog: {len(rels)} files -> {len(recs)} unique in {time.time() - t0:.1f}s  {dict(cats)}")
    if not args.limit:
        reconcile_report(recs, len(rels))
    return 0


def reconcile_report(recs, nfiles):
    exp_rows = C.read_tsv(os.path.join(INV, "unique_files.tsv"))
    exp = {r["sha1"]: r for r in exp_rows}
    got = {r["sha1"]: r for r in recs}
    missing = sorted(set(exp) - set(got))          # in recon, absent on disk
    extra = sorted(set(got) - set(exp))            # on disk, not in recon
    copies_diff, canon_diff, bytes_diff = [], [], []
    for s in set(exp) & set(got):
        if int(exp[s]["copies"]) != len(got[s]["paths"]):
            copies_diff.append((s, exp[s]["copies"], len(got[s]["paths"])))
        if exp[s]["canonical_path"] != got[s]["canonical"]:
            canon_diff.append((s, exp[s]["canonical_path"], got[s]["canonical"]))
        if int(exp[s]["bytes"]) != got[s]["bytes"]:
            bytes_diff.append((s, exp[s]["bytes"], got[s]["bytes"]))
    explained = C.read_json(os.path.join(CAT_DIR, "reconcile_explained.json"), {}) or {}
    ex_ids = set(explained.get("sha1", {}))
    unexplained = [s for s in missing + extra if s not in ex_ids] + \
                  [s for s, *_ in copies_diff + bytes_diff if s not in ex_ids]
    unexplained_canon = [c for c in canon_diff if c[0] not in ex_ids]
    cat_diff = collections.Counter(r["category"] for r in recs)
    exp_cat = collections.Counter(r["category"] for r in exp_rows)
    L = ["# G1 reconcile: catalog vs docs/plan/inventory/unique_files.tsv", "",
         f"Generated {C.now_iso()} by `dc ingest catalog`.", "",
         "| Measure | Inventory | Catalog |", "|---|---|---|",
         f"| unique files (sha1) | {len(exp)} | {len(got)} |",
         f"| total file copies | {sum(int(r['copies']) for r in exp_rows)} | {nfiles} |",
         f"| in inventory, not on disk | {len(missing)} | |", f"| on disk, not in inventory | {len(extra)} | |",
         f"| copy-count differences | {len(copies_diff)} | |", f"| byte-size differences | {len(bytes_diff)} | |",
         f"| canonical-path differences | {len(canon_diff)} | |",
         f"| unexplained (excl. canonical) | {len(unexplained)} | |",
         f"| unexplained canonical-path differences | {len(unexplained_canon)} | |", "", "## Category counts", "",
         "| category | inventory | catalog |", "|---|---|---|"]
    for c in sorted(set(cat_diff) | set(exp_cat)):
        L.append(f"| {c} | {exp_cat.get(c, 0)} | {cat_diff.get(c, 0)} |")
    for title, rows in (("In inventory but not on disk", [(s, exp[s]["canonical_path"]) for s in missing]),
                        ("On disk but not in inventory", [(s, got[s]["canonical"]) for s in extra]),
                        ("Copy-count differences (sha1, inventory, catalog)", copies_diff),
                        ("Canonical-path differences (sha1, inventory, catalog)", canon_diff[:50])):
        L += ["", f"## {title}", ""] + ([f"- `{r}`" for r in rows[:100]] or ["none"])
    L += ["", "## Explanations on record", ""]
    L += [f"- `{s}`: {why}" for s, why in explained.get("sha1", {}).items()] or ["none (add `corpus/catalog/reconcile_explained.json` {\"sha1\": {<sha1>: <reason>}})"]
    L += ["", f"**Result:** {'RECONCILED' if not unexplained and not unexplained_canon else 'UNEXPLAINED DIFFERENCES: ' + str(len(unexplained) + len(unexplained_canon))}"
          f"; unique count {len(got)} vs expected {len(exp)}.", ""]
    with open(C.p("reports", "gates", "G1_reconcile.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    C.write_json(os.path.join(CAT_DIR, "reconcile.json"), {
        "v": 1, "created": C.now_iso(), "expected_unique": len(exp), "catalog_unique": len(got),
        "expected_copies": sum(int(r["copies"]) for r in exp_rows), "catalog_files": nfiles,
        "missing": len(missing), "extra": len(extra), "copies_diff": len(copies_diff), "bytes_diff": len(bytes_diff),
        "canonical_diff": len(canon_diff), "canonical_unexplained": len(unexplained_canon),
        "unexplained": len(unexplained)})
    print(f"reconcile: {len(got)} unique vs {len(exp)} expected; unexplained {len(unexplained)} -> reports/gates/G1_reconcile.md")


# ------------------------------------------------------------------ probe
def _probe_one(rec, timeout):
    path = os.path.join(EXTRACTED, rec["canonical"])
    out = {"v": 1, "file_id": rec["file_id"], "path": rec["canonical"], "kind": rec["category"],
           "duration_s": None, "format": None, "bit_rate": None, "video": None, "audio": None,
           "decode_errors": 0, "decode_ok": False, "probe_ok": False, "notes": ""}
    t0 = time.time()
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", path],
                           capture_output=True, text=True, timeout=120)
        j = json.loads(r.stdout or "{}")
        fmt = j.get("format", {})
        out["format"] = fmt.get("format_name")
        out["duration_s"] = float(fmt["duration"]) if fmt.get("duration") else None
        out["bit_rate"] = int(fmt["bit_rate"]) if fmt.get("bit_rate") else None
        for s in j.get("streams", []):
            if s.get("codec_type") == "video" and not out["video"] and s.get("codec_name") != "mjpeg":
                num, _, den = (s.get("avg_frame_rate") or "0/1").partition("/")
                fps = round(float(num) / float(den), 3) if den and float(den) else 0.0
                out["video"] = {"codec": s.get("codec_name"), "width": s.get("width"), "height": s.get("height"),
                                "fps": fps, "pix_fmt": s.get("pix_fmt")}
            elif s.get("codec_type") == "audio" and not out["audio"]:
                out["audio"] = {"codec": s.get("codec_name"), "sample_rate": int(s.get("sample_rate") or 0),
                                "channels": s.get("channels")}
        out["probe_ok"] = bool(j.get("format"))
        if r.stderr.strip():
            out["notes"] = "ffprobe: " + r.stderr.strip().splitlines()[0][:160]
    except Exception as e:  # noqa: BLE001
        out["notes"] = f"ffprobe failed: {type(e).__name__}"
    try:
        d = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-f", "null", "-"],
                           capture_output=True, text=True, errors="replace", timeout=timeout)
        out["decode_errors"] = sum(1 for ln in d.stderr.splitlines() if ln.strip())
        out["decode_ok"] = out["decode_errors"] == 0 and d.returncode == 0
        if d.returncode != 0:
            out["decode_errors"] = max(out["decode_errors"], 1)
    except subprocess.TimeoutExpired:
        out["decode_errors"] = max(out["decode_errors"], 1)
        out["notes"] = (out["notes"] + " decode timeout").strip()
    out["decode_seconds"] = round(time.time() - t0, 1)
    return out


def cmd_probe(args):
    rc = _heavy(args, "ingest-probe", mem_gb=1.5)
    if rc is not None:
        return rc
    src = os.path.join(CAT_DIR if not args.limit else SMOKE_DIR, "files.jsonl")
    if args.limit and not os.path.exists(src):
        src = os.path.join(CAT_DIR, "files.jsonl")
    if not os.path.exists(src):
        C.fail("no catalog yet: run `dc ingest catalog` first", 2)
    od = out_dir(args.limit)
    media = [r for r in C.read_jsonl(src) if r["category"] in ("audio", "video")]
    if args.limit:
        media = media[:: max(1, len(media) // args.limit)][: args.limit]
    inputs = [{"path": r["canonical"], "sha256": r["sha256"]} for r in media]
    outs = [C.rel(os.path.join(od, "media.jsonl"))]
    if M.should_skip(od, "probe", inputs, outs, args.force):
        print(f"probe: {len(media)} media inputs unchanged, skipped (use --force)")
        return 0
    t0 = time.time()
    done = []
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for i, rec in enumerate(ex.map(lambda r: _probe_one(r, args.timeout), media), 1):
            done.append(rec)
            print(f"  [{i}/{len(media)}] {'ok ' if rec['decode_ok'] else 'ERR'} errors={rec['decode_errors']:<6} "
                  f"{rec['decode_seconds']:>6}s  {os.path.basename(rec['path'])}", file=sys.stderr)
    done.sort(key=lambda r: r["path"])
    C.write_jsonl(os.path.join(od, "media.jsonl"), done)
    by_id = {r["file_id"]: r for r in done}  # write decode_ok back into the catalog
    fpath = os.path.join(od, "files.jsonl")
    if os.path.exists(fpath):
        allrecs = C.read_jsonl(fpath)
        for r in allrecs:
            if r["file_id"] in by_id:
                r["decode_ok"] = by_id[r["file_id"]]["decode_ok"]
        C.write_jsonl(fpath, allrecs)
    M.write(od, "probe", "dc ingest probe" + (f" --limit {args.limit}" if args.limit else ""), inputs, outs,
            tools=C.tool_versions("ffmpeg", "ffprobe"),
            extra={"media": len(done), "corrupt": sum(1 for r in done if not r["decode_ok"]),
                   "seconds": round(time.time() - t0, 1)})
    bad = [r for r in done if not r["decode_ok"]]
    print(f"probe: {len(done)} media files, {len(bad)} flagged decode_ok=false in {time.time() - t0:.0f}s")
    for r in bad:
        print(f"  FLAG {r['path']} errors={r['decode_errors']}")
    return 0


# ------------------------------------------------------------------ quarantine
def cmd_quarantine(args):
    """List sensitive names from the archive inventory (path + reason only) and assert none are on disk."""
    inv = os.path.join(INV, "full_inventory.tsv")
    seen, items = set(), []
    for r in C.read_tsv(inv):
        mem, chain = r["member"], r["chain"]
        m = QUARANTINE_RX.search(mem)
        if not m:
            continue
        key = (chain, mem)
        if key in seen:
            continue
        seen.add(key)
        reason = ("ssh key material" if re.search(r"id_ed25519", mem) else "ssh known_hosts" if "known_hosts" in mem
                  else "sandbox leftover (.sudo_as_admin_successful)" if "sudo_as_admin" in mem else "ssh directory content")
        items.append({"archive_chain": chain, "path": mem, "reason": reason + "; never extracted, read, indexed or uploaded"})
    items.sort(key=lambda i: (i["archive_chain"], i["path"]))
    on_disk = []
    for base in (EXTRACTED, C.p("data", "quarantine"), RAW):
        for dp, dn, fn in os.walk(base):  # names only, contents never opened
            for n in dn + fn:
                full = os.path.join(dp, n)
                if QUARANTINE_RX.search(os.path.relpath(full, C.ROOT)):
                    on_disk.append(os.path.relpath(full, C.ROOT))
    doc = {"v": 1, "created": C.now_iso(), "items": items, "on_disk": len(on_disk),
           "policy": "Skipped at extraction. Recorded by archive path and reason only; contents never read."}
    if on_disk:
        doc["on_disk_paths"] = sorted(on_disk)[:50]
    C.write_json(os.path.join(CAT_DIR, "quarantine.json"), doc)
    M.write(CAT_DIR, "quarantine", "dc ingest quarantine",
            [{"path": "docs/plan/inventory/full_inventory.tsv", "sha256": C.sha256_file(inv)}],
            ["corpus/catalog/quarantine.json"], extra={"items": len(items), "on_disk": len(on_disk)})
    print(f"quarantine: {len(items)} listed names, {len(on_disk)} found on disk (must be 0)")
    for x in on_disk[:10]:
        print(f"  ON DISK: {x}")
    return 0 if not on_disk else 1


# ------------------------------------------------------------------ lineage
RUNTIME_RX = re.compile(r"runtime:?\*{0,2}\s*\*{0,2}\s*(\d{1,3})\s*:\s*(\d{2})", re.I)


def _read_text(rel, limit=None):
    with open(os.path.join(EXTRACTED, rel), encoding="utf-8", errors="replace") as f:
        return f.read(limit) if limit else f.read()


def _headings(text):
    return [ln.strip() for ln in text.splitlines() if re.match(r"^#{1,4} ", ln)]


def cmd_lineage(args):
    fpath = os.path.join(CAT_DIR, "files.jsonl")
    if not os.path.exists(fpath):
        C.fail("no catalog yet: run `dc ingest catalog` first", 2)
    recs = C.read_jsonl(fpath)
    inputs = [{"path": "corpus/catalog/files.jsonl", "sha256": C.sha256_file(fpath)}]
    outs = ["corpus/catalog/lineage.json"]
    if M.should_skip(CAT_DIR, "lineage", inputs, outs, args.force):
        print("lineage: catalog unchanged, skipped (use --force)")
        return 0
    base = lambda r: os.path.basename(r["canonical"])  # noqa: E731

    # 1. master.md versions (runtime line decides the version)
    versions = []
    for r in recs:
        if r["category"] != "doc":
            continue
        txt = _read_text(r["canonical"])
        m = RUNTIME_RX.search(txt[:6000])
        if not m and "master" not in base(r).lower():
            continue
        versions.append({"file_id": r["file_id"], "canonical": r["canonical"], "name": base(r), "copies": len(r["paths"]),
                         "bytes": r["bytes"], "runtime": f"{int(m.group(1))}:{m.group(2)}" if m else None,
                         "headings": len(_headings(txt))})
    by_rt = collections.defaultdict(list)
    for v in versions:
        by_rt[v["runtime"] or "unknown"].append(v["name"])
    # A version can be split over several files (the 59:30 master is partA..partF; only partA carries the
    # runtime line). Such a version is diffed as the concatenation of all its parts, in order.
    pa_rx = re.compile(r"^(?P<dir>.*/)part(?P<k>[A-F])\.md$")

    def composite(v):
        m = pa_rx.match(v["canonical"])
        if not m or m.group("k") != "A":
            return None
        parts = sorted((r for r in recs if (mm := pa_rx.match(r["canonical"])) and mm.group("dir") == m.group("dir")),
                       key=lambda r: r["canonical"])
        return parts if len(parts) > 1 else None

    def side(v):
        parts = composite(v)
        if not parts:
            return {"files": [v["canonical"]], "bytes": v["bytes"], "text": _read_text(v["canonical"])}
        return {"files": [r["canonical"] for r in parts], "bytes": sum(r["bytes"] for r in parts),
                "text": "\n".join(_read_text(r["canonical"]) for r in parts)}

    diffs = []
    runs = [v for v in versions if v["runtime"]]
    ref = {}
    for v in sorted(runs, key=lambda v: (v["runtime"], "master" not in v["name"].lower(), -v["copies"], v["canonical"])):
        ref.setdefault(v["runtime"], v)
    rts = sorted(ref)
    for i in range(len(rts)):
        for j in range(i + 1, len(rts)):
            sa, sb = side(ref[rts[i]]), side(ref[rts[j]])
            ha, hb = _headings(sa["text"]), _headings(sb["text"])
            sm = difflib.SequenceMatcher(None, ha, hb, autojunk=False)
            la, lb = sa["text"].splitlines(), sb["text"].splitlines()
            diffs.append({"a": sa["files"][0], "b": sb["files"][0], "a_files": sa["files"], "b_files": sb["files"],
                          "runtime_a": rts[i], "runtime_b": rts[j],
                          "heading_similarity": round(sm.ratio(), 3), "headings_a": len(ha), "headings_b": len(hb),
                          "line_quick_ratio": round(difflib.SequenceMatcher(None, la, lb, autojunk=False).quick_ratio(), 3),
                          "bytes_a": sa["bytes"], "bytes_b": sb["bytes"], "bytes_delta": sb["bytes"] - sa["bytes"]})
    # 2. narration packs
    def grp(rx):
        return [{"file_id": r["file_id"], "canonical": r["canonical"], "copies": len(r["paths"]), "bytes": r["bytes"]}
                for r in recs if re.search(rx, r["canonical"]) and r["category"] in ("doc", "text")]
    narration = {
        "partA_F": grp(r"DA Camp vedio narration/part[A-F]\.md$"),
        "nblm_unified": grp(r"DA_Camp_00_Unified_(Master_Full|Narration)_Egyptian\.md$"),
        "nblm_parts_25": grp(r"DA_Camp_Part_\d\d_of_25_"),
        "narration_named": [x for x in grp(r"(?i)narration") if x["canonical"].endswith((".md", ".txt"))
                            and not re.search(r"DA Camp vedio narration/part|Unified_Narration|Part_\d\d_of_25", x["canonical"])],
    }
    # 3. HTML families (+ what the Artifact_Analysis docs talk about)
    html = [r for r in recs if r["category"] == "html"]
    def stem(n):
        n = os.path.splitext(n)[0]
        n = re.sub(r"(?i)[-_](standalone|final\d*|v\d+|rc\d+|ds|editable)\b", "", n)
        return n.lower()
    fam = collections.defaultdict(list)
    for r in html:
        fam[stem(base(r))].append({"file_id": r["file_id"], "name": base(r), "canonical": r["canonical"],
                                   "bytes": r["bytes"], "copies": len(r["paths"])})
    analysis = []
    names = {base(r) for r in html}
    for r in recs:
        if r["category"] == "doc" and re.search(r"DA_Camp_Artifact_Analysis", base(r)):
            txt = _read_text(r["canonical"])
            mentioned = sorted({m for m in re.findall(r"[\w\-.()+ ]+?\.html", txt) for m in [m.strip()] if m in names})
            analysis.append({"doc": r["canonical"], "name": base(r), "bytes": r["bytes"], "html_mentioned": mentioned[:60]})
    same_content = [{"file_id": r["file_id"], "names": sorted({os.path.basename(x) for x in r["paths"]})}
                    for r in html if len({os.path.basename(x) for x in r["paths"]}) > 1]
    # 4. NotebookLM parts (archive parts and per-part content counts)
    parts = collections.defaultdict(lambda: {"files": 0, "bytes": 0, "categories": collections.Counter()})
    for r in recs:
        for pth in r["paths"]:
            m = re.match(r"(NotebookLM\.zip\.d/NotebookLM_part\d+)\.zip\.d/|(Chatgpt\.zip\.d/Chatgpt_part\d+)\.zip\.d/", pth)
            if m:
                k = (m.group(1) or m.group(2)).split("/")[-1]
                parts[k]["files"] += 1
                parts[k]["bytes"] += r["bytes"]
                parts[k]["categories"][r["category"]] += 1
    nblm_parts = {k: {**v, "categories": dict(v["categories"])} for k, v in sorted(parts.items())}
    doc = {"v": 1, "created": C.now_iso(),
           "master_md": {"versions": sorted(versions, key=lambda v: v["canonical"]), "by_runtime": dict(by_rt),
                         "diff_summaries": diffs, "canon_runtime": "70:05"},
           "narration_packs": narration,
           "html_families": {"families": {k: v for k, v in sorted(fam.items())}, "same_content_different_names": same_content,
                             "artifact_analysis_docs": analysis},
           "archive_parts": nblm_parts}
    C.write_json(os.path.join(CAT_DIR, "lineage.json"), doc)
    M.write(CAT_DIR, "lineage", "dc ingest lineage", inputs, outs,
            extra={"master_versions": len(versions), "runtimes": sorted(by_rt), "html_families": len(fam)})
    print(f"lineage: master versions {len(versions)} runtimes={sorted(by_rt)}; narration groups "
          f"{ {k: len(v) for k, v in narration.items()} }; html families {len(fam)}; archive parts {len(nblm_parts)}")
    return 0
