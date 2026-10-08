#!/usr/bin/env python3
"""Pre-fetch HF models into data/models/. Idempotent: skips when .done marker exists.
Usage: fetch_models.py [name ...]   (default: all). Writes data/models/<name>/.done + revision."""
import json, os, sys, time
from pathlib import Path
from huggingface_hub import snapshot_download, HfApi

ROOT = Path(__file__).resolve().parents[2]
M = ROOT / "data" / "models"
MODELS = {
    "faster-whisper-large-v3": dict(repos=["Systran/faster-whisper-large-v3"]),
    "faster-whisper-large-v3-turbo": dict(repos=["mobiuslabsgmbh/faster-whisper-large-v3-turbo",
                                                 "deepdml/faster-whisper-large-v3-turbo-ct2"]),
    "mms-300m-1130-forced-aligner": dict(repos=["MahmoudAshraf/mms-300m-1130-forced-aligner"], ignore=["pytorch_model.bin"]),  # safetensors only
    # official dl.fbaipublicfiles.com is blocked; HF safetensors mirror (converted from 955717e8-8726e21a.th)
    "demucs-htdemucs": dict(repos=["AEmotionStudio/htdemucs-models"],
                            allow=["htdemucs.safetensors", "htdemucs_config.json", "LICENSE"]),
    "bge-m3": dict(repos=["BAAI/bge-m3"],
                   allow=["*.json", "pytorch_model.bin", "sentencepiece.bpe.model", "tokenizer.json",
                          "1_Pooling/*", "modules.json", "sentence_bert_config.json", "config_sentence_transformers.json",
                          "colbert_linear.pt", "sparse_linear.pt"],
                   ignore=["onnx/*", "imgs/*", "*.md", "long.jpg"]),
    # speaker embeddings (speechbrain EncoderClassifier.from_hparams(source=<this dir>)); used by P3 diarisation/speaker checks
    # second CTC aligner for the G3 agreement check (Arabic-letter vocabulary, independent of MMS); pytorch_model.bin only (flax duplicate skipped)
    "wav2vec2-xlsr53-arabic": dict(repos=["jonatasgrosman/wav2vec2-large-xlsr-53-arabic"], ignore=["flax_model.msgpack", "*.md", ".gitattributes"]),
    "ecapa-voxceleb": dict(repos=["speechbrain/spkrec-ecapa-voxceleb"], ignore=["*.md", "example*.wav"]),
}

# non-HF data packs: name -> fetcher function (registered below)
def fetch_camel_data(name):
    """CAMeL Tools Egyptian morphology DB (GitHub release asset; reachable through the proxy). Use with
    CAMELTOOLS_DATA=data/models/camel_data."""
    import subprocess, shutil
    dest = M / "camel_data"; done = dest / ".done"
    if done.exists():
        print(f"[skip] {name}", flush=True); return True
    dest.mkdir(parents=True, exist_ok=True)
    exe = Path(sys.executable).parent / "camel_data"
    t = time.time()
    r = subprocess.run([str(exe), "-i", "morphology-db-egy-r13"], env={**os.environ, "CAMELTOOLS_DATA": str(dest)},
                       capture_output=True, text=True)
    ok = r.returncode == 0 and (dest / "data" / "morphology_db" / "calima-egy-r13").exists()
    if ok:
        done.write_text(json.dumps({"package": "morphology-db-egy-r13", "version": "from catalogue.json (camel-tools 1.6.0)",
                                    "seconds": round(time.time() - t, 1)}))
    print(f"[{'ok  ' if ok else 'fail'}] {name}", flush=True)
    return ok

CUSTOM = {"camel-data": fetch_camel_data}


def fetch(name):
    if name in CUSTOM:
        return CUSTOM[name](name)
    spec = MODELS[name]
    dest = M / name
    done = dest / ".done"
    if done.exists():
        print(f"[skip] {name}", flush=True); return True
    for repo in spec["repos"]:
        try:
            print(f"[get ] {name} <- {repo}", flush=True)
            t = time.time()
            kw = {}
            if "allow" in spec: kw["allow_patterns"] = spec["allow"]
            if "ignore" in spec: kw["ignore_patterns"] = spec["ignore"]
            p = snapshot_download(repo, local_dir=str(dest), **kw)
            try: rev = HfApi().model_info(repo).sha
            except Exception: rev = None
            done.write_text(json.dumps({"repo": repo, "revision": rev, "seconds": round(time.time() - t, 1)}))
            print(f"[ok  ] {name} {repo}@{rev} in {time.time()-t:.0f}s", flush=True)
            return True
        except Exception as e:
            print(f"[fail] {repo}: {type(e).__name__}: {str(e)[:200]}", flush=True)
    return False

if __name__ == "__main__":
    names = sys.argv[1:] or (list(MODELS) + list(CUSTOM))
    M.mkdir(parents=True, exist_ok=True)
    res = {n: fetch(n) for n in names}
    print(json.dumps(res))
    sys.exit(0 if all(res.values()) else 1)
