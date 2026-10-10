#!/usr/bin/env python3
"""Plain-assert tests for `dc spec pack`. Run: python3 -I tools/tests/test_specpack.py
Builds the CH-33 and DD-P23 packs into a scratch dir and checks them against the locked EDL and word map."""
import json
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import specpack as P  # noqa: E402

n = 0


def check(cond, msg):
    global n
    n += 1
    if not cond:
        print("FAIL:", msg)
        sys.exit(1)


inp = P.Inputs()
with tempfile.TemporaryDirectory() as td:
    for ch in ("CH-33", "DD-P23", "CH-04"):
        pack = P.build_pack(inp, ch, 25000)
        txt = P.fmt_json(pack)
        back = json.loads(txt)                                   # the writer emits valid JSON
        check(back["id"] == ch, f"{ch} round trip")
        b = back["budget"]
        check(b["within_target"] and b["est_tokens"] <= 25000, f"{ch} within the 25k target ({b['est_tokens']})")
        check(abs(P.est_tokens(txt) - b["est_tokens"]) <= 2, f"{ch} budget field matches the file")
        ids = [s["id"] for s in back["sentences"]]
        check(ids == [i for i in inp.ch_sents[ch] if i in inp.cw[ch]], f"{ch} every EDL sentence, in order, none cut")
        for s in back["sentences"]:
            pre, rng = s["w"].rsplit(":", 1)
            a, z = (int(x) for x in rng.split(".."))
            wa, wz = f"{pre}:{a:06d}", f"{pre}:{z:06d}"
            check(wa in inp.world.wm and wz in inp.world.wm, f"{s['id']} word ids exist in the word map")
            check(inp.world.wm[wa][0] == s["fr"][0], f"{s['id']} first frame is the word map's")
            check(s["n"] == z - a + 1 == len(s["ar"].split()), f"{s['id']} word k = first + k (token count)")
            for nn in s.get("num", []):
                check(all(f in inp.facts for f in nn["fact"]), f"{s['id']} fact ids exist in the data contract")
        for k in ("constraints", "glossary", "continuity", "facts", "prereqs", "components", "metaphors", "inputs"):
            check(k in back, f"{ch} has {k}")
        check(back["inputs"]["edl"] == inp.lock["edl_sha256"], f"{ch} header records the locked EDL hash")
        check(all(x["use"] == "idea-only" for x in back["visual_assets"].values()), f"{ch} visual candidates are ideas only")
        check(all(inp.assets[a]["reuse_mode"] != "do-not-use" for a in back["visual_assets"]), f"{ch} no do-not-use assets")
    ch4 = json.loads(P.fmt_json(P.build_pack(inp, "CH-04", 25000)))
    check(any(x["id"] == "N4-ch04-promise" for x in ch4["storyboard_notes"]), "CH-04 promise-fix note")
    d14 = json.loads(P.fmt_json(P.build_pack(inp, "DD-P14", 25000)))
    check(any(x["id"] == "N3-java-framing" for x in d14["storyboard_notes"]), "DD-P14 Java framing note")
    c2 = json.loads(P.fmt_json(P.build_pack(inp, "CH-02", 25000)))
    check(any(x["id"] == "N-E002" for x in c2["storyboard_notes"]), "CH-02 E-002 note")
    # tiny target: visual candidates and background are cut, sentences and facts never
    small = P.build_pack(inp, "CH-33", 9000)
    check(len(small["sentences"]) == 20, "sentences are never cut under a small budget")
    check(small["budget"]["cuts_applied"], "cuts are recorded")
    check(small["facts"]["referenced"] == json.loads(P.fmt_json(P.build_pack(inp, "CH-33", 25000)))["facts"]["referenced"], "facts are never cut")
    # incremental: unchanged inputs -> current
    out = os.path.join(td, "CH-33.json")
    open(out, "w", encoding="utf-8").write(P.fmt_json(P.build_pack(inp, "CH-33", 25000)))
    check(P.pack_current(inp, out), "pack is current when inputs are unchanged")
    d = json.load(open(out))
    d["inputs"]["glossary"] = "0" * 16
    json.dump(d, open(out, "w"))
    check(not P.pack_current(inp, out), "pack is stale when an input hash changes")
rows = P.parse_metaphors()
check(len(rows) >= 40 and all(r["components"] for r in rows), f"metaphor rows parsed with components ({len(rows)})")
check(any(r["concept"].startswith("Files, paths") and "Terminal" in r["components"] for r in rows), "escaped pipes in the beats cell do not split columns")
print(f"ok: {n} checks")
