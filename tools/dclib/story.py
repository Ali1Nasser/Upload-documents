"""P5 story editor (docs/plan/03 P5.1): reviewed prerequisite graph, candidate EDLs A/B/B100/C/D, metrics, outlines.

`dc story order`      apply corpus/graph/requires_review.jsonl -> corpus/graph/requires_clean.jsonl + reports/story/order_clean.{json,md}
`dc story candidates` build corpus/edl/candidates/<X>.json, data/derived/story/outline_<X>.md, reports/story/candidates.{json,md}

Definitions (also printed into reports/story/candidates.md):
- novel sentence  = its idea unit is novel_vs_trunk (P4 graph) and it is not a clear restatement in reports/graph/novelty_audit.json.
- B window        = contiguous S4 stretch, merged greedily from novel cores across restated gaps <= 20 s while >= 60 % of its
                    idea units are novel; kept when the trimmed window spans >= 20 s (B100: every core is kept, no minimum).
- coverage        = idea units said by an EDL sentence, or covered by an EDL S1 sentence (covered_by_trunk), / all 2,846 units.
- redundancy      = EDL speech time whose idea unit was already covered earlier in the EDL / all EDL speech time.
- voice           = S1 (trunk narrator) | A | B | C (S4 ECAPA clusters, corpus/audio/voices.json); a switch = adjacent spoken
                    segments with different voice labels (cards do not reset).
- prerequisite violation = X's first *use* precedes Y's first mention for a cleaned `requires` edge X -> Y. Uses exclude mentions
                    removed as false positives, forward-reference previews (review log), and signposting: transition/recap sentences
                    and the orientation material (S1 CH-00..CH-02, S4 P00/P00b/P01).
"""
import collections
import re
import json
import os

from . import common as C

ORIENT_CH = {"CH-00", "CH-01", "CH-02"}
ORIENT_PARTS = {"a:S4:P00", "a:S4:P00b", "a:S4:P01"}
SIGNPOST_KINDS = {"transition", "recap"}
CUT_MIN_MS, PRE_MS, POST_MS = 250, 60, 90
CARD_S, PART_CARD_S = 2.0, 2.0
RUN_MIN_MS, NOVEL_FRAC, MERGE_GAP_MS = 20000, 0.60, 20000

# Editorial home chapters per S4 part (in order; a part may split across these, monotone). One voice per trunk-chapter block.
PART_CH = {
    "P00b": ["CH-01"], "P00": ["CH-01"], "P01": ["CH-02"], "P02": ["CH-03", "CH-04"], "P03": ["CH-05"], "P04": ["CH-05"],
    "P05": ["CH-06", "CH-07"], "P06": ["CH-08", "CH-09"], "P07": ["CH-14", "CH-21"], "P08": ["CH-10", "CH-11"],
    "P09": ["CH-12", "CH-13"], "P10": ["CH-14"], "P11": ["CH-15", "CH-16", "CH-17"], "P12": ["CH-18", "CH-19"],
    "P13": ["CH-20"], "P14": ["CH-21"], "P15": ["CH-22"], "P16": ["CH-23"], "P17": ["CH-27"], "P18": ["CH-24", "CH-25"],
    "P19": ["CH-26", "CH-27"], "P20": ["CH-28"], "P21": ["CH-29", "CH-30"], "P22": ["CH-31", "CH-32"], "P23": ["CH-33"],
    "P24": ["CH-34"], "P25": ["CH-35"]}
PART_SEQ = ["P00b", "P00", "P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12", "P13", "P14",
            "P15", "P16", "P17", "P18", "P19", "P20", "P21", "P22", "P23", "P24", "P25"]
# inside one chapter block, the part that continues the trunk chapter goes first (P10 tuning after CH-14, P19b's transaction after CH-27)
B_BLOCK_ORDER = {"P07": PART_SEQ.index("P10") + 0.5, "P17": PART_SEQ.index("P19") + 0.5}
PART_TITLE = {
    "P00": "The whole roadmap: from zero to an AI-powered data platform",
    "P00b": "The real job, the journey map and the data contract (alternate take of part 0)",
    "P01": "The journey and the visual language: how we will learn and what we will watch",
    "P02": "The machine, files and the terminal: from the byte to the first pipeline",
    "P03": "Linux Admin I: permissions, users, processes and packages",
    "P04": "Linux Admin II: services, logs, disk, SSH and security, the night of the outage",
    "P05": "Python I: from value to function, collections, files and environments",
    "P06": "Python II: state, memory, errors, decorators, tests and Git",
    "P07": "Python for data: pandas, database connections, ETL, pools and tests",
    "P08": "SQL I: why a database, the relational model, normalization, the query pipeline and grain",
    "P09": "SQL II: joins and fan-out, windows, CTEs, NULL logic, transactions and deadlock",
    "P10": "SQL III: indexes, reading the plan, the tuning loop, dialects and SQL on big data",
    "P11": "Analytics: dirty data and applied steps, statistics from mean to A/B, the semantic model and the report",
    "P12": "Software craft and DSA: coupling, cohesion, SOLID, OOP and patterns, refactoring, review, algorithms",
    "P13": "Systems and the web: DNS to database, HTTP and status codes, API contracts with FastAPI, identity and security",
    "P14": "Backend in depth: Java, collections and streams, JDBC and transactions, connection pools, Spring Boot, concurrency, saga",
    "P15": "ETL and DAGs: validate before transform, six quality dimensions, quarantine, Airflow inside, idempotent retries",
    "P16": "The warehouse: ODS/DW/ADS layers, star schema and grain, the cube, non-additive measures, SCD",
    "P17": "Huawei DataCube and Mobile Money reports: sources and layers, storage, the five-stage model, 24 KPIs, governance",
    "P18": "Big data: Hadoop (HDFS, YARN, MapReduce) and Spark (laziness, stages, partitions, shuffle, skew, PySpark)",
    "P19": "Kafka and streaming, and one Mobile Money transaction: offsets, lag, delivery, Nextgen D&IM flows",
    "P20": "Reconciliation, D&IM testing, governance and DR: four kinds of difference, k-anonymity, RPO/RTO, country isolation",
    "P21": "Machine learning: business question and baseline, split and leakage, model families, honest evaluation",
    "P22": "Deep learning and Transformers: a neuron by hand to backpropagation, tokens to attention, LLM concepts and prompting",
    "P23": "Embeddings, RAG and agents: meaning as position, the pipeline and its failure stages, the guarded agent loop",
    "P24": "Ship it: containers and layer cache, docker-compose, the CI/CD gate and rollback, IAM, three signals, an incident",
    "P25": "Evidence and career: the artifact chain, the five-minute defence, interviews, study plan, the six branches",
}


# ----------------------------------------------------------------------------------------------------------------- loading
def _load():
    S = {}
    sd = C.p("corpus", "sentences")
    for f in sorted(os.listdir(sd)):
        if f.endswith(".jsonl"):
            for s in C.read_jsonl(os.path.join(sd, f)):
                S[s["sent_id"]] = s
    ius = C.read_jsonl(C.p("data", "derived", "graph", "idea_units.jsonl"))
    IU = {u["id"]: u for u in ius}
    by_s = {m: u["id"] for u in ius for m in u["members"]}
    cover_inv = collections.defaultdict(set)
    for u in ius:
        for x in u.get("covered_by_trunk") or []:
            cover_inv[x].add(u["id"])
    audit = C.read_json(C.p("reports", "graph", "novelty_audit.json"), {}) or {}
    rest_pairs = [r for st in (audit.get("strata") or {}).values() for r in st.get("clear_restatements") or []]
    restated = {r["s4"] for r in rest_pairs}
    for r in rest_pairs:   # an audit-confirmed restatement is covered by the S1 sentence it restates
        if r["s4"] in by_s:
            cover_inv[r["restates"]].add(by_s[r["s4"]])
    by_a = collections.defaultdict(list)
    for s in S.values():
        by_a[s["audio_id"]].append(s)
    for a in by_a:
        by_a[a].sort(key=lambda s: s["start_ms"])
        for k, s in enumerate(by_a[a]):
            s["_k"] = k
    novel = {sid: IU[by_s[sid]]["novel_vs_trunk"] and sid not in restated for sid in S if sid.startswith("s:S4")}
    vj = C.read_json(C.p("corpus", "audio", "voices.json"))
    voice = {"a:S1:ar-natural": "S1"}
    for cl in vj["clusters"]:
        lab = "A" if "a:S1:ar-natural" in cl else "C" if "a:S5:en-natural" in cl else "B"
        for a in cl:
            if a.startswith("a:S4"):
                voice[a] = lab
    sim = {a: (v or {}).get("a:S1:ar-natural") for a, v in (vj.get("pair_similarity") or {}).items()}
    sim["a:S1:ar-natural"] = 1.0
    assets = {a["audio_id"]: a for a in C.read_json(C.p("corpus", "audio", "assets.json"))}
    chs = C.read_json(C.p("corpus", "canon", "chapters.json"))["chapters"]
    return dict(S=S, IU=IU, by_s=by_s, cover_inv=cover_inv, by_a=by_a, novel=novel, voice=voice, sim=sim, assets=assets,
                chs=chs, CH={c["id"]: c for c in chs}, restated=restated)


