# Transfer verification — security and privacy lens

- Verifier: independent security/privacy check (did not build the transfer). Date: 2026-10-17 (UTC).
- Subject: encrypted `data/` transfer, branch `claude/da-camp-video-plan-qpf3tv` at `684da42` (local HEAD = origin, 0 ahead / 0 behind).
- Inputs: `docs/transfer/data_parts.tsv`, `docs/transfer/data_stream.sha256`, `docs/transfer/data_plain.sha256`, `docs/transfer/README.md`, `tools/transfer/restore_data.sh`, the packer's file list (8,151 entries) and logs in the session scratchpad.
- Passphrase handling during this check: used only as `-pass file:` and `grep -F -c/-l -f` (counts or paths, never values). It is not reproduced anywhere in this report.

## Verdict: PASS with findings (2 minor, 4 info)

The transfer contains no real secrets. The passphrase appears nowhere it should not: every count was 0. Every committed public artifact is either ciphertext metadata (part names, sizes, SHA-256 values, x0.at URLs) or a file name that was already public. The findings are about hardening the restore instructions. Nothing leaked.

| # | Check | Result | Key numbers |
|---|---|---|---|
| a | Secret-like file names | PASS | 0 of 8,151 in the file list. 0 among the 8,151 members of the actual decrypted stream. |
| b | Secret-like content | PASS | 7,461,471,780 B scanned with 14 patterns, plus 704,025,010 B decompressed. 0 real secrets; 3 groups of hits were all false positives. |
| c | Passphrase leakage and file hygiene | PASS | 0 in git (all refs and objects), the working tree, logs, the scratchpad, 3,696 transcript files, /tmp and /proc. The file is mode 600, holds 40 chars of [A-Za-z0-9] and sits outside the repo. |
| d | Public repo hygiene | PASS | 0 `data/` paths (tree and full history), 0 model files, largest media file 1.05 MB. The 4 blobs over 5 MB are all JSONL text. |
| e | Manifest | PASS | 72 rows with 4 columns. Hosts: x0.at only, every ID 24 chars. 0 temp.sh. 0 inner file names. |
| f | Crypto parameters | PASS | AES-256-CBC, PBKDF2-SHA256 at 600k iterations, salted. Part 000 begins with `Salted__`. The SHA-256 chain makes up for the missing MAC. |
| g | Restore guide | PASS (2 minor) | The guide never tells you to commit the passphrase and does give shell-history advice. That advice is incomplete for macOS zsh, and the script exports the passphrase to every child process. |

## a. Secret-like file names

- The file list (`xfer/out/filelist.txt`) has 8,151 lines: 2,504 under `data/derived`, 5,645 under `data/extracted`, 1 under `data/delivery`, plus `data/raw.sha256`. Lines outside those roots: 0. All entries are regular files: 0 symlinks, 0 directories, 0 missing on disk.
- Patterns checked case-insensitively: `.ssh/`, `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`, `known_hosts`, `authorized_keys`, `.env`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `.netrc`, `.git-credentials`, `.npmrc`, `.pypirc`, `.aws/`, `credentials*`, `cookies`, `Login Data`, `keychain`, `*.kdbx`, `.htpasswd`, `.gnupg`, `.docker/config`, `.kube`. Broad words were added too: `secret`, `token`, `passw`, `private`. **Hits: 0.**
- The member listing of the actual stream comes from the separate integrity verifier's full download and decrypt of all 72 parts. I re-ran the name analysis on it: 8,151 members, all `file`, all pax, mode 0644. The name set equals the file list exactly (0 extra, 0 missing). Secret-like names: 0. Names containing `quarantine`: 0. Absolute or `..` paths: 0. Links: 0.
- `data/quarantine/` is not in the transfer. The guard hook blocks reading it, and it was not opened.
- Five files under `data/derived/audio/ecapa_cache/` (SpeechBrain checkpoints) are on disk but not in the transfer. They were created after packing and can be regenerated. They raise no security issue.

