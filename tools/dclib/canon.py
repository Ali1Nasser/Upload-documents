"""dc corpus canon (P2.2-P2.4, P2.6): structured canon under corpus/canon/ from static parses of the archives.

Inputs are read as text (markdown, HTML-embedded JSON literals, python source via `ast`); nothing from the
archives is imported or executed. Outputs are schema-validated (harness/schemas/paths.json) before the
manifest is written; idempotent via manifest input hashes (--force overrides).
"""
import collections
import json
import os
import re
import sys

from . import common as C
from . import manifest as M
from . import schema as S
from .canon_md import parse_master, plain_text
from .canon_src import build_cues, build_legacy, build_nblm, compare_story_master, text_similarity

EXT = C.p("data", "extracted")
OUT = C.p("corpus", "canon")
VF = "DA_Camp_Videos_Files.zip.d/DA Camp Videos Files"
LMA = f"{VF}/LMArena"
SRC = {
    "master": f"{LMA}/Folder 3/film/master.md",
    "nblm_dir": f"{LMA}/Folder 1/uploads",
    "unified": f"{LMA}/Folder 1/uploads/DA_Camp_00_Unified_Master_Full_Egyptian.md",
    "cues": [("01_Esraa_AR", f"{LMA}/Folder 1/01_Esraa_AR_EDITABLE_STANDALONE.html"),
             ("02_Natural_AR", f"{LMA}/Folder 1/02_Natural_AR_EDITABLE_STANDALONE.html"),
             ("03_Natural_EN", f"{LMA}/Folder 1/03_Natural_EN_EDITABLE_STANDALONE.html")],
    "film_dir": f"{LMA}/Folder 3/film",
    "story": f"{LMA}/Folder 2/dacamp/story.json",
    "old_parts": [f"{VF}/DA Camp vedio narration/part{x}.md" for x in "ABCDEF"],
}
OUTPUTS = ["chapters.json", "data_contract.json", "glossary.json", "coverage_index.json", "assets_registry.json",
           "patterns.json", "scene_contract.json", "motion.json", "spec.json", "nblm_scenes.jsonl", "nblm_parts.json",
           "cues_70m05.json", "legacy_shots.jsonl", "legacy_patterns.json", "scripts.json", "contradictions.json"]


# ---------------------------------------------------------------- catalog helpers
_CAT = None


def catalog():
    global _CAT
    if _CAT is None:
        _CAT = {"by_path": {}, "recs": []}
        fp = C.p("corpus", "catalog", "files.jsonl")
        if os.path.exists(fp):
            for r in C.read_jsonl(fp):
                _CAT["recs"].append(r)
                for pth in r.get("paths", []):
                    _CAT["by_path"][pth] = r
    return _CAT


def src_info(rel):
    """{path (canonical when catalogued), file_id, copies} for an extracted path."""
    r = catalog()["by_path"].get(rel)
    if r:
        d = {"path": r["canonical"], "file_id": r["file_id"], "copies": len(r.get("paths", [])), "bytes": r.get("bytes")}
        if rel != r["canonical"]:
            d["read_from"] = rel
        return d
    full = os.path.join(EXT, rel)
    s1, _, n = C.sha1_sha256_file(full)
    return {"path": rel, "file_id": f"f:{s1[:12]}", "copies": None, "bytes": n}


def read_text(rel):
    with open(os.path.join(EXT, rel), encoding="utf-8-sig", errors="replace") as f:
        return f.read().replace("\r\n", "\n")


def find_paths(pred):
    """Unique catalogued files whose any path matches pred(path) -> list of catalog records."""
    return [r for r in catalog()["recs"] if any(pred(p) for p in r.get("paths", []))]


def words(s):
    return len(s.split())


# ---------------------------------------------------------------- scripts registry (T1..T7)
def _heading_pointers(text, rx):
    out = {}
    for i, ln in enumerate(text.split("\n"), 1):
        m = re.match(rx, ln)
        if m:
            out.setdefault(m.group(1), i)
    return out