def _graph(D, ctx=None):
    """Cleaned requires edges + mention overrides + preview pairs, from the review log.

    Edge drops/inversions, false-positive mentions and sense filters are global facts. Forward-reference previews recorded
    against a candidate order (`context`) apply only to that candidate.
    """
    review = [r for r in C.read_jsonl(C.p("corpus", "graph", "requires_review.jsonl"))
              if not (r.get("context") and r["action"] == "keep_preview" and r["context"] != ctx)]
    req = {}
    for c in C.read_jsonl(C.p("corpus", "graph", "concepts.jsonl")):
        req[c["id"]] = list(dict.fromkeys(c.get("requires") or []))
    ments = collections.defaultdict(set, {c: set(v) for c, v in (C.read_json(C.p("data", "derived", "graph", "concept_mentions.json"), {}) or {}).items()})
    log, removed = [], set()
    for r in review:
        x, y = r["concept"], r["requires"]
        if r["action"] == "drop" and y in req.get(x, []):
            req[x].remove(y)
            log.append(("drop", x, y))
        elif r["action"] == "invert":
            if y in req.get(x, []):
                req[x].remove(y)
            req.setdefault(y, [])
            if x not in req[y]:
                req[y].append(x)
            log.append(("invert", x, y))
        elif r["action"] == "remove_mention":
            ments[x].discard(r["sent_id"])
            removed.add((x, r["sent_id"]))
        elif r["action"] == "add_mention":
            ments[r["add_concept"]].add(r["sent_id"])
        elif r["action"] == "sense_filter":   # homonym: drop the concept's S4 mentions in parts that use the other sense
            for p in r["drop_parts"]:
                for s in D["by_a"].get(f"a:S4:{p}", []):
                    removed.add((x, s["sent_id"]))
                    ments[x].discard(s["sent_id"])
    s1 = D["by_a"]["a:S1:ar-natural"]
    rank = {s["sent_id"]: k for k, s in enumerate(s1)}
    preview = set()
    for r in review:
        if r["action"] == "keep_preview" and r.get("preview_sids"):
            preview |= {(r["concept"], t) for t in r["preview_sids"]}
        elif r["action"] == "keep_preview":
            x, y = r["concept"], r["requires"]
            ys = [rank[t] for t in ments.get(y, ()) if t in rank]
            lim = min(ys) if ys else len(s1)
            preview |= {(x, t) for t in ments.get(x, ()) if t in rank and rank[t] < lim}
    s_conc = collections.defaultdict(set)
    for c, sids in ments.items():
        for t in sids:
            s_conc[t].add(c)
    return dict(req=req, s_conc=s_conc, preview=preview, review=review, log=log, removed=removed)


def _is_use(D, G, c, sid):
    s = D["S"][sid]
    if (c, sid) in G["preview"] or s.get("kind") in SIGNPOST_KINDS:
        return False
    # S4: the alias tagger is homonym-prone on NotebookLM text ("cd", "solid", "secret"); a use needs the P3 per-sentence
    # term annotation to agree. S1 mentions were reviewed edge by edge (requires_review.jsonl).
    if sid.startswith("s:S4") and c not in (s.get("terms") or ()):
        return False
    if s["audio_id"] in ORIENT_PARTS or (s["audio_id"].startswith("a:S1") and s.get("chapter") in ORIENT_CH):
        return False
    return True


def _concepts(D, G, sid):
    cs = set(G["s_conc"].get(sid, ())) | (set(D["S"][sid].get("terms") or ()) if sid.startswith("s:S4") else set())
    return {c for c in cs if (c, sid) not in G["removed"]}


def violations(D, G, order):
    first_any, first_use = {}, {}
    for i, sid in enumerate(order):
        for c in _concepts(D, G, sid):
            first_any.setdefault(c, i)
            if c not in first_use and _is_use(D, G, c, sid):
                first_use[c] = i
    viol, missing = [], []
    for x, ys in G["req"].items():
        if x not in first_use:
            continue
        for y in ys:
            if y not in first_any:
                missing.append({"concept": x, "requires": y, "concept_first": order[first_use[x]]})
            elif first_any[y] > first_use[x]:
                viol.append({"concept": x, "requires": y, "concept_first": order[first_use[x]], "req_first": order[first_any[y]],
                             "gap_sentences": first_any[y] - first_use[x]})
    return sorted(viol, key=lambda v: -v["gap_sentences"]), missing


def cycles(req):
    color, out = {}, []

    def dfs(u, stack):
        color[u] = 1
        for v in req.get(u, []):
            if color.get(v) == 1:
                out.append(stack[stack.index(v):] + [v])
            elif not color.get(v):
                dfs(v, stack + [v])
        color[u] = 2
    for u in sorted(req):
        if not color.get(u):
            dfs(u, [u])
    return out


# ----------------------------------------------------------------------------------------------------------------- order
def cmd_order(args):
    D = _load()
    G = _graph(D)
    s1 = [s["sent_id"] for s in D["by_a"]["a:S1:ar-natural"]]
    v, miss = violations(D, G, s1)
    cyc = cycles(G["req"])
    with open(C.p("corpus", "graph", "requires_clean.jsonl"), "w", encoding="utf-8") as f:
        for x in sorted(G["req"]):
            for y in G["req"][x]:
                f.write(json.dumps({"v": 1, "src": x, "dst": y, "type": "requires",
                                    "evidence": "definition batch, story-editor review (corpus/graph/requires_review.jsonl)"}) + "\n")
    cls = collections.Counter(r["cls"] for r in G["review"])
    res = {"v": 1, "created": C.now_iso(), "edges_before": 935, "edges_after": sum(len(y) for y in G["req"].values()),
           "review": dict(cls), "violations_s1_before": 142, "violations_s1_after": len(v), "cycles_after": len(cyc),
           "missing_prereq_in_s1": len(miss), "violations": v, "cycles": cyc}
    C.write_json(C.p("reports", "story", "order_clean.json"), res)
    print(json.dumps({k: res[k] for k in res if k not in ("violations", "cycles")}))
    for x in v[:40]:
        print(x)
    return 0 if not v and not cyc else 1


# ----------------------------------------------------------------------------------------------------------------- windows
def _gap_before(ss, k):
    return 10 ** 6 if k == 0 else ss[k]["start_ms"] - ss[k - 1]["end_ms"]   # file start: nothing to cut away


def _gap_after(ss, k):
    return 10 ** 6 if k == len(ss) - 1 else ss[k + 1]["start_ms"] - ss[k]["end_ms"]


def _units(D, ss, a, b):
    u = {D["by_s"][ss[k]["sent_id"]] for k in range(a, b + 1)}
    return u, {x for x in u if D["IU"][x]["novel_vs_trunk"]}


def part_windows(D, a, min_ms):
    """Novel cores merged while >= 60 % of the window's idea units are novel; restatements inside dropped at clean cuts."""
    ss = D["by_a"][a]
    nov = [D["novel"][s["sent_id"]] for s in ss]
    cores, k = [], 0
    while k < len(ss):
        if nov[k]:
            j = k
            while j + 1 < len(ss) and nov[j + 1]:
                j += 1
            cores.append([k, j])
            k = j + 1
        else:
            k += 1
    wins = []
    for c in cores:
        if wins and ss[c[0]]["start_ms"] - ss[wins[-1][1]]["end_ms"] <= MERGE_GAP_MS:
            u, n = _units(D, ss, wins[-1][0], c[1])
            if len(n) / max(1, len(u)) >= NOVEL_FRAC:
                wins[-1][1] = c[1]
                continue
        wins.append(list(c))
    out = []
    for w0, w1 in wins:
        keep = {k: nov[k] for k in range(w0, w1 + 1)}
        # keep prediction/question setups that frame a novel answer, and answers to novel questions
        for k in range(w0, w1 + 1):
            kind = ss[k].get("kind")
            if not keep[k] and kind in ("question", "prediction") and k + 1 <= w1 and nov[k + 1]:
                keep[k] = True
            if nov[k] and kind in ("question", "prediction") and k + 1 <= w1 and not keep[k + 1]:
                keep[k + 1] = True
            if not keep[k] and kind == "transition" and ss[k]["end_ms"] - ss[k]["start_ms"] < 4000 and k + 1 <= w1 and nov[k + 1]:
                keep[k] = True
        _restore_unclean(ss, keep, w0, w1)
        ks = [k for k in range(w0, w1 + 1) if keep[k]]
        if not ks:
            continue
        a0, a1 = ks[0], ks[-1]
        while a0 > 0 and _gap_before(ss, a0) < CUT_MIN_MS:     # extend to a clean cut point
            a0 -= 1
            keep[a0] = True
        while a1 < len(ss) - 1 and _gap_after(ss, a1) < CUT_MIN_MS:
            a1 += 1
            keep[a1] = True
        if ss[a1]["end_ms"] - ss[a0]["start_ms"] < min_ms:
            continue
        out.append({"audio_id": a, "k0": a0, "k1": a1, "keep": [k for k in range(a0, a1 + 1) if keep.get(k)]})
    return out


def _restore_unclean(ss, keep, w0, w1):
    """A dropped run inside the window needs clean cuts (pause >= 250 ms) on both sides, else it stays (counted as redundancy)."""
    k = w0
    while k <= w1:
        if keep.get(k):
            k += 1
            continue
        j = k
        while j + 1 <= w1 and not keep.get(j + 1):
            j += 1
        if k > w0 and j < w1 and (_gap_before(ss, k) < CUT_MIN_MS or _gap_after(ss, j) < CUT_MIN_MS):
            for t in range(k, j + 1):
                keep[t] = True
        k = j + 1


def _affinity(D, G, w, chapters):
    ss = D["by_a"][w["audio_id"]]
    sc = collections.Counter()
    c_ch = G["_c_ch"]
    for k in range(max(0, w["k0"] - 3), min(len(ss), w["k1"] + 4)):
        sid = ss[k]["sent_id"]
        for c in G["s_conc"].get(sid, ()):
            chs = c_ch.get(c, set())
            for ch in chapters:
                if ch in chs:
                    sc[ch] += 1.0 / len(chs)
        u = D["IU"][D["by_s"][sid]]
        for x in u["members"] + (u.get("covered_by_trunk") or []) + (u.get("extends_trunk") or []):
            if x.startswith("s:S1"):
                ch = D["S"][x].get("chapter")
                if ch in chapters:
                    sc[ch] += 1.0
    return [sc[ch] for ch in chapters]


