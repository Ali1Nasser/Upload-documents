#!/usr/bin/env python3
"""Plain-assert tests for the P3a text helpers. Run: .venv/bin/python -I tools/tests/test_p3a.py (exit 0 = all pass)."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import align as L  # noqa: E402
from dclib import asr as R  # noqa: E402
from dclib import textnorm as TN  # noqa: E402

n = 0


def eq(a, b, msg=""):
    global n
    n += 1
    assert a == b, f"{msg}: {a!r} != {b!r}"


eq(TN.fold("الـmodel"), "ال model", "script join split")
eq(TN.fold("أَحمد، إيه؟"), "احمد ايه", "alef fold + tashkeel + punctuation")
eq(TN.fold("SQL وPython"), "sql و python")
eq(TN.fold("٤٠١"), "401")
eq(L.spoken("SQL"), "اس كيو ال")
eq(L.spoken("p95"), "بي خمسة وتسعين")
eq(L.spoken("401"), "ربعميه وواحد")
eq(L.spoken("1007"), "الف وسبعة")
eq(L.spoken("BY"), "BY")
eq(L.spoken("—"), "")
eq(L.tokenise("هات — الصفوف ،"), ["هات", "الصفوف"], "standalone punctuation dropped")
s = R.score("هات الصفوف SQL", "هات الصفوف اس كيو ال")
eq(s["wer"] > 0.4 and s["latin_recall"] == 0.0, True, "Latin term written in Arabic counts as an error")
eq(R.score("a b c", "a b c")["cer"], 0.0)
print(f"{n} checks passed")