def build_scripts(chapters, old, nblm_parts, issues):
    ch_by = {c["id"]: c for c in chapters}
    T = []
    master = src_info(SRC["master"])
    T.append({"id": "T1", "name": "master.md — production bible v70:05", "lang": ["en", "ar-EG"], "runtime": "70:05", "role": "trunk canon",
              "files": [dict(master, words_en=sum(c["narration_en_words"] for c in chapters),
                             words_ar=sum(c["narration_ar_words"] for c in chapters))],
              "lineage": {"supersedes": "T1-old", "identical_copies_elsewhere": ["T5 DA_Camp_Unified_Illustrative_Video_Master_EN_AR.md"]},
              "chapters": {c["id"]: {"file": master["path"], "line": c["line"], "en_line": c["narration_en_line"],
                                      "ar_line": c["narration_ar_line"], "words_en": c["narration_en_words"],
                                      "words_ar": c["narration_ar_words"]} for c in chapters}})
    # T1-old
    files, ptr = [], {}
    for rel in SRC["old_parts"]:
        info = src_info(rel)
        txt = read_text(rel)
        info["words"] = words(txt)
        files.append(info)
        for cid, ln in _heading_pointers(txt, r"^### (CH-\d\d) · ").items():
            ptr[cid] = {"file": info["path"], "line": ln}
    for cid, p in ptr.items():
        oc = old.get(cid)
        if oc and cid in ch_by:
            c = ch_by[cid]
            p.update(words_en=oc["narration_en_words"], words_ar=oc["narration_ar_words"],
                     sim_en_vs_T1=text_similarity(oc["narration_en"], c["narration_en"]),
                     sim_ar_vs_T1=text_similarity(oc["narration_ar"], c["narration_ar"]),
                     dur_s=oc.get("dur_s"), dur_s_T1=c["dur_s"], shots=len(oc["shots"]), shots_T1=len(c["shots"]))
    old_total = sum(o.get("dur_s", 0) for o in old.values())
    T.append({"id": "T1-old", "name": "earlier master split in partA..partF", "lang": ["en", "ar-EG"], "runtime": "59:30 (catalog lineage)",
              "role": "lineage diff only", "files": files,
              "lineage": {"version_of": "T1", "computed_runtime_s": old_total,
                          "chapters_identical_en": sum(1 for p in ptr.values() if p.get("sim_en_vs_T1") == 1.0),
                          "chapters_identical_ar": sum(1 for p in ptr.values() if p.get("sim_ar_vs_T1") == 1.0)},
              "chapters": ptr})
    if old_total and old_total != 3570:
        issues.append(dict(kind="lineage_runtime", severity="info", where="T1-old partA..F",
                           detail=f"chapter durations in partB..E sum to {old_total} s ({old_total // 60}:{old_total % 60:02d}); recon/lineage call it the 59:30 version",
                           refs=["T1-old"]))
    # T2
    rel = f"{SRC['nblm_dir']}/DA_Camp_00_Unified_Narration_Egyptian.md"
    info = src_info(rel)
    txt = read_text(rel)
    narr = "\n".join(ln for ln in txt.split("\n") if ln.strip() and not ln.lstrip().startswith(("#", "*", "|", ">", "---")))
    info["words"] = words(txt)
    info["narration_words"] = words(narr)
    T.append({"id": "T2", "name": "Unified Egyptian narration (25 parts)", "lang": ["ar-EG"], "runtime": "~117 min (P00 table)",
              "role": "semantic map for S4", "files": [info], "lineage": {"derived_from": "T3 (narration lines of the 351 scenes)"},
              "parts": {f"P{int(k):02d}": {"file": info["path"], "line": v} for k, v in _heading_pointers(txt, r"^## الجزء (\d\d) — ").items()}})
    # T3
    files = [src_info(SRC["unified"])]
    parts_ptr = {}
    for p in nblm_parts:
        if p["part"] == 0:
            continue
        parts_ptr[f"P{p['part']:02d}"] = {"file": p["src"]["path"], "file_id": p["src"]["file_id"], "scenes": p["scene_count"],
                                         "narration_words": p["narration_words"]}
        files.append(dict(p["src"]))
    T.append({"id": "T3", "name": "NotebookLM source set: 25 parts + unified master", "lang": ["ar-EG"], "role": "visual directions for Deep-Dives",
              "files": files, "lineage": {"unified_is_superset": True, "see": "corpus/canon/nblm_parts.json"}, "parts": parts_ptr})
    # T4
    t4 = []
    for name in ("DA_Camp_28min_Narration_Egyptian_Arabic_V2.md", "DA_Camp_24min_Narration_Egyptian_Arabic.md", "DA_Camp_28min_V2_Integration_Notes.md"):
        recs = find_paths(lambda pth, n=name: pth.endswith("/" + n))
        for r in recs[:1]:
            txt = read_text(r["canonical"])
            heads = [(i, ln[3:].strip()) for i, ln in enumerate(txt.split("\n"), 1) if re.match(r"^## \d\d\. ", ln)]
            t4.append({"path": r["canonical"], "file_id": r["file_id"], "copies": len(r["paths"]), "bytes": r["bytes"],
                       "words": words(txt), "chapters": [{"line": i, "title": h} for i, h in heads]})
    T.append({"id": "T4", "name": "28-min V2 cut (21 chapters) + 24-min cut", "lang": ["ar-EG"], "runtime": "28:00 / 24:00",
              "role": "alternate phrasing, condensed explanations", "files": t4,
              "lineage": {"expanded_into": "T1 (master §13.1: 'expanded here from 28 to 70:05')"}})
    # T5
    t5 = []
    for rel in ("ClaudeAndOthers.zip.d/Claude.zip.d/Claude/Folder 1/DA_Camp_Narration_Script_AR.md",
                "ClaudeAndOthers.zip.d/Claude.zip.d/Claude/Folder 1/DA_Camp_Unified_Illustrative_Video_Master_EN_AR.md"):
        if os.path.exists(os.path.join(EXT, rel)):
            info = src_info(rel)
            txt = read_text(rel)
            info["words"] = words(txt)
            if info["file_id"] == master["file_id"]:
                info["identical_to"] = "T1"
            else:
                _, per, stated = parse_t5(chapters, [])
                info["chapters"] = per
                info["timed_lines"] = sum(v["n_lines"] for v in per.values())
                info["timed_lines_stated"] = stated
                info["chapters_identical_to_T1_plain"] = sum(1 for v in per.values() if v["sim_vs_T1_plain"] == 1.0)
                info["timed_lines_in"] = "corpus/canon/cues_70m05.json#ar_lines_t5"
            t5.append(info)
    T.append({"id": "T5", "name": "Claude film Arabic narration script", "lang": ["ar-EG"], "role": "likely script for S2 (confirm with ASR)",
              "files": t5, "lineage": {"chapters_follow": "T1 CH-00..CH-36 headings"}})
    # T6 — TTS-clean variants (per chapter), compared with T1 narration
    groups = [
        ("elevenlabs_en", lambda pth: "/elevenlabs_da_camp_70m05/chapters_en/" in pth, r"(CH-\d\d)_EN\.txt$", "en"),
        ("elevenlabs_ar", lambda pth: "/elevenlabs_da_camp_70m05/chapters_ar/" in pth, r"(CH-\d\d)_AR\.txt$", "ar"),
        ("arabic_voice_package", lambda pth: "/arabic_voice_package/arabic_voice_package/" in pth and pth.endswith(".txt"), r"(CH-\d\d)_(AR|EN)\.txt$", None),
        ("dacamp_tts", lambda pth: "/dacamp/tts/" in pth and pth.endswith(".txt"), r"(CH-\d\d)_(\d)\.txt$", "ar"),
    ]
    t6files, t6ch = [], collections.defaultdict(dict)
    totals = {}
    for gname, pred, rx, lang in groups:
        recs = find_paths(pred)
        tot = {"files": 0, "words": 0, "identical_to_T1": 0, "identical_to_T1_plain": 0}
        seen_ch = {}
        for r in recs:
            pth = next(p for p in r["paths"] if pred(p))
            m = re.search(rx, pth)
            if not m:
                continue
            cid = m.group(1)
            lg = lang or ("ar" if m.group(2) == "AR" else "en")
            txt = read_text(r["canonical"]).strip()
            key = f"{gname}:{lg}"
            ent = seen_ch.setdefault((cid, lg), {"file": [], "words": 0, "text": []})
            ent["file"].append(r["canonical"])
            ent["words"] += words(txt)
            ent["text"].append(txt)
            tot["files"] += 1
            tot["words"] += words(txt)
            _ = key
        for (cid, lg), ent in sorted(seen_ch.items()):
            ref = ch_by.get(cid, {}).get(f"narration_{lg}", "")
            refp = ch_by.get(cid, {}).get(f"narration_{lg}_plain", "")
            joined = " ".join(ent["text"])
            sim = text_similarity(joined, ref) if ref else None
            simp = text_similarity(plain_text(joined), refp) if refp else None
            tot["identical_to_T1"] += int(sim == 1.0)
            tot["identical_to_T1_plain"] += int(simp == 1.0)
            t6ch[cid][f"{gname}:{lg}"] = {"files": ent["file"], "words": ent["words"], "sim_vs_T1": sim, "sim_vs_T1_plain": simp}
        totals[gname] = tot
        t6files.append({"group": gname, "files": tot["files"], "words": tot["words"], "chapter_lang_pairs": len(seen_ch),
                        "identical_to_T1": tot["identical_to_T1"], "identical_to_T1_plain": tot["identical_to_T1_plain"]})
    # csv manifests with word counts
    csvs = []
    for name in ("chapter_manifest.csv", "chapter_voice_timing.csv"):
        for r in find_paths(lambda pth, n=name: pth.endswith("/" + n))[:1]:
            import csv
            import io
            rows = list(csv.DictReader(io.StringIO(read_text(r["canonical"]))))
            csvs.append({"path": r["canonical"], "file_id": r["file_id"], "copies": len(r["paths"]), "rows": len(rows), "columns": list(rows[0].keys()) if rows else []})
            if name == "chapter_voice_timing.csv":
                ar = sum(int(x.get("ar_word_count") or 0) for x in rows)
                en = sum(int(x.get("en_word_count") or 0) for x in rows)
                csvs[-1].update(ar_words=ar, en_words=en)
                for x in rows:
                    cid = f"CH-{int(x['chapter']):02d}"
                    c = ch_by.get(cid)
                    if c and (int(x["ar_word_count"]) != c["narration_ar_words"] or int(x["en_word_count"]) != c["narration_en_words"]):
                        issues.append(dict(kind="word_count_differs", severity="info", where=f"chapter_voice_timing.csv {cid}",
                                           detail=f"csv ar/en {x['ar_word_count']}/{x['en_word_count']} vs master {c['narration_ar_words']}/{c['narration_en_words']}",
                                           refs=[cid]))
    for name in ("DA_Camp_70m05_ElevenLabs_ENGLISH_TTS.txt", "DA_Camp_70m05_ElevenLabs_EGYPTIAN_ARABIC_TTS.txt",
                 "DA_Camp_70m05_ENGLISH_Chaptered_Reference.txt", "DA_Camp_70m05_EGYPTIAN_ARABIC_Chaptered_Reference.txt"):
        for r in find_paths(lambda pth, n=name: pth.endswith("/" + n))[:1]:
            csvs.append({"path": r["canonical"], "file_id": r["file_id"], "copies": len(r["paths"]), "words": words(read_text(r["canonical"]))})
    T.append({"id": "T6", "name": "TTS-cleaned chapter scripts (ElevenLabs pack, arabic_voice_package, dacamp/tts)", "lang": ["en", "ar-EG"],
              "role": "speech-clean text for forced alignment", "files": t6files + csvs,
              "lineage": {"tts_clean_of": "T1", "stated_words": {"ar": 6753, "en": 8751},
                          "T1_words": {"ar": sum(c["narration_ar_words"] for c in chapters), "en": sum(c["narration_en_words"] for c in chapters)}},
              "chapters": dict(sorted(t6ch.items()))})
    # T7
    t7 = []
    for name in ("DA_Camp_NotebookLM_Visual_Video_Master_Egyptian_Arabic.md", "DA_Camp_28min_Merged_Video_Master_Source.md",
                 "DA_Camp_NotebookLM_Visual_Video_Master.md"):
        for r in find_paths(lambda pth, n=name: pth.endswith("/" + n))[:1]:
            txt = read_text(r["canonical"])
            t7.append({"path": r["canonical"], "file_id": r["file_id"], "copies": len(r["paths"]), "bytes": r["bytes"], "words": words(txt),
                       "headings": sum(1 for ln in txt.split("\n") if re.match(r"^#{1,6} ", ln)),
                       "lang": "ar-EG" if "Egyptian" in name else "en+ar-EG"})
    T.append({"id": "T7", "name": "Merged 'visual video masters'", "lang": ["ar-EG", "en"], "role": "visual ideas; Arabic phrasing of the patterns",
              "files": t7, "lineage": {"unified_into": "T1 (master §13.1)"}})
    return {"scripts": T, "trunk_script": "T1"}


