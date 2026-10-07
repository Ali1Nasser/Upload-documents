"""Gate G1 Ingest (docs/plan/06 section 1):
 - 6/6 archives match the SHA-256 in inventory/archives.tsv
 - unique-file count reconciled with inventory/unique_files.tsv (1,119; every difference explained)
 - 0 quarantined files on disk
 - media decode report done (corrupt files flagged)
 - lineage report written
"""
import os
import re
import sys

EXPECTED_UNIQUE = 1119  # fixed by the contract; changing it needs an ADR
EXPECTED_ARCHIVES = 6


def C(name, ok, detail):
    return {"name": name, "pass": bool(ok), "detail": detail}


def check(ctx):
    sys.path.insert(0, ctx.p("tools"))
    from dclib import ingest, manifest, schema
    cm = ctx.common
    cat = ctx.p("corpus", "catalog")
    out = []

    # 1 archives
    v = cm.read_json(os.path.join(cat, "archives_verify.json"))
    if not v:
        out.append(C("archives_sha256", False, "corpus/catalog/archives_verify.json missing: run `dc ingest verify`"))
    else:
        stale = []
        for a in v["archives"]:
            f = ctx.p("data", "raw", a["archive"])
            if not os.path.isfile(f) or ingest.stat_sig(f) != a.get("stat"):
                stale.append(a["archive"])
        n = sum(1 for a in v["archives"] if a["match"])
        out.append(C("archives_sha256", n == EXPECTED_ARCHIVES and v["total"] == EXPECTED_ARCHIVES and not stale,
                     f"{n}/{v['total']} archives match inventory SHA-256" + (f"; stale (changed since verify): {stale}" if stale else "")))

    # 2 catalog reconcile
    rec = cm.read_json(os.path.join(cat, "reconcile.json"))
    fpath = os.path.join(cat, "files.jsonl")
    if not rec or not os.path.exists(fpath):
        out.append(C("unique_count_reconciled", False, "run `dc ingest catalog` (writes files.jsonl + reconcile.json)"))
    else:
        rels = ingest.walk_files()
        fresh = manifest.should_skip(
            cat, "catalog", [{"path": "data/extracted (tree: path+size+mtime)", "sha256": ingest.tree_fingerprint(rels)}],
            ["corpus/catalog/files.jsonl"])
        exp_rows = len(cm.read_tsv(ctx.p("docs", "plan", "inventory", "unique_files.tsv")))
        ok = (rec["catalog_unique"] == EXPECTED_UNIQUE == exp_rows and rec["unexplained"] == 0
              and rec.get("canonical_unexplained", 0) == 0 and fresh)
        out.append(C("unique_count_reconciled", ok,
                     f"catalog {rec['catalog_unique']} unique vs inventory {rec['expected_unique']} (contract {EXPECTED_UNIQUE}); "
                     f"missing {rec['missing']}, extra {rec['extra']}, canonical diffs {rec['canonical_diff']} "
                     f"(unexplained {rec['unexplained'] + rec.get('canonical_unexplained', 0)}); catalog fresh={fresh}; "
                     "see reports/gates/G1_reconcile.md"))
        errs = schema.validate_file(fpath, schema.rule_for("corpus/catalog/files.jsonl"), limit=3)
        out.append(C("files_jsonl_schema", not errs, "corpus/catalog/files.jsonl validates against files.schema.json" if not errs else str(errs)))

    # 3 quarantine (live name scan, contents never opened)
    q = cm.read_json(os.path.join(cat, "quarantine.json"))
    on_disk = 0
    for base in (ctx.p("data", "extracted"), ctx.p("data", "quarantine"), ctx.p("data", "raw")):
        for dp, dn, fn in os.walk(base):
            on_disk += sum(1 for n in dn + fn if ingest.QUARANTINE_RX.search(os.path.relpath(os.path.join(dp, n), ctx.root)))
    out.append(C("quarantine_clean", bool(q) and len(q.get("items", [])) > 0 and q.get("on_disk") == 0 and on_disk == 0,
                 f"{len((q or {}).get('items', []))} names listed in quarantine.json, {on_disk} found on disk now (must be 0)"
                 if q else "corpus/catalog/quarantine.json missing: run `dc ingest quarantine`"))

    # 4 media decode report
    mp = os.path.join(cat, "media.jsonl")
    if not os.path.exists(mp) or not os.path.exists(fpath):
        out.append(C("media_decode_report", False, "corpus/catalog/media.jsonl missing: run `dc ingest probe` (P1 runs it fully)"))
    else:
        files = cm.read_jsonl(fpath)
        want = {r["file_id"] for r in files if r["category"] in ("audio", "video")}
        media = cm.read_jsonl(mp)
        got = {r["file_id"] for r in media}
        flagged = [r["path"] for r in media if not r["decode_ok"]]
        known_bad = [r for r in files if r["canonical"].endswith("DA_Camp_Master_70m05_v7_final.mp4")]
        known_ok = True
        if known_bad:
            fl = {r["file_id"]: r["decode_ok"] for r in media}
            known_ok = all(fl.get(r["file_id"]) is False for r in known_bad)
        errs = schema.validate_file(mp, schema.rule_for("corpus/catalog/media.jsonl"), limit=3)
        out.append(C("media_decode_report", want == got and known_ok and not errs,
                     f"{len(got)}/{len(want)} unique audio/video probed; {len(flagged)} flagged decode_ok=false; "
                     f"expected-corrupt v7_final flagged={known_ok}" + (f"; schema errors {errs}" if errs else "")))

    # 5 lineage
    lin = cm.read_json(os.path.join(cat, "lineage.json"))
    if not lin:
        out.append(C("lineage_written", False, "corpus/catalog/lineage.json missing: run `dc ingest lineage`"))
    else:
        rts = set(lin.get("master_md", {}).get("by_runtime", {}))
        ok = {"59:30", "70:05"} <= rts and bool(lin.get("html_families", {}).get("families")) and bool(lin.get("narration_packs", {}).get("partA_F"))
        out.append(C("lineage_written", ok, f"master runtimes {sorted(rts)}, html families {len(lin.get('html_families', {}).get('families', {}))}, "
                     f"narration groups {sorted(lin.get('narration_packs', {}))}"))
    return out
