#!/usr/bin/env python3
"""Plain-assert tests for dc spec lint / metrics / coverage. Run: python3 -I tools/tests/test_speclint.py
Fixture: tools/tests/fixtures/spec/DD-P06-2.json, a 6-shot spec for the shortest EDL chapter (DD-P06-2, 54 s), written with real
word ids from corpus/edl/word_map.v1*.jsonl. It must lint clean; every negative case mutates a copy and must raise the named error."""
import copy
import glob
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from dclib import manifest as M  # noqa: E402
from dclib import speclint as S  # noqa: E402

n = 0


def check(cond, msg):
    global n
    n += 1
    if not cond:
        print("FAIL:", msg)
        sys.exit(1)


FIX_DIR = os.path.join(ROOT, "tools/tests/fixtures/spec")
CH = "DD-P06-2"
BASE = json.load(open(os.path.join(FIX_DIR, f"{CH}.json"), encoding="utf-8"))
W = S.World()
W.wm  # load once


def lint(spec):
    return S.lint_chapter(W, CH, spec)


def has(res, needle, kind="errors"):
    return any(needle in e for e in res[kind])


def mut(fn):
    s = copy.deepcopy(BASE)
    fn(s)
    return lint(s)


def layer(s, shot, comp, nth=0):
    return [ly for ly in s["shots"][shot]["layers"] if ly["component"] == comp][nth]


# ---------------------------------------------------------------- the fixture is real and clean
wm_ids = set()
for fp in glob.glob(os.path.join(ROOT, "corpus/edl/word_map.v1*.jsonl")):
    with open(fp, encoding="utf-8") as f:
        wm_ids.update(json.loads(l)["word_id"] for l in f)
used = {a["word"] for sh in BASE["shots"] for ly in sh["layers"] for _, a in S.iter_anchors(ly, "x")}
used |= {a["word"] for sh in BASE["shots"] for ly in sh["layers"] if "at" in ly for a in [ly["at"]]}
check(len(used) >= 20 and used <= wm_ids, "fixture uses real word-map ids only")
base = lint(BASE)
check(base["errors"] == [], f"fixture lints clean: {base['errors']}")
m = base["metrics"]
check(m["events_per_min"] >= 20 and m["anchored_pct"] == 100 and m["mechanism_pct"] >= 80, f"metrics {m}")
check(m["numbers_total"] == 3 and m["numbers_on_screen"] == 3, "3 spoken numbers (3, 90, 10) all on screen")
check(m["terms_total"] == 3 and m["terms_on_screen"] == 3, "3 first-mention glossary terms (git, commit, python) on screen")
check(m["rt3d_ratio"] == 0 and m["components"]["KineticWord"] >= 5 and "GitGraph.merge" in m["actions"], "3D share + component frequency")
check(m["shots"] == 6 and m["sentences"] == 7 and m["sentences_anchored"] == 7, "7 sentences in 6 shots, all anchored")
check(S.first_mentions(W, CH) == [("w:S4:P06:001067", "git"), ("w:S4:P06:001070", "commit"), ("w:S4:P06:001098", "python")],
      "first mentions are per chapter, glossary only, plural-insensitive")

# ---------------------------------------------------------------- schema and enum alignment
sch = json.load(open(os.path.join(ROOT, "harness/schemas/scene_spec.schema.json")))
tier = json.load(open(os.path.join(ROOT, "harness/schemas/components/FXTier.json")))
check(sch["properties"]["shots"]["items"]["properties"]["fx_tier"]["enum"] == ["lite", "standard", "hero"]
      == tier["properties"]["tier"]["enum"], "fx_tier enum = lite|standard|hero = FXTier component tiers (tokens/04)")
check(has(mut(lambda s: s["shots"][0].pop("intent")), "schema"), "schema: missing intent")
check(has(mut(lambda s: s["shots"][0].__setitem__("fx_tier", "light")), "schema"), "schema: fx_tier 'light' rejected")
check(has(mut(lambda s: s.__setitem__("edl_version", "v9")), "edl_version"), "edl version must match the locked EDL")