## b. Secret-like content

All 8,151 tar members are byte-identical to the local files scanned here: 8,151/8,151 EQUAL in the integrity verifier's `local.tsv`. The local scan therefore covers the real transfer content.

**Pass 1:** ripgrep in text mode (`-a`) over all 8,151 files. `--stats` reported 8,151 files searched and 7,461,471,780 bytes searched.

| Pattern | Files | Matches | Judgement |
|---|---|---|---|
| `-----BEGIN (RSA\|OPENSSH\|EC\|DSA\|PGP\|ENCRYPTED)? ?PRIVATE KEY` | 0 | 0 | — |
| `ghp_/gho_/ghs_/ghu_/ghr_` + 36, `github_pat_` (strict) | 0 | 0 | — |
| same prefixes, loose (prefix only) | 8 | 8 | **False positive.** All 8 sit in MP4 video bitstreams; the enclosing token run is 4–5 bytes of binary noise. |
| `sk-ant-` (loose and strict) | 0 | 0 | — |
| `AKIA[0-9A-Z]{16}` | 0 | 0 | — |
| `xox[abprs]-` (loose and strict) | 0 | 0 | — |
| `AIza[0-9A-Za-z_-]{35}` | 38 | 75 | **False positive.** 1 distinct value. 0 standalone matches: all 75 sit inside the same 1,147,420-char `"gzip_b64"` / `"gz"` base64 payload, which is duplicated in 37 HTML labs and 1 KNOWLEDGE.md. Masked context: `<run40><GOOGLE_API len=39><run40>`, i.e. long base64 on both sides with no delimiter. |
| `-----BEGIN CERTIFICATE` (info) | 0 | 0 | — |
| Extras: `hf_`+34, OpenAI `sk-…T3BlbkFJ…` / `sk-proj-`, Stripe `sk_live_`/`rk_live_`, SSH public keys | 0 | 0 | — |

**Pass 2:** a deep scan, in memory, with nothing executed or written. It covered 71 containers: 3 × `DA_Camp_KNOWLEDGE.md.gz`, 30 × `.whl` (public PyPI wheels: beautifulsoup4, markdownify, six, soupsieve, typing_extensions), and the 38 files with embedded base64 gzip blobs. That came to 1,059 layers and 704,025,010 decompressed bytes, with 732 blobs decoded and 0 undecodable. Hits: the same embedded `AIza` false positive (4 × 3 copies of the gunzipped KNOWLEDGE.md). Secret-like member names inside the wheels: 0.

**Pass 3:** a generic `api_key|secret_key|access_token|auth_token|password|passwd|bearer = <20+ chars>` scan over 5,817 text files. It found 76 matches in 73 files, all 1 distinct value: a 22-char lowercase/underscore placeholder (it contains a placeholder word) in a commented Airflow sample config. **Not a secret.**

The passphrase appears in 0 of the 8,151 transfer files.

## c. Passphrase leakage (counts only)

Sanity: `grep -F -c -f <passfile> <passfile>` = 1, so the matcher works. The file is 1 line with no blank line, so `-f` holds exactly one pattern.

