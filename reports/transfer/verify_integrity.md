# Transfer verification: end-to-end integrity of the x0.at parts

- **Verdict: PASS.**
- **Verifier:** independent; did not build the transfer.
- **Run:** 2026-10-17, 06:59:57Z to 07:21:55Z (stream), then the local comparison.
- **Lens:** what is actually hosted on x0.at, compared with the manifest and the local `data/`.

## Result

| Check | Expected | Measured | OK |
|---|---|---|---|
| `docs/transfer/data_parts.tsv`, working tree vs `origin/claude/da-camp-video-plan-qpf3tv` (`git fetch`, `git show`, `cmp`) | identical | identical; sha256 `bf5cbe85…8e118`; HEAD = origin = `684da425` | yes |
| `data_stream.sha256`, `data_plain.sha256`, working tree vs origin | identical | identical | yes |
| Manifest shape | 72 lines, 4 fields | 72 lines, 4 fields each; names `data_part_000`…`071` contiguous | yes |
| Manifest sizes | 71 × 104,857,600 + 31,129,632 | the same; sum 7,476,019,232 B; 72 unique SHA-256s | yes |
| Manifest URLs | `https://x0.at/` + 24-char ID | 72 of 72 match `https://x0.at/[A-Za-z0-9]{24}`; 72 unique | yes |
| Parts downloaded with plain GET, byte count and SHA-256 checked | 72 | **72 / 72 OK**; 80 GETs; 8 retries on 6 parts (all HTTP 403, transient) | yes |
| SHA-256 of the concatenated ciphertext | `4d6291e2…48a7` (`data_stream.sha256`) | `4d6291e28a31da1d5a169251be29671fb24f578527d3e682b0f62152461648a7` | yes |
| `openssl enc -d` (AES-256-CBC, PBKDF2-SHA256, 600,000 iterations) | exit 0 | exit 0; stderr empty | yes |
| SHA-256 of the decrypted tar stream | `a3419db9…7e7b` (`data_plain.sha256`) | `a3419db91711de3c269f249d11d33fb3adec42cefc654f0faa13d21a2dbf7e7b` | yes |
| Tar stream size | n/a | 7,476,019,200 B (= 730,080 × 10,240); ciphertext is +32 B (salt header and one pad block) | yes |
| Tar members | 8,151 (file list) | 8,151; all regular files; all PAX headers; parser error none; 0 trailing non-zero bytes | yes |
| Members vs `xfer/out/filelist.txt` | equal | missing 0, unexpected 0, duplicates 0; same order as the file list | yes |
| Unsafe members | 0 | 0 absolute, 0 `..`, 0 symlinks, 0 hardlinks, 0 devices or FIFOs, 0 outside `data/`, 0 setuid/setgid, 0 control characters in names, 0 `.ssh` / `id_ed25519` / `known_hosts` names | yes |
| Per-file SHA-256: tar member vs `/home/user/Upload-documents/<name>` | 8,151 equal | **8,151 / 8,151 equal**; 7,461,471,885 B hashed on each side; 0 short reads; 0 local files with mtime after the tar time (2026-10-17 05:56:29Z) | yes |

## Method

1. **Download** (`integrity/fetch_parts.sh`). Reads the committed manifest in order. For each part:
   - `curl -fsS` GET into a temp file, then byte-count and SHA-256 checks.
   - On a curl failure, an empty file, or a size or SHA mismatch: up to 6 retries (7 attempts), with back-off of 5, 10, 20, 40, 80 and 160 s.
   - A verified part is written to stdout and then deleted. At most one part (100 MiB) was on disk at a time.
2. **Pipeline:** `fetch | tee → sha256sum (cipher) | openssl enc -d … -pass file:<passphrase file> | tee → sha256sum (plain) | python3 -I tar_members.py`.
   - The two `sha256sum` taps read named FIFOs. This works like `tee >(sha256sum …)`, but the job can `wait` for them.
   - The passphrase was used only through `-pass file:`. It was never printed, copied or logged.
3. **Member hasher** (`tar_members.py`).
   - Reads the tar with `tarfile.open(fileobj=stdin, mode='r|')`, a streaming read that never extracts.
   - Writes one row per member: name, type, size, SHA-256, mode, mtime, link name and flags.
   - Drains the stream to EOF, so the plaintext checksum covers every byte.
