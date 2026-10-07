#!/usr/bin/env bash
# harness/setup.sh -- idempotent environment bootstrap (Python/system side).
# Usage: harness/setup.sh [apt|python|models|verify|all ...]   (default: all)
# Each section skips if already done and prints a report. Other agents extend with node/fonts sections.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
VENV="$ROOT/.venv"
PY_VER="${DC_PY:-3.12}"
REPORT="$ROOT/reports/perf/setup_last.txt"
mkdir -p reports/perf harness/state data/models logs
MISSING=()
say() { printf '%s\n' "$*" | tee -a "$REPORT"; }
miss() { MISSING+=("$1"); say "  MISSING: $1"; }

APT_PKGS=(ffmpeg task-spooler sox jq parallel tesseract-ocr tesseract-ocr-ara fonts-dejavu-core libraqm0)

sec_apt() {
  say "== apt =="
  local need=()
  for p in "${APT_PKGS[@]}"; do dpkg -s "$p" >/dev/null 2>&1 || need+=("$p"); done
  if [ ${#need[@]} -eq 0 ]; then say "  all apt packages present (skip)"; else
    say "  installing: ${need[*]}"
    apt-get update -qq >/dev/null 2>&1 || say "  WARN apt-get update failed (need host: archive.ubuntu.com)"
    apt-get install -y -qq "${need[@]}" >/dev/null 2>&1 || miss "apt: ${need[*]} (host: archive.ubuntu.com)"
  fi
  # tsp binary name: Ubuntu ships 'tsp'; some distros 'ts' (moreutils clash)
  if command -v tsp >/dev/null; then say "  tsp: $(command -v tsp)"
  elif command -v ts >/dev/null && ts -h 2>&1 | grep -qi spool; then say "  tsp missing, 'ts' is task-spooler"; ln -sf "$(command -v ts)" /usr/local/bin/tsp
  else miss "tsp (task-spooler)"; fi
  for b in sox jq parallel tesseract; do command -v $b >/dev/null || miss "binary $b"; done
  tesseract --list-langs 2>/dev/null | grep -qx ara || miss "tesseract ara traineddata"
  say "  -- ffmpeg capabilities --"
  ffmpeg -version 2>/dev/null | head -1 | sed 's/^/  /' | tee -a "$REPORT"
  local enc flt
  enc="$(ffmpeg -hide_banner -encoders 2>/dev/null)"; flt="$(ffmpeg -hide_banner -filters 2>/dev/null)"
  for e in libx264 libx265 libsvtav1; do grep -q " $e " <<<"$enc" && say "  encoder $e: yes" || { say "  encoder $e: NO"; }; done
  for f in libvmaf ebur128 loudnorm sidechaincompress; do grep -q " $f " <<<"$flt" && say "  filter  $f: yes" || { say "  filter  $f: NO"; }; done
  grep -q " libvmaf " <<<"$flt" || say "  NOTE: system ffmpeg has no libvmaf; see 'python' section (static ffmpeg in venv) -> state/budget.json ffmpeg"
}

sec_python() {
  say "== python =="
  command -v uv >/dev/null || { miss "uv (install: pip install uv / host astral.sh)"; return; }
  if [ ! -x "$VENV/bin/python" ]; then
    say "  creating venv (python $PY_VER)"
    uv venv --python "$PY_VER" "$VENV" >>logs/setup_python.log 2>&1 || { miss "uv venv $PY_VER"; return; }
  else say "  venv exists: $("$VENV/bin/python" -V)"; fi
  local PIP=(uv pip install --python "$VENV/bin/python")
  local stamp="$VENV/.packages_done"
  if [ -f "$stamp" ] && [ -z "${FORCE:-}" ]; then say "  packages already installed (skip; FORCE=1 to redo)"; return; fi
  # torch CPU first
  "${PIP[@]}" --index-url https://download.pytorch.org/whl/cpu torch torchaudio >>logs/setup_python.log 2>&1 \
    || { sleep 3; "${PIP[@]}" --index-url https://download.pytorch.org/whl/cpu torch torchaudio >>logs/setup_python.log 2>&1; } \
    || miss "torch/torchaudio (host: download.pytorch.org)"
  # everything else, one by one so a failure is isolated (retry once)
  local pkgs=(faster-whisper ctc-forced-aligner uroman silero-vad librosa soundfile pyloudnorm praat-parselmouth
    sentence-transformers FlagEmbedding faiss-cpu hdbscan networkx rapidfuzz pyarabic pydantic jsonschema
    beautifulsoup4 lxml numpy pandas pyarrow pillow opencv-python-headless scikit-image pedalboard pytesseract
    huggingface_hub onnxruntime playwright demucs imageio-ffmpeg static-ffmpeg "av==16.1.0")  # av>=17 breaks faster-whisper (metadata_errors kw); keep last
  for p in "${pkgs[@]}"; do
    if "${PIP[@]}" "$p" >>logs/setup_python.log 2>&1 || { sleep 2; "${PIP[@]}" "$p" >>logs/setup_python.log 2>&1; }; then say "  ok   $p"
    else miss "pip $p (see logs/setup_python.log)"; fi
  done
  uv pip freeze --python "$VENV/bin/python" > harness/requirements.lock.txt 2>/dev/null
  say "  froze $(wc -l < harness/requirements.lock.txt) pins -> harness/requirements.lock.txt"
  touch "$stamp"
  "$VENV/bin/python" harness/lib/record_env.py >/dev/null && say "  recorded ffmpeg caps / package versions -> harness/state/budget.json"
}

sec_models() {
  say "== models =="
  [ -x "$VENV/bin/python" ] || { miss "models need venv (run python section)"; return; }
  local free; free=$(df -BG --output=avail "$ROOT/data" | tail -1 | tr -dc 0-9)
  say "  free disk: ${free} GB"
  [ "$free" -ge 6 ] || { miss "disk: need >=6 GB free for models"; return; }
  "$VENV/bin/python" harness/lib/fetch_models.py 2>&1 | tee -a logs/setup_models.log | sed 's/^/  /' | tee -a "$REPORT" || miss "some models failed (see logs/setup_models.log; hosts: huggingface.co, us.aws.cdn.hf.co)"
  say "  demucs: official weights host dl.fbaipublicfiles.com is blocked; using HF mirror via harness/lib/demucs_local.py"
  "$VENV/bin/python" harness/lib/record_env.py >/dev/null
}

sec_verify() {
  say "== verify =="
  [ -x "$VENV/bin/python" ] || { miss "no venv"; return; }
  "$VENV/bin/python" - <<'PY' 2>&1 | sed 's/^/  /' | tee -a "$REPORT"
import importlib
for m in ["faster_whisper","torch","torchaudio","ctc_forced_aligner","uroman","silero_vad","librosa","soundfile","pyloudnorm","parselmouth",
          "sentence_transformers","faiss","hdbscan","networkx","rapidfuzz","pyarabic","pydantic","jsonschema","bs4","lxml","numpy","pandas",
          "pyarrow","PIL","cv2","skimage","pedalboard","pytesseract","huggingface_hub","onnxruntime","playwright"]:
    try: importlib.import_module(m); print("import ok  ", m)
    except Exception as e: print("import FAIL", m, type(e).__name__, str(e)[:100])
PY
}

: > "$REPORT"
SECS=("$@"); [ ${#SECS[@]} -eq 0 ] && SECS=(all)
for s in "${SECS[@]}"; do
  case "$s" in
    apt) sec_apt;; python) sec_python;; models) sec_models;; verify) sec_verify;;
    all) sec_apt; sec_python; sec_models; sec_verify;;
    *) echo "unknown section $s"; exit 64;;
  esac
done
say "== summary =="
if [ ${#MISSING[@]} -eq 0 ]; then say "  nothing missing"; else printf '  missing: %s\n' "${MISSING[@]}" | tee -a "$REPORT"; fi
[ ${#MISSING[@]} -eq 0 ]