# ---------------------------------------------------------------- no seconds/frames; anchors only {word, lead_frames}
check(has(mut(lambda s: s["shots"][1]["layers"][1].__setitem__("start_ms", 1200)), "forbidden"), "start_ms rejected")
check(has(mut(lambda s: s["shots"][1]["layers"][1]["props"].__setitem__("duration_s", 2)), "time-valued key"), "duration_s inside props rejected")
check(has(mut(lambda s: layer(s, 1, "KineticWord")["at"].__setitem__("t", 1)), "exactly {word, lead_frames}"), "anchor with extra key rejected")
check(has(mut(lambda s: layer(s, 1, "KineticWord")["at"].pop("lead_frames")), "schema"), "anchor without lead_frames rejected")
check(has(mut(lambda s: s["shots"][1].__setitem__("notes", "00:01:23")), "time-like value"), "timecode string rejected")
check(has(mut(lambda s: layer(s, 1, "KineticWord")["at"].__setitem__("lead_frames", 91)), "schema"), "lead_frames <= 90")

# ---------------------------------------------------------------- coverage and anchors
check(has(mut(lambda s: s["shots"].pop(2)), "not covered"), "uncovered EDL sentence")
check(has(mut(lambda s: s["shots"][0]["sentences"].append("s:S4:P06:0099")), "more than one shot"), "sentence in two shots")
check(has(mut(lambda s: s["shots"][0]["sentences"].append("s:S4:P06:0500")), "not in this chapter"), "foreign sentence")
check(has(mut(lambda s: s["shots"].reverse()), "increasing"), "shot numbers must increase")
check(has(mut(lambda s: layer(s, 0, "TermChip")["at"].__setitem__("word", "w:S4:P06:999999")), "not in the word map"), "unknown word id")
check(has(mut(lambda s: layer(s, 0, "TermChip")["at"].__setitem__("word", "w:S4:P06:001101")), "outside the shot"), "word outside the shot's sentences")
check(has(mut(lambda s: layer(s, 0, "TermChip").pop("at")), "needs an 'at' anchor"), "TermChip needs an anchor")
check(has(mut(lambda s: layer(s, 2, "TestGate.run").pop("at")), "needs an 'at' anchor"), "action layer needs an anchor")
check(has(mut(lambda s: layer(s, 2, "TestGate.run")["props"].__setitem__("target", "zzz")), "action target"), "bad action target")
check(has(mut(lambda s: layer(s, 4, "GitGraph.merge")["props"].pop("into")), "props"), "action props validate")
# a sentence whose only anchored events are removed
def strip_sentence_100(s):
    s["shots"][3]["layers"] = [ly for ly in s["shots"][3]["layers"] if "at" not in ly]
check(has(mut(strip_sentence_100), "no anchored event"), "every sentence needs an anchored event")

# ---------------------------------------------------------------- component catalog and props
check(has(mut(lambda s: layer(s, 0, "LoopPlate").__setitem__("component", "NoSuchThing")), "unknown component"), "unknown component")
check(has(mut(lambda s: layer(s, 0, "LoopPlate").__setitem__("component", "LoopPlate.play")), "no action"), "unknown action")
check(has(mut(lambda s: layer(s, 0, "TermChip")["props"].__setitem__("junk", 1)), "TermChip props"), "extra prop rejected (additionalProperties false)")
check(has(mut(lambda s: layer(s, 1, "KineticWord")["props"].__setitem__("preset", "wobble")), "KineticWord props"), "bad enum value")
check(has(mut(lambda s: layer(s, 0, "TermChip")["props"].__setitem__("term", "٣")), "TermChip props"), "Arabic-Indic digits rejected by the frozen schema")
check(has(mut(lambda s: s["shots"][0].__setitem__("transition_out", {"type": "Zoomy", "frames": 3})), "transition_out"), "unknown transition")

# ---------------------------------------------------------------- numbers and terms on screen, data refs
def drop(shot, comp, nth=0):
    def f(s):
        s["shots"][shot]["layers"].remove(layer(s, shot, comp, nth))
    return f


check(has(mut(drop(1, "NumberCounter")), "number(s) not on screen"), "spoken number 3 missing")
check(has(mut(drop(1, "TermChip")), "first-mention term(s) not on screen"), "first-mention term Python missing")
check(has(mut(drop(0, "TermChip", 1)), "first-mention term(s) not on screen"), "first-mention term commit missing")
check(has(mut(lambda s: layer(s, 2, "NumberCounter")["at"].__setitem__("word", "w:S4:P06:001116")), "number(s) not on screen"),
      "a counter that arrives after the number word has ended does not count")
