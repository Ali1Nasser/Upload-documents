"""dc story cut | radio | radio-check | lock (P5.3-P5.5): master EDL, radio edit, proxy listening checks, audio lock.

cut         (stdlib)  ADR-001 candidate -> corpus/edl/master_edl.vN.json + corpus/edl/word_map.vN.jsonl.
                      Cuts only in word gaps >= 250 ms (word times from corpus/transcripts/*.words.jsonl); room tone kept around
                      each cut: pre = clamp(gap/2, 60, 300) ms before the first onset, post = clamp(gap/2, 90, 300) ms after the last
                      offset, and the far side of the gap keeps >= 90 / >= 60 ms clear of the neighbouring (dropped) word.
                      Pauses > 2.0 s inside kept speech (S1 is cue-timed to the old 70:05 picture) are tightened to 2.0 s at the
                      same kind of cut, so no unplanned gap exceeds 2.5 s. Deep-Dive entry/exit = 2.0 s visual cards (no speech).
                      Record timeline is integer ms; frames only via timeutil (spans: frame_start floor, frame_end ceil).
radio       (venv)    decode 48 kHz mono (soxr), S4 EQ match (corpus/audio/eq_match_s4_to_s1.json, linear-phase FIR), per-block
                      gain to -16 LUFS (BS.1770 gated = speech-gated), 20 ms equal-power fades against a room-tone bed, global trim,
                      look-ahead peak limiter (-1.5 dBFS sample ceiling), FLAC 48 kHz/24-bit. Writes gains + VO hash into the EDL.
radio-check (venv)    0 clipped words (static: every segment's first/last word inside its kept region and neighbours outside;
                      MMS re-align of 20 seeded windows across cuts), per-minute loudness within +-1.5 LU, no unplanned gap > 2.5 s.
lock        (venv)    word map enriched (seconds, frames, sentence id; monotonic) + features at the film fps (ADR-002) per chapter (RMS, onset
                      strength, spectral centroid; 3 dp) + corpus/edl/lock.json (EDL, word map, VO and feature SHA-256, fps).
sample      (ffmpeg)  3-minute FYI radio-edit sample spanning trunk -> Deep-Dive -> trunk -> data/delivery/fyi/*.m4a (AAC 160k).

Archive code is never executed; source audio is only decoded by ffmpeg. Heavy steps run through the tsp queue.
"""
import hashlib
import json
import os
import random
import statistics as ST
import subprocess
import sys
import time

from . import common as C
from . import queue as Q
from .timeutil import film_fps, frame_end, frame_start

FPS, SR = film_fps(), 48000      # ADR-002 Q2.1 (F24); spans: start = floor(s*fps), end = ceil(s*fps)
SPF = SR // FPS
TARGET_LUFS = -16.0
CUT_MIN_MS, PRE_MIN, POST_MIN, PAD_MAX = 250, 60, 90, 300
FADE_MS = 20
CARD_MS = 2000
TRUNK_LEAD_MS = 500          # pause from an exit card to the first trunk word
TIGHT_OVER_MS, TIGHT_TO_MS = 2000, 2000
CEIL_DBFS = -1.5
SEED = 20261009
ADR_CANDIDATE = "corpus/edl/candidates/B100-noC.json"
GAPSCAN_JSON = C.p("corpus", "edl", "gapscan.json")
SILENT_DBFS = -55.0
GAPSCAN = {}
CUT_STATS = {"not_silent": [], "tighten_skipped": []}
EQ_JSON = C.p("corpus", "audio", "eq_match_s4_to_s1.json")
VENV_PY = C.p(".venv", "bin", "python")
DERIVED = C.p("data", "derived", "audio")
EDL_DIR = C.p("corpus", "edl")
REPORT_DIR = C.p("reports", "story")

DD_TITLE_AR = {  # condensed from corpus/canon/nblm_parts.json part titles (Egyptian Arabic, terms in English)
    "P00b": "الشغلانة الحقيقية وخريطة الرحلة وعقد الداتا",
    "P00": "الخريطة كلها: من الصفر لمنصة داتا بالـAI",
    "P01": "الرحلة واللغة البصرية: هنتعلم إزاي، وهنتفرج على إيه",
    "P02": "الجهاز والملفات والـTerminal: من الـbyte لأول pipeline",
    "P03": "Linux Admin I: الصلاحيات والمستخدمين والعمليات والحزم",
    "P04": "Linux Admin II: الخدمات واللوجات والديسك والـSSH — ليلة العطل",
    "P05": "Python I: من القيمة للـfunction، والـcollections والملفات والبيئات",
    "P06": "Python II: الـstate والذاكرة والأخطاء والـdecorators والاختبارات وGit",
    "P07": "Python للداتا: pandas والـdatabase والـETL والـpools والاختبارات",
    "P08": "SQL I: ليه database؟ الـrelational model والـnormalization والـgrain",
    "P09": "SQL II: الـjoins والـfan-out والـwindows والـCTEs والـNULL والـdeadlock",
    "P10": "SQL III: الـindexes وقراءة الـplan وحلقة الـtuning والـdialects",
    "P11": "Analytics: الداتا البايظة والإحصاء والـsemantic model والتقرير",
    "P12": "Software Craft وDSA: التصميم والـpatterns والـrefactoring والـalgorithms",
    "P13": "Systems والويب: من الـDNS للـdatabase، والـHTTP والـAPI والأمان",
    "P14": "Backend بالعمق: Java وJDBC والـconnection pool وSpring Boot والـsaga",
    "P15": "ETL والـDAGs: التحقق قبل التحويل، والجودة، والـquarantine، وAirflow",
    "P16": "الـWarehouse: الطبقات والـstar schema والـgrain والـcube والـSCD",
    "P17": "Huawei DataCube وتقارير Mobile Money: الطبقات والموديل والـKPIs",
    "P18": "Big Data: Hadoop وSpark — الـstages والـpartitions والـshuffle والـskew",
    "P19": "Kafka والـstreaming: رحلة معاملة Mobile Money واحدة",
    "P20": "الـReconciliation والاختبارات والـGovernance والـDR",
    "P21": "Machine Learning: من سؤال بيزنس للتقييم الأمين",
    "P22": "Deep Learning والـTransformers: من neuron بالإيد للـattention",
    "P23": "Embeddings والـRAG والـAgents: المعنى كموضع",
    "P24": "SHIP IT: الـcontainers والـCI/CD والـIAM والـobservability",
    "P25": "الدليل والكارير: سلسلة الـartifacts ودفاع الخمس دقايق",
}


def fid(aid):
    return aid.replace(":", "_")


def edl_path(v):
    return os.path.join(EDL_DIR, f"master_edl.v{v}.json")


def wm_path(v):
    return os.path.join(EDL_DIR, f"word_map.v{v}.jsonl")


def vo_path(v):
    return os.path.join(DERIVED, f"master_vo_v{v}.flac")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