T5_REL = "ClaudeAndOthers.zip.d/Claude.zip.d/Claude/Folder 1/DA_Camp_Narration_Script_AR.md"


def parse_t5(chapters, issues):
    """T5: '**mm:ss** — text' lines per '## CH-NN' block, on the 70:05 film timeline."""
    if not os.path.exists(os.path.join(EXT, T5_REL)):
        return [], {}, None
    txt = read_text(T5_REL)
    ch_by = {c["id"]: c for c in chapters}
    lines_out, per, cur = [], {}, None
    hour, wraps = 0, []
    for n, ln in enumerate(txt.split("\n"), 1):
        m = re.match(r"^## (CH-\d\d) · ", ln)
        if m:
            cur = m.group(1)
            per[cur] = {"line": n, "n_lines": 0, "text": []}
            continue
        m = re.match(r"^\*\*(\d+):(\d\d)\*\* — (.*)$", ln)
        if m and cur:
            raw = (int(m.group(1)) * 60 + int(m.group(2))) * 1000
            if lines_out and raw + hour < lines_out[-1]["start_ms"] - 1800000:
                hour += 3600000  # T5 writes mm:ss without hours; it wraps at 60:00 (from CH-32)
                wraps.append(f"{cur} line {n}")
            t = raw + hour
            lines_out.append({"i": len(lines_out) + 1, "chapter": cur, "start_ms": t, "text": m.group(3).strip(), "line": n})
            per[cur]["n_lines"] += 1
            per[cur]["text"].append(m.group(3).strip())
    for cid, v in per.items():
        joined = plain_text(" ".join(v.pop("text")))
        v["words"] = words(joined)
        ref = ch_by.get(cid, {}).get("narration_ar_plain", "")
        v["sim_vs_T1_plain"] = text_similarity(joined, ref) if ref else None
        c = ch_by.get(cid)
        if c:
            outside = [x for x in lines_out if x["chapter"] == cid and not (c["start_ms"] <= x["start_ms"] < c["end_ms"])]
            if outside:
                issues.append(dict(kind="t5_line_outside_chapter", severity="info", where=f"T5 {cid}",
                                   detail=f"{len(outside)} timed lines fall outside the master window {c['start_ms']}-{c['end_ms']} ms", refs=[cid]))
    if wraps:
        issues.append(dict(kind="t5_timestamp_wrap", severity="info", where="T5 " + ", ".join(wraps),
                           detail="timestamps are mm:ss without hours and wrap at 60:00; unwrapped (+3600 s) in cues_70m05.json#ar_lines_t5",
                           refs=["T5"]))
    m = re.search(r"(\d+) سطر تعليق", txt)
    stated = int(m.group(1)) if m else None
    if stated is not None and stated != len(lines_out):
        issues.append(dict(kind="count_mismatch", where="T5 header", detail=f"header says {stated} lines, parsed {len(lines_out)}", refs=["T5"]))
    return lines_out, per, stated


