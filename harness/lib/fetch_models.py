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
}

def fetch(name):
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
    names = sys.argv[1:] or list(MODELS)
    M.mkdir(parents=True, exist_ok=True)
    res = {n: fetch(n) for n in names}
    print(json.dumps(res))
    sys.exit(0 if all(res.values()) else 1)
