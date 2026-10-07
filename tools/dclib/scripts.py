"""Canonical script sources for the scripted audio (S1/S3/S5): chapter windows, TTS-clean chapter texts, glossary terms.

Read-only access to extracted (untrusted) files; run under python -I.
"""
import glob
import json
import os
import re
from collections import Counter

from . import common as C

EX = C.p("data", "extracted")
FILM = os.path.join(EX, "DA_Camp_Videos_Files.zip.d", "DA Camp Videos Files", "LMArena")
MASTER = os.path.join(FILM, "Folder 3", "film", "master.md")
TTS_DIR = os.path.join(FILM, "Folder 1", "dacamp", "tts")
HTML_AR = os.path.join(FILM, "Folder 1", "02_Natural_AR_EDITABLE_STANDALONE.html")
T5 = os.path.join(EX, "ClaudeAndOthers.zip.d", "Claude.zip.d", "Claude", "Folder 1", "DA_Camp_Narration_Script_AR.md")


def _mmss(s):
    m, sec = s.split(":")
    return int(m) * 60 + int(sec)


def master_text():
    with open(MASTER, encoding="utf-8") as f:
        return f.read()


def chapter_windows_master():
    """§7 runtime map -> [{'chapter','start_s','end_s'}] (37 rows)."""
    out = []
    for m in re.finditer(r"^\|\s*(CH-\d\d)\s*\|\s*(\d+:\d\d)[–-](\d+:\d\d)\s*\|", master_text(), re.M):
        out.append({"chapter": m.group(1), "start_s": _mmss(m.group(2)), "end_s": _mmss(m.group(3))})
    return out


def chapter_windows_html():
    """DA_SCENES from the editable standalone HTML (the picture-side cross-check)."""
    with open(HTML_AR, encoding="utf-8") as f:
        t = f.read()
    i = t.index("DA_SCENES = [") + len("DA_SCENES = ")
    depth, j = 0, i
    while True:
        ch = t[j]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                break
        j += 1
    arr = json.loads(t[i:j + 1])
    return [{"chapter": s["id"], "start_s": float(s["start"]), "end_s": float(s["end"])} for s in arr]


def chapter_texts_tts():
    """CH-nn -> {'text': joined clean script, 'files': [...]} from dacamp/tts/CH-nn_k.txt (CH-14 and CH-33 have two parts)."""
    out = {}
    for f in sorted(glob.glob(os.path.join(TTS_DIR, "CH-*_*.txt"))):
        ch = os.path.basename(f)[:5]
        with open(f, encoding="utf-8") as fh:
            txt = fh.read().strip()
        d = out.setdefault(ch, {"parts": [], "files": []})
        d["parts"].append(txt)
        d["files"].append(os.path.relpath(f, EX))
    for ch, d in out.items():
        d["text"] = " ".join(d["parts"])
    return out


def chapter_texts_master(lang="Egyptian Arabic"):
    s8 = master_text()
    s8 = s8[s8.index("## 8 · The storyboard"):s8.index("## 9 · Recurring")]
    parts = re.split(r"\n### (CH-\d\d) · ", s8)
    out = {}
    for i in range(1, len(parts), 2):
        mm = re.search(rf"\*\*Narration — {lang}\*\*\s*\n((?:>.*\n?)+)", parts[i + 1])
        out[parts[i]] = " ".join(l[1:].strip() for l in mm.group(1).splitlines())
    return out


def glossary_terms(n=60):
    """~n Latin terms for the whisper initial_prompt: master §10.1 terms, §10.2 always-English list, then frequent Latin tokens
    in the TTS scripts. Order = priority. corpus/canon/glossary.json (P2) is used when present and a list of strings/dicts."""
    seen, out = set(), []

    def add(t):
        t = t.strip()
        k = t.lower()
        if t and k not in seen and re.search(r"[A-Za-z]", t):
            seen.add(k)
            out.append(t)
    gj = C.p("corpus", "canon", "glossary.json")
    if os.path.exists(gj):
        try:
            g = C.read_json(gj)
            items = g.get("terms", g) if isinstance(g, dict) else g
            for it in items:
                add(it if isinstance(it, str) else (it.get("term") or it.get("en") or ""))
        except Exception:  # noqa: BLE001
            pass
    m = master_text()
    a, b = m.index("### 10.1 The rule"), m.index("### 10.3 Pronunciation")
    sec = m[a:b]
    for row in re.finditer(r"^\|\s*([A-Za-z][^|]*?)\s*\|", sec, re.M):
        for part in row.group(1).split("/"):
            add(part)
    always = sec[sec.index("### 10.2"):]
    for line in always.splitlines()[1:]:
        for part in line.split("·"):
            add(part.replace("/", " ").split()[0] if part.strip() else "")
            for sub in part.split("/"):
                add(sub)
    cnt = Counter()
    for d in chapter_texts_tts().values():
        for w in re.findall(r"[A-Za-z][A-Za-z0-9\-]+", d["text"]):
            cnt[w] += 1
    for w, _ in sorted(cnt.items(), key=lambda kv: -kv[1]):
        add(w)
    return out[:n]


def prompt_text(n=60):
    return ", ".join(glossary_terms(n))
