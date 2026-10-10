"""dc spec lint | metrics | coverage | digest  (P8 tooling; rules: docs/plan/05 section 8, 04 sections 4-5, 06 G7, ADR-002 RT5/FX2).

Specs are data: corpus/specs/<chapter>.json (harness/schemas/scene_spec.schema.json). The lint checks them against the
frozen component contract (harness/schemas/components/*.json, harness/state/freeze.json) and the locked EDL + word map.
Definitions that the plan leaves open are fixed here and documented in docs/tools/spec_lint.md:
  event       = shot cut | anchored layer arrival (layer.at) | anchored exit (layer.props.until); de-duplicated on
                (frame, component, action); unanchored layers arrive with the cut and are not extra events.
  event frame = word.rec_start_frame - lead_frames  (24 fps word map, ADR-002 F24). Time conversions: timeutil only.
  hold        = {"from": {word, lead_frames}, "until": {word, lead_frames}, "reason": str}; <= 6 s; excused from the 4 s gap rule.
  mechanism   = anchored event whose component is not type-only (KineticWord, TermChip, ...) or whose layer is an action.
  RT 3D       = frames of fx_tier == "hero" shots (ADR-002 Q2.4: hero = WebGL only), <= 5 % of a chapter and of the film.
Thresholds here come from 04 section 5 / 06 G7 / ADR-002 and are never weakened without an ADR.
"""
import collections
import glob
import json
import os
import re
import statistics
import sys

from . import common as C
from . import manifest as M
from . import timeutil as T

# ---- thresholds (04 section 5, 06 G7, ADR-002 Q2.3) ----
MIN_EVENTS_PER_MIN = 20.0
MAX_GAP_MS = 4000
LONG_SHOT_GAP_MS = 3000        # shots longer than LONG_SHOT_MS need an event at least every 3 s
LONG_SHOT_MS = 12000
MAX_SHOT_MS = 25000
MEDIAN_SHOT_MS = (6000, 12000)  # warning band
MAX_HOLD_MS = 6000
MIN_MECHANISM_PCT = 80.0
MAX_RT3D_RATIO = 0.05
LEAD_SLACK_FRAMES = 6          # an anchored event may precede its shot's first frame by at most this much
WINDOW_PAD_IN, WINDOW_PAD_OUT = 12, 24   # underscore demo specs with `window`: frames before/after (= studio/src/spec/resolve.ts WINDOW_PAD)
SPEC_DIR = C.p("corpus", "specs")
REPORT_DIR = C.p("reports", "spec")

FORBIDDEN_KEYS = {"start", "end", "start_ms", "end_ms", "start_s", "end_s", "seconds", "time", "time_ms", "frame",
                  "start_frame", "end_frame", "duration", "duration_ms", "duration_s"}
TIMEY_KEY = re.compile(r"^(frames?|fps|ms|seconds?|timestamp|timecode|duration|start|end|time|offset)$"
                       r"|(^|_)(ms|msec|sec|secs|seconds?|frames?|timestamp|timecode)$"
                       r"|^(start|end|duration|offset|at)_?(ms|s|sec|frames?)$", re.I)
TIMEY_ALLOWED = {"lead_frames"}      # the only frame-valued key in anchors
TIMEY_VALUE = re.compile(r"^\s*(\d+(\.\d+)?\s*(ms|s|sec|secs|seconds?|frames?)|\d{1,2}:\d{2}(:\d{2})?([.,]\d+)?)\s*$", re.I)
NONDISPLAY = {"id", "target", "slot", "depth", "plate", "seed", "preset", "color", "ease", "move", "kind", "ref", "format",
              "size", "opacity", "speed", "times", "intensity", "amount", "smoothing", "param", "feature", "blend",
              "surface", "flow", "count", "scores_ref", "notes", "tier", "district", "until", "emphasis", "land"}
NUMERIC_DISPLAY_KEYS = {"value", "to", "from"}
ID_LIKE = re.compile(r"^((d|s|w|c|v|iu|f|a):[\w.:@-]+|CH-\d{2}|DD-P\d{2}(-\d+)?(-S\d{2})?)$")
TYPE_ONLY = {"KineticWord", "KineticPhrase", "TermChip", "LowerThird", "ChapterCard", "DeepDiveCard", "EquationLine",
             "CalloutArrow", "LoopPlate", "AIPlate", "ManimInsert"}
ANCHOR_REQUIRED = {"KineticWord", "KineticPhrase", "TermChip", "NumberCounter"}   # plus every action layer
SIMPLE_TRANSITIONS = {"cut", "dissolve"}
THREE_D_CAPABLE = {"VectorGalaxy", "NeuralNet3D", "LossLandscape", "StarSchema3D", "WorldMapA01", "DataRibbons",
                   "ContextTunnel", "AttentionBeams", "InferenceCore", "ParticleField", "HoloGrid", "TokenStream"}

_AR_DIG = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
_WORD_RE = re.compile(r"^w:([A-Za-z0-9]+):([A-Za-z0-9._-]+):(\d{6})$")


def jsonschema():
    import jsonschema as js
    return js


def tkey(s):
    s = s.lower().replace("_", " ").replace("-", " ")
    return " ".join(s.split())


def num_keys(text):
    t = text.translate(_AR_DIG)
    return [m.replace(",", "") for m in re.findall(r"\d+(?:[.,]\d+)*", t)]


def latin_token(text):
    t = re.sub(r"^[؀-ۿـ]+(?=[A-Za-z])", "", text)
    t = re.sub(r"^[^A-Za-z0-9]+|[^A-Za-z0-9+#]+$", "", t)
    return tkey(t) if re.search(r"[A-Za-z]", t) else None


def split_comp(name):
    base, _, act = name.partition(".")
    return base, (act or None)


