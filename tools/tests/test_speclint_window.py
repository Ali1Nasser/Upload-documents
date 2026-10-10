#!/usr/bin/env python3
"""Plain-assert tests for the underscore demo-spec `window` in dc spec lint (P7 compiler demo, corpus/specs/_demo.json).
Run: python3 -I tools/tests/test_speclint_window.py"""
import copy
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import speclint as S  # noqa: E402

W = S.World()
SPEC = json.load(open(S.spec_path("_demo"), encoding="utf-8"))
n = 0


def check(name, cond):
    global n
    n += 1
    assert cond, name
    print("ok  ", name)


r = S.lint_chapter(W, SPEC["chapter"], SPEC, window=True)
check("_demo window spec lints clean", r["errors"] == [])
m = r["metrics"]
check("window span is 45-60 s", 45 * 24 <= m["chapter_frames"] <= 60 * 24)
check("window pads match studio/src/spec/resolve.ts WINDOW_PAD (12/24)", (S.WINDOW_PAD_IN, S.WINDOW_PAD_OUT) == (12, 24))
r = S.lint_chapter(W, SPEC["chapter"], SPEC)
check("a chapter spec may not carry a window", any("only allowed in underscore demo specs" in e for e in r["errors"]))
bad = copy.deepcopy(SPEC)
bad["window"]["from"] = "s:S1:ar-natural:9999"
r = S.lint_chapter(W, bad["chapter"], bad, window=True)
check("unknown window sentence is an error", any(e.startswith("window") for e in r["errors"]))
bad = copy.deepcopy(SPEC)
bad["shots"][-1]["sentences"] = bad["shots"][-1]["sentences"][:1]
r = S.lint_chapter(W, bad["chapter"], bad, window=True)
check("a window sentence left uncovered is still an error", any("not covered by any shot" in e for e in r["errors"]))
check("resolve_chapters keeps underscore specs", S.resolve_chapters(W, "_demo") == ["_demo"])
print(f"{n} checks passed")