# ===================================================================================================================== cut
class Src:
    """Words, sentences and duration of one audio asset."""
    _c = {}

    @classmethod
    def get(cls, aid):
        if aid not in cls._c:
            s = cls()
            s.aid = aid
            s.words = C.read_jsonl(C.p("corpus", "transcripts", fid(aid) + ".words.jsonl"))
            s.widx = {w["word_id"]: k for k, w in enumerate(s.words)}
            s.sents = {x["sent_id"]: x for x in C.read_jsonl(C.p("corpus", "sentences", fid(aid) + ".jsonl"))}
            assets = C.read_json(C.p("corpus", "audio", "assets.json"))
            s.dur_ms = next(a["duration_ms"] for a in assets if a["audio_id"] == aid)
            s.sent_of = {}
            for sid, x in s.sents.items():
                for k in range(s.widx[x["w_from"]], s.widx[x["w_to"]] + 1):
                    s.sent_of[k] = sid
            cls._c[aid] = s
        return cls._c[aid]

    def runs(self, k):
        """Measured silent runs [r0, r1] (source ms) inside the gap after word k (k = -1: file start). None = not scanned."""
        g = GAPSCAN.get(self.aid)
        return None if g is None else g.get(str(k), [])

    def silent_at(self, k, lo, hi, pref):
        """Point in [lo, hi] closest to pref that lies >= 10 ms inside a measured silent run of gap k (None if impossible)."""
        rs = self.runs(k)
        if rs is None:
            return pref
        best = None
        for r0, r1 in rs:
            a, b = max(lo, r0 + 10), min(hi, r1 - 10)
            if a > b:
                continue
            q = min(max(pref, a), b)
            if best is None or abs(q - pref) < abs(best - pref):
                best = q
        return best

    def tight_span(self, k):
        """[r0, r1] to remove from the long gap after word k so that it shrinks to TIGHT_TO_MS, taken only from measured silence
        (longest run, 20 ms guards, >= 90 ms after the offset and >= 60 ms before the onset). None if < 200 ms is removable."""
        e, s = self.words[k]["end_ms"], self.words[k + 1]["start_ms"]
        need = (s - e) - TIGHT_TO_MS
        rs = self.runs(k)
        if rs is None:
            m = (e + s) // 2
            return [m - need // 2, m - need // 2 + need]
        best = None
        for r0, r1 in rs:
            a, b = max(r0 + 20, e + POST_MIN), min(r1 - 20, s - PRE_MIN)
            if b - a > (best[1] - best[0] if best else 0):
                best = [a, b]
        if not best or best[1] - best[0] < 200:
            return None
        rem = min(need, best[1] - best[0])
        m = (best[0] + best[1]) // 2
        r0 = max(best[0], m - rem // 2)
        return [r0, r0 + rem]

    def gap_before(self, i):
        return self.words[i]["start_ms"] - (self.words[i - 1]["end_ms"] if i > 0 else 0)

    def gap_after(self, i):
        return (self.words[i + 1]["start_ms"] if i + 1 < len(self.words) else self.dur_ms) - self.words[i]["end_ms"]

    def cut_in(self, i):
        """src ms of a cut before word i: inside the gap, >= 60 ms before the onset, >= 90 ms after the previous offset."""
        g = self.gap_before(i)
        s = self.words[i]["start_ms"]
        if i == 0:
            pref, lo = max(0, s - min(PAD_MAX, max(PRE_MIN, g // 2))), 0
        else:
            pref, lo = s - min(PAD_MAX, max(PRE_MIN, g // 2), g - POST_MIN), self.words[i - 1]["end_ms"] + POST_MIN
        q = self.silent_at(i - 1, lo, s - PRE_MIN, pref)
        if q is None:
            CUT_STATS["not_silent"].append([self.aid, s, "in"])
            return pref
        return q

    def cut_out(self, i):
        g = self.gap_after(i)
        e = self.words[i]["end_ms"]
        if i == len(self.words) - 1:
            pref, hi = min(self.dur_ms, e + min(PAD_MAX, max(POST_MIN, g // 2))), self.dur_ms
        else:
            pref, hi = e + min(PAD_MAX, max(POST_MIN, g // 2), g - PRE_MIN), self.words[i + 1]["start_ms"] - PRE_MIN
        q = self.silent_at(i, e + POST_MIN, hi, pref)
        if q is None:
            CUT_STATS["not_silent"].append([self.aid, e, "out"])
            return pref
        return q


def _pieces(src, i0, i1):
    """Split word range [i0, i1] at pauses > TIGHT_OVER_MS: (a, z, cin|None, cout|None); the removed stretch is measured silence."""
    out, a, cin = [], i0, None
    for k in range(i0, i1):
        if src.words[k + 1]["start_ms"] - src.words[k]["end_ms"] > TIGHT_OVER_MS:
            sp = src.tight_span(k)
            if sp is None:
                CUT_STATS["tighten_skipped"].append([src.aid, src.words[k]["end_ms"], src.gap_after(k)])
                continue
            out.append((a, k, cin, sp[0]))
            a, cin = k + 1, sp[1]
    out.append((a, i1, cin, None))
    return out


def _block_ids(blocks):
    """Candidate ids -> schema ids DD-PNN[-k] (k in candidate order per part number; P00b is the first take of part 0)."""
    per = {}
    for b in blocks:
        if b["kind"] == "deep-dive":
            per.setdefault(b["part"][:3], []).append(b["id"])
    m = {}
    for p, ids in per.items():
        for k, cid in enumerate(ids):
            m[cid] = f"DD-{p}" if len(ids) == 1 else f"DD-{p}-{k + 1}"
    return m


def cmd_cut(args):
    from . import schema as SCH
    v = args.v
    cand_path = C.p(args.candidate)
    cand = C.read_json(cand_path)
    blocks = cand["blocks"]
    gs = C.read_json(GAPSCAN_JSON, {}) or {}
    if not gs.get("audio"):
        C.fail("corpus/edl/gapscan.json missing: run `dc story gapscan` first (measured silence for every cut)", 3)
    GAPSCAN.update(gs["audio"])
    cues = {s["id"]: s for s in C.read_json(C.p("corpus", "canon", "cues_70m05.json"))["scenes"]}
    canon = {c["id"]: c for c in C.read_json(C.p("corpus", "canon", "chapters.json"))["chapters"]}
    from .story import PART_TITLE
    idmap = _block_ids(blocks)
    nparts = {}
    for b in blocks:
        if b["kind"] == "deep-dive":
            nparts[b["part"][:3]] = nparts.get(b["part"][:3], 0) + 1

    chapters, segs, fills, items = [], [], [], []
    t = 0                      # record cursor, integer ms
    prev = None                # last spoken segment record
    stats = {"tightened": 0, "tightened_ms": 0, "continuous_joins": 0, "cards": 0}

    def card(ch, kind):
        nonlocal t
        segs.append({"seg_id": None, "chapter": ch, "audio_id": None, "role": "card", "rec_in_ms": t, "rec_out_ms": t + CARD_MS,
                     "card": kind, "sting": True,
                     "notes": f"Deep-Dive {kind} card (visual, 2.0 s) + music sting; no speech"})
        t += CARD_MS
        stats["cards"] += 1

    for bi, b in enumerate(blocks):
        is_dd = b["kind"] == "deep-dive"
        cid = idmap.get(b["id"], b["id"])
        ch_start = t
        if is_dd:
            prev_dd = bi > 0 and blocks[bi - 1]["kind"] == "deep-dive"
            card(cid, "dd-to-dd" if prev_dd else "entry")
            segs[-1]["voice_switch"] = (not prev_dd) or blocks[bi - 1]["voice"] != b["voice"]
        after_card = bool(segs) and segs[-1]["role"] == "card"
        for si, sg in enumerate(b["segments"]):
            src = Src.get(sg["audio_id"])
            i0 = src.widx[src.sents[sg["sentences"][0]]["w_from"]]
            i1 = src.widx[src.sents[sg["sentences"][-1]]["w_to"]]
            for pi, (a, z, cin0, cout0) in enumerate(_pieces(src, i0, i1)):
                cin = cin0 if cin0 is not None else src.cut_in(a)
                cout = cout0 if cout0 is not None else src.cut_out(z)
                adj = (prev is not None and not after_card and prev["audio_id"] == sg["audio_id"]
                       and prev["_i1"] + 1 == a and prev["kind"] == "trunk" and not is_dd and pi == 0)
                sp = src.tight_span(a - 1) if adj and src.gap_before(a) > TIGHT_OVER_MS else None
                cont = adj and sp is None
                tight = pi > 0 or sp is not None
                if sp is not None:          # long pause at an adjacent-chapter join: retrim the previous piece's out point
                    prev["src_out_ms"] = sp[0]
                    t = prev["rec_in_ms"] + (prev["src_out_ms"] - prev["src_in_ms"])
                    prev["rec_out_ms"] = t
                    cin = sp[1]
                if cont:
                    # same source, adjacent words, no Deep-Dive between (e.g. CH-18 -> CH-19): join without a cut
                    cin = prev["src_out_ms"]
                    prev["fade_out_ms"] = 0
                    stats["continuous_joins"] += 1
                else:
                    pre = src.words[a]["start_ms"] - cin
                    if after_card:
                        target = TRUNK_LEAD_MS if not is_dd else max(CUT_MIN_MS, min(700, sg.get("lead_gap_ms") or 480))
                        fill = max(0, target - pre)
                    elif prev is not None:
                        post = prev["src_out_ms"] - Src.get(prev["audio_id"]).words[prev["_i1"]]["end_ms"]
                        if tight:           # long pause inside kept speech: the measured-silent span was removed, splice directly
                            target = 0
                            stats["tightened"] += 1
                            stats["tightened_ms"] += cin - prev["src_out_ms"]
                        elif prev["audio_id"] == sg["audio_id"] and prev["_i1"] < a:
                            target = max(CUT_MIN_MS, min(700, sg.get("lead_gap_ms") or CUT_MIN_MS))
                        else:
                            target = 700
                        fill = max(0, target - post - pre) if target else 0
                    else:
                        fill = 0
                    if fill:
                        fills.append({"rec_in_ms": t, "dur_ms": fill})
                    t += fill
                dur = cout - cin
                rec = {"seg_id": None, "chapter": cid, "audio_id": sg["audio_id"], "role": "deep-dive" if is_dd else "trunk",
                       "voice": b["voice"], "src_in_ms": cin, "src_out_ms": cout, "rec_in_ms": t, "rec_out_ms": t + dur,
                       "w_from": src.words[a]["word_id"], "w_to": src.words[z]["word_id"],
                       "sentences": sorted({src.sent_of[k] for k in range(a, z + 1) if k in src.sent_of},
                                           key=lambda x: int(x.rsplit(":", 1)[1])),
                       "fade_in_ms": 0 if cont else FADE_MS, "fade_out_ms": FADE_MS, "gain_db": 0.0,
                       "eq": "corpus/audio/eq_match_s4_to_s1.json" if sg["audio_id"].startswith("a:S4:") else None,
                       "notes": "continuous with previous segment (no cut)" if cont else ("after tightened pause" if tight else ""),
                       "_i0": a, "_i1": z, "kind": b["kind"]}
                segs.append(rec)
                t += dur
                prev = rec
                after_card = False
        if is_dd and (bi + 1 == len(blocks) or blocks[bi + 1]["kind"] != "deep-dive"):
            card(cid, "exit")
            segs[-1]["voice_switch"] = True
            prev = None
        elif is_dd:
            prev = None
        part = b.get("part", "")
        pn = part[:3]
        if is_dd:
            k = int(cid.rsplit("-", 1)[1]) if cid.count("-") == 2 else None
            t_en = PART_TITLE.get(part, part) + (f" (part {k} of {nparts[pn]})" if k and nparts[pn] > 1 and pn != "P00" else "")
            t_ar = DD_TITLE_AR.get(part, "") + (f" ({k}/{nparts[pn]})" if k and nparts[pn] > 1 and pn != "P00" else "")
        else:
            t_en, t_ar = canon[b["chapter"]]["title_en"], cues[b["chapter"]]["title_ar"]
        chapters.append({"id": cid, "kind": b["kind"], "title_ar": t_ar, "title_en": t_en, "act": b["act"], "voice": b["voice"],
                         "cand_id": b["id"], "anchor": b.get("anchor"), "part": part or None, "_start_ms": ch_start})
    total_ms = t
    total_frames = frame_end(total_ms, FPS)
    for ch in chapters:
        ch.pop("_start_ms")
    _chapter_spans(chapters, segs, total_ms)
    wm = []
    for n, s in enumerate(segs):
        s["seg_id"] = f"seg-{n + 1:04d}"
        s["rec_in_frame"] = frame_start(s["rec_in_ms"], FPS)
        s["rec_out_frame"] = frame_end(s["rec_out_ms"], FPS)
        if s["role"] == "card":
            continue
        src = Src.get(s["audio_id"])
        off = s["rec_in_ms"] - s["src_in_ms"]
        for k in range(s["_i0"], s["_i1"] + 1):
            w = src.words[k]
            a, z = w["start_ms"] + off, w["end_ms"] + off
            wm.append({"v": 1, "word_id": w["word_id"], "rec_start_ms": a, "rec_end_ms": z, "rec_start_frame": frame_start(a, FPS),
                       "rec_end_frame": frame_end(z, FPS), "seg_id": s["seg_id"], "chapter": s["chapter"]})
        for x in ("_i0", "_i1", "kind"):
            s.pop(x)
    spoken = [s for s in segs if s["role"] != "card"]
    sw = sum(1 for x, y in zip(spoken, spoken[1:]) if x["voice"] != y["voice"])
    nsent = len({x for s in spoken for x in s["sentences"]})
    edl = {"v": 1, "version": f"v{v}", "fps": FPS, "sr": SR, "channels": 1, "total_frames": total_frames, "total_ms": total_ms,
           "vo_wav": C.rel(vo_path(v)), "vo_sha256": "", "word_map": f"edl/word_map.v{v}.jsonl",
           "source": {"candidate": C.rel(cand_path), "candidate_sha256": sha256(cand_path), "adr": "ADR-001", "commit": "8289607",
                      "waivers": ["W-001-RT", "W-001-D2"]},
           "rules": {"silence": f"cut points and removed pause spans lie inside measured silence (10 ms RMS < {SILENT_DBFS} dBFS, "
                                f"corpus/edl/gapscan.json)", "cut_min_pause_ms": CUT_MIN_MS, "pre_ms": [PRE_MIN, PAD_MAX], "post_ms": [POST_MIN, PAD_MAX], "fade_ms": FADE_MS,
                     "fade": "equal-power (sin/cos) against the room-tone bed", "card_ms": CARD_MS,
                     "pause_tighten": {"over_ms": TIGHT_OVER_MS, "to_ms": TIGHT_TO_MS}, "segment_gain": "per block, -16 LUFS BS.1770 gated",
                     "eq": C.rel(EQ_JSON) if os.path.exists(EQ_JSON) else None, "room_tone": "per source, quiet in-pause loop"},
           "stats": {"chapters": len(chapters), "trunk": sum(c["kind"] == "trunk" for c in chapters),
                     "deep_dives": sum(c["kind"] == "deep-dive" for c in chapters), "segments": len(segs), "spoken_segments": len(spoken),
                     "cards": stats["cards"], "sentences": nsent, "words": len(wm), "voice_switches": sw,
                     "voice_switches_per_h": round(sw / (total_ms / 3.6e6), 1), "runtime_s": round(total_ms / 1000, 1),
                     "runtime": _hms(total_ms / 1000), "kept_audio_ms": sum(s["src_out_ms"] - s["src_in_ms"] for s in spoken),
                     "fill_ms": sum(f["dur_ms"] for f in fills), "pauses_tightened": stats["tightened"],
                     "tightened_removed_s": round(stats["tightened_ms"] / 1000, 1), "continuous_joins": stats["continuous_joins"],
                     "cuts_not_in_measured_silence": len(CUT_STATS["not_silent"]),
                     "long_pauses_not_tightened": len(CUT_STATS["tighten_skipped"])},
           "cut_exceptions": {k: v_[:50] for k, v_ in CUT_STATS.items()},
           "chapters": chapters, "segments": segs, "fills": fills}
    errs = SCH.validate(edl, "edl")
    if errs:
        C.fail(f"EDL fails schema: {errs[:5]}", 3)
    C.write_json(edl_path(v), edl)
    C.write_jsonl(wm_path(v), wm)
    print(json.dumps(edl["stats"], ensure_ascii=False))
    return 0


def _hms(s):
    s = int(round(s))
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"


# =================================================================================================================== audio
def _queue_self(sub, argv, label, mem_gb, expected_gb=0.0):
    if Q.in_queue():
        return None
    job = Q.submit(label, [VENV_PY, "-I", C.p("tools", "dc.py"), "story", sub, *argv], mem_gb=mem_gb, expected_gb=expected_gb)
    print(f"queued tsp job {job['tsp_id']} ({label}); wait with: python3 tools/dc.py q wait {job['tsp_id']}")
    return 0


def decode48(src_path):
    import numpy as np
    r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", src_path, "-map", "0:a:0", "-ac", "1",
                        "-af", "aresample=48000:resampler=soxr:precision=28", "-f", "f32le", "-acodec", "pcm_f32le", "-"],
                       capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode()[-300:])
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def eq_fir():
    import numpy as np
    from scipy.signal import firwin2
    eq = C.read_json(EQ_JSON)
    fc = np.array(eq["band_centres_hz"], float)
    g = np.clip(np.array(eq["gain_db"], float), -eq.get("clamp_db", 4), eq.get("clamp_db", 4))
    f = np.linspace(0, SR / 2, 2049)
    lf = np.log10(np.maximum(f, 1.0))
    gd = np.interp(lf, np.log10(fc), g)
    return firwin2(4095, f, 10 ** (gd / 20), fs=SR), eq


def apply_fir(x, h):
    from scipy.signal import oaconvolve
    d = (len(h) - 1) // 2
    return oaconvolve(x, h, mode="full")[d:d + len(x)].astype("float32")


def kfilter(x, zi=None):
    """BS.1770 K-weighting at 48 kHz. Returns (y, state)."""
    import numpy as np
    from scipy.signal import lfilter
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    if zi is None:
        zi = (np.zeros(2), np.zeros(2))
    y, z1 = lfilter(b1, a1, x.astype(np.float64), zi=zi[0])
    y, z2 = lfilter(b2, a2, y, zi=zi[1])
    return y, (z1, z2)


def e100(x):
    """K-weighted energy sums per 100 ms hop (4800 samples), for gated loudness."""
    import numpy as np
    y, _ = kfilter(x)
    n = len(y) // 4800
    return (y[:n * 4800] ** 2).reshape(n, 4800).sum(1)


def gated_lufs(e):
    """BS.1770-4 integrated loudness from 100 ms energy sums (400 ms blocks, 75 % overlap, -70 abs / -10 rel gates)."""
    import numpy as np
    e = np.asarray(e, float)
    if len(e) < 4:
        return float("nan")
    z = (e[:-3] + e[1:-2] + e[2:-1] + e[3:]) / (4 * 4800)
    lj = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    z1 = z[lj > -70]
    if not len(z1):
        return float("nan")
    lr = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z[(lj > -70) & (lj > lr)]
    return float(-0.691 + 10 * np.log10(z2.mean()))


def room_tone(x, src, n_out):
    """Loop of the quietest-decile in-pause stretch of this source (EQ'd, 48 kHz), length n_out samples."""
    import numpy as np
    cands = []
    ws = src.words
    for k in range(len(ws) - 1):
        a, b = ws[k]["end_ms"] + 150, ws[k + 1]["start_ms"] - 150
        if b - a >= 300:
            seg = x[a * 48:b * 48]
            if len(seg):
                cands.append((float(np.sqrt(np.mean(seg.astype(np.float64) ** 2))), a, b))
    if not cands:
        return np.zeros(n_out, np.float32), None
    cands.sort()
    rms, a, b = cands[max(0, len(cands) // 10 - 1)]
    piece = x[a * 48:min(b, a + 1000) * 48].astype(np.float32)
    xf = FADE_MS * 48
    if len(piece) <= 2 * xf:
        return np.zeros(n_out, np.float32), None
    ph = np.linspace(0, np.pi / 2, xf, dtype=np.float32)
    out = piece.copy()
    while len(out) < n_out:
        out = np.concatenate([out[:-xf], out[-xf:] * np.cos(ph) + piece[:xf] * np.sin(ph), piece[xf:]])
    return out[:n_out], {"rms_dbfs": round(20 * np.log10(max(rms, 1e-9)), 1), "from_ms": a, "len_ms": int(len(piece) / 48)}


def limiter(x, ceil_db=CEIL_DBFS):
    """Look-ahead peak limiter (sample peak). g <= ceiling/|x| is guaranteed: min-filter +-20 ms then mean over +-10 ms."""
    import numpy as np
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    from scipy.signal import resample_poly
    c = 10 ** (ceil_db / 20)
    a = np.abs(x)
    a4 = np.abs(resample_poly(x.astype(np.float64), 4, 1))[:4 * len(x)].reshape(-1, 4).max(1)   # inter-sample (true) peaks
    a = np.maximum(a, a4[:len(a)].astype(np.float32))
    if a.max() <= c:
        return x, 0
    g = np.minimum(1.0, c / np.maximum(a, 1e-9)).astype(np.float32)
    g = minimum_filter1d(g, size=2 * 960 + 1)
    g = uniform_filter1d(g, size=961)
    n = int((g < 0.999).sum())
    return (x * g).astype(np.float32), n


def true_peak_db(x):
    import numpy as np
    from scipy.signal import resample_poly
    m = 0.0
    step, M = SR * 10, 256
    for i in range(0, len(x), step):
        lo = max(0, i - M)
        y = resample_poly(x[lo:i + step + M].astype(np.float64), 4, 1)
        a = 4 * (i - lo)                      # keep only the part for [i, i+step): chunk edges ring (Gibbs) and over-read
        m = max(m, float(np.abs(y[a:a + 4 * min(step, len(x) - i)]).max()))
    return 20 * np.log10(max(m, 1e-9))


def true_peak_file(path):
    import soundfile as sf
    import numpy as np
    from scipy.signal import resample_poly
    m, M, step = 0.0, 256, SR * 60
    with sf.SoundFile(path) as f:
        n = f.frames
        for i in range(0, n, step):
            lo = max(0, i - M)
            f.seek(lo)
            x = f.read(min(n, i + step + M) - lo, dtype="float64")
            y = resample_poly(x, 4, 1)
            a = 4 * (i - lo)
            m = max(m, float(np.abs(y[a:a + 4 * min(step, n - i)]).max()))
    return 20 * np.log10(max(m, 1e-9))


def ltas_db(x, fc):
    import numpy as np
    from scipy.signal import welch
    f, p = welch(x.astype(np.float64), fs=SR, nperseg=8192)
    out = []
    for c in fc:
        lo, hi = c / 2 ** (1 / 6), c * 2 ** (1 / 6)
        m = (f >= lo) & (f < hi)
        out.append(10 * np.log10(max(p[m].mean() if m.any() else 1e-20, 1e-20)))
    return np.array(out)


def spec_dist(a, b, fc, lo=100, hi=8000, lm=(200, 4000)):
    import numpy as np
    fc = np.asarray(fc)
    m = (fc >= lm[0]) & (fc <= lm[1])
    d = (a - b) - np.mean((a - b)[m])
    k = (fc >= lo) & (fc <= hi)
    return float(np.sqrt(np.mean(d[k] ** 2)))


def cmd_radio(args):
    if not args.inline and _queue_self("radio", ["--inline", "--v", str(args.v)], f"story-radio-v{args.v}", 7.0, 1.2) is not None:
        return 0
    import numpy as np
    import soundfile as sf
    from . import audio as A
    from . import schema as SCH
    t0 = time.time()
    v = args.v
    edl = C.read_json(edl_path(v))
    segs = edl["segments"]
    spoken = [s for s in segs if s["role"] != "card"]
    total = edl["total_frames"] * SPF
    h, eq = eq_fir() if os.path.exists(EQ_JSON) else (None, None)
    reg = {a["audio_id"]: a for a in A.registry()}
    order = sorted({s["audio_id"] for s in spoken}, key=lambda a: (a != "a:S1:ar-natural", a))
    master = np.zeros(total, np.float32)
    tones, tone_info, gains, ltas, block_l = {}, {}, {}, {}, {}
    prev_of = {b["seg_id"]: a for a, b in zip(spoken, spoken[1:])}
    removed, cut_lv = [], []
    fc = eq["band_centres_hz"] if eq else None
    # pass 1 per source: decode, EQ, room tone, per-block loudness, segment placement
    for aid in order:
        x = decode48(reg[aid]["src"])
        src = Src.get(aid)
        if aid.startswith("a:S4:") and h is not None:
            pre = ltas_db(_speech(x, src), fc)
            x = apply_fir(x, h)
            ltas[aid] = (pre, ltas_db(_speech(x, src), fc))
        elif fc is not None:
            ltas[aid] = (ltas_db(_speech(x, src), fc), None)
        tones[aid], tone_info[aid] = room_tone(x, src, 4 * SR)
        mine = [s for s in spoken if s["audio_id"] == aid]
        by_ch = {}
        for s in mine:
            by_ch.setdefault(s["chapter"], []).append(s)
        for ch, ss in by_ch.items():
            e = np.concatenate([e100(x[s["src_in_ms"] * 48:s["src_out_ms"] * 48]) for s in ss])
            L = gated_lufs(e)
            g = float(np.clip(TARGET_LUFS - L, -12, 12)) if L == L else 0.0
            block_l[(ch, aid)] = L
            for s in ss:
                gains[s["seg_id"]] = g
        for s in mine:
            p_ = prev_of.get(s["seg_id"])
            if s["notes"] == "after tightened pause" and p_ and p_["audio_id"] == aid:
                r_ = x[p_["src_out_ms"] * 48:s["src_in_ms"] * 48].astype(np.float64)
                m_ = len(r_) // 2400
                pk = float(20 * np.log10(max(1e-9, np.sqrt((r_[:m_ * 2400] ** 2).reshape(m_, 2400).mean(1)).max()))) if m_ else -200.0
                removed.append({"seg_id": s["seg_id"], "src_ms": [p_["src_out_ms"], s["src_in_ms"]], "max_rms50_dbfs": round(pk, 1)})
        for s in mine:
            for side, ms, on in (("in", s["src_in_ms"], s["fade_in_ms"]), ("out", s["src_out_ms"], s["fade_out_ms"])):
                if on:
                    r_ = x[max(0, ms - 10) * 48:(ms + 10) * 48].astype(np.float64)
                    lv = float(20 * np.log10(max(1e-9, np.sqrt((r_ ** 2).mean())))) if len(r_) else -200.0
                    cut_lv.append({"seg_id": s["seg_id"], "side": side, "src_ms": ms, "rms20_dbfs": round(lv, 1)})
        for s in mine:
            y = x[s["src_in_ms"] * 48:s["src_out_ms"] * 48] * np.float32(10 ** (gains[s["seg_id"]] / 20))
            n = len(y)
            fi, fo = s["fade_in_ms"] * 48, s["fade_out_ms"] * 48
            if fi:
                y[:fi] *= np.sin(np.linspace(0, np.pi / 2, fi, dtype=np.float32))
            if fo:
                y[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo, dtype=np.float32))
            a = s["rec_in_ms"] * 48
            master[a:a + n] += y
        del x
        print(f"  {aid}: {len(mine)} segments placed ({time.time() - t0:.0f}s)", flush=True)
    # pass 2: room-tone bed in every gap between spoken segments (cards, fills, film end), equal-power against the fades
    xf = FADE_MS * 48
    ph = np.linspace(0, np.pi / 2, xf, dtype=np.float32)
    bed_ms = 0
    for k in range(len(spoken) + 1):
        A_ = spoken[k - 1] if k > 0 else None
        B_ = spoken[k] if k < len(spoken) else None
        a = A_["rec_out_ms"] * 48 if A_ else 0
        b = B_["rec_in_ms"] * 48 if B_ else total
        if A_ and B_ and A_["fade_out_ms"] == 0 and B_["fade_in_ms"] == 0:
            continue
        lo, hi = (a - xf if A_ else a), (b + xf if B_ else b)
        n = hi - lo
        if n <= 0:
            continue
        ta = tones[A_["audio_id"]] * np.float32(10 ** (gains[A_["seg_id"]] / 20)) if A_ else None
        tb = tones[B_["audio_id"]] * np.float32(10 ** (gains[B_["seg_id"]] / 20)) if B_ else None
        if ta is not None and tb is not None and A_["audio_id"] != B_["audio_id"]:
            m0 = max(0, n // 2 - xf // 2)
            m1 = min(n, m0 + xf)
            w = np.zeros(n, np.float32)
            w[:m0] = np.pi / 2
            w[m0:m1] = np.linspace(np.pi / 2, 0, m1 - m0, dtype=np.float32)
            bed = _tile(ta, n) * np.sin(w) + _tile(tb, n) * np.cos(w)     # equal-power hand-over between the two tones
        else:
            bed = _tile(ta if ta is not None else tb, n).copy()
        if A_:
            bed[:xf] *= np.sin(ph)
        if B_:
            bed[-xf:] *= np.cos(ph)
        master[lo:hi] += bed
        bed_ms += (b - a) // 48
    # master trim, limiter, true peak
    e = np.concatenate([e100(master[i:i + SR * 600]) for i in range(0, total, SR * 600)])
    L0 = gated_lufs(e)
    trim = TARGET_LUFS - L0
    master *= np.float32(10 ** (trim / 20))
    lim_samples = 0
    step, M = SR * 60, 2400
    for it in range(2):
        lim_samples = 0
        for i in range(0, total, step):
            lo, hi = max(0, i - M), min(total, i + step + M)
            y, n = limiter(master[lo:hi])
            if n:
                master[i:min(total, i + step)] = y[i - lo:i - lo + min(step, total - i)]
                lim_samples += n
        e = np.concatenate([e100(master[i:i + SR * 600]) for i in range(0, total, SR * 600)])
        L1 = gated_lufs(e)
        if it == 1 or abs(L1 - TARGET_LUFS) <= 0.05:
            break
        d = TARGET_LUFS - L1          # make up what the limiter took, then limit once more
        master *= np.float32(10 ** (d / 20))
        trim += d
    tp = true_peak_db(master)
    os.makedirs(DERIVED, exist_ok=True)
    out = vo_path(v)
    tmp = out + ".part.flac"
    with sf.SoundFile(tmp, "w", samplerate=SR, channels=1, subtype="PCM_24", format="FLAC") as f:
        for i in range(0, total, SR * 60):
            f.write(master[i:i + SR * 60])
    os.replace(tmp, out)
    vsha = sha256(out)
    # EDL: gains (block gain + master trim), VO path + hash
    for s in segs:
        if s["role"] != "card":
            s["gain_db"] = round(gains[s["seg_id"]] + trim, 2)
    edl["vo_wav"] = C.rel(out)
    edl["vo_sha256"] = vsha
    edl["radio"] = {"lufs_i_before_trim": round(L0, 2), "trim_db": round(trim, 2), "lufs_i": round(L1, 2), "true_peak_dbtp": round(tp, 2),
                    "limited_samples": lim_samples, "ceiling_dbfs": CEIL_DBFS, "bed_ms": bed_ms,
                    "room_tone": tone_info, "rendered": C.now_iso(), "render_s": round(time.time() - t0, 1)}
    errs = SCH.validate(edl, "edl")
    if errs:
        C.fail(f"EDL fails schema: {errs[:5]}", 3)
    C.write_json(edl_path(v), edl)
    # spectral-distance proxy for the S4 EQ match (Audio & Sync lens)
    sp = {}
    if fc is not None:
        s1 = ltas["a:S1:ar-natural"][0]
        for aid, (pre, post) in ltas.items():
            if post is not None:
                sp[aid] = {"before_db": round(spec_dist(pre, s1, fc), 2), "after_db": round(spec_dist(post, s1, fc), 2)}
    bl = {f"{k[0]}|{k[1]}": round(L, 2) for k, L in block_l.items()}
    C.write_json(C.p(REPORT_DIR, f"radio_render.v{v}.json"),
                 {"v": 1, "edl": C.rel(edl_path(v)), "vo": C.rel(out), "vo_sha256": vsha, "bytes": os.path.getsize(out),
                  **edl["radio"], "block_lufs_pre_gain": bl, "eq_spectral_distance": sp, "tightened_removed": removed,
                  "cut_points": {"n": len(cut_lv), "max_rms20_dbfs": max((c_["rms20_dbfs"] for c_ in cut_lv), default=None),
                                 "over_minus45_dbfs": [c_ for c_ in cut_lv if c_["rms20_dbfs"] > -45]}})
    print(json.dumps(edl["radio"]))
    print(f"wrote {C.rel(out)} sha256 {vsha} ({time.time() - t0:.0f}s)")
    return 0


def _tile(t, n):
    import numpy as np
    if n <= len(t):
        return t[:n]
    return np.tile(t, -(-n // len(t)))[:n]


def _speech(x, src):
    import numpy as np
    parts = [x[w["start_ms"] * 48:w["end_ms"] * 48] for w in src.words[:4000]]
    return np.concatenate(parts) if parts else x


# ============================================================================================================== radio-check
def cmd_radio_check(args):
    if not args.inline and _queue_self("radio-check", ["--inline", "--v", str(args.v)], f"story-radio-check-v{args.v}", 4.0) is not None:
        return 0
    import numpy as np
    import soundfile as sf
    import torch
    from scipy.signal import resample_poly
    from . import align as AL
    t0 = time.time()
    v = args.v
    edl = C.read_json(edl_path(v))
    segs = edl["segments"]
    spoken = [s for s in segs if s["role"] != "card"]
    cards = [(s["rec_in_ms"], s["rec_out_ms"]) for s in segs if s["role"] == "card"]
    wm = C.read_jsonl(wm_path(v))
    vo = C.p(edl["vo_wav"])
    res = {"v": 1, "edl": C.rel(edl_path(v)), "vo": edl["vo_wav"], "vo_sha256_edl": edl.get("vo_sha256"), "seed": SEED}
    res["vo_sha256_file"] = sha256(vo)
    # ---- 1a static clip check
    st = {"segments": len(spoken), "edge_inside_fail": 0, "neighbour_inside_fail": 0, "edge_words_interp": 0, "examples": []}
    for s in spoken:
        src = Src.get(s["audio_id"])
        i0, i1 = src.widx[s["w_from"]], src.widx[s["w_to"]]
        w0, w1 = src.words[i0], src.words[i1]
        ok = (w0["start_ms"] - s["src_in_ms"] >= (PRE_MIN if s["fade_in_ms"] else 0) or (i0 == 0 and w0["start_ms"] >= s["src_in_ms"])) \
            and (s["src_out_ms"] - w1["end_ms"] >= (POST_MIN if s["fade_out_ms"] else 0))
        if not ok:
            st["edge_inside_fail"] += 1
            st["examples"].append(s["seg_id"])
        if s["fade_in_ms"] and i0 > 0 and s["src_in_ms"] - src.words[i0 - 1]["end_ms"] < POST_MIN:
            st["neighbour_inside_fail"] += 1
        if s["fade_out_ms"] and i1 + 1 < len(src.words) and src.words[i1 + 1]["start_ms"] - s["src_out_ms"] < PRE_MIN:
            st["neighbour_inside_fail"] += 1
        st["edge_words_interp"] += sum(1 for w in (w0, w1) if "interp" in w["method"] or not w["conf"])
    res["static"] = st
    # ---- 1b MMS re-align on 20 seeded windows straddling cuts
    rng = random.Random(SEED)
    cuts = [k for k in range(1, len(spoken)) if spoken[k]["fade_in_ms"] or spoken[k - 1]["fade_out_ms"]]
    pick = sorted(rng.sample(cuts, 20))
    wrec = sorted(wm, key=lambda r: r["rec_start_ms"])
    seg_of = {s["seg_id"]: s for s in spoken}
    AL.set_threads(max(1, Q.slots()))
    H = AL._harness()
    f = sf.SoundFile(vo)
    wins, clipped, offs, confs = [], 0, [], []
    for k in pick:
        A_, B_ = spoken[k - 1], spoken[k]
        c = (A_["rec_out_ms"] + B_["rec_in_ms"]) // 2
        a, b = c - 8000, c + 8000
        ww = [r for r in wrec if r["rec_start_ms"] >= a + 300 and r["rec_end_ms"] <= b - 300]
        if len(ww) < 4:
            continue
        a2 = max(0, ww[0]["rec_start_ms"] - 250)
        b2 = ww[-1]["rec_end_ms"] + 250
        f.seek(a2 * 48)
        x = f.read((b2 - a2) * 48, dtype="float32")
        x16 = resample_poly(x.astype(np.float64), 1, 3).astype(np.float32)
        em = H.emissions(x16)
        srcw = {}
        for r in ww:
            aid = r["word_id"].rsplit(":", 1)[0].replace("w:", "a:", 1)
            src = Src.get(aid)
            srcw[r["word_id"]] = src.words[src.widx[r["word_id"]]]
        sur = [AL.spoken(srcw[r["word_id"]]["text"]) for r in ww]
        try:
            out = AL.forced_align_slice(em.float(), sur)
        except Exception as ex:  # noqa: BLE001
            wins.append({"cut": f"{A_['seg_id']}|{B_['seg_id']}", "error": str(ex)[:120]})
            continue
        wc, wl = 0, []
        for r, o in zip(ww, out):
            if o is None:
                continue
            fs, fe, cf, _ = AL.word_span(o)
            ra, rb = a2 + int(round(fs * AL.STRIDE * 1000)), a2 + int(round(fe * AL.STRIDE * 1000))
            s = seg_of[r["seg_id"]]
            lo = s["rec_in_ms"] + s["fade_in_ms"]
            hi = s["rec_out_ms"] - s["fade_out_ms"]
            bad = ra < lo or rb > hi
            if bad:
                wc += 1
                wl.append({"word": r["word_id"], "re": [ra, rb], "kept": [lo, hi]})
            offs.append(ra - r["rec_start_ms"])
            confs.append(cf)
        clipped += wc
        wins.append({"cut": f"{A_['seg_id']}|{B_['seg_id']}", "rec_ms": [a2, b2], "words": len(ww), "clipped": wc, "clipped_words": wl[:5],
                     "median_conf": round(ST.median([AL.word_span(o)[2] for o in out if o]), 3)})
    f.close()
    ao = sorted(abs(o) for o in offs)
    res["realign"] = {"windows": len([w for w in wins if "error" not in w]), "errors": len([w for w in wins if "error" in w]),
                      "words": len(offs), "clipped": clipped,
                      "onset_offset_ms": {"median_abs": ao[len(ao) // 2] if ao else None, "p95_abs": ao[int(len(ao) * 0.95)] if ao else None},
                      "median_conf": round(ST.median(confs), 3) if confs else None, "detail": wins}
    # ---- 2 per-minute loudness + 3 acoustic gaps (one streaming pass)
    e_all, rms50 = [], []
    zi = None
    with sf.SoundFile(vo) as f:
        while True:
            x = f.read(SR * 60, dtype="float32")
            if not len(x):
                break
            y, zi = kfilter(x, zi)
            n = len(y) // 4800
            e_all.append((y[:n * 4800] ** 2).reshape(n, 4800).sum(1))
            m = len(x) // 2400
            rms50.append(np.sqrt((x[:m * 2400].astype(np.float64) ** 2).reshape(m, 2400).mean(1)))
    e = np.concatenate(e_all)
    r50 = 20 * np.log10(np.maximum(np.concatenate(rms50), 1e-9))
    Li = gated_lufs(e)
    mins = []
    for i in range(0, len(e), 600):
        seg = e[i:i + 600]
        if len(seg) < 300:
            continue
        mins.append(round(gated_lufs(seg), 2))
    dev = [round(m - TARGET_LUFS, 2) for m in mins]
    res["loudness"] = {"integrated_lufs": round(Li, 2), "minutes": len(mins), "min_lufs": min(mins), "max_lufs": max(mins),
                       "max_abs_dev_lu": max(abs(d) for d in dev), "minutes_out_of_tol": sum(abs(d) > 1.5 for d in dev),
                       "worst": sorted(((abs(d), k) for k, d in enumerate(dev)), reverse=True)[:5],
                       "true_peak_dbtp": round(true_peak_file(vo), 2)}

    def in_card(a, b):
        return any(a < ce + 1500 and b > cs - 1500 for cs, ce in cards)
    gaps_wm = []
    for p, q in zip(wrec, wrec[1:]):
        g = q["rec_start_ms"] - p["rec_end_ms"]
        if g > 2500 and not in_card(p["rec_end_ms"], q["rec_start_ms"]):
            gaps_wm.append([p["rec_end_ms"], g])
    planned = [q["rec_start_ms"] - p["rec_end_ms"] for p, q in zip(wrec, wrec[1:]) if in_card(p["rec_end_ms"], q["rec_start_ms"])
               and q["rec_start_ms"] - p["rec_end_ms"] > 2500]
    quiet = r50 < -50
    runs, k = [], 0
    while k < len(quiet):
        if quiet[k]:
            j = k
            while j + 1 < len(quiet) and quiet[j + 1]:
                j += 1
            a, b = k * 50, (j + 1) * 50
            if b - a > 2500 and not in_card(a, b):
                runs.append([a, b - a])
            k = j + 1
        else:
            k += 1
    allg = sorted(q["rec_start_ms"] - p["rec_end_ms"] for p, q in zip(wrec, wrec[1:]) if not in_card(p["rec_end_ms"], q["rec_start_ms"]))
    # word-map holes > 2.5 s that are NOT silent are untranscribed sound: transcribe them (faster-whisper) for the aligner follow-up
    holes = []
    if gaps_wm:
        from faster_whisper import WhisperModel
        wmod = WhisperModel(C.p("data", "models", "faster-whisper-large-v3-turbo"), device="cpu", compute_type="int8",
                            cpu_threads=max(1, Q.slots()))
        by_end = {r["rec_end_ms"]: r for r in wrec}
        for a_ms, g in gaps_wm:
            p_ = by_end[a_ms]
            aid = p_["word_id"].rsplit(":", 1)[0].replace("w:", "a:", 1)
            src = Src.get(aid)
            i = src.widx[p_["word_id"]]
            sa, sb = src.words[i]["end_ms"], src.words[i + 1]["start_ms"]
            x, _ = sf.read(C.p("data", "derived", "audio", "16k", fid(aid) + ".wav"), start=sa * 16, frames=(sb - sa) * 16, dtype="float32")
            x = np.concatenate([np.zeros(8000, np.float32), x, np.zeros(8000, np.float32)])
            ss, _ = wmod.transcribe(x, language="ar", vad_filter=False, beam_size=5, condition_on_previous_text=False)
            holes.append({"rec_ms": [a_ms, a_ms + g], "chapter": p_["chapter"], "audio_id": aid, "src_ms": [sa, sb],
                          "after_word": p_["word_id"], "whisper": " ".join(t.text.strip() for t in ss)})
    res["gaps"] = {"unplanned_acoustic_gt_2500_is_the_gate": True, "word_map_holes_gt_2500": len(gaps_wm), "holes": holes, "unplanned_acoustic_gt_2500": len(runs), "examples": (gaps_wm + runs)[:8],
                   "max_unplanned_word_gap_ms": allg[-1] if allg else 0, "planned_card_gaps_gt_2500": len(planned),
                   "max_planned_gap_ms": max(planned) if planned else 0}
    # removed (tightened) source stretches must be silent: max 50 ms RMS inside the dropped part of each tightened pause
    rem = (C.read_json(C.p(REPORT_DIR, f"radio_render.v{v}.json"), {}) or {}).get("tightened_removed", [])
    cp = (C.read_json(C.p(REPORT_DIR, f"radio_render.v{v}.json"), {}) or {}).get("cut_points", {})
    res["cut_points"] = {"n": cp.get("n"), "max_rms20_dbfs": cp.get("max_rms20_dbfs"), "over_minus45_dbfs": len(cp.get("over_minus45_dbfs", [])),
                         "examples": cp.get("over_minus45_dbfs", [])[:5]}
    loud = [r_ for r_ in rem if r_["max_rms50_dbfs"] > -45]
    res["tightened_removed"] = {"count": len(rem), "max_rms50_dbfs": max((r_["max_rms50_dbfs"] for r_ in rem), default=None),
                                "over_minus45_dbfs": len(loud), "examples": loud[:5]}
    ok = (st["edge_inside_fail"] == 0 and st["neighbour_inside_fail"] == 0 and res["realign"]["clipped"] == 0
          and res["realign"]["windows"] >= 20 and res["loudness"]["minutes_out_of_tol"] == 0
          and res["gaps"]["unplanned_acoustic_gt_2500"] == 0
          and res["vo_sha256_file"] == res["vo_sha256_edl"] and res["tightened_removed"]["over_minus45_dbfs"] == 0
          and res["cut_points"]["over_minus45_dbfs"] == 0)
    res["pass"] = ok
    tp = res["loudness"]["true_peak_dbtp"]
    if edl.get("radio") and edl["radio"].get("true_peak_dbtp") != tp:     # edge-safe meter (the render-time meter over-read chunk edges)
        edl["radio"]["true_peak_dbtp_render_meter"] = edl["radio"]["true_peak_dbtp"]
        edl["radio"]["true_peak_dbtp"] = tp
        C.write_json(edl_path(v), edl)
    res["check_s"] = round(time.time() - t0, 1)
    C.write_json(C.p(REPORT_DIR, f"radio_check.v{v}.json"), res)
    _write_md(edl, res, v)
    print(json.dumps({k: res[k] for k in ("pass", "static", "loudness", "gaps")}, default=str)[:1500])
    print(json.dumps({k: v_ for k, v_ in res["realign"].items() if k != "detail"}))
    return 0 if ok else 1


def _read_all(path):
    import soundfile as sf
    x, _ = sf.read(path, dtype="float32")
    return x


def _write_md(edl, r, v):
    s = edl["stats"]
    rr = edl.get("radio", {})
    rd = C.read_json(C.p(REPORT_DIR, f"radio_render.v{v}.json"), {}) or {}
    sp = rd.get("eq_spectral_distance", {})
    spb = [x["before_db"] for x in sp.values()]
    spa = [x["after_db"] for x in sp.values()]
    L, G, R, S_ = r["loudness"], r["gaps"], r["realign"], r["static"]
    yes = lambda b: "PASS" if b else "FAIL"  # noqa: E731
    lines = [
        f"# Radio check: master_edl.v{v} / master_vo_v{v}",
        "",
        f"Generated {C.now_iso()} by `dc story radio-check` (seed {SEED}). Overall: **{yes(r['pass'])}**.",
        "",
        "## EDL",
        "",
        f"- Source: `{edl['source']['candidate']}` (ADR-001, waivers {', '.join(edl['source']['waivers'])}).",
        f"- Runtime **{s['runtime']}** ({s['runtime_s']} s, {edl['total_frames']} frames at {edl['fps']} fps).",
        f"- Chapters {s['chapters']} ({s['trunk']} trunk, {s['deep_dives']} Deep-Dives); {s['spoken_segments']} spoken segments, "
        f"{s['cards']} visual cards (2.0 s each, music sting); {s['sentences']} sentences, {s['words']} words in the word map.",
        f"- Voice switches {s['voice_switches']} ({s['voice_switches_per_h']} per hour).",
        f"- Pauses longer than {TIGHT_OVER_MS / 1000:.1f} s inside kept speech tightened to {TIGHT_TO_MS / 1000:.1f} s: "
        f"{s['pauses_tightened']} pauses, {s['tightened_removed_s']} s removed (S1 was paced to the old 70:05 picture).",
        f"- Continuous joins (adjacent S1 chapters with no Deep-Dive between): {s['continuous_joins']}.",
        "",
        "## Render",
        "",
        f"- `{edl['vo_wav']}`: FLAC 48 kHz / 24-bit mono, SHA-256 `{edl.get('vo_sha256')}`.",
        f"- Integrated {rr.get('lufs_i')} LUFS (master trim {rr.get('trim_db')} dB); true peak {rr.get('true_peak_dbtp')} dBTP; "
        f"limiter active on {rr.get('limited_samples')} samples (ceiling {CEIL_DBFS} dBFS).",
        f"- Block gains: each trunk chapter / Deep-Dive measured BS.1770 gated (speech-gated) and set to {TARGET_LUFS} LUFS.",
        f"- S4 EQ match to S1 (`corpus/audio/eq_match_s4_to_s1.json`, ±4 dB clamp, linear-phase FIR): spectral distance to S1 "
        f"(1/3-octave LTAS, 100 Hz–8 kHz, level-matched 200 Hz–4 kHz) median {ST.median(spb) if spb else 'n/a'} dB before, "
        f"{ST.median(spa) if spa else 'n/a'} dB after ({len(sp)} parts).",
        "- Cut points: word gaps ≥ 250 ms only; room tone kept ≥ 60 ms before onsets and ≥ 90 ms after offsets (up to 300 ms each side).",
        "  Every cut has a 20 ms equal-power (sin/cos) fade against a per-source room-tone bed; fades start and end at zero gain,",
        "  so no zero-crossing search is needed for click-free joins.",
        "",
        "## Checks",
        "",
        "| Check | Threshold | Result | |",
        "|---|---|---|---|",
        f"| Static: first/last word of every segment inside its kept region | 0 fails | {S_['edge_inside_fail']} of {S_['segments']} | {yes(S_['edge_inside_fail'] == 0)} |",
        f"| Static: dropped neighbour word outside the cut | 0 fails | {S_['neighbour_inside_fail']} | {yes(S_['neighbour_inside_fail'] == 0)} |",
        f"| MMS re-align, 20 seeded windows across cuts: words outside their kept region | 0 | {R['clipped']} of {R['words']} words "
        f"in {R['windows']} windows ({R['errors']} errors) | {yes(R['clipped'] == 0 and R['windows'] >= 20)} |",
        f"| Per-minute loudness (gated), {L['minutes']} minutes | within ±1.5 LU of −16 | {L['min_lufs']} to {L['max_lufs']} LUFS, "
        f"max dev {L['max_abs_dev_lu']} LU, {L['minutes_out_of_tol']} out | {yes(L['minutes_out_of_tol'] == 0)} |",
        f"| Unplanned gap > 2.5 s (acoustic: 50 ms RMS < −50 dBFS, cards excluded) | 0 | {G['unplanned_acoustic_gt_2500']} | "
        f"{yes(G['unplanned_acoustic_gt_2500'] == 0)} |",
        f"| True peak (4x oversampled, edge-safe) | ≤ −1.0 dBTP | {L['true_peak_dbtp']} dBTP | {yes(L['true_peak_dbtp'] <= -1.0)} |",
        f"| VO file hash matches EDL | equal | {'equal' if r['vo_sha256_file'] == r['vo_sha256_edl'] else 'differs'} | "
        f"{yes(r['vo_sha256_file'] == r['vo_sha256_edl'])} |",
        "",
        f"Re-align sanity: onset offset re-aligned vs word map, median |Δ| {R['onset_offset_ms']['median_abs']} ms, p95 "
        f"{R['onset_offset_ms']['p95_abs']} ms; median word confidence {R['median_conf']}. Edge words with interpolated times: "
        f"{S_['edge_words_interp']}.",
        f"Planned gaps (cards) over 2.5 s word-to-word: {G['planned_card_gaps_gt_2500']}, longest {G['max_planned_gap_ms']} ms.",
        f"Tightened pauses: {r['tightened_removed']['count']} removed stretches, loudest 50 ms RMS "
        f"{r['tightened_removed']['max_rms50_dbfs']} dBFS; over −45 dBFS (possible speech removed): "
        f"{r['tightened_removed']['over_minus45_dbfs']} ({yes(r['tightened_removed']['over_minus45_dbfs'] == 0)}).",
        f"Cut points: {r['cut_points']['n']} fade edges; loudest source RMS in the 20 ms around a cut {r['cut_points']['max_rms20_dbfs']} dBFS; "
        f"over −45 dBFS: {r['cut_points']['over_minus45_dbfs']} ({yes(r['cut_points']['over_minus45_dbfs'] == 0)}). "
        f"Cuts not inside measured silence: {s.get('cuts_not_in_measured_silence')}; long pauses left untightened (no removable silence): "
        f"{s.get('long_pauses_not_tightened')}.",
        "",
        "## Word-map holes (transcript defect, not a gap)",
        "",
        f"{G['word_map_holes_gt_2500']} places have > 2.5 s between consecutive word-map words outside the cards (longest "
        f"{G['max_unplanned_word_gap_ms']} ms), but none is silent: the audio there is kept and audible, the S4 transcript has no words for it.",
        "faster-whisper (turbo, no VAD) on each hole; lines that read like Whisper boilerplate over music are likely transition stings:",
        "",
        "| Chapter | Audio | Source ms | Record ms | Whisper hears |",
        "|---|---|---|---|---|",
        *[f"| {h['chapter']} | {h['audio_id']} | {h['src_ms'][0]}–{h['src_ms'][1]} | {h['rec_ms'][0]}–{h['rec_ms'][1]} | {h['whisper']} |"
          for h in G.get("holes", [])],
        "",
        "Follow-up (transcription-aligner): add the missing words to the S4 transcripts/sentences; the VO audio does not change, "
        "only the word map (version bump).",
        "",
        "## Windows",
        "",
        "| Cut | Record ms | Words | Clipped | Median conf |",
        "|---|---|---|---|---|",
    ]
    for w in R["detail"]:
        if "error" in w:
            lines.append(f"| {w['cut']} | error: {w['error']} | | | |")
        else:
            lines.append(f"| {w['cut']} | {w['rec_ms'][0]}–{w['rec_ms'][1]} | {w['words']} | {w['clipped']} | {w['median_conf']} |")
    lines += ["", "Machine-readable: `reports/story/radio_check.v%d.json`, `reports/story/radio_render.v%d.json`." % (v, v), ""]
    with open(C.p(REPORT_DIR, "radio_check.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))


# ===================================================================================================================== lock
LOCK_JSON = os.path.join(EDL_DIR, "lock.json")
WM_STATS = {"overlaps": 0, "max_overlap_ms": 0}


def _sentence_index():
    """audio key ('S1:ar-natural') -> sorted [(w_from_idx, w_to_idx, sent_id)] from corpus/sentences/*.jsonl."""
    idx = {}
    sd = C.p("corpus", "sentences")
    for f in sorted(os.listdir(sd)):
        if not f.endswith(".jsonl"):
            continue
        for s in C.read_jsonl(os.path.join(sd, f)):
            key = s["w_from"][2:].rsplit(":", 1)[0]
            idx.setdefault(key, []).append((int(s["w_from"].rsplit(":", 1)[1]), int(s["w_to"].rsplit(":", 1)[1]), s["sent_id"]))
    for k in idx:
        idx[k].sort()
    return idx


def _chapter_spans(chapters, segs, total_ms):
    """Chapter k spans [end of chapter k-1's last segment, end of its own last segment] in ms (contiguous; fills and tightened
    pauses belong to the chapter they precede). Frames: start floor, end = next start, last = ceil(total)."""
    last = {}
    for sg in segs:
        last[sg["chapter"]] = sg["rec_out_ms"]
    t = 0
    for ch in chapters:
        ch["start_ms"], ch["end_ms"] = t, last[ch["id"]]
        t = ch["end_ms"]
    if t != total_ms:
        C.fail(f"chapters end at {t} ms, record is {total_ms} ms", 3)
    for k, ch in enumerate(chapters):
        ch["start_frame"] = frame_start(ch["start_ms"], FPS)
    for k, ch in enumerate(chapters):
        ch["end_frame"] = chapters[k + 1]["start_frame"] if k + 1 < len(chapters) else frame_end(total_ms, FPS)


def cmd_reframe(args):
    """ADR-002 fps reconcile: rewrite only fps and *_frame fields (plus chapter start_ms/end_ms) of master_edl.vN from its ms.
    The VO, word ids, segment ms and the version are unchanged; run `dc story lock --v N --note ...` next (word map + features)."""
    p = edl_path(args.v)
    edl = C.read_json(p)
    old = edl["fps"]
    edl["fps"] = FPS
    edl["total_frames"] = frame_end(edl["total_ms"], FPS)
    _chapter_spans(edl["chapters"], edl["segments"], edl["total_ms"])
    for sg in edl["segments"]:
        sg["rec_in_frame"] = frame_start(sg["rec_in_ms"], FPS)
        sg["rec_out_frame"] = frame_end(sg["rec_out_ms"], FPS)
    edl.setdefault("rules", {})["frames"] = (f"{FPS} fps (ADR-002 Q2.1); spans: start_frame = floor(s*fps), end_frame = ceil(s*fps) "
                                             "from integer ms; chapter end_frame = next chapter start_frame")
    C.write_json(p, edl)
    print(f"{C.rel(p)}: fps {old} -> {FPS}, {edl['total_frames']} frames, {len(edl['chapters'])} chapters, "
          f"{len(edl['segments'])} segments re-framed; next: dc story lock --v {args.v} --note '...'")
    return 0


def wm_enrich(v, edl):
    """Word map -> every kept word with permanent word id, master start/end (s, ms) and frames at the film fps (start floor,
    end ceil), sentence id, segment,
    chapter. Monotonic and complete, or fail. Idempotent; the VO does not change, only the word map's fields."""
    import bisect
    idx = _sentence_index()
    starts = {k: [a for a, _, _ in v_] for k, v_ in idx.items()}
    seg_sents = {s["seg_id"]: set(s.get("sentences") or []) for s in edl["segments"]}
    wm = C.read_jsonl(wm_path(v))
    WM_STATS.update(overlaps=0, max_overlap_ms=0)
    out, errs, prev, seen = [], [], None, set()
    for w in wm:
        key, n = w["word_id"][2:].rsplit(":", 1)
        n = int(n)
        j = bisect.bisect_right(starts.get(key, []), n) - 1
        sid = idx[key][j][2] if j >= 0 and idx[key][j][0] <= n <= idx[key][j][1] else None
        if sid is None:
            errs.append(f"{w['word_id']}: in no sentence")
        elif sid not in seg_sents.get(w["seg_id"], ()):
            errs.append(f"{w['word_id']}: sentence {sid} not listed in {w['seg_id']}")
        a, z = w["rec_start_ms"], w["rec_end_ms"]
        if z < a:
            errs.append(f"{w['word_id']}: end < start")
        if prev is not None and a < prev["rec_start_ms"]:
            errs.append(f"{w['word_id']}: start not monotonic after {prev['word_id']} ({a} < {prev['rec_start_ms']} ms)")
        if prev is not None and a < prev["rec_end_ms"]:   # source aligner overlap (kept as measured); never across a cut
            WM_STATS["overlaps"] += 1
            WM_STATS["max_overlap_ms"] = max(WM_STATS["max_overlap_ms"], prev["rec_end_ms"] - a)
            if prev["seg_id"] != w["seg_id"]:
                errs.append(f"{w['word_id']}: overlaps the previous segment's last word")
        if w["word_id"] in seen:
            errs.append(f"{w['word_id']}: duplicate")
        seen.add(w["word_id"])
        out.append({"v": 1, "word_id": w["word_id"], "rec_start_s": round(a / 1000, 3), "rec_end_s": round(z / 1000, 3),
                    "rec_start_ms": a, "rec_end_ms": z, "rec_start_frame": frame_start(a, FPS), "rec_end_frame": frame_end(z, FPS),
                    "sent_id": sid, "seg_id": w["seg_id"], "chapter": w["chapter"]})
        prev = w
    if errs:
        C.fail(f"word map: {len(errs)} problems, e.g. {errs[:5]}", 3)
    if len(out) != edl["stats"]["words"]:
        C.fail(f"word map has {len(out)} words, EDL stats say {edl['stats']['words']}", 3)
    C.write_jsonl(wm_path(v), out)
    return len(out)


def cmd_lock(args):
    if not args.inline and _queue_self("lock", ["--inline", "--v", str(args.v)] + (["--note", args.note] if args.note else []),
                                       f"story-lock-v{args.v}", 4.0) is not None:
        return 0
    import numpy as np
    import soundfile as sf
    v = args.v
    edl = C.read_json(edl_path(v))
    rc = C.read_json(C.p(REPORT_DIR, f"radio_check.v{v}.json"), {}) or {}
    if not rc.get("pass"):
        C.fail("radio-check has not passed; refusing to lock", 3)
    vo = C.p(edl["vo_wav"])
    if sha256(vo) != edl["vo_sha256"]:
        C.fail("VO hash differs from EDL", 3)
    nwords = wm_enrich(v, edl)
    print(f"word map: {nwords} words, monotonic, every word in a sentence of its segment", flush=True)
    fdir = C.p("corpus", "edl", "features")
    os.makedirs(fdir, exist_ok=True)
    win = 2048
    hann = np.hanning(win).astype(np.float32)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    edges = np.geomspace(60, 16000, 41)
    bidx = np.digitize(freqs, edges)
    out = {}
    with sf.SoundFile(vo) as f:
        for ch in edl["chapters"]:
            a, b = ch["start_frame"], ch["end_frame"]
            f.seek(a * SPF)
            x = f.read((b - a) * SPF + win, dtype="float32")
            n = b - a
            x = np.pad(x, (win // 2, max(0, (n * SPF + win) - len(x)) + win // 2))
            idx = np.arange(n) * SPF + SPF // 2
            fr = np.stack([x[i:i + win] for i in idx]) * hann
            mag = np.abs(np.fft.rfft(fr, axis=1))
            rms = np.sqrt((fr ** 2).mean(1) / (hann ** 2).mean())
            cen = (mag * freqs).sum(1) / np.maximum(mag.sum(1), 1e-9)
            bands = np.stack([mag[:, bidx == k].sum(1) for k in range(1, 41)], 1)
            lb = np.log1p(1000 * bands)
            flux = np.maximum(0, np.diff(lb, axis=0, prepend=lb[:1])).sum(1)
            flux = flux / max(1e-9, float(np.percentile(flux, 99)))
            rec = {"v": 1, "chapter": ch["id"], "fps": FPS, "start_ms": ch["start_ms"], "end_ms": ch["end_ms"], "start_frame": a, "end_frame": b, "vo_sha256": edl["vo_sha256"],
                   "edl": C.rel(edl_path(v)), "rms_dbfs": [round(float(20 * np.log10(max(r_, 1e-6))), 3) for r_ in rms],
                   "onset_strength": [round(float(min(1.0, q)), 3) for q in flux],
                   "centroid_hz": [round(float(c), 3) if r_ > 10 ** (-50 / 20) else 0.0 for c, r_ in zip(cen, rms)],
                   "notes": f"per frame k: window 2048 centred on record frame k (hop {SPF} = 1 frame at {FPS} fps); onset = positive log-band "
                            "spectral flux / chapter p99, clipped to 1; centroid 0 where RMS < -50 dBFS"}
            p = os.path.join(fdir, f"{ch['id']}.json")
            with open(p, "w", encoding="utf-8") as fh:
                json.dump(rec, fh, separators=(",", ":"))
            out[ch["id"]] = sha256(p)
    prev_lock = C.read_json(LOCK_JSON, {}) or {}
    same = prev_lock.get("version") == f"v{v}" and prev_lock.get("vo_sha256") == edl["vo_sha256"]
    lock = {"v": 1, "version": f"v{v}", "locked": prev_lock["locked"] if same else C.now_iso(), "gate": "G5",
            "edl": C.rel(edl_path(v)), "edl_sha256": sha256(edl_path(v)),
            "word_map": C.rel(wm_path(v)), "word_map_sha256": sha256(wm_path(v)),
            "vo": edl["vo_wav"], "vo_sha256": edl["vo_sha256"], "vo_bytes": os.path.getsize(vo),
            "total_frames": edl["total_frames"], "total_ms": edl["total_ms"], "fps": FPS, "fps_source": "ADR-002 Q2.1 (harness/state/decisions.json)",
            "frame_rule": "spans (words, segments, chapters): start_frame = floor(s*fps), end_frame = ceil(s*fps) from integer ms "
                          "(timeutil.frame_start/frame_end); chapter end_frame = next chapter start_frame; seconds/ms are the truth",
            "sr": SR, "words": nwords,
            "word_map_checks": {"start_monotonic": True, "in_sentence_of_segment": True, "source_overlaps_within_segment": WM_STATS["overlaps"],
                                "max_overlap_ms": WM_STATS["max_overlap_ms"], "overlaps_across_cuts": 0},
            "chapters": len(edl["chapters"]),
            "word_map_fields": "word_id, rec_start_s/rec_end_s (3 dp), rec_start_ms/rec_end_ms, rec_start_frame/rec_end_frame "
                               f"({FPS} fps, floor/ceil), sent_id, seg_id, chapter",
            "features_fields": f"rms_dbfs, onset_strength (0..1), centroid_hz; one value per record frame at {FPS} fps, 3 dp",
            "features": out,
            **({"relocked": C.now_iso(), "relock_note": args.note} if same and args.note else {}),
            "rule": "Picture follows this lock. Any change bumps the version (vN+1) and the compiler re-times specs; no manual nudges."}
    C.write_json(LOCK_JSON, lock)
    old = os.path.join(EDL_DIR, f"lock.v{v}.json")
    if os.path.exists(old):
        os.remove(old)
    print(json.dumps({k: lock[k] for k in ("edl_sha256", "word_map_sha256", "vo_sha256", "total_frames")}))
    return 0


# ================================================================================================================== gapscan
def cmd_gapscan(args):
    """Measured silence inside every word gap >= 250 ms of every audio the candidate uses (16 kHz decodes, 10 ms RMS)."""
    if not args.inline and _queue_self("gapscan", ["--inline", "--candidate", args.candidate], "story-gapscan", 2.0) is not None:
        return 0
    import numpy as np
    import soundfile as sf
    from . import audio as A
    cand = C.read_json(C.p(args.candidate))
    aids = sorted({sg["audio_id"] for b in cand["blocks"] for sg in b["segments"]})
    out, nrun = {}, 0
    for aid in aids:
        src = Src.get(aid)
        x, sr = sf.read(A.wav16_path(aid), dtype="float32")
        assert sr == 16000
        n = len(x) // 160
        lv = 20 * np.log10(np.maximum(np.sqrt((x[:n * 160].astype(np.float64) ** 2).reshape(n, 160).mean(1)), 1e-9))
        sil = lv < SILENT_DBFS
        g = {}
        ws = src.words
        for k in range(-1, len(ws)):
            a = ws[k]["end_ms"] if k >= 0 else 0
            b = ws[k + 1]["start_ms"] if k + 1 < len(ws) else src.dur_ms
            if b - a < CUT_MIN_MS and 0 <= k < len(ws) - 1:
                continue
            f0, f1 = -(-a // 10), b // 10
            runs, j = [], f0
            while j < min(f1, n):
                if sil[j]:
                    q = j
                    while q + 1 < min(f1, n) and sil[q + 1]:
                        q += 1
                    if (q + 1 - j) >= 3:
                        runs.append([j * 10, (q + 1) * 10])
                    j = q + 1
                else:
                    j += 1
            g[str(k)] = runs
            nrun += len(runs)
        out[aid] = g
        print(f"  {aid}: {len(g)} gaps scanned", flush=True)
    C.write_json(GAPSCAN_JSON, {"v": 1, "method": f"16 kHz decode, 10 ms RMS < {SILENT_DBFS} dBFS, runs >= 30 ms, gaps >= {CUT_MIN_MS} ms "
                                                  "(plus file start/end); key = index of the word before the gap (-1 = file start)",
                                "candidate": args.candidate, "created": C.now_iso(), "runs": nrun, "audio": out}, indent=None)
    print(f"wrote {C.rel(GAPSCAN_JSON)} ({nrun} silent runs)")
    return 0


# ================================================================================================================ fyi sample
FYI_DIR = C.p("data", "delivery", "fyi")


def _fmt(ms):
    return f"{ms // 3600000}:{ms % 3600000 // 60000:02d}:{ms % 60000 / 1000:06.3f}"


def cmd_sample(args):
    """3-minute radio-edit FYI sample spanning trunk -> Deep-Dive -> trunk (a cut of the locked VO, AAC 160 kbps in .m4a).

    The window starts 400 ms before a sentence onset of the trunk chapter before the Deep-Dive, chosen so that the Deep-Dive
    sits as close to the middle as possible and the end (start + dur) falls in a pause between words. 300 ms fades at both ends.
    """
    import bisect
    v, dur = args.v, args.dur_s * 1000
    edl = C.read_json(edl_path(v))
    chs = edl["chapters"]
    i = next(k for k, c in enumerate(chs) if c["id"] == args.around)
    dd, pre, post = chs[i], chs[i - 1], chs[i + 1]
    if dd["kind"] != "deep-dive" or pre["kind"] != "trunk" or post["kind"] != "trunk":
        C.fail(f"{args.around} is not a Deep-Dive between two trunk chapters", 2)
    f2ms = lambda f: f * 1000 // FPS  # noqa: E731
    dd_a, dd_b = f2ms(dd["start_frame"]), f2ms(dd["end_frame"])
    if dd_b - dd_a > dur - 20000:
        C.fail(f"{args.around} is {(dd_b - dd_a) / 1000:.1f} s; needs <= {dur / 1000 - 20:.0f} s for a 3-minute window", 2)
    wm = C.read_jsonl(wm_path(v))
    ws = [w["rec_start_ms"] for w in wm]
    lead = (dur - (dd_b - dd_a)) // 2
    best = None
    sent_first = {}
    for w in wm:
        if w["chapter"] == pre["id"]:
            sent_first.setdefault(w["sent_id"], w["rec_start_ms"])
    for t in sent_first.values():
        st = t - 400
        end = st + dur
        k = bisect.bisect_right(ws, end) - 1
        in_word = k >= 0 and wm[k]["rec_start_ms"] - 60 <= end <= wm[k]["rec_end_ms"] + 90
        if end > f2ms(post["end_frame"]) or st < f2ms(pre["start_frame"]):
            continue
        score = abs((dd_a - st) - lead) + (10 ** 7 if in_word else 0)
        if best is None or score < best[0]:
            best = (score, st)
    if best is None:
        C.fail("no sentence onset gives a valid window", 3)
    st = best[1]
    os.makedirs(FYI_DIR, exist_ok=True)
    out = os.path.join(FYI_DIR, args.out)
    vo = C.p(edl["vo_wav"])
    d = dur / 1000
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{st / 1000:.3f}", "-t", f"{d:.3f}", "-i", vo,
                    "-af", f"afade=t=in:d=0.3,afade=t=out:st={d - 0.3:.3f}:d=0.3", "-c:a", "aac", "-b:a", "160k", "-ar", str(SR),
                    "-ac", "1", "-movflags", "+faststart", "-map_metadata", "-1",
                    "-metadata", f"title=DA Camp x NilePay - radio edit v{v} FYI sample ({pre['id']} > {dd['id']} > {post['id']})", out],
                   check=True)
    win = []
    for c in (pre, dd, post):
        a, b = max(st, f2ms(c["start_frame"])), min(st + dur, f2ms(c["end_frame"]))
        win.append({"chapter": c["id"], "kind": c["kind"], "title_en": c.get("title_en"), "title_ar": c.get("title_ar"),
                    "master_from_ms": a, "master_to_ms": b, "master_from": _fmt(a), "master_to": _fmt(b),
                    "sample_from_s": round((a - st) / 1000, 3), "sample_to_s": round((b - st) / 1000, 3)})
    rec = {"v": 1, "edl": C.rel(edl_path(v)), "vo_sha256": edl["vo_sha256"], "around": dd["id"],
           "master_from_ms": st, "master_to_ms": st + dur, "master_from": _fmt(st), "master_to": _fmt(st + dur), "dur_s": d,
           "window": win, "codec": "AAC-LC 160 kbps, 48 kHz mono, .m4a (faststart); 300 ms fades at both ends",
           "file": {"path": C.rel(out), "sha256": sha256(out), "bytes": os.path.getsize(out)}, "created": C.now_iso(),
           "user_notice": "ADR-001 waivers: W-001-RT (runtime 3:51:00 > 3.5 h target) and W-001-D2 (103 English P01 idea units not in the film)."}
    C.write_json(C.p(REPORT_DIR, f"fyi_sample.v{v}.json"), rec)
    print(json.dumps(rec, ensure_ascii=False))
    return 0


def register(st):
    s = st.add_parser("cut", help="ADR-001 candidate -> corpus/edl/master_edl.vN.json + word_map.vN.jsonl (cut rules of docs/plan/03 P5.3)")
    s.add_argument("--candidate", default=ADR_CANDIDATE)
    s.add_argument("--v", type=int, default=1)
    s.set_defaults(fn="radio.cmd_cut")
    s = st.add_parser("gapscan", help="measured silent runs inside every word gap (16 kHz decodes) -> corpus/edl/gapscan.json (queued)")
    s.add_argument("--candidate", default=ADR_CANDIDATE)
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="radio.cmd_gapscan")
    s = st.add_parser("radio", help="render data/derived/audio/master_vo_vN.flac (48 kHz/24-bit) from the EDL (queued)")
    s.add_argument("--v", type=int, default=1)
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="radio.cmd_radio")
    s = st.add_parser("radio-check", help="clipped words (static + MMS re-align on 20 seeded windows), per-minute loudness, gaps (queued)")
    s.add_argument("--v", type=int, default=1)
    s.add_argument("--inline", action="store_true")
    s.add_argument("--tp", action="store_true", help="re-measure true peak on the whole file (reads it into RAM)")
    s.set_defaults(fn="radio.cmd_radio_check")
    s = st.add_parser("lock", help="G5 lock: word map fields, per-chapter features at the film fps, corpus/edl/lock.json (queued; needs a passing radio-check)")
    s.add_argument("--v", type=int, default=1)
    s.add_argument("--note", default="", help="why an existing lock of the same version and VO is re-derived (kept in lock.json)")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="radio.cmd_lock")
    s = st.add_parser("reframe", help="re-derive EDL fps and frame fields from its ms at the ADR-002 fps (audio, ids, ms untouched); then run lock")
    s.add_argument("--v", type=int, default=1)
    s.set_defaults(fn="radio.cmd_reframe")
    s = st.add_parser("sample", help="3-minute FYI radio-edit sample, trunk -> Deep-Dive -> trunk -> data/delivery/fyi/<out> (AAC 160k)")
    s.add_argument("--v", type=int, default=1)
    s.add_argument("--around", default="DD-P11-3", help="a Deep-Dive between two trunk chapters, shorter than dur - 20 s")
    s.add_argument("--dur-s", type=int, default=180)
    s.add_argument("--out", default="radio_edit_sample.m4a")
    s.set_defaults(fn="radio.cmd_sample")
