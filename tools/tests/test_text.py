#!/usr/bin/env python3
"""Plain-assert tests for distill / search / maps / visual_merge helpers. Run: .venv/bin/python -I tools/tests/test_text.py"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import distill as D, maps as MP, search as S, visual_merge as VM  # noqa: E402

n = 0


def check(cond, msg):
    global n
    n += 1
    if not cond:
        print("FAIL:", msg)
        sys.exit(1)


# markdown: heading stack, fences hide headings, tiny sections fold into the next, spans point into the document
doc = "# T\n\nintro paragraph " + "x" * 200 + "\n\n## A\n\n```\n# not heading\n```\n\n### A1\n\n" + "body " * 120 + "\n\n## B\n\n" + "tail " * 150 + "\n"
ch = list(D.chunk_md(doc, "T"))
check(all(doc[a:b].strip() == t for _, t, (a, b), _ in ch), "char_span matches text")
check(["T", "A", "A1"] in [c[0] for c in ch], f"heading path A1 present: {[c[0] for c in ch]}")
check(not any("not heading" in c[0] for c in ch), "fenced # is not a heading")
check(max(len(c[1]) for c in ch) <= D.HARD + 50, "chunk size bounded")
# over-long single line is split
big = "word " * 2000
check(all(len(t) <= 2000 for _, t, _, _ in D.chunk_md(big, "t")), "hard split of a minified line")
# subtitles: blank-line SRT, no-blank-line SRT, VTT, ASS
srt = "1\n00:00:01,000 --> 00:00:02,000\nhello\n\n2\n00:00:03,500 --> 00:00:04,000\nworld\n"
flat = "1\n00:00:01,000 --> 00:00:02,000\nhello\n2\n00:00:03,500 --> 00:00:04,000\nworld\n"
for s in (srt, flat):
    check(D.parse_cues(s, "srt") == [(1000, "hello"), (3500, "world")], f"srt cues {D.parse_cues(s, 'srt')}")
check(D.parse_cues("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nhi\n", "vtt") == [(1000, "hi")], "vtt")
check(D.parse_cues("Dialogue: 0,0:00:01.50,0:00:02.00,Default,,0,0,0,,مرحبا\\Nيا", "ass") == [(1500, "مرحبا يا")], "ass")
# language: Egyptian prose with Latin terms is ar-EG and flagged mixed
check(D.lang_of("الـjoin بيطلع صفوف أكتر من الـinput والـgrain اتغير") == ("ar-EG", True), "ar-EG mixed")
check(D.lang_of("plain english text")[0] == "en", "en")
# json rendering
js = list(D.chunk_json('{"a": [{"x": 1, "y": "two"}, {"x": 3}], "b": "z"}', "t"))
check(len(js) == 1 and "a[0].y: two" in js[0][1], f"json {js}")
# retrieval tokens: Arabic prefix strip, plural, stopwords, tatweel split
check(S.query_tokens("الـgrain") == ["grain"], S.query_tokens("الـgrain"))
check(S.query_tokens("fan-out SUM doubles") == ["fan", "out", "sum", "double"], S.query_tokens("fan-out SUM doubles"))
check(S.stem("والجداول") == "جداول" and S.stem("receipts") == "receipt" and S.stem("retries") == "retry", "stem")
# maps: fit() never exceeds the word budget
lines = [(lambda gw, i=i: f"- **title {i}** `f:aaaaaaaaaaaa#0000{i}`: " + " ".join(["gist"] * gw)) for i in range(60)]
check(MP.words(MP.fit("# h\n\n", lines)) <= MP.SAFE + 5, "fit within budget")
# visual_merge: a caption line with unescaped inner quotes is repaired, not dropped
bad = ('{"asset_id": "v:aaaaaaaaaaaa", "caption_en": "x", "caption_ar": "y", "concepts": ["a-b"], "layout": "title + "3" number | icons", '
       '"text_seen": "t", "numbers_seen": ["3"], "reusable_idea": "r", "quality": 4, "reuse_mode": "reference"}')
d = VM._repair(bad)
check(d and d["layout"] == 'title + "3" number | icons' and d["quality"] == 4, f"repair {d}")
check(VM._quality(5) == 3 and VM._quality(1) == 0 and VM._concepts(["Kafka Lag", "c:x-y"]) == ["c:kafka-lag", "c:x-y"], "quality/concepts")
print(f"ok: {n} checks")