# ---------------------------------------------------------------- main
def _inputs():
    rels = [SRC["master"], SRC["unified"], SRC["story"]] + [p for _, p in SRC["cues"]] + SRC["old_parts"]
    rels += sorted(os.path.join(SRC["nblm_dir"], f) for f in os.listdir(os.path.join(EXT, SRC["nblm_dir"]))
                   if re.match(r"DA_Camp_Part_\d\d_of_25_.*\.md$", f))
    rels += [T5_REL] if os.path.exists(os.path.join(EXT, T5_REL)) else []
    rels += [f"{SRC['film_dir']}/{n}" for n in ("scenes_a.py", "scenes_b.py", "scenes_c.py", "scenes_d.py", "scenes_common.py", "patterns.py", "engine.py")]
    code = [os.path.join(os.path.dirname(os.path.abspath(__file__)), n) for n in ("canon.py", "canon_md.py", "canon_src.py")]
    out = []
    for r in rels:
        out.append({"path": r, "sha256": C.sha256_file(os.path.join(EXT, r))})
    for c in code:
        out.append({"path": C.rel(c), "sha256": C.sha256_file(c)})
    cat = C.p("corpus", "catalog", "files.jsonl")
    if os.path.exists(cat):
        out.append({"path": C.rel(cat), "sha256": C.sha256_file(cat)})
    return out