def place(D, G, wins, chapters):
    """Monotone (no reordering inside a part) assignment of windows to the part's home chapters, max total affinity."""
    if len(chapters) == 1:
        return [chapters[0]] * len(wins)
    A = [_affinity(D, G, w, chapters) for w in wins]
    n, m = len(wins), len(chapters)
    best = [[-1e9] * m for _ in range(n)]
    arg = [[0] * m for _ in range(n)]
    for j in range(m):
        best[0][j] = A[0][j] - 0.01 * j
    for i in range(1, n):
        for j in range(m):
            p = max(range(j + 1), key=lambda t: best[i - 1][t])
            best[i][j], arg[i][j] = best[i - 1][p] + A[i][j] - 0.01 * j, p
    j = max(range(m), key=lambda t: best[n - 1][t])
    out = [None] * n
    for i in range(n - 1, -1, -1):
        out[i] = chapters[j]
        j = arg[i][j]
    return out


# ----------------------------------------------------------------------------------------------------------------- blocks
def _segments(D, a, ks):
    ss = D["by_a"][a]
    segs, cur = [], []
    for k in ks:
        if cur and k != cur[-1] + 1:
            segs.append(cur)
            cur = []
        cur.append(k)
    if cur:
        segs.append(cur)
    out = []
    for g in segs:
        s0, s1 = ss[g[0]], ss[g[-1]]
        out.append({"audio_id": a, "src_in_ms": max(0, s0["start_ms"] - PRE_MS), "src_out_ms": s1["end_ms"] + POST_MS,
                    "sentences": [ss[k]["sent_id"] for k in g], "lead_gap_ms": min(max(s0.get("pause_before_ms") or 0, CUT_MIN_MS), 700)})
    return out


def trunk_block(D, ch, sids=None, kind="trunk"):
    c = D["CH"][ch]
    s1 = [s for s in D["by_a"]["a:S1:ar-natural"] if s.get("chapter") == ch]
    if sids is None:
        segs = [{"audio_id": "a:S1:ar-natural", "src_in_ms": c["start_ms"], "src_out_ms": c["end_ms"],
                 "sentences": [s["sent_id"] for s in s1], "lead_gap_ms": 0}]
    else:
        segs = _segments(D, "a:S1:ar-natural", [D["S"][x]["_k"] for x in sids])
    return {"id": ch if kind == "trunk" else f"{ch}-ins", "kind": kind, "chapter": ch, "title_en": c["title_en"], "act": c["act"],
            "voice": "S1", "segments": segs}


def dd_block(D, a, wins, anchor, suffix):
    p = a.split(":")[-1]
    segs = []
    for w in wins:
        segs += _segments(D, a, w["keep"])
    return {"id": f"DD-{p}{suffix}", "kind": "deep-dive", "part": p, "anchor": anchor, "title_en": PART_TITLE.get(p, p),
            "act": D["CH"][anchor]["act"] if anchor in D["CH"] else None, "voice": D["voice"][a], "segments": segs,
            "windows": [{"k0": w["k0"], "k1": w["k1"], "dur_s": round((D["by_a"][a][w["k1"]]["end_ms"] - D["by_a"][a][w["k0"]]["start_ms"]) / 1000, 1)}
                        for w in wins]}


def _dedupe_s4(D, blocks):
    """An idea unit said in several S4 parts is kept once: the voice-A member if any, else the first in EDL order."""
    occ = collections.defaultdict(list)
    for bi, b in enumerate(blocks):
        if b["kind"] != "deep-dive":
            continue
        for si, sg in enumerate(b["segments"]):
            for sid in sg["sentences"]:
                occ[D["by_s"][sid]].append((bi, si, sid))
    drop = set()
    for u, lst in occ.items():
        if len(lst) < 2:
            continue
        lst2 = sorted(lst, key=lambda t: (0 if D["voice"][D["S"][t[2]]["audio_id"]] == "A" else 1, t[0], t[1]))
        for t in lst2[1:]:
            if D["S"][t[2]].get("kind") not in ("question", "prediction"):
                drop.add(t[2])
    if not drop:
        return blocks, 0
    n = 0
    for b in blocks:
        if b["kind"] != "deep-dive":
            continue
        a = "a:S4:" + b["part"]
        ss = D["by_a"][a]
        ks = [D["S"][sid]["_k"] for sg in b["segments"] for sid in sg["sentences"]]
        keep = {k: D["S"][ss[k]["sent_id"]]["sent_id"] not in drop for k in ks}
        # only drop where both cuts are clean
        for k in ks:
            if not keep[k]:
                j0, j1 = k, k
                if _gap_before(ss, j0) < CUT_MIN_MS or _gap_after(ss, j1) < CUT_MIN_MS:
                    keep[k] = True
        new = [k for k in ks if keep[k]]
        n += len(ks) - len(new)
        b["segments"] = _segments(D, a, new) if new else []
    return [b for b in blocks if b["kind"] != "deep-dive" or b["segments"]], n


def build_A(D, G):
    return [trunk_block(D, c["id"]) for c in D["chs"]]


def build_B(D, G, min_ms):
    per_ch = collections.defaultdict(list)
    for p in PART_SEQ:
        a = f"a:S4:{p}"
        wins = part_windows(D, a, min_ms)
        if not wins:
            continue
        chs = place(D, G, wins, PART_CH[p])
        groups = collections.OrderedDict()
        for w, ch in zip(wins, chs):
            groups.setdefault(ch, []).append(w)
        multi = len(groups) > 1
        for gi, (ch, ws) in enumerate(groups.items()):
            per_ch[ch].append(dd_block(D, a, ws, ch, "abcdefgh"[gi] if multi else ""))
    blocks = []
    for c in D["chs"]:
        blocks.append(trunk_block(D, c["id"]))
        blocks += sorted(per_ch.get(c["id"], []), key=lambda b: B_BLOCK_ORDER.get(b["part"], PART_SEQ.index(b["part"])))
    return _dedupe_s4(D, blocks)


def build_C(D, G):
    """S4 spine (all parts; P00b only as B windows) + S1 cold open, act-transition openers and S1-only idea units."""
    IU = D["IU"]
    s1 = D["by_a"]["a:S1:ar-natural"]
    acts_first = {}
    for c in D["chs"]:
        acts_first.setdefault(c["act"], c["id"])
    sel = set()
    for s in s1:
        ch = s.get("chapter")
        u = IU[D["by_s"][s["sent_id"]]]
        only_s1 = all(m.startswith("s:S1") for m in u["members"])
        if ch == "CH-00" or only_s1:
            sel.add(s["_k"])
    for act, ch in acts_first.items():
        ks = [s["_k"] for s in s1 if s.get("chapter") == ch]
        t0 = s1[ks[0]]["start_ms"]
        for k in ks:
            sel.add(k)
            if s1[k]["end_ms"] - t0 >= 12000:
                break
    for k in list(sel):  # bridge one-sentence holes inside a chapter
        if k + 2 in sel and k + 1 not in sel and s1[k].get("chapter") == s1[k + 2].get("chapter"):
            sel.add(k + 1)
    by_ch = collections.defaultdict(list)
    for k in sorted(sel):
        by_ch[s1[k]["chapter"]].append(s1[k]["sent_id"])
    # where each S1 chapter's material lands in the spine: after the last part homed on it (monotone)
    seq = [p for p in PART_SEQ if p != "P00b"]
    home = {}
    for i, p in enumerate(seq):
        for ch in PART_CH[p]:
            home[ch] = max(home.get(ch, -1), i)
    after, run = {}, -1
    for c in D["chs"][1:]:
        run = max(run, home.get(c["id"], run))
        after.setdefault(run, []).append(c["id"])
    blocks = [trunk_block(D, "CH-00", by_ch["CH-00"], kind="trunk-insert")]
    blocks[0]["id"] = "CH-00"
    for ch in after.get(-1, []):
        if by_ch.get(ch):
            blocks.append(trunk_block(D, ch, by_ch[ch], kind="trunk-insert"))
    for i, p in enumerate(seq):
        a = f"a:S4:{p}"
        ss = D["by_a"][a]
        b = dd_block(D, a, [{"k0": 0, "k1": len(ss) - 1, "keep": list(range(len(ss)))}], PART_CH[p][-1], "")
        b["kind"], b["id"] = "part", f"PT-{p}"
        blocks.append(b)
        if p == "P00":
            wb = part_windows(D, "a:S4:P00b", RUN_MIN_MS)
            if wb:
                blocks.append(dd_block(D, "a:S4:P00b", wb, "CH-01", ""))
        for ch in after.get(i, []):
            if by_ch.get(ch):
                blocks.append(trunk_block(D, ch, by_ch[ch], kind="trunk-insert"))
    return _dedupe_s4(D, blocks)


# ----------------------------------------------------------------------------------------------------------------- metrics
def _q(D, a):
    qa = (D["assets"].get(a) or {}).get("qa") or {}
    bw = min(1.0, (qa.get("bandwidth_hz") or 8000) / 8601.6)
    clip = 1 - 0.01 * min(30, qa.get("clipping") or 0)
    lossy = 0.92 if a.startswith("a:S4") else 1.0
    floor = 1.0 if (qa.get("noise_floor_db") or -90) <= -70 else 0.9
    return bw * clip * lossy * floor