# ======================================================================================== world (EDL, word map, text)
class World:
    """Locked inputs of the spec lint. Paths are overridable for tests."""

    def __init__(self, edl_path=None, word_map_path=None, sentences_dir=None, words_dir=None, contract_path=None,
                 glossary_path=None, comp_dir=None):
        lock = C.read_json(C.p("corpus", "edl", "lock.json"), {}) or {}
        self.edl_path = edl_path or C.p(*lock.get("edl", "corpus/edl/master_edl.v1.json").split("/"))
        self.word_map_path = word_map_path or C.p(*lock.get("word_map", "corpus/edl/word_map.v1.jsonl").split("/"))
        self.sentences_dir = sentences_dir or C.p("corpus", "sentences")
        self.words_dir = words_dir or C.p("corpus", "transcripts")
        self.contract_path = contract_path or C.p("corpus", "canon", "data_contract.json")
        self.glossary_path = glossary_path or C.p("corpus", "canon", "glossary.json")
        self.comp_dir = comp_dir or C.p("harness", "schemas", "components")
        self._edl = self._wm = self._chw = self._facts = self._terms = self._sent_ids = self._comps = None
        self._words = {}

    # --- EDL
    @property
    def edl(self):
        if self._edl is None:
            self._edl = C.read_json(self.edl_path)
        return self._edl

    @property
    def fps(self):
        return int(self.edl["fps"])

    def chapters(self):
        return {c["id"]: c for c in self.edl["chapters"]}

    def chapter_sentences(self, ch):
        out = []
        for s in self.edl["segments"]:
            if s["chapter"] == ch:
                for sid in s.get("sentences") or []:
                    if sid not in out:
                        out.append(sid)
        return out

    # --- word map
    def _load_wm(self):
        self._wm, self._chw = {}, collections.defaultdict(list)
        with open(self.word_map_path, encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                self._wm[r["word_id"]] = (r["rec_start_frame"], r["rec_end_frame"], r["sent_id"], r["chapter"])
                self._chw[r["chapter"]].append(r["word_id"])

    @property
    def wm(self):
        if self._wm is None:
            self._load_wm()
        return self._wm

    def chapter_words(self, ch):
        if self._chw is None:
            self._load_wm()
        return self._chw.get(ch, [])

    def sentence_span(self, ch, sid):
        fr = [self.wm[w][:2] for w in self.chapter_words(ch) if self.wm[w][2] == sid]
        return (min(a for a, _ in fr), max(b for _, b in fr)) if fr else None

    # --- transcript words
    def word_info(self, wid):
        m = _WORD_RE.match(wid)
        key = f"a_{m.group(1)}_{m.group(2)}"
        if key not in self._words:
            d = {}
            path = os.path.join(self.words_dir, f"{key}.words.jsonl")
            if os.path.exists(path):
                with open(path, encoding="utf-8") as f:
                    for line in f:
                        r = json.loads(line)
                        d[r["word_id"]] = (r.get("text") or "", bool(r.get("is_number")), bool(r.get("is_term")))
            self._words[key] = d
        return self._words[key].get(wid, ("", False, False))

    # --- data contract, glossary, sentences, components
    @property
    def facts(self):
        if self._facts is None:
            d = C.read_json(self.contract_path, {}) or {}
            self._facts = {f["id"] for f in d.get("facts", [])}
        return self._facts

    @property
    def terms(self):
        if self._terms is None:
            g = C.read_json(self.glossary_path, {}) or {}
            ts = {tkey(x["term"]) for x in g.get("terms", [])} | {tkey(x["term"]) for x in g.get("first_mention_gloss", [])}
            ts |= {tkey(x) for x in g.get("always_english", []) if isinstance(x, str)}
            self._terms = {t for t in ts if re.search(r"[a-z]", t)}
        return self._terms

    @property
    def sentence_ids(self):
        if self._sent_ids is None:
            self._sent_ids = set()
            for fp in glob.glob(os.path.join(self.sentences_dir, "*.jsonl")):
                with open(fp, encoding="utf-8") as f:
                    for line in f:
                        self._sent_ids.add(json.loads(line)["sent_id"])
        return self._sent_ids

    def component(self, name):
        if self._comps is None:
            self._comps = {}
            for fp in glob.glob(os.path.join(self.comp_dir, "*.json")):
                n = os.path.basename(fp)[:-5]
                if not n.startswith("_"):
                    self._comps[n] = C.read_json(fp)
            idx = C.read_json(os.path.join(self.comp_dir, "_index.json"), {}) or {}
            self._families = {k: v.get("family") for k, v in (idx.get("components") or {}).items() if isinstance(v, dict)}
        return self._comps.get(name)

    def family(self, name):
        self.component(name)
        return self._families.get(name)


# ======================================================================================== generic scans
def scan_time_fields(node, path, errs):
    """No seconds/frames anywhere; anchors are exactly {word, lead_frames}."""
    if isinstance(node, dict):
        if "word" in node and isinstance(node.get("word"), str) and node["word"].startswith("w:"):
            if set(node) != {"word", "lead_frames"}:
                errs.append(f"{path}: anchor must be exactly {{word, lead_frames}}, got keys {sorted(node)}")
        elif "lead_frames" in node:
            errs.append(f"{path}: lead_frames outside a {{word, lead_frames}} anchor")
        for k, v in node.items():
            kp = f"{path}.{k}"
            if k in FORBIDDEN_KEYS or (TIMEY_KEY.search(k) and k not in TIMEY_ALLOWED
                                       and not (k == "frames" and path.endswith("transition_out"))):
                errs.append(f"{kp}: time-valued key '{k}' is forbidden in specs (anchor to word ids)")
            scan_time_fields(v, kp, errs)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            scan_time_fields(v, f"{path}[{i}]", errs)
    elif isinstance(node, str) and TIMEY_VALUE.match(node):
        errs.append(f"{path}: time-like value {node!r} is forbidden in specs")


def display_strings(node, key=None):
    """Text a layer puts on screen: string leaves not under ID/enum-like keys, numeric leaves under value/to/from."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k in NONDISPLAY:
                continue
            yield from display_strings(v, k)
    elif isinstance(node, list):
        for v in node:
            yield from display_strings(v, key)
    elif isinstance(node, str):
        if node and not ID_LIKE.match(node):
            yield node
    elif isinstance(node, (int, float)) and not isinstance(node, bool) and key in NUMERIC_DISPLAY_KEYS:
        yield repr(int(node)) if float(node).is_integer() else repr(node)


def iter_anchors(node, path):
    """Every {word, lead_frames} anchor nested in a props object: (path, anchor)."""
    if isinstance(node, dict):
        if isinstance(node.get("word"), str) and node["word"].startswith("w:") and "lead_frames" in node:
            yield path, node
            return
        for k, v in node.items():
            yield from iter_anchors(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from iter_anchors(v, f"{path}[{i}]")


def collect_refs(node):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ("ref", "scores_ref") and isinstance(v, str):
                yield v
            else:
                yield from collect_refs(v)
    elif isinstance(node, list):
        for v in node:
            yield from collect_refs(v)


# ======================================================================================== the chapter lint
def lint_chapter(world, ch, spec, window=False):
    """-> {errors, warnings, metrics}. `spec` is the parsed JSON (or None when the file is missing).
    window=True (underscore demo specs such as corpus/specs/_demo.json only): `spec.window = {from, to}` sentence ids narrows
    coverage, density and the span to those sentences (+ WINDOW_PAD); chapter specs may never carry a window."""
    errs, warns = [], []
    if spec is None:
        return {"errors": [f"{ch}: spec missing (corpus/specs/{ch}.json)"], "warnings": [], "metrics": None}
    scan_time_fields(spec, "$", errs)
    js = jsonschema()
    sch = C.read_json(os.path.join(C.ROOT, "harness", "schemas", "scene_spec.schema.json"))
    serr = sorted(js.Draft202012Validator(sch).iter_errors(spec), key=lambda e: list(e.absolute_path))
    for e in serr[:15]:
        loc = "$" + "".join(f"[{x}]" if isinstance(x, int) else f".{x}" for x in e.absolute_path)
        errs.append(f"schema {loc}: {e.message[:200]}")
    if len(serr) > 15:
        errs.append(f"schema: ... {len(serr) - 15} more")
    if serr:
        return {"errors": errs, "warnings": warns, "metrics": None}

    edl_ch = world.chapters().get(ch)
    if edl_ch is None:
        return {"errors": errs + [f"{ch}: not an EDL chapter"], "warnings": warns, "metrics": None}
    if spec["chapter"] != ch:
        errs.append(f"chapter field {spec['chapter']!r} != {ch!r}")
    if spec["edl_version"] != world.edl.get("version"):
        errs.append(f"edl_version {spec['edl_version']} != locked EDL {world.edl.get('version')}")
    fps = world.fps
    to_f = lambda ms: T.ms2frame(ms, fps)  # noqa: E731
    gap_max, gap_long, hold_max = to_f(MAX_GAP_MS), to_f(LONG_SHOT_GAP_MS), to_f(MAX_HOLD_MS)
    ch_start, ch_end = edl_ch["start_frame"], edl_ch["end_frame"]
    ch_frames = ch_end - ch_start
    wm = world.wm

    # ---- sentence coverage and order
    expected = world.chapter_sentences(ch)
    win = spec.get("window")
    if win is not None and not window:
        errs.append("'window' is only allowed in underscore demo specs (corpus/specs/_*.json)")
    elif win is not None:
        try:
            i0, i1 = expected.index(win["from"]), expected.index(win["to"])
        except (ValueError, KeyError, TypeError):
            return {"errors": errs + [f"window {win!r}: from/to must be sentence ids of {ch} in EDL order"], "warnings": warns, "metrics": None}
        if i1 < i0:
            return {"errors": errs + ["window: 'to' precedes 'from'"], "warnings": warns, "metrics": None}
        expected = expected[i0:i1 + 1]
        a, b = world.sentence_span(ch, expected[0]), world.sentence_span(ch, expected[-1])
        ch_start, ch_end = max(ch_start, a[0] - WINDOW_PAD_IN), min(ch_end, b[1] + WINDOW_PAD_OUT)
        ch_frames = ch_end - ch_start
    flat = [s for sh in spec["shots"] for s in sh["sentences"]]
    exp_set, flat_set = set(expected), set(flat)
    missing = [s for s in expected if s not in flat_set]
    extra = [s for s in flat if s not in exp_set]
    dups = [s for s, n in collections.Counter(flat).items() if n > 1]
    if missing:
        errs.append(f"{len(missing)} EDL sentence(s) not covered by any shot, e.g. {missing[:3]}")
    if extra:
        errs.append(f"{len(extra)} shot sentence(s) not in this chapter's EDL, e.g. {extra[:3]}")
    if dups:
        errs.append(f"{len(dups)} sentence(s) in more than one shot, e.g. {dups[:3]}")
    if not missing and not extra and not dups and flat != expected:
        errs.append("shot sentences are not in EDL order")
    ids = [sh["shot_id"] for sh in spec["shots"]]
    if len(set(ids)) != len(ids):
        errs.append("duplicate shot_id")
    bad_pref = [i for i in ids if not i.startswith(ch + "-S")]
    if bad_pref:
        errs.append(f"shot_id not prefixed {ch}-S: {bad_pref[:3]}")
    nums = [int(i.rsplit("-S", 1)[1]) for i in ids if "-S" in i]
    if nums != sorted(nums):
        errs.append("shot numbers are not increasing")

    # ---- shot spans (frames); the first shot starts at the chapter start (entry card), the last ends at the chapter end
    spans = {}
    starts = []
    for i, sh in enumerate(spec["shots"]):
        sp = [world.sentence_span(ch, s) for s in sh["sentences"]]
        sp = [x for x in sp if x]
        starts.append(ch_start if i == 0 else (min(a for a, _ in sp) if sp else None))
    for i, sh in enumerate(spec["shots"]):
        a = starts[i]
        b = starts[i + 1] if i + 1 < len(starts) else ch_end
        if a is None or b is None:
            errs.append(f"{sh['shot_id']}: cannot place the shot (sentences unknown to the word map)")
            continue
        spans[sh["shot_id"]] = (a, b)

    events = []      # (frame, key, shot_id, sent_id|None, mechanism)
    hold_pts = []    # (frame, 'hs'|'he')
    shot_info = {}
    comp_count, act_count = collections.Counter(), collections.Counter()
    hero_frames = 0

    for sh in spec["shots"]:
        sid_ = sh["shot_id"]
        if sid_ not in spans:
            continue
        a, b = spans[sid_]
        sset = set(sh["sentences"])
        shot_words = [w for w in world.chapter_words(ch) if wm[w][2] in sset]
        wset = set(shot_words)
        events.append((a, ("cut", sid_), sid_, None, False))
        tier = sh.get("fx_tier", "standard")
        if tier == "hero":
            hero_frames += b - a
        length_ms = T.frame2ms(b - a, fps)
        if length_ms > MAX_SHOT_MS:
            errs.append(f"{sid_}: shot is {length_ms / 1000:.1f} s > {MAX_SHOT_MS // 1000} s")

        def anchor_frame(an, where):
            w = an["word"]
            if w not in wm:
                errs.append(f"{sid_} {where}: word {w} is not in the word map")
                return None
            if w not in wset:
                errs.append(f"{sid_} {where}: word {w} lies outside the shot's sentences")
                return None
            f = wm[w][0] - an["lead_frames"]
            if f < a - LEAD_SLACK_FRAMES:
                errs.append(f"{sid_} {where}: anchor lands {a - f} frames before the shot (lead {an['lead_frames']} on {w})")
            return f

        vis = []          # (arrive, exit|None, text)
        ids_seen = {}
        shown_numbers = []   # (layer index, number) for the data_refs rule
        layer_has_ref = {}
        for li, ly in enumerate(sh["layers"]):
            where = f"L{li}"
            base, act = split_comp(ly["component"])
            cs = world.component(base)
            if cs is None:
                errs.append(f"{sid_} {where}: unknown component {base!r} (not in the frozen catalog)")
                continue
            if act:
                sub = (cs.get("x-actions") or {}).get(act)
                if sub is None:
                    errs.append(f"{sid_} {where}: {base} has no action {act!r}; has {sorted(cs.get('x-actions') or {})}")
                    continue
                psch = sub
            else:
                psch = cs
            perr = sorted(js.Draft202012Validator(psch).iter_errors(ly["props"]), key=lambda e: list(e.absolute_path))
            for e in perr[:4]:
                loc = ".".join(str(x) for x in e.absolute_path)
                errs.append(f"{sid_} {where} {ly['component']} props{('.' + loc) if loc else ''}: {e.message[:160]}")
            comp_count[base] += 1
            if act:
                act_count[f"{base}.{act}"] += 1
            lid = ly["props"].get("id") if isinstance(ly["props"], dict) else None
            if lid and not act:
                if lid in ids_seen:
                    errs.append(f"{sid_} {where}: duplicate layer id {lid!r}")
                ids_seen[lid] = base
            if act:
                tgt = ly["props"].get("target")
                if tgt is not None and ids_seen.get(tgt) != base:
                    errs.append(f"{sid_} {where}: action target {tgt!r} is not an earlier {base} layer in this shot")
                elif tgt is None and base not in ids_seen.values() and not any(
                        split_comp(x["component"])[0] == base and not split_comp(x["component"])[1] for x in sh["layers"][:li]):
                    errs.append(f"{sid_} {where}: action {ly['component']} has no earlier {base} layer in the shot")
            at = ly.get("at")
            if (act or base in ANCHOR_REQUIRED) and not at:
                errs.append(f"{sid_} {where}: {ly['component']} needs an 'at' anchor")
            arrive = a
            if at:
                f = anchor_frame(at, f"{where}.at")
                if f is not None:
                    arrive = f
                    events.append((f, ("arrive", base, act), sid_, wm[at["word"]][2], bool(act) or base not in TYPE_ONLY))
            exit_f = None
            for apath, an in iter_anchors(ly["props"], "props"):
                f = anchor_frame(an, f"{where}.{apath}")
                if f is None:
                    continue
                if apath.endswith("until"):
                    exit_f = f
                    if f <= arrive:
                        errs.append(f"{sid_} {where}: until ({f}) is not after the arrival ({arrive})")
                    events.append((f, ("exit", base, act), sid_, wm[an["word"]][2], False))
                else:   # land / nudges / terminal lines ...: a sub-event of this layer
                    events.append((f, ("sub", base, act, apath), sid_, wm[an["word"]][2], bool(act) or base not in TYPE_ONLY))
            for r in set(collect_refs(ly["props"])):
                layer_has_ref[li] = True
                if r.startswith("d:") and r not in world.facts:
                    errs.append(f"{sid_} {where}: data ref {r} is not in the data contract")
                elif r.startswith("s:") and r not in world.sentence_ids:
                    errs.append(f"{sid_} {where}: sentence ref {r} is not a known sentence")
            if base == "FXTier" and ly["props"].get("tier") != tier:
                errs.append(f"{sid_} {where}: FXTier {ly['props'].get('tier')} != shot fx_tier {tier}")
            for t in display_strings(ly["props"]):
                vis.append((arrive, exit_f, t))
                for n in num_keys(t):
                    shown_numbers.append((li, n))
        if tier == "hero" and not any(split_comp(x["component"])[0] in THREE_D_CAPABLE for x in sh["layers"]):
            warns.append(f"{sid_}: hero tier without any 3D-capable component")

        # ---- sfx anchors
        for k, s in enumerate(sh.get("sfx", [])):
            anchor_frame(s["at"], f"sfx[{k}]")
        # ---- holds
        for k, h in enumerate(sh.get("holds", [])):
            if not (isinstance(h, dict) and isinstance(h.get("from"), dict) and isinstance(h.get("until"), dict)
                    and isinstance(h.get("reason"), str) and h["reason"].strip()):
                errs.append(f"{sid_} holds[{k}]: must be {{from:{{word,lead_frames}}, until:{{word,lead_frames}}, reason}}")
                continue
            f0, f1 = anchor_frame(h["from"], f"holds[{k}].from"), anchor_frame(h["until"], f"holds[{k}].until")
            if f0 is not None and f1 is not None:
                if f1 <= f0:
                    errs.append(f"{sid_} holds[{k}]: until is not after from")
                elif f1 - f0 > hold_max:
                    errs.append(f"{sid_} holds[{k}]: hold is {T.frame2ms(f1 - f0, fps) / 1000:.1f} s > {MAX_HOLD_MS // 1000} s")
                else:
                    hold_pts += [(f0, "hs"), (f1, "he")]
        # ---- data refs, transition
        for r in sh.get("data_refs", []):
            if r not in world.facts:
                errs.append(f"{sid_}: data_refs {r} is not in the data contract")
        tr = (sh.get("transition_out") or {}).get("type")
        if tr and tr not in SIMPLE_TRANSITIONS and world.component(tr) is None:
            errs.append(f"{sid_}: transition_out.type {tr!r} is not a catalog component or cut/dissolve")
        # ---- every number shown is referenced (data_refs, a ref in its layer, or spoken in the shot)
        spoken_nums = {n for w in shot_words for n in num_keys(world.word_info(w)[0])}
        for li, n in sorted(set(shown_numbers)):
            if not (sh.get("data_refs") or layer_has_ref.get(li) or n in spoken_nums):
                errs.append(f"{sid_} L{li}: number {n} shown without data_refs, a ref, or a source sentence that says it")
        shot_info[sid_] = {"vis": vis, "words": shot_words, "span": (a, b), "tier": tier}

    # ---- anchored coverage per sentence, mechanism share
    ev_by_sent = collections.defaultdict(list)
    for f, key, sh_id, sent, mech in events:
        if sent is not None and key[0] in ("arrive", "sub"):
            ev_by_sent[sent].append(mech)
    anchored = [s for s in expected if ev_by_sent.get(s)]
    mech_n = [s for s in expected if any(ev_by_sent.get(s, []))]
    n_sent = len(expected) or 1
    anchored_pct, mech_pct = 100.0 * len(anchored) / n_sent, 100.0 * len(mech_n) / n_sent
    un = [s for s in expected if s not in anchored]
    if un:
        errs.append(f"{len(un)} sentence(s) have no anchored event, e.g. {un[:3]}")
    if expected and mech_pct < MIN_MECHANISM_PCT:
        errs.append(f"mechanism events cover {mech_pct:.1f} % of sentences < {MIN_MECHANISM_PCT:.0f} %")

    # ---- density, gaps
    uniq = {}
    for f, key, sh_id, sent, mech in events:
        uniq[(f, key)] = sh_id
    minutes = T.frame2ms(ch_frames, fps) / 60000.0
    epm = len(uniq) / minutes if minutes else 0.0
    if epm < MIN_EVENTS_PER_MIN:
        errs.append(f"{epm:.1f} events/min < {MIN_EVENTS_PER_MIN:.0f} ({len(uniq)} events in {minutes:.2f} min)")
    pts = sorted([(f, "ev") for f, _ in uniq] + hold_pts + [(ch_start, "ev"), (ch_end, "end")])
    shot_of = lambda fr: next((s for s, (x, y) in spans.items() if x <= fr < y), None)  # noqa: E731
    max_gap, gap_errs = 0, []
    for (f0, t0), (f1, t1) in zip(pts, pts[1:]):
        if t0 == "hs" and t1 == "he":
            continue
        g = f1 - f0
        if g > max_gap:
            max_gap = g
        s0 = shot_of(f0)
        lim = gap_long if s0 and (spans[s0][1] - spans[s0][0]) > to_f(LONG_SHOT_MS) else gap_max
        if g > lim:
            gap_errs.append(f"{s0 or ch}: {T.frame2ms(g, fps) / 1000:.1f} s without an event after frame {f0} (limit {T.frame2ms(lim, fps) / 1000:.0f} s)")
    errs += gap_errs[:8]
    if len(gap_errs) > 8:
        errs.append(f"... {len(gap_errs) - 8} more gaps")

    # ---- spoken numbers and first-mention terms on screen
    num_tot = num_ok = term_tot = term_ok = 0
    miss_n, miss_t = [], []
    for sh in spec["shots"]:
        info = shot_info.get(sh["shot_id"])
        if not info:
            continue
        for w in info["words"]:
            sf, ef = wm[w][0], wm[w][1]
            text, is_num, _ = world.word_info(w)
            if is_num:
                for n in num_keys(text):
                    num_tot += 1
                    if _on_screen_number(info["vis"], n, sf, ef):
                        num_ok += 1
                    else:
                        miss_n.append((sh["shot_id"], w, n))
    # first-mention terms are per chapter over the whole chapter sequence
    for w, key in first_mentions(world, ch):
        sid = wm[w][2]
        shot = next((s for s in spec["shots"] if sid in s["sentences"]), None)
        if shot is None or shot["shot_id"] not in shot_info:
            continue
        term_tot += 1
        if _on_screen_term(shot_info[shot["shot_id"]]["vis"], key, wm[w][0], wm[w][1]):
            term_ok += 1
        else:
            miss_t.append((shot["shot_id"], w, key))
    if miss_n:
        errs.append(f"{len(miss_n)} spoken number(s) not on screen, e.g. " + "; ".join(f"{s} {w[-6:]}={n}" for s, w, n in miss_n[:4]))
    if miss_t:
        errs.append(f"{len(miss_t)} first-mention term(s) not on screen, e.g. " + "; ".join(f"{s} {w[-6:]}={k}" for s, w, k in miss_t[:4]))

    # ---- FX tier / real-time 3D budget (ADR-002 RT5)
    hero_ratio = hero_frames / ch_frames if ch_frames else 0.0
    declared = (spec.get("fx_budget") or {}).get("hero_max_ratio")
    cap = MAX_RT3D_RATIO if declared is None else min(MAX_RT3D_RATIO, declared)
    if declared is not None and declared > MAX_RT3D_RATIO:
        warns.append(f"fx_budget.hero_max_ratio {declared} exceeds the ADR-002 RT5 cap {MAX_RT3D_RATIO}; the cap applies")
    if hero_ratio > cap + 1e-9:
        errs.append(f"real-time 3D (hero tier) is {100 * hero_ratio:.1f} % of the chapter > {100 * cap:.1f} % (ADR-002 RT5)")

    # ---- shot length stats
    lens_ms = [T.frame2ms(b - a, fps) for a, b in spans.values()]
    med = statistics.median(lens_ms) if lens_ms else 0
    if lens_ms and not (MEDIAN_SHOT_MS[0] <= med <= MEDIAN_SHOT_MS[1]):
        warns.append(f"median shot length {med / 1000:.1f} s outside {MEDIAN_SHOT_MS[0] // 1000}-{MEDIAN_SHOT_MS[1] // 1000} s")

    metrics = {
        "chapter": ch, "fps": fps, "minutes": round(minutes, 3), "shots": len(spec["shots"]), "sentences": len(expected),
        "sentences_anchored": len(anchored), "anchored_pct": round(anchored_pct, 2), "mechanism_pct": round(mech_pct, 2),
        "events": len(uniq), "events_per_min": round(epm, 2), "max_gap_s": round(T.frame2ms(max_gap, fps) / 1000, 2),
        "median_shot_s": round(med / 1000, 2), "max_shot_s": round(max(lens_ms, default=0) / 1000, 2),
        "numbers_total": num_tot, "numbers_on_screen": num_ok, "terms_total": term_tot, "terms_on_screen": term_ok,
        "hero_frames": hero_frames, "chapter_frames": ch_frames, "rt3d_ratio": round(hero_ratio, 4),
        "components": dict(comp_count.most_common()), "actions": dict(act_count.most_common()),
    }
    return {"errors": errs, "warnings": warns, "metrics": metrics}


def _on_screen_number(vis, n, sf, ef):
    pat = re.compile(r"(?<![0-9.])" + re.escape(n) + r"(?![0-9])")
    for arrive, exit_f, t in vis:
        if arrive <= ef and (exit_f is None or exit_f > sf):
            if pat.search(re.sub(r"(?<=\d),(?=\d{3})", "", t.translate(_AR_DIG))):
                return True
    return False


def _on_screen_term(vis, key, sf, ef):
    pat = re.compile(r"(?<![a-z0-9])" + re.escape(key) + r"(?:s|es)?(?![a-z0-9])")
    for arrive, exit_f, t in vis:
        if arrive <= ef and (exit_f is None or exit_f > sf):
            if pat.search(tkey(t)):
                return True
    return False


def first_mentions(world, ch):
    """[(word_id, term key)] : the first spoken occurrence per chapter of each glossary term (n-grams of Latin tokens up to 3)."""
    wids = world.chapter_words(ch)
    toks = [latin_token(world.word_info(w)[0]) for w in wids]
    seen, out, i = set(), [], 0
    terms = world.terms
    while i < len(wids):
        hit = None
        for n in (3, 2, 1):
            seq = toks[i:i + n]
            if len(seq) < n or any(t is None for t in seq):
                continue
            k = " ".join(seq)
            for cand in (k, k[:-1] if k.endswith("s") else None, k[:-2] if k.endswith("es") else None):
                if cand and cand in terms:
                    hit = (cand, n)
                    break
            if hit:
                break
        if hit:
            if hit[0] not in seen:
                seen.add(hit[0])
                out.append((wids[i], hit[0]))
            i += hit[1]
        else:
            i += 1
    return out


# ======================================================================================== driver (cache, reports, CLI)
def _hash_group(paths):
    return [{"path": C.rel(p), "sha256": C.sha256_file(p)} for p in sorted(paths) if os.path.isfile(p)]


def shared_inputs(world):
    paths = [C.p("harness", "schemas", "scene_spec.schema.json"), C.p("harness", "state", "freeze.json"),
             C.p("corpus", "edl", "lock.json"), world.edl_path, world.word_map_path, world.contract_path, world.glossary_path,
             os.path.abspath(__file__), C.p("tools", "dclib", "timeutil.py")]
    paths += glob.glob(os.path.join(world.comp_dir, "*.json"))
    paths += glob.glob(os.path.join(world.sentences_dir, "*.jsonl"))
    paths += glob.glob(os.path.join(world.words_dir, "*.words.jsonl"))
    return _hash_group(paths)


def spec_path(ch, spec_dir=None):
    return os.path.join(spec_dir or SPEC_DIR, f"{ch}.json")


def resolve_chapters(world, which):
    allc = [c["id"] for c in world.edl["chapters"]]
    if which == "all":
        return allc
    out = []
    for w in which.split(","):
        if w.strip().startswith("_"):   # underscore demo spec (corpus/specs/_<name>.json), e.g. _demo
            out.append(w.strip())
            continue
        w = w.strip().upper()
        if w not in allc:
            C.fail(f"unknown chapter {w!r}; EDL chapters: {allc[0]} .. {allc[-1]} ({len(allc)})", 2)
        out.append(w)
    return out


def run_lint(chapters, world=None, spec_dir=None, report_dir=None, force=False, write=True):
    """Lint chapters with the content-addressed cache. Returns {ch: report}. Reports: <report_dir>/lint/<CH>.json."""
    world = world or World()
    report_dir = report_dir or REPORT_DIR
    sh = shared_inputs(world)
    cache_ok = write and not force
    out, stale = {}, []
    for ch in chapters:
        sp = spec_path(ch, spec_dir)
        ins = sh + (_hash_group([sp]) if os.path.exists(sp) else [])
        rp = os.path.join(report_dir, "lint", f"{ch}.json")
        if cache_ok and M.should_skip(report_dir, f"lint:{ch}", ins, [rp]):
            out[ch] = C.read_json(rp)
        else:
            stale.append((ch, sp, ins, rp))
    for ch, sp, ins, rp in stale:
        spec = None
        if os.path.exists(sp):
            try:
                spec = C.read_json(sp)
            except json.JSONDecodeError as e:
                res = {"errors": [f"{ch}: invalid JSON ({e})"], "warnings": [], "metrics": None}
                spec = False
        if spec is not False:
            if ch.startswith("_"):   # demo spec: the chapter comes from the file; `window` allowed
                res = lint_chapter(world, (spec or {}).get("chapter", ch), spec, window=True)
            else:
                res = lint_chapter(world, ch, spec)
        rep = {"v": 1, "chapter": ch, "spec": C.rel(sp), "spec_sha256": C.sha256_file(sp) if os.path.exists(sp) else None,
               "pass": not res["errors"], "error_count": len(res["errors"]), "errors": res["errors"][:60],
               "warnings": res["warnings"][:30], "metrics": res["metrics"]}
        if rep["metrics"]:
            rep["metrics"]["spec_sha256"] = rep["spec_sha256"]    # critics/fact-checkers copy this to prove freshness
        out[ch] = rep
        if write and rep["spec_sha256"] is not None:   # a missing spec leaves no report behind
            C.write_json(rp, rep)
            M.write(report_dir, f"lint:{ch}", f"dc spec lint {ch}", ins, [C.rel(rp)])
    return out


def digest_specs(chapters, spec_dir=None):
    """sha256 over (chapter, spec sha) of every chapter: the identity of the whole storyboard."""
    parts = []
    for ch in chapters:
        sp = spec_path(ch, spec_dir)
        parts.append(f"{ch}\t{C.sha256_file(sp) if os.path.exists(sp) else '-'}")
    return C.sha256_text("\n".join(parts))


def aggregate(reps, world):
    ms = [r["metrics"] for r in reps.values() if r.get("metrics")]
    comp = collections.Counter()
    for m in ms:
        comp.update(m["components"])
    frames = sum(m["chapter_frames"] for m in ms)
    return {
        "chapters": len(reps), "with_metrics": len(ms), "failing": sorted(c for c, r in reps.items() if not r["pass"]),
        "events_per_min_min": min((m["events_per_min"] for m in ms), default=None),
        "events_per_min_median": statistics.median([m["events_per_min"] for m in ms]) if ms else None,
        "rt3d_ratio_film": round(sum(m["hero_frames"] for m in ms) / frames, 4) if frames else None,
        "sentences": sum(m["sentences"] for m in ms), "sentences_anchored": sum(m["sentences_anchored"] for m in ms),
        "numbers": [sum(m["numbers_on_screen"] for m in ms), sum(m["numbers_total"] for m in ms)],
        "terms": [sum(m["terms_on_screen"] for m in ms), sum(m["terms_total"] for m in ms)],
        "components": dict(comp.most_common()),
    }


def _fmt_line(r):
    m = r.get("metrics")
    head = f"{r['chapter']}: {'ok  ' if r['pass'] else 'FAIL'} errors {r['error_count']} warnings {len(r['warnings'])}"
    if not m:
        return head
    return (f"{head} | shots {m['shots']} ev/min {m['events_per_min']} anchored {m['anchored_pct']:.0f}% mech {m['mechanism_pct']:.0f}% "
            f"num {m['numbers_on_screen']}/{m['numbers_total']} term {m['terms_on_screen']}/{m['terms_total']} "
            f"3D {100 * m['rt3d_ratio']:.1f}% gap {m['max_gap_s']}s")


def cmd_lint(args):
    world = World()
    chapters = resolve_chapters(world, args.chapter)
    reps = run_lint(chapters, world, spec_dir=args.spec_dir, force=args.force, write=not args.no_report)
    if args.json:
        print(C.dumps(reps, indent=1))
    else:
        missing = [c for c in chapters if reps[c]["spec_sha256"] is None]
        if len(chapters) > 1 and missing:
            print(f"missing specs ({len(missing)}): {', '.join(missing[:6])}{' ...' if len(missing) > 6 else ''}")
        for ch in chapters:
            r = reps[ch]
            if len(chapters) > 1 and ((r["pass"] and not r["warnings"] and not args.all_lines) or ch in missing):
                continue
            print(_fmt_line(r))
            for e in r["errors"][:args.errors]:
                print("   ERROR", e)
            for w in r["warnings"][:2]:
                print("   warn ", w)
        bad = [c for c in chapters if not reps[c]["pass"]]
        print(f"spec lint: {len(chapters) - len(bad)}/{len(chapters)} chapters clean; {len(missing)} spec(s) missing")
    return 0 if all(reps[c]["pass"] for c in chapters) else 1


def cmd_metrics(args):
    world = World()
    chapters = resolve_chapters(world, args.chapter)
    reps = run_lint(chapters, world, spec_dir=args.spec_dir, force=args.force, write=not args.no_report)
    agg = aggregate(reps, world)
    if not args.no_report and len(chapters) > 1 and agg["with_metrics"]:
        C.write_json(os.path.join(REPORT_DIR, "metrics.json"), {"v": 1, "aggregate": agg,
                                                                 "chapters": {c: reps[c]["metrics"] for c in chapters}})
    if args.json:
        print(C.dumps({"aggregate": agg, "chapters": {c: reps[c]["metrics"] for c in chapters}}, indent=1))
        return 0
    nm = [c for c in chapters if reps[c]["spec_sha256"] is None]
    if len(chapters) > 1 and nm:
        print(f"no spec for {len(nm)} chapter(s): {', '.join(nm[:6])}{' ...' if len(nm) > 6 else ''}")
    for ch in chapters:
        m = reps[ch]["metrics"]
        if len(chapters) > 1 and ch in nm:
            continue
        if not m:
            print(f"{ch}: no metrics ({reps[ch]['errors'][0] if reps[ch]['errors'] else 'n/a'})")
            continue
        top = ", ".join(f"{k} {v}" for k, v in list(m["components"].items())[:args.top])
        print(f"{ch}: {m['events_per_min']} ev/min ({m['events']} ev, {m['minutes']} min) | sentences anchored {m['sentences_anchored']}/{m['sentences']} "
              f"mechanism {m['mechanism_pct']:.0f}% | numbers {m['numbers_on_screen']}/{m['numbers_total']} terms {m['terms_on_screen']}/{m['terms_total']} | "
              f"3D {100 * m['rt3d_ratio']:.2f}% | max gap {m['max_gap_s']} s, median shot {m['median_shot_s']} s")
        if len(chapters) == 1 or args.top_all:
            print(f"   components: {top}")
    if len(chapters) > 1:
        print(f"film: {agg['with_metrics']}/{agg['chapters']} chapters with metrics; ev/min min {agg['events_per_min_min']} median "
              f"{agg['events_per_min_median']}; 3D {agg['rt3d_ratio_film']}; anchored {agg['sentences_anchored']}/{agg['sentences']}; "
              f"numbers {agg['numbers']}; terms {agg['terms']}; top components {list(agg['components'].items())[:8]}")
    return 0


def cmd_coverage(args):
    """Global coverage loop (L5): lint every EDL chapter + film-level checks; --record appends a round to coverage_rounds.json."""
    world = World()
    chapters = resolve_chapters(world, "all")
    reps = run_lint(chapters, world, spec_dir=args.spec_dir, force=args.force, write=not args.no_report)
    agg = aggregate(reps, world)
    issues = list(agg["failing"])
    film_ok = agg["rt3d_ratio_film"] is not None and agg["rt3d_ratio_film"] <= MAX_RT3D_RATIO
    clean = not issues and film_ok and agg["with_metrics"] == len(chapters)
    print(f"coverage: {len(chapters) - len(issues)}/{len(chapters)} chapters lint-clean; film 3D {agg['rt3d_ratio_film']}; clean={clean}")
    if args.record:
        if args.by.lower() in ("scene-director", "scene_director"):
            C.fail("a coverage round is not valid when recorded by the author (scene-director)", 2)
        path = os.path.join(REPORT_DIR, "coverage_rounds.json")
        doc = C.read_json(path, {"v": 1, "rounds": []}) or {"v": 1, "rounds": []}
        n = len(doc["rounds"]) + 1
        doc["rounds"].append({"round": n, "by": args.by, "clean": bool(clean and args.issues == 0), "lint_failing": len(issues),
                              "open_issues": args.issues, "spec_digest": digest_specs(chapters, args.spec_dir),
                              "created": C.now_iso(), "note": args.note or ""})
        C.write_json(path, doc)
        print(f"recorded coverage round {n} by {args.by}: clean={doc['rounds'][-1]['clean']}")
    return 0 if clean else 1


def cmd_digest(args):
    world = World()
    print(digest_specs(resolve_chapters(world, "all"), args.spec_dir))
    return 0


def cmd_pack(args):
    from . import specpack
    return specpack.cmd_pack(args)


def register(sub):
    sp = sub.add_parser("spec", help="scene specs (P8): lint, metrics, coverage loop; pack builds the P8 briefing packs")
    ss = sp.add_subparsers(dest="spec_cmd", required=True)

    def common(s):
        s.add_argument("--spec-dir", default=None, help="spec directory (default corpus/specs; tests)")
        s.add_argument("--force", action="store_true", help="ignore the content-addressed cache")
        s.add_argument("--no-report", action="store_true", help="do not write reports/spec/*")

    s = ss.add_parser("lint", help="lint specs against the frozen contract, the EDL and the word map; exit 1 on any error")
    s.add_argument("chapter", help="CH-33 | DD-P23 | CH-01,CH-02 | all")
    common(s)
    s.add_argument("--json", action="store_true")
    s.add_argument("--errors", type=int, default=6, help="errors printed per chapter")
    s.add_argument("--all-lines", action="store_true", help="with several chapters: also print clean chapters")
    s.set_defaults(fn="speclint.cmd_lint")
    s = ss.add_parser("metrics", help="events/min, coverage, 3D share, component frequency")
    s.add_argument("chapter")
    common(s)
    s.add_argument("--json", action="store_true")
    s.add_argument("--top", type=int, default=12)
    s.add_argument("--top-all", action="store_true")
    s.set_defaults(fn="speclint.cmd_metrics")
    s = ss.add_parser("coverage", help="global coverage loop round: lint all + film checks; --record keeps the round for G7")
    common(s)
    s.add_argument("--record", action="store_true")
    s.add_argument("--by", default="critic", help="who ran the round (never scene-director)")
    s.add_argument("--issues", type=int, default=0, help="open semantic issues found by the reviewer (0 = clean)")
    s.add_argument("--note", default="")
    s.set_defaults(fn="speclint.cmd_coverage")
    s = ss.add_parser("digest", help="sha256 identity of all specs (used by coverage rounds)")
    s.add_argument("--spec-dir", default=None)
    s.set_defaults(fn="speclint.cmd_digest")
    s = ss.add_parser("pack", help="briefing pack(s) for the scene-director: corpus/packs/<id>.json + .md (P8 step 1)")
    s.add_argument("chapter", help="CH-33 | DD-P23 | CH-01,CH-02 | all")
    s.add_argument("--force", action="store_true", help="rebuild even if the input hashes in the pack header are unchanged")
    s.add_argument("--target", type=int, default=25000, help="token budget per pack (estimate; default 25000)")
    s.add_argument("--out-dir", default=None, help="default corpus/packs (tests)")
    s.add_argument("--no-md", action="store_true")
    s.add_argument("--json", action="store_true")
    s.set_defaults(fn="speclint.cmd_pack")
