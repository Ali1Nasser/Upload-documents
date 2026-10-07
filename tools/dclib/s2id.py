"""dc audio identify-s2: which script does S2 (Esraa) read? Turbo-ASR two 3-minute windows and fuzzy-match them against
candidate scripts (Arabic-folded, rapidfuzz partial_ratio). Writes corpus/audio/s2_script_id.json and a section for reports/audio/sources.md.
"""
import glob
import json
import os
import re
import statistics as S
import sys
import time

from . import asr as R
from . import audio as A
from . import common as C
from . import queue as Q
from . import scripts as SC
from . import textnorm as TN

AID = "a:S2:ar-esraa"
WINDOWS = [(300.0, 180.0), (2400.0, 180.0)]
OUT = C.p("corpus", "audio", "s2_script_id.json")


def _win_path(i):
    return os.path.join(R.ASR_DIR, f"s2_window{i}.json")


def _strip_md(t):
    t = re.sub(r"```.*?```", " ", t, flags=re.S)
    t = re.sub(r"[#*>`|_\-]+", " ", t)
    return t


def references():
    refs = {}
    ch = SC.chapter_texts_master()
    names = sorted(ch)
    text, bounds = "", []
    for n in names:
        bounds.append((len(text), n))
        text += TN.fold(ch[n]) + " "
    refs["master_s8_ar (S1 script)"] = (text, bounds)
    if os.path.exists(SC.T5):
        refs["T5 Claude film script (DA_Camp_Narration_Script_AR.md)"] = (TN.fold(_strip_md(open(SC.T5, encoding="utf-8").read())), [])
    for label, pat in (("T2 unified Egyptian narration", os.path.join(SC.FILM, "Folder 1", "uploads", "DA_Camp_00_Unified_Narration_Egyptian.md")),
                       ("T4 28-min V2 narration", os.path.join(SC.EX, "Chatgpt.zip.d", "**", "DA_Camp_28min_Narration_Egyptian_Arabic_V2.md"))):
        hits = glob.glob(pat, recursive=True)
        if hits:
            refs[label] = (TN.fold(_strip_md(open(hits[0], encoding="utf-8").read())), [])
    return refs


def _where(pos, bounds):
    cur = None
    for b, n in bounds:
        if b <= pos:
            cur = n
    return cur


def compare(win_docs, refs):
    from rapidfuzz import fuzz
    out = {}
    for rname, (rtext, bounds) in refs.items():
        per = []
        for i, d in enumerate(win_docs):
            scores, where = [], []
            for s in d["segments"]:
                q = TN.fold(s["text"])
                if len(q) < 25:
                    continue
                al = fuzz.partial_ratio_alignment(q, rtext)
                scores.append(al.score)
                where.append(_where(al.dest_start, bounds) if bounds else round(al.dest_start / max(1, len(rtext)), 3))
            per.append({"window": i, "segments": len(scores), "median": round(S.median(scores), 1) if scores else None,
                        "share_ge_80": round(sum(1 for x in scores if x >= 80) / max(1, len(scores)), 3),
                        "share_ge_90": round(sum(1 for x in scores if x >= 90) / max(1, len(scores)), 3),
                        "matched_chapters_or_relpos": sorted(set(w for w in where if w is not None), key=str)[:12]})
        out[rname] = per
    return out


def timeline_offsets(win_docs):
    """Is S2 on the same 70:05 timeline as S1? For each ASR segment, find its first 4 folded tokens in the aligned S1 words and
    report (S2 segment start - S1 word start). Needs corpus/transcripts/a_S1_ar-natural.words.jsonl."""
    wp = os.path.join(C.p("corpus", "transcripts"), "a_S1_ar-natural.words.jsonl")
    if not os.path.exists(wp):
        return None
    s1 = C.read_jsonl(wp)
    toks = [TN.fold(w["text"]).replace(" ", "") for w in s1]
    offs = []
    for d in win_docs:
        for seg in d["segments"]:
            ws = [TN.fold(w["text"]).replace(" ", "") for w in seg["words"]]
            if len(ws) < 6:
                continue
            key = ws[:4]
            for i in range(len(toks) - 3):
                if toks[i:i + 4] == key and abs(s1[i]["start_ms"] - seg["words"][0]["start_ms"]) < 60000:
                    offs.append(seg["words"][0]["start_ms"] - s1[i]["start_ms"])
                    break
    if not offs:
        return {"matched_segments": 0}
    return {"matched_segments": len(offs), "median_offset_ms": S.median(offs), "min_ms": min(offs), "max_ms": max(offs),
            "within_1s": sum(1 for o in offs if abs(o) <= 1000), "offsets_ms": offs[:40]}


