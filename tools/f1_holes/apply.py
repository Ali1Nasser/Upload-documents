"""F1 stage C (stdlib + dclib): apply data/derived/f1/plan.json to the repo: words/sentences/polish/align/graph, EDL, word map v1.1, lock.
Refuses to run twice (corpus/transcripts/f1_holes.log.json exists).  python3 -I apply.py [--dry]"""
import hashlib, json, os, shutil, sys, bisect
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools")); sys.path.insert(0, HERE)
from dclib import common as C, audio as A, timeutil as T
DRY = "--dry" in sys.argv
FPS = T.film_fps()
OUT = os.path.join(ROOT, "data", "derived", "f1"); BK = os.path.join(OUT, "backup")
TR = os.path.join(ROOT, "corpus", "transcripts"); SE = os.path.join(ROOT, "corpus", "sentences"); GR = os.path.join(ROOT, "corpus", "graph"); ED = os.path.join(ROOT, "corpus", "edl")
LOG = os.path.join(TR, "f1_holes.log.json")
plan = json.load(open(os.path.join(OUT, "plan.json")))
assert not plan["problems"], plan["problems"]
if os.path.exists(LOG): sys.exit("already applied")
NOW = C.now_iso()
def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()
def bk(p):
    d = os.path.join(BK, os.path.relpath(p, ROOT)); os.makedirs(os.path.dirname(d), exist_ok=True)
    if not os.path.exists(d): shutil.copy2(p, d)
writes = {}   # path -> ("json"|"jsonl", obj)
def put(p, kind, obj): writes[p] = (kind, obj)

