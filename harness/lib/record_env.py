#!/usr/bin/env python3
"""Record ffmpeg capabilities, pinned python package versions, model revisions and hardware into budget.json."""
import json, os, re, shutil, subprocess, sys
from importlib import metadata
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import budget_io

ROOT = Path(__file__).resolve().parents[2]
WANT = "torch torchaudio faster-whisper ctranslate2 ctc-forced-aligner uroman silero-vad librosa soundfile pyloudnorm praat-parselmouth sentence-transformers FlagEmbedding faiss-cpu hdbscan networkx rapidfuzz pyarabic pydantic jsonschema beautifulsoup4 lxml numpy pandas pyarrow pillow opencv-python-headless scikit-image pedalboard pytesseract huggingface_hub onnxruntime playwright demucs imageio-ffmpeg static-ffmpeg transformers av safetensors".split()
ENC = ["libx264", "libx265", "libsvtav1", "libaom-av1"]
FLT = ["libvmaf", "ebur128", "loudnorm", "sidechaincompress"]

def caps(exe):
    ver = subprocess.run([exe, "-version"], capture_output=True, text=True).stdout.split("\n")[0]
    enc = subprocess.run([exe, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    flt = subprocess.run([exe, "-hide_banner", "-filters"], capture_output=True, text=True).stdout
    return {"path": str(exe), "version": ver,
            "encoders": {e: (f" {e} " in enc) for e in ENC}, "filters": {f: (f" {f} " in flt) for f in FLT}}

ff = {}
sysff = shutil.which("ffmpeg")
if sysff: ff["system"] = caps(sysff)
try:
    import imageio_ffmpeg
    ff["static_imageio"] = caps(imageio_ffmpeg.get_ffmpeg_exe())
except Exception as e:
    ff["static_imageio"] = {"error": str(e)[:200]}
# vmaf/x265 provider
need = ("libvmaf", "libx265")
best = None
for k in ("system", "static_imageio"):
    c = ff.get(k, {})
    if c.get("filters", {}).get("libvmaf") and c.get("encoders", {}).get("libx265"): best = best or k
ff["vmaf_binary"] = ff.get(best, {}).get("path") if best else None
ff["note"] = "use ffmpeg_vmaf for libvmaf scoring; system ffmpeg for everything else unless it lacks the feature"
bindir = ROOT / "tools" / "bin"; bindir.mkdir(parents=True, exist_ok=True)
if ff["vmaf_binary"] and best != "system":
    link = bindir / "ffmpeg-vmaf"
    if link.is_symlink() or link.exists(): link.unlink()
    link.symlink_to(ff["vmaf_binary"]); ff["vmaf_binary_link"] = str(link.relative_to(ROOT))

pk = {}
for n in WANT:
    try: pk[n] = metadata.version(n)
    except metadata.PackageNotFoundError: pk[n] = None
models = {}
for d in sorted((ROOT / "data" / "models").glob("*")):
    f = d / ".done"
    if f.exists(): models[d.name] = json.loads(f.read_text())
tsp = shutil.which("tsp")
hw = {"nproc": os.cpu_count(), "ts_slots": max(1, os.cpu_count() - 1), "tsp": tsp,
      "ram_gb": round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2**30, 1),
      "disk_free_gb": round(shutil.disk_usage(ROOT).free / 2**30, 1),
      "python": sys.version.split()[0]}
budget_io.update(ffmpeg=ff, python_packages=pk, models=models, hardware=hw)
print(json.dumps({"ffmpeg": ff, "hardware": hw, "models": list(models)}, indent=1))
