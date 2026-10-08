#!/usr/bin/env python3
"""Plain-assert tests for the P3b helpers (polish, sentences, emphasis lexicon, second-aligner text mapping).
Run: .venv/bin/python -I tools/tests/test_p3b.py (exit 0 = all pass)."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import align2 as W2  # noqa: E402
from dclib import polish as P  # noqa: E402
from dclib import scripted as SCR  # noqa: E402

n = 0


def eq(a, b, msg=""):
    global n
    n += 1
    assert a == b, f"{msg}: {a!r} != {b!r}"


words = [{"i": i, "text": t, "start_ms": i * 300, "end_ms": i * 300 + 250, "p": 0.9} for i, t in enumerate("هنستخدم الـ embedding دي في ال rag بتاعنا 20 مرة".split())]
out = {"edits": [{"i": 1, "to": "ال", "why": "mishear"}, {"i": 2, "to": "embeddings", "why": "term"}, {"i": 6, "to": "RAG", "why": "term"}, {"i": 8, "to": "عشرين", "why": "number"}],
       "insert": [{"after_i": 3, "text": "كلمة ضايعة", "why": "dropout"}, {"after_i": -1, "text": "يا جماعة", "why": "dropout"}],
       "sentences": [{"from_i": 0, "to_i": 3, "kind": "claim", "gloss_en": "a"}, {"from_i": 4, "to_i": 9, "kind": "example", "gloss_en": "b"}]}
err, warn = P.validate_out(out, 10)
eq(err, [], "no errors")
toks, log = P.apply_edits(words, out)
eq([t["text"] for t in toks], ["يا", "جماعة", "هنستخدم", "ال", "embeddings", "دي", "كلمة", "ضايعة", "في", "ال", "RAG", "بتاعنا", "عشرين", "مرة"], "tokens")
eq(toks[3]["polish"]["orig"], "الـ", "orig kept")
eq(toks[0]["polish"]["rule"], "dropout")
eq(toks[6]["anchor"], 3, "insert anchor")
eq(toks[0]["anchor"], 0, "insert-before anchor")
sents, notes = P.remap_sentences(out, toks)
eq([(s["from"], s["to"]) for s in sents], [(0, 7), (8, 13)], "remapped sentences cover every final token")
err, _ = P.validate_out({"edits": [{"i": 1, "to": "x"}, {"i": 1, "to": "y"}]}, 9)
eq(len(err), 1, "duplicate edit rejected")
err, _ = P.validate_out({"sentences": [{"from_i": 0, "to_i": 5}, {"from_i": 4, "to_i": 8}]}, 9)
eq(len(err), 1, "overlapping sentences rejected")

ws = [{"text": t, "start_ms": s, "end_ms": s + 200} for t, s in [("a", 0), ("b.", 300), ("c", 600), ("d", 1500), ("e", 1750)]]
eq(P.candidate_split(ws), [(0, 1), (2, 2), (3, 4)], "punctuation + pause split")
long = [{"text": "w", "start_ms": i * 250, "end_ms": i * 250 + 200} for i in range(60)]
eq([b - a + 1 for a, b in P.candidate_split(long)], [28, 28, 4], "28-word cap")
eq(sum(b - a + 1 for a, b in P._split_long(long, 0, 59)), 60, "split_long keeps all words")
eq(max(b - a + 1 for a, b in P._split_long(long, 0, 59)) <= 28, True)

eq(P.term_slug("Kafka consumer"), "c:kafka-consumer")
eq(P.term_slug("الداتا"), None)
eq(P.word_flags("الـembeddings"), (True, False))
eq(P.word_flags("3,948.50"), (False, True))
eq(P.lex_class({"norm": "20", "is_number": True, "is_term": False}), "number")
eq(P.lex_class({"norm": "ال embeddings", "is_number": False, "is_term": True}), "term")
eq(P.lex_class({"norm": "لكن", "is_number": False, "is_term": False}), "contrast")
eq(P.lex_class({"norm": "بيزيد", "is_number": False, "is_term": False}), "change")
eq(P.lex_class({"norm": "المتغير", "is_number": False, "is_term": False}), None, "variable is not a change verb")

eq(SCR.en_int(3948), "three thousand nine hundred forty eight")
eq(SCR.spoken_en("66.67%"), "sixty six point six seven percent")
eq(SCR.spoken_en("(1007)"), "one thousand seven")
eq(W2.latin_to_ar("sh"), "ش")
vocab = {"|": 4, "ا": 12, "ب": 13, "ت": 15, "م": 37, "و": 40, "ي": 42, "َ": 46}
s, mp = W2.to_vocab("ال model", vocab)
eq(mp, 5, "latin chars mapped")
eq(all(ch in vocab for ch in s), True, "only vocabulary letters survive")
print(f"{n} checks passed")
