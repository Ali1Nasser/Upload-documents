#!/usr/bin/env python3
"""Record ffmpeg capabilities, pinned python package versions, model revisions and hardware into budget.json."""
import json, os, re, shutil, subprocess, sys
from importlib import metadata
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import budget_io

ROOT = Path(__file__).resolve().parents[2]
WANT = "torch torchaudio faster-whisper ctranslate2 ctc-forced-aligner uroman silero-vad librosa soundfile pyloudnorm praat-parselmouth sentence-transformers FlagEmbedding faiss-cpu hdbscan networkx rapidfuzz pyarabic pydantic jsonschema beautifulsoup4 lxml numpy pandas pyarrow pillow opencv-python-headless scikit-image pedalboard pytesseract huggingface_hub onnxruntime playwright demucs imageio-ffmpeg static-ffmpeg transformers av safetensors speechbrain torchmetrics camel-tools pesq pystoi".split()
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
# Documented limitations: things the plan asked for that this environment cannot provide as specified.
# Each has a workaround; G0 reports them as documented limitations (never as a silent pass).
LIMITATIONS = [
    dict(id="demucs_official_weights", requirement="Demucs htdemucs weights from dl.fbaipublicfiles.com", blocked_host="dl.fbaipublicfiles.com",
         workaround="HF safetensors mirror AEmotionStudio/htdemucs-models via harness/lib/demucs_local.py", impact="none expected (same weights, converted)"),
    dict(id="torchaudio_mms_fa_bundle", requirement="torchaudio MMS_FA forced-alignment bundle", blocked_host="dl.fbaipublicfiles.com",
         workaround="MahmoudAshraf/mms-300m-1130-forced-aligner (HF) via harness/lib/align.py; PyPI ctc-forced-aligner 1.0.2 is a different package and is not used", impact="none expected"),
    dict(id="system_ffmpeg_libvmaf", requirement="libvmaf in ffmpeg", blocked_host=None,
         workaround="static ffmpeg 7.0.2 from imageio-ffmpeg linked at tools/bin/ffmpeg-vmaf; system ffmpeg 6.1.1 used for everything else", impact="VMAF scoring must call tools/bin/ffmpeg-vmaf"),
    dict(id="remotion_chrome_download", requirement="Remotion downloads its own headless Chrome", blocked_host="storage.googleapis.com",
         workaround="--browser-executable under /opt/pw-browsers/chromium_headless_shell-1194/", impact="none"),
    dict(id="camel_tools_data_partial", requirement="camel-tools data packages", blocked_host=None,
         workaround="only morphology-db-egy-r13 fetched into data/models/camel_data (CAMELTOOLS_DATA); other packs (MSA DB, BERT disambiguators, NER, dialect-ID) not fetched: not needed by the plan", impact="Egyptian morphology only"),
    dict(id="manim_optional", requirement="manim (optional in 03 P0.3)", blocked_host=None, workaround="not installed", impact="none; optional"),
]
budget_io.update(ffmpeg=ff, python_packages=pk, models=models, hardware=hw)
for L in LIMITATIONS: L["what"] = L["requirement"]
# merge by id so limitations recorded by other agents are kept
cur = budget_io.read().get("limitations", []) if hasattr(budget_io, "read") else []
byid = {x.get("id"): x for x in cur if isinstance(x, dict)}
for L in LIMITATIONS: byid[L["id"]] = L
budget_io.update(limitations=list(byid.values()))
print(json.dumps({"ffmpeg": ff, "hardware": hw, "models": list(models)}, indent=1))
