#!/usr/bin/env python3
"""Plain-assert tests for `dc corpus canon` (tools/dclib/canon*.py).

Part 1 uses synthetic text (no archives needed): markdown tables, numbers, the ast literal evaluator's
refusal to run anything but literal data. Part 2 checks the committed corpus/canon outputs against the
counts the plan expects (skipped if the outputs are absent).

Run: python3 -I tools/tests/test_canon.py   (exit 0 = all pass)
"""
import ast
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))

from dclib import canon_md as M  # noqa: E402
from dclib import canon_src as S  # noqa: E402

FAILS = []


def check(name, cond, detail=""):
    if not cond:
        FAILS.append(f"{name}: {detail}")


# ---- synthetic: markdown helpers
rows = M.tables(["| a | b |", "|---|---|", "| `x | y` | 2 |", "| 3 | 4 |"])
check("table rows", len(rows) == 1 and rows[0]["rows"] == [["`x | y`", "2"], ["3", "4"]], rows)
nums = [n["value"] for n in M.numbers_in("CH-15 shows €3 948.50 and 1 000 000 rows, P21 and §6.3 are ids")]
check("numbers skip ids", nums == [3948.5, 1000000], nums)
check("plain text keeps lone star", M.plain_text("`SELECT *` from *file*") == "SELECT * from file", M.plain_text("`SELECT *` from *file*"))
check("mm:ss", M.ms_of_mmss("61:55") == 3715000)

# ---- synthetic: the literal evaluator never executes calls it does not whitelist
ev = S.LiteralEval({"OK": "@OK"}, stubs={"arch": S._arch_stub, "mix": S._mix_stub})
val, err = ev.safe(ast.parse("dict(kind='flow', items=[{'k': 's%d' % i, 'v': v} for i, v in enumerate([3, 4])], c=OK)", mode="eval").body)
check("literal eval", err is None and val == {"kind": "flow", "items": [{"k": "s0", "v": 3}, {"k": "s1", "v": 4}], "c": "@OK"}, (val, err))
for src in ("__import__('os').system('true')", "open('/etc/passwd')", "eval('1')", "(lambda: 1)()", "x.__class__"):
    v, e = ev.safe(ast.parse(src, mode="eval").body)
    check(f"refuses {src}", e is not None and isinstance(v, dict) and "_expr" in v, (v, e))
v, e = ev.safe(ast.parse("round(__import__('math').log(8) / __import__('math').log(2), 3)", mode="eval").body)
check("math namespace", e is None and v == 3.0, (v, e))
v, e = ev.safe(ast.parse("'%99999d' % 1", mode="eval").body)
check("format width guard", e is not None, (v, e))

# ---- outputs (if generated)
canon = os.path.join(ROOT, "corpus", "canon")
if os.path.exists(os.path.join(canon, "chapters.json")):
    ch = json.load(open(os.path.join(canon, "chapters.json"), encoding="utf-8"))
    check("37 chapters", len(ch["chapters"]) == 37, len(ch["chapters"]))
    check("200 shots", ch["totals"]["shots"] == 200, ch["totals"]["shots"])
    check("runtime 70:05", ch["totals"]["runtime_s"] == 4205, ch["totals"]["runtime_s"])
    sc = [json.loads(x) for x in open(os.path.join(canon, "nblm_scenes.jsonl"), encoding="utf-8")]
    check("351 scenes", sum(1 for s in sc if s["kind"] == "scene") == 351)
    cues = json.load(open(os.path.join(canon, "cues_70m05.json"), encoding="utf-8"))
    check("637 cues", cues["counts"]["captions"] == 637, cues["counts"]["captions"])
    check("487 T5 lines", cues["counts"].get("ar_lines_t5") == 487, cues["counts"].get("ar_lines_t5"))
    lp = json.load(open(os.path.join(canon, "legacy_patterns.json"), encoding="utf-8"))
    check("25 renderers", lp["counts"]["renderers"] == 25, lp["counts"]["renderers"])
    check("200 legacy shots", lp["counts"]["film_shots"] == 200, lp["counts"]["film_shots"])
    dc = json.load(open(os.path.join(canon, "data_contract.json"), encoding="utf-8"))
    check("data checks pass", all(c["ok"] for c in dc["checks"]), [c for c in dc["checks"] if not c["ok"]])
    ids = [f["id"] for f in dc["facts"]]
    check("unique fact ids", len(ids) == len(set(ids)))
    k = json.load(open(os.path.join(canon, "contradictions.json"), encoding="utf-8"))
    kinds = {i["kind"] for i in k["items"]}
    check("artifact none logged", "artifact_none" in kinds and "prediction_none" in kinds, kinds)

if FAILS:
    print("FAIL\n  " + "\n  ".join(map(str, FAILS)))
    sys.exit(1)
print("ok")