| Location | Scanned | Matches |
|---|---|---|
| `git log -p --all --full-history` (453 commits; local refs: branch + origin branch) | full patch text | 0 |
| Commit messages, all refs | — | 0 |
| Every object in the object database (`git cat-file --batch-all-objects --batch`) | 8,963 loose objects, 0 packs | 0 |
| Reflog (`git reflog --all -p`); stash | stash entries: 0 | 0 |
| Remote `main` (via GitHub API) | 1 blob (`README.md`, 19 B) | — (no transfer content) |
| Tracked files (`git ls-files`) | 2,152 | 0 |
| Untracked, not ignored | 0 files | 0 |
| `harness/state/`, `logs/`, `reports/`, `docs/`, `.claude/`, `tools/`, `corpus/`, `studio/`, `harness/` | 11 / 11 / 609 / 61 / 23 / 169 / 717 / 862 / 213 files | 0 each |
| Whole repo except `data/` and `node_modules` (includes ignored files and `.venv`); `.git/` raw | — | 0 / 0 |
| Packer logs: `xfer/out/` (log.txt, err.log, parts.tsv, sha files), `out_failed_*` ×4, `smoke/`, `probe/`, `pack_upload.sh`, `upload_one.sh` | — | 0 |
| Whole session directory (scratchpad + task outputs), excluding `xfer/secret/` | 2,358 files | 0 |
| Claude transcripts, `/root/.claude/projects/-home-user-Upload-documents/` | 3,696 files (1,222 `*.jsonl`, 1.26 GB at the first pass) | 0 |
| Rest of `/root/.claude` | — | 0 |
| `/tmp/ts-out.*` (task-spooler job outputs) | 1,656 | 0 |
| `/tmp` top-level files < 20 MB | 1,895 | 0 |
| Shell histories (`.bash_history`, `.zsh_history`, `.python_history`, `.lesshst`, `.viminfo`) | — | 0 |
| `/proc/*/cmdline`, `/proc/*/environ` (readable ones) | — | 0 / 0 |
| Inside the 8,151 transferred files | — | 0 |

The passphrase file:

- Mode `600`, owner root, 41 bytes: 40 chars of `[A-Za-z0-9]` (17 upper, 15 lower, 8 digits) plus one newline. Other chars: 0.
- The parent `secret/` directory is mode `700`.
- `realpath` is outside `/home/user/Upload-documents`.
- Strength: about 40 × log2(62) ≈ 238 bits.

## d. Public repo hygiene

- The repo is public (`private=false`). Remote refs: `main` (1 file, `README.md`) and this branch. There are no tags.
- `git ls-tree -r origin/claude/da-camp-video-plan-qpf3tv`: 2,152 blobs, 149,499,883 B in total. `data/` paths: **0** in the tree and **0** across every object in history.
- Model-like files (`.ckpt .pt .pth .bin .onnx .safetensors .gguf .h5 .tflite .pb .pkl .npy .npz`): **0**.
- Media in the tree:
  - 221 `.jpg` (largest 1,046,676 B)
  - 1 `.png` (`reports/perf/bench2d_still.png`, 1,051,539 B)
  - 22 `.ttf` fonts (largest 599,548 B)
  - No video or audio files.
- 10 largest blobs:

| Bytes | Path |
|---|---|
| 36,433,716 | corpus/text/chunks.jsonl |
| 7,661,720 | corpus/edl/word_map.v1.1.jsonl |
| 7,650,380 | corpus/edl/word_map.v1.jsonl |
| 5,685,544 | corpus/graph/edges.jsonl |
| 3,307,071 | corpus/graph/nodes.jsonl |
| 3,117,734 | corpus/canon/hub_items.jsonl |
| 2,458,305 | corpus/transcripts/a_S5_en-natural.words.jsonl |
| 2,250,756 | corpus/transcripts/a_S1_ar-natural.words.jsonl |
| 1,918,216 | corpus/transcripts/a_S2_ar-esraa.words.jsonl |
| 1,883,099 | corpus/visual/assets.jsonl |

- Blobs over 5 MB: 4, all JSONL text and none of them media. In all of history, the largest blobs are earlier versions of the same JSONL files.
- Secret-like names in the tree or in history: 0.
- Same 14-pattern content scan over the tracked files: **0 hits**.
- Generic `password=` hits: 2 files (`corpus/text/chunks.jsonl`, `corpus/canon/hub_items.jsonl`), the same Airflow placeholder as in b.
- Webmail addresses (gmail, hotmail, yahoo, outlook, icloud, live, proton): 0. The 68 distinct email-like strings are sample addresses (`email.com`, `example.com`, …) or code tokens.

## e. Manifest (`docs/transfer/data_parts.tsv`)

