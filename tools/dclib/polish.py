"""dc asr pack | polish-apply | sentences | emphasis (docs/plan/03 P3.7-P3.9, 05 sections 3-4).

Flow for S4 (unscripted):  asr.json --pack--> polish pack --(LLM writes out.json)--> polish-apply (edits + MMS forced alignment of the
polished text) --> words.jsonl + align.json + polish log --> sentences --> emphasis.
Flow for S1 (scripted): words.jsonl is final; `pack` groups the aligned words into candidate sentences, the LLM writes gloss outputs,
`sentences` turns them into corpus/sentences/a_S1_ar-natural.jsonl.

Polish out.json (S4 and S1):
  {"edits":[{"i":<asr word index>,"to":"<text, may be several tokens or ''>","why":"term|number|mishear|split|merge"}],
   "insert":[{"after_i":n,"text":"...","why":"dropout"}],
   "sentences":[{"from_i":a,"to_i":b,"kind":"claim|example|question|prediction|transition|recap","gloss_en":"...","terms":[],"numbers":[],"entities":[]}],
   "notes":"..."}
All indices refer to the ORIGINAL pack word indices (S1: word i). The stored `text` keeps the Egyptian spelling; only `norm` is folded.
"""
import bisect
import json
import os
import re
import statistics as S
import sys
import time
import unicodedata

from . import align as AL
from . import audio as A
from . import common as C
from . import queue as Q
from . import scripts as SC
from . import textnorm as TN

POLISH_DIR = C.p("data", "derived", "polish")
TRANS = C.p("corpus", "transcripts")
SENT = C.p("corpus", "sentences")
KINDS = ("claim", "example", "question", "prediction", "transition", "recap")
WHY = ("term", "number", "mishear", "split", "merge", "dropout")
PAUSE_MS = 350
CAP_WORDS = 28
S1 = "a:S1:ar-natural"
S1_BATCHES = [7, 6, 6, 6, 6, 6]
EXCERPT_CHARS = 9000

OUT_FORMAT = ("out.json: {edits:[{i,to,why:term|number|mishear|split|merge}], insert:[{after_i,text,why:dropout}], "
              "sentences:[{from_i,to_i,kind:claim|example|question|prediction|transition|recap,gloss_en,terms,numbers,entities}], notes}; "
              "indices = word indices of this pack; to='' deletes; never paraphrase; Latin technical terms in Latin script (master 10); "
              "sentences must cover every word, in order, <= 28 words each, split at meaning boundaries")


def pack_path(aid):
    return os.path.join(POLISH_DIR, A.fid(aid) + ".pack.json")


def out_path(aid):
    return os.path.join(POLISH_DIR, A.fid(aid) + ".out.json")


def s4_ids():
    return sorted(a["audio_id"] for a in A.registry() if a["family"] == "S4")


def part_of(aid):
    m = re.search(r"P(\d\d)", aid)
    return "P" + m.group(1)


def asr_words(aid):
    """-> (words [{i,text,start_ms,end_ms,p,seg}], segments [{id,start_ms,end_ms,first_i,last_i,text}]) from the whisper asr.json."""
    from . import asr as R
    d = C.read_json(R.asr_path(aid))
    words, segs = [], []
    for s in d["segments"]:
        ws = s["words"]
        if not ws:
            continue
        for w in ws:
            words.append({"i": w["i"], "text": w["text"], "start_ms": w["start_ms"], "end_ms": w["end_ms"], "p": w.get("p", 0.0), "seg": len(segs)})
        segs.append({"id": len(segs), "start_ms": s["start_ms"], "end_ms": s["end_ms"], "first_i": ws[0]["i"], "last_i": ws[-1]["i"], "text": s["text"]})
    for k, w in enumerate(words):
        assert w["i"] == k, "asr word indices must be 0..n-1"
    return words, segs


# ------------------------------------------------------------------ latin terms / source excerpt
LATIN = re.compile(r"[A-Za-z][A-Za-z0-9]*(?:[-_./+][A-Za-z0-9]+)*")


def nblm_rows(part):
    rows = [r for r in C.read_jsonl(C.p("corpus", "canon", "nblm_scenes.jsonl")) if r["part"] == part]
    rows.sort(key=lambda r: int(r["n"]))
    return rows


def latin_terms(part, limit=250):
    g = C.read_json(C.p("corpus", "canon", "glossary.json"))
    always = []
    for t in g.get("always_english", []):
        for sub in str(t).split("/"):
            sub = sub.strip()
            if sub:
                always.append(sub)
    cnt, order = {}, []

    def add(t):
        t = t.strip().strip(".,:;()[]{}\"'`")
        if len(t) < 2 or not re.search(r"[A-Za-z]{2}", t):
            return
        k = t.casefold()
        if k not in cnt:
            cnt[k] = [t, 0]
            order.append(k)
        cnt[k][1] += 1

    for r in nblm_rows(part):
        for t in r.get("terms", []) or []:
            if re.search(r"[A-Za-z]", str(t)):
                add(str(t))
        for field in ("on_screen", "narration", "title"):
            for m in LATIN.findall(r.get(field, "") or ""):
                add(m)
    from_src = sorted(order, key=lambda k: -cnt[k][1])
    seen, out = set(), []
    for t in [cnt[k][0] for k in from_src][:limit] + always:
        if t.casefold() not in seen:
            seen.add(t.casefold())
            out.append(t)
    return out