def metrics(D, G, blocks, films=None):
    order, spoken = [], []
    t = 0.0
    prev = None
    sw_list = []
    for b in blocks:
        if b["kind"] in ("deep-dive",):
            t += CARD_S
        if b["kind"] == "part":
            t += PART_CARD_S
        for sg in b["segments"]:
            dur = (sg["src_out_ms"] - sg["src_in_ms"]) / 1000
            if prev is not None and b["kind"] not in ("trunk",):
                t += sg["lead_gap_ms"] / 1000
            v = D["voice"][sg["audio_id"]]
            if spoken and spoken[-1][1] != v:
                sw_list.append((b, len(spoken)))
            spoken.append((sg, v, dur, b))
            t += dur
            order += sg["sentences"]
            prev = sg
        if b["kind"] == "deep-dive":
            t += CARD_S
    runtime = t
    speech = {sid: (D["S"][sid]["end_ms"] - D["S"][sid]["start_ms"]) / 1000 for sid in order}
    covered, red_t, tot_t = set(), 0.0, 0.0
    for sid in order:
        u = D["by_s"][sid]
        if u in covered:
            red_t += speech[sid]
        tot_t += speech[sid]
        covered.add(u)
        covered |= D["cover_inv"].get(sid, set())
    IU = D["IU"]
    content = {u for u, x in IU.items() if set(x.get("kinds") or []) - {"transition"}}
    novel_all = {u for u, x in IU.items() if x["novel_vs_trunk"]}
    # switches per trunk chapter block (a trunk chapter + what follows it until the next trunk chapter)
    per_ch, cur = collections.Counter(), None
    labels = [v for _, v, _, _ in spoken]
    owner = []
    for sg, v, d, b in spoken:
        if b["kind"] in ("trunk", "trunk-insert") and (cur is None or b["chapter"] != cur):
            cur = b.get("chapter") or cur
        owner.append(cur)
    for i in range(1, len(labels)):
        if labels[i] != labels[i - 1]:
            per_ch[owner[i - 1] if spoken[i][3]["kind"] in ("trunk", "trunk-insert") else owner[i]] += 1
    if films:
        viol, miss = [], []
        for f in films:
            o = [sid for b in f for sg in b["segments"] for sid in sg["sentences"]]
            v_, m_ = violations(D, G, o)
            viol += v_
            miss += m_
    else:
        viol, miss = violations(D, G, order)
    qw = sum(_q(D, sg["audio_id"]) * d for sg, _, d, _ in spoken) / max(1e-9, sum(d for *_, d, _ in spoken))
    vm = sum((D["sim"].get(sg["audio_id"]) or 0) * d for sg, _, d, _ in spoken) / max(1e-9, sum(d for *_, d, _ in spoken))
    short = sum(1 for b in blocks if b["kind"] == "deep-dive" for w in b.get("windows", []) if w["dur_s"] < 20)
    nsw = sum(1 for i in range(1, len(labels)) if labels[i] != labels[i - 1])
    vt = collections.Counter()
    for sg, v, d, _ in spoken:
        vt[v] += d
    return {
        "runtime_s": round(runtime, 1), "runtime": _hms(runtime), "sentences": len(order), "speech_s": round(tot_t, 1),
        "spoken_segments": len(spoken), "deep_dives": sum(1 for b in blocks if b["kind"] == "deep-dive"),
        "trunk_blocks": sum(1 for b in blocks if b["kind"] in ("trunk", "trunk-insert")),
        "short_excerpts_lt20s": short,
        "coverage_pct": round(100 * len(covered & set(IU)) / len(IU), 1),
        "coverage_content_pct": round(100 * len(covered & content) / len(content), 1),
        "novel_s4_units_pct": round(100 * len(covered & novel_all) / len(novel_all), 1),
        "uncovered_units": len(set(IU) - covered),
        "redundancy_pct": round(100 * red_t / max(1e-9, tot_t), 1),
        "voice_switches": nsw, "voice_switches_per_h": round(nsw / (runtime / 3600), 1),
        "max_switches_per_trunk_chapter": max(per_ch.values()) if per_ch else 0,
        "voice_time_min": {k: round(v / 60, 1) for k, v in sorted(vt.items())},
        "prereq_violations": len(viol), "prereq_missing": len(miss),
        "audio_quality_proxy": round(qw, 3), "voice_match_to_s1": round(vm, 3),
        "_viol": viol[:60], "_order": order}


def _hms(s):
    s = int(round(s))
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"


# ----------------------------------------------------------------------------------------------------------------- outline
def _block_minutes(b):
    return sum(sg["src_out_ms"] - sg["src_in_ms"] for sg in b["segments"]) / 60000


