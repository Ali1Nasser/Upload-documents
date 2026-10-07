#!/usr/bin/env bash
# harness/setup.sh -- idempotent environment bootstrap (system, Python, Node studio, fonts, models).
# Usage: harness/setup.sh [apt|python|node|fonts|models|verify|all ...]   (default: all)
# Each section skips if already done and prints a report (reports/perf/setup_last.txt). FORCE=1 redoes installs.
# A full run writes reports/perf/setup_last.txt (read by gate G0); partial runs write setup_partial.txt so they never overwrite it.
# DC_STUDIO=<dir> points the node/fonts sections at another copy of studio/ (used to prove a from-scratch install).
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
    speechbrain "torchmetrics[audio]" camel-tools
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

STUDIO="${DC_STUDIO:-$ROOT/studio}"

sec_node() {
  say "== node =="
  if ! command -v node >/dev/null || ! command -v npm >/dev/null; then miss "node 22 + npm (apt nodejs, or host: deb.nodesource.com / nodejs.org)"; return; fi
  local major; major="$(node -p 'process.versions.node.split(".")[0]')"
  say "  node $(node -v), npm $(npm -v)"
  [ "$major" -ge 22 ] || { miss "node >= 22 required (found $(node -v))"; return; }
  [ -f "$STUDIO/package-lock.json" ] || { miss "studio/package-lock.json (lockfile is committed; restore it with git)"; return; }
  local want have stamp="$STUDIO/node_modules/.dc_lock_sha256"
  want="$(sha256sum "$STUDIO/package-lock.json" | cut -d' ' -f1)"; have="$(cat "$stamp" 2>/dev/null || true)"
  if [ -x "$STUDIO/node_modules/.bin/remotion" ] && [ "$want" = "$have" ] && [ -z "${FORCE:-}" ]; then
    say "  studio deps already installed for this package-lock.json (skip; FORCE=1 to redo)"
  else
    say "  npm ci in studio/ (registry.npmjs.org) ..."
    if (cd "$STUDIO" && npm ci --no-audit --no-fund >>"$ROOT/logs/setup_node.log" 2>&1) \
       || { sleep 3; (cd "$STUDIO" && npm ci --no-audit --no-fund >>"$ROOT/logs/setup_node.log" 2>&1); }; then
      printf '%s\n' "$want" > "$stamp"; say "  npm ci ok"
    else miss "npm ci in studio/ (see logs/setup_node.log; host: registry.npmjs.org)"; return; fi
  fi
  # installed versions must equal the exact pins in package.json (and therefore the lockfile)
  DC_STUDIO="$STUDIO" python3 harness/lib/record_studio.py 2>&1 | grep -E 'PIN MISMATCH|"node"|"pins_match"|"browser_present"' | sed 's/^/  /' | tee -a "$REPORT"
  DC_STUDIO="$STUDIO" python3 harness/lib/record_studio.py >/dev/null 2>&1 || miss "studio package versions differ from pins (run FORCE=1 harness/setup.sh node)"
  # browser: Remotion cannot fetch its own Chrome here, the config points at the preinstalled headless shell
  local br; br="$(sed -n "s/.*HEADLESS_SHELL *= *'\([^']*\)'.*/\1/p" "$STUDIO/remotion.config.ts" 2>/dev/null | head -1)"
  if [ -n "$br" ] && [ -x "$br" ]; then
    say "  browser: $br (preinstalled; LIMITATION remotion_chrome_download: storage.googleapis.com unreachable, documented in budget.json limitations)"
  else
    miss "browser for Remotion: ${br:-<unset in remotion.config.ts>} not executable. Allow host storage.googleapis.com (Remotion Chrome) or install Playwright chromium_headless_shell under /opt/pw-browsers/"
  fi
  # type-check the studio sources against the installed packages
  if (cd "$STUDIO" && ./node_modules/.bin/tsc --noEmit >>"$ROOT/logs/setup_node.log" 2>&1); then say "  tsc --noEmit: ok"
  else miss "studio typecheck failed (see logs/setup_node.log)"; fi
  if [ -n "${DEEP:-}" ]; then
    (cd "$STUDIO" && timeout 180 ./node_modules/.bin/remotion compositions src/index.ts 2>&1 | tail -n 12) | sed 's/^/  /' | tee -a "$REPORT"
  fi
}

sec_fonts() {
  say "== fonts =="
  local F="$STUDIO/public/fonts"; mkdir -p "$F"
  # merged PlexAR-*/Mono-* come from the source archive when present (they are also committed in git)
  local A="$ROOT/data/extracted/DA_Camp_Videos_Files.zip.d/DA Camp Videos Files/LMArena/Folder 3/film/fonts/final"
  if [ -d "$A" ]; then
    for f in PlexAR-400 PlexAR-500 PlexAR-600 PlexAR-700 Mono-400 Mono-500 Mono-600 Mono-700; do
      [ -s "$F/$f.ttf" ] || { [ -f "$A/$f.ttf" ] && cp "$A/$f.ttf" "$F/$f.ttf" && say "  copied $f.ttf from archive"; }
    done
  fi
  # Google Fonts (OFL) candidates; fetch_fonts.sh skips files that already exist
  local fo rc=0; fo="$(bash "$STUDIO/fetch_fonts.sh" 2>&1)" || rc=$?
  printf '%s\n' "$fo" | grep '^fetched' | sed 's/^/  /' | tee -a "$REPORT"
  printf '%s\n' "$fo" | grep -q '^fetched' || say "  google fonts already present (skip)"
  [ "$rc" -eq 0 ] || { miss "google fonts download failed (host: raw.githubusercontent.com): $(printf '%s' "$fo" | tail -1)"; }
  local py=python3; [ -x "$VENV/bin/python" ] && py="$VENV/bin/python"
  local fc; fc="$("$py" "$ROOT/harness/lib/check_fonts.py" "$F")" && say "  $fc" \
    || { say "  $fc"; miss "fonts incomplete or unparsable in $F (if PlexAR/Mono missing: restore from git or extract the DA_Camp_Videos_Files archive, P1)"; }
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
          "pyarrow","PIL","cv2","skimage","pedalboard","pytesseract","huggingface_hub","onnxruntime","playwright","speechbrain","torchmetrics","camel_tools"]:
    try: importlib.import_module(m); print("import ok  ", m)
    except Exception as e: print("import FAIL", m, type(e).__name__, str(e)[:100])
PY
}

SECS=("$@"); [ ${#SECS[@]} -eq 0 ] && SECS=(all)
case " ${SECS[*]} " in *" all "*) ;; *) REPORT="$ROOT/reports/perf/setup_partial.txt";; esac
: > "$REPORT"
for s in "${SECS[@]}"; do
  case "$s" in
    apt) sec_apt;; python) sec_python;; node) sec_node;; fonts) sec_fonts;; models) sec_models;; verify) sec_verify;;
    all) sec_apt; sec_python; sec_node; sec_fonts; sec_models; sec_verify;;
    *) echo "unknown section $s"; exit 64;;
  esac
done
say "== summary =="
if [ ${#MISSING[@]} -eq 0 ]; then say "  nothing missing"; else printf '  missing: %s\n' "${MISSING[@]}" | tee -a "$REPORT"; fi
[ ${#MISSING[@]} -eq 0 ]