- 72 rows, each with exactly 4 tab-separated columns.
- Names: `data_part_000` … `data_part_071`, contiguous and in order.
- Sizes: 71 × 104,857,600 plus 1 × 31,129,632, for 7,476,019,232 B in total.
- 72 distinct lowercase-hex SHA-256 values. 72 distinct URLs, all matching `^https://x0\.at/[A-Za-z0-9]{24}$`, so each ID is 24 chars (62^24 ≈ 2^143).
- Hosts: `x0.at` only. `temp.sh`: 0. Other hosts: 0.
- Strings containing `data/`: 0. Basenames (≥ 6 chars) from the inner file list found in the manifest: 0.
- The manifest is byte-identical to the uploader's `xfer/out/parts.tsv`. `data_stream.sha256` and `data_plain.sha256` are byte-identical to the uploader's `stream.sha256` and `plain.sha256`.

## f. Crypto parameters

- Packer: `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt -pass file:…`. Restore uses `CIPHER=(-aes-256-cbc -pbkdf2 -iter 600000 -md sha256)` and decrypts with `-d`; the salt is read from the header. The two sets of parameters match. PBKDF2-HMAC-SHA256 at 600k iterations meets the current OWASP figure, and the passphrase is about 238 bits.
- **Header check (done):** `curl -r 0-15` on part 000 returned HTTP 206, `content-range: bytes 0-15/104857600`, `application/octet-stream`. The first 8 bytes are `Salted__`, followed by the 8-byte salt (not shown here).
- The ciphertext length is consistent with CBC: 7,476,019,232 = 16 (header) + 16 × 467,251,201.
- **Key check (done):** I took a 65,552 B range of part 000, decrypted it with `-nopad -pass file:`, and got 65,536 B with `ustar` magic at offset 257. The first member is `data/delivery/fyi/radio_edit_sample.m4a`, which is line 1 of the file list. The scratch bytes were deleted.
- **Full stream (the integrity verifier's queued job, corroborating):**
  - ciphertext SHA-256 = `4d6291e2…48a7` and plaintext SHA-256 = `a3419db9…7e7b`, both equal to the committed values;
  - 72/72 parts OK;
  - the tar ends cleanly, with 0 trailing non-zero bytes.
- **No authentication:** `openssl enc` CBC has no MAC, so the ciphertext is malleable and a bad passphrase only shows as "bad decrypt" or garbage. **The committed SHA-256 chain makes up for this:**
  1. per-part SHA-256 values (72) and the whole-ciphertext SHA-256 are checked *before* decryption;
  2. the plaintext tar SHA-256 is checked in a first decrypt pass *before* anything is extracted;
  3. extraction happens in a second pass.

  A host-side change of even one bit (x0.at, or a man in the middle on the download) fails step 1 or 2, and nothing gets extracted. The trust anchor is the git clone from GitHub over HTTPS, pinned to commit `684da42`. With that anchor in place, the scheme has the integrity properties of an AEAD (authenticated encryption) for this use. What it does not cover: an attacker with write access to the repo could change the manifest *and* the script. That is the same trust you already place in any code you run from the repo.

## g. Restore guide and script

- They never say to put the passphrase in a committed file. README: "not stored in the repo; keep it somewhere safe". `.gitignore` covers `data/`, `.env` and `.transfer_parts/`, the script's work directory inside the repo.
- Shell-history advice is present: README line 27 says "start the line with a space so most shells keep it out of history", and also says to leave out `DATA_PASS=` to be prompted.
- The interactive prompt is silent (`read -rsp`). openssl receives the passphrase through `-pass env:DATA_PASS`, never through argv, so it does not show in `ps`.
- Ciphertext parts are deleted after a verified extract unless `KEEP_PARTS=1`.
- GNU tar refuses `..` and absolute paths by default. The stream holds 0 such paths and 0 links, and its plaintext SHA is verified before extraction.

## Findings

1. **minor: shell-history advice does not cover macOS zsh** (`docs/transfer/README.md` line 25–27, `tools/transfer/restore_data.sh` line 3).
   - Problem: the primary instruction is `DATA_PASS='<passphrase>' bash tools/transfer/restore_data.sh`. A leading space keeps a line out of history only when bash has `HISTCONTROL=ignorespace|ignoreboth`, which Ubuntu/WSL `~/.bashrc` sets, or when zsh has `setopt HIST_IGNORE_SPACE`, which **macOS's default zsh does not set**. The README presents macOS as supported, so a macOS user following the main line will save the passphrase in `~/.zsh_history`.
   - Fix: make the prompt the primary form (`bash tools/transfer/restore_data.sh`, which asks with `read -rsp`), and show the env form only as an alternative with "macOS zsh: run `setopt HIST_IGNORE_SPACE` first". Optionally also accept `DATA_PASS_FILE=<mode-600 file outside the repo>` and pass it as `-pass file:`.
2. **minor: the restore script exports the passphrase to every child process** (`tools/transfer/restore_data.sh` line 21).
   - Problem: `export DATA_PASS` puts it in the environment of `curl`, `cat`, `sha256sum`, `tar` and `python3`, readable through `/proc/<pid>/environ` by the same user for the whole run. Only `openssl` needs it.
   - Fix: drop the global export and pass it only to openssl, e.g. `DATA_PASS="$DATA_PASS" openssl enc -d … -pass env:DATA_PASS` with an unexported variable, or `-pass fd:3 3<<<"$DATA_PASS"`. Add `unset DATA_PASS` after the second decrypt.
3. **info: integrity depends on the git-pinned SHA chain.**
   - Problem: openssl enc has no MAC (see f). The SHA chain compensates, but only if the manifest really comes from the expected commit.
   - Fix: put the commit id `684da42` and the ciphertext SHA-256 prefix `4d6291e2` in the hand-off message, next to the passphrase, so the desktop user can check `git rev-parse HEAD` out of band. Do not change the scheme itself.
4. **info: earlier side uploads are public but contain nothing new.**
   - Problem: a 2026-10-16 smoke test uploaded `data/raw.sha256` (496 B, plaintext: 6 archive SHA-256 values and archive names) to temp.sh. On 2026-10-17 it still returned HTTP 200 (URL is in `xfer/smoke/parts.tsv`). All 6 hashes are already public in `docs/plan/inventory` (6/6). Separately, a 100 MiB probe on x0.at with a short 4-char ID (`xfer/probe/resp.txt`) is random or ciphertext-like. Three samples of 256 KiB were incompressible under gzip -9, about 37% printable (random ≈ 37%), with 0 `ustar` and 0 `data/` strings. Neither URL appears in git history (0 hits).
   - Fix: none needed. Both expire on the hosts' own schedule.
5. **info: the x0.at parts cannot be revoked early.**
   - Problem: the uploader kept no management or deletion token, and x0.at returned none in the probe headers. The 72 parts stay downloadable by anyone with the public manifest until they expire (README: about 82 days). Confidentiality rests entirely on the passphrase, which is about 238 bits and so adequate.
   - Fix: none required. If the passphrase is ever exposed, treat the data as public until the parts expire.
6. **info: the passphrase's planned channel is the Claude chat** (README line 5).
   - Problem: today it appears 0 times in the transcripts. Once it is posted, it will live in the session transcript (claude.ai, plus `/root/.claude/projects/…jsonl` in this container), and the session link appears in the public commit trailers (`Claude-Session:`). Viewing that link still requires the owner's login.
   - Fix: keep the session private (do not share it). After restoring, store the passphrase in a password manager and not in the repo or a dotfile.

## Scratch hygiene

The scripts are in the verifier scratch directory under `verify/sec/`. Downloaded or decrypted samples (at most 768 KiB at a time) were deleted right after use. No part file was stored, and nothing under `data/`, `docs/transfer/data_*` or `docs/plan/` was modified. Nothing was committed or pushed.