4. **Comparison** (`compare_integrity.py`, `python3 -I`). Compares member names with the file list, then stream-hashes every local file and compares it with the member hash.
5. **Queue:** both heavy steps ran through the project queue.
   - `dc q submit --label verify-transfer`: tsp job 0, exit 0.
   - `dc q submit --label verify-transfer-compare`: tsp job 1, exit 0.
   - Waits used `dc q wait --timeout 540`.
6. **Self-tests** before the real run, on a synthetic encrypted tar using a throwaway passphrase and `file://` URLs:
   - a clean pass;
   - a forced SHA mismatch, which exhausted its retries, closed the stream and still checked the remaining parts;
   - crafted `..`, absolute, outside-`data/`, hardlink, device and sensitive-name members, which were all flagged.

## Per-part retries

Format: `part: retries (seconds)`. Every retry was a first or second attempt that got HTTP 403 (curl rc 22); the next attempt succeeded.

- First-attempt 403 rate: 6 of 72 parts (8.3%).
- Most consecutive 403s on one part: 2 (parts 016 and 029).
- Download time: 1,281 s in all, about 5.8 MB/s.

| | | | | | |
|---|---|---|---|---|---|
| 000: 1 (21s) | 012: 0 (25s) | 024: 0 (15s) | 036: 0 (15s) | 048: 0 (27s) | 060: 0 (19s) |
| 001: 0 (16s) | 013: 0 (30s) | 025: 0 (16s) | 037: 1 (22s) | 049: 0 (18s) | 061: 0 (15s) |
| 002: 0 (16s) | 014: 0 (25s) | 026: 0 (15s) | 038: 0 (16s) | 050: 0 (18s) | 062: 0 (16s) |
| 003: 0 (21s) | 015: 0 (19s) | 027: 1 (22s) | 039: 0 (16s) | 051: 0 (15s) | 063: 0 (15s) |
| 004: 0 (16s) | 016: 2 (35s) | 028: 0 (16s) | 040: 0 (18s) | 052: 0 (16s) | 064: 0 (15s) |
| 005: 0 (16s) | 017: 0 (17s) | 029: 2 (45s) | 041: 0 (15s) | 053: 0 (15s) | 065: 0 (19s) |
| 006: 0 (16s) | 018: 0 (16s) | 030: 0 (18s) | 042: 0 (15s) | 054: 0 (18s) | 066: 0 (28s) |
| 007: 0 (16s) | 019: 0 (17s) | 031: 0 (15s) | 043: 0 (15s) | 055: 0 (15s) | 067: 0 (18s) |
| 008: 0 (18s) | 020: 0 (18s) | 032: 0 (17s) | 044: 0 (15s) | 056: 0 (15s) | 068: 0 (16s) |
| 009: 0 (17s) | 021: 0 (16s) | 033: 0 (16s) | 045: 0 (16s) | 057: 0 (15s) | 069: 0 (16s) |
| 010: 0 (16s) | 022: 0 (16s) | 034: 0 (15s) | 046: 0 (18s) | 058: 0 (15s) | 070: 0 (16s) |
| 011: 0 (16s) | 023: 0 (15s) | 035: 0 (15s) | 047: 0 (15s) | 059: 1 (21s) | 071: 0 (5s) |

## Notes (none affects the verdict)

- **Local files left out of the transfer.** 5 local entries under the transferred folders are not in the file list. All are absolute symlinks in `data/derived/audio/ecapa_cache/`: 4 point to `/root/.cache/huggingface/…` and 1 to `data/models/ecapa-voxceleb/`. Leaving them out is correct, since they would dangle on the desktop. SpeechBrain re-creates them when the ECAPA model is loaded.
- **Restore script and 403s.** `tools/transfer/restore_data.sh` makes 4 attempts per part, with `curl --retry 3` inside each.
  - `curl --retry` does not retry HTTP 403, so the outer loop is what matters.
  - The worst case observed here was 2 consecutive 403s, so 4 attempts would have been enough. A run that still fails stops with a SHA mismatch message, and re-running it resumes from the parts already verified.
- **Shared scratch directory.** A parallel verifier shared the `scratchpad/verify/` directory and replaced the `compare.py` my job called at the end, at 07:06:05Z.
  - The stream checks were not affected: they ran in already-started processes (`tar_members.py` was loaded at 06:59:57Z).
  - The local comparison was re-run as its own queue job from a private copy (`verify/integrity/compare_integrity.py`).
- **Not checked:** how long x0.at will keep the parts. The README estimate is about 2027-01-07.