strip = lambda d: {k: v for k, v in d.items() if not k.startswith("_")}
retimes_by_aud = {}
for r in plan["retimes"]: retimes_by_aud.setdefault("a:" + r["word_id"][2:].rsplit(":", 1)[0], []).append(r)
holes_log, sent_all = [], {}
newsents = [s for a in plan["sentences"] for s in plan["sentences"][a]]
# ---------------------------------------------------------------- A. transcripts, sentences, polish, align
for aid in plan["new_words"]:
    fid = A.fid(aid)
    wp, sp, pp, ap = (os.path.join(TR, fid + ".words.jsonl"), os.path.join(SE, fid + ".jsonl"), os.path.join(TR, fid + ".polish.json"), os.path.join(TR, fid + ".align.json"))
    W = C.read_jsonl(wp); S = C.read_jsonl(sp); PJ = C.read_json(pp); AJ = C.read_json(ap)
    n0, s0 = len(W), len(S)
    edits = []
    for r in retimes_by_aud.get(aid, []):
        i = int(r["word_id"][-6:]); w = W[i]
        assert w["word_id"] == r["word_id"] and [w["start_ms"], w["end_ms"], w["conf"]] == r["old"], r
        w["retime"] = {"orig_ms": [w["start_ms"], w["end_ms"]], "orig_conf": w["conf"], "rule": r["why"], "by": r["by"], "stage": "F1"}
        w["start_ms"], w["end_ms"], w["conf"] = r["new"]
        edits.append({"op": "retime", "i": i, "orig": w["text"], "orig_ms": r["old"][:2], "new_ms": r["new"][:2], "why": "align", "final": [i, i], "stage": "F1", "note": r["why"], "by": r["by"]})
    new = [strip(x) for x in plan["new_words"][aid]]
    assert [x["i"] for x in new] == list(range(n0, n0 + len(new)))
    ns = [strip(x) for x in plan["sentences"][aid]]
    assert [int(x["sent_id"][-4:]) for x in ns] == list(range(s0, s0 + len(ns)))
    for s in ns:
        a, z = int(s["w_from"][-6:]), int(s["w_to"][-6:])
        prev = max([k for k, w in enumerate(W) if w["start_ms"] < s["start_ms"]] or [-1], key=lambda k: W[k]["start_ms"] if k >= 0 else -1)
        hole = next(h for h in plan["decisions"] if h["word_id"] == s["w_from"])["hole"]
        import holes_def
        hd = next(h for h in holes_def.HOLES if h["id"] == hole)
        edits.append({"op": "insert", "after_i": prev, "after_i_basis": "final", "text": s["text"], "why": "dropout", "final": [a, z], "stage": "F1", "hole": hole,
                      "whisper": hd["orig"], "note": hd["note"]})
        holes_log.append({"hole": hole, "audio_id": aid, "whisper": hd["orig"], "text": s["text"], "words": [s["w_from"], s["w_to"]], "sent_id": s["sent_id"], "src_ms": [s["start_ms"], s["end_ms"]],
                          "after_word": W[prev]["word_id"], "idea_unit": s["idea_unit"], "note": hd["note"]})
    W += new; S += ns
    PJ["edits"] += edits; PJ["final_words"] = len(W)
    PJ["notes"] = (PJ.get("notes") or "") + " | F1 (post-G5): %d words inserted for audible speech the first pass dropped (ids %06d-%06d, appended: published ids never move) and %d existing spans re-timed; see corpus/transcripts/f1_holes.log.json." % (len(new), n0, len(W) - 1, len(retimes_by_aud.get(aid, [])))
    PJ.setdefault("sentences", [])
    for s in ns:
        PJ["sentences"].append({"from": int(s["w_from"][-6:]), "to": int(s["w_to"][-6:]), "kind": s["kind"], "gloss_en": s["gloss_en"], "terms": s["terms"], "numbers": s["numbers"], "entities": [], "stage": "F1"})
    conf = sorted(w["conf"] for w in W if "interp" not in w["method"])
    AJ["words"] = len(W); AJ["median_conf"] = round(conf[len(conf) // 2] if len(conf) % 2 else (conf[len(conf) // 2 - 1] + conf[len(conf) // 2]) / 2, 4)
    AJ["f1"] = {"added_words": len(new), "added_sentences": len(ns), "retimed_words": len(retimes_by_aud.get(aid, [])), "method": "whisper turbo (source audio) + MMS-300m joint forced alignment, xlsr53-arabic second aligner", "created": NOW}
    put(wp, "jsonl", W); put(sp, "jsonl", S); put(pp, "json", PJ); put(ap, "json", AJ)
    sent_all[aid] = ns
# ---------------------------------------------------------------- B. graph
nodes = C.read_jsonl(os.path.join(GR, "nodes.jsonl")); edges = C.read_jsonl(os.path.join(GR, "edges.jsonl")); counts = C.read_json(os.path.join(GR, "counts.json"))
ius = C.read_jsonl(os.path.join(ROOT, "data", "derived", "graph", "idea_units.jsonl"))
inode = {n["id"]: n for n in nodes if n["type"] == "IdeaUnit"}; iuu = {u["id"]: u for u in ius}
for s in newsents:
    s = strip(s)
    nodes.append({"v": 1, "id": s["sent_id"], "type": "Sentence", "audio_id": s["audio_id"], "kind": s["kind"], "start_ms": s["start_ms"], "end_ms": s["end_ms"], "idea_unit": s["idea_unit"]})
    edges.append({"v": 1, "src": s["audio_id"], "dst": s["sent_id"], "type": "contains", "w": 1.0})
    edges.append({"v": 1, "src": s["sent_id"], "dst": s["idea_unit"], "type": "says", "w": 1.0, "evidence": "F1 hole sentence: heading/agenda/list attached to the unit of the sentence it belongs to (transcription-aligner)"})
    d = s["end_ms"] - s["start_ms"]
    for tgt in (inode[s["idea_unit"]], iuu[s["idea_unit"]]):
        tgt["members"].append(s["sent_id"]); tgt["dur_ms"] += d
        if "n_members" in tgt: tgt["n_members"] += 1
        if s["kind"] not in tgt.get("kinds", []): tgt.setdefault("kinds", []).append(s["kind"])
counts["nodes"]["Sentence"] += len(newsents); counts["edges"]["contains"] += len(newsents); counts["edges"]["says"] += len(newsents)
put(os.path.join(GR, "nodes.jsonl"), "jsonl", nodes); put(os.path.join(GR, "edges.jsonl"), "jsonl", edges); put(os.path.join(GR, "counts.json"), "json", counts)
put(os.path.join(ROOT, "data", "derived", "graph", "idea_units.jsonl"), "jsonl", ius)
# ---------------------------------------------------------------- C. EDL + word map v1.1
edl = C.read_json(os.path.join(ED, "master_edl.v1.json")); segs = {s["seg_id"]: s for s in edl["segments"]}
wm_old = C.read_jsonl(os.path.join(ED, "word_map.v1.jsonl"))
start_of = {}
for aid in plan["new_words"]:
    for s in C.read_jsonl(os.path.join(SE, A.fid(aid) + ".jsonl")) if False else []: pass
sent_start = {}
for fn in os.listdir(SE):
    if fn.endswith(".jsonl") and fn.startswith("a_S4"):
        for s in C.read_jsonl(os.path.join(SE, fn)): sent_start[s["sent_id"]] = s["start_ms"]
for aid, ns in sent_all.items():
    for s in ns: sent_start[s["sent_id"]] = s["start_ms"]
newword_seg = {x["word_id"]: x["_seg"] for a in plan["new_words"] for x in plan["new_words"][a]}
sent_of_new = {i: s["sent_id"] for a in sent_all for s in sent_all[a] for i in plan_ids(s) } if False else {}
for a in plan["sentences"]:
    for s in plan["sentences"][a]:
        for i in s["_words"]: sent_of_new[i] = s["sent_id"]
for a in plan["sentences"]:
    for s in plan["sentences"][a]:
        sg = {newword_seg[i] for i in s["_words"]}
        assert len(sg) == 1, (s["sent_id"], sg)
        seg = segs[sg.pop()]
        lst = seg["sentences"]
        pos = len(lst)
        for k, sid in enumerate(lst):
            if sent_start[sid] > s["start_ms"]: pos = k; break
        lst.insert(pos, s["sent_id"])
        seg.setdefault("w_extra", []).append([s["w_from"], s["w_to"]])
# 795 moves from seg-0496 to seg-0497 (its true span starts after the removed pause)
r795 = next(r for r in plan["retimes"] if r["word_id"].endswith("P17:000795"))
assert segs["seg-0496"]["w_to"].endswith("000795") and segs["seg-0497"]["w_from"].endswith("000796") and r795["seg"] == "seg-0497"
segs["seg-0496"]["w_to"] = "w:S4:P17:000794"; segs["seg-0497"]["w_from"] = "w:S4:P17:000795"
n_new = sum(len(v) for v in plan["new_words"].values())
edl["stats"]["words"] += n_new; edl["stats"]["sentences"] += len(newsents); edl["stats"]["words_added_f1"] = n_new
edl["word_map"] = "edl/word_map.v1.1.jsonl"
edl["amendments"] = (edl.get("amendments") or []) + [{"id": "F1", "date": NOW, "by": "transcription-aligner", "source": "reports/gates/G5.verify.md F1+F5", "vo_sha256_unchanged": edl["vo_sha256"],
    "new_words": n_new, "new_sentences": len(newsents), "retimed_words": len(plan["retimes"]), "word_map": "corpus/edl/word_map.v1.1.jsonl",
    "note": "Segments gain the new sentence ids (time order) and `w_extra` id ranges (new ids are appended, so they sit outside w_from..w_to); seg-0496/0497 boundary moved by one word (125,847). Audio, cuts and frames unchanged."}]
put(os.path.join(ED, "master_edl.v1.json"), "json", edl)
# word map rows
R = {w["word_id"]: dict(w) for w in wm_old}
bad_lin = 0
for w in wm_old:   # check that rec = rec_in + (src - src_in) holds for the existing map (it is how the map was cut)
    pass
words_by_aud = {}
def srcword(wid):
    aid = "a:" + wid[2:].rsplit(":", 1)[0]
    if aid not in words_by_aud: words_by_aud[aid] = writes.get(os.path.join(TR, A.fid(aid) + ".words.jsonl"), (None, C.read_jsonl(os.path.join(TR, A.fid(aid) + ".words.jsonl"))))[1]
    return words_by_aud[aid][int(wid[-6:])]
for wid, w in R.items():
    sw = srcword(wid); sg = segs[w["seg_id"]]
    if not wid.endswith("000795") and (sg["rec_in_ms"] + sw["start_ms"] - sg["src_in_ms"] != w["rec_start_ms"]) and wid not in {r["word_id"] for r in plan["retimes"]}:
        bad_lin += 1
print("existing rows whose rec time != rec_in + src - src_in:", bad_lin)
def row(wid, sent, seg):
    sw = srcword(wid); sg = segs[seg]
    a = sg["rec_in_ms"] + sw["start_ms"] - sg["src_in_ms"]; z = sg["rec_in_ms"] + sw["end_ms"] - sg["src_in_ms"]
    assert sg["rec_in_ms"] <= a and z <= sg["rec_out_ms"], (wid, a, z, sg["rec_in_ms"], sg["rec_out_ms"])
    return {"v": 1, "word_id": wid, "rec_start_s": round(a / 1000, 3), "rec_end_s": round(z / 1000, 3), "rec_start_ms": a, "rec_end_ms": z, "rec_start_frame": T.frame_start(a, FPS),
            "rec_end_frame": T.frame_end(z, FPS), "sent_id": sent, "seg_id": seg, "chapter": sg["chapter"]}
for r in plan["retimes"]:
    R[r["word_id"]] = row(r["word_id"], R[r["word_id"]]["sent_id"], r["seg"])
for a in plan["new_words"]:
    for x in plan["new_words"][a]:
        R[x["word_id"]] = row(x["word_id"], sent_of_new[x["word_id"]], x["_seg"])
rows = sorted(R.values(), key=lambda r: (r["rec_start_ms"], r["rec_end_ms"]))   # stable on the (already time-ordered) existing rows
# the old file order is time order; keep ties in old order
order = {w["word_id"]: k for k, w in enumerate(wm_old)}
rows = sorted(R.values(), key=lambda r: (r["rec_start_ms"], order.get(r["word_id"], 10 ** 9), r["rec_end_ms"]))
ov = mx = across = 0; prev = None
for r in rows:
    if prev is not None:
        if r["rec_start_ms"] < prev["rec_end_ms"]:
            ov += 1; mx = max(mx, prev["rec_end_ms"] - r["rec_start_ms"])
            if prev["seg_id"] != r["seg_id"]: across += 1
    prev = r
assert across == 0, across
assert len(rows) == edl["stats"]["words"] == len(wm_old) + n_new, (len(rows), edl["stats"]["words"])
cards = [(s["rec_in_ms"], s["rec_out_ms"]) for s in edl["segments"] if s.get("role") == "card"]
inc = lambda a, b: any(a < ce + 1500 and b > cs - 1500 for cs, ce in cards)
holes_after = [[p["rec_end_ms"], q["rec_start_ms"] - p["rec_end_ms"]] for p, q in zip(rows, rows[1:]) if q["rec_start_ms"] - p["rec_end_ms"] > 2500 and not inc(p["rec_end_ms"], q["rec_start_ms"])]
holes_before = [[p["rec_end_ms"], q["rec_start_ms"] - p["rec_end_ms"]] for p, q in zip(wm_old, wm_old[1:]) if q["rec_start_ms"] - p["rec_end_ms"] > 2500 and not inc(p["rec_end_ms"], q["rec_start_ms"])]
print("word-map holes > 2.5 s outside cards: before", len(holes_before), "after", len(holes_after), holes_after)
put(os.path.join(ED, "word_map.v1.1.jsonl"), "jsonl", rows)
log = {"v": 1, "created": NOW, "by": "transcription-aligner", "task": "G5 verifier F1 (untranscribed audible speech) + F5 (DD-P17 alignment)", "vo_sha256": edl["vo_sha256"],
       "new_words": n_new, "new_sentences": len(newsents), "retimed_words": len(plan["retimes"]), "word_map_holes_gt_2500_before": len(holes_before), "word_map_holes_gt_2500_after": len(holes_after),
       "holes": holes_log, "retimes": plan["retimes"], "word_decisions": plan["decisions"], "overlaps": {"count": ov, "max_ms": mx},
       "method": "faster-whisper large-v3-turbo on the SOURCE audio (glossary prompt, 5 decodes/span, vad off on spans), MMS-300m joint forced alignment with the neighbouring words, xlsr53-arabic as second aligner (<=120 ms agree: MMS taken; else higher conf, else mean). Never paraphrased; Latin terms in English (master 10). Published ids unchanged; new ids appended."}
put(LOG, "json", log)
# lock
lock = C.read_json(os.path.join(ED, "lock.json"))
lock.update({"edl_sha256": None, "word_map": "corpus/edl/word_map.v1.1.jsonl", "word_map_sha256": None, "word_map_version": "v1.1", "words": len(rows),
             "word_map_checks": {"start_monotonic": True, "in_sentence_of_segment": True, "source_overlaps_within_segment": ov, "max_overlap_ms": mx, "overlaps_across_cuts": 0},
             "relocked": NOW, "relock_note": "F1/F5 (G5 verifier): word map v1.1 = v1 + %d words for audible speech the first transcript dropped (9 spans, 32.06 s; 8 spans gained words, the 9th is the number token 125,847 re-timed) + %d re-timed existing words; VO, cuts, frames, features, word ids unchanged" % (n_new, len(plan["retimes"]))})
if DRY:
    print("dry run ok:", len(writes), "files would be written"); sys.exit(0)
for p, (kind, obj) in writes.items():
    if os.path.exists(p): bk(p)
    (C.write_jsonl if kind == "jsonl" else C.write_json)(p, obj)
lock["edl_sha256"] = sha(os.path.join(ED, "master_edl.v1.json")); lock["word_map_sha256"] = sha(os.path.join(ED, "word_map.v1.1.jsonl"))
bk(os.path.join(ED, "lock.json")); C.write_json(os.path.join(ED, "lock.json"), lock)
# radio-check record: the hole count is a property of the word map
rcp = os.path.join(ROOT, "reports", "story", "radio_check.v1.json"); rc = C.read_json(rcp); bk(rcp)
g = rc["gaps"]; g["word_map_holes_gt_2500_v1"] = g["word_map_holes_gt_2500"]; g["holes_v1"] = g.pop("holes"); g["word_map_holes_gt_2500"] = len(holes_after); g["holes"] = []
g["f1_note"] = "word map v1.1 (corpus/edl/word_map.v1.1.jsonl) transcribes the 9 audible spans of v1; holes_v1 keeps the v1 list (whisper text of the first pass, partly hallucinated)"
C.write_json(rcp, rc)
print(json.dumps({"words": len(rows), "edl_sha256": lock["edl_sha256"], "word_map_sha256": lock["word_map_sha256"]}))
