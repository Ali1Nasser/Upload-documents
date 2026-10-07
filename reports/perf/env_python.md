# P0 Python/system environment report

Host: 4 vCPU, 15.7 GB RAM, no GPU, ~10 GB disk free after models. Python 3.12.3 (system `/usr/bin/python3.12`; uv's python downloads come from blocked github.com). Venv `.venv` via `uv`. Pins: `harness/requirements.lock.txt` (139 packages); versions/model revisions also in `harness/state/budget.json`.

## Key versions
torch 2.14.1+cpu, torchaudio 2.11.0+cpu, faster-whisper 1.2.1 (ctranslate2 4.8.2), av 16.1.0 (must be <17), transformers 5.19.0, numpy 2.5.3, demucs 4.1.0, ctc-forced-aligner 1.0.2 (PyPI; not used, see below). All 33 requested packages installed; zero pip failures.

## apt / ffmpeg
task-spooler (`tsp`), sox, jq, parallel, tesseract-ocr(+ara), fonts-dejavu-core, libraqm0 installed.
- system ffmpeg 6.1.1: libx264, libx265, libsvtav1, libaom-av1, ebur128, loudnorm, sidechaincompress; **no libvmaf**.
- static ffmpeg 7.0.2 (imageio-ffmpeg wheel, johnvansickle): libx264, libx265, libvmaf, ebur128, loudnorm, sidechaincompress; no libsvtav1. Symlinked as `tools/bin/ffmpeg-vmaf` (git-ignored). Use it only for VMAF scoring.

## Models (data/models/, revisions in budget.json "models")
faster-whisper-large-v3 (Systran), faster-whisper-large-v3-turbo (mobiuslabsgmbh), mms-300m-1130-forced-aligner (safetensors only), bge-m3 (pytorch_model.bin + tokenizer, no onnx; loads in sentence-transformers, dim 1024), demucs-htdemucs.

## Blocked / workarounds
- **Demucs**: dl.fbaipublicfiles.com blocked. Using HF safetensors mirror `AEmotionStudio/htdemucs-models` (converted from the official htdemucs checkpoint; strict state-dict load OK; speech clip separates fully into vocals). Weights are NOT hash-verified against upstream. Loader: `harness/lib/demucs_local.py`.
- **ctc-forced-aligner**: PyPI 1.0.2 is a different package (ONNX / torchaudio MMS_FA bundle from blocked host). The MahmoudAshraf variant is GitHub-only. Replacement implemented in `harness/lib/align.py` (HF MMS-300m-1130 + uroman + `torchaudio.functional.forced_align`). Works on Arabic.
- `torchaudio.load` needs torchcodec (absent): use `soundfile`.
- Remotion Chrome: use `/opt/pw-browsers/chromium_headless_shell-1194/` (handled by the Node agent).

## Benchmarks (60 s Arabic clip, 16 kHz mono, cpu_threads=3, int8)
| Stage | RTF (time / audio) | Note |
|---|---|---|
| faster-whisper turbo | 0.87 – 1.05 | 112 words, VAD kept 57.2 s |
| faster-whisper large-v3 | 3.6 – 6.2 | 115 words; model load 45-125 s |
| MMS CTC forced alignment | 0.41 | 112 words, mean word score 0.81, median start diff vs whisper 0.05 s |
| htdemucs separation | 1.56 | 3 threads |

Ranges reflect CPU contention with concurrent Remotion benchmarks (load avg ~3.3 of 4). Planning implication for the 70-min narration (S2): turbo ASR ~ 70-75 min, large-v3 ~ 4+ h (use only on disputed segments), alignment ~ 30 min, full-file Demucs ~ 110 min (separate selectively). Run everything through `tsp`, one heavy job at a time.

## Reproduce
`harness/setup.sh [apt|python|models|verify|all]` (idempotent; log in `reports/perf/setup_last.txt`). Benchmark: `.venv/bin/python harness/lib/bench_asr.py [asr|ctc|demucs]`.
