# Moving the workspace to your desktop

The repo (code, specs, decisions, reports, approved components) lives on GitHub. `data/` is git-ignored and was transferred separately, as an **encrypted** tar stream: 8,151 files (7.46 GB) in 72 parts on x0.at (71 × 100 MiB plus one of 31 MB, 7,476,019,232 bytes in all), uploaded 2026-10-17 05:56–06:52 UTC. Each part was re-downloaded and SHA-256 verified after upload; the parts are listed in `data_parts.tsv`.

This repo is public, so the parts are AES-256 ciphertext. The passphrase was given to you in the Claude chat and is not stored in the repo; keep it somewhere safe. (temp.sh refused files over about 4 MiB on 2026-10-17, so x0.at was used. Its 100 MiB files stay online for about 82 days.)

## 1. Machine

- **Recommended:** Ubuntu 22.04 or 24.04, or WSL2 Ubuntu on Windows. `harness/setup.sh` uses apt.
- **macOS works too**, but install the apt packages listed in `harness/setup.sh` with Homebrew instead: ffmpeg, task-spooler, sox, jq, parallel, tesseract with the Arabic language pack, and libraqm. Also install `openssl@3` and put it first on PATH; the built-in LibreSSL may not support `-pbkdf2`.
- **Disk:** at least 60 GB free. Data is about 7 GB, models about 7 GB, and renders plus the final mezzanine need 20–30 GB.
- **CPU and RAM:** more cores shorten the final render (about 23 h on 4 vCPU). 16 GB RAM or more.

## 2. Get the code

```bash
git clone https://github.com/Ali1Nasser/Upload-documents.git
cd Upload-documents
git checkout claude/da-camp-video-plan-qpf3tv
```

## 3. Restore `data/` (the x0.at parts uploaded 2026-10-17 stay online until about 2027-01-07)

```bash
DATA_PASS='<passphrase from the chat>' bash tools/transfer/restore_data.sh
# downloads every part and checks each SHA-256, checks the whole ciphertext, decrypts and checks the tar SHA-256, then extracts data/
# (leave out DATA_PASS=... to be asked for it; start the line with a space so most shells keep it out of history)
```

The script ends by checking `data/derived/audio/master_vo_v1.flac` against the SHA-256 locked in `corpus/edl/lock.json`.

What is **not** in the transfer:

- `data/models` (re-downloaded by `harness/setup.sh models` from Hugging Face).
- `data/renders` (regenerated as needed).
- `data/raw` (the original source zips; their links expired 2026-10-10 and they stay only in the cloud container). Everything derived from them is in `data/extracted`, and their SHA-256s are in `data/raw.sha256`.

## 4. Install the toolchain and models

```bash
bash harness/setup.sh all        # system packages, Python venv, Node/Remotion studio, fonts, models; writes reports/perf/setup_last.txt
python3 tools/dc.py state brief  # should show G0-G6a pass and P7 in progress
```

## 5. Continue with Claude Code

Open Claude Code in the repo folder. Use the Claude Desktop app, or run `claude` (or `claude remote-control`) in a terminal there.

- The session reads `CLAUDE.md` automatically.
- Ask it to continue P7 from `docs/handoffs/` and `python3 tools/dc.py state brief`.
- The P7 status is in `docs/p7/catalog_status/*.md` and the critic reviews in `reports/p7/review_*.md`.
- Components already `approved-critic` (in `studio/test/baselines/<Name>/meta.json`) do not need rebuilding.

Run only one session at a time on this branch, cloud or desktop, so commits do not collide.