def cmd_identify(args):
    need = [i for i in range(len(WINDOWS)) if args.force or not os.path.exists(_win_path(i))]
    if need and not args.inline and not Q.in_queue():
        ids = []
        for i in need:
            st, du = WINDOWS[i]
            job = Q.submit(f"asr-S2-win{i}-turbo", [sys.executable, "-I", C.p("tools", "dc.py"), "asr", "transcribe", AID, "--inline", "--model", "turbo",
                                                    "--threads", "2", "--start", str(st), "--dur", str(du), "--out", _win_path(i), "--force"],
                           mem_gb=1.8, expected_gb=0.02)
            ids.append(job["tsp_id"])
        print(f"queued S2 window ASR jobs {ids}; waiting", file=sys.stderr)
        for j in ids:
            Q.cmd_wait(type("A", (), {"id": j, "timeout": 7200, "tail": 3}))
    docs = [C.read_json(_win_path(i)) for i in range(len(WINDOWS))]
    refs = references()
    cmp_ = compare(docs, refs)
    qa = {}
    qp = A.qa_path(AID)
    if os.path.exists(qp):
        r = C.read_json(qp)
        qa = {"music_bed_score": r["qa"].get("music_bed_score"), "speech_ratio": r["qa"].get("speech_ratio"),
              "noise_floor_db": r["qa"].get("noise_floor_db"), "pauses": r["qa"].get("pauses"),
              "frame_rms_db_p05_p50_p95": r["detail"].get("frame_rms_db_p05_p50_p95")}
    s1qp = A.qa_path("a:S1:ar-natural")
    if os.path.exists(s1qp):
        r = C.read_json(s1qp)
        qa["s1_for_comparison"] = {"music_bed_score": r["qa"].get("music_bed_score"), "speech_ratio": r["qa"].get("speech_ratio"),
                                   "noise_floor_db": r["qa"].get("noise_floor_db"), "frame_rms_db_p05_p50_p95": r["detail"].get("frame_rms_db_p05_p50_p95")}
    best = max(cmp_.items(), key=lambda kv: S.mean(x["median"] or 0 for x in kv[1]))
    best_med = S.mean(x["median"] or 0 for x in best[1])
    same_as_s1 = best[0].startswith("master_s8") and best_med >= 80
    res = {"v": 1, "audio_id": AID, "windows_s": [{"start_s": a, "dur_s": b} for a, b in WINDOWS],
           "asr_words": [sum(len(s["words"]) for s in d["segments"]) for d in docs],
           "asr_sample": [" ".join(s["text"] for s in d["segments"][:3])[:300] for d in docs],
           "timeline_vs_s1": timeline_offsets(docs),
           "comparison": cmp_, "best_reference": best[0], "best_median_score": round(best_med, 1),
           "reads_same_script_as_s1": same_as_s1, "audio_profile": qa,
           "provisional_role": "reference" if same_as_s1 else "unused",
           "note": "Provisional only: ADR-001 decides roles. Score = rapidfuzz partial_ratio of each ASR segment (>= 25 folded chars) against the folded reference text.",
           "created": C.now_iso()}
    C.write_json(OUT, res)
    for k, v in cmp_.items():
        print(f"{k}: " + " | ".join(f"win{x['window']} median {x['median']} share>=80 {x['share_ge_80']}" for x in v))
    print("timeline vs S1:", {k: v for k, v in (res["timeline_vs_s1"] or {}).items() if k != "offsets_ms"})
    print(f"best: {best[0]} ({best_med:.1f}); same as S1: {same_as_s1}; provisional role: {res['provisional_role']}")
    return 0