check(not has(mut(lambda s: layer(s, 1, "TermChip")["props"].__setitem__("term", "Pythons")), "first-mention"), "plural tolerant")
check(not has(mut(lambda s: layer(s, 1, "TermChip")["props"].__setitem__("term", "python")), "first-mention"), "term match is case-insensitive")
check(has(mut(lambda s: layer(s, 3, "KineticWord").__setitem__("props", {"text": "77%"})), "number 77 shown without"), "number shown without a ref")
check(not has(mut(lambda s: (layer(s, 3, "KineticWord").__setitem__("props", {"text": "77%"}), s["shots"][3].__setitem__("data_refs", ["d:6.1:1"]))),
              "number 77"), "number with a data_refs id is accepted")
check(has(mut(lambda s: s["shots"][3].__setitem__("data_refs", ["d:99.9:9"])), "not in the data contract"), "unknown data ref")
check(has(mut(lambda s: layer(s, 1, "NumberCounter")["props"]["to"].__setitem__("ref", "s:S4:P06:9999")), "not a known sentence"), "unknown sentence ref")

# ---------------------------------------------------------------- density, gaps, holds, shot length
def keep_only_kinetic_shot2(s):
    s["shots"][1]["layers"] = [ly for ly in s["shots"][1]["layers"] if ly["component"] in ("TestGate", "NumberCounter", "TermChip")]
r = mut(keep_only_kinetic_shot2)
check(has(r, "without an event"), "gap > 4 s without an event is an error")
check(has(mut(lambda s: [s["shots"][i].__setitem__("layers", s["shots"][i]["layers"][:2]) for i in range(6)]), "events/min"),
      "events/min < 20 is an error")


def hold_case(until_word, reason="think"):
    def f(s):
        s["shots"][3]["layers"] = [s["shots"][3]["layers"][0]]
        s["shots"][3]["holds"] = [{"from": {"word": "w:S4:P06:001117", "lead_frames": 0},
                                   "until": {"word": until_word, "lead_frames": 0}, "reason": reason}]
    return f


r = mut(hold_case("w:S4:P06:001127"))
check(not has(r, "without an event"), f"a hold (<= 6 s, with a reason) excuses the gap: {r['errors']}")
check(has(mut(hold_case("w:S4:P06:001127", "")), "schema"), "a hold needs a reason (schema)")
check(has(mut(hold_case("w:S4:P06:001122")), "without an event"), "a hold excuses only its own span")
check(has(mut(lambda s: s["shots"][4].__setitem__("holds", [{"from": {"word": "w:S4:P06:001130", "lead_frames": 0},
                                                           "until": {"word": "w:S4:P06:001153", "lead_frames": 0}, "reason": "think"}])), "> 6 s"), "hold > 6 s")


check(not has(lint(BASE), "> 25 s"), "no shot over 25 s in the fixture")


def one_shot(s):   # all 7 sentences in one shot: 54 s
    a = s["shots"]
    a[0]["sentences"] = [x for sh in a for x in sh["sentences"]]
    del a[1:]


r = mut(one_shot)
check(has(r, "> 25 s"), f"a shot longer than 25 s is an error: {r['errors'][:3]}")

# ---------------------------------------------------------------- FX tier / real-time 3D (ADR-002 RT5)
r = mut(lambda s: s["shots"][3].__setitem__("fx_tier", "hero"))
check(has(r, "real-time 3D") and r["metrics"]["rt3d_ratio"] > 0.1, "hero shot of 13 % of the chapter breaks the 5 % cap")
r = mut(lambda s: (s["shots"][3].__setitem__("fx_tier", "hero"), s["fx_budget"].__setitem__("hero_max_ratio", 0.5)))
check(has(r, "real-time 3D") and has(r, "RT5", "warnings"), "a declared ratio above 5 % does not raise the cap")
r = mut(lambda s: s["shots"][0]["layers"].append({"component": "FXTier", "props": {"tier": "hero"}}))
check(has(r, "FXTier hero != shot fx_tier standard"), "FXTier layer must match the shot tier")

