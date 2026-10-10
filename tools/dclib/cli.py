"""argparse tree for tools/dc.py. Subcommands from docs/plan/02 section 9.2 that are not built yet say so clearly."""
import argparse
import sys

from . import common as C

PLANNED = {  # command group -> phase that implements it
    "sound": "P11", "dag": "P0 (later)",
}


def build():
    ap = argparse.ArgumentParser(prog="dc", description="DA Camp film production CLI")
    sub = ap.add_subparsers(dest="group", required=True)

    # state
    st = sub.add_parser("state", help="phase / gates / blockers / next actions").add_subparsers(dest="state_cmd", required=True)
    st.add_parser("brief", help="<=25 line status").set_defaults(fn="state.cmd_brief")
    s = st.add_parser("snapshot", help="persist working state")
    s.add_argument("--reason", default="manual")
    s.set_defaults(fn="state.cmd_snapshot")
    s = st.add_parser("set-phase")
    s.add_argument("phase")
    s.set_defaults(fn="state.cmd_set_phase")
    s = st.add_parser("block")
    s.add_argument("text")
    s.set_defaults(fn="state.cmd_block")
    s = st.add_parser("unblock")
    s.add_argument("n", type=int, help="1-based blocker number")
    s.set_defaults(fn="state.cmd_unblock")
    s = st.add_parser("next", help="append a next action (or --done N / --clear)")
    s.add_argument("text", nargs="?")
    s.add_argument("--done", type=int)
    s.add_argument("--clear", action="store_true")
    s.set_defaults(fn="state.cmd_next")

    # gate
    g = sub.add_parser("gate").add_subparsers(dest="gate_cmd", required=True)
    s = g.add_parser("check", help="the only path to pass")
    s.add_argument("gate")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(fn="gates.cmd_check")

    # time
    t = sub.add_parser("time", help="the only ms<->frame converters").add_subparsers(dest="time_cmd", required=True)
    for name, h in (("ms2frame", "ms -> frame (round half up)"), ("frame2ms", "frame -> ms (round half up)")):
        s = t.add_parser(name, help=h)
        s.add_argument("value", type=int)
        s.add_argument("--fps", type=int, default=30)
        s.set_defaults(fn="timeutil.run")

    # q
    q = sub.add_parser("q", help="task-spooler queue wrapper").add_subparsers(dest="q_cmd", required=True)
    s = q.add_parser("submit")
    s.add_argument("--label", required=True)
    s.add_argument("--mem-gb", type=float, default=1.0)
    s.add_argument("--expected-gb", type=float, default=0.0)
    s.add_argument("--engine", default="")
    s.add_argument("cmd", nargs=argparse.REMAINDER)
    s.set_defaults(fn="queue.cmd_submit")
    s = q.add_parser("wait")
    s.add_argument("id", type=int)
    s.add_argument("--tail", type=int, default=0, help="print last N output lines")
    s.add_argument("--timeout", type=int, default=7200)
    s.set_defaults(fn="queue.cmd_wait")
    q.add_parser("status").set_defaults(fn="queue.cmd_status")

    # ingest
    ing = sub.add_parser("ingest", help="P1 ingest & forensics").add_subparsers(dest="ingest_cmd", required=True)
    for name, h in (("verify", "sha256 of data/raw vs inventory"), ("catalog", "hash + dedupe data/extracted"),
                    ("probe", "ffprobe + decode-error count per unique media file"),
                    ("quarantine", "list sensitive names; assert none on disk"), ("lineage", "version families")):
        s = ing.add_parser(name, help=h)
        s.add_argument("--force", action="store_true", help="ignore the manifest skip check")
        s.add_argument("--inline", action="store_true", help="run here instead of through tsp")
        if name in ("catalog", "probe"):
            s.add_argument("--limit", type=int, help="smoke test on a subset (writes to data/derived/smoke/)")
        if name == "probe":
            s.add_argument("--timeout", type=int, default=3600, help="per-file decode timeout (s)")
        s.set_defaults(fn=f"ingest.cmd_{name}")

    # audio (P3)
    au = sub.add_parser("audio", help="P3 audio truth: decode, QA profile, S2 script identification").add_subparsers(dest="audio_cmd", required=True)
    s = au.add_parser("decode", help="decode every unique audio asset to 16 kHz mono WAV (data/derived/audio/16k)")
    s.add_argument("--ids", nargs="*", help="audio ids (default all 71)")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="audio.cmd_decode")
    s = au.add_parser("qa", help="profile each audio asset -> corpus/audio/assets.json + reports/audio/sources.md")
    s.add_argument("--ids", nargs="*")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.add_argument("--shard", help="k/n (internal: one queue job per shard)")
    s.add_argument("--no-report", action="store_true")
    s.set_defaults(fn="audio.cmd_qa")
    s = au.add_parser("report", help="rebuild assets.json + reports/audio/sources.md from cached per-asset profiles")
    s.set_defaults(fn="audio.cmd_report")
    s = au.add_parser("crosscheck", help="S4 part: MP3 vs the audio stream of its NotebookLM MP4 (waveform correlation)")
    s.add_argument("part", help="e.g. P23")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="audio.cmd_crosscheck")
    s = au.add_parser("voices", help="ECAPA voice identity per asset: which S4 parts share a narrator")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="audio.cmd_voices")
    s = au.add_parser("identify-s2", help="turbo-ASR two 3-min S2 windows and fuzzy-match against candidate scripts")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="s2id.cmd_identify")

    # asr (P3)
    asr = sub.add_parser("asr", help="P3 ASR: transcribe, calibrate, agreement").add_subparsers(dest="asr_cmd", required=True)
    s = asr.add_parser("transcribe", help="faster-whisper transcription -> corpus/transcripts/<audio>.asr.json")
    s.add_argument("audio_id")
    s.add_argument("--model", default="turbo", choices=["turbo", "large-v3"])
    s.add_argument("--threads", type=int, default=2)
    s.add_argument("--start", type=float, default=0.0, help="window start (s)")
    s.add_argument("--dur", type=float, default=0.0, help="window length (s); 0 = to the end")
    s.add_argument("--out", help="output path (default corpus/transcripts/<audio>.asr.json)")
    s.add_argument("--shard", help="k/n: transcribe the k-th of n equal shards into data/derived/asr/ (merge with --merge)")
    s.add_argument("--merge", action="store_true", help="merge shard files into the final asr.json")
    s.add_argument("--prompt", default="glossary", help="'glossary' | 'none' | literal text")
    s.add_argument("--beam", type=int, default=5, help="beam size (1 = greedy)")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="asr.cmd_transcribe")
    s = asr.add_parser("submit-s4", help="queue one transcription job per S4 part (28 audio assets incl. P00b)")
    s.add_argument("--model", default="turbo")
    s.add_argument("--threads", type=int, default=1)
    s.add_argument("--force", action="store_true")
    s.set_defaults(fn="asr.cmd_submit_s4")
    s = asr.add_parser("calibrate", help="P3.4: CER/WER of turbo vs large-v3 on 10 min of S1 -> reports/asr/calibration.md")
    s.add_argument("--prepare", action="store_true", help="queue the large-v3 clip jobs")
    s.add_argument("--variant", default="large-v3", help="calibration variant label: large-v3 (beam 5) | large-v3-b1 (greedy) | turbo-b1 ...")
    s.add_argument("--report", action="store_true", help="score available outputs and write the report")
    s.set_defaults(fn="asr.cmd_calibrate")
    s = asr.add_parser("agreement", help="S1 aligner vs whisper word timing -> reports/asr/s1_agreement.md; --second w2v: MMS vs the wav2vec2 aligner (G3 check)")
    s.add_argument("--second", choices=["w2v"], help="compare the MMS words with the second CTC aligner (dc align second) -> reports/asr/s1_agreement_w2v.md")
    s.add_argument("--audio-id", default="a:S1:ar-natural")
    s.set_defaults(fn="asr.cmd_agreement")
    s = asr.add_parser("pack", help="P3.7: polish packs data/derived/polish/<audio>.pack.json (a:S4:Pnn | s4 = all parts | s1 = six gloss batches)")
    s.add_argument("audio_id")
    s.set_defaults(fn="polish.cmd_pack")
    s = asr.add_parser("polish-apply", help="P3.7: apply <audio>.out.json edits, force-align the polished text (queue), write words.jsonl + align.json + polish log")
    s.add_argument("audio_id", help="a:S4:Pnn | all (every S4 part that has an out.json)")
    s.add_argument("--out", help="out.json path (default data/derived/polish/<audio>.out.json)")
    s.add_argument("--dest", help="write results here instead of corpus/transcripts (tests)")
    s.add_argument("--threads", type=int, default=2)
    s.add_argument("--no-align", action="store_true", help="skip forced alignment (keep whisper times); tests only")
    s.add_argument("--warm", action="store_true", help="only cache the MMS emissions of the given parts (comma list or 'all'); no out.json needed")
    s.add_argument("--jobs", type=int, default=3, help="--warm: number of queue jobs")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="polish.cmd_polish_apply")
    s = asr.add_parser("sentences", help="P3.8: corpus/sentences/<audio>.jsonl from the applied polish output (S4) or the S1 gloss batches (a:S1:ar-natural | s1)")
    s.add_argument("audio_id", help="a:S4:Pnn | all | s1")
    s.add_argument("--src", help="directory with words.jsonl / polish.json (tests)")
    s.add_argument("--dest", help="output directory (default corpus/sentences)")
    s.set_defaults(fn="polish.cmd_sentences")
    s = asr.add_parser("emphasis", help="P3.9: prominence z-score (RMS + pitch range + duration) + lexical priority -> words.prominence, sentences.impact_words (queue)")
    s.add_argument("audio_id", help="a:S4:Pnn | a:S1:ar-natural | all")
    s.add_argument("--src", help="directory with words.jsonl (tests)")
    s.add_argument("--sent-src", help="directory with the sentences jsonl (tests)")
    s.add_argument("--inline", action="store_true")
    s.set_defaults(fn="polish.cmd_emphasis")

    # align (P3)
    al = sub.add_parser("align", help="P3 forced alignment").add_subparsers(dest="align_cmd", required=True)
    s = al.add_parser("scripted", help="align the script text of a scripted source: S1 (per chapter), S2, S5 (chapter windows), S3 (clips: a:S3:CH-nn_k | all-s3)")
    s.add_argument("audio_id", help="a:S1:ar-natural | a:S2:ar-esraa | a:S5:en-natural | a:S3:CH-00_0 | all-s3")
    s.add_argument("--force", action="store_true")
    s.add_argument("--inline", action="store_true")
    s.add_argument("--emissions-only", action="store_true")
    s.add_argument("--threads", type=int, default=3, help="torch threads (S2/S3/S5)")
    s.add_argument("--tol", type=float, default=3.0, help="seconds a word may lie outside its nominal chapter window before it is counted (S2/S5)")
    s.add_argument("--only", nargs="*", help="S3: restrict to these clip ids (internal)")
    s.add_argument("--jobs", type=int, default=2, help="S3: number of queue jobs")
    s.add_argument("--joint", action="store_true", help="S3: align the --only clips jointly (ordered parts of one chapter whose audio split differs from the text split)")
    s.set_defaults(fn="align.cmd_scripted")
    s = al.add_parser("second", help="second CTC aligner (S1/S3: wav2vec2-xlsr53-arabic; S5: wav2vec2-base-960h): align the same script text -> corpus/transcripts/a_S1_ar-natural.w2v.words.jsonl")
    s.add_argument("audio_id", help="a:S1:ar-natural | a:S5:en-natural | all-s3 | a:S3:CH-nn_k")
    s.add_argument("--threads", type=int, default=3)
    s.add_argument("--inline", action="store_true")
    s.add_argument("--emissions-only", action="store_true")
    s.add_argument("--also", nargs="*", help="S3: more clip ids to align in the same job (internal)")
    s.set_defaults(fn="align2.cmd_second")
    s = al.add_parser("crosscheck", help="G3 cross-checks: S1 windows, S1 in cue windows, S5 vs cues, S3 vs SRTs, MMS vs w2v -> reports/asr/crosschecks.json/.md")
    s.set_defaults(fn="crosscheck.cmd_crosscheck")
    s = al.add_parser("check", help="containment / VAD coverage / per-chapter table -> reports/audio/s1_alignment.md")
    s.add_argument("audio_id", help="a:S1:ar-natural")
    s.set_defaults(fn="align.cmd_check")

    # corpus (P2): group and subcommands live in corpus_cli.py
    from . import corpus_cli
    corpus_cli.register(sub)

    # visual (P2.7): group and subcommands live in visual.py
    from . import visual
    visual.register(sub)

    # graph (P4): group and subcommands live in graph.py
    from . import graph
    graph.register(sub)

    # story (P5): group and subcommands live in story.py
    from . import story
    story.register(sub)

    # deliver: `fyi` from P5 (FYI checkpoints); film delivery subcommands in P14
    from . import deliver
    deliver.register(sub)

    # qa (P7/P9): `qa arabic` is implemented (tools/dclib/qa_arabic.py); chapter/film/sync are P9 stubs
    from . import qa_arabic
    qa_arabic.register(sub)

    # spec (P8): lint / metrics / coverage live in speclint.py
    from . import speclint
    speclint.register(sub)

    # render (P7): snap / perf / spec / at11 live in render.py (P9/P12 preview|final|status|strip extend it)
    from . import render
    render.register(sub)

    # planned groups
    for grp, phase in PLANNED.items():
        s = sub.add_parser(grp, help=f"not implemented yet ({phase})")
        s.add_argument("rest", nargs=argparse.REMAINDER)
        s.set_defaults(fn="planned", planned_group=grp, planned_phase=phase)
    return ap


def main(argv):
    ap = build()
    args = ap.parse_args(argv)
    if args.fn == "planned":
        print(f"dc {args.planned_group}: not implemented yet (owner phase {args.planned_phase}; see docs/plan/02 section 9.2)",
              file=sys.stderr)
        return 3
    mod, fn = args.fn.split(".")
    import importlib
    m = importlib.import_module(f"dclib.{mod}")
    rc = getattr(m, fn)(args)
    return rc or 0
