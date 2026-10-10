"""F1 stage B (queued, venv): decide times/ids/features for the hole words -> data/derived/f1/plan.json (no repo file is touched).
python -I plan.py"""
import json, os, sys, statistics as ST
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools")); sys.path.insert(0, HERE)
import numpy as np
from dclib import common as C, audio as A, polish as P, textnorm as TN
from holes_def import HOLES, RETIME
OUT = os.path.join(ROOT, "data", "derived", "f1")

def pick(m, x):
    """-> (start, end, conf, by, disagreement_ms)"""
    if m and x:
        d = max(abs(m[0] - x[0]), abs(m[1] - x[1]))
        if d <= 120:
            return m[0], m[1], m[2], "mms(agree)", d
        if abs(m[2] - x[2]) >= 0.1:
            c, by = (m, "mms") if m[2] > x[2] else (x, "xlsr53")
            return c[0], c[1], c[2], by + "(higher conf)", d
        return (m[0] + x[0]) // 2, (m[1] + x[1]) // 2, round((m[2] + x[2]) / 2, 3), "mean", d
    c = m or x
    return c[0], c[1], c[2], "single", None

def main():
    AJ = json.load(open(os.path.join(OUT, "holes_align.json")))
    F5 = {f["id"]: f for f in json.load(open(os.path.join(OUT, "f5_flag.json")))}
    edl = C.read_json(os.path.join(ROOT, "corpus", "edl", "master_edl.v1.json"))
    segs_by_aud = {}
    for s in edl["segments"]:
        if s.get("audio_id"): segs_by_aud.setdefault(s["audio_id"], []).append(s)
    def seg_of(aid, a, b):
        c = [s for s in segs_by_aud[aid] if s["src_in_ms"] <= a and b <= s["src_out_ms"]]
        return c[0] if len(c) == 1 else None
    plan = {"new_words": {}, "retimes": [], "sentences": {}, "decisions": [], "problems": []}
    retime = {}
    # --- existing-word time corrections
    r = {x["text"]: x for x in AJ["H1"]["rows"]}
    w = [x for x in AJ["H1"]["rows"] if x["old"] and x["old"][0].endswith("000265")][0]
    retime[w["old"][0]] = dict(new=pick(None, w["w2v"]), why="F1: stray 20 ms span (conf .14) in a heading; xlsr53 and whisper agree on 114.08-114.40 s")
    for wid in ("000241", "000299", "000307", "000334", "000363", "000770", "000855"):
        f = F5["w:S4:P17:" + wid]
        mm, wx = f["mms"], f["w2v"]
        if wid == "000334": mm = [148420, 148700, 0.018]
        retime[f["id"]] = dict(new=pick(mm, wx), why="F5: sentence-window MMS and xlsr53 agree (<=120 ms) and differ from the stored span by > 150 ms")
    h8 = {x["text"]: x for x in AJ["H8"]["rows"] if x["new"]}["125,847"]
    retime["w:S4:P17:000795"] = dict(new=pick(h8["mms"], h8["w2v"]), why="F1/F5: spoken number 'مية خمسة وعشرين ألف تمنمية سبعة وأربعين' occupies 369.92-372.26 s (both aligners); stored span was 200 ms on the previous word")
    # --- new words
    byaud = {}
    for h in HOLES: byaud.setdefault(h["aid"], []).append(h)
    for aid, hs in byaud.items():
        fid = A.fid(aid)
        W = C.read_jsonl(os.path.join(ROOT, "corpus", "transcripts", fid + ".words.jsonl"))
        S0 = C.read_jsonl(os.path.join(ROOT, "corpus", "sentences", fid + ".jsonl"))
        old = [dict(x) for x in W]
        for x in old:
            if x["word_id"] in retime:
                n = retime[x["word_id"]]["new"]; x["start_ms"], x["end_ms"] = n[0], n[1]
        grp = {}
        for h in hs: grp.setdefault(h["id"][:2] if h["id"].startswith("H5") else h["id"], []).append(h)
        N = len(W); newW = []; newS = []
        for gid, ghs in grp.items():
            rows = [x for x in AJ[gid]["rows"] if x["new"]]
            k = 0
            for h in ghs:
                first = N + len(newW); sw = []
                for tok in h["new"]:
                    row = rows[k]; k += 1
                    assert row["text"] == tok, (row["text"], tok)
                    s, e, cf, by, d = pick(row["mms"], row["w2v"])
                    e = max(e, s + 20)
                    if newW and sw and s < sw[-1]["end_ms"] and False: pass
                    isterm, isnum = P.word_flags(tok)
                    if h["id"] in ("H5a", "H5b") and tok in ("واحد", "اتنين"): isnum = True
                    rec = {"v": 1, "word_id": f"w:{aid.split(':')[1]}:{aid.split(':', 2)[2]}:{N + len(newW):06d}", "audio_id": aid, "i": N + len(newW), "text": tok,
                           "norm": TN.fold(tok) or tok, "start_ms": int(s), "end_ms": int(e), "conf": round(float(cf), 4), "method": "asr+mms_fa", "is_term": isterm, "term": None,
                           "is_number": isnum, "polish": {"orig": "", "rule": "dropout", "orig_i": None, "stage": "F1", "hole": h["id"]}}
                    sg = seg_of(aid, s, e)
                    if sg is None:
                        plan["problems"].append(f"{rec['word_id']} {tok} {s}-{e} not inside exactly one kept segment")
                    else:
                        rec["_seg"] = sg["seg_id"]; rec["_margin_ms"] = [s - sg["src_in_ms"], sg["src_out_ms"] - e]
                    plan["decisions"].append({"word_id": rec["word_id"], "hole": h["id"], "text": tok, "mms": row["mms"], "xlsr53": row["w2v"], "chosen": [s, e, cf], "by": by, "disagree_ms": d})
                    newW.append(rec); sw.append(rec)
                last = N + len(newW) - 1
                # time-order monotonicity inside the hole
                for a, b in zip(sw, sw[1:]):
                    if b["start_ms"] < a["start_ms"]: plan["problems"].append(f"non-monotonic {a['word_id']} {b['word_id']}")
                prev_end = max([x["end_ms"] for x in old if x["start_ms"] < sw[0]["start_ms"]] or [0])
                txt = " ".join(x["text"] for x in sw)
                terms = [P.term_slug(t) for t in h["terms"] if P.term_slug(t)]
                newS.append({"v": 1, "sent_id": f"s:{aid.split(':')[1]}:{aid.split(':', 2)[2]}:{len(S0) + len(newS):04d}", "audio_id": aid,
                              "w_from": f"w:{aid.split(':')[1]}:{aid.split(':', 2)[2]}:{first:06d}", "w_to": f"w:{aid.split(':')[1]}:{aid.split(':', 2)[2]}:{last:06d}",
                              "start_ms": sw[0]["start_ms"], "end_ms": sw[-1]["end_ms"], "pause_before_ms": max(0, sw[0]["start_ms"] - prev_end), "text": txt,
                              "gloss_en": h["gloss"], "kind": h["kind"], "numbers": list(h.get("numbers", [])), "terms": terms, "entities": [], "impact_words": [],
                              "idea_unit": h["iu"], "script_match": None, "added": "F1-holes", "hole": h["id"], "_words": [x["word_id"] for x in sw]})
        # --- prosody / prominence of the new words against the part's existing distribution
        allw = old + newW
        feats = P.prosody(aid, allw)
        fo, fn = feats[:len(old)], feats[len(old):]
        def stat(vals):
            arr = np.array([v for v in vals if v is not None], dtype=float)
            return float(arr.mean()), float(arr.std()) or 1.0, float(np.median(arr))
        keys = ["rms_db", "f0_range_st", "dur_pc"]
        st = {k: stat([f[k] for f in fo]) for k in keys}
        def z(f, k):
            mu, sd, med = st[k]; v = f[k]
            return ((v if v is not None else med) - mu) / sd
        comp_o = np.array([0.4 * z(f, "rms_db") + 0.3 * z(f, "f0_range_st") + 0.3 * z(f, "dur_pc") for f in fo])
        cm, cs = float(comp_o.mean()), float(comp_o.std()) or 1.0
        pz_old = (comp_o - cm) / cs
        stored = np.array([x["pz"] for x in old])
        plan.setdefault("pz_repro", {})[aid] = round(float(np.corrcoef(np.clip(pz_old, -3, 5), stored)[0, 1]), 4)
        for rec, f in zip(newW, fn):
            c = 0.4 * z(f, "rms_db") + 0.3 * z(f, "f0_range_st") + 0.3 * z(f, "dur_pc")
            rec["pz"] = round(float(max(-3.0, min(5.0, (c - cm) / cs))), 2)
            lc = P.lex_class(rec); rec["lex"] = lc
            rec["prominence"] = round(rec["pz"] + (P.BONUS[lc] if lc else 0.0), 2)
        byid = {x["word_id"]: x for x in newW}
        for s in newS:
            ws = [byid[i] for i in s["_words"]]
            cands = sorted([x for x in ws if not P.is_stop(x) and x["conf"] >= 0.2], key=lambda x: -x["prominence"])
            pick_ = [x for x in cands if x["prominence"] >= 1.2][:3] or cands[:1] or sorted([x for x in ws if not P.is_stop(x)] or ws, key=lambda x: -x["prominence"])[:1]
            s["impact_words"] = [x["word_id"] for x in sorted(pick_, key=lambda x: x["i"])]
        plan["new_words"][aid] = newW
        plan["sentences"][aid] = newS
    for wid, r_ in retime.items():
        aid = "a:" + wid[2:].rsplit(":", 1)[0]
        W = C.read_jsonl(os.path.join(ROOT, "corpus", "transcripts", A.fid(aid) + ".words.jsonl"))
        o = W[int(wid[-6:])]
        n = r_["new"]
        sg = seg_of(aid, n[0], n[1])
        plan["retimes"].append({"word_id": wid, "text": o["text"], "old": [o["start_ms"], o["end_ms"], o["conf"]], "new": [int(n[0]), int(max(n[1], n[0] + 20)), round(float(n[2]), 4)],
                                "by": n[3], "why": r_["why"], "seg": sg["seg_id"] if sg else None})
        if sg is None: plan["problems"].append(f"retime {wid} {n[0]}-{n[1]} not inside one kept segment")
    json.dump(plan, open(os.path.join(OUT, "plan.json"), "w"), ensure_ascii=False, indent=1)
    print("new words", {a: len(v) for a, v in plan["new_words"].items()}, "sentences", {a: len(v) for a, v in plan["sentences"].items()}, "retimes", len(plan["retimes"]))
    print("pz reproduction corr", plan["pz_repro"]); print("problems", plan["problems"])
    for a, v in plan["new_words"].items():
        for x in v: print(x["word_id"], x["text"], x["start_ms"], x["end_ms"], x["conf"], x.get("_seg"), x.get("_margin_ms"), x["pz"], x["lex"], x["prominence"])
    for a, v in plan["sentences"].items():
        for s in v: print(s["sent_id"], s["text"], s["start_ms"], s["end_ms"], s["pause_before_ms"], s["impact_words"], s["terms"])
    for r_ in plan["retimes"]: print("retime", r_["word_id"][2:], r_["text"], r_["old"], "->", r_["new"], r_["by"], r_["seg"])
main()