def outline(D, name, desc, blocks, m, path, budget=9000):
    def gl(sid):
        g = (D["S"][sid].get("gloss_en") or "").strip()
        w = g.split()
        return " ".join(w[:26]) + ("…" if len(w) > 26 else "")

    def bullets(b, k):
        sids = [x for sg in b["segments"] for x in sg["sentences"]]
        cand = [x for x in sids if D["S"][x].get("kind") in ("claim", "example", "prediction", "question")] or sids
        if not cand:
            return []
        k = min(k, len(cand))
        out = []
        for i in range(k):
            chunk = cand[i * len(cand) // k:(i + 1) * len(cand) // k] or cand[-1:]
            out.append(max(chunk, key=lambda x: (len(G_terms(x)), min(len((D["S"][x].get("gloss_en") or "").split()), 22))))
        return out

    def G_terms(x):
        return D["S"][x].get("terms") or []

    for kmax in (6, 5, 4, 3, 2):
        L = [f"# Candidate {name}: ordered outline for the coherence judge", "",
             f"{desc}", "", f"Runtime {m['runtime']}, {m['sentences']} sentences, {m['trunk_blocks']} trunk blocks, "
             f"{m['deep_dives']} deep-dives, voice switches {m['voice_switches']}. Voices: S1 = film narrator; A/B/C = NotebookLM voices.", ""]
        for b in blocks:
            mins = _block_minutes(b)
            k = max(2 if kmax <= 3 else 3, min(kmax, round(2 + mins)))
            head = {"trunk": "Chapter", "trunk-insert": "Film insert", "deep-dive": "Deep-Dive", "part": "Series part"}[b["kind"]]
            where = f" (after {b['anchor']})" if b["kind"] == "deep-dive" else ""
            L.append(f"## {b['id']} · {head}{where}: {b['title_en']} · voice {b['voice']} · {mins:.1f} min")
            for x in bullets(b, k):
                L.append(f"- {gl(x)}")
            L.append("")
        words = sum(len(x.split()) for x in L)
        if words <= budget:
            break
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    return words


# ----------------------------------------------------------------------------------------------------------------- command
DESC = {
    "A": "A, film only: the S1 Egyptian narration, 37 chapters in the designed order (70:05).",
    "B": "B, trunk + Deep-Dives: S1 chapters in order; after a chapter, novel S4 windows (>= 20 s, >= 60 % novel idea units, "
         "restatements dropped at clean cuts) from the part homed on that chapter, framed by entry/exit cards.",
    "B100": "B100, B extended to every novel S4 idea unit: the same windows with no 20 s minimum (short excerpts join the part's Deep-Dive).",
    "C": "C, series spine: all S4 parts in order (P00b only as novel windows), with S1 used for the cold open, act-transition "
         "openers and the S1-only idea units, inserted after the part that covers each chapter.",
    "D": "D, two films: film 1 = A, film 2 = C, delivered separately (metrics summed; redundancy counts film 2 against film 1).",
}


CTX = {"B100": "B", "D": "C"}   # review context shared by a candidate family (B100 = B + short excerpts; D's film 2 = C)


def _graph_ctx(D, ctx):
    G = _graph(D, ctx)
    c_ch = collections.defaultdict(set)
    for sid, cs in G["s_conc"].items():
        if sid.startswith("s:S1") and sid in D["S"]:
            for c in cs:
                c_ch[c].add(D["S"][sid].get("chapter"))
    G["_c_ch"] = c_ch
    return G


def cmd_candidates(args):
    D = _load()
    G = _graph_ctx(D, None)
    A = build_A(D, G)
    B, ndupB = build_B(D, G, RUN_MIN_MS)
    B100, ndupB100 = build_B(D, G, 0)
    Cb, ndupC = build_C(D, G)
    cands = {"A": (A, None, 0), "B": (B, None, ndupB), "B100": (B100, None, ndupB100), "C": (Cb, None, ndupC),
             "D": (A + Cb, [A, Cb], ndupC)}
    out_dir = C.p("corpus", "edl", "candidates")
    os.makedirs(out_dir, exist_ok=True)
    summary = {}
    for name, (blocks, films, ndup) in cands.items():
        ctx = CTX.get(name, name)
        Gx = _graph_ctx(D, ctx)
        m = metrics(D, Gx, blocks, films)
        m["prereq_violations_before_context_review"] = metrics(D, G, blocks, films)["prereq_violations"]
        m["context_previews_accepted"] = sum(1 for r in Gx["review"] if r.get("context") == ctx
                                             and r["action"] == "keep_preview")
        m["s4_cross_part_dups_dropped"] = ndup
        if films:
            mA = metrics(D, G, films[0])
            mC = metrics(D, G, films[1])
            m["films"] = {"film1": mA["runtime"], "film2": mC["runtime"]}
            m["voice_switches_per_h"] = round((mA["voice_switches"] + mC["voice_switches"]) / (m["runtime_s"] / 3600), 1)
            m["voice_switches"] = mA["voice_switches"] + mC["voice_switches"]
        viol = m.pop("_viol")
        m.pop("_order")
        rec = {"v": 1, "candidate": name, "created": C.now_iso(), "desc": DESC[name],
               "params": {"run_min_ms": RUN_MIN_MS if name in ("B",) else 0, "novel_frac": NOVEL_FRAC, "cut_min_ms": CUT_MIN_MS,
                          "pre_ms": PRE_MS, "post_ms": POST_MS, "card_s": CARD_S, "part_home_chapters": PART_CH},
               "metrics": m, "prereq_violations": viol, "blocks": blocks}
        C.write_json(os.path.join(out_dir, f"{name}.json"), rec, indent=1)
        w = outline(D, name, DESC[name], blocks, m, C.p("data", "derived", "story", f"outline_{name}.md"))
        m["outline_words"] = w
        summary[name] = m
        print(name, json.dumps({k: v for k, v in m.items() if k not in ("voice_time_min",)}))
    sens = _sensitivity(D, cands["B100"][0], 3.5 * 3600)
    C.write_json(C.p("reports", "story", "candidates.json"), {"v": 1, "created": C.now_iso(), "candidates": summary,
                                                             "b100_cap_3h30": sens})
    write_report(D, G, summary, sens, cands["B100"][0])
    return 0


def _sensitivity(D, blocks, cap_s):
    """What a 3:30 cap would cost: drop B100 deep-dive segments with the fewest novel units per minute until it fits."""
    segs = []
    for bi, b in enumerate(blocks):
        if b["kind"] == "deep-dive":
            for si, sg in enumerate(b["segments"]):
                nu = {D["by_s"][x] for x in sg["sentences"] if D["IU"][D["by_s"][x]]["novel_vs_trunk"]}
                dur = (sg["src_out_ms"] - sg["src_in_ms"] + sg["lead_gap_ms"]) / 1000
                segs.append((len(nu) / max(1e-9, dur / 60), dur, bi, si, nu))
    total = sum(sg["src_out_ms"] - sg["src_in_ms"] for b in blocks for sg in b["segments"]) / 1000
    rt = metrics_runtime(blocks)
    novel_all = {u for u, x in D["IU"].items() if x["novel_vs_trunk"]}
    gone, lost = 0.0, set()
    for dens, dur, bi, si, nu in sorted(segs):
        if rt - gone <= cap_s:
            break
        gone += dur
        lost |= nu
    kept = set().union(*[s[4] for s in segs]) - lost
    return {"cap": _hms(cap_s), "removed_min": round(gone / 60, 1),
            "novel_s4_units_pct": round(100 * len(kept & novel_all) / len(novel_all), 1), "speech_total_s": round(total, 1)}


def metrics_runtime(blocks):
    t = 0.0
    for b in blocks:
        t += 2 * CARD_S if b["kind"] == "deep-dive" else PART_CARD_S if b["kind"] == "part" else 0
        for sg in b["segments"]:
            t += (sg["src_out_ms"] - sg["src_in_ms"]) / 1000 + (sg["lead_gap_ms"] / 1000 if b["kind"] != "trunk" else 0)
    return t


def write_report(D, G, M, sens, b100):
    rv = C.read_jsonl(C.p("corpus", "graph", "requires_review.jsonl"))
    oc = C.read_json(C.p("reports", "story", "order_clean.json"), {}) or {}
    cls = collections.Counter(r["cls"] for r in rv)
    ctxn = collections.Counter(r.get("context") or "S1" for r in rv)
    rows = [("Runtime", "runtime"), ("Sentences", "sentences"), ("Trunk blocks / Deep-Dives", None), ("Spoken segments (cuts + 1)", "spoken_segments"),
            ("Unique idea-unit coverage %", "coverage_pct"), ("  content units (not transition-only) %", "coverage_content_pct"),
            ("  novel S4 units %", "novel_s4_units_pct"), ("Redundancy % (speech time)", "redundancy_pct"),
            ("S4 cross-part duplicates dropped", "s4_cross_part_dups_dropped"), ("Voice switches", "voice_switches"),
            ("Voice switches / hour", "voice_switches_per_h"), ("Max switches per trunk chapter", "max_switches_per_trunk_chapter"),
            ("Prereq violations, global review only", "prereq_violations_before_context_review"),
            ("Prereq violations, after its context review", "prereq_violations"), ("Prerequisite never mentioned", "prereq_missing"),
            ("Audio-quality proxy (0-1)", "audio_quality_proxy"), ("Voice match to S1 (ECAPA cos, time-weighted)", "voice_match_to_s1"),
            ("Short excerpts < 20 s", "short_excerpts_lt20s"), ("Outline words", "outline_words")]
    names = list(M)
    dd_min = (M["B100"]["speech_s"] - M["A"]["speech_s"]) / 60
    L = ["# Candidate EDLs for ADR-001", "", f"Generated {C.now_iso()} by `dc story candidates` (story-editor). Inputs: P4 graph "
         "(idea units, novelty, concept mentions), corpus/sentences, corpus/audio/{voices,assets}.json, corpus/canon/chapters.json, "
         "corpus/graph/requires_review.jsonl. EDLs: `corpus/edl/candidates/<X>.json`; judge outlines: `data/derived/story/outline_<X>.md`.",
         "", "## Metrics", "", "| metric | " + " | ".join(names) + " |", "|---|" + "---|" * len(names)]
    for lab, k in rows:
        if k is None:
            L.append(f"| {lab} | " + " | ".join(f"{M[n]['trunk_blocks']} / {M[n]['deep_dives']}" for n in names) + " |")
        else:
            L.append(f"| {lab} | " + " | ".join(str(M[n].get(k)) for n in names) + " |")
    L.append("| Voice time, min | " + " | ".join(", ".join(f"{a} {v}" for a, v in M[n]["voice_time_min"].items()) for n in names) + " |")
    L.append("| Est. P8-P9 subagent tokens (5-8 k/sentence) | " + " | ".join(
        f"{M[n]['sentences'] * 5 / 1000:.1f}-{M[n]['sentences'] * 8 / 1000:.1f} M" for n in names) + " |")
    L.append("| Est. final render h (5.6-8.2 h per film hour, render_bench) | " + " | ".join(
        f"{M[n]['runtime_s'] / 3600 * 5.6:.0f}-{M[n]['runtime_s'] / 3600 * 8.2:.0f}" for n in names) + " |")
    L.append("| LLM-judge coherence (1-10) | " + " | ".join("pending" for _ in names) + " |")
    L += ["", "Coherence is scored by a separate judge invocation that reads `data/derived/story/outline_<X>.md`; authors never grade their own work.", "",
          f"D: film 1 {M['D']['films']['film1']} + film 2 {M['D']['films']['film2']}; prerequisite counts are per film, summed; "
          "redundancy counts film 2 against film 1.", "",
          "## B vs B100", "",
          f"B is the spec'd rule (windows >= 20 s). Its windows already absorb {M['B']['novel_s4_units_pct']} % of novel S4 idea units; "
          f"the {M['B']['uncovered_units']} units it misses sit in novel cores shorter than 20 s that cannot merge. B100 adds them as "
          f"{M['B100']['short_excerpts_lt20s']} short excerpts inside the same part's Deep-Dive (+{(M['B100']['runtime_s'] - M['B']['runtime_s']):.0f} s), "
          "reaching the 100 % coverage rule with no extra voice switch.", "",
          f"**Runtime vs the 2.5-3.5 h target.** B100 runs {M['B100']['runtime']}. Capping it at {sens['cap']} means dropping "
          f"{sens['removed_min']} min of the least dense Deep-Dive segments, and novel-unit coverage falls to {sens['novel_s4_units_pct']} %. "
          "That needs an ADR waiver of the 100 % rule. The novelty figures are upper bounds: the P4 residual audit estimates 171 "
          "(range 75-393) of 2,037 novel sentences are restatements of S1. That is 8.4 % (3.7-19.3 %) of Deep-Dive speech, about "
          f"{dd_min * 0.084:.0f} min ({dd_min * 0.037:.0f}-{dd_min * 0.193:.0f} min) of B100 that a stricter merge could remove.", "",
          "## Rules applied", "",
          "- Windows (B/B100): novel cores merged across restated gaps <= 20 s while >= 60 % of the window's idea units are novel; trimmed "
          "to sentence boundaries. Restatements inside are dropped only where both cuts fall in pauses >= 250 ms. Question/prediction "
          "setups that frame a novel answer are kept, and so are answers to novel questions.",
          "- Duplicates across S4 parts are kept once, preferring the voice-A member, otherwise the first in EDL order.",
          "- Placement: each part has editorial home chapters (one voice per chapter block, so each trunk chapter has <= 2 switches). "
          "A part split across several home chapters is assigned monotonically (never reordered) by concept and S1-link affinity.",
          "- Segment handles: 60 ms before the first onset, 90 ms after the last offset. Cut gaps are 250-700 ms. Deep-Dive entry and exit cards are "
          f"{CARD_S:.0f} s each; C/D part cards are {PART_CARD_S:.0f} s.",
          "- Audio-quality proxy per asset = min(1, bandwidth / S1 bandwidth) x (1 - 0.01 x clip runs) x 0.92 for lossy S4 MP3 x 0.9 if the noise floor is above -70 dB, "
          "time-weighted. DNSMOS/UTMOS stay null (blocked weights, reports/audio/sources.md).",
          "", "## Prerequisite graph review", "",
          f"`corpus/graph/requires_review.jsonl`: {len(rv)} decisions ({', '.join(f'{k} {v}' for k, v in sorted(cls.items()))}). "
          f"By context: {', '.join(f'{k} {v}' for k, v in sorted(ctxn.items()))}. Cleaned edges: `corpus/graph/requires_clean.jsonl` "
          f"({oc.get('edges_before')} -> {oc.get('edges_after')}). The S1 designed order goes from 142 to **{oc.get('violations_s1_after')}** violations, "
          f"and cycles go from 7 to {oc.get('cycles_after')}.",
          "- *bad_edge*: the prerequisite is wrong or too weak (for example database->csv, row->table, now inverted to table->row, and rollback->deployment, since rollback also means a DB undo). Dropped or inverted.",
          "- *cycle_edge*: one edge per cycle is dropped (assert->test, duplicates->distinct, overfitting->bias-variance, distribution->statistics, distribution->sampling, container-image->docker).",
          "- *mention_fp*: the tagger hit a homonym (Linux group vs GROUP BY, pull request vs HTTP request, /dev/null vs NULL, 'solid ground' vs SOLID). The mention is removed. "
          "For S4, a use must also appear in the P3 per-sentence `terms`, and part-level sense filters cover recurring homonyms.",
          "- *mention_fn*: the prerequisite is stated in the same or an earlier sentence but was not tagged (for example 'CSV is rows and columns'). The mention is added.",
          "- *forward_ref*: a genuine preview, such as the CH-01 map, 'we will meet Airflow in 35 minutes', or naming a concept and decomposing it in the next sentences. "
          "The edge is kept and the early mention is marked as a preview; the storyboard should tag it as a 'later' callout. Previews recorded against a candidate order apply only to that candidate.",
          "- Signposting (transition/recap sentences and the orientation material CH-00..02, P00, P00b, P01) is never counted as a use.",
          "", "## Deep-Dive placement (B100)", "", "| Deep-Dive | after | voice | min |", "|---|---|---|---|"]
    for b in b100:
        if b["kind"] == "deep-dive":
            L.append(f"| {b['id']} {b['title_en'][:70]} | {b['anchor']} | {b['voice']} | {_block_minutes(b):.1f} |")
    pn = C.p("reports", "story", "producer_notes.md")
    if os.path.exists(pn):
        L += ["", "## Producer notes (verbatim, reports/story/producer_notes.md)", ""]
        L += [x.rstrip("\n") for x in open(pn, encoding="utf-8").read().splitlines()[2:]]
    L += ["", "## Caveats", "",
          "- Coverage counts idea units from P4 (2,846). Novelty is claim-level and an upper bound (see above).",
          "- Voice A (10 S4 parts) is the same family as S1, but it is a different recording and narrator (cosine 0.54-0.62). P01 is voice C. Every Deep-Dive is an audible switch, framed by its cards.",
          "- C has not had its own context review: its 39 violations are measured on the global review only, which is comparable to B's 21.",
          "- C/D keep each S4 part whole, so restated S4 material stays and redundancy is measured only against earlier EDL speech."]
    with open(C.p("reports", "story", "candidates.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


# ----------------------------------------------------------------------------------------------------------------- E-001
# Rules fixed in advance by harness/state/decisions.json (ADR-001 experiment E-001, steps 1-2); deterministic, no planning.
DD_FLOOR_MIN, CAP_S = 3.0, 3.5 * 3600


def _arrange(D, trunk, dives):
    """Trunk chapters in order; after each, its dives in the B block order (same as build_B)."""
    per = collections.defaultdict(list)
    for b in dives:
        per[b["anchor"]].append(b)
    out = []
    for t in trunk:
        out.append(t)
        out += sorted(per.get(t["chapter"], []), key=lambda b: (B_BLOCK_ORDER.get(b["part"], PART_SEQ.index(b["part"])),
                                                                 b["segments"][0]["src_in_ms"]))
    return out


def _seg_k(D, sg):
    return D["S"][sg["sentences"][0]]["_k"]


def build_v2(D, blocks):
    """3.0 min Deep-Dive floor. A dive shorter than the floor merges into the adjacent dive of the same part (the next one
    in EDL order if any, else the previous one); the host keeps its anchor and the segments stay in source order. A dive with
    no same-part neighbour moves to the part's next home chapter. Repeat until every dive meets the floor or cannot move."""
    trunk = [b for b in blocks if b["kind"] == "trunk"]
    dives = [json.loads(json.dumps(b)) for b in blocks if b["kind"] == "deep-dive"]
    for b in dives:
        b["merged_from"] = [b["id"]]
    log, stuck = [], set()
    while True:
        seq = [b for b in _arrange(D, trunk, dives) if b["kind"] == "deep-dive"]
        short = [b for b in seq if _block_minutes(b) < DD_FLOOR_MIN and b["id"] not in stuck]
        if not short:
            break
        b = short[0]
        same = [x for x in seq if x["part"] == b["part"]]
        i = same.index(b)
        if len(same) > 1:
            host = same[i + 1] if i + 1 < len(same) else same[i - 1]
            host["segments"] = sorted(host["segments"] + b["segments"], key=lambda sg: _seg_k(D, sg))
            host["windows"] = sorted(host["windows"] + b["windows"], key=lambda w: w["k0"])
            host["merged_from"] = sorted(host["merged_from"] + b["merged_from"])
            dives.remove(b)
            log.append({"action": "merge", "dive": b["id"], "min": round(_block_minutes(b), 2), "into": host["id"],
                        "anchor": host["anchor"]})
        else:
            hs = PART_CH[b["part"]]
            nxt = hs[hs.index(b["anchor"]) + 1] if b["anchor"] in hs and hs.index(b["anchor"]) + 1 < len(hs) else None
            if nxt:
                log.append({"action": "move", "dive": b["id"], "min": round(_block_minutes(b), 2), "from": b["anchor"], "to": nxt})
                b["anchor"], b["act"] = nxt, D["CH"][nxt]["act"]
            else:
                stuck.add(b["id"])
                log.append({"action": "keep", "dive": b["id"], "min": round(_block_minutes(b), 2), "why": "no neighbour, last home"})
    # ids: a part left with one dive is DD-<part>; else the merged suffixes in order
    byp = collections.Counter(b["part"] for b in dives)
    for b in dives:
        if byp[b["part"]] == 1:
            b["id"] = f"DD-{b['part']}"
        else:
            b["id"] = f"DD-{b['part']}" + "".join(x[len(f'DD-{b["part"]}'):] for x in b["merged_from"])
    return _arrange(D, trunk, dives), log, sorted(stuck)


def _seg_density(D, sg):
    nu = {D["by_s"][x] for x in sg["sentences"] if D["novel"][x]}     # restatement sentences count 0
    dur = (sg["src_out_ms"] - sg["src_in_ms"] + sg["lead_gap_ms"]) / 1000
    return len(nu) / max(1e-9, dur / 60), dur


def build_cap(D, G, blocks, cap_s=CAP_S):
    """Drop whole dive segments in ascending novel idea units per minute; skip a segment whose removal would add a
    prerequisite violation or a never-mentioned prerequisite for a kept later sentence; stop at runtime <= cap."""
    bl = json.loads(json.dumps(blocks))
    segs = []
    pos = 0
    for b in bl:
        for sg in b["segments"]:
            if b["kind"] == "deep-dive":
                dens, dur = _seg_density(D, sg)
                segs.append((round(dens, 6), pos, b["id"], sg["src_in_ms"], sg["audio_id"], dur))
            pos += 1
    segs.sort()

    def live(bl):
        return [b for b in bl if b["kind"] != "deep-dive" or b["segments"]]

    def score(bl):
        o = [sid for b in bl for sg in b["segments"] for sid in sg["sentences"]]
        v, m = violations(D, G, o)
        return {("v", x["concept"], x["requires"]) for x in v} | {("m", x["concept"], x["requires"]) for x in m}
    base = score(bl)
    dropped, skipped = [], []
    for dens, _, bid, t0, a, dur in segs:
        if metrics_runtime(live(bl)) <= cap_s:
            break
        b = next(x for x in bl if x["id"] == bid)
        sg = next(x for x in b["segments"] if x["src_in_ms"] == t0 and x["audio_id"] == a)
        b["segments"].remove(sg)
        sc = score(live(bl))
        if sc - base:      # a kept later sentence needs this segment (new violation or never-mentioned prerequisite)
            b["segments"].append(sg)
            b["segments"].sort(key=lambda x: _seg_k(D, x))
            skipped.append({"dive": bid, "src_in_ms": t0, "density": dens, "dur_s": round(dur, 1), "why": sorted("->".join(t[1:]) + (" (missing)" if t[0] == "m" else "") for t in sc - base)})
            continue
        base = sc
        dropped.append({"dive": bid, "audio_id": a, "src_in_ms": t0, "density": dens, "dur_s": round(dur, 1),
                        "sentences": sg["sentences"]})
    out = live(bl)
    for b in out:
        if b["kind"] == "deep-dive":
            ks = {_seg_k(D, sg) for sg in b["segments"]}
            b["windows"] = [w for w in b["windows"] if any(w["k0"] <= k <= w["k1"] for k in ks)]
    return out, dropped, skipped


def _covered(D, blocks):
    cov = set()
    for b in blocks:
        for sg in b["segments"]:
            for sid in sg["sentences"]:
                cov.add(D["by_s"][sid])
                cov |= D["cover_inv"].get(sid, set())
    return cov


def _per_ch_switches(D, blocks):
    """Switches charged to each trunk-chapter block (the chapter plus the dives after it), as in metrics()."""
    seq, cur = [], None
    for b in blocks:
        if b["kind"] == "trunk":
            cur = b["chapter"]
        for sg in b["segments"]:
            seq.append((D["voice"][sg["audio_id"]], cur))
    c = collections.Counter()
    for i in range(1, len(seq)):
        if seq[i][0] != seq[i - 1][0]:
            c[seq[i][1]] += 1
    return c


def cmd_e001(args):
    D = _load()
    G0, G = _graph_ctx(D, None), _graph_ctx(D, "B")      # context review of c5d96cd: B family previews (B100 ctx = "B")
    src = C.read_json(C.p("corpus", "edl", "candidates", "B100.json"))
    b100 = src["blocks"]
    v2, mlog, stuck = build_v2(D, b100)
    cap, dropped, skipped = build_cap(D, G, v2)
    novel_all = {u for u, x in D["IU"].items() if x["novel_vs_trunk"]}
    cov100 = _covered(D, b100)
    res, recs = {}, {"B100": b100, "B100-V2": v2, "B100-cap-V2": cap}
    desc = {"B100-V2": "B100-V2: B100 with a 3.0 min Deep-Dive floor (E-001 step 1). A dive under 3.0 min merges into the adjacent "
                       "dive of the same part (next if any, else previous; the host keeps its anchor); otherwise it moves to the "
                       "part's next home chapter.",
            "B100-cap-V2": "B100-cap-V2: B100-V2, then whole Deep-Dive segments dropped in ascending novel idea units per minute "
                           "(restatements count 0), skipping any segment a kept later sentence requires, until runtime <= 3:30:00."}
    for name, bl in recs.items():
        m = metrics(D, G, bl)
        m["prereq_violations_before_context_review"] = metrics(D, G0, bl)["prereq_violations"]
        viol, order = m.pop("_viol"), m.pop("_order")
        _, miss = violations(D, G, order)
        cov = _covered(D, bl)
        m["dropped_units"] = sorted(cov100 - cov)
        m["dropped_novel_units"] = sorted((cov100 - cov) & novel_all)
        m["prereq_missing_list"] = sorted({f"{x['concept']}->{x['requires']}" for x in miss})
        m["dives_under_floor"] = sum(1 for b in bl if b["kind"] == "deep-dive" and _block_minutes(b) < DD_FLOOR_MIN)
        m["per_ch_switches"] = dict(sorted(_per_ch_switches(D, bl).items()))
        h = m["runtime_s"] / 3600
        m["tokens_M"] = [round(m["sentences"] * 5 / 1000, 1), round(m["sentences"] * 8 / 1000, 1)]
        m["render_h"] = [round(h * 5.6, 1), round(h * 8.2, 1)]
        m["render_h_5pct_r3f"] = round(h * 16.7 / 3, 1)
        res[name] = m
        if name != "B100":
            rec = {"v": 1, "candidate": name, "created": C.now_iso(), "desc": desc[name], "experiment": "E-001",
                   "derived_from": {"file": "corpus/edl/candidates/B100.json", "sha256": C.sha256_file(C.p("corpus", "edl", "candidates", "B100.json"))
},
                   "params": dict(src["params"], dd_floor_min=DD_FLOOR_MIN, **({"cap_s": CAP_S} if "cap" in name else {})),
                   "metrics": {k: v for k, v in m.items() if k not in ("per_ch_switches",)},
                   "merge_log": mlog, "prereq_violations": viol, "blocks": bl}
            if "cap" in name:
                rec["dropped_segments"] = dropped
                rec["skipped_segments"] = skipped
            C.write_json(C.p("corpus", "edl", "candidates", f"{name}.json"), rec, indent=1)
            m["outline_words"] = outline(D, name, desc[name], bl, m, C.p("data", "derived", "story", f"outline_{name}.md"))
    C.write_json(C.p("reports", "story", "E-001.json"), {"v": 1, "created": C.now_iso(), "experiment": "E-001",
                                                       "merge_log": mlog, "stuck": stuck, "cap_dropped": [{k: v for k, v in d.items() if k != "sentences"} for d in dropped],
                                                       "cap_skipped": skipped, "candidates": res}, indent=1)
    for n, m in res.items():
        print(n, json.dumps({k: m[k] for k in ("runtime", "sentences", "coverage_pct", "novel_s4_units_pct", "redundancy_pct",
                                               "prereq_violations", "prereq_violations_before_context_review", "prereq_missing",
                                               "voice_switches", "voice_switches_per_h", "max_switches_per_trunk_chapter",
                                               "deep_dives", "dives_under_floor", "tokens_M", "render_h", "render_h_5pct_r3f")}),
              "dropped_novel", len(m["dropped_novel_units"]))
    print("merges", json.dumps(mlog))
    print("cap dropped", len(dropped), "skipped", len(skipped))
    return 0

# ----------------------------------------------------------------------------------------------------------------- E-001 noC
def _drop_metrics(D, G, G0, bl, cov_ref, novel_all):
    """The cmd_e001 metric set for one EDL (metrics()/violations() unchanged), units dropped relative to cov_ref."""
    m = metrics(D, G, bl)
    m["prereq_violations_before_context_review"] = metrics(D, G0, bl)["prereq_violations"]
    viol, order = m.pop("_viol"), m.pop("_order")
    _, miss = violations(D, G, order)
    cov = _covered(D, bl)
    m["dropped_units"] = sorted(cov_ref - cov)
    m["dropped_novel_units"] = sorted((cov_ref - cov) & novel_all)
    m["prereq_missing_list"] = sorted({f"{x['concept']}->{x['requires']}" for x in miss})
    m["per_ch_switches"] = dict(sorted(_per_ch_switches(D, bl).items()))
    h = m["runtime_s"] / 3600
    m["tokens_M"] = [round(m["sentences"] * 5 / 1000, 1), round(m["sentences"] * 8 / 1000, 1)]
    m["render_h"] = [round(h * 5.6, 1), round(h * 8.2, 1)]
    m["render_h_5pct_r3f"] = round(h * 16.7 / 3, 1)
    return m, viol, order, cov


def drop_block(D, G, G0, src_name, drop_ids, out_name, desc=None):
    """corpus/edl/candidates/<out>.json = <src>.json minus whole blocks `drop_ids`; nothing else changes."""
    srcp = C.p("corpus", "edl", "candidates", f"{src_name}.json")
    src = C.read_json(srcp)
    ids = {b["id"] for b in src["blocks"]}
    bad = [x for x in drop_ids if x not in ids]
    if bad:
        raise SystemExit(f"story drop-block: no such block(s) in {src_name}: {bad}")
    bl = [b for b in src["blocks"] if b["id"] not in set(drop_ids)]
    novel_all = {u for u, x in D["IU"].items() if x["novel_vs_trunk"]}
    m_src, _, _, cov_src = _drop_metrics(D, G, G0, src["blocks"], set(), novel_all)
    m, viol, order, cov = _drop_metrics(D, G, G0, bl, cov_src, novel_all)
    desc = desc or f"{out_name}: {src_name} minus block(s) {', '.join(drop_ids)}; every other block, segment and cut unchanged."
    rec = {"v": 1, "candidate": out_name, "created": C.now_iso(), "desc": desc,
           "derived_from": {"file": f"corpus/edl/candidates/{src_name}.json", "sha256": C.sha256_file(srcp)},
           "dropped_blocks": list(drop_ids), "params": src["params"],
           "metrics": {k: v for k, v in m.items() if k != "per_ch_switches"}, "prereq_violations": viol, "blocks": bl}
    C.write_json(C.p("corpus", "edl", "candidates", f"{out_name}.json"), rec, indent=1)
    m["outline_words"] = outline(D, out_name, desc, bl, m, C.p("data", "derived", "story", f"outline_{out_name}.md"))
    return m_src, m, order, cov, bl, src["blocks"]


def cmd_drop_block(args):
    D = _load()
    G0, G = _graph_ctx(D, None), _graph_ctx(D, args.ctx)
    out = args.out or f"{args.src}-no-{'-'.join(args.block)}"
    m_src, m, *_ = drop_block(D, G, G0, args.src, args.block, out)
    keys = ("runtime", "sentences", "coverage_pct", "novel_s4_units_pct", "redundancy_pct", "prereq_violations",
            "prereq_missing", "voice_switches", "voice_switches_per_h", "max_switches_per_trunk_chapter", "tokens_M", "render_h_5pct_r3f")
    for n, x in ((args.src, m_src), (out, m)):
        print(n, json.dumps({k: x[k] for k in keys}), "dropped_units", len(x["dropped_units"]))
    return 0


NOC_COS, NOC_PARTLY = 0.81, 0.70     # P4 idea-unit tau; 'partly' band floor fixed before measuring (story-editor choice)
# Strict variant: alias-tagger hits on P01's English text that are English function words or homonyms, checked against the
# sentence text ("or" -> boolean-logic, "if" -> control-flow, "service" -> systemd, "absolute zero" -> absolute-path,
# "full-stack" -> stack, "explain the why" -> explain, "interview/diagnostic loop" -> loop, "AI integration" -> integration-test,
# "select tools" -> select, "process it" -> process, "path", "identify" -> constraint, "sparks your curiosity" -> spark).
NOC_EN_HOMONYMS = {"c:boolean-logic", "c:control-flow", "c:constraint", "c:systemd", "c:absolute-path", "c:stack", "c:explain",
                   "c:path", "c:loop", "c:integration-test", "c:select", "c:process"}
NOC_EN_HOMONYM_PAIRS = {("s:S4:P01:0114", "c:spark")}
_AR = re.compile(r"[\u0600-\u06FF]")
_LAT = re.compile(r"[A-Za-z]")


def _script_counts(text):
    lat = ar = 0
    for t in text.split():
        if _AR.search(t):
            ar += 1
        elif _LAT.search(t):
            lat += 1
    return lat, ar


def cmd_e001_noc(args):
    """E-001 follow-up: B100-noC = B100 minus DD-P01 (voice C, English). Metrics, topic coverage of the lost units,
    English-dominant scan of kept S4 sentences. Writes reports/story/E-001_noC.json (keeps hand-written step4/step5 keys)."""
    import numpy as np
    D = _load()
    G0, G = _graph_ctx(D, None), _graph_ctx(D, "B")
    desc = ("B100-noC: B100 minus the Deep-Dive DD-P01 (S4 part P01, voice C, English speech 'The Explainer', 8.1 min "
            "after CH-02); every other block, segment and cut unchanged (E-001 dialect follow-up).")
    m100, m, order, cov, bl, b100 = drop_block(D, G, G0, "B100", ["DD-P01"], "B100-noC", desc)
    IU, S = D["IU"], D["S"]
    lost = m["dropped_units"]
    cids = set(C.read_json(C.p("data", "derived", "vectors", "g_concept.json"))["ids"])
    # concepts taught by kept sentences: non-signpost, not a preview, S4 needs the P3 term annotation to agree
    taught = collections.defaultdict(list)
    for sid in order:
        s = S[sid]
        if s.get("kind") in SIGNPOST_KINDS:
            continue
        for c in _concepts(D, G, sid) & cids:
            if (c, sid) in G["preview"] or (sid.startswith("s:S4") and c not in (s.get("terms") or ())):
                continue
            taught[c].append(sid)
    ids = C.read_json(C.p("data", "derived", "vectors", "g_sent.json"))["ids"]
    V = np.load(C.p("data", "derived", "vectors", "g_sent.npy")).astype(np.float32)
    row = {x: i for i, x in enumerate(ids)}
    kept_rows, kept_u = [], []
    for u in sorted(cov):
        for sid in IU[u]["members"]:
            if sid in row:
                kept_rows.append(row[sid])
                kept_u.append((u, sid))
    K = V[kept_rows]
    units = []
    for u in lost:
        x = IU[u]
        mem = [sid for sid in x["members"] if sid in row]
        best = (-1.0, None, None)
        if mem:
            sims = V[[row[s] for s in mem]] @ K.T
            i, j = np.unravel_index(int(np.argmax(sims)), sims.shape)
            best = (float(sims[i, j]), kept_u[j][0], kept_u[j][1])
        cs = set()
        for sid in x["members"]:
            if sid in S:
                cs |= _concepts(D, G, sid) & cids
        shared = sorted(c for c in cs if c in taught)
        cos = round(best[0], 3)

        def classify(cs_, sh_):
            if cos >= NOC_COS or (cs_ and len(sh_) == len(cs_)):
                return "topic-covered"
            return "partly" if cos >= NOC_PARTLY or sh_ else "truly-lost"
        cls = classify(cs, shared)
        cs_strict = set()
        for sid in x["members"]:
            if sid in S:
                cs_strict |= {c for c in _concepts(D, G, sid) & cids if not (S[sid]["audio_id"] == "a:S4:P01" and (
                    c in NOC_EN_HOMONYMS or (sid, c) in NOC_EN_HOMONYM_PAIRS))}
        cls_strict = classify(cs_strict, [c for c in shared if c in cs_strict])
        nk = best[1]
        units.append({"unit": u, "gloss_en": x.get("gloss_en"), "kinds": x.get("kinds"), "sources": x.get("sources"),
                      "novel_vs_trunk": x["novel_vs_trunk"], "members": x["members"], "concepts": sorted(cs),
                      "concepts_taught_by_kept": shared,
                      "taught_at": {c: taught[c][0] for c in shared},
                      "nearest_kept": {"unit": nk, "cos": cos, "sentence": best[2],
                                       "gloss_en": IU[nk].get("gloss_en") if nk else None}, "class": cls,
                      "concepts_strict": sorted(cs_strict), "class_strict": cls_strict})
    cls_n = collections.Counter(z["class"] for z in units)
    cls_s = collections.Counter(z["class_strict"] for z in units)
    cos_all = sorted(z["nearest_kept"]["cos"] for z in units)
    kinds_lost = collections.Counter("/".join(z["kinds"] or []) for z in units if z["class_strict"] == "truly-lost")
    # English-dominant speech among kept S4 sentences
    def scan(blocks):
        out = collections.defaultdict(lambda: {"sentences": 0, "s": 0.0, "two_token": 0, "ids": []})
        for b in blocks:
            for sg in b["segments"]:
                for sid in sg["sentences"]:
                    if not sid.startswith("s:S4"):
                        continue
                    lat, ar = _script_counts(S[sid].get("text") or "")
                    if lat + ar == 0 or lat / (lat + ar) <= 0.5 or lat < 2:
                        continue
                    part = S[sid]["audio_id"].split(":")[-1]
                    r = out[part]
                    if lat >= 3:
                        r["sentences"] += 1
                        r["s"] += (S[sid]["end_ms"] - S[sid]["start_ms"]) / 1000
                        r["ids"].append(sid)
                    else:
                        r["two_token"] += 1
        return {p: {"sentences": r["sentences"], "minutes": round(r["s"] / 60, 2), "two_latin_token_sentences": r["two_token"],
                    "examples": [{"sid": i, "text": S[i]["text"][:140]} for i in r["ids"][:4]]} for p, r in sorted(out.items())}
    eng100, engno = scan(b100), scan(bl)
    path = C.p("reports", "story", "E-001_noC.json")
    old = C.read_json(path, {}) or {}
    keep = {k: v for k, v in old.items() if k.startswith("step4") or k.startswith("step5")}
    strip = lambda z: {k: v for k, v in z.items() if k not in ("dropped_units", "dropped_novel_units")}
    rep = {"v": 1, "created": C.now_iso(), "experiment": "E-001", "follow_up": "dialect step 4 -> voice C (P01) is English",
           "rule": {"edl": "B100 minus block DD-P01, nothing else changed", "context_review": "c5d96cd (requires_review.jsonl, ctx B)",
                    "topic_covered": f"nearest kept unit cos >= {NOC_COS} (bge-m3 sentence vectors, max over member pairs), or every "
                                     "concept of the lost unit is taught by a kept non-signpost sentence",
                    "partly": f"cos in [{NOC_PARTLY}, {NOC_COS}) or some (not all) of its concepts taught",
                    "truly_lost": "otherwise (includes units with no concept ids and cos < partly floor)",
                    "english_dominant": "S4 sentence, Latin-script tokens / (Latin + Arabic-script tokens) > 0.5 and >= 3 Latin "
                                        "tokens; sentences with exactly 2 Latin tokens reported separately; 1-token code switches ignored"},
           "metrics": {"B100": strip(m100), "B100-noC": strip(m)},
           "lost_units": units, "lost_class_counts": dict(cls_n), "lost_class_counts_strict": dict(cls_s),
           "nearest_cos": {"max": cos_all[-1], "median": cos_all[len(cos_all) // 2], "min": cos_all[0],
                           "n_ge_0.81": sum(c >= NOC_COS for c in cos_all), "n_ge_0.70": sum(c >= NOC_PARTLY for c in cos_all)},
           "strict_truly_lost_kinds": dict(kinds_lost),
           "lost_units_sources": dict(collections.Counter("+".join(sorted(z["sources"])) for z in units)),
           "english_scan": {"B100": eng100, "B100-noC": engno}}
    rep.update(keep)
    C.write_json(path, rep, indent=1)
    keys = ("runtime", "sentences", "coverage_pct", "novel_s4_units_pct", "redundancy_pct", "prereq_violations",
            "prereq_violations_before_context_review", "prereq_missing", "voice_switches", "voice_switches_per_h",
            "max_switches_per_trunk_chapter", "tokens_M", "render_h", "render_h_5pct_r3f", "voice_time_min")
    for n, x in (("B100", m100), ("B100-noC", m)):
        print(n, json.dumps({k: x[k] for k in keys}))
    print("lost", len(lost), "novel", len(m["dropped_novel_units"]), dict(cls_n), "strict", dict(cls_s), rep["lost_units_sources"])
    print("cos", rep["nearest_cos"], "strict truly-lost kinds", dict(kinds_lost))
    print("missing B100", m100["prereq_missing_list"], "noC", m["prereq_missing_list"])
    print("english B100", {p: (r["sentences"], r["minutes"], r["two_latin_token_sentences"]) for p, r in eng100.items()})
    print("english noC", {p: (r["sentences"], r["minutes"], r["two_latin_token_sentences"]) for p, r in engno.items()})
    return 0


def register(sub):
    st = sub.add_parser("story", help="P5 story editor: prerequisite review, candidate EDLs, outlines").add_subparsers(dest="story_cmd", required=True)
    s = st.add_parser("order", help="apply corpus/graph/requires_review.jsonl; recompute S1 order violations and cycles")
    s.set_defaults(fn="story.cmd_order")
    s = st.add_parser("candidates", help="candidate EDLs A/B/B100/C/D -> corpus/edl/candidates, outlines, reports/story/candidates.json")
    s.set_defaults(fn="story.cmd_candidates")
    s = st.add_parser("e001", help="E-001: B100-V2 (3.0 min dive floor) and B100-cap-V2 (3:30 cap) from B100.json, metrics, outlines")
    s.set_defaults(fn="story.cmd_e001")
    s = st.add_parser("drop-block", help="<out>.json = <src>.json minus whole block(s); metrics as e001, outline")
    s.add_argument("--src", default="B100")
    s.add_argument("--block", action="append", required=True, help="block id, repeatable (e.g. DD-P01)")
    s.add_argument("--out", default=None)
    s.add_argument("--ctx", default="B", help="review context of the c5d96cd review (B100 family = B)")
    s.set_defaults(fn="story.cmd_drop_block")
    s = st.add_parser("e001-noc", help="E-001 follow-up: B100-noC (B100 minus DD-P01), lost-unit topic coverage, English scan")
    s.set_defaults(fn="story.cmd_e001_noc")
    from . import radio
    radio.register(st)