# ---------------------------------------------------------------- missing spec, invalid JSON, cache, manifest, CLI
check(has(S.lint_chapter(W, CH, None), "spec missing"), "missing spec is an error")
with tempfile.TemporaryDirectory() as td:
    sd, rd = os.path.join(td, "specs"), os.path.join(td, "rep")
    os.makedirs(sd)
    with open(os.path.join(sd, f"{CH}.json"), "w", encoding="utf-8") as f:
        json.dump(BASE, f, ensure_ascii=False)
    r1 = S.run_lint([CH], W, spec_dir=sd, report_dir=rd)
    mf1 = M.load(rd)["steps"][f"lint:{CH}"]
    check(r1[CH]["pass"] and os.path.exists(os.path.join(rd, "lint", f"{CH}.json")), "report + manifest written")
    check(mf1["inputs"] and any(i["path"].endswith(f"{CH}.json") for i in mf1["inputs"]), "manifest lists the spec as an input")
    r2 = S.run_lint([CH], W, spec_dir=sd, report_dir=rd)
    check(M.load(rd)["steps"][f"lint:{CH}"]["created"] == mf1["created"] and r2[CH] == r1[CH], "second run is a no-op (content-addressed skip)")
    bad = copy.deepcopy(BASE)
    bad["shots"].pop(2)
    with open(os.path.join(sd, f"{CH}.json"), "w", encoding="utf-8") as f:
        json.dump(bad, f, ensure_ascii=False)
    r3 = S.run_lint([CH], W, spec_dir=sd, report_dir=rd)
    check(not r3[CH]["pass"] and r3[CH]["spec_sha256"] != r1[CH]["spec_sha256"], "an edited spec invalidates the cache")
    d1 = S.digest_specs([CH], sd)
    check(len(d1) == 64 and d1 != S.digest_specs([CH], FIX_DIR), "digest follows spec content")
    with open(os.path.join(sd, f"{CH}.json"), "w", encoding="utf-8") as f:
        f.write("{not json")
    r4 = S.run_lint([CH], W, spec_dir=sd, report_dir=rd)
    check(not r4[CH]["pass"] and "invalid JSON" in r4[CH]["errors"][0], "invalid JSON is a lint error")

dc = [sys.executable, os.path.join(ROOT, "tools/dc.py")]
r = subprocess.run([*dc, "spec", "lint", CH, "--spec-dir", FIX_DIR, "--no-report"], capture_output=True, text=True)
check(r.returncode == 0 and "1/1 chapters clean" in r.stdout, f"CLI lint exit 0: {r.stdout[-200:]}")
r = subprocess.run([*dc, "spec", "lint", "CH-00", "--spec-dir", FIX_DIR, "--no-report"], capture_output=True, text=True)
check(r.returncode == 1 and "spec missing" in r.stdout, "CLI lint exit 1 on a missing spec")
r = subprocess.run([*dc, "spec", "lint", "CH-99", "--no-report"], capture_output=True, text=True)
check(r.returncode == 2, "unknown chapter exit 2")
r = subprocess.run([*dc, "spec", "metrics", CH, "--spec-dir", FIX_DIR, "--no-report", "--json"], capture_output=True, text=True)
check(r.returncode == 0 and json.loads(r.stdout)["chapters"][CH]["events_per_min"] >= 20, "CLI metrics --json")
r = subprocess.run([*dc, "spec", "metrics", CH, "--spec-dir", FIX_DIR, "--no-report"], capture_output=True, text=True)
check("ev/min" in r.stdout and "components:" in r.stdout and "KineticWord" in r.stdout, "CLI metrics table")
r = subprocess.run([*dc, "spec", "coverage", "--record", "--by", "scene-director", "--spec-dir", FIX_DIR, "--no-report"],
                   capture_output=True, text=True)
check(r.returncode == 2 and "author" in (r.stderr + r.stdout), "an author cannot record a coverage round")
src = open(os.path.join(ROOT, "tools/dclib/speclint.py"), encoding="utf-8").read()
check("/ 24" not in src and "* 24" not in src and "1000 *" not in src.replace("MS * 1000", ""), "no hand-rolled ms/frame maths (timeutil only)")

print(f"test_speclint: {n} checks ok")