def _sev(issues):
    for i in issues:
        i.setdefault("severity", "contradiction" if i["kind"] in (
            "artifact_none", "prediction_none", "act_without_prediction", "act_names_differ", "3d_scene_without_p19",
            "count_mismatch", "policy_differs", "runtime_map_mismatch", "duration_mismatch", "shotlist_length_mismatch",
            "runtime_total_mismatch", "arithmetic_check_failed", "ambiguous_label", "3d_not_permitted") else "info")
    return issues


def run(force=False, quiet=False):
    inputs = _inputs()
    outs = [C.rel(os.path.join(OUT, n)) for n in OUTPUTS]
    if M.should_skip(OUT, "canon", inputs, outs, force):
        if not quiet:
            print("dc corpus canon: inputs unchanged, outputs present — skipped (use --force)")
        return 0
    issues = []
    mtxt = read_text(SRC["master"])
    msrc = src_info(SRC["master"])
    docs, iss = parse_master(mtxt)
    issues += iss
    chapters = docs["chapters"]["chapters"]
    # label sets: aggregate into one info item (technical labels stay Latin in both cuts, §0.3)
    lab = [c for c in chapters if len(c.get("labels_en") or []) != len(c.get("labels_ar") or [])]
    issues = [i for i in issues if i["kind"] != "label_count_mismatch"]
    if lab:
        issues.append(dict(kind="label_sets_differ", severity="info", where="§8 On-screen labels EN vs AR",
                           detail=(f"{len(lab)} of {len(chapters)} chapters list fewer AR than EN labels (EN {sum(len(c['labels_en']) for c in chapters)}, "
                                   f"AR {sum(len(c['labels_ar']) for c in chapters)}). Most missing ones are technical or numeric labels kept Latin per §0.3, "
                                   "but some carry English explanatory words (e.g. CH-03 EN '1 byte = 8 bits = 256 values' and 'UTF-8' have no AR entry). "
                                   "The Arabic typographer decides per label."),
                           refs=[c["id"] for c in lab]))
    # old master (T1-old), for lineage
    old = {}
    try:
        otxt = "\n".join(read_text(r) for r in SRC["old_parts"])
        odocs, _ = parse_master(otxt)
        old = {c["id"]: c for c in odocs["chapters"]["chapters"]}
    except Exception as e:  # noqa: BLE001
        issues.append(dict(kind="lineage_parse_failed", severity="info", where="T1-old", detail=str(e)[:200], refs=["T1-old"]))
    # NotebookLM
    part_files = []
    for f in sorted(os.listdir(os.path.join(EXT, SRC["nblm_dir"]))):
        m = re.match(r"DA_Camp_Part_(\d\d)_of_25_.*\.md$", f)
        if m:
            rel = f"{SRC['nblm_dir']}/{f}"
            part_files.append((int(m.group(1)), read_text(rel).split("\n"), src_info(rel)))
    scenes, parts = build_nblm(part_files, read_text(SRC["unified"]).split("\n"), src_info(SRC["unified"]), issues)
    # aggregate per-scene info items to keep the list readable
    multi = [i for i in issues if i["kind"] == "nblm_scene_onscreen_count"]
    issues = [i for i in issues if i["kind"] != "nblm_scene_onscreen_count"]
    if multi:
        issues.append(dict(kind="nblm_scene_onscreen_count", severity="info", where="NotebookLM scenes",
                           detail=f"{len(multi)} scenes carry != 1 🎬 block: " + ", ".join(i["where"] for i in multi), refs=[i["where"] for i in multi]))
    # cues
    cues = build_cues([(lab_, read_text(p), src_info(p)) for lab_, p in SRC["cues"]], issues)
    ov = [i for i in issues if i["kind"] == "cue_overlap"]
    issues = [i for i in issues if i["kind"] != "cue_overlap"]
    if ov:
        issues.append(dict(kind="cue_overlap", severity="info", where="DA_CAPTIONS_EN", detail=f"{len(ov)} overlapping caption pairs", refs=["C"]))
    t5_lines, _, _ = parse_t5(chapters, issues)
    cues["ar_lines_t5"] = t5_lines
    cues["counts"]["ar_lines_t5"] = len(t5_lines)
    if t5_lines:
        cues["sources"].append(dict(src_info(T5_REL), label="T5_AR_timed_script", n_scenes=0, n_captions=len(t5_lines)))
    if cues["counts"]["captions"] != 637:
        issues.append(dict(kind="count_mismatch", where="DA_CAPTIONS_EN", detail=f"expected 637 cues, parsed {cues['counts']['captions']}", refs=["C"]))
    for s in cues["scenes"]:
        c = next((x for x in chapters if x["id"] == s["id"]), None)
        if c and (s["start_ms"] != c["start_ms"] or s["end_ms"] != c["end_ms"]):
            issues.append(dict(kind="cue_window_differs", severity="info", where=f"DA_SCENES {s['id']}",
                               detail=f"{s['start_ms']}-{s['end_ms']} vs master {c['start_ms']}-{c['end_ms']}", refs=[s["id"]]))
    # legacy
    fd = SRC["film_dir"]
    film_files = [(n, read_text(f"{fd}/{n}"), src_info(f"{fd}/{n}")) for n in ("scenes_a.py", "scenes_b.py", "scenes_c.py", "scenes_d.py")]
    story = json.loads(read_text(SRC["story"]))
    shots, lpat = build_legacy(film_files, read_text(f"{fd}/engine.py"), read_text(f"{fd}/scenes_common.py"), story,
                               src_info(SRC["story"]), read_text(f"{fd}/patterns.py"), src_info(f"{fd}/patterns.py"), issues)
    lpat["story_vs_master_beat_title_diffs"] = compare_story_master(story, chapters, issues)
    film_per_ch = collections.Counter(r["chapter"] for r in shots if r["source"] == "film")
    lpat["counts"]["film_chapters"] = len(film_per_ch)
    # scripts registry
    scripts = build_scripts(chapters, old, parts, issues)
    _sev(issues)
    # write
    prov = {"path": msrc["path"], "file_id": msrc["file_id"]}
    head = {"v": 1, "source": prov, "generated_by": "dc corpus canon"}
    payload = {
        "chapters.json": dict(head, **docs["chapters"]),
        "data_contract.json": dict(head, **docs["data_contract"]),
        "glossary.json": dict(head, **docs["glossary"], nblm_terms=[dict(t, part=f"P{p['part']:02d}") for p in parts if p["part"] for t in p.get("terms", [])]),
        "coverage_index.json": dict(head, **docs["coverage_index"]),
        "assets_registry.json": dict(head, **docs["assets_registry"]),
        "patterns.json": dict(head, **docs["patterns"]),
        "scene_contract.json": dict(head, **docs["scene_contract"]),
        "motion.json": dict(head, **docs["motion"]),
        "spec.json": dict(head, **docs["spec"]),
        "nblm_parts.json": {"v": 1, "generated_by": "dc corpus canon", "parts": parts},
        "cues_70m05.json": dict({"v": 1, "generated_by": "dc corpus canon"}, **cues),
        "legacy_patterns.json": dict({"v": 1, "generated_by": "dc corpus canon"}, **lpat),
        "scripts.json": dict({"v": 1, "generated_by": "dc corpus canon"}, **scripts),
    }
    for i, it in enumerate(issues, 1):
        it["id"] = f"K{i:03d}"
    payload["contradictions.json"] = {"v": 1, "generated_by": "dc corpus canon", "note": "Preserved, never silently fixed; Council rules (ADR-008).",
                                      "counts": dict(collections.Counter(i["severity"] for i in issues)), "items": issues}
    os.makedirs(OUT, exist_ok=True)
    for name, doc in payload.items():
        C.write_json(os.path.join(OUT, name), doc)
    C.write_jsonl(os.path.join(OUT, "nblm_scenes.jsonl"), scenes)
    C.write_jsonl(os.path.join(OUT, "legacy_shots.jsonl"), shots)
    # validate every output against its schema (same rules the PostToolUse hook applies)
    errs = []
    for n in OUTPUTS:
        relp = C.rel(os.path.join(OUT, n))
        rule = S.rule_for(relp)
        if not rule:
            errs.append(f"{relp}: no schema rule in harness/schemas/paths.json")
            continue
        errs += S.validate_file(os.path.join(OUT, n), rule)
    if errs:
        print("SCHEMA ERRORS:\n  " + "\n  ".join(errs[:30]), file=sys.stderr)
        return 2
    counts = {
        "chapters": len(chapters), "shots": docs["chapters"]["totals"]["shots"], "data_facts": len(docs["data_contract"]["facts"]),
        "data_checks_ok": sum(c["ok"] for c in docs["data_contract"]["checks"]), "data_checks": len(docs["data_contract"]["checks"]),
        "glossary_gloss": len(docs["glossary"]["first_mention_gloss"]), "always_english": len(docs["glossary"]["always_english"]),
        "pronunciation": len(docs["glossary"]["pronunciation"]), "term_chips": len(docs["glossary"]["term_chips"]),
        "coverage_domains": len(docs["coverage_index"]["domains"]), "gaps": len(docs["coverage_index"]["gaps"]),
        "primers": len(docs["coverage_index"]["primers"]), "assets": len(docs["assets_registry"]["assets"]),
        "permitted_3d": len(docs["assets_registry"]["permitted_3d"]), "patterns": len(docs["patterns"]["patterns"]),
        "nblm_scenes": sum(1 for s in scenes if s["kind"] == "scene"), "nblm_intro": sum(1 for s in scenes if s["kind"] == "intro"),
        "nblm_parts": len(parts) - 1, "cue_scenes": cues["counts"]["scenes"], "cue_captions": cues["counts"]["captions"],
        "legacy_film_shots": lpat["counts"]["film_shots"], "legacy_story_beats": lpat["counts"]["story_beats"],
        "legacy_renderers": lpat["counts"]["renderers"], "film_shots_with_unresolved": lpat["counts"]["film_shots_with_unresolved"],
        "scripts": len(scripts["scripts"]), "issues": dict(collections.Counter(i["severity"] for i in issues)),
    }
    M.write(OUT, "canon", "python3 -I tools/dc.py corpus canon", inputs, outs, extra={"counts": counts})
    if not quiet:
        print(json.dumps(counts, ensure_ascii=False))
    return 0


def cmd_canon(args):
    return run(force=getattr(args, "force", False), quiet=getattr(args, "quiet", False))