def source_excerpt(part, limit=EXCERPT_CHARS):
    """Narration of every scene first (it is what the hosts talk about), then on-screen text with whatever budget is left."""
    rows = nblm_rows(part)
    nar = [(r["scene_id"], (r.get("title") or "").strip(), (r.get("narration") or "").strip()) for r in rows]
    scr = [(r["scene_id"], (r.get("on_screen") or "").strip()) for r in rows]
    head = sum(len(f"[{sid}] {t}\n") for sid, t, _ in nar)
    budget = limit - head
    total_n = sum(len(n) for _, _, n in nar)
    cap = None if total_n <= budget * 0.75 else max(200, int(budget * 0.75 / max(1, len(nar))))
    lines, used = [], 0
    for sid, t, n in nar:
        n2 = n if cap is None or len(n) <= cap else n[:cap].rsplit(" ", 1)[0] + " ..."
        lines.append(f"[{sid}] {t}\n{n2}".rstrip())
        used += len(lines[-1]) + 1
    left = limit - used
    extra = []
    if left > 400 and any(s for _, s in scr):
        per = max(120, left // max(1, len(scr)) - 12)
        for sid, s in scr:
            if s:
                s2 = s if len(s) <= per else s[:per].rsplit(" ", 1)[0] + " ..."
                extra.append(f"[{sid} on-screen] {s2}")
    txt = "\n".join(lines)
    if extra:
        txt += "\n--- on-screen text ---\n" + "\n".join(extra)
    return txt[:limit]


def build_s4_pack(aid):
    words, segs = asr_words(aid)
    part = part_of(aid)  # P00b maps to the intro record of P00
    pk = {"audio_id": aid, "part": part, "n_words": len(words),
          "words": [[w["i"], w["text"], w["start_ms"], w["end_ms"], round(w["p"], 2)] for w in words],
          "segments": [[s["first_i"], s["last_i"], s["text"]] for s in segs],
          "latin_terms": latin_terms(part), "source_excerpt": source_excerpt(part),
          "out": C.rel(out_path(aid)), "format": OUT_FORMAT}
    os.makedirs(POLISH_DIR, exist_ok=True)
    C.write_json(pack_path(aid), pk, indent=None)
    return pk


# ------------------------------------------------------------------ candidate sentences
TERMINAL = re.compile(r"[.?!؟…]+[\"')\]»”]*$")


def candidate_split(words, pause_ms=PAUSE_MS, cap=CAP_WORDS):
    """words: dicts with text,start_ms,end_ms. Boundaries: terminal punctuation, pause >= 350 ms, 28-word cap. -> [(a, b)] inclusive."""
    out, a = [], 0
    for k in range(1, len(words) + 1):
        if k == len(words):
            out.append((a, k - 1))
            break
        gap = words[k]["start_ms"] - words[k - 1]["end_ms"]
        if TERMINAL.search(words[k - 1]["text"]) or gap >= pause_ms or (k - a) >= cap:
            out.append((a, k - 1))
            a = k
    return out


def build_s1_packs():
    words = C.read_jsonl(os.path.join(TRANS, A.fid(S1) + ".words.jsonl"))
    chapters = {c["id"]: c for c in C.read_json(C.p("corpus", "canon", "chapters.json"))["chapters"]}
    order = [w["chapter"] for w in SC.chapter_windows_master()]
    by = {}
    for w in words:
        by.setdefault(w["chapter"], []).append(w)
    paths, k0 = [], 0
    for b, n in enumerate(S1_BATCHES, 1):
        chs = order[k0:k0 + n]
        k0 += n
        items = []
        for ch in chs:
            ws = by[ch]
            cands = []
            prev_end = None
            for a, z in candidate_split(ws):
                cands.append({"from_i": ws[a]["i"], "to_i": ws[z]["i"], "start_ms": ws[a]["start_ms"], "end_ms": ws[z]["end_ms"],
                              "pause_before_ms": 0 if prev_end is None else max(0, ws[a]["start_ms"] - prev_end),
                              "text": " ".join(x["text"] for x in ws[a:z + 1])})
                prev_end = ws[z]["end_ms"]
            items.append({"chapter": ch, "title_en": chapters[ch]["title_en"], "narration_en": chapters[ch].get("narration_en_plain", ""),
                          "first_i": ws[0]["i"], "last_i": ws[-1]["i"], "candidates": cands})
        pk = {"audio_id": S1, "batch": b, "of": len(S1_BATCHES), "chapters": items,
              "note": "word i = from_i + k for the k-th space-separated token of a candidate's text; merge or split candidates by meaning "
                      "(sentences must cover every word of every chapter in order, <= 28 words, never cross a chapter); edits/insert stay empty for S1 "
                      "(the script is authoritative); gloss_en = faithful one-sentence English gloss (use the chapter's English narration as the reference)",
              "out": C.rel(os.path.join(POLISH_DIR, f"S1_batch_{b}.out.json")), "format": OUT_FORMAT}
        p = os.path.join(POLISH_DIR, f"S1_batch_{b}.pack.json")
        os.makedirs(POLISH_DIR, exist_ok=True)
        C.write_json(p, pk, indent=None)
        paths.append(p)
    return paths


def cmd_pack(args):
    aid = args.audio_id
    if aid.lower() in ("s1", "a:s1:ar-natural"):
        ps = build_s1_packs()
        print(json.dumps({"s1_packs": [C.rel(p) for p in ps], "bytes": [os.path.getsize(p) for p in ps]}))
        return 0
    ids = s4_ids() if aid.lower() in ("s4", "all-s4", "all") else [aid]
    done = []
    for a in ids:
        if A.by_id(a)["family"] != "S4":
            C.fail("pack: S4 audio ids or 's1'/'s4'", 2)
        pk = build_s4_pack(a)
        done.append((C.rel(pack_path(a)), os.path.getsize(pack_path(a)), pk["n_words"], len(pk["latin_terms"]), len(pk["source_excerpt"])))
    for d in done:
        print("pack", *d)
    return 0


# ------------------------------------------------------------------ out.json validation and application
def validate_out(out, n_words, s1=False):
    """-> (errors, warnings)."""
    err, warn = [], []
    if not isinstance(out, dict):
        return ["out.json must be an object"], warn
    ed = out.get("edits") or []
    seen = set()
    for k, e in enumerate(ed):
        if not isinstance(e, dict) or not isinstance(e.get("i"), int) or not isinstance(e.get("to"), str):
            err.append(f"edits[{k}]: need int i and string to")
            continue
        if not 0 <= e["i"] < n_words:
            err.append(f"edits[{k}]: i={e['i']} out of range 0..{n_words - 1}")
        if e.get("why") not in WHY:
            warn.append(f"edits[{k}]: why={e.get('why')!r} not in {WHY}")
        if e["i"] in seen:
            err.append(f"edits[{k}]: word {e['i']} edited twice")
        seen.add(e["i"])
    for k, e in enumerate(out.get("insert") or []):
        if not isinstance(e, dict) or not isinstance(e.get("after_i"), int) or not isinstance(e.get("text"), str) or not e["text"].strip():
            err.append(f"insert[{k}]: need int after_i and non-empty text")
        elif not -1 <= e["after_i"] < n_words:
            err.append(f"insert[{k}]: after_i={e['after_i']} out of range")
    prev = -1
    for k, s in enumerate(out.get("sentences") or []):
        if not isinstance(s, dict) or not isinstance(s.get("from_i"), int) or not isinstance(s.get("to_i"), int):
            err.append(f"sentences[{k}]: need int from_i,to_i")
            continue
        if not (0 <= s["from_i"] <= s["to_i"] < n_words):
            err.append(f"sentences[{k}]: bad range {s['from_i']}..{s['to_i']}")
        if s["from_i"] <= prev:
            err.append(f"sentences[{k}]: overlaps or is out of order (from_i {s['from_i']} <= previous to_i {prev})")
        prev = max(prev, s["to_i"])
        if s.get("kind") not in KINDS:
            warn.append(f"sentences[{k}]: kind={s.get('kind')!r} -> claim")
    return err, warn


def apply_edits(words, out):
    """words: [{i,text,...}] (original ASR). Returns tokens [{text, anchor, orig_i, polish}] and the edit log.
    anchor = original index the token hangs on (inserted tokens: after_i, -1 -> 0), used to remap sentence ranges."""
    edits = {e["i"]: e for e in (out.get("edits") or [])}
    ins = {}
    for e in out.get("insert") or []:
        ins.setdefault(e["after_i"], []).append(e)
    toks, log = [], []

    def push_ins(after):
        for e in ins.get(after, []):
            why = e.get("why") if e.get("why") in WHY else "dropout"
            first = len(toks)
            for t in unicodedata.normalize("NFC", e["text"]).split():
                if re.search(r"\w", t):
                    toks.append({"text": t, "anchor": max(after, 0), "orig_i": None, "before": after < 0, "polish": {"orig": "", "rule": why, "orig_i": None}})
            log.append({"op": "insert", "after_i": after, "text": e["text"], "why": why, "final": [first, len(toks) - 1] if len(toks) > first else None})

    push_ins(-1)
    for w in words:
        i = w["i"]
        e = edits.get(i)
        if e is None:
            toks.append({"text": w["text"], "anchor": i, "orig_i": i, "polish": None})
        else:
            why = e.get("why") if e.get("why") in WHY else "mishear"
            new = [t for t in unicodedata.normalize("NFC", e["to"]).split() if re.search(r"\w", t)]
            if new == [w["text"]]:
                toks.append({"text": w["text"], "anchor": i, "orig_i": i, "polish": None})
            elif not new:
                if why == "merge" and toks and toks[-1]["polish"] and toks[-1]["polish"]["rule"] == "merge" and toks[-1]["orig_i"] is not None:
                    toks[-1]["polish"]["orig"] += " " + w["text"]
                    toks[-1]["polish"]["orig_i"] = [toks[-1]["polish"]["orig_i"], i] if not isinstance(toks[-1]["polish"]["orig_i"], list) else toks[-1]["polish"]["orig_i"] + [i]
                log.append({"op": "delete", "i": i, "orig": w["text"], "why": why, "final": None})
            else:
                first = len(toks)
                for t in new:
                    toks.append({"text": t, "anchor": i, "orig_i": i, "polish": {"orig": w["text"], "rule": why, "orig_i": i}})
                log.append({"op": "replace", "i": i, "orig": w["text"], "to": " ".join(new), "why": why, "final": [first, len(toks) - 1]})
        push_ins(i)
    return toks, log


def remap_sentences(out, toks):
    """Original-index sentence ranges -> final token index ranges. Returns (sentences, notes)."""
    anchors = [t["anchor"] for t in toks]
    res, notes = [], []
    prev_end = -1
    for k, s in enumerate(out.get("sentences") or []):
        lo = bisect.bisect_left(anchors, s["from_i"])
        hi = bisect.bisect_right(anchors, s["to_i"]) - 1
        lo = max(lo, prev_end + 1)
        if lo > hi:
            notes.append(f"sentence {k} ({s['from_i']}..{s['to_i']}) is empty after polishing: dropped")
            continue
        prev_end = hi
        res.append({"from": lo, "to": hi, "kind": s.get("kind") if s.get("kind") in KINDS else "claim", "gloss_en": (s.get("gloss_en") or "").strip(),
                    "terms": list(s.get("terms") or []), "numbers": list(s.get("numbers") or []), "entities": list(s.get("entities") or [])})
    return res, notes


# ------------------------------------------------------------------ forced alignment of the polished text
def _segment_groups(toks, words, segs):
    seg_of = [w["seg"] for w in words]
    groups = {}
    for k, t in enumerate(toks):
        groups.setdefault(seg_of[min(t["anchor"], len(seg_of) - 1)], []).append(k)
    return groups


def align_tokens(aid, toks, words, segs, threads):
    """Force-align token texts over the part's audio, one ASR segment at a time (+-0.5 s). -> (rows [(s_ms,e_ms,conf,method)], seg_report)."""
    import numpy as np
    import torch
    AL.set_threads(threads)
    em = AL.emissions_cached(aid)
    AL.vocab_uroman()
    total_s = em.shape[0] * AL.STRIDE
    groups = _segment_groups(toks, words, segs)
    rows = [None] * len(toks)
    rep = []
    for s in sorted(groups):
        idx = groups[s]
        seg = segs[s]
        st, en = seg["start_ms"] / 1000.0, seg["end_ms"] / 1000.0
        prev_end = segs[s - 1]["end_ms"] / 1000.0 if s > 0 else 0.0
        next_start = segs[s + 1]["start_ms"] / 1000.0 if s + 1 < len(segs) else total_s
        lo = (prev_end + st) / 2 if prev_end < st else st - 0.25
        hi = (en + next_start) / 2 if en < next_start else en + 0.25
        t0 = max(0.0, st - 0.5, min(lo, st - 0.05))
        t1 = min(total_s, en + 0.5, max(hi, en + 0.05))
        ins_after = any(toks[k]["orig_i"] is None and not toks[k].get("before") and toks[k]["anchor"] == seg["last_i"] for k in idx)
        ins_before = any(toks[k].get("before") for k in idx)
        if ins_after:
            t1 = max(t1, next_start - 0.1)
        if ins_before:
            t0 = prev_end
        sur = [AL.spoken(toks[k]["text"]) for k in idx]
        f0 = max(0, int(t0 / AL.STRIDE))
        f1 = min(em.shape[0], int(t1 / AL.STRIDE))
        info = {"seg": s, "n": len(idx), "window_s": [round(t0, 2), round(t1, 2)]}
        try:
            sl = torch.from_numpy(em[f0:f1].astype(np.float32))
            res = AL.forced_align_slice(sl, sur)
            part = []
            for r in res:
                if r is None:
                    part.append(None)
                else:
                    fs, fe, cf, _ = AL.word_span(r)
                    part.append((int(round((f0 + fs) * AL.STRIDE * 1000)), int(round((f0 + fe) * AL.STRIDE * 1000)), cf, "asr+mms_fa"))
            for j, k in enumerate(idx):
                rows[k] = part[j]
            cf = [r[2] for r in part if r]
            info["median_conf"] = round(S.median(cf), 3) if cf else 0.0
        except Exception as e:  # noqa: BLE001  fall back to the whisper times of this segment
            info["fallback"] = str(e)[:80]
            span = max(1, len(idx))
            for j, k in enumerate(idx):
                w = words[toks[k]["orig_i"]] if toks[k]["orig_i"] is not None else None
                if w:
                    rows[k] = (w["start_ms"], max(w["end_ms"], w["start_ms"] + 20), 0.0, "asr")
                else:
                    a = seg["start_ms"] + (seg["end_ms"] - seg["start_ms"]) * j // span
                    rows[k] = (a, a + 20, 0.0, "asr+interp")
            info["median_conf"] = 0.0
        rep.append(info)
    # tokens without an alignment (empty surrogate): interpolate between neighbours
    for k, r in enumerate(rows):
        if r is None:
            prev = next((rows[j] for j in range(k - 1, -1, -1) if rows[j]), None)
            nxt = next((rows[j] for j in range(k + 1, len(rows)) if rows[j]), None)
            a = prev[1] if prev else (nxt[0] if nxt else 0)
            b = nxt[0] if nxt else a + 20
            rows[k] = (a, max(a + 20, b), 0.0, "asr+mms_fa+interp")
    return rows, rep


def term_slug(t):
    s = re.sub(r"[^a-z0-9]+", "-", str(t).casefold()).strip("-")
    return "c:" + s if s else None


def word_flags(text):
    latin = [m for m in re.findall(r"[A-Za-z][A-Za-z0-9\-]*", text) if len(m) >= 2]
    return bool(latin), bool(re.search(r"\d", text)) or bool(re.search(r"[٠-٩]", text))


def cmd_warm(args):
    """Cache the MMS emissions of S4 parts (the bulk of the alignment compute) so polish-apply only has to run the CTC trellis."""
    ids = s4_ids() if args.audio_id.lower() in ("all", "all-s4") else args.audio_id.split(",")
    if not args.inline and not Q.in_queue():
        n = max(1, args.jobs)
        jobs = []
        for k in range(n):
            part = ids[k::n]
            if part:
                jobs.append(Q.submit(f"polish-warm-{k + 1}of{n}", [sys.executable, "-I", C.p("tools", "dc.py"), "asr", "polish-apply", ",".join(part), "--warm", "--inline",
                                                                  "--threads", str(args.threads)], mem_gb=2.0, expected_gb=0.1)["tsp_id"])
        print(json.dumps(jobs))
        return 0
    AL.set_threads(args.threads)
    for a in ids:
        t0 = time.time()
        em = AL.emissions_cached(a)
        print(f"warm {a}: {em.shape[0]} frames [{time.time() - t0:.0f}s]", flush=True)
    return 0


def cmd_polish_apply(args):
    if args.warm:
        return cmd_warm(args)
    aid = args.audio_id
    if aid.lower() in ("all", "all-s4"):
        ids = [a for a in s4_ids() if os.path.exists(out_path(a))]
        if not ids:
            C.fail("no out.json files found in " + C.rel(POLISH_DIR), 2)
    else:
        ids = [aid]
    jobs = []
    for a in ids:
        op = args.out or out_path(a)
        if not os.path.exists(op):
            C.fail(f"{C.rel(op)} missing (write it from {C.rel(pack_path(a))})", 2)
        words, segs = asr_words(a)
        out = C.read_json(op)
        err, warn = validate_out(out, len(words))
        for w in warn:
            print(f"warn {a}: {w}", file=sys.stderr)
        if err:
            C.fail(f"{a}: out.json invalid:\n  " + "\n  ".join(err[:20]), 2)
        if not args.inline and not Q.in_queue():
            extra = ["--inline", "--threads", str(args.threads)] + (["--out", args.out] if args.out else []) + (["--dest", args.dest] if args.dest else []) \
                + (["--no-align"] if args.no_align else [])
            job = Q.submit(f"polish-{a.split(':', 1)[1]}", [sys.executable, "-I", C.p("tools", "dc.py"), "asr", "polish-apply", a] + extra, mem_gb=2.0, expected_gb=0.1)
            jobs.append(job["tsp_id"])
            continue
        apply_one(a, words, segs, out, args)
    if jobs:
        print(json.dumps(jobs))
    return 0


def apply_one(aid, words, segs, out, args):
    dest = args.dest or TRANS
    os.makedirs(dest, exist_ok=True)
    toks, log = apply_edits(words, out)
    sents, notes = remap_sentences(out, toks)
    n_edit = sum(1 for e in log if e["op"] != "insert")
    if toks and n_edit / len(words) > 0.25:
        print(f"warn {aid}: {n_edit} of {len(words)} words edited ({100 * n_edit / len(words):.0f} %): check that nothing was paraphrased", file=sys.stderr)
    t0 = time.time()
    if args.no_align:
        rows = [(words[t["orig_i"]]["start_ms"], words[t["orig_i"]]["end_ms"], words[t["orig_i"]]["p"], "asr") if t["orig_i"] is not None else (0, 20, 0.0, "asr+interp")
                for t in toks]
        seg_rep = []
    else:
        rows, seg_rep = align_tokens(aid, toks, words, segs, args.threads)
    fam, slug = aid.split(":")[1], aid.split(":", 2)[2]
    recs, fixed, prev_s = [], 0, 0
    for k, (t, r) in enumerate(zip(toks, rows)):
        s_ms, e_ms = r[0], r[1]
        if s_ms < prev_s:
            s_ms, fixed = prev_s, fixed + 1
        e_ms = max(e_ms, s_ms + 20)
        prev_s = s_ms
        is_term, is_num = word_flags(t["text"])
        recs.append({"v": 1, "word_id": f"w:{fam}:{slug}:{k:06d}", "audio_id": aid, "i": k, "text": t["text"], "norm": TN.fold(t["text"]) or t["text"],
                     "start_ms": int(s_ms), "end_ms": int(e_ms), "conf": round(max(0.0, min(1.0, r[2])), 4), "method": r[3],
                     "is_term": is_term, "term": None, "is_number": is_num, "polish": t["polish"]})
    C.write_jsonl(os.path.join(dest, A.fid(aid) + ".words.jsonl"), recs)
    confs = [x["conf"] for x in recs if "interp" not in x["method"]]
    flagged = [f"seg{s['seg']}" for s in seg_rep if "fallback" in s or s.get("median_conf", 1) < 0.3]
    rep = {"v": 1, "audio_id": aid, "method": "asr+mms_fa", "words": len(recs), "median_conf": round(S.median(confs), 4) if confs else 0.0,
           "chapters": [], "flagged": flagged, "boundary_overlaps": [],
           "asr_words": len(words), "asr_segments": len(segs),
           "polish": {"edits": sum(1 for e in log if e["op"] == "replace"), "deletes": sum(1 for e in log if e["op"] == "delete"),
                      "inserts": sum(1 for e in log if e["op"] == "insert"), "inserted_words": sum(1 for t in toks if t["orig_i"] is None),
                      "edit_rate": round(n_edit / max(1, len(words)), 4), "sentences": len(sents), "notes": notes},
           "alignment": {"segments_aligned": sum(1 for s in seg_rep if "fallback" not in s), "segments_fallback": [s for s in seg_rep if "fallback" in s],
                         "low_conf_words_lt_0.3": sum(1 for c in confs if c < 0.3), "monotonic_fixes": fixed,
                         "latin_words": sum(1 for x in recs if x["is_term"]),
                         "latin_median_conf": round(S.median([x["conf"] for x in recs if x["is_term"] and "interp" not in x["method"]] or [0]), 4),
                         "seconds": round(time.time() - t0, 1)},
           "created": C.now_iso()}
    C.write_json(os.path.join(dest, A.fid(aid) + ".align.json"), rep)
    C.write_json(os.path.join(dest, A.fid(aid) + ".polish.json"),
                 {"v": 1, "audio_id": aid, "asr_words": len(words), "final_words": len(recs), "edits": log, "notes": out.get("notes", ""),
                  "sentences": sents, "sentence_notes": notes, "created": C.now_iso()})
    if not args.dest:
        A.set_alignment(aid, "asr+mms_fa", rep["median_conf"])
    print(f"polish-apply {aid}: {len(words)} asr words -> {len(recs)} (edits {rep['polish']['edits']}, deletes {rep['polish']['deletes']}, inserted "
          f"{rep['polish']['inserted_words']}), median conf {rep['median_conf']}, sentences {len(sents)}, flagged {flagged}, {rep['alignment']['seconds']}s")
    return rep


# ------------------------------------------------------------------ sentences
def _split_long(words, a, z, cap=CAP_WORDS):
    """Split [a..z] (word indices) into pieces of <= cap words at the biggest pause / punctuation near the middle."""
    n = z - a + 1
    if n <= cap:
        return [(a, z)]
    best, bs = None, -1e9
    for k in range(a + 4, z - 3):
        gap = words[k]["start_ms"] - words[k - 1]["end_ms"]
        score = gap + (400 if TERMINAL.search(words[k - 1]["text"]) else 0) + (150 if re.search(r"[،,؛:;]$", words[k - 1]["text"]) else 0) - 8 * abs((k - a) - n / 2)
        if score > bs:
            best, bs = k, score
    return _split_long(words, a, best - 1, cap) + _split_long(words, best, z, cap)


def build_sentence_records(aid, words, raw, stats):
    """raw: [{from,to,kind,gloss_en,terms,numbers,entities}] over word indices (sorted, non-overlapping). Gaps get auto sentences."""
    fam, slug = aid.split(":")[1], aid.split(":", 2)[2]
    spans, cur = [], 0
    for s in sorted(raw, key=lambda s: s["from"]):
        if s["from"] > cur:
            for a, z in candidate_split(words[cur:s["from"]]):
                spans.append({"from": cur + a, "to": cur + z, "kind": "claim", "gloss_en": "", "terms": [], "numbers": [], "entities": [], "auto": True})
        spans.append(s)
        cur = s["to"] + 1
    if cur < len(words):
        for a, z in candidate_split(words[cur:]):
            spans.append({"from": cur + a, "to": cur + z, "kind": "claim", "gloss_en": "", "terms": [], "numbers": [], "entities": [], "auto": True})
    stats["auto_sentences"] = sum(1 for s in spans if s.get("auto"))
    final = []
    for s in spans:
        pieces = _split_long(words, s["from"], s["to"])
        if len(pieces) > 1:
            stats["cap_splits"] = stats.get("cap_splits", 0) + 1
        for pi, (a, z) in enumerate(pieces):
            txt = " ".join(w["text"] for w in words[a:z + 1])
            low = txt.casefold()

            def keep(lst):
                if len(pieces) == 1:
                    return lst
                got = [x for x in lst if str(x).casefold() in low]
                return got if got or pi else lst
            final.append({"from": a, "to": z, "kind": s["kind"], "gloss_en": s["gloss_en"] if pi == 0 else (s["gloss_en"] + " (cont.)" if s["gloss_en"] else ""),
                          "terms": keep(s["terms"]), "numbers": keep(s["numbers"]), "entities": keep(s["entities"]), "text": txt})
    recs, prev_end = [], 0
    for k, s in enumerate(final):
        ws = words[s["from"]:s["to"] + 1]
        terms, seen = [], set()
        for t in s["terms"] + [m for w in ws if w.get("is_term") for m in re.findall(r"[A-Za-z][A-Za-z0-9\-]*", w["text"]) if len(m) >= 2]:
            c = term_slug(t)
            if c and c not in seen:
                seen.add(c)
                terms.append(c)
        nums = [str(n) for n in s["numbers"]]
        for w in ws:
            if w.get("is_number"):
                for m in re.findall(r"\d[\d,.]*\d|\d", w["text"]):
                    if m not in nums:
                        nums.append(m)
        rec = {"v": 1, "sent_id": f"s:{fam}:{slug}:{k:04d}", "audio_id": aid, "w_from": ws[0]["word_id"], "w_to": ws[-1]["word_id"],
               "start_ms": ws[0]["start_ms"], "end_ms": ws[-1]["end_ms"], "pause_before_ms": max(0, ws[0]["start_ms"] - prev_end), "text": s["text"],
               "gloss_en": s["gloss_en"], "kind": s["kind"], "numbers": nums, "terms": terms, "entities": [str(e) for e in s["entities"]],
               "impact_words": [], "idea_unit": None, "script_match": None}
        if ws[0].get("chapter"):
            rec["chapter"] = ws[0]["chapter"]
        prev_end = ws[-1]["end_ms"]
        recs.append(rec)
    return recs


def s1_raw_sentences(words, stats):
    """Gloss outputs of the six S1 batches -> raw sentence spans over S1 word indices."""
    raw = []
    for b in range(1, len(S1_BATCHES) + 1):
        p = os.path.join(POLISH_DIR, f"S1_batch_{b}.out.json")
        if not os.path.exists(p):
            stats.setdefault("missing_batches", []).append(b)
            continue
        out = C.read_json(p)
        err, warn = validate_out(out, len(words), s1=True)
        if err:
            C.fail(f"S1_batch_{b}.out.json invalid:\n  " + "\n  ".join(err[:10]), 2)
        for s in out.get("sentences") or []:
            raw.append({"from": s["from_i"], "to": s["to_i"], "kind": s.get("kind") if s.get("kind") in KINDS else "claim", "gloss_en": (s.get("gloss_en") or "").strip(),
                        "terms": list(s.get("terms") or []), "numbers": list(s.get("numbers") or []), "entities": list(s.get("entities") or [])})
    raw.sort(key=lambda s: s["from"])
    clean, prev = [], -1
    for s in raw:
        if s["from"] <= prev:
            stats["overlaps_dropped"] = stats.get("overlaps_dropped", 0) + 1
            continue
        # a sentence must not cross a chapter
        ch0, ch1 = words[s["from"]].get("chapter"), words[s["to"]].get("chapter")
        if ch0 != ch1:
            k = s["from"]
            while words[k].get("chapter") == ch0:
                k += 1
            s = dict(s, to=k - 1)
            stats["chapter_cuts"] = stats.get("chapter_cuts", 0) + 1
        clean.append(s)
        prev = s["to"]
    return clean


def cmd_sentences(args):
    aid = args.audio_id
    ids = s4_ids() if aid.lower() in ("all", "all-s4") else [S1 if aid.lower() == "s1" else aid]
    for a in ids:
        wp = os.path.join(args.src or TRANS, A.fid(a) + ".words.jsonl")
        words = C.read_jsonl(wp)
        stats = {}
        if a == S1:
            raw = s1_raw_sentences(words, stats)
        else:
            ap = os.path.join(args.src or TRANS, A.fid(a) + ".polish.json")
            if not os.path.exists(ap):
                C.fail(f"{C.rel(ap)} missing: run `dc asr polish-apply {a}` first", 2)
            raw = [{k: s[k] for k in ("from", "to", "kind", "gloss_en", "terms", "numbers", "entities")} for s in C.read_json(ap)["sentences"]]
        recs = build_sentence_records(a, words, raw, stats)
        dest = args.dest or SENT
        os.makedirs(dest, exist_ok=True)
        C.write_jsonl(os.path.join(dest, A.fid(a) + ".jsonl"), recs)
        wc = [r["w_to"] for r in recs]
        lens = [int(r["w_to"][-6:]) - int(r["w_from"][-6:]) + 1 for r in recs]
        no_gloss = sum(1 for r in recs if not r["gloss_en"])
        print(f"sentences {a}: {len(recs)} sentences over {len(words)} words (max {max(lens)} words, median {S.median(lens)}), no gloss {no_gloss}, {json.dumps(stats)}")
    return 0


# ------------------------------------------------------------------ emphasis
STOP = set(TN.fold(x) for x in """في من على الى إلى عن مع ده دي دا دول ديه ان إن أن انه إنه انها إنها لو لما لسه كده كدا كدة يعني بقى بقي تاني هو هي هم احنا انت انتي انتم
أنا انا ايه إيه ايوه مين فين امتى ازاي إزاي ليه هل لا ما مش ولا او أو و ثم بس لكن اللي اللى الي الذي التي كل كان كانت يكون تكون بيكون هيكون
عشان علشان لان لأن لأنه لانه زي مثل بين بعد قبل عند عندي عندك عنده فيه فيها منه منها له لها ليه ليها لي لك لنا بتاع بتاعة بتاعت حاجة حاجه شوية
هنا هناك كمان برضو برده دلوقتي دلوقت طب اه آه يا اها خلاص تمام اهو أهو اللي ال the a an of to in is it and or for""".split())
CONTRAST = {TN.fold(x) for x in "لكن بس بدل بدلا عكس بالعكس رغم برغم إلا الا غير بالرغم مفيش ماعدا".split()}
CHANGE_ROOTS = [TN.fold(x) for x in """زاد زياد زيد يزيد نقص قلل قل تغير تحول بقت بوظ فشل نجح وقع ضاع ضيع كسر ارتفع انخفض هبط نزل طلع تضاعف تحسن تعطل انهار
كبر صغر سرع بطء اتغير تتغير يتغير بيتغير زودنا زودت قللنا بيزيد بيقل""".split()]
NUM_WORDS = {TN.fold(x) for x in """صفر واحد اتنين اثنين تلاتة ثلاثة اربعة أربعة خمسة ستة سبعة تمانية ثمانية تسعة عشرة احداشر اتناشر عشرين تلاتين اربعين خمسين ستين سبعين
تمانين تسعين ميه مية مائة ميتين تلتميه ربعميه خمسميه الف ألف الفين مليون مليار نص نصف تلت ربع""".split()}
BONUS = {"number": 2.0, "term": 1.5, "contrast": 1.0, "change": 0.8}
_PFX = "بهحيتنامولفك"


def lex_class(w):
    n = w["norm"]
    toks = n.split()
    if w.get("is_number") or any(t in NUM_WORDS for t in toks if t not in ("نص", "تلت", "ربع", "واحد")):
        return "number"
    if w.get("is_term"):
        return "term"
    if any(t in CONTRAST for t in toks):
        return "contrast"
    for t in toks:
        if len(t) >= 3 and not re.match(r"^(ال)?متغير", t):  # 'variable' is not a verb of change
            for r in CHANGE_ROOTS:
                if re.match(rf"^[{_PFX}]{{0,3}}{re.escape(r)}", t):
                    return "change"
    return None


def is_stop(w):
    toks = w["norm"].split()
    return all((t in STOP or len(t) <= 2) for t in toks) and not w.get("is_term") and not w.get("is_number")


def prosody(aid, words):
    """-> per word dict(rms_db, f0_range_st, dur_pc). RMS (25 ms / 10 ms frames, 90th percentile in the word), pitch range (10-90 percentile, semitones)
    via Praat (parselmouth) in 5-min chunks, duration per letter."""
    import numpy as np
    import soundfile as sf
    import librosa
    import parselmouth
    x, sr = sf.read(A.wav16_path(aid), dtype="float32")
    assert sr == 16000
    hop = 160
    rms = librosa.feature.rms(y=x, frame_length=400, hop_length=hop, center=True)[0]
    db = 20 * np.log10(rms + 1e-5)
    nfr = len(db)
    f0 = np.zeros(nfr, dtype=np.float32)
    CH = 300 * sr
    for c0 in range(0, len(x), CH):
        a, b = max(0, c0 - sr), min(len(x), c0 + CH + sr)
        snd = parselmouth.Sound(x[a:b].astype("float64"), sampling_frequency=sr)
        pit = snd.to_pitch(time_step=0.01, pitch_floor=70.0, pitch_ceiling=500.0)
        arr = pit.selected_array["frequency"]
        t = pit.xs() + a / sr
        fr = np.round(t * 100).astype(int)
        for fi, v in zip(fr, arr):
            if c0 / hop <= fi < (c0 + CH) / hop and 0 <= fi < nfr:
                f0[fi] = v
    out = []
    for w in words:
        a = max(0, min(nfr - 1, int(w["start_ms"] / 10)))
        b = max(a + 1, min(nfr, int(np.ceil(w["end_ms"] / 10))))
        seg_db = db[a:b]
        v = f0[a:b]
        v = v[v > 0]
        rng = float(12 * np.log2(np.percentile(v, 90) / np.percentile(v, 10))) if len(v) >= 4 else None
        letters = len(re.sub(r"[^\w]", "", w["norm"])) or 1
        lat = len(re.findall(r"[a-z]", w["norm"]))
        eff = letters - 0.4 * lat
        out.append({"rms_db": float(np.percentile(seg_db, 90)), "f0_range_st": rng, "dur_pc": (w["end_ms"] - w["start_ms"]) / max(1.0, eff)})
    return out


def zscore(vals, default=0.0):
    import numpy as np
    arr = np.array([v for v in vals if v is not None], dtype=float)
    mu, sd = (float(arr.mean()), float(arr.std())) if len(arr) else (0.0, 1.0)
    sd = sd or 1.0
    med = float(np.median(arr)) if len(arr) else 0.0
    return [((v if v is not None else med) - mu) / sd for v in vals]


def cmd_emphasis(args):
    aid = S1 if args.audio_id.lower() == "s1" else args.audio_id
    ids = s4_ids() if aid.lower() in ("all", "all-s4") else [aid]
    for a in ids:
        if not args.inline and not Q.in_queue():
            job = Q.submit(f"emphasis-{a.split(':', 1)[1]}", [sys.executable, "-I", C.p("tools", "dc.py"), "asr", "emphasis", a, "--inline"]
                           + (["--src", args.src] if args.src else []), mem_gb=2.5, expected_gb=0.05)
            print(job["tsp_id"])
            continue
        emphasis_one(a, args)
    return 0


def emphasis_one(aid, args):
    import numpy as np
    wp = os.path.join(args.src or TRANS, A.fid(aid) + ".words.jsonl")
    words = C.read_jsonl(wp)
    feats = prosody(aid, words)
    zr = zscore([f["rms_db"] for f in feats])
    zf = zscore([f["f0_range_st"] for f in feats])
    zd = zscore([f["dur_pc"] for f in feats])
    pz = np.array([0.4 * a + 0.3 * b + 0.3 * c for a, b, c in zip(zr, zf, zd)])
    pz = (pz - pz.mean()) / (pz.std() or 1.0)
    for w, p in zip(words, pz):
        lc = lex_class(w)
        w["pz"] = round(float(max(-3.0, min(5.0, p))), 2)
        w["lex"] = lc
        w["prominence"] = round(w["pz"] + (BONUS[lc] if lc else 0.0), 2)
    C.write_jsonl(wp, words)
    sp = os.path.join(args.sent_src or SENT, A.fid(aid) + ".jsonl")
    n_imp = 0
    if os.path.exists(sp):
        sents = C.read_jsonl(sp)
        for s in sents:
            a, z = int(s["w_from"][-6:]), int(s["w_to"][-6:])
            ws = words[a:z + 1]
            cands = [w for w in ws if not is_stop(w) and w["conf"] >= 0.2]
            cands.sort(key=lambda w: -w["prominence"])
            pick = [w for w in cands if w["prominence"] >= 1.2][:3]
            if not pick and cands and len(ws) >= 4:
                pick = cands[:1]
            s["impact_words"] = [w["word_id"] for w in sorted(pick, key=lambda w: w["i"])]
            n_imp += len(pick)
        C.write_jsonl(sp, sents)
    cls = {}
    for w in words:
        cls[w["lex"]] = cls.get(w["lex"], 0) + 1
    print(f"emphasis {aid}: {len(words)} words, prominence mean {np.mean([w['prominence'] for w in words]):.2f}, lex classes {cls}, impact words {n_imp}"
          + ("" if os.path.exists(sp) else " (no sentences file yet: impact_words not set)"))
    return 0
